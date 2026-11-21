import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { audibleTracks, blockNotes, stepSeconds, transposeNote, type Note, type SampleAsset, type Song, type Track } from "@/lib/song";
import { prepareSample, scheduleVoice, songEvents, type Voice, type SampleCache } from "@/lib/audio-engine";
import { createEffectsBus, effectTail } from "@/lib/effects";

type Bus = ReturnType<typeof createEffectsBus>;

export function useSongPlayback(song: Song, active: boolean, samples: SampleAsset[]) {
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loop, setLoop] = useState(true);
  const [position, setPosition] = useState(-1);
  const context = useRef<AudioContext | null>(null);
  const next = useRef(0);
  const current = useRef({ song, loop, samples }); current.current = { song, loop, samples };
  const voices = useRef<Voice[]>([]);
  const buses = useRef<Bus[]>([]);
  const cache = useRef<SampleCache>(new Map());
  const activation = useRef(0);
  const activeState = useRef(active); activeState.current = active;

  const silence = useCallback(() => {
    activation.current++;
    voices.current.forEach(v => v.stop());
    voices.current = [];
    buses.current.forEach(bus => bus.dispose());
    buses.current = [];
  }, []);

  const ensureContext = useCallback(async () => {
    if (typeof AudioContext === "undefined") throw new Error("This browser does not support Web Audio playback.");
    if (!context.current || context.current.state === "closed") context.current = new AudioContext();
    await context.current.resume();
    return context.current;
  }, []);

  const buildBuses = useCallback((ctx: AudioContext, source: Song) => {
    buses.current.forEach(bus => bus.dispose());
    buses.current = source.tracks.map(track => createEffectsBus(ctx, track.effects, source.bpm, source.speed));
  }, []);

  useEffect(() => { if (!active) { setPlaying(false); silence(); } }, [active, silence]);
  useEffect(() => () => { silence(); cache.current.clear(); void context.current?.close().catch(() => {}); }, [silence]);

  useEffect(() => {
    if (!playing || !context.current) return;
    const ctx = context.current;
    let time = ctx.currentTime + 0.03;
    const positions: { time: number; position: number }[] = [];
    let finishing = false;
    const schedule = () => {
      voices.current = voices.current.filter(v => !v.isEnded());
      while (!finishing && time < ctx.currentTime + 0.1) {
        const { song, samples, loop } = current.current;
        if (next.current >= song.barCount * 16) {
          next.current = 0;
          if (!loop) { finishing = true; break; }
        }
        const pos = next.current++;
        const unit = stepSeconds(song);
        const transpose = song.transpose ?? 0;
        audibleTracks(song).forEach(({ track, index }) => {
          track.bars.forEach((block, bar) => {
            if (!block || pos < bar * 16 || pos >= bar * 16 + block.length) return;
            blockNotes(track, block).filter(n => n.start + bar * 16 === pos).forEach(note => {
              voices.current.push(scheduleVoice(ctx, track, transposeNote(note, transpose), song.master, time, note.duration * unit, samples, block, cache.current, buses.current[index]?.input));
            });
          });
        });
        positions.push({ time, position: pos }); time += unit;
      }
      let heard: number | undefined;
      while (positions.length && positions[0].time <= ctx.currentTime) heard = positions.shift()!.position;
      if (heard !== undefined) setPosition(heard);
      if (finishing && ctx.currentTime >= time + 0.2) setPlaying(false);
    };
    const tick = () => {
      try { schedule(); }
      catch (error) { finishing = true; silence(); setPlaying(false); toast.error(error instanceof Error ? error.message : "Playback failed. Try a shorter sample."); }
    };
    tick(); const timer = window.setInterval(tick, 25);
    return () => { window.clearInterval(timer); silence(); };
  }, [playing, song.bpm, song.speed, silence]);

  const toggle = async () => {
    if (playing) { setPlaying(false); silence(); return; }
    const ticket = ++activation.current;
    setPreparing(true);
    try {
      const ctx = await ensureContext();
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
      if (ticket !== activation.current || !activeState.current) return;
      const source = current.current.song;
      for (const event of songEvents(source)) if (event.track.voice === "sample") prepareSample(event.track, event.note, event.duration, current.current.samples, event.block, cache.current);
      if (ticket === activation.current && activeState.current) { buildBuses(ctx, source); setPlaying(true); }
    } catch { toast.error("Audio could not start. Try a shorter sample or song."); }
    finally { setPreparing(false); }
  };

  const stop = () => { setPlaying(false); silence(); next.current = 0; setPosition(-1); };
  const rewind = () => { setPlaying(false); silence(); next.current = 0; setPosition(-1); };

  const preview = async (track: Track, midi: number) => {
    try {
      const ticket = activation.current;
      const ctx = await ensureContext();
      if (ticket !== activation.current || !activeState.current) return;
      voices.current = voices.current.filter(v => !v.isEnded());
      const source = current.current.song;
      const bus = createEffectsBus(ctx, track.effects, source.bpm, source.speed);
      const duration = track.voice === "sample" ? Math.min(2, current.current.samples.find(a => a.id === track.sampleId)?.buffer.duration ?? 0.2) : 0.25;
      voices.current.push(scheduleVoice(ctx, track, { id: "preview", midi, start: 0, duration: 1 }, source.master, ctx.currentTime + 0.01, duration, current.current.samples, undefined, cache.current, bus.input));
      window.setTimeout(() => bus.dispose(), (duration + effectTail(track.effects, source.bpm, source.speed) + 0.5) * 1000);
    } catch { toast.error("Audio preview could not start."); }
  };

  const previewSequence = async (track: Track, notes: Note[]) => {
    if (!notes.length) return;
    try {
      const ticket = activation.current;
      const ctx = await ensureContext();
      if (ticket !== activation.current || !activeState.current) return;
      const source = current.current.song;
      const unit = stepSeconds(source);
      const bus = createEffectsBus(ctx, track.effects, source.bpm, source.speed);
      const start = ctx.currentTime + 0.05;
      voices.current = voices.current.filter(v => !v.isEnded());
      for (const note of notes) {
        voices.current.push(scheduleVoice(ctx, track, note, source.master, start + note.start * unit, note.duration * unit, current.current.samples, undefined, cache.current, bus.input));
      }
      const end = Math.max(...notes.map(note => note.start * unit + note.duration * unit)) + effectTail(track.effects, source.bpm, source.speed);
      window.setTimeout(() => bus.dispose(), (end + 0.5) * 1000);
    } catch { toast.error("Riff preview could not start."); }
  };

  return { playing, preparing, loop, setLoop, position, toggle, stop, rewind, preview, previewSequence };
}
