import { instrumentById } from "./instruments";
import type { Note, Track } from "./song";

export type ParsedMidiRiff = {
  name: string;
  preset: string;
  voice: Track["voice"];
  rootMidi: number;
  notes: Note[];
};

type RawNote = { midi: number; start: number; duration: number; channel: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundStep = (value: number) => Math.round(value * 4) / 4;

function readText(view: DataView, start: number, length: number) {
  let value = "";
  for (let index = 0; index < length; index++) value += String.fromCharCode(view.getUint8(start + index));
  return value;
}

function readVarLen(view: DataView, state: { pos: number }) {
  let value = 0;
  for (let index = 0; index < 4; index++) {
    if (state.pos >= view.byteLength) throw new Error("The MIDI file ended in the middle of an event.");
    const byte = view.getUint8(state.pos++);
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error("The MIDI file contains an invalid variable-length value.");
}

function parseTrack(view: DataView, start: number, end: number, notes: RawNote[], meter: { numerator: number; denominator: number }) {
  const state = { pos: start };
  const active = new Map<string, number[]>();
  let tick = 0;
  let running = 0;

  const closeNote = (midi: number, channel: number, endTick: number) => {
    const key = `${channel}:${midi}`;
    const starts = active.get(key);
    if (!starts?.length) return;
    const startTick = starts.shift()!;
    if (!starts.length) active.delete(key);
    if (endTick > startTick) notes.push({ midi, start: startTick, duration: endTick - startTick, channel });
  };

  while (state.pos < end) {
    tick += readVarLen(view, state);
    if (state.pos >= end) break;
    let status = view.getUint8(state.pos);
    if (status < 0x80) {
      if (!running) throw new Error("The MIDI file uses running status before any status byte.");
      status = running;
    } else {
      state.pos++;
      running = status < 0xf0 ? status : 0;
    }

    if (status === 0xff) {
      const type = view.getUint8(state.pos++);
      const length = readVarLen(view, state);
      const dataStart = state.pos;
      if (dataStart + length > end) throw new Error("The MIDI track is truncated.");
      if (type === 0x58 && length >= 2) {
        meter.numerator = Math.max(1, Math.min(16, view.getUint8(dataStart)));
        meter.denominator = 2 ** Math.min(8, view.getUint8(dataStart + 1));
      }
      state.pos += length;
      if (type === 0x2f) break;
      continue;
    }
    if (status === 0xf0 || status === 0xf7) {
      const length = readVarLen(view, state);
      if (state.pos + length > end) throw new Error("The MIDI track is truncated.");
      state.pos += length;
      continue;
    }
    if (status >= 0xf1) throw new Error("This MIDI file contains an unsupported system event.");

    const command = status & 0xf0;
    const channel = status & 0x0f;
    const dataBytes = command === 0xc0 || command === 0xd0 ? 1 : 2;
    if (state.pos + dataBytes > end) throw new Error("The MIDI track is truncated.");
    const data1 = view.getUint8(state.pos++);
    const data2 = dataBytes === 1 ? 0 : view.getUint8(state.pos++);

    if (command === 0x90 && data2 > 0) {
      const key = `${channel}:${data1}`;
      const starts = active.get(key) ?? [];
      starts.push(tick);
      active.set(key, starts);
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      closeNote(data1, channel, tick);
    }
  }

  for (const [key, starts] of active) {
    const [channel, midi] = key.split(":").map(Number);
    for (const startTick of starts) if (tick > startTick) notes.push({ midi, start: startTick, duration: tick - startTick, channel });
  }
}

/**
 * Reads the first 4/4-style bar of a Standard MIDI File and turns the melodic
 * notes into the 16-step grid used by the riff library. Percussion channel 10
 * is skipped because a melodic riff preset cannot represent a GM drum map.
 */
export function midiToRiff(buffer: ArrayBuffer | Uint8Array, options: { name: string; preset?: string }): ParsedMidiRiff {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < 14) throw new Error("This is not a MIDI file.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readText(view, 0, 4) !== "MThd") throw new Error("This is not a Standard MIDI File.");
  const headerLength = view.getUint32(4);
  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);
  if (!division || (division & 0x8000)) throw new Error("SMPTE-timed MIDI files are not supported.");
  if (headerLength < 6 || 8 + headerLength > bytes.byteLength) throw new Error("The MIDI header is truncated.");

  let numerator = 4;
  let denominator = 4;
  const meter = { numerator, denominator };
  const raw: RawNote[] = [];
  let pos = 8 + headerLength;
  for (let track = 0; track < trackCount && pos + 8 <= bytes.byteLength; track++) {
    if (readText(view, pos, 4) !== "MTrk") {
      const length = view.getUint32(pos + 4);
      pos += 8 + length;
      continue;
    }
    const length = view.getUint32(pos + 4);
    const end = pos + 8 + length;
    if (end > bytes.byteLength) throw new Error("A MIDI track is truncated.");
    parseTrack(view, pos + 8, end, raw, meter);
    pos = end;
  }
  numerator = meter.numerator;
  denominator = meter.denominator;

  const melodic = raw.filter(note => note.channel !== 9 && note.midi >= 0 && note.midi <= 127 && note.duration > 0);
  if (!melodic.length) throw new Error("This MIDI file has no melodic notes to import.");
  const ticksPerBar = Math.max(1, Math.round(division * numerator * 4 / denominator));
  const firstTick = Math.min(...melodic.map(note => note.start));
  const seen = new Set<string>();
  const notes: Note[] = melodic.flatMap((note, index) => {
    const start = roundStep((note.start - firstTick) / ticksPerBar * 16);
    if (start < 0 || start >= 16) return [];
    const duration = clamp(roundStep(note.duration / ticksPerBar * 16), 0.25, 16 - start);
    const key = `${start}:${note.midi}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ id: `midi-${index}-${note.midi}-${start}`, midi: note.midi, start, duration }];
  }).sort((a, b) => a.start - b.start || a.midi - b.midi).slice(0, 512);

  if (!notes.length) throw new Error("The first bar of this MIDI file is empty.");
  const preset = instrumentById(options.preset ?? "pulse25");
  return {
    name: options.name.trim().slice(0, 80) || "Downloaded riff",
    preset: preset.id,
    voice: preset.voice,
    rootMidi: Math.min(...notes.map(note => note.midi)),
    notes,
  };
}
