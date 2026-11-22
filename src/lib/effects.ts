export type Effects = {
  enabled: boolean;
  cutoff: number; resonance: number;
  distortion: number; drive: number; saturation: number; bits: number;
  acid: number; filterLfo: number; filterRate: number;
  chorus: number; phaser: number; flanger: number; tremolo: number; autoPan: number; ringMod: number;
  reverb: number; delay: number; delayBeats: number; feedback: number;
  compression: number; low: number; mid: number; high: number;
};
export type NumericEffectKey = Exclude<keyof Effects, "enabled">;

export const defaultEffects = (): Effects => ({
  enabled: true,
  cutoff: 20000, resonance: 0.7,
  distortion: 0, drive: 0, saturation: 0, bits: 16,
  acid: 0, filterLfo: 0, filterRate: 0.5,
  chorus: 0, phaser: 0, flanger: 0, tremolo: 0, autoPan: 0, ringMod: 0,
  reverb: 0, delay: 0, delayBeats: 0.75, feedback: 0.35,
  compression: 0, low: 0, mid: 0, high: 0,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function normalizeEffects(settings?: Partial<Effects>): Effects {
  const fx = { ...defaultEffects(), ...settings };
  return {
    enabled: fx.enabled !== false,
    cutoff: clamp(fx.cutoff, 60, 20_000),
    resonance: clamp(fx.resonance, 0.1, 24),
    distortion: clamp(fx.distortion, 0, 1),
    drive: clamp(fx.drive, 0, 1),
    saturation: clamp(fx.saturation, 0, 1),
    bits: clamp(Math.round(fx.bits), 1, 16),
    acid: clamp(fx.acid, 0, 1),
    filterLfo: clamp(fx.filterLfo, 0, 1),
    filterRate: clamp(fx.filterRate, 0.05, 8),
    chorus: clamp(fx.chorus, 0, 1),
    phaser: clamp(fx.phaser, 0, 1),
    flanger: clamp(fx.flanger, 0, 1),
    tremolo: clamp(fx.tremolo, 0, 1),
    autoPan: clamp(fx.autoPan, 0, 1),
    ringMod: clamp(fx.ringMod, 0, 1),
    reverb: clamp(fx.reverb, 0, 1),
    delay: clamp(fx.delay, 0, 1),
    delayBeats: clamp(fx.delayBeats, 0.05, 4),
    feedback: clamp(fx.feedback, 0, 0.9),
    compression: clamp(fx.compression, 0, 1),
    low: clamp(fx.low, -12, 12),
    mid: clamp(fx.mid, -12, 12),
    high: clamp(fx.high, -12, 12),
  };
}

export function effectTail(fx?: Effects, bpm = 120, speed = 1) {
  if (!fx?.enabled) return 0.8;
  const feedback = clamp(fx.feedback, 0, 0.9);
  const repeats = feedback > 0 ? Math.ceil(Math.log(0.001) / Math.log(feedback)) : 1;
  return Math.max(0.8, fx.reverb > 0 ? 2.5 : 0, fx.delay > 0 ? Math.min(20, repeats * clamp(fx.delayBeats, 0.05, 4) * 60 / Math.max(40, bpm) / Math.max(0.25, speed)) : 0);
}

// Each channel owns one bus so overlapping notes share delay/reverb tails.
export function createEffectsBus(ctx: BaseAudioContext, settings: Effects | undefined, bpm: number, speed: number) {
  const fx = normalizeEffects(settings);
  if (!settings?.enabled) fx.enabled = false;
  const input = ctx.createGain();
  const nodes: AudioNode[] = [input];
  const oscillators: OscillatorNode[] = [];
  let output: AudioNode = input;
  const chain = (node: AudioNode) => { output.connect(node); output = node; nodes.push(node); };
  const lfo = (rate: number, depthValue: number, target: AudioParam) => {
    const oscillator = ctx.createOscillator();
    const depth = ctx.createGain();
    oscillator.frequency.value = rate;
    depth.gain.value = depthValue;
    oscillator.connect(depth);
    depth.connect(target);
    oscillator.start();
    oscillators.push(oscillator);
    nodes.push(depth);
  };

  if (fx.enabled) {
    if (fx.low !== 0) { const eq = ctx.createBiquadFilter(); eq.type = "lowshelf"; eq.frequency.value = 120; eq.gain.value = fx.low; chain(eq); }
    if (fx.mid !== 0) { const eq = ctx.createBiquadFilter(); eq.type = "peaking"; eq.frequency.value = 1000; eq.Q.value = 1; eq.gain.value = fx.mid; chain(eq); }
    if (fx.high !== 0) { const eq = ctx.createBiquadFilter(); eq.type = "highshelf"; eq.frequency.value = 4500; eq.gain.value = fx.high; chain(eq); }

    if (fx.cutoff < 19_999 || fx.resonance > 0.71 || fx.acid > 0 || fx.filterLfo > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.min(ctx.sampleRate * 0.45, fx.cutoff);
      filter.Q.value = Math.min(24, fx.resonance + fx.acid * 14);
      if (fx.filterLfo > 0) lfo(fx.filterRate, Math.min(8000, fx.cutoff * 0.8) * fx.filterLfo, filter.frequency);
      chain(filter);
    }

    if (fx.drive > 0 || fx.distortion > 0 || fx.saturation > 0 || fx.bits < 16) {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(65536);
      const drive = 1 + fx.drive * 24 + fx.distortion * 24 + fx.saturation * 10;
      const steps = 2 ** (fx.bits - 1);
      for (let i = 0; i < curve.length; i++) {
        const x = i * 2 / (curve.length - 1) - 1;
        let y = Math.tanh(x * drive) / Math.tanh(drive);
        if (fx.saturation > 0) y = Math.tanh(y * (1 + fx.saturation * 2)) / Math.tanh(1 + fx.saturation * 2);
        curve[i] = fx.bits < 16 ? Math.round(y * steps) / steps : y;
      }
      shaper.curve = curve;
      shaper.oversample = fx.bits < 16 ? "none" : "2x";
      chain(shaper);
    }

    const parallel = (wetIn: AudioNode, wetOut: AudioNode, mix: number) => {
      const dry = ctx.createGain(); const wet = ctx.createGain(); const sum = ctx.createGain();
      dry.gain.value = 1 - mix * 0.5; wet.gain.value = mix;
      output.connect(dry); dry.connect(sum); output.connect(wetIn); wetOut.connect(wet); wet.connect(sum);
      nodes.push(wetIn, wetOut, dry, wet, sum); output = sum;
    };

    if (fx.chorus > 0) {
      const delay = ctx.createDelay(0.1); delay.delayTime.value = 0.018;
      lfo(0.8, 0.004, delay.delayTime);
      parallel(delay, delay, fx.chorus);
    }
    if (fx.flanger > 0) {
      const delay = ctx.createDelay(0.05); delay.delayTime.value = 0.004;
      const feedback = ctx.createGain(); feedback.gain.value = 0.15 + fx.flanger * 0.45;
      delay.connect(feedback); feedback.connect(delay); nodes.push(feedback);
      lfo(0.25 + fx.flanger * 0.8, 0.001 + fx.flanger * 0.002, delay.delayTime);
      parallel(delay, delay, fx.flanger * 0.8);
    }
    if (fx.phaser > 0) {
      const wetIn = ctx.createGain();
      let wetTail: AudioNode = wetIn;
      for (let index = 0; index < 4; index++) {
        const allpass = ctx.createBiquadFilter();
        allpass.type = "allpass";
        allpass.frequency.value = 800 + index * 450;
        allpass.Q.value = 0.5 + fx.phaser * 2;
        lfo(0.2 + fx.phaser * 1.2, 200 + fx.phaser * 500, allpass.frequency);
        wetTail.connect(allpass);
        wetTail = allpass;
        nodes.push(allpass);
      }
      parallel(wetIn, wetTail, fx.phaser);
    }
    if (fx.tremolo > 0) {
      const tremolo = ctx.createGain(); tremolo.gain.value = 1 - fx.tremolo * 0.5;
      lfo(3.5 + fx.tremolo * 5, fx.tremolo * 0.5, tremolo.gain);
      chain(tremolo);
    }
    if (fx.autoPan > 0) {
      const panner = ctx.createStereoPanner();
      lfo(0.2 + fx.autoPan * 1.5, fx.autoPan, panner.pan);
      chain(panner);
    }
    if (fx.ringMod > 0) {
      const ring = ctx.createGain(); ring.gain.value = 0;
      const carrier = ctx.createOscillator();
      const depth = ctx.createGain();
      carrier.type = "sine"; carrier.frequency.value = 90 + fx.ringMod * 410;
      depth.gain.value = 1;
      carrier.connect(depth); depth.connect(ring.gain); carrier.start();
      oscillators.push(carrier); nodes.push(ring, depth);
      const wetIn = ctx.createGain(); wetIn.connect(ring);
      parallel(wetIn, ring, fx.ringMod * 0.75);
    }
    if (fx.delay > 0) {
      const delay = ctx.createDelay(6); delay.delayTime.value = Math.min(6, fx.delayBeats * 60 / bpm / speed);
      const feedback = ctx.createGain(); feedback.gain.value = fx.feedback; delay.connect(feedback); feedback.connect(delay); nodes.push(feedback);
      parallel(delay, delay, fx.delay);
    }
    if (fx.reverb > 0) {
      const convolver = ctx.createConvolver(); const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 2.5), ctx.sampleRate);
      let seed = 12345;
      for (let c = 0; c < 2; c++) {
        const data = impulse.getChannelData(c);
        for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * (1 - i / data.length) ** 3; }
      }
      convolver.buffer = impulse; parallel(convolver, convolver, fx.reverb);
    }
    if (fx.compression > 0) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -6 - fx.compression * 30;
      compressor.knee.value = 10;
      compressor.ratio.value = 2 + fx.compression * 10;
      compressor.attack.value = 0.003 + (1 - fx.compression) * 0.02;
      compressor.release.value = 0.15 + fx.compression * 0.4;
      chain(compressor);
    }
  }

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.2;
  chain(limiter);
  output.connect(ctx.destination);
  return { input, dispose: () => { oscillators.forEach(o => { try { o.stop(); } catch { /* Already stopped. */ } o.disconnect(); }); nodes.forEach(n => n.disconnect()); } };
}
