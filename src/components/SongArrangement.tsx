import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { blockNotes, patternLabel, type SongBlock as Block, type Track } from "@/lib/song";
import { cn } from "@/lib/utils";

type BlockPosition = { row: number; bar: number };
type Props = {
  tracks: Track[]; selectedTrack: number; selectedBar: number; playing: boolean; position: number;
  onSelectBlock: (row: number, bar: number) => void;
  onSelectTrack: (row: number) => void;
  onToggleMute: (row: number) => void;
  onMoveBlock: (row: number, from: number, to: number) => void;
};
const blockId = (row: number, bar: number) => `song-block-${row}-${bar}`;
const channelCollision: CollisionDetection = args => {
  const row = args.active.data.current?.row;
  const droppableContainers = args.droppableContainers.filter(c => c.data.current?.row === row);
  return args.pointerCoordinates ? pointerWithin({ ...args, droppableContainers }) : closestCenter({ ...args, droppableContainers });
};
const barKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
  event.preventDefault();
  const { active, collisionRect, droppableContainers, droppableRects } = context;
  if (!active || !collisionRect) return;
  const row = active.data.current?.row;
  const center = collisionRect.left + collisionRect.width / 2;
  const candidates = droppableContainers.getEnabled().filter(c => c.data.current?.row === row);
  const nearest = candidates.reduce<(typeof candidates)[number] | undefined>((best, item) => {
    const rect = droppableRects.get(item.id);
    if (!rect) return best;
    const bestRect = best && droppableRects.get(best.id);
    return !bestRect || Math.abs(rect.left + rect.width / 2 - center) < Math.abs(bestRect.left + bestRect.width / 2 - center) ? item : best;
  }, undefined);
  if (!nearest) return;
  const nextBar = nearest.data.current?.bar + (event.code === "ArrowRight" ? 1 : -1);
  const target = droppableRects.get(blockId(row, nextBar));
  if (!target) return;
  return { x: currentCoordinates.x + target.left - collisionRect.left, y: currentCoordinates.y };
};

function BlockContent({ block, track }: { block: Block | null; track: Track }) {
  if (!block) return <span className="mx-auto text-base opacity-40">+</span>;
  const notes = blockNotes(track, block);
  return <><span className="text-[10px] font-bold">{patternLabel(block.pattern)}</span>{block.length >= 8 && <span className="block-wave flex h-5 items-center gap-[2px]" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ height: notes.some(n => Math.floor(n.start / block.length * 6) === i) ? `${8 + i % 3 * 4}px` : "3px" }} />)}</span>}</>;
}

function SongBlock({ track, row, bar, selected, current, dragRow, onSelect }: {
  track: Track; row: number; bar: number; selected: boolean; current: boolean;
  dragRow: number | undefined; onSelect: () => void;
}) {
  const block = track.bars[bar];
  const id = blockId(row, bar);
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id, data: { row, bar }, disabled: !block });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, data: { row, bar }, disabled: dragRow !== undefined && dragRow !== row });
  return (
    <div ref={setDropRef} onClick={e => { if (e.target === e.currentTarget) onSelect(); }} className={cn("block-slot h-11 rounded", isOver && dragRow !== undefined && !isDragging && "block-drop-target", dragRow !== undefined && dragRow !== row && "block-unavailable")}>
      <button ref={setDragRef} {...(block ? attributes : {})} {...listeners} onClick={onSelect}
        aria-label={`${track.name}, bar ${bar + 1}${block ? `, pattern ${patternLabel(block.pattern)}, ${block.length} steps, draggable` : ", add pattern"}`}
        aria-pressed={selected}
        title={block ? `Pattern ${patternLabel(block.pattern)} · source steps ${block.start + 1}–${block.end} · output ${block.length} steps. Drag to move or swap.` : "Tap to add a pattern or drop a block here"}
        style={{ width: block ? `${block.length / 16 * 100}%` : "100%", minWidth: 18 }}
        className={cn("song-block relative flex h-11 items-center justify-between overflow-hidden rounded px-1.5", block && "filled cursor-grab select-none", block && block.pattern % 2 === 1 && "variant", track.muted && "muted", selected && "block-selected", current && "block-playing", isDragging && "block-dragging")}
      ><BlockContent block={block} track={track} /></button>
    </div>
  );
}

export function SongArrangement({ tracks, selectedTrack, selectedBar, playing, position, onSelectBlock, onSelectTrack, onToggleMute, onMoveBlock }: Props) {
  const [dragged, setDragged] = useState<BlockPosition | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: barKeyboardCoordinates }),
  );
  const draggedTrack = dragged ? tracks[dragged.row] : null;
  const draggedBlock = dragged && draggedTrack ? draggedTrack.bars[dragged.bar] : null;
  const describe = (data: BlockPosition) => `${tracks[data.row].name}, bar ${data.bar + 1}`;
  return (
    <DndContext sensors={sensors} collisionDetection={channelCollision}
      onDragStart={({ active }) => setDragged(active.data.current as BlockPosition)}
      onDragCancel={() => setDragged(null)}
      onDragEnd={({ active, over }) => {
        const source = active.data.current as BlockPosition;
        const target = over?.data.current as BlockPosition | undefined;
        if (target && target.row === source.row && target.bar !== source.bar) onMoveBlock(source.row, source.bar, target.bar);
        setDragged(null);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: "Press Space to pick up a song block. Use Left and Right arrows to move within its channel. Press Space to drop and swap with an occupied block. Press Escape to cancel." },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${describe(active.data.current as BlockPosition)}.`,
          onDragOver: ({ over }) => over ? `Drop at ${describe(over.data.current as BlockPosition)}. Occupied bars will swap.` : "Outside this channel. Drop here to cancel.",
          onDragEnd: ({ active, over }) => over ? `Dropped at ${describe(over.data.current as BlockPosition)}.` : `Move cancelled for ${describe(active.data.current as BlockPosition)}.`,
          onDragCancel: () => "Block move cancelled.",
        },
      }}>
      <div className="overflow-x-auto pb-1"><div className="min-w-[680px]">
        <div className="arrangement-row mb-2"><div className="text-[9px] font-bold tracking-widest">CHANNEL / SOUND</div>{Array.from({ length: 8 }, (_, i) => <div key={i} className={cn("text-center text-[10px] font-bold", playing && Math.floor(position / 16) === i && "bar-current")}>{String(i + 1).padStart(2, "0")}</div>)}</div>
        {tracks.map((track, row) => <div key={track.name} className="arrangement-row mb-2">
          <div className="flex items-center gap-2"><button aria-label={`${track.muted ? "Unmute" : "Mute"} ${track.name}`} onClick={() => onToggleMute(row)} className="lcd-mute rounded p-1">{track.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}</button><button onClick={() => onSelectTrack(row)} className={cn("text-left", selectedTrack === row && "font-bold")}><span className="block text-[11px]">{track.name}</span><span className="block text-[8px] tracking-wider opacity-80">{track.chip}</span></button></div>
          {track.bars.map((_, bar) => <SongBlock key={bar} track={track} row={row} bar={bar} selected={selectedTrack === row && selectedBar === bar} current={playing && Math.floor(position / 16) === bar && Boolean(track.bars[bar]) && position % 16 < (track.bars[bar]?.length ?? 0)} dragRow={dragged?.row} onSelect={() => onSelectBlock(row, bar)} />)}
        </div>)}
      </div></div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t-2 border-[var(--lcd-line)] pt-3 text-[9px] font-bold tracking-wide"><span>5 CHANNELS · 8 BARS · 4/4</span><span>{dragged ? "DROP IN THIS CHANNEL · OCCUPIED BARS SWAP" : "DRAG TO MOVE / SWAP · TAP TO EDIT"}</span></div>
      <p className="mt-2 text-[9px]">Touch: hold, then drag. Keyboard: Space, ← / →, Space. Block width shows output length.</p>
      <DragOverlay dropAnimation={null}>{draggedTrack && draggedBlock ? <div className={cn("song-block filled block-drag-overlay flex h-11 items-center justify-between overflow-hidden rounded px-1.5", draggedBlock.pattern % 2 === 1 && "variant")}><BlockContent block={draggedBlock} track={draggedTrack} /></div> : null}</DragOverlay>
    </DndContext>
  );
}
