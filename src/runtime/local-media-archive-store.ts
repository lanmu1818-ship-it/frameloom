// Modified for standalone community distribution; see NOTICE.
export type LocalArchiveSourceKind = "mediaAsset" | "generatedImage";

export type LocalArchiveMapping = {
  key: string;
  sourceKind: LocalArchiveSourceKind;
  sourceId: string;
  localPath: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  checksum?: string | null;
  archivedAt: string;
  lastVerifiedAt?: string | null;
};

const DATABASE_NAME = "yedir-local-media-archive";
const DATABASE_VERSION = 1;
const MAPPING_STORE_NAME = "assetMappings";
const LOCAL_ARCHIVE_PROTOCOL_URL_PATTERN =
  /^yedir-local:\/\/archive\/dir-[a-f0-9]{24}\/[^/?#]+$/i;

export function buildLocalArchiveMappingKey(
  sourceKind: unknown,
  sourceId: unknown
) {
  const normalizedKind = normalizeLocalArchiveSourceKind(sourceKind);
  const normalizedId = normalizeSourceId(sourceId);
  if (!normalizedKind || !normalizedId) {
    return null;
  }

  return `${normalizedKind}:${normalizedId}`;
}

export function normalizeLocalArchiveMappings(input: unknown) {
  const rawItems = getRawMappingItems(input);
  const mappings = new Map<string, LocalArchiveMapping>();

  for (const item of rawItems) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const key = buildLocalArchiveMappingKey(record.sourceKind, record.sourceId);
    const localPath = normalizeLocalFilesystemReference(
      record.localUrl || record.localUri || record.fileUrl || record.localPath
    );
    if (!key || !localPath) {
      continue;
    }

    const [sourceKind, sourceId] = key.split(":") as [
      LocalArchiveSourceKind,
      string,
    ];

    mappings.set(key, {
      key,
      sourceKind,
      sourceId,
      localPath,
      mimeType: normalizeString(record.mimeType),
      width: normalizePositiveInteger(record.width),
      height: normalizePositiveInteger(record.height),
      byteSize: normalizePositiveInteger(record.byteSize || record.bytes),
      checksum: normalizeString(record.checksum),
      archivedAt: normalizeIsoString(record.archivedAt) || new Date().toISOString(),
      lastVerifiedAt: normalizeIsoString(record.lastVerifiedAt),
    });
  }

  return Array.from(mappings.values());
}

export function isLocalMediaArchiveStoreAvailable() {
  return typeof indexedDB !== "undefined";
}

export async function saveLocalArchiveMappings(
  input: LocalArchiveMapping[] | unknown
) {
  const mappings = Array.isArray(input)
    ? normalizeLocalArchiveMappings(input)
    : normalizeLocalArchiveMappings(input);
  if (mappings.length === 0 || !isLocalMediaArchiveStoreAvailable()) {
    return 0;
  }

  const db = await openLocalMediaArchiveDatabase();
  await writeMappings(db, mappings);
  db.close();
  return mappings.length;
}

export async function getLocalArchiveMapping(
  sourceKind: unknown,
  sourceId: unknown
) {
  const key = buildLocalArchiveMappingKey(sourceKind, sourceId);
  if (!key || !isLocalMediaArchiveStoreAvailable()) {
    return null;
  }

  const db = await openLocalMediaArchiveDatabase();
  const mapping = await readMapping(db, key);
  db.close();
  return mapping;
}

export async function deleteLocalArchiveMapping(
  sourceKind: unknown,
  sourceId: unknown
) {
  const key = buildLocalArchiveMappingKey(sourceKind, sourceId);
  if (!key || !isLocalMediaArchiveStoreAvailable()) {
    return false;
  }

  const db = await openLocalMediaArchiveDatabase();
  await deleteMapping(db, key);
  db.close();
  return true;
}

function getRawMappingItems(input: unknown) {
  if (Array.isArray(input)) {
    return input;
  }

  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as {
    mappings?: unknown;
    localMappings?: unknown;
    items?: unknown;
  };
  if (Array.isArray(record.mappings)) {
    return record.mappings;
  }
  if (Array.isArray(record.localMappings)) {
    return record.localMappings;
  }
  if (Array.isArray(record.items)) {
    return record.items;
  }

  return [];
}

function normalizeLocalArchiveSourceKind(
  value: unknown
): LocalArchiveSourceKind | null {
  return value === "mediaAsset" || value === "generatedImage" ? value : null;
}

function normalizeSourceId(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized || normalized.length > 128) {
    return null;
  }

  return normalized;
}

function normalizeLocalFilesystemReference(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  if (!LOCAL_ARCHIVE_PROTOCOL_URL_PATTERN.test(normalized)) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "yedir-local:" || url.hostname !== "archive") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }
  } catch {
    return null;
  }

  return normalized;
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

function normalizePositiveInteger(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return Math.floor(normalized);
}

function openLocalMediaArchiveDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MAPPING_STORE_NAME)) {
        db.createObjectStore(MAPPING_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

function writeMappings(db: IDBDatabase, mappings: LocalArchiveMapping[]) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MAPPING_STORE_NAME, "readwrite");
    const store = transaction.objectStore(MAPPING_STORE_NAME);
    for (const mapping of mappings) {
      store.put(mapping);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB write failed"));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB write aborted"));
  });
}

function readMapping(db: IDBDatabase, key: string) {
  return new Promise<LocalArchiveMapping | null>((resolve, reject) => {
    const transaction = db.transaction(MAPPING_STORE_NAME, "readonly");
    const request = transaction.objectStore(MAPPING_STORE_NAME).get(key);

    request.onsuccess = () => resolve((request.result as LocalArchiveMapping) || null);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB read failed"));
  });
}

function deleteMapping(db: IDBDatabase, key: string) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MAPPING_STORE_NAME, "readwrite");
    const request = transaction.objectStore(MAPPING_STORE_NAME).delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB delete failed"));
  });
}
