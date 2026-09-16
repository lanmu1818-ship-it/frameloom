// Modified for standalone community distribution; see NOTICE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasState } from "@/types/canvas/index";
import { canvasService } from "@/src/services/canvas/index";
import { createVideoCanvasWriter } from "@/src/lib/video-canvas/persistence";

export function useVideoCanvasPersistence(canvasId: string, snapshot: CanvasState, ready: boolean) {
  const [status, setStatus] = useState<"saved" | "pending" | "saving" | "error">("saved");
  const [error, setError] = useState("");
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const persisted = useRef<CanvasState | null>(null);
  const writer = useMemo(() => createVideoCanvasWriter<CanvasState>(async (value) => {
    setStatus("saving");
    const result = await canvasService.saveCanvasState(canvasId, value, "video");
    if (!result.success) throw new Error(result.error || "保存失败");
    persisted.current = value;
  }), [canvasId]);
  const flush = useCallback(async () => {
    if (!ready) return false;
    try {
      await writer(latest.current);
      setError("");
      setStatus(persisted.current === latest.current ? "saved" : "pending");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
      setStatus("error");
      return false;
    }
  }, [ready, writer]);
  useEffect(() => {
    if (!ready || persisted.current === snapshot) return;
    setStatus("pending");
    const timer = window.setTimeout(() => { void flush(); }, 800);
    return () => window.clearTimeout(timer);
  }, [snapshot, ready, flush]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!ready || persisted.current === latest.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [ready]);
  // Client-side navigation does not fire beforeunload. Keep the last edit queued
  // when switching routes before the debounce expires.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  useEffect(() => () => {
    if (readyRef.current && persisted.current !== latest.current) {
      void writer(latest.current).catch(() => undefined);
    }
  }, [writer]);
  return { flush, status, error };
}
