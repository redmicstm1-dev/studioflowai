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
  Video,
  Waves,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import EditProjectModal from "@/components/workspace/EditProjectModal";
import DeleteProjectModal from "@/components/workspace/DeleteProjectModal";
import { Project } from "@/types/project";

const tools = [
  {
    name: "Story Studio",
    desc: "Ideas, scripts & characters",
    icon: BookOpen,
    color: "#f2a36f",
    route: "/workspace/story-studio",
  },
  {
    name: "Shot Studio",
    desc: "Scenes, shots & storyboards",
    icon: Clapperboard,
    color: "#b5a1ff",
    route: "/workspace/shot-studio",
  },
  {
    name: "Voice Studio",
    desc: "Character voices & dialogue",
    icon: AudioLines,
    color: "#7fc7b2",
    route: "/workspace/voice-studio",
  },
  {
    name: "Asset Library",
    desc: "References & continuity",
    icon: Boxes,
    color: "#e4c66e",
    route: "/workspace/asset-library",
  },
  {
    name: "Video Studio",
    desc: "Multi-ratio timeline & MP4 render",
    icon: Video,
    color: "#f08a4b",
    route: "/workspace/video-studio",
  },
];

async function countTableRows(tableName: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });
  if (error || typeof count !== "number") return 0;
  return count;
}

export default function WorkspaceOverviewPage() {
  const router = useRouter();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Modals state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const [projectList, setProjectList] = useState<Project[]>([]);
  const [productionElementsCount, setProductionElementsCount] = useState(0);
  const [voiceProfilesCount, setVoiceProfilesCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoadingProjects(false);
      setLoadingMetrics(false);
      return;
    }

    let mounted = true;

    const fetchOverviewData = async () => {
      setLoadingProjects(true);
      setLoadingMetrics(true);

      const [projectsRes, shotsCount, assetsCount, clipsCount, voicesCount] =
        await Promise.all([
          supabase!
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false }),
          countTableRows("project_shots"),
          countTableRows("project_assets"),
          countTableRows("project_video_clips"),
          countTableRows("project_voices"),
        ]);

      if (!mounted) return;

      if (!projectsRes.error && projectsRes.data) {
        setProjectList(projectsRes.data);
      }
      setProductionElementsCount(shotsCount + assetsCount + clipsCount);
      setVoiceProfilesCount(voicesCount);

      setLoadingProjects(false);
      setLoadingMetrics(false);
    };

    fetchOverviewData();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#aaa69d]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7fc7a8]" />{" "}
            <span className="truncate">YOUR WORKSPACE</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] break-words">
            Dashboard Overview<span className="accent">.</span>
          </h1>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0] break-words">
          {notice}
        </div>
      )}

      {/* Dynamic Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="panel min-w-0 p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-[#aaa69e]">Active projects</span>
            <FolderOpen size={17} className="shrink-0 text-[#e7a170]" aria-hidden="true" />
          </div>
          <div className="stat-number truncate">
            {loadingProjects ? "..." : projectList.length.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="panel min-w-0 p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-[#aaa69e]">Production elements</span>
            <Clapperboard size={17} className="shrink-0 text-[#b5a1ff]" aria-hidden="true" />
          </div>
          <div className="stat-number truncate">
            {loadingMetrics
              ? "..."
              : productionElementsCount.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="panel min-w-0 p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-[#aaa69e]">Voice profiles</span>
            <Waves size={18} className="shrink-0 text-[#7fc7b2]" aria-hidden="true" />
          </div>
          <div className="stat-number truncate">
            {loadingMetrics ? "..." : voiceProfilesCount.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Toolkit Sub-route Navigation Cards */}
      <div className="mb-9 panel relative overflow-hidden p-5 md:p-6">
        <div className="relative min-w-0">
          <div className="mb-5 flex items-center justify-between gap-2">
            <span className="mini-label truncate">YOUR CREATIVE TOOLKIT</span>
            <Sparkles size={17} className="accent shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => router.push(tool.route)}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#302f2a] bg-[#1b1b18]/80 p-3 text-left transition hover:border-[#51483c] hover:bg-[#23231f]"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${tool.color}18`, color: tool.color }}
                >
                  <tool.icon size={19} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{tool.name}</div>
                  <div className="mt-1 truncate text-[11px] text-[#8e8a82]">
                    {tool.desc}
                  </div>
                </div>
              </button>
            ))}
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