"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clapperboard,
  Sparkles,
  Plus,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  BookOpen,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import {
  ProjectCharacter,
  ProjectCharacterContinuity,
  ProjectEpisode,
  ProjectScript,
  ShotDraft,
} from "@/types/story";
import {
  fetchStoryShotContext,
  generateShotBreakdownForStory,
  saveShotsToSupabase,
} from "@/lib/shot-generator";

interface StoryOption {
  id: string;
  project_id: string;
  title: string;
}

export default function ShotStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId") || "";
  const queryStoryId = searchParams.get("storyId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId);
  const [selectedStoryId, setSelectedStoryId] = useState(queryStoryId);
  const [episodeFilter, setEpisodeFilter] = useState<string>("all");

  const [storyTitle, setStoryTitle] = useState("Story Workspace");
  const [episodes, setEpisodes] = useState<ProjectEpisode[]>([]);
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [continuity, setContinuity] = useState<ProjectCharacterContinuity[]>([]);
  const [shots, setShots] = useState<ShotDraft[]>([]);

  const [loadingContext, setLoadingContext] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Load available projects and stories
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

  const hydrateStoryShots = useCallback(async (storyId: string) => {
    if (!storyId) {
      setShots([]);
      setLoadingContext(false);
      return;
    }

    setLoadingContext(true);
    setStatusMessage(null);

    try {
      const ctx = await fetchStoryShotContext(storyId);
      setStoryTitle(ctx.storyTitle);
      setEpisodes(ctx.episodes);
      setScripts(ctx.scripts);
      setCharacters(ctx.characters);
      setContinuity(ctx.continuity);
      setShots(
        ctx.shots.map((s) => ({
          project_id: s.project_id,
          story_id: s.story_id,
          episode_id: s.episode_id,
          episode_number: s.episode_number || 1,
          shot_number: s.shot_number,
          scene_heading: s.scene_heading,
          camera_angle: s.camera_angle,
          camera_movement: s.camera_movement,
          lighting_mood: s.lighting_mood,
          visual_prompt: s.visual_prompt,
          continuity_notes: s.continuity_notes,
          status: s.status || "planned",
        }))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load shot list.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStoryId) {
      hydrateStoryShots(selectedStoryId);
    }
  }, [selectedStoryId, hydrateStoryShots]);

  const handleProjectChange = (nextProjectId: string) => {
    setSelectedProjectId(nextProjectId);
    const matchingStory = stories.find((s) => s.project_id === nextProjectId);
    setSelectedStoryId(matchingStory ? matchingStory.id : "");
    setEpisodeFilter("all");
  };

  const handleGenerateShots = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select or create a story first to generate shots." });
      return;
    }

    setGenerating(true);
    setStatusMessage(null);

    try {
      const generated = await generateShotBreakdownForStory({
        projectId: selectedProjectId,
        storyId: selectedStoryId,
        storyTitle,
        episodes,
        scripts,
        characters,
        continuity,
      });
      setShots(generated);
      setStatusMessage({
        type: "success",
        text: `Generated ${generated.length} shots. Review and click "Save to DB" to persist.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Shot generation failed.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setGenerating(false);
    }
  };

  const handleAddShot = () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a project and story before adding a shot." });
      return;
    }

    const activeEpNum = episodeFilter !== "all" ? Number(episodeFilter) : episodes[0]?.episode_number || 1;
    const matchedEp = episodes.find((e) => e.episode_number === activeEpNum);
    const nextShotNumber = shots.length + 1;

    const newShot: ShotDraft = {
      project_id: selectedProjectId,
      story_id: selectedStoryId,
      episode_id: matchedEp?.id ?? null,
      episode_number: activeEpNum,
      shot_number: nextShotNumber,
      scene_heading: `INT. ${storyTitle.toUpperCase()} — SCENE ${nextShotNumber}`,
      camera_angle: "Medium Shot (MS)",
      camera_movement: "Static Tripod",
      lighting_mood: "Moody Cinematic",
      visual_prompt: "",
      continuity_notes: "",
      status: "planned",
    };

    setShots((prev) => [...prev, newShot]);
  };

  const handleUpdateShot = (index: number, patch: Partial<ShotDraft>) => {
    setShots((prev) =>
      prev.map((shot, idx) => (idx === index ? { ...shot, ...patch } : shot))
    );
  };

  const handleDeleteShot = (index: number) => {
    setShots((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((shot, idx) => ({ ...shot, shot_number: idx + 1 }))
    );
  };

  const handleSaveShots = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "No story selected to save shots against." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const saved = await saveShotsToSupabase(selectedProjectId, selectedStoryId, shots);
      setShots(
        saved.map((s) => ({
          project_id: s.project_id,
          story_id: s.story_id,
          episode_id: s.episode_id,
          episode_number: s.episode_number || 1,
          shot_number: s.shot_number,
          scene_heading: s.scene_heading,
          camera_angle: s.camera_angle,
          camera_movement: s.camera_movement,
          lighting_mood: s.lighting_mood,
          visual_prompt: s.visual_prompt,
          continuity_notes: s.continuity_notes,
          status: s.status || "planned",
        }))
      );
      setStatusMessage({
        type: "success",
        text: `Saved ${saved.length} shot${saved.length === 1 ? "" : "s"} to Supabase.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save shots to database.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const filteredStories = selectedProjectId
    ? stories.filter((s) => s.project_id === selectedProjectId)
    : stories;

  const visibleShotsWithIndex = shots
    .map((shot, idx) => ({ shot, idx }))
    .filter(({ shot }) =>
      episodeFilter === "all" ? true : String(shot.episode_number) === episodeFilter
    );

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#b5a1ff]">
            <Clapperboard size={15} /> SHOT STUDIO
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white break-words">
            Scenes, Shots & Storyboards<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198] break-words">
            Break down scripts and episodes into camera angles, movements, lighting moods, and continuity-locked shot prompts persisted to Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleGenerateShots}
            disabled={generating || !selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-[#b5a1ff]" />}
            <span>{generating ? "Generating..." : "Generate from Script"}</span>
          </Button>

          <Button
            type="button"
            onClick={handleAddShot}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Plus size={16} />
            <span>Add Shot</span>
          </Button>

          <Button
            type="button"
            onClick={handleSaveShots}
            disabled={saving || !selectedStoryId}
            className="action-button flex items-center gap-2 text-xs sm:text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? "Saving..." : "Save to DB"}</span>
          </Button>
        </div>
      </div>

      {/* Project & Story Selector Bar */}
      <div className="panel mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#b5a1ff]"
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
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#b5a1ff]"
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
            Episode Filter
          </label>
          <select
            value={episodeFilter}
            onChange={(e) => setEpisodeFilter(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#b5a1ff]"
          >
            <option value="all">All Episodes ({shots.length} shots)</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={String(ep.episode_number)}>
                Episode {ep.episode_number} — {ep.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end justify-between lg:justify-end gap-3 min-w-0">
          <div className="text-xs text-[#9a968d] truncate">
            <span className="text-white font-medium">{shots.length}</span> Shots •{" "}
            <span className="text-white font-medium">{characters.length}</span> Characters
          </div>
          {selectedStoryId && (
            <button
              type="button"
              onClick={() => router.push(`/workspace/story-studio/${selectedStoryId}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#f2a36f] hover:border-[#f2a36f]/60 transition shrink-0"
            >
              <BookOpen size={14} /> Story Studio
            </button>
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

      {/* Shot List Content */}
      {loadingContext ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#b5a1ff]" />
        </div>
      ) : !selectedStoryId ? (
        <div className="panel p-10 text-center border-dashed">
          <Film size={30} className="mx-auto mb-3 text-[#b5a1ff]" />
          <h3 className="text-lg font-semibold text-white">No Story Workspace Selected</h3>
          <p className="mt-2 text-xs text-[#8d8981] max-w-md mx-auto">
            Create a project and story first, then return to Shot Studio to generate and save your shot breakdown.
          </p>
          <Button onClick={() => router.push("/workspace/projects")} className="mt-5 text-xs sm:text-sm">
            Go to Projects
          </Button>
        </div>
      ) : visibleShotsWithIndex.length === 0 ? (
        <div className="panel p-10 text-center border-dashed">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b5a1ff]/15 text-[#b5a1ff]">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-semibold text-white">No Shots in This View Yet</h3>
          <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
            Click <span className="text-white font-medium">Generate from Script</span> to auto-build shots from your story episodes and script, or click <span className="text-white font-medium">Add Shot</span> to create one manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
          {visibleShotsWithIndex.map(({ shot, idx }) => (
            <div
              key={`${shot.episode_number}-${shot.shot_number}-${idx}`}
              className="panel p-5 space-y-4 overflow-hidden min-w-0"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#252421] pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-md bg-[#b5a1ff]/15 border border-[#b5a1ff]/30 px-2.5 py-1 text-xs font-semibold text-[#b5a1ff] shrink-0">
                    Shot #{shot.shot_number}
                  </span>
                  <span className="text-xs text-[#8d8981] truncate">
                    Ep {shot.episode_number}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={shot.status}
                    onChange={(e) => handleUpdateShot(idx, { status: e.target.value })}
                    className="rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1 text-xs text-stone-200 outline-none focus:border-[#b5a1ff]"
                  >
                    <option value="planned">Planned</option>
                    <option value="storyboarded">Storyboarded</option>
                    <option value="approved">Approved</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteShot(idx)}
                    aria-label={`Delete shot ${shot.shot_number}`}
                    className="rounded-lg p-1.5 text-[#8d8981] hover:bg-red-950/50 hover:text-red-300 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Scene / Action Heading
                </label>
                <input
                  type="text"
                  value={shot.scene_heading}
                  onChange={(e) => handleUpdateShot(idx, { scene_heading: e.target.value })}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#b5a1ff] break-words"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                    Camera Angle
                  </label>
                  <input
                    type="text"
                    value={shot.camera_angle}
                    onChange={(e) => handleUpdateShot(idx, { camera_angle: e.target.value })}
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#b5a1ff] break-words"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                    Movement
                  </label>
                  <input
                    type="text"
                    value={shot.camera_movement}
                    onChange={(e) => handleUpdateShot(idx, { camera_movement: e.target.value })}
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#b5a1ff] break-words"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                    Lighting / Mood
                  </label>
                  <input
                    type="text"
                    value={shot.lighting_mood}
                    onChange={(e) => handleUpdateShot(idx, { lighting_mood: e.target.value })}
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#b5a1ff] break-words"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Visual / Storyboard Prompt
                </label>
                <textarea
                  rows={2}
                  value={shot.visual_prompt}
                  onChange={(e) => handleUpdateShot(idx, { visual_prompt: e.target.value })}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] p-3 text-xs text-stone-200 outline-none focus:border-[#b5a1ff] break-words resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                  Continuity & Wardrobe Lock
                </label>
                <input
                  type="text"
                  value={shot.continuity_notes}
                  onChange={(e) => handleUpdateShot(idx, { continuity_notes: e.target.value })}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#f2a36f] outline-none focus:border-[#b5a1ff] break-words"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
