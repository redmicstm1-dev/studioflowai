import { supabase } from "@/lib/supabase";
import {
  AssetDraft,
  ProjectAsset,
  ProjectCharacter,
  ProjectCharacterContinuity,
  ProjectEpisode,
  ProjectScript,
  ProjectShot,
} from "@/types/story";

function sanitizeText(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

export function extractAssetsFromStoryContext(params: {
  projectId: string;
  storyId: string;
  storyTitle: string;
  episodes: ProjectEpisode[];
  scripts: ProjectScript[];
  characters: ProjectCharacter[];
  continuity: ProjectCharacterContinuity[];
  shots: ProjectShot[];
  existingAssets: AssetDraft[];
}): AssetDraft[] {
  const {
    projectId,
    storyId,
    storyTitle,
    episodes,
    scripts,
    continuity,
    shots,
    existingAssets,
  } = params;

  const existingByKey = new Map(
    existingAssets.map((a) => [`${a.category.toLowerCase()}::${a.name.toLowerCase()}`, a])
  );

  const drafts: AssetDraft[] = [];
  const seenKeys = new Set<string>();

  const addUniqueAsset = (candidate: AssetDraft) => {
    const cleanName = sanitizeText(candidate.name);
    if (!cleanName) return;
    const key = `${candidate.category.toLowerCase()}::${cleanName.toLowerCase()}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    const preserved = existingByKey.get(key);
    if (preserved) {
      drafts.push({
        ...preserved,
        project_id: projectId,
        story_id: storyId,
      });
      return;
    }

    drafts.push({
      ...candidate,
      project_id: projectId,
      story_id: storyId,
      name: cleanName,
    });
  };

  // 1. Extract locations from script scene headings (INT./EXT.)
  const combinedScript = scripts.map((s) => s.content || "").join("\n");
  const sceneLines = combinedScript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(line));

  sceneLines.slice(0, 8).forEach((heading, idx) => {
    const cleanedLocation = heading
      .replace(/^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)\s*/i, "")
      .replace(/\s*-\s*(DAY|NIGHT|DUSK|DAWN|LATER|CONTINUOUS|MORNING|EVENING).*$/i, "")
      .trim();

    if (cleanedLocation) {
      addUniqueAsset({
        project_id: projectId,
        story_id: storyId,
        category: "location",
        name: cleanedLocation,
        linked_entity: `Scene ${idx + 1}`,
        episode_number: episodes[idx % Math.max(episodes.length, 1)]?.episode_number || 1,
        description: `Set/location derived from ${heading}`,
        continuity_notes: `Keep lighting, spatial layout, and set dressing consistent for ${cleanedLocation}.`,
        reference_url_or_prompt: `Cinematic production design reference of ${cleanedLocation}, atmospheric lighting, architectural detail, 35mm film still.`,
        status: "ready",
      });
    }
  });

  // 2. Extract wardrobe & props from character continuity profiles
  continuity.forEach((c, idx) => {
    const epNum = episodes[idx % Math.max(episodes.length, 1)]?.episode_number || 1;

    (Array.isArray(c.wardrobe) ? c.wardrobe : []).forEach((item) => {
      const cleanItem = sanitizeText(item);
      if (!cleanItem) return;
      addUniqueAsset({
        project_id: projectId,
        story_id: storyId,
        category: "wardrobe",
        name: cleanItem,
        linked_entity: c.character_name,
        episode_number: epNum,
        description: `Signature wardrobe piece for ${c.character_name}.`,
        continuity_notes: sanitizeText(
          `${c.character_name} (${c.skin_tone || "Consistent tone"}, ${c.build || "Consistent build"}) — match wear, fit, and styling across scenes.`
        ),
        reference_url_or_prompt: `Costume & wardrobe reference: ${cleanItem} worn by ${c.character_name}, studio lighting, fabric texture detail.`,
        status: "ready",
      });
    });

    (Array.isArray(c.props_and_accessories) ? c.props_and_accessories : []).forEach((prop) => {
      const cleanProp = sanitizeText(prop);
      if (!cleanProp) return;
      addUniqueAsset({
        project_id: projectId,
        story_id: storyId,
        category: "prop",
        name: cleanProp,
        linked_entity: c.character_name,
        episode_number: epNum,
        description: `Key prop or accessory linked to ${c.character_name}.`,
        continuity_notes: sanitizeText(
          `Track placement, handoff, and condition of ${cleanProp} across shots.`
        ),
        reference_url_or_prompt: `Hero prop close-up reference: ${cleanProp}, crisp detail, neutral studio background, production asset sheet.`,
        status: "ready",
      });
    });
  });

  // 3. Add visual reference assets from shots if available
  shots.slice(0, 4).forEach((shot, idx) => {
    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "reference",
      name: `Shot #${shot.shot_number} Frame — ${shot.camera_angle}`,
      linked_entity: shot.scene_heading,
      episode_number: shot.episode_number || 1,
      description: `${shot.camera_movement} • ${shot.lighting_mood}`,
      continuity_notes: shot.continuity_notes || `Match lighting mood: ${shot.lighting_mood}`,
      reference_url_or_prompt: shot.visual_prompt || `${shot.scene_heading}, ${shot.camera_angle}, ${shot.lighting_mood}`,
      status: "draft",
    });
    void idx;
  });

  // Fallback baseline asset if story has no extracted items yet
  if (drafts.length === 0) {
    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "reference",
      name: `${storyTitle} — Visual Style Guide`,
      linked_entity: storyTitle,
      episode_number: episodes[0]?.episode_number || 1,
      description: "Primary visual moodboard, color tone, and framing reference.",
      continuity_notes: "Maintain consistent palette, lens feel, and continuity across all episodes.",
      reference_url_or_prompt: `Cinematic visual style guide for ${storyTitle}, dramatic lighting, cohesive color grading.`,
      status: "draft",
    });
  }

  return drafts;
}

export async function fetchStoryAssetContext(storyId: string) {
  if (!supabase || !storyId) {
    return {
      storyTitle: "Story Workspace",
      episodes: [] as ProjectEpisode[],
      scripts: [] as ProjectScript[],
      characters: [] as ProjectCharacter[],
      continuity: [] as ProjectCharacterContinuity[],
      shots: [] as ProjectShot[],
      assets: [] as ProjectAsset[],
    };
  }

  const [storyRes, epRes, scriptRes, charRes, contRes, shotRes, assetRes] = await Promise.all([
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
    supabase.from("project_assets").select("*").eq("story_id", storyId).order("created_at", { ascending: true }),
  ]);

  return {
    storyTitle: storyRes.data?.title || "Story Workspace",
    episodes: (epRes.data || []) as ProjectEpisode[],
    scripts: (scriptRes.data || []) as ProjectScript[],
    characters: (charRes.data || []) as ProjectCharacter[],
    continuity: (contRes.data || []) as ProjectCharacterContinuity[],
    shots: (shotRes.data || []) as ProjectShot[],
    assets: (assetRes.data || []) as ProjectAsset[],
  };
}

export async function saveAssetsToSupabase(
  projectId: string,
  storyId: string,
  assets: AssetDraft[]
): Promise<ProjectAsset[]> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const { error: deleteError } = await supabase
    .from("project_assets")
    .delete()
    .eq("story_id", storyId);

  if (deleteError) {
    throw new Error(`Failed to clear existing assets: ${deleteError.message}`);
  }

  if (assets.length === 0) {
    return [];
  }

  const rowsToInsert = assets.map((asset, idx) => ({
    project_id: projectId,
    story_id: storyId,
    category: sanitizeText(asset.category, "prop"),
    name: sanitizeText(asset.name, `Asset ${idx + 1}`),
    linked_entity: sanitizeText(asset.linked_entity, ""),
    episode_number: Number(asset.episode_number) || 1,
    description: sanitizeText(asset.description, ""),
    continuity_notes: sanitizeText(asset.continuity_notes, ""),
    reference_url_or_prompt: sanitizeText(asset.reference_url_or_prompt, ""),
    status: sanitizeText(asset.status, "ready"),
    updated_at: new Date().toISOString(),
  }));

  const { data, error: insertError } = await supabase
    .from("project_assets")
    .insert(rowsToInsert)
    .select();

  if (insertError) {
    throw new Error(`Failed to save assets: ${insertError.message}`);
  }

  return (data || []) as ProjectAsset[];
}