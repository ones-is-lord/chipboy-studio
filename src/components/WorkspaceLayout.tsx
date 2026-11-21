import { useState } from "react";
import { ChipboyHeader } from "./ChipboyHeader";
import { ModeTabs } from "./ModeTabs";
import { ChiptuneMode } from "./ChiptuneMode";
import { SampleRecorder } from "./SampleRecorder";
import { DrumMachine } from "./DrumMachine";
import { StepSequencer } from "./StepSequencer";
import { ProjectManager } from "./ProjectManager";
import { EmptyState } from "./EmptyState";

type WorkspaceMode = "chiptune" | "sample" | "drum" | "sequencer";
type Mode = WorkspaceMode | "projects";

export const WorkspaceLayout = () => {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("chiptune");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [showProjects, setShowProjects] = useState(false);

  return (
    <div className="min-h-screen bg-indigo text-gb-green font-pixel">
      <ChipboyHeader />
      
      <main className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm text-gb-green">Chipboy Studio</h2>
          <div className="flex items-center gap-2">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="btn-retro px-3 py-1 text-xs w-32"
              placeholder="Project Name"
            />
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="btn-retro px-3 py-1 text-xs"
            >
              {showProjects ? "Workspace" : "Projects"}
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        {!showProjects && (
          <ModeTabs 
            activeMode={activeMode} 
            onModeChange={setActiveMode} 
          />
        )}

        {/* Workspace */}
        <div className="panel panel-recessed p-4 mt-4">
          {showProjects ? (
            <ProjectManager />
          ) : activeMode === "chiptune" ? (
            <ChiptuneMode />
          ) : activeMode === "sample" ? (
            <SampleRecorder />
          ) : activeMode === "drum" ? (
            <DrumMachine />
          ) : activeMode === "sequencer" ? (
            <StepSequencer />
          ) : (
            <EmptyState
              title="Welcome to Chipboy Studio"
              description="Select a mode from the tabs above to start making music"
              icon="🎮"
            />
          )}
        </div>
      </main>
    </div>
  );
};