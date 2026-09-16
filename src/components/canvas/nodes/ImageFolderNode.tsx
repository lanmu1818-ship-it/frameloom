// Modified for standalone community distribution; see NOTICE.
"use client";

import { FolderOpen } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { CanvasNode, ImageFolderNodeData } from "@/types/canvas/index";

interface ImageFolderNodeProps {
  node: CanvasNode;
  isSelected?: boolean;
}

export function ImageFolderNode({ node, isSelected = false }: ImageFolderNodeProps) {
  const data = node.data as ImageFolderNodeData;
  const imageCount = Array.isArray(data.imageNodeIds)
    ? data.imageNodeIds.length
    : 0;
  const title = String(data.title || "图片收纳板").trim();

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[3px] border border-black/[0.06] bg-white shadow-none",
        isSelected && "ring-1 ring-brand-selection"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,20,25,0.018),rgba(15,20,25,0)_72px)]" />
      {isSelected ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-2.5 py-1 text-[12px] font-medium text-[#536471] shadow-[0_4px_12px_rgba(15,20,25,0.05)] backdrop-blur">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-[#8a96a3]">{imageCount} 张</span>
        </div>
      ) : null}
    </div>
  );
}
