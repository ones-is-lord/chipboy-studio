export type Note = { id: string; midi: number; start: number; duration: number };
export type SongBlock = { pattern: number; start: number; end: number; length: number };
export type Track = {
  name: string; chip: string; voice: "square" | "triangle" | "kick" | "noise" | "sample";
  preset: string; octave: number; sampleId?: string;
  rootMidi: number; patterns: Note[][]; bars: (SongBlock | null)[]; muted: boolean; volume: number; pitch: number;
};
export type Song = { name: string; bpm: number; speed: number; barCount: number; master: number; tracks: Track[] };
export type SampleAsset = { id: string; name: string; buffer: AudioBuffer; revision: number; rootMidi: number; loop: boolean };
export const stepSeconds = (song: Song) => 60 / song.bpm / 4 / song.speed;
export const patternLabel = (index: number) => index < 26 ? String.fromCharCode(65 + index) : `P${index + 1}`;
export const newBlock = (pattern: number): SongBlock => ({ pattern, start: 0, end: 16, length: 16 });
export const noteName = (midi: number) => `${["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][midi % 12]}${Math.floor(midi / 12) - 1}`;

export function coveringBlock(track: Track, bar: number) {
  for (let i = bar; i >= 0; i--) {
    const block = track.bars[i];
    if (block && i * 16 + block.length > bar * 16) return { block, bar: i };
  }
  return null;
}
export function overlaps(track: Track, bar: number, block: SongBlock, ignored: number[] = []) {
  return track.bars.flatMap((b, i) => b && !ignored.includes(i) && i * 16 < bar * 16 + block.length && i * 16 + b.length > bar * 16 ? [i] : []);
}
export function validArrangement(bars: (SongBlock | null)[]) {
  let end = 0;
  return bars.every((block, bar) => {
    if (!block) return true;
    if (bar * 16 < end || bar * 16 + block.length > bars.length * 16) return false;
    end = bar * 16 + block.length; return true;
  });
}

export function createDemoSong(): Song {
  const configs: { name: string; chip: string; voice: Track["voice"]; rootMidi: number; volume: number; hits: number[][]; bars: (number | null)[] }[] = [
    { name: "Pixel lead", chip: "PULSE 01", voice: "square", rootMidi: 69, volume: 60, hits: [[0, 3, 6, 8, 10, 14], [0, 2, 5, 8, 11, 12, 14]], bars: [0, 0, 1, 0, 0, 1, 0, 1] },
    { name: "Coin arpeggio", chip: "PULSE 02", voice: "square", rootMidi: 76, volume: 35, hits: [[2, 6, 10, 14], [1, 5, 9, 13]], bars: [null, null, 0, 0, null, 0, 1, 1] },
    { name: "Triangle bass", chip: "WAVE 03", voice: "triangle", rootMidi: 45, volume: 80, hits: [[0, 4, 8, 12], [0, 4, 7, 8, 12, 15]], bars: [0, 0, 0, 1, 0, 0, 1, 1] },
    { name: "8-bit kick", chip: "DRUM 04", voice: "kick", rootMidi: 48, volume: 80, hits: [[0, 4, 8, 12], [0, 4, 8, 11, 12, 14]], bars: [0, 0, 0, 0, 0, 1, 0, 1] },
    { name: "Noise hats", chip: "NOISE 05", voice: "noise", rootMidi: 72, volume: 40, hits: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14, 15]], bars: [null, 0, 0, 1, 0, 0, 0, 1] },
  ];
  return { name: "Pocket dreams", bpm: 118, speed: 1, barCount: 16, master: 70, tracks: configs.map((c, row) => ({
    name: c.name, chip: c.chip, voice: c.voice, rootMidi: c.rootMidi, volume: c.volume, pitch: 0, octave: 0, muted: false,
    preset: ["pulse50", "pulse25", "triangle", "kick8", "hat"][row],
    patterns: c.hits.map((hits, p) => hits.map((start, i) => ({ id: `demo-${row}-${p}-${i}`, start, duration: 1, midi: c.rootMidi + (c.voice === "square" ? [0, 3, 7, 10][Math.floor(start / 4)] : 0) }))),
    bars: [...c.bars.map(p => p === null ? null : newBlock(p)), ...Array(8).fill(null)],
  })) };
}

export function blockNotes(track: Track, block: SongBlock) {
  const ratio = block.length / (block.end - block.start);
  return track.patterns[block.pattern].filter(n => n.start < block.end && n.start + n.duration > block.start).map(n => {
    const start = Math.max(n.start, block.start);
    const end = Math.min(n.start + n.duration, block.end);
    const outputStart = Math.min(block.length - 1, Math.round((start - block.start) * ratio));
    return { ...n, start: outputStart, duration: Math.min(block.length - outputStart, Math.max(0.25, (end - start) * ratio)) };
  });
}
