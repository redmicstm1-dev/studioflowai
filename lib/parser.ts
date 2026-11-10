import { supabase } from "@/lib/supabase";

export interface ParsedScene {
  sceneNumber: number;
  heading: string;
  action: string;
  dialogue: string[];
  shotType: string;
  cameraMovement: string;
  visualPrompt: string;
}

export interface ParsedCharacter {
  name: string;
  role: "Protagonist" | "Supporting" | "Minor";
  occurrences: number;
  dialogueSample: string;
}

/**
 * 1. UNIVERSAL FILE TEXT EXTRACTION (Crash-proof)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".txt") || fileName.endsWith(".fountain")) {
    return await file.text();
  }

  if (fileName.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) return result.value;
    } catch (err) {
      console.warn("Mammoth DOCX parsing failed:", err);
    }
  }

  if (fileName.endsWith(".pdf")) {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      } catch (workerErr) {
        console.warn("Worker assignment skipped:", workerErr);
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let extractedPdfText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageItems = textContent.items as Array<{ str?: string }>;
        extractedPdfText += pageItems.map((item) => item.str || "").join(" ") + "\n\n";
      }

      if (extractedPdfText.trim().length > 0) return extractedPdfText;
    } catch (err) {
      console.warn("PDFjs fallback active:", err);
    }
  }

  try {
    return await file.text();
  } catch {
    return "EXT. DEFAULT SCENE - DAY\n\nFallback content extracted.";
  }
}

// --- SANITIZATION UTILITIES ---
function sanitizeText(text: string): string {
  if (!text) return "";
  return text.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

function sanitizeFilename(filename: string): string {
  return filename.toLowerCase().replace(/[^a-z0-9_.-]/g, "_").replace(/_+/g, "_");
}

/**
 * 2. CINEMATIC INTELLIGENCE & SHOT PARSER
 */
function analyzeCinematicElements(actionText: string, sceneHeading: string) {
  const upperAction = actionText.toUpperCase();
  let shotType = sceneHeading.includes("INT.") ? "Medium Close-up / Interior" : "Wide Establishing Shot";
  let cameraMovement = "Slow Push In / Ambient Pan";

  if (upperAction.includes("CLOSE UP") || upperAction.includes("CLOSE ON") || upperAction.includes("MACRO")) {
    shotType = "Macro Close-Up";
    cameraMovement = "Static / Locked Focus";
  } else if (upperAction.includes("POV") || upperAction.includes("POINT OF VIEW")) {
    shotType = "POV Shot";
    cameraMovement = "Handheld Shaky / Subjective Motion";
  } else if (upperAction.includes("TRACKING") || upperAction.includes("FOLLOWS")) {
    shotType = "Dynamic Tracking Shot";
    cameraMovement = "Steadicam / Lateral Tracking";
  }

  return { shotType, cameraMovement };
}

/**
 * 3. LLM SEMANTIC FALLBACK PARSER ROUTINE (Non-blocking)
 * Updated to use direct RapidAPI OpenAI proxy integration safely
 */
async function parseScriptWithLLMSemanticFallback(rawText: string): Promise<{ scenes: ParsedScene[]; characters: Map<string, ParsedCharacter>; sfxCues: string[] } | null> {
  const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  const RAPIDAPI_HOST = process.env.NEXT_PUBLIC_RAPIDAPI_HOST || "cheapest-gpt-4-turbo-gpt-4-vision-chatgpt-openai-ai-api.p.rapidapi.com";

  if (!RAPIDAPI_KEY) {
    console.warn("RapidAPI Key is missing. LLM semantic fallback bypassed.");
    return null;
  }

  try {
    const prompt = `
      Analyze the following screenplay text and extract the data into a valid JSON object with these exact keys:
      1. "scenes": An array of objects matching the ParsedScene interface (sceneNumber, heading, action, dialogue[], shotType, cameraMovement, visualPrompt).
      2. "characters": An array of objects matching the ParsedCharacter interface (name, role, occurrences, dialogueSample).
      3. "sfxCues": An array of strings representing sound effects mentioned.

      Script Text:
      ${rawText.slice(0, 15000)}
    `;

    const response = await fetch(`https://${RAPIDAPI_HOST}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a professional script analyzer. Output strictly valid JSON without conversational markdown wrappers or filler text." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`RapidAPI Error (${response.status}):`, errorData);
      return null;
    }

    const result = await response.json();
    
    // Safely extract content across different RapidAPI wrapper response schemas
    const rawContent = 
      result?.choices?.[0]?.message?.content || 
      result?.response || 
      result?.content || 
      "{}";

    // Strip markdown code fences robustly
    const cleanedContent = rawContent
      .replace(/```json\s*([\s\S]*?)\s*```/g, "$1")
      .replace(/```([\s\S]*?)```/g, "$1")
      .trim();

    const parsedData = JSON.parse(cleanedContent);

    const scenes: ParsedScene[] = (Array.isArray(parsedData.scenes) ? parsedData.scenes : []).map((s: any, idx: number) => ({
      sceneNumber: idx + 1,
      heading: s.heading || "EXT. SCENE - DAY",
      action: s.action || "",
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      shotType: s.shotType || "Wide Shot",
      cameraMovement: s.cameraMovement || "Static",
      visualPrompt: s.visualPrompt || `Cinematic visual for ${s.heading || "Scene"}`,
    }));

    const charactersMap = new Map<string, ParsedCharacter>();
    const rawChars = Array.isArray(parsedData.characters) ? parsedData.characters : [];
    rawChars.forEach((c: any) => {
      if (c && c.name) {
        charactersMap.set(c.name, {
          name: c.name,
          role: c.role || "Supporting",
          occurrences: c.occurrences || 1,
          dialogueSample: c.dialogueSample || "Dialogue reference.",
        });
      }
    });

    return { 
      scenes, 
      characters: charactersMap, 
      sfxCues: Array.isArray(parsedData.sfxCues) ? parsedData.sfxCues : [] 
    };
  } catch (err) {
    console.warn("LLM Semantic Fallback Error:", err);
    return null;
  }
}

/**
 * 4. CORE PARSER & ISOLATED SYNC ENGINE
 */
export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
) {
  if (!supabase || !rawText.trim()) return;

  const cleanText = sanitizeText(rawText);

  // STEP A: Safe Storage Asset Upload
  try {
    const safeName = sanitizeFilename(file.name);
    const filePath = `${projectId}/${Date.now()}_${safeName}`;
    
    const { data: uploadData } = await supabase.storage
      .from("workshop_assets")
      .upload(filePath, file, { upsert: true });

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
    console.warn("Storage upload bypassed:", err);
  }

  // STEP B: Multi-Pass Regex Parsing
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const SCENE_HEADING_REGEX = /^(?:INT\.|EXT\.|I\/E\.|INT\/EXT\.|EST\.|INT\s|EXT\s)[A-Z0-9\s\-\.\,\'\/\(\)]+/i;
  const CHARACTER_HEADER_REGEX = /^([A-Z0-9\s\.\'\-]{2,30})(?:\s*\((?:V\.O\.|O\.S\.|CONT'D|OVER|FILTER)\))?$/;
  const SFX_REGEX = /\b(SFX:|SOUND:|CRASH|BANG|WHISPER|SCREAM|EXPLOSION|GUNSHOT)\b/i;

  const charactersMap = new Map<string, ParsedCharacter>();
  const scenes: ParsedScene[] = [];
  const sfxCues: string[] = [];

  let currentHeading = "";
  let currentActionBuffer: string[] = [];
  let currentDialogueBuffer: string[] = [];
  let lastCharacterName = "";

  lines.forEach((line) => {
    if (SFX_REGEX.test(line)) sfxCues.push(line);

    if (SCENE_HEADING_REGEX.test(line)) {
      if (currentHeading || currentActionBuffer.length > 0) {
        const actionStr = currentActionBuffer.join(" ");
        const cinematic = analyzeCinematicElements(actionStr, currentHeading);
        scenes.push({
          sceneNumber: scenes.length + 1,
          heading: currentHeading || "EXT. ESTABLISHING LOCATION - DAY",
          action: actionStr,
          dialogue: currentDialogueBuffer,
          ...cinematic,
          visualPrompt: `Cinematic render prompt for scene: ${currentHeading}`,
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
          name: cleanCharName,
          role: (existing?.occurrences || 0) > 3 ? "Protagonist" : "Supporting",
          occurrences: (existing?.occurrences || 0) + 1,
          dialogueSample: existing?.dialogueSample || "",
        });
        return;
      }
    }

    if (lastCharacterName && line.length > 0) {
      const charInfo = charactersMap.get(lastCharacterName);
      if (charInfo && !charInfo.dialogueSample) charInfo.dialogueSample = line;
      currentDialogueBuffer.push(`${lastCharacterName}: ${line}`);
    } else {
      currentActionBuffer.push(line);
    }
  });

  if (currentHeading || currentActionBuffer.length > 0) {
    const actionStr = currentActionBuffer.join(" ");
    const cinematic = analyzeCinematicElements(actionStr, currentHeading);
    scenes.push({
      sceneNumber: scenes.length + 1,
      heading: currentHeading || "EXT. OPENING SCENE - DAY",
      action: actionStr,
      dialogue: currentDialogueBuffer,
      ...cinematic,
      visualPrompt: `Cinematic render prompt for scene: ${currentHeading || "Opening"}`,
    });
  }

  // --- LLM SEMANTIC FALLBACK TRIGGER ---
  let finalScenes = scenes;
  let finalCharacters = charactersMap;
  let finalSfx = sfxCues;

  if (scenes.length < 2 || charactersMap.size === 0) {
    console.log("Low confidence regex parse detected. Triggering LLM semantic fallback...");
    const llmResult = await parseScriptWithLLMSemanticFallback(cleanText);
    if (llmResult && llmResult.scenes.length > 0) {
      finalScenes = llmResult.scenes;
      finalCharacters = llmResult.characters;
      finalSfx = llmResult.sfxCues;
    }
  }

  if (finalScenes.length === 0) {
    finalScenes.push({
      sceneNumber: 1,
      heading: "EXT. MAIN PROJECT WORKSPACE - DAY",
      action: cleanText.slice(0, 1500),
      dialogue: [],
      shotType: "Wide Establishing Shot",
      cameraMovement: "Slow Push In",
      visualPrompt: "Cinematic digital tech workspace overview.",
    });
  }

  if (finalCharacters.size === 0) {
    finalCharacters.set("PROTAGONIST", {
      name: "PROTAGONIST",
      role: "Protagonist",
      occurrences: 1,
      dialogueSample: "Initial voice profile reference.",
    });
  }

  // STEP C: Isolated Database Seeding (Guarantees script tab population)
  for (const [name, charInfo] of Array.from(finalCharacters.entries())) {
    try {
      const { data: charData } = await supabase
        .from("story_characters")
        .insert([
          {
            story_id: storyId,
            name: sanitizeText(name),
            role: charInfo.role,
            bio: `Parsed profile (${charInfo.occurrences} speaking cues).`,
          },
        ])
        .select()
        .single();

      if (charData) {
        try {
          await supabase.from("workshop_voices").insert([
            {
              story_id: storyId,
              character_id: charData.id,
              voice_model: "Standard Neural AI",
              dialogue_reference: sanitizeText(charInfo.dialogueSample || `Voice reference for ${name}`),
            },
          ]);
        } catch (voiceErr) {
          console.warn("Voice workshop insert skipped:", voiceErr);
        }
      }
    } catch (charErr) {
      console.warn("Character insert skipped:", charErr);
    }
  }

  for (const scene of finalScenes) {
    try {
      const { data: scriptData } = await supabase
        .from("story_scripts")
        .insert([
          {
            story_id: storyId,
            scene_number: scene.sceneNumber,
            heading: sanitizeText(scene.heading),
            action_text: sanitizeText(scene.action),
          },
        ])
        .select()
        .single();

      if (scriptData) {
        try {
          await supabase.from("workshop_shots").insert([
            {
              story_id: storyId,
              scene_id: scriptData.id,
              shot_number: 1,
              shot_type: sanitizeText(scene.shotType),
              camera_movement: sanitizeText(scene.cameraMovement),
              visual_prompt: sanitizeText(scene.visualPrompt),
            },
          ]);
        } catch (shotErr) {
          console.warn("Shot workshop insert bypassed safely:", shotErr);
        }
      }
    } catch (scriptErr) {
      console.warn("Script scene insert error:", scriptErr);
    }
  }

  try {
    await supabase.from("story_episodes").insert([
      {
        story_id: storyId,
        episode_number: 1,
        title: `${file.name.replace(/\.[^/.]+$/, "")} - Episode 1`,
        synopsis: `Auto-ingested screenplay containing ${finalScenes.length} scenes, ${finalCharacters.size} characters, and ${finalSfx.length} audio cues.`,
      },
    ]);
  } catch (epErr) {
    console.warn("Episode insert bypassed:", epErr);
  }

  for (const sfx of finalSfx.slice(0, 10)) {
    try {
      await supabase.from("workshop_assets").insert([
        {
          project_id: projectId,
          file_name: `SFX Cue: ${sfx.slice(0, 30)}`,
          file_type: "audio/sfx",
          file_url: "",
          category: "sfx",
        },
      ]);
    } catch (sfxErr) {
      console.warn("SFX asset insert bypassed:", sfxErr);
    }
  }
}