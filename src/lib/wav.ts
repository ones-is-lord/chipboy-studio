export function wavBytes(buffer: AudioBuffer): ArrayBuffer {
  const channels = Math.min(2, buffer.numberOfChannels);
  const bytes = buffer.length * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + bytes, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, bytes, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let peak = 0;
  for (const channel of data) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  // Only attenuate clipping material; normalising upward would erase the song's master level.
  const scale = peak > 1 ? 1 / peak : 1;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, data[channel][i] * scale));
      view.setInt16(44 + (i * channels + channel) * 2, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff), true);
    }
  }
  return view.buffer;
}

export function wavBlob(buffer: AudioBuffer) {
  return new Blob([wavBytes(buffer)], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFilename = (name: string) => name.replace(/[^a-z0-9_-]/gi, "-").replace(/^-+|-+$/g, "") || "chipboy";
