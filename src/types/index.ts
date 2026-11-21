export type Mode = 'chiptune' | 'samples' | 'sequencer' | 'mixer';

export type ChipType = 'square' | 'triangle' | 'noise' | 'pulse';

export interface Track {
  id: string;
  name: string;
  type: 'chiptune' | 'sample';
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  chiptune?: ChiptuneTrack;
  sample?: SampleTrack;
}

export interface ChiptuneTrack {
  chipType: ChipType;
  notes: Note[];
  octave: number;
}

export interface SampleTrack {
  sampleId: string | null;
  notes: Note[];
}

export interface Note {
  pitch: number;
  duration: number;
  start: number;
  velocity: number;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface Sample {
  id: string;
  name: string;
  data: string; // base64 audio data
  duration: number;
  sampleRate: number;
  createdAt: number;
}

export interface ChiptuneConfig {
  chipType: ChipType;
  octave: number;
  waveShape: 'square' | 'triangle' | 'sawtooth' | 'pulse';
  dutyCycle: number;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}