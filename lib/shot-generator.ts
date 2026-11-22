import { supabase } from "@/lib/supabase";
import {
  ProjectCharacter,
  ProjectCharacterContinuity,
  ProjectEpisode,
  ProjectScript,
  ProjectShot,
  ShotDraft,
} from "@/types/story";

function sanitizeText(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

function extractSceneHeadings(scriptText: string): string[] {
  if (!scriptText) return [];
  const matches = scriptText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(line));

  return Array.from(new Set(matches)).slice(0, 8);
}

function buildContinuitySummary(
  characters: ProjectCharacter[],
  continuity: ProjectCharacterContinuity[]
): string {
  if (continuity.length > 0) {
    return continuity
      .slice(0, 3)
      .map((c) => {
        const wardrobe = Array.isArray(c.wardrobe) && c.wardrobe.length > 0 ? c.wardrobe[0] : "Standard attire";
        const feature = c.distinguishing_features ? ` (${c.distinguishing_features})` : "";
        return `${c.character_name}${feature}: ${wardrobe}`;
      })
      .join(" | ");
  }

  if (characters.length > 0) {
    return characters
      .slice(0, 3)
      .map((ch) => `${ch.name} [${ch.role || "Role"}]`)
      .join(" | ");
  }

  return "Maintain consistent wardrobe, lighting direction, and spatial screen direction.";
}

function generateLocalShotBreakdown(params: {
  projectId: string;
  storyId: string;
  storyTitle: string;
  episodes: ProjectEpisode[];
  scripts: ProjectScript[];
  characters: ProjectCharacter[];
  continuity: ProjectCharacterContinuity[];
}): ShotDraft[] {
  const { projectId, storyId, storyTitle, episodes, scripts, characters, continuity } = params;

  const combinedScriptText = scripts.map((s) => s.content || "").join("\n\n");
  const sceneHeadings = extractSceneHeadings(combinedScriptText);
  const continuitySummary = buildContinuitySummary(characters, continuity);

  const cameraAngles = [
    "Wide Establishing Shot (WS)",
    "Medium Shot (MS)",
    "Over-the-Shoulder (OTS)",
    "Close-Up (CU)",
    "Low-Angle Hero Shot",
    "Tracking Medium Wide (MW)",
  ];

  const cameraMovements = [
    "Slow Push-In",
    "Static Tripod",
    "Steadicam Follow",
    "Dolly Lateral",
    "Handheld Tension",
    "Crane Reveal",
  ];

  const lightingMoods = [
    "High-Contrast Noir & Neon Rim",
    "Natural Daylight / Soft Diffused",
    "Moody Practical & Shadow",
    "Dramatic Backlight / Silhouette",
  ];

  const sourceUnits: { episodeId: string | null; episodeNumber: number; heading: string; context: string }[] = [];

  if (sceneHeadings.length > 0) {
    sceneHeadings.forEach((heading, idx) => {
      const ep = episodes[idx % Math.max(episodes.length, 1)];
      sourceUnits.push({
        episodeId: ep?.id ?? null,
        episodeNumber: ep?.episode_number ?? 1,
        heading,
        context: ep?.synopsis || storyTitle,
      });
    });
  } else if (episodes.length > 0) {
    episodes.forEach((ep) => {
      sourceUnits.push({
        episodeId: ep.id,
        episodeNumber: ep.episode_number || 1,
        heading: `EP ${ep.episode_number || 1} — ${ep.title}`,
        context: ep.synopsis || storyTitle,
      });
    });
  } else {
    sourceUnits.push({
      episodeId: null,
      episodeNumber: 1,
      heading: `INT. ${storyTitle.toUpperCase()} — MAIN SEQUENCE`,
      context: combinedScriptText.slice(0, 240) || storyTitle,
    });
  }

  const shots: ShotDraft[] = [];
  let shotCounter = 1;

  sourceUnits.slice(0, 6).forEach((unit, idx) => {
    const angle = cameraAngles[idx % cameraAngles.length];
    const movement = cameraMovements[idx % cameraMovements.length];
    const lighting = lightingMoods[idx % lightingMoods.length];
    const leadChar = characters[idx % Math.max(characters.length, 1)]?.name;

    const promptSubject = leadChar
      ? `${leadChar} in ${unit.heading}, ${unit.context}`
      : `${unit.heading}, ${unit.context}`;

    shots.push({
      project_id: projectId,
      story_id: storyId,
      episode_id: unit.episodeId,
      episode_number: unit.episodeNumber,
      shot_number: shotCounter++,
      scene_heading: sanitizeText(unit.heading, "INT. SCENE — DAY"),
      camera_angle: angle,
      camera_movement: movement,
      lighting_mood: lighting,
      visual_prompt: sanitizeText(
        `${angle}, ${movement.toLowerCase()}, ${lighting.toLowerCase()}, ${promptSubject}. Cinematic 35mm film grain, sharp focus, production storyboard frame.`
      ),
      continuity_notes: sanitizeText(continuitySummary),
      status: "planned",
    });
  });

  return shots;
}

export async function fetchStoryShotContext(storyId: string) {
  if (!supabase || !storyId) {
    return {
      storyTitle: "Story Workspace",
      episodes: [] as ProjectEpisode[],
      scripts: [] as ProjectScript[],
      characters: [] as ProjectCharacter[],
      continuity: [] as ProjectCharacterContinuity[],
      shots: [] as ProjectShot[],
    };
  }

  const [storyRes, epRes, scriptRes, charRes, contRes, shotRes] = await Promise.all([
    supabase.from("project_stories").select("id, title").eq("id", storyId).maybeSingle(),
    supabase.from("project_episodes").select("*").eq("story_id", storyId).order("episode_number", { ascending: true }),
    supabase.from("project_scripts").select("*").eq("story_id", storyId).order("version", { ascending: false }),
    supabase.from("project_characters").select("*").eq("story_id", storyId),
    supabase.from("project_continuity").select("*").eq("story_id", storyId),
    supabase
      .from("project_shots")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true })
      .order("shot_number", { ascending: true }),
  ]);

  return {
    storyTitle: storyRes.data?.title || "Story Workspace",
    episodes: (epRes.data || []) as ProjectEpisode[],
    scripts: (scriptRes.data || []) as ProjectScript[],
    characters: (charRes.data || []) as ProjectCharacter[],
    continuity: (contRes.data || []) as ProjectCharacterContinuity[],
    shots: (shotRes.data || []) as ProjectShot[],
  };
}

export async function generateShotBreakdownForStory(params: {
  projectId: string;
  storyId: string;
  storyTitle: string;
  episodes: ProjectEpisode[];
  scripts: ProjectScript[];
  characters: ProjectCharacter[];
  continuity: ProjectCharacterContinuity[];
}): Promise<ShotDraft[]> {
  const { projectId, storyId, storyTitle, episodes, scripts, characters, continuity } = params;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const combinedScriptText = scripts.map((s) => s.content || "").join("\n\n").slice(0, 12000);
  const episodeContext = episodes.map((e) => `Ep ${e.episode_number}: ${e.title} - ${e.synopsis}`).join("\n");
  const charContext = characters.map((c) => `${c.name} (${c.role}): ${c.description}`).join("\n");

  if (apiKey && (combinedScriptText.trim() || episodeContext.trim())) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a film director & cinematographer. Break down this story into 6 structured shots and return ONLY a valid JSON array of objects with keys: episode_number (number), shot_number (number), scene_heading (string), camera_angle (string), camera_movement (string), lighting_mood (string), visual_prompt (string), continuity_notes (string).
Story: ${storyTitle}
Episodes:
${episodeContext}
Characters:
${charContext}
Script Excerpt:
${combinedScriptText}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.25,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const fallbackContinuity = buildContinuitySummary(characters, continuity);
          return parsed.slice(0, 12).map((item: Record<string, unknown>, idx: number) => {
            const epNum = Number(item.episode_number) || episodes[0]?.episode_number || 1;
            const matchedEp = episodes.find((e) => e.episode_number === epNum);
            return {
              project_id: projectId,
              story_id: storyId,
              episode_id: matchedEp?.id ?? null,
              episode_number: epNum,
              shot_number: Number(item.shot_number) || idx + 1,
              scene_heading: sanitizeText(String(item.scene_heading || ""), `INT. SCENE ${idx + 1} — DAY`),
              camera_angle: sanitizeText(String(item.camera_angle || ""), "Medium Shot (MS)"),
              camera_movement: sanitizeText(String(item.camera_movement || ""), "Static Tripod"),
              lighting_mood: sanitizeText(String(item.lighting_mood || ""), "Moody Cinematic"),
              visual_prompt: sanitizeText(String(item.visual_prompt || ""), ""),
              continuity_notes: sanitizeText(String(item.continuity_notes || ""), fallbackContinuity),
              status: "planned",
            };
          });
        }
      }
    } catch {
      // Fall through to deterministic local breakdown
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return generateLocalShotBreakdown(params);
}

export async function saveShotsToSupabase(
  projectId: string,
  storyId: string,
  shots: ShotDraft[]
): Promise<ProjectShot[]> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { error: deleteError } = await supabase
    .from("project_shots")
    .delete()
    .eq("story_id", storyId);

  if (deleteError) {
    throw new Error(`Failed to clear existing shots: ${deleteError.message}`);
  }

  if (shots.length === 0) {
    return [];
  }

  const rowsToInsert = shots.map((shot, index) => ({
    project_id: projectId,
    story_id: storyId,
    episode_id: shot.episode_id ?? null,
    episode_number: Number(shot.episode_number) || 1,
    shot_number: Number(shot.shot_number) || index + 1,
    scene_heading: sanitizeText(shot.scene_heading, `SHOT ${index + 1}`),
    camera_angle: sanitizeText(shot.camera_angle, "Medium Shot (MS)"),
    camera_movement: sanitizeText(shot.camera_movement, "Static Tripod"),
    lighting_mood: sanitizeText(shot.lighting_mood, "Moody Cinematic"),
    visual_prompt: sanitizeText(shot.visual_prompt, ""),
    continuity_notes: sanitizeText(shot.continuity_notes, ""),
    status: sanitizeText(shot.status, "planned"),
    updated_at: new Date().toISOString(),
  }));

  const { data, error: insertError } = await supabase
    .from("project_shots")
    .insert(rowsToInsert)
    .select();

  if (insertError) {
    throw new Error(`Failed to save shots: ${insertError.message}`);
  }

  return (data || []) as ProjectShot[];
}