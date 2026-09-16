// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "@/src/desktop/next-navigation-shim";
import { CanvasLogoLoadingView } from "@/src/components/canvas/canvas-logo-loading";
import { apiFetch } from "@/src/client/api";
import { generateUUID } from "@/src/lib/utils";

type CanvasListResponse = {
  success?: boolean;
  error?: string;
  data?: Array<{ id?: string | null }>;
};

function createClientId() {
  return generateUUID();
}

function buildVideoCanvasUrl(canvasId: string, searchParams: URLSearchParams) {
  const query = new URLSearchParams(searchParams.toString());
  query.delete("new");
  query.set("mode", "video");
  query.set("workspaceType", "video");

  return `/canvas/${canvasId}?${query.toString()}`;
}

async function getLatestVideoCanvasId() {
  const response = await apiFetch("/api/canvas?workspaceType=video&limit=1", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "请先登录后打开视频画布" : "读取视频画布列表失败，请重试");
  }

  const payload = (await response.json().catch(() => null)) as CanvasListResponse | null;
  if (!payload?.success || !Array.isArray(payload.data)) throw new Error(payload?.error || "读取视频画布列表失败，请重试");
  const latestId = payload.data[0]?.id;
  return typeof latestId === "string" && latestId.trim() ? latestId : null;
}

export function VideoCanvasRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");

    const redirectToVideoCanvas = async () => {
      const shouldCreateNew = searchParams.get("new") === "1";
      const canvasId = shouldCreateNew
        ? createClientId()
        : (await getLatestVideoCanvasId()) || createClientId();

      if (!cancelled) {
        router.replace(buildVideoCanvasUrl(canvasId, searchParams));
      }
    };

    void redirectToVideoCanvas().catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "无法打开视频画布");
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, attempt]);

  if (error) return (
    <div className="flex h-svh flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p role="alert" className="text-sm">{error}</p>
      <div className="flex gap-4 text-sm">
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>重新加载</button>
        <button type="button" onClick={() => router.push("/")}>返回首页</button>
      </div>
    </div>
  );
  return <CanvasLogoLoadingView label="正在打开视频画布..." />;
}
