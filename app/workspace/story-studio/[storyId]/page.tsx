"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import StoryWorkspaceTabs from "./components/StoryWorkspaceTabs";

export default function StoryStudioWorkstation() {
  const router = useRouter();
  const routeParams = useParams();

  const storyId =
    (routeParams?.storyid as string) ||
    (routeParams?.id as string) ||
    (routeParams?.storyId as string);

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<any | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

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

      if (!mounted) return;

      if (error || !data) {
        setNotice(error ? error.message : "Story record not found in database.");
      } else {
        setStory(data);
      }
      setLoading(false);
    };

    fetchStory();

    return () => {
      mounted = false;
    };
  }, [storyId]);

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

      {/* Render the unified 5-Tab Workspace */}
      <StoryWorkspaceTabs projectId={story.project_id} storyId={story.id} />
    </div>
  );
}