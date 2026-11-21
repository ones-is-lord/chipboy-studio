import { useState } from "react";
import { Headphones, Volume2, VolumeX } from "lucide-react";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { blockNotes, coveringBlock, patternLabel, type SongBlock as Block, type Track } from "@/lib/song";
import { trackColor } from "@/lib/instruments";
import { cn } from "@/lib/utils";

type BlockPosition = { row: number; bar: number };
type Props = { tracks: Track[]; selectedTrack: number; selectedBar: number; playing: boolean; position: number; onSelectBlock: (row: number, bar: number) => void; onSelectTrack: (row: number) => void; onToggleMute: (row: number) => void; onToggleSolo: (row: number) => void; onMoveBlock: (row: number, from: number, to: number) => void };
const blockId = (row: number, bar: number) => `song-block-${row}-${bar}`;
const collision: CollisionDetection = args => {
  const droppableContainers = args.droppableContainers.filter(c => c.data.current?.row === args.active.data.current?.row);
  return args.pointerCoordinates ? pointerWithin({ ...args, droppableContainers }) : closestCenter({ ...args, droppableContainers, collisionRect: { ...args.collisionRect, width: 1, right: args.collisionRect.left + 1 } });
};
const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
  event.preventDefault();
  const { active, collisionRect, droppableContainers, droppableRects } = context;
  if (!active || !collisionRect) return;
  const row = active.data.current?.row;
  const candidates = droppableContainers.getEnabled().filter(c => c.data.current?.row === row);
  const nearest = candidates.reduce<(typeof candidates)[number] | undefined>((best, item) => {
    const rect = droppableRects.get(item.id); const prev = best && droppableRects.get(best.id);
    return rect && (!prev || Math.abs(rect.left - collisionRect.left) < Math.abs(prev.left - collisionRect.left)) ? item : best;
  }, undefined);
  if (!nearest) return;
  const next = nearest.data.current?.bar + (event.code === "ArrowRight" ? 1 : -1);
  const target = droppableRects.get(blockId(row, next));
  if (target) return { x: currentCoordinates.x + target.left - collisionRect.left, y: currentCoordinates.y };
};
function Content({ block, track }: { block: Block; track: Track }) {
  const notes = blockNotes(track, block);
  return <><span className="shrink-0 text-[10px] font-bold">{track.voice === "sample" ? "SMP" : patternLabel(block.pattern)}</span>{block.length >= 12 && <span className="block-wave mx-2 flex h-5 items-center gap-[3px]" aria-hidden="true">{Array.from({ length: Math.min(24, Math.ceil(block.length / 3)) }, (_, i) => <i key={i} style={{ height: notes.some(n => Math.floor(n.start / block.length * 6) === i % 6) ? `${8 + i % 3 * 4}px` : "3px" }} />)}</span>}{block.length >= 32 && <span className="ml-auto shrink-0 text-[9px]">{(block.length / 16).toFixed(1)} BARS</span>}</>;
}
function Slot({ track, row, bar, selected, playing, position, dragRow, onSelect }: { track: Track; row: number; bar: number; selected: boolean; playing: boolean; position: number; dragRow?: number; onSelect: () => void }) {
  const block = track.bars[bar]; const cover = coveringBlock(track, bar); const id = blockId(row, bar);
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({ id, data: { row, bar }, disabled: !block });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id, data: { row, bar }, disabled: dragRow !== undefined && dragRow !== row });
  const current = block && playing && position >= bar * 16 && position < bar * 16 + block.length;
  return <div ref={dropRef} className={cn("block-slot relative h-11 rounded", isOver && dragRow !== undefined && "block-drop-target", dragRow !== undefined && dragRow !== row && "block-unavailable")}>
    {block ? <button ref={dragRef} {...attributes} {...listeners} onClick={onSelect} aria-pressed={selected} aria-label={`${track.name}, bar ${bar + 1}, ${block.length} steps, draggable`} title={`Source ${block.start + 1}–${block.end} · output ${block.length} steps. Drag to move or swap.`} style={{ width: Math.max(18, block.length / 16 * 78 - 6), zIndex: isDragging ? 20 : selected ? 12 : 10, borderLeft: `3px solid ${trackColor(track)}` }} className={cn("song-block filled absolute left-0 top-0 flex h-11 cursor-grab select-none items-center overflow-hidden rounded px-2", block.pattern % 2 === 1 && "variant", selected && "block-selected", current && "block-playing", isDragging && "block-dragging", track.muted && "muted")}><Content block={block} track={track} /></button> : <button onClick={onSelect} className="h-full w-full rounded text-[#344b2a]" aria-label={cover ? `Continuation of ${track.name} block at bar ${cover.bar + 1}` : `${track.name}, bar ${bar + 1}, add pattern`}>{cover ? <span className="text-[9px] opacity-40">↳</span> : <span className="text-base opacity-40">+</span>}</button>}
  </div>;
}
export function SongArrangement({ tracks, selectedTrack, selectedBar, playing, position, onSelectBlock, onSelectTrack, onToggleMute, onToggleSolo, onMoveBlock }: Props) {
  const [dragged, setDragged] = useState<BlockPosition | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }));
  const count = tracks[0].bars.length;
  const draggedTrack = dragged ? tracks[dragged.row] : null;
  const draggedBlock = dragged && draggedTrack ? draggedTrack.bars[dragged.bar] : null;
  const grid = { gridTemplateColumns: `155px repeat(${count}, 72px)` };
  return <DndContext sensors={sensors} collisionDetection={collision} onDragStart={({ active }) => setDragged(active.data.current as BlockPosition)} onDragCancel={() => setDragged(null)} onDragEnd={({ active, over }) => { const a = active.data.current as BlockPosition; const b = over?.data.current as BlockPosition | undefined; if (b && b.row === a.row && b.bar !== a.bar) onMoveBlock(a.row, a.bar, b.bar); setDragged(null); }} accessibility={{ screenReaderInstructions: { draggable: "Press Space to pick up a block. Use Left and Right to move by bars, Space to drop, and Escape to cancel. Overlapping invalid swaps will be rejected." } }}>
    <div className="overflow-x-auto pb-2"><div style={{ width: 155 + count * 78 }}>
      <div className="arrangement-row mb-2" style={grid}><span className="text-[9px] font-bold tracking-widest">CHANNEL / SOUND</span>{Array.from({ length: count }, (_, i) => <span key={i} className={cn("text-center text-[10px] font-bold", playing && Math.floor(position / 16) === i && "bar-current")}>{String(i + 1).padStart(2, "0")}</span>)}</div>
      {tracks.map((track, row) => <div key={row} className="arrangement-row mb-2" style={grid}><div className="flex items-center gap-1.5">
        <button aria-label={`${track.muted ? "Unmute" : "Mute"} ${track.name}`} onClick={() => onToggleMute(row)} className="lcd-mute rounded p-1">{track.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}</button>
        <button aria-label={`${track.solo ? "Unsolo" : "Solo"} ${track.name}`} aria-pressed={Boolean(track.solo)} onClick={() => onToggleSolo(row)} className={cn("lcd-mute rounded p-1", track.solo && "bg-[var(--berry)] text-[#fffde8]")}><Headphones size={13} /></button>
        <button onClick={() => onSelectTrack(row)} className="min-w-0 text-left"><span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: trackColor(track) }} aria-hidden="true" /><span className={cn("block truncate font-pixel text-[10px]", selectedTrack === row && "font-bold")}>{track.name}</span></span><span className="block text-[8px] tracking-wider opacity-80">{track.chip}</span></button>
      </div>{track.bars.map((_, bar) => <Slot key={bar} track={track} row={row} bar={bar} selected={selectedTrack === row && selectedBar === bar} playing={playing} position={position} dragRow={dragged?.row} onSelect={() => onSelectBlock(row, bar)} />)}</div>)}
    </div></div>
    <div className="mt-3 flex flex-wrap justify-between gap-2 border-t-2 border-[var(--lcd-line)] pt-3 text-[9px] font-bold"><span>{tracks.length} CHANNELS · {count} BARS · 4/4</span><span>{dragged ? "DROP WITHIN THIS CHANNEL · SPACE NEEDED FOR LONG CLIPS" : "MULTI-BAR CLIPS · DRAG TO MOVE / SWAP"}</span></div><p className="mt-2 text-[9px]">Touch: hold then drag. Keyboard: Space, ← / →, Space. Click a continuation to edit its whole block.</p>
    <DragOverlay dropAnimation={null}>{draggedTrack && draggedBlock && <div className="song-block filled block-drag-overlay flex h-11 items-center overflow-hidden rounded px-2"><Content block={draggedBlock} track={draggedTrack} /></div>}</DragOverlay>
  </DndContext>;
}
