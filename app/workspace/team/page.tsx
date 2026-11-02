"use client";

import { Users, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function TeamPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#b5a1ff]">
            <Users size={15} /> TEAM MANAGEMENT
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Team & Sharing<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Invite collaborators, manage role permissions, and review shared workspace assets.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> Invite Member
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <h3 className="text-lg font-semibold text-white">Team Workspace</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Collaborator invitations and role-based access management are configured for this project space.
        </p>
      </div>
    </div>
  );
}
