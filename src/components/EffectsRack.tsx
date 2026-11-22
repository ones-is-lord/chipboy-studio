import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { defaultEffects, type Effects, type NumericEffectKey } from "@/lib/effects";
import { cn } from "@/lib/utils";

type Control = {
  key: NumericEffectKey;
  label: string;
  min: number;
  max: number;
  step?: number;
  log?: boolean;
  format?: (value: number) => string;
};

type Group = { title: string; copy: string; controls: Control[] };

const percent = (value: number) => `${Math.round(value * 100)}%`;
const db = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(0)} dB`;
const hz = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)}k` : `${Math.round(value)} Hz`;

const groups: Group[] = [
  {
    title: "FILTER & DRIVE",
    copy: "Sculpt the source, then add grit.",
    controls: [
      { key: "cutoff", label: "CUTOFF", min: 60, max: 20_000, log: true, format: hz },
      { key: "resonance", label: "RESONANCE", min: 0.1, max: 24, step: 0.1, format: value => `Q ${value.toFixed(1)}` },
      { key: "drive", label: "DRIVE", min: 0, max: 1, step: 0.01, format: percent },
      { key: "distortion", label: "DISTORTION", min: 0, max: 1, step: 0.01, format: percent },
      { key: "saturation", label: "SATURATION", min: 0, max: 1, step: 0.01, format: percent },
      { key: "bits", label: "BIT DEPTH", min: 1, max: 16, step: 1, format: value => `${Math.round(value)} bit` },
      { key: "acid", label: "ACID ENVELOPE", min: 0, max: 1, step: 0.01, format: percent },
      { key: "filterLfo", label: "FILTER LFO", min: 0, max: 1, step: 0.01, format: percent },
      { key: "filterRate", label: "LFO RATE", min: 0.05, max: 8, step: 0.05, format: value => `${value.toFixed(2)} Hz` },
    ],
  },
  {
    title: "MODULATION",
    copy: "Movement, width and mechanical wobble.",
    controls: [
      { key: "chorus", label: "CHORUS", min: 0, max: 1, step: 0.01, format: percent },
      { key: "flanger", label: "FLANGER", min: 0, max: 1, step: 0.01, format: percent },
      { key: "phaser", label: "PHASER", min: 0, max: 1, step: 0.01, format: percent },
      { key: "tremolo", label: "TREMOLO", min: 0, max: 1, step: 0.01, format: percent },
      { key: "autoPan", label: "AUTO PAN", min: 0, max: 1, step: 0.01, format: percent },
      { key: "ringMod", label: "RING MOD", min: 0, max: 1, step: 0.01, format: percent },
    ],
  },
  {
    title: "SPACE & DYNAMICS",
    copy: "Delay repeats, room size and squeeze.",
    controls: [
      { key: "delay", label: "DELAY SEND", min: 0, max: 1, step: 0.01, format: percent },
      { key: "feedback", label: "FEEDBACK", min: 0, max: 0.9, step: 0.01, format: percent },
      { key: "delayBeats", label: "DELAY TIME", min: 0.05, max: 4, step: 0.05, format: value => `${value.toFixed(2)} beat` },
      { key: "reverb", label: "REVERB", min: 0, max: 1, step: 0.01, format: percent },
      { key: "compression", label: "COMPRESSION", min: 0, max: 1, step: 0.01, format: percent },
    ],
  },
  {
    title: "TONE",
    copy: "Three-band shelf and peak shaping.",
    controls: [
      { key: "low", label: "LOW", min: -12, max: 12, step: 1, format: db },
      { key: "mid", label: "MID", min: -12, max: 12, step: 1, format: db },
      { key: "high", label: "HIGH", min: -12, max: 12, step: 1, format: db },
    ],
  },
];

const presets: { name: string; values: Partial<Effects> }[] = [
  { name: "CLEAN", values: {} },
  { name: "CRUNCH", values: { drive: 0.35, distortion: 0.3, cutoff: 8000, compression: 0.25, high: 2 } },
  { name: "ACID 303", values: { acid: 0.85, resonance: 14, cutoff: 2600, distortion: 0.25, drive: 0.2, delay: 0.18, feedback: 0.3 } },
  { name: "WIDE", values: { chorus: 0.45, phaser: 0.3, flanger: 0.15, autoPan: 0.35, reverb: 0.25 } },
  { name: "DUB", values: { delay: 0.5, feedback: 0.62, delayBeats: 0.75, reverb: 0.55, cutoff: 5200, low: 2 } },
  { name: "LO-FI", values: { bits: 6, saturation: 0.55, cutoff: 4200, compression: 0.3, low: 2, high: -3 } },
  { name: "COMP", values: { compression: 0.8, low: 1.5, mid: -0.5, high: 1, cutoff: 12000 } },
  { name: "SPACE", values: { reverb: 0.7, delay: 0.3, feedback: 0.45, chorus: 0.2 } },
  { name: "DESTROY", values: { distortion: 0.8, drive: 0.6, bits: 4, cutoff: 3500, compression: 0.5 } },
];

export function EffectsRack({ effects, onChange, onCommit }: { effects: Effects; onChange: (patch: Partial<Effects>, group: string) => void; onCommit: () => void }) {
  const applyPreset = (values: Partial<Effects>) => onChange({ ...defaultEffects(), ...values, enabled: true }, "fx-preset");
  return <section className="editor-panel mt-5 rounded-xl p-4" aria-labelledby="fx-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 id="fx-heading" className="section-heading flex items-center gap-2"><SlidersHorizontal size={14} /> FX RACK</h3>
        <p className="mt-1 text-[9px] text-[var(--case-muted)]">Per-channel processing. Changes apply on the next note or playback pass.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => applyPreset({})} className="hardware-button h-8 px-2 text-[9px]"><RotateCcw size={12} /> RESET</Button>
        <button onClick={() => onChange({ enabled: !effects.enabled }, "track-fx")} aria-pressed={effects.enabled} className={cn("console-tab rounded-md px-3 py-2 text-[9px] font-bold uppercase", effects.enabled && "selected")}>{effects.enabled ? "FX ON" : "FX OFF"}</button>
      </div>
    </div>

    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Effects presets">
      {presets.map(preset => <button key={preset.name} onClick={() => applyPreset(preset.values)} className="console-tab rounded-md px-2.5 py-1.5 text-[8px] font-bold">{preset.name}</button>)}
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {groups.map(group => <div key={group.title} className="sound-card rounded-lg p-3">
        <div className="mb-3 border-b border-[var(--case-border)] pb-2">
          <h4 className="case-label text-[8px]">{group.title}</h4>
          <p className="mt-1 text-[8px] text-[var(--case-muted)]">{group.copy}</p>
        </div>
        <div className="space-y-3">
          {group.controls.map(control => {
            const raw = effects[control.key];
            const toSlider = (value: number) => control.log
              ? Math.log(value / control.min) / Math.log(control.max / control.min) * 100
              : (value - control.min) / (control.max - control.min) * 100;
            const fromSlider = (value: number) => control.log
              ? control.min * (control.max / control.min) ** (value / 100)
              : control.min + (control.max - control.min) * value / 100;
            const format = control.format ?? percent;
            return <div key={control.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[8px] font-bold tracking-wider"><span>{control.label}</span><span className="text-[var(--berry)]">{format(raw)}</span></div>
              <Slider aria-label={`Selected track ${control.label.toLowerCase()}`} className="console-slider" value={[Math.max(0, Math.min(100, toSlider(raw)))]} onValueChange={([value]) => { const next = fromSlider(value); onChange({ [control.key]: control.key === "bits" ? Math.round(next) : next } as Partial<Effects>, `fx-${control.key}`); }} onValueCommit={onCommit} min={0} max={100} step={0.1} />
            </div>;
          })}
        </div>
      </div>)}
    </div>
  </section>;
}
