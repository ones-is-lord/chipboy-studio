import { useEffect, useState } from "react";
import { Play, Square, SkipBack, Repeat2, Plus, Download, Volume2, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixelArt } from "./PixelArt";
import { SongArrangement } from "./SongArrangement";
import { PatternEditor } from "./PatternEditor";
import { useStudio } from "./StudioProvider";
import { useSongPlayback } from "@/hooks/use-song-playback";
import { coveringBlock, createDemoSong, newBlock, noteName, overlaps, validArrangement, type Note, type SongBlock, type Track } from "@/lib/song";
import { renderSong } from "@/lib/audio-engine";
import { saveBlob } from "@/lib/native";
import { safeFilename, wavBlob } from "@/lib/wav";
import { projectFilename, serializeProject } from "@/lib/project";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MusicGenerator({ active }: { active: boolean }) {
  const studio = useStudio();
  const { song, edit, finishGroup, undo, redo, canUndo, canRedo, selectedTrack, preferredPattern, setSelectedTrack, setSelectedBar, setPreferredPattern } = studio;
  const [exporting, setExporting] = useState(false);
  const audio = useSongPlayback(song, active, studio.audioSamples);
  const track = song.tracks[selectedTrack];
  const selectedBar = coveringBlock(track, studio.selectedBar)?.bar ?? studio.selectedBar;
  const block = track.bars[selectedBar];
  const patternIndex = block?.pattern ?? Math.min(preferredPattern, track.patterns.length - 1);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (!active || !(e.ctrlKey || e.metaKey) || e.altKey || (e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[contenteditable='true']"))) return;
      const key = e.key.toLowerCase();
      if (key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, [active, undo, redo]);
  const updateTrack = (change: Partial<Track>, group?: string) => edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => i === selectedTrack ? { ...t, ...change } : t) }), group);
  const updateNotes = (notes: Note[]) => updateTrack({ patterns: track.patterns.map((p, i) => i === patternIndex ? notes : p), bars: track.bars.map((b, i) => i === selectedBar ? b ?? newBlock(patternIndex) : b) });
  const updateBlock = (value: SongBlock, group?: string) => {
    const conflicts = overlaps(track, selectedBar, value, [selectedBar]);
    if (conflicts.length && !window.confirm(`Extending this block replaces ${conflicts.length} overlapping block(s). Continue? You can undo this.`)) return;
    updateTrack({ bars: track.bars.map((b, i) => i === selectedBar ? value : conflicts.includes(i) ? null : b) }, group);
  };
  const selectBlock = (row: number, bar: number) => {
    finishGroup(); setSelectedTrack(row);
    const t = song.tracks[row]; const cover = coveringBlock(t, bar);
    setSelectedBar(cover?.bar ?? bar);
    if (cover) setPreferredPattern(cover.block.pattern);
    else edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => i === row ? { ...t, bars: t.bars.map((b, j) => j === bar ? newBlock(Math.min(preferredPattern, t.patterns.length - 1)) : b) } : t) }));
  };
  const moveBlock = (row: number, from: number, destination: number) => {
    const t = song.tracks[row]; const source = t.bars[from]; if (!source) return;
    const cover = coveringBlock(t, destination); const to = cover && cover.bar !== from ? cover.bar : destination;
    if (from === to) return;
    const target = cover && to === cover.bar && cover.bar !== from ? cover.block : null;
    const bars = t.bars.map((b, i) => i === from || i === to ? null : b);
    bars[to] = source; bars[from] = target;
    if (!validArrangement(bars)) { toast.error("Not enough room for that move/swap. Clear adjacent blocks or extend the timeline."); return; }
    edit(s => ({ ...s, tracks: s.tracks.map((track, i) => i === row ? { ...track, bars } : track) }));
    setSelectedTrack(row); setSelectedBar(to); setPreferredPattern(source.pattern);
  };
  const duplicateBlock = (destination: number) => {
    if (!block || destination === selectedBar) return;
    if (destination * 16 + block.length > song.barCount * 16) { toast.error("Add more bars before copying this long block here."); return; }
    const conflicts = overlaps(track, destination, block);
    if (conflicts.includes(selectedBar)) { toast.error("Choose a destination that does not overlap the original block."); return; }
    if (conflicts.length && !window.confirm(`Replace ${conflicts.length} overlapping block(s) with an independent copy?`)) return;
    const index = track.patterns.length;
    updateTrack({ patterns: [...track.patterns, track.patterns[block.pattern].map(n => ({ ...n, id: crypto.randomUUID() }))], bars: track.bars.map((b, i) => i === destination ? { ...block, pattern: index } : conflicts.includes(i) ? null : b) });
    setSelectedBar(destination); setPreferredPattern(index); toast.success(`Independent copy placed at bar ${destination + 1}.`);
  };
  const addBars = () => { const count = Math.min(64, song.barCount + 8); edit(s => ({ ...s, barCount: count, tracks: s.tracks.map(t => ({ ...t, bars: [...t.bars, ...Array(count - s.barCount).fill(null)] })) })); };
  const newSong = () => {
    if (!window.confirm("Start a blank song? Your current song can be restored with Undo.")) return;
    audio.stop(); setSelectedTrack(0); setSelectedBar(0); setPreferredPattern(0);
    const demo = createDemoSong(); edit({ ...demo, name: "Untitled song", tracks: demo.tracks.map(t => ({ ...t, patterns: [[], []], bars: Array(demo.barCount).fill(null) })) });
  };
  const exportData = async () => {
    try {
      await saveBlob(new Blob([serializeProject(song, studio.audioSamples)], { type: "application/json" }), projectFilename(song.name));
      toast.success("Project data ready. Sample audio is not embedded; export sample WAVs separately.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Song data could not be exported."); }
  };
  const exportWav = async () => {
    setExporting(true); audio.stop();
    try { await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve())); const buffer = await renderSong(song, studio.audioSamples); await saveBlob(wavBlob(buffer), `${safeFilename(song.name)}.wav`); toast.success("Rendered stereo 44.1 kHz / 16-bit WAV."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "WAV rendering failed. Try a shorter song."); }
    finally { setExporting(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 px-1"><div className="flex items-center gap-3"><div className="cartridge-badge"><PixelArt type="note" className="h-7 w-7" /></div><div><label htmlFor="song-name" className="case-label text-[9px]">CURRENT CARTRIDGE</label><input id="song-name" aria-label="Song name" value={song.name} onChange={e => { const name = e.target.value; edit(s => ({ ...s, name }), "song-name"); }} onBlur={finishGroup} className="song-name block w-48 bg-transparent text-lg font-bold outline-none sm:w-64" /></div></div><div className="flex flex-wrap gap-2"><Button onClick={undo} disabled={!canUndo} title="Ctrl/Cmd+Z" className="hardware-button h-9 px-3 text-[10px]"><Undo2 size={14} /> UNDO</Button><Button onClick={redo} disabled={!canRedo} title="Ctrl/Cmd+Shift+Z" className="hardware-button h-9 px-3 text-[10px]"><Redo2 size={14} /> REDO</Button><Button onClick={newSong} className="hardware-button h-9 px-3 text-[10px]"><Plus size={14} /> NEW</Button><Button onClick={exportData} className="hardware-button h-9 px-3 text-[10px]">DATA</Button><Button onClick={exportWav} disabled={exporting} className="play-button h-9 px-3 text-[10px]"><Download size={14} /> {exporting ? "RENDERING…" : "EXPORT WAV"}</Button></div></div>
    <div className="transport flex flex-wrap items-center gap-4 rounded-xl p-3 sm:gap-5 sm:px-5"><div className="flex items-center gap-2"><Button aria-label={audio.preparing ? "Preparing sample audio" : audio.playing ? "Pause" : "Play song"} disabled={exporting || audio.preparing} onClick={audio.toggle} className={cn("play-button h-11 w-14", audio.playing && "is-playing")}>{audio.preparing ? "…" : audio.playing ? "Ⅱ" : <Play size={19} fill="currentColor" />}</Button><Button aria-label="Stop" onClick={audio.stop} className="hardware-button h-11 w-11"><Square size={15} fill="currentColor" /></Button><Button aria-label="Rewind" onClick={audio.rewind} className="hardware-button h-11 w-10"><SkipBack size={17} /></Button><Button aria-label="Loop song" aria-pressed={audio.loop} onClick={() => audio.setLoop(!audio.loop)} className={cn("hardware-button h-11 w-10", audio.loop && "engaged")}><Repeat2 size={18} /></Button></div>
      <div className="readout flex items-center gap-4 rounded-md px-4 py-2"><div><label htmlFor="tempo" className="block text-[8px] tracking-widest">TEMPO</label><input id="tempo" aria-label="Tempo BPM" type="number" min={40} max={240} value={song.bpm} onBlur={finishGroup} onChange={e => { const bpm = Math.min(240, Math.max(40, Number(e.target.value) || 40)); edit(s => ({ ...s, bpm }), "tempo"); }} className="w-12 bg-transparent text-xl font-bold outline-none" /></div><div className="readout-divider" /><div><span className="block text-[8px] tracking-widest">POSITION</span><span className="text-xl font-bold">{String(audio.position < 0 ? 1 : Math.floor(audio.position / 16) + 1).padStart(2, "0")}:{String(audio.position < 0 ? 1 : audio.position % 16 + 1).padStart(2, "0")}</span></div></div>
      <label className="text-[9px] font-bold">KEY<select aria-label="Song transpose" value={song.transpose ?? 0} onChange={e => { const transpose = Number(e.target.value); edit(s => ({ ...s, transpose })); }} className="ml-2 rounded border bg-[var(--case-light)] p-2">{Array.from({ length: 25 }, (_, i) => i - 12).map(v => <option key={v} value={v}>{v > 0 ? `+${v}` : v} ST · {noteName(60 + v)}</option>)}</select></label><label className="text-[9px] font-bold">SPEED<select aria-label="Song playback speed" value={song.speed} onChange={e => { const speed = Number(e.target.value); edit(s => ({ ...s, speed })); }} className="ml-2 rounded border bg-[var(--case-light)] p-2">{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label><div className="ml-auto flex items-center gap-3"><Volume2 size={16} /><div className="w-24"><div className="mb-2 flex justify-between text-[8px] font-bold"><span>MASTER</span><span>{song.master}%</span></div><Slider aria-label="Master volume" value={[song.master]} onValueChange={([v]) => edit(s => ({ ...s, master: v }), "master")} onValueCommit={finishGroup} max={100} className="console-slider" /></div></div>
    </div>
    <section className="screen-bezel rounded-xl p-3 sm:p-4" aria-labelledby="song-heading"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="song-heading" className="bezel-label">01 / SONG ARRANGEMENT</h2><div className="flex items-center gap-3"><span className="bezel-label text-[8px]">{audio.playing ? "PLAYING" : "READY"}</span><Button onClick={addBars} disabled={song.barCount >= 64} className="hardware-button h-7 px-2 text-[9px]">+ 8 BARS</Button></div></div><div className="game-screen rounded-md p-3 sm:p-4"><div className="lcd-heading mb-4 flex items-center justify-between border-b-2 border-[var(--lcd-line)] pb-3"><span className="font-pixel text-lg tracking-wider">LET’S MAKE SOME NOISE.</span><PixelArt type="ghost" className="h-8 w-8" /></div><SongArrangement tracks={song.tracks} selectedTrack={selectedTrack} selectedBar={selectedBar} playing={audio.playing} position={audio.position} onSelectBlock={selectBlock} onSelectTrack={row => { finishGroup(); setSelectedTrack(row); setPreferredPattern(coveringBlock(song.tracks[row], selectedBar)?.block.pattern ?? 0); }} onToggleMute={row => edit(s => ({ ...s, tracks: s.tracks.map((t, i) => i === row ? { ...t, muted: !t.muted } : t) }))} onToggleSolo={row => edit(s => ({ ...s, tracks: s.tracks.map((t, i) => i === row ? { ...t, solo: !t.solo } : t) }))} onMoveBlock={moveBlock} /></div><p className="bezel-label mt-3 text-[8px]">STEREO SOUND · TIMELINE UP TO 64 BARS · WAV EXPORT UP TO 5 MINUTES</p></section>
    <PatternEditor key={selectedTrack} track={track} block={block} patternIndex={patternIndex} bar={selectedBar} barCount={song.barCount} position={audio.position} playing={audio.playing} onNotes={updateNotes} onAssign={index => { setPreferredPattern(index); updateBlock({ ...(block ?? newBlock(index)), pattern: index }); }} onCopy={index => updateNotes(track.patterns[index].map(n => ({ ...n, id: crypto.randomUUID() })))} onTrack={updateTrack} onBlock={updateBlock} onDuplicate={duplicateBlock} onRemove={() => updateTrack({ bars: track.bars.map((b, i) => i === selectedBar ? null : b) })} onFinish={finishGroup} onPreview={midi => { void audio.preview(track, midi); }} />
  </div>;
}
