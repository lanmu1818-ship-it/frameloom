// Modified for standalone community distribution; see NOTICE.
// These are operations, even when a provider catalog labels them as type=image.
const INTERNAL_CAPABILITY_IDS = new Set([
  "background-generator", "clothing-segmentation", "colorize", "compress",
  "enhance", "head-cutout", "id-photo", "image-expansion", "remove-background",
  "remove-object", "remove-watermark", "smart-crop", "ocr", "world-generation",
]);

export function isInternalCapabilityModel(params: {
  modelId?: string | null;
  capabilities?: unknown;
}) {
  if (INTERNAL_CAPABILITY_IDS.has(String(params.modelId || "").trim().toLowerCase())) return true;
  const caps = params.capabilities && typeof params.capabilities === "object"
    ? params.capabilities as Record<string, unknown> : {};
  const raw = caps.raw && typeof caps.raw === "object"
    ? caps.raw as Record<string, unknown> : {};
  return [caps, raw].some((row) =>
    row.internalCapability === true ||
    ["tools", "three_d_space"].includes(String(row.category || "").toLowerCase()) ||
    ["image_tool", "image-tool", "document_tool", "document-tool", "world"].includes(
      String(row.type || row.modelType || row.model_type || "").toLowerCase(),
    ),
  );
}
