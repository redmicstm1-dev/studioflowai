"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  Boxes,
  Calendar,
  Clapperboard,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
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
  mobileNav,
  setMobileNav,
  setShowCreate,
  userName,
  userEmail,
  onSignOut,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navGroups = [
    {
      title: "WORKSPACE",
      items: [
        { name: "Overview", icon: LayoutDashboard, href: "/workspace" },
        { name: "My projects", icon: FolderOpen, href: "/workspace/projects" },
        { name: "Calendar", icon: Calendar, href: "/workspace/calendar" },
      ],
    },
    {
      title: "WORKSHOP",
      items: [
        { name: "Story Studio", icon: BookOpen, href: "/workspace/story-studio" },
        { name: "Shot Studio", icon: Clapperboard, href: "/workspace/shot-studio" },
        { name: "Voice Studio", icon: AudioLines, href: "/workspace/voice-studio", badge: "AI" },
        { name: "Asset Library", icon: Boxes, href: "/workspace/asset-library" },
      ],
    },
    {
      title: "YOUR SPACE",
      items: [{ name: "Team & sharing", icon: Users, href: "/workspace/team" }],
    },
  ];

  const bottomNav = [
    { name: "Settings", icon: Settings, href: "/workspace/settings" },
    { name: "Help & feedback", icon: HelpCircle, href: "/workspace/help" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/workspace") return pathname === "/workspace";
    return pathname.startsWith(href);
  };

  return (
    <>
      {mobileNav && (
        <div
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 z-50 flex w-[248px] flex-col border-r border-[#2b2a27] bg-[#141412] transition-transform duration-300 lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[70px] items-center justify-between border-b border-[#2b2a27] px-6">
          <Link href="/workspace" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f08a4b] font-bold text-black">
              S
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">StudioFlow</div>
              <div className="text-[10px] uppercase tracking-wider text-[#77746d]">
                Creative Workshop
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileNav(false)}
            className="text-[#888] lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-[#6e6b64]">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileNav(false)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition ${
                        active
                          ? "bg-[#272622] font-medium text-white shadow-sm"
                          : "text-[#9a968d] hover:bg-[#1f1e1b] hover:text-[#eee]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          size={16}
                          className={active ? "text-[#f08a4b]" : "text-[#8d8981]"}
                        />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-[#f08a4b]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f08a4b]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#2b2a27] p-4 space-y-3">
          <div className="space-y-1">
            {bottomNav.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileNav(false)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs transition ${
                    active
                      ? "bg-[#272622] text-white"
                      : "text-[#9a968d] hover:bg-[#1f1e1b] hover:text-[#eee]"
                  }`}
                >
                  <item.icon size={16} className="text-[#8d8981]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#9a968d] transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#2b2a27] bg-[#191917] p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2e2d29] text-xs font-semibold text-white">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">{userName}</div>
              <div className="truncate text-[10px] text-[#77746d]">{userEmail}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}