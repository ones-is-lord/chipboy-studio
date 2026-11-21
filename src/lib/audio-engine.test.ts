import { describe, expect, it } from "vitest";
import { songEvents } from "./audio-engine";
import { createDemoSong, stepSeconds } from "./song";

describe("song events", () => {
  it("turns arranged blocks into timed note events", () => {
    const song = createDemoSong();
    const events = songEvents(song);
    expect(events.length).toBeGreaterThan(0);
    const unit = stepSeconds(song);
    expect(events[0].duration).toBeCloseTo(events[0].note.duration * unit);
    expect(events.every(event => event.trackIndex >= 0 && event.trackIndex < song.tracks.length)).toBe(true);
  });

  it("omits muted channels", () => {
    const song = createDemoSong();
    const total = songEvents(song).length;
    song.tracks[0].muted = true;
    expect(songEvents(song).length).toBeLessThan(total);
    expect(songEvents(song).some(event => event.trackIndex === 0)).toBe(false);
  });
});
