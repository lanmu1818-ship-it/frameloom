// Modified for standalone community distribution; see NOTICE.
import { apiFetch } from "@/src/client/api";
import {
  ensureLocalArchiveDeviceId,
  getLocalMediaArchiveRuntimeConfig,
  saveLocalMediaArchiveRuntimeConfig,
  type LocalMediaArchiveRuntimeConfig,
} from "@/src/runtime/local-media-archive-config";
import {
  getLocalArchiveMapping,
  normalizeLocalArchiveMappings,
  saveLocalArchiveMappings,
  type LocalArchiveMapping,
} from "@/src/runtime/local-media-archive-store";

export type LocalArchiveManifestItem = {
  sourceKind: "mediaAsset" | "generatedImage";
  sourceId: string;
  downloadUrl: string;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  prompt?: string | null;
  modelId?: string | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  createdAt?: string | null;
  archiveRecommendedAt?: string | null;
  expiresAt?: string | null;
};

export type LocalArchiveManifestResponse = {
  success: true;
  manifestVersion: number;
  archivePolicy: {
    recommendedAfterDays: number;
    temporaryBucketExpiresAfterDays: number;
  };
  deviceDigest: string;
  cutoffDate: string;
  items: LocalArchiveManifestItem[];
};

export type DesktopArchiveDirectory = {
  directoryId: string;
  displayName?: string | null;
};

export type LocalArchiveResultItem = {
  sourceKind: "mediaAsset" | "generatedImage";
  sourceId: string;
  status: "archived" | "failed";
  failureReason?: string | null;
};

export type DesktopArchiveBridge = {
  chooseDirectory?: () => Promise<DesktopArchiveDirectory | null>;
  archiveItems?: (input: {
    directoryId: string;
    items: LocalArchiveManifestItem[];
  }) => Promise<unknown>;
};

export type LocalArchiveSyncResult =
  | {
      status: "disabled" | "not_configured" | "bridge_missing" | "empty";
      processed: 0;
      failed: 0;
    }
  | {
      status: "completed";
      processed: number;
      failed: number;
    };

const DEFAULT_ARCHIVE_BATCH_SIZE = 12;
const DEFAULT_ARCHIVE_CONCURRENCY = 2;
const MAX_ARCHIVE_BATCH_SIZE = 50;
const MAX_ARCHIVE_CONCURRENCY = 4;

declare global {
  interface Window {
    __YEDIR_LOCAL_MEDIA_ARCHIVE__?: DesktopArchiveBridge;
  }
}

export function getDesktopArchiveBridge(): DesktopArchiveBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__YEDIR_LOCAL_MEDIA_ARCHIVE__ || null;
}

export async function resolveLocalArchiveDisplayUrl(params: {
  sourceKind: "mediaAsset" | "generatedImage";
  sourceId?: string | null;
  fallbackUrl?: string | null;
}) {
  const fallbackUrl = String(params.fallbackUrl || "").trim();
  const sourceId = String(params.sourceId || "").trim();
  if (!sourceId || !getDesktopArchiveBridge()) {
    return fallbackUrl;
  }

  const mapping = await getLocalArchiveMapping(params.sourceKind, sourceId).catch(
    () => null
  );
  const localUrl = String(mapping?.localPath || "").trim();
  return localUrl || fallbackUrl;
}

export type LocalArchiveDisplayCandidate = {
  sourceKind: "mediaAsset" | "generatedImage";
  sourceId: string;
};

function normalizeArchiveSourceId(value: unknown) {
  const sourceId = String(value || "").trim();
  if (!sourceId || sourceId.length > 128) {
    return "";
  }
  return sourceId;
}

function normalizeSourceTableName(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function pushLocalArchiveDisplayCandidate(
  candidates: LocalArchiveDisplayCandidate[],
  seen: Set<string>,
  sourceKind: LocalArchiveDisplayCandidate["sourceKind"],
  sourceId: unknown
) {
  const normalizedSourceId = normalizeArchiveSourceId(sourceId);
  if (!normalizedSourceId) {
    return;
  }

  const key = `${sourceKind}:${normalizedSourceId}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  candidates.push({
    sourceKind,
    sourceId: normalizedSourceId,
  });
}

export function collectLocalArchiveDisplayCandidates(
  input: unknown
): LocalArchiveDisplayCandidate[] {
  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as Record<string, unknown>;
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  const candidates: LocalArchiveDisplayCandidate[] = [];
  const seen = new Set<string>();

  pushLocalArchiveDisplayCandidate(
    candidates,
    seen,
    "mediaAsset",
    record.assetId || record.mediaAssetId || record.media_asset_id || record.asset_id
  );
  pushLocalArchiveDisplayCandidate(
    candidates,
    seen,
    "mediaAsset",
    metadata.assetId ||
      metadata.mediaAssetId ||
      metadata.media_asset_id ||
      metadata.asset_id
  );

  pushLocalArchiveDisplayCandidate(
    candidates,
    seen,
    "generatedImage",
    record.generatedImageId || record.generated_image_id
  );
  pushLocalArchiveDisplayCandidate(
    candidates,
    seen,
    "generatedImage",
    metadata.generatedImageId || metadata.generated_image_id
  );

  const sourceTable = normalizeSourceTableName(
    record.sourceTable || metadata.sourceTable
  );
  if (sourceTable === "generatedimage") {
    pushLocalArchiveDisplayCandidate(
      candidates,
      seen,
      "generatedImage",
      record.sourceRowId ||
        metadata.sourceRowId ||
        record.source_row_id ||
        metadata.source_row_id
    );
  }

  return candidates;
}

export async function resolveLocalArchiveDisplayUrlForImageData(params: {
  data?: unknown;
  fallbackUrl?: string | null;
}) {
  const fallbackUrl = String(params.fallbackUrl || "").trim();
  const candidates = collectLocalArchiveDisplayCandidates(params.data);
  for (const candidate of candidates) {
    const localUrl = await resolveLocalArchiveDisplayUrl({
      sourceKind: candidate.sourceKind,
      sourceId: candidate.sourceId,
      fallbackUrl: "",
    });
    if (localUrl) {
      return localUrl;
    }
  }
  return fallbackUrl;
}

export async function chooseLocalArchiveDirectory() {
  const bridge = getDesktopArchiveBridge();
  if (!bridge?.chooseDirectory) {
    return null;
  }

  const directory = await bridge.chooseDirectory();
  const normalized = normalizeDesktopArchiveDirectory(directory);
  if (!normalized) {
    return null;
  }

  saveLocalMediaArchiveRuntimeConfig({
    ...getLocalMediaArchiveRuntimeConfig(),
    enabled: true,
    directoryId: normalized.directoryId,
    directoryLabel: normalized.displayName || normalized.directoryId,
    deviceId: ensureLocalArchiveDeviceId(),
    lastError: null,
  });

  return normalized;
}

export async function fetchLocalArchiveManifest(options: {
  limit?: number;
  deviceId?: string;
} = {}) {
  const deviceId = options.deviceId || ensureLocalArchiveDeviceId();
  const searchParams = new URLSearchParams({
    deviceId,
  });
  if (options.limit) {
    searchParams.set("limit", String(options.limit));
  }

  const response = await apiFetch(
    `/api/local-media-archive/manifest?${searchParams.toString()}`
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.error || "获取本地归档清单失败");
  }

  return payload as LocalArchiveManifestResponse;
}

export async function reportLocalArchiveResults(params: {
  deviceId?: string;
  items: LocalArchiveResultItem[];
}) {
  const deviceId = params.deviceId || ensureLocalArchiveDeviceId();
  const items = normalizeLocalArchiveResultItems(params.items);
  if (items.length === 0) {
    return { success: true, accepted: 0, archived: 0, failed: 0 };
  }

  const response = await apiFetch("/api/local-media-archive/manifest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      items,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.error || "回写本地归档状态失败");
  }

  return payload as {
    success: true;
    accepted: number;
    archived: number;
    failed: number;
    deviceDigest: string;
  };
}

export async function runLocalMediaArchiveSync(options: {
  limit?: number;
  batchSize?: number;
  concurrency?: number;
  config?: LocalMediaArchiveRuntimeConfig;
} = {}): Promise<LocalArchiveSyncResult> {
  const config = {
    ...getLocalMediaArchiveRuntimeConfig(),
    ...options.config,
  };

  if (config.enabled !== true) {
    return { status: "disabled", processed: 0, failed: 0 };
  }
  if (!config.directoryId) {
    return { status: "not_configured", processed: 0, failed: 0 };
  }

  const bridge = getDesktopArchiveBridge();
  if (!bridge?.archiveItems) {
    return { status: "bridge_missing", processed: 0, failed: 0 };
  }

  const deviceId = config.deviceId || ensureLocalArchiveDeviceId();
  const manifest = await fetchLocalArchiveManifest({
    deviceId,
    limit: options.limit,
  });
  saveLocalMediaArchiveRuntimeConfig({
    ...getLocalMediaArchiveRuntimeConfig(),
    deviceId,
    lastManifestSyncAt: new Date().toISOString(),
    lastError: null,
  });

  if (manifest.items.length === 0) {
    return { status: "empty", processed: 0, failed: 0 };
  }

  const archiveResult = await archiveLocalManifestItemsInBatches({
    bridge,
    directoryId: config.directoryId,
    items: manifest.items,
    batchSize: options.batchSize,
    concurrency: options.concurrency,
  });
  const mappings = normalizeLocalArchiveMappings(archiveResult);
  let savedMappingCount = 0;
  if (mappings.length > 0) {
    savedMappingCount = await saveLocalArchiveMappings(mappings).catch(() => 0);
  }

  const items = mergeArchiveResultItemsWithMappings({
    items: normalizeLocalArchiveResultItems(archiveResult),
    mappings,
    mappingStatus: savedMappingCount === mappings.length ? "archived" : "failed",
  });
  await reportLocalArchiveResults({ deviceId, items });

  const failed = items.filter((item) => item.status === "failed").length;
  saveLocalMediaArchiveRuntimeConfig({
    ...getLocalMediaArchiveRuntimeConfig(),
    deviceId,
    lastArchiveCompletedAt: new Date().toISOString(),
    lastError: failed > 0 ? `${failed} 个文件归档失败` : null,
  });

  return {
    status: "completed",
    processed: items.length,
    failed,
  };
}

export async function archiveLocalManifestItemsInBatches(params: {
  bridge: Pick<DesktopArchiveBridge, "archiveItems">;
  directoryId: string;
  items: LocalArchiveManifestItem[];
  batchSize?: number;
  concurrency?: number;
}) {
  if (!params.bridge.archiveItems) {
    throw new Error("desktop_archive_bridge_missing");
  }

  const batches = chunkLocalArchiveItems(
    params.items,
    normalizeLocalArchiveBatchSize(params.batchSize)
  );
  if (batches.length === 0) {
    return { items: [], mappings: [] };
  }

  const concurrency = Math.min(
    normalizeLocalArchiveConcurrency(params.concurrency),
    batches.length
  );
  const results: unknown[] = new Array(batches.length);
  let nextBatchIndex = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextBatchIndex < batches.length) {
        const batchIndex = nextBatchIndex;
        nextBatchIndex += 1;
        const batch = batches[batchIndex] || [];

        try {
          results[batchIndex] = await params.bridge.archiveItems?.({
            directoryId: params.directoryId,
            items: batch,
          });
        } catch {
          results[batchIndex] = {
            items: batch.map((item) => ({
              sourceKind: item.sourceKind,
              sourceId: item.sourceId,
              status: "failed" as const,
              failureReason: "desktop_archive_batch_failed",
            })),
          };
        }
      }
    })
  );

  return mergeDesktopArchiveBatchResults(results);
}

export function normalizeLocalArchiveBatchSize(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return DEFAULT_ARCHIVE_BATCH_SIZE;
  }

  return Math.min(MAX_ARCHIVE_BATCH_SIZE, Math.max(1, Math.floor(normalized)));
}

export function normalizeLocalArchiveConcurrency(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return DEFAULT_ARCHIVE_CONCURRENCY;
  }

  return Math.min(MAX_ARCHIVE_CONCURRENCY, Math.max(1, Math.floor(normalized)));
}

export function mergeArchiveResultItemsWithMappings(params: {
  items: LocalArchiveResultItem[];
  mappings: LocalArchiveMapping[];
  mappingStatus: "archived" | "failed";
}) {
  const merged = new Map<string, LocalArchiveResultItem>();

  for (const item of params.items) {
    merged.set(`${item.sourceKind}:${item.sourceId}`, item);
  }

  for (const mapping of params.mappings) {
    const key = `${mapping.sourceKind}:${mapping.sourceId}`;
    if (params.mappingStatus === "archived") {
      if (!merged.has(key)) {
        merged.set(key, {
          sourceKind: mapping.sourceKind,
          sourceId: mapping.sourceId,
          status: "archived",
          failureReason: null,
        });
      }
      continue;
    }

    merged.set(key, {
      sourceKind: mapping.sourceKind,
      sourceId: mapping.sourceId,
      status: "failed",
      failureReason: "local_mapping_write_failed",
    });
  }

  return Array.from(merged.values());
}

export function normalizeLocalArchiveResultItems(input: unknown) {
  const rawItems = Array.isArray(input)
    ? input
    : Array.isArray((input as { items?: unknown } | null)?.items)
      ? (input as { items: unknown[] }).items
      : [];
  const normalized = new Map<string, LocalArchiveResultItem>();

  for (const item of rawItems) {
    if (!item || typeof item !== "object") {
      continue;
    }
    if (containsLocalFilesystemReference(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const sourceKind =
      record.sourceKind === "mediaAsset" || record.sourceKind === "generatedImage"
        ? record.sourceKind
        : null;
    const sourceId = String(record.sourceId || "").trim();
    const status = record.status === "failed" ? "failed" : "archived";

    if (!sourceKind || !sourceId || sourceId.length > 128) {
      continue;
    }

    normalized.set(`${sourceKind}:${sourceId}`, {
      sourceKind,
      sourceId,
      status,
      failureReason:
        status === "failed"
          ? String(record.failureReason || "")
              .trim()
              .slice(0, 500) || "archive_failed"
          : null,
    });
  }

  return Array.from(normalized.values());
}

export function containsLocalFilesystemReference(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return (
      /^yedir-local:\/\//i.test(normalized) ||
      /^file:\/\//i.test(normalized) ||
      /^[a-z]:[\\/]/i.test(normalized) ||
      /^\\\\[^\\]+\\[^\\]+/i.test(normalized) ||
      /^\/private\/(var|tmp)\//.test(normalized) ||
      /^\/(Users|home|var|tmp|Volumes)\//.test(normalized) ||
      /^~\//.test(normalized)
    );
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsLocalFilesystemReference(item));
  }

  if (typeof value !== "object") {
    return false;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      /(local.*path|path.*local|local.*url|url.*local|absolute.*path|file.*path|directory|folder)/i.test(
        key
      )
    ) {
      return true;
    }
    if (containsLocalFilesystemReference(child)) {
      return true;
    }
  }

  return false;
}

function chunkLocalArchiveItems(
  items: LocalArchiveManifestItem[],
  batchSize: number
) {
  const chunks: LocalArchiveManifestItem[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    chunks.push(items.slice(index, index + batchSize));
  }
  return chunks;
}

function mergeDesktopArchiveBatchResults(results: unknown[]) {
  return {
    items: results.flatMap((result) => normalizeLocalArchiveResultItems(result)),
    mappings: results.flatMap((result) => normalizeLocalArchiveMappings(result)),
  };
}

function normalizeDesktopArchiveDirectory(
  value: DesktopArchiveDirectory | null | undefined
) {
  const directoryId = String(value?.directoryId || "").trim();
  if (!directoryId) {
    return null;
  }

  return {
    directoryId,
    displayName: String(value?.displayName || "").trim() || null,
  };
}
