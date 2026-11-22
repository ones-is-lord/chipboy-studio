import { useEffect, useState } from "react";
import { Copy, Dices, Drum, Eraser, Music2, Play, Send, Square, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useStudio } from "./StudioProvider";
import { useDrumMachine } from "@/hooks/use-drum-machine";
import { AnimatedSprite, PixelArt, PixelEqualizer } from "./PixelArt";
import {
  DRUM_BANKS,
  DRUM_ROWS,
  DRUM_STEP_COUNT,
  clearDrumPattern,
  copyDrumPattern,
  drumHitCount,
  drumRowPreset,
  emptyDrumPattern,
  loadDrumMachine,
  randomizeDrumPattern,
  saveDrumMachine,
  toggleDrumStep,
  type DrumPattern,
} from "@/lib/drum-machine";
import { instrumentById, instruments } from "@/lib/instruments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DrumMachine({ active }: { active: boolean }) {
  const studio = useStudio();
  const [state, setState] = useState(loadDrumMachine);
  const pattern = state.patterns[state.active] ?? emptyDrumPattern(DRUM_BANKS[state.active]);
  const audio = useDrumMachine(pattern, { bpm: state.bpm, swing: state.swing, loop: state.loop, master: state.master, active });
  const hits = drumHitCount(pattern);

  useEffect(() => {
    const timer = window.setTimeout(() => saveDrumMachine(state), 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  const updatePattern = (change: (current: DrumPattern) => DrumPattern) => {
    setState(current => ({ ...current, patterns: current.patterns.map((item, index) => index === current.active ? change(item) : item) }));
  };
  const setBank = (index: number) => {
    audio.stop();
    setState(current => ({ ...current, active: Math.max(0, Math.min(DRUM_BANKS.length - 1, index)) }));
  };
  const clear = () => {
    if (!window.confirm(`Clear drum bank ${DRUM_BANKS[state.active]}?`)) return;
    updatePattern(clearDrumPattern);
    toast.success(`Bank ${DRUM_BANKS[state.active]} cleared.`);
  };
  const randomize = () => {
    updatePattern(randomizeDrumPattern);
    toast.success("A new pocket groove appeared. Tap the pads to edit it.");
  };
  const copyToNext = () => {
    const next = (state.active + 1) % DRUM_BANKS.length;
    setState(current => ({
      ...current,
      active: next,
      patterns: current.patterns.map((item, index) => index === next ? copyDrumPattern(item, DRUM_BANKS[next]) : item),
    }));
    toast.success(`Bank ${DRUM_BANKS[state.active]} copied to ${DRUM_BANKS[next]}.`);
  };
  const sendToSong = () => {
    if (!hits) { toast.error("Add a few drum hits before sending the kit to the song."); return; }
    if (studio.addDrumKit(pattern, state.bpm)) toast.success(`Drum kit added at bar ${studio.selectedBar + 1}.`);
  };

  return <div className="space-y-5">
    <div className="section-heading flex flex-wrap items-center justify-between gap-3">
      <span>05 / BEAT LAB</span>
      <span className="text-[9px]">18 LANES · 16 STEPS · 4 BANKS · LOOP STATION</span>
    </div>

    <section className="screen-bezel rounded-xl p-3 sm:p-4" aria-labelledby="beat-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="beat-heading" className="bezel-label">ROWS × COLUMNS DRUM MACHINE</h2>
          <p className="bezel-copy mt-1">A full percussion kit with modern and retro voices. Toggle pads, loop the bar, then send the kit into the song timeline.</p>
        </div>
        <div className="flex items-center gap-2"><Drum className="h-7 w-7 text-[#e5f2b8]" /><span className="bezel-label text-[8px]">{hits} HITS · {state.bpm} BPM</span></div>
      </div>

      <div className="game-screen rounded-md p-3 sm:p-4">
        <div className="lcd-heading mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--lcd-line)] pb-3">
          <span className="font-pixel text-base tracking-wider">POCKET RHYTHM SECTION.</span>
          <div className="flex items-center gap-3"><AnimatedSprite frames={["note", "noteB"]} interval={480} className="h-5 w-5 animate-note-float" label="Animated music note" /><span className="lcd-label">{audio.playing ? `STEP ${String(audio.position + 1).padStart(2, "0")}` : "READY"}</span></div>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-wrap items-center gap-2">
            <Button aria-label={audio.playing ? "Stop beat" : "Play beat"} onClick={audio.toggle} className={cn("play-button h-10 w-12", audio.playing && "is-playing")}>{audio.playing ? <Square size={15} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</Button>
            <Button aria-label="Loop beat" aria-pressed={state.loop} onClick={() => setState(current => ({ ...current, loop: !current.loop }))} className={cn("hardware-button h-10 px-3 text-[9px]", state.loop && "engaged")}>LOOP {state.loop ? "ON" : "OFF"}</Button>
            <div className="flex items-center gap-1" role="group" aria-label="Drum pattern bank">
              {DRUM_BANKS.map((bank, index) => <button key={bank} onClick={() => setBank(index)} aria-pressed={state.active === index} className={cn("console-tab h-10 w-10 rounded-md text-[11px] font-black", state.active === index && "selected")}>{bank}</button>)}
            </div>
            <Button onClick={copyToNext} className="hardware-button h-10 px-3 text-[9px]"><Copy size={13} /> COPY</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="rounded-md border border-[var(--lcd-line)] bg-[#cbd6a8] p-2 text-[8px] font-extrabold tracking-wider text-[#344a27]">
              <span className="flex items-center justify-between"><span>BPM</span><span className="text-base">{state.bpm}</span></span>
              <Slider aria-label="Drum machine BPM" className="console-slider mt-2" value={[state.bpm]} onValueChange={([value]) => setState(current => ({ ...current, bpm: value }))} min={40} max={240} step={1} />
            </label>
            <label className="rounded-md border border-[var(--lcd-line)] bg-[#cbd6a8] p-2 text-[8px] font-extrabold tracking-wider text-[#344a27]">
              <span className="flex items-center justify-between"><span>SWING</span><span className="text-base">{state.swing}%</span></span>
              <Slider aria-label="Drum machine swing" className="console-slider mt-2" value={[state.swing]} onValueChange={([value]) => setState(current => ({ ...current, swing: value }))} min={0} max={60} step={1} />
            </label>
            <label className="rounded-md border border-[var(--lcd-line)] bg-[#cbd6a8] p-2 text-[8px] font-extrabold tracking-wider text-[#344a27]">
              <span className="flex items-center justify-between"><span><Volume2 size={10} className="mr-1 inline" />MASTER</span><span className="text-base">{state.master}%</span></span>
              <Slider aria-label="Drum machine master volume" className="console-slider mt-2" value={[state.master]} onValueChange={([value]) => setState(current => ({ ...current, master: value }))} min={0} max={100} step={1} />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="drum-grid" role="grid" aria-label="Drum machine step grid">
            <div className="drum-corner">LANE</div>
            {Array.from({ length: DRUM_STEP_COUNT }, (_, step) => <div key={step} className={cn("drum-column-head", step % 4 === 0 && "accent", audio.position === step && "current")} aria-hidden="true">{String(step + 1).padStart(2, "0")}</div>)}
            {DRUM_ROWS.map(row => {
              const preset = instrumentById(drumRowPreset(pattern, row));
              const steps = pattern.steps[row.id] ?? [];
              return <div key={row.id} className="contents" role="row">
                <div className="drum-lane" role="rowheader">
                  <button onClick={() => void audio.previewRow(row)} aria-label={`Preview ${row.name}`} className="drum-preview"><Play size={10} fill="currentColor" /></button>
                  <div className="min-w-0">
                    <span className="drum-lane-name">{row.name}</span>
                    {row.custom ? <select aria-label={`Custom preset for ${row.name}`} value={preset.id} onChange={event => updatePattern(current => ({ ...current, presets: { ...current.presets, [row.id]: event.target.value } }))} className="drum-preset-select">{instruments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <span className="drum-lane-sound">{preset.name}</span>}
                  </div>
                </div>
                {Array.from({ length: DRUM_STEP_COUNT }, (_, step) => {
                  const on = Boolean(steps[step]);
                  return <button key={step} role="gridcell" aria-label={`${row.name} step ${step + 1}`} aria-pressed={on} onClick={() => updatePattern(current => toggleDrumStep(current, row.id, step))} className={cn("drum-pad", on && "on", audio.position === step && "current", step % 4 === 0 && "downbeat")}><span className="drum-led" /></button>;
                })}
              </div>;
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={clear} className="hardware-button h-9 px-3 text-[9px]"><Eraser size={13} /> CLEAR BANK</Button>
          <Button onClick={randomize} className="hardware-button h-9 px-3 text-[9px]"><Dices size={13} /> RANDOMIZE</Button>
          <Button onClick={() => setState(current => ({ ...current, patterns: current.patterns.map((item, index) => index === current.active ? emptyDrumPattern(DRUM_BANKS[index]) : item) }))} className="hardware-button h-9 px-3 text-[9px]"><Trash2 size={13} /> NEW PATTERN</Button>
          <Button onClick={sendToSong} className="play-button ml-auto h-9 px-4 text-[9px]"><Send size={13} /> SEND TO SONG</Button>
        </div>
        <p className="lcd-label mt-3 text-[8px]">PREVIEW ROWS WITH THE PLAY BUTTON · CUSTOM A/B CAN LOAD ANY PRESET · SENT TRACKS LAND AT THE SELECTED BAR</p>
      </div>
    </section>

    <section className="editor-panel rounded-xl p-4" aria-labelledby="beat-notes">
      <h2 id="beat-notes" className="section-heading flex items-center gap-2"><Music2 size={14} /> BEAT LAB NOTES</h2>
      <div className="mt-3 grid gap-3 text-[10px] leading-relaxed text-[var(--case-muted)] md:grid-cols-3">
        <p><strong className="text-[var(--case-ink)]">Kick and double bass</strong> anchor the loop. The double-bass lane is tuned lower and decays longer for trap and drill patterns.</p>
        <p><strong className="text-[var(--case-ink)]">Toms, timpani, kettle bell and cowbell</strong> are pitched lanes. Stack them with hats, cymbals and claps for game, orchestral or phonk textures.</p>
        <p><strong className="text-[var(--case-ink)]">Send to song</strong> creates one channel per active lane, each with its own one-bar block at the selected bar. Then shape them with the expanded FX rack.</p>
      </div>
      <div className="mt-4 flex items-center gap-3"><PixelArt type="speaker" className="h-5 w-5" /><PixelEqualizer bars={7} /><span className="case-label text-[8px]">LIVE PREVIEW · NO SAMPLES REQUIRED</span></div>
    </section>
  </div>;
}
