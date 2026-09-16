// Modified for standalone community distribution; see NOTICE.
export type PublicApiRuntimeConfig = {
  apiBaseUrl?: string | null;
  apiClientName?: string | null;
  desktopApiKey?: string | null;
  desktopUpdateChannel?: string | null;
  desktopUpdateManifestUrl?: string | null;
};

const STORAGE_KEYS = {
  apiBaseUrl: "yedir.apiBaseUrl",
  apiClientName: "yedir.apiClientName",
  desktopApiKey: "yedir.desktopApiKey",
  desktopUpdateChannel: "yedir.desktopUpdateChannel",
  desktopUpdateManifestUrl: "yedir.desktopUpdateManifestUrl",
} as const;

const buildTimeConfig: PublicApiRuntimeConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  apiClientName: process.env.NEXT_PUBLIC_API_CLIENT_NAME,
  desktopApiKey: process.env.NEXT_PUBLIC_DESKTOP_API_KEY,
  desktopUpdateChannel: process.env.NEXT_PUBLIC_DESKTOP_UPDATE_CHANNEL,
  desktopUpdateManifestUrl: process.env.NEXT_PUBLIC_DESKTOP_UPDATE_MANIFEST_URL,
};

let memoryConfig: PublicApiRuntimeConfig = {};

declare global {
  interface Window {
    __YEDIR_API_CONFIG__?: PublicApiRuntimeConfig;
    __YEDIR_REQUIRE_API_CONFIG__?: boolean;
  }
}

export function normalizePublicApiBaseUrl(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "";
  }

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");

  if (url.pathname === "/api" || url.pathname.endsWith("/api")) {
    url.pathname = url.pathname.slice(0, -"/api".length) || "/";
  }

  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.origin}${path}`;
}

export function normalizePublicApiRuntimeConfig(
  config: PublicApiRuntimeConfig = {}
): PublicApiRuntimeConfig {
  const apiBaseUrl = normalizePublicApiBaseUrl(config.apiBaseUrl);
  const desktopUpdateManifestUrl =
    normalizePublicUpdateManifestUrl(config.desktopUpdateManifestUrl) ||
    (apiBaseUrl ? `${apiBaseUrl}/api/desktop-release/manifest` : "");

  return {
    apiBaseUrl,
    apiClientName: String(config.apiClientName || "").trim(),
    desktopApiKey: String(config.desktopApiKey || "").trim(),
    desktopUpdateChannel:
      String(config.desktopUpdateChannel || "").trim() || "stable",
    desktopUpdateManifestUrl,
  };
}

export function getPublicApiRuntimeConfig(): PublicApiRuntimeConfig {
  if (isPublicApiRuntimeConfigLocked()) {
    const lockedConfig = getLockedDesktopApiRuntimeConfig();
    syncLockedWindowRuntimeConfig(lockedConfig);
    clearStoredRuntimeConfig();
    return lockedConfig;
  }

  return mergePublicApiRuntimeConfig(
    buildTimeConfig,
    readStoredRuntimeConfig(),
    readWindowRuntimeConfig(),
    memoryConfig
  );
}

export function setPublicApiRuntimeConfig(config: PublicApiRuntimeConfig) {
  if (isPublicApiRuntimeConfigLocked()) {
    const lockedConfig = getLockedDesktopApiRuntimeConfig();
    memoryConfig = lockedConfig;
    syncLockedWindowRuntimeConfig(lockedConfig);
    clearStoredRuntimeConfig();
    return;
  }

  memoryConfig = normalizePublicApiRuntimeConfig(config);

  if (typeof window !== "undefined") {
    writeWindowRuntimeConfig({
      ...normalizePublicApiRuntimeConfig(window.__YEDIR_API_CONFIG__),
      ...memoryConfig,
    });
  }
}

export function savePublicApiRuntimeConfig(config: PublicApiRuntimeConfig) {
  if (isPublicApiRuntimeConfigLocked()) {
    const lockedConfig = getLockedDesktopApiRuntimeConfig();
    memoryConfig = lockedConfig;
    syncLockedWindowRuntimeConfig(lockedConfig);
    clearStoredRuntimeConfig();
    return;
  }

  const normalized = normalizePublicApiRuntimeConfig(config);
  setPublicApiRuntimeConfig(normalized);

  if (typeof window === "undefined") {
    return;
  }

  writeStorageValue(STORAGE_KEYS.apiBaseUrl, normalized.apiBaseUrl);
  writeStorageValue(STORAGE_KEYS.apiClientName, normalized.apiClientName);
  writeStorageValue(STORAGE_KEYS.desktopApiKey, normalized.desktopApiKey);
  writeStorageValue(
    STORAGE_KEYS.desktopUpdateChannel,
    normalized.desktopUpdateChannel
  );
  writeStorageValue(
    STORAGE_KEYS.desktopUpdateManifestUrl,
    normalized.desktopUpdateManifestUrl
  );
}

export function isPublicApiRuntimeConfigRequired() {
  return false;
}

export function isPublicApiRuntimeConfigLocked() {
  return false;
}

export function getLockedDesktopApiRuntimeConfig(): PublicApiRuntimeConfig {
  return normalizePublicApiRuntimeConfig(buildTimeConfig);
}

function readWindowRuntimeConfig(): PublicApiRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__YEDIR_API_CONFIG__ || {};
}

function readStoredRuntimeConfig(): PublicApiRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    apiBaseUrl: readStorageValue(STORAGE_KEYS.apiBaseUrl),
    apiClientName: readStorageValue(STORAGE_KEYS.apiClientName),
    desktopApiKey: readStorageValue(STORAGE_KEYS.desktopApiKey),
    desktopUpdateChannel: readStorageValue(STORAGE_KEYS.desktopUpdateChannel),
    desktopUpdateManifestUrl: readStorageValue(
      STORAGE_KEYS.desktopUpdateManifestUrl
    ),
  };
}

function syncLockedWindowRuntimeConfig(config: PublicApiRuntimeConfig) {
  if (typeof window === "undefined") {
    return;
  }

  writeWindowRuntimeConfig(config);
  writeWindowRequireApiConfig(false);
}

function clearStoredRuntimeConfig() {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of Object.values(STORAGE_KEYS)) {
    writeStorageValue(key, "");
  }
}

function mergePublicApiRuntimeConfig(
  ...configs: PublicApiRuntimeConfig[]
): PublicApiRuntimeConfig {
  const merged: PublicApiRuntimeConfig = {};

  for (const config of configs) {
    const normalized = normalizePublicApiRuntimeConfig(config);
    applyIfPresent(merged, "apiBaseUrl", normalized.apiBaseUrl);
    applyIfPresent(merged, "apiClientName", normalized.apiClientName);
    applyIfPresent(merged, "desktopApiKey", normalized.desktopApiKey);
    applyIfPresent(
      merged,
      "desktopUpdateChannel",
      normalized.desktopUpdateChannel
    );
    applyIfPresent(
      merged,
      "desktopUpdateManifestUrl",
      normalized.desktopUpdateManifestUrl
    );
  }

  return normalizePublicApiRuntimeConfig(merged);
}

function applyIfPresent(
  target: PublicApiRuntimeConfig,
  key: keyof PublicApiRuntimeConfig,
  value: string | null | undefined
) {
  const normalized = String(value || "").trim();
  if (normalized) {
    target[key] = normalized;
  }
}

function readStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorageValue(key: string, value: string | null | undefined) {
  try {
    const normalized = String(value || "").trim();
    if (normalized) {
      window.localStorage.setItem(key, normalized);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in hardened desktop/webview environments.
  }
}

function normalizePublicUpdateManifestUrl(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
    return "";
  }
  if (url.username || url.password) {
    return "";
  }

  url.hash = "";
  return url.href;
}

function writeWindowRuntimeConfig(config: PublicApiRuntimeConfig) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.__YEDIR_API_CONFIG__ = normalizePublicApiRuntimeConfig(config);
  } catch {
    // Electron preload exposes this as a read-only bridge property.
    memoryConfig = normalizePublicApiRuntimeConfig(config);
  }
}

function writeWindowRequireApiConfig(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.__YEDIR_REQUIRE_API_CONFIG__ = value;
  } catch {
    // Electron preload exposes this as a read-only bridge property.
  }
}
