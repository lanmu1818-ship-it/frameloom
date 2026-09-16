// Modified for standalone community distribution; see NOTICE.
import { getFriendlyRateLimitMessage, getUserFacingRequestErrorMessage } from "@/src/lib/request-error";
import { apiFetch } from "@/src/client/api";

type LongTaskResponse = {
  success?: boolean;
  processing?: boolean;
  status?: string;
  taskId?: string;
  pollAfterMs?: number;
  retryAfter?: number;
  error?: string;
  detail?: string;
  [key: string]: any;
};

function isProcessingPayload(payload: LongTaskResponse | null | undefined) {
  if (!payload) return false;
  if (payload.processing === true) return true;
  const status = String(payload.status || "").toLowerCase();
  return status === "queued" || status === "running" || status === "pending";
}

function buildTaskError(payload: LongTaskResponse | null | undefined, fallback: string) {
  const message = getUserFacingRequestErrorMessage(
    payload,
    fallback,
    {
      rateLimitMessage: getFriendlyRateLimitMessage(),
    }
  );
  return new Error(String(message || fallback));
}

function buildTaskInterruptedError(taskId: string) {
  const error = new Error(
    "任务已提交，网络连接暂时中断，请稍后重试查看结果，避免重复提交。"
  ) as Error & { taskId?: string };
  error.taskId = taskId;
  return error;
}

async function safeParseJson(response: Response) {
  try {
    return (await response.json()) as LongTaskResponse;
  } catch {
    return null;
  }
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryLongTaskPoll(status: number | null, payload: LongTaskResponse | null | undefined) {
  if (status != null && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const message = String(payload?.error || payload?.detail || "").trim();
  return /\btoo many requests\b|\brate limit\b|请求过于频繁|限流/i.test(message);
}

function resolveRetryAfterMs(
  response: Response | null,
  payload: LongTaskResponse | null | undefined,
  fallbackMs: number,
  attempt: number
) {
  const retryAfterHeader = response?.headers.get("Retry-After");
  const retryAfterSeconds = Number(retryAfterHeader || payload?.retryAfter || 0);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(15_000, Math.max(800, Math.round(retryAfterSeconds * 1000)));
  }

  const exponentialBackoff = Math.min(15_000, fallbackMs + attempt * 800);
  return Math.max(800, exponentialBackoff);
}

export async function requestLongTaskResult(params: {
  endpoint: string;
  payload: Record<string, any>;
  pollingParams?: Record<string, string | number | null | undefined>;
  timeoutMs?: number;
  headers?: HeadersInit;
  maxPollFailures?: number;
}) {
  const response = await apiFetch(params.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.headers || {}),
    },
    body: JSON.stringify(params.payload),
  });

  const result = await safeParseJson(response);
  if (!response.ok) {
    throw buildTaskError(result, "请求失败");
  }

  if (!isProcessingPayload(result)) {
    return result as LongTaskResponse;
  }

  const taskId = String(result?.taskId || "").trim();
  if (!taskId) {
    throw buildTaskError(result, "任务正在处理中，但缺少 taskId");
  }

  const pollingParams = new URLSearchParams();
  pollingParams.set("taskId", taskId);
  const taskKeyId = String(result?.taskKeyId || "").trim();
  if (taskKeyId) {
    pollingParams.set("taskKeyId", taskKeyId);
  }
  for (const [key, value] of Object.entries(params.pollingParams || {})) {
    if (value === null || value === undefined || value === "") continue;
    pollingParams.set(key, String(value));
  }

  const timeoutMs = Math.max(10_000, params.timeoutMs ?? 8 * 60 * 1000);
  const maxPollFailures = Math.max(1, params.maxPollFailures ?? 4);
  const startedAt = Date.now();
  let pollAfterMs = Math.max(800, Number(result?.pollAfterMs || 1500));
  let consecutivePollFailures = 0;

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollAfterMs);

    let statusResponse: Response | null = null;
    let statusPayload: LongTaskResponse | null = null;
    try {
      statusResponse = await apiFetch(`${params.endpoint}?${pollingParams.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: params.headers,
      });
      statusPayload = await safeParseJson(statusResponse);
    } catch (error) {
      consecutivePollFailures += 1;
      if (consecutivePollFailures >= maxPollFailures) {
        throw buildTaskInterruptedError(taskId);
      }
      pollAfterMs = resolveRetryAfterMs(null, null, pollAfterMs, consecutivePollFailures);
      continue;
    }

    if (!statusResponse.ok) {
      if (
        shouldRetryLongTaskPoll(statusResponse.status, statusPayload) &&
        consecutivePollFailures < maxPollFailures
      ) {
        consecutivePollFailures += 1;
        pollAfterMs = resolveRetryAfterMs(
          statusResponse,
          statusPayload,
          pollAfterMs,
          consecutivePollFailures
        );
        continue;
      }

      throw buildTaskError(statusPayload, "查询任务状态失败");
    }

    consecutivePollFailures = 0;

    if (!isProcessingPayload(statusPayload)) {
      return statusPayload as LongTaskResponse;
    }

    pollAfterMs = Math.max(800, Number(statusPayload?.pollAfterMs || pollAfterMs));
  }

  throw new Error("任务处理超时，请稍后再试");
}
