import { useState } from "react";
import { ChevronRight, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixelArt } from "./PixelArt";
import { PianoRoll } from "./PianoRoll";
import { BlockEditor } from "./BlockEditor";
import { patternLabel, type Note, type SongBlock, type Track } from "@/lib/song";
import { cn } from "@/lib/utils";

type Props = {
  track: Track; block: SongBlock | null; patternIndex: number; bar: number; position: number; playing: boolean;
  onNotes: (notes: Note[]) => void; onAssign: (index: number) => void; onCopy: (index: number) => void;
  onTrack: (patch: Partial<Track>, group?: string) => void;
  onBlock: (block: SongBlock, group?: string) => void;
  onDuplicate: (bar: number) => void; onRemove: () => void; onFinish: () => void; onPreview: (midi: number) => void;
};

export function PatternEditor({ track, block, patternIndex, bar, position, playing, onNotes, onAssign, onCopy, onTrack, onBlock, onDuplicate, onRemove, onFinish, onPreview }: Props) {
  const [mode, setMode] = useState<"steps" | "piano">(track.voice === "kick" || track.voice === "noise" ? "steps" : "piano");
  const notes = track.patterns[patternIndex];
  const cursor = playing && Math.floor(position / 16) === bar && block && position % 16 < block.length ? block.start + position % 16 * (block.end - block.start) / block.length : -1;
  const copySource = patternIndex === 0 ? 1 : 0;
  return (
    <section className="editor-panel rounded-xl p-3 sm:p-5" aria-labelledby="pattern-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="pattern-heading" className="section-heading flex items-center gap-2"><span className="section-index">02</span> PATTERN EDITOR <ChevronRight size={13} /><span className="text-[var(--berry)]">{track.name}</span></h2>
        <div className="flex gap-2"><Button onClick={() => onCopy(copySource)} className="hardware-button h-8 rounded-md px-2 text-[9px]"><Copy size={12} /> {patternLabel(copySource)} → {patternLabel(patternIndex)}</Button><Button onClick={() => onNotes([])} className="hardware-button h-8 rounded-md px-2 text-[9px]"><Trash2 size={12} /> CLEAR NOTES</Button></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <div className="sound-card flex items-center gap-3 rounded-lg p-3"><div className="sound-icon"><PixelArt type="note" className="h-8 w-8" /></div><div><span className="case-label text-[8px]">ACTIVE SOUND</span><p className="mt-1 text-xs font-bold">{track.name}</p><p className="mt-1 text-[9px] text-[var(--case-muted)]">{track.chip} / 8-BIT</p></div></div>
          <BlockEditor block={block} bar={bar} onChange={onBlock} onFinish={onFinish} onDuplicate={onDuplicate} onRemove={onRemove} />
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[9px] font-bold">PATTERN<select aria-label="Assigned block pattern" value={patternIndex} onChange={e => onAssign(Number(e.target.value))} className="pattern-select h-8 rounded-md px-3 text-xs">{track.patterns.map((_, i) => <option key={i} value={i}>{patternLabel(i)}</option>)}</select></label>
            <div className="flex gap-2">{(["steps", "piano"] as const).map(value => <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value} className={cn("console-tab rounded-md px-3 py-2 text-[9px] font-bold uppercase", mode === value && "selected")}>{value === "steps" ? "STEP PADS" : "PIANO ROLL"}</button>)}</div>
          </div>
          {mode === "piano" ? <PianoRoll notes={notes} rootMidi={track.rootMidi} cursor={cursor} onChange={onNotes} onPreview={onPreview} /> : <>
            <div className="overflow-x-auto pb-2"><div className="grid min-w-[520px] gap-1.5" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>{Array.from({ length: 16 }, (_, i) => {
              const on = notes.some(n => n.start === i);
              return <div key={i}><span className={cn("mb-2 block text-center text-[9px] font-bold", i % 4 === 0 ? "text-[var(--berry)]" : "text-[var(--case-muted)]")}>{String(i + 1).padStart(2, "0")}</span><button aria-label={`Step ${i + 1}`} aria-pressed={on} onClick={() => onNotes(on ? notes.filter(n => n.start !== i) : [...notes, { id: crypto.randomUUID(), midi: track.rootMidi, start: i, duration: 1 }])} className={cn("step-pad flex h-14 w-full items-center justify-center rounded-md", on && "on", Math.floor(cursor) === i && "current")}><span className="step-light" /></button></div>;
            })}</div></div>
            <p className="mt-3 text-[9px] text-[var(--case-muted)]">Tap to add a root note or remove notes starting on that step.</p>
          </>}
          <div className="mt-5 grid grid-cols-2 gap-6">
            <div><div className="mb-3 flex justify-between text-[9px] font-bold tracking-wider"><span>VOLUME</span><span>{track.volume}%</span></div><Slider aria-label="Selected track volume" className="console-slider" value={[track.volume]} onValueChange={([v]) => onTrack({ volume: v }, "track-volume")} onValueCommit={onFinish} max={100} /></div>
            <div><div className="mb-3 flex justify-between text-[9px] font-bold tracking-wider"><span>PITCH</span><span>{track.pitch > 0 ? "+" : ""}{track.pitch} ST</span></div><Slider aria-label="Selected track pitch" className="console-slider" value={[track.pitch]} onValueChange={([v]) => onTrack({ pitch: v }, "track-pitch")} onValueCommit={onFinish} min={-12} max={12} /></div>
          </div>
          <p className="mt-5 text-[9px] leading-relaxed text-[var(--case-muted)]">Pattern notes are shared by matching blocks. Duplicate a block to edit its copy independently. All musical edits support Undo/Redo.</p>
        </div>
      </div>
    </section>
  );
}
