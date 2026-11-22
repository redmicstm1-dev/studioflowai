"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video,
  Sparkles,
  Plus,
  Save,
  Trash2,
  Play,
  Square,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clapperboard,
  AudioLines,
  Boxes,
  Film,
  FileText,
  Wand2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import {
  ProjectAsset,
  ProjectCharacterContinuity,
  ProjectDialogueLine,
  ProjectEpisode,
  ProjectShot,
  ProjectVideoRender,
  ProjectVoice,
  VideoAspectRatio,
  VideoClipDraft,
} from "@/types/story";
import {
  ASPECT_RATIO_DIMENSIONS,
  assembleSequenceFromStudios,
  buildSrtSubtitles,
  fetchStoryVideoContext,
  logVideoRenderToSupabase,
  renderSequenceToVideoBlob,
  saveVideoClipsToSupabase,
} from "@/lib/video-studio";
import { buildFallbackStoryboardDataUrl } from "@/lib/asset-studio";

interface StoryOption {
  id: string;
  project_id: string;
  title: string;
}

interface RenderedVideoExport {
  objectUrl: string;
  filename: string;
  extension: "mp4" | "webm" | "json";
  aspectRatio: VideoAspectRatio;
  sizeLabel: string;
  clipCount: number;
  totalDurationSec: number;
}

export default function VideoStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId") || "";
  const queryStoryId = searchParams.get("storyId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId);
  const [selectedStoryId, setSelectedStoryId] = useState(queryStoryId);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");

  const [storyTitle, setStoryTitle] = useState("Story Workspace");
  const [episodes, setEpisodes] = useState<ProjectEpisode[]>([]);
  const [shots, setShots] = useState<ProjectShot[]>([]);
  const [voices, setVoices] = useState<ProjectVoice[]>([]);
  const [dialogueLines, setDialogueLines] = useState<ProjectDialogueLine[]>([]);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [continuity, setContinuity] = useState<ProjectCharacterContinuity[]>([]);

  const [clips, setClips] = useState<VideoClipDraft[]>([]);
  const [renders, setRenders] = useState<ProjectVideoRender[]>([]);
  const [renderedExport, setRenderedExport] = useState<RenderedVideoExport | null>(null);

  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const playStopRef = useRef<boolean>(false);

  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [rendering, setRendering] = useState<boolean>(false);
  const [renderProgressText, setRenderProgressText] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const clearRenderedExport = useCallback(() => {
    setRenderedExport((prev) => {
      if (prev?.objectUrl) {
        URL.revokeObjectURL(prev.objectUrl);
      }
      return null;
    });
  }, []);

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
        supabase
          .from("project_stories")
          .select("id, project_id, title")
          .order("created_at", { ascending: false }),
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

  const stopSequencePreview = useCallback(() => {
    playStopRef.current = true;
    setIsPlayingSequence(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Automatically hydrate saved clips, renders, and upstream studio context on load/refresh
  const hydrateStoryVideo = useCallback(
    async (storyId: string) => {
      if (!storyId) {
        setClips([]);
        setRenders([]);
        setLoadingContext(false);
        return;
      }

      stopSequencePreview();
      clearRenderedExport();
      setLoadingContext(true);
      setStatusMessage(null);

      try {
        const ctx = await fetchStoryVideoContext(storyId);
        setStoryTitle(ctx.storyTitle);
        setEpisodes(ctx.episodes);
        setShots(ctx.shots);
        setVoices(ctx.voices);
        setDialogueLines(ctx.dialogueLines);
        setAssets(ctx.assets);
        setContinuity(ctx.continuity);
        setRenders(ctx.renders);

        const mappedClips: VideoClipDraft[] = ctx.clips.map((c, idx) => ({
          project_id: c.project_id,
          story_id: c.story_id,
          episode_id: c.episode_id,
          episode_number: c.episode_number || 1,
          shot_number: c.shot_number || idx + 1,
          clip_order: c.clip_order || idx + 1,
          scene_heading: c.scene_heading,
          character_name: c.character_name || "",
          dialogue_summary: c.dialogue_summary || "",
          visual_prompt: c.visual_prompt || "",
          continuity_notes: c.continuity_notes || "",
          image_url: c.image_url || "",
          duration_sec: Number(c.duration_sec) || 4,
          transition_type: c.transition_type || "ken_burns",
          status: c.status || "ready",
        }));

        if (
          mappedClips.length === 0 &&
          (ctx.shots.length > 0 || ctx.dialogueLines.length > 0 || ctx.episodes.length > 0)
        ) {
          const fallbackProjectId =
            ctx.shots[0]?.project_id ||
            ctx.dialogueLines[0]?.project_id ||
            ctx.episodes[0]?.project_id ||
            "";
          if (fallbackProjectId) {
            const assembled = assembleSequenceFromStudios({
              projectId: fallbackProjectId,
              storyId,
              storyTitle: ctx.storyTitle,
              episodes: ctx.episodes,
              shots: ctx.shots,
              dialogueLines: ctx.dialogueLines,
              voices: ctx.voices,
              assets: ctx.assets,
              continuity: ctx.continuity,
              existingClips: [],
            });
            setClips(assembled);
          } else {
            setClips([]);
          }
        } else {
          setClips(mappedClips);
        }

        setActiveClipIndex(0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load Video Studio data.";
        setStatusMessage({ type: "error", text: msg });
      } finally {
        setLoadingContext(false);
      }
    },
    [clearRenderedExport, stopSequencePreview]
  );

  useEffect(() => {
    if (selectedStoryId) {
      hydrateStoryVideo(selectedStoryId);
    }
  }, [selectedStoryId, hydrateStoryVideo]);

  useEffect(() => {
    return () => {
      stopSequencePreview();
      clearRenderedExport();
    };
  }, [clearRenderedExport, stopSequencePreview]);

  const handleProjectChange = (nextProjectId: string) => {
    stopSequencePreview();
    clearRenderedExport();
    setSelectedProjectId(nextProjectId);
    const matchingStory = stories.find((s) => s.project_id === nextProjectId);
    setSelectedStoryId(matchingStory ? matchingStory.id : "");
  };

  const handleAssembleSequence = () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a project and story first." });
      return;
    }

    stopSequencePreview();
    const built = assembleSequenceFromStudios({
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storyTitle,
      episodes,
      shots,
      dialogueLines,
      voices,
      assets,
      continuity,
      existingClips: clips,
    });

    setClips(built);
    setActiveClipIndex(0);
    setStatusMessage({
      type: "success",
      text: `Assembled ${built.length} sequence clips from Shots, Voices & Assets. Click "Save to DB" to persist.`,
    });
  };

  const handleAddClip = () => {
    if (!selectedStoryId || !selectedProjectId) return;
    const nextOrder = clips.length + 1;
    setClips((prev) => [
      ...prev,
      {
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        episode_id: episodes[0]?.id ?? null,
        episode_number: episodes[0]?.episode_number || 1,
        shot_number: nextOrder,
        clip_order: nextOrder,
        scene_heading: `INT. ${storyTitle.toUpperCase()} — SEQUENCE CLIP ${nextOrder}`,
        character_name: voices[0]?.character_name || "",
        dialogue_summary: "",
        visual_prompt: "",
        continuity_notes: "",
        image_url: assets.find((a) => Boolean(a.image_url))?.image_url || "",
        duration_sec: 4,
        transition_type: "ken_burns",
        status: "ready",
      },
    ]);
  };

  const handleUpdateClip = (index: number, patch: Partial<VideoClipDraft>) => {
    setClips((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleDeleteClip = (index: number) => {
    stopSequencePreview();
    setClips((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, clip_order: idx + 1 }))
    );
    setActiveClipIndex(0);
  };

  const handleSaveClips = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a story workspace before saving." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const saved = await saveVideoClipsToSupabase(selectedProjectId, selectedStoryId, clips);
      setClips(
        saved.map((c, idx) => ({
          project_id: c.project_id,
          story_id: c.story_id,
          episode_id: c.episode_id,
          episode_number: c.episode_number || 1,
          shot_number: c.shot_number || idx + 1,
          clip_order: c.clip_order || idx + 1,
          scene_heading: c.scene_heading,
          character_name: c.character_name || "",
          dialogue_summary: c.dialogue_summary || "",
          visual_prompt: c.visual_prompt || "",
          continuity_notes: c.continuity_notes || "",
          image_url: c.image_url || "",
          duration_sec: Number(c.duration_sec) || 4,
          transition_type: c.transition_type || "ken_burns",
          status: c.status || "ready",
        }))
      );
      setStatusMessage({
        type: "success",
        text: `Saved ${saved.length} timeline clip${saved.length === 1 ? "" : "s"} to Supabase.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save video clips.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const speakClipDialogue = (clip: VideoClipDraft, onDone: () => void) => {
    if (
      !clip.dialogue_summary ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      const waitMs = Math.max(1200, Math.min(4500, (Number(clip.duration_sec) || 3) * 700));
      setTimeout(onDone, waitMs);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clip.dialogue_summary);
    const matchedVoice = voices.find(
      (v) => v.character_name.toLowerCase() === (clip.character_name || "").toLowerCase()
    );
    if (matchedVoice) {
      const available = window.speechSynthesis.getVoices();
      const sysVoice =
        available.find((sv) => sv.voiceURI === matchedVoice.voice_uri) ||
        available.find((sv) => sv.name === matchedVoice.voice_name);
      if (sysVoice) utterance.voice = sysVoice;
      utterance.pitch = Math.min(2, Math.max(0.5, Number(matchedVoice.pitch) || 1));
      utterance.rate = Math.min(2, Math.max(0.5, Number(matchedVoice.speaking_rate) || 1));
    }

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      onDone();
    };

    utterance.onend = finishOnce;
    utterance.onerror = finishOnce;
    window.speechSynthesis.speak(utterance);

    setTimeout(finishOnce, 12000);
  };

  const handlePlaySequence = () => {
    if (clips.length === 0) return;
    stopSequencePreview();
    playStopRef.current = false;
    setIsPlayingSequence(true);

    const step = (idx: number) => {
      if (playStopRef.current || idx >= clips.length) {
        setIsPlayingSequence(false);
        return;
      }
      setActiveClipIndex(idx);
      speakClipDialogue(clips[idx], () => {
        if (!playStopRef.current) {
          step(idx + 1);
        } else {
          setIsPlayingSequence(false);
        }
      });
    };

    step(activeClipIndex < clips.length ? activeClipIndex : 0);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Render video in memory ONLY — user decides whether to download via the Download button
  const handleRenderSequence = async () => {
    if (clips.length === 0 || !selectedProjectId || !selectedStoryId) {
      setStatusMessage({ type: "error", text: "Add or assemble clips before rendering." });
      return;
    }

    stopSequencePreview();
    clearRenderedExport();
    setRendering(true);
    setRenderProgressText(`Preparing ${aspectRatio} canvas...`);
    setStatusMessage(null);

    try {
      const { blob, extension, totalDurationSec } = await renderSequenceToVideoBlob({
        clips,
        aspectRatio,
        storyTitle,
        onProgress: (cur, tot) => {
          setRenderProgressText(`Rendering clip ${cur} of ${tot} (${aspectRatio})...`);
        },
      });

      const slug =
        storyTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "studioflow-sequence";
      const ratioTag = aspectRatio.replace(":", "x");

      let finalBlob: Blob;
      let finalExt: "mp4" | "webm" | "json";
      let filename: string;

      if (blob && blob.size > 0) {
        finalBlob = blob;
        finalExt = extension === "mp4" ? "mp4" : "webm";
        filename = `${slug}-${ratioTag}.${finalExt}`;
      } else {
        const srt = buildSrtSubtitles(clips);
        const manifest = JSON.stringify(
          {
            storyTitle,
            aspectRatio,
            dimensions: ASPECT_RATIO_DIMENSIONS[aspectRatio],
            totalDurationSec,
            clips,
            subtitlesSrt: srt,
          },
          null,
          2
        );
        finalBlob = new Blob([manifest], { type: "application/json" });
        finalExt = "json";
        filename = `${slug}-${ratioTag}-storyboard.json`;
      }

      const objectUrl = URL.createObjectURL(finalBlob);

      setRenderedExport({
        objectUrl,
        filename,
        extension: finalExt,
        aspectRatio,
        sizeLabel: formatBytes(finalBlob.size),
        clipCount: clips.length,
        totalDurationSec,
      });

      const logged = await logVideoRenderToSupabase({
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        title: `${storyTitle} (${aspectRatio})`,
        aspect_ratio: aspectRatio,
        clip_count: clips.length,
        total_duration_sec: totalDurationSec,
        export_format: finalExt,
        notes: `${clips.length} clips • ${totalDurationSec.toFixed(1)}s • ${formatBytes(finalBlob.size)}`,
      });

      if (logged) {
        setRenders((prev) => [logged, ...prev.slice(0, 7)]);
      }

      setStatusMessage({
        type: "success",
        text: `Render complete (${filename} • ${formatBytes(finalBlob.size)}). Review below and click Download when ready.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to render sequence.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setRendering(false);
      setRenderProgressText("");
    }
  };

  // Explicit user-triggered download handlers
  const handleManualDownloadVideo = () => {
    if (!renderedExport) return;
    const a = document.createElement("a");
    a.href = renderedExport.objectUrl;
    a.download = renderedExport.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleManualDownloadSrt = () => {
    if (clips.length === 0) return;
    const srtContent = buildSrtSubtitles(clips);
    const slug =
      storyTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "studioflow-captions";
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-${aspectRatio.replace(":", "x")}.srt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const filteredStories = selectedProjectId
    ? stories.filter((s) => s.project_id === selectedProjectId)
    : stories;

  const activeClip = clips[activeClipIndex] || clips[0];
  const totalDuration = clips.reduce((acc, c) => acc + (Number(c.duration_sec) || 4), 0);

  const previewAspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16] max-h-[420px] mx-auto"
      : aspectRatio === "1:1"
      ? "aspect-square max-h-[380px] mx-auto"
      : "aspect-video w-full";

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#f2a36f]">
            <Video size={15} /> VIDEO STUDIO • ZERO-API SEQUENCE & MP4 RENDER ENGINE
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white break-words">
            Sequence Assembly & Video Render<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198] break-words">
            Combine Shots, Character Voices, Dialogue, and Character/Scene Visuals into a multi-ratio timeline (16:9, 9:16, 1:1), preview live, and download on demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleAssembleSequence}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Sparkles size={16} className="text-[#f2a36f]" />
            <span>Assemble from Studios</span>
          </Button>

          {isPlayingSequence ? (
            <Button
              type="button"
              onClick={stopSequencePreview}
              variant="secondary"
              className="flex items-center gap-2 text-xs sm:text-sm border-red-500/40 text-red-200"
            >
              <Square size={15} />
              <span>Stop Preview</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePlaySequence}
              disabled={clips.length === 0}
              variant="secondary"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Play size={15} className="text-[#7fc7b2]" />
              <span>Preview Sequence</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleRenderSequence}
            disabled={rendering || clips.length === 0}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            {rendering ? (
              <Loader2 size={16} className="animate-spin text-[#f2a36f]" />
            ) : (
              <Wand2 size={16} className="text-[#f2a36f]" />
            )}
            <span>{rendering ? renderProgressText || "Rendering..." : `Render (${aspectRatio})`}</span>
          </Button>

          {renderedExport && (
            <Button
              type="button"
              onClick={handleManualDownloadVideo}
              variant="secondary"
              className="flex items-center gap-2 text-xs sm:text-sm border-[#7fc7b2]/50 bg-[#7fc7b2]/15 text-[#7fc7b2]"
            >
              <Download size={16} />
              <span>Download .{renderedExport.extension}</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSaveClips}
            disabled={saving || !selectedStoryId}
            className="action-button flex items-center gap-2 text-xs sm:text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? "Saving..." : "Save to DB"}</span>
          </Button>
        </div>
      </div>

      {/* Controls Bar: Project, Story & 3 Aspect Ratios */}
      <div className="panel mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#f2a36f]"
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
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#f2a36f]"
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
            Aspect Ratio (3 Ratios)
          </label>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#33322e] bg-[#121210] p-1">
            {(["16:9", "9:16", "1:1"] as VideoAspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio);
                  clearRenderedExport();
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                  aspectRatio === ratio
                    ? "bg-[#f2a36f] text-[#141412]"
                    : "text-[#9a968d] hover:text-white"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between lg:justify-end gap-1.5 min-w-0 flex-wrap">
          {selectedStoryId && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/workspace/story-studio/${selectedStoryId}`)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2 py-2 text-[11px] text-[#f2a36f] hover:border-[#f2a36f]/60 transition"
              >
                <BookOpen size={12} /> Story
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/shot-studio?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2 py-2 text-[11px] text-[#b5a1ff] hover:border-[#b5a1ff]/60 transition"
              >
                <Clapperboard size={12} /> Shots
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/voice-studio?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2 py-2 text-[11px] text-[#7fc7b2] hover:border-[#7fc7b2]/60 transition"
              >
                <AudioLines size={12} /> Voice
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/asset-library?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2 py-2 text-[11px] text-[#e4c66e] hover:border-[#e4c66e]/60 transition"
              >
                <Boxes size={12} /> Assets
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

      {/* STAGED RENDERED VIDEO CARD — USER DECIDES WHEN TO DOWNLOAD */}
      {renderedExport && (
        <div className="panel mb-6 border-[#7fc7b2]/50 bg-[#151e1b] p-5 space-y-4 overflow-hidden">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-[#25332e] pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#7fc7b2]">
                <CheckCircle2 size={15} /> RENDER READY FOR DOWNLOAD
              </div>
              <p className="mt-1 text-sm font-semibold text-white truncate">
                {renderedExport.filename}
              </p>
              <p className="text-[11px] text-[#9bb3aa]">
                {renderedExport.aspectRatio} • {renderedExport.clipCount} clips •{" "}
                {renderedExport.totalDurationSec.toFixed(1)}s • {renderedExport.sizeLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handleManualDownloadVideo}
                className="action-button flex items-center gap-2 text-xs sm:text-sm"
              >
                <Download size={16} />
                <span>Download Video (.{renderedExport.extension})</span>
              </Button>

              <Button
                type="button"
                onClick={handleManualDownloadSrt}
                variant="secondary"
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <FileText size={15} className="text-[#7fc7b2]" />
                <span>Download .SRT</span>
              </Button>
            </div>
          </div>

          {renderedExport.extension !== "json" && (
            <div className="overflow-hidden rounded-xl border border-[#2a3833] bg-black">
              <video
                src={renderedExport.objectUrl}
                controls
                playsInline
                className="max-h-80 w-full object-contain mx-auto"
              />
            </div>
          )}
        </div>
      )}

      {loadingContext ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
        </div>
      ) : !selectedStoryId ? (
        <div className="panel p-10 text-center border-dashed">
          <Film size={30} className="mx-auto mb-3 text-[#f2a36f]" />
          <h3 className="text-lg font-semibold text-white">No Story Workspace Selected</h3>
          <p className="mt-2 text-xs text-[#8d8981] max-w-md mx-auto">
            Select or create a project story first to assemble clips from Shots, Voices, and Assets.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* LIVE STAGE PREVIEW & STUDIO ALIGNMENT SUMMARY */}
          <div className="grid gap-6 lg:grid-cols-12 overflow-hidden">
            <div className="panel p-5 lg:col-span-7 space-y-4 overflow-hidden min-w-0">
              <div className="flex items-center justify-between gap-2 border-b border-[#252421] pb-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    Stage Monitor — {ASPECT_RATIO_DIMENSIONS[aspectRatio].label}
                  </h2>
                  <p className="text-[11px] text-[#8d8981]">
                    {clips.length} Clips • Est. {totalDuration.toFixed(1)}s total runtime
                  </p>
                </div>
                {activeClip && (
                  <span className="rounded-md bg-[#f2a36f]/15 border border-[#f2a36f]/30 px-2.5 py-1 text-xs font-semibold text-[#f2a36f] shrink-0">
                    Clip #{activeClipIndex + 1} / {Math.max(clips.length, 1)}
                  </span>
                )}
              </div>

              {activeClip ? (
                <div className={`relative overflow-hidden rounded-xl border border-[#2f2e29] bg-[#0e0e0c] ${previewAspectClass}`}>
                  <img
                    src={
                      activeClip.image_url ||
                      buildFallbackStoryboardDataUrl(
                        activeClip.scene_heading,
                        activeClip.dialogue_summary || activeClip.visual_prompt,
                        "scene"
                      )
                    }
                    alt={activeClip.scene_heading}
                    onError={(e) => {
                      e.currentTarget.src = buildFallbackStoryboardDataUrl(
                        activeClip.scene_heading,
                        activeClip.dialogue_summary || activeClip.visual_prompt,
                        "scene"
                      );
                    }}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50 flex flex-col justify-between p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#f2a36f] truncate">
                      {storyTitle} • {activeClip.transition_type.replace("_", " ")} • {Number(activeClip.duration_sec).toFixed(1)}s
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-white break-words">
                        {activeClip.scene_heading}
                      </p>
                      {activeClip.dialogue_summary && (
                        <p className="rounded-lg bg-black/75 px-3 py-2 text-xs text-stone-100 break-words">
                          {activeClip.character_name ? (
                            <span className="font-semibold text-[#7fc7b2]">{activeClip.character_name}: </span>
                          ) : null}
                          &ldquo;{activeClip.dialogue_summary}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-[#33322e] text-xs text-[#8d8981]">
                  Click &ldquo;Assemble from Studios&rdquo; to build your sequence timeline.
                </div>
              )}
            </div>

            {/* Upstream Studio Sync Status & Recent Renders */}
            <div className="panel p-5 lg:col-span-5 space-y-4 overflow-hidden min-w-0">
              <div className="flex items-center justify-between border-b border-[#252421] pb-3">
                <h2 className="text-sm font-semibold text-white">
                  Upstream Studio Alignment
                </h2>
                {clips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleManualDownloadSrt}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1 text-[11px] text-[#7fc7b2] hover:border-[#7fc7b2]/60 transition"
                  >
                    <Download size={11} /> Export .SRT
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-[#2d2c28] bg-[#121210] p-3">
                  <span className="text-[#8d8981] block text-[11px]">Shot Studio</span>
                  <span className="text-white font-semibold">{shots.length} shots</span>
                </div>
                <div className="rounded-xl border border-[#2d2c28] bg-[#121210] p-3">
                  <span className="text-[#8d8981] block text-[11px]">Voice Studio</span>
                  <span className="text-white font-semibold">
                    {voices.length} voices • {dialogueLines.length} lines
                  </span>
                </div>
                <div className="rounded-xl border border-[#2d2c28] bg-[#121210] p-3">
                  <span className="text-[#8d8981] block text-[11px]">Assets Studio</span>
                  <span className="text-white font-semibold">{assets.length} assets</span>
                </div>
                <div className="rounded-xl border border-[#2d2c28] bg-[#121210] p-3">
                  <span className="text-[#8d8981] block text-[11px]">Continuity</span>
                  <span className="text-white font-semibold">{continuity.length} profiles</span>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d8981] mb-2">
                  Recent Renders ({renders.length})
                </h3>
                {renders.length === 0 ? (
                  <p className="text-xs text-[#7c7870]">
                    No renders logged yet. Click &ldquo;Render&rdquo; to prepare a downloadable .mp4 file.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {renders.map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className="rounded-lg border border-[#2a2925] bg-[#121210] px-3 py-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{r.title}</p>
                          <p className="text-[11px] text-[#8d8981]">{r.notes || r.export_format}</p>
                        </div>
                        <span className="rounded bg-[#f2a36f]/15 px-2 py-0.5 text-[11px] font-semibold text-[#f2a36f] shrink-0 uppercase">
                          {r.aspect_ratio} • .{r.export_format}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEQUENCE TIMELINE CLIPS */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Sequence Timeline ({clips.length} Clips)
                </h2>
                <p className="text-xs text-[#8d8981]">
                  Select any clip to inspect on the stage monitor, tune duration/transition, or edit dialogue & visual prompts.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddClip}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus size={14} /> Add Clip
              </Button>
            </div>

            {clips.length === 0 ? (
              <div className="panel p-8 text-center border-dashed">
                <p className="text-xs text-[#8d8981]">
                  No timeline clips yet. Click <span className="text-white font-medium">Assemble from Studios</span> or <span className="text-white font-medium">Add Clip</span>.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-hidden">
                {clips.map((clip, idx) => {
                  const isSelected = idx === activeClipIndex;
                  return (
                    <div
                      key={`${clip.scene_heading}-${idx}`}
                      onClick={() => setActiveClipIndex(idx)}
                      className={`panel p-4 space-y-3 cursor-pointer transition overflow-hidden ${
                        isSelected ? "border-[#f2a36f] bg-[#1b1916]" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252421] pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="rounded bg-[#f2a36f]/15 border border-[#f2a36f]/30 px-2 py-0.5 text-xs font-semibold text-[#f2a36f] shrink-0">
                            Clip #{idx + 1}
                          </span>
                          <span className="text-xs text-[#8d8981] truncate">
                            Ep {clip.episode_number} • Shot #{clip.shot_number}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[11px] text-[#8d8981]">Dur (s):</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            step="0.5"
                            value={clip.duration_sec}
                            onChange={(e) =>
                              handleUpdateClip(idx, {
                                duration_sec: parseFloat(e.target.value) || 4,
                              })
                            }
                            className="w-16 rounded-lg border border-[#33322e] bg-[#121210] px-2 py-1 text-xs text-white outline-none focus:border-[#f2a36f]"
                          />

                          <select
                            value={clip.transition_type}
                            onChange={(e) =>
                              handleUpdateClip(idx, { transition_type: e.target.value })
                            }
                            className="rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1 text-xs text-stone-200 outline-none focus:border-[#f2a36f]"
                          >
                            <option value="ken_burns">Ken Burns</option>
                            <option value="crossfade">Crossfade</option>
                            <option value="cut">Hard Cut</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteClip(idx)}
                            aria-label={`Delete clip ${idx + 1}`}
                            className="rounded-lg p-1.5 text-[#8d8981] hover:bg-red-950/50 hover:text-red-300 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div
                        className="grid gap-3 sm:grid-cols-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            Scene / Shot Heading
                          </label>
                          <input
                            type="text"
                            value={clip.scene_heading}
                            onChange={(e) =>
                              handleUpdateClip(idx, { scene_heading: e.target.value })
                            }
                            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs font-medium text-white outline-none focus:border-[#f2a36f] break-words"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            Speaker / Character
                          </label>
                          <input
                            type="text"
                            value={clip.character_name}
                            onChange={(e) =>
                              handleUpdateClip(idx, { character_name: e.target.value })
                            }
                            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#7fc7b2] outline-none focus:border-[#f2a36f] break-words"
                          />
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                          Dialogue / Subtitle Line
                        </label>
                        <input
                          type="text"
                          value={clip.dialogue_summary}
                          onChange={(e) =>
                            handleUpdateClip(idx, { dialogue_summary: e.target.value })
                          }
                          className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-100 outline-none focus:border-[#f2a36f] break-words"
                        />
                      </div>

                      <div
                        className="grid gap-3 sm:grid-cols-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            Visual Image URL
                          </label>
                          <input
                            type="text"
                            value={clip.image_url}
                            onChange={(e) =>
                              handleUpdateClip(idx, { image_url: e.target.value })
                            }
                            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#f2a36f] break-words"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            Continuity Lock
                          </label>
                          <input
                            type="text"
                            value={clip.continuity_notes}
                            onChange={(e) =>
                              handleUpdateClip(idx, { continuity_notes: e.target.value })
                            }
                            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#e4c66e] outline-none focus:border-[#f2a36f] break-words"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}