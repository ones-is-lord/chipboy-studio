import { useEffect, useState } from "react";
import { Copy, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { newBlock, patternLabel, type SongBlock } from "@/lib/song";

type Props = {
  block: SongBlock | null; bar: number;
  onChange: (block: SongBlock, group?: string) => void;
  onFinish: () => void; onDuplicate: (destination: number) => void; onRemove: () => void;
};

export function BlockEditor({ block, bar, onChange, onFinish, onDuplicate, onRemove }: Props) {
  const [destination, setDestination] = useState((bar + 1) % 8);
  useEffect(() => setDestination((bar + 1) % 8), [bar]);
  if (!block) return <div className="sound-card rounded-lg p-3 text-[10px] text-[var(--case-muted)]">Select or add a song block to duplicate, trim, or stretch it.</div>;
  const trim = (start: number, end: number, group: string) => onChange({ ...block, start, end, length: end - start }, group);
  return (
    <div className="sound-card rounded-lg p-3">
      <h3 className="mb-3 text-[10px] font-bold tracking-wider">BLOCK {patternLabel(block.pattern)} / BAR {bar + 1}</h3>
      <div className="mb-4 flex items-end gap-2"><label className="min-w-0 flex-1 text-[9px] font-bold">COPY TO BAR<select aria-label="Duplicate block destination bar" className="mt-1 block w-full rounded border border-[var(--case-border)] bg-[var(--case-light)] px-2 py-2" value={destination} onChange={e => setDestination(Number(e.target.value))}>{Array.from({ length: 8 }, (_, i) => i).filter(i => i !== bar).map(i => <option key={i} value={i}>Bar {i + 1}</option>)}</select></label><Button onClick={() => onDuplicate(destination)} className="hardware-button h-9 px-2 text-[9px]"><Copy size={12} /> COPY</Button></div>
      <div className="mb-2 flex justify-between text-[9px] font-bold"><span>TRIM IN</span><span>STEP {block.start + 1}</span></div>
      <Slider aria-label="Block trim start" className="console-slider mb-5" min={0} max={15} step={1} value={[block.start]} onValueChange={([v]) => trim(Math.min(v, block.end - 1), block.end, "trim-start")} onValueCommit={onFinish} />
      <div className="mb-2 flex justify-between text-[9px] font-bold"><span>TRIM OUT</span><span>STEP {block.end}</span></div>
      <Slider aria-label="Block trim end" className="console-slider mb-5" min={1} max={16} step={1} value={[block.end]} onValueChange={([v]) => trim(block.start, Math.max(v, block.start + 1), "trim-end")} onValueCommit={onFinish} />
      <label className="mb-3 flex items-center justify-between gap-2 text-[9px] font-bold">STRETCH TO<select aria-label="Stretched block length" className="rounded border border-[var(--case-border)] bg-[var(--case-light)] p-2" value={block.length} onChange={e => onChange({ ...block, length: Number(e.target.value) })}>{Array.from({ length: 16 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} steps</option>)}</select></label>
      <div className="mb-2 flex h-3 gap-[2px]" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} className="flex-1 rounded-sm" style={{ background: i < block.length ? "#526c37" : "#bcc6a9" }} />)}</div>
      <p className="mb-3 text-[9px] leading-relaxed text-[var(--case-muted)]">Source {block.end - block.start} → output {block.length} steps ({(block.length / (block.end - block.start)).toFixed(2)}×). Stretch changes timing, not pitch. Trim resets stretch.</p>
      <div className="flex gap-2"><Button onClick={() => onChange(newBlock(block.pattern))} className="hardware-button h-8 flex-1 px-2 text-[9px]"><RotateCcw size={12} /> RESET</Button><Button onClick={onRemove} className="hardware-button h-8 flex-1 px-2 text-[9px]"><Trash2 size={12} /> REMOVE</Button></div>
      <p className="mt-3 text-[9px] leading-relaxed text-[var(--case-muted)]">Copy creates an independent pattern. Trim/stretch affects only this block; the rest of its bar stays silent.</p>
    </div>
  );
}
