import { describe, expect, it } from "vitest";
import { samplesOf, testBuffer } from "@/test/audio";
import { cropBuffer, processBuffer, slicePoints, stretchBuffer } from "./sample-processing";

describe("sample processing", () => {
  it("crops by time and clamps out-of-range selections", () => {
    const buffer = testBuffer([0, 1, 2, 3, 4, 5, 6, 7], 8);
    expect(samplesOf(cropBuffer(buffer, 0.25, 0.75))).toEqual([2, 3, 4, 5]);
    expect(samplesOf(cropBuffer(buffer, -2, 99))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("normalises, reverses, fades and applies gain", () => {
    const buffer = testBuffer([0, 0.5, -0.25, 0.25], 8);
    const normalised = samplesOf(processBuffer(buffer, "normalize"));
    expect(Math.max(...normalised.map(Math.abs))).toBeCloseTo(0.95);
    expect(samplesOf(processBuffer(buffer, "reverse"))).toEqual([0.25, -0.25, 0.5, 0]);
    expect(samplesOf(processBuffer(buffer, "fade-in", 0.5))[0]).toBe(0);
    expect(samplesOf(processBuffer(buffer, "fade-out", 0.5)).at(-1)).toBe(0);
    expect(samplesOf(processBuffer(buffer, "gain", 6))[1]).toBeCloseTo(0.9976, 3);
  });

  it("creates equal and transient slice points", () => {
    const buffer = testBuffer(Array.from({ length: 800 }, (_, i) => (i % 100 < 4 ? 0.9 : 0)), 8000);
    expect(slicePoints(buffer, 4, false)).toEqual([0, 0.025, 0.05, 0.07500000000000001, 0.1]);
    const transient = slicePoints(buffer, 4, true);
    expect(transient.length).toBeGreaterThan(1);
    expect(transient.at(-1)).toBeCloseTo(buffer.duration);
  });

  it("stretches to the requested duration and survives bad input", () => {
    const buffer = testBuffer(Array.from({ length: 64 }, (_, i) => Math.sin(i / 4)), 8000);
    expect(stretchBuffer(buffer, 0.02, 0).duration).toBeCloseTo(0.02, 2);
    expect(stretchBuffer(buffer, Number.NaN, Number.NaN).length).toBeGreaterThan(0);
    expect(stretchBuffer(buffer, 1, 1200).length).toBe(8000);
  });
});
