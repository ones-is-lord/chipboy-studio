import { useEffect, useState } from "react";
import { Copy, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { newBlock, patternLabel, type SongBlock } from "@/lib/song";

type Props = { block: SongBlock | null; bar: number; barCount: number; onChange: (block: SongBlock, group?: string) => void; onFinish: () => void; onDuplicate: (destination: number) => void; onRemove: () => void };
export function BlockEditor({ block, bar, barCount, onChange, onFinish, onDuplicate, onRemove }: Props) {
  const [destination, setDestination] = useState((bar + 1) % barCount);
  useEffect(() => setDestination((bar + 1) % barCount), [bar, barCount]);
  if (!block) return <div className="sound-card rounded-lg p-3 text-[10px] text-[var(--case-muted)]">Select or add a block to duplicate, trim, or stretch it.</div>;
  const max = (barCount - bar) * 16;
  const trim = (start: number, end: number, group: string) => onChange({ ...block, start, end, length: end - start }, group);
  const length = (n: number, group?: string) => onChange({ ...block, length: Math.min(max, Math.max(1, Math.round(n))) }, group);
  return <div className="sound-card rounded-lg p-3">
    <h3 className="mb-3 text-[10px] font-bold tracking-wider">BLOCK {patternLabel(block.pattern)} / BAR {bar + 1}</h3>
    <div className="mb-4 flex items-end gap-2"><label className="flex-1 text-[9px] font-bold">COPY TO BAR<select aria-label="Duplicate block destination bar" value={destination} onChange={e => setDestination(Number(e.target.value))} className="mt-1 block w-full rounded border bg-[var(--case-light)] p-2">{Array.from({ length: barCount }, (_, i) => i).filter(i => i !== bar).map(i => <option key={i} value={i}>{i + 1}</option>)}</select></label><Button onClick={() => onDuplicate(destination)} className="hardware-button h-9 px-2 text-[9px]"><Copy size={12} /> COPY</Button></div>
    <div className="mb-2 flex justify-between text-[9px] font-bold"><span>TRIM IN</span><span>SOURCE STEP {block.start + 1}</span></div><Slider aria-label="Block source trim start" className="console-slider mb-5" min={0} max={15} step={1} value={[block.start]} onValueChange={([v]) => trim(Math.min(v, block.end - 1), block.end, "trim-start")} onValueCommit={onFinish} />
    <div className="mb-2 flex justify-between text-[9px] font-bold"><span>TRIM OUT</span><span>SOURCE STEP {block.end}</span></div><Slider aria-label="Block source trim end" className="console-slider mb-5" min={1} max={16} step={1} value={[block.end]} onValueChange={([v]) => trim(block.start, Math.max(v, block.start + 1), "trim-end")} onValueCommit={onFinish} />
    <label className="mb-3 flex items-center justify-between gap-2 text-[9px] font-bold">OUTPUT STEPS<input aria-label="Multi-bar block length in steps" type="number" min={1} max={max} value={block.length} onChange={e => length(Number(e.target.value) || 1, "block-length")} onBlur={onFinish} className="w-16 rounded border bg-[var(--case-light)] p-2" /></label>
    <div className="mb-3 grid grid-cols-4 gap-1">{[1, 2, 4, 8].map(bars => <Button key={bars} disabled={bars * 16 > max} onClick={() => length(bars * 16)} className="hardware-button h-7 px-1 text-[8px]">{bars} BAR{bars > 1 ? "S" : ""}</Button>)}</div>
    <p className="mb-3 text-[9px] leading-relaxed text-[var(--case-muted)]">Source {block.end - block.start} → output {block.length} steps ({(block.length / 16).toFixed(2)} bars). Notes and sustained durations stretch across bars without changing pitch. Trim resets output length.</p>
    <div className="flex gap-2"><Button onClick={() => onChange(newBlock(block.pattern))} className="hardware-button h-8 flex-1 px-2 text-[9px]"><RotateCcw size={12} /> RESET</Button><Button onClick={onRemove} className="hardware-button h-8 flex-1 px-2 text-[9px]"><Trash2 size={12} /> REMOVE</Button></div>
    <p className="mt-3 text-[9px] leading-relaxed text-[var(--case-muted)]">Extending over existing blocks asks before replacing them. A duplicate has its own pattern. Sample blocks stretch or repeat according to sample loop mode.</p>
  </div>;
}
