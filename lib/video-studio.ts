import { supabase } from "@/lib/supabase";
import {
  ProjectAsset,
  ProjectCharacterContinuity,
  ProjectDialogueLine,
  ProjectEpisode,
  ProjectShot,
  ProjectVideoClip,
  ProjectVideoRender,
  ProjectVoice,
  VideoAspectRatio,
  VideoClipDraft,
  VideoRenderDraft,
} from "@/types/story";

export interface CanvasDimensions {
  width: number;
  height: number;
  label: string;
}

export const ASPECT_RATIO_DIMENSIONS: Record<VideoAspectRatio, CanvasDimensions> = {
  "16:9": { width: 1280, height: 720, label: "16:9 Widescreen (1280×720)" },
  "9:16": { width: 720, height: 1280, label: "9:16 Vertical Short (720×1280)" },
  "1:1": { width: 1080, height: 1080, label: "1:1 Square Feed (1080×1080)" },
};

function getSafeDimensions(ratio: unknown): CanvasDimensions {
  if (ratio === "9:16") {
    return { width: 720, height: 1280, label: "9:16 Vertical Short (720×1280)" };
  }
  if (ratio === "1:1") {
    return { width: 1080, height: 1080, label: "1:1 Square Feed (1080×1080)" };
  }
  return { width: 1280, height: 720, label: "16:9 Widescreen (1280×720)" };
}

function sanitizeText(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

function estimateClipDuration(dialogueText: string, speakingRate = 1): number {
  const words = dialogueText.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 4;
  const safeRate = Math.min(1.6, Math.max(0.7, Number(speakingRate) || 1));
  const rawSec = words / 2.4 / safeRate + 1.5;
  return Math.min(18, Math.max(3, Number(rawSec.toFixed(1))));
}

function findBestAssetImage(
  shot: ProjectShot,
  dialogueLine: ProjectDialogueLine | undefined,
  assets: ProjectAsset[]
): string {
  if (assets.length === 0) return "";

  const headingLower = (shot.scene_heading || "").toLowerCase();
  const speakerLower = (dialogueLine?.character_name || "").toLowerCase();

  const sceneMatch = assets.find((a) => {
    const nameLower = (a.name || "").toLowerCase();
    return (
      (a.category === "scene" || a.category === "location" || a.category === "reference") &&
      (nameLower.includes(headingLower.slice(0, 18)) ||
        headingLower.includes(nameLower.slice(0, 18))) &&
      Boolean(a.image_url)
    );
  });
  if (sceneMatch?.image_url) return sceneMatch.image_url;

  if (speakerLower) {
    const charMatch = assets.find(
      (a) =>
        a.category === "character" &&
        a.name.toLowerCase().includes(speakerLower) &&
        Boolean(a.image_url)
    );
    if (charMatch?.image_url) return charMatch.image_url;
  }

  const anyWithImage = assets.find((a) => Boolean(a.image_url));
  return anyWithImage?.image_url || "";
}

export function assembleSequenceFromStudios(params: {
  projectId: string;
  storyId: string;
  storyTitle: string;
  episodes: ProjectEpisode[];
  shots: ProjectShot[];
  dialogueLines: ProjectDialogueLine[];
  voices: ProjectVoice[];
  assets: ProjectAsset[];
  continuity: ProjectCharacterContinuity[];
  existingClips: VideoClipDraft[];
}): VideoClipDraft[] {
  const {
    projectId,
    storyId,
    storyTitle,
    episodes,
    shots,
    dialogueLines,
    voices,
    assets,
    continuity,
    existingClips,
  } = params;

  const continuityNoteFallback =
    continuity
      .slice(0, 2)
      .map((c) =>
        [c.character_name, c.hair_style, Array.isArray(c.wardrobe) ? c.wardrobe[0] : ""]
          .filter(Boolean)
          .join(" • ")
      )
      .join(" | ") || "Consistent lighting, wardrobe, and spatial continuity.";

  if (shots.length > 0) {
    return shots.map((shot, idx) => {
      const matchedLine =
        dialogueLines.find(
          (d) => d.episode_number === shot.episode_number && d.line_number === shot.shot_number
        ) || dialogueLines[idx];

      const speakerName = matchedLine?.character_name || "";
      const matchedVoice = voices.find(
        (v) => v.character_name.toLowerCase() === speakerName.toLowerCase()
      );
      const dialogueSummary = matchedLine?.dialogue_text || "";
      const imageUrl = findBestAssetImage(shot, matchedLine, assets);

      const preserved = existingClips.find(
        (c) => c.episode_number === shot.episode_number && c.shot_number === shot.shot_number
      );

      return {
        project_id: projectId,
        story_id: storyId,
        episode_id: shot.episode_id ?? null,
        episode_number: shot.episode_number || 1,
        shot_number: shot.shot_number || idx + 1,
        clip_order: idx + 1,
        scene_heading: sanitizeText(shot.scene_heading, `SHOT #${idx + 1}`),
        character_name: sanitizeText(speakerName),
        dialogue_summary: sanitizeText(dialogueSummary),
        visual_prompt: sanitizeText(
          shot.visual_prompt || `${shot.scene_heading}, ${shot.camera_angle}, ${shot.lighting_mood}`
        ),
        continuity_notes: sanitizeText(shot.continuity_notes || continuityNoteFallback),
        image_url: preserved?.image_url || imageUrl,
        duration_sec:
          preserved?.duration_sec ??
          estimateClipDuration(dialogueSummary, matchedVoice?.speaking_rate ?? 1),
        transition_type: preserved?.transition_type || (idx === 0 ? "cut" : "ken_burns"),
        status: preserved?.status || "ready",
      };
    });
  }

  if (dialogueLines.length > 0) {
    return dialogueLines.slice(0, 12).map((line, idx) => {
      const matchedVoice = voices.find(
        (v) => v.character_name.toLowerCase() === line.character_name.toLowerCase()
      );
      const charAsset = assets.find(
        (a) =>
          a.category === "character" &&
          a.name.toLowerCase().includes(line.character_name.toLowerCase()) &&
          Boolean(a.image_url)
      );
      const anySceneAsset = assets.find((a) => Boolean(a.image_url));

      return {
        project_id: projectId,
        story_id: storyId,
        episode_id: null,
        episode_number: line.episode_number || 1,
        shot_number: idx + 1,
        clip_order: idx + 1,
        scene_heading: `EP ${line.episode_number || 1} — ${line.character_name} Cue #${line.line_number}`,
        character_name: sanitizeText(line.character_name),
        dialogue_summary: sanitizeText(line.dialogue_text),
        visual_prompt: sanitizeText(
          `${line.character_name} delivering dialogue (${line.parenthetical || "dramatic"}), ${storyTitle}`
        ),
        continuity_notes: sanitizeText(continuityNoteFallback),
        image_url: charAsset?.image_url || anySceneAsset?.image_url || "",
        duration_sec: estimateClipDuration(line.dialogue_text, matchedVoice?.speaking_rate ?? 1),
        transition_type: idx === 0 ? "cut" : "crossfade",
        status: "ready",
      };
    });
  }

  return episodes.map((ep, idx) => ({
    project_id: projectId,
    story_id: storyId,
    episode_id: ep.id,
    episode_number: ep.episode_number || idx + 1,
    shot_number: idx + 1,
    clip_order: idx + 1,
    scene_heading: `EP ${ep.episode_number || idx + 1} — ${ep.title}`,
    character_name: "",
    dialogue_summary: "",
    visual_prompt: sanitizeText(ep.synopsis || `${storyTitle} — ${ep.title}`),
    continuity_notes: sanitizeText(continuityNoteFallback),
    image_url: assets.find((a) => Boolean(a.image_url))?.image_url || "",
    duration_sec: 4.5,
    transition_type: "ken_burns",
    status: "ready",
  }));
}

export async function fetchStoryVideoContext(storyId: string) {
  if (!supabase || !storyId) {
    return {
      storyTitle: "Story Workspace",
      episodes: [] as ProjectEpisode[],
      shots: [] as ProjectShot[],
      voices: [] as ProjectVoice[],
      dialogueLines: [] as ProjectDialogueLine[],
      assets: [] as ProjectAsset[],
      continuity: [] as ProjectCharacterContinuity[],
      clips: [] as ProjectVideoClip[],
      renders: [] as ProjectVideoRender[],
    };
  }

  const [
    storyRes,
    epRes,
    shotRes,
    voiceRes,
    lineRes,
    assetRes,
    contRes,
    clipRes,
    renderRes,
  ] = await Promise.all([
    supabase.from("project_stories").select("id, title").eq("id", storyId).maybeSingle(),
    supabase
      .from("project_episodes")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true }),
    supabase
      .from("project_shots")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true })
      .order("shot_number", { ascending: true }),
    supabase
      .from("project_voices")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_dialogue_lines")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true })
      .order("line_number", { ascending: true }),
    supabase
      .from("project_assets")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true }),
    supabase.from("project_continuity").select("*").eq("story_id", storyId),
    supabase
      .from("project_video_clips")
      .select("*")
      .eq("story_id", storyId)
      .order("clip_order", { ascending: true }),
    supabase
      .from("project_video_renders")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    storyTitle: storyRes.data?.title || "Story Workspace",
    episodes: (epRes.data || []) as ProjectEpisode[],
    shots: (shotRes.data || []) as ProjectShot[],
    voices: (voiceRes.data || []) as ProjectVoice[],
    dialogueLines: (lineRes.data || []) as ProjectDialogueLine[],
    assets: (assetRes.data || []) as ProjectAsset[],
    continuity: (contRes.data || []) as ProjectCharacterContinuity[],
    clips: (clipRes.data || []) as ProjectVideoClip[],
    renders: (renderRes.data || []) as ProjectVideoRender[],
  };
}

export async function saveVideoClipsToSupabase(
  projectId: string,
  storyId: string,
  clips: VideoClipDraft[]
): Promise<ProjectVideoClip[]> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { error: deleteError } = await supabase
    .from("project_video_clips")
    .delete()
    .eq("story_id", storyId);

  if (deleteError) {
    throw new Error(`Failed to clear existing video clips: ${deleteError.message}`);
  }

  if (clips.length === 0) {
    return [];
  }

  const rowsToInsert = clips.map((clip, idx) => ({
    project_id: projectId,
    story_id: storyId,
    episode_id: clip.episode_id ?? null,
    episode_number: Number(clip.episode_number) || 1,
    shot_number: Number(clip.shot_number) || idx + 1,
    clip_order: idx + 1,
    scene_heading: sanitizeText(clip.scene_heading, `CLIP ${idx + 1}`),
    character_name: sanitizeText(clip.character_name, ""),
    dialogue_summary: sanitizeText(clip.dialogue_summary, ""),
    visual_prompt: sanitizeText(clip.visual_prompt, ""),
    continuity_notes: sanitizeText(clip.continuity_notes, ""),
    image_url: clip.image_url || "",
    duration_sec: Math.min(60, Math.max(1, Number(clip.duration_sec) || 4)),
    transition_type: sanitizeText(clip.transition_type, "ken_burns"),
    status: sanitizeText(clip.status, "ready"),
    updated_at: new Date().toISOString(),
  }));

  const { data, error: insertError } = await supabase
    .from("project_video_clips")
    .insert(rowsToInsert)
    .select();

  if (insertError) {
    throw new Error(`Failed to save video clips: ${insertError.message}`);
  }

  return (data || []) as ProjectVideoClip[];
}

export async function logVideoRenderToSupabase(
  render: VideoRenderDraft
): Promise<ProjectVideoRender | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("project_video_renders")
    .insert({
      project_id: render.project_id,
      story_id: render.story_id,
      title: sanitizeText(render.title, "Sequence Export"),
      aspect_ratio: sanitizeText(render.aspect_ratio, "16:9"),
      clip_count: Number(render.clip_count) || 0,
      total_duration_sec: Number(render.total_duration_sec) || 0,
      export_format: sanitizeText(render.export_format, "mp4"),
      notes: sanitizeText(render.notes, ""),
    })
    .select()
    .maybeSingle();

  if (error) return null;
  return (data || null) as ProjectVideoRender | null;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

async function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  if (!url || typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 5000);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

export function buildSrtSubtitles(clips: VideoClipDraft[]): string {
  let cursorSec = 0;
  const formatTime = (sec: number) => {
    const totalMs = Math.max(0, Math.round(sec * 1000));
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
  };

  return clips
    .map((clip, index) => {
      const start = cursorSec;
      const dur = Math.max(1, Number(clip.duration_sec) || 4);
      const end = start + dur;
      cursorSec = end;

      const captionText = clip.dialogue_summary
        ? clip.character_name
          ? `${clip.character_name}: ${clip.dialogue_summary}`
          : clip.dialogue_summary
        : clip.scene_heading;

      return `${index + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${captionText}\n`;
    })
    .join("\n");
}

export async function renderSequenceToVideoBlob(params: {
  clips: VideoClipDraft[];
  aspectRatio: VideoAspectRatio;
  storyTitle: string;
  onProgress?: (clipIndex: number, totalClips: number) => void;
}): Promise<{
  blob: Blob | null;
  mimeType: string;
  extension: "mp4" | "webm" | "json";
  totalDurationSec: number;
}> {
  const { clips, aspectRatio, storyTitle, onProgress } = params;
  const dims = getSafeDimensions(aspectRatio);
  const totalDurationSec = clips.reduce((acc, c) => acc + (Number(c.duration_sec) || 4), 0);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return { blob: null, mimeType: "", extension: "json", totalDurationSec };
  }

  if (typeof MediaRecorder === "undefined") {
    return { blob: null, mimeType: "", extension: "json", totalDurationSec };
  }

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");

  if (!ctx || typeof canvas.captureStream !== "function") {
    return { blob: null, mimeType: "", extension: "json", totalDurationSec };
  }

  const stream = canvas.captureStream(24);

  const preferredTypes: Array<{ mime: string; ext: "mp4" | "webm" }> = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];

  const selectedFormat = preferredTypes.find((item) => MediaRecorder.isTypeSupported(item.mime));

  if (!selectedFormat) {
    return { blob: null, mimeType: "", extension: "json", totalDurationSec };
  }

  const loadedImages = await Promise.all(clips.map((clip) => loadImageSafe(clip.image_url)));

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: selectedFormat.mime });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selectedFormat.mime }));
    };
    recorder.onerror = () => {
      reject(new Error("MediaRecorder failed during canvas capture."));
    };
  });

  recorder.start(250);

  const fps = 24;
  const frameIntervalMs = 1000 / fps;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const img = loadedImages[i];
    if (onProgress) onProgress(i + 1, clips.length);

    const visualFrames = Math.max(
      18,
      Math.min(96, Math.round((Number(clip.duration_sec) || 4) * fps * 0.5))
    );

    for (let f = 0; f < visualFrames; f++) {
      const progress = f / Math.max(visualFrames - 1, 1);

      const grad = ctx.createLinearGradient(0, 0, dims.width, dims.height);
      grad.addColorStop(0, "#141412");
      grad.addColorStop(1, "#26211b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, dims.width, dims.height);

      if (img) {
        const scale = clip.transition_type === "ken_burns" ? 1.0 + progress * 0.08 : 1.0;
        const imgAspect = img.width / Math.max(img.height, 1);
        const canvasAspect = dims.width / dims.height;

        let drawW = dims.width;
        let drawH = dims.height;
        if (imgAspect > canvasAspect) {
          drawH = dims.height;
          drawW = imgAspect * drawH;
        } else {
          drawW = dims.width;
          drawH = drawW / Math.max(imgAspect, 0.1);
        }

        drawW *= scale;
        drawH *= scale;

        const dx = (dims.width - drawW) / 2;
        const dy = (dims.height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        ctx.fillStyle = "rgba(14, 14, 12, 0.48)";
        ctx.fillRect(0, 0, dims.width, dims.height);
      }

      const padX = Math.round(dims.width * 0.05);
      const padY = Math.round(dims.height * 0.06);
      ctx.fillStyle = "#f2a36f";
      ctx.font = `700 ${Math.max(14, Math.round(dims.width * 0.015))}px sans-serif`;
      ctx.fillText(
        `${storyTitle.toUpperCase()} • CLIP ${i + 1}/${clips.length} (${aspectRatio})`,
        padX,
        padY
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.max(20, Math.round(dims.width * 0.026))}px sans-serif`;
      const headingLines = wrapCanvasText(
        ctx,
        clip.scene_heading || `Shot #${clip.shot_number}`,
        dims.width - padX * 2
      );
      headingLines.slice(0, 2).forEach((line, lIdx) => {
        ctx.fillText(line, padX, padY + 38 + lIdx * 34);
      });

      const caption = clip.dialogue_summary
        ? clip.character_name
          ? `${clip.character_name}: "${clip.dialogue_summary}"`
          : `"${clip.dialogue_summary}"`
        : clip.visual_prompt || clip.continuity_notes || "";

      if (caption) {
        ctx.fillStyle = "rgba(18, 18, 16, 0.82)";
        const boxHeight = Math.max(76, Math.round(dims.height * 0.14));
        const boxY = dims.height - boxHeight - padY;
        ctx.fillRect(padX, boxY, dims.width - padX * 2, boxHeight);

        ctx.fillStyle = "#f5f3ee";
        ctx.font = `500 ${Math.max(16, Math.round(dims.width * 0.019))}px sans-serif`;
        const subLines = wrapCanvasText(ctx, caption, dims.width - padX * 2 - 36);
        subLines.slice(0, 2).forEach((line, sIdx) => {
          ctx.fillText(line, padX + 18, boxY + 34 + sIdx * 28);
        });
      }

      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }
  }

  recorder.stop();
  const blob = await recordingDone;
  stream.getTracks().forEach((track) => track.stop());

  return {
    blob,
    mimeType: selectedFormat.mime,
    extension: selectedFormat.ext,
    totalDurationSec,
  };
}