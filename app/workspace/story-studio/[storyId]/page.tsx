"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Clapperboard,
  FileText,
  ShieldAlert,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { ProjectStory, ProjectCharacter, ProjectEpisode, ProjectScript } from "@/types/story";

export default function StoryWorkspacePage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const storyId = resolvedParams.storyId;

  const [activeTab, setActiveTab] = useState<"overview" | "characters" | "episodes" | "scripts" | "continuity">("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Data states
  const [story, setStory] = useState<ProjectStory | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [episodes, setEpisodes] = useState<ProjectEpisode[]>([]);
  const [scripts, setScripts] = useState<ProjectScript[]>([]);

  // Form edit states for Overview
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState("");
  const [savingOverview, setSavingOverview] = useState(false);

  // Character modal/form state
  const [showCharModal, setShowCharModal] = useState(false);
  const [charName, setCharName] = useState("");
  const [charRole, setCharRole] = useState("");
  const [charAge, setCharAge] = useState("");
  const [charDesc, setCharDesc] = useState("");

  // Episode modal state
  const [showEpModal, setShowEpModal] = useState(false);
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState("");
  const [epSynopsis, setEpSynopsis] = useState("");

  useEffect(() => {
    if (!supabase || !storyId) return;

    let mounted = true;

    const fetchStoryData = async () => {
      setLoading(true);

      // 1. Fetch Story Details
      const { data: storyData, error: storyError } = await supabase
        .from("project_stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (!mounted) return;

      if (storyError || !storyData) {
        setNotice("Story not found or access denied.");
        setLoading(false);
        return;
      }

      setStory(storyData);
      setTitle(storyData.title || "");
      setLogline(storyData.logline || "");
      setSynopsis(storyData.synopsis || "");
      setGenre(storyData.genre || "");

      // 2. Fetch Characters linked to this story
      const { data: charData } = await supabase
        .from("project_characters")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (charData && mounted) setCharacters(charData);

      // 3. Fetch Episodes linked to this story
      const { data: epData } = await supabase
        .from("project_episodes")
        .select("*")
        .eq("story_id", storyId)
        .order("episode_number", { ascending: true });

      if (epData && mounted) setEpisodes(epData);

      // 4. Fetch Scripts linked to this story
      const { data: scriptData } = await supabase
        .from("project_scripts")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (scriptData && mounted) setScripts(scriptData);

      setLoading(false);
    };

    fetchStoryData();

    return () => {
      mounted = false;
    };
  }, [storyId]);

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story) return;

    setSavingOverview(true);
    setNotice("");

    const { error } = await supabase
      .from("project_stories")
      .update({
        title: title.trim(),
        logline: logline.trim(),
        synopsis: synopsis.trim(),
        genre: genre.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", story.id);

    if (error) {
      setNotice(`Error updating story: ${error.message}`);
    } else {
      setNotice("Story overview saved successfully!");
    }
    setSavingOverview(false);
  }

  async function handleAddCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story || !charName.trim()) return;

    const { data, error } = await supabase
      .from("project_characters")
      .insert([
        {
          project_id: story.project_id,
          story_id: story.id,
          name: charName.trim(),
          role: charRole.trim(),
          age: charAge.trim(),
          description: charDesc.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      setNotice(`Error adding character: ${error.message}`);
    } else if (data) {
      setCharacters([data, ...characters]);
      setShowCharModal(false);
      setCharName("");
      setCharRole("");
      setCharAge("");
      setCharDesc("");
      setNotice("Character added successfully!");
    }
  }

  async function handleDeleteCharacter(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("project_characters").delete().eq("id", id);
    if (!error) {
      setCharacters(characters.filter((c) => c.id !== id));
      setNotice("Character removed.");
    }
  }

  async function handleAddEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story || !epTitle.trim()) return;

    const { data, error } = await supabase
      .from("project_episodes")
      .insert([
        {
          project_id: story.project_id,
          story_id: story.id,
          episode_number: epNumber,
          title: epTitle.trim(),
          synopsis: epSynopsis.trim(),
          status: "draft",
        },
      ])
      .select()
      .single();

    if (error) {
      setNotice(`Error adding episode: ${error.message}`);
    } else if (data) {
      setEpisodes([...episodes, data]);
      setShowEpModal(false);
      setEpTitle("");
      setEpSynopsis("");
      setEpNumber(episodes.length + 2);
      setNotice("Episode created successfully!");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="panel p-10 text-center">
        <h2 className="text-xl font-semibold text-white">Story Workstation Error</h2>
        <p className="mt-2 text-sm text-[#aaa69e]">{notice || "Story record could not be loaded."}</p>
        <Button onClick={() => router.push("/workspace/story-studio")} className="mt-6 text-sm">
          Return to Story Library
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/workspace/story-studio")}
        className="mb-6 flex items-center gap-2 text-xs text-[#9a968d] transition hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Story Library
      </button>

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md border border-[#393832] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#f2a36f] bg-[#f2a36f]/10">
              {story.genre || "Concept"}
            </span>
            <span className="text-xs text-[#8d8981]">Story Workstation</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px] text-white">
            {story.title}
          </h1>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {/* Workspace Tabs Navigation */}
      <div className="mb-8 flex border-b border-[#2b2a27] gap-6 text-xs font-medium">
        {[
          { id: "overview", label: "Overview", icon: BookOpen },
          { id: "characters", label: `Characters (${characters.length})`, icon: Users },
          { id: "episodes", label: `Episodes (${episodes.length})`, icon: Clapperboard },
          { id: "scripts", label: `Scripts (${scripts.length})`, icon: FileText },
          { id: "continuity", label: "Continuity Rules", icon: ShieldAlert },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3.5 transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#f2a36f] text-white"
                : "border-transparent text-[#8d8981] hover:text-[#ccc]"
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="panel max-w-3xl p-6 md:p-8">
          <h3 className="text-lg font-semibold text-white mb-1">Story Overview & Premise</h3>
          <p className="text-xs text-[#8d8981] mb-6">Manage core narrative metadata, loglines, and synopses.</p>

          <form onSubmit={handleSaveOverview} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#aaa69e] mb-2">Story Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3.5 py-3 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-2">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3.5 py-3 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#aaa69e] mb-2">Logline</label>
              <input
                type="text"
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                placeholder="One sentence summary..."
                className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3.5 py-3 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#aaa69e] mb-2">Synopsis</label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={5}
                placeholder="Detailed narrative arc and plot summary..."
                className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3.5 py-3 text-xs text-white outline-none resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingOverview} className="action-button flex items-center gap-2 text-sm">
                <Save size={16} /> {savingOverview ? "Saving..." : "Save Overview"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: CHARACTERS */}
      {activeTab === "characters" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Cast Profiles</h3>
            <Button onClick={() => setShowCharModal(true)} size="sm" className="action-button flex items-center gap-2">
              <Plus size={15} /> Add Character
            </Button>
          </div>

          {characters.length === 0 ? (
            <div className="panel p-8 text-center border-dashed">
              <p className="text-xs text-[#8d8981]">No characters created for this story yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {characters.map((char) => (
                <div key={char.id} className="panel p-5 relative group">
                  <button
                    onClick={() => handleDeleteCharacter(char.id)}
                    className="absolute top-4 right-4 text-[#777] hover:text-red-400 transition"
                    aria-label="Delete character"
                  >
                    <Trash2 size={15} />
                  </button>
                  <span className="rounded-md border border-[#393832] px-2 py-0.5 text-[10px] uppercase text-[#f2a36f] bg-[#f2a36f]/10">
                    {char.role || "Supporting"}
                  </span>
                  <h4 className="mt-3 text-sm font-semibold text-white">{char.name}</h4>
                  {char.age && <p className="text-[11px] text-[#77746d] mt-0.5">Age: {char.age}</p>}
                  <p className="mt-3 text-xs leading-relaxed text-[#9a968d] line-clamp-3">
                    {char.description || "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EPISODES */}
      {activeTab === "episodes" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Episode Breakdown</h3>
            <Button
              onClick={() => {
                setEpNumber(episodes.length + 1);
                setShowEpModal(true);
              }}
              size="sm"
              className="action-button flex items-center gap-2"
            >
              <Plus size={15} /> New Episode
            </Button>
          </div>

          {episodes.length === 0 ? (
            <div className="panel p-8 text-center border-dashed">
              <p className="text-xs text-[#8d8981]">No episodes structured for this story yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map((ep) => (
                <div key={ep.id} className="panel p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#f2a36f]">EPISODE {ep.episode_number}</span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#252421] text-[#aaa]">
                        {ep.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{ep.title}</h4>
                    <p className="mt-1 text-xs text-[#9a968d]">{ep.synopsis || "No synopsis."}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCRIPTS */}
      {activeTab === "scripts" && (
        <div className="panel p-8 text-center border-dashed">
          <FileText size={32} className="mx-auto mb-3 text-[#f2a36f]" />
          <h3 className="text-base font-semibold text-white">Script Editor</h3>
          <p className="mt-1 text-xs text-[#8d8981] max-w-sm mx-auto">
            Draft and manage formatted screenplays tied to your story episodes.
          </p>
        </div>
      )}

      {/* TAB 5: CONTINUITY */}
      {activeTab === "continuity" && (
        <div className="panel p-8 text-center border-dashed">
          <ShieldAlert size={32} className="mx-auto mb-3 text-[#f2a36f]" />
          <h3 className="text-base font-semibold text-white">Story-World Rules & Continuity</h3>
          <p className="mt-1 text-xs text-[#8d8981] max-w-sm mx-auto">
            Maintain timeline integrity, magic systems, and universe lore rules.
          </p>
        </div>
      )}

      {/* Character Creation Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-md p-6 bg-[#181815]">
            <h3 className="text-lg font-semibold text-white">Add Character</h3>
            <form onSubmit={handleAddCharacter} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1">Name *</label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#aaa69e] mb-1">Role</label>
                  <input
                    type="text"
                    value={charRole}
                    onChange={(e) => setCharRole(e.target.value)}
                    placeholder="Protagonist"
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#aaa69e] mb-1">Age</label>
                  <input
                    type="text"
                    value={charAge}
                    onChange={(e) => setCharAge(e.target.value)}
                    placeholder="28"
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#aaa69e] mb-1">Description</label>
                <textarea
                  value={charDesc}
                  onChange={(e) => setCharDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setShowCharModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="action-button">
                  Save Character
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Episode Creation Modal */}
      {showEpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-md p-6 bg-[#181815]">
            <h3 className="text-lg font-semibold text-white">Create Episode</h3>
            <form onSubmit={handleAddEpisode} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#aaa69e] mb-1">Ep #</label>
                  <input
                    type="number"
                    value={epNumber}
                    onChange={(e) => setEpNumber(parseInt(e.target.value) || 1)}
                    required
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-xs text-white outline-none"