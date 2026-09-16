// Modified for standalone community distribution; see NOTICE.
type SchedulerLike = {
  yield?: () => Promise<void>;
};

export async function yieldToBrowser() {
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (typeof scheduler?.yield === "function") {
    await scheduler.yield();
    return;
  }

  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
      return;
    }
    setTimeout(resolve, 0);
  });
}

export async function processInBrowserBatches<T>(
  items: T[],
  worker: (item: T, index: number) => void | Promise<void>,
  options?: {
    batchSize?: number;
  }
) {
  const batchSize = Math.max(1, options?.batchSize ?? 24);
  for (let index = 0; index < items.length; index += 1) {
    await worker(items[index], index);
    if ((index + 1) % batchSize === 0) {
      await yieldToBrowser();
    }
  }
}
