"use client";

import { Calendar, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CalendarPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#e7a170]">
            <Calendar size={15} /> TIMELINE & CALENDAR
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            Production Schedule<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Track shoot dates, recording sessions, and submission deadlines across projects.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> Schedule Event
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <h3 className="text-lg font-semibold text-white">Calendar Timeline</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Production scheduling and milestone tracking views are enabled for your workspace.
        </p>
      </div>
    </div>
  );
}
