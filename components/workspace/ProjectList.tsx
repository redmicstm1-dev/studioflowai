"use client";

import { useState, useEffect } from "react";
import { Folder, MoreVertical, Trash2, Edit, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteProjectModal from "./DeleteProjectModal";
import EditProjectModal from "./EditProjectModal";
import Button from "@/components/ui/Button";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
}

export default function ProjectList({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Control States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  async function fetchProjects() {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice(`Failed to load projects: ${error.message}`);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Your Projects</h2>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f2a36f]" />
        </div>
      ) : projects.length === 0 ? (
        <div className="panel p-10 text-center border-dashed border-[#33322e]">
          <Folder size={28} className="mx-auto mb-2 text-[#f2a36f]" />
          <h4 className="text-sm font-semibold text-white">No Projects Found</h4>
          <p className="mt-1 text-xs text-[#8d8981]">
            Create your first project above or import a screenplay to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="panel p-5 bg-[#181815] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="rounded-md border border-[#393832] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#e7a170] bg-[#e7a170]/10">
                    {project.status || "Development"}
                  </span>
                  
                  {/* Action Dropdown / Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setIsEditOpen(true);
                      }}
                      className="p-1.5 text-[#8d8981] hover:text-white transition rounded-lg hover:bg-[#22211e]"
                      title="Edit Project"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setIsDeleteOpen(true);
                      }}
                      className="p-1.5 text-[#8d8981] hover:text-red-400 transition rounded-lg hover:bg-[#22211e]"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white">{project.title}</h3>
                <p className="mt-1.5 text-xs text-[#9a968d] line-clamp-2 leading-relaxed">
                  {project.description || "No description provided."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2b2a27] flex items-center justify-between">
                <span className="text-[11px] text-[#77746d]">Progress: {project.progress}%</span>
                <a
                  href={`/workspace/projects/${project.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-[#f2a36f] hover:underline"
                >
                  Open Workspace <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Project Modal Integration */}
      <DeleteProjectModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onProjectDeleted={(deletedId) => {
          setProjects((prev) => prev.filter((p) => p.id !== deletedId));
        }}
        onError={(msg) => setNotice(msg)}
      />

      {/* Edit Project Modal Integration (if applicable) */}
      <EditProjectModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onProjectUpdated={(updatedProject) => {
          setProjects((prev) =>
            prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
          );
        }}
        onError={(msg) => setNotice(msg)}
      />
    </div>
  );
}