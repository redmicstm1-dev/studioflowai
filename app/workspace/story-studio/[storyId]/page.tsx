"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Film,
  FileText,
  ShieldAlert,
  Upload,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { extractTextFromFile, processAndSyncScriptImport } from "@/lib/parser";

// Import all 5 tab components
import OverviewTab from "./components/OverviewTab";
import CharactersTab from "./components/CharactersTab";
import EpisodesTab from "./components/EpisodesTab";
import ScriptsTab from "./components/ScriptsTab";
import ContinuityTab from "./components/ContinuityTab";

export default function StoryStudioWorkstation() {
  const router = useRouter();
  const routeParams = useParams();

  // Corrected parameter lookup to match [storyid] folder structure
  const storyId =
    (routeParams?.storyid as string) ||
    (routeParams?.id as string) ||
    (routeParams?.storyId as string);

  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [story, setStory] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "characters" | "episodes" | "scripts" | "continuity"
  >("overview");
  const [notice, setNotice] = useState("");

  const fetchStory = async () => {
    if (!storyId) {
      setNotice("Story identifier missing from URL path.");
      setLoading(false);
      return;
    }

    if (!supabase) {
      setNotice("Database connection uninitialized.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("project_stories")
      .select("*, projects(title)")
      .eq("id", storyId)
      .single();

    if (error || !data) {
      setNotice(error ? error.message : "Story record not found in database.");
    } else {
      setStory(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) fetchStory();
    return () => {
      mounted = false;
    };
  }, [storyId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !story) return;

    setIsImporting(true);
    try {
      const rawText = await extractTextFromFile(file);
      await processAndSyncScriptImport(story.project_id, story.id, file, rawText);
      // Refresh workstation data after successful parse
      await fetchStory();
    } catch (err) {
      console.error("Script import error:", err);
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="panel p-10 text-center max-w-md mx-auto mt-20">
        <h2 className="text-xl font-semibold text-white">Workstation Error</h2>
        <p className="mt-2 text-sm text-[#aaa69e]">{notice || "Story record not found."}</p>
        <Button onClick={() => router.push("/workspace/projects")} className="mt-6 text-sm">
          Return to Projects
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push(`/workspace/projects/${story.project_id}`)}
        className="mb-6 flex items-center gap-2 text-xs text-[#9a968d] transition hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Project Workspace
      </button>

      {/* Header Banner with Script Upload Action */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md border border-[#393832] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#e7a170] bg-[#e7a170]/10">
              {story.genre || "Drama"}
            </span>
            <span className="text-xs text-[#8d8981]">
              Project: {story.projects?.title || "Parent Project"}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white">
            {story.title}
          </h1>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2a36f] hover:bg-[#e0925e] text-[#22211e] text-xs font-semibold cursor-pointer transition shadow-sm">
          {isImporting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Parsing Script...</span>
            </>
          ) : (
            <>
              <Upload size={15} />
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2b2a27] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "overview"
              ? "bg-[#f2a36f]/10 text-[#f2a36f] border border-[#f2a36f]/20"
              : "text-[#9a968d] hover:text-white hover:bg-[#22211e]"
          }`}
        >
          <BookOpen size={15} /> Overview
        </button>

        <button
          onClick={() => setActiveTab("characters")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "characters"
              ? "bg-[#f2a36f]/10 text-[#f2a36f] border border-[#f2a36f]/20"
              : "text-[#9a968d] hover:text-white hover:bg-[#22211e]"
          }`}
        >
          <Users size={15} /> Characters
        </button>

        <button
          onClick={() => setActiveTab("episodes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "episodes"
              ? "bg-[#f2a36f]/10 text-[#f2a36f] border border-[#f2a36f]/20"
              : "text-[#9a968d] hover:text-white hover:bg-[#22211e]"
          }`}
        >
          <Film size={15} /> Episodes
        </button>

        <button
          onClick={() => setActiveTab("scripts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "scripts"
              ? "bg-[#f2a36f]/10 text-[#f2a36f] border border-[#f2a36f]/20"
              : "text-[#9a968d] hover:text-white hover:bg-[#22211e]"
          }`}
        >
          <FileText size={15} /> Scripts
        </button>

        <button
          onClick={() => setActiveTab("continuity")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === "continuity"
              ? "bg-[#f2a36f]/10 text-[#f2a36f] border border-[#f2a36f]/20"
              : "text-[#9a968d] hover:text-white hover:bg-[#22211e]"
          }`}
        >
          <ShieldAlert size={15} /> Continuity Rules
        </button>
      </div>

      {/* Tab Content Render */}
      <div className="mt-6">
        {activeTab === "overview" && <OverviewTab storyId={story.id} />}
        {activeTab === "characters" && <CharactersTab storyId={story.id} />}
        {activeTab === "episodes" && <EpisodesTab storyId={story.id} />}
        {activeTab === "scripts" && <ScriptsTab storyId={story.id} />}
        {activeTab === "continuity" && <ContinuityTab storyId={story.id} />}
      </div>
    </div>
  );
}