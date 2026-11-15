"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Film,
  FileText,
  Users,
  ShieldCheck,
  Upload,
  Loader2,
  Sparkles,
  Save,
  CheckCircle2,
} from "lucide-react";
import { StudioWorkspacePayload } from "@/types/story";
import { extractTextFromFile, processAndSyncScriptImport } from "@/lib/parser";
import { supabase } from "@/lib/supabase";

type TabKey = "overview" | "episodes" | "script" | "characters" | "continuity";

interface StoryWorkspaceTabsProps {
  projectId: string;
  storyId: string;
  initialData?: StudioWorkspacePayload;
}

export default function StoryWorkspaceTabs({
  projectId,
  storyId,
  initialData,
}: StoryWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(0);
  
  const [workspace, setWorkspace] = useState<StudioWorkspacePayload>(
    initialData || {
      story: {
        title: "Untitled Story",
        genre: "Action / Thriller",
        logline: "Upload a screenplay or initialize project to populate your workspace.",
        synopsis: "",
        themes: [],
      },
      episodes: [],
      scripts: [],
      characters: [],
      continuity: [],
    }
  );

  // Automatically fetch existing records from Supabase on mount / page refresh
  useEffect(() => {
    let mounted = true;

    async function loadWorkspaceFromSupabase() {
      if (!supabase || !storyId) return;

      try {
        const [storyRes, epRes, charRes, contRes, scriptRes] = await Promise.all([
          supabase.from("project_stories").select("*").eq("id", storyId).single(),
          supabase.from("project_episodes").select("*").eq("story_id", storyId),
          supabase.from("project_characters").select("*").eq("story_id", storyId),
          supabase.from("project_continuity").select("*").eq("story_id", storyId),
          supabase.from("project_scripts").select("*").eq("story_id", storyId),
        ]);

        if (!mounted) return;

        if (storyRes.data) {
          setWorkspace({
            story: storyRes.data,
            episodes: epRes.data || [],
            characters: charRes.data || [],
            continuity: contRes.data || [],
            scripts: scriptRes.data || [],
          });
        }
      } catch (err) {
        console.warn("⚠️ Failed to load workspace data from Supabase:", err);
      }
    }

    if (!initialData) {
      loadWorkspaceFromSupabase();
    }

    return () => {
      mounted = false;
    };
  }, [storyId, initialData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const rawText = await extractTextFromFile(file);
      const syncedData = await processAndSyncScriptImport(projectId, storyId, file, rawText);
      setWorkspace(syncedData);
      setSelectedEpisodeIdx(0);
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!supabase || !storyId) return;

    setIsSaving(true);
    setSaveStatus("");

    try {
      const { error } = await supabase
        .from("project_stories")
        .update({
          title: workspace.story.title,
          logline: workspace.story.logline,
          synopsis: workspace.story.synopsis,
          genre: workspace.story.genre,
          themes: workspace.story.themes || [],
        })
        .eq("id", storyId);

      if (error) throw error;

      setSaveStatus("Changes saved successfully!");
      setTimeout(() => setSaveStatus(""), 3500);
    } catch (err: any) {
      console.error("Save error:", err);
      setSaveStatus(err.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "overview", label: "Overview", icon: <BookOpen className="w-4 h-4" /> },
    { key: "episodes", label: "Episodes", icon: <Film className="w-4 h-4" />, count: workspace.episodes.length },
    { key: "script", label: "Script", icon: <FileText className="w-4 h-4" />, count: workspace.scripts.length },
    { key: "characters", label: "Characters", icon: <Users className="w-4 h-4" />, count: workspace.characters.length },
    { key: "continuity", label: "Continuity", icon: <ShieldCheck className="w-4 h-4" />, count: workspace.continuity.length },
  ];

  return (
    <div className="min-h-screen bg-[#33322E] text-stone-100 p-4 md:p-6 rounded-xl border border-stone-700/60 overflow-x-hidden">
      {/* Top Action & Ingestion Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-700">
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
            <h1 className="text-xl font-bold tracking-tight text-white truncate">
              {workspace.story.title || "Story Studio"}
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-1 truncate">
            {workspace.story.genre} • {workspace.episodes.length} Episodes • {workspace.characters.length} Principal Roles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Save to Supabase Button */}
          <button
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save to DB</span>
              </>
            )}
          </button>

          {/* Import Script Button */}
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium cursor-pointer transition shadow-sm">
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Import Script</span>
              </>
            )}
            <input
              type="file"
              accept=".txt,.fountain,.pdf,.docx"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Save Feedback Banner */}
      {saveStatus && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* 5-Tab Navigation Bar */}
      <div className="flex overflow-x-auto gap-2 py-4 border-b border-stone-700/80 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? "bg-orange-600 text-white shadow"
                  : "bg-stone-800/70 text-stone-300 hover:bg-stone-700/70"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-orange-800 text-orange-100" : "bg-stone-700 text-stone-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Viewport with Overflow Protection */}
      <div className="pt-6 overflow-hidden">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-stone-800/60 p-5 rounded-xl border border-stone-700/70 space-y-4 overflow-hidden">
              <div>
                <label className="block text-xs uppercase tracking-wider text-orange-400 font-semibold mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={workspace.story.title || ""}
                  onChange={(e) =>
                    setWorkspace({
                      ...workspace,
                      story: { ...workspace.story, title: e.target.value },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white text-base font-semibold focus:outline-none focus:border-orange-500 break-words"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-orange-400 font-semibold mb-1">
                  Logline
                </label>
                <input
                  type="text"
                  value={workspace.story.logline || ""}
                  onChange={(e) =>
                    setWorkspace({
                      ...workspace,
                      story: { ...workspace.story, logline: e.target.value },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none focus:border-orange-500 break-words"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-orange-400 font-semibold mb-1">
                  Synopsis
                </label>
                <textarea
                  rows={4}
                  value={workspace.story.synopsis || ""}
                  onChange={(e) =>
                    setWorkspace({
                      ...workspace,
                      story: { ...workspace.story, synopsis: e.target.value },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-3 text-stone-300 text-sm focus:outline-none focus:border-orange-500 break-words resize-y"
                />
              </div>

              {workspace.story.themes && workspace.story.themes.length > 0 && (
                <div className="overflow-hidden">
                  <label className="block text-xs uppercase tracking-wider text-orange-400 font-semibold mb-2">
                    Core Themes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {workspace.story.themes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs bg-stone-700 text-orange-300 border border-stone-600 break-words"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. EPISODES TAB */}
        {activeTab === "episodes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
            {workspace.episodes.length === 0 ? (
              <p className="text-sm text-stone-400">No episodes parsed yet. Import a script to populate episodes.</p>
            ) : (
              workspace.episodes.map((ep, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedEpisodeIdx(idx);
                    setActiveTab("script");
                  }}
                  className="bg-stone-800/70 hover:bg-stone-800 p-5 rounded-xl border border-stone-700 hover:border-orange-500/60 cursor-pointer transition space-y-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 shrink-0">
                      Episode {ep.episode_number}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-700 text-stone-300 capitalize truncate">
                      {ep.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white break-words">{ep.title}</h3>
                  <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed break-words">{ep.synopsis}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. SCRIPT TAB */}
        {activeTab === "script" && (
          <div className="space-y-4 overflow-hidden">
            {workspace.scripts.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {workspace.scripts.map((sc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEpisodeIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition break-words ${
                      selectedEpisodeIdx === idx
                        ? "bg-orange-600 text-white"
                        : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                    }`}
                  >
                    {sc.title}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-stone-900/90 p-5 rounded-xl border border-stone-700 font-mono text-sm text-stone-200 whitespace-pre-wrap leading-relaxed max-h-[65vh] overflow-y-auto break-words overflow-x-hidden">
              {workspace.scripts[selectedEpisodeIdx]?.content ||
                "No screenplay content available. Upload a script file to inspect scenes and dialogue."}
            </div>
          </div>
        )}

        {/* 4. CHARACTERS TAB */}
        {activeTab === "characters" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
            {workspace.characters.length === 0 ? (
              <p className="text-sm text-stone-400">No characters extracted yet.</p>
            ) : (
              workspace.characters.map((char, idx) => (
                <div
                  key={idx}
                  className="bg-stone-800/70 p-5 rounded-xl border border-stone-700 space-y-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white break-words">{char.name}</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 font-medium shrink-0">
                      {char.role}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 break-words">Age: {char.age} • {char.personality}</p>
                  <p className="text-sm text-stone-300 leading-relaxed pt-1 break-words">{char.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. CONTINUITY TAB */}
        {activeTab === "continuity" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
            {workspace.continuity.length === 0 ? (
              <p className="text-sm text-stone-400">
                No continuity locks extracted yet. Import a script with character descriptions to lock visual identity.
              </p>
            ) : (
              workspace.continuity.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-stone-800/70 p-5 rounded-xl border border-stone-700 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-stone-700 pb-2">
                    <h3 className="text-base font-bold text-white break-words">{rule.character_name}</h3>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" /> Identity Locked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs overflow-hidden">
                    <div className="overflow-hidden">
                      <span className="text-stone-400 block">Build & Skin</span>
                      <span className="text-stone-200 break-words">{rule.build}, {rule.skin_tone}</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-stone-400 block">Hairstyle</span>
                      <span className="text-stone-200 break-words">{rule.hair_style}</span>
                    </div>
                    <div className="col-span-2 overflow-hidden">
                      <span className="text-stone-400 block">Distinguishing Features</span>
                      <span className="text-orange-300 break-words">{rule.distinguishing_features}</span>
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <span className="text-xs text-stone-400 block mb-1.5">Locked Wardrobe</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.wardrobe.map((item, wIdx) => (
                        <span
                          key={wIdx}
                          className="px-2.5 py-1 rounded bg-stone-900 text-stone-200 text-xs border border-stone-700 break-words"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}