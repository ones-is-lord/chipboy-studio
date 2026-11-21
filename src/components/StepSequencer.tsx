import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const notes = ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5", "C#5", "D5", "D#5"];

export const StepSequencer = () => {
  const [pattern, setPattern] = useState<Record<string, boolean[]>>(
    () => {
      const initial: Record<string, boolean[]> = {};
      notes.forEach(note => {
        initial[note] = Array(16).fill(false);
      });
      return initial;
    }
  );
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [volume, setVolume] = useState(75);
  const [octave, setOctave] = useState(4);
  const [scale, setScale] = useState<"chromatic" | "major" | "minor" | "pentatonic">("chromatic");
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  
  const stepCount = 16;

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % stepCount);
    }, (60000 / bpm) / stepCount);
    
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  const toggleStep = (note: string, step: number) => {
    setPattern(prev => ({
      ...prev,
      [note]: prev[note].map((val, i) => (i === step ? !val : val))
    }));
  };

  const clearPattern = () => {
    setPattern(prev => {
      const cleared: Record<string, boolean[]> = {};
      Object.keys(prev).forEach(note => {
        cleared[note] = Array(stepCount).fill(false);
      });
      return cleared;
    });
  };

  const playPattern = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentStep(0);
    }
  };

  const getScaleNotes = () => {
    const baseNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
    const pentatonicIntervals = [0, 2, 4, 7, 9];
    
    let intervals: number[];
    switch (scale) {
      case "major": intervals = majorIntervals; break;
      case "minor": intervals = minorIntervals; break;
      case "pentatonic": intervals = pentatonicIntervals; break;
      default: return notes;
    }
    
    const result: string[] = [];
    for (let o = 3; o <= 5; o++) {
      intervals.forEach(interval => {
        const noteIndex = interval % 12;
        result.push(`${baseNotes[noteIndex]}${o}`);
      });
    }
    return result.slice(0, 16);
  };

  const displayNotes = scale === "chromatic" ? notes : getScaleNotes();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="panel panel-raised p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm text-gb-green">Step Sequencer</h2>
          <div className="flex gap-2">
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value as typeof scale)}
              className="btn-retro px-2 py-1 text-xs"
            >
              <option value="chromatic">Chromatic</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="pentatonic">Pentatonic</option>
            </select>
          </div>
        </div>

        {/* BPM Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="font-pixel text-xs text-snes-grey">BPM</label>
            <span className="font-pixel text-xs text-gb-green">{bpm}</span>
          </div>
          <div className="fader-track h-2">
            <div
              className="h-full bg-gb-green transition-all duration-75"
              style={{ width: `${((bpm - 60) / 140) * 100}%` }}
            />
          </div>
        </div>

        {/* Volume Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="font-pixel text-xs text-snes-grey">Volume</label>
            <span className="font-pixel text-xs text-gb-green">{volume}%</span>
          </div>
          <div className="fader-track h-2">
            <div
              className="h-full bg-cyan transition-all duration-75"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>

        {/* Octave Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="font-pixel text-xs text-snes-grey">Octave</label>
            <span className="font-pixel text-xs text-gb-green">{octave}</span>
          </div>
          <div className="fader-track h-2">
            <div
              className="h-full bg-magenta transition-all duration-75"
              style={{ width: `${((octave - 2) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Play Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={playPattern}
            className={cn(
              "btn-retro flex-1",
              isPlaying ? "btn-retro-accent" : "btn-retro-primary"
            )}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
          <button
            onClick={clearPattern}
            className="btn-retro btn-retro-accent flex-1"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Pattern</h2>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Step headers */}
            <div className="flex mb-1">
              <div className="w-20 flex-shrink-0" />
              <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}>
                {Array.from({ length: stepCount }).map((_, i) => (
                  <div key={i} className="flex justify-center">
                    <span className={cn(
                      "font-pixel text-xs",
                      i === currentStep ? "text-gb-green" : "text-snes-grey"
                    )}>
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Note rows */}
            {displayNotes.map((note) => (
              <div key={note} className="flex items-center mb-1">
                <div className="w-20 flex-shrink-0">
                  <span className={cn(
                    "font-pixel text-xs",
                    selectedNote === note ? "text-gb-green" : "text-snes-grey"
                  )}>
                    {note}
                  </span>
                </div>
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}>
                  {pattern[note]?.map((isActive, step) => (
                    <div key={step} className="flex justify-center">
                      <button
                        onClick={() => toggleStep(note, step)}
                        className={cn(
                          "seq-step",
                          isActive && "active",
                          step === currentStep && "playing"
                        )}
                      >
                        {isActive && step === currentStep && "▶"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};