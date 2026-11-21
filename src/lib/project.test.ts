import { beforeEach, describe, expect, it } from "vitest";
import { createDemoSong } from "./song";
import {
  buildShareUrl,
  decodeShareSong,
  deleteProject,
  encodeShareSong,
  loadAutosave,
  loadProjects,
  normalizeSong,
  parseProjectJson,
  projectFilename,
  safeStem,
  saveAutosave,
  saveProject,
  serializeProject,
  PROJECT_FORMAT,
  PROJECT_VERSION,
} from "./project";

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

describe("project normalization", () => {
  it("keeps a valid demo song intact", () => {
    const source = createDemoSong();
    const { song, warnings } = normalizeSong(source);
    expect(warnings).toEqual([]);
    expect(song.name).toBe(source.name);
    expect(song.tracks).toHaveLength(5);
    expect(song.tracks.every(track => track.bars.length === song.barCount)).toBe(true);
  });

  it("clamps unsafe values and repairs pattern references", () => {
    const source = createDemoSong();
    const raw = {
      ...source,
      name: "  ",
      bpm: 999,
      speed: 0.01,
      master: -4,
      transpose: 99,
      barCount: 99,
      tracks: [
        {
          ...source.tracks[0],
          volume: 999,
          pitch: -99,
          octave: 9,
          pan: 999,
          solo: true,
          bars: [{ pattern: 5, start: 99, end: -2, length: 9999 }],
        },
      ],
    };
    const { song } = normalizeSong(raw);
    expect(song.name).toBe("Untitled song");
    expect(song.bpm).toBe(240);
    expect(song.speed).toBe(0.25);
    expect(song.master).toBe(0);
    expect(song.barCount).toBe(64);
    expect(song.tracks[0].volume).toBe(100);
    expect(song.tracks[0].pitch).toBe(-24);
    expect(song.tracks[0].octave).toBe(3);
    expect(song.transpose).toBe(12);
    expect(song.tracks[0].pan).toBe(100);
    expect(song.tracks[0].solo).toBe(true);
    expect(song.tracks[0].bars).toHaveLength(64);
    expect(song.tracks[0].bars[0]?.pattern).toBe(5);
    expect(song.tracks[0].patterns.length).toBeGreaterThan(5);
  });

  it("drops overlapping blocks instead of crashing playback", () => {
    const source = createDemoSong();
    const raw = { ...source, tracks: [{ ...source.tracks[0], bars: [{ pattern: 0, start: 0, end: 16, length: 32 }, { pattern: 0, start: 0, end: 16, length: 16 }, ...Array(14).fill(null)] }] };
    const { song, warnings } = normalizeSong(raw);
    expect(warnings.some(warning => warning.includes("overlapping"))).toBe(true);
    expect(song.tracks[0].bars[1]).toBeNull();
  });

  it("rejects data that is not a song", () => {
    expect(() => normalizeSong({})).toThrow(/invalid/i);
    expect(() => normalizeSong({ tracks: [] })).toThrow(/invalid/i);
  });
});

describe("project files", () => {
  it("round-trips a serialized project", () => {
    const source = { ...createDemoSong(), name: "Test cartridge" };
    const text = serializeProject(source);
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe(PROJECT_FORMAT);
    expect(parsed.version).toBe(PROJECT_VERSION);
    const project = parseProjectJson(text);
    expect(project.song.name).toBe("Test cartridge");
    expect(project.song.tracks).toHaveLength(source.tracks.length);
    expect(project.version).toBe(PROJECT_VERSION);
  });

  it("imports legacy v3 files", () => {
    const source = createDemoSong();
    const legacy = JSON.stringify({ version: 3, ...source, samples: [{ id: "s1", name: "Kick", rootMidi: 36, loop: false, duration: 1 }] });
    const project = parseProjectJson(legacy);
    expect(project.version).toBe(3);
    expect(project.samples).toHaveLength(1);
    expect(project.song.tracks).toHaveLength(5);
  });

  it("rejects malformed and oversized files", () => {
    expect(() => parseProjectJson("not json")).toThrow(/valid JSON/i);
    expect(() => parseProjectJson("[]")).toThrow(/Chipboy Studio project/i);
    expect(() => parseProjectJson("x".repeat(2 * 1024 * 1024 + 1))).toThrow(/2 MB/i);
  });

  it("creates safe filenames", () => {
    expect(safeStem("  My Song!  ")).toBe("my-song");
    expect(projectFilename("My Song!")).toBe("my-song.chipboy.json");
  });
});

describe("share links", () => {
  it("encodes and decodes a song", () => {
    const song = createDemoSong();
    const encoded = encodeShareSong(song);
    expect(decodeShareSong(encoded)?.name).toBe(song.name);
    const url = buildShareUrl(song, { origin: "https://example.com", pathname: "/studio" } as Location);
    expect(url).toContain("project=");
    expect(decodeShareSong(new URL(url).searchParams.get("project")!)).not.toBeNull();
  });

  it("returns null for corrupt share data", () => {
    expect(decodeShareSong("!!!")).toBeNull();
    expect(decodeShareSong("x".repeat(50_000))).toBeNull();
  });
});

describe("local project storage", () => {
  it("saves, lists, overwrites and deletes projects", () => {
    const song = createDemoSong();
    const first = saveProject(song, { name: "First" });
    expect(loadProjects()).toHaveLength(1);
    const updated = saveProject({ ...song, bpm: 140 }, { id: first.id, name: "First" });
    expect(updated.id).toBe(first.id);
    expect(loadProjects()[0].song.bpm).toBe(140);
    deleteProject(first.id);
    expect(loadProjects()).toHaveLength(0);
  });

  it("keeps autosave data separate from saved slots", () => {
    saveAutosave({ ...createDemoSong(), name: "Autosaved" });
    expect(loadAutosave()?.song.name).toBe("Autosaved");
    expect(loadProjects()).toHaveLength(0);
  });
});
