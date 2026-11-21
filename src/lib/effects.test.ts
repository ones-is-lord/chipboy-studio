import { describe, expect, it } from "vitest";
import { defaultEffects, effectTail } from "./effects";

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
});
