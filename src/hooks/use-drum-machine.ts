import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createEffectsBus, defaultEffects } from "@/lib/effects";
import { scheduleVoice, type SampleCache, type Voice } from "@/lib/audio-engine";
import { DRUM_ROWS, drumRowPreset, drumStepSeconds, type DrumPattern, type DrumRow } from "@/lib/drum-machine";
import { instrumentById } from "@/lib/instruments";
import type { Track } from "@/lib/song";

type Runtime = { pattern: DrumPattern; bpm: number; swing: number; loop: boolean; master: number };
type Bus = ReturnType<typeof createEffectsBus>;

const drumTrack = (row: DrumRow, pattern: DrumPattern): Track => {
  const preset = instrumentById(drumRowPreset(pattern, row));
  return {
    name: row.name,
    chip: "DRUM KIT",
    voice: preset.voice,
    preset: preset.id,
    octave: 0,
    rootMidi: row.rootMidi,
    patterns: [[], []],
    bars: [],
    muted: false,
    volume: row.volume,
    pitch: 0,
    pan: 0,
    solo: false,
    effects: { ...defaultEffects(), enabled: false },
  };
};

export function useDrumMachine(pattern: DrumPattern, options: { bpm: number; swing: number; loop: boolean; master: number; active: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(-1);
  const context = useRef<AudioContext | null>(null);
  const bus = useRef<Bus | null>(null);
  const voices = useRef<Voice[]>([]);
  const cache = useRef<SampleCache>(new Map());
  const nextStep = useRef(0);
  const nextTime = useRef(0);
  const playingRef = useRef(false);
  const runtime = useRef<Runtime>({ pattern, bpm: options.bpm, swing: options.swing, loop: options.loop, master: options.master });
  runtime.current = { pattern, bpm: options.bpm, swing: options.swing, loop: options.loop, master: options.master };

  const silence = useCallback(() => {
    playingRef.current = false;
    voices.current.forEach(voice => voice.stop());
    voices.current = [];
    bus.current?.dispose();
    bus.current = null;
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setPosition(-1);
    nextStep.current = 0;
    silence();
  }, [silence]);

  const ensureContext = useCallback(async () => {
    if (typeof AudioContext === "undefined") throw new Error("This browser does not support Web Audio playback.");
    if (!context.current || context.current.state === "closed") { context.current = new AudioContext(); bus.current?.dispose(); bus.current = null; }
    await context.current.resume();
    return context.current;
  }, []);

  const start = useCallback(async () => {
    if (playingRef.current) return;
    try {
      const ctx = await ensureContext();
      bus.current?.dispose();
      bus.current = createEffectsBus(ctx, undefined, runtime.current.bpm, 1);
      nextStep.current = 0;
      nextTime.current = ctx.currentTime + 0.06;
      playingRef.current = true;
      setPlaying(true);
    } catch {
      toast.error("The beat could not start. Check that audio is allowed in this browser.");
    }
  }, [ensureContext]);

  const toggle = useCallback(() => {
    if (playingRef.current) stop();
    else void start();
  }, [start, stop]);

  const previewRow = useCallback(async (row: DrumRow) => {
    try {
      const ctx = await ensureContext();
      if (!bus.current) bus.current = createEffectsBus(ctx, undefined, runtime.current.bpm, 1);
      const track = drumTrack(row, runtime.current.pattern);
      voices.current = voices.current.filter(voice => !voice.isEnded());
      voices.current.push(scheduleVoice(ctx, track, { id: `preview-${row.id}`, midi: row.rootMidi, start: 0, duration: 1 }, runtime.current.master, ctx.currentTime + 0.01, 0.2, [], undefined, cache.current, bus.current.input));
    } catch {
      toast.error("That drum hit could not play.");
    }
  }, [ensureContext]);

  useEffect(() => {
    if (!playing) return;
    const ctx = context.current;
    if (!ctx) return;
    const positions: { time: number; step: number }[] = [];
    let finishing = false;
    const schedule = () => {
      voices.current = voices.current.filter(voice => !voice.isEnded());
      while (!finishing && nextTime.current < ctx.currentTime + 0.12) {
        const busInput = bus.current?.input;
        if (!busInput) { finishing = true; return; }
        const state = runtime.current;
        const unit = drumStepSeconds(state.bpm);
        const step = nextStep.current % 16;
        const swing = step % 2 === 1 ? unit * (state.swing / 100) * 0.5 : 0;
        const when = nextTime.current + swing;
        DRUM_ROWS.forEach(row => {
          if (!state.pattern.steps[row.id]?.[step]) return;
          const track = drumTrack(row, state.pattern);
          voices.current.push(scheduleVoice(ctx, track, { id: `drum-${row.id}-${step}-${nextStep.current}`, midi: row.rootMidi, start: step, duration: 1 }, state.master, when, Math.max(0.06, unit * 0.9), [], undefined, cache.current, busInput));
        });
        positions.push({ time: when, step });
        nextStep.current++;
        nextTime.current += unit;
        if (!state.loop && nextStep.current >= 16) finishing = true;
      }
      let heard: number | undefined;
      while (positions.length && positions[0].time <= ctx.currentTime) heard = positions.shift()!.step;
      if (heard !== undefined) setPosition(heard);
      if (finishing && ctx.currentTime >= nextTime.current) stop();
    };
    const tick = () => {
      try { schedule(); }
      catch {
        stop();
        toast.error("The beat stopped. Try a shorter pattern or lower the tempo.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 25);
    return () => window.clearInterval(timer);
  }, [playing, stop]);

  useEffect(() => {
    if (!options.active) stop();
  }, [options.active, stop]);

  useEffect(() => () => {
    silence();
    void context.current?.close().catch(() => {});
  }, [silence]);

  return { playing, position, toggle, stop, previewRow };
}
