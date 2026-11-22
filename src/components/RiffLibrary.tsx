import { useMemo, useState } from "react";
import { Download, Play, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudio } from "./StudioProvider";
import { useSongPlayback } from "@/hooks/use-song-playback";
import { PixelArt } from "./PixelArt";
import { coveringBlock } from "@/lib/song";
import { instrumentById } from "@/lib/instruments";
import { allRiffs, deleteCustomRiff, loadCustomRiffs, riffTrack, saveCustomRiff, type Riff, type RiffCategory, RIFF_CATEGORIES } from "@/lib/riffs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = RiffCategory | "All";

export function RiffLibrary({ active }: { active: boolean }) {
  const studio = useStudio();
  const audio = useSongPlayback(studio.song, active, studio.audioSamples);
  const [custom, setCustom] = useState<Riff[]>(() => loadCustomRiffs());
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [captureCategory, setCaptureCategory] = useState<RiffCategory>("Melodies");

  const track = studio.song.tracks[studio.selectedTrack];
  const cover = coveringBlock(track, studio.selectedBar);
  const patternIndex = cover?.block.pattern ?? Math.min(studio.preferredPattern, track.patterns.length - 1);
  const notes = track.patterns[patternIndex] ?? [];
  const riffs = useMemo(() => allRiffs(custom).filter(riff => (filter === "All" || riff.category === filter) && `${riff.name} ${riff.preset} ${riff.category}`.toLowerCase().includes(search.trim().toLowerCase())), [custom, filter, search]);
  const customCount = custom.length;

  const preview = (riff: Riff) => void audio.previewSequence(riffTrack(riff, studio.song.barCount), riff.notes);

  const capture = () => {
    if (track.voice === "sample") { toast.error("Sample channels cannot be captured as riffs because sample audio is not embedded."); return; }
    if (!notes.length) { toast.error("The selected pattern is empty. Draw a few notes first."); return; }
    try {
      const next = saveCustomRiff({
        name: name.trim() || `${track.name} riff`,
        category: captureCategory,
        preset: track.preset,
        voice: track.voice,
        rootMidi: track.rootMidi,
        notes: notes.map(note => ({ ...note, id: crypto.randomUUID() })),
      });
      setCustom(next); setName("");
      toast.success("Pattern captured into My riffs. It is stored in this browser.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The riff could not be saved."); }
  };

  const remove = (riff: Riff) => {
    if (!window.confirm(`Delete “${riff.name}” from My riffs?`)) return;
    try { setCustom(deleteCustomRiff(riff.id)); toast.success("Riff deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The riff could not be deleted."); }
  };

  return <div className="space-y-5">
    <div className="section-heading flex flex-wrap items-center justify-between gap-3">
      <span>04 / RIFF LIBRARY</span>
      <span className="text-[9px]">LAYER IDEAS LIKE THE OLD MUSIC GENERATOR · {riffs.length} READY</span>
    </div>

    <section className="screen-bezel rounded-xl p-3 sm:p-4" aria-labelledby="riff-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="riff-heading" className="bezel-label">RIFF PALETTE</h2>
          <p className="bezel-copy mt-1">Audition a phrase, then stamp it into the selected channel and pattern. Stamping replaces that pattern.</p>
        </div>
        <div className="flex items-center gap-2"><PixelArt type="note" className="h-7 w-7" /><span className="bezel-label text-[8px]">1 BAR · 16 STEPS</span></div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter riffs by category">
          {(["All", ...RIFF_CATEGORIES] as const).map(value => (
            <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={cn("console-tab rounded-md px-3 py-2 text-[9px] font-bold uppercase", filter === value && "selected")}>{value}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 rounded-lg border bg-[var(--case-light)] px-3 py-2"><Search size={14} /><input aria-label="Search riffs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a riff…" className="w-36 bg-transparent text-[10px] outline-none" /></label>
      </div>

      <div className="game-screen rounded-md p-3 sm:p-4">
        <div className="lcd-heading mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--lcd-line)] pb-3">
          <span className="font-pixel text-base tracking-wider">BORROW A GOOD IDEA.</span>
          <span className="lcd-label">TARGET: {track.name} · PATTERN {patternIndex + 1}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {riffs.map(riff => {
            const instrument = instrumentById(riff.preset);
            return <article key={riff.id} className="sound-card rounded-lg p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="case-label text-[8px]">{riff.category}{riff.builtin ? "" : " · MINE"}</span>
                  <h3 className="truncate font-pixel text-sm">{riff.name}</h3>
                  <p className="mt-0.5 truncate text-[9px] text-[var(--case-muted)]">{instrument.name}</p>
                </div>
                <button onClick={() => preview(riff)} aria-label={`Preview ${riff.name}`} className="play-button h-8 w-9 shrink-0 px-0"><Play size={12} /></button>
              </div>
              <div className="riff-mini-grid mb-2 grid gap-[2px]" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }} aria-hidden="true">
                {Array.from({ length: 16 }, (_, step) => <span key={step} className={cn("h-2 rounded-[1px]", riff.notes.some(note => Math.floor(note.start) === step) ? "bg-[#e5f2b8]" : "bg-[#344b2a]/40", step % 4 === 0 && "opacity-100")} />)}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => studio.stampRiff(riff)} className="hardware-button h-8 flex-1 px-2 text-[9px]"><Download size={12} /> STAMP</Button>
                {!riff.builtin && <Button onClick={() => remove(riff)} aria-label={`Delete ${riff.name}`} className="hardware-button h-8 px-2 text-[9px]"><Trash2 size={12} /></Button>}
              </div>
            </article>;
          })}
        </div>
        {!riffs.length && <p className="py-8 text-center text-[11px]">No riffs in this category yet.</p>}
      </div>
      <p className="bezel-label mt-3 text-[8px]">PREVIEW USES THE SELECTED SONG TEMPO · STAMPING IS UNDOABLE</p>
    </section>

    <section className="editor-panel rounded-xl p-4" aria-labelledby="capture-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="capture-heading" className="section-heading flex items-center gap-2"><Sparkles size={14} /> CAPTURE CURRENT PATTERN</h2>
        <span className="text-[9px] text-[var(--case-muted)]">{notes.length} NOTES · {customCount}/40 SAVED</span>
      </div>
      <p className="mb-3 text-[10px] leading-relaxed text-[var(--case-muted)]">Save the selected pattern as a reusable riff. Notes and the channel preset are kept; sample audio is not embedded.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[9px] font-bold">RIFF NAME<input value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder={`${track.name} riff`} className="ml-2 rounded border bg-[var(--case-light)] px-2 py-1 text-[10px]" /></label>
        <label className="text-[9px] font-bold">CATEGORY<select value={captureCategory} onChange={event => setCaptureCategory(event.target.value as RiffCategory)} className="ml-2 rounded border bg-[var(--case-light)] p-1 text-[10px]">{RIFF_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
        <Button onClick={capture} className="play-button h-8 px-3 text-[9px]"><Plus size={12} /> SAVE RIFF</Button>
      </div>
    </section>
  </div>;
}
