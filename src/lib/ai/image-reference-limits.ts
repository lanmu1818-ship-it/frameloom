// Modified for standalone community distribution; see NOTICE.
export const GPT_IMAGE_2_MAX_REFERENCE_IMAGES = 16;

export function collectCanvasImageReferenceUrls(
  attachmentUrls: string[],
  context?: {
    selectedNodeIds?: string[];
    canvasImageNodes?: Array<{ nodeId: string; url: string; isSelected?: boolean }>;
  } | null,
) {
  const selectedUrls = (context?.canvasImageNodes || [])
    .filter((node) => context?.selectedNodeIds?.length
      ? context.selectedNodeIds.includes(node.nodeId)
      : node.isSelected)
    .map((node) => node.url);
  return Array.from(new Set([...attachmentUrls, ...selectedUrls]
    .map((url) => url.trim()).filter(Boolean)));
}

export function isGptImage2Model(modelId?: string | null) {
  return /^(?:openai\/)?gpt-image-2(?:-vip|\/edit)?$/i.test(
    String(modelId || "").trim(),
  );
}

// Input references are independent of maxImages (the output batch size).
export function getImageReferenceLimit(
  modelId?: string | null,
  providerType?: string | null,
  configuredLimit?: unknown,
): number | undefined {
  const configured = Number(configuredLimit);
  const modelLimit = isGptImage2Model(modelId)
    ? GPT_IMAGE_2_MAX_REFERENCE_IMAGES
    : undefined;
  if (Number.isInteger(configured) && configured > 0) {
    return Math.min(configured, modelLimit ?? configured);
  }
  if (modelLimit) return modelLimit;
  // The cloud catalog supplies the actual configured upstream model's limit.
  if (modelId?.startsWith("lanbi:image:")) return 16;
  if (providerType === "98k-image") return 8;
  return undefined;
}

export class ImageReferenceLimitError extends Error {
  constructor(count: number, limit: number) {
    super(`当前模型最多支持 ${limit} 张参考图，已选择 ${count} 张，请减少后重试。`);
    this.name = "ImageReferenceLimitError";
  }
}

export function assertImageReferenceCount(count: number, limit?: number) {
  if (limit !== undefined && count > limit) {
    throw new ImageReferenceLimitError(count, limit);
  }
}
