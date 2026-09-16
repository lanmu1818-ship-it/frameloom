// Modified for standalone community distribution; see NOTICE.
import type {
  AgentWorkflowBrandModelConfig,
  AgentWorkflowBrandModelEntry,
  AgentWorkflowBrandModelImage,
} from "@/types/agent";

export const AGENT_WORKFLOW_BRAND_MODEL_CONFIG_KEY = "agent_workflow_brand_model_config";

export const defaultAgentWorkflowBrandModelConfig: AgentWorkflowBrandModelConfig = {
  entries: [],
};

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeBrandModelImage(
  value: unknown,
  index: number
): AgentWorkflowBrandModelImage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const imageUrl = sanitizeText(raw.imageUrl, 2000);
  if (!imageUrl) return null;

  const assetId = sanitizeText(raw.assetId, 128) || null;
  const id = sanitizeText(raw.id, 128) || assetId || `brand-model-${index + 1}`;

  return {
    id,
    assetId,
    imageUrl,
    displayName: sanitizeText(raw.displayName, 255) || null,
    mimeType: sanitizeText(raw.mimeType, 128) || null,
    sortOrder: Number.isFinite(Number(raw.sortOrder))
      ? Math.max(0, Math.min(999, Math.round(Number(raw.sortOrder))))
      : index,
  };
}

function normalizeBrandModelEntry(
  value: unknown,
  index: number
): AgentWorkflowBrandModelEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const brandName = sanitizeText(raw.brandName, 64);
  if (!brandName) return null;

  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images = rawImages
    .map((item, imageIndex) => normalizeBrandModelImage(item, imageIndex))
    .filter((item): item is AgentWorkflowBrandModelImage => Boolean(item))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 100);

  return {
    brandName,
    images,
  };
}

export function normalizeAgentWorkflowBrandModelConfig(
  value: unknown
): AgentWorkflowBrandModelConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAgentWorkflowBrandModelConfig;
  }

  const raw = value as Record<string, unknown>;
  const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const entryMap = new Map<string, AgentWorkflowBrandModelEntry>();

  rawEntries.forEach((item, index) => {
    const normalized = normalizeBrandModelEntry(item, index);
    if (!normalized) return;

    const existing = entryMap.get(normalized.brandName);
    if (!existing) {
      entryMap.set(normalized.brandName, normalized);
      return;
    }

    const imageMap = new Map<string, AgentWorkflowBrandModelImage>();
    [...existing.images, ...normalized.images].forEach((image, imageIndex) => {
      const key = image.assetId || image.id || image.imageUrl || `image-${imageIndex + 1}`;
      if (!imageMap.has(key)) {
        imageMap.set(key, {
          ...image,
          sortOrder: imageMap.size,
        });
      }
    });

    entryMap.set(normalized.brandName, {
      brandName: normalized.brandName,
      images: Array.from(imageMap.values()),
    });
  });

  return {
    entries: Array.from(entryMap.values())
      .map((entry) => ({
        ...entry,
        images: entry.images.slice().sort((left, right) => left.sortOrder - right.sortOrder),
      }))
      .sort((left, right) => left.brandName.localeCompare(right.brandName, "zh-CN")),
  };
}
