import { cn } from "@/lib/utils";

const sprites = {
  console: ["..11111111..", ".1222222221.", ".1233333321.", ".1234433321.", ".1234433321.", ".1233333321.", ".1222222221.", ".1225226221.", ".1255522621.", ".1225222221.", ".1222277721.", "..11111111.."],
  note: ["....1111", "....1221", "....1111", "....1..1", "....1..1", ".1111..1", "12221..1", ".111.111", "....1221", ".....11."],
  ghost: ["...1111...", "..122221..", ".12222221.", ".12422421.", ".12422421.", ".12222221.", ".12211221.", ".12222221.", ".12122121.", ".11.11.11."],
} as const;
const colors = ["transparent", "#34472d", "#bdd17a", "#6e873f", "#e5eda8", "#34472d", "#9c3e65", "#7d805c"];

export function PixelArt({ type = "console", className }: { type?: keyof typeof sprites; className?: string }) {
  const sprite = sprites[type];
  return (
    <svg viewBox={`0 0 ${sprite[0].length} ${sprite.length}`} className={cn("pixel-art", className)} shapeRendering="crispEdges" aria-hidden="true">
      {sprite.flatMap((row, y) => [...row].map((pixel, x) => pixel === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colors[Number(pixel)]} />))}
    </svg>
  );
}
