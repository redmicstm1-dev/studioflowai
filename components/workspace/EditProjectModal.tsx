"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Inputs from "@/components/ui/Inputs";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (updatedProject: Project) => void;
  onError: (msg: string) => void;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onError,
}: EditProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setDescription(project.description || "");
    }
  }, [project]);

  if (!isOpen || !project) return null;

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !supabase || !project?.id) return;

    setLoading(true);

    const updates = {
      title: title.trim(),
      description: description.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", project.id)
      .select()
      .single();

    setLoading(false);

    if (error) {
      onError("Failed to update project: " + error.message);
      return;
    }

    if (data) {
      onProjectUpdated(data);
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mini-label mb-2">PROJECT SETTINGS</div>
            <h2 id="edit-title" className="text-xl font-semibold">
              Edit project
            </h2>
            <p className="mt-1 text-sm text-[#9a968d]">Update your title and description.</p>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-[#999] transition hover:bg-[#2b2a27]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          <Inputs
            label="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Inputs
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
              type="submit"
              loading={loading}
              disabled={!title.trim() || loading}
              className="action-button flex items-center gap-2 text-sm"
            >
              <Check size={16} aria-hidden="true" /> Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}