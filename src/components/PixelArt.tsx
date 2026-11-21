import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const sprites = {
  console: ["..11111111..", ".1222222221.", ".1233333321.", ".1234433321.", ".1234433321.", ".1233333321.", ".1222222221.", ".1225226221.", ".1255522621.", ".1225222221.", ".1222277721.", "..11111111.."],
  note: ["....1111", "....1221", "....1111", "....1..1", "....1..1", ".1111..1", "12221..1", ".111.111", "....1221", ".....11."],
  ghost: ["...1111...", "..122221..", ".12222221.", ".12422421.", ".12422421.", ".12222221.", ".12211221.", ".12222221.", ".12122121.", ".11.11.11."],
  controller: ["....1111111111....", "..11222222222211..", ".1222222222222221.", "122222222222222221", "122211122226662221", "122111122226662221", "122211122226662221", "122222222222222221", "122211122222222221", ".1222222222222221.", "..11222222222211..", "....1111111111...."],
  controllerNote: [
    "........................................",
    "...........999999.......................",
    "..........96666669......................",
    "..........946644469.....................",
    "..........9466446669....................",
    "..........9466666669....................",
    "..........94669667777777.....7777777....",
    "..........946691111111111111111111111...",
    "..........9466122222222222222222222231..",
    "..........94611244444444444444444442311.",
    "..........961222444444444444111411123331",
    "..........961222222211122221ddd1ccc13331",
    "..........961222222177712221d8d1c8c13331",
    "..........961222221177711221ddd1ccc13331",
    "......9999961222217747777122111211123331",
    ".....96446661222217778777121bbb1aaa13331",
    "....964466661222217777777121b8b1a8a13331",
    "...9646666661222221177711221bbb1aaa13331",
    "...9466666661222222177712222111211123331",
    "...9666666661222222211127777772222223331",
    "...9666666661222222282227777772222223331",
    "....96666666911333333333111111333333311.",
    ".....9666669..133333333333333333333331..",
    "......99999....1111111111111111111111...",
  ],
  cartridge: ["..11111111..", ".1222222221.", "122222222221", "122888888221", "122899998221", "122898898221", "122899998221", "122888888221", "122222222221", "122222222221", ".1222222221.", "..11111111.."],
  coin: ["..1111..", ".122221.", "12444421", "12466421", "12466421", "12444421", ".122221.", "..1111.."],
  heart: [".11..11.", "12211221", "12444421", "12444421", ".124421.", "..1441..", "...11..."],
  star: ["....1....", "...121...", "111111111", ".1222221.", "..12221..", ".1221221.", ".11...11."],
  ghostB: ["...1111...", "..122221..", ".12222221.", ".14222421.", ".14222421.", ".12222221.", ".12211221.", ".12222221.", ".12122121.", ".11.11.11."],
  coinB: ["...111..", "..1221..", ".124421.", ".124421.", ".124421.", ".124421.", "..1221..", "...111.."],
  heartB: ["........", "..1..1..", ".121121.", "12444421", ".124421.", "..1441..", "...11..."],
  noteB: ["....1111", "....1221", "....1111", "....1..1", "....1..1", "..111..1", ".12221.1", "..111.11", "....1221", ".....11."],
  starB: ["....1....", "....1....", ".1.121.1.", "..12221..", "111222111", "..12221..", ".1.121.1."],
  speaker: ["...111...", "..1221...", ".12221111", "122221111", "122221111", ".12221111", "..1221...", "...111..."],
} as const;

const colors = ["transparent", "#26351f", "#cfe08a", "#5e7a36", "#f4ffc0", "#2f4524", "#b04a74", "#7d805c", "#fffdf2", "#7a2a4b", "#41473d", "#d9d8cf"];
const extraColors: Record<string, string> = { a: "#d95f59", b: "#e8c95d", c: "#5a8fc7", d: "#6f9b5a" };

const colorFor = (pixel: string) => colors[Number(pixel)] ?? extraColors[pixel] ?? "transparent";

export type SpriteName = keyof typeof sprites;

function Sprite({ sprite, className }: { sprite: readonly string[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${sprite[0].length} ${sprite.length}`} className={cn("pixel-art", className)} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {sprite.flatMap((row, y) => [...row].map((pixel, x) => pixel === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colorFor(pixel)} />))}
    </svg>
  );
}

export function PixelArt({ type = "console", className }: { type?: SpriteName; className?: string }) {
  return <Sprite sprite={sprites[type]} className={className} />;
}

/** Cycles hand-authored pixel frames; static when the visitor prefers reduced motion. */
export function AnimatedSprite({
  frames,
  interval = 420,
  className,
  label,
}: {
  frames: SpriteName[];
  interval?: number;
  className?: string;
  label?: string;
}) {
  const [frame, setFrame] = useState(0);
  const frameKey = frames.join(",");
  useEffect(() => {
    const sequence = frameKey.split(",") as SpriteName[];
    if (sequence.length < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFrame(value => (value + 1) % sequence.length), interval);
    return () => window.clearInterval(timer);
  }, [frameKey, interval]);
  return (
    <span className={cn("inline-flex", className)} role={label ? "img" : undefined} aria-label={label}>
      <PixelArt type={frames[frame] ?? frames[0]} className="h-full w-full" />
    </span>
  );
}

/** Decorative LED-style bars used in the header and transport. */
export function PixelEqualizer({ bars = 7, className }: { bars?: number; className?: string }) {
  return (
    <span className={cn("pixel-equalizer", className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <i key={index} style={{ animationDelay: `${index * 90}ms`, animationDuration: `${680 + (index % 3) * 130}ms` }} />
      ))}
    </span>
  );
}
