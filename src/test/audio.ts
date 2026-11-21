export function testBuffer(values: number[] | Float32Array, sampleRate = 8, numberOfChannels = 1) {
  const data = new Float32Array(values);
  const buffer = new AudioBuffer({ length: data.length, sampleRate, numberOfChannels });
  buffer.copyToChannel(data, 0);
  for (let channel = 1; channel < numberOfChannels; channel++) buffer.copyToChannel(data, channel);
  return buffer;
}

export function samplesOf(buffer: AudioBuffer, channel = 0) {
  return Array.from(buffer.getChannelData(channel));
}
