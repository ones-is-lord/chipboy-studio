// Web Audio engine for Chipboy Studio
// Handles chiptune synthesis, drum machine, and sample playback

export type ChipType = 'square' | 'triangle' | 'noise' | 'pulse';

export interface ChipVoice {
  type: ChipType;
  frequency: number;
  duration: number;
  volume: number;
  dutyCycle?: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeNodes: Set<AudioNode> = new Set();

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  getAnalyser(): AnalyserNode | null {
    this.ensureContext();
    return this.analyser;
  }

  setMasterVolume(value: number) {
    this.ensureContext();
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  // Create a periodic wave for chip sounds
  private createChipWave(type: ChipType, dutyCycle = 0.5): PeriodicWave {
    const ctx = this.ensureContext();
    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);

    for (let n = 1; n < harmonics; n++) {
      if (type === 'square') {
        imag[n] = (2 / (n * Math.PI)) * (n % 2 === 1 ? 1 : 0);
      } else if (type === 'triangle') {
        imag[n] = (n % 2 === 1 ? 1 : -1) * (8 / (Math.PI * Math.PI * n * n));
      } else if (type === 'pulse') {
        // Pulse wave with duty cycle
        imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle);
      } else if (type === 'noise') {
        imag[n] = Math.random() * 2 - 1;
      }
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  // Play a chiptune note
  playChipNote(voice: ChipVoice, when = 0): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const now = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (voice.type === 'noise') {
      // Noise via buffer source
      const bufferSize = ctx.sampleRate * voice.duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = voice.frequency;
      filter.Q.value = 1;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(voice.volume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + voice.duration);

      noise.start(now);
      noise.stop(now + voice.duration);
      this.activeNodes.add(noise);
      noise.onended = () => this.activeNodes.delete(noise);
      return;
    }

    osc.setPeriodicWave(this.createChipWave(voice.type, voice.dutyCycle));
    osc.frequency.value = voice.frequency;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(voice.volume, now + 0.005);
    gain.gain.setValueAtTime(voice.volume, now + voice.duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + voice.duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + voice.duration);
    this.activeNodes.add(osc);
    osc.onended = () => this.activeNodes.delete(osc);
  }

  // Drum machine sounds
  playDrum(kind: 'kick' | 'snare' | 'hat' | 'clap' | 'tom', when = 0, volume = 0.8): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const now = ctx.currentTime + when;

    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
      this.activeNodes.add(osc);
      osc.onended = () => this.activeNodes.delete(osc);
      return;
    }

    if (kind === 'snare' || kind === 'clap') {
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = kind === 'clap' ? 1000 : 1500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'clap' ? 0.15 : 0.2));
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.2);
      this.activeNodes.add(noise);
      noise.onended = () => this.activeNodes.delete(noise);
      return;
    }

    if (kind === 'hat') {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.05);
      this.activeNodes.add(noise);
      noise.onended = () => this.activeNodes.delete(noise);
      return;
    }

    if (kind === 'tom') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
      this.activeNodes.add(osc);
      osc.onended = () => this.activeNodes.delete(osc);
    }
  }

  // Play a recorded sample buffer
  playSample(buffer: AudioBuffer, when = 0, volume = 1): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(ctx.currentTime + when);
    this.activeNodes.add(src);
    src.onended = () => this.activeNodes.delete(src);
  }

  // Decode base64 audio data into an AudioBuffer
  async decodeBase64Audio(base64: string): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return ctx.decodeAudioData(bytes.buffer);
  }

  // Render a full project to an AudioBuffer for export
  async renderProject(
    tracks: { notes: { pitch: number; start: number; duration: number; velocity: number }[]; type: ChipType; volume: number }[],
    bpm: number,
    bars: number,
  ): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const secondsPerBeat = 60 / bpm;
    const totalSeconds = bars * 4 * secondsPerBeat + 1;
    const sampleRate = ctx.sampleRate;
    const offline = new OfflineAudioContext(2, Math.ceil(totalSeconds * sampleRate), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.6;
    master.connect(offline.destination);

    for (const track of tracks) {
      for (const note of track.notes) {
        const startTime = note.start * secondsPerBeat;
        const dur = note.duration * secondsPerBeat;
        const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
        const osc = offline.createOscillator();
        const gain = offline.createGain();
        if (track.type === 'noise') {
          osc.type = 'sawtooth';
        } else if (track.type === 'triangle') {
          osc.type = 'triangle';
        } else {
          osc.type = 'square';
        }
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(note.velocity * track.volume, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(startTime);
        osc.stop(startTime + dur);
      }
    }

    return offline.startRendering();
  }

  stopAll(): void {
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
      } catch {
        // ignore
      }
    });
    this.activeNodes.clear();
  }
}

export const audioEngine = new AudioEngine();

// Note name to MIDI pitch helper
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}