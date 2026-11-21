import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { noteName, type Note } from "@/lib/song";
import { cn } from "@/lib/utils";

const CELL = 36;
const ROW = 22;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

type Props = { notes: Note[]; rootMidi: number; cursor: number; onChange: (notes: Note[]) => void; onPreview: (midi: number) => void };

export function PianoRoll({ notes, rootMidi, cursor, onChange, onPreview }: Props) {
  const [octave, setOctave] = useState(Math.floor(rootMidi / 12) - 1);
  const [drawLength, setDrawLength] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Note | null>(null);
  const drag = useRef<{ note: Note; x: number; y: number; resize: boolean; moved: boolean; value: Note } | null>(null);
  const low = (octave + 1) * 12;
  const high = low + 23;
  const visible = notes.map(n => draft && draft.id === n.id ? draft : n).filter(n => n.midi >= low && n.midi <= high);
  const selected = notes.find(n => n.id === selectedId);
  const changeSelected = (patch: Partial<Note>) => {
    if (selected) onChange(notes.map(n => n.id === selected.id ? { ...n, ...patch } : n));
  };
  const removeSelected = () => { onChange(notes.filter(n => n.id !== selectedId)); setSelectedId(null); };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="case-label text-[9px]">OCTAVES</span><Button aria-label="Lower piano octave" disabled={octave <= 1} onClick={() => setOctave(o => o - 1)} className="hardware-button h-7 w-7 p-0"><Minus size={12} /></Button><span className="text-[10px] font-bold">{octave}–{octave + 1}</span><Button aria-label="Higher piano octave" disabled={octave >= 6} onClick={() => setOctave(o => o + 1)} className="hardware-button h-7 w-7 p-0"><Plus size={12} /></Button></div>
        <label className="flex items-center gap-2 text-[9px] font-bold">DRAW LENGTH<select aria-label="New note duration" value={drawLength} onChange={e => setDrawLength(Number(e.target.value))} className="rounded border border-[var(--case-border)] bg-[var(--case-light)] px-2 py-1">{[1, 2, 4, 8].map(n => <option key={n} value={n}>{n} steps</option>)}</select></label>
      </div>
      <div className="overflow-x-auto rounded-lg border-2 border-[#7f935f] bg-[#bdcc8b] pb-1">
        <div className="min-w-[636px]">
          <div className="flex border-b border-[#8da360]"><div className="w-[60px] shrink-0" /><div className="grid" style={{ gridTemplateColumns: `repeat(16, ${CELL}px)` }}>{Array.from({ length: 16 }, (_, i) => <span key={i} className="py-1 text-center text-[9px] font-bold text-[#344b2a]">{i + 1}</span>)}</div></div>
          <div className="flex">
            <div className="w-[60px] shrink-0">{Array.from({ length: 24 }, (_, i) => { const midi = high - i; const black = [1, 3, 6, 8, 10].includes(midi % 12); return <button key={midi} onClick={() => onPreview(midi)} aria-label={`Preview ${noteName(midi)}`} className={cn("piano-key block w-full border-b px-2 text-left text-[9px] font-bold", black && "black-key")} style={{ height: ROW }}>{noteName(midi)}</button>; })}</div>
            <div
              className="piano-grid relative shrink-0 touch-none"
              style={{ width: 16 * CELL, height: 24 * ROW }}
              onPointerDown={e => {
                if (e.button !== 0 || e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const start = clamp(Math.floor((e.clientX - rect.left) / CELL), 0, 15);
                const midi = high - clamp(Math.floor((e.clientY - rect.top) / ROW), 0, 23);
                const existing = notes.find(n => n.start <= start && n.start + n.duration > start && n.midi === midi);
                if (existing) { setSelectedId(existing.id); return; }
                const note = { id: crypto.randomUUID(), start, midi, duration: Math.min(drawLength, 16 - start) };
                onChange([...notes, note]); setSelectedId(note.id); onPreview(midi);
              }}
            >
              {cursor >= 0 && cursor < 16 && <div className="pointer-events-none absolute inset-y-0 z-20 w-[2px] bg-[var(--berry)]" style={{ left: cursor * CELL }} />}
              {visible.map(note => <div
                key={note.id} role="button" tabIndex={0}
                aria-label={`${noteName(note.midi)}, step ${note.start + 1}, duration ${note.duration} steps`}
                aria-pressed={selectedId === note.id}
                className={cn("piano-note absolute flex cursor-grab items-center rounded px-1 text-[8px] font-bold", selectedId === note.id && "note-selected")}
                style={{ left: note.start * CELL + 1, top: (high - note.midi) * ROW + 2, width: note.duration * CELL - 2, height: ROW - 4 }}
                onKeyDown={e => {
                  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onChange(notes.filter(n => n.id !== note.id)); }
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(note.id); onPreview(note.midi); }
                }}
                onPointerDown={e => {
                  if (e.button !== 0) return;
                  e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setSelectedId(note.id);
                  drag.current = { note, x: e.clientX, y: e.clientY, resize: (e.target as HTMLElement).dataset.resize === "true", moved: false, value: note };
                }}
                onPointerMove={e => {
                  const d = drag.current;
                  if (!d || d.note.id !== note.id) return;
                  const dx = Math.round((e.clientX - d.x) / CELL);
                  const dy = Math.round((e.clientY - d.y) / ROW);
                  if (dx === 0 && dy === 0 && !d.moved) return;
                  d.moved = true;
                  d.value = d.resize ? { ...d.note, duration: clamp(d.note.duration + dx, 1, 16 - d.note.start) } : { ...d.note, start: clamp(d.note.start + dx, 0, 16 - d.note.duration), midi: clamp(d.note.midi - dy, low, high) };
                  setDraft(d.value);
                }}
                onPointerUp={e => {
                  e.stopPropagation(); const d = drag.current;
                  if (d?.moved) onChange(notes.map(n => n.id === d.note.id ? d.value : n));
                  else onPreview(note.midi);
                  drag.current = null; setDraft(null);
                }}
                onPointerCancel={() => { drag.current = null; setDraft(null); }}
                onDoubleClick={() => onChange(notes.filter(n => n.id !== note.id))}
              >
                <span className="pointer-events-none truncate">{noteName(note.midi)}</span><span data-resize="true" title="Drag to resize note" className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r border-l border-[#e5f2b866] bg-[#e5f2b830]" />
              </div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]">
        {selected ? <><span className="font-bold">SELECTED NOTE</span><label>Pitch <select aria-label="Selected note pitch" value={selected.midi} onChange={e => changeSelected({ midi: Number(e.target.value) })} className="ml-1 rounded border bg-[var(--case-light)] p-1">{Array.from({ length: 108 }, (_, i) => i + 12).map(m => <option key={m} value={m}>{noteName(m)}</option>)}</select></label><label>Start <input aria-label="Selected note start step" type="number" min={1} max={17 - selected.duration} value={selected.start + 1} onChange={e => changeSelected({ start: clamp(Math.round(Number(e.target.value) || 1) - 1, 0, 16 - selected.duration) })} className="ml-1 w-12 rounded border bg-[var(--case-light)] p-1" /></label><label>Length <input aria-label="Selected note duration" type="number" min={1} max={16 - selected.start} value={selected.duration} onChange={e => changeSelected({ duration: clamp(Math.round(Number(e.target.value) || 1), 1, 16 - selected.start) })} className="ml-1 w-12 rounded border bg-[var(--case-light)] p-1" /></label><Button onClick={removeSelected} className="hardware-button h-7 px-2 text-[9px]"><Trash2 size={12} /> DELETE NOTE</Button></> : <span className="text-[var(--case-muted)]">Tap the grid to draw. Drag notes to move; drag their right edge to resize.</span>}
      </div>
    </div>
  );
}
