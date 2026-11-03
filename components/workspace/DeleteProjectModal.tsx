"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: { id: string; title: string } | null;
  onProjectDeleted: (deletedId: string) => void;
  onError: (msg: string) => void;
}

export default function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  onProjectDeleted,
  onError,
}: DeleteProjectModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !project) return null;

  async function handleDelete() {
    if (!supabase) return;

    setLoading(true);

    // Delete the project from Supabase
    // Note: Ensure your Supabase foreign keys have ON DELETE CASCADE 
    // so related story workstations, assets, and characters clear automatically.
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    setLoading(false);

    if (error) {
      onError(`Failed to delete project: ${error.message}`);
    } else {
      onProjectDeleted(project.id);
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl bg-[#181815]">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Delete Project</h2>
              <p className="text-xs text-[#9a968d]">This action cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#999] transition hover:bg-[#2b2a27]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#aaa69e] leading-relaxed mb-6">
          Are you sure you want to delete <span className="font-semibold text-white">"{project.title}"</span>? All associated story workstations, scripts, characters, and assets will be permanently removed.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded-xl transition"
          >
            {loading ? "Deleting..." : "Yes, Delete Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}