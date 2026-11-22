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
  const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
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

  // Prioritize native MP4 for universal playback across iOS, Android, desktop & editors
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

  const loadedImages = await Promise.all(
    clips.map((clip) => loadImageSafe(clip.image_url))
  );

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
        const scale =
          clip.transition_type === "ken_burns" ? 1.0 + progress * 0.08 : 1.0;
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