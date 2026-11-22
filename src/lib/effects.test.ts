import { describe, expect, it } from "vitest";
import { defaultEffects, effectTail, normalizeEffects } from "./effects";

describe("effects", () => {
  it("uses a short default tail when effects are off", () => {
    expect(effectTail(undefined)).toBe(0.8);
    expect(effectTail({ ...defaultEffects(), enabled: false })).toBe(0.8);
  });

  it("keeps delay and reverb tails bounded", () => {
    expect(effectTail({ ...defaultEffects(), reverb: 0.5 })).toBe(2.5);
    expect(effectTail({ ...defaultEffects(), delay: 0.5, delayBeats: 1, feedback: 0.5 }, 120, 1)).toBeGreaterThan(0.8);
    expect(effectTail({ ...defaultEffects(), delay: 0.5, delayBeats: 4, feedback: 1 }, 40, 0.25)).toBeLessThanOrEqual(20);
  });

  it("exposes the expanded rack defaults and clamps unsafe values", () => {
    const defaults = defaultEffects();
    expect(defaults.acid).toBe(0);
    expect(defaults.compression).toBe(0);
    expect(defaults.phaser).toBe(0);
    expect(defaults.filterRate).toBe(0.5);
    const normalized = normalizeEffects({ cutoff: 1, resonance: 99, drive: -4, saturation: 5, bits: 0, acid: 3, filterLfo: -1, filterRate: 99, phaser: 2, compression: 4, low: -99, high: 99 });
    expect(normalized.cutoff).toBe(60);
    expect(normalized.resonance).toBe(24);
    expect(normalized.drive).toBe(0);
    expect(normalized.saturation).toBe(1);
    expect(normalized.bits).toBe(1);
    expect(normalized.acid).toBe(1);
    expect(normalized.filterLfo).toBe(0);
    expect(normalized.filterRate).toBe(8);
    expect(normalized.phaser).toBe(1);
    expect(normalized.compression).toBe(1);
    expect(normalized.low).toBe(-12);
    expect(normalized.high).toBe(12);
  });

  it("keeps older effect objects working with new defaults", () => {
    const legacy = normalizeEffects({ enabled: true, cutoff: 4000, distortion: 0.2 });
    expect(legacy.drive).toBe(0);
    expect(legacy.acid).toBe(0);
    expect(legacy.phaser).toBe(0);
    expect(legacy.compression).toBe(0);
  });
});
