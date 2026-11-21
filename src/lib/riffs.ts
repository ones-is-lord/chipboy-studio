import { z } from "zod";
import { instrumentById, instruments } from "./instruments";
import { newBlock, type Note, type Track } from "./song";

export const RIFF_CATEGORIES = ["Drum loops", "Basslines", "Melodies", "Chords & arps", "FX"] as const;
export type RiffCategory = (typeof RIFF_CATEGORIES)[number];

export type Riff = {
  id: string;
  name: string;
  category: RiffCategory;
  preset: string;
  voice: Track["voice"];
  rootMidi: number;
  notes: Note[];
  builtin: boolean;
};

const CUSTOM_KEY = "chipboy-studio.riffs.v1";
const MAX_CUSTOM = 40;

type Hit = [start: number, midi: number, duration?: number];

const riff = (id: string, name: string, category: RiffCategory, preset: string, rootMidi: number, hits: Hit[]): Riff => {
  const instrument = instrumentById(preset);
  return {
    id,
    name,
    category,
    preset,
    voice: instrument.voice,
    rootMidi,
    builtin: true,
    notes: hits.map(([start, midi, duration = 1], index) => ({
      id: `${id}-${index}`,
      start: Math.max(0, Math.min(15, start)),
      midi: Math.max(0, Math.min(127, midi)),
      duration: Math.max(0.25, Math.min(16 - Math.max(0, Math.min(15, start)), duration)),
    })),
  };
};

export const builtinRiffs: Riff[] = [
  riff("drums-four", "Four on the floor", "Drum loops", "kick8", 36, [[0, 36], [4, 36], [8, 36], [12, 36]]),
  riff("drums-boom", "Boom bap kick", "Drum loops", "kick808", 36, [[0, 36, 1.5], [7, 36, 1], [10, 36, 1.5]]),
  riff("drums-snare", "Backbeat snare", "Drum loops", "snare", 48, [[4, 48], [12, 48]]),
  riff("drums-clap", "Offbeat clap", "Drum loops", "clap", 48, [[4, 48], [12, 48], [14, 48, 0.5]]),
  riff("drums-hat8", "Eighth-note hats", "Drum loops", "hat", 72, Array.from({ length: 8 }, (_, i): Hit => [i * 2, 72, 0.5])),
  riff("drums-hat16", "Sixteenth hats", "Drum loops", "hat", 72, Array.from({ length: 16 }, (_, i): Hit => [i, 72, 0.25])),
  riff("drums-openhat", "Open hat lift", "Drum loops", "openhat", 72, [[2, 72, 0.5], [6, 72, 0.5], [10, 72, 0.5], [14, 72, 0.5]]),
  riff("drums-toms", "Pocket tom fill", "Drum loops", "tom", 48, [[12, 48, 0.5], [13, 45, 0.5], [14, 43, 0.5], [15, 40, 0.5]]),
  riff("bass-walk", "Pulse root walk", "Basslines", "squarebass", 36, [[0, 36], [3, 43], [6, 46], [8, 48], [11, 43], [14, 46]]),
  riff("bass-octave", "Triangle octaves", "Basslines", "triangle", 36, [[0, 36], [4, 48], [8, 36], [12, 48]]),
  riff("bass-acid", "Acid eighths", "Basslines", "acid", 36, [[0, 36, 0.5], [2, 36, 0.5], [3, 43, 0.5], [4, 36, 0.5], [6, 39, 0.5], [8, 36, 0.5], [10, 46, 0.5], [12, 36, 0.5], [14, 43, 0.5], [15, 36, 0.5]]),
  riff("bass-rubber", "Rubber funk", "Basslines", "rubber", 36, [[0, 36, 1.5], [3, 39], [6, 43], [10, 46, 1.5], [12, 43]]),
  riff("bass-sub", "Sub drop", "Basslines", "sub", 24, [[0, 24, 4], [8, 24, 4]]),
  riff("bass-bounce", "Square bounce", "Basslines", "squarebass", 36, [[0, 36], [2, 36], [4, 43], [7, 36], [8, 48], [10, 43], [12, 36], [15, 39]]),
  riff("lead-hero", "Heroic lead", "Melodies", "pulse50", 72, [[0, 72, 2], [2, 76], [4, 79, 2], [6, 84], [8, 79, 2], [10, 76], [12, 72, 2]]),
  riff("lead-coin", "Coin run", "Melodies", "pulse25", 84, [[0, 84, 0.5], [1, 88, 0.5], [2, 91, 0.5], [3, 96, 0.5], [8, 84, 0.5], [9, 88, 0.5], [10, 91, 0.5], [11, 96, 0.5]]),
  riff("lead-sad", "Sad triangle", "Melodies", "triangle", 72, [[0, 72, 2], [3, 71], [6, 69, 2], [9, 67], [12, 69, 2]]),
  riff("lead-arcade", "Arcade hook", "Melodies", "pulse12", 84, [[0, 84], [2, 84], [4, 91], [6, 88], [8, 84], [10, 91], [12, 88], [14, 84]]),
  riff("lead-laser", "Space laser", "Melodies", "laser", 84, [[0, 84, 0.5], [2, 88, 0.5], [4, 91, 0.5], [6, 96, 0.5], [8, 91, 0.5], [10, 88, 0.5]]),
  riff("lead-bell", "Bell motif", "Melodies", "bell", 84, [[0, 84, 2], [4, 88, 2], [8, 91, 2], [12, 96, 2]]),
  riff("arp-up", "Chip arp up", "Chords & arps", "pulse25", 60, [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i * 2, 60 + [0, 4, 7, 12][i % 4], 0.5] as Hit)),
  riff("arp-minor", "Minor stab", "Chords & arps", "brass", 60, [[0, 60, 2], [0, 63, 2], [0, 67, 2], [8, 58, 2], [8, 62, 2], [8, 65, 2]]),
  riff("arp-bells", "Bell canon", "Chords & arps", "bell", 72, [[0, 72, 2], [4, 76, 2], [8, 79, 2], [12, 84, 2]]),
  riff("arp-saw", "Saw chord", "Chords & arps", "supersaw", 48, [[0, 48, 4], [0, 52, 4], [0, 55, 4], [8, 50, 4], [8, 53, 4], [8, 57, 4]]),
  riff("arp-pluck", "Pluck arp", "Chords & arps", "pluck", 72, [0, 2, 4, 6, 8, 10, 12, 14].map((start, i) => [start, 72 + [0, 7, 4, 12][i % 4], 0.5] as Hit)),
  riff("fx-coin", "Coin get", "FX", "bleep", 96, [[0, 96, 0.5], [1, 100, 0.5]]),
  riff("fx-laser", "Laser zap", "FX", "laser", 96, [[0, 96, 1], [2, 91, 0.5], [3, 84, 0.5]]),
  riff("fx-power", "Power up", "FX", "pulse12", 72, [[0, 72, 0.5], [1, 76, 0.5], [2, 79, 0.5], [3, 84, 0.5], [4, 88, 0.5], [5, 91, 0.5], [6, 96, 0.5]]),
  riff("fx-explosion", "Explosion", "FX", "crash", 60, [[0, 60, 4]]),
  riff("fx-teleport", "Teleport", "FX", "laser", 84, [[0, 84, 0.5], [2, 72, 0.5], [4, 96, 0.5], [6, 84, 0.5]]),
];

const noteSchema = z.object({
  id: z.string().max(120).optional(),
  midi: z.number().finite(),
  start: z.number().finite(),
  duration: z.number().finite(),
});

const riffSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(80),
  category: z.enum(RIFF_CATEGORIES),
  preset: z.string().min(1).max(60),
  voice: z.enum(["square", "triangle", "kick", "noise", "sample"]),
  rootMidi: z.number().finite(),
  notes: z.array(noteSchema).min(1).max(512),
  builtin: z.boolean().optional(),
});

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const normalizeRiff = (input: z.infer<typeof riffSchema>): Riff | null => {
  if (input.voice === "sample") return null;
  if (!instruments.some(instrument => instrument.id === input.preset)) return null;
  const notes = input.notes.flatMap((note, index) => {
    const start = Math.max(0, Math.min(15, note.start));
    const duration = Math.max(0.25, Math.min(16 - start, note.duration));
    if (!Number.isFinite(note.midi) || !Number.isFinite(start) || !Number.isFinite(duration)) return [];
    return [{ id: note.id?.trim() || `riff-${index}`, midi: Math.max(0, Math.min(127, Math.round(note.midi))), start, duration }];
  });
  if (!notes.length) return null;
  return {
    id: input.id,
    name: input.name.trim().slice(0, 80) || "Untitled riff",
    category: input.category,
    preset: input.preset,
    voice: input.voice,
    rootMidi: Math.max(0, Math.min(127, Math.round(input.rootMidi))),
    notes,
    builtin: false,
  };
};

export function loadCustomRiffs(): Riff[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = JSON.parse(store.getItem(CUSTOM_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
      const parsed = riffSchema.safeParse(item);
      if (!parsed.success) return [];
      const normalized = normalizeRiff(parsed.data);
      return normalized ? [normalized] : [];
    }).slice(0, MAX_CUSTOM);
  } catch {
    return [];
  }
}

export function saveCustomRiff(input: Omit<Riff, "id" | "builtin"> & { id?: string }): Riff[] {
  const store = storage();
  if (!store) throw new Error("Browser storage is unavailable, so this riff cannot be saved.");
  const parsed = riffSchema.safeParse({ ...input, id: input.id || `riff-${crypto.randomUUID()}`, builtin: false });
  if (!parsed.success) throw new Error("This riff could not be saved. Check its notes and name.");
  const normalized = normalizeRiff(parsed.data);
  if (!normalized) throw new Error("Choose a valid instrument preset before saving this riff.");
  const existing = loadCustomRiffs();
  const next = [normalized, ...existing.filter(item => item.id !== normalized.id)].slice(0, MAX_CUSTOM);
  try {
    store.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Browser storage is full. Delete a saved riff or project and try again.");
  }
  return next;
}

export function deleteCustomRiff(riffId: string): Riff[] {
  const next = loadCustomRiffs().filter(item => item.id !== riffId);
  try {
    storage()?.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Browser storage is full, so this riff could not be deleted.");
  }
  return next;
}

export function allRiffs(custom: Riff[] = loadCustomRiffs()) {
  const seen = new Set<string>();
  return [...builtinRiffs, ...custom].filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function riffTrack(riff: Riff, barCount = 1): Track {
  return {
    name: riff.name,
    chip: "RIFF",
    voice: riff.voice,
    preset: riff.preset,
    octave: 0,
    rootMidi: riff.rootMidi,
    patterns: [riff.notes.map(note => ({ ...note, id: `preview-${note.id}` })), []],
    bars: [newBlock(0), ...Array(Math.max(0, barCount - 1)).fill(null)],
    muted: false,
    volume: 70,
    pitch: 0,
    pan: 0,
    solo: false,
  };
}

/** Shifts a riff by whole octaves so it sits near the destination channel's root. */
export function fitRiffToTrack(riff: Riff, track: Track): Note[] {
  let shift = 0;
  while (riff.rootMidi + shift - track.rootMidi > 6) shift -= 12;
  while (track.rootMidi - (riff.rootMidi + shift) > 6) shift += 12;
  return riff.notes.map(note => ({ ...note, id: crypto.randomUUID(), midi: Math.max(0, Math.min(127, note.midi + shift)) }));
}
