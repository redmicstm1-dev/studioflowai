"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  Boxes,
  Clapperboard,
  FolderOpen,
  Sparkles,
  Waves,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import EditProjectModal from "@/components/workspace/EditProjectModal";
import DeleteProjectModal from "@/components/workspace/DeleteProjectModal";
import ProjectList from "@/components/workspace/ProjectList";
import { Project } from "@/types/project";

const tools = [
  { name: "Story Studio", desc: "Ideas, scripts & characters", icon: BookOpen, color: "#f2a36f", route: "/workspace/story-studio" },
  { name: "Shot Studio", desc: "Scenes, shots & storyboards", icon: Clapperboard, color: "#b5a1ff", route: "/workspace/shot-studio" },
  { name: "Voice Studio", desc: "Character voices & dialogue", icon: AudioLines, color: "#7fc7b2", route: "/workspace/voice-studio" },
  { name: "Asset Library", desc: "References & continuity", icon: Boxes, color: "#e4c66e", route: "/workspace/asset-library" },
];

export default function WorkspaceOverviewPage() {
  const router = useRouter();
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Modals state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const [projectList, setProjectList] = useState<Project[]>([]);
  const [search] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const fetchProjects = async () => {
      setLoadingProjects(true);
      const { data: dbProjects, error } = await supabase!
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (mounted) {
        if (!error && dbProjects) {
          setProjectList(dbProjects);
        }
        setLoadingProjects(false);
      }
    };

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#aaa69d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7fc7a8]" /> YOUR WORKSPACE
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Dashboard Overview<span className="accent">.</span>
          </h1>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {/* Dynamic Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-[#aaa69e]">Active projects</span>
            <FolderOpen size={17} className="text-[#e7a170]" aria-hidden="true" />
          </div>
          <div className="stat-number">
            {loadingProjects ? "..." : projectList.length.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-[#aaa69e]">Production elements</span>
            <Clapperboard size={17} className="text-[#b5a1ff]" aria-hidden="true" />
          </div>
          <div className="stat-number">00</div>
        </div>
        <div className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-[#aaa69e]">Voice profiles</span>
            <Waves size={18} className="text-[#7fc7b2]" aria-hidden="true" />
          </div>
          <div className="stat-number">00</div>
        </div>
      </div>

      <div className="mb-9 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2b2a27] px-5 py-4 md:px-6">
            <div>
              <h2 className="font-semibold">Pick up where you left off</h2>
              <p className="mt-1 text-xs text-[#8f8b83]">Your creative work stored securely in Supabase.</p>
            </div>
          </div>
          <ProjectList
            projects={projectList}
            loading={loadingProjects}
            search={search}
            onSelectProject={(proj) => {
              if (proj.id) {
                router.push(`/workspace/projects/${proj.id}`);
              }
            }}
            onEditProject={(proj) => setEditingProject(proj)}
            onDeleteProject={(proj) => setDeletingProject(proj)}
          />
        </div>

        {/* Toolkit Sub-route Navigation Cards */}
        <div className="panel relative overflow-hidden p-5 md:p-6">
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <span className="mini-label">YOUR CREATIVE TOOLKIT</span>
              <Sparkles size={17} className="accent" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => router.push(tool.route)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#302f2a] bg-[#1b1b18]/80 p-3 text-left transition hover:border-[#51483c] hover:bg-[#23231f]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${tool.color}18`, color: tool.color }}
                  >
                    <tool.icon size={19} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="mt-1 truncate text-[11px] text-[#8e8a82]">{tool.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onProjectUpdated={(updatedProj) => {
          setProjectList(
            projectList.map((p) => (p.id === updatedProj.id ? updatedProj : p))
          );
          setNotice(`"${updatedProj.title}" updated successfully!`);
        }}
        onError={(err) => setNotice(err)}
      />

      <DeleteProjectModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        project={deletingProject}
        onProjectDeleted={(deletedId) => {
          setProjectList(projectList.filter((p) => p.id !== deletedId));
          setNotice("Project deleted successfully.");
        }}
        onError={(err) => setNotice(err)}
      />
    </div>
  );
}