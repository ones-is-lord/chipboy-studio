class TestAudioBuffer {
  readonly sampleRate: number;
  readonly length: number;
  readonly numberOfChannels: number;
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(options: { length: number; sampleRate: number; numberOfChannels?: number }) {
    this.length = Math.max(1, Math.floor(options.length));
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels ?? 1;
    this.duration = this.length / this.sampleRate;
    this.channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }

  getChannelData(channel: number) {
    return this.channels[channel];
  }

  copyToChannel(source: Float32Array, channel: number) {
    this.channels[channel].set(source.subarray(0, this.length));
  }
}

if (typeof globalThis.AudioBuffer === "undefined") {
  globalThis.AudioBuffer = TestAudioBuffer as unknown as typeof AudioBuffer;
}
