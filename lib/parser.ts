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

export async function extractTextFromFile(file: File): Promise<string> {
  if (!file) return "";
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".txt") || fileName.endsWith(".fountain")) {
    const text = await file.text();
    return isBinaryText(text) ? "" : text;
  }

  // Fallback text extraction
  const fallback = await file.text();
  return !isBinaryText(fallback) ? fallback : "";
}

async function parseProductionScriptWithAI(
  projectId: string,
  storyId: string,
  rawText: string
): Promise<StudioWorkspacePayload | null> {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ Missing GEMINI_API_KEY. Using deterministic local fallback.");
    return null;
  }

  console.log("🤖 Sending script to Gemini for semantic parsing...");

  const prompt = `
    Analyze this production screenplay/bible and return a strictly valid JSON object mapping to these exact keys:
    1. "story": { "title": string, "logline": string, "synopsis": string, "genre": string, "themes": string[] }
    2. "episodes": Array of { "episode_number": number, "title": string, "synopsis": string, "status": "draft" }
    3. "scripts": Array of { "episode_number": number, "title": string, "content": string, "version": 1 }
    4. "characters": Array of { "name": string, "role": string, "age": string, "description": string, "backstory": string, "personality": string, "character_arc": string }
    5. "continuity": Array of { "character_name": string, "skin_tone": string, "build": string, "hair_style": string, "distinguishing_features": string, "wardrobe": string[], "props_and_accessories": string[] }

    Input Document:
    ${rawText.slice(0, 25000)}
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          { role: "system", content: "Return strictly valid JSON with no markdown code fences." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("❌ Gemini API error status:", response.status);
      return null;
    }

    const result = await response.json();
    const rawContent = result?.choices?.[0]?.message?.content || "{}";
    const cleanedJson = rawContent.replace(/```json\s*([\s\S]*?)\s*```/g, "$1").replace(/```([\s\S]*?)```/g, "$1").trim();
    const parsed = JSON.parse(cleanedJson);

    console.log("✅ AI parsing successful!");
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
    console.warn("⚠️ AI Parse fallback triggered due to error/timeout:", err);
    return null;
  }
}

export async function processAndSyncScriptImport(
  projectId: string,
  storyId: string,
  file: File,
  rawText: string
): Promise<StudioWorkspacePayload> {
  console.log("🚀 Starting script import pipeline...");
  const aiPayload = await parseProductionScriptWithAI(projectId, storyId, rawText);

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

  if (supabase) {
    console.log("💾 Seeding data into Supabase...");
    try {
      await supabase.from("project_stories").upsert({
        id: storyId,
        project_id: projectId,
        title: sanitizeText(workspaceData.story.title || ""),
        logline: sanitizeText(workspaceData.story.logline || ""),
        synopsis: sanitizeText(workspaceData.story.synopsis || ""),
        genre: sanitizeText(workspaceData.story.genre || ""),
        themes: workspaceData.story.themes || [],
      });
      console.log("✅ Story overview seeded successfully.");
    } catch (dbErr) {
      console.warn("⚠️ Supabase seeding error (bypassed):", dbErr);
    }
  }

  console.log("🎉 Import pipeline completed successfully!");
  return workspaceData;
}