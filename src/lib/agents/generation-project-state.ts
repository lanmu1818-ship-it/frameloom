// Modified for standalone community distribution; see NOTICE.
import {
  createEmptyAgentModeWorkspaceState,
  normalizeAgentModeWorkspaceState,
} from "@/src/lib/agents/mode-workspace-state";
import {
  createEmptyAgentWorkflowMaterialSelections,
  normalizeAgentWorkflowMaterialSelections,
} from "@/src/lib/agents/workflow-material-config";
import type {
  AgentGenerationProjectPersistedState,
  AgentGenerationProjectResultCollections,
  AgentGenerationResultModeType,
  AgentGenerationProjectWorkspaceState,
  AgentWorkflowPersistedState,
} from "@/types/agent";

export function createEmptyAgentGenerationProjectWorkspaceState(): AgentGenerationProjectWorkspaceState {
  return {
    input: "",
    attachments: [],
    selectedModelId: "auto",
    imageParams: {
      aspectRatio: "auto",
      imageSize: "2K",
      imageCount: 1,
    },
  };
}

export function createEmptyAgentWorkflowPersistedState(): AgentWorkflowPersistedState {
  return {
    inputs: {
      primarySku: "",
      secondarySku: "",
      brand: "",
      store: "",
      officialSecondCategory: "",
      officialThirdCategory: "",
      thirdCategory: "",
      fourthCategory: "",
      fifthCategory: "",
      priceBand: "",
    },
    materials: createEmptyAgentWorkflowMaterialSelections(),
    appearanceRecognitionEnabled: false,
    selections: {},
    selectedBrandModel: null,
    selectedAgentPresetId: null,
    currentStage: "workflow",
    agentModeState: createEmptyAgentModeWorkspaceState(),
  };
}

export function createEmptyAgentGenerationProjectPersistedState(): AgentGenerationProjectPersistedState {
  return {
    workflowState: createEmptyAgentWorkflowPersistedState(),
    workspaceState: createEmptyAgentGenerationProjectWorkspaceState(),
    resultImageUrls: [],
    resultCollections: {},
    deletedResultCollections: {},
  };
}

function normalizeResultCollections(value: unknown): AgentGenerationProjectResultCollections {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const normalizeUrlList = (input: unknown) =>
    Array.isArray(input)
      ? Array.from(
          new Set(
            input
              .map((item) => String(item || "").trim())
              .filter((item) => /^https?:\/\//i.test(item))
          )
        ).slice(0, 128)
      : [];

  return {
    scene_generation: normalizeUrlList(raw.scene_generation),
    detail_generation: normalizeUrlList(raw.detail_generation),
    detail_replacement: normalizeUrlList(raw.detail_replacement),
    sku_replacement: normalizeUrlList(raw.sku_replacement),
  };
}

function inferLegacyResultModeType(
  workflowState: AgentWorkflowPersistedState,
  resultUrls: string[]
): AgentGenerationResultModeType {
  const detailReferenceCount = workflowState.agentModeState?.detailReplacement?.references?.length || 0;
  const skuReferenceCount = workflowState.agentModeState?.skuReplacement?.references?.length || 0;
  const resultCount = resultUrls.length;

  if (detailReferenceCount > 0 && skuReferenceCount === 0) {
    return "detail_replacement";
  }

  if (skuReferenceCount > 0 && detailReferenceCount === 0) {
    return "sku_replacement";
  }

  if (detailReferenceCount > 0 || skuReferenceCount > 0) {
    const detailGap = Math.abs(resultCount - detailReferenceCount);
    const skuGap = Math.abs(resultCount - skuReferenceCount);
    return detailGap <= skuGap ? "detail_replacement" : "sku_replacement";
  }

  return "scene_generation";
}

function normalizeMigratedResultCollections(params: {
  workflowState: AgentWorkflowPersistedState;
  resultImageUrls: string[];
  resultCollections: AgentGenerationProjectResultCollections;
}) {
  const normalizedSceneUrls = params.resultCollections.scene_generation || [];
  const normalizedDetailGenerationUrls = params.resultCollections.detail_generation || [];
  const normalizedDetailUrls = params.resultCollections.detail_replacement || [];
  const normalizedSkuUrls = params.resultCollections.sku_replacement || [];
  const hasExplicitBuckets =
    normalizedSceneUrls.length > 0 ||
    normalizedDetailGenerationUrls.length > 0 ||
    normalizedDetailUrls.length > 0 ||
    normalizedSkuUrls.length > 0;

  if (!hasExplicitBuckets && params.resultImageUrls.length > 0) {
    const inferredModeType = inferLegacyResultModeType(
      params.workflowState,
      params.resultImageUrls
    );
    return {
      scene_generation:
        inferredModeType === "scene_generation" ? params.resultImageUrls : [],
      detail_replacement:
        inferredModeType === "detail_replacement" ? params.resultImageUrls : [],
      sku_replacement:
        inferredModeType === "sku_replacement" ? params.resultImageUrls : [],
    } satisfies AgentGenerationProjectResultCollections;
  }

  const detailReferenceCount =
    params.workflowState.agentModeState?.detailReplacement?.references?.length || 0;
  const skuReferenceCount =
    params.workflowState.agentModeState?.skuReplacement?.references?.length || 0;

  if (
    normalizedSceneUrls.length > 0 &&
    normalizedDetailUrls.length === 0 &&
    normalizedSkuUrls.length === 0
  ) {
    if (
      detailReferenceCount > 0 &&
      normalizedSceneUrls.length >= Math.max(4, Math.floor(detailReferenceCount * 0.6))
    ) {
      return {
        scene_generation: [],
        detail_generation: [],
        detail_replacement: normalizedSceneUrls,
        sku_replacement: [],
      } satisfies AgentGenerationProjectResultCollections;
    }

    if (
      skuReferenceCount > 0 &&
      normalizedSceneUrls.length >= Math.max(4, Math.floor(skuReferenceCount * 0.6))
    ) {
      return {
        scene_generation: [],
        detail_generation: [],
        detail_replacement: [],
        sku_replacement: normalizedSceneUrls,
      } satisfies AgentGenerationProjectResultCollections;
    }
  }

  return params.resultCollections;
}

function normalizeWorkspaceState(value: unknown): AgentGenerationProjectWorkspaceState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }
          const record = item as Record<string, unknown>;
          const url = String(record.url || "").trim();
          if (!url) return null;
          return {
            url,
            name: String(record.name || "").trim() || null,
            contentType: String(record.contentType || "").trim() || null,
            assetId: String(record.assetId || "").trim() || null,
          };
        })
        .slice(0, 16)
    : [];

  const rawImageParams =
    raw.imageParams && typeof raw.imageParams === "object" && !Array.isArray(raw.imageParams)
      ? (raw.imageParams as Record<string, unknown>)
      : {};

  const imageCount = Number(rawImageParams.imageCount);

  return {
    input: String(raw.input || "").trim(),
    attachments,
    selectedModelId: String(raw.selectedModelId || "").trim() || "auto",
    imageParams: {
      aspectRatio: String(rawImageParams.aspectRatio || "").trim() || "auto",
      imageSize: String(rawImageParams.imageSize || "").trim() || "2K",
      imageCount: Number.isFinite(imageCount) ? Math.max(1, Math.min(8, Math.round(imageCount))) : 1,
    },
  };
}

function normalizeWorkflowState(value: unknown): AgentWorkflowPersistedState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    inputs: {
      primarySku: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).primarySku || "" : "").trim(),
      secondarySku: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).secondarySku || "" : "").trim(),
      brand: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).brand || "" : "").trim(),
      store: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).store || "" : "").trim(),
      officialSecondCategory: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).officialSecondCategory || "" : "").trim(),
      officialThirdCategory: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).officialThirdCategory || "" : "").trim(),
      thirdCategory: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).thirdCategory || "" : "").trim(),
      fourthCategory: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).fourthCategory || "" : "").trim(),
      fifthCategory: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).fifthCategory || "" : "").trim(),
      priceBand: String(raw.inputs && typeof raw.inputs === "object" ? (raw.inputs as Record<string, unknown>).priceBand || "" : "").trim(),
    },
    materials: normalizeAgentWorkflowMaterialSelections(raw.materials),
    appearanceRecognitionEnabled: raw.appearanceRecognitionEnabled === true,
    selections:
      raw.selections && typeof raw.selections === "object" && !Array.isArray(raw.selections)
        ? (raw.selections as Record<string, string>)
        : {},
    selectedBrandModel:
      raw.selectedBrandModel && typeof raw.selectedBrandModel === "object" && !Array.isArray(raw.selectedBrandModel)
        ? {
            ...(raw.selectedBrandModel as Record<string, unknown>),
            brandName: String((raw.selectedBrandModel as Record<string, unknown>).brandName || "").trim(),
            id: String((raw.selectedBrandModel as Record<string, unknown>).id || "").trim(),
            imageUrl: String((raw.selectedBrandModel as Record<string, unknown>).imageUrl || "").trim(),
            assetId: String((raw.selectedBrandModel as Record<string, unknown>).assetId || "").trim() || null,
            displayName: String((raw.selectedBrandModel as Record<string, unknown>).displayName || "").trim() || null,
            mimeType: String((raw.selectedBrandModel as Record<string, unknown>).mimeType || "").trim() || null,
            sortOrder: Number.isFinite(Number((raw.selectedBrandModel as Record<string, unknown>).sortOrder))
              ? Math.max(0, Math.min(999, Math.round(Number((raw.selectedBrandModel as Record<string, unknown>).sortOrder))))
              : 0,
          }
        : null,
    selectedAgentPresetId: String(raw.selectedAgentPresetId || "").trim() || null,
    currentStage: raw.currentStage === "mode" ? "mode" : "workflow",
    agentModeState: normalizeAgentModeWorkspaceState(raw.agentModeState),
  };
}

export function normalizeAgentGenerationProjectPersistedState(
  value: unknown
): AgentGenerationProjectPersistedState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const resultImageUrls = Array.isArray(raw.resultImageUrls)
    ? Array.from(
        new Set(
          raw.resultImageUrls
            .map((item) => String(item || "").trim())
            .filter((item) => /^https?:\/\//i.test(item))
        )
      ).slice(0, 64)
    : [];
  const workflowState = normalizeWorkflowState(raw.workflowState);
  const resultCollections = normalizeMigratedResultCollections({
    workflowState,
    resultImageUrls,
    resultCollections: normalizeResultCollections(raw.resultCollections),
  });
  const deletedResultCollections = normalizeResultCollections(raw.deletedResultCollections);

  return {
    workflowState,
    workspaceState: normalizeWorkspaceState(raw.workspaceState),
    resultImageUrls,
    resultCollections,
    deletedResultCollections,
  };
}
