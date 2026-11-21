import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  data: any;
  createdAt: number;
  updatedAt: number;
}

export const ProjectManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Load projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chipboy_projects");
    if (saved) {
      setProjects(JSON.parse(saved));
    }
  }, []);

  // Save projects to localStorage
  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem("chipboy_projects", JSON.stringify(newProjects));
  };

  // Save current project
  const saveProject = () => {
    const projectData = {
      id: currentProject?.id || Date.now().toString(),
      name: projectName,
      data: { /* project data would go here */ },
      createdAt: currentProject?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const existingIndex = projects.findIndex(p => p.id === projectData.id);
    let newProjects: Project[];
    
    if (existingIndex >= 0) {
      newProjects = [...projects];
      newProjects[existingIndex] = projectData;
    } else {
      newProjects = [...projects, projectData];
    }

    saveProjects(newProjects);
    setCurrentProject(projectData);
  };

  // Load project
  const loadProject = (project: Project) => {
    setCurrentProject(project);
    setProjectName(project.name);
    // Load project data into state
  };

  // Delete project
  const deleteProject = (id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    saveProjects(newProjects);
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  // Share project via URL
  const shareProject = () => {
    const shareData = {
      name: projectName,
      data: { /* project data */ },
    };
    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}${window.location.pathname}?project=${encoded}`;
    setShareUrl(url);
    setShowShareModal(true);
  };

  // Export project as file
  const exportProject = () => {
    const data = {
      name: projectName,
      data: { /* project data */ },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.chipboy.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import project from file
  const importProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setProjectName(data.name);
        // Load project data
      } catch (error) {
        console.error("Error importing project:", error);
      }
    };
    reader.readAsText(file);
  };

  // Load project from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get("project");
    if (projectParam) {
      try {
        const decoded = JSON.parse(atob(projectParam));
        setProjectName(decoded.name);
        // Load project data
      } catch (error) {
        console.error("Error loading shared project:", error);
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Project Controls */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Project Manager</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="btn-retro flex-1 px-3 py-2 text-xs"
            placeholder="Project Name"
          />
          <button
            onClick={saveProject}
            className="btn-retro btn-retro-primary px-4 py-2 text-xs"
          >
            Save
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shareProject}
            className="btn-retro btn-retro-accent flex-1 px-3 py-2 text-xs"
          >
            Share
          </button>
          <button
            onClick={exportProject}
            className="btn-retro flex-1 px-3 py-2 text-xs"
          >
            Export
          </button>
          <label className="btn-retro flex-1 px-3 py-2 text-xs cursor-pointer">
            Import
            <input
              type="file"
              accept=".json"
              onChange={importProject}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Project List */}
      <div className="panel panel-raised p-4">
        <h2 className="font-pixel text-sm text-gb-green mb-3">Saved Projects</h2>
        
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-snes-grey-dark flex items-center justify-center">
              <svg className="w-8 h-8 text-snes-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-pixel text-xs text-snes-grey">No saved projects</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border-2 transition-all duration-75",
                  currentProject?.id === project.id
                    ? "border-gb-green bg-gb-green/10"
                    : "border-snes-grey-dark bg-snes-grey-darker"
                )}
              >
                <button
                  onClick={() => loadProject(project)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gb-green rounded-full" />
                    <span className="font-pixel text-xs text-gb-green">{project.name}</span>
                  </div>
                  <span className="font-pixel text-xs text-snes-grey">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="btn-retro btn-retro-accent px-2 py-1 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="panel panel-raised p-4 max-w-md w-full">
            <h3 className="font-pixel text-sm text-gb-green mb-3">Share Project</h3>
            <p className="font-pixel text-xs text-snes-grey mb-3">
              Copy this link to share your project:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                value={shareUrl}
                readOnly
                className="btn-retro flex-1 px-3 py-2 text-xs"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setShowShareModal(false);
                }}
                className="btn-retro btn-retro-primary px-3 py-2 text-xs"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="btn-retro w-full px-3 py-2 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};