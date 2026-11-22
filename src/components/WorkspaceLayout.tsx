import { useState } from "react";
import { Drum, FolderOpen, Grid2X2, Mic, Music2, Waves } from "lucide-react";
import { SampleRecorder } from "./SampleRecorder";
import { ProjectManager } from "./ProjectManager";
import { InstrumentBrowser } from "./InstrumentBrowser";
import { StudioProvider } from "./StudioProvider";
import { MusicGenerator } from "./MusicGenerator";
import { RiffLibrary } from "./RiffLibrary";
import { DrumMachine } from "./DrumMachine";
import { AnimatedSprite, PixelArt, PixelEqualizer } from "./PixelArt";
import { tapHaptic } from "@/lib/native";
import { cn } from "@/lib/utils";

const modes = [
  { id: "song", label: "Song maker", icon: Grid2X2 },
  { id: "sounds", label: "Instruments", icon: Waves },
  { id: "samples", label: "Sampler", icon: Mic },
  { id: "riffs", label: "Riffs", icon: Music2 },
  { id: "beat", label: "Beat lab", icon: Drum },
  { id: "projects", label: "Projects", icon: FolderOpen },
] as const;

const StudioWorkspace = () => {
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("song");

  return (
    <div className="studio-page min-h-screen px-3 py-5 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-[1240px]">
        <header className="animate-screen-in mb-5 flex items-center justify-between gap-4 px-2 sm:mb-7">
          <div className="flex items-center gap-3">
            <div className="brand-icon relative animate-sprite-bob" aria-hidden="true">
              <PixelArt type="controllerNote" className="h-auto w-[60px] max-w-full" />
            </div>
            <div>
              <h1 className="brand-title">chipboy<span>studio</span><sup>™</sup></h1>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.24em] text-[var(--case-muted)]">Pocket-sized sounds. Big ideas.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--case-muted)] sm:flex">
            <PixelEqualizer bars={4} className="mr-1" />
            <span className="power-led animate-led" />
            SYSTEM READY
            <AnimatedSprite frames={["note", "noteB"]} interval={520} className="mx-1 h-5 w-5 animate-sprite-float" label="Animated music note" />
            <span className="rounded border border-[var(--case-border)] px-2 py-1">8-BIT / VOL. 01</span>
          </div>
        </header>

        <main className="console-shell animate-screen-in relative p-3 sm:p-6">
          <div className="screw screw-tl" /><div className="screw screw-tr" />
          <div className="mb-5 flex items-center justify-between gap-3 px-2 pt-2">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-led rounded-full bg-[var(--berry)]" /><span className="case-label">CHIPBOY MUSIC GENERATOR</span></div>
            <div className="flex items-center gap-3">
              <AnimatedSprite frames={["star", "starB"]} interval={640} className="hidden h-5 w-5 sm:inline-flex" label="Animated star" />
              <div className="speaker-mini" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
            </div>
          </div>

          <nav className="console-nav mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6" aria-label="Studio workspaces">
            {modes.map(({ id, label, icon: Icon }, index) => (
              <button key={id} onClick={() => { void tapHaptic(); setMode(id); }} aria-pressed={mode === id} className={cn("console-tab flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 py-3 sm:justify-start sm:px-2 lg:px-5", mode === id && "selected")}>
                <Icon size={18} strokeWidth={2.4} className="hidden lg:block" />
                <span className="flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-wider sm:flex-row sm:gap-2 sm:text-[11px] lg:gap-3 lg:text-xs"><span className="tab-number">0{index + 1}</span>{label}</span>
              </button>
            ))}
          </nav>

          <div className={cn("tab-panel", mode === "song" && "animate-tab-in")} hidden={mode !== "song"}><MusicGenerator active={mode === "song"} /></div>
          <div className={cn("tab-panel", mode === "sounds" && "animate-tab-in")} hidden={mode !== "sounds"}><InstrumentBrowser active={mode === "sounds"} onOpenSong={() => setMode("song")} /></div>
          <div className={cn("tab-panel", mode === "samples" && "animate-tab-in")} hidden={mode !== "samples"}><SampleRecorder active={mode === "samples"} onOpenSong={() => setMode("song")} /></div>
          <div className={cn("tab-panel", mode === "riffs" && "animate-tab-in")} hidden={mode !== "riffs"}><RiffLibrary active={mode === "riffs"} /></div>
          <div className={cn("tab-panel", mode === "beat" && "animate-tab-in")} hidden={mode !== "beat"}><DrumMachine active={mode === "beat"} /></div>
          <div className={cn("tab-panel legacy-workspace", mode === "projects" && "animate-tab-in")} hidden={mode !== "projects"}><ProjectManager /></div>

          <footer className="mt-6 flex items-center justify-between gap-4 px-2 pb-2">
            <div className="flex items-center gap-3">
              <div className="mini-dpad animate-wiggle" aria-hidden="true" />
              <AnimatedSprite frames={["heart", "heartB"]} interval={780} className="h-5 w-5" label="Animated pixel heart" />
              <span className="case-label text-[9px]">MADE FOR PLAY.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="case-label text-[9px]">STEREO SOUND</span>
              <PixelEqualizer bars={6} />
            </div>
          </footer>
        </main>
        <div className="mt-5 flex items-center justify-between px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[var(--case-muted)]">
          <span>A little nostalgia. A lot of noise.</span>
          <span className="flex items-center gap-2"><PixelArt type="coin" className="h-4 w-4 animate-coin-spin" /> INSERT YOUR IMAGINATION ↗</span>
        </div>
      </div>
    </div>
  );
};

export const WorkspaceLayout = () => <StudioProvider><StudioWorkspace /></StudioProvider>;
