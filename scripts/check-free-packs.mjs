import { FREE_ASSETS, FREE_ASSET_COUNT, MAX_FREE_DOWNLOAD_BYTES } from "../src/lib/free-packs.ts";

const concurrency = 6;
let index = 0;
let failed = 0;
let totalBytes = 0;
let largest = 0;

const check = async asset => {
  const response = await fetch(asset.downloadUrl, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
  const bytes = Number(response.headers.get("content-length") ?? 0);
  const cors = response.headers.get("access-control-allow-origin");
  const problems = [];
  if (!response.ok) problems.push(`status ${response.status}`);
  if (cors !== "*") problems.push(`CORS ${cors ?? "missing"}`);
  if (!bytes) problems.push("missing content-length");
  if (bytes > MAX_FREE_DOWNLOAD_BYTES) problems.push(`${bytes} bytes exceeds the limit`);
  if (problems.length) {
    failed++;
    console.error(`FAIL ${asset.id}: ${problems.join(", ")}`);
  }
  totalBytes += bytes;
  largest = Math.max(largest, bytes);
};

await Promise.all(Array.from({ length: concurrency }, async () => {
  while (index < FREE_ASSETS.length) {
    const asset = FREE_ASSETS[index++];
    await check(asset);
  }
}));

console.log(`Checked ${FREE_ASSET_COUNT} assets. Largest ${(largest / 1048576).toFixed(1)} MB, total ${(totalBytes / 1048576).toFixed(1)} MB.`);
if (failed) {
  console.error(`${failed} asset URL(s) failed.`);
  process.exit(1);
}
