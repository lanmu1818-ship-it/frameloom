// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "@/src/desktop/next-navigation-shim";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/src/client/api";

type CanvasListResponse = {
  success?: boolean;
  data?: Array<{ id?: string | null }>;
};

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildCanvasUrl(canvasId: string, searchParams: URLSearchParams) {
  const query = new URLSearchParams(searchParams.toString());
  query.delete("new");
  query.delete("mode");
  const queryString = query.toString();

  return `/canvas/${canvasId}${queryString ? `?${queryString}` : ""}`;
}

async function getLatestCanvasId() {
  const response = await apiFetch("/api/canvas?limit=1", {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as CanvasListResponse | null;
  const latestId = payload?.data?.[0]?.id;
  return typeof latestId === "string" && latestId.trim() ? latestId : null;
}

export function CanvasRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const redirectToCanvas = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const lanbiCanvasToken =
        hash.get("lanbi_canvas_token") || hash.get("launch_token") || "";
      if (lanbiCanvasToken) {
        const response = await apiFetch("/api/auth/lanbi-canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lanbiCanvasToken }),
        });
        if (!response.ok) {
          throw new Error("蓝笔登录状态已失效，请返回应用重新打开画布");
        }
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
      const shouldCreateNew = searchParams.get("new") === "1";
      const canvasId = shouldCreateNew
        ? createClientId()
        : (await getLatestCanvasId().catch(() => null)) || createClientId();

      if (!cancelled) {
        router.replace(buildCanvasUrl(canvasId, searchParams));
      }
    };

    void redirectToCanvas().catch((error) => {
      if (!cancelled) {
        setErrorMessage(
          error instanceof Error ? error.message : "画布加载失败，请稍后重试"
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex h-svh w-full items-center justify-center bg-background text-muted-foreground">
      <div className="flex items-center gap-3 text-sm">
        {errorMessage ? null : <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{errorMessage || "正在打开画布..."}</span>
      </div>
    </div>
  );
}
