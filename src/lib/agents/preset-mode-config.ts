// Modified for standalone community distribution; see NOTICE.
import type {
  AgentPresetModeConfig,
  AgentPresetModeType,
  AgentTaskDetailReferenceSource,
} from "@/types/agent";

export const defaultAgentSceneGenerationModeConfig = {
  productImageSlotCount: 2,
  includeModelSlot: true,
  allowTemplateReferenceImages: true,
  allowModelOverride: false,
} as const;

export const defaultAgentDetailReplacementModeConfig = {
  enableTextEditing: true,
  productImageSlotCount: 2,
  includeModelSlot: true,
  referenceImageSource: "detail",
} as const;

export const defaultAgentSkuReplacementModeConfig = {
  enableTextEditing: true,
  productImageSlotCount: 2,
  includeModelSlot: true,
  referenceImageSource: "sku",
} as const;

export const defaultAgentPresetModeConfig: AgentPresetModeConfig = {
  modeType: "legacy",
  scene: { ...defaultAgentSceneGenerationModeConfig },
  detail: { ...defaultAgentDetailReplacementModeConfig },
  sku: { ...defaultAgentSkuReplacementModeConfig },
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(max, Math.max(min, Math.round(normalized)));
}

function normalizeReferenceSource(
  value: unknown,
  fallback: AgentTaskDetailReferenceSource
): AgentTaskDetailReferenceSource {
  return value === "main" || value === "sku" || value === "detail" ? value : fallback;
}

export function normalizeAgentPresetModeConfig(value: unknown): AgentPresetModeConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const embedded =
    raw.agentModeConfig && typeof raw.agentModeConfig === "object" && !Array.isArray(raw.agentModeConfig)
      ? (raw.agentModeConfig as Record<string, unknown>)
      : raw;

  const modeTypeRaw = String(embedded.modeType || "").trim() as AgentPresetModeType;
  const modeType: AgentPresetModeType =
    modeTypeRaw === "scene_generation" ||
    modeTypeRaw === "detail_replacement" ||
    modeTypeRaw === "sku_replacement" ||
    modeTypeRaw === "legacy"
      ? modeTypeRaw
      : "legacy";

  const sceneRaw =
    embedded.scene && typeof embedded.scene === "object" && !Array.isArray(embedded.scene)
      ? (embedded.scene as Record<string, unknown>)
      : {};
  const detailRaw =
    embedded.detail && typeof embedded.detail === "object" && !Array.isArray(embedded.detail)
      ? (embedded.detail as Record<string, unknown>)
      : {};
  const skuRaw =
    embedded.sku && typeof embedded.sku === "object" && !Array.isArray(embedded.sku)
      ? (embedded.sku as Record<string, unknown>)
      : {};

  return {
    modeType,
    scene: {
      productImageSlotCount: normalizeInteger(
        sceneRaw.productImageSlotCount,
        defaultAgentSceneGenerationModeConfig.productImageSlotCount,
        1,
        4
      ),
      includeModelSlot: normalizeBoolean(
        sceneRaw.includeModelSlot,
        defaultAgentSceneGenerationModeConfig.includeModelSlot
      ),
      allowTemplateReferenceImages: normalizeBoolean(
        sceneRaw.allowTemplateReferenceImages,
        defaultAgentSceneGenerationModeConfig.allowTemplateReferenceImages
      ),
      allowModelOverride: normalizeBoolean(
        sceneRaw.allowModelOverride,
        defaultAgentSceneGenerationModeConfig.allowModelOverride
      ),
    },
    detail: {
      enableTextEditing: normalizeBoolean(
        detailRaw.enableTextEditing,
        defaultAgentDetailReplacementModeConfig.enableTextEditing
      ),
      productImageSlotCount: normalizeInteger(
        detailRaw.productImageSlotCount,
        defaultAgentDetailReplacementModeConfig.productImageSlotCount,
        1,
        4
      ),
      includeModelSlot: normalizeBoolean(
        detailRaw.includeModelSlot,
        defaultAgentDetailReplacementModeConfig.includeModelSlot
      ),
      referenceImageSource: normalizeReferenceSource(
        detailRaw.referenceImageSource,
        defaultAgentDetailReplacementModeConfig.referenceImageSource
      ),
    },
    sku: {
      enableTextEditing: normalizeBoolean(
        skuRaw.enableTextEditing,
        defaultAgentSkuReplacementModeConfig.enableTextEditing
      ),
      productImageSlotCount: normalizeInteger(
        skuRaw.productImageSlotCount,
        defaultAgentSkuReplacementModeConfig.productImageSlotCount,
        1,
        4
      ),
      includeModelSlot: normalizeBoolean(
        skuRaw.includeModelSlot,
        defaultAgentSkuReplacementModeConfig.includeModelSlot
      ),
      referenceImageSource: normalizeReferenceSource(
        skuRaw.referenceImageSource,
        defaultAgentSkuReplacementModeConfig.referenceImageSource
      ),
    },
  };
}

export function patchAgentDefaultParamsWithModeConfig(
  defaultParams: Record<string, any> | null | undefined,
  modeConfig: AgentPresetModeConfig
) {
  return {
    ...(defaultParams || {}),
    agentModeConfig: modeConfig,
  };
}

export function getAgentPresetModeTypeFromDefaultParams(
  defaultParams: Record<string, any> | null | undefined
): AgentPresetModeType {
  return normalizeAgentPresetModeConfig(defaultParams).modeType;
}

export function getAgentRequiredUploadCount(params: {
  presetType: "image" | "video" | "text";
  defaultParams?: Record<string, any> | null;
  fallback?: number;
}) {
  if (params.presetType === "text") return 0;
  const modeConfig = normalizeAgentPresetModeConfig(params.defaultParams);
  if (params.presetType === "image" && modeConfig.modeType === "scene_generation") {
    return modeConfig.scene.productImageSlotCount + (modeConfig.scene.includeModelSlot ? 1 : 0);
  }
  if (params.presetType === "image" && modeConfig.modeType === "detail_replacement") {
    return modeConfig.detail.productImageSlotCount + (modeConfig.detail.includeModelSlot ? 1 : 0);
  }
  if (params.presetType === "image" && modeConfig.modeType === "sku_replacement") {
    return modeConfig.sku.productImageSlotCount + (modeConfig.sku.includeModelSlot ? 1 : 0);
  }
  return typeof params.fallback === "number" ? params.fallback : 3;
}
