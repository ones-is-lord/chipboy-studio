import type { Track } from "./song";

export type Instrument = {
  id: string; name: string; category: "Chiptune" | "Synths" | "Bass" | "Keys & bells" | "Drums";
  voice: Track["voice"]; wave: OscillatorType; attack: number; release: number; cutoff: number;
  detune?: number; duty?: number; fm?: number; noise?: number; decay?: number;
};
const preset = (id: string, name: string, category: Instrument["category"], wave: OscillatorType, options: Partial<Instrument> = {}): Instrument => ({ id, name, category, voice: wave === "triangle" ? "triangle" : "square", wave, attack: 0.005, release: 0.05, cutoff: 18000, ...options });
export const instruments: Instrument[] = [
  preset("pulse50", "Classic pulse · 50%", "Chiptune", "square", { duty: 0.5 }),
  preset("pulse25", "Coin pulse · 25%", "Chiptune", "square", { duty: 0.25 }),
  preset("pulse12", "Thin pulse · 12.5%", "Chiptune", "square", { duty: 0.125 }),
  preset("arcade", "Arcade pulse · 33%", "Chiptune", "square", { duty: 0.33, decay: 0.2 }),
  preset("triangle", "Game Boy triangle", "Chiptune", "triangle"),
  preset("bleep", "Arcade bleep", "Chiptune", "sine", { fm: 2, decay: 0.12 }),
  preset("laser", "Space laser", "Chiptune", "sawtooth", { fm: 5, decay: 0.18 }),
  preset("sawlead", "Bright saw lead", "Synths", "sawtooth", { cutoff: 7000 }),
  preset("hyperlead", "Hyperpop lead", "Synths", "square", { duty: 0.18, cutoff: 9000, decay: 0.18 }),
  preset("synthwave", "Synthwave saw", "Synths", "sawtooth", { detune: 8, cutoff: 4500 }),
  preset("supersaw", "Detuned twin saw", "Synths", "sawtooth", { detune: 14, cutoff: 5500 }),
  preset("brass", "Synth brass", "Synths", "sawtooth", { attack: 0.04, cutoff: 2200, detune: 7 }),
  preset("pad", "Warm analog pad", "Synths", "triangle", { attack: 0.15, release: 0.2, detune: 9, cutoff: 1800 }),
  preset("pluck", "Glass pluck", "Synths", "sine", { fm: 3, decay: 0.3 }),
  preset("hollow", "Hollow square", "Synths", "square", { cutoff: 1200, attack: 0.015 }),
  preset("sub", "Deep sine sub", "Bass", "sine", { cutoff: 700 }),
  preset("acid", "Acid saw bass", "Bass", "sawtooth", { cutoff: 950, decay: 0.23 }),
  preset("rubber", "Rubber FM bass", "Bass", "sine", { fm: 1, cutoff: 1800, decay: 0.25 }),
  preset("squarebass", "Square bass", "Bass", "square", { cutoff: 800 }),
  preset("phonk", "Phonk square bass", "Bass", "square", { fm: 1.5, cutoff: 700, decay: 0.2 }),
  preset("epiano", "FM electric keys", "Keys & bells", "sine", { fm: 2, decay: 1.1 }),
  preset("lofi", "Lo-fi FM keys", "Keys & bells", "sine", { fm: 2, cutoff: 1600, decay: 0.8 }),
  preset("bell", "Crystal bell", "Keys & bells", "sine", { fm: 3.5, decay: 1.4 }),
  preset("organ", "Pocket organ", "Keys & bells", "sine", { fm: 0.5, detune: 3 }),
  preset("marimba", "Synthetic marimba", "Keys & bells", "sine", { fm: 4, decay: 0.22 }),
  preset("kick8", "8-bit kick", "Drums", "sine", { voice: "kick", decay: 0.18, cutoff: 2000 }),
  preset("kick808", "Deep 808-style kick", "Drums", "sine", { voice: "kick", decay: 0.55, cutoff: 1600 }),
  preset("doublekick", "Double bass kick", "Drums", "sine", { voice: "kick", decay: 0.7, cutoff: 1200 }),
  preset("snare", "Crunch snare", "Drums", "triangle", { voice: "noise", noise: 900, decay: 0.16 }),
  preset("roll", "Snare roll", "Drums", "triangle", { voice: "noise", noise: 1800, decay: 0.07 }),
  preset("clap", "Digital clap", "Drums", "square", { voice: "noise", noise: 1500, decay: 0.12 }),
  preset("hat", "Closed noise hat", "Drums", "square", { voice: "noise", noise: 7500, decay: 0.045 }),
  preset("openhat", "Open noise hat", "Drums", "square", { voice: "noise", noise: 5500, decay: 0.28 }),
  preset("crash", "Noise crash", "Drums", "square", { voice: "noise", noise: 3500, decay: 0.75 }),
  preset("ride", "Ride cymbal", "Drums", "square", { voice: "noise", noise: 6200, decay: 0.5 }),
  preset("shaker", "Soft shaker", "Drums", "square", { voice: "noise", noise: 4200, decay: 0.065 }),
  preset("tom", "Synth tom", "Drums", "sine", { voice: "kick", decay: 0.25, cutoff: 5000 }),
  preset("timpani", "Timpani", "Drums", "sine", { voice: "kick", decay: 0.6, cutoff: 900 }),
  preset("kettlebell", "Kettle bell", "Drums", "square", { fm: 4.2, decay: 0.5, cutoff: 5000 }),
  preset("clap2", "Tight clap", "Drums", "square", { voice: "noise", noise: 2200, decay: 0.09 }),
  preset("rim", "Wood rim", "Drums", "triangle", { fm: 5, decay: 0.035 }),
  preset("cowbell", "Arcade cowbell", "Drums", "square", { fm: 1.48, decay: 0.15, cutoff: 4000 }),
];
export const instrumentById = (id: string) => instruments.find(p => p.id === id) ?? instruments[0];
export function instrumentTrack(id: string, barCount: number): Track {
  const p = instrumentById(id);
  return { name: p.name, chip: p.category.toUpperCase(), voice: p.voice, preset: p.id, octave: 0, rootMidi: p.category === "Bass" ? 36 : 60, pitch: 0, volume: 65, muted: false, patterns: [[], []], bars: Array(barCount).fill(null) };
}

export const categoryColors: Record<Instrument["category"], string> = {
  Chiptune: "#658342",
  Synths: "#933d60",
  Bass: "#7a5c2e",
  "Keys & bells": "#3f6f8f",
  Drums: "#a34a2a",
};
export const trackCategory = (track: Track) => instrumentById(track.preset).category;
export const trackColor = (track: Track) => categoryColors[trackCategory(track)];
