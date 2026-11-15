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

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "overview", label: "Overview", icon: <BookOpen className="w-4 h-4" /> },
    { key: "episodes", label: "Episodes", icon: <Film className="w-4 h-4" />, count: workspace.episodes.length },
    { key: "script", label: "Script", icon: <FileText className="w-4 h-4" />, count: workspace.scripts.length },
    { key: "characters", label: "Characters", icon: <Users className="w-4 h-4" />, count: workspace.characters.length },
    { key: "continuity", label: "Continuity", icon: <ShieldCheck className="w-4 h-4" />, count: workspace.continuity.length },
  ];

  return (
    <div className="min-h-screen bg-[#33322E] text-stone-100 p-4 md:p-6 rounded-xl border border-stone-700/60">
      {/* Top Action & Ingestion Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-700">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              {workspace.story.title || "Story Studio"}
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {workspace.story.genre} • {workspace.episodes.length} Episodes • {workspace.characters.length} Principal Roles
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium cursor-pointer transition shadow-sm">
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Parsing Script...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Import Script (.txt / .pdf / .docx)</span>
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

      {/* 5-Tab Navigation Bar */}
      <div className="flex overflow-x-auto gap-2 py-4 border-b border-stone-700/80">
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

      {/* Tab Content Viewport */}
      <div className="pt-6">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-stone-800/60 p-5 rounded-xl border border-stone-700/70 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-orange-400 font-semibold">
                  Project Title
                </label>
                <p className="text-lg font-semibold text-white mt-1">{workspace.story.title}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-orange-400 font-semibold">
                  Logline
                </label>
                <p className="text-sm text-stone-200 mt-1">{workspace.story.logline || "No logline generated yet."}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-orange-400 font-semibold">
                  Synopsis
                </label>
                <p className="text-sm text-stone-300 leading-relaxed mt-1">
                  {workspace.story.synopsis || "Import a screenplay file to auto-extract the story synopsis."}
                </p>
              </div>
              {workspace.story.themes && workspace.story.themes.length > 0 && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-orange-400 font-semibold">
                    Core Themes
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {workspace.story.themes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs bg-stone-700 text-orange-300 border border-stone-600"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="bg-stone-800/70 hover:bg-stone-800 p-5 rounded-xl border border-stone-700 hover:border-orange-500/60 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Episode {ep.episode_number}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-700 text-stone-300 capitalize">
                      {ep.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{ep.title}</h3>
                  <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed">{ep.synopsis}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. SCRIPT TAB */}
        {activeTab === "script" && (
          <div className="space-y-4">
            {workspace.scripts.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {workspace.scripts.map((sc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEpisodeIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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

            <div className="bg-stone-900/90 p-5 rounded-xl border border-stone-700 font-mono text-sm text-stone-200 whitespace-pre-wrap leading-relaxed max-h-[65vh] overflow-y-auto">
              {workspace.scripts[selectedEpisodeIdx]?.content ||
                "No screenplay content available. Upload a script file to inspect scenes and dialogue."}
            </div>
          </div>
        )}

        {/* 4. CHARACTERS TAB */}
        {activeTab === "characters" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.characters.length === 0 ? (
              <p className="text-sm text-stone-400">No characters extracted yet.</p>
            ) : (
              workspace.characters.map((char, idx) => (
                <div
                  key={idx}
                  className="bg-stone-800/70 p-5 rounded-xl border border-stone-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{char.name}</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 font-medium">
                      {char.role}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">Age: {char.age} • {char.personality}</p>
                  <p className="text-sm text-stone-300 leading-relaxed pt-1">{char.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. CONTINUITY TAB */}
        {activeTab === "continuity" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.continuity.length === 0 ? (
              <p className="text-sm text-stone-400">
                No continuity locks extracted yet. Import a script with character descriptions to lock visual identity.
              </p>
            ) : (
              workspace.continuity.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-stone-800/70 p-5 rounded-xl border border-stone-700 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-700 pb-2">
                    <h3 className="text-base font-bold text-white">{rule.character_name}</h3>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Identity Locked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-400 block">Build & Skin</span>
                      <span className="text-stone-200">{rule.build}, {rule.skin_tone}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Hairstyle</span>
                      <span className="text-stone-200">{rule.hair_style}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-400 block">Distinguishing Features</span>
                      <span className="text-orange-300">{rule.distinguishing_features}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-stone-400 block mb-1.5">Locked Wardrobe</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.wardrobe.map((item, wIdx) => (
                        <span
                          key={wIdx}
                          className="px-2.5 py-1 rounded bg-stone-900 text-stone-200 text-xs border border-stone-700"
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