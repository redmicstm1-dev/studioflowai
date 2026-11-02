"use client";

import { Settings } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs text-[#aaa69d]">
          <Settings size={15} /> PREFERENCES
        </div>
        <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
          Workspace Settings<span className="accent">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
          Manage your account defaults, notifications, and integration settings.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="panel p-6">
          <h3 className="text-base font-semibold text-white">Database & Storage</h3>
          <p className="mt-1 text-xs text-[#8d8981]">
            Connected to Supabase PostgreSQL with active RLS parameters (`owner_id = auth.uid()`).
          </p>
        </div>

        <div className="panel p-6">
          <h3 className="text-base font-semibold text-white">Authentication</h3>
          <p className="mt-1 text-xs text-[#8d8981]">
            Google OAuth login and session redirection active.
          </p>
        </div>
      </div>
    </div>
  );
}