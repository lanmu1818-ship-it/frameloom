// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import {
  UPLOAD_PROGRESS_EVENT,
  type UploadProgressEventDetail,
} from "@/src/client/upload-with-retry";

type UploadProgressItem = Required<
  Pick<UploadProgressEventDetail, "phase" | "status" | "uploadId">
> & {
  fileName?: string;
  progress?: number;
  updatedAt: number;
};

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, UploadProgressItem>>({});

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<UploadProgressEventDetail>).detail;
      if (!detail?.uploadId) {
        return;
      }

      const status = detail.status || "progress";
      if (status === "dismissed") {
        setItems((current) => {
          if (!current[detail.uploadId]) {
            return current;
          }
          const next = { ...current };
          delete next[detail.uploadId];
          return next;
        });
        return;
      }

      setItems((current) => ({
        ...current,
        [detail.uploadId]: {
          fileName: detail.fileName,
          phase: detail.phase || getDefaultPhase(status),
          progress: detail.progress,
          status,
          updatedAt: Date.now(),
          uploadId: detail.uploadId,
        },
      }));

      if (status === "completed" || status === "failed") {
        window.setTimeout(() => {
          setItems((current) => {
            const item = current[detail.uploadId];
            if (!item || item.status !== status) {
              return current;
            }
            const next = { ...current };
            delete next[detail.uploadId];
            return next;
          });
        }, status === "completed" ? 900 : 2600);
      }
    };

    window.addEventListener(UPLOAD_PROGRESS_EVENT, handleProgress);
    return () =>
      window.removeEventListener(UPLOAD_PROGRESS_EVENT, handleProgress);
  }, []);

  const activeItem = useMemo(() => {
    return Object.values(items).sort((left, right) => right.updatedAt - left.updatedAt)[0] || null;
  }, [items]);

  return (
    <>
      {children}
      {activeItem ? <UploadProgressDialog item={activeItem} /> : null}
    </>
  );
}

function UploadProgressDialog({ item }: { item: UploadProgressItem }) {
  const isFailed = item.status === "failed";
  const isDone = item.status === "completed";
  const progress = typeof item.progress === "number" ? item.progress : null;

  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 top-6 z-[10000] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-[16px] border border-black/10 bg-white p-4 shadow-[0_20px_64px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#141416] dark:text-white"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-black/[0.05] text-black dark:bg-white/[0.08] dark:text-white">
          {isFailed ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 truncate text-[14px] font-semibold text-black dark:text-white">
              {isFailed ? "图片上传失败" : isDone ? "图片上传完成" : "正在上传图片"}
            </p>
            {!isFailed && !isDone ? (
              <Loader2 className="h-4 w-4 flex-none animate-spin text-black/50 dark:text-white/55" />
            ) : null}
          </div>
          <p className="mt-1 line-clamp-1 text-[12px] text-black/55 dark:text-white/55">
            {item.fileName || item.phase}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.1]">
            <div
              className={
                progress === null && !isFailed
                  ? "h-full w-1/2 animate-[upload-progress-slide_1.2s_ease-in-out_infinite] rounded-full bg-[#d4551f]"
                  : "h-full rounded-full bg-[#d4551f] transition-all duration-300"
              }
              style={{
                width:
                  progress === null
                    ? undefined
                    : `${isFailed ? Math.max(progress, 8) : progress}%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-black/50 dark:text-white/45">
            <span className="truncate">{item.phase}</span>
            <span>{progress === null ? "处理中" : `${progress}%`}</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes upload-progress-slide {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(230%);
          }
        }
      `}</style>
    </div>
  );
}

function getDefaultPhase(status: UploadProgressEventDetail["status"]) {
  if (status === "completed") {
    return "上传完成";
  }
  if (status === "failed") {
    return "上传失败";
  }
  if (status === "dismissed") {
    return "需要可用 API Key";
  }
  return "正在上传...";
}
