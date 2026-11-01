"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Bell,
  BookOpen,
  Boxes,
  Clapperboard,
  FolderOpen,
  Menu,
  Plus,
  Search,
  Sparkles,
  Waves,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import SidebarNav from "@/components/workspace/SidebarNav";
import CreateProjectModal from "@/components/workspace/CreateProjectModal";
import ProjectList from "@/components/workspace/ProjectList";
import { Project } from "@/types/project";

const tools = [
  { name: "Story Studio", desc: "Ideas, scripts & characters", icon: BookOpen, color: "#f2a36f" },
  { name: "Shot Studio", desc: "Scenes, shots & storyboards", icon: Clapperboard, color: "#b5a1ff" },
  { name: "Voice Studio", desc: "Character voices & dialogue", icon: AudioLines, color: "#7fc7b2" },
  { name: "Asset Library", desc: "References & continuity", icon: Boxes, color: "#e4c66e" },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [authError, setAuthError] = useState("");

  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState("Creator");
  const [userEmail, setUserEmail] = useState("");

  const [active, setActive] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthError("Supabase is not configured. Check environment variables.");
      setCheckingAuth(false);
      setLoadingProjects(false);
      return;
    }

    let mounted = true;

    const checkSessionAndFetch = async () => {
      const { data, error } = await supabase!.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;
      setUserId(user.id);
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Creator";

      setUserName(displayName);
      setUserEmail(user.email || "");
      setCheckingAuth(false);

      // Fetch persistent user projects from Supabase with loading state
      setLoadingProjects(true);
      const { data: dbProjects, error: fetchErr } = await supabase!
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (mounted) {
        if (!fetchErr && dbProjects) {
          setProjectList(dbProjects);
        }
        setLoadingProjects(false);
      }
    };

    checkSessionAndFetch();

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111110] px-5">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#39342e] border-t-[#f08a4b]" />
          <p className="text-sm text-[#aaa69e]">Checking your workspace...</p>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111110] px-5">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-white">Workspace unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#aaa69e]">{authError}</p>
          <Button onClick={() => router.replace("/login")} className="mt-6 px-5 py-3 text-sm">
            Return to login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111110] text-[#f5f2eb]">
      <SidebarNav
        active={active}
        setActive={setActive}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        setShowCreate={setShowCreate}
        userName={userName}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      <section className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#2b2a27] bg-[#111110]/90 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
              className="text-[#aaa] lg:hidden"
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <div className="hidden items-center gap-2 text-sm text-[#77746d] sm:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-[#eee9df]">{active}</span>
            </div>
            <span className="text-sm text-[#eee9df] sm:hidden">{active}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 rounded-xl border border-[#33322e] bg-[#191917] px-3 py-2 md:flex">
              <Search size={15} className="text-[#8b887f]" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your workspace"
                className="w-40 bg-transparent text-xs outline-none placeholder:text-[#77746d]"
              />
            </label>
            <button
              aria-label="Notifications"
              onClick={() => setNotice("You're all caught up.")}
              className="relative rounded-xl p-2 text-[#aaa69e] transition hover:bg-[#252522]"
            >
              <Bell size={18} aria-hidden="true" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#f08a4b]" />
            </button>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="action-button flex items-center gap-2 text-sm"
            >
              <Plus size={17} aria-hidden="true" />
              <span className="hidden sm:inline">New project</span>
            </Button>
          </div>
        </header>

        <div className="soft-grid mx-auto max-w-[1440px] px-5 py-8 md:px-9 md:py-10">
          {notice && (
            <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
              {notice}
            </div>
          )}

          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs text-[#aaa69d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7fc7a8]" /> YOUR WORKSPACE
              </div>
              <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
                Good to see you, {userName.split(" ")[0]}
                <span className="accent">.</span>
              </h1>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="action-button flex w-fit items-center gap-2 text-sm"
            >
              <Plus size={17} aria-hidden="true" /> Create something
            </Button>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Active projects</span>
                <FolderOpen size={17} className="text-[#e7a170]" aria-hidden="true" />
              </div>
              <div className="stat-number">
                {loadingProjects ? "..." : projectList.length.toString().padStart(2, "0")}
              </div>
            </div>
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Production elements</span>
                <Clapperboard size={17} className="text-[#b5a1ff]" aria-hidden="true" />
              </div>
              <div className="stat-number">24</div>
            </div>
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Voice profiles</span>
                <Waves size={18} className="text-[#7fc7b2]" aria-hidden="true" />
              </div>
              <div className="stat-number">00</div>
            </div>
          </div>

          <div className="mb-9 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2b2a27] px-5 py-4 md:px-6">
                <div>
                  <h2 className="font-semibold">Pick up where you left off</h2>
                  <p className="mt-1 text-xs text-[#8f8b83]">Your creative work stored securely in Supabase.</p>
                </div>
              </div>
              <ProjectList
                projects={projectList}
                loading={loadingProjects}
                search={search}
                onSelectProject={(title) => {
                  setActive("My projects");
                  setNotice(`${title} selected.`);
                }}
              />
            </div>

            <div className="panel relative overflow-hidden p-5 md:p-6">
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <span className="mini-label">YOUR CREATIVE TOOLKIT</span>
                  <Sparkles size={17} className="accent" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => setActive(tool.name)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#302f2a] bg-[#1b1b18]/80 p-3 text-left hover:border-[#51483c]"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${tool.color}18`, color: tool.color }}
                      >
                        <tool.icon size={19} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{tool.name}</div>
                        <div className="mt-1 truncate text-[11px] text-[#8e8a82]">{tool.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        userId={userId}
        onProjectCreated={(newProj) => {
          setProjectList([newProj, ...projectList]);
          setNotice(`"${newProj.title}" saved to Supabase!`);
        }}
        onError={(err) => setNotice(err)}
      />
    </main>
  );
}