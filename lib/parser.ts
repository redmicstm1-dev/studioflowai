import { supabase } from "@/lib/supabase";

export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".txt") || fileName.endsWith(".fountain")) {
    return await file.text();
  }

  // Fallback to standard text reading if PDF/DOCX workers fail
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Helper to sanitize strings against Postgres unicode escape errors
function sanitizeText(text: string): string {
  if (!text) return "";
  return text.replace(/[\x00-\x1F\x7F]/g, "").replace(/\\/g, "/").trim();
}

export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
) {
  if (!supabase || !rawText.trim()) return;

  const cleanText = sanitizeText(rawText);

  // STEP 1: Optional Storage Upload (Safe Fallback if bucket missing)
  try {
    const filePath = `${projectId}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { data: uploadData } = await supabase.storage
      .from("workshop_assets")
      .upload(filePath, file);

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("workshop_assets")
        .getPublicUrl(filePath);

      await supabase.from("workshop_assets").insert([
        {
          project_id: projectId,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_url: publicUrlData?.publicUrl || "",
          category: "script",
        },
      ]);
    }
  } catch (err) {
    console.warn("Storage upload skipped or bucket missing:", err);
  }

  // STEP 2: Parse Lines
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim());
  const SCENE_HEADING_REGEX = /^(?:INT\.|EXT\.|I\/E\.|INT\/EXT\.|EST\.|INT\s|EXT\s)[A-Z0-9\s\-\.\,\'\/\(\)]+/i;
  const CHARACTER_HEADER_REGEX = /^([A-Z0-9\s\.\'\-]{2,30})(?:\s*\((?:V\.O\.|O\.S\.|CONT'D|OVER|FILTER)\))?$/;

  const charactersMap = new Map<string, { occurrences: number; dialogueSample: string }>();
  const scenes: { heading: string; action: string; dialogue: string[] }[] = [];

  let currentHeading = "";
  let currentActionBuffer: string[] = [];
  let currentDialogueBuffer: string[] = [];
  let lastCharacterName = "";

  lines.forEach((line) => {
    if (!line) return;

    if (SCENE_HEADING_REGEX.test(line)) {
      if (currentHeading || currentActionBuffer.length > 0) {
        scenes.push({
          heading: currentHeading || "EXT. ESTABLISHING LOCATION - DAY",
          action: currentActionBuffer.join(" "),
          dialogue: currentDialogueBuffer,
        });
      }
      currentHeading = line.toUpperCase();
      currentActionBuffer = [];
      currentDialogueBuffer = [];
      lastCharacterName = "";
      return;
    }

    const charMatch = line.match(CHARACTER_HEADER_REGEX);
    if (charMatch && line === line.toUpperCase() && !line.includes(":")) {
      const cleanCharName = charMatch[1].trim();
      if (cleanCharName.length >= 2) {
        lastCharacterName = cleanCharName;
        const existing = charactersMap.get(cleanCharName);
        charactersMap.set(cleanCharName, {
          occurrences: (existing?.occurrences || 0) + 1,
          dialogueSample: existing?.dialogueSample || "",
        });
        return;
      }
    }

    if (lastCharacterName && line.length > 0) {
      const charInfo = charactersMap.get(lastCharacterName);
      if (charInfo && !charInfo.dialogueSample) {
        charInfo.dialogueSample = line;
      }
      currentDialogueBuffer.push(`${lastCharacterName}: ${line}`);
    } else {
      currentActionBuffer.push(line);
    }
  });

  if (currentHeading || currentActionBuffer.length > 0) {
    scenes.push({
      heading: currentHeading || "EXT. OPENING SCENE - DAY",
      action: currentActionBuffer.join(" "),
      dialogue: currentDialogueBuffer,
    });
  }

  if (scenes.length === 0) {
    scenes.push({
      heading: "EXT. MAIN PROJECT WORKSPACE - DAY",
      action: cleanText.slice(0, 800),
      dialogue: [],
    });
  }

  if (charactersMap.size === 0) {
    charactersMap.set("LEAD CHARACTER", {
      occurrences: 1,
      dialogueSample: "Initial voice profile reference.",
    });
  }

  // STEP 3: Database Seeding
  for (const [name, info] of Array.from(charactersMap.entries())) {
    const { data: charData } = await supabase
      .from("story_characters")
      .insert([
        {
          story_id: storyId,
          name: sanitizeText(name),
          role: info.occurrences > 3 ? "Protagonist" : "Supporting",
          bio: `Auto-parsed from script (${info.occurrences} speaking cues).`,
        },
      ])
      .select()
      .single();

    if (charData) {
      await supabase.from("workshop_voices").insert([
        {
          story_id: storyId,
          character_id: charData.id,
          voice_model: "Standard Neural AI",
          dialogue_reference: sanitizeText(info.dialogueSample || `Voice reference for ${name}`),
        },
      ]);
    }
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    const { data: scriptData } = await supabase
      .from("story_scripts")
      .insert([
        {
          story_id: storyId,
          scene_number: i + 1,
          heading: sanitizeText(scene.heading),
          action_text: sanitizeText(scene.action),
        },
      ])
      .select()
      .single();

    if (scriptData) {
      const shotType = scene.heading.includes("INT.") ? "Medium Close-up / Interior" : "Wide Shot / Exterior";

      await supabase.from("workshop_shots").insert([
        {
          story_id: storyId,
          scene_id: scriptData.id,
          shot_number: 1,
          shot_type: shotType,
          camera_movement: "Dynamic Tracking / Push In",
          visual_prompt: `Cinematic render prompt for ${sanitizeText(scene.heading)}`,
        },
      ]);
    }
  }

  await supabase.from("story_episodes").insert([
    {
      story_id: storyId,
      episode_number: 1,
      title: `${file.name.replace(/\.[^/.]+$/, "")} - Episode 1`,
      synopsis: `Auto-ingested screenplay containing ${scenes.length} scenes and ${charactersMap.size} key characters.`,
    },
  ]);
}