"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Upload, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import Inputs from "@/components/ui/Inputs";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import { extractTextFromFile, processAndSyncScriptImport } from "@/lib/parser";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onProjectCreated: (project: Project) => void;
  onError: (msg: string) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  userId,
  onProjectCreated,
  onError,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !supabase) return;

    setLoading(true);
    setStatusText("Initializing project workspace...");

    try {
      // 1. Create Main Project Record
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            owner_id: userId,
            title: projectName.trim(),
            description: scriptFile
              ? `Imported from script: ${scriptFile.name}`
              : "New creative project initialized.",
            project_type: "series",
            status: "development",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (projectError || !projectData) {
        throw new Error(projectError?.message || "Project creation failed.");
      }

      // 2. Initialize Default Story Entry inside Story Studio
      const { data: storyData, error: storyError } = await supabase
        .from("project_stories")
        .insert([
          {
            project_id: projectData.id,
            title: `${projectData.title} - Main Narrative`,
            logline: scriptFile
              ? "Generated from imported script text."
              : "Initial story workstation concept.",
            genre: "Drama",
          },
        ])
        .select()
        .single();

      if (storyError || !storyData) {
        throw new Error("Failed to initialize story workspace.");
      }

      // 3. Extract Script & Auto-Sync across all 4 Workshops (If Script Attached)
      if (scriptFile) {
        setStatusText("Extracting raw screenplay text...");
        const rawText = await extractTextFromFile(scriptFile);

        setStatusText("Syncing data to Story, Shot, Voice & Asset Library...");
        await processAndSyncScriptImport(
          projectData.id,
          storyData.id,
          scriptFile,
          rawText
        );
      }

      setLoading(false);
      onProjectCreated(projectData);
      setProjectName("");
      setScriptFile(null);
      onClose();

      // 4. AUTOMATIC UI REFRESH & INSTANT WORKSPACE REDIRECTION
      router.refresh();
      router.push(`/workspace/projects/${projectData.id}`);
if (!projectData?.id) {
  throw new Error("Project created, but no ID was returned.");
}
    } catch (err: any) {
      setLoading(false);
      onError(err.message || "An unexpected error occurred during project creation.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="panel w-full max-w-lg p-6 shadow-2xl bg-[#181815] my-auto max-h-[92vh] overflow-y-auto">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mini-label mb-2">INTELLIGENT WORKSPACE SETUP</div>
            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
            <p className="mt-1 text-sm text-[#9a968d]">
              Optionally upload a script to automatically extract characters, shots, voices, and assets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#999] transition hover:bg-[#2b2a27]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Inputs
            label="Project name *"
            id="project-name"
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Cyberpunk Chronicles"
            required
          />

          <div>
            <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
              Import Screenplay / Script (Optional)
            </label>
            <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#33322e] bg-[#121210] p-6 cursor-pointer hover:border-[#f2a36f] transition">
              <div className="flex items-center gap-2 text-xs text-[#f2a36f] mb-1">
                <Upload size={16} />{" "}
                {scriptFile ? scriptFile.name : "Click to upload .txt, .fountain, or .pdf"}
              </div>
              <span className="text-[11px] text-[#77746d] text-center">
                StudioFlow will parse and seed data directly across Story Studio, Shot Studio, Voice Studio, and the Asset Library.
              </span>
              <input
                type="file"
                accept=".txt,.fountain,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setScriptFile(e.target.files[0])}
              />
            </label>
          </div>

          {loading && (
            <div className="rounded-xl bg-[#1c2b23] border border-[#3c5b4b] p-3 text-xs text-[#a7dfc0] flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a7dfc0] border-t-transparent" />
              {statusText}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!projectName.trim() || loading}
              className="action-button text-sm"
            >
              {loading ? "Processing..." : "Create & Build Workspace"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
