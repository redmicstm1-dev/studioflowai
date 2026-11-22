"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Sparkles,
  Plus,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clapperboard,
  AudioLines,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import {
  AssetDraft,
  ProjectCharacter,
  ProjectCharacterContinuity,
  ProjectEpisode,
  ProjectScript,
  ProjectShot,
} from "@/types/story";
import {
  extractAssetsFromStoryContext,
  fetchStoryAssetContext,
  saveAssetsToSupabase,
} from "@/lib/asset-studio";

interface StoryOption {
  id: string;
  project_id: string;
  title: string;
}

export default function AssetLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId") || "";
  const queryStoryId = searchParams.get("storyId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId);
  const [selectedStoryId, setSelectedStoryId] = useState(queryStoryId);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [storyTitle, setStoryTitle] = useState("Story Workspace");
  const [episodes, setEpisodes] = useState<ProjectEpisode[]>([]);
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [continuity, setContinuity] = useState<ProjectCharacterContinuity[]>([]);
  const [shots, setShots] = useState<ProjectShot[]>([]);
  const [assets, setAssets] = useState<AssetDraft[]>([]);

  const [loadingContext, setLoadingContext] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Load projects and stories
  useEffect(() => {
    let mounted = true;

    async function loadProjectsAndStories() {
      if (!supabase) {
        setLoadingContext(false);
        return;
      }

      const [projRes, storyRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("project_stories").select("id, project_id, title").order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      const loadedProjects = (projRes.data || []) as Project[];
      const loadedStories = (storyRes.data || []) as StoryOption[];

      setProjects(loadedProjects);
      setStories(loadedStories);

      const initialStory =
        loadedStories.find((s) => s.id === queryStoryId) ||
        loadedStories.find((s) => s.project_id === queryProjectId) ||
        loadedStories[0];

      if (initialStory) {
        setSelectedProjectId(initialStory.project_id);
        setSelectedStoryId(initialStory.id);
      } else if (loadedProjects[0]?.id) {
        setSelectedProjectId(loadedProjects[0].id);
        setLoadingContext(false);
      } else {
        setLoadingContext(false);
      }
    }

    loadProjectsAndStories();
    return () => {
      mounted = false;
    };
  }, [queryProjectId, queryStoryId]);

  // Automatically load & hydrate saved assets and story context from Supabase
  const hydrateStoryAssets = useCallback(async (storyId: string) => {
    if (!storyId) {
      setAssets([]);
      setLoadingContext(false);
      return;
    }

    setLoadingContext(true);
    setStatusMessage(null);

    try {
      const ctx = await fetchStoryAssetContext(storyId);
      setStoryTitle(ctx.storyTitle);
      setEpisodes(ctx.episodes);
      setScripts(ctx.scripts);
      setCharacters(ctx.characters);
      setContinuity(ctx.continuity);
      setShots(ctx.shots);

      setAssets(
        ctx.assets.map((a) => ({
          project_id: a.project_id,
          story_id: a.story_id,
          category: a.category || "prop",
          name: a.name,
          linked_entity: a.linked_entity || "",
          episode_number: a.episode_number || 1,
          description: a.description || "",
          continuity_notes: a.continuity_notes || "",
          reference_url_or_prompt: a.reference_url_or_prompt || "",
          status: a.status || "ready",
        }))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load assets from database.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStoryId) {
      hydrateStoryAssets(selectedStoryId);
    }
  }, [selectedStoryId, hydrateStoryAssets]);

  const handleProjectChange = (nextProjectId: string) => {
    setSelectedProjectId(nextProjectId);
    const matchingStory = stories.find((s) => s.project_id === nextProjectId);
    setSelectedStoryId(matchingStory ? matchingStory.id : "");
    setCategoryFilter("all");
  };

  const handleExtractAssets = () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a project and story first." });
      return;
    }

    const extracted = extractAssetsFromStoryContext({
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storyTitle,
      episodes,
      scripts,
      characters,
      continuity,
      shots,
      existingAssets: assets,
    });

    setAssets(extracted);
    setStatusMessage({
      type: "success",
      text: `Synced ${extracted.length} production assets while preserving manual edits. Click "Save to DB" to persist.`,
    });
  };

  const handleAddAsset = () => {
    if (!selectedStoryId || !selectedProjectId) return;

    const nextCategory = categoryFilter !== "all" ? categoryFilter : "prop";
    setAssets((prev) => [
      ...prev,
      {
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        category: nextCategory,
        name: `New ${nextCategory.charAt(0).toUpperCase() + nextCategory.slice(1)} Asset`,
        linked_entity: characters[0]?.name || storyTitle,
        episode_number: episodes[0]?.episode_number || 1,
        description: "",
        continuity_notes: "",
        reference_url_or_prompt: "",
        status: "ready",
      },
    ]);
  };

  const handleUpdateAsset = (index: number, patch: Partial<AssetDraft>) => {
    setAssets((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleDeleteAsset = (index: number) => {
    setAssets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAssets = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a story workspace before saving." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const saved = await saveAssetsToSupabase(selectedProjectId, selectedStoryId, assets);
      setAssets(
        saved.map((a) => ({
          project_id: a.project_id,
          story_id: a.story_id,
          category: a.category || "prop",
          name: a.name,
          linked_entity: a.linked_entity || "",
          episode_number: a.episode_number || 1,
          description: a.description || "",
          continuity_notes: a.continuity_notes || "",
          reference_url_or_prompt: a.reference_url_or_prompt || "",
          status: a.status || "ready",
        }))
      );
      setStatusMessage({
        type: "success",
        text: `Saved ${saved.length} asset${saved.length === 1 ? "" : "s"} to Supabase.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save assets to database.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const filteredStories = selectedProjectId
    ? stories.filter((s) => s.project_id === selectedProjectId)
    : stories;

  const visibleAssetsWithIndex = assets
    .map((asset, idx) => ({ asset, idx }))
    .filter(({ asset }) =>
      categoryFilter === "all" ? true : asset.category.toLowerCase() === categoryFilter.toLowerCase()
    );

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#e4c66e]">
            <Boxes size={15} /> ASSETS STUDIO
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white break-words">
            References & Continuity<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198] break-words">
            Catalog locations, props, wardrobe, and visual references with automatic database loading, inline editing, and persistent saves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleExtractAssets}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Sparkles size={16} className="text-[#e4c66e]" />
            <span>Extract from Story</span>
          </Button>

          <Button
            type="button"
            onClick={handleAddAsset}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Plus size={16} />
            <span>Add Asset</span>
          </Button>

          <Button
            type="button"
            onClick={handleSaveAssets}
            disabled={saving || !selectedStoryId}
            className="action-button flex items-center gap-2 text-xs sm:text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? "Saving..." : "Save to DB"}</span>
          </Button>
        </div>
      </div>

      {/* Project, Story & Category Filter Bar */}
      <div className="panel mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#e4c66e]"
          >
            {projects.length === 0 && <option value="">No projects found</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id || ""}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Story Workspace
          </label>
          <select
            value={selectedStoryId}
            onChange={(e) => setSelectedStoryId(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#e4c66e]"
          >
            {filteredStories.length === 0 && <option value="">No stories in project</option>}
            {filteredStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Asset Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#e4c66e]"
          >
            <option value="all">All Assets ({assets.length})</option>
            <option value="location">Locations & Sets</option>
            <option value="prop">Props & Accessories</option>
            <option value="wardrobe">Wardrobe & Costume</option>
            <option value="reference">Visual References</option>
          </select>
        </div>

        <div className="flex items-end justify-between lg:justify-end gap-2 min-w-0">
          {selectedStoryId && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/workspace/story-studio/${selectedStoryId}`)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-2 text-xs text-[#f2a36f] hover:border-[#f2a36f]/60 transition"
              >
                <BookOpen size={13} /> Story
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/shot-studio?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-2 text-xs text-[#b5a1ff] hover:border-[#b5a1ff]/60 transition"
              >
                <Clapperboard size={13} /> Shots
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/voice-studio?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-2 text-xs text-[#7fc7b2] hover:border-[#7fc7b2]/60 transition"
              >
                <AudioLines size={13} /> Voice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs sm:text-sm break-words ${
            statusMessage.type === "success"
              ? "border-[#3c5b4b] bg-[#1c2b23] text-[#a7dfc0]"
              : "border-red-500/40 bg-red-950/50 text-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={17} className="shrink-0 text-[#a7dfc0]" />
          ) : (
            <AlertCircle size={17} className="shrink-0 text-red-400" />
          )}
          <span className="break-words">{statusMessage.text}</span>
        </div>
      )}

      {/* Assets Grid */}
      {loadingContext ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#e4c66e]" />
        </div>
      ) : !selectedStoryId ? (
        <div className="panel p-10 text-center border-dashed">
          <Boxes size={30} className="mx-auto mb-3 text-[#e4c66e]" />
          <h3 className="text-lg font-semibold text-white">No Story Workspace Selected</h3>
          <p className="mt-2 text-xs text-[#8d8981] max-w-md mx-auto">
            Select or create a project story first to manage production assets and continuity notes.
          </p>
        </div>
      ) : visibleAssetsWithIndex.length === 0 ? (
        <div className="panel p-10 text-center border-dashed">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4c66e]/15 text-[#e4c66e]">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-semibold text-white">No Assets in This View Yet</h3>
          <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
            Click <span className="text-white font-medium">Extract from Story</span> to pull locations, props, wardrobe, and references automatically, or click <span className="text-white font-medium">Add Asset</span> to create one manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
          {visibleAssetsWithIndex.map(({ asset, idx }) => (
            <div
              key={`${asset.category}-${asset.name}-${idx}`}
              className="panel p-5 space-y-4 overflow-hidden min-w-0"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#252421] pb-3">
                <select
                  value={asset.category}
                  onChange={(e) => handleUpdateAsset(idx, { category: e.target.value })}
                  className="rounded-lg border border-[#e4c66e]/40 bg-[#e4c66e]/10 px-2.5 py-1 text-xs font-semibold text-[#e4c66e] outline-none"
                >
                  <option value="location">Location / Set</option>
                  <option value="prop">Prop / Accessory</option>
                  <option value="wardrobe">Wardrobe / Costume</option>
                  <option value="reference">Visual Reference</option>
                </select>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={asset.status}
                    onChange={(e) => handleUpdateAsset(idx, { status: e.target.value })}
                    className="rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1 text-xs text-stone-200 outline-none focus:border-[#e4c66e]"
                  >
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="locked">Locked</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(idx)}
                    aria-label={`Delete ${asset.name}`}
                    className="rounded-lg p-1.5 text-[#8d8981] hover:bg-red-950/50 hover:text-red-300 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                    Asset Name
                  </label>
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(e) => handleUpdateAsset(idx, { name: e.target.value })}
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#e4c66e] break-words"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                    Linked Character / Scene
                  </label>
                  <input
                    type="text"
                    value={asset.linked_entity}
                    onChange={(e) => handleUpdateAsset(idx, { linked_entity: e.target.value })}
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#e4c66e] break-words"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={asset.description}
                  onChange={(e) => handleUpdateAsset(idx, { description: e.target.value })}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#e4c66e] break-words"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Continuity & Placement Notes
                </label>
                <input
                  type="text"
                  value={asset.continuity_notes}
                  onChange={(e) => handleUpdateAsset(idx, { continuity_notes: e.target.value })}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#f2a36f] outline-none focus:border-[#e4c66e] break-words"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Reference URL or Visual Prompt
                </label>
                <textarea
                  rows={2}
                  value={asset.reference_url_or_prompt}
                  onChange={(e) =>
                    handleUpdateAsset(idx, { reference_url_or_prompt: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] p-2.5 text-xs text-stone-200 outline-none focus:border-[#e4c66e] break-words resize-y"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}