"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Search } from "lucide-react";

import { supabase } from "@/lib/supabase";
import ProjectList from "@/components/workspace/ProjectList";
import EditProjectModal from "@/components/workspace/EditProjectModal";
import DeleteProjectModal from "@/components/workspace/DeleteProjectModal";
import { Project } from "@/types/project";

export default function MyProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (mounted) {
        if (!error && data) {
          setProjectList(data);
        }
        setLoading(false);
      }
    };

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#e7a170]">
            <FolderOpen size={15} /> ALL PROJECTS
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            My Projects<span className="accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-[#a5a198]">
            Manage, edit, and organize all your active creative workspaces.
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
          {notice}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 rounded-xl border border-[#33322e] bg-[#191917] px-3 py-2">
          <Search size={15} className="text-[#8b887f]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="bg-transparent text-xs outline-none placeholder:text-[#77746d]"
          />
        </label>
      </div>

      <div className="panel overflow-hidden">
        <ProjectList
          projects={projectList}
          loading={loading}
          search={search}
          onSelectProject={(proj) => {
            if (proj.id) router.push(`/workspace/projects/${proj.id}`);
          }}
          onEditProject={(proj) => setEditingProject(proj)}
          onDeleteProject={(proj) => setDeletingProject(proj)}
        />
      </div>

      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onProjectUpdated={(updatedProj) => {
          setProjectList(
            projectList.map((p) => (p.id === updatedProj.id ? updatedProj : p))
          );
          setNotice(`"${updatedProj.title}" updated successfully!`);
        }}
        onError={(err) => setNotice(err)}
      />

      <DeleteProjectModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        project={deletingProject}
        onProjectDeleted={(deletedId) => {
          setProjectList(projectList.filter((p) => p.id !== deletedId));
          setNotice("Project deleted successfully.");
        }}
        onError={(err) => setNotice(err)}
      />
    </div>
  );
}