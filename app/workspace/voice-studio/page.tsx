"use client";

import { AudioLines, Sparkles, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function VoiceStudioPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#7fc7b2]">
            <AudioLines size={15} /> VOICE STUDIO
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Character Voices & Dialogue<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Assign voice profiles, generate scratch tracks, and tune audio delivery.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> Create Voice Profile
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7fc7b2]/15 text-[#7fc7b2]">
          <Sparkles size={24} />
        </div>
        <h3 className="text-lg font-semibold">Voice Studio Laboratory</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Audio synthesis and dialogue recording management are integrated here.
        </p>
      </div>
    </div>
  );
}