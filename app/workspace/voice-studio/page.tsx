"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AudioLines,
  Sparkles,
  Plus,
  Save,
  Trash2,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Clapperboard,
  Volume2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import {
  DialogueLineDraft,
  ProjectCharacter,
  ProjectEpisode,
  ProjectScript,
  VoiceDraft,
} from "@/types/story";
import {
  buildVoiceProfilesFromCast,
  extractDialogueFromScripts,
  fetchStoryVoiceContext,
  saveVoiceStudioToSupabase,
} from "@/lib/voice-studio";

interface StoryOption {
  id: string;
  project_id: string;
  title: string;
}

export default function VoiceStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId") || "";
  const queryStoryId = searchParams.get("storyId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId);
  const [selectedStoryId, setSelectedStoryId] = useState(queryStoryId);

  const [storyTitle, setStoryTitle] = useState("Story Workspace");
  const [episodes, setEpisodes] = useState<ProjectEpisode[]>([]);
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);

  const [voices, setVoices] = useState<VoiceDraft[]>([]);
  const [dialogueLines, setDialogueLines] = useState<DialogueLineDraft[]>([]);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  const [activePlaybackKey, setActivePlaybackKey] = useState<string | null>(null);
  const [isTableReading, setIsTableReading] = useState(false);
  const tableReadStopRef = useRef(false);

  const [loadingContext, setLoadingContext] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Discover available free browser SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }

    const loadSystemVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setSystemVoices(available);
      }
    };

    loadSystemVoices();
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Load projects and stories
  useEffect(() => {
    let mounted = true;

    async function loadProjectsAndStories() {
      if (!supabase) {
        setLoadingContext(false);
        return;
      }

      const [projRes, storyRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("project_stories").select("id, project_id, title").order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      const loadedProjects = (projRes.data || []) as Project[];
      const loadedStories = (storyRes.data || []) as StoryOption[];

      setProjects(loadedProjects);
      setStories(loadedStories);

      const initialStory =
        loadedStories.find((s) => s.id === queryStoryId) ||
        loadedStories.find((s) => s.project_id === queryProjectId) ||
        loadedStories[0];

      if (initialStory) {
        setSelectedProjectId(initialStory.project_id);
        setSelectedStoryId(initialStory.id);
      } else if (loadedProjects[0]?.id) {
        setSelectedProjectId(loadedProjects[0].id);
        setLoadingContext(false);
      } else {
        setLoadingContext(false);
      }
    }

    loadProjectsAndStories();
    return () => {
      mounted = false;
    };
  }, [queryProjectId, queryStoryId]);

  const stopPlayback = useCallback(() => {
    tableReadStopRef.current = true;
    setIsTableReading(false);
    setActivePlaybackKey(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const hydrateStoryVoiceData = useCallback(
    async (storyId: string) => {
      if (!storyId) {
        setVoices([]);
        setDialogueLines([]);
        setLoadingContext(false);
        return;
      }

      stopPlayback();
      setLoadingContext(true);
      setStatusMessage(null);

      try {
        const ctx = await fetchStoryVoiceContext(storyId);
        setStoryTitle(ctx.storyTitle);
        setEpisodes(ctx.episodes);
        setScripts(ctx.scripts);
        setCharacters(ctx.characters);

        const mappedVoices: VoiceDraft[] = ctx.voices.map((v) => ({
          project_id: v.project_id,
          story_id: v.story_id,
          character_id: v.character_id,
          character_name: v.character_name,
          voice_uri: v.voice_uri,
          voice_name: v.voice_name,
          lang: v.lang || "en-US",
          pitch: Number(v.pitch) || 1,
          speaking_rate: Number(v.speaking_rate) || 1,
          tone_direction: v.tone_direction,
          sample_line: v.sample_line,
          status: v.status || "cast",
        }));

        const mappedLines: DialogueLineDraft[] = ctx.dialogueLines.map((l) => ({
          project_id: l.project_id,
          story_id: l.story_id,
          episode_number: l.episode_number || 1,
          line_number: l.line_number,
          character_name: l.character_name,
          parenthetical: l.parenthetical,
          dialogue_text: l.dialogue_text,
          status: l.status || "ready",
        }));

        // If no voices saved yet, auto-seed casting profiles from existing characters
        if (mappedVoices.length === 0 && ctx.characters.length > 0 && ctx.characters[0]?.project_id) {
          const seededVoices = buildVoiceProfilesFromCast({
            projectId: ctx.characters[0].project_id,
            storyId,
            characters: ctx.characters,
            dialogueLines: mappedLines,
            existingVoices: [],
          });
          setVoices(seededVoices);
        } else {
          setVoices(mappedVoices);
        }

        setDialogueLines(mappedLines);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load voice studio data.";
        setStatusMessage({ type: "error", text: msg });
      } finally {
        setLoadingContext(false);
      }
    },
    [stopPlayback]
  );

  useEffect(() => {
    if (selectedStoryId) {
      hydrateStoryVoiceData(selectedStoryId);
    }
  }, [selectedStoryId, hydrateStoryVoiceData]);

  const speakUtterance = useCallback(
    (text: string, characterName: string, playbackKey: string, onComplete?: () => void) => {
      if (!speechSupported || typeof window === "undefined") {
        setStatusMessage({
          type: "error",
          text: "Your current browser does not support SpeechSynthesis. Try Chrome, Edge, Safari, or Firefox.",
        });
        return;
      }

      window.speechSynthesis.cancel();

      const profile =
        voices.find((v) => v.character_name.toLowerCase() === characterName.toLowerCase()) ||
        voices[0];

      const utterance = new SpeechSynthesisUtterance(text);

      if (profile && systemVoices.length > 0) {
        const matchedVoice =
          systemVoices.find((sv) => sv.voiceURI === profile.voice_uri) ||
          systemVoices.find((sv) => sv.name === profile.voice_name) ||
          systemVoices.find((sv) => sv.lang.startsWith("en"));

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
        utterance.pitch = Math.min(2, Math.max(0.5, Number(profile.pitch) || 1));
        utterance.rate = Math.min(2, Math.max(0.5, Number(profile.speaking_rate) || 1));
      }

      utterance.onstart = () => {
        setActivePlaybackKey(playbackKey);
      };

      utterance.onend = () => {
        setActivePlaybackKey(null);
        if (onComplete) onComplete();
      };

      utterance.onerror = () => {
        setActivePlaybackKey(null);
        if (onComplete) onComplete();
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechSupported, systemVoices, voices]
  );

  const handlePlayTableRead = () => {
    if (dialogueLines.length === 0) {
      setStatusMessage({ type: "error", text: "Extract or add dialogue lines first to run a table read." });
      return;
    }

    stopPlayback();
    tableReadStopRef.current = false;
    setIsTableReading(true);

    const playIndex = (index: number) => {
      if (tableReadStopRef.current || index >= dialogueLines.length) {
        setIsTableReading(false);
        setActivePlaybackKey(null);
        return;
      }

      const line = dialogueLines[index];
      speakUtterance(line.dialogue_text, line.character_name, `line-${index}`, () => {
        setTimeout(() => playIndex(index + 1), 220);
      });
    };

    playIndex(0);
  };

  const handleExtractFromScript = () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a project and story first." });
      return;
    }

    stopPlayback();

    const extractedLines = extractDialogueFromScripts({
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storyTitle,
      scripts,
      characters,
      episodes,
    });

    const syncedVoices = buildVoiceProfilesFromCast({
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      characters,
      dialogueLines: extractedLines,
      existingVoices: voices,
    });

    setDialogueLines(extractedLines);
    setVoices(syncedVoices);
    setStatusMessage({
      type: "success",
      text: `Extracted ${extractedLines.length} dialogue lines and synced ${syncedVoices.length} voice profiles. Click "Save to DB" to persist.`,
    });
  };

  const handleAddVoiceProfile = () => {
    if (!selectedStoryId || !selectedProjectId) return;

    const nextNum = voices.length + 1;
    setVoices((prev) => [
      ...prev,
      {
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        character_id: null,
        character_name: `Character ${nextNum}`,
        voice_uri: systemVoices[0]?.voiceURI || "",
        voice_name: systemVoices[0]?.name || "System Default",
        lang: systemVoices[0]?.lang || "en-US",
        pitch: 1.0,
        speaking_rate: 1.0,
        tone_direction: "Calm, articulate delivery",
        sample_line: "Testing microphone and character vocal range.",
        status: "cast",
      },
    ]);
  };

  const handleAddDialogueLine = () => {
    if (!selectedStoryId || !selectedProjectId) return;

    const defaultSpeaker = voices[0]?.character_name || characters[0]?.name || "Narrator";
    setDialogueLines((prev) => [
      ...prev,
      {
        project_id: selectedProjectId,
        story_id: selectedStoryId,
        episode_number: episodes[0]?.episode_number || 1,
        line_number: prev.length + 1,
        character_name: defaultSpeaker,
        parenthetical: "",
        dialogue_text: "Enter spoken dialogue line here...",
        status: "ready",
      },
    ]);
  };

  const handleSaveAll = async () => {
    if (!selectedStoryId || !selectedProjectId) {
      setStatusMessage({ type: "error", text: "Select a story workspace before saving." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const saved = await saveVoiceStudioToSupabase(
        selectedProjectId,
        selectedStoryId,
        voices,
        dialogueLines
      );

      setVoices(
        saved.voices.map((v) => ({
          project_id: v.project_id,
          story_id: v.story_id,
          character_id: v.character_id,
          character_name: v.character_name,
          voice_uri: v.voice_uri,
          voice_name: v.voice_name,
          lang: v.lang,
          pitch: Number(v.pitch) || 1,
          speaking_rate: Number(v.speaking_rate) || 1,
          tone_direction: v.tone_direction,
          sample_line: v.sample_line,
          status: v.status,
        }))
      );

      setDialogueLines(
        saved.dialogueLines.map((l) => ({
          project_id: l.project_id,
          story_id: l.story_id,
          episode_number: l.episode_number,
          line_number: l.line_number,
          character_name: l.character_name,
          parenthetical: l.parenthetical,
          dialogue_text: l.dialogue_text,
          status: l.status,
        }))
      );

      setStatusMessage({
        type: "success",
        text: `Saved ${saved.voices.length} voice profiles and ${saved.dialogueLines.length} dialogue lines to Supabase.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save Voice Studio data.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleProjectChange = (nextProjectId: string) => {
    stopPlayback();
    setSelectedProjectId(nextProjectId);
    const matchingStory = stories.find((s) => s.project_id === nextProjectId);
    setSelectedStoryId(matchingStory ? matchingStory.id : "");
  };

  const filteredStories = selectedProjectId
    ? stories.filter((s) => s.project_id === selectedProjectId)
    : stories;

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-[#7fc7b2]">
            <AudioLines size={15} /> VOICE STUDIO • FREE DEVICE SPEECH ENGINE
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white break-words">
            Character Voices & Dialogue<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198] break-words">
            Cast system voices per character, extract screenplay dialogue cues locally with zero API fees, and run live table reads persisted to Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handleExtractFromScript}
            disabled={!selectedStoryId}
            variant="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Sparkles size={16} className="text-[#7fc7b2]" />
            <span>Extract from Script</span>
          </Button>

          {isTableReading || activePlaybackKey ? (
            <Button
              type="button"
              onClick={stopPlayback}
              variant="secondary"
              className="flex items-center gap-2 text-xs sm:text-sm border-red-500/40 text-red-200"
            >
              <Square size={15} />
              <span>Stop Audio</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePlayTableRead}
              disabled={dialogueLines.length === 0 || !speechSupported}
              variant="secondary"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Volume2 size={16} className="text-[#7fc7b2]" />
              <span>Play Table Read</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !selectedStoryId}
            className="action-button flex items-center gap-2 text-xs sm:text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? "Saving..." : "Save to DB"}</span>
          </Button>
        </div>
      </div>

      {/* Project & Story Selector Bar */}
      <div className="panel mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#7fc7b2]"
          >
            {projects.length === 0 && <option value="">No projects found</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id || ""}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#8d8981] mb-1.5">
            Story Workspace
          </label>
          <select
            value={selectedStoryId}
            onChange={(e) => setSelectedStoryId(e.target.value)}
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none focus:border-[#7fc7b2]"
          >
            {filteredStories.length === 0 && <option value="">No stories in project</option>}
            {filteredStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end justify-between lg:justify-end gap-2 min-w-0">
          {selectedStoryId && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/workspace/story-studio/${selectedStoryId}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#f2a36f] hover:border-[#f2a36f]/60 transition"
              >
                <BookOpen size={14} /> Story
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/shot-studio?projectId=${encodeURIComponent(selectedProjectId)}&storyId=${encodeURIComponent(selectedStoryId)}`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-[#b5a1ff] hover:border-[#b5a1ff]/60 transition"
              >
                <Clapperboard size={14} /> Shots
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs sm:text-sm break-words ${
            statusMessage.type === "success"
              ? "border-[#3c5b4b] bg-[#1c2b23] text-[#a7dfc0]"
              : "border-red-500/40 bg-red-950/50 text-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={17} className="shrink-0 text-[#a7dfc0]" />
          ) : (
            <AlertCircle size={17} className="shrink-0 text-red-400" />
          )}
          <span className="break-words">{statusMessage.text}</span>
        </div>
      )}

      {loadingContext ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#7fc7b2]" />
        </div>
      ) : !selectedStoryId ? (
        <div className="panel p-10 text-center border-dashed">
          <AudioLines size={30} className="mx-auto mb-3 text-[#7fc7b2]" />
          <h3 className="text-lg font-semibold text-white">No Story Workspace Selected</h3>
          <p className="mt-2 text-xs text-[#8d8981] max-w-md mx-auto">
            Select or create a project story first to configure character voice profiles and run dialogue table reads.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: CHARACTER VOICE CASTING */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  1. Character Voice Casting ({voices.length})
                </h2>
                <p className="text-xs text-[#8d8981]">
                  Assign installed browser voices ({systemVoices.length} detected) and tune pitch & pace per role.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddVoiceProfile}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus size={14} /> Add Voice Role
              </Button>
            </div>

            {voices.length === 0 ? (
              <div className="panel p-8 text-center border-dashed">
                <p className="text-xs text-[#8d8981]">
                  No voice profiles yet. Click <span className="text-white font-medium">Extract from Script</span> or <span className="text-white font-medium">Add Voice Role</span> to begin casting.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
                {voices.map((voice, idx) => {
                  const isPlayingThis = activePlaybackKey === `voice-${idx}`;
                  return (
                    <div
                      key={`${voice.character_name}-${idx}`}
                      className="panel p-5 space-y-4 overflow-hidden min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#252421] pb-3">
                        <input
                          type="text"
                          value={voice.character_name}
                          onChange={(e) =>
                            setVoices((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, character_name: e.target.value } : item
                              )
                            )
                          }
                          className="min-w-0 flex-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1.5 text-sm font-semibold text-white outline-none focus:border-[#7fc7b2]"
                        />

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              isPlayingThis
                                ? stopPlayback()
                                : speakUtterance(
                                    voice.sample_line || `Hello, I am ${voice.character_name}.`,
                                    voice.character_name,
                                    `voice-${idx}`
                                  )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7fc7b2]/15 border border-[#7fc7b2]/40 px-3 py-1.5 text-xs font-medium text-[#7fc7b2] hover:bg-[#7fc7b2]/25 transition"
                          >
                            {isPlayingThis ? <Square size={12} /> : <Play size={12} />}
                            <span>{isPlayingThis ? "Stop" : "Audition"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVoices((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label={`Remove ${voice.character_name}`}
                            className="rounded-lg p-1.5 text-[#8d8981] hover:bg-red-950/50 hover:text-red-300 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                          Device / Browser Voice
                        </label>
                        <select
                          value={voice.voice_uri}
                          onChange={(e) => {
                            const selected = systemVoices.find((sv) => sv.voiceURI === e.target.value);
                            setVoices((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      voice_uri: e.target.value,
                                      voice_name: selected?.name || "System Default",
                                      lang: selected?.lang || "en-US",
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#7fc7b2]"
                        >
                          <option value="">System Default Voice</option>
                          {systemVoices.map((sv) => (
                            <option key={sv.voiceURI} value={sv.voiceURI}>
                              {sv.name} ({sv.lang})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="flex justify-between text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            <span>Pitch</span>
                            <span className="text-white">{Number(voice.pitch).toFixed(2)}</span>
                          </label>
                          <input
                            type="range"
                            min="0.6"
                            max="1.5"
                            step="0.02"
                            value={voice.pitch}
                            onChange={(e) =>
                              setVoices((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, pitch: parseFloat(e.target.value) } : item
                                )
                              )
                            }
                            className="w-full accent-[#7fc7b2]"
                          />
                        </div>

                        <div>
                          <label className="flex justify-between text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                            <span>Pace / Rate</span>
                            <span className="text-white">{Number(voice.speaking_rate).toFixed(2)}x</span>
                          </label>
                          <input
                            type="range"
                            min="0.7"
                            max="1.4"
                            step="0.02"
                            value={voice.speaking_rate}
                            onChange={(e) =>
                              setVoices((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, speaking_rate: parseFloat(e.target.value) }
                                    : item
                                )
                              )
                            }
                            className="w-full accent-[#7fc7b2]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                          Delivery Direction
                        </label>
                        <input
                          type="text"
                          value={voice.tone_direction}
                          onChange={(e) =>
                            setVoices((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, tone_direction: e.target.value } : item
                              )
                            )
                          }
                          className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#7fc7b2] break-words"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-[#8d8981] mb-1">
                          Audition Sample Line
                        </label>
                        <textarea
                          rows={2}
                          value={voice.sample_line}
                          onChange={(e) =>
                            setVoices((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, sample_line: e.target.value } : item
                              )
                            )
                          }
                          className="w-full rounded-xl border border-[#33322e] bg-[#121210] p-2.5 text-xs text-stone-200 outline-none focus:border-[#7fc7b2] break-words resize-y"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: DIALOGUE CUE SHEET */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  2. Dialogue Cue Sheet & Scratch Read ({dialogueLines.length})
                </h2>
                <p className="text-xs text-[#8d8981]">
                  Lines extracted from your screenplay. Play any line individually or run a full sequential table read.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddDialogueLine}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus size={14} /> Add Line
              </Button>
            </div>

            {dialogueLines.length === 0 ? (
              <div className="panel p-8 text-center border-dashed">
                <p className="text-xs text-[#8d8981]">
                  No dialogue lines loaded yet. Click <span className="text-white font-medium">Extract from Script</span> above to pull dialogue cues from your uploaded script.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-hidden">
                {dialogueLines.map((line, idx) => {
                  const isLineActive = activePlaybackKey === `line-${idx}`;
                  return (
                    <div
                      key={`${line.character_name}-${line.line_number}-${idx}`}
                      className={`panel p-4 transition overflow-hidden ${
                        isLineActive ? "border-[#7fc7b2] bg-[#18221f]" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex items-center gap-2 sm:w-52 shrink-0">
                          <span className="rounded bg-[#252421] px-2 py-1 text-[11px] font-mono text-[#8d8981]">
                            #{line.line_number}
                          </span>
                          <input
                            type="text"
                            value={line.character_name}
                            onChange={(e) =>
                              setDialogueLines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, character_name: e.target.value } : item
                                )
                              )
                            }
                            className="min-w-0 flex-1 rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1.5 text-xs font-semibold text-[#7fc7b2] outline-none focus:border-[#7fc7b2]"
                          />
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                          <input
                            type="text"
                            value={line.parenthetical}
                            placeholder="Parenthetical / emotion cue (optional, e.g. tense, whispered)"
                            onChange={(e) =>
                              setDialogueLines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, parenthetical: e.target.value } : item
                                )
                              )
                            }
                            className="w-full rounded-lg border border-[#33322e] bg-[#121210] px-2.5 py-1 text-[11px] italic text-[#9a968d] outline-none focus:border-[#7fc7b2]"
                          />
                          <textarea
                            rows={2}
                            value={line.dialogue_text}
                            onChange={(e) =>
                              setDialogueLines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, dialogue_text: e.target.value } : item
                                )
                              )
                            }
                            className="w-full rounded-xl border border-[#33322e] bg-[#121210] p-2.5 text-xs text-stone-100 outline-none focus:border-[#7fc7b2] break-words resize-y"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              isLineActive
                                ? stopPlayback()
                                : speakUtterance(
                                    line.dialogue_text,
                                    line.character_name,
                                    `line-${idx}`
                                  )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7fc7b2]/15 border border-[#7fc7b2]/40 px-3 py-1.5 text-xs font-medium text-[#7fc7b2] hover:bg-[#7fc7b2]/25 transition"
                          >
                            {isLineActive ? <Square size={12} /> : <Play size={12} />}
                            <span>{isLineActive ? "Stop" : "Speak"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDialogueLines((prev) =>
                                prev
                                  .filter((_, i) => i !== idx)
                                  .map((item, newIdx) => ({ ...item, line_number: newIdx + 1 }))
                              )
                            }
                            aria-label={`Delete line ${line.line_number}`}
                            className="rounded-lg p-1.5 text-[#8d8981] hover:bg-red-950/50 hover:text-red-300 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}