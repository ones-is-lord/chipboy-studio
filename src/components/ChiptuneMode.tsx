import { useState } from "react";
import { cn } from "@/lib/utils";

type ChipType = "square" | "triangle" | "noise" | "sawtooth";

interface ChipConfig {
  type: ChipType;
  name: string;
  description: string;
  color: string;
  pins: number;
}

const chips: ChipConfig[] = [
  { type: "square", name: "Square", description: "Classic 8-bit pulse wave", color: "bg-gb-green", pins: 8 },
  { type: "triangle", name: "Triangle", description: "Smooth bass wave", color: "bg-cyan", pins: 6 },
  { type: "noise", name: "Noise", description: "Percussion & effects", color: "bg-magenta", pins: 4 },
  { type: "sawtooth", name: "Sawtooth", description: "Rich harmonic wave", color: "bg-snes-grey", pins: 8 },
];

export const ChiptuneMode = () => {
  const [selectedChip, setSelectedChip] = useState<ChipType>("square");
  const [volume, setVolume] = useState(75);
  const [pitch, setPitch] = useState(0);
  const [dutyCycle, setDutyCycle] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedChipConfig = chips.find(c => c.type === selectedChip)!;

  return (
    <div className="space-y-4">
      {/* Chip Selection */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Sound Chips</h2>
        <div className="grid grid-cols-2 gap-3">
          {chips.map((chip) => (
            <button
              key={chip.type}
              onClick={() => setSelectedChip(chip.type)}
              className={cn(
                "chip-cartridge text-left transition-all duration-75",
                selectedChip === chip.type && "ring-2 ring-gb-green"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-3 h-3 rounded-sm", chip.color)} />
                <span className="font-pixel text-xs text-gb-green">{chip.name}</span>
              </div>
              <p className="text-xs text-snes-grey mb-2">{chip.description}</p>
              <div className="chip-pins">
                {Array.from({ length: chip.pins }).map((_, i) => (
                  <div key={i} className="chip-pin" />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chip Controls */}
      <div className="panel panel-raised p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm text-gb-green">{selectedChipConfig.name} Chip</h2>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "btn-retro",
              isPlaying ? "btn-retro-accent" : "btn-retro-primary"
            )}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="font-pixel text-xs text-snes-grey">Volume</label>
            <span className="font-pixel text-xs text-gb-green">{volume}%</span>
          </div>
          <div className="fader-track h-2">
            <div
              className="h-full bg-gb-green transition-all duration-75"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>

        {/* Pitch Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="font-pixel text-xs text-snes-grey">Pitch</label>
            <span className="font-pixel text-xs text-gb-green">{pitch > 0 ? "+" : ""}{pitch} semitones</span>
          </div>
          <div className="fader-track h-2">
            <div
              className="h-full bg-cyan transition-all duration-75"
              style={{ width: `${((pitch + 12) / 24) * 100}%` }}
            />
          </div>
        </div>

        {/* Duty Cycle (for square wave) */}
        {selectedChip === "square" && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="font-pixel text-xs text-snes-grey">Duty Cycle</label>
              <span className="font-pixel text-xs text-gb-green">{dutyCycle}%</span>
            </div>
            <div className="fader-track h-2">
              <div
                className="h-full bg-magenta transition-all duration-75"
                style={{ width: `${dutyCycle}%` }}
              />
            </div>
          </div>
        )}

        {/* Waveform Display */}
        <div className="lcd-screen h-24 mt-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
              <path
                d={selectedChip === "square" 
                  ? "M0,30 L20,30 L20,10 L40,10 L40,50 L60,50 L60,10 L80,10 L80,50 L100,50 L100,10 L120,10 L120,50 L140,50 L140,10 L160,10 L160,50 L180,50 L180,10 L200,10"
                  : selectedChip === "triangle"
                  ? "M0,30 L25,10 L50,50 L75,10 L100,50 L125,10 L150,50 L175,10 L200,30"
                  : selectedChip === "noise"
                  ? "M0,30 L10,20 L20,40 L30,15 L40,45 L50,25 L60,35 L70,10 L80,50 L90,20 L100,40 L110,15 L120,45 L130,25 L140,35 L150,10 L160,50 L170,20 L180,40 L190,15 L200,30"
                  : "M0,30 L20,10 L40,50 L60,10 L80,50 L100,10 L120,50 L140,10 L160,50 L180,10 L200,30"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gb-green"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};