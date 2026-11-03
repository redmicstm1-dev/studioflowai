"use client";

import { useEffect, useState } from "react";
import { Film, Plus, Sparkles, Trash2, Edit3, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface Episode {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
  synopsis: string | null;
}

export default function EpisodesTab({ storyId }: { storyId: string }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEpisodes();
  }, [storyId]);

  async function fetchEpisodes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_episodes")
      .select("*")
      .eq("story_id", storyId)
      .order("episode_number", { ascending: true });

    if (error) {
      setNotice(`Failed to load episodes: ${error.message}`);
    } else {
      setEpisodes(data || []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingEpisode(null);
    setEpisodeNumber(episodes.length + 1);
    setTitle("");
    setSynopsis("");
    setShowModal(true);
  }

  function openEditModal(ep: Episode) {
    setEditingEpisode(ep);
    setEpisodeNumber(ep.episode_number);
    setTitle(ep.title);
    setSynopsis(ep.synopsis || "");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setNotice("");

    if (editingEpisode) {
      const { error } = await supabase
        .from("story_episodes")
        .update({
          episode_number: Number(episodeNumber),
          title: title.trim(),
          synopsis: synopsis.trim(),
        })
        .eq("id", editingEpisode.id);

      if (error) {
        setNotice(`Error updating episode: ${error.message}`);
      } else {
        setNotice(`Updated Episode ${episodeNumber} successfully.`);
        fetchEpisodes();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase.from("story_episodes").insert([
        {
          story_id: storyId,
          episode_number: Number(episodeNumber),
          title: title.trim(),
          synopsis: synopsis.trim(),
        },
      ]);

      if (error) {
        setNotice(`Error creating episode: ${error.message}`);
      } else {
        setNotice(`Episode "${title}" added successfully!`);
        fetchEpisodes();
        setShowModal(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string, epTitle: string) {
    if (!confirm(`Are you sure you want to delete "${epTitle}"?`)) return;

    const { error } = await supabase.from("story_episodes").delete().eq("id", id);
    if (error) {
      setNotice(`Failed to delete episode: ${error.message}`);
    } else {
      setEpisodes(episodes.filter((e) => e.id !== id));
      setNotice(`Deleted episode successfully.`);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Film size={20} className="text-[#f2a36f]" /> Season & Episode Lineup ({episodes.length})
          </h3>
          <p className="text-xs text-[#8d8981]">
            Structure your episodic narrative breakdown, act beats, and synopses.
          </p>
        </div>
        <Button onClick={openCreateModal} className="action-button flex items-center gap-1.5 text-xs">
          <Plus size={15} /> Add Episode
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-2.5 text-xs text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {episodes.length === 0 ? (
        <div className="panel p-10 text-center border-dashed border-[#33322e]">
          <Sparkles size={28} className="mx-auto mb-2 text-[#f2a36f]" />
          <h4 className="text-sm font-semibold text-white">No Episodes Initialized</h4>
          <p className="mt-1 text-xs text-[#8d8981]">
            Upload a script or click "Add Episode" to organize your story breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="panel p-5 bg-[#181815] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22211e] border border-[#33322e] text-sm font-bold text-[#f2a36f]">
                  E{ep.episode_number}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">{ep.title}</h4>
                  <p className="mt-1 text-xs text-[#9a968d] leading-relaxed max-w-2xl">
                    {ep.synopsis || "No synopsis defined yet for this episode."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => openEditModal(ep)}
                  className="p-2 rounded-lg text-[#8d8981] hover:text-white hover:bg-[#22211e] transition"
                  title="Edit Episode"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(ep.id, ep.title)}
                  className="p-2 rounded-lg text-[#8d8981] hover:text-red-400 hover:bg-[#22211e] transition"
                  title="Delete Episode"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Episode Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-base font-semibold text-white">
              {editingEpisode ? "Edit Episode" : "New Episode Breakdown"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#aaa69e] mb-1">Episode #</label>
                  <input
                    type="number"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[#aaa69e] mb-1">Episode Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Pilot / Awakening"
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Synopsis & Beat Breakdown</label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  rows={4}
                  placeholder="Summarize the key events, inciting incidents, and resolution of this episode..."
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} size="sm" className="action-button">
                  {saving ? "Saving..." : "Save Episode"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
