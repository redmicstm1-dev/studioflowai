"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, Plus, Search } from "lucide-react";

import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import SidebarNav from "@/components/workspace/SidebarNav";
import CreateProjectModal from "@/components/workspace/CreateProjectModal";
import { Project } from "@/types/project";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState("Creator");
  const [userEmail, setUserEmail] = useState("");

  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  // Dynamically resolve section titles based on active route path
  const getActiveFromPath = (path: string) => {
    if (path === "/workspace" || path === "/workspace/") return "Overview";
    if (path.includes("/workspace/projects/")) return "Project Workstation";
    if (path.includes("/workspace/projects")) return "My Projects";
    if (path.includes("/workspace/calendar")) return "Calendar";
    if (path.includes("/workspace/story-studio")) return "Story Studio";
    if (path.includes("/workspace/shot-studio")) return "Shot Studio";
    if (path.includes("/workspace/voice-studio")) return "Voice Studio";
    if (path.includes("/workspace/asset-library")) return "Asset Library";
    if (path.includes("/workspace/team")) return "Team & Sharing";
    if (path.includes("/workspace/settings")) return "Settings";
    if (path.includes("/workspace/help")) return "Help & Feedback";
    return "Workspace";
  };

  const active = getActiveFromPath(pathname);

  useEffect(() => {
    if (!supabase) {
      setAuthError("Supabase is not configured. Check environment variables.");
      setCheckingAuth(false);
      return;
    }

    let mounted = true;

    const checkSession = async () => {
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
    };

    checkSession();

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
        setActive={() => {}}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        setShowCreate={setShowCreate}
        userName={userName}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      <section className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-35 flex h-[70px] items-center justify-between border-b border-[#2b2a27] bg-[#111110]/90 px-5 backdrop-blur-xl md:px-9">
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
          {children}
        </div>
      </section>

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        userId={userId}
        onProjectCreated={(newProj: Project) => {
          setNotice(`"${newProj.title}" saved to Supabase!`);
          router.refresh();
        }}
        onError={(err: string) => setNotice(err)}
      />
    </main>
  );
}