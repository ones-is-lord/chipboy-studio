import { z } from "zod";
import type { Effects } from "./effects";
import { defaultEffects } from "./effects";
import type { Note, SampleAsset, Song, SongBlock, Track } from "./song";

export const PROJECT_FORMAT = "chipboy-studio";
export const PROJECT_VERSION = 5;
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
export const MAX_SHARE_LENGTH = 48_000;

export type SampleReference = {
  id: string;
  name: string;
  rootMidi: number;
  loop: boolean;
  duration: number;
  audioFile?: string;
};

export type ParsedProject = {
  song: Song;
  samples: SampleReference[];
  warnings: string[];
  version: number;
};

export type StoredProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  song: Song;
};

const effectsSchema = z
  .object({
    enabled: z.boolean(),
    cutoff: z.number().finite(),
    resonance: z.number().finite(),
    distortion: z.number().finite(),
    bits: z.number().finite(),
    chorus: z.number().finite(),
    reverb: z.number().finite(),
    delay: z.number().finite(),
    delayBeats: z.number().finite(),
    feedback: z.number().finite(),
  })
  .partial();

const noteSchema = z.object({
  id: z.string().max(120).optional(),
  midi: z.number().finite(),
  start: z.number().finite(),
  duration: z.number().finite(),
});

const blockSchema = z.object({
  pattern: z.number().int().nonnegative(),
  start: z.number().int(),
  end: z.number().int(),
  length: z.number().int(),
});

const trackSchema = z.object({
  name: z.string().max(80),
  chip: z.string().max(40).optional(),
  voice: z.enum(["square", "triangle", "kick", "noise", "sample"]).catch("square"),
  preset: z.string().max(60).optional(),
  octave: z.number().finite().optional(),
  sampleId: z.string().max(120).optional(),
  effects: effectsSchema.optional(),
  rootMidi: z.number().finite().optional(),
  patterns: z.array(z.array(noteSchema).max(512)).max(64).optional(),
  bars: z.array(blockSchema.nullable()).max(64).optional(),
  muted: z.boolean().optional(),
  volume: z.number().finite().optional(),
  pitch: z.number().finite().optional(),
  pan: z.number().finite().optional(),
  solo: z.boolean().optional(),
});

const songSchema = z.object({
  name: z.string().max(80).optional(),
  bpm: z.number().finite().optional(),
  speed: z.number().finite().optional(),
  barCount: z.number().int().optional(),
  master: z.number().finite().optional(),
  transpose: z.number().finite().optional(),
  tracks: z.array(trackSchema).min(1).max(32),
  loop: z
    .object({
      enabled: z.boolean(),
      startBar: z.number().int().optional(),
      endBar: z.number().int().optional(),
    })
    .optional(),
});

const sampleSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().max(120).optional(),
  rootMidi: z.number().finite().optional(),
  loop: z.boolean().optional(),
  duration: z.number().finite().optional(),
  audioFile: z.string().max(200).optional(),
});

const envelopeSchema = z.object({
  format: z.literal(PROJECT_FORMAT),
  version: z.number().int().positive(),
  name: z.string().max(80).optional(),
  song: z.unknown(),
  samples: z.array(sampleSchema).max(256).optional(),
});

const storedProjectSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().max(80),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
  song: z.unknown(),
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const id = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

function normalizeEffects(input: z.infer<typeof effectsSchema> | undefined): Effects | undefined {
  if (!input) return undefined;
  const base = defaultEffects();
  return {
    enabled: input.enabled ?? base.enabled,
    cutoff: clamp(input.cutoff ?? base.cutoff, 60, 20_000),
    resonance: clamp(input.resonance ?? base.resonance, 0.1, 24),
    distortion: clamp(input.distortion ?? base.distortion, 0, 1),
    bits: clamp(Math.round(input.bits ?? base.bits), 1, 16),
    chorus: clamp(input.chorus ?? base.chorus, 0, 1),
    reverb: clamp(input.reverb ?? base.reverb, 0, 1),
    delay: clamp(input.delay ?? base.delay, 0, 1),
    delayBeats: clamp(input.delayBeats ?? base.delayBeats, 0.05, 4),
    feedback: clamp(input.feedback ?? base.feedback, 0, 0.9),
  };
}

function normalizeNote(input: z.infer<typeof noteSchema>, index: number): Note {
  const start = clamp(input.start, 0, 15);
  return {
    id: input.id?.trim() || `note-${index}-${id()}`,
    midi: Math.round(clamp(input.midi, 0, 127)),
    start: Math.round(start * 100) / 100,
    duration: Math.round(clamp(input.duration, 0.25, 16 - start) * 100) / 100,
  };
}

function normalizeBlock(input: z.infer<typeof blockSchema>, barCount: number): SongBlock | null {
  const start = clamp(Math.round(input.start), 0, 15);
  const end = clamp(Math.round(input.end), start + 1, 16);
  const maxLength = Math.max(1, barCount * 16);
  const length = clamp(Math.round(input.length), 1, maxLength);
  if (input.pattern < 0) return null;
  return { pattern: Math.min(63, Math.round(input.pattern)), start, end, length };
}

function normalizeTrack(input: z.infer<typeof trackSchema>, barCount: number, warnings: string[]): Track {
  const patterns = (input.patterns?.length ? input.patterns : [[]]).slice(0, 64).map((pattern, patternIndex) =>
    pattern.slice(0, 512).map((note, noteIndex) => normalizeNote(note, patternIndex * 1000 + noteIndex)),
  );
  while (patterns.length < 2) patterns.push([]);

  const bars: (SongBlock | null)[] = Array(barCount).fill(null);
  let occupiedUntil = 0;
  (input.bars ?? []).slice(0, barCount).forEach((raw, bar) => {
    if (!raw) return;
    const block = normalizeBlock(raw, barCount);
    if (!block) return;
    if (bar * 16 < occupiedUntil || bar * 16 + block.length > barCount * 16) {
      warnings.push(`Dropped an overlapping or oversized block on “${input.name}” at bar ${bar + 1}.`);
      return;
    }
    while (patterns.length <= block.pattern) patterns.push([]);
    bars[bar] = block;
    occupiedUntil = bar * 16 + block.length;
  });

  const voice = input.voice ?? "square";
  if (voice === "sample" && !input.sampleId) warnings.push(`“${input.name}” is a sample channel without sample audio; re-import its WAV in the Sampler.`);

  return {
    name: (input.name || "Channel").trim().slice(0, 80) || "Channel",
    chip: (input.chip || "PULSE 01").trim().slice(0, 40),
    voice,
    preset: (input.preset || (voice === "triangle" ? "triangle" : voice === "kick" ? "kick8" : voice === "noise" ? "hat" : "pulse50")).slice(0, 60),
    octave: Math.round(clamp(input.octave ?? 0, -3, 3)),
    sampleId: input.sampleId,
    effects: normalizeEffects(input.effects),
    rootMidi: Math.round(clamp(input.rootMidi ?? 60, 0, 127)),
    patterns,
    bars,
    muted: input.muted ?? false,
    volume: Math.round(clamp(input.volume ?? 70, 0, 100)),
    pitch: Math.round(clamp(input.pitch ?? 0, -24, 24)),
    pan: Math.round(clamp(input.pan ?? 0, -100, 100)),
    solo: input.solo ?? false,
  };
}

/** Validates and repairs a song so every consumer can assume a safe shape. */
export function normalizeSong(raw: unknown): { song: Song; warnings: string[] } {
  const parsed = songSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Project data is invalid${issue ? ` (${issue.path.join(".") || "song"}): ${issue.message}` : ""}.`);
  }
  const warnings: string[] = [];
  const data = parsed.data;
  const barCount = Math.round(clamp(data.barCount ?? 16, 1, 64));
  const tracks = data.tracks.slice(0, 32).map(track => normalizeTrack(track, barCount, warnings));
  const loop = data.loop
    ? {
        enabled: data.loop.enabled,
        startBar: Math.round(clamp(data.loop.startBar ?? 0, 0, barCount - 1)),
        endBar: Math.round(clamp(data.loop.endBar ?? barCount, 1, barCount)),
      }
    : undefined;
  if (loop && loop.endBar <= loop.startBar) loop.endBar = Math.min(barCount, loop.startBar + 1);

  return {
    warnings,
    song: {
      name: (data.name || "Untitled song").trim().slice(0, 80) || "Untitled song",
      bpm: Math.round(clamp(data.bpm ?? 120, 40, 240)),
      speed: Math.round(clamp(data.speed ?? 1, 0.25, 2) * 100) / 100,
      barCount,
      master: Math.round(clamp(data.master ?? 70, 0, 100)),
      transpose: Math.round(clamp(data.transpose ?? 0, -12, 12)),
      tracks,
      loop,
    },
  };
}

export function sampleReferences(samples: SampleAsset[]): SampleReference[] {
  return samples.map(asset => ({
    id: asset.id,
    name: asset.name.slice(0, 120),
    rootMidi: Math.round(clamp(asset.rootMidi, 0, 127)),
    loop: asset.loop,
    duration: Math.round(asset.buffer.duration * 1000) / 1000,
    audioFile: `${safeStem(asset.name)}.wav`,
  }));
}

export function serializeProject(song: Song, samples: SampleAsset[] = []): string {
  const used = new Set(song.tracks.map(track => track.sampleId).filter((value): value is string => Boolean(value)));
  return JSON.stringify(
    {
      format: PROJECT_FORMAT,
      version: PROJECT_VERSION,
      exportedAt: new Date().toISOString(),
      name: song.name,
      song,
      samples: sampleReferences(samples.filter(asset => used.has(asset.id))),
    },
    null,
    2,
  );
}

export function parseProjectJson(text: string): ParsedProject {
  if (text.length > MAX_PROJECT_BYTES) throw new Error("Project files must be smaller than 2 MB.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("This file does not contain a Chipboy Studio project.");

  const record = data as Record<string, unknown>;
  const envelope = envelopeSchema.safeParse(record);
  const rawSong = envelope.success ? envelope.data.song : record.song && typeof record.song === "object" ? record.song : record;
  const { song, warnings } = normalizeSong(rawSong);
  const samples = (envelope.success ? envelope.data.samples ?? [] : Array.isArray(record.samples) ? record.samples : [])
    .flatMap(sample => {
      const parsed = sampleSchema.safeParse(sample);
      if (!parsed.success) return [];
      const value = parsed.data;
      return [
        {
          id: value.id,
          name: value.name ?? "Sample",
          rootMidi: Math.round(clamp(value.rootMidi ?? 60, 0, 127)),
          loop: value.loop ?? false,
          duration: Math.max(0, value.duration ?? 0),
          audioFile: value.audioFile,
        },
      ];
    })
    .slice(0, 256);
  return { song, samples, warnings, version: envelope.success ? envelope.data.version : 3 };
}

export function projectFilename(name: string) {
  return `${safeStem(name)}.chipboy.json`;
}

export function safeStem(name: string) {
  return name.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "chipboy";
}

export function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareSong(song: Song) {
  return toBase64Url(JSON.stringify({ ...song, name: song.name.slice(0, 80) }));
}

export function decodeShareSong(param: string): Song | null {
  if (!param || param.length > MAX_SHARE_LENGTH) return null;
  try {
    return normalizeSong(JSON.parse(fromBase64Url(param))).song;
  } catch {
    return null;
  }
}

export function buildShareUrl(song: Song, location: Pick<Location, "origin" | "pathname">) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("project", encodeShareSong(song));
  return url.toString();
}

export function readSharedSong(search: string): Song | null {
  const param = new URLSearchParams(search).get("project");
  return param ? decodeShareSong(param) : null;
}

const PROJECTS_KEY = "chipboy-studio.projects.v1";
const AUTOSAVE_KEY = "chipboy-studio.autosave.v1";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function readStoredProjects(): StoredProject[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = JSON.parse(store.getItem(PROJECTS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
      const parsed = storedProjectSchema.safeParse(item);
      if (!parsed.success) return [];
      try {
        const { song } = normalizeSong(parsed.data.song);
        const project: StoredProject = {
          id: parsed.data.id,
          name: parsed.data.name || song.name,
          createdAt: parsed.data.createdAt,
          updatedAt: parsed.data.updatedAt,
          song,
        };
        return [project];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function writeStoredProjects(projects: StoredProject[]) {
  const store = storage();
  if (!store) throw new Error("This browser does not allow local project storage.");
  try {
    store.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 30)));
  } catch {
    throw new Error("Project storage is full. Delete an old project or export it as a file first.");
  }
}

export function loadProjects(): StoredProject[] {
  return readStoredProjects().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(song: Song, options: { id?: string; name?: string } = {}): StoredProject {
  const projects = readStoredProjects();
  const now = Date.now();
  const name = (options.name || song.name || "Untitled song").trim().slice(0, 80) || "Untitled song";
  const existing = options.id ? projects.find(project => project.id === options.id) : undefined;
  const project: StoredProject = {
    id: existing?.id ?? id(),
    name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    song: { ...song, name },
  };
  const next = [project, ...projects.filter(item => item.id !== project.id)].slice(0, 30);
  writeStoredProjects(next);
  return project;
}

export function deleteProject(projectId: string) {
  writeStoredProjects(readStoredProjects().filter(project => project.id !== projectId));
}

export function saveAutosave(song: Song) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: Date.now(), song }));
  } catch {
    // Autosave is best-effort; a full quota must not interrupt music editing.
  }
}

export function loadAutosave(): { savedAt: number; song: Song } | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = JSON.parse(store.getItem(AUTOSAVE_KEY) ?? "null") as { savedAt?: unknown; song?: unknown } | null;
    if (!raw || typeof raw.savedAt !== "number") return null;
    return { savedAt: raw.savedAt, song: normalizeSong(raw.song).song };
  } catch {
    return null;
  }
}

export function clearAutosave() {
  storage()?.removeItem(AUTOSAVE_KEY);
}
