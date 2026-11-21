import { useEffect, useState } from "react";
import { Play, Square, SkipBack, Repeat2, Plus, Download, Volume2, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixelArt } from "./PixelArt";
import { SongArrangement } from "./SongArrangement";
import { PatternEditor } from "./PatternEditor";
import { useEditHistory } from "@/hooks/use-edit-history";
import { useSongPlayback } from "@/hooks/use-song-playback";
import { createDemoSong, newBlock, type Note, type SongBlock, type Track } from "@/lib/song";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MusicGenerator({ active }: { active: boolean }) {
  const { song, edit, finishGroup, undo, redo, canUndo, canRedo } = useEditHistory(createDemoSong);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedBar, setSelectedBar] = useState(0);
  const [preferredPattern, setPreferredPattern] = useState(0);
  const audio = useSongPlayback(song, active);
  const track = song.tracks[selectedTrack];
  const block = track.bars[selectedBar];
  const patternIndex = block?.pattern ?? Math.min(preferredPattern, track.patterns.length - 1);

  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (!active || !(e.ctrlKey || e.metaKey) || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      if (key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [active, undo, redo]);

  const updateTrack = (change: Partial<Track>, group?: string) => edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => i === selectedTrack ? { ...t, ...change } : t) }), group);
  const updateNotes = (notes: Note[]) => updateTrack({
    patterns: track.patterns.map((p, i) => i === patternIndex ? notes : p),
    bars: track.bars.map((b, i) => i === selectedBar ? b ?? newBlock(patternIndex) : b),
  });
  const updateBlock = (value: SongBlock, group?: string) => updateTrack({ bars: track.bars.map((b, i) => i === selectedBar ? value : b) }, group);
  const selectBlock = (row: number, bar: number) => {
    finishGroup(); setSelectedTrack(row); setSelectedBar(bar);
    const t = song.tracks[row];
    const assigned = t.bars[bar];
    if (assigned) setPreferredPattern(assigned.pattern);
    else edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => i === row ? { ...t, bars: t.bars.map((b, j) => j === bar ? newBlock(Math.min(preferredPattern, t.patterns.length - 1)) : b) } : t) }));
  };
  const moveBlock = (row: number, from: number, to: number) => {
    const assigned = song.tracks[row].bars[from];
    if (!assigned || from === to) return;
    edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => {
      if (i !== row) return t;
      const bars = [...t.bars]; [bars[from], bars[to]] = [bars[to], bars[from]];
      return { ...t, bars };
    }) }));
    setSelectedTrack(row); setSelectedBar(to); setPreferredPattern(assigned.pattern);
  };
  const duplicateBlock = (destination: number) => {
    if (!block || destination === selectedBar) return;
    if (track.bars[destination] && !window.confirm(`Replace the block in bar ${destination + 1} with an independent copy? You can undo this.`)) return;
    const index = track.patterns.length;
    updateTrack({
      patterns: [...track.patterns, track.patterns[block.pattern].map(n => ({ ...n, id: crypto.randomUUID() }))],
      bars: track.bars.map((b, i) => i === destination ? { ...block, pattern: index } : b),
    });
    setSelectedBar(destination); setPreferredPattern(index);
    toast.success(`Independent copy placed in bar ${destination + 1}.`);
  };
  const newSong = () => {
    if (!window.confirm("Start a blank song? Your current song can be restored with Undo.")) return;
    audio.stop(); setSelectedTrack(0); setSelectedBar(0); setPreferredPattern(0);
    edit({ ...createDemoSong(), name: "Untitled song", tracks: createDemoSong().tracks.map(t => ({ ...t, patterns: [[], []], bars: Array(8).fill(null) })) });
  };
  const exportSong = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, ...song }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${song.name.replace(/[^a-z0-9_-]/gi, "-") || "song"}.chipboy.json`; link.click(); URL.revokeObjectURL(url);
    toast.success("Exported notes, patterns, block timing, and track settings.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3"><div className="cartridge-badge"><PixelArt type="note" className="h-7 w-7" /></div><div><label htmlFor="song-name" className="case-label text-[9px]">CURRENT CARTRIDGE</label><input id="song-name" aria-label="Song name" value={song.name} onChange={e => edit(prev => ({ ...prev, name: e.target.value }), "song-name")} onBlur={finishGroup} className="song-name block w-48 bg-transparent text-lg font-bold outline-none sm:w-64" /></div></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" className="hardware-button h-9 rounded-md px-3 text-[10px]"><Undo2 size={14} /> UNDO</Button>
          <Button onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" className="hardware-button h-9 rounded-md px-3 text-[10px]"><Redo2 size={14} /> REDO</Button>
          <Button onClick={newSong} className="hardware-button h-9 rounded-md px-3 text-[10px]"><Plus size={14} /> NEW SONG</Button>
          <Button onClick={exportSong} className="hardware-button h-9 rounded-md px-3 text-[10px]"><Download size={14} /> EXPORT DATA</Button>
        </div>
      </div>

      <div className="transport flex flex-wrap items-center gap-4 rounded-xl p-3 sm:gap-5 sm:px-5">
        <div className="flex items-center gap-2"><Button aria-label={audio.playing ? "Pause playback" : "Play song"} onClick={audio.toggle} className={cn("play-button h-11 w-14 rounded-lg", audio.playing && "is-playing")}>{audio.playing ? <span className="text-lg">Ⅱ</span> : <Play size={19} fill="currentColor" />}</Button><Button aria-label="Stop and rewind" onClick={audio.stop} className="hardware-button h-11 w-11 rounded-lg"><Square size={15} fill="currentColor" /></Button><Button aria-label="Rewind" onClick={audio.rewind} className="hardware-button h-11 w-10 rounded-lg"><SkipBack size={17} /></Button><Button aria-label="Loop song" aria-pressed={audio.loop} onClick={() => audio.setLoop(!audio.loop)} className={cn("hardware-button h-11 w-10 rounded-lg", audio.loop && "engaged")}><Repeat2 size={18} /></Button></div>
        <div className="readout flex items-center gap-5 rounded-md px-4 py-2"><div><label htmlFor="tempo" className="block text-[8px] tracking-widest">TEMPO</label><div className="flex items-baseline gap-1"><input id="tempo" aria-label="Tempo in beats per minute" type="number" min={40} max={240} value={song.bpm} onBlur={finishGroup} onChange={e => edit(prev => ({ ...prev, bpm: Math.min(240, Math.max(40, Number(e.target.value) || 40)) }), "tempo")} className="w-12 bg-transparent text-xl font-bold outline-none" /><span className="text-[9px]">BPM</span></div></div><div className="readout-divider" /><div><span className="block text-[8px] tracking-widest">POSITION</span><span className="text-xl font-bold">{String(audio.position < 0 ? 1 : Math.floor(audio.position / 16) + 1).padStart(2, "0")}<span className="mx-1 opacity-60">:</span>{String(audio.position < 0 ? 1 : audio.position % 16 + 1).padStart(2, "0")}</span></div></div>
        <div className="ml-auto flex items-center gap-3"><Volume2 size={16} /><div className="w-24"><div className="mb-2 flex justify-between text-[8px] font-bold tracking-widest"><span>MASTER</span><span>{song.master}%</span></div><Slider aria-label="Master volume" value={[song.master]} onValueChange={([v]) => edit(prev => ({ ...prev, master: v }), "master")} onValueCommit={finishGroup} max={100} className="console-slider" /></div></div>
      </div>

      <section className="screen-bezel rounded-xl p-3 sm:p-4" aria-labelledby="song-heading">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 id="song-heading" className="bezel-label">01 / SONG ARRANGEMENT</h2><span className="bezel-label text-[8px]"><span className={cn("mr-2 inline-block h-1.5 w-1.5 rounded-full", audio.playing ? "bg-[#cbdc8e]" : "bg-[#898c7b]")} />{audio.playing ? "PLAYING" : "READY TO PLAY"}</span></div>
        <div className="game-screen rounded-md p-3 sm:p-4">
          <div className="lcd-heading mb-4 flex items-center justify-between border-b-2 border-[var(--lcd-line)] pb-3"><span className="font-pixel text-lg tracking-wider">LET’S MAKE SOME NOISE.</span><PixelArt type="ghost" className="hidden h-8 w-8 sm:block" /></div>
          <SongArrangement tracks={song.tracks} selectedTrack={selectedTrack} selectedBar={selectedBar} playing={audio.playing} position={audio.position} onSelectBlock={selectBlock}
            onSelectTrack={row => { finishGroup(); setSelectedTrack(row); setPreferredPattern(song.tracks[row].bars[selectedBar]?.pattern ?? 0); }}
            onToggleMute={row => edit(prev => ({ ...prev, tracks: prev.tracks.map((t, i) => i === row ? { ...t, muted: !t.muted } : t) }))}
            onMoveBlock={moveBlock} />
        </div>
        <div className="mt-3 flex items-center justify-between"><span className="bezel-label text-[8px]">DOT MATRIX WITH STEREO SOUND</span><div className="flex gap-1" aria-hidden="true"><i className="h-1 w-8 bg-[#a95273]" /><i className="h-1 w-4 bg-[#737b96]" /></div></div>
      </section>

      <PatternEditor key={selectedTrack} track={track} block={block} patternIndex={patternIndex} bar={selectedBar} position={audio.position} playing={audio.playing}
        onNotes={updateNotes}
        onAssign={index => { setPreferredPattern(index); updateBlock({ ...(block ?? newBlock(index)), pattern: index }); }}
        onCopy={index => updateNotes(track.patterns[index].map(n => ({ ...n, id: crypto.randomUUID() })))}
        onTrack={updateTrack} onBlock={updateBlock} onDuplicate={duplicateBlock}
        onRemove={() => updateTrack({ bars: track.bars.map((b, i) => i === selectedBar ? null : b) })}
        onFinish={finishGroup} onPreview={midi => { void audio.preview(track, midi); }} />
    </div>
  );
}
