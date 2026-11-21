import { useState } from "react";
import { Grid2X2, Waves, Mic, FolderOpen } from "lucide-react";
import { SampleRecorder } from "./SampleRecorder";
import { ProjectManager } from "./ProjectManager";
import { ChiptuneMode } from "./ChiptuneMode";
import { MusicGenerator } from "./MusicGenerator";
import { PixelArt } from "./PixelArt";
import { cn } from "@/lib/utils";

const modes = [
  { id: "song", label: "Song maker", icon: Grid2X2 },
  { id: "sounds", label: "Sound chips", icon: Waves },
  { id: "samples", label: "Samples", icon: Mic },
  { id: "projects", label: "Projects", icon: FolderOpen },
] as const;

export const WorkspaceLayout = () => {
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("song");

  return (
    <div className="studio-page min-h-screen px-3 py-5 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-5 flex items-center justify-between gap-4 px-2 sm:mb-7">
          <div className="flex items-center gap-3">
            <div className="brand-icon"><PixelArt className="h-10 w-10" /></div>
            <div>
              <h1 className="brand-title">chipboy<span>studio</span><sup>™</sup></h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[.24em] text-[var(--case-muted)]">Pocket-sized sounds. Big ideas.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--case-muted)] sm:flex"><span className="power-led" /> SYSTEM READY <span className="ml-3 rounded border border-[var(--case-border)] px-2 py-1">8-BIT / VOL. 01</span></div>
        </header>

        <main className="console-shell relative p-3 sm:p-6">
          <div className="screw screw-tl" /><div className="screw screw-tr" />
          <div className="mb-5 flex items-center justify-between gap-3 px-2 pt-2">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--berry)]" /><span className="case-label">CHIPBOY MUSIC GENERATOR</span></div>
            <div className="speaker-mini" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
          </div>

          <nav className="console-nav mb-5 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Studio workspaces">
            {modes.map(({ id, label, icon: Icon }, index) => (
              <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id} className={cn("console-tab flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 py-3 sm:justify-start sm:px-5", mode === id && "selected")}>
                <Icon size={17} strokeWidth={2} className="hidden sm:block" />
                <span className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider sm:flex-row sm:gap-3 sm:text-xs"><span className="tab-number">0{index + 1}</span>{label}</span>
              </button>
            ))}
          </nav>

          <div hidden={mode !== "song"}><MusicGenerator active={mode === "song"} /></div>
          <div hidden={mode !== "sounds"} className="legacy-workspace"><div className="section-heading mb-4"><span>02 / SOUND CHIPS</span><span className="text-xs">Choose your 8-bit voice</span></div><ChiptuneMode /></div>
          <div hidden={mode !== "samples"} className="legacy-workspace"><div className="section-heading mb-4"><span>03 / SAMPLE LAB</span><span className="text-xs">Capture something new</span></div><SampleRecorder /></div>
          <div hidden={mode !== "projects"} className="legacy-workspace"><ProjectManager /></div>

          <footer className="mt-6 flex items-center justify-between gap-4 px-2 pb-2">
            <div className="flex items-center gap-3"><div className="mini-dpad" aria-hidden="true" /><span className="case-label text-[9px]">MADE FOR PLAY.</span></div>
            <div className="flex items-center gap-3"><span className="case-label text-[9px]">STEREO SOUND</span><div className="speaker-mini" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div></div>
          </footer>
        </main>
        <div className="mt-5 flex items-center justify-between px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[var(--case-muted)]"><span>A little nostalgia. A lot of noise.</span><span>INSERT YOUR IMAGINATION ↗</span></div>
      </div>
    </div>
  );
};
