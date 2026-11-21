import { instrumentById } from "./instruments";
import { audibleTracks, blockNotes, stepSeconds, transposeNote, type Note, type SampleAsset, type Song, type SongBlock, type Track } from "./song";
import { cropBuffer, stretchBuffer } from "./sample-processing";
import { createEffectsBus, effectTail } from "./effects";

export type Voice = { stop: () => void; isEnded: () => boolean };
export type SampleCache = Map<string, AudioBuffer>;
export function prepareSample(track: Track, note: Note, seconds: number, samples: SampleAsset[], block: SongBlock | undefined, cache: SampleCache) {
  const asset = samples.find(a => a.id === track.sampleId);
  if (!asset || !asset.buffer || !Number.isFinite(asset.buffer.duration) || asset.buffer.duration <= 0) return null;
  const semitones = note.midi - asset.rootMidi + track.pitch + track.octave * 12;
  const rawStart = asset.loop ? asset.loopStart ?? 0 : block ? block.start / 16 * asset.buffer.duration : 0;
  const rawEnd = asset.loop ? asset.loopEnd ?? asset.buffer.duration : block ? block.end / 16 * asset.buffer.duration : asset.buffer.duration;
  const start = Math.max(0, Math.min(asset.buffer.duration - 0.001, rawStart));
  const end = Math.max(start + 0.001, Math.min(asset.buffer.duration, rawEnd));
  const duration = Math.max(0.02, Number.isFinite(seconds) ? seconds : 0.02);
  if (!asset.loop && duration > 300) throw new Error("A stretched sample cannot exceed five minutes. Shorten its block or enable sample looping.");
  const key = `${asset.id}/${asset.revision}/${start}/${end}/${duration}/${semitones}/${asset.loop}`;
  let buffer = cache.get(key);
  if (!buffer) {
    const cropped = cropBuffer(asset.buffer, start, end);
    buffer = asset.loop ? cropped : stretchBuffer(cropped, duration, semitones);
    if (cache.size >= 32) cache.clear();
    cache.set(key, buffer);
  }
  return { buffer, loop: asset.loop, rate: asset.loop ? 2 ** (semitones / 12) : 1 };
}
export function scheduleVoice(ctx: BaseAudioContext, track: Track, note: Note, master: number, when: number, seconds: number, samples: SampleAsset[], block?: SongBlock, cache: SampleCache = new Map(), destination: AudioNode = ctx.destination): Voice {
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [];
  const gain = ctx.createGain(); nodes.push(gain);
  const pan = Math.max(-1, Math.min(1, (track.pan ?? 0) / 100));
  if (pan !== 0) {
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    gain.connect(panner); panner.connect(destination); nodes.push(panner);
  } else gain.connect(destination);
  const level = track.volume / 100 * master / 100 * (track.voice === "sample" ? 0.65 : 0.12);
  if (!Number.isFinite(level) || level <= 0) { nodes.forEach(node => node.disconnect()); return { stop: () => {}, isEnded: () => true }; }
  const root = track.voice === "sample" ? samples.find(a => a.id === track.sampleId)?.rootMidi ?? track.rootMidi : track.rootMidi;
  const semitones = note.midi - root + track.pitch + track.octave * 12;
  let duration = Math.max(0.02, Number.isFinite(seconds) ? seconds : 0.02);
  const p = instrumentById(track.preset);
  if (track.voice === "noise" || track.voice === "kick") duration = Math.min(seconds, p.decay ?? duration);
  const release = track.voice === "sample" ? 0.012 : p.release;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(level, when + Math.min(duration / 2, track.voice === "sample" ? 0.004 : p.attack));
  if (p.decay && track.voice !== "sample") gain.gain.exponentialRampToValueAtTime(Math.max(0.00001, level * 0.05), when + duration);
  else gain.gain.setValueAtTime(level, when + duration);
  gain.gain.linearRampToValueAtTime(0, when + duration + release);

  if (track.voice === "sample") {
    const prepared = prepareSample(track, note, duration, samples, block, cache);
    if (!prepared) { gain.disconnect(); return { stop: () => {}, isEnded: () => true }; }
    const source = ctx.createBufferSource(); source.buffer = prepared.buffer; source.loop = prepared.loop;
    source.playbackRate.value = prepared.rate;
    source.connect(gain); sources.push(source);
  } else {
    const filter = ctx.createBiquadFilter(); nodes.push(filter);
    filter.type = track.voice === "noise" ? "highpass" : "lowpass";
    filter.frequency.value = Math.min(ctx.sampleRate / 2 - 1, p.noise ?? p.cutoff);
    filter.Q.value = track.preset === "acid" ? 8 : 0.7;
    filter.connect(gain);
    if (track.voice === "noise") {
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * (duration + release)), ctx.sampleRate);
      const values = buffer.getChannelData(0);
      for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(filter); sources.push(source);
    } else {
      const frequency = track.voice === "kick" ? (track.preset === "tom" ? 220 : 120) * 2 ** (semitones / 12) : 440 * 2 ** ((note.midi - 69 + track.pitch + track.octave * 12) / 12);
      const oscillator = ctx.createOscillator(); oscillator.type = p.wave;
      if (p.duty) {
        const real = new Float32Array(64); const imag = new Float32Array(64);
        for (let i = 1; i < 64; i++) { real[i] = Math.sin(2 * Math.PI * i * p.duty) / (Math.PI * i); imag[i] = (1 - Math.cos(2 * Math.PI * i * p.duty)) / (Math.PI * i); }
        oscillator.setPeriodicWave(ctx.createPeriodicWave(real, imag));
      }
      oscillator.frequency.setValueAtTime(frequency, when);
      if (track.voice === "kick") oscillator.frequency.exponentialRampToValueAtTime(track.preset === "tom" ? 80 : 35, when + duration);
      oscillator.connect(filter); sources.push(oscillator);
      if (p.detune) { const twin = ctx.createOscillator(); twin.type = p.wave; twin.frequency.value = frequency; twin.detune.value = p.detune; twin.connect(filter); sources.push(twin); }
      if (p.fm) {
        const mod = ctx.createOscillator(); const depth = ctx.createGain(); nodes.push(depth);
        mod.frequency.value = frequency * p.fm; depth.gain.setValueAtTime(frequency * 0.5, when); depth.gain.exponentialRampToValueAtTime(1, when + duration);
        mod.connect(depth); depth.connect(oscillator.frequency); sources.push(mod);
      }
    }
  }
  if (!sources.length) { gain.disconnect(); return { stop: () => {}, isEnded: () => true }; }
  const safeTime = Number.isFinite(when) ? Math.max(0, when) : 0;
  sources.forEach(source => { source.start(safeTime); source.stop(safeTime + duration + release + 0.01); });
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    sources.forEach(source => { try { source.stop(); } catch { /* Already stopped by the audio clock. */ } });
  };
  const cleanup = () => { stopped = true; sources.forEach(source => source.disconnect()); nodes.forEach(node => node.disconnect()); };
  sources[0].onended = cleanup;
  return { stop, isEnded: () => stopped };
}

export function songEvents(song: Song) {
  const unit = stepSeconds(song);
  const transpose = song.transpose ?? 0;
  return audibleTracks(song).flatMap(({ track, index: trackIndex }) => track.bars.flatMap((block, bar) => !block ? [] : blockNotes(track, block).map(note => {
    const played = transposeNote(note, transpose);
    return { track, trackIndex, block, note: played, when: (bar * 16 + note.start) * unit, duration: note.duration * unit };
  })));
}
export async function renderSong(song: Song, samples: SampleAsset[], options: { track?: number; loopOnly?: boolean } = {}) {
  const unit = stepSeconds(song);
  const start = options.loopOnly ? (song.loop?.startBar ?? 0) * 16 * unit : 0;
  const finish = options.loopOnly ? (song.loop?.endBar ?? song.barCount) * 16 * unit : song.barCount * 16 * unit;
  const events = songEvents(song).filter(e => e.when < finish && e.when + e.duration > start && (options.track === undefined || e.trackIndex === options.track));
  if (!events.length) throw new Error("No audible notes in this export selection.");
  if (!song.tracks.length) throw new Error("This song has no channels to render.");
  const tail = Math.max(0.8, ...song.tracks.map(t => effectTail(t.effects, song.bpm, song.speed)));
  const end = finish - start + tail;
  if (end > 300) throw new Error("WAV export is limited to five minutes including effect tails.");
  const frames = Math.ceil(end * 44100);
  if (!Number.isFinite(frames) || frames <= 0) throw new Error("This song has no renderable duration.");
  const ctx = new OfflineAudioContext(2, frames, 44100);
  const buses = song.tracks.map(t => createEffectsBus(ctx, t.effects, song.bpm, song.speed));
  const cache: SampleCache = new Map();
  try {
    for (const event of events) {
      const bus = buses[event.trackIndex];
      if (!bus) continue;
      const when = Math.max(start, event.when);
      const duration = Math.min(finish, event.when + event.duration) - when;
      scheduleVoice(ctx, event.track, event.note, song.master, when - start, duration, samples, event.block, cache, bus.input);
    }
    return await ctx.startRendering();
  } finally { buses.forEach(b => b.dispose()); }
}
