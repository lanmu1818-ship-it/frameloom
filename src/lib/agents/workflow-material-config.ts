// Modified for standalone community distribution; see NOTICE.
import type {
  AgentWorkflowMaterialApiConfig,
  AgentWorkflowMaterialImage,
  AgentWorkflowMaterialSkuOption,
  AgentWorkflowMaterialSearchResult,
  AgentWorkflowMaterialSelectionState,
  AgentWorkflowMaterialSelections,
} from "@/types/agent";

export const AGENT_WORKFLOW_MATERIAL_API_CONFIG_KEY = "agent_workflow_material_api_config";

export const defaultAgentWorkflowMaterialApiConfig: AgentWorkflowMaterialApiConfig = {
  enabled: false,
  baseUrl: "https://materials.example.com/api/external",
  apiKey: "",
  productDetailEnabled: false,
  productDetailBaseUrl: "",
  productDetailApiKey: "",
  productDetailPath: "",
  productDetailMethod: "GET",
  productDetailDefaultChannel: "taobao",
  productDetailSyncAnalysis: true,
  productDetailForceReanalyze: false,
};

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMaterialImage(
  value: unknown,
  index: number
): AgentWorkflowMaterialImage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const imageUrl = sanitizeText(raw.imageUrl, 2000);
  if (!imageUrl) return null;

  const id = sanitizeText(raw.id, 128) || `image-${index + 1}`;
  const group = raw.group === "other" ? "other" : "fixed";
  const previewUrl = sanitizeText(raw.previewUrl, 2000) || null;

  return {
    id,
    key: sanitizeText(raw.key, 64) || id,
    label: sanitizeText(raw.label, 128) || `图片${index + 1}`,
    fileName: sanitizeText(raw.fileName, 255) || `image-${index + 1}`,
    imageUrl,
    previewUrl,
    assetId: sanitizeText(raw.assetId, 128) || null,
    mimeType: sanitizeText(raw.mimeType, 128) || null,
    appearanceSummary: sanitizeText(raw.appearanceSummary, 255) || null,
    sourceType: raw.sourceType === "upload" ? "upload" : "search",
    group,
    sortOrder: Number.isFinite(Number(raw.sortOrder))
      ? Math.max(0, Math.min(999, Math.round(Number(raw.sortOrder))))
      : index,
  };
}

function normalizeMaterialSearchResult(value: unknown): AgentWorkflowMaterialSearchResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const skuOptions: AgentWorkflowMaterialSkuOption[] = Array.isArray(raw.skuOptions)
    ? raw.skuOptions
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }
          const skuRaw = item as Record<string, unknown>;
          const skuName = sanitizeText(skuRaw.skuName, 64);
          if (!skuName) return null;
          const normalizedOption: AgentWorkflowMaterialSkuOption = {
            skuName,
            skuId: sanitizeText(skuRaw.skuId, 128) || null,
            hasWhiteBackground: skuRaw.hasWhiteBackground === true,
            whiteBackgroundCount: Number.isFinite(Number(skuRaw.whiteBackgroundCount))
              ? Math.max(0, Math.min(999, Math.round(Number(skuRaw.whiteBackgroundCount))))
              : 0,
            previewImageUrl: sanitizeText(skuRaw.previewImageUrl, 2000) || null,
            previewFileName: sanitizeText(skuRaw.previewFileName, 255) || null,
          };
          return normalizedOption;
        })
        .filter((item): item is AgentWorkflowMaterialSkuOption => item !== null)
        .slice(0, 100)
    : [];
  const images = Array.isArray(raw.images)
    ? raw.images
        .map((item, index) => normalizeMaterialImage(item, index))
        .filter((item): item is AgentWorkflowMaterialImage => Boolean(item))
        .slice(0, 32)
    : [];

  if (images.length === 0 && skuOptions.length === 0) {
    return null;
  }

  return {
    query: sanitizeText(raw.query, 64),
    queryType: raw.queryType === "spu" ? "spu" : "sku",
    matchedSku: sanitizeText(raw.matchedSku, 64),
    matchedSpu: sanitizeText(raw.matchedSpu, 64) || null,
    materialId: sanitizeText(raw.materialId, 128) || null,
    productModel: sanitizeText(raw.productModel, 128) || null,
    zipUrl: sanitizeText(raw.zipUrl, 2000) || null,
    fixedCount: Number.isFinite(Number(raw.fixedCount))
      ? Math.max(0, Math.min(999, Math.round(Number(raw.fixedCount))))
      : images.filter((item) => item.group === "fixed").length,
    otherCount: Number.isFinite(Number(raw.otherCount))
      ? Math.max(0, Math.min(999, Math.round(Number(raw.otherCount))))
      : images.filter((item) => item.group === "other").length,
    totalCount: Number.isFinite(Number(raw.totalCount))
      ? Math.max(0, Math.min(999, Math.round(Number(raw.totalCount))))
      : images.length,
    images: images
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder),
    recommendedImageIds: Array.isArray(raw.recommendedImageIds)
      ? Array.from(
          new Set(
            raw.recommendedImageIds
              .map((item) => sanitizeText(item, 128))
              .filter((item) => item && images.some((image) => image.id === item))
              .slice(0, 16)
          )
        )
      : [],
    skuOptions,
    goodsInfo:
      raw.goodsInfo && typeof raw.goodsInfo === "object" && !Array.isArray(raw.goodsInfo)
        ? {
            productName: sanitizeText((raw.goodsInfo as Record<string, unknown>).productName, 255) || null,
            sizeInfo: sanitizeText((raw.goodsInfo as Record<string, unknown>).sizeInfo, 255) || null,
            materialInfo: sanitizeText((raw.goodsInfo as Record<string, unknown>).materialInfo, 255) || null,
            designer: sanitizeText((raw.goodsInfo as Record<string, unknown>).designer, 128) || null,
            buyer: sanitizeText((raw.goodsInfo as Record<string, unknown>).buyer, 128) || null,
            boardType: sanitizeText((raw.goodsInfo as Record<string, unknown>).boardType, 128) || null,
            appearanceSummary:
              sanitizeText((raw.goodsInfo as Record<string, unknown>).appearanceSummary, 255) ||
              null,
          }
        : null,
  };
}

export function createEmptyAgentWorkflowMaterialSelection(): AgentWorkflowMaterialSelectionState {
  return {
    result: null,
    selectedImageIds: [],
  };
}

export function createEmptyAgentWorkflowMaterialSelections(): AgentWorkflowMaterialSelections {
  return {
    primary: createEmptyAgentWorkflowMaterialSelection(),
    secondary: createEmptyAgentWorkflowMaterialSelection(),
  };
}

function normalizeMaterialSelectionState(value: unknown): AgentWorkflowMaterialSelectionState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const result = normalizeMaterialSearchResult(raw.result);
  const validIds = new Set((result?.images || []).map((item) => item.id));
  const selectedImageIds = Array.isArray(raw.selectedImageIds)
    ? Array.from(
        new Set(
          raw.selectedImageIds
            .map((item) => sanitizeText(item, 128))
            .filter((item) => item && validIds.has(item))
            .slice(0, 32)
        )
      )
    : [];

  return {
    result,
    selectedImageIds,
  };
}

export function normalizeAgentWorkflowMaterialSelections(
  value: unknown
): AgentWorkflowMaterialSelections {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    primary: normalizeMaterialSelectionState(raw.primary),
    secondary: normalizeMaterialSelectionState(raw.secondary),
  };
}

export function normalizeAgentWorkflowMaterialApiConfig(
  value: unknown
): AgentWorkflowMaterialApiConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAgentWorkflowMaterialApiConfig;
  }

  const raw = value as Partial<AgentWorkflowMaterialApiConfig>;

  return {
    enabled: raw.enabled === true,
    baseUrl:
      sanitizeText(raw.baseUrl, 255) || defaultAgentWorkflowMaterialApiConfig.baseUrl,
    apiKey: sanitizeText(raw.apiKey, 500),
    productDetailEnabled: raw.productDetailEnabled === true,
    productDetailBaseUrl: sanitizeText(raw.productDetailBaseUrl, 500),
    productDetailApiKey: sanitizeText(raw.productDetailApiKey, 500),
    productDetailPath: sanitizeText(raw.productDetailPath, 500),
    productDetailMethod: raw.productDetailMethod === "POST" ? "POST" : "GET",
    productDetailDefaultChannel:
      raw.productDetailDefaultChannel === "1688" ||
      raw.productDetailDefaultChannel === "douyin" ||
      raw.productDetailDefaultChannel === "jd"
        ? raw.productDetailDefaultChannel
        : "taobao",
    productDetailSyncAnalysis: raw.productDetailSyncAnalysis !== false,
    productDetailForceReanalyze: raw.productDetailForceReanalyze === true,
  };
}

export function normalizeAgentWorkflowMaterialApiConfigForPublic(
  value: unknown
): AgentWorkflowMaterialApiConfig {
  const config = normalizeAgentWorkflowMaterialApiConfig(value);
  return {
    ...config,
    apiKey: "",
    productDetailApiKey: "",
  };
}
