import { supabase } from "@/lib/supabase";
import { StudioWorkspacePayload } from "@/types/story";

function sanitizeText(text: string): string {
  if (!text) return "";
  return text.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

function isBinaryText(text: string): boolean {
  if (!text) return false;
  const sample = text.trim().slice(0, 200);
  return sample.startsWith("%PDF") || sample.includes("obj <<") || sample.includes("endobj") || sample.includes("/Font");
}

/**
 * 1. MOBILE-SAFE FILE TEXT EXTRACTION
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".txt") || fileName.endsWith(".fountain")) {
    const text = await file.text();
    return isBinaryText(text) ? "" : text;
  }

  if (fileName.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value?.trim()) return result.value;
    } catch (err) {
      console.warn("DOCX parsing fallback:", err);
    }
  }

  if (fileName.endsWith(".pdf")) {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true } as any);
      const pdf = await loadingTask.promise;

      let extracted = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extracted += (textContent.items as Array<{ str?: string }>).map((item) => item.str || "").join(" ") + "\n\n";
      }
      if (extracted.trim().length > 20 && !isBinaryText(extracted)) return extracted;
    } catch (err) {
      console.warn("PDF parsing fallback:", err);
    }
  }

  const fallback = await file.text();
  return !isBinaryText(fallback) ? fallback : "";
}

/**
 * 2. AI SEMANTIC EXTRACTOR FOR ALL 5 TABS (Gemini 3.8 Flash)
 */
async function parseProductionScriptWithAI(
  projectId: string,
  storyId: string,
  rawText: string
): Promise<StudioWorkspacePayload | null> {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.warn("Missing GEMINI_API_KEY. Using deterministic fallback.");
    return null;
  }

  const prompt = `
    Analyze this production screenplay/bible and return a strictly valid JSON object mapping to these exact keys:
    1. "story": { "title": string, "logline": string, "synopsis": string, "genre": string, "themes": string[] }
    2. "episodes": Array of { "episode_number": number, "title": string, "synopsis": string, "status": "draft" }
    3. "scripts": Array of { "episode_number": number, "title": string, "content": string (the full clean script dialogue & action for that episode, excluding meta rules), "version": 1 }
    4. "characters": Array of { "name": string, "role": string, "age": string, "description": string, "backstory": string, "personality": string, "character_arc": string }
    5. "continuity": Array of { "character_name": string, "skin_tone": string, "build": string, "hair_style": string, "distinguishing_features": string, "wardrobe": string[], "props_and_accessories": string[] }

    Input Document:
    ${rawText.slice(0, 28000)}
  `;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content: "You are a senior script supervisor and AI pipeline parser. Return strictly valid JSON with no markdown code fences.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    const rawContent = result?.choices?.[0]?.message?.content || "{}";
    const cleanedJson = rawContent.replace(/```json\s*([\s\S]*?)\s*```/g, "$1").replace(/```([\s\S]*?)```/g, "$1").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      story: {
        id: storyId,
        project_id: projectId,
        title: parsed.story?.title || "Untitled Production",
        logline: parsed.story?.logline || "",
        synopsis: parsed.story?.synopsis || "",
        genre: parsed.story?.genre || "Thriller / Action",
        themes: Array.isArray(parsed.story?.themes) ? parsed.story.themes : [],
      },
      episodes: (parsed.episodes || []).map((ep: any, idx: number) => ({
        project_id: projectId,
        story_id: storyId,
        episode_number: ep.episode_number || idx + 1,
        title: ep.title || `Episode ${idx + 1}`,
        synopsis: ep.synopsis || "",
        status: "draft",
      })),
      scripts: (parsed.scripts || []).map((sc: any, idx: number) => ({
        project_id: projectId,
        story_id: storyId,
        episode_id: String(sc.episode_number || idx + 1),
        title: sc.title || `Episode ${idx + 1} Script`,
        content: sc.content || "",
        version: 1,
      })),
      characters: (parsed.characters || []).map((ch: any) => ({
        project_id: projectId,
        story_id: storyId,
        name: ch.name || "UNKNOWN",
        role: ch.role || "Supporting",
        age: String(ch.age || "Unknown"),
        description: ch.description || "",
        backstory: ch.backstory || "",
        personality: ch.personality || "",
        character_arc: ch.character_arc || "",
      })),
      continuity: (parsed.continuity || []).map((co: any) => ({
        project_id: projectId,
        story_id: storyId,
        character_name: co.character_name || "UNKNOWN",
        skin_tone: co.skin_tone || "",
        build: co.build || "",
        hair_style: co.hair_style || "",
        distinguishing_features: co.distinguishing_features || "None",
        wardrobe: Array.isArray(co.wardrobe) ? co.wardrobe : [],
        props_and_accessories: Array.isArray(co.props_and_accessories) ? co.props_and_accessories : [],
      })),
    };
  } catch (err) {
    console.error("AI Semantic Parse Error:", err);
    return null;
  }
}

/**
 * 3. MASTER SYNC ENGINE (Populates all 5 Tabs + Supabase)
 */
export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
): Promise<StudioWorkspacePayload> {
  const aiPayload = await parseProductionScriptWithAI(projectId, storyId, rawText);

  // Deterministic fallback if offline or API key missing
  const workspaceData: StudioWorkspacePayload = aiPayload || {
    story: {
      id: storyId,
      project_id: projectId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      logline: "Imported screenplay project.",
      synopsis: rawText.slice(0, 300),
      genre: "Drama / Action",
      themes: [],
    },
    episodes: [
      {
        project_id: projectId,
        story_id: storyId,
        episode_number: 1,
        title: "Episode 1",
        synopsis: "Initial imported episode.",
        status: "draft",
      },
    ],
    scripts: [
      {
        project_id: projectId,
        story_id: storyId,
        episode_id: "1",
        title: "Episode 1 Script",
        content: rawText,
        version: 1,
      },
    ],
    characters: [],
    continuity: [],
  };

  // Non-blocking Supabase persistence (won't crash UI if storage/network is unreachable)
  if (supabase) {
    try {
      // 1. Update Overview (project_stories)
      await supabase.from("project_stories").upsert({
        id: storyId,
        project_id: projectId,
        title: sanitizeText(workspaceData.story.title || ""),
        logline: sanitizeText(workspaceData.story.logline || ""),
        synopsis: sanitizeText(workspaceData.story.synopsis || ""),
        genre: sanitizeText(workspaceData.story.genre || ""),
        themes: workspaceData.story.themes || [],
      });

      // 2. Insert Episodes & Linked Scripts
      for (let i = 0; i < workspaceData.episodes.length; i++) {
        const ep = workspaceData.episodes[i];
        const { data: epRow } = await supabase
          .from("project_episodes")
          .insert({
            project_id: projectId,
            story_id: storyId,
            episode_number: ep.episode_number,
            title: sanitizeText(ep.title),
            synopsis: sanitizeText(ep.synopsis),
            status: ep.status,
          })
          .select()
          .single();

        const matchingScript = workspaceData.scripts[i] || workspaceData.scripts[0];
        if (epRow && matchingScript) {
          await supabase.from("project_scripts").insert({
            project_id: projectId,
            story_id: storyId,
            episode_id: epRow.id,
            title: sanitizeText(matchingScript.title),
            content: matchingScript.content,
            version: 1,
          });
        }
      }

      // 3. Insert Characters & Linked Continuity Rules
      for (const char of workspaceData.characters) {
        const { data: charRow } = await supabase
          .from("project_characters")
          .insert({
            project_id: projectId,
            story_id: storyId,
            name: sanitizeText(char.name),
            role: sanitizeText(char.role),
            age: sanitizeText(char.age),
            description: sanitizeText(char.description),
            backstory: sanitizeText(char.backstory),
            personality: sanitizeText(char.personality),
            character_arc: sanitizeText(char.character_arc),
          })
          .select()
          .single();

        const matchingContinuity = workspaceData.continuity.find(
          (c) => c.character_name.toLowerCase() === char.name.toLowerCase()
        );

        if (charRow && matchingContinuity) {
          await supabase.from("project_character_continuity").insert({
            project_id: projectId,
            story_id: storyId,
            character_id: charRow.id,
            character_name: sanitizeText(char.name),
            skin_tone: sanitizeText(matchingContinuity.skin_tone),
            build: sanitizeText(matchingContinuity.build),
            hair_style: sanitizeText(matchingContinuity.hair_style),
            distinguishing_features: sanitizeText(matchingContinuity.distinguishing_features),
            wardrobe: matchingContinuity.wardrobe,
            props_and_accessories: matchingContinuity.props_and_accessories,
          });
        }
      }
    } catch (dbErr) {
      console.warn("Supabase DB sync deferred (local state active):", dbErr);
    }
  }

  return workspaceData;
}