// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";

import { PacmanLoader } from "@/src/components/pacman-loader";

type GenerationPhase = "idle" | "queued" | "processing" | "finalizing" | "failed" | "completed";

interface GenerationDotPlaceholderProps {
  className?: string;
  title?: string;
  phase?: GenerationPhase;
  progress?: number | null;
  compact?: boolean;
  showProgress?: boolean;
}

const PHASE_TITLES: Record<GenerationPhase, string> = {
  idle: "正在创建图片",
  queued: "等待开始生成",
  processing: "生成初稿中",
  finalizing: "正在润饰细节",
  failed: "生成失败",
  completed: "生成完成",
};

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function estimateProgress(phase: GenerationPhase, elapsedMs: number) {
  if (phase === "completed") return 100;
  if (phase === "failed") return 100;
  if (phase === "finalizing") return 96;
  if (phase === "queued") {
    return clampProgress(6 + Math.min(12, elapsedMs / 3500));
  }
  if (phase === "processing") {
    const eased = 1 - Math.exp(-elapsedMs / 85_000);
    return clampProgress(18 + eased * 78);
  }
  return clampProgress(Math.min(8, elapsedMs / 1000));
}

export function GenerationDotPlaceholder({
  className,
  title,
  phase = "processing",
  progress,
  compact = false,
  showProgress = true,
}: GenerationDotPlaceholderProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const isFinished = phase === "failed" || phase === "completed";

  useEffect(() => {
    setElapsedMs(0);
    if (!showProgress || typeof progress === "number" || isFinished) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, showProgress, progress, isFinished]);

  const resolvedProgress = clampProgress(
    typeof progress === "number" ? progress : estimateProgress(phase, elapsedMs)
  );
  const resolvedTitle = title || PHASE_TITLES[phase];

  return (
    <div
      aria-label={resolvedTitle}
      role="status"
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-[18px] border border-black/[0.07] bg-[#f7f7f8] text-[#111111] dark:border-white/10 dark:bg-[#151619] dark:text-[#f4f4f5]",
        compact ? "min-h-[210px] p-3.5" : "min-h-[360px] p-5",
        className
      )}
    >
      <div className={cn(
        "min-w-0 truncate font-medium text-[#535b68] dark:text-zinc-400",
        compact ? "text-[11px] leading-4" : "text-[13px] leading-5"
      )}>
        {resolvedTitle}
      </div>
      <div className="flex min-h-14 flex-1 items-center justify-center py-3">
        <PacmanLoader className={compact ? "scale-90" : undefined} paused={isFinished} />
      </div>
      {showProgress ? (
        <div className="space-y-2">
          <div className="flex justify-end text-[10px] font-medium text-[#7b8494] dark:text-zinc-400">
            <span>{resolvedProgress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[#8d96a4] transition-[width] duration-700 ease-out motion-reduce:transition-none dark:bg-white/60"
              style={{ width: `${resolvedProgress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
