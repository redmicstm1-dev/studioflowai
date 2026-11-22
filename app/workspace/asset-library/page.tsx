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
  Image as ImageIcon,
  Wand2,
  Users,
  RefreshCw,
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
  buildCharacterBiblePrompt,
  buildFallbackStoryboardDataUrl,
  extractAssetsFromStoryContext,
  fetchStoryAssetContext,
  generateOneClickImageUrl,
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
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
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

  // Automatically load & hydrate Character Bible, Scenes, and saved Assets from Supabase
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

      const mappedAssets: AssetDraft[] = ctx.assets.map((a) => ({
        project_id: a.project_id,
        story_id: a.story_id,
        category: a.category || "prop",
        name: a.name,
        linked_entity: a.linked_entity || "",
        episode_number: a.episode_number || 1,
        description: a.description || "",
        continuity_notes: a.continuity_notes || "",
        reference_url_or_prompt: a.reference_url_or_prompt || "",
        image_url: a.image_url || "",
        status: a.status || "ready",
      }));

      // Auto-populate from Character Bible & Scenes on first visit if DB has zero assets yet
      if (mappedAssets.length === 0 && (ctx.characters.length > 0 || ctx.shots.length > 0 || ctx.scripts.length > 0)) {
        const projectIdForSeed =
          ctx.characters[0]?.project_id || ctx.shots[0]?.project_id || ctx.scripts[0]?.project_id || "";
        if (projectIdForSeed) {
          const seeded = extractAssetsFromStoryContext({
            projectId: projectIdForSeed,
            storyId,
            storyTitle: ctx.storyTitle,
            episodes: ctx.episodes,
            scripts: ctx.scripts,
            characters: ctx.characters,
            continuity: ctx.continuity,
            shots: ctx.shots,
            existingAssets: [],
          });
          setAssets(seeded);
        } else {
          setAssets([]);
        }
      } else {
        setAssets(mappedAssets);
      }
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

  const persistAssetsSilently = async (nextAssets: AssetDraft[], successNotice?: string) => {
    if (!selectedProjectId || !selectedStoryId) return;
    setSaving(true);
    try {
      const saved = await saveAssetsToSupabase(selectedProjectId, selectedStoryId, nextAssets);
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
          image_url: a.image_url || "",
          status: a.status || "ready",
        }))
      );
      if (successNotice) {
        setStatusMessage({ type: "success", text: successNotice });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save assets to database.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  // One-click image generation for an existing asset card
  const handleGenerateImageForAsset = async (index: number) => {
    const target = assets[index];
    if (!target) return;

    setGeneratingKey(`asset-${index}`);
    setStatusMessage(null);

    const promptToUse =
      target.reference_url_or_prompt.trim() ||
      `${target.name}, ${target.description || target.category}, cinematic 35mm film still, dramatic lighting`;

    const generatedUrl = generateOneClickImageUrl({
      prompt: promptToUse,
      category: target.category,
      seedOffset: Math.floor(Math.random() * 100000),
    });

    const updated = assets.map((item, idx) =>
      idx === index
        ? {
            ...item,
            reference_url_or_prompt: promptToUse,
            image_url: generatedUrl,
            status: "ready",
          }
        : item
    );

    setAssets(updated);
    await persistAssetsSilently(updated, `Generated visual & auto-saved "${target.name}" to Supabase.`);
    setGeneratingKey(null);
  };

  // One-click portrait generation directly from a Character Bible entry
  const handleGenerateCharacterPortrait = async (char: ProjectCharacter) => {
    if (!selectedProjectId || !selectedStoryId) return;

    setGeneratingKey(`char-${char.id || char.name}`);
    setStatusMessage(null);

    const matchCont = continuity.find(
      (c) =>
        (c.character_id && c.character_id === char.id) ||
        c.character_name.toLowerCase() === char.name.toLowerCase()
    );

    const prompt = buildCharacterBiblePrompt(char, matchCont);
    const imageUrl = generateOneClickImageUrl({
      prompt,
      category: "character",
      seedOffset: Math.floor(Math.random() * 100000),
    });

    const existingIdx = assets.findIndex(
      (a) => a.category.toLowerCase() === "character" && a.name.toLowerCase() === char.name.toLowerCase()
    );

    let nextAssets: AssetDraft[];
    if (existingIdx >= 0) {
      nextAssets = assets.map((item, idx) =>
        idx === existingIdx
          ? {
              ...item,
              reference_url_or_prompt: prompt,
              image_url: imageUrl,
              status: "ready",
            }
          : item
      );
    } else {
      nextAssets = [
        {
          project_id: selectedProjectId,
          story_id: selectedStoryId,
          category: "character",
          name: char.name,
          linked_entity: `${char.role || "Principal"}${char.age ? ` (${char.age})` : ""}`,
          episode_number: episodes[0]?.episode_number || 1,
          description: char.description || char.backstory || `${char.name} Character Bible portrait`,
          continuity_notes: matchCont
            ? [matchCont.skin_tone, matchCont.build, matchCont.hair_style, matchCont.distinguishing_features]
                .filter(Boolean)
                .join(" • ")
            : char.personality || "",
          reference_url_or_prompt: prompt,
          image_url: imageUrl,
          status: "ready",
        },
        ...assets,
      ];
    }

    setAssets(nextAssets);
    await persistAssetsSilently(
      nextAssets,
      `Generated Character Bible portrait for ${char.name} and saved to DB.`
    );
    setGeneratingKey(null);
  };

  // Batch one-click image generation for all cards missing an image
  const handleGenerateAllMissing = async () => {
    if (assets.length === 0) return;
    setGeneratingKey("batch-all");
    setStatusMessage(null);

    const nextAssets = assets.map((item, idx) => {
      if (item.image_url && item.image_url.trim().length > 0) return item;
      const prompt =
        item.reference_url_or_prompt.trim() ||
        `${item.name}, ${item.description || item.category}, cinematic 35mm production frame`;
      return {
        ...item,
        reference_url_or_prompt: prompt,
        image_url: generateOneClickImageUrl({
          prompt,
          category: item.category,
          seedOffset: (idx + 1) * 7919,
        }),
        status: "ready",
      };
    });

    setAssets(nextAssets);
    await persistAssetsSilently(nextAssets, "Generated all missing character & scene visuals and saved to DB.");
    setGeneratingKey(null);
  };

  const handleProjectChange = (nextProjectId: string) => {
    setSelectedProjectId(nextProjectId);
    const matchingStory = stories.find((s) => s.project_id === nextProjectId);
    setSelectedStoryId(matchingStory ? matchingStory.id : "");
    setCategoryFilter("all");
  };

  const handleSyncFromBibleAndScenes = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a project and story first." });
      return;
    }

    const synced = extractAssetsFromStoryContext({
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

    setAssets(synced);
    await persistAssetsSilently(
      synced,
      `Synced ${synced.length} Character Bible, Scene & Continuity assets and saved to DB.`
    );
  };

  const handleAddAsset = () => {
    if (!selectedStoryId || !selectedProjectId) return;

    const nextCategory = categoryFilter !== "all" ? categoryFilter : "scene";
    setAssets((prev) => [
      ...prev,
      {
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        category: nextCategory,
        name: `New ${nextCategory.charAt(0).toUpperCase() + nextCategory.slice(1)} Concept`,
        linked_entity: characters[0]?.name || storyTitle,
        episode_number: episodes[0]?.episode_number || 1,
        description: "",
        continuity_notes: "",
        reference_url_or_prompt: "",
        image_url: "",
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

    await persistAssetsSilently(
      assets,
      `Saved ${assets.length} asset${assets.length === 1 ? "" : "s"} to Supabase.`
    );
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
            <Boxes size={15} /> ASSETS STUDIO • CHARACTER BIBLE & VISUAL GENERATOR
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white break-words">
            Character Bible & Scene Visuals<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198] break-words">
            Access your Character Bible & Continuity profiles, generate character portraits and scene concept frames in one click, and auto-sync edits to Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleSyncFromBibleAndScenes}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Sparkles size={16} className="text-[#e4c66e]" />
            <span>Sync Bible & Scenes</span>
          </Button>

          <Button
            type="button"
            onClick={handleGenerateAllMissing}
            disabled={!selectedStoryId || assets.length === 0 || generatingKey === "batch-all"}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            {generatingKey === "batch-all" ? (
              <Loader2 size={16} className="animate-spin text-[#e4c66e]" />
            ) : (
              <Wand2 size={16} className="text-[#e4c66e]" />
            )}
            <span>Generate All Visuals</span>
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
            <option value="character">Character Bible Portraits</option>
            <option value="scene">Scenes & Storyboard Frames</option>
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

      {loadingContext ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#e4c66e]" />
        </div>
      ) : !selectedStoryId ? (
        <div className="panel p-10 text-center border-dashed">
          <Boxes size={30} className="mx-auto mb-3 text-[#e4c66e]" />
          <h3 className="text-lg font-semibold text-white">No Story Workspace Selected</h3>
          <p className="mt-2 text-xs text-[#8d8981] max-w-md mx-auto">
            Select or create a project story first to access the Character Bible and generate character and scene visuals.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* CHARACTER BIBLE ROSTER WITH ONE-CLICK PORTRAIT GENERATION */}
          {characters.length > 0 && (
            <section className="panel p-5 overflow-hidden">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b border-[#252421] pb-3">
                <div className="flex items-center gap-2">
                  <Users size={17} className="text-[#e4c66e]" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Character Bible & Continuity Roster ({characters.length})
                    </h2>
                    <p className="text-[11px] text-[#8d8981]">
                      Directly synced from Story Studio Characters & Continuity. Generate a character portrait in one click.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
                {characters.map((char) => {
                  const matchCont = continuity.find(
                    (c) =>
                      (c.character_id && c.character_id === char.id) ||
                      c.character_name.toLowerCase() === char.name.toLowerCase()
                  );
                  const existingPortrait = assets.find(
                    (a) =>
                      a.category.toLowerCase() === "character" &&
                      a.name.toLowerCase() === char.name.toLowerCase()
                  )?.image_url;
                  const isGeneratingChar = generatingKey === `char-${char.id || char.name}`;

                  return (
                    <div
                      key={char.id || char.name}
                      className="rounded-xl border border-[#2d2c28] bg-[#121210] p-4 flex flex-col justify-between gap-3 min-w-0 overflow-hidden"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{char.name}</h3>
                            <p className="text-[11px] text-[#f2a36f] truncate">
                              {char.role || "Role"} {char.age ? `• Age ${char.age}` : ""}
                            </p>
                          </div>
                          {existingPortrait && (
                            <img
                              src={existingPortrait}
                              alt={char.name}
                              onError={(e) => {
                                e.currentTarget.src = buildFallbackStoryboardDataUrl(
                                  char.name,
                                  char.role || "Character Bible",
                                  "character"
                                );
                              }}
                              className="h-12 w-12 rounded-lg object-cover border border-[#3a3832] shrink-0"
                            />
                          )}
                        </div>

                        {char.description && (
                          <p className="text-xs text-[#a5a198] line-clamp-2 break-words">
                            {char.description}
                          </p>
                        )}

                        {matchCont && (
                          <div className="rounded-lg bg-[#181815] p-2.5 text-[11px] text-[#9a968d] space-y-1 break-words">
                            {(matchCont.skin_tone || matchCont.build || matchCont.hair_style) && (
                              <p>
                                <span className="text-stone-300 font-medium">Look:</span>{" "}
                                {[matchCont.skin_tone, matchCont.build, matchCont.hair_style]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                            {matchCont.distinguishing_features && (
                              <p>
                                <span className="text-stone-300 font-medium">Features:</span>{" "}
                                {matchCont.distinguishing_features}
                              </p>
                            )}
                            {Array.isArray(matchCont.wardrobe) && matchCont.wardrobe.length > 0 && (
                              <p>
                                <span className="text-stone-300 font-medium">Wardrobe:</span>{" "}
                                {matchCont.wardrobe.join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingChar}
                        onClick={() => handleGenerateCharacterPortrait(char)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e4c66e]/40 bg-[#e4c66e]/15 px-3 py-2 text-xs font-medium text-[#e4c66e] hover:bg-[#e4c66e]/25 transition disabled:opacity-50"
                      >
                        {isGeneratingChar ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Generating Portrait...
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} /> {existingPortrait ? "Regenerate Portrait" : "Generate Portrait"}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ASSET & SCENE VISUAL CARDS */}
          {visibleAssetsWithIndex.length === 0 ? (
            <div className="panel p-10 text-center border-dashed">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4c66e]/15 text-[#e4c66e]">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white">No Assets in This View Yet</h3>
              <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
                Click <span className="text-white font-medium">Sync Bible & Scenes</span> to pull characters, scenes, wardrobe, and props automatically, or click <span className="text-white font-medium">Add Asset</span>.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
              {visibleAssetsWithIndex.map(({ asset, idx }) => {
                const isGeneratingThis = generatingKey === `asset-${idx}`;
                return (
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
                        <option value="character">Character Bible</option>
                        <option value="scene">Scene / Storyboard</option>
                        <option value="location">Location / Set</option>
                        <option value="prop">Prop / Accessory</option>
                        <option value="wardrobe">Wardrobe / Costume</option>
                        <option value="reference">Visual Reference</option>
                      </select>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isGeneratingThis}
                          onClick={() => handleGenerateImageForAsset(idx)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4c66e]/40 bg-[#e4c66e]/15 px-2.5 py-1 text-xs font-medium text-[#e4c66e] hover:bg-[#e4c66e]/25 transition disabled:opacity-50"
                        >
                          {isGeneratingThis ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : asset.image_url ? (
                            <RefreshCw size={13} />
                          ) : (
                            <Wand2 size={13} />
                          )}
                          <span>{isGeneratingThis ? "Generating..." : asset.image_url ? "Regenerate" : "Generate Image"}</span>
                        </button>

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

                    {/* Visual Preview Frame */}
                    {asset.image_url ? (
                      <div className="relative overflow-hidden rounded-xl border border-[#2f2e29] bg-[#10100e]">
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          onError={(e) => {
                            e.currentTarget.src = buildFallbackStoryboardDataUrl(
                              asset.name,
                              asset.description || asset.linked_entity,
                              asset.category
                            );
                          }}
                          className="w-full max-h-72 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-[#33322e] bg-[#121210] px-4 py-3 text-xs text-[#8d8981]">
                        <span className="flex items-center gap-2">
                          <ImageIcon size={15} className="text-[#e4c66e]" /> No image generated yet
                        </span>
                        <button
                          type="button"
                          onClick={() => handleGenerateImageForAsset(idx)}
                          className="text-[#e4c66e] font-medium hover:underline"
                        >
                          Generate now →
                        </button>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                          Asset / Character / Scene Name
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
                          Linked Role / Episode
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
                        Continuity & Look Lock
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
                        Image Generation Prompt
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}