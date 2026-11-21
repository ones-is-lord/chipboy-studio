import { useEffect, useRef, useState } from "react";
import { Play, Square, SkipBack, Repeat2, Plus, Download, Copy, Trash2, Volume2, VolumeX, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixelArt } from "./PixelArt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Track = { name: string; chip: string; voice: "square" | "triangle" | "kick" | "noise"; frequency: number; patterns: boolean[][]; bars: (number | null)[]; muted: boolean; volume: number; pitch: number };
const steps = (indices: number[]) => Array.from({ length: 16 }, (_, i) => indices.includes(i));
const demoTracks = (): Track[] => [
  { name: "Pixel lead", chip: "PULSE 01", voice: "square", frequency: 440, patterns: [steps([0, 3, 6, 8, 10, 14]), steps([0, 2, 5, 8, 11, 12, 14])], bars: [0, 0, 1, 0, 0, 1, 0, 1], muted: false, volume: 60, pitch: 0 },
  { name: "Coin arpeggio", chip: "PULSE 02", voice: "square", frequency: 660, patterns: [steps([2, 6, 10, 14]), steps([1, 5, 9, 13])], bars: [null, null, 0, 0, null, 0, 1, 1], muted: false, volume: 35, pitch: 0 },
  { name: "Triangle bass", chip: "WAVE 03", voice: "triangle", frequency: 110, patterns: [steps([0, 4, 8, 12]), steps([0, 4, 7, 8, 12, 15])], bars: [0, 0, 0, 1, 0, 0, 1, 1], muted: false, volume: 80, pitch: 0 },
  { name: "8-bit kick", chip: "DRUM 04", voice: "kick", frequency: 120, patterns: [steps([0, 4, 8, 12]), steps([0, 4, 8, 11, 12, 14])], bars: [0, 0, 0, 0, 0, 1, 0, 1], muted: false, volume: 80, pitch: 0 },
  { name: "Noise hats", chip: "NOISE 05", voice: "noise", frequency: 0, patterns: [steps([0, 2, 4, 6, 8, 10, 12, 14]), steps([0, 2, 4, 6, 8, 10, 12, 13, 14, 15])], bars: [null, 0, 0, 1, 0, 0, 0, 1], muted: false, volume: 40, pitch: 0 },
];

export function MusicGenerator({ active }: { active: boolean }) {
  const [tracks, setTracks] = useState(demoTracks);
  const [name, setName] = useState("Pocket dreams");
  const [bpm, setBpm] = useState(118);
  const [master, setMaster] = useState(70);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [position, setPosition] = useState(-1);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedBar, setSelectedBar] = useState(0);
  const [patternIndex, setPatternIndex] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const nextStep = useRef(0);
  const playback = useRef({ tracks, master, loop });
  playback.current = { tracks, master, loop };
  const track = tracks[selectedTrack];
  const pattern = track.patterns[patternIndex];

  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const ctx = audioRef.current;
      if (!ctx) return;
      const pos = nextStep.current;
      setPosition(pos);
      const bar = Math.floor(pos / 16);
      const step = pos % 16;
      playback.current.tracks.forEach((t) => {
        const assigned = t.bars[bar];
        if (t.muted || assigned === null || !t.patterns[assigned][step]) return;
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        const level = (t.volume / 100) * (playback.current.master / 100) * 0.16;
        gain.gain.setValueAtTime(Math.max(level, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (t.voice === "noise" ? 0.045 : 0.16));
        gain.connect(ctx.destination);
        if (t.voice === "noise") {
          const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 7000;
          source.connect(filter);
          filter.connect(gain);
          source.start(now);
          source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        } else {
          const oscillator = ctx.createOscillator();
          oscillator.type = t.voice === "kick" ? "sine" : t.voice;
          const melody = t.voice === "square" ? [0, 3, 7, 10][Math.floor(step / 4)] : 0;
          oscillator.frequency.setValueAtTime(t.frequency * 2 ** ((t.pitch + melody) / 12), now);
          if (t.voice === "kick") oscillator.frequency.exponentialRampToValueAtTime(35, now + 0.13);
          oscillator.connect(gain);
          oscillator.start(now);
          oscillator.stop(now + 0.18);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        }
      });
      if (pos === 127 && !playback.current.loop) { setPlaying(false); nextStep.current = 0; }
      else nextStep.current = (pos + 1) % 128;
    };
    tick();
    const timer = window.setInterval(tick, 60000 / bpm / 4);
    return () => window.clearInterval(timer);
  }, [playing, bpm]);

  const startPlayback = async () => {
    if (playing) { setPlaying(false); return; }
    try {
      audioRef.current ??= new AudioContext();
      await audioRef.current.resume();
      setPlaying(true);
    } catch { toast.error("Audio could not start. Please try again in your browser."); }
  };
  const stop = () => { setPlaying(false); setPosition(-1); nextStep.current = 0; };
  const updateTrack = (change: Partial<Track>) => setTracks(prev => prev.map((t, i) => i === selectedTrack ? { ...t, ...change } : t));
  const updatePattern = (value: boolean[]) => updateTrack({ patterns: track.patterns.map((p, i) => i === patternIndex ? value : p) });
  const selectBlock = (row: number, bar: number) => {
    setSelectedTrack(row); setSelectedBar(bar);
    const assigned = tracks[row].bars[bar];
    if (assigned !== null) setPatternIndex(assigned);
    else setTracks(prev => prev.map((t, i) => i === row ? { ...t, bars: t.bars.map((p, b) => b === bar ? patternIndex : p) } : t));
  };
  const assignPattern = (index: number) => { setPatternIndex(index); updateTrack({ bars: track.bars.map((p, i) => i === selectedBar ? index : p) }); };
  const newSong = () => {
    if (!window.confirm("Start a blank song? Your current edits will be replaced.")) return;
    stop(); setName("Untitled song"); setSelectedTrack(0); setSelectedBar(0); setPatternIndex(0);
    setTracks(demoTracks().map(t => ({ ...t, patterns: [steps([]), steps([])], bars: Array(8).fill(null) })));
  };
  const exportSong = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ name, bpm, master, tracks }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${name.replace(/[^a-z0-9_-]/gi, "-") || "song"}.chipboy.json`; link.click(); URL.revokeObjectURL(url);
    toast.success("Song data exported, including all patterns and tracks.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3"><div className="cartridge-badge"><PixelArt type="note" className="h-7 w-7" /></div><div><label htmlFor="song-name" className="case-label text-[9px]">CURRENT CARTRIDGE</label><input id="song-name" aria-label="Song name" value={name} onChange={e => setName(e.target.value)} className="song-name block w-48 bg-transparent text-lg font-bold outline-none sm:w-64" /></div></div>
        <div className="flex gap-2"><Button onClick={newSong} className="hardware-button h-9 rounded-md px-3 text-[10px]"><Plus size={14} /> NEW SONG</Button><Button onClick={exportSong} className="hardware-button h-9 rounded-md px-3 text-[10px]"><Download size={14} /> EXPORT DATA</Button></div>
      </div>

      <div className="transport flex flex-wrap items-center gap-4 rounded-xl p-3 sm:gap-5 sm:px-5">
        <div className="flex items-center gap-2"><Button aria-label={playing ? "Pause playback" : "Play song"} onClick={startPlayback} className={cn("play-button h-11 w-14 rounded-lg", playing && "is-playing")}>{playing ? <span className="text-lg">Ⅱ</span> : <Play size={19} fill="currentColor" />}</Button><Button aria-label="Stop and rewind" onClick={stop} className="hardware-button h-11 w-11 rounded-lg"><Square size={15} fill="currentColor" /></Button><Button aria-label="Rewind" onClick={() => { nextStep.current = 0; setPosition(-1); }} className="hardware-button h-11 w-10 rounded-lg"><SkipBack size={17} /></Button><Button aria-label="Loop song" aria-pressed={loop} onClick={() => setLoop(!loop)} className={cn("hardware-button h-11 w-10 rounded-lg", loop && "engaged")}><Repeat2 size={18} /></Button></div>
        <div className="readout flex items-center gap-5 rounded-md px-4 py-2"><div><label htmlFor="tempo" className="block text-[8px] tracking-widest">TEMPO</label><div className="flex items-baseline gap-1"><input id="tempo" aria-label="Tempo in beats per minute" type="number" min={40} max={240} value={bpm} onChange={e => setBpm(Math.min(240, Math.max(40, Number(e.target.value) || 40)))} className="w-12 bg-transparent text-xl font-bold outline-none" /><span className="text-[9px]">BPM</span></div></div><div className="readout-divider" /><div><span className="block text-[8px] tracking-widest">POSITION</span><span className="text-xl font-bold">{String(position < 0 ? 1 : Math.floor(position / 16) + 1).padStart(2, "0")}<span className="mx-1 opacity-60">:</span>{String(position < 0 ? 1 : position % 16 + 1).padStart(2, "0")}</span></div></div>
        <div className="ml-auto flex items-center gap-3"><Volume2 size={16} /><div className="w-24"><div className="mb-2 flex justify-between text-[8px] font-bold tracking-widest"><span>MASTER</span><span>{master}%</span></div><Slider aria-label="Master volume" value={[master]} onValueChange={([v]) => setMaster(v)} max={100} className="console-slider" /></div></div>
      </div>

      <section className="screen-bezel rounded-xl p-3 sm:p-4" aria-labelledby="song-heading">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 id="song-heading" className="bezel-label">01 / SONG ARRANGEMENT</h2><span className="bezel-label text-[8px]"><span className={cn("mr-2 inline-block h-1.5 w-1.5 rounded-full", playing ? "bg-[#cbdc8e]" : "bg-[#898c7b]")} />{playing ? "PLAYING" : "READY TO PLAY"}</span></div>
        <div className="game-screen rounded-md p-3 sm:p-4">
          <div className="lcd-heading mb-4 flex items-center justify-between border-b-2 border-[var(--lcd-line)] pb-3"><span className="font-pixel text-lg tracking-wider">LET’S MAKE SOME NOISE.</span><PixelArt type="ghost" className="hidden h-8 w-8 sm:block" /></div>
          <div className="overflow-x-auto pb-1"><div className="min-w-[680px]">
            <div className="arrangement-row mb-2"><div className="text-[9px] font-bold tracking-widest">CHANNEL / SOUND</div>{Array.from({ length: 8 }, (_, i) => <div key={i} className={cn("text-center text-[10px] font-bold", playing && Math.floor(position / 16) === i && "bar-current")}>{String(i + 1).padStart(2, "0")}</div>)}</div>
            {tracks.map((t, row) => <div key={t.name} className="arrangement-row mb-2">
              <div className="flex items-center gap-2"><button aria-label={`${t.muted ? "Unmute" : "Mute"} ${t.name}`} onClick={() => setTracks(prev => prev.map((v, i) => i === row ? { ...v, muted: !v.muted } : v))} className="lcd-mute rounded p-1">{t.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}</button><button onClick={() => { setSelectedTrack(row); setPatternIndex(t.bars[selectedBar] ?? 0); }} className={cn("text-left", selectedTrack === row && "font-bold")}><span className="block text-[11px]">{t.name}</span><span className="block text-[8px] tracking-wider opacity-80">{t.chip}</span></button></div>
              {t.bars.map((p, bar) => <button key={bar} onClick={() => selectBlock(row, bar)} aria-label={`${t.name}, bar ${bar + 1}${p === null ? ", add pattern" : `, pattern ${p === 0 ? "A" : "B"}`}`} aria-pressed={selectedTrack === row && selectedBar === bar} className={cn("song-block relative flex h-11 items-center justify-between rounded px-2", p !== null && "filled", p === 1 && "variant", t.muted && "muted", selectedTrack === row && selectedBar === bar && "block-selected", playing && Math.floor(position / 16) === bar && "block-playing")}>
                {p === null ? <span className="mx-auto text-base opacity-40">+</span> : <><span className="text-xs font-bold">{p === 0 ? "A" : "B"}</span><span className="block-wave flex h-5 items-center gap-[2px]" aria-hidden="true">{t.patterns[p].filter((_, i) => i % 2 === 0).map((v, i) => <i key={i} style={{ height: v ? `${8 + i % 3 * 4}px` : "3px" }} />)}</span></>}
              </button>)}
            </div>)}
          </div></div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t-2 border-[var(--lcd-line)] pt-3 text-[9px] font-bold tracking-wide"><span>5 CHANNELS · 8 BARS · 4/4</span><span>SELECT A BLOCK TO EDIT ↓</span></div>
        </div>
        <div className="mt-3 flex items-center justify-between"><span className="bezel-label text-[8px]">DOT MATRIX WITH STEREO SOUND</span><div className="flex gap-1" aria-hidden="true"><i className="h-1 w-8 bg-[#a95273]" /><i className="h-1 w-4 bg-[#737b96]" /></div></div>
      </section>

      <section className="editor-panel rounded-xl p-3 sm:p-5" aria-labelledby="pattern-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="pattern-heading" className="section-heading flex items-center gap-2"><span className="section-index">02</span> PATTERN EDITOR <ChevronRight size={13} /><span className="text-[var(--berry)]">{track.name}</span></h2><div className="flex items-center gap-2"><Button onClick={() => updatePattern([...track.patterns[1 - patternIndex]])} className="hardware-button h-8 rounded-md px-2 text-[9px]"><Copy size={12} /> COPY {patternIndex === 0 ? "B → A" : "A → B"}</Button><Button onClick={() => updatePattern(steps([]))} className="hardware-button h-8 rounded-md px-2 text-[9px]"><Trash2 size={12} /> CLEAR</Button></div></div>
        <div className="grid gap-5 lg:grid-cols-[210px_1fr]">
          <aside className="sound-card rounded-lg p-3"><div className="mb-3 flex items-center gap-3"><div className="sound-icon"><PixelArt type="note" className="h-8 w-8" /></div><div><span className="case-label text-[8px]">ACTIVE SOUND</span><p className="mt-1 text-xs font-bold">{track.name}</p><p className="mt-1 text-[9px] text-[var(--case-muted)]">{track.chip} / 8-BIT</p></div></div><svg viewBox="0 0 200 28" className="wave-preview mb-3 h-8 w-full rounded" aria-hidden="true"><path d={track.voice === "triangle" ? "M0 24L25 4L50 24L75 4L100 24L125 4L150 24L175 4L200 24" : "M0 22H20V6H40V22H60V6H80V22H100V6H120V22H140V6H160V22H180V6H200"} fill="none" stroke="currentColor" strokeWidth="2" /></svg><Button onClick={() => updateTrack({ bars: track.bars.map((p, i) => i === selectedBar ? null : p) })} className="hardware-button h-8 w-full rounded text-[9px]">REMOVE SELECTED BLOCK</Button></aside>
          <div className="min-w-0"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="case-label text-[9px]">PATTERN</span>{[0, 1].map(i => <button key={i} onClick={() => assignPattern(i)} aria-pressed={patternIndex === i} className={cn("pattern-select h-8 w-9 rounded-md text-xs font-bold", patternIndex === i && "active")}>{i === 0 ? "A" : "B"}</button>)}</div><span className="case-label text-[9px]">16 STEPS / 1 BAR</span></div>
            <div className="overflow-x-auto pb-2"><div className="step-editor grid min-w-[520px] grid-cols-16 gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>{pattern.map((on, i) => <div key={i}><span className={cn("mb-2 block text-center text-[9px] font-bold", i % 4 === 0 ? "text-[var(--berry)]" : "text-[var(--case-muted)]")}>{String(i + 1).padStart(2, "0")}</span><button onClick={() => updatePattern(pattern.map((v, s) => s === i ? !v : v))} aria-label={`Step ${i + 1}`} aria-pressed={on} className={cn("step-pad flex h-14 w-full items-center justify-center rounded-md", on && "on", playing && position % 16 === i && "current")}><span className="step-light" /></button></div>)}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-6"><div><div className="mb-3 flex justify-between text-[9px] font-bold tracking-wider"><span>VOLUME</span><span>{track.volume}%</span></div><Slider aria-label="Selected track volume" className="console-slider" value={[track.volume]} onValueChange={([v]) => updateTrack({ volume: v })} max={100} /></div><div><div className="mb-3 flex justify-between text-[9px] font-bold tracking-wider"><span>PITCH</span><span>{track.pitch > 0 ? "+" : ""}{track.pitch} ST</span></div><Slider aria-label="Selected track pitch" className="console-slider" value={[track.pitch]} onValueChange={([v]) => updateTrack({ pitch: v })} min={-12} max={12} /></div></div>
            <p className="mt-5 text-[9px] text-[var(--case-muted)]">Tap steps to build your beat. Pattern edits update every matching block.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
