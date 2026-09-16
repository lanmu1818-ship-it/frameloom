// Modified for standalone community distribution; see NOTICE.
import type { CanvasProject } from "@/types/canvas/index";
import { apiFetch } from "@/src/client/api";

export interface CanvasProjectApiResponse {
  success: boolean;
  data?: CanvasProject;
  error?: string;
}

type CanvasProjectPreloadEntry =
  | CanvasProjectApiResponse
  | Promise<CanvasProjectApiResponse>;

type CanvasProjectPreloadStore = Record<string, CanvasProjectPreloadEntry>;

const CANVAS_PROJECT_PRELOAD_STORE_KEY = "__ASTRA_CANVAS_PROJECT_PRELOADS__";
const CANVAS_PROJECT_PRELOAD_READY_KEY =
  "__ASTRA_CANVAS_PROJECT_PRELOAD_READY__";

declare global {
  interface Window {
    [CANVAS_PROJECT_PRELOAD_STORE_KEY]?: CanvasProjectPreloadStore;
    [CANVAS_PROJECT_PRELOAD_READY_KEY]?: Record<string, boolean>;
  }
}

function normalizeCanvasProjectId(id: string) {
  return String(id || "").trim();
}

function getCanvasProjectPreloadStore() {
  if (typeof window === "undefined") {
    return null;
  }

  window[CANVAS_PROJECT_PRELOAD_STORE_KEY] ||= {};
  window[CANVAS_PROJECT_PRELOAD_READY_KEY] ||= {};
  return {
    ready: window[CANVAS_PROJECT_PRELOAD_READY_KEY],
    store: window[CANVAS_PROJECT_PRELOAD_STORE_KEY],
  };
}

export function hasPreloadedCanvasProject(id: string) {
  const normalizedId = normalizeCanvasProjectId(id);
  if (!normalizedId) return false;

  const preloadStore = getCanvasProjectPreloadStore();
  return preloadStore?.ready?.[normalizedId] === true;
}

export function readPreloadedCanvasProject(id: string) {
  const normalizedId = normalizeCanvasProjectId(id);
  if (!normalizedId) return null;

  const preloadStore = getCanvasProjectPreloadStore();
  return preloadStore?.store?.[normalizedId] || null;
}

export function preloadCanvasProject(id: string) {
  const normalizedId = normalizeCanvasProjectId(id);
  if (!normalizedId) {
    return Promise.resolve<CanvasProjectApiResponse>({
      success: false,
      error: "画布 ID 为空",
    });
  }

  const preloadStore = getCanvasProjectPreloadStore();
  if (!preloadStore) {
    return Promise.resolve<CanvasProjectApiResponse>({
      success: false,
      error: "当前环境不支持预加载画布",
    });
  }

  const existing = preloadStore.store[normalizedId];
  if (existing) {
    return Promise.resolve(existing);
  }

  const preloadPromise = apiFetch(
    `/api/canvas/${encodeURIComponent(normalizedId)}`,
  )
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === "object") {
        return payload as CanvasProjectApiResponse;
      }
      return {
        success: false,
        error: response.ok ? "画布数据格式异常" : "获取画布失败",
      };
    })
    .catch((error) => ({
      success: false,
      error: error instanceof Error ? error.message : "获取画布失败",
    }))
    .then((result) => {
      preloadStore.store[normalizedId] = result;
      preloadStore.ready[normalizedId] = true;
      return result;
    });

  preloadStore.store[normalizedId] = preloadPromise;
  return preloadPromise;
}
