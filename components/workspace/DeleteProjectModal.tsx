"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectDeleted: (projectId: string) => void;
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
    if (!supabase || !project?.id) return;

    setLoading(true);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    setLoading(false);

    if (error) {
      onError("Failed to delete project: " + error.message);
      return;
    }

    onProjectDeleted(project.id);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl border-red-500/20">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <div>
              <div className="mini-label mb-1 text-red-400">WARNING</div>
              <h2 id="delete-title" className="text-xl font-semibold">
                Delete project?
              </h2>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-[#999] transition hover:bg-[#2b2a27]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mb-6 text-sm leading-6 text-[#aaa59b]">
          Are you sure you want to delete <strong className="text-white">"{project.title}"</strong>? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Delete project
          </Button>
        </div>
      </div>
    </div>
  );
}