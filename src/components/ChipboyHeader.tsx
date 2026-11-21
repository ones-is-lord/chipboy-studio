import { cn } from "@/lib/utils";

export const ChipboyHeader = () => {
  return (
    <header className="panel panel-raised border-2 border-gb-green-dark pb-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gb-green-dim flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path className="stroke-2" strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16.343 17.657l.707.707m-9.192.53L12 5.231M12 5.231l5.657.038L18.354 12l-4.326 4.326 1.313 6.364m7.028-5.366l-.707.707m9.9 0l-.707.707M15.586 15.586l-.707-.707m4.242-.5l-.707.707M12 19.769l-.707.707m4.242.5L19.769 12l-5.657-.038L12 6.769m7.028 5.366l.707-.707M12 12l-7.776 2.012M4.424 4.424L12 12m15.576-4.424L12 12"/>
            </svg>
          </div>
          <h1 className="font-pixel text-xl text-gb-green">Chipboy Studio</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="btn-retro btn-retro-primary"
            aria-label="New Project"
          >
            New
          </button>
          <button 
            className="btn-retro"
            aria-label="Open Project"
          >
            Open
          </button>
        </div>
      </div>
    </header>
  );
};