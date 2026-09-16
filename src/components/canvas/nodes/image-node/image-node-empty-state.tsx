// Modified for standalone community distribution; see NOTICE.
"use client";

import { AlertCircle, ImagePlus, Loader2 } from "lucide-react";
import type React from "react";
import { GenerationDotPlaceholder } from "@/src/components/generation-dot-placeholder";

interface ImageNodeEmptyStateProps {
  detailProgressLabel?: string;
  fileInputRef: React.Ref<HTMLInputElement>;
  generationProgress?: number | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectFile: (event: React.MouseEvent<HTMLButtonElement>) => void;
  status?: string;
}

export function ImageNodeDeferredLoadState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400 text-xs dark:bg-zinc-900 dark:text-zinc-500">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>图片即将进入视口时加载</span>
      </div>
    </div>
  );
}

export function ImageNodeProcessingOverlay({
  detailProgressLabel,
  generationProgress,
}: {
  detailProgressLabel?: string;
  generationProgress?: number | null;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-white/96 backdrop-blur-[1px] dark:bg-[#151619]/95">
      <GenerationDotPlaceholder
        className="h-full w-full rounded-none"
        compact
        phase="processing"
        progress={generationProgress}
        title={detailProgressLabel || "正在处理图片"}
      />
    </div>
  );
}

export function ImageNodeEmptyState({
  detailProgressLabel,
  fileInputRef,
  generationProgress,
  onImageUpload,
  onSelectFile,
  status,
}: ImageNodeEmptyStateProps) {
  if (status === "generating") {
    return (
      <GenerationDotPlaceholder
        className="h-full w-full rounded-none"
        compact
        phase="processing"
        progress={generationProgress}
        title={detailProgressLabel || undefined}
      />
    );
  }

  if (status === "failed") {
    return (
      <div className="flex h-full w-full select-none flex-col items-center justify-center bg-[#fff7f8] px-6 text-center dark:bg-red-950/40">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#f2d7dd] bg-white text-[#d24f63] shadow-[0_0_0_1px_rgba(242,215,221,0.22)]">
          <AlertCircle className="h-5 w-5" />
        </span>
        <span className="select-none text-sm font-medium text-[#c84b5e]">
          生成失败
        </span>
        <span className="mt-1 text-xs text-[#b77480]">请重新上传或再试一次</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full select-none flex-col items-center justify-center bg-[#f7f9fc] px-6 text-center dark:bg-zinc-900">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5f4] bg-white text-[#5b76fe] shadow-[0_0_0_1px_rgba(219,226,238,0.22)]">
        <ImagePlus className="h-5 w-5" />
      </span>
      <span className="select-none text-sm font-medium text-[#3f4b63]">
        上传图片
      </span>
      <span className="mb-4 mt-1 select-none text-xs text-[#7a8395]">
        添加参考图、角色图或关键帧素材
      </span>
      <input
        accept="image/*"
        className="hidden"
        onChange={onImageUpload}
        ref={fileInputRef}
        type="file"
      />
      <button
        className="cursor-pointer rounded-[14px] border border-[#d7dff1] bg-white px-4 py-2 text-sm font-medium text-[#3954db] shadow-[0_0_0_1px_rgba(219,226,238,0.24)] transition-colors hover:bg-[#f4f7ff]"
        onClick={onSelectFile}
        type="button"
      >
        选择文件
      </button>
    </div>
  );
}
