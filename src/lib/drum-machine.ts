import { defaultEffects } from "./effects";
import { instrumentById, instruments } from "./instruments";
import { newBlock, type Note, type Track } from "./song";

export const DRUM_STEP_COUNT = 16;
export const DRUM_BANKS = ["A", "B", "C", "D"] as const;
export type DrumBank = (typeof DRUM_BANKS)[number];

export type DrumRow = {
  id: string;
  name: string;
  short: string;
  preset: string;
  rootMidi: number;
  volume: number;
  custom?: boolean;
};

export const DRUM_ROWS: DrumRow[] = [
  { id: "kick", name: "Kick", short: "KICK", preset: "kick8", rootMidi: 36, volume: 82 },
  { id: "double", name: "Double bass", short: "DBLB", preset: "doublekick", rootMidi: 31, volume: 80 },
  { id: "snare", name: "Snare", short: "SNR", preset: "snare", rootMidi: 48, volume: 74 },
  { id: "roll", name: "Roll", short: "ROLL", preset: "roll", rootMidi: 50, volume: 62 },
  { id: "tom1", name: "Tom 1", short: "TOM1", preset: "tom", rootMidi: 50, volume: 70 },
  { id: "tom2", name: "Tom 2", short: "TOM2", preset: "tom", rootMidi: 45, volume: 70 },
  { id: "tom3", name: "Tom 3", short: "TOM3", preset: "tom", rootMidi: 41, volume: 70 },
  { id: "hat", name: "Closed hat", short: "CH", preset: "hat", rootMidi: 72, volume: 56 },
  { id: "openhat", name: "Open hat", short: "OH", preset: "openhat", rootMidi: 74, volume: 52 },
  { id: "crash", name: "Cymbal", short: "CYM", preset: "crash", rootMidi: 76, volume: 50 },
  { id: "ride", name: "Ride", short: "RIDE", preset: "ride", rootMidi: 78, volume: 48 },
  { id: "timpani", name: "Timpani", short: "TIMP", preset: "timpani", rootMidi: 36, volume: 74 },
  { id: "kettle", name: "Kettle bell", short: "KTL", preset: "kettlebell", rootMidi: 84, volume: 52 },
  { id: "cowbell", name: "Cowbell", short: "COW", preset: "cowbell", rootMidi: 72, volume: 54 },
  { id: "clap1", name: "Clap 1", short: "CLP1", preset: "clap", rootMidi: 50, volume: 62 },
  { id: "clap2", name: "Clap 2", short: "CLP2", preset: "clap2", rootMidi: 52, volume: 62 },
  { id: "custom1", name: "Custom A", short: "CST-A", preset: "pulse50", rootMidi: 60, volume: 60, custom: true },
  { id: "custom2", name: "Custom B", short: "CST-B", preset: "bell", rootMidi: 72, volume: 58, custom: true },
];

export const drumRowById = (id: string) => DRUM_ROWS.find(row => row.id === id);

export type DrumPattern = {
  name: string;
  steps: Record<string, boolean[]>;
  presets: Record<string, string>;
};

export type DrumMachineState = {
  bpm: number;
  swing: number;
  loop: boolean;
  master: number;
  active: number;
  patterns: DrumPattern[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `drum-${Math.random().toString(36).slice(2)}`);

export const emptyDrumSteps = () => Array.from({ length: DRUM_STEP_COUNT }, () => false);

export const emptyDrumPattern = (name = "A"): DrumPattern => ({
  name,
  steps: Object.fromEntries(DRUM_ROWS.map(row => [row.id, emptyDrumSteps()])),
  presets: {},
});

export const defaultDrumMachine = (): DrumMachineState => ({
  bpm: 120,
  swing: 0,
  loop: true,
  master: 78,
  active: 0,
  patterns: DRUM_BANKS.map(bank => emptyDrumPattern(bank)),
});

export const drumRowPreset = (pattern: DrumPattern, row: DrumRow) => pattern.presets[row.id] ?? row.preset;

export const drumHitCount = (pattern: DrumPattern) => DRUM_ROWS.reduce((total, row) => total + (pattern.steps[row.id]?.filter(Boolean).length ?? 0), 0);

export function toggleDrumStep(pattern: DrumPattern, rowId: string, step: number): DrumPattern {
  const index = Math.max(0, Math.min(DRUM_STEP_COUNT - 1, Math.round(step)));
  const current = pattern.steps[rowId] ?? emptyDrumSteps();
  return {
    ...pattern,
    steps: { ...pattern.steps, [rowId]: current.map((on, i) => i === index ? !on : on) },
  };
}

export function clearDrumPattern(pattern: DrumPattern): DrumPattern {
  return { ...pattern, steps: Object.fromEntries(DRUM_ROWS.map(row => [row.id, emptyDrumSteps()])) };
}

export function copyDrumPattern(pattern: DrumPattern, name: string): DrumPattern {
  return {
    name,
    steps: Object.fromEntries(DRUM_ROWS.map(row => [row.id, [...(pattern.steps[row.id] ?? emptyDrumSteps())]])),
    presets: { ...pattern.presets },
  };
}

const density: Record<string, number> = {
  kick: 0.42, double: 0.22, snare: 0.3, roll: 0.12, tom1: 0.1, tom2: 0.1, tom3: 0.1,
  hat: 0.5, openhat: 0.16, crash: 0.06, ride: 0.18, timpani: 0.08, kettle: 0.06,
  cowbell: 0.08, clap1: 0.2, clap2: 0.16, custom1: 0.1, custom2: 0.08,
};

export function randomizeDrumPattern(pattern: DrumPattern): DrumPattern {
  return {
    ...pattern,
    steps: Object.fromEntries(DRUM_ROWS.map(row => {
      const steps = Array.from({ length: DRUM_STEP_COUNT }, (_, step) => {
        const beat = step % 4 === 0 ? 1.7 : step % 2 === 0 ? 1.15 : 0.7;
        return Math.random() < (density[row.id] ?? 0.1) * beat;
      });
      if (row.id === "kick") steps[0] = true;
      return [row.id, steps];
    })),
  };
}

export const drumStepSeconds = (bpm: number) => 60 / clamp(bpm, 40, 240) / 4;

export function drumTracks(pattern: DrumPattern, options: { bar: number; barCount: number }): Track[] {
  const barCount = Math.max(1, Math.min(64, Math.round(options.barCount)));
  const bar = Math.max(0, Math.min(barCount - 1, Math.round(options.bar)));
  return DRUM_ROWS.flatMap(row => {
    const steps = pattern.steps[row.id] ?? [];
    if (!steps.some(Boolean)) return [];
    const preset = instrumentById(drumRowPreset(pattern, row));
    const notes: Note[] = steps.flatMap((on, start) => on ? [{ id: uid(), midi: row.rootMidi, start, duration: 1 }] : []);
    return [{
      name: row.name,
      chip: "DRUM KIT",
      voice: preset.voice,
      preset: preset.id,
      octave: 0,
      rootMidi: row.rootMidi,
      patterns: [notes, []],
      bars: Array.from({ length: barCount }, (_, index) => index === bar ? newBlock(0) : null),
      muted: false,
      volume: row.volume,
      pitch: 0,
      pan: 0,
      solo: false,
      effects: defaultEffects(),
    } satisfies Track];
  });
}

const STORAGE_KEY = "chipboy-studio.drum-machine.v1";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function normalizePattern(input: unknown, fallbackName: string): DrumPattern {
  const base = emptyDrumPattern(fallbackName);
  if (!input || typeof input !== "object") return base;
  const value = input as Partial<DrumPattern>;
  const rawSteps = value.steps && typeof value.steps === "object" ? value.steps as Record<string, unknown> : {};
  const rawPresets = value.presets && typeof value.presets === "object" ? value.presets as Record<string, unknown> : {};
  return {
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 40) : fallbackName,
    steps: Object.fromEntries(DRUM_ROWS.map(row => {
      const source = rawSteps[row.id];
      return [row.id, Array.from({ length: DRUM_STEP_COUNT }, (_, index) => Array.isArray(source) && source[index] === true)];
    })),
    presets: Object.fromEntries(DRUM_ROWS.flatMap(row => {
      const preset = rawPresets[row.id];
      return typeof preset === "string" && instruments.some(item => item.id === preset) ? [[row.id, preset]] : [];
    })),
  };
}

export function loadDrumMachine(): DrumMachineState {
  const fallback = defaultDrumMachine();
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = JSON.parse(store.getItem(STORAGE_KEY) ?? "null") as Partial<DrumMachineState> | null;
    if (!raw || !Array.isArray(raw.patterns)) return fallback;
    return {
      bpm: Math.round(clamp(raw.bpm ?? fallback.bpm, 40, 240)),
      swing: Math.round(clamp(raw.swing ?? fallback.swing, 0, 60)),
      loop: raw.loop !== false,
      master: Math.round(clamp(raw.master ?? fallback.master, 0, 100)),
      active: Math.max(0, Math.min(DRUM_BANKS.length - 1, Math.round(raw.active ?? 0))),
      patterns: DRUM_BANKS.map((bank, index) => normalizePattern(raw.patterns?.[index], bank)),
    };
  } catch {
    return fallback;
  }
}

export function saveDrumMachine(state: DrumMachineState) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A full or blocked localStorage should not interrupt the beat.
  }
}
