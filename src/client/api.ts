// Modified for standalone community distribution; see NOTICE.
import {
  getPublicApiRuntimeConfig,
  savePublicApiRuntimeConfig,
  setPublicApiRuntimeConfig,
  type PublicApiRuntimeConfig,
} from "@/src/runtime/public-api-config";
import {
  dispatchProviderApiKeyPrompt,
  getProviderApiKeyPromptPayload,
} from "@/src/client/provider-api-key-prompt";

type ApiTokenProvider = () => string | null | undefined | Promise<string | null | undefined>;

let apiTokenProvider: ApiTokenProvider | null = null;

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value);
}

const COMPILED_BASE_PATH = String(process.env.NEXT_PUBLIC_BASE_PATH || "")
  .trim()
  .replace(/\/+$/, "");

function withCompiledBasePath(value: string) {
  if (
    !COMPILED_BASE_PATH ||
    value === COMPILED_BASE_PATH ||
    value.startsWith(`${COMPILED_BASE_PATH}/`)
  ) {
    return value;
  }
  return `${COMPILED_BASE_PATH}${value}`;
}

export function isRemoteApiConfigured() {
  return Boolean(getPublicApiRuntimeConfig().apiBaseUrl);
}

export function setApiRuntimeConfig(config: PublicApiRuntimeConfig) {
  setPublicApiRuntimeConfig(config);
}

export function saveApiRuntimeConfig(config: PublicApiRuntimeConfig) {
  savePublicApiRuntimeConfig(config);
}

export function setApiTokenProvider(provider: ApiTokenProvider | null) {
  apiTokenProvider = provider;
}

export function createApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") {
    return input;
  }

  const { apiBaseUrl } = getPublicApiRuntimeConfig();
  if (isAbsoluteUrl(input) || !input.startsWith("/")) {
    return input;
  }
  if (!apiBaseUrl) return withCompiledBasePath(input);

  return `${apiBaseUrl}${input}`;
}

export function createApiHref(path: string) {
  const url = createApiUrl(path);
  return typeof url === "string" ? url : url.toString();
}

async function createApiHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);

  applyStaticApiHeaders(headers);

  if (apiTokenProvider && !headers.has("Authorization")) {
    const token = String((await apiTokenProvider()) || "").trim();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

function applyStaticApiHeaders(headers: Headers) {
  const { apiClientName, desktopApiKey } = getPublicApiRuntimeConfig();

  if (apiClientName && !headers.has("X-Yedir-Client")) {
    headers.set("X-Yedir-Client", apiClientName);
  }

  if (desktopApiKey && !headers.has("X-Yedir-Client-Key")) {
    headers.set("X-Yedir-Client-Key", desktopApiKey);
  }
}

export function createApiKeepaliveHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  applyStaticApiHeaders(headers);

  return headers;
}

export function apiKeepaliveFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  return fetch(createApiUrl(input), {
    ...init,
    credentials: init.credentials ?? "include",
    headers: createApiKeepaliveHeaders(init.headers),
    keepalive: true,
  });
}

export function applyApiXhrOptions(
  xhr: XMLHttpRequest,
  initHeaders?: HeadersInit
) {
  xhr.withCredentials = true;
  createApiKeepaliveHeaders(initHeaders).forEach((value, key) => {
    xhr.setRequestHeader(key, value);
  });
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const response = await fetch(createApiUrl(input), {
    ...init,
    credentials: init.credentials ?? "include",
    headers: await createApiHeaders(init.headers),
  });

  if (!response.ok) {
    void maybeDispatchProviderApiKeyPrompt(response);
  }

  return response;
}

async function maybeDispatchProviderApiKeyPrompt(response: Response) {
  try {
    let payload: unknown = null;
    let responseText = "";
    try {
      payload = await response.clone().json();
    } catch {
      responseText = (await response.clone().text().catch(() => "")).trim();
    }

    const promptPayload = getProviderApiKeyPromptPayload(payload ?? responseText);
    if (!promptPayload) {
      return;
    }

    dispatchProviderApiKeyPrompt({
      ...promptPayload,
      code: promptPayload.code || "provider_api_key_required",
    });
  } catch {
    // Non-JSON failures keep their normal caller-level error handling.
  }
}

export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(input, init);
  return (await response.json()) as T;
}

export async function downloadApiFile(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fallbackFileName = "download"
) {
  if (typeof document === "undefined") {
    throw new Error("File download is only available in the browser.");
  }

  const response = await apiFetch(input, init);
  if (!response.ok) {
    let message = "下载失败";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      // Keep the generic download error when the response is not JSON.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download =
    getFileNameFromContentDisposition(response.headers.get("Content-Disposition")) ||
    fallbackFileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) return "";

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1].trim();
    }
  }

  const asciiMatch = value.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1]?.trim() || "";
}
