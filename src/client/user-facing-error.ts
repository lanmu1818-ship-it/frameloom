// Modified for standalone community distribution; see NOTICE.
export type UserFacingErrorKind =
  | "authentication"
  | "authorization"
  | "balance"
  | "invalid_media"
  | "invalid_request"
  | "model_unavailable"
  | "network"
  | "payload_too_large"
  | "rate_limit"
  | "server_unavailable"
  | "storage"
  | "timeout"
  | "unknown";

export type UserFacingError = {
  kind: UserFacingErrorKind;
  title: string;
  message: string;
  retryable: boolean;
};

function collectErrorText(
  value: unknown,
  parts: string[],
  seen = new WeakSet<object>(),
  depth = 0
) {
  if (value == null || depth > 4) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (text) parts.push(text);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value));
    return;
  }
  if (typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  const record = value as Record<string, unknown>;
  for (const key of [
    "code",
    "error",
    "message",
    "detail",
    "cause",
    "status",
    "statusText",
    "data",
    "body",
    "response",
  ]) {
    if (key in record) {
      collectErrorText(record[key], parts, seen, depth + 1);
    }
  }
}

function errorHaystack(value: unknown) {
  const parts: string[] = [];
  collectErrorText(value, parts);
  if (value instanceof Error && value.message) {
    parts.unshift(value.message);
  }
  return parts.join("\n").slice(0, 12_000);
}

function result(
  kind: UserFacingErrorKind,
  title: string,
  message: string,
  retryable: boolean
): UserFacingError {
  return { kind, title, message, retryable };
}

export function getUserFacingError(
  value: unknown,
  fallback = "请求失败，请稍后重试"
): UserFacingError {
  const raw = errorHaystack(value);

  if (
    /provider_(?:api_key_)?model_unavailable|no such (?:language)?model|unsupported model version|没有可用.*模型|暂无可用.*模型|模型配置不可用/i.test(
      raw
    )
  ) {
    return result(
      "model_unavailable",
      "暂无可用模型",
      "当前账号暂无可用模型，请前往官网查看已开通模型后重试。",
      false
    );
  }

  if (
    /provider_api_key_balance_blocked|insufficient[_\s-]*(?:quota|balance|credit|fund|tokens?)|quota (?:is )?not enough|payment required|余额不足|额度不足|欠费/i.test(
      raw
    )
  ) {
    return result(
      "balance",
      "余额不足",
      "当前 API Key 没有可用余额，请前往官网充值或获取可用 Key 后重试。",
      false
    );
  }

  if (
    /provider_api_key_permission_blocked|not enabled for this task flow|request path enabled for this api key|接口权限.*未开通|任务通道.*未开通/i.test(
      raw
    )
  ) {
    return result(
      "authorization",
      "服务权限未开通",
      "当前 API Key 未开通所选模型或任务通道，请前往官网检查权限。",
      false
    );
  }

  if (
    /provider_api_key_invalid|invalid api key|api key is invalid|authentication failed|unauthorized|鉴权失败|认证失败|密钥无效/i.test(
      raw
    )
  ) {
    return result(
      "authorization",
      "API Key 不可用",
      "当前 API Key 无效或已失效，请重新保存有效 Key 后重试。",
      false
    );
  }

  if (
    /unauthenticated|session.*(?:expired|invalid)|login required|missing bearer token|登录状态.*失效|请先登录|\b401\b/i.test(
      raw
    )
  ) {
    return result(
      "authentication",
      "登录状态失效",
      "登录状态已失效，请重新登录后继续。",
      false
    );
  }

  if (
    /the media request is invalid|media request is invalid|unsupported raster image|reference image data url is invalid|invalid image|图片.*格式.*不支持/i.test(
      raw
    )
  ) {
    return result(
      "invalid_media",
      "参考图片不可用",
      "参考图片未通过服务商校验，请重新上传 PNG、JPG 或 WebP 图片后重试。",
      false
    );
  }

  if (/payload_too_large|request entity too large|body exceeded|\b413\b/i.test(raw)) {
    return result(
      "payload_too_large",
      "请求内容过大",
      "本次请求内容过大，请减少图片数量、图片大小或文字长度后重试。",
      false
    );
  }

  if (/rate[_\s-]?limit|too many requests|请求过于频繁|\b429\b/i.test(raw)) {
    return result(
      "rate_limit",
      "请求过于频繁",
      "请求过于频繁，请稍候再试。",
      true
    );
  }

  if (
    /task timeout|timed out|timeout|body timeout|aborterror|operation was aborted|due to timeout|任务超时/i.test(
      raw
    )
  ) {
    return result(
      "timeout",
      "生成超时",
      "模型仍可能在服务商侧处理中，请稍后重试或切换其他可用模型。",
      true
    );
  }

  if (
    /storage_not_configured|direct upload|object storage|cors|etag|存储桶|图片直传|上传失败/i.test(
      raw
    )
  ) {
    return result(
      "storage",
      "文件上传失败",
      "文件暂时无法上传，请检查网络后重试；如果持续失败，请联系管理员检查对象存储配置。",
      true
    );
  }

  if (
    /failed to fetch|fetch failed|networkerror|network error|econnreset|econnrefused|enotfound|socket hang up|网络.*失败/i.test(
      raw
    )
  ) {
    return result(
      "network",
      "网络连接失败",
      "网络连接失败，请检查网络后重试。",
      true
    );
  }

  if (
    /service temporarily unavailable|server_error|internal server error|bad gateway|service unavailable|gateway timeout|服务器内部错误|服务临时繁忙|\b50[0234]\b/i.test(
      raw
    )
  ) {
    return result(
      "server_unavailable",
      "服务暂时不可用",
      "服务临时繁忙，请稍后重试；如果连续出现，请联系管理员。",
      true
    );
  }

  if (/bad_request|invalid request|invalid_data|参数.*无效|请求.*无效|\b400\b/i.test(raw)) {
    return result(
      "invalid_request",
      "请求参数不正确",
      "当前请求参数未通过校验，请调整输入或重新选择素材后重试。",
      false
    );
  }

  const safeChineseMessage = raw
    .split("\n")
    .map((item) => item.trim())
    .find(
      (item) =>
        item.length > 0 &&
        item.length <= 160 &&
        /[\u4e00-\u9fff]/.test(item) &&
        !/[{}\[\]"]/.test(item)
    );

  return result(
    "unknown",
    "操作失败",
    safeChineseMessage || fallback,
    true
  );
}

export function getUserFacingErrorMessage(
  value: unknown,
  fallback?: string
) {
  return getUserFacingError(value, fallback).message;
}
