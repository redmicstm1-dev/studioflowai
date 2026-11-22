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
          