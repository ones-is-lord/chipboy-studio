import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export function SampleWaveform({ buffer, selection, onSelect }: { buffer: AudioBuffer; selection: [number, number]; onSelect: (range: [number, number]) => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ edge: string; anchor: number } | null>(null);
  const span = buffer.duration / zoom;
  const start = Math.min(offset, buffer.duration - span);
  const path = useMemo(() => {
    const data = buffer.getChannelData(0); const points: string[] = [];
    for (let x = 0; x < 800; x++) {
      const first = Math.floor((start + x / 800 * span) * buffer.sampleRate);
      const last = Math.min(data.length, Math.max(first + 1, Math.floor((start + (x + 1) / 800 * span) * buffer.sampleRate)));
      let min = 0; let max = 0;
      for (let i = first; i < last; i++) { min = Math.min(min, data[i]); max = Math.max(max, data[i]); }
      points.push(`M${x} ${80 - max * 70}V${80 - min * 70}`);
    }
    return points.join(" ");
  }, [buffer, start, span]);
  const x = (time: number) => (time - start) / span * 800;
  return <div>
    <div className="mb-2 flex items-center justify-between text-[10px] font-bold"><span>{start.toFixed(2)}s – {(start + span).toFixed(2)}s</span><div className="flex items-center gap-2"><Button aria-label="Zoom out waveform" disabled={zoom === 1} className="hardware-button h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(1, z / 2))}><Minus size={12} /></Button><span>{zoom}×</span><Button aria-label="Zoom in waveform" disabled={zoom === 16} className="hardware-button h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(16, z * 2))}><Plus size={12} /></Button></div></div>
    <svg viewBox="0 0 800 160" preserveAspectRatio="none" className="game-screen h-40 w-full touch-none rounded-md" aria-label="Audio waveform; drag to select a region"
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        const t = Math.min(buffer.duration, Math.max(0, start + (e.clientX - rect.left) / rect.width * span));
        const edge = (e.target as SVGElement).getAttribute("data-edge") ?? "range";
        drag.current = { edge, anchor: t };
        if (edge === "range") onSelect([t, Math.min(buffer.duration, t + 0.01)]);
      }}
      onPointerMove={e => {
        if (!drag.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const t = Math.min(buffer.duration, Math.max(0, start + (e.clientX - rect.left) / rect.width * span));
        const min = Math.min(0.01, buffer.duration / 2);
        if (drag.current.edge === "start") onSelect([Math.min(t, selection[1] - min), selection[1]]);
        else if (drag.current.edge === "end") onSelect([selection[0], Math.max(t, selection[0] + min)]);
        else onSelect([Math.min(t, drag.current.anchor), Math.max(t, drag.current.anchor) + (t === drag.current.anchor ? min : 0)]);
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <path d="M0 80H800" stroke="#93a966" /><rect x={x(selection[0])} y="0" width={Math.max(1, x(selection[1]) - x(selection[0]))} height="160" fill="#526c37" opacity=".2" />
      <path d={path} stroke="#344b2a" strokeWidth="1" fill="none" pointerEvents="none" />
      <rect data-edge="start" x={x(selection[0]) - 6} y="0" width="12" height="160" fill="#933d60" opacity=".8" className="cursor-ew-resize" />
      <rect data-edge="end" x={x(selection[1]) - 6} y="0" width="12" height="160" fill="#933d60" opacity=".8" className="cursor-ew-resize" />
    </svg>
    {zoom > 1 && <input type="range" aria-label="Waveform pan" min={0} max={Math.max(0.001, buffer.duration - span)} step={0.001} value={start} onChange={e => setOffset(Number(e.target.value))} className="mt-2 w-full accent-[#933d60]" />}
    <p className="mt-2 text-[9px] text-[var(--case-muted)]">Drag to select audio; drag berry-colored edges to fine-tune. Zoom and pan for detail.</p>
  </div>;
}
