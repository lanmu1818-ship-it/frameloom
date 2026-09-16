// Modified for standalone community distribution; see NOTICE.
"use client";

import { getPublicApiRuntimeConfig } from "@/src/runtime/public-api-config";

export const PROVIDER_API_KEY_PROMPT_EVENT = "yedir:provider-api-key-required";

export type ProviderApiKeyPromptScopeType = "personal" | "team";

export type ProviderApiKeyPromptPayload = {
  code?: string;
  error?: string;
  providerType?: string | null;
  providerLabel?: string | null;
  scopeType?: ProviderApiKeyPromptScopeType | null;
  apiKeyUrl?: string | null;
};

const PROVIDER_API_KEY_PROMPT_CODES = new Set([
  "provider_api_key_required",
  "provider_api_key_invalid",
  "provider_api_key_balance_blocked",
  "provider_api_key_balance_unavailable",
  "provider_api_key_permission_blocked",
  "provider_api_key_model_unavailable",
  "provider_model_unavailable",
]);

const PROVIDER_API_KEY_PROMPT_PATTERNS = [
  /provider_api_key_required/i,
  /provider_api_key_invalid/i,
  /provider_api_key_balance_blocked/i,
  /provider_api_key_balance_unavailable/i,
  /provider_api_key_permission_blocked/i,
  /provider_api_key_model_unavailable/i,
  /provider_model_unavailable/i,
  /当前\s*API\s*Key.*未开通|未获当前\s*Key\s*授权|模型.*当前\s*Key.*不可用/i,
  /not enabled for this task flow|request path enabled for this api key|\/api\/external\/task|未开通.*任务|任务通道.*未开通|接口权限.*未开通/i,
  /余额不足|额度不足|额度已用完|欠费|insufficient[_\s-]*(quota|balance|credit|fund|tokens?)|quota[_\s-]*(exceeded|is not enough)|payment required/i,
  /尚未配置\s*API\s*Key/i,
  /请先.*配置.*API\s*Key/i,
  /未配置.*API\s*Key/i,
  /未配置可用的.*API\s*Key/i,
  /API\s*Key.*未配置/i,
  /API\s*Key\s*未配置/i,
  /API\s*Key\s*未配置或格式无效/i,
  /素材搜索\s*API\s*Key\s*未配置/i,
  /商品ID详情图接口\s*API\s*Key\s*未配置/i,
  /Provider\s+API\s*Key/i,
  /no\s+api\s*key\s+configured/i,
  /missing\s+api\s*key/i,
  /api\s*key\s+is\s+missing/i,
  /invalid\s+api\s*key/i,
];

function inferPromptCode(explicitCode: string, text: string) {
  if (
    explicitCode === "provider_model_unavailable" ||
    explicitCode === "provider_api_key_model_unavailable"
  ) {
    return "provider_model_unavailable";
  }
  if (explicitCode && PROVIDER_API_KEY_PROMPT_CODES.has(explicitCode)) {
    return explicitCode;
  }
  if (
    /provider_api_key_balance_unavailable|无法确认.*(?:余额|额度)|未返回可确认的.*(?:余额|额度)|余额接口暂时不可用/i.test(
      text
    )
  ) {
    return "provider_api_key_balance_unavailable";
  }
  if (
    /provider_api_key_balance_blocked|余额不足|额度不足|额度已用完|欠费|insufficient[_\s-]*(quota|balance|credit|fund|tokens?)|quota[_\s-]*(exceeded|is not enough)|payment required/i.test(
      text
    )
  ) {
    return "provider_api_key_balance_blocked";
  }
  if (
    /provider_(?:api_key_)?model_unavailable|没有可用.*模型|暂无可用.*模型|未配置可用.*模型|模型配置不可用/i.test(
      text
    )
  ) {
    return "provider_model_unavailable";
  }
  if (
    /provider_api_key_permission_blocked|provider_api_key_model_unavailable|not enabled for this task flow|request path enabled for this api key|\/api\/external\/task|未开通.*任务|任务通道.*未开通|接口权限.*未开通|未获当前\s*Key\s*授权|模型.*当前\s*Key.*不可用/i.test(
      text
    )
  ) {
    return "provider_api_key_permission_blocked";
  }
  if (
    /provider_api_key_invalid|invalid\s+api\s*key|api\s*key.*invalid|unauthori[sz]ed|authentication failed|密钥无效|API\s*Key.*无效|鉴权失败|认证失败|未授权/i.test(
      text
    )
  ) {
    return "provider_api_key_invalid";
  }
  return "provider_api_key_required";
}

function collectPromptCandidates(
  value: unknown,
  results: string[],
  seen = new WeakSet<object>(),
  depth = 0
) {
  if (depth > 4 || value == null) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) results.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPromptCandidates(item, results, seen, depth + 1));
    return;
  }

  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of [
    "code",
    "error",
    "message",
    "detail",
    "cause",
    "providerType",
    "providerLabel",
    "scopeType",
    "apiKeyUrl",
    "data",
    "body",
  ]) {
    if (key in record) {
      collectPromptCandidates(record[key], results, seen, depth + 1);
    }
  }

  for (const [key, candidate] of Object.entries(record)) {
    if (
      [
        "code",
        "error",
        "message",
        "detail",
        "cause",
        "providerType",
        "providerLabel",
        "scopeType",
        "apiKeyUrl",
        "data",
        "body",
      ].includes(key)
    ) {
      continue;
    }
    collectPromptCandidates(candidate, results, seen, depth + 1);
  }
}

function getPromptText(value: unknown) {
  const candidates: string[] = [];
  collectPromptCandidates(value, candidates);
  return candidates.join("\n");
}

export function getProviderApiKeyPromptPayload(
  value: unknown
): ProviderApiKeyPromptPayload | null {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  const data =
    record && typeof record.data === "object" && record.data !== null
      ? (record.data as Record<string, unknown>)
      : null;
  const code = String(record?.code || data?.code || "").trim();
  const text = getPromptText(value);
  const inferredCode = inferPromptCode(code, text);
  const matched =
    (code && PROVIDER_API_KEY_PROMPT_CODES.has(code)) ||
    PROVIDER_API_KEY_PROMPT_PATTERNS.some((pattern) => pattern.test(text));

  if (!matched) return null;

  return {
    code: inferredCode,
    error:
      String(record?.error || data?.error || record?.message || data?.message || "").trim() ||
      (inferredCode === "provider_api_key_balance_unavailable"
        ? "API Key 已验证有效，但服务商暂未返回可确认的可用额度。为避免产生上传费用，本次操作已停止。"
        : inferredCode === "provider_api_key_balance_blocked"
        ? "当前 API Key 没有可用余额，请前往官网获取或充值可用 API Key 后重试。"
        : inferredCode === "provider_model_unavailable"
          ? "当前账号暂无可用模型，请前往官网查看已开通模型后重试。"
          : inferredCode === "provider_api_key_permission_blocked"
          ? "当前 API Key 未开通这个任务通道，请在官网确认 Key 对应的 Base URL 和任务权限后重试。"
        : inferredCode === "provider_api_key_invalid"
          ? "API Key 无效或已失效，请重新保存有效 Key。"
          : "请先配置 API Key 后再生成。"),
    providerType:
      (record?.providerType as string | null | undefined) ||
      (data?.providerType as string | null | undefined) ||
      null,
    providerLabel:
      (record?.providerLabel as string | null | undefined) ||
      (data?.providerLabel as string | null | undefined) ||
      null,
    scopeType:
      (record?.scopeType as ProviderApiKeyPromptScopeType | null | undefined) ||
      (data?.scopeType as ProviderApiKeyPromptScopeType | null | undefined) ||
      "personal",
    apiKeyUrl:
      (record?.apiKeyUrl as string | null | undefined) ||
      (data?.apiKeyUrl as string | null | undefined) ||
      null,
  };
}

function normalizePayload(payload: ProviderApiKeyPromptPayload) {
  return {
    code: String(payload.code || "provider_api_key_required"),
    error: String(payload.error || "请先配置 AI 生成服务 API Key"),
    providerType: payload.providerType ? String(payload.providerType) : null,
    providerLabel: payload.providerLabel ? String(payload.providerLabel) : null,
    scopeType: payload.scopeType === "team" ? "team" : "personal",
    apiKeyUrl: payload.apiKeyUrl ? String(payload.apiKeyUrl) : null,
  } satisfies Required<ProviderApiKeyPromptPayload>;
}

export function dispatchProviderApiKeyPrompt(payload: ProviderApiKeyPromptPayload) {
  if (typeof window === "undefined") return;
  if (isLocalApiRuntime()) return;
  window.dispatchEvent(
    new CustomEvent(PROVIDER_API_KEY_PROMPT_EVENT, {
      detail: normalizePayload(payload),
    })
  );
}

export function subscribeProviderApiKeyPrompt(
  listener: (payload: Required<ProviderApiKeyPromptPayload>) => void
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ProviderApiKeyPromptPayload>).detail;
    listener(normalizePayload(detail || {}));
  };

  window.addEventListener(PROVIDER_API_KEY_PROMPT_EVENT, handler);
  return () => window.removeEventListener(PROVIDER_API_KEY_PROMPT_EVENT, handler);
}

export function dispatchProviderApiKeyPromptFromError(value: unknown) {
  if (isLocalApiRuntime()) return false;
  const payload = getProviderApiKeyPromptPayload(value);
  if (!payload) return false;
  dispatchProviderApiKeyPrompt(payload);
  return true;
}

function isLocalApiRuntime() {
  try {
    const url = new URL(String(getPublicApiRuntimeConfig().apiBaseUrl || ""));
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
