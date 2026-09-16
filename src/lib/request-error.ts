// Modified for standalone community distribution; see NOTICE.
const RATE_LIMIT_PATTERNS = [
  /\btoo many requests\b/i,
  /\brate limit(?:ed|ing)?\b/i,
  /\bquota exceeded\b/i,
  /请求过于频繁/,
  /请求太频繁/,
  /访问过于频繁/,
  /频率过高/,
  /达到速率限制/,
  /限流/,
];
const NETWORK_TRANSPORT_PATTERNS = [
  /\bfailed to fetch\b/i,
  /\bnetworkerror\b/i,
  /\bload failed\b/i,
  /network request failed/i,
  /having trouble sending your message/i,
  /check your internet connection/i,
];
const JSON_EMBEDDED_MESSAGE_PATTERN = /^[["{]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTextCandidate(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function collectTextCandidates(
  value: unknown,
  results: string[],
  seen = new WeakSet<object>(),
  depth = 0
) {
  if (depth > 4 || value == null) {
    return;
  }

  if (typeof value === "string") {
    const normalized = normalizeTextCandidate(value);
    if (normalized) {
      results.push(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextCandidates(item, results, seen, depth + 1);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  const preferredKeys = [
    "message",
    "error",
    "detail",
    "cause",
    "statusText",
    "responseText",
    "body",
    "data",
  ];

  for (const key of preferredKeys) {
    if (key in value) {
      collectTextCandidates(value[key], results, seen, depth + 1);
    }
  }

  for (const [key, candidate] of Object.entries(value)) {
    if (preferredKeys.includes(key)) {
      continue;
    }
    collectTextCandidates(candidate, results, seen, depth + 1);
  }
}

function parseJsonEmbeddedMessage(value: string): string | null {
  const normalized = normalizeTextCandidate(value);
  if (!normalized || !JSON_EMBEDDED_MESSAGE_PATTERN.test(normalized)) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);
    const messages: string[] = [];
    collectTextCandidates(parsed, messages);
    return messages.find(Boolean) || null;
  } catch {
    return null;
  }
}

export function getRequestErrorStatus(error: unknown): number | null {
  const candidates: unknown[] = [];

  if (isRecord(error)) {
    candidates.push(
      error.status,
      error.statusCode,
      isRecord(error.response) ? error.response.status : null,
      isRecord(error.cause) ? error.cause.status : null,
      isRecord(error.data) ? error.data.status : null,
      isRecord(error.data) ? error.data.statusCode : null
    );
  }

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric >= 100) {
      return Math.round(numeric);
    }
  }

  return null;
}

export function getRequestErrorMessage(error: unknown): string | null {
  const candidates: string[] = [];

  if (error instanceof Error) {
    collectTextCandidates(
      {
        message: error.message,
        cause: error.cause,
        ...(isRecord(error) ? error : {}),
      },
      candidates
    );
  } else {
    collectTextCandidates(error, candidates);
  }

  for (const candidate of candidates) {
    const embeddedMessage = parseJsonEmbeddedMessage(candidate);
    const normalized = normalizeTextCandidate(embeddedMessage || candidate);
    if (normalized && normalized !== "[object Object]") {
      return normalized;
    }
  }

  return null;
}

export function isRateLimitError(error: unknown): boolean {
  if (getRequestErrorStatus(error) === 429) {
    return true;
  }

  const message = getRequestErrorMessage(error);
  if (!message) {
    return false;
  }

  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getFriendlyRateLimitMessage(
  customMessage = "当前请求过于频繁，请稍后再试"
) {
  return (
    normalizeTextCandidate(customMessage) || "当前请求过于频繁，请稍后再试"
  );
}

export function getUserFacingRequestErrorMessage(
  error: unknown,
  fallbackMessage = "请求失败，请稍后重试",
  options?: {
    rateLimitMessage?: string;
  }
) {
  if (isRateLimitError(error)) {
    return getFriendlyRateLimitMessage(options?.rateLimitMessage);
  }

  const message = getRequestErrorMessage(error);
  if (!message) {
    return fallbackMessage;
  }

  if (RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message))) {
    return getFriendlyRateLimitMessage(options?.rateLimitMessage);
  }

  if (NETWORK_TRANSPORT_PATTERNS.some((pattern) => pattern.test(message))) {
    return "请求发送失败，请检查网络或稍后重试。";
  }

  return message;
}
