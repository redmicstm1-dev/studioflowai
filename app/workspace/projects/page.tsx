"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  FolderOpen,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { Project } from "@/types/project";
import { ProjectStory } from "@/types/story";

export default function SingleProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const projectId = resolvedParams?.id;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [stories, setStories] = useState<ProjectStory[]>([]);
  const [notice, setNotice] = useState("");

  // Create Story Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryLogline, setNewStoryLogline] = useState("");
  const [newStoryGenre, setNewStoryGenre] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!supabase || !projectId) {
      setNotice("Project identifier missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchProjectDetails = async () => {
      setLoading(true);

      // 1. Fetch Project Record by ID
      const { data: projData, error: projError } = await supabase!
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!mounted) return;

      if (projError || !projData) {
        setNotice(projError ? projError.message : "Project record could not be loaded.");
        setLoading(false);
        return;
      }

      setProject(projData);

      // 2. Fetch Stories linked to this specific Project ID
      const { data: storyData, error: storyError } = await supabase!
        .from("project_stories")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (mounted) {
        if (storyError) {
          console.error("Error fetching stories:", storyError.message);
        } else if (storyData) {
          setStories(storyData);
        }
        setLoading(false);
      }
    };

    fetchProjectDetails();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function handleCreateStory(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !projectId || !newStoryTitle.trim()) return;

    setCreating(true);
    setNotice("");

    const { data, error } = await supabase!
      .from("project_stories")
      .insert([
        {
          project_id: projectId,
          title: newStoryTitle.trim(),
          logline: newStoryLogline.trim(),
          genre: newStoryGenre.trim(),
        },
      ])
      .select()
      .single();

    setCreating(false);

    if (error) {
      setNotice(`Error creating story: ${error.message}`);
      return;
    }

    if (data) {
      setStories([data, ...stories]);
      setNotice(`Story "${data.title}" added to project!`);
      setShowCreateModal(false);
      setNewStoryTitle("");
      setNewStoryLogline("");
      setNewStoryGenre("");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="panel p-10 text-center">
        <h2 className="text-xl font-semibold text-white">Project Workspace Error</h2>
        <p className="mt-2 text-sm text-[#aaa69e]">{notice || "Project record could not be loaded."}</p>
        <Button onClick={() => router.push("/workspace/projects")} className="mt-6 text-sm">
          Return to All Projects
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/workspace/projects")}
        className="mb-6 flex items-center gap-2 text-xs text-[#9a968d] transition hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      {/* Project Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md border border-[#393832] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#e7a170] bg-[#e7a170]/10">
              {project.project_type || "Series"}
            </span>
            <span className="text-xs text-[#8d8981] flex items-center gap-1">
              <Clock size={13} /> {project.status || "Development"}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a5a198]">
              {project.description}
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="action-button flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add Story Concept
        </Button>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {/* Linked Story Workspaces */}
      <div className="mt-10">
        <div className="mb-6 flex items-center justify-between border-b border-[#2b2a27] pb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-[#f2a36f]" /> Linked Story Workspaces ({stories.length})
          </h2>
        </div>

        {stories.length === 0 ? (
          <div className="panel p-10 text-center border-dashed border-[#33322e]">
            <Sparkles size={32} className="mx-auto mb-3 text-[#f2a36f]" />
            <h3 className="text-base font-semibold text-white">No Story Concepts Initialized</h3>
            <p className="mt-1 text-xs text-[#8d8981] max-w-sm mx-auto">
              Create a narrative arc for this project to start building characters and episodes.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 text-sm"
            >
              Initialize First Story
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => (
              <div
                key={story.id}
                onClick={() => router.push(`/workspace/story-studio/${story.id}`)}
                className="panel group relative cursor-pointer p-6 transition hover:border-[#51483c] hover:bg-[#1a1a17]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-md border border-[#393832] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#f2a36f] bg-[#f2a36f]/10">
                    {story.genre || "General"}
                  </span>
                  <span className="text-[11px] text-[#77746d]">
                    Story Workspace
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white transition group-hover:text-[#f2a36f]">
                  {story.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#9a968d]">
                  {story.logline || "No logline defined yet. Click to open workstation."}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-[#252421] pt-4 text-xs text-[#8d8981]">
                  <span className="flex items-center gap-1.5 text-[#f2a36f]">
                    <FolderOpen size={14} /> Launch Workstation
                  </span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1 text-[#8d8981]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for adding a story */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-lg font-semibold text-white">Add Story Concept</h3>
            <p className="mt-1 text-xs text-[#8d8981]">
              Attach a new story arc to <span className="text-white font-medium">{project.title}</span>.
            </p>

            <form onSubmit={handleCreateStory} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
                  Story Title *
                </label>
                <input
                  type="text"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  placeholder="e.g., Act I: Awakening"
                  required
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none placeholder:text-[#666]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
                  Genre
                </label>
                <input
                  type="text"
                  value={newStoryGenre}
                  onChange={(e) => setNewStoryGenre(e.target.value)}
                  placeholder="e.g., Sci-Fi Thriller"
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none placeholder:text-[#666]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
                  Logline
                </label>
                <textarea
                  value={newStoryLogline}
                  onChange={(e) => setNewStoryLogline(e.target.value)}
                  placeholder="One sentence summary..."
                  rows={3}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none placeholder:text-[#666] resize-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} size="sm" className="action-button">
                  {creating ? "Creating..." : "Save Story"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}