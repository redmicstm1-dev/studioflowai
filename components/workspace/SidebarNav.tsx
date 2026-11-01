"use client";

import {
  AudioLines,
  BookOpen,
  Boxes,
  CalendarDays,
  CircleHelp,
  Clapperboard,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Mic2,
  MoreHorizontal,
  Settings2,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

interface SidebarNavProps {
  active: string;
  setActive: (name: string) => void;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  setShowCreate: (open: boolean) => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

export default function SidebarNav({
  active,
  setActive,
  mobileNav,
  setMobileNav,
  setShowCreate,
  userName,
  userEmail,
  onSignOut,
}: SidebarNavProps) {
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

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <>
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
          <button
            onClick={onSignOut}
            className="nav-item mt-2 w-full text-left transition hover:text-red-400"
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
          <div className="mt-4 flex items-center gap-3 border-t border-[#2b2a27] px-2 pt-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a2b23] text-sm font-semibold uppercase text-[#f4b38c]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{userName}</div>
              <div className="truncate text-[11px] text-[#928e85]">{userEmail}</div>
            </div>
            <MoreHorizontal size={18} className="text-[#888]" aria-hidden="true" />
          </div>
        </div>
      </aside>
    </>
  );
}