"use client";

import { Clapperboard, Sparkles, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ShotStudioPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#b5a1ff]">
            <Clapperboard size={15} /> SHOT STUDIO
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Scenes, Shots & Storyboards<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Break down scenes into precise camera angles, focal lengths, and shot lists.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> Add Shot List
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b5a1ff]/15 text-[#b5a1ff]">
          <Sparkles size={24} />
        </div>
        <h3 className="text-lg font-semibold">Shot Studio Canvas</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Visual storyboarding and automated shot suggestions will be housed here.
        </p>
      </div>
    </div>
  );
}