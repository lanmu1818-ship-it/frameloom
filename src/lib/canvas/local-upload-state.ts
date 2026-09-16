// Modified for standalone community distribution; see NOTICE.
import type { CanvasNode } from "@/types/canvas/index";

export const LOCAL_UPLOAD_PREVIEW_METADATA_KEY = "localUploadPreviewUrl";
export const LOCAL_UPLOAD_PENDING_METADATA_KEY = "localUploadPending";

export function isLocalPreviewUrl(value: unknown) {
  return typeof value === "string" && value.startsWith("blob:");
}

export function isCanvasImageUploadPending(node: CanvasNode | null | undefined) {
  if (!node || node.type !== "image") return false;
  const data = (node.data || {}) as Record<string, any>;
  const metadata =
    data.metadata &&
    typeof data.metadata === "object" &&
    !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, any>)
      : {};

  return (
    metadata[LOCAL_UPLOAD_PENDING_METADATA_KEY] === true ||
    isLocalPreviewUrl(data.src) ||
    isLocalPreviewUrl(metadata[LOCAL_UPLOAD_PREVIEW_METADATA_KEY])
  );
}

export function isCanvasImageReadyForAi(node: CanvasNode | null | undefined) {
  if (!node || node.type !== "image" || isCanvasImageUploadPending(node)) {
    return false;
  }

  const data = (node.data || {}) as Record<string, any>;
  const src = String(
    data.src ||
      data.previewImage ||
      data.imageUrl ||
      data.renderArtifacts?.screenshotUrl ||
      ""
  ).trim();
  return /^https?:\/\//i.test(src);
}
