"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  CircleHelp,
  Clapperboard,
  FileText,
  Film,
  FolderOpen,
  Headphones,
  LayoutDashboard,
  Menu,
  Mic2,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
  WandSparkles,
  Waves,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Inputs from "@/components/ui/Inputs";

type Project = {
  title: string;
  type: string;
  updated: string;
  progress: number;
  color: string;
  tag: string;
};

const projects: Project[] = [
  {
    title: "Shattersoul",
    type: "Fantasy series · 6 episodes",
    updated: "Edited 24 min ago",
    progress: 72,
    color: "#a78bfa",
    tag: "SERIES",
  },
  {
    title: "Tears of a Son",
    type: "Short film · Drama",
    updated: "Edited yesterday",
    progress: 38,
    color: "#f08a4b",
    tag: "FILM",
  },
  {
    title: "Before the Face",
    type: "Short-form series",
    updated: "Edited 3 days ago",
    progress: 54,
    color: "#6fb8a5",
    tag: "SERIES",
  },
];

const tools = [
  { name: "Story Studio", desc: "Ideas, scripts & characters", icon: BookOpen, color: "#f2a36f" },
  { name: "Shot Studio", desc: "Scenes, shots & storyboards", icon: Clapperboard, color: "#b5a1ff" },
  { name: "Voice Studio", desc: "Character voices & dialogue", icon: AudioLines, color: "#7fc7b2" },
  { name: "Asset Library", desc: "References & continuity", icon: Boxes, color: "#e4c66e" },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

  const [active, setActive] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectList, setProjectList] = useState(projects);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthError("Supabase is not configured. Please check your environment variables.");
      setCheckingAuth(false);
      return;
    }

    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setAuthError("We couldn't verify your session. Please try logging in again.");
        setCheckingAuth(false);
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

  function createProject(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!projectName.trim()) return;

    setProjectList([
      {
        title: projectName.trim(),
        type: "New creative project",
        updated: "Created just now",
        progress: 0,
        color: "#f08a4b",
        tag: "PROJECT",
      },
      ...projectList,
    ]);
    setProjectName("");
    setShowCreate(false);
    setNotice("Project created in this session.");
    window.setTimeout(() => setNotice(""), 2800);
  }

  const nav = [
    {
      group: "WORKSPACE",
      items: [
        { name: "Overview", icon: LayoutDashboard },
        { name: "My projects", icon: FolderOpen },
        { name: "Calendar", icon: CalendarDays },
      ],
    },
    {
      group: "WORKSHOP",
      items: [
        { name: "Story Studio", icon: BookOpen },
        { name: "Shot Studio", icon: Clapperboard },
        { name: "Voice Studio", icon: Mic2 },
        { name: "Asset Library", icon: Boxes },
      ],
    },
  ];

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
          <Button
            onClick={() => router.replace("/login")}
            className="mt-6 px-5 py-3 text-sm"
          >
            Return to login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111110] text-[#f5f2eb]">
      {mobileNav && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#2b2a27] bg-[#151513] px-4 py-5 transition-transform lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-9 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f08a4b] text-[#23150e]">
              <WandSparkles size={22} aria-hidden="true" />
            </div>
            <div>
              <div className="text-[17px] font-semibold tracking-tight">
                StudioFlow<span className="accent">.</span>
              </div>
              <div className="text-[10px] tracking-[.16em] text-[#8f8b82]">
                YOUR CREATIVE WORKSHOP
              </div>
            </div>
          </div>
          <button
            aria-label="Close navigation menu"
            className="text-[#888] lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {nav.map((section) => (
          <div key={section.group} className="mb-7">
            <div className="mini-label mb-2 px-3">{section.group}</div>
            {section.items.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setMobileNav(false);
                }}
                className={`nav-item mb-1 w-full text-left ${
                  active === item.name ? "nav-active" : ""
                }`}
              >
                <item.icon size={17} aria-hidden="true" />
                <span>{item.name}</span>
                {item.name === "Voice Studio" && (
                  <span className="ml-auto rounded-md bg-[#2a3b33] px-1.5 py-0.5 text-[9px] text-[#8bd2b7]">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}

        <div className="mini-label mb-2 px-3">YOUR SPACE</div>
        <button
          className={`nav-item mb-1 w-full text-left ${
            active === "Team & sharing" ? "nav-active" : ""
          }`}
          onClick={() => setActive("Team & sharing")}
        >
          <Users size={17} aria-hidden="true" />
          Team & sharing
        </button>

        <div className="mt-auto">
          <div className="mb-4 rounded-2xl border border-[#393027] bg-[#211e19] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="accent" aria-hidden="true" />
              <span className="text-sm font-medium">Make room for ideas</span>
            </div>
            <p className="mb-3 text-xs leading-5 text-[#aaa59b]">
              Your next big idea starts with a small first step.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-lg border border-[#514234] px-3 py-2 text-xs font-semibold text-[#f5b185] transition hover:bg-[#30271f]"
            >
              Start a project <span className="float-right">↗</span>
            </button>
          </div>
          <button onClick={() => setActive("Settings")} className="nav-item w-full">
            <Settings2 size={17} aria-hidden="true" />
            Settings
          </button>
          <button onClick={() => setActive("Help & feedback")} className="nav-item w-full">
            <CircleHelp size={17} aria-hidden="true" />
            Help & feedback
          </button>
          <div className="mt-4 flex items-center gap-3 border-t border-[#2b2a27] px-2 pt-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a2b23] text-sm font-semibold text-[#f4b38c]">
              AS
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">Austine Stimulate</div>
              <div className="text-[11px] text-[#928e85]">Creator workspace</div>
            </div>
            <MoreHorizontal size={18} className="text-[#888]" aria-hidden="true" />
          </div>
        </div>
      </aside>

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
              <kbd className="rounded border border-[#3a3934] px-1 text-[10px] text-[#8d8981]">
                ⌘ K
              </kbd>
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
                <span className="h-1.5 w-1.5 rounded-full bg-[#7fc7a8]" /> YOUR WORKSPACE, YOUR RULES
              </div>
              <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
                Good to see you, Austine<span className="accent">.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
                Every great thing starts as an idea. What are we making today?
              </p>
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
              <div className="stat-number">{projectList.length.toString().padStart(2, "0")}</div>
              <div className="mt-2 text-xs text-[#77746d]">Stories in the making</div>
            </div>
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Production elements</span>
                <Clapperboard size={17} className="text-[#b5a1ff]" aria-hidden="true" />
              </div>
              <div className="stat-number">24</div>
              <div className="mt-2 text-xs text-[#77746d]">
                Scenes, shots & characters <span className="text-[#8d8a82]">· demo data</span>
              </div>
            </div>
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Voice profiles</span>
                <Waves size={18} className="text-[#7fc7b2]" aria-hidden="true" />
              </div>
              <div className="stat-number">00</div>
              <div className="mt-2 text-xs text-[#77746d]">No voices created yet</div>
            </div>
          </div>

          <div className="mb-9 grid gap-6