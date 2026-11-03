"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { extractTextFromFile, processAndSyncScriptImport } from "@/lib/parser";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename if title is empty
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Project title is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Initializing project workspace...");

    try {
      // 1. Insert Project into Database
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || "Autonomous screenplay workspace.",
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;
      const projectId = projectData.id;

      // 2. Insert Default Story Record linked to Project
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert([
          {
            project_id: projectId,
            title: title.trim(),
            premise: description.trim(),
          },
        ])
        .select()
        .single();

      if (storyError) {
        console.warn("Story table sync warning:", storyError);
      }
      const storyId = storyData?.id || projectId;

      // 3. Process & Sync File Upload if attached during creation
      if (selectedFile) {
        setStatusMessage("Extracting text and running AI/Regex parser...");
        const rawText = await extractTextFromFile(selectedFile);
        
        setStatusMessage("Seeding screenplay, characters & shot workshops...");
        await processAndSyncScriptImport(projectId, storyId, selectedFile, rawText);
      }

      setStatusMessage("Finalizing workspace synchronization...");

      // 4. Reset Local State & Close Modal
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      onClose();

      // 5. HARD REFRESH & INSTANT NAVIGATION
      router.refresh();
      router.push(`/workspace/${projectId}`);
    } catch (err: any) {
      console.error("StudioFlow Creation Error:", err);
      setErrorMessage(err.message || "Failed to complete project creation and script ingestion.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0a0a0c] border border-zinc-800/90 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Create StudioFlow Project</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Autonomous screenplay ingestion & creative workshop</p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm font-semibold p-1.5 rounded-xl hover:bg-zinc-800/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-200 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cyberpunk Chase Pilot"
              required
              className="px-4 py-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Description / Premise</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief narrative overview..."
              rows={2}
              className="px-4 py-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* INLINE SCRIPT UPLOAD SECTION */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Upload Screenplay <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-800 bg-zinc-950/50 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all group">
              <span className="text-xs font-medium text-zinc-300 group-hover:text-indigo-400 transition-colors text-center truncate max-w-full px-2">
                {selectedFile ? `📄 ${selectedFile.name}` : "Click to select .pdf, .docx, .txt, or .fountain file"}
              </span>
              <input 
                type="file" 
                accept=".pdf,.docx,.txt,.fountain" 
                onChange={handleFileSelect} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4.5 py-2.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-xs truncate max-w-[100px]">{statusMessage || "Processing..."}</span>
                </span>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}