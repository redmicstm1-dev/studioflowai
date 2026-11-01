"use client";

import { FileText, Film, MoreHorizontal } from "lucide-react";
import { Project } from "@/types/project";

interface ProjectListProps {
  projects: Project[];
  search: string;
  onSelectProject: (title: string) => void;
}

export default function ProjectList({
  projects,
  search,
  onSelectProject,
}: ProjectListProps) {
  const filtered = projects.filter((p) =>
    `${p.title} ${p.type}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="divide-y divide-[#2b2a27]">
      {filtered.length === 0 ? (
        <div className="px-6 py-8 text-center text-xs text-[#8f8b83]">
          No projects found. Create your first project to get started!
        </div>
      ) : (
        filtered.slice(0, 5).map((p, i) => (
          <button
            key={p.id || `${p.title}-${i}`}
            onClick={() => onSelectProject(p.title)}
            className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[.025] md:px-6"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${p.color}20`, color: p.color }}
            >
              {p.tag === "FILM" ? <Film size={21} /> : <FileText size={21} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="truncate text-sm font-medium">{p.title}</span>
                <span className="hidden rounded-md border border-[#393832] px-1.5 py-0.5 text-[9px] tracking-wider text-[#9a968d] sm:inline">
                  {p.tag}
                </span>
              </div>
              <div className="truncate text-xs text-[#8d8981]">{p.type}</div>
              <div className="mt-3 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#33322e]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.progress}%`, background: p.color }}
                />
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-xs text-[#aaa69e]">{p.progress}%</div>
              <div className="mt-1 text-[10px] text-[#77746d]">
                {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Just now"}
              </div>
            </div>
            <MoreHorizontal
              size={18}
              className="text-[#6e6b64] opacity-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </button>
        ))
      )}
    </div>
  );
}
