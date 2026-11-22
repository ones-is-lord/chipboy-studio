import { beforeEach, describe, expect, it } from "vitest";
import {
  DRUM_BANKS,
  DRUM_ROWS,
  DRUM_STEP_COUNT,
  clearDrumPattern,
  copyDrumPattern,
  defaultDrumMachine,
  drumHitCount,
  drumStepSeconds,
  drumTracks,
  emptyDrumPattern,
  loadDrumMachine,
  saveDrumMachine,
  toggleDrumStep,
} from "./drum-machine";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
});

describe("drum machine", () => {
  it("has the full requested kit and unique lanes", () => {
    expect(DRUM_ROWS).toHaveLength(18);
    expect(new Set(DRUM_ROWS.map(row => row.id)).size).toBe(DRUM_ROWS.length);
    for (const id of ["kick", "double", "snare", "roll", "tom1", "tom2", "tom3", "hat", "openhat", "crash", "ride", "timpani", "kettle", "cowbell", "clap1", "clap2", "custom1", "custom2"]) {
      expect(DRUM_ROWS.some(row => row.id === id)).toBe(true);
    }
    expect(DRUM_ROWS.every(row => row.preset && row.rootMidi >= 0 && row.rootMidi <= 127)).toBe(true);
  });

  it("starts with four empty 16-step banks", () => {
    const state = defaultDrumMachine();
    expect(state.patterns).toHaveLength(DRUM_BANKS.length);
    expect(state.patterns.every(pattern => Object.values(pattern.steps).every(steps => steps.length === DRUM_STEP_COUNT && steps.every(step => step === false)))).toBe(true);
    expect(drumHitCount(state.patterns[0])).toBe(0);
  });

  it("toggles, clears and copies without mutating the source", () => {
    const source = emptyDrumPattern("A");
    const toggled = toggleDrumStep(toggleDrumStep(source, "kick", 0), "snare", 4);
    expect(source.steps.kick[0]).toBe(false);
    expect(toggled.steps.kick[0]).toBe(true);
    expect(toggled.steps.snare[4]).toBe(true);
    expect(drumHitCount(toggled)).toBe(2);
    expect(clearDrumPattern(toggled).steps.kick[0]).toBe(false);
    const copy = copyDrumPattern(toggled, "B");
    copy.steps.kick[0] = false;
    expect(toggled.steps.kick[0]).toBe(true);
    expect(copy.name).toBe("B");
  });

  it("turns active lanes into song tracks at the requested bar", () => {
    let pattern = toggleDrumStep(emptyDrumPattern("A"), "kick", 0);
    pattern = toggleDrumStep(pattern, "kick", 8);
    pattern = toggleDrumStep(pattern, "snare", 4);
    pattern = { ...pattern, presets: { custom1: "bell" } };
    pattern = toggleDrumStep(pattern, "custom1", 12);
    const tracks = drumTracks(pattern, { bar: 2, barCount: 4 });
    expect(tracks).toHaveLength(3);
    const kick = tracks.find(track => track.name === "Kick")!;
    expect(kick.patterns[0].map(note => note.start)).toEqual([0, 8]);
    expect(kick.bars).toHaveLength(4);
    expect(kick.bars[2]?.pattern).toBe(0);
    expect(kick.bars[0]).toBeNull();
    expect(tracks.find(track => track.name === "Custom A")?.preset).toBe("bell");
    expect(tracks.every(track => track.chip === "DRUM KIT" && track.patterns[1].length === 0)).toBe(true);
  });

  it("uses sixteenth-note timing and persists the machine state", () => {
    expect(drumStepSeconds(120)).toBeCloseTo(0.125);
    const state = defaultDrumMachine();
    state.bpm = 92;
    state.swing = 18;
    state.patterns[1] = toggleDrumStep(state.patterns[1], "clap2", 6);
    saveDrumMachine(state);
    const loaded = loadDrumMachine();
    expect(loaded.bpm).toBe(92);
    expect(loaded.swing).toBe(18);
    expect(loaded.patterns[1].steps.clap2[6]).toBe(true);
  });

  it("falls back safely when storage is corrupt", () => {
    localStorage.setItem("chipboy-studio.drum-machine.v1", "not json");
    expect(loadDrumMachine().bpm).toBe(120);
  });
});
