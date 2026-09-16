// Modified for standalone community distribution; see NOTICE.
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ImageIcon, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AgentPreviewImage } from "@/src/components/agents/AgentPreviewImage";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { processInBrowserBatches } from "@/src/client/yield-to-browser";
import { cn } from "@/src/lib/utils";
import type {
  AgentWorkflowMaterialImage,
  AgentWorkflowMaterialQueryType,
  AgentWorkflowMaterialSearchResult,
} from "@/types/agent";

interface AgentWorkflowMaterialPickerProps {
  title?: string;
  description?: string;
  value: string;
  queryMode: AgentWorkflowMaterialQueryType;
  placeholder: string;
  buttonLabel: string;
  searchNote?: string;
  disabled?: boolean;
  disabledHint?: string;
  isLoading?: boolean;
  errorText?: string | null;
  result?: AgentWorkflowMaterialSearchResult | null;
  selectedImageIds: string[];
  selectionLimit?: number | null;
  selectionLimitLabel?: string;
  onValueChange: (value: string) => void;
  onQueryModeChange: (value: AgentWorkflowMaterialQueryType) => void;
  onSearch: () => void;
  onSkuOptionSelect?: (skuName: string) => void;
  onSelectedImageIdsChange: (next: string[]) => void;
  onUploadImage?: (
    file: File,
    options?: {
      replaceImageId?: string;
    }
  ) => Promise<void>;
  onRemoveUploadedImage?: (imageId: string) => void;
  isUploadingNewImage?: boolean;
  uploadingImageId?: string | null;
  appearanceRecognitionEnabled?: boolean;
  theme?: "light" | "dark";
}

const MATERIAL_GRID_VIRTUALIZE_THRESHOLD = 12;
const MATERIAL_GRID_GAP = 12;
const MATERIAL_GRID_MIN_CARD_HEIGHT = 258;
const AGENT_WORKFLOW_OPTIMIZED_RENDER_ENABLED =
  process.env.NEXT_PUBLIC_AGENT_WORKFLOW_OPTIMIZED_RENDER !== "false";

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

function normalizeSkuOptions(
  value: AgentWorkflowMaterialSearchResult["skuOptions"] | unknown
): NonNullable<AgentWorkflowMaterialSearchResult["skuOptions"]> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is NonNullable<AgentWorkflowMaterialSearchResult["skuOptions"]>[number] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }
    return Boolean(String(item.skuName || "").trim());
  });
}

const MaterialImageCard = memo(function MaterialImageCard({
  image,
  selected,
  isDark,
  onToggle,
}: {
  image: AgentWorkflowMaterialImage;
  selected: boolean;
  isDark: boolean;
  onToggle: (imageId: string) => void;
}) {
  const isPlaceholder = !String(image.imageUrl || "").trim();
  const displayImageUrl = String(image.imageUrl || "").trim();
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">(
    isPlaceholder ? "loaded" : "loading"
  );

  useEffect(() => {
    setImageStatus(isPlaceholder ? "loaded" : "loading");
  }, [displayImageUrl, isPlaceholder]);

  return (
    <button
      type="button"
      onClick={() => {
        if (isPlaceholder) return;
        onToggle(image.id);
      }}
      disabled={isPlaceholder}
      className={cn(
        "group overflow-hidden rounded-[24px] border bg-background text-left transition-all",
        isPlaceholder && "cursor-wait",
        selected
          ? isDark
            ? "border-emerald-400/70 bg-white/[0.03] shadow-[0_0_0_1px_rgba(52,211,153,0.2)]"
            : "border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.18)]"
          : isDark
            ? "border-white/12 bg-white/[0.02] hover:border-white/25 hover:shadow-sm"
            : "border-border hover:border-primary/40 hover:shadow-sm"
      )}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden",
          isDark ? "bg-white/[0.04]" : "bg-muted/40"
        )}
      >
        {isPlaceholder ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
            <Loader2 className="h-6 w-6 animate-spin text-white/55" />
            <div className="h-2 w-20 rounded-full bg-white/10" />
            <div className="h-2 w-14 rounded-full bg-white/10" />
          </div>
        ) : (
          <AgentPreviewImage
            src={displayImageUrl}
            alt={image.label}
            className={cn(
              "h-full w-full object-contain transition-opacity duration-300",
              imageStatus === "loaded" ? "opacity-100" : "opacity-0"
            )}
            delivery="proxy"
            eager={selected || image.sortOrder < 4}
            previewWidth={720}
            previewQuality={74}
            onError={() => {
              setImageStatus("error");
            }}
            onLoad={() => setImageStatus("loaded")}
          />
        )}
        {!isPlaceholder && imageStatus !== "loaded" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] px-4 text-center text-white/70">
            {imageStatus === "error" ? (
              <ImageIcon className="h-7 w-7 text-white/45" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-200/80" />
            )}
            <div className="text-xs font-medium">
              {imageStatus === "error" ? "原图暂不可用" : "正在加载原图"}
            </div>
            <div className="max-w-[180px] text-[11px] leading-5 text-white/45">
              {imageStatus === "error"
                ? "原图地址返回异常，可先稍后重试或联系素材服务检查。"
                : "已命中素材，正在直接拉取原图。"}
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2">
          <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
            {isPlaceholder ? "加载中" : image.group === "fixed" ? "固定角度" : "其他图片"}
          </span>
          {!isPlaceholder ? (
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-white transition-colors",
                selected
                  ? isDark
                    ? "border-emerald-400 bg-emerald-400 text-black"
                    : "border-primary bg-primary"
                  : "border-white/60 bg-black/35 opacity-0 group-hover:opacity-100"
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-2 text-[11px] text-white">
          {isPlaceholder ? "白底图加载中..." : image.label}
        </div>
      </div>
      <div className="space-y-1 px-3 py-2">
        <div className={cn("truncate text-xs font-medium", isDark ? "text-white/88" : "")}>
          {isPlaceholder ? "正在获取 SKU 图片..." : image.fileName}
        </div>
        <div className={cn("text-[11px]", isDark ? "text-white/60" : "text-muted-foreground")}>
          {isPlaceholder
            ? "已先展示预览卡位，图片会逐步加载出来。"
            : `系统会先按权重自动选图，你也可以点击${selected ? "取消" : "调整"}。`}
        </div>
      </div>
    </button>
  );
});

function MaterialImageGrid({
  images,
  selectedSet,
  isDark,
  onToggle,
}: {
  images: AgentWorkflowMaterialImage[];
  selectedSet: Set<string>;
  isDark: boolean;
  onToggle: (imageId: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = parentRef.current;
    if (!node || images.length < MATERIAL_GRID_VIRTUALIZE_THRESHOLD) return;
    const updateWidth = () => setContainerWidth(node.clientWidth || 0);
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth, { passive: true });
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [images.length]);

  const columnCount = useMemo(() => {
    if (containerWidth >= 1280) return 4;
    if (containerWidth >= 900) return 3;
    return 2;
  }, [containerWidth]);
  const rowCount = Math.ceil(images.length / columnCount);
  const cardWidth =
    containerWidth > 0
      ? Math.floor((containerWidth - MATERIAL_GRID_GAP * (columnCount - 1)) / columnCount)
      : 240;
  const rowHeight = Math.max(MATERIAL_GRID_MIN_CARD_HEIGHT, cardWidth + 74);
  // Keep hook order stable when SKU loading placeholders and final images cross the virtualization threshold.
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + MATERIAL_GRID_GAP,
    overscan: 2,
  });

  if (
    !AGENT_WORKFLOW_OPTIMIZED_RENDER_ENABLED ||
    images.length < MATERIAL_GRID_VIRTUALIZE_THRESHOLD
  ) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <MaterialImageCard
            key={image.id}
            image={image}
            selected={selectedSet.has(image.id)}
            isDark={isDark}
            onToggle={onToggle}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="agent-dark-scrollbar max-h-[680px] overflow-y-auto pr-1"
      data-agent-workflow-action="scroll-material-images"
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columnCount;
          const rowImages = images.slice(start, start + columnCount);
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 grid w-full gap-3"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowImages.map((image) => (
                <MaterialImageCard
                  key={image.id}
                  image={image}
                  selected={selectedSet.has(image.id)}
                  isDark={isDark}
                  onToggle={onToggle}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentWorkflowMaterialPicker({
  title,
  description,
  value,
  queryMode,
  placeholder,
  buttonLabel,
  searchNote,
  disabled = false,
  disabledHint,
  isLoading = false,
  errorText,
  result,
  selectedImageIds,
  selectionLimit = null,
  selectionLimitLabel = "当前生图模式",
  onValueChange,
  onQueryModeChange,
  onSearch,
  onSkuOptionSelect,
  onSelectedImageIdsChange,
  onUploadImage,
  onRemoveUploadedImage,
  isUploadingNewImage = false,
  uploadingImageId = null,
  appearanceRecognitionEnabled = true,
  theme = "light",
}: AgentWorkflowMaterialPickerProps) {
  const isDark = theme === "dark";
  const hasUploadInFlight = isUploadingNewImage || Boolean(uploadingImageId);
  const canUploadMaterialImage = Boolean(onUploadImage);
  const [previewDisplayMode, setPreviewDisplayMode] = useState<"selected" | "all">("all");
  const [hasManualSelectionInteraction, setHasManualSelectionInteraction] = useState(false);
  const normalizedSelectedImageIds = useMemo(
    () => normalizeImageIdList(selectedImageIds),
    [selectedImageIds]
  );
  const selectedSet = useMemo(
    () => new Set(normalizedSelectedImageIds),
    [normalizedSelectedImageIds]
  );
  const recommendedImageIds = useMemo(
    () =>
      Array.isArray(result?.recommendedImageIds)
        ? result.recommendedImageIds.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
    [result?.recommendedImageIds]
  );
  const allImages = useMemo(
    () => normalizeMaterialImages(result?.images),
    [result?.images]
  );
  const skuOptions = useMemo(
    () => normalizeSkuOptions(result?.skuOptions),
    [result?.skuOptions]
  );
  const uploadedImages = useMemo(
    () =>
      allImages
        .filter((item) => item.sourceType === "upload")
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [allImages]
  );
  const galleryImages = useMemo(
    () => allImages.filter((item) => item.sourceType !== "upload"),
    [allImages]
  );
  const selectedPrimaryImage = useMemo(
    () => allImages.find((item) => selectedSet.has(item.id)) || null,
    [allImages, selectedSet]
  );
  const visibleAppearanceSummary = selectedPrimaryImage
    ? selectedPrimaryImage.appearanceSummary || null
    : allImages[0]?.appearanceSummary || result?.goodsInfo?.appearanceSummary || null;
  const selectedCount = allImages.filter((item) => selectedSet.has(item.id)).length;
  const selectedGalleryCount = galleryImages.filter((item) => selectedSet.has(item.id)).length;
  const resolvedSelectionLimit =
    typeof selectionLimit === "number" && Number.isFinite(selectionLimit) && selectionLimit > 0
      ? Math.max(1, Math.round(selectionLimit))
      : null;
  const hasSelectableImages = Boolean(
    allImages.some((item) => Boolean(String(item.imageUrl || "").trim()))
  );
  const goodsInfoItems = [
    {
      label: "商品名称",
      value: result?.goodsInfo?.productName || null,
      fullWidth: true,
    },
    {
      label: "尺寸信息",
      value: result?.goodsInfo?.sizeInfo || null,
    },
    {
      label: "材质信息",
      value: result?.goodsInfo?.materialInfo || null,
    },
    {
      label: "设计师",
      value: result?.goodsInfo?.designer || null,
    },
    {
      label: "采购负责人",
      value: result?.goodsInfo?.buyer || null,
    },
    {
      label: "板材类型",
      value: result?.goodsInfo?.boardType || null,
    },
    ...(appearanceRecognitionEnabled
      ? [
          {
            label: "外观识别",
            value: visibleAppearanceSummary,
            fullWidth: true,
          },
        ]
      : []),
  ].filter((item) => Boolean(item.value));
  const remainingSelectableCount =
    resolvedSelectionLimit === null ? null : Math.max(resolvedSelectionLimit - selectedCount, 0);
  const remainingUploadSlotCount =
    !canUploadMaterialImage
      ? 0
      : resolvedSelectionLimit === null
        ? 1
        : Math.max(
            resolvedSelectionLimit - selectedGalleryCount - uploadedImages.length,
            0
          );
  const totalImageCount = galleryImages.length;
  const hasSystemRecommendedSelection =
    result?.queryType === "sku" &&
    recommendedImageIds.length > 0 &&
    selectedGalleryCount === recommendedImageIds.length &&
    recommendedImageIds.every((id) => selectedSet.has(id));
  const isAutoSelectedResult =
    Boolean(hasSystemRecommendedSelection) && !hasManualSelectionInteraction;
  const canTogglePreviewMode = totalImageCount > 0;
  const visibleImages = useMemo(() => {
    if (!galleryImages.length) {
      return [];
    }
    if (previewDisplayMode === "selected" && selectedGalleryCount > 0) {
      return galleryImages.filter((image) => selectedSet.has(image.id));
    }
    return galleryImages;
  }, [galleryImages, previewDisplayMode, selectedGalleryCount, selectedSet]);
  const previewResetKey = useMemo(
    () =>
      JSON.stringify({
        queryType: result?.queryType || "",
        matchedSku: result?.matchedSku || "",
        imageIds: galleryImages.map((image) => image.id),
        recommendedImageIds,
      }),
    [galleryImages, recommendedImageIds, result?.matchedSku, result?.queryType]
  );

  useEffect(() => {
    setHasManualSelectionInteraction(false);
  }, [previewResetKey]);

  useEffect(() => {
    if (hasManualSelectionInteraction) {
      return;
    }
    setPreviewDisplayMode("all");
  }, [hasManualSelectionInteraction, previewResetKey]);

  const hasFetchSuccess = !disabled && !isLoading && !errorText && Boolean(result);

  const handleToggleImage = useCallback((imageId: string) => {
    setHasManualSelectionInteraction(true);
    const next = new Set(normalizedSelectedImageIds);
    if (next.has(imageId)) {
      next.delete(imageId);
    } else {
      if (resolvedSelectionLimit !== null && next.size >= resolvedSelectionLimit) {
        toast.error(`${selectionLimitLabel}最多可选择 ${resolvedSelectionLimit} 张图片`);
        return;
      }
      next.add(imageId);
    }
    const nextIds = Array.from(next);
    startTransition(() => {
      onSelectedImageIdsChange(nextIds);
    });
  }, [
    onSelectedImageIdsChange,
    resolvedSelectionLimit,
    normalizedSelectedImageIds,
    selectionLimitLabel,
  ]);

  const handleSelectAll = useCallback(async () => {
    setHasManualSelectionInteraction(true);
    const allIds: string[] = [];
    await processInBrowserBatches(
      allImages,
      (item) => {
        if (String(item.imageUrl || "").trim()) {
          allIds.push(item.id);
        }
      },
      { batchSize: 80 }
    );
    const nextIds =
      resolvedSelectionLimit !== null ? allIds.slice(0, resolvedSelectionLimit) : allIds;
    startTransition(() => {
      onSelectedImageIdsChange(nextIds);
    });
    if (resolvedSelectionLimit !== null && allIds.length > resolvedSelectionLimit) {
      toast.message(`${selectionLimitLabel}最多可选择 ${resolvedSelectionLimit} 张图片，已按上限选取`);
    }
  }, [allImages, onSelectedImageIdsChange, resolvedSelectionLimit, selectionLimitLabel]);

  const handleUploadInputChange = async (
    file: File | null,
    options?: {
      replaceImageId?: string;
    }
  ) => {
    if (!file || !onUploadImage) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }

    try {
      await onUploadImage(file, options);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    }
  };

  const renderUploadPreview = (params: {
    image?: AgentWorkflowMaterialImage | null;
    selected?: boolean;
    isUploading?: boolean;
  }) => {
    const { image, selected = false, isUploading = false } = params;
    const hasImage = Boolean(image?.imageUrl);

    return (
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-[22px] border",
          hasImage
            ? isDark
              ? "border-white/10 bg-white/[0.04]"
              : "border-border bg-muted/20"
            : isDark
              ? "border-dashed border-white/12 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_55%),rgba(255,255,255,0.02)]"
              : "border-dashed border-primary/25 bg-primary/5"
        )}
      >
        {hasImage ? (
          <AgentPreviewImage
            src={image?.imageUrl}
            alt={image?.label || "上传素材"}
            className="h-full w-full object-contain"
            previewWidth={480}
            previewQuality={78}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
            {isUploading ? (
              <Loader2 className={cn("h-7 w-7 animate-spin", isDark ? "text-emerald-200" : "text-primary")} />
            ) : (
              <Upload className={cn("h-7 w-7", isDark ? "text-emerald-200" : "text-primary")} />
            )}
            <div className={cn("text-sm font-medium", isDark ? "text-white/88" : "text-foreground")}>
              {isUploading ? "正在自动抠图" : "上传商品图"}
            </div>
            <div className={cn("text-[11px] leading-5", isDark ? "text-white/55" : "text-muted-foreground")}>
              {isUploading ? "系统会先抠图，再把透明底结果加入候选区。" : "支持 PNG / JPG / WEBP，上传后会自动抠图。"}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2">
          <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
            {hasImage ? "用户上传" : "自动抠图上传"}
          </span>
          {hasImage ? (
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-white transition-colors",
                selected
                  ? isDark
                    ? "border-emerald-400 bg-emerald-400 text-black"
                    : "border-primary bg-primary"
                  : "border-white/60 bg-black/35"
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-2 text-[11px] text-white">
          {hasImage ? image?.fileName || image?.label : isUploading ? "抠图处理中..." : "没有搜索到时也可以直接上传"}
        </div>
      </div>
    );
  };

  return (
    <section
      className={cn(
        "space-y-3 rounded-[24px] border p-4",
        isDark ? "border-white/12 bg-black/20" : "bg-muted/20"
      )}
    >
      {title || description ? (
        <div className="space-y-1">
          {title ? (
            <div className={cn("text-sm font-medium", isDark ? "text-white/92" : "")}>{title}</div>
          ) : null}
          {description ? (
            <div className={cn("text-xs", isDark ? "text-white/62" : "text-muted-foreground")}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["sku", "spu"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onQueryModeChange(mode)}
            disabled={disabled || hasUploadInFlight}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              queryMode === mode
                ? isDark
                  ? "border-emerald-400/45 bg-emerald-500/[0.12] text-emerald-200"
                  : "border-primary bg-primary/10 text-primary"
                : isDark
                  ? "border-white/10 bg-white/[0.03] text-white/58 hover:border-white/20 hover:text-white"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-45"
            )}
          >
            按{mode === "sku" ? "SKU" : "SPU"}搜索
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled || hasUploadInFlight}
            className={cn(
              hasFetchSuccess && "pr-11",
              isDark &&
                "border-white/12 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:ring-emerald-400/30"
            )}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (disabled || hasUploadInFlight) return;
                onSearch();
              }
            }}
          />
          {hasFetchSuccess ? (
            <span className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500/18 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={onSearch}
          disabled={disabled || isLoading || hasUploadInFlight || !value.trim()}
          className={cn(
            isDark &&
              "border-white/12 bg-white/[0.05] text-white/85 hover:bg-white/[0.11] hover:text-white disabled:text-white/40"
          )}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      </div>

      {disabled && disabledHint ? (
        <div
          className={cn(
            "rounded-[20px] border px-3 py-2 text-xs",
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-800"
          )}
        >
          {disabledHint}
        </div>
      ) : null}

      {!disabled && errorText ? (
        <div className="rounded-[20px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errorText}
        </div>
      ) : null}

      {!disabled && canUploadMaterialImage ? (
        <div
          className={cn(
            "space-y-3 rounded-[24px] border p-3",
            isDark ? "border-white/12 bg-white/[0.03]" : "border-border bg-background/70"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <div className={cn("text-sm font-medium", isDark ? "text-white/90" : "text-foreground")}>
                直接上传商品图
              </div>
              <div className={cn("text-xs leading-5", isDark ? "text-white/58" : "text-muted-foreground")}>
                搜索不到合适白底图时，可以直接上传原图。这里只统计商品图，模特图会在后续单独处理；系统会自动抠图后再加入当前候选素材。
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {resolvedSelectionLimit !== null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-white/8 text-white/82" : "bg-muted text-muted-foreground"
                  )}
                >
                  本步骤需 {resolvedSelectionLimit} 张商品图
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/82" : "bg-muted text-muted-foreground"
                )}
              >
                已上传 {uploadedImages.length} 张
              </span>
              {remainingUploadSlotCount > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {resolvedSelectionLimit === null
                    ? "可继续上传"
                    : `还可上传 ${remainingUploadSlotCount} 张`}
                </span>
              ) : null}
            </div>
          </div>

          {uploadedImages.length > 0 || remainingUploadSlotCount > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {uploadedImages.map((image) => {
                const isSelected = selectedSet.has(image.id);
                const isReplacing = uploadingImageId === image.id;
                return (
                  <div
                    key={`uploaded-material-${image.id}`}
                    className={cn(
                      "overflow-hidden rounded-[24px] border transition-all",
                      isSelected
                        ? isDark
                          ? "border-emerald-400/70 bg-white/[0.03] shadow-[0_0_0_1px_rgba(52,211,153,0.2)]"
                          : "border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.18)]"
                        : isDark
                          ? "border-white/12 bg-white/[0.02]"
                          : "border-border bg-background"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleImage(image.id)}
                      className="block w-full text-left"
                    >
                      {renderUploadPreview({
                        image,
                        selected: isSelected,
                        isUploading: isReplacing,
                      })}
                    </button>
                    <div className="grid grid-cols-2 gap-2 px-3 py-3">
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                          isDark
                            ? "border-white/12 bg-white/[0.04] text-white/82 hover:bg-white/[0.10] hover:text-white"
                            : "border-border bg-background text-foreground hover:bg-muted/60",
                          (isReplacing || isLoading) && "pointer-events-none opacity-50"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
                          className="hidden"
                          disabled={isReplacing || isUploadingNewImage || isLoading}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0] || null;
                            event.currentTarget.value = "";
                            void handleUploadInputChange(file, { replaceImageId: image.id });
                          }}
                        />
                        {isReplacing ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        替换
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveUploadedImage?.(image.id)}
                        disabled={isReplacing || isUploadingNewImage || isLoading}
                        className={cn(
                          isDark &&
                            "border-white/12 bg-white/[0.04] text-white/82 hover:bg-white/[0.10] hover:text-white disabled:text-white/35"
                        )}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </div>
                );
              })}

              {Array.from({ length: remainingUploadSlotCount }, (_, index) => (
                <label
                  key={`new-upload-slot-${index + 1}`}
                  className={cn(
                    "block cursor-pointer overflow-hidden rounded-[24px] border transition-all",
                    isDark
                      ? "border-dashed border-emerald-400/25 bg-white/[0.02] hover:border-emerald-300/45"
                      : "border-dashed border-primary/30 bg-primary/5 hover:border-primary/50"
                  )}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
                    className="hidden"
                    disabled={isUploadingNewImage || Boolean(uploadingImageId) || isLoading}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] || null;
                      event.currentTarget.value = "";
                      void handleUploadInputChange(file);
                    }}
                  />
                  {renderUploadPreview({
                    isUploading: isUploadingNewImage && index === 0,
                  })}
                </label>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-[20px] border px-3 py-2 text-xs",
                isDark ? "border-white/10 bg-black/20 text-white/55" : "border-border bg-muted/20 text-muted-foreground"
              )}
            >
              当前上传槽位已满。若要改用用户上传图片，可先取消一张检索图，或删除上面已上传的图片后再补充。
            </div>
          )}
        </div>
      ) : null}

      {!disabled && result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={cn("flex flex-wrap gap-2 text-xs", isDark ? "text-white/52" : "text-muted-foreground")}>
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/82" : "bg-background"
                )}
              >
                命中：{result.matchedSku || result.query}
              </span>
              {result.matchedSpu ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-white/8 text-white/82" : "bg-background"
                  )}
                >
                  SPU：{result.matchedSpu}
                </span>
              ) : null}
              {result.productModel ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-white/8 text-white/82" : "bg-background"
                  )}
                >
                  型号：{result.productModel}
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/82" : "bg-background"
                )}
              >
                检索图 {totalImageCount} 张
              </span>
              {uploadedImages.length > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-white/8 text-white/82" : "bg-background"
                  )}
                >
                  上传图 {uploadedImages.length} 张
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/82" : "bg-background"
                )}
              >
                已选 {selectedCount} 张
              </span>
              {resolvedSelectionLimit !== null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  最多 {resolvedSelectionLimit} 张
                  {remainingSelectableCount !== null ? ` · 还可选 ${remainingSelectableCount} 张` : ""}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canTogglePreviewMode ? (
                <div
                  className={cn(
                    "inline-flex items-center rounded-full border p-1",
                    isDark ? "border-white/12 bg-white/[0.04]" : "border-border bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewDisplayMode("selected")}
                    disabled={selectedGalleryCount === 0}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      previewDisplayMode === "selected"
                        ? isDark
                          ? "bg-emerald-500/[0.16] text-emerald-100"
                          : "bg-primary/12 text-primary"
                        : isDark
                          ? "text-white/60 hover:text-white disabled:text-white/28"
                          : "text-muted-foreground disabled:text-muted-foreground/50"
                    )}
                  >
                    已选 {selectedGalleryCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDisplayMode("all")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      previewDisplayMode === "all"
                        ? isDark
                          ? "bg-white/[0.08] text-white"
                          : "bg-muted text-foreground"
                        : isDark
                          ? "text-white/60 hover:text-white"
                          : "text-muted-foreground"
                    )}
                  >
                    全部 {totalImageCount}
                  </button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={!hasSelectableImages}
                className={cn(
                  isDark &&
                    "border-white/12 bg-white/[0.04] text-white/82 hover:bg-white/[0.10] hover:text-white disabled:text-white/35"
                )}
              >
                全选
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setHasManualSelectionInteraction(true);
                  startTransition(() => {
                    onSelectedImageIdsChange([]);
                  });
                }}
                disabled={selectedCount === 0 && !hasSelectableImages}
                className={cn(
                  isDark &&
                    "border-white/12 bg-white/[0.04] text-white/82 hover:bg-white/[0.10] hover:text-white disabled:text-white/35"
                )}
              >
                清空已选
              </Button>
            </div>
          </div>

          {goodsInfoItems.length > 0 ? (
            <div
              className={cn(
                "grid gap-2 rounded-[24px] border p-3",
                isDark
                  ? "border-white/12 bg-white/[0.03]"
                  : "border-border bg-background/70",
                "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              )}
            >
              {goodsInfoItems.map((item) => (
                <div
                  key={`goods-info-${item.label}`}
                  className={cn(
                    "rounded-[18px] border px-3 py-2",
                    isDark ? "border-white/8 bg-black/20" : "border-border bg-muted/30",
                    item.fullWidth ? "md:col-span-2 xl:col-span-3" : ""
                  )}
                >
                  <div className={cn("text-[11px]", isDark ? "text-white/45" : "text-muted-foreground")}>
                    {item.label}
                  </div>
                  <div className={cn("mt-1 text-sm font-medium leading-6", isDark ? "text-white/90" : "text-foreground")}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {skuOptions.length ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {skuOptions.map((option) => (
                <div
                  key={`${option.skuName}-${option.skuId || "sku"}`}
                  className={cn(
                    "overflow-hidden rounded-[24px] border transition-all",
                    isDark
                      ? "border-white/12 bg-white/[0.02] hover:border-white/22"
                      : "border-border bg-background"
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className={cn(
                        "h-16 w-16 overflow-hidden rounded-2xl border",
                        isDark ? "border-white/10 bg-white/[0.03]" : "border-border bg-muted/40"
                      )}
                    >
                      {option.previewImageUrl ? (
                        <AgentPreviewImage
                          src={option.previewImageUrl}
                          alt={option.previewFileName || option.skuName}
                          className="h-full w-full object-cover"
                          previewWidth={230}
                          previewQuality={72}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-sm font-medium", isDark ? "text-white/92" : "")}>
                        {option.skuName}
                      </div>
                      <div className={cn("mt-1 text-[11px]", isDark ? "text-white/62" : "text-muted-foreground")}>
                        {option.hasWhiteBackground
                          ? `已有 ${option.whiteBackgroundCount} 张白底图`
                          : "暂无白底图"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!option.hasWhiteBackground}
                      onClick={() => onSkuOptionSelect?.(option.skuName)}
                      className={cn(
                        isDark &&
                          "border-white/12 bg-white/[0.04] text-white/88 hover:bg-white/[0.10] hover:text-white disabled:text-white/35"
                      )}
                    >
                      选择SKU
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {totalImageCount > 0 ? (
            <div className="space-y-3">
              {isAutoSelectedResult || canTogglePreviewMode ? (
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-[20px] border px-3 py-2.5",
                    isDark
                      ? "border-emerald-500/18 bg-emerald-500/[0.06] text-emerald-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  <div className="text-xs leading-5">
                    {previewDisplayMode === "selected"
                      ? `当前优先展示已选中的 ${selectedGalleryCount} 张检索图，便于你快速确认结果。`
                      : `当前展示全部 ${totalImageCount} 张候选图片，可继续手动微调选图。`}
                  </div>
                  {canTogglePreviewMode ? (
                    <div className="text-[11px] text-emerald-100/72">
                      在上方切换“已选 / 全部”即可，无需再单独收起预览。
                    </div>
                  ) : null}
                </div>
              ) : null}

              {visibleImages.length > 0 ? (
                <MaterialImageGrid
                  images={visibleImages}
                  selectedSet={selectedSet}
                  isDark={isDark}
                  onToggle={handleToggleImage}
                />
              ) : (
                <div
                  className={cn(
                    "flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-dashed px-4 text-center",
                    isDark
                      ? "border-white/12 bg-white/[0.03] text-white/55"
                      : "border-border bg-background/60 text-muted-foreground"
                  )}
                >
                  <div className="text-sm font-medium">
                    当前没有可展示的已选图片
                  </div>
                  <div className="mt-2 text-xs">
                    切换到“全部 {totalImageCount}”可查看全部候选图片并重新调整。
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-[124px] flex-col items-center justify-center rounded-[24px] border border-dashed px-4 text-center text-sm",
            isDark
              ? "border-white/12 bg-white/[0.03] text-white/56"
              : "bg-background/60 text-muted-foreground"
          )}
        >
          {disabled ? (
            <>
              <ImageIcon className="mb-2 h-5 w-5 opacity-60" />
              先选择 Agent 模板，再搜索并选择素材图。
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="mb-2 h-5 w-5 animate-spin" />
              正在搜索并导入图片，请稍候...
            </>
          ) : (
            <>
              <ImageIcon className="mb-2 h-5 w-5 opacity-60" />
              {value.trim() ? "输入后点击搜索，从素材库拉取白底图。" : "先输入关键词，再搜索素材图。"}
            </>
          )}
        </div>
      )}

      {(allImages.length || skuOptions.length) ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-[20px] px-3 py-2 text-xs",
            isDark ? "bg-white/[0.04] text-white/60" : "bg-background text-muted-foreground"
          )}
        >
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {skuOptions.length
            ? "当前是 SPU 命中结果，请先选择具体 SKU，再继续拉取白底图。"
            : totalImageCount > 0
              ? "白底图会先按权重自动选入槽位，如需微调仍可手动调整。"
              : "上传后的抠图结果会直接并入当前候选素材，并自动带入后续生图槽位。"}
        </div>
      ) : null}
    </section>
  );
}
