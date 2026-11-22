import { supabase } from "@/lib/supabase";
import {
  DialogueLineDraft,
  ProjectCharacter,
  ProjectDialogueLine,
  ProjectEpisode,
  ProjectScript,
  ProjectVoice,
  VoiceDraft,
} from "@/types/story";

function sanitizeText(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\\/g, "/").trim();
}

function normalizeCharacterName(raw: string): string {
  const cleaned = raw.replace(/\(.*?\)/g, "").trim();
  if (!cleaned) return "Narrator";
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isLikelyCueLine(line: string): boolean {
  if (!line || line.length < 2 || line.length > 32) return false;
  if (line !== line.toUpperCase()) return false;
  if (/^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|CUT TO|FADE|DISSOLVE|SMASH|TITLE|SCENE|EPISODE|ACT )/i.test(line)) {
    return false;
  }
  return /^[A-Z0-9\s.'\-()]+$/.test(line);
}

export function extractDialogueFromScripts(params: {
  projectId: string;
  storyId: string;
  storyTitle: string;
  scripts: ProjectScript[];
  characters: ProjectCharacter[];
  episodes: ProjectEpisode[];
}): DialogueLineDraft[] {
  const { projectId, storyId, storyTitle, scripts, characters, episodes } = params;
  const extracted: DialogueLineDraft[] = [];
  let lineCounter = 1;

  for (const script of scripts) {
    const rawLines = (script.content || "").split("\n");
    const epNum = Number(script.episode_id) || episodes[0]?.episode_number || 1;

    let currentSpeaker: string | null = null;
    let currentParenthetical = "";
    let dialogueBuffer: string[] = [];

    const flushDialogue = () => {
      if (currentSpeaker && dialogueBuffer.length > 0) {
        const text = sanitizeText(dialogueBuffer.join(" "));
        if (text) {
          extracted.push({
            project_id: projectId,
            story_id: storyId,
            episode_number: epNum,
            line_number: lineCounter++,
            character_name: currentSpeaker,
            parenthetical: sanitizeText(currentParenthetical),
            dialogue_text: text,
            status: "ready",
          });
        }
      }
      currentSpeaker = null;
      currentParenthetical = "";
      dialogueBuffer = [];
    };

    for (const raw of rawLines) {
      const trimmed = raw.trim();
      if (!trimmed) {
        flushDialogue();
        continue;
      }

      if (isLikelyCueLine(trimmed)) {
        flushDialogue();
        currentSpeaker = normalizeCharacterName(trimmed);
        continue;
      }

      if (currentSpeaker) {
        if (trimmed.startsWith("(") && trimmed.endsWith(")") && dialogueBuffer.length === 0) {
          currentParenthetical = trimmed.slice(1, -1);
        } else if (/^(INT\.|EXT\.|CUT TO|FADE)/i.test(trimmed)) {
          flushDialogue();
        } else {
          dialogueBuffer.push(trimmed);
        }
      }
    }

    flushDialogue();
  }

  if (extracted.length > 0) {
    return extracted.slice(0, 60);
  }

  // Deterministic fallback dialogue cues when script has no Fountain/screenplay cue formatting
  const castNames =
    characters.length > 0
      ? characters.map((c) => c.name)
      : ["Lead Operative", "Strategist"];

  return castNames.slice(0, 4).map((name, idx) => ({
    project_id: projectId,
    story_id: storyId,
    episode_number: episodes[0]?.episode_number || 1,
    line_number: idx + 1,
    character_name: name,
    parenthetical: idx === 0 ? "focused, low" : "measured",
    dialogue_text:
      idx === 0
        ? `We have one window to pull this off in ${storyTitle}. Stay on comms.`
        : `Copy that. Perimeter is clear—moving into position now.`,
    status: "ready",
  }));
}

export function buildVoiceProfilesFromCast(params: {
  projectId: string;
  storyId: string;
  characters: ProjectCharacter[];
  dialogueLines: DialogueLineDraft[];
  existingVoices: VoiceDraft[];
}): VoiceDraft[] {
  const { projectId, storyId, characters, dialogueLines, existingVoices } = params;

  const uniqueNames = new Map<string, { characterId: string | null; role: string; personality: string }>();

  characters.forEach((c) => {
    uniqueNames.set(c.name.toLowerCase(), {
      characterId: c.id || null,
      role: c.role || "Principal",
      personality: c.personality || "Focused dramatic delivery",
    });
  });

  dialogueLines.forEach((d) => {
    const key = d.character_name.toLowerCase();
    if (!uniqueNames.has(key)) {
      uniqueNames.set(key, {
        characterId: null,
        role: "Speaking Role",
        personality: "Clear, grounded delivery",
      });
    }
  });

  if (uniqueNames.size === 0) {
    uniqueNames.set("narrator", {
      characterId: null,
      role: "Narrator",
      personality: "Steady cinematic narration",
    });
  }

  const pitchPresets = [0.92, 1.08, 0.85, 1.15, 0.98];
  const ratePresets = [0.96, 1.02, 0.92, 1.05, 1.0];

  let idx = 0;
  const profiles: VoiceDraft[] = [];

  uniqueNames.forEach((meta, key) => {
    const displayName =
      characters.find((c) => c.name.toLowerCase() === key)?.name ||
      dialogueLines.find((d) => d.character_name.toLowerCase() === key)?.character_name ||
      "Narrator";

    const existing = existingVoices.find((v) => v.character_name.toLowerCase() === key);
    const firstLine = dialogueLines.find((d) => d.character_name.toLowerCase() === key)?.dialogue_text;

    profiles.push({
      project_id: projectId,
      story_id: storyId,
      character_id: existing?.character_id ?? meta.characterId,
      character_name: displayName,
      voice_uri: existing?.voice_uri || "",
      voice_name: existing?.voice_name || "System Default",
      lang: existing?.lang || "en-US",
      pitch: existing?.pitch ?? pitchPresets[idx % pitchPresets.length],
      speaking_rate: existing?.speaking_rate ?? ratePresets[idx % ratePresets.length],
      tone_direction: existing?.tone_direction || sanitizeText(`${meta.role} — ${meta.personality}`),
      sample_line:
        existing?.sample_line ||
        firstLine ||
        `This is ${displayName}. Ready for table read and scene timing check.`,
      status: existing?.status || "cast",
    });

    idx += 1;
  });

  return profiles;
}

export async function fetchStoryVoiceContext(storyId: string) {
  if (!supabase || !storyId) {
    return {
      storyTitle: "Story Workspace",
      episodes: [] as ProjectEpisode[],
      scripts: [] as ProjectScript[],
      characters: [] as ProjectCharacter[],
      voices: [] as ProjectVoice[],
      dialogueLines: [] as ProjectDialogueLine[],
    };
  }

  const [storyRes, epRes, scriptRes, charRes, voiceRes, lineRes] = await Promise.all([
    supabase.from("project_stories").select("id, title").eq("id", storyId).maybeSingle(),
    supabase.from("project_episodes").select("*").eq("story_id", storyId).order("episode_number", { ascending: true }),
    supabase.from("project_scripts").select("*").eq("story_id", storyId).order("version", { ascending: false }),
    supabase.from("project_characters").select("*").eq("story_id", storyId),
    supabase.from("project_voices").select("*").eq("story_id", storyId).order("created_at", { ascending: true }),
    supabase
      .from("project_dialogue_lines")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true })
      .order("line_number", { ascending: true }),
  ]);

  return {
    storyTitle: storyRes.data?.title || "Story Workspace",
    episodes: (epRes.data || []) as ProjectEpisode[],
    scripts: (scriptRes.data || []) as ProjectScript[],
    characters: (charRes.data || []) as ProjectCharacter[],
    voices: (voiceRes.data || []) as ProjectVoice[],
    dialogueLines: (lineRes.data || []) as ProjectDialogueLine[],
  };
}

export async function saveVoiceStudioToSupabase(
  projectId: string,
  storyId: string,
  voices: VoiceDraft[],
  dialogueLines: DialogueLineDraft[]
): Promise<{ voices: ProjectVoice[]; dialogueLines: ProjectDialogueLine[] }> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  // 1. Clear and bulk-insert character voice profiles
  const { error: delVoiceErr } = await supabase.from("project_voices").delete().eq("story_id", storyId);
  if (delVoiceErr) {
    throw new Error(`Failed to clear existing voices: ${delVoiceErr.message}`);
  }

  let savedVoices: ProjectVoice[] = [];
  if (voices.length > 0) {
    const voiceRows = voices.map((v) => ({
      project_id: projectId,
      story_id: storyId,
      character_id: v.character_id ?? null,
      character_name: sanitizeText(v.character_name, "Speaker"),
      voice_uri: v.voice_uri || "",
      voice_name: sanitizeText(v.voice_name, "System Default"),
      lang: v.lang || "en-US",
      pitch: Math.min(2, Math.max(0.5, Number(v.pitch) || 1)),
      speaking_rate: Math.min(2, Math.max(0.5, Number(v.speaking_rate) || 1)),
      tone_direction: sanitizeText(v.tone_direction, "Natural dramatic delivery"),
      sample_line: sanitizeText(v.sample_line, ""),
      status: sanitizeText(v.status, "cast"),
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedVoices, error: insVoiceErr } = await supabase
      .from("project_voices")
      .insert(voiceRows)
      .select();

    if (insVoiceErr) {
      throw new Error(`Failed to save voice profiles: ${insVoiceErr.message}`);
    }
    savedVoices = (insertedVoices || []) as ProjectVoice[];
  }

  // 2. Clear and bulk-insert dialogue cue lines
  const { error: delLineErr } = await supabase.from("project_dialogue_lines").delete().eq("story_id", storyId);
  if (delLineErr) {
    throw new Error(`Failed to clear existing dialogue lines: ${delLineErr.message}`);
  }

  let savedLines: ProjectDialogueLine[] = [];
  if (dialogueLines.length > 0) {
    const lineRows = dialogueLines.map((line, index) => ({
      project_id: projectId,
      story_id: storyId,
      episode_number: Number(line.episode_number) || 1,
      line_number: Number(line.line_number) || index + 1,
      character_name: sanitizeText(line.character_name, "Speaker"),
      parenthetical: sanitizeText(line.parenthetical, ""),
      dialogue_text: sanitizeText(line.dialogue_text, "..."),
      status: sanitizeText(line.status, "ready"),
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedLines, error: insLineErr } = await supabase
      .from("project_dialogue_lines")
      .insert(lineRows)
      .select();

    if (insLineErr) {
      throw new Error(`Failed to save dialogue lines: ${insLineErr.message}`);
    }
    savedLines = (insertedLines || []) as ProjectDialogueLine[];
  }

  return { voices: savedVoices, dialogueLines: savedLines };
}