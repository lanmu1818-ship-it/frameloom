// Modified for standalone community distribution; see NOTICE.
export type LocalMediaArchiveRuntimeConfig = {
  enabled?: boolean;
  deviceId?: string | null;
  directoryId?: string | null;
  directoryLabel?: string | null;
  lastManifestSyncAt?: string | null;
  lastArchiveCompletedAt?: string | null;
  lastSyncAttemptAt?: string | null;
  nextSyncAfter?: string | null;
  lastError?: string | null;
  failureCount?: number;
};

const STORAGE_KEYS = {
  enabled: "yedir.localArchive.enabled",
  deviceId: "yedir.localArchive.deviceId",
  directoryId: "yedir.localArchive.directoryId",
  directoryLabel: "yedir.localArchive.directoryLabel",
  lastManifestSyncAt: "yedir.localArchive.lastManifestSyncAt",
  lastArchiveCompletedAt: "yedir.localArchive.lastArchiveCompletedAt",
  lastSyncAttemptAt: "yedir.localArchive.lastSyncAttemptAt",
  nextSyncAfter: "yedir.localArchive.nextSyncAfter",
  lastError: "yedir.localArchive.lastError",
  failureCount: "yedir.localArchive.failureCount",
} as const;

let memoryConfig: LocalMediaArchiveRuntimeConfig = {};

declare global {
  interface Window {
    __YEDIR_LOCAL_MEDIA_ARCHIVE_CONFIG__?: LocalMediaArchiveRuntimeConfig;
  }
}

export function normalizeLocalMediaArchiveRuntimeConfig(
  config: LocalMediaArchiveRuntimeConfig = {}
): LocalMediaArchiveRuntimeConfig {
  const normalized: LocalMediaArchiveRuntimeConfig = {
    enabled: config.enabled === true,
    deviceId: normalizeString(config.deviceId),
    directoryId: normalizeString(config.directoryId),
    directoryLabel: normalizeString(config.directoryLabel),
    lastManifestSyncAt: normalizeIsoString(config.lastManifestSyncAt),
    lastArchiveCompletedAt: normalizeIsoString(config.lastArchiveCompletedAt),
    lastSyncAttemptAt: normalizeIsoString(config.lastSyncAttemptAt),
    nextSyncAfter: normalizeIsoString(config.nextSyncAfter),
    lastError: normalizeString(config.lastError)?.slice(0, 500) || null,
  };

  if (Object.prototype.hasOwnProperty.call(config, "failureCount")) {
    normalized.failureCount = normalizeLocalArchiveFailureCount(
      config.failureCount
    );
  }

  return normalized;
}

export function normalizeLocalArchiveFailureCount(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }

  return Math.min(64, Math.floor(normalized));
}

export function getLocalMediaArchiveRuntimeConfig() {
  return mergeLocalMediaArchiveRuntimeConfig(
    readStoredRuntimeConfig(),
    readWindowRuntimeConfig(),
    memoryConfig
  );
}

export function setLocalMediaArchiveRuntimeConfig(
  config: LocalMediaArchiveRuntimeConfig
) {
  memoryConfig = normalizeLocalMediaArchiveRuntimeConfig(config);

  if (typeof window !== "undefined") {
    window.__YEDIR_LOCAL_MEDIA_ARCHIVE_CONFIG__ = {
      ...normalizeLocalMediaArchiveRuntimeConfig(
        window.__YEDIR_LOCAL_MEDIA_ARCHIVE_CONFIG__
      ),
      ...memoryConfig,
    };
  }
}

export function saveLocalMediaArchiveRuntimeConfig(
  config: LocalMediaArchiveRuntimeConfig
) {
  const normalized = normalizeLocalMediaArchiveRuntimeConfig(config);
  setLocalMediaArchiveRuntimeConfig(normalized);

  if (typeof window === "undefined") {
    return;
  }

  writeStorageValue(STORAGE_KEYS.enabled, normalized.enabled ? "1" : "");
  writeStorageValue(STORAGE_KEYS.deviceId, normalized.deviceId);
  writeStorageValue(STORAGE_KEYS.directoryId, normalized.directoryId);
  writeStorageValue(STORAGE_KEYS.directoryLabel, normalized.directoryLabel);
  writeStorageValue(
    STORAGE_KEYS.lastManifestSyncAt,
    normalized.lastManifestSyncAt
  );
  writeStorageValue(
    STORAGE_KEYS.lastArchiveCompletedAt,
    normalized.lastArchiveCompletedAt
  );
  writeStorageValue(STORAGE_KEYS.lastSyncAttemptAt, normalized.lastSyncAttemptAt);
  writeStorageValue(STORAGE_KEYS.nextSyncAfter, normalized.nextSyncAfter);
  writeStorageValue(STORAGE_KEYS.lastError, normalized.lastError);
  writeStorageValue(
    STORAGE_KEYS.failureCount,
    normalized.failureCount ? String(normalized.failureCount) : null
  );
}

export function ensureLocalArchiveDeviceId() {
  const existing = getLocalMediaArchiveRuntimeConfig().deviceId;
  if (existing) {
    return existing;
  }

  const deviceId = createPublicDeviceId();
  saveLocalMediaArchiveRuntimeConfig({
    ...getLocalMediaArchiveRuntimeConfig(),
    deviceId,
  });
  return deviceId;
}

function readWindowRuntimeConfig(): LocalMediaArchiveRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__YEDIR_LOCAL_MEDIA_ARCHIVE_CONFIG__ || {};
}

function readStoredRuntimeConfig(): LocalMediaArchiveRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    enabled: readStorageValue(STORAGE_KEYS.enabled) === "1",
    deviceId: readStorageValue(STORAGE_KEYS.deviceId),
    directoryId: readStorageValue(STORAGE_KEYS.directoryId),
    directoryLabel: readStorageValue(STORAGE_KEYS.directoryLabel),
    lastManifestSyncAt: readStorageValue(STORAGE_KEYS.lastManifestSyncAt),
    lastArchiveCompletedAt: readStorageValue(
      STORAGE_KEYS.lastArchiveCompletedAt
    ),
    lastSyncAttemptAt: readStorageValue(STORAGE_KEYS.lastSyncAttemptAt),
    nextSyncAfter: readStorageValue(STORAGE_KEYS.nextSyncAfter),
    lastError: readStorageValue(STORAGE_KEYS.lastError),
    failureCount: readNumericStorageValue(STORAGE_KEYS.failureCount),
  };
}

function mergeLocalMediaArchiveRuntimeConfig(
  ...configs: LocalMediaArchiveRuntimeConfig[]
) {
  const merged: LocalMediaArchiveRuntimeConfig = {};

  for (const config of configs) {
    const normalized = normalizeLocalMediaArchiveRuntimeConfig(config);
    if (typeof normalized.enabled === "boolean") {
      merged.enabled = normalized.enabled;
    }
    applyIfPresent(merged, "deviceId", normalized.deviceId);
    applyIfPresent(merged, "directoryId", normalized.directoryId);
    applyIfPresent(merged, "directoryLabel", normalized.directoryLabel);
    applyIfPresent(merged, "lastManifestSyncAt", normalized.lastManifestSyncAt);
    applyIfPresent(
      merged,
      "lastArchiveCompletedAt",
      normalized.lastArchiveCompletedAt
    );
    applyIfPresent(merged, "lastSyncAttemptAt", normalized.lastSyncAttemptAt);
    applyIfPresent(merged, "nextSyncAfter", normalized.nextSyncAfter);
    applyIfPresent(merged, "lastError", normalized.lastError);
    if (Object.prototype.hasOwnProperty.call(config, "failureCount")) {
      merged.failureCount = normalized.failureCount || 0;
    }
  }

  return normalizeLocalMediaArchiveRuntimeConfig(merged);
}

type LocalMediaArchiveStringConfigKey = Exclude<
  keyof LocalMediaArchiveRuntimeConfig,
  "enabled" | "failureCount"
>;

function applyIfPresent(
  target: LocalMediaArchiveRuntimeConfig,
  key: LocalMediaArchiveStringConfigKey,
  value: string | null | undefined
) {
  const normalized = normalizeString(value);
  if (normalized) {
    target[key] = normalized;
  }
}

function normalizeString(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function normalizeIsoString(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function readStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readNumericStorageValue(key: string) {
  const value = readStorageValue(key);
  if (!value) {
    return undefined;
  }

  return normalizeLocalArchiveFailureCount(value);
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

function createPublicDeviceId() {
  const randomUUID = globalThis.crypto?.randomUUID?.();
  if (randomUUID) {
    return `desktop-${randomUUID}`;
  }

  return `desktop-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}
