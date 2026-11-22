import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FREE_ASSETS, FREE_ASSET_COUNT, FREE_PACKS, MAX_FREE_DOWNLOAD_BYTES } from "./free-packs";

describe("free pack catalogue", () => {
  it("has unique packs and assets", () => {
    expect(FREE_PACKS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(FREE_PACKS.map(pack => pack.id)).size).toBe(FREE_PACKS.length);
    expect(new Set(FREE_ASSETS.map(asset => asset.id)).size).toBe(FREE_ASSETS.length);
    expect(FREE_ASSET_COUNT).toBe(FREE_ASSETS.length);
    expect(FREE_ASSETS.length).toBeGreaterThan(60);
  });

  it("only points at HTTPS CC0 sources with encoded raw URLs", () => {
    for (const pack of FREE_PACKS) {
      expect(pack.license).toBe("CC0-1.0");
      expect(pack.licenseUrl.startsWith("https://")).toBe(true);
      expect(pack.sourceUrl.startsWith("https://github.com/")).toBe(true);
      for (const asset of pack.assets) {
        expect(asset.downloadUrl.startsWith("https://raw.githubusercontent.com/")).toBe(true);
        expect(asset.downloadUrl).not.toContain(" ");
        expect(asset.downloadUrl).not.toContain("#");
        expect(asset.kind === "riff" ? asset.format === "midi" : asset.format !== "midi").toBe(true);
      }
    }
  });

  it("encodes paths with spaces and keeps a sane size ceiling", () => {
    const grave = FREE_ASSETS.find(asset => asset.packId === "grave-reckoning");
    expect(grave?.downloadUrl).toContain("%20");
    expect(MAX_FREE_DOWNLOAD_BYTES).toBe(12 * 1024 * 1024);
  });

  it("allows the download host in every deployed CSP", () => {
    for (const file of ["../../public/_headers", "../../vercel.json"]) {
      const policy = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(policy).toMatch(/connect-src[^;]*https:\/\/raw\.githubusercontent\.com/);
    }
  });
});
