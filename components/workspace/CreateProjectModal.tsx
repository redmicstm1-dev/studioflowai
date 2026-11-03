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
    setStatusMessage("Authenticating session...");

    try {
      // 1. Get current authenticated user (bypasses RLS policy violations)
      const { data: { user } } = await supabase.auth.getUser();

      setStatusMessage("Initializing project workspace...");

      // 2. Insert Project into Database with user_id if available
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || "Autonomous screenplay workspace.",
            ...(user ? { user_id: user.id } : {}), // Attach user ID if logged in
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;
      const projectId = projectData.id;

      // 3. Insert Default Story Record linked to Project
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .insert([
          {
            project_id: projectId,
            title: title.trim(),
            premise: description.trim(),
            ...(user ? { user_id: user.id } : {}),
          },
        ])
        .select()
        .single();

      if (storyError) {
        console.warn("Story table sync warning:", storyError);
      }
      const storyId = storyData?.id || projectId;

      // 4. Process & Sync File Upload if attached during creation
      if (selectedFile) {
        setStatusMessage("Extracting text and running parser...");
        const rawText = await extractTextFromFile(selectedFile);
        
        setStatusMessage("Seeding screenplay & workshops...");
        await processAndSyncScriptImport(projectId, storyId, selectedFile, rawText);
      }

      setStatusMessage("Finalizing synchronization...");

      // 5. Reset Local State & Close Modal
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      onClose();

      // 6. HARD REFRESH & INSTANT NAVIGATION
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
      <div 
        className="w-full max-w-lg rounded-[18px] p-6 flex flex-col gap-5 my-auto max-h-[92vh] overflow-y-auto shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #1d1d1a, #171715)",
          border: "1px solid var(--line)"
        }}
      >
        <div className="flex items-center justify-between border-b border-[#2b2a27] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Create StudioFlow Project</h2>
            <p className="text-xs muted mt-0.5">Autonomous screenplay ingestion & creative workshop</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#a5a39c] hover:text-white text-sm font-semibold p-1.5 rounded-xl hover:bg-[#29251f] transition-colors"
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
            <label className="mini-label">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cyberpunk Chase Pilot"
              required
              className="px-4 py-3 bg-[#111110] border border-[#2b2a27] rounded-[11px] text-white text-sm focus:outline-none focus:border-[#f08a4b] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="mini-label">Description / Premise</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief narrative overview..."
              rows={2}
              className="px-4 py-3 bg-[#111110] border border-[#2b2a27] rounded-[11px] text-white text-sm focus:outline-none focus:border-[#f08a4b] transition-colors resize-none"
            />
          </div>

          {/* SCRIPT UPLOAD SECTION */}
          <div className="flex flex-col gap-1.5">
            <label className="mini-label">
              Upload Screenplay <span className="text-[#a5a39c] font-normal lowercase">(Optional)</span>
            </label>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#2b2a27] bg-[#111110]/50 hover:border-[#f08a4b]/50 rounded-[11px] cursor-pointer transition-all group">
              <span className="text-xs font-medium text-[#a5a39c] group-hover:text-[#f08a4b] transition-colors text-center truncate max-w-full px-2">
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b2a27]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ghost-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="action-button flex items-center justify-center min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#20150f]/20 border-t-[#20150f] rounded-full animate-spin" />
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