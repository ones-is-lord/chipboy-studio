import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  HardDrive,
  Music2,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelArt } from "./PixelArt";
import { useStudio } from "./StudioProvider";
import {
  buildShareUrl,
  clearAutosave,
  deleteProject,
  loadAutosave,
  loadProjects,
  parseProjectJson,
  projectFilename,
  saveProject,
  serializeProject,
  type StoredProject,
} from "@/lib/project";
import { isNative, saveBlob, shareLink } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const dateLabel = (value: number) =>
  new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function ProjectManager() {
  const studio = useStudio();
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(studio.song.name);
  const [autosave, setAutosave] = useState<{ savedAt: number; song: typeof studio.song } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const sampleTracks = studio.song.tracks.filter(track => track.voice === "sample").length;

  useEffect(() => {
    setProjects(loadProjects());
    setAutosave(loadAutosave());
  }, []);

  useEffect(() => {
    setProjectName(studio.song.name);
  }, [studio.song.name]);

  const snapshot = () => ({ ...studio.song, name: projectName.trim() || "Untitled song" });

  const missingSampleWarnings = (song: typeof studio.song) =>
    song.tracks
      .filter(track => track.voice === "sample" && track.sampleId && !studio.samples.some(asset => asset.id === track.sampleId))
      .map(track => `“${track.name}” points at sample audio that is not in this session. Re-import its WAV in the Sampler.`);

  const save = (asNew = false) => {
    try {
      const project = saveProject(snapshot(), asNew ? {} : { id: currentId ?? undefined, name: projectName });
      setCurrentId(project.id);
      setProjects(loadProjects());
      if (projectName.trim() && projectName.trim() !== studio.song.name) studio.edit(s => ({ ...s, name: projectName.trim() }));
      toast.success(asNew ? `Saved “${project.name}” as a new project.` : `Saved “${project.name}”.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project could not be saved.");
    }
  };

  const load = (project: StoredProject) => {
    studio.loadSong(project.song);
    setCurrentId(project.id);
    setProjectName(project.name);
    setImportWarnings(missingSampleWarnings(project.song));
    toast.success(`Loaded “${project.name}”.`);
  };

  const remove = (project: StoredProject) => {
    try {
      deleteProject(project.id);
      setProjects(loadProjects());
      if (currentId === project.id) setCurrentId(null);
      setPendingDelete(null);
      toast.success(`Deleted “${project.name}”.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project could not be deleted.");
    }
  };

  const exportProject = async () => {
    try {
      await saveBlob(new Blob([serializeProject(snapshot(), studio.samples)], { type: "application/json" }), projectFilename(projectName || studio.song.name));
      toast.success("Project JSON ready. Sample audio is listed but not embedded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project could not be exported.");
    }
  };

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Project files must be smaller than 2 MB.");
      const parsed = parseProjectJson(await file.text());
      studio.loadSong(parsed.song);
      setCurrentId(null);
      setProjectName(parsed.song.name);
      setImportWarnings([...parsed.warnings, ...missingSampleWarnings(parsed.song)]);
      setProjects(loadProjects());
      toast.success(`Imported “${parsed.song.name}”${parsed.version < 4 ? ` from v${parsed.version}` : ""}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project file could not be imported.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const share = async () => {
    try {
      const shareLocation = isNative
        ? { origin: "https://ones-is-lord.github.io", pathname: "/chipboy-studio/" }
        : window.location;
      const url = buildShareUrl(snapshot(), shareLocation);
      if (url.length > 8_000) throw new Error("This song is too large for a share link. Export the JSON file instead.");
      setShareUrl(url);
      setCopied(false);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Share link copied.");
      } catch {
        toast.success("Share link ready below.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "A share link could not be created.");
    }
  };

  const shareExternally = async () => {
    try {
      if (!(await shareLink(shareUrl))) throw new Error("Sharing is not available here.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The link could not be shared.");
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied.");
    } catch {
      toast.error("Copy failed. Select the link and copy it manually.");
    }
  };

  const restoreAutosave = () => {
    if (!autosave) return;
    studio.loadSong(autosave.song);
    setAutosave(null);
    setCurrentId(null);
    toast.success("Autosaved song restored. Save it to a project slot to keep it.");
  };

  return (
    <div className="space-y-5">
      <div className="section-heading flex flex-wrap items-center justify-between gap-3">
        <span>06 / PROJECT VAULT</span>
        <span className="text-[9px]">{projects.length} SAVED · AUTOSAVE ON</span>
      </div>

      {autosave && (
        <div className="game-screen flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" role="status">
          <div className="flex items-center gap-3">
            <Clock3 size={18} />
            <div>
              <p className="font-pixel text-sm">AUTOSAVE FOUND</p>
              <p className="mt-1 text-[10px]">{dateLabel(autosave.savedAt)} · {autosave.song.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={restoreAutosave} className="hardware-button h-8 px-3 text-[9px]"><RotateCcw size={12} /> RESTORE</Button>
            <Button onClick={() => { clearAutosave(); setAutosave(null); toast.success("Autosave discarded."); }} className="hardware-button h-8 px-3 text-[9px]">DISCARD</Button>
          </div>
        </div>
      )}

      <section className="editor-panel rounded-xl p-4 sm:p-5" aria-labelledby="project-save-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="cartridge-badge"><PixelArt type="cartridge" className="h-9 w-9" /></div>
            <div>
              <h2 id="project-save-heading" className="section-heading">CURRENT CARTRIDGE</h2>
              <p className="mt-1 text-[10px] text-[var(--case-muted)]">{studio.song.barCount} bars · {studio.song.tracks.length} channels · {studio.song.bpm} BPM · {studio.samples.length} samples in session</p>
            </div>
          </div>
          <span className={cn("max-w-52 truncate rounded border border-[var(--case-border)] px-2 py-1 text-[9px] font-bold", currentId ? "text-[var(--berry)]" : "text-[var(--case-muted)]")}>
            {currentId ? `SLOT · ${projects.find(project => project.id === currentId)?.name ?? "SAVED"}` : "UNSAVED SESSION"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-52 flex-1 text-[9px] font-bold">
            PROJECT NAME
            <input
              value={projectName}
              onChange={event => setProjectName(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter") save(); }}
              maxLength={80}
              placeholder="Name this cartridge"
              className="mt-1 block w-full rounded border border-[var(--case-border)] bg-[var(--case-light)] px-3 py-2 text-sm font-bold outline-none"
            />
          </label>
          <Button onClick={() => save()} className="play-button h-10 px-4 text-[10px]"><Save size={14} /> SAVE</Button>
          <Button onClick={() => save(true)} className="hardware-button h-10 px-3 text-[10px]"><Plus size={14} /> SAVE AS NEW</Button>
          <Button onClick={exportProject} className="hardware-button h-10 px-3 text-[10px]"><Download size={14} /> EXPORT JSON</Button>
          <Button onClick={() => fileInput.current?.click()} className="hardware-button h-10 px-3 text-[10px]"><Upload size={14} /> IMPORT</Button>
          <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={event => void importProject(event.target.files?.[0])} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--case-border)] bg-[var(--case-light)] p-3">
          <Share2 size={14} />
          <span className="text-[9px] font-bold">SHARE SONG LINK</span>
          <Button onClick={() => void share()} className="hardware-button h-8 px-3 text-[9px]">CREATE LINK</Button>
          {shareUrl && (
            <>
              <input readOnly value={shareUrl} aria-label="Shareable song link" onFocus={event => event.currentTarget.select()} className="min-w-48 flex-1 rounded border bg-white/60 px-2 py-1 text-[9px]" />
              <Button onClick={() => void copyShare()} className="hardware-button h-8 px-2 text-[9px]">{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "COPIED" : "COPY"}</Button>
              {isNative && <Button onClick={() => void shareExternally()} className="play-button h-8 px-2 text-[9px]"><Share2 size={12} /> SHARE</Button>}
            </>
          )}
        </div>

        <p className="mt-3 text-[9px] leading-relaxed text-[var(--case-muted)]">
          Local saves keep the song arrangement, patterns and mixer settings. Browser storage cannot hold raw audio, so sample channels need their WAV files re-imported after loading on another device. Share links contain song data only.
        </p>
        {sampleTracks > 0 && <p className="mt-2 rounded border border-[var(--berry)]/30 bg-[#f3e4e8] px-3 py-2 text-[9px] font-bold text-[var(--berry-dark)]">{sampleTracks} sample channel{sampleTracks > 1 ? "s" : ""} in this song · export sample WAVs from the Sampler before switching devices.</p>}
        {importWarnings.length > 0 && (
          <ul className="mt-3 space-y-1 rounded border border-[var(--berry)]/30 bg-[#f3e4e8] p-3 text-[9px] text-[var(--berry-dark)]" aria-live="polite">
            {importWarnings.map((warning, index) => <li key={index}>• {warning}</li>)}
          </ul>
        )}
      </section>

      <section className="editor-panel rounded-xl p-4 sm:p-5" aria-labelledby="project-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="project-list-heading" className="section-heading flex items-center gap-2"><FolderOpen size={14} /> SAVED CARTRIDGES</h2>
          <span className="text-[9px] text-[var(--case-muted)]">MAX 30 SLOTS · NEWEST FIRST</span>
        </div>

        {projects.length === 0 ? (
          <div className="game-screen flex min-h-52 items-center justify-center rounded-xl p-8 text-center">
            <div>
              <HardDrive className="mx-auto mb-4 h-10 w-10" />
              <p className="font-pixel text-xl">NO CARTRIDGES YET.</p>
              <p className="mt-3 text-xs">Save the current song to create your first project slot.</p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {projects.map(project => (
              <li key={project.id} className={cn("chip-cartridge flex flex-col gap-3 p-4", currentId === project.id && "ring-2 ring-[var(--berry)]")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-pixel text-sm">{project.name}</h3>
                    <p className="mt-1 text-[9px] text-[var(--case-muted)]">{project.song.tracks.length} channels · {project.song.barCount} bars · {project.song.bpm} BPM</p>
                    <p className="mt-1 text-[9px] text-[var(--case-muted)]">Updated {dateLabel(project.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1"><Music2 size={14} /><FileJson size={14} /></div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button onClick={() => load(project)} className="hardware-button h-8 flex-1 px-2 text-[9px]">LOAD</Button>
                  <Button onClick={() => { setCurrentId(project.id); setProjectName(project.name); toast.success(`“${project.name}” selected. Save to overwrite.`); }} className="hardware-button h-8 px-2 text-[9px]">SELECT</Button>
                  {pendingDelete === project.id ? (
                    <>
                      <Button onClick={() => remove(project)} className="play-button h-8 px-2 text-[9px]">CONFIRM</Button>
                      <Button onClick={() => setPendingDelete(null)} className="hardware-button h-8 px-2 text-[9px]">CANCEL</Button>
                    </>
                  ) : (
                    <Button aria-label={`Delete ${project.name}`} onClick={() => setPendingDelete(project.id)} className="hardware-button h-8 px-2 text-[9px]"><Trash2 size={12} /></Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="px-1 text-[9px] leading-relaxed text-[var(--case-muted)]">
        Projects live in this browser. Export JSON before clearing site data, changing browsers, or moving to another computer. Import accepts Chipboy Studio v3, v4 and v5 files.
      </p>
    </div>
  );
}
