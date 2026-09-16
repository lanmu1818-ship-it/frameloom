// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AgentWorkflowMaterialPicker } from "@/src/components/agents/AgentWorkflowMaterialPicker";
import { ClientErrorBoundary } from "@/src/components/ui/client-error-boundary";
import { Switch } from "@/src/components/ui/switch";
import { createEmptyAgentWorkflowMaterialSelection } from "@/src/lib/agents/workflow-material-config";
import { apiFetch } from "@/src/client/api";
import { cn } from "@/src/lib/utils";
import type { AgentWorkflowInputs } from "@/src/components/agents/AgentWorkflowPanel";
import type {
  AgentWorkflowMaterialImage,
  AgentWorkflowMaterialSearchResult,
  AgentWorkflowMaterialQueryType,
  AgentWorkflowMaterialSelections,
} from "@/types/agent";

interface AgentWorkflowMaterialSelectionPanelProps {
  inputs: AgentWorkflowInputs;
  onInputsChange: (next: AgentWorkflowInputs) => void;
  materials: AgentWorkflowMaterialSelections;
  onMaterialsChange: (next: AgentWorkflowMaterialSelections) => void;
  appearanceRecognitionEnabled?: boolean;
  onAppearanceRecognitionEnabledChange?: (next: boolean) => void;
  productSelectionLimit?: number | null;
  totalUploadRequirement?: number | null;
  modelImageRequirement?: number | null;
  title?: string;
  description?: string;
  disabled?: boolean;
  disabledHint?: string;
  theme?: "light" | "dark";
}

function normalizeImageIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeMaterialImages(value: unknown): AgentWorkflowMaterialImage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is AgentWorkflowMaterialImage => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }
    const image = item as Partial<AgentWorkflowMaterialImage>;
    return Boolean(String(image.id || "").trim());
  });
}

function normalizeMaterialSearchResult(
  result?: AgentWorkflowMaterialSearchResult | null
): AgentWorkflowMaterialSearchResult | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }

  return {
    ...result,
    images: normalizeMaterialImages(result.images),
    recommendedImageIds: normalizeImageIdList(result.recommendedImageIds),
    skuOptions: Array.isArray(result.skuOptions)
      ? result.skuOptions.filter((item) => Boolean(String(item?.skuName || "").trim()))
      : [],
  };
}

function normalizeMaterialSelections(
  value: AgentWorkflowMaterialSelections
): AgentWorkflowMaterialSelections {
  return {
    primary: {
      result: normalizeMaterialSearchResult(value?.primary?.result),
      selectedImageIds: normalizeImageIdList(value?.primary?.selectedImageIds),
    },
    secondary: {
      result: normalizeMaterialSearchResult(value?.secondary?.result),
      selectedImageIds: normalizeImageIdList(value?.secondary?.selectedImageIds),
    },
  };
}

function getUploadedWorkflowMaterialImages(
  result?: AgentWorkflowMaterialSearchResult | null
): AgentWorkflowMaterialImage[] {
  return Array.isArray(result?.images)
    ? result.images
        .filter((item) => item.sourceType === "upload")
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
}

function getSelectedWorkflowMaterialImages(params: {
  result?: AgentWorkflowMaterialSearchResult | null;
  selectedImageIds: string[];
}): AgentWorkflowMaterialImage[] {
  const selectedIds = new Set(
    normalizeImageIdList(params.selectedImageIds)
  );
  if (!params.result || selectedIds.size === 0) {
    return [];
  }

  return normalizeMaterialImages(params.result.images).filter((image) =>
    selectedIds.has(image.id)
  );
}

function syncWorkflowMaterialAppearanceSummary(params: {
  result?: AgentWorkflowMaterialSearchResult | null;
  selectedImageIds: string[];
  appearanceSummary?: string | null;
  imageId?: string | null;
}): AgentWorkflowMaterialSearchResult | null | undefined {
  const result = params.result;
  if (!result) {
    return result;
  }

  const selectedImages = getSelectedWorkflowMaterialImages({
    result,
    selectedImageIds: params.selectedImageIds,
  });
  const targetImage =
    (params.imageId
      ? selectedImages.find((image) => image.id === params.imageId)
      : selectedImages[0]) || null;

  if (!targetImage) {
    return result;
  }

  const nextSummary = String(
    params.appearanceSummary ?? targetImage.appearanceSummary ?? ""
  ).trim();
  const currentGoodsSummary = String(result.goodsInfo?.appearanceSummary || "").trim();

  if (!nextSummary) {
    if (!currentGoodsSummary) {
      return result;
    }
    return {
      ...result,
      goodsInfo: result.goodsInfo
        ? {
            ...result.goodsInfo,
            appearanceSummary: null,
          }
        : null,
    };
  }

  let changed = false;
  const nextImages = normalizeMaterialImages(result.images).map((image) => {
    if (image.id !== targetImage.id) {
      return image;
    }
    if (String(image.appearanceSummary || "").trim() === nextSummary) {
      return image;
    }
    changed = true;
    return {
      ...image,
      appearanceSummary: nextSummary,
    };
  });
  const nextGoodsInfo =
    currentGoodsSummary === nextSummary && result.goodsInfo
      ? result.goodsInfo
      : {
          ...(result.goodsInfo || {}),
          appearanceSummary: nextSummary,
        };
  if (currentGoodsSummary !== nextSummary) {
    changed = true;
  }

  if (!changed) {
    return result;
  }

  return {
    ...result,
    images: nextImages,
    goodsInfo: nextGoodsInfo,
  };
}

function markSearchWorkflowMaterialImages(
  images: AgentWorkflowMaterialImage[]
): AgentWorkflowMaterialImage[] {
  return images.map((image) => ({
    ...image,
    sourceType: image.sourceType === "upload" ? "upload" : "search",
  }));
}

function buildWorkflowMaterialResult(params: {
  currentResult?: AgentWorkflowMaterialSearchResult | null;
  images: AgentWorkflowMaterialImage[];
  fallbackQuery: string;
  fallbackQueryType: AgentWorkflowMaterialQueryType;
}): AgentWorkflowMaterialSearchResult {
  const normalizedImages: AgentWorkflowMaterialImage[] = params.images.map((image, index) => ({
    ...image,
    sourceType: image.sourceType === "upload" ? "upload" : "search",
    sortOrder: index,
  }));
  const validIds = new Set(normalizedImages.map((image) => image.id));
  const normalizedQuery = params.fallbackQuery.trim().toUpperCase();
  const currentResult = params.currentResult;
  const queryType = currentResult?.queryType || params.fallbackQueryType;
  const hasUploadedImages = normalizedImages.some((image) => image.sourceType === "upload");
  const fallbackMatchedSku =
    queryType === "sku"
      ? currentResult?.matchedSku || normalizedQuery || "手动上传素材"
      : currentResult?.matchedSku || (hasUploadedImages ? "手动上传素材" : "");
  const fallbackMatchedSpu =
    currentResult?.matchedSpu ||
    (queryType === "spu" ? normalizedQuery || (hasUploadedImages ? "手动上传素材" : "") : null);

  return {
    query: currentResult?.query || normalizedQuery || "手动上传素材",
    queryType,
    matchedSku: currentResult?.matchedSku || fallbackMatchedSku,
    matchedSpu: fallbackMatchedSpu,
    materialId: currentResult?.materialId || null,
    productModel:
      currentResult?.productModel ||
      fallbackMatchedSpu ||
      currentResult?.matchedSku ||
      fallbackMatchedSku ||
      null,
    zipUrl: currentResult?.zipUrl || null,
    fixedCount:
      normalizedImages.length > 0
        ? normalizedImages.filter((image) => image.group === "fixed").length
        : currentResult?.fixedCount || 0,
    otherCount:
      normalizedImages.length > 0
        ? normalizedImages.filter((image) => image.group === "other").length
        : currentResult?.otherCount || 0,
    totalCount:
      normalizedImages.length > 0
        ? normalizedImages.length
        : currentResult?.totalCount || 0,
    images: normalizedImages,
    recommendedImageIds: Array.isArray(currentResult?.recommendedImageIds)
      ? currentResult!.recommendedImageIds.filter((id) => validIds.has(id))
      : [],
    skuOptions: currentResult?.skuOptions || [],
    goodsInfo: currentResult?.goodsInfo || null,
  };
}

function finalizeWorkflowMaterialResult(
  result: AgentWorkflowMaterialSearchResult | null
): AgentWorkflowMaterialSearchResult | null {
  if (!result) return null;
  const hasImages = Array.isArray(result.images) && result.images.length > 0;
  const hasSkuOptions = Array.isArray(result.skuOptions) && result.skuOptions.length > 0;
  return hasImages || hasSkuOptions ? result : null;
}

function mergeSearchResultWithUploadedImages(params: {
  searchResult: AgentWorkflowMaterialSearchResult;
  currentResult?: AgentWorkflowMaterialSearchResult | null;
}): AgentWorkflowMaterialSearchResult {
  const uploadedImages = getUploadedWorkflowMaterialImages(params.currentResult);
  const searchImages = markSearchWorkflowMaterialImages(
    normalizeMaterialImages(params.searchResult.images)
  );
  return buildWorkflowMaterialResult({
    currentResult: {
      ...params.searchResult,
      images: [...uploadedImages, ...searchImages],
    },
    images: [...uploadedImages, ...searchImages],
    fallbackQuery: params.searchResult.query,
    fallbackQueryType: params.searchResult.queryType === "spu" ? "spu" : "sku",
  });
}

function MaterialPickerErrorFallback({
  isDark,
  title,
}: {
  isDark: boolean;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-5 text-sm leading-6",
        isDark
          ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-50"
          : "border-amber-200 bg-amber-50 text-amber-900"
      )}
    >
      <div className="font-medium">{title}暂时无法渲染</div>
      <div className={cn("mt-1 text-xs", isDark ? "text-amber-50/70" : "text-amber-800/75")}>
        已拦截本次客户端异常，避免整个 Agent 工作台崩溃。请修改搜索词或刷新后重试。
      </div>
    </div>
  );
}

export function AgentWorkflowMaterialSelectionPanel({
  inputs,
  onInputsChange,
  materials: rawMaterials,
  onMaterialsChange,
  appearanceRecognitionEnabled = false,
  onAppearanceRecognitionEnabledChange,
  productSelectionLimit = null,
  totalUploadRequirement = null,
  modelImageRequirement = 0,
  title,
  description,
  disabled = false,
  disabledHint = "请先在下方选择一个生图模式，再启用 SKU / SPU 搜图。",
  theme = "light",
}: AgentWorkflowMaterialSelectionPanelProps) {
  const materials = useMemo(
    () => normalizeMaterialSelections(rawMaterials),
    [rawMaterials]
  );
  const hasSecondaryMaterialContent =
    Boolean(String(inputs.secondarySku || "").trim()) ||
    Boolean(materials.secondary.result) ||
    materials.secondary.selectedImageIds.length > 0;

  const buildLoadingMaterialResult = (params: {
    keyword: string;
    currentResult?: AgentWorkflowMaterialSearchResult | null;
    placeholderCount: number;
  }): AgentWorkflowMaterialSearchResult => {
    const count = Math.max(4, Math.min(params.placeholderCount || 8, 16));
    return {
      query: params.keyword,
      queryType: "sku",
      matchedSku: params.keyword,
      matchedSpu: params.currentResult?.matchedSpu || null,
      materialId: params.currentResult?.materialId || null,
      productModel: params.currentResult?.productModel || null,
      zipUrl: null,
      fixedCount: count,
      otherCount: 0,
      totalCount: count,
      skuOptions: [],
      recommendedImageIds: [],
      images: Array.from({ length: count }, (_, index) => ({
        id: `loading-${params.keyword}-${index + 1}`,
        key: `loading-${params.keyword}-${index + 1}`,
        label: `加载中 ${index + 1}`,
        fileName: `正在加载白底图 ${index + 1}`,
        imageUrl: "",
        assetId: null,
        mimeType: null,
        sourceType: "search",
        group: "fixed",
        sortOrder: index,
      })),
    };
  };

  const [materialSearchState, setMaterialSearchState] = useState<{
    primary: { isLoading: boolean; errorText: string | null };
    secondary: { isLoading: boolean; errorText: string | null };
  }>({
    primary: { isLoading: false, errorText: null },
    secondary: { isLoading: false, errorText: null },
  });
  const [materialUploadState, setMaterialUploadState] = useState<{
    primary: { isUploadingNew: boolean; uploadingImageId: string | null };
    secondary: { isUploadingNew: boolean; uploadingImageId: string | null };
  }>({
    primary: { isUploadingNew: false, uploadingImageId: null },
    secondary: { isUploadingNew: false, uploadingImageId: null },
  });
  const [materialSearchMode, setMaterialSearchMode] = useState<{
    primary: AgentWorkflowMaterialQueryType;
    secondary: AgentWorkflowMaterialQueryType;
  }>({
    primary: "sku",
    secondary: "sku",
  });
  const [isSecondaryMaterialVisible, setIsSecondaryMaterialVisible] = useState(
    hasSecondaryMaterialContent
  );
  const latestMaterialsRef = useRef(materials);
  const appearanceRequestRef = useRef<Record<"primary" | "secondary", string>>({
    primary: "",
    secondary: "",
  });
  const normalizedRawProductSelectionLimit =
    typeof productSelectionLimit === "number" && Number.isFinite(productSelectionLimit) && productSelectionLimit > 0
      ? Math.max(1, Math.round(productSelectionLimit))
      : null;
  const normalizedTotalUploadRequirement =
    typeof totalUploadRequirement === "number" &&
    Number.isFinite(totalUploadRequirement) &&
    totalUploadRequirement > 0
      ? Math.max(1, Math.round(totalUploadRequirement))
      : null;
  const normalizedModelImageRequirement =
    typeof modelImageRequirement === "number" && Number.isFinite(modelImageRequirement) && modelImageRequirement > 0
      ? Math.max(0, Math.round(modelImageRequirement))
      : 0;
  const normalizedDerivedProductSelectionLimit =
    normalizedTotalUploadRequirement !== null
      ? Math.max(normalizedTotalUploadRequirement - normalizedModelImageRequirement, 0)
      : null;
  const normalizedProductSelectionLimit =
    normalizedRawProductSelectionLimit !== null
      ? normalizedDerivedProductSelectionLimit !== null &&
        normalizedDerivedProductSelectionLimit > 0 &&
        normalizedDerivedProductSelectionLimit < normalizedRawProductSelectionLimit
        ? normalizedDerivedProductSelectionLimit
        : normalizedRawProductSelectionLimit
      : normalizedDerivedProductSelectionLimit;
  const hasAdjustedProductSelectionLimit =
    normalizedRawProductSelectionLimit !== null &&
    normalizedProductSelectionLimit !== null &&
    normalizedProductSelectionLimit !== normalizedRawProductSelectionLimit;
  const primarySelectedCount = materials.primary.selectedImageIds.length;
  const secondarySelectedCount = materials.secondary.selectedImageIds.length;
  const primarySelectionLimit =
    typeof normalizedProductSelectionLimit === "number" &&
    Number.isFinite(normalizedProductSelectionLimit) &&
    normalizedProductSelectionLimit > 0
      ? Math.max(normalizedProductSelectionLimit - secondarySelectedCount, primarySelectedCount, 0)
      : null;
  const secondarySelectionLimit =
    typeof normalizedProductSelectionLimit === "number" &&
    Number.isFinite(normalizedProductSelectionLimit) &&
    normalizedProductSelectionLimit > 0
      ? Math.max(normalizedProductSelectionLimit - primarySelectedCount, secondarySelectedCount, 0)
      : null;

  useEffect(() => {
    if (hasSecondaryMaterialContent) {
      setIsSecondaryMaterialVisible(true);
    }
  }, [hasSecondaryMaterialContent]);

  useEffect(() => {
    latestMaterialsRef.current = materials;
  }, [materials]);

  const updateMaterialSearchState = (
    source: "primary" | "secondary",
    updates: Partial<{ isLoading: boolean; errorText: string | null }>
  ) => {
    setMaterialSearchState((prev) => ({
      ...prev,
      [source]: {
        ...prev[source],
        ...updates,
      },
    }));
  };

  const updateMaterialUploadState = (
    source: "primary" | "secondary",
    updates: Partial<{ isUploadingNew: boolean; uploadingImageId: string | null }>
  ) => {
    setMaterialUploadState((prev) => ({
      ...prev,
      [source]: {
        ...prev[source],
        ...updates,
      },
    }));
  };

  const getFallbackMaterialQuery = (source: "primary" | "secondary") => {
    const currentResult = materials[source].result;
    const rawInput = String(source === "primary" ? inputs.primarySku : inputs.secondarySku).trim();
    return (currentResult?.query || rawInput || "手动上传素材").trim();
  };

  const getFallbackMaterialQueryType = (source: "primary" | "secondary") => {
    return materials[source].result?.queryType || materialSearchMode[source];
  };

  const ensureSelectedImageAppearanceSummary = async (
    source: "primary" | "secondary"
  ) => {
    if (!appearanceRecognitionEnabled) {
      appearanceRequestRef.current[source] = "";
      return;
    }

    const currentSourceMaterials = latestMaterialsRef.current[source];
    const currentResult = currentSourceMaterials.result;
    const selectedImages = getSelectedWorkflowMaterialImages({
      result: currentResult,
      selectedImageIds: currentSourceMaterials.selectedImageIds,
    });
    const firstSelectedImage = selectedImages[0];

    if (!currentResult || !firstSelectedImage) {
      appearanceRequestRef.current[source] = "";
      return;
    }

    const syncedResult = syncWorkflowMaterialAppearanceSummary({
      result: currentResult,
      selectedImageIds: currentSourceMaterials.selectedImageIds,
    });

    if (syncedResult !== currentResult) {
      const nextMaterials = {
        ...latestMaterialsRef.current,
        [source]: {
          ...currentSourceMaterials,
          result: syncedResult,
        },
      };
      latestMaterialsRef.current = nextMaterials;
      onMaterialsChange(nextMaterials);
    }

    if (!String(firstSelectedImage.imageUrl || "").trim()) {
      appearanceRequestRef.current[source] = "";
      return;
    }

    if (String(firstSelectedImage.appearanceSummary || "").trim()) {
      appearanceRequestRef.current[source] = "";
      return;
    }

    const requestKey = `${firstSelectedImage.id}:${firstSelectedImage.imageUrl}`;
    if (appearanceRequestRef.current[source] === requestKey) {
      return;
    }
    appearanceRequestRef.current[source] = requestKey;

    try {
      const response = await apiFetch("/api/agent-workflow/material-appearance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: firstSelectedImage.imageUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      const appearanceSummary = String(payload?.data?.appearanceSummary || "").trim();

      if (!response.ok || !payload?.success || !appearanceSummary) {
        return;
      }

      const latestSourceMaterials = latestMaterialsRef.current[source];
      const latestSelectedImages = getSelectedWorkflowMaterialImages({
        result: latestSourceMaterials.result,
        selectedImageIds: latestSourceMaterials.selectedImageIds,
      });
      const latestFirstSelectedImage = latestSelectedImages[0];

      if (!latestFirstSelectedImage || latestFirstSelectedImage.id !== firstSelectedImage.id) {
        return;
      }

      const nextResult = syncWorkflowMaterialAppearanceSummary({
        result: latestSourceMaterials.result,
        selectedImageIds: latestSourceMaterials.selectedImageIds,
        appearanceSummary,
        imageId: latestFirstSelectedImage.id,
      });
      if (nextResult === latestSourceMaterials.result) {
        return;
      }

      const nextMaterials = {
        ...latestMaterialsRef.current,
        [source]: {
          ...latestSourceMaterials,
          result: nextResult,
        },
      };
      latestMaterialsRef.current = nextMaterials;
      onMaterialsChange(nextMaterials);
    } finally {
      if (appearanceRequestRef.current[source] === requestKey) {
        appearanceRequestRef.current[source] = "";
      }
    }
  };

  const primaryAppearanceSyncKey = [
    materials.primary.selectedImageIds.join("|"),
    (materials.primary.result?.images || [])
      .map((image) => `${image.id}:${String(image.appearanceSummary || "").trim()}`)
      .join("|"),
    String(materials.primary.result?.goodsInfo?.appearanceSummary || "").trim(),
  ].join("::");
  const secondaryAppearanceSyncKey = [
    materials.secondary.selectedImageIds.join("|"),
    (materials.secondary.result?.images || [])
      .map((image) => `${image.id}:${String(image.appearanceSummary || "").trim()}`)
      .join("|"),
    String(materials.secondary.result?.goodsInfo?.appearanceSummary || "").trim(),
  ].join("::");

  useEffect(() => {
    void ensureSelectedImageAppearanceSummary("primary");
  }, [appearanceRecognitionEnabled, primaryAppearanceSyncKey]);

  useEffect(() => {
    void ensureSelectedImageAppearanceSummary("secondary");
  }, [appearanceRecognitionEnabled, secondaryAppearanceSyncKey]);

  const handleMaterialInputChange = (source: "primary" | "secondary", value: string) => {
    const inputKey = source === "primary" ? "primarySku" : "secondarySku";
    const trimmedValue = value.trim().toUpperCase();
    const currentQuery = String(materials[source]?.result?.query || "").trim().toUpperCase();

    onInputsChange({
      ...inputs,
      [inputKey]: value,
    });

    if (
      trimmedValue !== currentQuery &&
      (materials[source]?.result || materials[source]?.selectedImageIds.length)
    ) {
      onMaterialsChange({
        ...materials,
        [source]: createEmptyAgentWorkflowMaterialSelection(),
      });
    }

    if (materialSearchState[source].errorText) {
      updateMaterialSearchState(source, { errorText: null });
    }
  };

  const handleSearchMaterials = async (
    source: "primary" | "secondary",
    options?: {
      keyword?: string;
      queryType?: AgentWorkflowMaterialQueryType;
    }
  ) => {
    const keyword = String(options?.keyword || (source === "primary" ? inputs.primarySku : inputs.secondarySku)).trim();
    const queryType = options?.queryType || materialSearchMode[source];
    if (!keyword) {
      updateMaterialSearchState(source, { errorText: "请先输入搜索关键词" });
      return;
    }

    try {
      updateMaterialSearchState(source, { isLoading: true, errorText: null });
      const searchParams = new URLSearchParams({
        keyword,
        source,
        queryType,
      });
      const currentSelectionLimit =
        source === "primary" ? primarySelectionLimit : secondarySelectionLimit;
      const requiredCount =
        typeof currentSelectionLimit === "number" &&
        Number.isFinite(currentSelectionLimit) &&
        currentSelectionLimit > 0
          ? Math.round(currentSelectionLimit)
          : null;
      if (requiredCount) {
        searchParams.set("requiredCount", String(requiredCount));
      }
      searchParams.set(
        "appearanceRecognitionEnabled",
        appearanceRecognitionEnabled ? "true" : "false"
      );
      const response = await apiFetch(
        `/api/agent-workflow/material-search?${searchParams.toString()}`,
        { cache: "no-store" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error?.message || result?.error || "搜索失败");
      }

      const mergedResult = mergeSearchResultWithUploadedImages({
        searchResult: result.data,
        currentResult: materials[source].result,
      });
      const preservedUploadedIds = getUploadedWorkflowMaterialImages(materials[source].result)
        .map((image) => image.id)
        .filter((id) => materials[source].selectedImageIds.includes(id));

      onMaterialsChange({
        ...materials,
        [source]: {
          result: mergedResult,
          selectedImageIds: Array.from(
            new Set([
              ...(Array.isArray(result.data?.recommendedImageIds)
                ? result.data.recommendedImageIds
                : []),
              ...preservedUploadedIds,
            ])
          ).filter((id) => mergedResult.images.some((image) => image.id === id)),
        },
      });
    } catch (error) {
      updateMaterialSearchState(source, {
        errorText: error instanceof Error ? error.message : "搜索失败",
      });
    } finally {
      updateMaterialSearchState(source, { isLoading: false });
    }
  };

  const handleUploadMaterialImage = async (
    source: "primary" | "secondary",
    file: File,
    options?: {
      replaceImageId?: string;
    }
  ) => {
    const currentResult = materials[source].result;
    const query = getFallbackMaterialQuery(source);
    const queryType = getFallbackMaterialQueryType(source);
    const matchedSku =
      currentResult?.matchedSku ||
      (queryType === "sku"
        ? String(source === "primary" ? inputs.primarySku : inputs.secondarySku).trim().toUpperCase()
        : "");
    const matchedSpu =
      currentResult?.matchedSpu ||
      (queryType === "spu"
        ? String(source === "primary" ? inputs.primarySku : inputs.secondarySku).trim().toUpperCase()
        : "");

    updateMaterialUploadState(source, {
      isUploadingNew: !options?.replaceImageId,
      uploadingImageId: options?.replaceImageId || null,
    });

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("source", source);
      formData.set("query", query);
      formData.set("queryType", queryType);
      if (matchedSku) {
        formData.set("matchedSku", matchedSku);
      }
      if (matchedSpu) {
        formData.set("matchedSpu", matchedSpu);
      }
      if (currentResult?.productModel) {
        formData.set("productModel", currentResult.productModel);
      }
      formData.set(
        "appearanceRecognitionEnabled",
        appearanceRecognitionEnabled ? "true" : "false"
      );

      const response = await apiFetch("/api/agent-workflow/material-upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.success || !payload?.data?.imageUrl) {
        throw new Error(payload?.detail || payload?.error || "图片上传失败");
      }

      const uploadedImage = payload.data as AgentWorkflowMaterialImage;
      const currentUploads = getUploadedWorkflowMaterialImages(currentResult).filter(
        (image) => image.id !== options?.replaceImageId
      );
      const searchImages = markSearchWorkflowMaterialImages(
        (currentResult?.images || []).filter((image) => image.sourceType !== "upload")
      );
      const nextResult = buildWorkflowMaterialResult({
        currentResult,
        images: [...currentUploads, { ...uploadedImage, sourceType: "upload" }, ...searchImages],
        fallbackQuery: query,
        fallbackQueryType: queryType,
      });
      const nextSelectedIds = Array.from(
        new Set([
          ...materials[source].selectedImageIds.filter(
            (id) => id !== options?.replaceImageId && nextResult.images.some((image) => image.id === id)
          ),
          uploadedImage.id,
        ])
      );

      onMaterialsChange({
        ...materials,
        [source]: {
          result: nextResult,
          selectedImageIds: nextSelectedIds,
        },
      });
    } finally {
      updateMaterialUploadState(source, {
        isUploadingNew: false,
        uploadingImageId: null,
      });
    }
  };

  const handleRemoveUploadedMaterialImage = (
    source: "primary" | "secondary",
    imageId: string
  ) => {
    const currentResult = materials[source].result;
    if (!currentResult) {
      return;
    }

    const nextUploads = getUploadedWorkflowMaterialImages(currentResult).filter(
      (image) => image.id !== imageId
    );
    const searchImages = markSearchWorkflowMaterialImages(
      (currentResult.images || []).filter((image) => image.sourceType !== "upload")
    );
    const nextResult = finalizeWorkflowMaterialResult(
      buildWorkflowMaterialResult({
        currentResult,
        images: [...nextUploads, ...searchImages],
        fallbackQuery: getFallbackMaterialQuery(source),
        fallbackQueryType: getFallbackMaterialQueryType(source),
      })
    );

    onMaterialsChange({
      ...materials,
      [source]: {
        result: nextResult,
        selectedImageIds: materials[source].selectedImageIds.filter(
          (id) => id !== imageId && (nextResult?.images || []).some((image) => image.id === id)
        ),
      },
    });
  };
  const isDark = theme === "dark";
  const selectionLimitLabel =
    normalizedProductSelectionLimit !== null
      ? normalizedModelImageRequirement > 0
        ? `当前步骤商品图上限 ${normalizedProductSelectionLimit} 张（模特图 ${normalizedModelImageRequirement} 张另算）`
        : `当前步骤商品图上限 ${normalizedProductSelectionLimit} 张`
      : undefined;

  return (
    <div
      className={cn(
        "space-y-3 rounded-[28px] border p-4",
        isDark ? "border-white/12 bg-white/[0.04]" : "border-[#dbe3ff] bg-[#f8faff]"
      )}
    >
      {title || description ? (
        <div className="space-y-1">
          {title ? (
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isDark ? "text-white/88" : "text-[#334155]"
              )}
            >
              <Sparkles className={cn("h-4 w-4", isDark ? "text-emerald-300" : "text-[#4f46e5]")} />
              <span>{title}</span>
            </div>
          ) : null}
          {description ? (
            <div
              className={cn(
                "text-xs leading-5",
                isDark ? "text-white/55" : "text-[#5b6472]"
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      {!disabled &&
      (normalizedTotalUploadRequirement !== null ||
        normalizedProductSelectionLimit !== null ||
        normalizedModelImageRequirement > 0) ? (
        <div
          className={cn(
            "rounded-[22px] border px-4 py-3 text-xs leading-6",
            isDark ? "border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {[
            normalizedTotalUploadRequirement !== null
              ? `当前模式共需 ${normalizedTotalUploadRequirement} 张素材`
              : "",
            normalizedProductSelectionLimit !== null
              ? `其中本步骤商品图最多 ${normalizedProductSelectionLimit} 张`
              : "",
            normalizedModelImageRequirement > 0
              ? `模特图 ${normalizedModelImageRequirement} 张在后续单独带入，不占这里的商品图上传位`
              : "",
            hasAdjustedProductSelectionLimit
              ? "已按总素材数扣除模特图后的商品图数量限制上传槽位"
              : "",
          ]
            .filter(Boolean)
            .join("，")}
          。
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-[22px] border px-4 py-3",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-[#dbe3ff] bg-white"
        )}
      >
        <div className="space-y-1">
          <div
            className={cn(
              "text-sm font-medium",
              isDark ? "text-white/88" : "text-[#334155]"
            )}
          >
            产品外观识别
          </div>
          <div
            className={cn(
              "text-xs leading-5",
              isDark ? "text-white/55" : "text-[#64748b]"
            )}
          >
            开启后会用 QWEN3-VL 识别当前选中商品图的外观结构和颜色，并拼进生图提示词；关闭后不会调用识别，也不会加入外观锁定。
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <span
            className={cn(
              "text-[11px] font-medium",
              appearanceRecognitionEnabled
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald-600"
                : isDark
                  ? "text-white/45"
                  : "text-[#94a3b8]"
            )}
          >
            {appearanceRecognitionEnabled ? "已开启" : "已关闭"}
          </span>
          <Switch
            checked={appearanceRecognitionEnabled}
            onCheckedChange={(checked) =>
              onAppearanceRecognitionEnabledChange?.(checked === true)
            }
            disabled={disabled}
            aria-label="切换产品外观识别"
            className={
              isDark
                ? "data-[state=checked]:border-emerald-400/70 data-[state=checked]:bg-emerald-500"
                : undefined
            }
          />
        </div>
      </div>

      <ClientErrorBoundary
        resetKeys={[
          "primary",
          inputs.primarySku,
          materials.primary.result?.matchedSku || "",
          materials.primary.selectedImageIds.join("|"),
        ]}
        fallback={<MaterialPickerErrorFallback isDark={isDark} title="主商品素材搜索" />}
      >
        <AgentWorkflowMaterialPicker
          value={inputs.primarySku}
          queryMode={materialSearchMode.primary}
          placeholder={materialSearchMode.primary === "spu" ? "输入主 SPU" : "输入主 SKU"}
          buttonLabel={materialSearchMode.primary === "spu" ? "查SKU列表" : "搜索主图"}
          searchNote={
            materialSearchMode.primary === "spu"
              ? "按 SPU 搜索时会先返回该 SPU 下的 SKU 列表，点选某个 SKU 后再继续拉取白底图。"
              : "按 SKU 搜索会直接拉取白底图，适合你已经知道具体 SKU 的情况。"
          }
          disabled={disabled}
          disabledHint={disabledHint}
          isLoading={materialSearchState.primary.isLoading}
          errorText={materialSearchState.primary.errorText}
          result={materials.primary.result}
          selectedImageIds={materials.primary.selectedImageIds}
          appearanceRecognitionEnabled={appearanceRecognitionEnabled}
          selectionLimit={primarySelectionLimit}
          selectionLimitLabel={selectionLimitLabel}
          onValueChange={(value) => handleMaterialInputChange("primary", value)}
          onQueryModeChange={(nextMode) =>
            setMaterialSearchMode((prev) => ({
              ...prev,
              primary: nextMode,
            }))
          }
          onSearch={() => {
            void handleSearchMaterials("primary");
          }}
          onUploadImage={(file, options) => handleUploadMaterialImage("primary", file, options)}
          onRemoveUploadedImage={(imageId) =>
            handleRemoveUploadedMaterialImage("primary", imageId)
          }
          isUploadingNewImage={materialUploadState.primary.isUploadingNew}
          uploadingImageId={materialUploadState.primary.uploadingImageId}
          onSkuOptionSelect={(skuName) => {
            const selectedOption = materials.primary.result?.skuOptions?.find(
              (option) => option.skuName === skuName
            );
            const placeholderCount = selectedOption?.whiteBackgroundCount || 8;
            const uploadedImages = getUploadedWorkflowMaterialImages(materials.primary.result);
            onInputsChange({
              ...inputs,
              primarySku: skuName,
            });
            onMaterialsChange({
              ...materials,
              primary: {
                result: buildWorkflowMaterialResult({
                  currentResult: {
                    ...buildLoadingMaterialResult({
                      keyword: skuName,
                      currentResult: materials.primary.result,
                      placeholderCount,
                    }),
                    images: [
                      ...uploadedImages,
                      ...buildLoadingMaterialResult({
                        keyword: skuName,
                        currentResult: materials.primary.result,
                        placeholderCount,
                      }).images.map((image) => ({
                        ...image,
                        sourceType: "search" as const,
                      })),
                    ],
                  },
                  images: [
                    ...uploadedImages,
                    ...buildLoadingMaterialResult({
                      keyword: skuName,
                      currentResult: materials.primary.result,
                      placeholderCount,
                    }).images.map((image) => ({
                      ...image,
                      sourceType: "search" as const,
                    })),
                  ],
                  fallbackQuery: skuName,
                  fallbackQueryType: "sku",
                }),
                selectedImageIds: materials.primary.selectedImageIds.filter((id) =>
                  uploadedImages.some((image) => image.id === id)
                ),
              },
            });
            setMaterialSearchMode((prev) => ({
              ...prev,
              primary: "sku",
            }));
            void handleSearchMaterials("primary", {
              keyword: skuName,
              queryType: "sku",
            });
          }}
          theme={theme}
          onSelectedImageIdsChange={(next) =>
            onMaterialsChange({
              ...materials,
              primary: {
                ...materials.primary,
                selectedImageIds: next,
              },
            })
          }
        />
      </ClientErrorBoundary>

      {isSecondaryMaterialVisible ? (
        <ClientErrorBoundary
          resetKeys={[
            "secondary",
            inputs.secondarySku,
            materials.secondary.result?.matchedSku || "",
            materials.secondary.selectedImageIds.join("|"),
          ]}
          fallback={<MaterialPickerErrorFallback isDark={isDark} title="搭配商品素材搜索" />}
        >
          <AgentWorkflowMaterialPicker
            value={inputs.secondarySku}
            queryMode={materialSearchMode.secondary}
            placeholder={materialSearchMode.secondary === "spu" ? "输入搭配 SPU" : "输入搭配 SKU"}
            buttonLabel={materialSearchMode.secondary === "spu" ? "查SKU列表" : "搜索搭配图"}
            searchNote={
              materialSearchMode.secondary === "spu"
                ? "按 SPU 搜索时会先返回该 SPU 下的 SKU 列表，再选具体 SKU 获取白底图。"
                : "选中的搭配图会进入第二个产品槽位，你也可以在下面继续手动替换。"
            }
            disabled={disabled}
            disabledHint={disabledHint}
            isLoading={materialSearchState.secondary.isLoading}
            errorText={materialSearchState.secondary.errorText}
            result={materials.secondary.result}
            selectedImageIds={materials.secondary.selectedImageIds}
            appearanceRecognitionEnabled={appearanceRecognitionEnabled}
            selectionLimit={secondarySelectionLimit}
            selectionLimitLabel={selectionLimitLabel}
            onValueChange={(value) => handleMaterialInputChange("secondary", value)}
            onQueryModeChange={(nextMode) =>
              setMaterialSearchMode((prev) => ({
                ...prev,
                secondary: nextMode,
              }))
            }
            onSearch={() => {
              void handleSearchMaterials("secondary");
            }}
            onUploadImage={(file, options) => handleUploadMaterialImage("secondary", file, options)}
            onRemoveUploadedImage={(imageId) =>
              handleRemoveUploadedMaterialImage("secondary", imageId)
            }
            isUploadingNewImage={materialUploadState.secondary.isUploadingNew}
            uploadingImageId={materialUploadState.secondary.uploadingImageId}
            onSkuOptionSelect={(skuName) => {
              const selectedOption = materials.secondary.result?.skuOptions?.find(
                (option) => option.skuName === skuName
              );
              const placeholderCount = selectedOption?.whiteBackgroundCount || 8;
              const uploadedImages = getUploadedWorkflowMaterialImages(materials.secondary.result);
              onInputsChange({
                ...inputs,
                secondarySku: skuName,
              });
              onMaterialsChange({
                ...materials,
                secondary: {
                  result: buildWorkflowMaterialResult({
                    currentResult: {
                      ...buildLoadingMaterialResult({
                        keyword: skuName,
                        currentResult: materials.secondary.result,
                        placeholderCount,
                      }),
                      images: [
                        ...uploadedImages,
                        ...buildLoadingMaterialResult({
                          keyword: skuName,
                          currentResult: materials.secondary.result,
                          placeholderCount,
                        }).images.map((image) => ({
                          ...image,
                          sourceType: "search" as const,
                        })),
                      ],
                    },
                    images: [
                      ...uploadedImages,
                      ...buildLoadingMaterialResult({
                        keyword: skuName,
                        currentResult: materials.secondary.result,
                        placeholderCount,
                      }).images.map((image) => ({
                        ...image,
                        sourceType: "search" as const,
                      })),
                    ],
                    fallbackQuery: skuName,
                    fallbackQueryType: "sku",
                  }),
                  selectedImageIds: materials.secondary.selectedImageIds.filter((id) =>
                    uploadedImages.some((image) => image.id === id)
                  ),
                },
              });
              setMaterialSearchMode((prev) => ({
                ...prev,
                secondary: "sku",
              }));
              void handleSearchMaterials("secondary", {
                keyword: skuName,
                queryType: "sku",
              });
            }}
            theme={theme}
            onSelectedImageIdsChange={(next) =>
              onMaterialsChange({
                ...materials,
                secondary: {
                  ...materials.secondary,
                  selectedImageIds: next,
                },
              })
            }
          />
        </ClientErrorBoundary>
      ) : (
        <button
          type="button"
          onClick={() => setIsSecondaryMaterialVisible(true)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-[24px] border border-dashed px-4 py-3 text-left transition-colors",
            disabled
              ? isDark
                ? "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30"
                : "cursor-not-allowed border-[#dbe3ff] bg-[#f8faff] text-[#94a3b8]"
              : isDark
                ? "border-white/14 bg-white/[0.03] text-white/78 hover:border-emerald-300/30 hover:bg-white/[0.05]"
                : "border-[#c7d2fe] bg-white text-[#334155] hover:border-[#818cf8] hover:bg-[#f8faff]"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className={cn("h-4 w-4", isDark ? "text-emerald-300" : "text-[#4f46e5]")} />
              <span>添加搭配SKU</span>
            </div>
            <div className={cn("text-xs leading-5", isDark ? "text-white/45" : "text-[#64748b]")}>
              需要补充第二个产品图时再展开这个模块，不使用时默认保持隐藏。
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              isDark ? "bg-white/[0.06] text-white/72" : "bg-[#eef2ff] text-[#4f46e5]"
            )}
          >
            可选
          </span>
        </button>
      )}
    </div>
  );
}
