// Modified for standalone community distribution; see NOTICE.
import {
  getDesktopArchiveBridge,
  normalizeLocalArchiveBatchSize,
  normalizeLocalArchiveConcurrency,
  runLocalMediaArchiveSync,
} from "@/src/client/local-media-archive";
import {
  getLocalMediaArchiveRuntimeConfig,
  normalizeLocalArchiveFailureCount,
  saveLocalMediaArchiveRuntimeConfig,
  type LocalMediaArchiveRuntimeConfig,
} from "@/src/runtime/local-media-archive-config";

export type LocalArchiveSchedulerOptions = {
  intervalMs?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  startupDelayMs?: number;
  limit?: number;
  batchSize?: number;
  concurrency?: number;
};

export type LocalArchiveSchedulerDecision =
  | {
      shouldRun: true;
      reason: "due";
    }
  | {
      shouldRun: false;
      reason:
        | "disabled"
        | "not_configured"
        | "bridge_missing"
        | "not_due"
        | "waiting_for_retry";
      nextDelayMs: number;
    };

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_RETRY_DELAY_MS = 15 * 60 * 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 30 * 1000;
const MIN_INTERVAL_MS = 5 * 60 * 1000;
const MIN_RETRY_DELAY_MS = 60 * 1000;
const MIN_MAX_RETRY_DELAY_MS = 60 * 1000;
const MIN_STARTUP_DELAY_MS = 1000;

let activeScheduler: { stop: () => void } | null = null;

export function normalizeLocalArchiveSchedulerOptions(
  options: LocalArchiveSchedulerOptions = {}
) {
  return {
    intervalMs: clampDelay(options.intervalMs, MIN_INTERVAL_MS, DEFAULT_INTERVAL_MS),
    retryDelayMs: clampDelay(
      options.retryDelayMs,
      MIN_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    ),
    maxRetryDelayMs: clampDelay(
      options.maxRetryDelayMs,
      MIN_MAX_RETRY_DELAY_MS,
      DEFAULT_MAX_RETRY_DELAY_MS
    ),
    startupDelayMs: clampDelay(
      options.startupDelayMs,
      MIN_STARTUP_DELAY_MS,
      DEFAULT_STARTUP_DELAY_MS
    ),
    limit: normalizeLimit(options.limit),
    batchSize: normalizeLocalArchiveBatchSize(options.batchSize),
    concurrency: normalizeLocalArchiveConcurrency(options.concurrency),
  };
}

export function computeLocalArchiveRetryDelayMs(params: {
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  failureCount?: number;
}) {
  const baseDelayMs = clampDelay(
    params.retryDelayMs,
    MIN_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS
  );
  const maxDelayMs = Math.max(
    baseDelayMs,
    clampDelay(
      params.maxRetryDelayMs,
      MIN_MAX_RETRY_DELAY_MS,
      DEFAULT_MAX_RETRY_DELAY_MS
    )
  );
  const failureCount = normalizeLocalArchiveFailureCount(params.failureCount);
  const multiplier = 2 ** Math.min(failureCount, 8);

  return Math.min(maxDelayMs, baseDelayMs * multiplier);
}

export function getLocalArchiveSchedulerDecision(params: {
  config: LocalMediaArchiveRuntimeConfig;
  now?: Date;
  intervalMs?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  bridgeAvailable?: boolean;
}): LocalArchiveSchedulerDecision {
  const now = params.now || new Date();
  const intervalMs = clampDelay(
    params.intervalMs,
    MIN_INTERVAL_MS,
    DEFAULT_INTERVAL_MS
  );
  const config = params.config;
  const retryDelayMs = computeLocalArchiveRetryDelayMs({
    retryDelayMs: params.retryDelayMs,
    maxRetryDelayMs: params.maxRetryDelayMs,
    failureCount: config.failureCount,
  });

  if (config.enabled !== true) {
    return { shouldRun: false, reason: "disabled", nextDelayMs: intervalMs };
  }
  if (!config.directoryId) {
    return {
      shouldRun: false,
      reason: "not_configured",
      nextDelayMs: intervalMs,
    };
  }
  if (params.bridgeAvailable === false) {
    return {
      shouldRun: false,
      reason: "bridge_missing",
      nextDelayMs: retryDelayMs,
    };
  }

  const nextSyncAfter = readTime(config.nextSyncAfter);
  if (nextSyncAfter && nextSyncAfter > now.getTime()) {
    return {
      shouldRun: false,
      reason: "waiting_for_retry",
      nextDelayMs: nextSyncAfter - now.getTime(),
    };
  }

  const lastAttemptAt = readTime(config.lastSyncAttemptAt);
  if (lastAttemptAt && now.getTime() - lastAttemptAt < intervalMs) {
    return {
      shouldRun: false,
      reason: "not_due",
      nextDelayMs: intervalMs - (now.getTime() - lastAttemptAt),
    };
  }

  return { shouldRun: true, reason: "due" };
}

export function startLocalMediaArchiveScheduler(
  options: LocalArchiveSchedulerOptions = {}
) {
  if (typeof window === "undefined") {
    return { stop: () => {}, runNow: async () => null };
  }

  activeScheduler?.stop();
  const normalizedOptions = normalizeLocalArchiveSchedulerOptions(options);
  let stopped = false;
  let timer: number | null = null;
  let running: Promise<unknown> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delayMs: number) => {
    if (stopped) {
      return;
    }
    clearTimer();
    timer = window.setTimeout(() => {
      void run("timer");
    }, Math.max(0, delayMs));
  };

  const run = async (reason: "startup" | "timer" | "manual" | "visible") => {
    if (stopped) {
      return null;
    }
    if (running) {
      return running;
    }

    running = runScheduledLocalArchiveSync({
      ...normalizedOptions,
      force: reason === "manual",
    })
      .then((result) => {
        if (!stopped) {
          schedule(result.nextDelayMs);
        }
        return result;
      })
      .finally(() => {
        running = null;
      });

    return running;
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void run("visible");
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  schedule(normalizedOptions.startupDelayMs);

  const controller = {
    stop: () => {
      stopped = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (activeScheduler?.stop === controller.stop) {
        activeScheduler = null;
      }
    },
  };

  activeScheduler = controller;
  return {
    stop: controller.stop,
    runNow: () => run("manual"),
  };
}

export async function runScheduledLocalArchiveSync(
  options: LocalArchiveSchedulerOptions & { force?: boolean } = {}
) {
  const normalizedOptions = normalizeLocalArchiveSchedulerOptions(options);
  const now = new Date();
  const config = getLocalMediaArchiveRuntimeConfig();
  const bridgeAvailable = Boolean(getDesktopArchiveBridge()?.archiveItems);
  const decision = getLocalArchiveSchedulerDecision({
    config,
    now,
    intervalMs: normalizedOptions.intervalMs,
    retryDelayMs: normalizedOptions.retryDelayMs,
    maxRetryDelayMs: normalizedOptions.maxRetryDelayMs,
    bridgeAvailable,
  });

  if (!options.force && !decision.shouldRun) {
    if (decision.reason === "bridge_missing") {
      const nextFailureCount =
        normalizeLocalArchiveFailureCount(config.failureCount) + 1;
      const nextDelayMs = computeLocalArchiveRetryDelayMs({
        retryDelayMs: normalizedOptions.retryDelayMs,
        maxRetryDelayMs: normalizedOptions.maxRetryDelayMs,
        failureCount: nextFailureCount - 1,
      });

      saveLocalMediaArchiveRuntimeConfig({
        ...config,
        lastSyncAttemptAt: now.toISOString(),
        nextSyncAfter: new Date(Date.now() + nextDelayMs).toISOString(),
        lastError: "bridge_missing",
        failureCount: nextFailureCount,
      });

      return {
        status: "skipped" as const,
        reason: decision.reason,
        nextDelayMs,
      };
    }

    return {
      status: "skipped" as const,
      reason: decision.reason,
      nextDelayMs: decision.nextDelayMs,
    };
  }

  saveLocalMediaArchiveRuntimeConfig({
    ...config,
    lastSyncAttemptAt: now.toISOString(),
    nextSyncAfter: null,
    lastError: null,
  });

  try {
    const result = await runLocalMediaArchiveSync({
      limit: normalizedOptions.limit,
      batchSize: normalizedOptions.batchSize,
      concurrency: normalizedOptions.concurrency,
    });
    const successful = result.status === "completed" || result.status === "empty";
    const currentConfig = getLocalMediaArchiveRuntimeConfig();
    const nextFailureCount = successful
      ? 0
      : normalizeLocalArchiveFailureCount(currentConfig.failureCount) + 1;
    const nextDelayMs = successful
      ? normalizedOptions.intervalMs
      : computeLocalArchiveRetryDelayMs({
          retryDelayMs: normalizedOptions.retryDelayMs,
          maxRetryDelayMs: normalizedOptions.maxRetryDelayMs,
          failureCount: nextFailureCount - 1,
        });
    saveLocalMediaArchiveRuntimeConfig({
      ...currentConfig,
      nextSyncAfter: new Date(Date.now() + nextDelayMs).toISOString(),
      lastError: successful ? null : result.status,
      failureCount: nextFailureCount,
    });

    return {
      status: result.status,
      processed: result.processed,
      failed: result.failed,
      nextDelayMs,
    };
  } catch (error) {
    const currentConfig = getLocalMediaArchiveRuntimeConfig();
    const nextFailureCount =
      normalizeLocalArchiveFailureCount(currentConfig.failureCount) + 1;
    const nextDelayMs = computeLocalArchiveRetryDelayMs({
      retryDelayMs: normalizedOptions.retryDelayMs,
      maxRetryDelayMs: normalizedOptions.maxRetryDelayMs,
      failureCount: nextFailureCount - 1,
    });
    saveLocalMediaArchiveRuntimeConfig({
      ...currentConfig,
      nextSyncAfter: new Date(Date.now() + nextDelayMs).toISOString(),
      lastError:
        error instanceof Error && error.message
          ? error.message.slice(0, 500)
          : "local_archive_sync_failed",
      failureCount: nextFailureCount,
    });

    return {
      status: "failed" as const,
      processed: 0,
      failed: 0,
      nextDelayMs,
    };
  }
}

function clampDelay(value: unknown, minimum: number, fallback: number) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return Math.max(minimum, Math.floor(normalized));
}

function normalizeLimit(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return undefined;
  }

  return Math.min(500, Math.max(1, Math.floor(normalized)));
}

function readTime(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? null : time;
}
