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

export function buildCharacterBiblePrompt(
  character: ProjectCharacter,
  continuity?: ProjectCharacterContinuity
): string {
  const parts: string[] = [
    `Cinematic character concept portrait of ${character.name}`,
    character.role ? `(${character.role})` : "",
    character.age ? `age ${character.age}` : "",
    character.description || "",
  ];

  if (continuity) {
    if (continuity.skin_tone) parts.push(`skin tone: ${continuity.skin_tone}`);
    if (continuity.build) parts.push(`build: ${continuity.build}`);
    if (continuity.hair_style) parts.push(`hair: ${continuity.hair_style}`);
    if (continuity.distinguishing_features) {
      parts.push(`distinguishing features: ${continuity.distinguishing_features}`);
    }
    if (Array.isArray(continuity.wardrobe) && continuity.wardrobe.length > 0) {
      parts.push(`wearing ${continuity.wardrobe.join(", ")}`);
    }
    if (Array.isArray(continuity.props_and_accessories) && continuity.props_and_accessories.length > 0) {
      parts.push(`holding/carrying ${continuity.props_and_accessories.join(", ")}`);
    }
  }

  parts.push(
    "dramatic rim lighting, 35mm film still, shallow depth of field, production character bible sheet, ultra-detailed"
  );

  return sanitizeText(parts.filter(Boolean).join(", "));
}

export function buildFallbackStoryboardDataUrl(title: string, subtitle: string, category: string): string {
  const safeTitle = sanitizeText(title, "Studio Asset").slice(0, 42).replace(/[<>&"']/g, "");
  const safeSub = sanitizeText(subtitle, "Production Concept").slice(0, 68).replace(/[<>&"']/g, "");
  const badge = sanitizeText(category, "ASSET").toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#191815"/>
        <stop offset="100%" stop-color="#2a241d"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="576" fill="url(#bg)"/>
    <rect x="28" y="28" width="968" height="520" rx="18" fill="none" stroke="#e4c66e" stroke-opacity="0.35" stroke-width="2"/>
    <text x="56" y="84" fill="#e4c66e" font-family="sans-serif" font-size="16" font-weight="700" letter-spacing="3">${badge} CONCEPT FRAME</text>
    <text x="56" y="285" fill="#ffffff" font-family="sans-serif" font-size="36" font-weight="700">${safeTitle}</text>
    <text x="56" y="332" fill="#b4afa6" font-family="sans-serif" font-size="20">${safeSub}</text>
    <text x="56" y="510" fill="#7c7870" font-family="sans-serif" font-size="15">StudioFlow AI Workshop • Continuity Reference</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateOneClickImageUrl(params: {
  prompt: string;
  category: string;
  seedOffset?: number;
}): string {
  const cleanPrompt = sanitizeText(params.prompt, "Cinematic film production frame, 35mm");
  const isCharacter = params.category.toLowerCase() === "character";
  const width = isCharacter ? 768 : 1024;
  const height = isCharacter ? 960 : 576;
  const seed = Math.abs(
    cleanPrompt.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + (params.seedOffset || Date.now() % 10000)
  );

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    cleanPrompt
  )}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
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
    characters,
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

  // 1. Character Bible Cards (Characters + Continuity merged)
  characters.forEach((char, idx) => {
    const matchCont = continuity.find(
      (c) =>
        (c.character_id && c.character_id === char.id) ||
        c.character_name.toLowerCase() === char.name.toLowerCase()
    );

    const biblePrompt = buildCharacterBiblePrompt(char, matchCont);
    const continuitySummary = matchCont
      ? [
          matchCont.skin_tone && `Skin: ${matchCont.skin_tone}`,
          matchCont.build && `Build: ${matchCont.build}`,
          matchCont.hair_style && `Hair: ${matchCont.hair_style}`,
          matchCont.distinguishing_features && `Features: ${matchCont.distinguishing_features}`,
          Array.isArray(matchCont.wardrobe) && matchCont.wardrobe.length > 0
            ? `Wardrobe: ${matchCont.wardrobe.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" • ")
      : char.personality || "Maintain consistent facial structure, hair, and costume.";

    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "character",
      name: char.name,
      linked_entity: `${char.role || "Principal"}${char.age ? ` (${char.age})` : ""}`,
      episode_number: episodes[idx % Math.max(episodes.length, 1)]?.episode_number || 1,
      description: sanitizeText(char.description || char.backstory || `${char.name} Character Bible sheet`),
      continuity_notes: sanitizeText(continuitySummary),
      reference_url_or_prompt: biblePrompt,
      image_url: "",
      status: "ready",
    });
  });

  // 2. Scenes from Shots & Script Headings
  shots.forEach((shot) => {
    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "scene",
      name: `Shot #${shot.shot_number} — ${shot.scene_heading}`,
      linked_entity: `Episode ${shot.episode_number} • ${shot.camera_angle}`,
      episode_number: shot.episode_number || 1,
      description: `${shot.camera_angle}, ${shot.camera_movement}, ${shot.lighting_mood}`,
      continuity_notes: shot.continuity_notes || `Lighting lock: ${shot.lighting_mood}`,
      reference_url_or_prompt:
        shot.visual_prompt ||
        `${shot.scene_heading}, ${shot.camera_angle}, ${shot.lighting_mood}, cinematic 35mm film frame`,
      image_url: "",
      status: "ready",
    });
  });

  const combinedScript = scripts.map((s) => s.content || "").join("\n");
  const sceneLines = combinedScript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(line));

  sceneLines.slice(0, 8).forEach((heading, idx) => {
    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "scene",
      name: heading,
      linked_entity: `Scene ${idx + 1}`,
      episode_number: episodes[idx % Math.max(episodes.length, 1)]?.episode_number || 1,
      description: `Script scene environment for ${heading}`,
      continuity_notes: `Maintain consistent lighting direction, weather, and set dressing for ${heading}.`,
      reference_url_or_prompt: `Cinematic wide establishing film frame of ${heading}, dramatic atmospheric lighting, 35mm lens, production concept art.`,
      image_url: "",
      status: "ready",
    });
  });

  // 3. Wardrobe & Props from Continuity
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
        continuity_notes: `Keep fit, weathering, and styling consistent for ${c.character_name}.`,
        reference_url_or_prompt: `Costume design reference sheet: ${cleanItem} worn by ${c.character_name}, studio lighting, detailed fabric texture.`,
        image_url: "",
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
        description: `Hero prop / accessory linked to ${c.character_name}.`,
        continuity_notes: `Track placement and condition of ${cleanProp} across shots.`,
        reference_url_or_prompt: `Hero film prop close-up: ${cleanProp}, crisp detail, dramatic studio lighting, production design asset.`,
        image_url: "",
        status: "ready",
      });
    });
  });

  if (drafts.length === 0) {
    addUniqueAsset({
      project_id: projectId,
      story_id: storyId,
      category: "scene",
      name: `${storyTitle} — Key Visual Concept`,
      linked_entity: storyTitle,
      episode_number: episodes[0]?.episode_number || 1,
      description: "Primary visual style and atmosphere frame.",
      continuity_notes: "Maintain consistent palette and lens feel across all scenes.",
      reference_url_or_prompt: `Cinematic concept keyframe for ${storyTitle}, dramatic lighting, 35mm film still.`,
      image_url: "",
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
    image_url: asset.image_url || "",
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