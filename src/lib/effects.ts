export type Effects = {
  enabled: boolean; cutoff: number; resonance: number; distortion: number; bits: number;
  chorus: number; reverb: number; delay: number; delayBeats: number; feedback: number;
};
export const defaultEffects = (): Effects => ({ enabled: true, cutoff: 20000, resonance: 0.7, distortion: 0, bits: 16, chorus: 0, reverb: 0, delay: 0, delayBeats: 0.75, feedback: 0.35 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function effectTail(fx?: Effects, bpm = 120, speed = 1) {
  if (!fx?.enabled) return 0.8;
  const feedback = clamp(fx.feedback, 0, 0.9);
  const repeats = feedback > 0 ? Math.ceil(Math.log(0.001) / Math.log(feedback)) : 1;
  return Math.max(0.8, fx.reverb > 0 ? 2.5 : 0, fx.delay > 0 ? Math.min(20, repeats * clamp(fx.delayBeats, 0.05, 4) * 60 / Math.max(40, bpm) / Math.max(0.25, speed)) : 0);
}

// Each channel owns one bus so overlapping notes share delay/reverb tails.
export function createEffectsBus(ctx: BaseAudioContext, settings: Effects | undefined, bpm: number, speed: number) {
  const fx = settings?.enabled ? { ...settings } : { ...defaultEffects(), enabled: false };
  fx.cutoff = clamp(fx.cutoff, 60, 20_000);
  fx.resonance = clamp(fx.resonance, 0.1, 24);
  fx.distortion = clamp(fx.distortion, 0, 1);
  fx.bits = clamp(Math.round(fx.bits), 1, 16);
  fx.chorus = clamp(fx.chorus, 0, 1);
  fx.reverb = clamp(fx.reverb, 0, 1);
  fx.delay = clamp(fx.delay, 0, 1);
  fx.delayBeats = clamp(fx.delayBeats, 0.05, 4);
  fx.feedback = clamp(fx.feedback, 0, 0.9);
  const input = ctx.createGain();
  const nodes: AudioNode[] = [input];
  const oscillators: OscillatorNode[] = [];
  let output: AudioNode = input;
  const chain = (node: AudioNode) => { output.connect(node); output = node; nodes.push(node); };
  if (fx.cutoff < 20000 || fx.resonance > 0.7) {
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass";
    filter.frequency.value = Math.min(ctx.sampleRate * 0.45, fx.cutoff); filter.Q.value = fx.resonance; chain(filter);
  }
  if (fx.distortion > 0 || fx.bits < 16) {
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(65536); const drive = 1 + fx.distortion * 20; const steps = 2 ** (fx.bits - 1);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      const y = Math.tanh(x * drive) / Math.tanh(drive);
      curve[i] = fx.bits < 16 ? Math.round(y * steps) / steps : y;
    }
    shaper.curve = curve; shaper.oversample = fx.bits < 16 ? "none" : "2x"; chain(shaper);
  }
  const parallel = (wetNode: AudioNode, mix: number) => {
    const dry = ctx.createGain(); const wet = ctx.createGain(); const sum = ctx.createGain();
    dry.gain.value = 1 - mix * 0.5; wet.gain.value = mix;
    output.connect(dry); dry.connect(sum); output.connect(wetNode); wetNode.connect(wet); wet.connect(sum);
    nodes.push(wetNode, dry, wet, sum); output = sum;
  };
  if (fx.chorus > 0) {
    const delay = ctx.createDelay(0.1); delay.delayTime.value = 0.018;
    const lfo = ctx.createOscillator(); const depth = ctx.createGain(); lfo.frequency.value = 0.8; depth.gain.value = 0.004;
    lfo.connect(depth); depth.connect(delay.delayTime); lfo.start(); oscillators.push(lfo); nodes.push(depth);
    parallel(delay, fx.chorus);
  }
  if (fx.delay > 0) {
    const delay = ctx.createDelay(6); delay.delayTime.value = Math.min(6, fx.delayBeats * 60 / bpm / speed);
    const feedback = ctx.createGain(); feedback.gain.value = fx.feedback; delay.connect(feedback); feedback.connect(delay); nodes.push(feedback);
    parallel(delay, fx.delay);
  }
  if (fx.reverb > 0) {
    const convolver = ctx.createConvolver(); const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 2.5), ctx.sampleRate);
    let seed = 12345;
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * (1 - i / data.length) ** 3; }
    }
    convolver.buffer = impulse; parallel(convolver, fx.reverb);
  }
  output.connect(ctx.destination);
  return { input, dispose: () => { oscillators.forEach(o => { o.stop(); o.disconnect(); }); nodes.forEach(n => n.disconnect()); } };
}
