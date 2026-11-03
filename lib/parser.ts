import { supabase } from "@/lib/supabase";

/**
 * Extracts raw text from uploaded script files (.txt, .fountain, .pdf)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";

  // Handle plain text or fountain files
  if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".fountain")) {
    return await file.text();
  }

  // Fallback text reader for standard file buffers
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * Parses script content and auto-seeds data across Story, Shot, Voice, and Asset Library workshops
 */
export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
) {
  if (!supabase) return;

  // 1. Upload original script file to Supabase storage bucket (Asset Library)
  const filePath = `${projectId}/${Date.now()}_${file.name}`;
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
        file_type: file.type || "text/plain",
        file_url: publicUrlData?.publicUrl || "",
        category: "script",
      },
    ]);
  }

  // 2. Parse lines to identify scene headings and character names
  const lines = rawText.split("\n").map((line) => line.trim());
  
  const extractedCharacters = new Set<string>();
  const extractedScenes: { heading: string; action: string }[] = [];

  let currentHeading = "";
  let currentActionBuffer: string[] = [];

  lines.forEach((line) => {
    // Detect Scene Headings (EXT. or INT.)
    if (line.startsWith("EXT.") || line.startsWith("INT.")) {
      if (currentHeading) {
        extractedScenes.push({
          heading: currentHeading,
          action: currentActionBuffer.join(" "),
        });
      }
      currentHeading = line;
      currentActionBuffer = [];
    } else if (line) {
      // Detect Character Names (ALL CAPS words in dialogue or character intro)
      const matches = line.match(/\b[A-Z]{2,}(?:\s[A-Z]{2,})*\b/g);
      if (matches) {
        matches.forEach((char) => {
          if (!["EXT", "INT", "DAY", "NIGHT", "CONTINUOUS"].includes(char)) {
            extractedCharacters.add(char);
          }
        });
      }
      currentActionBuffer.push(line);
    }
  });

  if (currentHeading) {
    extractedScenes.push({
      heading: currentHeading,
      action: currentActionBuffer.join(" "),
    });
  }

  // 3. Seed Characters into Story Studio & Voice Studio
  for (const charName of Array.from(extractedCharacters)) {
    const { data: charData } = await supabase
      .from("story_characters")
      .insert([
        {
          story_id: storyId,
          name: charName,
          role: "Supporting",
          bio: `Auto-parsed from script: ${file.name}`,
        },
      ])
      .select()
      .single();

    if (charData) {
      // Broadcast voice profile to Voice Studio
      await supabase.from("workshop_voices").insert([
        {
          story_id: storyId,
          character_id: charData.id,
          voice_model: "Standard Neural Voice",
          dialogue_reference: `Voice initialized for ${charName}`,
        },
      ]);
    }
  }

  // 4. Seed Scenes into Story Scripts & Shot Studio
  for (let i = 0; i < extractedScenes.length; i++) {
    const scene = extractedScenes[i];

    const { data: scriptData } = await supabase
      .from("story_scripts")
      .insert([
        {
          story_id: storyId,
          scene_number: i + 1,
          heading: scene.heading,
          action_text: scene.action,
        },
      ])
      .select()
      .single();

    if (scriptData) {
      // Seed initial shot entry in Shot Studio
      await supabase.from("workshop_shots").insert([
        {
          story_id: storyId,
          scene_id: scriptData.id,
          shot_number: 1,
          shot_type: "Wide Shot",
          camera_movement: "Static",
          visual_prompt: `Establishing shot for ${scene.heading}`,
        },
      ]);
    }
  }
}