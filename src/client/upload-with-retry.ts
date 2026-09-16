// Modified for standalone community distribution; see NOTICE.
import { apiFetch } from "@/src/client/api";
import { dispatchProviderApiKeyPromptFromError } from "@/src/client/provider-api-key-prompt";

const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 8000;
const MAX_CONCURRENT_UPLOADS = 3;
const DIRECT_UPLOAD_MAX_BYTES = 500 * 1024 * 1024;
const DIRECT_UPLOAD_PART_CONCURRENCY = 4;
const CLIENT_UPLOAD_ID_FIELD = "clientUploadId";
export const UPLOAD_PROGRESS_EVENT = "yedir:upload-progress";

const RETRYABLE_UPLOAD_STATUSES = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
]);

const DIRECT_UPLOAD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const BROWSER_IMAGE_TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const PROVIDER_UPLOAD_BLOCK_CODES = new Set([
  "provider_api_key_required",
  "provider_api_key_invalid",
  "provider_api_key_balance_blocked",
  "provider_api_key_permission_blocked",
  "provider_api_key_model_unavailable",
]);

let activeUploadCount = 0;
const uploadQueue: Array<() => void> = [];

function isLanbiDesktopCanvasRenderer() {
  if (typeof window === "undefined") {
    return false;
  }
  const canvasWindow = window as Window & {
    __LANBI_CANVAS_RENDERER__?: { name?: string };
  };
  return canvasWindow.__LANBI_CANVAS_RENDERER__?.name === "lanbi-canvas-renderer";
}

type UploadFormFile = {
  blob: Blob;
  filename: string;
  contentType: string;
  purpose: string;
  clientUploadId: string;
};

type DirectUploadPart = {
  partNumber: number;
  url: string;
};

type DirectUploadInitiateResponse =
  | {
      mode: "single";
      key: string;
      url: string;
      headers?: Record<string, string>;
    }
  | {
      mode: "multipart";
      key: string;
      uploadId: string;
      partSize: number;
      partCount: number;
      parts: DirectUploadPart[];
    };

type UploadErrorWithPayload = Error & {
  payload?: unknown;
  providerApiKeyPrompted?: boolean;
  status?: number;
};

export type UploadProgressEventDetail = {
  uploadId: string;
  fileName?: string;
  phase?: string;
  progress?: number;
  status: "started" | "progress" | "completed" | "failed" | "dismissed";
};

function dispatchUploadProgress(detail: UploadProgressEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<UploadProgressEventDetail>(UPLOAD_PROGRESS_EVENT, {
      detail,
    })
  );
}

function clampUploadProgress(value: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function emitUploadProgress(
  file: UploadFormFile | null,
  detail: Omit<UploadProgressEventDetail, "fileName" | "uploadId"> & {
    progress?: number;
  }
) {
  if (!file?.clientUploadId) {
    return;
  }

  dispatchUploadProgress({
    ...detail,
    fileName: file.filename,
    progress:
      detail.progress === undefined
        ? undefined
        : clampUploadProgress(detail.progress),
    uploadId: file.clientUploadId,
  });
}

function createAbortError() {
  const error = new Error("Upload aborted");
  error.name = "AbortError";
  return error;
}

function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      globalThis.clearTimeout(timeout);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function acquireUploadSlot() {
  return new Promise<void>((resolve) => {
    const start = () => {
      activeUploadCount += 1;
      resolve();
    };

    if (activeUploadCount < MAX_CONCURRENT_UPLOADS) {
      start();
    } else {
      uploadQueue.push(start);
    }
  });
}

async function withUploadSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquireUploadSlot();

  try {
    return await task();
  } finally {
    activeUploadCount = Math.max(0, activeUploadCount - 1);
    uploadQueue.shift()?.();
  }
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.round(seconds * 1000);
  }
  return null;
}

function computeBackoffMs(attempt: number, retryAfterMs: number | null) {
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs, MAX_BACKOFF_MS);
  }
  const exp = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 300);
  return exp + jitter;
}

function isRetryableUploadStatus(status: number) {
  return RETRYABLE_UPLOAD_STATUSES.has(status);
}

function isAbortError(error: unknown, signal?: AbortSignal) {
  return (
    signal?.aborted ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function cloneFormData(formData: FormData) {
  const copy = new FormData();

  formData.forEach((value, key) => {
    if (typeof value === "string") {
      copy.append(key, value);
      return;
    }

    const filename =
      typeof File !== "undefined" && value instanceof File
        ? value.name
        : undefined;

    if (filename) {
      copy.append(key, value, filename);
    } else {
      copy.append(key, value);
    }
  });

  return copy;
}

function normalizeBrowserImageType(contentType: string, filename: string) {
  const normalized = contentType.trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }

  const extension = filename.toLowerCase().split(".").pop() || "";
  return BROWSER_IMAGE_TYPES_BY_EXTENSION[extension] || normalized;
}

function createClientUploadId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureClientUploadId(formData: FormData) {
  const existing = formData.get(CLIENT_UPLOAD_ID_FIELD);
  if (typeof existing === "string" && existing.trim()) {
    return existing.trim();
  }

  const clientUploadId = createClientUploadId();
  formData.set(CLIENT_UPLOAD_ID_FIELD, clientUploadId);
  return clientUploadId;
}

function getUploadFormFile(formData: FormData): UploadFormFile | null {
  const value = formData.get("file");
  if (!(value instanceof Blob)) {
    return null;
  }

  const filename =
    typeof File !== "undefined" && value instanceof File && value.name
      ? value.name
      : `upload-${Date.now()}`;
  const contentType = normalizeBrowserImageType(
    value.type || "application/octet-stream",
    filename
  );
  const purposeValue = formData.get("purpose");
  const clientUploadId = ensureClientUploadId(formData);

  return {
    blob: value,
    filename,
    contentType,
    purpose: typeof purposeValue === "string" ? purposeValue : "",
    clientUploadId,
  };
}

function shouldTryDirectUpload(file: UploadFormFile) {
  if (file.blob.size <= 0 || file.blob.size > DIRECT_UPLOAD_MAX_BYTES) {
    return false;
  }
  if (!DIRECT_UPLOAD_IMAGE_TYPES.has(file.contentType.toLowerCase())) {
    return false;
  }
  return true;
}

async function readUploadResponsePayload(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    return (await response.clone().text().catch(() => "")).trim();
  }
}

function getUploadErrorText(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const errorText =
      String(record.error || record.message || record.detail || record.details || "").trim();
    if (errorText) {
      return errorText;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return fallback;
}

function getUploadErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  return String(record.code || data?.code || "").trim();
}

function isProviderUploadBlockedPayload(payload: unknown) {
  const code = getUploadErrorCode(payload);
  return code ? PROVIDER_UPLOAD_BLOCK_CODES.has(code) : false;
}

function isProviderUploadBlockedError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    isProviderUploadBlockedPayload((error as UploadErrorWithPayload).payload)
  );
}

export async function createUploadErrorFromResponse(
  response: Response,
  fallback = "上传失败"
) {
  const payload = await readUploadResponsePayload(response);
  const providerApiKeyPrompted =
    dispatchProviderApiKeyPromptFromError(payload);

  const message = getUploadErrorText(payload, response.statusText || fallback);
  const error = new Error(message || fallback) as UploadErrorWithPayload;
  error.payload = payload;
  error.providerApiKeyPrompted = providerApiKeyPrompted;
  error.status = response.status;
  return error;
}

export function getUploadErrorMessage(error: unknown, fallback = "上传失败") {
  const payload =
    error && typeof error === "object" && "payload" in error
      ? (error as UploadErrorWithPayload).payload
      : error;

  if (dispatchProviderApiKeyPromptFromError(payload)) {
    return null;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getUploadErrorText(payload, fallback);
}

async function handleProviderUploadBlockedResponse(response: Response) {
  if (response.ok) {
    return false;
  }

  const payload = await readUploadResponsePayload(response);
  if (!isProviderUploadBlockedPayload(payload)) {
    return false;
  }

  dispatchProviderApiKeyPromptFromError(payload);
  return true;
}

async function readErrorPayload(response: Response) {
  const payload = await readUploadResponsePayload(response);
  dispatchProviderApiKeyPromptFromError(payload);
  return getUploadErrorText(payload, response.statusText || "上传失败");
}

async function postDirectUploadAction<T>(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  const response = await apiFetch("/api/files/direct-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw await createUploadErrorFromResponse(response, "Direct upload failed");
  }

  return (await response.json()) as T;
}

type DirectUploadHttpResponse = {
  ok: boolean;
  status: number;
  getHeader: (name: string) => string | null;
};

function headersToEntries(headers?: HeadersInit) {
  if (!headers) {
    return [] as Array<[string, string]>;
  }
  if (headers instanceof Headers) {
    return Array.from(headers.entries());
  }
  if (Array.isArray(headers)) {
    return headers.map(([key, value]) => [key, String(value)] as [string, string]);
  }
  return Object.entries(headers).map(
    ([key, value]) => [key, String(value)] as [string, string]
  );
}

function uploadDirectObjectOnce(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  onUploadProgress?: (loaded: number, total: number | null) => void
) {
  return new Promise<DirectUploadHttpResponse>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {}
      finish(() => reject(createAbortError()));
    };

    xhr.open(init.method || "PUT", url, true);
    xhr.withCredentials = false;

    for (const [key, value] of headersToEntries(init.headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      onUploadProgress?.(
        event.loaded,
        event.lengthComputable ? event.total : null
      );
    };

    xhr.onload = () => {
      finish(() =>
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          getHeader: (name) => xhr.getResponseHeader(name),
        })
      );
    };
    xhr.onerror = () => {
      finish(() =>
        reject(
          new Error(
            "存储桶直传网络失败，请检查对象存储 CORS 是否允许当前域名上传。"
          )
        )
      );
    };
    xhr.ontimeout = () => {
      finish(() => reject(new Error("存储桶直传超时，请稍后重试。")));
    };
    xhr.onabort = () => {
      finish(() => reject(createAbortError()));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    xhr.send((init.body || null) as XMLHttpRequestBodyInit | null);
  });
}

async function uploadDirectObjectWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
  signal?: AbortSignal,
  onUploadProgress?: (loaded: number, total: number | null) => void
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await uploadDirectObjectOnce(
        url,
        init,
        signal,
        onUploadProgress
      );

      if (response.ok || !isRetryableUploadStatus(response.status) || attempt >= maxRetries) {
        return response;
      }

      await sleep(computeBackoffMs(attempt, null), signal);
    } catch (error) {
      if (isAbortError(error, signal) || attempt >= maxRetries) {
        throw error;
      }

      await sleep(computeBackoffMs(attempt, null), signal);
    }
  }
}

async function uploadMultipartParts(params: {
  file: UploadFormFile;
  onProgress?: (progress: {
    completedParts: number;
    totalParts: number;
    uploadedBytes: number;
    totalBytes: number;
  }) => void;
  upload: Extract<DirectUploadInitiateResponse, { mode: "multipart" }>;
  maxRetries: number;
  signal?: AbortSignal;
}) {
  const uploadedParts: Array<{ ETag: string; PartNumber: number }> = [];
  let completedParts = 0;
  let nextIndex = 0;
  const partProgress = new Map<number, number>();

  const emitMultipartProgress = () => {
    let uploadedBytes = 0;
    for (const value of partProgress.values()) {
      uploadedBytes += value;
    }
    params.onProgress?.({
      completedParts,
      totalParts: params.upload.parts.length,
      uploadedBytes,
      totalBytes: params.file.blob.size,
    });
  };

  async function worker() {
    for (;;) {
      const part = params.upload.parts[nextIndex];
      nextIndex += 1;
      if (!part) return;

      const start = (part.partNumber - 1) * params.upload.partSize;
      const end = Math.min(start + params.upload.partSize, params.file.blob.size);
      const body = params.file.blob.slice(start, end);
      const partSize = end - start;
      const response = await uploadDirectObjectWithRetry(
        part.url,
        {
          method: "PUT",
          body,
        },
        params.maxRetries,
        params.signal,
        (loaded) => {
          partProgress.set(part.partNumber, Math.min(partSize, loaded));
          emitMultipartProgress();
        }
      );

      if (!response.ok) {
        throw new Error(`Direct multipart upload failed: ${response.status}`);
      }

      const etag = response.getHeader("ETag") || response.getHeader("etag");
      if (!etag) {
        throw new Error("Storage did not expose ETag; please allow ETag in bucket CORS");
      }

      partProgress.set(part.partNumber, partSize);
      uploadedParts.push({
        ETag: etag,
        PartNumber: part.partNumber,
      });
      completedParts += 1;
      emitMultipartProgress();
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(DIRECT_UPLOAD_PART_CONCURRENCY, params.upload.parts.length) },
      () => worker()
    )
  );

  return uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
}

async function fetchDirectUpload(
  formData: FormData,
  maxRetries: number,
  uploadFile?: UploadFormFile | null,
  signal?: AbortSignal
): Promise<Response | null> {
  const file = uploadFile || getUploadFormFile(formData);
  // The packaged Canvas runs on a random loopback origin. Upload through the
  // same-origin desktop proxy so object-storage CORS never blocks the request.
  if (!file || isLanbiDesktopCanvasRenderer() || !shouldTryDirectUpload(file)) {
    return null;
  }

  let multipartUpload:
    | Extract<DirectUploadInitiateResponse, { mode: "multipart" }>
    | null = null;

  try {
    const upload = await postDirectUploadAction<DirectUploadInitiateResponse>(
      {
        action: "initiate",
        filename: file.filename,
        contentType: file.contentType,
        size: file.blob.size,
        purpose: file.purpose,
        clientUploadId: file.clientUploadId,
      },
      signal
    );
    emitUploadProgress(file, {
      phase:
        upload.mode === "multipart"
          ? "正在准备分片上传..."
          : "正在准备直传...",
      progress: 12,
      status: "progress",
    });

    if (upload.mode === "single") {
      emitUploadProgress(file, {
        phase: "正在上传到存储桶...",
        progress: 28,
        status: "progress",
      });
      const response = await uploadDirectObjectWithRetry(
        upload.url,
        {
          method: "PUT",
          headers: upload.headers || {
            "Content-Type": file.contentType,
          },
          body: file.blob,
        },
        maxRetries,
        signal,
        (loaded, total) => {
          if (!total) {
            return;
          }
          emitUploadProgress(file, {
            phase: "正在上传到存储桶...",
            progress: 28 + (loaded / Math.max(1, total)) * 50,
            status: "progress",
          });
        }
      );

      if (!response.ok) {
        throw new Error(`Direct upload failed: ${response.status}`);
      }

      emitUploadProgress(file, {
        phase: "正在登记上传结果...",
        progress: 82,
        status: "progress",
      });
      const payload = await postDirectUploadAction<Record<string, unknown>>(
        {
          action: "complete",
          key: upload.key,
          filename: file.filename,
          contentType: file.contentType,
          size: file.blob.size,
          purpose: file.purpose,
          clientUploadId: file.clientUploadId,
        },
        signal
      );

      return Response.json(payload);
    }

    multipartUpload = upload;
    emitUploadProgress(file, {
      phase: "正在分片上传...",
      progress: 18,
      status: "progress",
    });
    const parts = await uploadMultipartParts({
      file,
      upload,
      maxRetries,
      onProgress: ({ completedParts, totalParts, uploadedBytes, totalBytes }) => {
        const progress = 18 + (uploadedBytes / Math.max(1, totalBytes)) * 64;
        emitUploadProgress(file, {
          phase: `正在上传分片 ${completedParts}/${totalParts}...`,
          progress,
          status: "progress",
        });
      },
      signal,
    });
    emitUploadProgress(file, {
      phase: "正在合并上传结果...",
      progress: 86,
      status: "progress",
    });
    const payload = await postDirectUploadAction<Record<string, unknown>>(
      {
        action: "complete",
        key: upload.key,
        uploadId: upload.uploadId,
        filename: file.filename,
        contentType: file.contentType,
        size: file.blob.size,
        parts,
        purpose: file.purpose,
        clientUploadId: file.clientUploadId,
      },
      signal
    );

    return Response.json(payload);
  } catch (error) {
    if ((error as UploadErrorWithPayload)?.status === 404) {
      return null;
    }
    if (isProviderUploadBlockedError(error)) {
      const uploadError = error as UploadErrorWithPayload;
      return Response.json(uploadError.payload, {
        status: uploadError.status || 403,
      });
    }

    if (multipartUpload && !isAbortError(error, signal)) {
      postDirectUploadAction(
        {
          action: "abort",
          key: multipartUpload.key,
          uploadId: multipartUpload.uploadId,
          clientUploadId: file.clientUploadId,
        },
        signal
      ).catch(() => {});
    }

    if (!isAbortError(error, signal)) {
      return Response.json(
        {
          error: "图片直传存储桶失败，请检查网络后重试。",
          details: error instanceof Error ? error.message : String(error),
          code: "direct_upload_failed",
          clientUploadId: file.clientUploadId,
        },
        { status: 502 }
      );
    }

    throw error;
  }
}

export async function fetchUploadWithRetry(
  formData: FormData,
  options?: {
    maxRetries?: number;
    signal?: AbortSignal;
  }
) {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const uploadFile = getUploadFormFile(formData);
  emitUploadProgress(uploadFile, {
    phase: "正在准备上传...",
    progress: 3,
    status: "started",
  });

  return withUploadSlot(async () => {
    try {
      const directResponse = await fetchDirectUpload(
        formData,
        maxRetries,
        uploadFile,
        options?.signal
      );
      if (directResponse) {
        const providerApiKeyPrompted =
          await handleProviderUploadBlockedResponse(directResponse);
        emitUploadProgress(uploadFile, {
          phase: providerApiKeyPrompted
            ? "请获取可用 API Key"
            : directResponse.ok
              ? "上传完成"
              : "上传失败",
          progress: directResponse.ok ? 100 : undefined,
          status: providerApiKeyPrompted
            ? "dismissed"
            : directResponse.ok
              ? "completed"
              : "failed",
        });
        return directResponse;
      }

      for (let attempt = 0; ; attempt++) {
        try {
          emitUploadProgress(uploadFile, {
            phase:
              attempt > 0
                ? `正在重试上传（第 ${attempt + 1} 次）...`
                : "正在上传图片...",
            progress: attempt > 0 ? 28 : 18,
            status: "progress",
          });
          const response = await apiFetch("/api/files/upload", {
            method: "POST",
            body: cloneFormData(formData),
            signal: options?.signal,
          });
          const providerApiKeyPrompted =
            await handleProviderUploadBlockedResponse(response);
          if (providerApiKeyPrompted) {
            emitUploadProgress(uploadFile, {
              phase: "请获取可用 API Key",
              status: "dismissed",
            });
            return response;
          }

          if (!isRetryableUploadStatus(response.status) || attempt >= maxRetries) {
            emitUploadProgress(uploadFile, {
              phase: response.ok ? "上传完成" : "上传失败",
              progress: response.ok ? 100 : undefined,
              status: response.ok ? "completed" : "failed",
            });
            return response;
          }

          let retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
          if (!retryAfterMs) {
            try {
              const payload = await response.clone().json();
              const retryAfterSec = Number(payload?.retryAfter || 0);
              if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
                retryAfterMs = Math.round(retryAfterSec * 1000);
              }
            } catch {}
          }

          const delayMs = computeBackoffMs(attempt, retryAfterMs);
          await sleep(delayMs, options?.signal);
        } catch (error) {
          if (isAbortError(error, options?.signal) || attempt >= maxRetries) {
            throw error;
          }

          const delayMs = computeBackoffMs(attempt, null);
          await sleep(delayMs, options?.signal);
        }
      }
    } catch (error) {
      emitUploadProgress(uploadFile, {
        phase: "上传失败",
        status: "failed",
      });
      throw error;
    }
  });
}
