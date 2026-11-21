import { describe, expect, it } from "vitest";
import { testBuffer } from "@/test/audio";
import { safeFilename, wavBytes } from "./wav";

const ascii = (view: DataView, offset: number, length: number) =>
  Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join("");

describe("wav encoding", () => {
  it("writes a valid RIFF header", () => {
    const bytes = wavBytes(testBuffer([0, 0.5, -0.5, 1], 44100, 2));
    const view = new DataView(bytes);
    expect(ascii(view, 0, 4)).toBe("RIFF");
    expect(ascii(view, 8, 4)).toBe("WAVE");
    expect(ascii(view, 36, 4)).toBe("data");
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(40, true)).toBe(4 * 2 * 2);
  });

  it("preserves quiet material instead of normalising it upward", () => {
    const bytes = wavBytes(testBuffer([0.25, -0.25]));
    const view = new DataView(bytes);
    expect(view.getInt16(44, true)).toBe(Math.round(0.25 * 0x7fff));
    expect(view.getInt16(46, true)).toBe(Math.round(-0.25 * 0x8000));
  });

  it("attenuates clipping material and rounds samples", () => {
    const bytes = wavBytes(testBuffer([2, 0.5, -2]));
    const view = new DataView(bytes);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(Math.round(0.25 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(-0x8000);
  });

  it("sanitises download filenames", () => {
    expect(safeFilename("My Song!")).toBe("My-Song");
    expect(safeFilename("***")).toBe("chipboy");
  });
});
