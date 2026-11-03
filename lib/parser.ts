import { supabase } from "@/lib/supabase";

/**
 * Universally extracts raw text from PDF, DOCX, Fountain, and Text script files.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";

  const fileName = file.name.toLowerCase();

  // 1. Plain Text / Fountain Script Files
  if (fileName.endsWith(".txt") || fileName.endsWith(".fountain")) {
    return await file.text();
  }

  // 2. Microsoft Word (.docx) Files via Mammoth
  if (fileName.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "";
    } catch (err) {
      console.warn("Mammoth DOCX extraction failed, falling back to basic reader:", err);
    }
  }

  // 3. PDF Files via pdfjs-dist
  if (fileName.endsWith(".pdf")) {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      // Set worker source URL dynamically for browser runtime
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
      }

      return fullText;
    } catch (err) {
      console.warn("PDFJS parsing failed, using direct buffer fallback:", err);
    }
  }

  // Generic Fallback Reader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * Intelligent Multi-Pass Script Ingestion Engine
 * Parses scenes, characters, shot suggestions, and dialogue blocks across workshops.
 */
export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
) {
  if (!supabase || !rawText.trim()) return;

  // STEP 1: Upload Script to Asset Library
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

  // STEP 2: Intelligent Multi-Pass Text Parsing
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());

  // Regex Patterns for Screenplay Elements
  const SCENE_HEADING_REGEX = /^(?:INT\.|EXT\.|I\/E\.|INT\/EXT\.|EST\.|INT\s|EXT\s)[A-Z0-9\s\-\.\,\'\/\(\)]+/i;
  const CHARACTER_HEADER_REGEX = /^([A-Z0-9\s\.\'\-]{2,30})(?:\s*\((?:V\.O\.|O\.S\.|CONT'D|OVER|FILTER)\))?$/;
  const TRANSITION_REGEX = /^(?:CUT TO:|FADE IN:|FADE OUT:|SMASH CUT:|DISSOLVE TO:)$/i;

  const charactersMap = new Map<string, { occurrences: number; dialogueSample: string }>();
  const scenes: { heading: string; action: string; dialogue: string[] }[] = [];

  let currentHeading = "";
  let currentActionBuffer: string[] = [];
  let currentDialogueBuffer: string[] = [];
  let lastCharacterName = "";

  // Reserved keywords to ignore during character extraction
  const EXCLUDED_TERMS = new Set([
    "INT", "EXT", "DAY", "NIGHT", "CONTINUOUS", "MORNING", "EVENING",
    "FADE IN", "FADE OUT", "CUT TO", "SMASH CUT", "THE END", "PAGE",
    "CONTINUED", "TITLE", "AUTHOR", "SCENE", "VERSION"
  ]);

  lines.forEach((line) => {
    if (!line) return;

    // Check for Scene Heading
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

    // Skip Transitions
    if (TRANSITION_REGEX.test(line)) return;

    // Check for Character Speaker Block
    const charMatch = line.match(CHARACTER_HEADER_REGEX);
    if (
      charMatch &&
      line === line.toUpperCase() &&
      !line.includes(":") &&
      !EXCLUDED_TERMS.has(charMatch[1].trim())
    ) {
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

    // Capture Dialogue vs Action lines
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

  // Push final scene
  if (currentHeading || currentActionBuffer.length > 0) {
    scenes.push({
      heading: currentHeading || "EXT. OPENING SCENE - DAY",
      action: currentActionBuffer.join(" "),
      dialogue: currentDialogueBuffer,
    });
  }

  // STEP 3: Smart Fallback Safety Net
  if (scenes.length === 0) {
    scenes.push({
      heading: "EXT. MAIN PROJECT WORKSPACE - DAY",
      action: rawText.slice(0, 800),
      dialogue: [],
    });
  }

  if (charactersMap.size === 0) {
    charactersMap.set("LEAD CHARACTER", {
      occurrences: 1,
      dialogueSample: "Initial voice profile reference.",
    });
  }

  // STEP 4: Database Seeding Across All Studios

  // Seed Characters & Voice Profiles
  for (const [name, info] of Array.from(charactersMap.entries())) {
    const { data: charData } = await supabase
      .from("story_characters")
      .insert([
        {
          story_id: storyId,
          name: name,
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
          dialogue_reference: info.dialogueSample || `Voice reference for ${name}`,
        },
      ]);
    }
  }

  // Seed Scripts & Shot Studio Breakdown
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

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
      const shotType = scene.heading.includes("INT.")
        ? "Medium Close-up / Interior"
        : "Wide Shot / Exterior";

      await supabase.from("workshop_shots").insert([
        {
          story_id: storyId,
          scene_id: scriptData.id,
          shot_number: 1,
          shot_type: shotType,
          camera_movement: "Dynamic Tracking / Push In",
          visual_prompt: `Cinematic render prompt for ${scene.heading}`,
        },
      ]);
    }
  }

  // Seed Episode Overview
  await supabase.from("story_episodes").insert([
    {
      story_id: storyId,
      episode_number: 1,
      title: `${file.name.replace(/\.[^/.]+$/, "")} - Episode 1`,
      synopsis: `Auto-ingested screenplay containing ${scenes.length} scenes and ${charactersMap.size} key characters.`,
    },
  ]);
}