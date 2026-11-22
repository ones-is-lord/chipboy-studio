import { beforeEach, describe, expect, it } from "vitest";
import { instruments } from "./instruments";
import { allRiffs, builtinRiffs, deleteCustomRiff, fitRiffToTrack, loadCustomRiffs, riffTrack, saveCustomRiff, RIFF_CATEGORIES } from "./riffs";
import type { Track } from "./song";

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

const track = (overrides: Partial<Track> = {}): Track => ({
  name: "Lead",
  chip: "PULSE 01",
  voice: "square",
  preset: "pulse50",
  octave: 0,
  rootMidi: 60,
  patterns: [[], []],
  bars: Array(4).fill(null),
  muted: false,
  volume: 70,
  pitch: 0,
  ...overrides,
});

describe("built-in riffs", () => {
  it("are unique, playable and use real presets", () => {
    expect(builtinRiffs.length).toBeGreaterThanOrEqual(90);
    expect(new Set(builtinRiffs.map(riff => riff.id)).size).toBe(builtinRiffs.length);
    expect(new Set(builtinRiffs.map(riff => riff.name)).size).toBe(builtinRiffs.length);
    expect(builtinRiffs.every(riff => RIFF_CATEGORIES.includes(riff.category))).toBe(true);
    expect(new Set(builtinRiffs.map(riff => riff.category))).toEqual(new Set(RIFF_CATEGORIES));
    expect(builtinRiffs.filter(riff => riff.category === "Modern beats").length).toBeGreaterThanOrEqual(20);
    expect(builtinRiffs.filter(riff => riff.category === "Retro game").length).toBeGreaterThanOrEqual(20);
    expect(builtinRiffs.every(riff => instruments.some(instrument => instrument.id === riff.preset))).toBe(true);
    expect(builtinRiffs.every(riff => riff.notes.length > 0 && riff.notes.every(note => note.start >= 0 && note.start < 16 && note.duration > 0 && note.start + note.duration <= 16))).toBe(true);
  });

  it("does not expose duplicate riff ids", () => {
    expect(allRiffs([{ ...builtinRiffs[0], builtin: false }])).toHaveLength(builtinRiffs.length);
  });

  it("builds a preview track with the riff pattern", () => {
    const preview = riffTrack(builtinRiffs[0], 4);
    expect(preview.patterns[0]).toHaveLength(builtinRiffs[0].notes.length);
    expect(preview.bars).toHaveLength(4);
    expect(preview.bars[0]?.pattern).toBe(0);
  });
});

describe("custom riffs", () => {
  it("saves, loads and deletes a riff", () => {
    const source = builtinRiffs[0];
    const saved = saveCustomRiff({ name: "My loop", category: "Drum loops", preset: source.preset, voice: source.voice, rootMidi: source.rootMidi, notes: source.notes });
    expect(saved).toHaveLength(1);
    expect(saved[0].builtin).toBe(false);
    expect(loadCustomRiffs()[0].name).toBe("My loop");
    expect(deleteCustomRiff(saved[0].id)).toHaveLength(0);
    expect(loadCustomRiffs()).toHaveLength(0);
  });

  it("rejects sample channels because audio is not embedded", () => {
    const source = builtinRiffs[0];
    expect(() => saveCustomRiff({ name: "Sample loop", category: "Drum loops", preset: source.preset, voice: "sample", rootMidi: source.rootMidi, notes: source.notes })).toThrow(/valid instrument/i);
  });

  it("accepts dense one-bar patterns", () => {
    const source = builtinRiffs[0];
    const notes = Array.from({ length: 100 }, (_, index) => ({ ...source.notes[0], id: `dense-${index}`, start: index % 16, midi: 36 + (index % 12) }));
    expect(saveCustomRiff({ name: "Dense", category: "Drum loops", preset: source.preset, voice: source.voice, rootMidi: source.rootMidi, notes })[0].notes).toHaveLength(100);
  });

  it("ignores corrupt storage instead of throwing", () => {
    localStorage.setItem("chipboy-studio.riffs.v1", "not json");
    expect(loadCustomRiffs()).toEqual([]);
  });

  it("fits a riff near the destination channel without changing its shape", () => {
    const source = builtinRiffs.find(riff => riff.id === "lead-hero")!;
    const notes = fitRiffToTrack(source, track({ rootMidi: 48 }));
    expect(notes).toHaveLength(source.notes.length);
    expect(notes.every(note => Math.abs(note.midi - 48) <= 18)).toBe(true);
    expect(notes.map(note => note.start)).toEqual(source.notes.map(note => note.start));
  });
});
