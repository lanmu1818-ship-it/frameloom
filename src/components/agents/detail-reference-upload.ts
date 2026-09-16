// Modified for standalone community distribution; see NOTICE.
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
} from "@/src/client/upload-with-retry";
import type { AgentDetailReplacementReferenceItem } from "@/types/agent";

const DETAIL_REFERENCE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export interface UploadedDetailReferenceImage {
  url: string;
  name: string;
  contentType: string | null;
  assetId: string | null;
  width: number | null;
  height: number | null;
}

function isSupportedDetailReferenceImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  );
}

function buildDetailReferenceUploadFilename(file: File) {
  const extension = file.name.toLowerCase().split(".").pop() || "jpg";
  const baseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "target-detail";
  return `${baseName}-${Date.now()}.${extension}`;
}

function normalizeDimension(value: unknown) {
  const numberValue = Math.round(Number(value));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

async function readLocalImageDimensions(file: File) {
  if (typeof window === "undefined") {
    return { width: null, height: null };
  }

  return new Promise<{ width: number | null; height: number | null }>((resolve) => {
    const objectUrl = window.URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = normalizeDimension(image.naturalWidth);
      const height = normalizeDimension(image.naturalHeight);
      window.URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      window.URL.revokeObjectURL(objectUrl);
      resolve({ width: null, height: null });
    };
    image.src = objectUrl;
  });
}

export async function uploadDetailReferenceImageFile(
  file: File
): Promise<UploadedDetailReferenceImage> {
  if (!isSupportedDetailReferenceImage(file)) {
    throw new Error("请上传图片文件");
  }
  if (file.size > DETAIL_REFERENCE_UPLOAD_MAX_BYTES) {
    throw new Error("目标详情图过大，请压缩到 50MB 以内");
  }

  const dimensionsPromise = readLocalImageDimensions(file);
  const formData = new FormData();
  formData.append("file", file, buildDetailReferenceUploadFilename(file));
  formData.append("purpose", "canvas-upload");

  const response = await fetchUploadWithRetry(formData);
  if (!response.ok) {
    throw await createUploadErrorFromResponse(response, "目标详情图上传失败");
  }
  const payload = await response.json().catch(() => null);
  if (!payload?.url) {
    throw new Error("目标详情图上传后未返回可用地址");
  }

  const url = String(payload.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("目标详情图上传后未返回可用地址");
  }

  const localDimensions = await dimensionsPromise;
  return {
    url,
    name: file.name || "目标详情图",
    contentType: file.type || null,
    assetId: typeof payload.assetId === "string" ? payload.assetId : null,
    width: normalizeDimension(payload.width) || localDimensions.width,
    height: normalizeDimension(payload.height) || localDimensions.height,
  };
}

export function createUploadedDetailReferenceCard(params: {
  upload: UploadedDetailReferenceImage;
  index: number;
  labelPrefix?: string;
}): AgentDetailReplacementReferenceItem {
  const labelPrefix = params.labelPrefix || "上传目标详情";
  return {
    id: `manual-detail-reference-${Date.now()}-${params.index + 1}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    label: `${labelPrefix} ${String(params.index + 1).padStart(2, "0")}`,
    imageUrl: params.upload.url,
    previewUrl: params.upload.url,
    width: params.upload.width,
    height: params.upload.height,
    candidateId: null,
    sortOrder: params.index,
    passthrough: false,
  };
}

export function applyUploadedDetailReferenceToCard(
  card: AgentDetailReplacementReferenceItem,
  upload: UploadedDetailReferenceImage
): AgentDetailReplacementReferenceItem {
  return {
    ...card,
    imageUrl: upload.url,
    previewUrl: upload.url,
    width: upload.width,
    height: upload.height,
  };
}
