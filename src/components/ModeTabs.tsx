import { cn } from "@/lib/utils";

type Mode = "chiptune" | "sample" | "drum" | "sequencer";

interface ModeTabsProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export const ModeTabs = ({ activeMode, onModeChange }: ModeTabsProps) => {
  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: "chiptune", label: "Chiptune", icon: "🎵" },
    { id: "sample", label: "Sample", icon: "🎙️" },
    { id: "drum", label: "Drum", icon: "🥁" },
    { id: "sequencer", label: "Seq", icon: "🎛️" },
  ];

  return (
    <div className="flex gap-2 p-3 panel panel-recessed">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={cn(
            "flex-1 py-2 px-3 font-pixel text-xs transition-all duration-75",
            "btn-retro",
            activeMode === mode.id && "btn-retro-primary"
          )}
        >
          <span className="mr-1">{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  );
};