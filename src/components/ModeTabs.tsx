import { Button } from '@/components/ui/button';
import { Music, Waves, Grid3X3, Mic, SlidersHorizontal, Headphones, Activity } from 'lucide-react';

type Mode = 'chiptune' | 'samples' | 'sequencer' | 'mixer';

interface ModeTabsProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const modes: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: 'chiptune', label: 'CHIPTUNE', icon: <Music className="w-4 h-4" /> },
  { id: 'samples', label: 'SAMPLES', icon: <Mic className="w-4 h-4" /> },
  { id: 'sequencer', label: 'SEQUENCER', icon: <Grid3X3 className="w-4 h-4" /> },
  { id: 'mixer', label: 'MIXER', icon: <SlidersHorizontal className="w-4 h-4" /> },
];

const ModeTabs = ({ activeMode, onModeChange }: ModeTabsProps) => {
  return (
    <div className="retro-panel p-2">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            variant={activeMode === mode.id ? 'default' : 'outline'}
            onClick={() => onModeChange(mode.id)}
            className={`snes-button font-bold text-xs px-3 py-2 ${
              activeMode === mode.id
                ? 'bg-gb-green text-gb-screen-dark shadow-[0_0_10px_var(--gb-green)]'
                : 'text-snes-grey hover:text-gb-green'
            }`}
          >
            <div className="flex items-center gap-1">
              {mode.icon}
              <span>{mode.label}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ModeTabs;