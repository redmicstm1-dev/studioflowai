"use client";

import { useState } from "react";
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

type Project = {
  title: string;
  type: string;
  updated: string;
  progress: number;
  color: string;
  tag: string;
};

const initialProjects: Project[] = [
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

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectList, setProjectList] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  function createProject() {
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
    setNotice("Project created in this prototype.");
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

  const filteredProjects = projectList.filter((p) =>
    `${p.title} ${p.type}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#111110] text-[#eee9df]">
      {/* Mobile Nav Overlay */}
      {mobileNav && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#2b2a27] bg-[#151513] px-4 py-5 transition-transform lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-9 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f08a4b] text-[#23150e]">
              <WandSparkles size={22} />
            </div>
            <div>
              <div className="text-[17px] font-semibold tracking-tight">
                StudioFlow<span className="text-[#f08a4b]">.</span>
              </div>
              <div className="text-[10px] tracking-[.16em] text-[#8f8b82]">
                YOUR CREATIVE WORKSHOP
              </div>
            </div>
          </div>
          <button
            className="text-[#888] hover:text-[#fff] lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>

        {nav.map((section) => (
          <div key={section.group} className="mb-7">
            <div className="mb-2 px-3 text-[10px] font-bold tracking-[.18em] text-[#7f7b72]">
              {section.group}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActive(item.name);
                    setMobileNav(false);
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors text-left ${
                    isActive
                      ? "bg-[#252320] font-medium text-[#f08a4b]"
                      : "text-[#a5a198] hover:bg-[#1e1d1a] hover:text-[#eee9df]"
                  }`}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                  {item.name === "Voice Studio" && (
                    <span className="ml-auto rounded-md bg-[#2a3b33] px-1.5 py-0.5 text-[9px] font-semibold text-[#8bd2b7]">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="mb-2 px-3 text-[10px] font-bold tracking-[.18em] text-[#7f7b72]">
          YOUR SPACE
        </div>
        <button
          onClick={() => setActive("Team & sharing")}
          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors text-left ${
            active === "Team & sharing"
              ? "bg-[#252320] font-medium text-[#f08a4b]"
              : "text-[#a5a198] hover:bg-[#1e1d1a] hover:text-[#eee9df]"
          }`}
        >
          <Users size={17} />
          Team & sharing
        </button>

        <div className="mt-auto">
          <div className="mb-4 rounded-2xl border border-[#393027] bg-[#211e19] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[#f08a4b]" />
              <span className="text-sm font-medium">Make room for ideas</span>
            </div>
            <p className="mb-3 text-xs leading-5 text-[#aaa59b]">
              Your next big idea starts with a small first step.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-lg border border-[#514234] px-3 py-2 text-xs font-semibold text-[#f5b185] transition-colors hover:bg-[#30271f]"
            >
              Start a project <span className="float-right">↗</span>
            </button>
          </div>

          <button
            onClick={() => setActive("Settings")}
            className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#a5a198] transition-colors hover:bg-[#1e1d1a] hover:text-[#eee9df]"
          >
            <Settings2 size={17} />
            Settings
          </button>
          <button
            onClick={() => setActive("Help & feedback")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#a5a198] transition-colors hover:bg-[#1e1d1a] hover:text-[#eee9df]"
          >
            <CircleHelp size={17} />
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
            <MoreHorizontal size={18} className="text-[#888]" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="min-h-screen lg:ml-[248px]">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#2b2a27] bg-[#111110]/90 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
              className="text-[#aaa] hover:text-white lg:hidden"
            >
              <Menu size={21} />
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
              <Search size={15} className="text-[#8b887f]" />
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
              className="relative rounded-xl p-2 text-[#aaa69e] transition-colors hover:bg-[#252522]"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#f08a4b]" />
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-[#f08a4b] px-4 py-2 text-sm font-medium text-[#1c120c] transition-opacity hover:opacity-90"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">New project</span>
            </button>
          </div>
        </header>

        {/* Dashboard Grid Container */}
        <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-9 md:py-10">
          {notice && (
            <div className="mb-5 rounded-xl border border-[#3c5b4b] bg-[#1c2b23] px-4 py-3 text-sm text-[#a7dfc0]">
              {notice}
            </div>
          )}

          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs text-[#aaa69d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7fc7a8]" /> YOUR WORKSPACE,
                YOUR RULES
              </div>
              <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
                Good to see you, Austine<span className="text-[#f08a4b]">.</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
                Every great thing starts as an idea. What are we making today?
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex w-fit items-center gap-2 rounded-xl bg-[#f08a4b] px-4 py-2.5 text-sm font-medium text-[#1c120c] transition-opacity hover:opacity-90"
            >
              <Plus size={17} /> Create something
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2b2a27] bg-[#171715] p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Active projects</span>
                <FolderOpen size={17} className="text-[#e7a170]" />
              </div>
              <div className="text-3xl font-bold tracking-tight">
                {projectList.length.toString().padStart(2, "0")}
              </div>
              <div className="mt-2 text-xs text-[#77746d]">Stories in the making</div>
            </div>

            <div className="rounded-2xl border border-[#2b2a27] bg-[#171715] p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Production elements</span>
                <Clapperboard size={17} className="text-[#b5a1ff]" />
              </div>
              <div className="text-3xl font-bold tracking-tight">24</div>
              <div className="mt-2 text-xs text-[#77746d]">
                Scenes, shots & characters <span className="text-[#8d8a82]">· demo data</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2b2a27] bg-[#171715] p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm text-[#aaa69e]">Voice profiles</span>
                <Waves size={18} className="text-[#7fc7b2]" />
              </div>
              <div className="text-3xl font-bold tracking-tight">00</div>
              <div className="mt-2 text-xs text-[#77746d]">No voices created yet</div>
            </div>
          </div>

          {/* Main Grid Section */}
          <div className="mb-9 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            {/* Project List */}
            <div className="overflow-hidden rounded-2xl border border-[#2b2a27] bg-[#171715]">
              <div className="flex items-center justify-between border-b border-[#2b2a27] px-5 py-4 md:px-6">
                <div>
                  <h2 className="font-semibold">Pick up where you left off</h2>
                  <p className="mt-1 text-xs text-[#8f8b83]">Your creative work, all in one place.</p>
                </div>
                <button
                  onClick={() => setActive("My projects")}
                  className="text-xs text-[#e9a477] hover:text-[#ffc39d]"
                >
                  All projects ↗
                </button>
              </div>

              <div className="divide-y divide-[#2b2a27]">
                {filteredProjects.slice(0, 4).map((p, i) => (
                  <button
                    key={`${p.title}-${i}`}
                    onClick={() => {
                      setActive("My projects");
                      setNotice(`${p.title} selected. Project workspace is the next build step.`);
                    }}
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[.025] md:px-6"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${p.color}20`, color: p.color }}
                    >
                      {p.tag === "FILM" ? <Film size={21} /> : <FileText size={21} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{p.title}</span>
                        <span className="hidden rounded-md border border-[#393832] px-1.5 py-0.5 text-[9px] tracking-wider text-[#9a968d] sm:inline">
                          {p.tag}
                        </span>
                      </div>
                      <div className="truncate text-xs text-[#8d8981]">{p.type}</div>
                      <div className="mt-3 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#33322e]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${p.progress}%`, background: p.color }}
                        />
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-xs text-[#aaa69e]">{p.progress}%</div>
                      <div className="mt-1 text-[10px] text-[#77746d]">{p.updated}</div>
                    </div>
                    <MoreHorizontal size={18} className="text-[#6e6b64] opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="p-8 text-center text-sm text-[#99958c]">
                    No projects match “{search}”.
                  </div>
                )}
              </div>
            </div>

            {/* Creative Toolkit */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2b2a27] bg-[#171715] p-5 md:p-6">
              <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[#f08a4b]/10 blur-3xl" />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[.18em] text-[#7f7b72]">
                    YOUR CREATIVE TOOLKIT
                  </span>
                  <Sparkles size={17} className="text-[#f08a4b]" />
                </div>
                <h2 className="mb-2 text-xl font-semibold tracking-tight">
                  A little tool for every big idea.
                </h2>
                <p className="mb-5 text-xs leading-5 text-[#9e9a91]">
                  Choose a workshop to get moving. Each one is built to work together.
                </p>
                <div className="space-y-2">
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => setActive(tool.name)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#302f2a] bg-[#1b1b18]/80 p-3 text-left transition-colors hover:border-[#51483c] hover:bg-[#22211d]"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${tool.color}18`, color: tool.color }}
                        >
                          <ToolIcon size={19} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{tool.name}</div>
                          <div className="mt-1 truncate text-[11px] t