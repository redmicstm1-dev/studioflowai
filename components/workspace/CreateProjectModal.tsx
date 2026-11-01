"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Inputs from "@/components/ui/Inputs";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";

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
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !supabase) return;

    setLoading(true);

    const newProject: Project = {
      user_id: userId,
      title: projectName.trim(),
      type: "New creative project",
      progress: 0,
      color: "#f08a4b",
      tag: "PROJECT",
    };

    const { data, error } = await supabase
      .from("projects")
      .insert([newProject])
      .select()
      .single();

    setLoading(false);

    if (error) {
      onError("Failed to create project in database.");
      return;
    }

    if (data) {
      onProjectCreated(data);
      setProjectName("");
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="panel w-full max-w-md p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mini-label mb-2">NEW BEGINNINGS</div>
            <h2 id="create-title" className="text-xl font-semibold">
              What are we making?
            </h2>
            <p className="mt-1 text-sm text-[#9a968d]">Every project starts somewhere.</p>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-[#999] transition hover:bg-[#2b2a27]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Inputs
            label="Project name"
            id="project-name"
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="A story, a film, an idea…"
            required
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
              disabled={!projectName.trim() || loading}
              className="action-button flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} aria-hidden="true" /> Create project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}