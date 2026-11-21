import { useEffect, useRef, useState } from "react";
import { Mic, Upload, Play, Square, Scissors, Download, Undo2, Redo2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleWaveform } from "./SampleWaveform";
import { useStudio } from "./StudioProvider";
import { cropBuffer, processBuffer, slicePoints, stretchBuffer } from "@/lib/sample-processing";
import { saveBlob } from "@/lib/native";
import { safeFilename, wavBlob } from "@/lib/wav";
import { noteName, type SampleAsset } from "@/lib/song";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SampleRecorder({ active = true, onOpenSong }: { active?: boolean; onOpenSong: () => void }) {
  const studio = useStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = studio.samples.find(a => a.id === selectedId) ?? studio.samples[0];
  const [selection, setSelection] = useState<[number, number]>([0, 1]);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [octave, setOctave] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(80);
  const [fade, setFade] = useState(0.1);
  const [gain, setGain] = useState(0);
  const [sliceCount, setSliceCount] = useState(8);
  const [pads, setPads] = useState<(string | null)[]>(Array(16).fill(null));
  const [destination, setDestination] = useState(0);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const previewGain = useRef<GainNode | null>(null);
  const previewTicket = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const activeState = useRef(active); activeState.current = active;
  const keys = "1234qwerasdfzxcv";

  const stopPreview = () => { previewTicket.current++; source.current?.stop(); source.current = null; setPlaying(false); };
  const stopRecording = () => { if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false); };
  useEffect(() => { if (previewGain.current && context.current) previewGain.current.gain.setTargetAtTime(volume / 100, context.current.currentTime, 0.01); }, [volume]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); source.current?.stop(); void context.current?.close().catch(() => {}); };
  }, []);
  useEffect(() => { if (!active) { stopPreview(); stopRecording(); } }, [active]);
  const selectedBuffer = selected?.buffer;
  useEffect(() => { if (selectedBuffer) setSelection([0, selectedBuffer.duration]); }, [selectedBuffer]);
  useEffect(() => {
    if (!recording) return;
    const start = performance.now();
    const timer = window.setInterval(() => { const seconds = (performance.now() - start) / 1000; setElapsed(seconds); if (seconds >= 60) stopRecording(); }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const ingest = async (blob: Blob, name: string) => {
    if (blob.size > 50 * 1024 * 1024) throw new Error("Audio files must be under 50 MB.");
    context.current ??= new AudioContext();
    const buffer = await context.current.decodeAudioData(await blob.arrayBuffer());
    if (buffer.duration > 120) throw new Error("Import clips up to two minutes long. Split longer recordings into smaller files.");
    if (!mounted.current) return;
    const asset: SampleAsset = { id: crypto.randomUUID(), name, buffer, revision: 0, rootMidi: 60, loop: false };
    studio.addSamples([asset]); setSelectedId(asset.id);
  };
  const importFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      try { await ingest(file, file.name.replace(/\.[^.]+$/, "")); }
      catch (e) { toast.error(`${file.name}: ${e instanceof Error ? e.message : "This format could not be decoded."}`); }
    }
    setBusy(false);
  };
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("Microphone recording requires a supported browser and a secure page."); return; }
    setRequesting(true); stopPreview();
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (!mounted.current || !activeState.current) { input.getTracks().forEach(t => t.stop()); return; }
      stream.current = input;
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(input, mime ? { mimeType: mime } : undefined); recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        input.getTracks().forEach(t => t.stop());
        if (!mounted.current) return;
        setRecording(false); setBusy(true);
        try { await ingest(new Blob(chunks, { type: rec.mimeType }), `Recording ${new Date().toLocaleTimeString()}`); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Recording could not be decoded."); }
        setBusy(false);
      };
      rec.start(200); setElapsed(0); setRecording(true);
    } catch { stream.current?.getTracks().forEach(t => t.stop()); toast.error("Microphone access failed. Check your browser permission."); }
    finally { setRequesting(false); }
  };
  const preview = async (asset: SampleAsset, midi = asset.rootMidi) => {
    try {
      stopPreview(); const ticket = previewTicket.current;
      context.current ??= new AudioContext(); await context.current.resume();
      if (ticket !== previewTicket.current || !activeState.current || !mounted.current) return;
      const ctx = context.current;
      const range = asset.id === selected?.id ? selection : [0, asset.buffer.duration];
      const cropped = cropBuffer(asset.buffer, range[0], range[1]);
      if (cropped.duration / speed > 120) { toast.error("Preview up to two minutes of output. Shorten the selection or increase speed."); return; }
      const buffer = stretchBuffer(cropped, cropped.duration / speed, midi - asset.rootMidi + pitch + octave * 12);
      const node = ctx.createBufferSource(); const output = ctx.createGain();
      node.buffer = buffer; node.loop = asset.loop; output.gain.value = volume / 100;
      node.connect(output); output.connect(ctx.destination); source.current = node; previewGain.current = output;
      node.onended = () => { node.disconnect(); output.disconnect(); if (previewGain.current === output) previewGain.current = null; if (source.current === node) { source.current = null; setPlaying(false); } };
      node.start(); setPlaying(true);
    } catch { toast.error("Sample preview failed. Try a shorter selection."); }
  };
  useEffect(() => {
    const trigger = (e: KeyboardEvent) => {
      if (!active || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest("input,select,textarea,[contenteditable='true']"))) return;
      const index = keys.indexOf(e.key.toLowerCase()); const asset = index >= 0 ? studio.samples.find(a => a.id === pads[index]) : undefined;
      if (asset) { e.preventDefault(); void preview(asset); }
    };
    window.addEventListener("keydown", trigger); return () => window.removeEventListener("keydown", trigger);
  });
  const apply = (operation: "crop" | "normalize" | "reverse" | "fade-in" | "fade-out" | "gain") => {
    if (!selected) return; stopPreview();
    const buffer = operation === "crop" ? cropBuffer(selected.buffer, selection[0], selection[1]) : processBuffer(selected.buffer, operation, operation === "gain" ? gain : fade);
    studio.updateSample(selected.id, { buffer });
  };
  const slice = (transient: boolean) => {
    if (!selected) return; stopPreview();
    const region = cropBuffer(selected.buffer, selection[0], selection[1]);
    const points = slicePoints(region, sliceCount, transient);
    const assets = points.slice(0, -1).map((start, i): SampleAsset => ({ id: crypto.randomUUID(), name: `${selected.name} · slice ${i + 1}`, buffer: cropBuffer(region, start, points[i + 1]), revision: 0, rootMidi: selected.rootMidi, loop: false }));
    studio.addSamples(assets); setPads([...assets.map(a => a.id), ...Array(16 - assets.length).fill(null)]);
    toast.success(`${assets.length} slices mapped to pads and added to your library.`);
  };
  const addBlock = () => { if (selected && studio.addSampleBlock(selected, destination)) onOpenSong(); };
  const bake = () => {
    if (!selected) return;
    const duration = (selection[1] - selection[0]) / speed;
    if (duration > 120) { toast.error("Bake up to two minutes of output. Shorten the selection or increase speed."); return; }
    stopPreview();
    try {
      const buffer = stretchBuffer(cropBuffer(selected.buffer, selection[0], selection[1]), duration, pitch + octave * 12);
      const asset = { ...selected, id: crypto.randomUUID(), name: `${selected.name} · baked`, buffer, revision: 0 };
      studio.addSamples([asset]); setSelectedId(asset.id);
    } catch { toast.error("Sample processing failed. Try a shorter selection."); }
  };

  return <div className="space-y-5" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && !recording) void importFiles(e.dataTransfer.files); }}>
    <div className="section-heading flex flex-wrap items-center justify-between gap-3"><span>03 / SAMPLER WORKSHOP</span><span className="text-[9px]">LOCAL AUDIO · NO UPLOADS · 16 PADS</span></div>
    <div className="transport flex flex-wrap items-center gap-3 rounded-xl p-3">
      <label className={cn("hardware-button inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[10px]", (busy || recording) && "pointer-events-none opacity-50")}><Upload size={14} /> IMPORT AUDIO PACK<input type="file" multiple accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a" disabled={busy || recording} className="hidden" onChange={e => { void importFiles(e.target.files); e.target.value = ""; }} /></label>
      <Button disabled={busy || requesting} onClick={recording ? stopRecording : startRecording} className="hardware-button h-9 px-3 text-[10px]"><Mic size={14} /> {recording ? `STOP REC · ${elapsed.toFixed(1)}s` : requesting ? "ALLOW MICROPHONE…" : "RECORD"}</Button>
      <Button disabled={!studio.canUndoSamples || recording} onClick={() => { stopPreview(); studio.undoSamples(); }} className="hardware-button h-9 px-3 text-[10px]"><Undo2 size={14} /> UNDO SAMPLE</Button><Button disabled={!studio.canRedoSamples || recording} onClick={() => { stopPreview(); studio.redoSamples(); }} className="hardware-button h-9 px-3 text-[10px]"><Redo2 size={14} /> REDO</Button>
      {busy && <span className="text-[10px] font-bold">DECODING AUDIO…</span>}
    </div>
    <p className="text-[10px] leading-relaxed text-[var(--case-muted)]">Drop audio files or import multiple files from a sample pack. WAV, MP3, OGG and other browser-supported formats; 50 MB / two minutes per file. Recording stops at 60 seconds. Native FL Studio/VST preset files are not audio.</p>
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="sound-card max-h-[680px] overflow-y-auto rounded-xl p-3"><h3 className="mb-3 text-[10px] font-bold">SAMPLE LIBRARY / {studio.samples.length}</h3>{studio.samples.length ? studio.samples.map(asset => <button key={asset.id} onClick={() => { stopPreview(); setSelectedId(asset.id); }} className={cn("mb-2 block w-full rounded-lg border p-3 text-left", selected?.id === asset.id ? "border-[var(--berry)] bg-[#eee4e4]" : "border-[var(--case-border)] bg-[var(--case-light)]")}><span className="block truncate font-pixel text-[12px]">{asset.name}</span><span className="mt-1 block text-[9px] text-[var(--case-muted)]">{asset.buffer.duration.toFixed(2)}s · {asset.buffer.numberOfChannels} ch · {Math.round(asset.buffer.sampleRate / 1000)} kHz</span></button>) : <p className="py-6 text-[11px] leading-relaxed">Import a sample pack or record a sound to start sculpting audio.</p>}</aside>
      {selected ? <section className="editor-panel space-y-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><input key={`${selected.id}/${selected.name}`} defaultValue={selected.name} aria-label="Sample name" onBlur={e => { if (e.target.value.trim() && e.target.value !== selected.name) studio.updateSample(selected.id, { name: e.target.value.trim() }); }} className="max-w-full rounded border bg-[var(--case-light)] px-2 py-1 text-sm font-bold" /><div className="flex gap-2"><Button onClick={() => playing ? stopPreview() : void preview(selected)} className="play-button h-8 px-3 text-[10px]">{playing ? <Square size={13} /> : <Play size={13} />} {playing ? "STOP" : "PREVIEW"}</Button><Button onClick={() => void saveBlob(wavBlob(selected.buffer), `${safeFilename(selected.name)}.wav`)} className="hardware-button h-8 px-3 text-[10px]"><Download size={13} /> WAV</Button></div></div>
        <SampleWaveform key={selected.id} buffer={selected.buffer} selection={selection} onSelect={([start, end]) => { const min = Math.min(0.001, selected.buffer.duration / 2); setSelection([Math.max(0, Math.min(start, selected.buffer.duration - min)), Math.min(selected.buffer.duration, Math.max(end, start + min))]); }} />
        <div className="flex flex-wrap items-center gap-3 text-[10px]"><label>IN <input type="number" aria-label="Sample selection start seconds" min={0} max={selection[1] - 0.001} step={0.001} value={Number(selection[0].toFixed(3))} onChange={e => setSelection([Math.max(0, Math.min(Number(e.target.value) || 0, selection[1] - 0.001)), selection[1]])} className="ml-1 w-20 rounded border bg-[var(--case-light)] p-1" /></label><label>OUT <input type="number" aria-label="Sample selection end seconds" min={selection[0] + 0.001} max={selected.buffer.duration} step={0.001} value={Number(selection[1].toFixed(3))} onChange={e => setSelection([selection[0], Math.min(selected.buffer.duration, Math.max(Number(e.target.value) || 0, selection[0] + 0.001))])} className="ml-1 w-20 rounded border bg-[var(--case-light)] p-1" /></label><span>{(selection[1] - selection[0]).toFixed(3)}s selected</span><Button onClick={() => setSelection([0, selected.buffer.duration])} className="hardware-button h-7 px-2 text-[9px]">SELECT ALL</Button></div>
        <div className="flex flex-wrap gap-2"><Button onClick={() => apply("crop")} className="hardware-button h-8 text-[9px]"><Scissors size={12} /> KEEP SELECTION</Button>{(["normalize", "reverse", "fade-in", "fade-out"] as const).map(op => <Button key={op} onClick={() => apply(op)} className="hardware-button h-8 text-[9px]">{op.toUpperCase()}</Button>)}</div>
        <div className="grid gap-3 text-[10px] sm:grid-cols-3"><label>Fade length (s)<input type="number" min={0.001} max={selected.buffer.duration} step={0.01} value={fade} onChange={e => setFade(Math.max(0.001, Math.min(selected.buffer.duration, Number(e.target.value) || 0.001)))} className="ml-2 w-16 rounded border bg-[var(--case-light)] p-1" /></label><label>Gain (dB)<input type="number" min={-24} max={12} value={gain} onChange={e => setGain(Math.max(-24, Math.min(12, Number(e.target.value) || 0)))} className="ml-2 w-12 rounded border bg-[var(--case-light)] p-1" /><button onClick={() => apply("gain")} className="ml-2 font-bold text-[var(--berry)]">APPLY</button></label><label className="flex items-center gap-2"><input type="checkbox" checked={selected.loop} onChange={e => { stopPreview(); studio.updateSample(selected.id, { loop: e.target.checked }); }} /> LOOP / REPEAT</label></div>
        <div className="grid gap-3 rounded-lg border border-[var(--case-border)] p-3 text-[10px] sm:grid-cols-2 xl:grid-cols-4"><label>SPEED<select aria-label="Sampler speed" value={speed} onChange={e => { stopPreview(); setSpeed(Number(e.target.value)); }} className="ml-2 rounded border bg-[var(--case-light)] p-1">{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label><label>OCTAVE<select aria-label="Sampler octave" value={octave} onChange={e => { stopPreview(); setOctave(Number(e.target.value)); }} className="ml-2 rounded border bg-[var(--case-light)] p-1">{[-3, -2, -1, 0, 1, 2, 3].map(v => <option key={v} value={v}>{v > 0 ? "+" : ""}{v}</option>)}</select></label><label>PITCH<input aria-label="Sampler pitch semitones" type="number" min={-12} max={12} value={pitch} onChange={e => { stopPreview(); setPitch(Math.min(12, Math.max(-12, Number(e.target.value) || 0))); }} className="ml-2 w-12 rounded border bg-[var(--case-light)] p-1" /></label><label>VOLUME<input aria-label="Sampler preview volume" type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} className="ml-2 w-16 accent-[#933d60]" /></label></div>
        <div className="flex flex-wrap items-center gap-3 text-[10px]"><label>ROOT KEY<select value={selected.rootMidi} aria-label="Sample root note" onChange={e => studio.updateSample(selected.id, { rootMidi: Number(e.target.value) })} className="ml-2 rounded border bg-[var(--case-light)] p-1">{Array.from({ length: 72 }, (_, i) => i + 24).map(m => <option key={m} value={m}>{noteName(m)}</option>)}</select></label><label>PLACE AT BAR<select value={destination} aria-label="Sample block placement bar" onChange={e => setDestination(Number(e.target.value))} className="ml-2 rounded border bg-[var(--case-light)] p-1">{Array.from({ length: studio.song.barCount }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label><Button onClick={addBlock} className="play-button h-9 text-[10px]"><Plus size={14} /> ADD AS SONG BLOCK</Button></div>
        <p className="text-[9px] text-[var(--case-muted)]">Preview speed, octave and pitch audition only. Apply them to a copy with Bake, or use song/channel controls after placing a block. Granular stretch can add texture at extreme settings. Keep Selection crops; other processing applies to the full sample and its linked blocks.</p>
        <Button onClick={bake} className="hardware-button h-8 text-[9px]">BAKE PREVIEW SETTINGS TO COPY</Button>
      </section> : <div className="game-screen flex min-h-72 items-center justify-center rounded-xl p-8 text-center"><div><Mic className="mx-auto mb-4 h-12 w-12" /><p className="font-pixel text-2xl">YOUR NEXT SOUND STARTS HERE.</p><p className="mt-3 text-xs">Record, drop an audio file, or import a sample pack.</p></div></div>}
    </div>
    <section className="editor-panel rounded-xl p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="section-heading">SLICER / 16-PAD BANK</h3><div className="flex items-center gap-2"><select aria-label="Slice count" value={sliceCount} onChange={e => setSliceCount(Number(e.target.value))} className="rounded border bg-[var(--case-light)] p-1 text-[10px]">{[2, 4, 8, 16].map(n => <option key={n} value={n}>{n} slices</option>)}</select><Button disabled={!selected} onClick={() => slice(false)} className="hardware-button h-8 text-[9px]">EQUAL SLICE</Button><Button disabled={!selected} onClick={() => slice(true)} className="hardware-button h-8 text-[9px]">TRANSIENT SLICE</Button></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{pads.map((id, i) => { const asset = studio.samples.find(a => a.id === id); return <div key={i} className="sound-card rounded-lg p-2"><button disabled={!asset} onClick={() => { if (asset) void preview(asset); }} className={cn("step-pad flex min-h-14 w-full flex-col items-start justify-center rounded-md p-2 text-[10px] font-bold", asset && "on")}><span>{String(i + 1).padStart(2, "0")} / {keys[i].toUpperCase()}</span><span className={cn("mt-1 w-full truncate text-[9px]", asset ? "text-[#fffde8]" : "text-[var(--case-muted)]")}>{asset?.name ?? "UNMAPPED"}</span></button><select aria-label={`Map sample to pad ${i + 1}`} value={id ?? ""} onChange={e => setPads(p => p.map((value, n) => n === i ? e.target.value || null : value))} className="mt-2 w-full rounded border bg-[var(--case-light)] p-1 text-[9px]"><option value="">Choose sample</option>{studio.samples.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>; })}</div></section>
    {selected && <section className="editor-panel rounded-xl p-4"><h3 className="section-heading mb-3">PITCHED KEYBOARD / ROOT {noteName(selected.rootMidi)}</h3><div className="grid grid-cols-6 gap-1 sm:grid-cols-12">{Array.from({ length: 12 }, (_, i) => <button key={i} onClick={() => void preview(selected, selected.rootMidi + i)} className={cn("piano-key min-h-20 rounded-b-md border p-2 text-[10px] font-bold", [1, 3, 6, 8, 10].includes(i) && "black-key")}>{noteName(selected.rootMidi + i)}</button>)}</div><p className="mt-3 text-[9px] text-[var(--case-muted)]">Root mapping, edited audio and loop mode carry into sample blocks. Preview pads are monophonic; song sample notes can overlap.</p></section>}
  </div>;
}
