// Modified for standalone community distribution; see NOTICE.
import type {
  AgentDetailReplacementStrategy,
  AgentDetailReplacementReferenceItem,
  AgentModeReferenceCandidate,
  AgentModeWorkspaceState,
  AgentWorkflowMaterialQueryType,
  AgentWorkflowProductDetailChannel,
  AgentWorkflowReferenceQueryType,
} from "@/types/agent";
import {
  createEmptyAgentDetailBriefForm,
  createEmptyAgentDetailSlots,
  normalizeAgentDetailGenerationMode,
  sanitizeAgentDetailBrief,
} from "@/src/lib/agents/detail-generation-config";

export function createEmptyAgentModeWorkspaceState(): AgentModeWorkspaceState {
  return {
    detailReplacement: {
      method: "reference_replace",
      query: "",
      queryType: "spu",
      productDetailChannel: "taobao",
      replacementStrategy: "scene_replace",
      candidates: [],
      selectedCandidateId: null,
      references: [],
      generationMode: "classic",
      brief: createEmptyAgentDetailBriefForm(),
      slots: createEmptyAgentDetailSlots(),
      progress: {
        status: "idle",
        stage: "",
        current: 0,
        total: 0,
        startedAt: null,
        finishedAt: null,
      },
    },
    skuReplacement: {
      query: "",
      queryType: "sku",
      candidates: [],
      selectedCandidateId: null,
      references: [],
    },
  };
}

function normalizeReferenceItems(value: unknown): AgentDetailReplacementReferenceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const raw =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const id = String(raw.id || "").trim() || `reference-${index + 1}`;
      const label = String(raw.label || "").trim() || `参考图 ${index + 1}`;
      const imageUrl = String(raw.imageUrl || "").trim() || null;
      const previewUrl = String(raw.previewUrl || "").trim() || null;
      const width = Number(raw.width);
      const height = Number(raw.height);
      return {
        id,
        label,
        imageUrl,
        previewUrl,
        width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
        height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
        candidateId: String(raw.candidateId || "").trim() || null,
        sortOrder: Number.isFinite(Number(raw.sortOrder))
          ? Math.max(0, Math.min(999, Math.round(Number(raw.sortOrder))))
          : index,
        passthrough: raw.passthrough === true,
        assignedProductIndex: Number.isFinite(Number(raw.assignedProductIndex))
          ? Math.max(0, Math.min(9, Math.round(Number(raw.assignedProductIndex))))
          : null,
      };
    })
    .filter((item) => Boolean(item.id));
}

function normalizeQueryType(value: unknown, fallback: AgentWorkflowMaterialQueryType) {
  return value === "sku" || value === "spu" ? value : fallback;
}

function normalizeReferenceQueryType(
  value: unknown,
  fallback: AgentWorkflowReferenceQueryType
) {
  return value === "sku" || value === "spu" || value === "productId" ? value : fallback;
}

function normalizeProductDetailChannel(value: unknown): AgentWorkflowProductDetailChannel {
  return value === "1688" || value === "douyin" || value === "jd" ? value : "taobao";
}

function normalizeDetailReplacementStrategy(
  value: unknown
): AgentDetailReplacementStrategy {
  return value === "product_only" ? "product_only" : "scene_replace";
}

function normalizeGenerationSlots(value: unknown) {
  if (!Array.isArray(value)) return createEmptyAgentDetailSlots();
  const base = createEmptyAgentDetailSlots();
  return base.map((_, index) => {
    const item = value[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }
    const raw = item as Record<string, unknown>;
    const url = String(raw.url || "").trim();
    if (!url) return null;
    return {
      url,
      name: String(raw.name || "").trim() || null,
      contentType: String(raw.contentType || "").trim() || null,
      assetId: String(raw.assetId || "").trim() || null,
    };
  });
}

function normalizeGenerationProgress(value: unknown) {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const status =
    raw.status === "running" ||
    raw.status === "done" ||
    raw.status === "error"
      ? raw.status
      : "idle";
  return {
    status,
    stage: String(raw.stage || "").trim(),
    current: Number.isFinite(Number(raw.current)) ? Math.max(0, Math.round(Number(raw.current))) : 0,
    total: Number.isFinite(Number(raw.total)) ? Math.max(0, Math.round(Number(raw.total))) : 0,
    startedAt: String(raw.startedAt || "").trim() || null,
    finishedAt: String(raw.finishedAt || "").trim() || null,
  } as const;
}

function normalizeCandidate(value: unknown, index: number): AgentModeReferenceCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const normalizeUrlList = (input: unknown) =>
    Array.isArray(input)
      ? Array.from(
          new Set(
            input
              .map((item) => String(item || "").trim())
              .filter((item) => /^https?:\/\//i.test(item))
          )
        ).slice(0, 64)
      : [];

  const id = String(raw.id || "").trim() || `candidate-${index + 1}`;

  return {
    id,
    materialId: String(raw.materialId || "").trim() || null,
    taskNo: String(raw.taskNo || "").trim() || null,
    productModel: String(raw.productModel || "").trim() || null,
    brandName: String(raw.brandName || "").trim() || null,
    categoryName: String(raw.categoryName || "").trim() || null,
    shopName: String(raw.shopName || "").trim() || null,
    sceneName: String(raw.sceneName || "").trim() || null,
    uploadedAt: String(raw.uploadedAt || "").trim() || null,
    isFullSet: raw.isFullSet !== false,
    mainImageUrls: normalizeUrlList(raw.mainImageUrls),
    skuImageUrls: normalizeUrlList(raw.skuImageUrls),
    detailImageUrls: normalizeUrlList(raw.detailImageUrls),
    allImageUrls: normalizeUrlList(raw.allImageUrls),
  };
}

function normalizeCandidates(value: unknown): AgentModeReferenceCandidate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => normalizeCandidate(item, index))
    .filter((item): item is AgentModeReferenceCandidate => Boolean(item));
}

export function normalizeAgentModeWorkspaceState(value: unknown): AgentModeWorkspaceState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const detailRaw =
    raw.detailReplacement && typeof raw.detailReplacement === "object" && !Array.isArray(raw.detailReplacement)
      ? (raw.detailReplacement as Record<string, unknown>)
      : {};
  const skuRaw =
    raw.skuReplacement && typeof raw.skuReplacement === "object" && !Array.isArray(raw.skuReplacement)
      ? (raw.skuReplacement as Record<string, unknown>)
      : {};

  return {
    detailReplacement: {
      method: detailRaw.method === "ai_detail_generate" ? "ai_detail_generate" : "reference_replace",
      query: String(detailRaw.query || detailRaw.spuQuery || "").trim(),
      queryType: normalizeReferenceQueryType(detailRaw.queryType, "spu"),
      productDetailChannel: normalizeProductDetailChannel(detailRaw.productDetailChannel),
      replacementStrategy: normalizeDetailReplacementStrategy(
        detailRaw.replacementStrategy
      ),
      candidates: normalizeCandidates(detailRaw.candidates),
      selectedCandidateId: String(detailRaw.selectedCandidateId || "").trim() || null,
      references: normalizeReferenceItems(detailRaw.references),
      generationMode: normalizeAgentDetailGenerationMode(detailRaw.generationMode),
      brief: sanitizeAgentDetailBrief(detailRaw.brief),
      slots: normalizeGenerationSlots(detailRaw.slots),
      progress: normalizeGenerationProgress(detailRaw.progress),
    },
    skuReplacement: {
      query: String(skuRaw.query || skuRaw.spuQuery || "").trim(),
      queryType: normalizeQueryType(skuRaw.queryType, "sku"),
      candidates: normalizeCandidates(skuRaw.candidates),
      selectedCandidateId: String(skuRaw.selectedCandidateId || "").trim() || null,
      references: normalizeReferenceItems(skuRaw.references),
    },
  };
}
