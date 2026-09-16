// Modified for standalone community distribution; see NOTICE.
import type { PickedObjectAttachment } from "@/src/components/canvas/chat-panel/canvas-chat-session";

export const CANVAS_IMAGE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export type CanvasUploadFileLike = {
  name: string;
  type: string;
  size: number;
};

export function validateCanvasImageUploadFile(file?: CanvasUploadFileLike | null):
  | { ok: true }
  | { ok: false; message: string } {
  if (!file) {
    return { ok: false, message: "请选择图片文件" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "请上传图片文件" };
  }
  if (file.size > CANVAS_IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, message: "图片大小不能超过 50MB" };
  }
  return { ok: true };
}

export function getCanvasUploadImageTitle(fileName: string): string {
  const title = String(fileName || "").replace(/\.[^.]+$/, "").trim();
  return title || "图片";
}

export function buildCanvasUploadedImageAttachment(params: {
  file: CanvasUploadFileLike;
  imageUrl: string;
  assetId?: string;
}): PickedObjectAttachment {
  return {
    url: params.imageUrl,
    name: params.file.name,
    contentType: params.file.type || "image/jpeg",
    assetId: params.assetId,
  };
}

export function normalizeUploadedAssetId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
