"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FolderOpen, Plus, Search, Sparkles, Layers, ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { Project } from "@/types/project";
import { ProjectStory } from "@/types/story";

export default function StoryStudioLibraryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<(ProjectStory & { project_title?: string })[]>([]);
  
  const [search, setSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
  const [notice, setNotice] = useState("");

  // Create Story Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryLogline, setNewStoryLogline] = useState("");
  const [newStoryGenre, setNewStoryGenre] = useState("");
  const [newStoryProjectId, setNewStoryProjectId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch user projects
      const { data: projData, error: projError } = await supabase!
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (projError) {
        setNotice("Failed to load projects.");
        setLoading(false);
        return;
      }

      setProjects(projData || []);
      if (projData && projData.length > 0) {
        setNewStoryProjectId(projData[0].id);
      }

      // 2. Fetch all stories across projects
      const { data: storyData, error: storyError } = await supabase!
        .from("project_stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (!storyError && storyData) {
        // Map project title to each story for easy rendering
        const projMap = new Map(projData?.map((p) => [p.id, p.title]) || []);
        const enrichedStories = storyData.map((story) => ({
          ...story,
          project_title: projMap.get(story.project_id) || "Unknown Project",
        }));
        setStories(enrichedStories);
      }

      setLoading(false);
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateStory(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !newStoryProjectId || !newStoryTitle.trim()) return;

    setCreating(true);
    setNotice("");

    const { data, error } = await supabase!
      .from("project_stories")
      .insert([
        {
          project_id: newStoryProjectId,
          title: newStoryTitle.trim(),
          logline: newStoryLogline.trim(),
          genre: newStoryGenre.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      setNotice(`Error creating story: ${error.message}`);
      setCreating(false);
    } else if (data) {
      const proj = projects.find((p) => p.id === newStoryProjectId);
      const newEntry = {
        ...data,
        project_title: proj?.title || "Unknown Project",
      };
      setStories([newEntry, ...stories]);
      setNotice(`"${data.title}" created successfully!`);
      setShowCreateModal(false);
      setNewStoryTitle("");
      setNewStoryLogline("");
      setNewStoryGenre("");
      setCreating(false);
    }
  }

  // Filter stories based on search query and project filter
  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.title.toLowerCase().includes(search.toLowerCase()) ||
      (story.genre && story.genre.toLowerCase().includes(search.toLowerCase())) ||
      (story.logline && story.logline.toLowerCase().includes(search.toLowerCase()));

    const matchesProject =
      selectedProjectFilter === "all" || story.project_id === selectedProjectFilter;

    return matchesSearch && matchesProject;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#f2a36f]">
            <BookOpen size={15} /> STORY STUDIO LIBRARY
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white">
            Narratives & Concepts<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Manage all storylines, loglines, and structural premises across your active creative projects.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="action-button flex w-fit items-center gap-2 text-sm"
        >
          <Plus size={17} /> New Story
        </Button>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-xl border border-[#33322e] bg-[#191917] px-3 py-2 sm:w-72">
          <Search size={15} className="text-[#8b887f]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories, genres..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-[#77746d] text-white"
          />
        </label>

        <div className="flex items-center gap-2">
          <Layers size={15} className="text-[#8b887f]" />
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="rounded-xl border border-[#33322e] bg-[#191917] px-3 py-2 text-xs text-[#eee9df] outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="panel p-10 text-center border-dashed">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2a36f]/15 text-[#f2a36f]">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-semibold text-white">No stories found</h3>
          <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
            {stories.length === 0
              ? "Get started by creating your first story concept or creating a project."
              : "No stories match your current search or project filter criteria."}
          </p>
          {stories.length === 0 && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 text-sm"
            >
              Create first story
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              onClick={() => router.push(`/workspace/story-studio/${story.id}`)}
              className="panel group relative cursor-pointer p-6 transition hover:border-[#51483c] hover:bg-[#1a1a17]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-md border border-[#393832] px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#f2a36f] bg-[#f2a36f]/10">
                  {story.genre || "General"}
                </span>
                <span className="text-[11px] text-[#77746d] truncate max-w-[140px]">
                  {story.project_title}
                </span>
              </div>

              <h3 className="text-base font-semibold text-white transition group-hover:text-[#f2a36f]">
                {story.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#9a968d]">
                {story.logline || "No logline provided yet. Click to edit and expand storyline details."}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#252421] pt-4 text-xs text-[#8d8981]">
                <span className="flex items-center gap-1.5 text-[#f2a36f]">
                  <FolderOpen size={14} /> Open Workstation
                </span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1 text-[#8d8981]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-lg font-semibold text-white">Create New Story</h3>
            <p className="mt-1 text-xs text-[#8d8981]">
              Initialize a new narrative branch or concept within a project.
            </p>

            <form onSubmit={handleCreateStory} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
                  Target Project *
                </label>
                <select
                  value={newStoryProjectId}
                  onChange={(e) => setNewStoryProjectId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-[#eee9df] outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="A short one-sentence summary of the narrative premise..."
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