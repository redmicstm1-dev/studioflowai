"use client";

import { FileText, Film, Pencil, Trash2 } from "lucide-react";
import { Project } from "@/types/project";

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  search: string;
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export default function ProjectList({
  projects,
  loading = false,
  search,
  onSelectProject,
  onEditProject,
  onDeleteProject,
}: ProjectListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-[#2b2a27]">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex animate-pulse items-center gap-4 px-5 py-4 md:px-6">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-[#23221e]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-[#23221e]" />
              <div className="h-3 w-1/2 rounded bg-[#1c1b18]" />
              <div className="h-1 w-full max-w-[260px] rounded bg-[#1c1b18]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filtered = projects.filter((p) =>
    `${p.title} ${p.project_type} ${p.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="divide-y divide-[#2b2a27]">
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-xs text-[#8f8b83]">
          No projects found. Click <strong className="text-[#f08a4b]">Create project</strong> to add your first idea!
        </div>
      ) : (
        filtered.slice(0, 5).map((p, i) => (
          <div
            key={p.id || `${p.title}-${i}`}
            className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[.025] md:px-6"
          >
            <button
              onClick={() => onSelectProject(p)}
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f08a4b]/20 text-[#f08a4b]">
                {p.project_type?.toLowerCase().includes("film") ? (
                  <Film size={21} />
                ) : (
                  <FileText size={21} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.title}</span>
                  <span className="hidden rounded-md border border-[#393832] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#9a968d] sm:inline">
                    {p.project_type}
                  </span>
                </div>
                <div className="truncate text-xs text-[#8d8981]">{p.description}</div>
                <div className="mt-3 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#33322e]">
                  <div
                    className="h-full rounded-full bg-[#f08a4b]"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            </button>

            <div className="hidden text-right sm:block">
              <div className="text-xs text-[#aaa69e]">{p.status}</div>
              <div className="mt-1 text-[10px] text-[#77746d]">
                {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Just now"}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                aria-label="Edit project"
                onClick={() => onEditProject(p)}
                className="rounded-lg p-2 text-[#aaa] transition hover:bg-[#2b2a27] hover:text-white"
              >
                <Pencil size={16} />
              </button>
              <button
                aria-label="Delete project"
                onClick={() => onDeleteProject(p)}
                className="rounded-lg p-2 text-[#aaa] transition hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}