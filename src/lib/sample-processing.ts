export function cropBuffer(buffer: AudioBuffer, start: number, end: number) {
  const first = Math.max(0, Math.floor(start * buffer.sampleRate));
  const last = Math.min(buffer.length, Math.max(first + 1, Math.ceil(end * buffer.sampleRate)));
  const result = new AudioBuffer({ length: last - first, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
  for (let c = 0; c < buffer.numberOfChannels; c++) result.copyToChannel(buffer.getChannelData(c).slice(first, last), c);
  return result;
}
export function processBuffer(buffer: AudioBuffer, operation: "normalize" | "reverse" | "fade-in" | "fade-out" | "gain", amount = 1) {
  const result = new AudioBuffer({ length: buffer.length, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
  let peak = 0;
  if (operation === "normalize") for (let c = 0; c < buffer.numberOfChannels; c++) for (const v of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c); const out = result.getChannelData(c);
    const fadeLength = Math.max(1, Math.min(buffer.length, Math.round(amount * buffer.sampleRate)));
    for (let i = 0; i < buffer.length; i++) {
      const v = input[operation === "reverse" ? buffer.length - 1 - i : i];
      const factor = operation === "normalize" ? (peak ? 0.95 / peak : 1) : operation === "gain" ? 10 ** (amount / 20) : operation === "fade-in" ? Math.min(1, i / fadeLength) : operation === "fade-out" ? Math.min(1, (buffer.length - 1 - i) / fadeLength) : 1;
      out[i] = Math.max(-1, Math.min(1, v * factor));
    }
  }
  return result;
}

// Granular overlap-add keeps pitch independent of duration; extreme ratios can add texture.
export function stretchBuffer(buffer: AudioBuffer, seconds: number, semitones: number) {
  const size = Math.max(1, Math.round(seconds * buffer.sampleRate));
  const result = new AudioBuffer({ length: size, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
  const inputChannels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const outputChannels = Array.from({ length: result.numberOfChannels }, (_, c) => result.getChannelData(c));
  const grain = Math.min(buffer.length, Math.max(32, Math.round(buffer.sampleRate * 0.045)));
  const hop = Math.max(1, Math.floor(grain / 4));
  const pitch = 2 ** (semitones / 12);
  const weights = new Float32Array(size);
  for (let dest = -grain; dest < size; dest += hop) {
    const center = (dest + grain / 2) / size * buffer.length;
    for (let i = 0; i < grain; i++) {
      const output = dest + i;
      if (output < 0 || output >= size) continue;
      const source = Math.max(0, Math.min(buffer.length - 1, center + (i - grain / 2) * pitch));
      const a = Math.floor(source); const b = Math.min(buffer.length - 1, a + 1);
      const fraction = source - a;
      const weight = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, grain - 1));
      weights[output] += weight;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const input = inputChannels[c];
        outputChannels[c][output] += (input[a] * (1 - fraction) + input[b] * fraction) * weight;
      }
    }
  }
  for (let c = 0; c < result.numberOfChannels; c++) {
    const data = result.getChannelData(c);
    for (let i = 0; i < size; i++) if (weights[i] > 0) data[i] /= weights[i];
  }
  return result;
}
export function slicePoints(buffer: AudioBuffer, count: number, transient: boolean) {
  if (!transient) return Array.from({ length: count + 1 }, (_, i) => i / count * buffer.duration);
  const data = buffer.getChannelData(0);
  const window = Math.max(1, Math.floor(buffer.sampleRate * 0.01));
  const points = [0]; let previous = 0;
  for (let i = 0; i < data.length && points.length < count; i += window) {
    let sum = 0; for (let j = i; j < Math.min(data.length, i + window); j++) sum += data[j] ** 2;
    const rms = Math.sqrt(sum / window); const time = i / buffer.sampleRate;
    if (rms > 0.05 && rms > previous * 2.5 && time - points[points.length - 1] > 0.06) points.push(time);
    previous = rms;
  }
  return [...points, buffer.duration];
}
