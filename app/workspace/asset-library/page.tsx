"use client";

import { Boxes, Sparkles, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function AssetLibraryPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-[#e4c66e]">
            <Boxes size={15} /> ASSET LIBRARY
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-[38px]">
            References & Continuity<span className="accent">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a5a198]">
            Manage project media, key props, location notes, and aesthetic guidelines.
          </p>
        </div>
        <Button className="action-button flex w-fit items-center gap-2 text-sm">
          <Plus size={17} /> Upload Asset
        </Button>
      </div>

      <div className="panel p-8 text-center border-dashed">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4c66e]/15 text-[#e4c66e]">
          <Sparkles size={24} />
        </div>
        <h3 className="text-lg font-semibold">Asset Vault</h3>
        <p className="mt-2 text-xs leading-6 text-[#8d8981] max-w-md mx-auto">
          Media storage, continuity cataloging, and reference linking will be managed in this view.
        </p>
      </div>
    </div>
  );
}