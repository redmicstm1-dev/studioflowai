"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Sparkles, Trash2, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface ScriptScene {
  id: string;
  story_id: string;
  scene_number: number;
  heading: string;
  action_text: string | null;
}

export default function ScriptsTab({ storyId }: { storyId: string }) {
  const [scenes, setScenes] = useState<ScriptScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingScene, setEditingScene] = useState<ScriptScene | null>(null);
  const [sceneNumber, setSceneNumber] = useState(1);
  const [heading, setHeading] = useState("");
  const [actionText, setActionText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchScenes();
  }, [storyId]);

  async function fetchScenes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_scripts")
      .select("*")
      .eq("story_id", storyId)
      .order("scene_number", { ascending: true });

    if (error) {
      setNotice(`Failed to load script scenes: ${error.message}`);
    } else {
      setScenes(data || []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingScene(null);
    setSceneNumber(scenes.length + 1);
    setHeading("EXT. LOCATION - DAY");
    setActionText("");
    setShowModal(true);
  }

  function openEditModal(scene: ScriptScene) {
    setEditingScene(scene);
    setSceneNumber(scene.scene_number);
    setHeading(scene.heading);
    setActionText(scene.action_text || "");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!heading.trim()) return;

    setSaving(true);
    setNotice("");

    if (editingScene) {
      const { error } = await supabase
        .from("story_scripts")
        .update({
          scene_number: Number(sceneNumber),
          heading: heading.trim(),
          action_text: actionText.trim(),
        })
        .eq("id", editingScene.id);

      if (error) {
        setNotice(`Error updating scene: ${error.message}`);
      } else {
        setNotice(`Updated Scene ${sceneNumber} successfully.`);
        fetchScenes();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase.from("story_scripts").insert([
        {
          story_id: storyId,
          scene_number: Number(sceneNumber),
          heading: heading.trim(),
          action_text: actionText.trim(),
          dialogue_block: [],
        },
      ]);

      if (error) {
        setNotice(`Error creating scene: ${error.message}`);
      } else {
        setNotice("Scene added successfully!");
        fetchScenes();
        setShowModal(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string, headingText: string) {
    if (!confirm(`Are you sure you want to delete scene "${headingText}"?`)) return;

    const { error } = await supabase.from("story_scripts").delete().eq("id", id);
    if (error) {
      setNotice(`Failed to delete scene: ${error.message}`);
    } else {
      setScenes(scenes.filter((s) => s.id !== id));
      setNotice("Scene deleted successfully.");
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
            <FileText size={20} className="text-[#f2a36f]" /> Screenplay & Scene Breakdowns ({scenes.length})
          </h3>
          <p className="text-xs text-[#8d8981]">
            Manage parsed scene headings, action lines, and dialogue blocks.
          </p>
        </div>
        <Button onClick={openCreateModal} className="action-button flex items-center gap-1.5 text-xs">
          <Plus size={15} /> Add Scene
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-2.5 text-xs text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {scenes.length === 0 ? (
        <div className="panel p-10 text-center border-dashed border-[#33322e]">
          <Sparkles size={28} className="mx-auto mb-2 text-[#f2a36f]" />
          <h4 className="text-sm font-semibold text-white">No Scenes Initialized</h4>
          <p className="mt-1 text-xs text-[#8d8981]">
            Upload a script during project creation to auto-extract scenes or add them manually.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenes.map((scene) => (
            <div key={scene.id} className="panel p-5 bg-[#181815] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-[#22211e] border border-[#33322e] text-xs font-bold text-[#f2a36f]">
                  #{scene.scene_number}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{scene.heading}</h4>
                  <p className="mt-1 text-xs text-[#9a968d] leading-relaxed max-w-3xl font-mono">
                    {scene.action_text || "No action description provided."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => openEditModal(scene)}
                  className="p-2 rounded-lg text-[#8d8981] hover:text-white hover:bg-[#22211e] transition"
                  title="Edit Scene"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(scene.id, scene.heading)}
                  className="p-2 rounded-lg text-[#8d8981] hover:text-red-400 hover:bg-[#22211e] transition"
                  title="Delete Scene"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Script Scene Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-base font-semibold text-white">
              {editingScene ? "Edit Scene" : "New Scene Breakdown"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#aaa69e] mb-1">Scene #</label>
                  <input
                    type="number"
                    value={sceneNumber}
                    onChange={(e) => setSceneNumber(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[#aaa69e] mb-1">Scene Heading *</label>
                  <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    required
                    placeholder="e.g., EXT. COFFEE SHOP - DAY"
                    className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white uppercase outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Action & Description</label>
                <textarea
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  rows={4}
                  placeholder="Describe the action and environment..."
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none resize-none font-mono text-[11px]"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} size="sm" className="action-button">
                  {saving ? "Saving..." : "Save Scene"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}