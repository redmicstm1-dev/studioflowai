import { supabase } from "@/lib/supabase";

export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
) {
  const lines = rawText.split("\n").filter(Boolean);
  
  const extractedCharacters = new Set<string>();
  const extractedScenes: { heading: string; action: string; sceneNum: number }[] = [];
  
  let currentScene = { heading: "EXT. UNKNOWN LOCATION - DAY", action: "", sceneNum: 1 };
  let sceneCounter = 1;

  // 1. Parse raw text into structured cinematic entities
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("EXT.") || trimmed.startsWith("INT.") || trimmed.startsWith("EST.")) {
      if (currentScene.action) extractedScenes.push({ ...currentScene });
      sceneCounter++;
      currentScene = { heading: trimmed, action: "", sceneNum: sceneCounter };
    } else if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes(".")) {
      extractedCharacters.add(trimmed);
    } else {
      currentScene.action += `${trimmed} `;
    }
  });

  if (currentScene.action) extractedScenes.push(currentScene);

  // 2. Save Original Script File to Central Asset Library
  await supabase.from("workshop_assets").insert([
    {
      project_id: projectId,
      story_id: storyId,
      asset_name: file.name,
      asset_type: "script",
      file_url: "uploaded_locally_or_bucket_path",
      tags: ["imported-script", "source-material"],
    },
  ]);

  // 3. Populate Story Studio (Characters & Scripts)
  const charInserts = Array.from(extractedCharacters).slice(0, 10).map((name) => ({
    story_id: storyId,
    name,
    role: "Supporting",
    bio: "Auto-extracted from script import.",
    motivation: "Pending definition",
    conflict: "Pending definition",
  }));

  if (charInserts.length > 0) {
    await supabase.from("story_characters").insert(charInserts);
  }

  const scriptInserts = extractedScenes.map((s) => ({
    story_id: storyId,
    scene_number: s.sceneNum,
    heading: s.heading,
    action_text: s.action.trim(),
    dialogue_block: [],
  }));

  if (scriptInserts.length > 0) {
    await supabase.from("story_scripts").insert(scriptInserts);
  }

  // 4. Automatically Sync & Seed Shot Studio from Scene Headings
  const shotInserts = extractedScenes.map((s) => ({
    story_id: storyId,
    scene_number: s.sceneNum,
    shot_number: 1,
    angle: s.heading.includes("INT.") ? "MEDIUM SHOT" : "WIDE ESTABLISHING",
    camera_movement: "STATIC",
    description: `Primary shot for scene: ${s.heading}`,
  }));

  if (shotInserts.length > 0) {
    await supabase.from("workshop_shots").insert(shotInserts);
  }

  // 5. Initialize Voice Studio placeholders for extracted characters
  const voiceInserts = Array.from(extractedCharacters).slice(0, 5).map((name) => ({
    story_id: storyId,
    voice_model: "Standard Neural Voice",
    dialogue_reference: `Voice profile initialized for ${name}`,
  }));

  if (voiceInserts.length > 0) {
    await supabase.from("workshop_voices").insert(voiceInserts);
  }
}