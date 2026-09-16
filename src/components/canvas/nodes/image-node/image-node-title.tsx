// Modified for standalone community distribution; see NOTICE.
"use client";

import { ImagePlus } from "lucide-react";
import type React from "react";
import { Input } from "@/src/components/ui/input";

interface ImageNodeSelectedTitleProps {
  displayTitle: string;
  draftTitle: string;
  isEditingTitle: boolean;
  onDraftTitleChange: (value: string) => void;
  onCancelEditing: () => void;
  onSaveTitle: () => void;
  onStartEditing: () => void;
  resolutionLabel?: string;
  style?: React.CSSProperties;
}

export function ImageNodeSelectedTitle({
  displayTitle,
  draftTitle,
  isEditingTitle,
  onCancelEditing,
  onDraftTitleChange,
  onSaveTitle,
  onStartEditing,
  resolutionLabel,
  style,
}: ImageNodeSelectedTitleProps) {
  return (
    <div
      className="-top-7 absolute right-0 left-0 z-10 flex items-center justify-between px-1 text-[#2f7df6] text-xs"
      style={style}
    >
      <div className="flex min-w-0 items-center gap-1">
        <ImagePlus className="h-3 w-3" />
        {isEditingTitle ? (
          <Input
            autoFocus
            className="h-6 w-[160px] px-2 py-0 text-xs"
            data-canvas-no-drag="true"
            onBlur={onSaveTitle}
            onChange={(event) => onDraftTitleChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveTitle();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onDraftTitleChange(displayTitle);
                onCancelEditing();
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            value={draftTitle}
          />
        ) : (
          <span
            className="max-w-[150px] cursor-text truncate"
            onDoubleClick={(event) => {
              event.stopPropagation();
              onDraftTitleChange(displayTitle);
              onStartEditing();
            }}
            title="双击重命名"
          >
            {displayTitle}
          </span>
        )}
      </div>
      {resolutionLabel ? (
        <span className="ml-2 shrink-0 tabular-nums tracking-wide">
          {resolutionLabel}
        </span>
      ) : null}
    </div>
  );
}
