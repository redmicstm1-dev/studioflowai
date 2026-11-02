"use client";

import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-xs text-[#7fc7b2]">
          <HelpCircle size={15} /> DOCUMENTATION
        </div>
        <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
          Help & Feedback<span className="accent">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
          Learn how to structure storyboards, manage scripts, and optimize StudioFlow.
        </p>
      </div>

      <div className="panel p-6 max-w-2xl">
        <h3 className="text-base font-semibold text-white">Quick Start Guide</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981]">
          1. Create projects directly from the Overview dashboard.<br />
          2. Open projects to monitor status, progress, and metadata.<br />
          3. Navigate between Story, Shot, Voice, and Asset workshops using the sidebar menu.
        </p>
      </div>
    </div>
  );
}
