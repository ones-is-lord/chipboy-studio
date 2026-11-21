import { describe, expect, it } from "vitest";
import { songEvents } from "./audio-engine";
import {
  blockNotes,
  coveringBlock,
  createDemoSong,
  newBlock,
  noteName,
  overlaps,
  patternLabel,
  stepSeconds,
  validArrangement,
  type Track,
} from "./song";

const track = (overrides: Partial<Track> = {}): Track => ({
  name: "Lead",
  chip: "PULSE 01",
  voice: "square",
  preset: "pulse50",
  octave: 0,
  rootMidi: 60,
  patterns: [[], []],
  bars: Array(8).fill(null),
  muted: false,
  volume: 70,
  pitch: 0,
  ...overrides,
});

describe("song helpers", () => {
  it("converts BPM and speed into step seconds", () => {
    expect(stepSeconds({ ...createDemoSong(), bpm: 120, speed: 1 })).toBeCloseTo(0.125);
    expect(stepSeconds({ ...createDemoSong(), bpm: 120, speed: 2 })).toBeCloseTo(0.0625);
  });

  it("labels patterns and notes", () => {
    expect(patternLabel(0)).toBe("A");
    expect(patternLabel(25)).toBe("Z");
    expect(patternLabel(26)).toBe("P27");
    expect(noteName(60)).toBe("C4");
    expect(noteName(69)).toBe("A4");
    expect(noteName(61)).toBe("C♯4");
  });

  it("finds blocks that cover a bar", () => {
    const long = track({ bars: [{ pattern: 0, start: 0, end: 16, length: 32 }, ...Array(7).fill(null)] });
    expect(coveringBlock(long, 1)).toEqual({ block: { pattern: 0, start: 0, end: 16, length: 32 }, bar: 0 });
    expect(coveringBlock(long, 2)).toBeNull();
  });

  it("detects overlapping blocks and invalid arrangements", () => {
    const t = track({ bars: [{ pattern: 0, start: 0, end: 16, length: 32 }, { pattern: 0, start: 0, end: 16, length: 16 }, ...Array(6).fill(null)] });
    expect(overlaps(t, 1, newBlock(0))).toEqual([0, 1]);
    expect(overlaps(t, 1, newBlock(0), [0])).toEqual([1]);
    expect(validArrangement(t.bars)).toBe(false);
    expect(validArrangement([newBlock(0), { ...newBlock(0), length: 17 }])).toBe(false);
  });

  it("trims and stretches notes without changing pitch", () => {
    const t = track({ patterns: [[{ id: "n1", midi: 60, start: 4, duration: 4 }, { id: "n2", midi: 64, start: 6, duration: 2 }], []] });
    const notes = blockNotes(t, { pattern: 0, start: 4, end: 8, length: 8 });
    expect(notes[0]).toMatchObject({ id: "n1", midi: 60, start: 0, duration: 8 });
    expect(notes[1]).toMatchObject({ id: "n2", midi: 64, start: 4, duration: 4 });
  });

  it("transposes playback without mutating note data", () => {
    const source = createDemoSong();
    const original = source.tracks[0].patterns[0][0].midi;
    const transposed = { ...source, transpose: 5 };
    const events = songEvents(transposed);
    expect(events[0].note.midi).toBe(original + 5);
    expect(source.tracks[0].patterns[0][0].midi).toBe(original);
  });

  it("auditions only soloed channels when solo is active", () => {
    const source = createDemoSong();
    source.tracks[1].solo = true;
    const events = songEvents(source);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(event => event.trackIndex === 1)).toBe(true);
    source.tracks[1].muted = true;
    expect(songEvents(source)).toHaveLength(0);
  });

  it("ships a valid demo song", () => {
    const song = createDemoSong();
    expect(song.tracks).toHaveLength(5);
    expect(validArrangement(song.tracks[0].bars)).toBe(true);
    expect(song.tracks.every(t => t.bars.length === song.barCount)).toBe(true);
    expect(song.tracks.every(t => t.patterns.length >= 2)).toBe(true);
  });
});
