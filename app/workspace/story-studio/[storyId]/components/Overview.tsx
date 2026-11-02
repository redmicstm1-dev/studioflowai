"use client";

import { useEffect, useState } from "react";
import { BookOpen, Save, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface StoryOverview {
  id: string;
  title: string;
  genre: string | null;
  logline: string | null;
  synopsis: string | null;
}

export default function OverviewTab({ storyId }: { storyId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [logline, setLogline] = useState("");
  const [synopsis, setSynopsis] = useState("");

  useEffect(() => {
    fetchStoryOverview();
  }, [storyId]);

  async function fetchStoryOverview() {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (error) {
      setNotice(`Failed to load story overview: ${error.message}`);
    } else if (data) {
      setTitle(data.title || "");
      setGenre(data.genre || "");
      setLogline(data.logline || "");
      setSynopsis(data.synopsis || "");
    }
    setLoading(false);
  }

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setNotice("");

    const { error } = await supabase
      .from("project_stories")
      .update({
        title: title.trim(),
        genre: genre.trim(),
        logline: logline.trim(),
        synopsis: synopsis.trim(),
      })
      .eq("id", storyId);

    setSaving(false);

    if (error) {
      setNotice(`Error saving overview: ${error.message}`);
    } else {
      setNotice("Story overview successfully updated!");
      setTimeout(() => setNotice(""), 3000);
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
    <div className="mt-6 max-w-3xl">
      <div className="mb-6 flex items-center justify-between border-b border-[#2b2a27] pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-[#f2a36f]" /> Story Overview & Premise
          </h3>
          <p className="text-xs text-[#8d8981]">
            Manage core narrative metadata, loglines, genres, and macro synopses.
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-xs text-[#a7dfc0]">
          {notice}
        </div>
      )}

      <form onSubmit={handleSaveOverview} className="panel p-6 space-y-4 bg-[#181815]">
        <div>
          <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
            Story Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
            Genre
          </label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g., Sci-Fi Thriller"
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
            Logline
          </label>
          <input
            type="text"
            value={logline}
            onChange={(e) => setLogline(e.target.value)}
            placeholder="One sentence summary..."
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#aaa69e] mb-1.5">
            Synopsis
          </label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={5}
            placeholder="Detailed narrative arc and plot summary..."
            className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2.5 text-xs text-white outline-none resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="action-button flex items-center gap-2 text-xs">
            <Save size={14} /> {saving ? "Saving..." : "Save Overview"}
          </Button>
        </div>
      </form>
    </div>
  );
}