import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useEditHistory } from "@/hooks/use-edit-history";
import { coveringBlock, createDemoSong, newBlock, stepSeconds, type SampleAsset, type Song } from "@/lib/song";
import { instrumentTrack, instrumentById } from "@/lib/instruments";
import { fitRiffToTrack, type Riff } from "@/lib/riffs";
import { drumTracks, type DrumPattern } from "@/lib/drum-machine";
import { readSharedSong, saveAutosave } from "@/lib/project";
import { toast } from "sonner";

function useStudioState() {
  const history = useEditHistory(createDemoSong);
  const [row, setSelectedTrack] = useState(0);
  const [bar, setSelectedBar] = useState(0);
  const [preferredPattern, setPreferredPattern] = useState(0);
  const [sampleHistory, setSampleHistory] = useState<{ past: SampleAsset[][]; present: SampleAsset[]; future: SampleAsset[][] }>({ past: [], present: [], future: [] });
  const archive = useRef(new Map<string, SampleAsset>());
  const revision = useRef(0);
  const firstRender = useRef(true);
  const selectedTrack = Math.min(row, history.song.tracks.length - 1);
  const selectedBar = Math.min(bar, history.song.barCount - 1);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("project");
    const shared = readSharedSong(window.location.search);
    if (!shared) {
      if (param) toast.error("This share link is invalid or too large. Ask for a fresh link or import the project file.");
      return;
    }
    history.edit(shared);
    setSelectedTrack(0);
    setSelectedBar(0);
    setPreferredPattern(0);
    const url = new URL(window.location.href);
    url.searchParams.delete("project");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    toast.success(`Loaded shared project “${shared.name}”.`);
    // The share link is consumed once, on the first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => saveAutosave(history.song), 900);
    return () => window.clearTimeout(timer);
  }, [history.song]);

  const setSamples = (change: (samples: SampleAsset[]) => SampleAsset[]) => setSampleHistory(h => ({ past: [...h.past, h.present].slice(-6), present: change(h.present), future: [] }));
  const updateSample = (id: string, change: Partial<SampleAsset>) => { const nextRevision = ++revision.current; setSamples(list => list.map(a => a.id === id ? { ...a, ...change, revision: nextRevision } : a)); };
  const addSamples = (assets: SampleAsset[]) => { assets.forEach(a => archive.current.set(a.id, a)); setSamples(list => [...list, ...assets]); };
  const undoSamples = () => setSampleHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h);
  const redoSamples = () => setSampleHistory(h => h.future.length ? { past: [...h.past, h.present].slice(-6), present: h.future[0], future: h.future.slice(1) } : h);
  const addInstrument = (id: string) => {
    if (history.song.tracks.length >= 32) { toast.error("The song already has 32 channels. Remove one before adding another."); return; }
    const index = history.song.tracks.length;
    history.edit(s => ({ ...s, tracks: [...s.tracks, instrumentTrack(id, s.barCount)] }));
    setSelectedTrack(index); setPreferredPattern(0);
    toast.success("Instrument channel added. Add a block and draw notes.");
  };
  const assignInstrument = (id: string) => {
    const p = instrumentById(id);
    history.edit(s => ({ ...s, tracks: s.tracks.map((t, i) => i === selectedTrack ? { ...t, preset: id, voice: p.voice, sampleId: undefined, chip: p.category.toUpperCase(), name: p.name } : t) }));
    toast.success(`Assigned ${p.name} to the selected channel.`);
  };
  const loadSong = (song: Song) => {
    history.edit(song);
    setSelectedTrack(0);
    setSelectedBar(0);
    setPreferredPattern(0);
  };
  const addSampleBlock = (sample: SampleAsset, destination: number) => {
    if (history.song.tracks.length >= 32) { toast.error("The song already has 32 channels. Remove one before adding a sample channel."); return false; }
    const length = Math.max(1, Math.ceil(sample.buffer.duration / stepSeconds(history.song)));
    if (destination * 16 + length > 64 * 16) { toast.error("This sample exceeds the 64-bar timeline at the current speed. Trim it or slow the song first."); return false; }
    const count = Math.max(history.song.barCount, Math.ceil((destination * 16 + length) / 16));
    const index = history.song.tracks.length;
    const track = { ...instrumentTrack("pulse50", count), name: sample.name, chip: "SAMPLER", voice: "sample" as const, sampleId: sample.id, rootMidi: sample.rootMidi,
      patterns: [[{ id: crypto.randomUUID(), midi: sample.rootMidi, start: 0, duration: 16 }], []],
      bars: Array.from({ length: count }, (_, i) => i === destination ? { ...newBlock(0), length } : null) };
    history.edit(s => ({ ...s, barCount: count, tracks: [...s.tracks.map(t => ({ ...t, bars: [...t.bars, ...Array(count - s.barCount).fill(null)] })), track] }));
    setSelectedTrack(index); setSelectedBar(destination); setPreferredPattern(0);
    toast.success(`Sample added as a ${Math.ceil(length / 16)}-bar block.`);
    return true;
  };
  const addDrumKit = (pattern: DrumPattern, bpm: number) => {
    const tracks = drumTracks(pattern, { bar: selectedBar, barCount: history.song.barCount });
    if (!tracks.length) return false;
    if (history.song.tracks.length + tracks.length > 32) {
      toast.error(`This kit needs ${tracks.length} channels, but the song already has ${history.song.tracks.length}. Remove a channel or clear some lanes first.`);
      return false;
    }
    history.edit(s => ({ ...s, bpm: Math.round(Math.min(240, Math.max(40, bpm))), tracks: [...s.tracks, ...tracks] }));
    setSelectedTrack(history.song.tracks.length);
    setSelectedBar(selectedBar);
    setPreferredPattern(0);
    return true;
  };
  const stampRiff = (riff: Riff) => {
    const track = history.song.tracks[selectedTrack];
    if (!track) return;
    const cover = coveringBlock(track, selectedBar);
    const patternIndex = cover?.block.pattern ?? Math.min(preferredPattern, track.patterns.length - 1);
    const notes = track.voice === "sample" ? fitRiffToTrack(riff, track) : riff.notes.map(note => ({ ...note, id: crypto.randomUUID() }));
    const nextTrack = {
      ...track,
      patterns: track.patterns.map((pattern, index) => index === patternIndex ? notes : pattern),
      bars: cover ? track.bars : track.bars.map((block, bar) => bar === selectedBar ? newBlock(patternIndex) : block),
      ...(track.voice !== "sample" ? { preset: riff.preset, voice: riff.voice, rootMidi: riff.rootMidi, octave: 0, pitch: 0 } : {}),
    };
    history.edit(s => ({ ...s, tracks: s.tracks.map((item, index) => index === selectedTrack ? nextTrack : item) }));
    setSelectedBar(cover?.bar ?? selectedBar);
    setPreferredPattern(patternIndex);
    toast.success(`“${riff.name}” stamped into ${track.name} pattern ${patternIndex + 1}.`);
  };
  const audioSamples = [...archive.current.values()].map(a => sampleHistory.present.find(s => s.id === a.id) ?? a);
  return { ...history, selectedTrack, selectedBar, preferredPattern, setSelectedTrack, setSelectedBar, setPreferredPattern,
    samples: sampleHistory.present, audioSamples, addSamples, updateSample, undoSamples, redoSamples,
    canUndoSamples: sampleHistory.past.length > 0, canRedoSamples: sampleHistory.future.length > 0,
    addInstrument, assignInstrument, addSampleBlock, loadSong, stampRiff, addDrumKit };
}
type StudioState = ReturnType<typeof useStudioState>;
const StudioContext = createContext<StudioState | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const state = useStudioState();
  return <StudioContext.Provider value={state}>{children}</StudioContext.Provider>;
}
export function useStudio() {
  const state = useContext(StudioContext);
  if (!state) throw new Error("Studio tools must be inside StudioProvider.");
  return state;
}
