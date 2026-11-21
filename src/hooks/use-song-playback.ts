import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { blockNotes, type Note, type Song, type Track } from "@/lib/song";

function sound(ctx: AudioContext, track: Track, note: Note, master: number, seconds: number) {
  const now = ctx.currentTime;
  const duration = track.voice === "noise" ? Math.min(seconds, 0.09) : track.voice === "kick" ? Math.min(seconds, 0.2) : Math.max(0.04, seconds);
  const gain = ctx.createGain();
  const level = Math.max(0.0001, track.volume / 100 * master / 100 * 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(level, now + 0.004);
  gain.gain.setValueAtTime(level, now + Math.max(0.005, duration - 0.025));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(ctx.destination);
  let source: AudioScheduledSourceNode;
  let filter: BiquadFilterNode | undefined;
  if (track.voice === "noise") {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = Math.min(ctx.sampleRate / 2 - 1, 7000 * 2 ** ((note.midi - track.rootMidi + track.pitch) / 12));
    noise.connect(filter); filter.connect(gain); source = noise;
  } else {
    const oscillator = ctx.createOscillator();
    oscillator.type = track.voice === "kick" ? "sine" : track.voice;
    const frequency = track.voice === "kick" ? 120 * 2 ** ((note.midi - track.rootMidi + track.pitch) / 12) : 440 * 2 ** ((note.midi - 69 + track.pitch) / 12);
    oscillator.frequency.setValueAtTime(frequency, now);
    if (track.voice === "kick") oscillator.frequency.exponentialRampToValueAtTime(35, now + duration);
    oscillator.connect(gain); source = oscillator;
  }
  source.start(now); source.stop(now + duration + 0.01);
  return { source, disconnect: () => { source.disconnect(); gain.disconnect(); filter?.disconnect(); } };
}

export function useSongPlayback(song: Song, active: boolean) {
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [position, setPosition] = useState(-1);
  const context = useRef<AudioContext | null>(null);
  const next = useRef(0);
  const current = useRef({ song, loop });
  current.current = { song, loop };
  const voices = useRef(new Set<AudioScheduledSourceNode>());
  const silence = useCallback(() => { voices.current.forEach(source => source.stop()); voices.current.clear(); }, []);
  const playNote = useCallback((track: Track, note: Note, master: number, duration: number) => {
    if (!context.current) return;
    const voice = sound(context.current, track, note, master, duration);
    voices.current.add(voice.source);
    voice.source.onended = () => { voices.current.delete(voice.source); voice.disconnect(); };
  }, []);
  useEffect(() => { if (!active) { setPlaying(false); silence(); } }, [active, silence]);
  useEffect(() => () => { silence(); void context.current?.close(); }, [silence]);
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (next.current === 128) {
        next.current = 0;
        if (!current.current.loop) { setPlaying(false); return; }
      }
      const pos = next.current++;
      setPosition(pos);
      const song = current.current.song;
      const bar = Math.floor(pos / 16);
      const step = pos % 16;
      song.tracks.forEach(track => {
        const block = track.bars[bar];
        if (!block || track.muted) return;
        blockNotes(track, block).filter(n => n.start === step).forEach(note => playNote(track, note, song.master, note.duration * 60 / song.bpm / 4));
      });
    };
    tick();
    const timer = window.setInterval(tick, 60000 / song.bpm / 4);
    return () => { window.clearInterval(timer); silence(); };
  }, [playing, song.bpm, playNote, silence]);
  const toggle = async () => {
    if (playing) { setPlaying(false); silence(); return; }
    try { context.current ??= new AudioContext(); await context.current.resume(); setPlaying(true); }
    catch { toast.error("Audio could not start. Please try again in your browser."); }
  };
  const stop = () => { setPlaying(false); silence(); next.current = 0; setPosition(-1); };
  const rewind = () => { silence(); next.current = 0; setPosition(-1); };
  const preview = async (track: Track, midi: number) => {
    try {
      context.current ??= new AudioContext(); await context.current.resume();
      playNote(track, { id: "preview", midi, start: 0, duration: 1 }, current.current.song.master, 0.15);
    } catch { toast.error("Audio preview could not start."); }
  };
  return { playing, loop, setLoop, position, toggle, stop, rewind, preview };
}
