import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CloudDownload, ExternalLink, Loader2, Music2, Play, Search, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudio } from "./StudioProvider";
import { instruments } from "@/lib/instruments";
import { midiToRiff } from "@/lib/midi";
import { saveCustomRiff, type Riff } from "@/lib/riffs";
import { FREE_ASSET_COUNT, FREE_PACKS, MAX_FREE_DOWNLOAD_BYTES, type FreeAsset } from "@/lib/free-packs";
import type { SampleAsset } from "@/lib/song";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  active: boolean;
  onRiffsSaved: (riffs: Riff[]) => void;
  onPreviewRiff: (riff: Riff) => void;
};

const riffPresets = ["pulse12", "pulse25", "pulse50", "triangle", "sawlead", "squarebass", "bell", "organ", "brass", "pluck"];

const formatName = (format: string) => format === "midi" ? "MIDI" : format.toUpperCase();
const formatBytes = (bytes?: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "";
const MAX_AUDIO_CACHE_BYTES = 96 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

async function readLimitedBlob(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_FREE_DOWNLOAD_BYTES) throw new Error("This file is larger than the 12 MB download limit.");
  if (!response.body) {
    const blob = await response.blob();
    if (blob.size > MAX_FREE_DOWNLOAD_BYTES) throw new Error("This file is larger than the 12 MB download limit.");
    return blob;
  }
  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FREE_DOWNLOAD_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new Error("This file is larger than the 12 MB download limit.");
      }
      const chunk = new Uint8Array(value.byteLength);
      chunk.set(value);
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, { type: response.headers.get("content-type") ?? "application/octet-stream" });
}

export function FreePackBrowser({ active, onRiffsSaved, onPreviewRiff }: Props) {
  const studio = useStudio();
  const [open, setOpen] = useState(false);
  const [packId, setPackId] = useState(FREE_PACKS[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState("pulse25");
  const [busy, setBusy] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const context = useRef<AudioContext | null>(null);
  const previewSource = useRef<AudioBufferSourceNode | null>(null);
  const audioCache = useRef(new Map<string, AudioBuffer>());
  const audioCacheBytes = useRef(0);
  const busyRef = useRef(false);
  const previewToken = useRef(0);

  const pack = FREE_PACKS.find(item => item.id === packId) ?? FREE_PACKS[0];
  const assets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (pack?.assets ?? []).filter(asset => !needle || `${asset.name} ${asset.description} ${asset.format}`.toLowerCase().includes(needle));
  }, [pack, query]);

  const ensureContext = useCallback(() => {
    if (typeof AudioContext === "undefined") throw new Error("This browser cannot decode audio.");
    if (!context.current || context.current.state === "closed") context.current = new AudioContext();
    return context.current;
  }, []);

  const ensureRunningContext = useCallback(async () => {
    const ctx = ensureContext();
    if (ctx.state !== "running") await ctx.resume();
    return ctx;
  }, [ensureContext]);

  const stopPreview = useCallback(() => {
    previewToken.current += 1;
    try { previewSource.current?.stop(); } catch { /* Already stopped. */ }
    previewSource.current?.disconnect();
    previewSource.current = null;
    setPreviewing(null);
  }, []);

  useEffect(() => {
    if (!active) stopPreview();
  }, [active, stopPreview]);

  useEffect(() => () => {
    try { previewSource.current?.stop(); } catch { /* Already stopped. */ }
    void context.current?.close().catch(() => undefined);
  }, []);

  const download = async (asset: FreeAsset) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(asset.downloadUrl, { cache: "force-cache", signal: controller.signal });
      if (!response.ok) throw new Error(`Download failed with status ${response.status}.`);
      return await readLimitedBlob(response);
    } catch (error) {
      if (controller.signal.aborted) throw new Error("The download timed out. Check your connection and try again.");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const cacheAudio = (assetId: string, buffer: AudioBuffer) => {
    const bytes = buffer.length * buffer.numberOfChannels * 4;
    audioCache.current.set(assetId, buffer);
    audioCacheBytes.current += bytes;
    for (const [id, cached] of audioCache.current) {
      if (audioCacheBytes.current <= MAX_AUDIO_CACHE_BYTES || id === assetId) break;
      audioCacheBytes.current -= cached.length * cached.numberOfChannels * 4;
      audioCache.current.delete(id);
    }
  };

  const loadAudio = async (asset: FreeAsset) => {
    const cached = audioCache.current.get(asset.id);
    if (cached) return cached;
    const blob = await download(asset);
    const ctx = ensureContext();
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    cacheAudio(asset.id, buffer);
    return buffer;
  };

  const preview = async (asset: FreeAsset) => {
    stopPreview();
    const token = previewToken.current;
    setPreviewing(asset.id);
    try {
      if (asset.kind === "riff") {
        const parsed = midiToRiff(await (await download(asset)).arrayBuffer(), { name: asset.name, preset });
        if (token !== previewToken.current) return;
        onPreviewRiff({ id: `preview-${asset.id}`, name: asset.name, category: "Retro game", ...parsed, builtin: false });
        setPreviewing(null);
        return;
      }
      const buffer = await loadAudio(asset);
      if (token !== previewToken.current) return;
      const ctx = await ensureRunningContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = Boolean(asset.loop);
      source.connect(ctx.destination);
      source.onended = () => {
        if (previewSource.current === source) previewSource.current = null;
        setPreviewing(current => current === asset.id ? null : current);
      };
      source.start();
      previewSource.current = source;
    } catch (error) {
      if (token === previewToken.current) setPreviewing(null);
      toast.error(error instanceof Error ? error.message : "That preview could not play.");
    }
  };

  const add = async (asset: FreeAsset) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(asset.id);
    try {
      if (asset.kind === "riff") {
        const parsed = midiToRiff(await (await download(asset)).arrayBuffer(), { name: asset.name, preset });
        const next = saveCustomRiff({ ...parsed, category: "Retro game" });
        onRiffsSaved(next);
        toast.success(`“${asset.name}” added to My riffs.`);
      } else {
        const buffer = await loadAudio(asset);
        const sample: SampleAsset = {
          id: crypto.randomUUID(),
          name: asset.name,
          buffer,
          revision: 0,
          rootMidi: 60,
          loop: Boolean(asset.loop),
        };
        studio.addSamples([sample]);
        toast.success(`“${asset.name}” added to the Sampler.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That download could not be added.");
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  return <section className="editor-panel rounded-xl p-4" aria-labelledby="free-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="free-heading" className="section-heading flex items-center gap-2"><CloudDownload size={14} /> FREE GAME AUDIO</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--case-muted)]">Optional CC0 music and sound packs. Download only what you need, then add it as a riff or a sampler sound. The core studio still works offline.</p>
      </div>
      <Button onClick={() => { if (open) stopPreview(); setOpen(value => !value); }} aria-expanded={open} className="hardware-button h-8 px-3 text-[9px]">
        {open ? "HIDE" : `BROWSE ${FREE_ASSET_COUNT}`} <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </Button>
    </div>

    {open && <>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Free audio packs">
        {FREE_PACKS.map(item => <button key={item.id} role="tab" aria-selected={item.id === pack?.id} onClick={() => { setPackId(item.id); setQuery(""); stopPreview(); }} className={cn("console-tab rounded-md px-3 py-2 text-[9px] font-bold uppercase", item.id === pack?.id && "selected")}>
          {item.name} <span className="opacity-70">{item.assets.length}</span>
        </button>)}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 rounded-lg border bg-[var(--case-light)] px-3 py-2"><Search size={14} /><input aria-label="Search free packs" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a jingle or sound…" className="w-44 bg-transparent text-[10px] outline-none" /></label>
        <label className="text-[9px] font-bold">RIFF INSTRUMENT
          <select value={preset} onChange={event => setPreset(event.target.value)} className="ml-2 rounded border bg-[var(--case-light)] p-1 text-[10px]">
            {riffPresets.map(id => <option key={id} value={id}>{instruments.find(item => item.id === id)?.name ?? id}</option>)}
          </select>
        </label>
      </div>

      {pack && <div className="mt-3 rounded-lg border border-[var(--case-border)] bg-[var(--case-light)] p-3">
        <p className="text-[10px] leading-relaxed text-[var(--case-muted)]">{pack.description}</p>
        <p className="mt-1 text-[9px] text-[var(--case-muted)]"><a className="underline" href={pack.licenseUrl} target="_blank" rel="noreferrer">{pack.license}</a> · <a className="underline" href={pack.sourceUrl} target="_blank" rel="noreferrer">{pack.author} source</a> · no attribution required, credit appreciated.</p>
      </div>}

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {assets.map(asset => <article key={asset.id} className="sound-card rounded-lg p-3" aria-busy={busy === asset.id}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="case-label text-[8px]">{formatName(asset.format)} · {asset.kind === "riff" ? "RIFF" : "SAMPLE"}{asset.loop ? " · LOOP" : ""}{asset.bytes ? ` · ${formatBytes(asset.bytes)}` : ""}</span>
              <h3 className="truncate font-pixel text-sm">{asset.name}</h3>
              <p className="mt-0.5 text-[9px] leading-relaxed text-[var(--case-muted)]">{asset.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => previewing === asset.id ? stopPreview() : void preview(asset)} disabled={busy !== null} aria-label={previewing === asset.id ? `Stop ${asset.name}` : `Preview ${asset.name}`} className="hardware-button h-8 px-2 text-[9px]">{previewing === asset.id ? <Square size={12} fill="currentColor" /> : <Play size={12} />} {previewing === asset.id ? "STOP" : "PREVIEW"}</Button>
            <Button onClick={() => void add(asset)} disabled={busy !== null} className="play-button h-8 flex-1 px-2 text-[9px]">{busy === asset.id ? <Loader2 size={12} className="animate-spin" /> : asset.kind === "riff" ? <Music2 size={12} /> : <Volume2 size={12} />} {asset.kind === "riff" ? "ADD RIFF" : "ADD SAMPLE"}</Button>
            <a href={asset.downloadUrl} target="_blank" rel="noreferrer" aria-label={`Open ${asset.name} file`} className="flex h-8 w-8 items-center justify-center rounded border border-[var(--case-border)] bg-[var(--case-light)]"><ExternalLink size={12} /></a>
          </div>
        </article>)}
      </div>
      {!assets.length && <p className="py-6 text-center text-[11px]">No free audio matches that search.</p>}

      <p className="mt-3 text-[9px] leading-relaxed text-[var(--case-muted)]">Downloads are fetched directly from the original GitHub repositories only when you tap Add or Preview. Nothing is uploaded. The 12 MB limit keeps mobile memory predictable. MIDI files become one-bar riffs; audio files become sampler sounds.</p>
    </>}
  </section>;
}
