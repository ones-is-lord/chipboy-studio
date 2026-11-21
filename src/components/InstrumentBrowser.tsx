import { useState } from "react";
import { Play, Plus, Waves, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { instruments, instrumentTrack } from "@/lib/instruments";
import { useStudio } from "./StudioProvider";
import { useSongPlayback } from "@/hooks/use-song-playback";
import { cn } from "@/lib/utils";

export function InstrumentBrowser({ active, onOpenSong }: { active: boolean; onOpenSong: () => void }) {
  const studio = useStudio();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const audio = useSongPlayback(studio.song, active, studio.audioSamples);
  const filtered = instruments.filter(p => (category === "All" || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">
    <div className="section-heading flex flex-wrap items-center justify-between gap-3"><span>02 / INSTRUMENT CARTRIDGES</span><span className="text-[9px]">{instruments.length} ORIGINAL PRESETS · NO PLUGIN INSTALLS</span></div>
    <div className="game-screen rounded-xl p-5"><div className="flex items-center gap-4"><Waves className="h-10 w-10 shrink-0" /><div><h2 className="font-pixel text-2xl">A WHOLE ARCADE OF SOUND.</h2><p className="mt-2 max-w-3xl text-[11px] leading-relaxed">Pulse chips, electronic leads, pads, basses, FM keys and bells, drum kits and percussion. Preview a cartridge, assign it to the selected channel, or create a new channel.</p></div></div></div>
    <div className="flex flex-wrap items-center gap-2">{["All", ...new Set(instruments.map(p => p.category))].map(c => <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={cn("console-tab rounded-lg px-3 py-2 text-[10px] font-bold", category === c && "selected")}>{c}</button>)}<label className="ml-auto flex items-center gap-2 rounded-lg border bg-[var(--case-light)] px-3 py-2"><Search size={14} /><input aria-label="Search instrument presets" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a sound…" className="w-36 bg-transparent text-[11px] outline-none" /></label></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p => <article key={p.id} className="chip-cartridge p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><span className="case-label text-[8px]">{p.category}</span><h3 className="mt-1 text-sm font-bold">{p.name}</h3></div><Button aria-label={`Preview ${p.name}`} onClick={() => void audio.preview(instrumentTrack(p.id, studio.song.barCount), p.category === "Bass" ? 36 : 60)} className="play-button h-9 w-10 px-0"><Play size={14} /></Button></div><svg viewBox="0 0 200 30" className="wave-preview mb-3 h-10 w-full rounded" aria-hidden="true"><path d={p.wave === "sine" || p.wave === "triangle" ? "M0 15L20 4L40 26L60 4L80 26L100 4L120 26L140 4L160 26L180 4L200 15" : "M0 24H20V6H40V24H60V6H80V24H100V6H120V24H140V6H160V24H180V6H200"} fill="none" stroke="currentColor" strokeWidth="2" /></svg><div className="flex gap-2"><Button onClick={() => { studio.assignInstrument(p.id); onOpenSong(); }} className="hardware-button h-8 flex-1 px-2 text-[9px]">USE ON CHANNEL {studio.selectedTrack + 1}</Button><Button aria-label={`Add ${p.name} channel`} onClick={() => { studio.addInstrument(p.id); onOpenSong(); }} className="hardware-button h-8 px-2"><Plus size={13} /></Button></div></article>)}</div>
    {!filtered.length && <p className="py-8 text-center text-sm">No sounds match this search.</p>}
    <p className="rounded-lg border border-[var(--case-border)] p-4 text-[11px] leading-relaxed text-[var(--case-muted)]">For more drums, loops, and vocals, import your own licensed audio packs in the Sampler. FL Studio/FST, VST/VST3, AU, SF2/SFZ and WAM plugins are not loaded here; this library uses native Web Audio synthesis. Imported WAV/MP3/OGG sounds can become instruments and song blocks.</p>
  </div>;
}
