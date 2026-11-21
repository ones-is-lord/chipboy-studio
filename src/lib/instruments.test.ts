import { describe, expect, it } from "vitest";
import { instrumentById, instrumentTrack, instruments } from "./instruments";

describe("instruments", () => {
  it("has unique ids and valid voices", () => {
    expect(new Set(instruments.map(instrument => instrument.id)).size).toBe(instruments.length);
    expect(instruments.every(instrument => ["square", "triangle", "kick", "noise"].includes(instrument.voice))).toBe(true);
  });

  it("builds channel tracks with the requested bar count", () => {
    const track = instrumentTrack("triangle", 12);
    expect(track.bars).toHaveLength(12);
    expect(track.patterns).toEqual([[], []]);
    expect(instrumentById("missing").id).toBe(instruments[0].id);
  });
});
