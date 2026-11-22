import { describe, expect, it } from "vitest";
import { midiToRiff } from "./midi";

const chunk = (id: string, data: number[]) => {
  const length = data.length;
  return [...id].map(char => char.charCodeAt(0)).concat([(length >>> 24) & 255, (length >>> 16) & 255, (length >>> 8) & 255, length & 255], data);
};

const file = (events: number[], division = 480) => new Uint8Array([
  ...chunk("MThd", [0, 0, 0, 1, (division >>> 8) & 255, division & 255]),
  ...chunk("MTrk", events),
]).buffer;

const noteOn = (midi: number, velocity = 100, channel = 0) => [0x90 | channel, midi, velocity];
const noteOff = (midi: number, channel = 0) => [0x80 | channel, midi, 0];

describe("MIDI riff import", () => {
  it("maps the first bar to the 16-step grid", () => {
    const parsed = midiToRiff(file([
      0, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
      0, ...noteOn(60), 0x83, 0x60, ...noteOff(60),
      0, ...noteOn(62), 0x81, 0x70, ...noteOff(62),
      0, 0xff, 0x2f, 0,
    ]), { name: "Test jingle" });
    expect(parsed.notes).toHaveLength(2);
    expect(parsed.notes[0]).toMatchObject({ midi: 60, start: 0, duration: 4 });
    expect(parsed.notes[1]).toMatchObject({ midi: 62, start: 4, duration: 2 });
    expect(parsed.rootMidi).toBe(60);
    expect(parsed.preset).toBe("pulse25");
    expect(parsed.name).toBe("Test jingle");
  });

  it("honours a 3/4 time signature and running status", () => {
    const parsed = midiToRiff(file([
      0, 0xff, 0x58, 0x04, 0x03, 0x02, 0x18, 0x08,
      0, ...noteOn(60), 0x83, 0x60, 60, 0,
      0, ...noteOn(64), 0x81, 0x70, ...noteOff(64),
      0, 0xff, 0x2f, 0,
    ]), { name: "Waltz", preset: "triangle" });
    expect(parsed.notes[0]).toMatchObject({ midi: 60, start: 0, duration: 5.25 });
    expect(parsed.notes[1]).toMatchObject({ midi: 64, start: 5.25 });
    expect(parsed.preset).toBe("triangle");
  });

  it("skips the General MIDI percussion channel", () => {
    const parsed = midiToRiff(file([
      0, ...noteOn(36, 100, 9), 0x83, 0x60, ...noteOff(36, 9),
      0, ...noteOn(72), 0x83, 0x60, ...noteOff(72),
      0, 0xff, 0x2f, 0,
    ]), { name: "Drums and lead" });
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0].midi).toBe(72);
  });

  it("starts the window at the first note and ignores later bars", () => {
    const parsed = midiToRiff(file([
      0x83, 0x60, ...noteOn(60), 0x83, 0x60, ...noteOff(60),
      0x8b, 0x20, ...noteOn(67), 0x83, 0x60, ...noteOff(67),
      0, 0xff, 0x2f, 0,
    ]), { name: "Pickup" });
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]).toMatchObject({ midi: 60, start: 0, duration: 4 });
  });

  it("rejects non-MIDI data", () => {
    expect(() => midiToRiff(new Uint8Array([1, 2, 3, 4]).buffer, { name: "Nope" })).toThrow(/MIDI/);
  });

  it("rejects a truncated event instead of reading past the track", () => {
    expect(() => midiToRiff(file([0, 0x90, 60]), { name: "Broken" })).toThrow(/truncated/);
  });

  it("rejects unsupported system events", () => {
    expect(() => midiToRiff(file([0, 0xf1, 0, 0]), { name: "Broken" })).toThrow(/system event/);
  });
});
