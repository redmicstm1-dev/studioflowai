"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Optional depending on your auth schema
}

export default function CreateProjectModal({ isOpen, onClose, userId }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Project title is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Insert new project into Supabase
      const { data: projectData, error: projectError } = await supabase
        .from("projects") // Adjust table name if your schema uses "stories" or "projects"
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            user_id: userId || null,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Clear form state
      setTitle("");
      setDescription("");

      // 3. Close the modal
      onClose();

      // 4. Instantly refresh server components, project counts, and stats cards in real time!
      router.refresh();
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setErrorMessage(err.message || "An error occurred while creating the project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Create New Project</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm font-medium px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-zinc-400">
          Set up your workspace to begin script ingestion, scene breakdowns, and media generation.
        </p>

        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-lg">
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
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Description / Premise</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of your narrative or mini-ecommerce workspace..."
              rows={3}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}