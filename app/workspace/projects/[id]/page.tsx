"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { Project } from "@/types/project";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase || !resolvedParams.id) return;

    let mounted = true;

    const fetchProjectDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from("projects")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (mounted) {
        if (error) {
          setErrorMsg("Project not found or access denied.");
        } else {
          setProject(data);
        }
        setLoading(false);
      }
    };

    fetchProjectDetails();

    return () => {
      mounted = false;
    };
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f08a4b]" />
      </div>
    );
  }

  if (errorMsg || !project) {
    return (
      <div className="panel p-8 text-center">
        <h2 className="text-xl font-semibold text-white">Project error</h2>
        <p className="mt-2 text-sm text-[#aaa69e]">{errorMsg || "Project details missing."}</p>
        <Button
          onClick={() => router.push("/workspace/projects")}
          className="mt-6 text-sm"
        >
          Return to projects
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-xs text-[#9a968d] transition hover:text-white"
      >
        <ArrowLeft size={16} /> Back to projects
      </button>

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md border border-[#393832] px-2 py-0.5 text-[10px] uppercase text-[#f08a4b]">
              {project.project_type}
            </span>
            <span className="text-xs text-[#8d8981]">{project.status}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            {project.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a198]">
            {project.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="panel p-5">
          <div className="mb-2 text-xs text-[#8d8981]">Progress</div>
          <div className="text-2xl font-semibold">{project.progress}%</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#33322e]">
            <div
              className="h-full rounded-full bg-[#f08a4b]"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-2 text-xs text-[#8d8981]">Last updated</div>
          <div className="flex items-center gap-2 text-sm text-[#e4c66e]">
            <Clock size={16} />
            {project.updated_at
              ? new Date(project.updated_at).toLocaleDateString()
              : "Just now"}
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-2 text-xs text-[#8d8981]">Owner ID</div>
          <div className="truncate font-mono text-xs text-[#9a968d]">
            {project.owner_id}
          </div>
        </div>
      </div>
    </div>
  );
}