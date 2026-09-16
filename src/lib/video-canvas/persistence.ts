// Modified for standalone community distribution; see NOTICE.
/** Serialize cloud writes and coalesce edits waiting behind an in-flight request. */
export function createVideoCanvasWriter<T>(persist: (snapshot: T) => Promise<void>) {
  type Waiter = { resolve: () => void; reject: (error: unknown) => void };
  let pending: { value: T; waiters: Waiter[] } | null = null;
  let running = false;
  async function drain() {
    running = true;
    while (pending) {
      const batch = pending;
      pending = null;
      try {
        await persist(batch.value);
        batch.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        batch.waiters.forEach(({ reject }) => reject(error));
      }
    }
    running = false;
  }
  return (value: T): Promise<void> => new Promise((resolve, reject) => {
    const waiters = pending?.waiters || [];
    waiters.push({ resolve, reject });
    pending = { value, waiters };
    if (!running) void drain();
  });
}

export function restoreVideoCanvasViewport(value: unknown) {
  const candidate = value as { x?: unknown; y?: unknown; zoom?: unknown } | null;
  return {
    x: typeof candidate?.x === "number" && Number.isFinite(candidate.x) ? candidate.x : 0,
    y: typeof candidate?.y === "number" && Number.isFinite(candidate.y) ? candidate.y : 0,
    zoom: typeof candidate?.zoom === "number" && Number.isFinite(candidate.zoom) ? Math.max(0.1, Math.min(8, candidate.zoom)) : 1,
  };
}
