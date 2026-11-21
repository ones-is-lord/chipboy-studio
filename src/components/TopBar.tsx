import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Save, Upload, Share2, Music, Disc, Waves, Grid3X3, Mic, Headphones, Settings, Volume2, Activity } from 'lucide-react';

interface TopBarProps {
  bpm: number;
  onBpmChange: (value: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSave: () => void;
  onShare: () => void;
}

const TopBar = ({
  bpm,
  onBpmChange,
  isPlaying,
  onPlayToggle,
  projectName,
  onProjectNameChange,
  onSave,
  onShare,
}: TopBarProps) => {
  return (
    <div className="retro-panel p-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gb-green rounded flex items-center justify-center">
          <Music className="w-5 h-5 text-gb-screen-dark" />
        </div>
        <div>
          <div className="pixel-text text-xs text-gb-green">CHIPBOY</div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-transparent text-sm font-bold outline-none border-b border-dashed border-snes-grey-dark focus:border-gb-green"
            placeholder="Untitled Track"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-2 bg-snes-grey-dark/30 rounded px-3 py-1">
          <Activity className="w-4 h-4 text-snes-magenta" />
          <span className="pixel-text text-xs text-snes-magenta">BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            min={60}
            max={240}
            className="w-12 bg-transparent text-sm font-bold outline-none border-b border-snes-grey-dark focus:border-gb-green"
          />
        </div>

        <Button
          size="sm"
          onClick={onPlayToggle}
          className={`snes-button font-bold ${isPlaying ? 'bg-snes-magenta text-white' : 'bg-gb-green text-gb-screen-dark'}`}
        >
          {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'STOP' : 'PLAY'}
        </Button>

        <Button size="sm" onClick={onSave} className="snes-button font-bold">
          <Save className="w-4 h-4" />
          SAVE
        </Button>

        <Button size="sm" onClick={onShare} className="snes-button font-bold">
          <Share2 className="w-4 h-4" />
          SHARE
        </Button>
      </div>
    </div>
  );
};

export default TopBar;