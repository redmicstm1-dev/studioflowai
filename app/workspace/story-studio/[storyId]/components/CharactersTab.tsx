"use client";

import { useEffect, useState } from "react";
import { UserCheck, Plus, Sparkles, Trash2, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface Character {
  id: string;
  story_id: string;
  name: string;
  role: string;
  bio: string | null;
  motivation: string | null;
  conflict: string | null;
}

export default function CharactersTab({ storyId }: { storyId: string }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Protagonist");
  const [bio, setBio] = useState("");
  const [motivation, setMotivation] = useState("");
  const [conflict, setConflict] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [storyId]);

  async function fetchCharacters() {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_characters")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    if (error) {
      setNotice(`Failed to load characters: ${error.message}`);
    } else {
      setCharacters(data || []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingChar(null);
    setName("");
    setRole("Protagonist");
    setBio("");
    setMotivation("");
    setConflict("");
    setShowModal(true);
  }

  function openEditModal(char: Character) {
    setEditingChar(char);
    setName(char.name);
    setRole(char.role);
    setBio(char.bio || "");
    setMotivation(char.motivation || "");
    setConflict(char.conflict || "");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setNotice("");

    if (editingChar) {
      // Update existing character
      const { error } = await supabase
        .from("story_characters")
        .update({
          name: name.trim(),
          role,
          bio: bio.trim(),
          motivation: motivation.trim(),
          conflict: conflict.trim(),
        })
        .eq("id", editingChar.id);

      if (error) {
        setNotice(`Error updating character: ${error.message}`);
      } else {
        setNotice(`Updated ${name} successfully.`);
        fetchCharacters();
        setShowModal(false);
      }
    } else {
      // Create character and automatically sync with Voice Studio
      const { data: newChar, error: charError } = await supabase
        .from("story_characters")
        .insert([
          {
            story_id: storyId,
            name: name.trim(),
            role,
            bio: bio.trim(),
            motivation: motivation.trim(),
            conflict: conflict.trim(),
          },
        ])
        .select()
        .single();

      if (charError || !newChar) {
        setNotice(`Error creating character: ${charError?.message}`);
      } else {
        // Broadcast into Voice Studio
        await supabase.from("workshop_voices").insert([
          {
            story_id: storyId,
            character_id: newChar.id,
            voice_model: "Standard Neural Voice",
            dialogue_reference: `Voice profile initialized for ${newChar.name}`,
          },
        ]);

        setNotice(`Created ${name} and initialized Voice Studio profile!`);
        fetchCharacters();
        setShowModal(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string, charName: string) {
    if (!confirm(`Are you sure you want to delete ${charName}?`)) return;

    const { error } = await supabase.from("story_characters").delete().eq("id", id);
    if (error) {
      setNotice(`Failed to delete character: ${error.message}`);
    } else {
      setCharacters(characters.filter((c) => c.id !== id));
      setNotice(`Deleted ${charName}.`);
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
            <UserCheck size={20} className="text-[#f2a36f]" /> Story Character Roster ({characters.length})
          </h3>
          <p className="text-xs text-[#8d8981]">
            Manage character biles, internal conflicts, and auto-generated voice profiles.
          </p>
        </div>
        <Button onClick={openCreateModal} className="action-button flex items-center gap-1.5 text-xs">
          <Plus size={15} /> Add Character
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-2.5 text-xs text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {characters.length === 0 ? (
        <div className="panel p-10 text-center border-dashed border-[#33322e]">
          <Sparkles size={28} className="mx-auto mb-2 text-[#f2a36f]" />
          <h4 className="text-sm font-semibold text-white">No Characters Found</h4>
          <p className="mt-1 text-xs text-[#8d8981]">
            Upload a script to extract characters automatically or add them manually above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {characters.map((char) => (
            <div key={char.id} className="panel p-5 bg-[#181815] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-md border border-[#393832] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#e7a170] bg-[#e7a170]/10">
                    {char.role}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(char)}
                      className="p-1 text-[#8d8981] hover:text-white transition"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(char.id, char.name)}
                      className="p-1 text-[#8d8981] hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-white">{char.name}</h4>
                {char.bio && (
                  <p className="mt-2 text-xs text-[#9a968d] leading-relaxed line-clamp-3">
                    {char.bio}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-[#252421] pt-3 text-[11px] text-[#77746d] space-y-1">
                {char.motivation && (
                  <div><span className="text-[#aaa69e]">Motivation:</span> {char.motivation}</div>
                )}
                {char.conflict && (
                  <div><span className="text-[#aaa69e]">Internal Conflict:</span> {char.conflict}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Character Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-base font-semibold text-white">
              {editingChar ? "Edit Character" : "New Character Profile"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#aaa69e] mb-1">Character Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Captain Mercer"
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                >
                  <option value="Protagonist">Protagonist</option>
                  <option value="Antagonist">Antagonist</option>
                  <option value="Supporting">Supporting</option>
                  <option value="Mentor">Mentor</option>
                </select>
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Bio / Background</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Core Motivation</label>
                <input
                  type="text"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="What drives this character?"
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} size="sm" className="action-button">
                  {saving ? "Saving..." : "Save Character"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}