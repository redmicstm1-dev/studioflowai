"use client";

import { BookOpen, Sparkles, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function StoryStudioPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#f2a36f]">
            <BookOpen size={15} /> STORY STUDIO
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Ideas, Scripts & Characters<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Craft treatment outlines, write dialogue, and build depth for your cast.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> New Script Draft
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2a36f]/15 text-[#f2a36f]">
          <Sparkles size={24} />
        </div>
        <h3 className="text-lg font-semibold">Story Studio Engine</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Script generation, character profiles, and scene narrative outlines will be configured in this module.
        </p>
      </div>
    </div>
  );
}