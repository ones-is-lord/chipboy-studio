import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const drumKits = {
  "808": ["Kick", "Snare", "Hi-Hat", "Clap", "Tom", "Perc"],
  "909": ["Kick", "Snare", "Hi-Hat", "Crash", "Rim", "Perc"],
  "Game": ["Kick", "Snare", "Bleep", "Noise", "Tone", "Click"],
};

type DrumKit = keyof typeof drumKits;

export const DrumMachine = () => {
  const [selectedKit, setSelectedKit] = useState<DrumKit>("Game");
  const [pattern, setPattern] = useState<Record<string, boolean[]>>(
    () => {
      const initial: Record<string, boolean[]> = {};
      drumKits[selectedKit].forEach(drum => {
        initial[drum] = Array(16).fill(false);
      });
      return initial;
    }
  );
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [volume, setVolume] = useState(75);
  
  const stepCount = 16;

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % stepCount);
    }, (60000 / bpm) / stepCount);
    
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  const toggleStep = (drum: string, step: number) => {
    setPattern(prev => ({
      ...prev,
      [drum]: prev[drum].map((val, i) => (i === step ? !val : val))
    }));
  };

  const clearPattern = () => {
    setPattern(prev => {
      const cleared: Record<string, boolean[]> = {};
      Object.keys(prev).forEach(drum => {
        cleared[drum] = Array(stepCount).fill(false);
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

  return (
    <div className="space-y-4">
      {/* Kit Selection & BPM */}
      <div className="panel panel-raised p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm text-gb-green">Drum Machine</h2>
          <div className="flex gap-2">
            {Object.keys(drumKits).map((kit) => (
              <button
                key={kit}
                onClick={() => {
                  setSelectedKit(kit as DrumKit);
                  const newPattern: Record<string, boolean[]> = {};
                  drumKits[kit as DrumKit].forEach(drum => {
                    newPattern[drum] = Array(stepCount).fill(false);
                  });
                  setPattern(newPattern);
                }}
                className={cn(
                  "btn-retro",
                  selectedKit === kit ? "btn-retro-primary" : ""
                )}
              >
                {kit}
              </button>
            ))}
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
            
            {/* Drum rows */}
            {drumKits[selectedKit].map((drum) => (
              <div key={drum} className="flex items-center mb-1">
                <div className="w-20 flex-shrink-0">
                  <span className="font-pixel text-xs text-gb-green">{drum}</span>
                </div>
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}>
                  {pattern[drum].map((isActive, step) => (
                    <div key={step} className="flex justify-center">
                      <button
                        onClick={() => toggleStep(drum, step)}
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