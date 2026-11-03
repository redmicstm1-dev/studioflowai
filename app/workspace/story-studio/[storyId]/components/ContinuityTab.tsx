"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Plus, Sparkles, Trash2, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

interface ContinuityRule {
  id: string;
  story_id: string;
  rule_title: string;
  rule_description: string;
  category: string;
}

export default function ContinuityTab({ storyId }: { storyId: string }) {
  const [rules, setRules] = useState<ContinuityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ContinuityRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [category, setCategory] = useState("Worldbuilding");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [storyId]);

  async function fetchRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_continuity")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    if (error) {
      setNotice(`Failed to load continuity rules: ${error.message}`);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingRule(null);
    setRuleTitle("");
    setRuleDescription("");
    setCategory("Worldbuilding");
    setShowModal(true);
  }

  function openEditModal(rule: ContinuityRule) {
    setEditingRule(rule);
    setRuleTitle(rule.rule_title);
    setRuleDescription(rule.rule_description);
    setCategory(rule.category || "Worldbuilding");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    setSaving(true);
    setNotice("");

    if (editingRule) {
      const { error } = await supabase
        .from("story_continuity")
        .update({
          rule_title: ruleTitle.trim(),
          rule_description: ruleDescription.trim(),
          category,
        })
        .eq("id", editingRule.id);

      if (error) {
        setNotice(`Error updating rule: ${error.message}`);
      } else {
        setNotice("Continuity rule updated successfully.");
        fetchRules();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase.from("story_continuity").insert([
        {
          story_id: storyId,
          rule_title: ruleTitle.trim(),
          rule_description: ruleDescription.trim(),
          category,
        },
      ]);

      if (error) {
        setNotice(`Error creating rule: ${error.message}`);
      } else {
        setNotice("Continuity rule added successfully!");
        fetchRules();
        setShowModal(false);
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string, titleText: string) {
    if (!confirm(`Are you sure you want to delete rule "${titleText}"?`)) return;

    const { error } = await supabase.from("story_continuity").delete().eq("id", id);
    if (error) {
      setNotice(`Failed to delete rule: ${error.message}`);
    } else {
      setRules(rules.filter((r) => r.id !== id));
      setNotice("Rule deleted successfully.");
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
            <ShieldAlert size={20} className="text-[#f2a36f]" /> Continuity Rules & Lore Engine ({rules.length})
          </h3>
          <p className="text-xs text-[#8d8981]">
            Track immutable worldbuilding rules, timelines, and consistency checks.
          </p>
        </div>
        <Button onClick={openCreateModal} className="action-button flex items-center gap-1.5 text-xs">
          <Plus size={15} /> Add Rule
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-2.5 text-xs text-[#a7dfc0]">
          {notice}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="panel p-10 text-center border-dashed border-[#33322e]">
          <Sparkles size={28} className="mx-auto mb-2 text-[#f2a36f]" />
          <h4 className="text-sm font-semibold text-white">No Continuity Rules Defined</h4>
          <p className="mt-1 text-xs text-[#8d8981]">
            Add lore rules to prevent plot holes and maintain narrative consistency.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="panel p-5 bg-[#181815] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-md border border-[#393832] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#e7a170] bg-[#e7a170]/10">
                    {rule.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(rule)}
                      className="p-1 text-[#8d8981] hover:text-white transition"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id, rule.rule_title)}
                      className="p-1 text-[#8d8981] hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-white">{rule.rule_title}</h4>
                <p className="mt-2 text-xs text-[#9a968d] leading-relaxed">
                  {rule.rule_description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Continuity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-lg p-6 bg-[#181815]">
            <h3 className="text-base font-semibold text-white">
              {editingRule ? "Edit Continuity Rule" : "New Continuity Rule"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#aaa69e] mb-1">Rule Title *</label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  required
                  placeholder="e.g., Magic requires physical exhaustion"
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none"
                >
                  <option value="Worldbuilding">Worldbuilding</option>
                  <option value="Timeline">Timeline</option>
                  <option value="Lore">Lore</option>
                  <option value="Rule">Rule</option>
                </select>
              </div>

              <div>
                <label className="block text-[#aaa69e] mb-1">Description</label>
                <textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={3}
                  placeholder="Explain the restriction or background lore..."
                  className="w-full rounded-xl border border-[#33322e] bg-[#121210] px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} size="sm" className="action-button">
                  {saving ? "Saving..." : "Save Rule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}