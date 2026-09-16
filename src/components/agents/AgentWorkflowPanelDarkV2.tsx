// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SearchableSelect } from "@/src/components/ui/searchable-select";
import { cn } from "@/src/lib/utils";
import {
  getAgentWorkflowCategoryLabels,
  defaultAgentWorkflowUiConfig,
  flattenAgentWorkflowSteps,
  flattenVisibleAgentWorkflowSteps,
  getAgentWorkflowBlockedOptionKeysForSelections,
  getAgentWorkflowBrandStoreEntries,
  getAgentWorkflowPageFeatureSettings,
  getAgentWorkflowOfficialSecondCategoryOptions,
  getAgentWorkflowOfficialThirdCategoryOptions,
  getAgentWorkflowFourthCategoryOptionsByBrandStoreThirdCategory,
  getAgentWorkflowPriceBandOptions,
  getAgentWorkflowThirdCategoryOptionsByBrandStore,
  getAgentWorkflowSelectedOptionPath,
  getAgentWorkflowStoreOptionsByBrand,
  getEnabledAgentWorkflowOptionTree,
  getEnabledAgentWorkflowStepTree,
  getRenderableAgentWorkflowOptionTree,
  getRenderableAgentWorkflowStepTree,
  filterAgentWorkflowStepTreeByOfficialCategory,
  isAgentWorkflowStepSelectionComplete,
  serializeAgentWorkflowSelectionPath,
} from "@/src/lib/agents/workflow-ui-config";
import { AgentCanvasTopNavDark } from "@/src/components/agents/AgentCanvasTopNavDark";
import { AgentWorkflowShowcaseBanner } from "@/src/components/agents/AgentWorkflowShowcaseBanner";
import { getAgentWorkflowProgress } from "@/src/lib/agents/workflow-composer";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import type {
  AgentWorkflowMaterialSelections,
  AgentWorkflowShowcaseConfig,
  AgentWorkflowStepKey,
  AgentWorkflowUiConfig,
} from "@/types/agent";

export interface AgentWorkflowInputs {
  primarySku: string;
  secondarySku: string;
  brand: string;
  store: string;
  officialSecondCategory: string;
  officialThirdCategory: string;
  thirdCategory: string;
  fourthCategory: string;
  fifthCategory: string;
  priceBand: string;
}

interface AgentWorkflowPanelDarkV2Props {
  config?: AgentWorkflowUiConfig | null;
  inputs: AgentWorkflowInputs;
  onInputsChange: (next: AgentWorkflowInputs) => void;
  materials: AgentWorkflowMaterialSelections;
  onMaterialsChange: (next: AgentWorkflowMaterialSelections) => void;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
  onSelectionsChange: (
    next: Partial<Record<AgentWorkflowStepKey, string>>
  ) => void;
  onReset?: () => void;
  onNextStep?: () => void;
  onSkipStep?: () => void;
  siteName?: string | null;
  siteLogo?: string | null;
  siteLogoDark?: string | null;
  showcaseConfig?: AgentWorkflowShowcaseConfig | null;
  topNavRightSlot?: ReactNode;
  embedded?: boolean;
  showBrandStoreSection?: boolean;
}

interface AgentWorkflowBrandStorePanelProps {
  config?: AgentWorkflowUiConfig | null;
  inputs: AgentWorkflowInputs;
  onInputsChange: (next: AgentWorkflowInputs) => void;
  theme?: "light" | "dark";
  title?: string;
  description?: string;
}

type WorkflowSelectionState = Partial<Record<AgentWorkflowStepKey, string>>;
type WorkflowStep = AgentWorkflowUiConfig["steps"][number];
type WorkflowOption = WorkflowStep["options"][number];

const VIRTUAL_OPTION_GRID_GAP = 16;
const VIRTUAL_OPTION_GRID_MAX_HEIGHT = 640;
const VIRTUAL_OPTION_GRID_MIN_CARD_HEIGHT = 122;
const VIRTUAL_OPTION_GRID_THRESHOLD = 12;
const WORKFLOW_OPTION_PREVIEW_WIDTH = 230;
const WORKFLOW_OPTION_PREVIEW_QUALITY = 56;
const WORKFLOW_OPTION_PREVIEW_EAGER_COUNT = 2;
const WORKFLOW_OPTION_NEXT_PREVIEW_PREFETCH_COUNT = 3;
const WORKFLOW_OPTION_PREFETCH_CACHE_LIMIT = 30;
const WORKFLOW_OPTION_PREFETCH_BATCH_SIZE = 1;

function isLikelyStoredWorkflowPreview(url: string, sourceUrl?: string | null) {
  const source = String(sourceUrl || "").trim();
  if (source && source !== url) {
    return true;
  }
  if (source && source === url && /\.webp(?:[?#]|$)/i.test(url)) {
    return true;
  }
  return /[?&]x-oss-process=/i.test(url);
}

function buildWorkflowOptionPreviewUrl(url?: string | null, sourceUrl?: string | null) {
  const source = String(url || "").trim();
  if (!source) return "";
  if (isLikelyStoredWorkflowPreview(source, sourceUrl)) {
    return source;
  }
  try {
    const target = new URL(source);
    const hostname = target.hostname.toLowerCase();
    if (
      hostname === "s3.jiansun.vip" ||
      hostname.endsWith(".jiansun.vip") ||
      hostname === "s3.1080p.hk"
    ) {
      return source;
    }
  } catch {
    return source;
  }
  return buildImageProxyUrl(source, {
    width: WORKFLOW_OPTION_PREVIEW_WIDTH,
    quality: WORKFLOW_OPTION_PREVIEW_QUALITY,
    format: "webp",
    delivery: "proxy",
  });
}

function handleWorkflowOptionPreviewError(
  event: SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string | null
): boolean {
  const fallbackUrl = String(originalUrl || "").trim();
  if (!fallbackUrl) return false;

  const image = event.currentTarget;
  if (image.dataset.workflowPreviewFallbackApplied === "1") {
    return false;
  }

  image.dataset.workflowPreviewFallbackApplied = "1";
  image.src = fallbackUrl;
  return true;
}

function appendWorkflowOptionPreviewUrls(
  output: Set<string>,
  options: WorkflowStep["options"] | undefined,
  limit: number
) {
  for (const option of (options || []).slice(0, limit)) {
    const previewUrl = buildWorkflowOptionPreviewUrl(
      option.previewImageUrl,
      option.previewImageSourceUrl
    );
    if (previewUrl) {
      output.add(previewUrl);
    }
  }
}

function trimWorkflowPreviewImageCache(
  cache: Map<string, HTMLImageElement>,
  limit = WORKFLOW_OPTION_PREFETCH_CACHE_LIMIT
) {
  while (cache.size > limit) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) return;
    const image = cache.get(firstKey);
    if (image) {
      image.src = "";
    }
    cache.delete(firstKey);
  }
}

function shouldSkipWorkflowPreviewPrefetch() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return true;
  }

  const connection = (typeof navigator !== "undefined"
    ? (navigator as Navigator & {
        connection?: { saveData?: boolean };
      }).connection
    : null);
  return Boolean(connection?.saveData);
}

function preloadWorkflowOptionPreviewImages(params: {
  urls: string[];
  cache: Map<string, HTMLImageElement>;
  markPrefetched: Set<string>;
}) {
  if (typeof window === "undefined" || params.urls.length === 0) {
    return () => {};
  }

  let cancelled = false;
  let cleanupIdleTask: (() => void) | null = null;
  const urls = params.urls.slice();

  const preloadNextBatch = () => {
    if (cancelled || shouldSkipWorkflowPreviewPrefetch()) {
      return;
    }

    const batch = urls.splice(0, WORKFLOW_OPTION_PREFETCH_BATCH_SIZE);
    for (const src of batch) {
      if (cancelled || params.cache.has(src)) {
        continue;
      }

      const image = new Image();
      image.decoding = "async";
      (
        image as HTMLImageElement & {
          fetchPriority?: "high" | "low" | "auto";
        }
      ).fetchPriority = "low";
      image.onerror = () => {
        params.cache.delete(src);
        params.markPrefetched.delete(src);
      };
      image.src = src;
      params.cache.set(src, image);
    }

    trimWorkflowPreviewImageCache(params.cache);

    if (urls.length > 0) {
      cleanupIdleTask = scheduleWorkflowIdleTask(preloadNextBatch, 900);
    }
  };

  cleanupIdleTask = scheduleWorkflowIdleTask(preloadNextBatch, 700);

  return () => {
    cancelled = true;
    cleanupIdleTask?.();
  };
}

interface WorkflowPanelDerivedState {
  progress: ReturnType<typeof getAgentWorkflowProgress>;
}

function scheduleWorkflowIdleTask(callback: () => void, timeout = 450) {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timer = window.setTimeout(callback, Math.min(timeout, 120));
  return () => window.clearTimeout(timer);
}

function buildWorkflowPanelDerivedState(params: {
  config: AgentWorkflowUiConfig;
  selections: WorkflowSelectionState;
}): WorkflowPanelDerivedState {
  return {
    progress: getAgentWorkflowProgress({
      config: params.config,
      selections: params.selections,
    }),
  };
}

function areWorkflowSelectionStatesEqual(
  left?: WorkflowSelectionState | null,
  right?: WorkflowSelectionState | null
) {
  const leftEntries = Object.entries(left || {}).filter(([, value]) =>
    Boolean(String(value || "").trim())
  );
  const rightEntries = Object.entries(right || {}).filter(([, value]) =>
    Boolean(String(value || "").trim())
  );

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(
    ([key, value]) =>
      String(right?.[key as AgentWorkflowStepKey] || "") === String(value || "")
  );
}

function getWorkflowOptionGridColumnCount(width: number) {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  if (width >= 420) return 2;
  return 1;
}

function getWorkflowStepSelectionSummary(params: {
  step: WorkflowStep;
  selectionValue?: string;
}) {
  const selectedOptions = getAgentWorkflowSelectedOptionPath({
    step: params.step,
    selectionValue: params.selectionValue,
  });

  if (selectedOptions.length === 0) {
    return "";
  }

  return selectedOptions.map((option) => option.buttonName).join(" / ");
}

function getWorkflowStepOptionLevels(params: {
  step: WorkflowStep;
  selectionValue?: string;
}) {
  const levels: Array<{
    depth: number;
    options: WorkflowStep["options"];
    selectedKey: string;
    selectedOption: WorkflowOption | null;
  }> = [];
  const selectedPath = getAgentWorkflowSelectedOptionPath({
    step: params.step,
    selectionValue: params.selectionValue,
  });

  let depth = 1;
  let currentOptions = params.step.options || [];

  while (currentOptions.length > 0) {
    const selectedKey = selectedPath[depth - 1]?.key || "";
    const selectedOption =
      currentOptions.find((option) => option.key === selectedKey) || null;

    levels.push({
      depth,
      options: currentOptions,
      selectedKey,
      selectedOption,
    });

    const nextOptions = selectedOption?.children || [];
    if (!selectedOption || nextOptions.length === 0) {
      break;
    }

    currentOptions = nextOptions;
    depth += 1;
  }

  return levels;
}

function getWorkflowOptionDepthLabel(depth: number) {
  return depth === 1 ? "主卡片" : `${depth}级子卡片`;
}

function getWorkflowOptionDepthShortLabel(depth: number) {
  return depth === 1 ? "主" : `${depth}级`;
}

const StepOptionCard = memo(function StepOptionCard({
  option,
  step,
  selected,
  disabled = false,
  disabledReason = null,
  onSelect,
  index,
}: {
  option: {
    key: string;
    buttonName: string;
    description?: string | null;
    previewImageUrl?: string | null;
    previewImageSourceUrl?: string | null;
  };
  step: { title: string };
  selected: boolean;
  disabled?: boolean;
  disabledReason?: "blocked" | "developing" | null;
  onSelect: (optionKey: string) => void;
  index: number;
}) {
  const handleClick = useCallback(() => {
    onSelect(option.key);
  }, [onSelect, option.key]);
  const previewUrl = useMemo(
    () => buildWorkflowOptionPreviewUrl(option.previewImageUrl, option.previewImageSourceUrl),
    [option.previewImageSourceUrl, option.previewImageUrl]
  );
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUrl]);
  const shouldLoadFast = selected || index < WORKFLOW_OPTION_PREVIEW_EAGER_COUNT;
  const isAutoConfiguredOption = /根据风格已配置/.test(option.buttonName);
  const hasPreview = Boolean(previewUrl && !previewFailed && !isAutoConfiguredOption);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl text-left",
        "mx-auto aspect-[16/10] w-full max-w-[230px]",
        "transition-all duration-500",
        disabled && "cursor-not-allowed opacity-45 saturate-0",
        selected
          ? "ring-2 ring-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          : disabled
            ? "ring-1 ring-white/8"
            : "ring-1 ring-white/12 hover:ring-white/24"
      )}
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-zinc-900">
        {hasPreview ? (
          <>
            <img
              src={previewUrl}
              alt={option.buttonName}
              width={WORKFLOW_OPTION_PREVIEW_WIDTH}
              height={Math.round(WORKFLOW_OPTION_PREVIEW_WIDTH * 0.625)}
              loading={shouldLoadFast ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={shouldLoadFast ? "high" : "low"}
              referrerPolicy="no-referrer"
              draggable={false}
              sizes="(max-width: 640px) 50vw, 230px"
              onError={(event) => {
                const fallbackApplied = handleWorkflowOptionPreviewError(
                  event,
                  option.previewImageUrl
                );
                if (!fallbackApplied) {
                  setPreviewFailed(true);
                }
              }}
              className={cn(
                "h-full w-full object-cover transition-transform duration-500",
                !disabled && "group-hover:scale-[1.04]"
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center px-6"
            style={{
              background: isAutoConfiguredOption
                ? "radial-gradient(circle at 32% 18%, rgba(52, 211, 153, 0.20), transparent 34%), linear-gradient(135deg, #0b1713 0%, #101312 48%, #050606 100%)"
                : "radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.10), transparent 38%), linear-gradient(135deg, #151515, #090909)",
            }}
          >
            <div className="text-center">
              <div
                className={cn(
                  "mx-auto flex h-11 w-11 items-center justify-center rounded-full border bg-white/[0.04]",
                  isAutoConfiguredOption
                    ? "border-emerald-300/24 text-emerald-200"
                    : "border-white/10 text-white/35"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  "mt-3 text-[11px] font-medium",
                  isAutoConfiguredOption ? "text-emerald-100/78" : "text-white/42"
                )}
              >
                {isAutoConfiguredOption ? "自动配置" : "暂无预览图"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 选中标记 */}
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
          <Check className="h-4 w-4" />
        </div>
      )}

      {disabled && !selected ? (
        <div className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
          {disabledReason === "developing" ? "开发中" : "已限制"}
        </div>
      ) : null}

      {/* 步骤标签 */}
      <div className="absolute left-3 top-3">
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
          {step.title}
        </span>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h4 className="text-sm font-semibold text-white drop-shadow-lg">
          {option.buttonName}
        </h4>
        {option.description && (
          <p className="mt-1 line-clamp-1 text-xs text-white/60">
            {option.description}
          </p>
        )}
      </div>

      {/* 选中边框 */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/30" />
      )}
    </button>
  );
});

interface VirtualizedOptionGridProps {
  options: WorkflowStep["options"];
  step: WorkflowStep;
  selectedKey: string;
  blockedOptionKeys: Set<string>;
  onSelect: (optionKey: string) => void;
}

const VirtualizedOptionGrid = memo(function VirtualizedOptionGrid({
  options,
  step,
  selectedKey,
  blockedOptionKeys,
  onSelect,
}: VirtualizedOptionGridProps) {
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const fallbackColumnCount = 5;
  const columnCount =
    containerWidth > 0
      ? getWorkflowOptionGridColumnCount(containerWidth)
      : fallbackColumnCount;
  const rowCount = Math.ceil(options.length / columnCount);
  const cardWidth =
    containerWidth > 0
      ? (containerWidth - VIRTUAL_OPTION_GRID_GAP * (columnCount - 1)) /
        columnCount
      : 220;
  const cardHeight = Math.max(
    VIRTUAL_OPTION_GRID_MIN_CARD_HEIGHT,
    Math.round(cardWidth * 0.625)
  );
  const rowHeight = cardHeight + VIRTUAL_OPTION_GRID_GAP;
  const shouldVirtualize = options.length > VIRTUAL_OPTION_GRID_THRESHOLD;

  useEffect(() => {
    const element = scrollParentRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(Math.max(0, Math.floor(element.clientWidth)));
    };
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rowCount,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => rowHeight,
    overscan: 1,
  });

  const renderCard = (option: WorkflowOption, optionIndex: number) => {
    const isDeveloping = option.enabled === false;
    const isBlocked =
      !isDeveloping &&
      selectedKey !== option.key &&
      blockedOptionKeys.has(option.key);
    const isDisabled = isDeveloping || isBlocked;

    return (
      <StepOptionCard
        key={option.key}
        disabled={isDisabled}
        disabledReason={
          isDeveloping ? "developing" : isBlocked ? "blocked" : null
        }
        index={optionIndex}
        onSelect={onSelect}
        option={option}
        selected={selectedKey === option.key}
        step={step}
      />
    );
  };

  if (!shouldVirtualize) {
    return (
      <div
        className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        ref={scrollParentRef}
      >
        {options.map((option, optionIndex) => renderCard(option, optionIndex))}
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto overscroll-contain pr-1"
      ref={scrollParentRef}
      style={{ maxHeight: VIRTUAL_OPTION_GRID_MAX_HEIGHT }}
    >
      <div
        className="relative w-full"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowOptions = options.slice(
            startIndex,
            startIndex + columnCount
          );

          return (
            <div
              className="absolute left-0 top-0 grid w-full gap-4"
              data-index={virtualRow.index}
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                minHeight: cardHeight,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowOptions.map((option, rowOptionIndex) =>
                renderCard(option, startIndex + rowOptionIndex)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export function AgentWorkflowBrandStorePanel({
  config,
  inputs,
  onInputsChange,
  theme = "dark",
  title = "品牌层级选择",
  description = "先选择品牌、店铺、分类层级和价格带，后续品牌模特与风格步骤会按这里的选择联动。",
}: AgentWorkflowBrandStorePanelProps) {
  const categoryLabels = useMemo(
    () => getAgentWorkflowCategoryLabels(config),
    [config]
  );
  const firstCategoryLabel = categoryLabels.firstCategory;
  const secondCategoryLabel = categoryLabels.secondCategory;
  const thirdCategoryLabel = categoryLabels.thirdCategory;
  const fourthCategoryLabel = categoryLabels.fourthCategory;
  const resolvedTitle =
    title === "品牌层级选择" ? `${firstCategoryLabel}层级选择` : title;
  const resolvedDescription =
    description ===
    "先选择品牌、店铺、分类层级和价格带，后续品牌模特与风格步骤会按这里的选择联动。"
      ? `先选择${firstCategoryLabel}、${secondCategoryLabel}、分类层级和价格带，后续品牌模特与风格步骤会按这里的选择联动。`
      : description;
  const brandOptions = useMemo(
    () =>
      config?.inputOptions?.brands ||
      defaultAgentWorkflowUiConfig.inputOptions?.brands ||
      [],
    [config?.inputOptions?.brands]
  );
  const brandStoreEntries = useMemo(
    () => getAgentWorkflowBrandStoreEntries(config),
    [config]
  );
  const storeOptions = useMemo(
    () => getAgentWorkflowStoreOptionsByBrand({ config, brand: inputs.brand }),
    [config, inputs.brand]
  );
  const thirdCategoryOptions = useMemo(
    () =>
      getAgentWorkflowThirdCategoryOptionsByBrandStore({
        config,
        brand: inputs.brand,
        store: inputs.store,
      }),
    [config, inputs.brand, inputs.store]
  );
  const fourthCategoryOptions = useMemo(
    () =>
      getAgentWorkflowFourthCategoryOptionsByBrandStoreThirdCategory({
        config,
        brand: inputs.brand,
        store: inputs.store,
        thirdCategory: inputs.thirdCategory,
      }),
    [config, inputs.brand, inputs.store, inputs.thirdCategory]
  );
  const officialSecondCategoryOptions = useMemo(
    () => getAgentWorkflowOfficialSecondCategoryOptions(config),
    [config]
  );
  const officialThirdCategoryOptions = useMemo(
    () =>
      getAgentWorkflowOfficialThirdCategoryOptions({
        config,
        secondCategory: inputs.officialSecondCategory,
      }),
    [config, inputs.officialSecondCategory]
  );
  const priceBandOptions = useMemo(
    () => getAgentWorkflowPriceBandOptions(config),
    [config]
  );
  const hasThirdCategoryLevel = useMemo(
    () =>
      brandStoreEntries.some((entry) =>
        (entry.storeEntries || []).some(
          (storeEntry) =>
            (storeEntry.thirdCategoryEntries || []).length > 0 ||
            (storeEntry.thirdCategories || []).length > 0
        )
      ) || Boolean(config?.inputOptions?.thirdCategories?.length),
    [brandStoreEntries, config?.inputOptions?.thirdCategories]
  );
  const hasFourthCategoryLevel = useMemo(
    () =>
      hasThirdCategoryLevel &&
      (brandStoreEntries.some((entry) =>
        (entry.storeEntries || []).some((storeEntry) =>
          (storeEntry.thirdCategoryEntries || []).some(
            (thirdEntry) =>
              (thirdEntry.fourthCategoryEntries || []).length > 0 ||
              (thirdEntry.fourthCategories || []).length > 0
          )
        )
      ) ||
        Boolean(config?.inputOptions?.fourthCategories?.length)),
    [
      brandStoreEntries,
      config?.inputOptions?.fourthCategories,
      hasThirdCategoryLevel,
    ]
  );
  const isDark = theme === "dark";

  useEffect(() => {
    let nextInputs = inputs;
    let changed = false;

    if (!hasThirdCategoryLevel) {
      if (nextInputs.thirdCategory || nextInputs.fourthCategory) {
        nextInputs = {
          ...nextInputs,
          thirdCategory: "",
          fourthCategory: "",
        };
        changed = true;
      }
    } else if (!hasFourthCategoryLevel) {
      if (nextInputs.fourthCategory) {
        nextInputs = {
          ...nextInputs,
          fourthCategory: "",
        };
        changed = true;
      }
    }

    if (
      nextInputs.officialSecondCategory &&
      !officialSecondCategoryOptions.some(
        (option) =>
          option.trim().toLowerCase() ===
          nextInputs.officialSecondCategory.trim().toLowerCase()
      )
    ) {
      nextInputs = {
        ...nextInputs,
        officialSecondCategory: "",
        officialThirdCategory: "",
        fifthCategory: "",
      };
      changed = true;
    }

    if (
      nextInputs.officialThirdCategory &&
      !officialThirdCategoryOptions.some(
        (option) =>
          option.trim().toLowerCase() ===
          nextInputs.officialThirdCategory.trim().toLowerCase()
      )
    ) {
      nextInputs = {
        ...nextInputs,
        officialThirdCategory: "",
        fifthCategory: "",
      };
      changed = true;
    } else if (
      nextInputs.officialThirdCategory &&
      nextInputs.fifthCategory !== nextInputs.officialThirdCategory
    ) {
      nextInputs = {
        ...nextInputs,
        fifthCategory: nextInputs.officialThirdCategory,
      };
      changed = true;
    }

    if (changed) {
      onInputsChange(nextInputs);
    }
  }, [
    hasThirdCategoryLevel,
    hasFourthCategoryLevel,
    inputs,
    onInputsChange,
    officialSecondCategoryOptions,
    officialThirdCategoryOptions,
  ]);

  return (
    <div
      className={cn(
        "rounded-[24px] border p-4",
        isDark ? "border-white/12 bg-black/20" : "border-border bg-background"
      )}
    >
      <div className="mb-4 space-y-1">
        <div
          className={cn(
            "text-sm font-semibold",
            isDark ? "text-white" : "text-foreground"
          )}
        >
          {resolvedTitle}
        </div>
        <div
          className={cn(
            "text-xs leading-5",
            isDark ? "text-white/48" : "text-muted-foreground"
          )}
        >
          {resolvedDescription}
        </div>
      </div>
      <div className="grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SearchableSelect
          value={inputs.brand}
          options={brandOptions}
          placeholder={`选择${firstCategoryLabel}`}
          searchPlaceholder={`输入${firstCategoryLabel}名筛选`}
          emptyText={`暂无${firstCategoryLabel}可选`}
          theme={theme}
          onValueChange={(value) =>
            onInputsChange({
              ...inputs,
              brand: value,
              store:
                value.trim().toLowerCase() === inputs.brand.trim().toLowerCase()
                  ? inputs.store
                  : "",
              thirdCategory:
                value.trim().toLowerCase() === inputs.brand.trim().toLowerCase()
                  ? inputs.thirdCategory
                  : "",
              fourthCategory: "",
              fifthCategory: inputs.officialThirdCategory || "",
            })
          }
        />
        <SearchableSelect
          value={inputs.store}
          options={storeOptions}
          placeholder={`选择${secondCategoryLabel}`}
          searchPlaceholder={`输入${secondCategoryLabel}名筛选`}
          emptyText={
            inputs.brand
              ? `当前${firstCategoryLabel}下暂无${secondCategoryLabel}可选`
              : `请先选择${firstCategoryLabel}`
          }
          theme={theme}
          disabled={
            !inputs.brand ||
            (brandStoreEntries.length > 0 && storeOptions.length === 0)
          }
          onValueChange={(value) =>
            onInputsChange({
              ...inputs,
              store: value,
              thirdCategory:
                value.trim().toLowerCase() === inputs.store.trim().toLowerCase()
                  ? inputs.thirdCategory
                  : "",
              fourthCategory: "",
            })
          }
        />
        {hasThirdCategoryLevel ? (
          <SearchableSelect
            value={inputs.thirdCategory}
            options={thirdCategoryOptions}
            placeholder={`选择${thirdCategoryLabel}`}
            searchPlaceholder={`输入${thirdCategoryLabel}筛选`}
            emptyText={
              inputs.store
                ? `当前${secondCategoryLabel}下暂无${thirdCategoryLabel}`
                : `请先选择${secondCategoryLabel}`
            }
            theme={theme}
            disabled={!inputs.store || thirdCategoryOptions.length === 0}
            onValueChange={(value) =>
              onInputsChange({
                ...inputs,
                thirdCategory: value,
                fourthCategory:
                  value.trim().toLowerCase() ===
                  inputs.thirdCategory.trim().toLowerCase()
                    ? inputs.fourthCategory
                    : "",
              })
            }
          />
        ) : null}
        {hasFourthCategoryLevel ? (
          <SearchableSelect
            value={inputs.fourthCategory}
            options={fourthCategoryOptions}
            placeholder={`选择${fourthCategoryLabel}`}
            searchPlaceholder={`输入${fourthCategoryLabel}筛选`}
            emptyText={
              inputs.thirdCategory
                ? `当前${thirdCategoryLabel}下暂无${fourthCategoryLabel}`
                : `请先选择${thirdCategoryLabel}`
            }
            theme={theme}
            disabled={
              !inputs.thirdCategory || fourthCategoryOptions.length === 0
            }
            onValueChange={(value) =>
              onInputsChange({
                ...inputs,
                fourthCategory: value,
              })
            }
          />
        ) : null}
        <SearchableSelect
          value={inputs.officialSecondCategory}
          options={officialSecondCategoryOptions}
          placeholder="选择二级品类"
          searchPlaceholder="输入二级品类筛选"
          emptyText="暂无官方二级品类"
          theme={theme}
          disabled={officialSecondCategoryOptions.length === 0}
          onValueChange={(value) =>
            onInputsChange({
              ...inputs,
              officialSecondCategory: value,
              officialThirdCategory: "",
              fifthCategory: "",
            })
          }
        />
        <SearchableSelect
          value={inputs.officialThirdCategory}
          options={officialThirdCategoryOptions}
          placeholder="选择三级品类"
          searchPlaceholder="输入三级品类筛选"
          emptyText={
            inputs.officialSecondCategory
              ? "当前二级品类下暂无三级品类"
              : "请先选择二级品类"
          }
          theme={theme}
          disabled={
            !inputs.officialSecondCategory ||
            officialThirdCategoryOptions.length === 0
          }
          onValueChange={(value) =>
            onInputsChange({
              ...inputs,
              officialThirdCategory: value,
              fifthCategory: value,
            })
          }
        />
        <SearchableSelect
          value={inputs.priceBand}
          options={priceBandOptions}
          placeholder="选择价格带"
          searchPlaceholder="输入价格带筛选"
          emptyText="暂无价格带可选"
          theme={theme}
          disabled={priceBandOptions.length === 0}
          onValueChange={(value) =>
            onInputsChange({ ...inputs, priceBand: value })
          }
        />
      </div>
    </div>
  );
}

function AgentWorkflowPanelDarkV2Component({
  config,
  inputs,
  onInputsChange,
  selections,
  onSelectionsChange,
  onNextStep,
  onSkipStep,
  siteName,
  siteLogo,
  siteLogoDark,
  showcaseConfig,
  topNavRightSlot,
  embedded = false,
  showBrandStoreSection = true,
}: AgentWorkflowPanelDarkV2Props) {
  const categoryLabels = useMemo(
    () => getAgentWorkflowCategoryLabels(config),
    [config]
  );
  const firstCategoryLabel = categoryLabels.firstCategory;
  const secondCategoryLabel = categoryLabels.secondCategory;
  const resolvedConfig = useMemo(() => {
    const source = config || defaultAgentWorkflowUiConfig;
    const filteredSteps = filterAgentWorkflowStepTreeByOfficialCategory({
      steps: source.steps || [],
      officialSecondCategory: inputs.officialSecondCategory,
      officialThirdCategory: inputs.officialThirdCategory,
    });
    return {
      ...source,
      steps: getEnabledAgentWorkflowStepTree(filteredSteps),
    };
  }, [config, inputs.officialSecondCategory, inputs.officialThirdCategory]);
  const displayConfig = useMemo(() => {
    const source = config || defaultAgentWorkflowUiConfig;
    const filteredSteps = filterAgentWorkflowStepTreeByOfficialCategory({
      steps: source.steps || [],
      officialSecondCategory: inputs.officialSecondCategory,
      officialThirdCategory: inputs.officialThirdCategory,
    });
    return {
      ...source,
      steps: getRenderableAgentWorkflowStepTree(filteredSteps),
    };
  }, [config, inputs.officialSecondCategory, inputs.officialThirdCategory]);
  const pageFeatureSettings = useMemo(
    () => getAgentWorkflowPageFeatureSettings(config),
    [config]
  );
  const [optimisticSelections, setOptimisticSelections] =
    useState<WorkflowSelectionState>(selections);
  const deferredSelections = useDeferredValue(optimisticSelections);
  const latestExternalSelectionsRef = useRef(selections);
  const selectionCommitTimerRef = useRef<number | null>(null);
  const pendingSelectionCommitRef = useRef<WorkflowSelectionState | null>(null);
  const workflowPreviewPrefetchedUrlsRef = useRef(new Set<string>());
  const workflowPreviewImageCacheRef = useRef(
    new Map<string, HTMLImageElement>()
  );

  useEffect(() => {
    if (latestExternalSelectionsRef.current === selections) {
      return;
    }

    latestExternalSelectionsRef.current = selections;
    setOptimisticSelections((current) =>
      areWorkflowSelectionStatesEqual(current, selections)
        ? current
        : selections
    );
  }, [selections]);

  const flushSelectionCommit = useCallback(() => {
    const pendingSelections = pendingSelectionCommitRef.current;
    if (!pendingSelections) {
      return;
    }

    pendingSelectionCommitRef.current = null;
    if (
      selectionCommitTimerRef.current !== null &&
      typeof window !== "undefined"
    ) {
      window.clearTimeout(selectionCommitTimerRef.current);
    }
    selectionCommitTimerRef.current = null;
    startTransition(() => {
      onSelectionsChange(pendingSelections);
    });
  }, [onSelectionsChange]);

  const emitSelectionsChange = useCallback(
    (nextSelections: WorkflowSelectionState) => {
      setOptimisticSelections(nextSelections);
      pendingSelectionCommitRef.current = nextSelections;

      if (typeof window === "undefined") {
        flushSelectionCommit();
        return;
      }

      if (selectionCommitTimerRef.current !== null) {
        window.clearTimeout(selectionCommitTimerRef.current);
      }

      selectionCommitTimerRef.current = window.setTimeout(() => {
        flushSelectionCommit();
      }, 90);
    },
    [flushSelectionCommit]
  );

  useEffect(() => {
    return () => {
      flushSelectionCommit();
    };
  }, [flushSelectionCommit]);

  const flattenedResolvedSteps = useMemo(
    () =>
      flattenVisibleAgentWorkflowSteps(
        displayConfig.steps,
        optimisticSelections
      ).filter(
        ({ step }) => Array.isArray(step.options) && step.options.length > 0
      ),
    [displayConfig.steps, optimisticSelections]
  );

  const [workflowDerivedState, setWorkflowDerivedState] =
    useState<WorkflowPanelDerivedState>(() =>
      buildWorkflowPanelDerivedState({
        config: resolvedConfig,
        selections: deferredSelections,
      })
    );
  const workflowDerivedVersionRef = useRef(0);

  useEffect(() => {
    const version = workflowDerivedVersionRef.current + 1;
    workflowDerivedVersionRef.current = version;

    return scheduleWorkflowIdleTask(() => {
      const nextDerivedState = buildWorkflowPanelDerivedState({
        config: resolvedConfig,
        selections: deferredSelections,
      });

      if (workflowDerivedVersionRef.current !== version) {
        return;
      }

      startTransition(() => {
        setWorkflowDerivedState(nextDerivedState);
      });
    });
  }, [deferredSelections, resolvedConfig]);
  const progress = workflowDerivedState.progress;
  const stepSelectionSummaryMap = useMemo(() => {
    const entries = flattenAgentWorkflowSteps(resolvedConfig.steps).map(
      ({ step }) => [
        step.key,
        getWorkflowStepSelectionSummary({
          step,
          selectionValue: deferredSelections[step.key],
        }),
      ]
    );
    return Object.fromEntries(entries) as Record<string, string>;
  }, [deferredSelections, resolvedConfig.steps]);
  const blockedOptionKeys = useMemo(
    () =>
      new Set(
        getAgentWorkflowBlockedOptionKeysForSelections({
          config: resolvedConfig,
          selections: deferredSelections,
        })
      ),
    [deferredSelections, resolvedConfig]
  );
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState<{
    completedStepTitle: string;
    completedSummary: string;
    nextStepTitle: string;
  } | null>(null);
  const [activeEmbeddedStepKey, setActiveEmbeddedStepKey] =
    useState<string>("");
  const [activeEmbeddedOptionDepth, setActiveEmbeddedOptionDepth] = useState(1);
  const [isEmbeddedPathExpanded, setIsEmbeddedPathExpanded] = useState(false);
  const [pendingAutoAdvanceStepKey, setPendingAutoAdvanceStepKey] = useState<
    string | null
  >(null);
  const activeEmbeddedStepIndex = Math.max(
    flattenedResolvedSteps.findIndex(
      ({ step }) => step.key === activeEmbeddedStepKey
    ),
    0
  );
  const activeEmbeddedStepEntry =
    flattenedResolvedSteps[activeEmbeddedStepIndex] ||
    flattenedResolvedSteps[0] ||
    null;
  const activeEmbeddedOptionLevels = useMemo(
    () =>
      activeEmbeddedStepEntry
        ? getWorkflowStepOptionLevels({
            step: activeEmbeddedStepEntry.step,
            selectionValue:
              optimisticSelections[activeEmbeddedStepEntry.step.key],
          })
        : [],
    [activeEmbeddedStepEntry, optimisticSelections]
  );
  const activeEmbeddedSelectedPath = useMemo(
    () =>
      activeEmbeddedStepEntry
        ? getAgentWorkflowSelectedOptionPath({
            step: activeEmbeddedStepEntry.step,
            selectionValue:
              optimisticSelections[activeEmbeddedStepEntry.step.key],
          })
        : [],
    [activeEmbeddedStepEntry, optimisticSelections]
  );
  const activeEmbeddedOptionLevel =
    activeEmbeddedOptionLevels.find(
      (level) => level.depth === activeEmbeddedOptionDepth
    ) ||
    activeEmbeddedOptionLevels[activeEmbeddedOptionLevels.length - 1] ||
    activeEmbeddedOptionLevels[0] ||
    null;
  const workflowOptionPreviewPrefetchUrls = useMemo(() => {
    const urls = new Set<string>();

    if (embedded) {
      const currentSelectedOption =
        activeEmbeddedOptionLevel?.selectedOption || null;
      appendWorkflowOptionPreviewUrls(
        urls,
        currentSelectedOption?.children,
        WORKFLOW_OPTION_NEXT_PREVIEW_PREFETCH_COUNT
      );

      if (activeEmbeddedStepEntry) {
        const currentStepComplete = isAgentWorkflowStepSelectionComplete({
          step: activeEmbeddedStepEntry.step,
          selectionValue: optimisticSelections[activeEmbeddedStepEntry.step.key],
        });

        if (currentStepComplete) {
          const nextStepEntry = flattenedResolvedSteps
            .slice(activeEmbeddedStepIndex + 1)
            .find(
              ({ step }) =>
                !isAgentWorkflowStepSelectionComplete({
                  step,
                  selectionValue: optimisticSelections[step.key],
                })
            );

          if (nextStepEntry) {
            const nextStepLevels = getWorkflowStepOptionLevels({
              step: nextStepEntry.step,
              selectionValue: optimisticSelections[nextStepEntry.step.key],
            });
            const nextStepFirstPendingLevel =
              nextStepLevels.find((level) => !level.selectedKey) ||
              nextStepLevels[nextStepLevels.length - 1] ||
              null;

            appendWorkflowOptionPreviewUrls(
              urls,
              nextStepFirstPendingLevel?.options || nextStepEntry.step.options,
              WORKFLOW_OPTION_NEXT_PREVIEW_PREFETCH_COUNT
            );
          }
        }
      }
    } else {
      appendWorkflowOptionPreviewUrls(
        urls,
        flattenedResolvedSteps[1]?.step.options,
        WORKFLOW_OPTION_NEXT_PREVIEW_PREFETCH_COUNT
      );
    }

    return Array.from(urls);
  }, [
    activeEmbeddedOptionLevel,
    activeEmbeddedStepEntry,
    activeEmbeddedStepIndex,
    embedded,
    flattenedResolvedSteps,
    optimisticSelections,
  ]);
  const activeEmbeddedDeepestSelectedOption = useMemo(
    () =>
      [...activeEmbeddedOptionLevels]
        .reverse()
        .find((level) => level.selectedOption)?.selectedOption || null,
    [activeEmbeddedOptionLevels]
  );
  const activeEmbeddedSelectedOptionHasDevelopingChildren = useMemo(() => {
    if (!activeEmbeddedDeepestSelectedOption) {
      return false;
    }

    const renderableChildren =
      activeEmbeddedDeepestSelectedOption.children || [];
    if (renderableChildren.length === 0) {
      return false;
    }

    return (
      getEnabledAgentWorkflowOptionTree(
        activeEmbeddedDeepestSelectedOption.children || []
      ).length === 0
    );
  }, [activeEmbeddedDeepestSelectedOption]);
  const activeEmbeddedPrimaryOption = activeEmbeddedSelectedPath[0] || null;
  const activeEmbeddedStepSummary =
    (activeEmbeddedStepEntry &&
      stepSelectionSummaryMap[activeEmbeddedStepEntry.step.key]) ||
    "";
  const activeEmbeddedPathStatusLabel =
    activeEmbeddedSelectedPath.length > 0
      ? `已选 ${activeEmbeddedSelectedPath.length} 项`
      : "未选择";
  const activeEmbeddedPathSummary =
    activeEmbeddedStepSummary || "先选择当前步骤的主卡片，完整路径会收纳在这里";

  useEffect(() => {
    if (!embedded) {
      return;
    }

    if (flattenedResolvedSteps.length === 0) {
      if (activeEmbeddedStepKey) {
        setActiveEmbeddedStepKey("");
      }
      return;
    }

    if (
      activeEmbeddedStepKey &&
      flattenedResolvedSteps.some(
        ({ step }) => step.key === activeEmbeddedStepKey
      )
    ) {
      return;
    }

    setActiveEmbeddedStepKey(flattenedResolvedSteps[0]?.step.key || "");
  }, [activeEmbeddedStepKey, embedded, flattenedResolvedSteps]);

  useEffect(() => {
    if (!embedded) {
      return;
    }

    if (!activeEmbeddedStepEntry) {
      if (activeEmbeddedOptionDepth !== 1) {
        setActiveEmbeddedOptionDepth(1);
      }
      return;
    }

    const firstIncompleteDepth =
      activeEmbeddedOptionLevels.find((level) => !level.selectedKey)?.depth ||
      activeEmbeddedOptionLevels[activeEmbeddedOptionLevels.length - 1]
        ?.depth ||
      1;

    setActiveEmbeddedOptionDepth((current) => {
      const maxDepth =
        activeEmbeddedOptionLevels[activeEmbeddedOptionLevels.length - 1]
          ?.depth || 1;
      if (current < 1 || current > maxDepth) {
        return firstIncompleteDepth;
      }
      return current;
    });
  }, [
    activeEmbeddedOptionDepth,
    activeEmbeddedOptionLevels,
    activeEmbeddedStepEntry,
    embedded,
  ]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      workflowOptionPreviewPrefetchUrls.length === 0
    ) {
      return;
    }

    const urlsToPrefetch = workflowOptionPreviewPrefetchUrls.filter(
      (src) => !workflowPreviewPrefetchedUrlsRef.current.has(src)
    );
    if (urlsToPrefetch.length === 0) {
      return;
    }

    urlsToPrefetch.forEach((src) => {
      workflowPreviewPrefetchedUrlsRef.current.add(src);
    });

    return preloadWorkflowOptionPreviewImages({
      urls: urlsToPrefetch,
      cache: workflowPreviewImageCacheRef.current,
      markPrefetched: workflowPreviewPrefetchedUrlsRef.current,
    });
  }, [workflowOptionPreviewPrefetchUrls]);

  useEffect(() => {
    return () => {
      workflowPreviewImageCacheRef.current.forEach((image) => {
        image.src = "";
      });
      workflowPreviewImageCacheRef.current.clear();
      workflowPreviewPrefetchedUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!embedded || !activeEmbeddedStepEntry) {
      return;
    }

    if (pendingAutoAdvanceStepKey !== activeEmbeddedStepEntry.step.key) {
      return;
    }

    const currentStepComplete = isAgentWorkflowStepSelectionComplete({
      step: activeEmbeddedStepEntry.step,
      selectionValue: optimisticSelections[activeEmbeddedStepEntry.step.key],
    });
    if (!currentStepComplete) {
      return;
    }

    if (activeEmbeddedSelectedOptionHasDevelopingChildren) {
      setPendingAutoAdvanceStepKey(null);
      return;
    }

    const nextStep = flattenedResolvedSteps
      .slice(activeEmbeddedStepIndex + 1)
      .find(
        ({ step }) =>
          !isAgentWorkflowStepSelectionComplete({
            step,
            selectionValue: optimisticSelections[step.key],
          })
      );

    if (nextStep && nextStep.step.key !== activeEmbeddedStepKey) {
      setAutoAdvanceNotice({
        completedStepTitle: activeEmbeddedStepEntry.step.title,
        completedSummary:
          stepSelectionSummaryMap[activeEmbeddedStepEntry.step.key] ||
          "已完成当前步骤选择",
        nextStepTitle: nextStep.step.title,
      });
      setActiveEmbeddedStepKey(nextStep.step.key);
      setActiveEmbeddedOptionDepth(1);
    }

    setPendingAutoAdvanceStepKey(null);
  }, [
    activeEmbeddedStepEntry,
    activeEmbeddedStepIndex,
    activeEmbeddedStepKey,
    activeEmbeddedSelectedOptionHasDevelopingChildren,
    embedded,
    flattenedResolvedSteps,
    pendingAutoAdvanceStepKey,
    optimisticSelections,
    stepSelectionSummaryMap,
  ]);

  useEffect(() => {
    if (!autoAdvanceNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoAdvanceNotice(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [autoAdvanceNotice]);
  useEffect(() => {
    if (!embedded) {
      return;
    }

    setIsEmbeddedPathExpanded(false);
  }, [activeEmbeddedStepKey, embedded]);

  const renderOptionLevels = (
    step: AgentWorkflowUiConfig["steps"][number],
    options: AgentWorkflowUiConfig["steps"][number]["options"],
    depth = 1,
    parentPath: string[] = []
  ): ReactNode => {
    const selectedPathKeys = getAgentWorkflowSelectedOptionPath({
      step,
      selectionValue: optimisticSelections[step.key],
    }).map((option) => option.key);
    const currentSelectedKey = selectedPathKeys[depth - 1] || "";
    const currentSelectedOption =
      options.find((option) => option.key === currentSelectedKey) || null;
    const visibleChildren = currentSelectedOption?.children || [];
    const levelLabel =
      depth === 1 ? "主卡片" : depth === 2 ? "二级卡片" : "三级卡片";
    const handleSelectOption = (optionKey: string) => {
      const option = options.find((item) => item.key === optionKey);
      if (!option) {
        return;
      }

      const isDeveloping = option.enabled === false;
      const isBlocked =
        !isDeveloping &&
        currentSelectedKey !== option.key &&
        blockedOptionKeys.has(option.key);
      if (isDeveloping || isBlocked) {
        return;
      }

      const prefix = parentPath.slice(0, depth - 1);
      const nextKeys =
        currentSelectedKey === option.key ? prefix : [...prefix, option.key];
      const nextSelections = {
        ...optimisticSelections,
        [step.key]:
          nextKeys.length > 0
            ? serializeAgentWorkflowSelectionPath(nextKeys)
            : undefined,
      };

      setPendingAutoAdvanceStepKey(step.key);
      emitSelectionsChange(nextSelections);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-medium text-white/45">
            {levelLabel}
          </span>
          {depth > 1 ? (
            <span className="text-xs text-white/35">
              该层卡片从上一级已选卡片中继续展开
            </span>
          ) : null}
        </div>

        <VirtualizedOptionGrid
          blockedOptionKeys={blockedOptionKeys}
          onSelect={handleSelectOption}
          options={options}
          selectedKey={currentSelectedKey}
          step={step}
        />

        {currentSelectedOption && visibleChildren.length > 0
          ? renderOptionLevels(step, visibleChildren, depth + 1, [
              ...parentPath.slice(0, depth - 1),
              currentSelectedOption.key,
            ])
          : null}
      </div>
    );
  };

  const handleEmbeddedOptionSelect = useCallback(
    (optionKey: string) => {
      if (!activeEmbeddedOptionLevel || !activeEmbeddedStepEntry) {
        return;
      }

      const option = activeEmbeddedOptionLevel.options.find(
        (item) => item.key === optionKey
      );
      if (!option) {
        return;
      }

      const currentSelectedKey = activeEmbeddedOptionLevel.selectedKey;
      const isDeveloping = option.enabled === false;
      const isBlocked =
        !isDeveloping &&
        currentSelectedKey !== option.key &&
        blockedOptionKeys.has(option.key);
      if (isDeveloping || isBlocked) {
        return;
      }

      const selectedPathKeys = activeEmbeddedOptionLevels
        .slice(0, activeEmbeddedOptionLevel.depth - 1)
        .map((level) => level.selectedKey)
        .filter(Boolean);
      const nextKeys =
        currentSelectedKey === option.key
          ? selectedPathKeys
          : [...selectedPathKeys, option.key];
      const nextSelections = {
        ...optimisticSelections,
        [activeEmbeddedStepEntry.step.key]:
          nextKeys.length > 0
            ? serializeAgentWorkflowSelectionPath(nextKeys)
            : undefined,
      };

      setPendingAutoAdvanceStepKey(activeEmbeddedStepEntry.step.key);
      emitSelectionsChange(nextSelections);

      if (
        currentSelectedKey !== option.key &&
        (option.children || []).length > 0
      ) {
        setActiveEmbeddedOptionDepth(activeEmbeddedOptionLevel.depth + 1);
      } else {
        setActiveEmbeddedOptionDepth(activeEmbeddedOptionLevel.depth);
      }
    },
    [
      activeEmbeddedOptionLevel,
      activeEmbeddedOptionLevels,
      activeEmbeddedStepEntry,
      blockedOptionKeys,
      emitSelectionsChange,
      optimisticSelections,
    ]
  );

  const workflowContent = (
    <div className="space-y-8">
      {showBrandStoreSection ? (
        <motion.section
          className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-xs font-bold text-emerald-400">
              1
            </span>
            {firstCategoryLabel}和{secondCategoryLabel}选择
          </h2>
          <AgentWorkflowBrandStorePanel
            config={config}
            inputs={inputs}
            onInputsChange={onInputsChange}
            theme="dark"
          />
        </motion.section>
      ) : null}

      {/* 工作流步骤 */}
      {embedded ? (
        activeEmbeddedStepEntry ? (
          <motion.section
            key={activeEmbeddedStepEntry.step.key}
              className={cn(
                "rounded-[24px] border border-white/10 bg-white/[0.035] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-7",
              activeEmbeddedStepEntry.depth > 1 &&
                "border-l-4 border-l-emerald-500/30"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
              <div className="mb-7 space-y-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {flattenedResolvedSteps.map(({ step }, stepIndex) => {
                    const completed = isAgentWorkflowStepSelectionComplete({
                      step,
                      selectionValue: optimisticSelections[step.key],
                    });
                    const active =
                      step.key === activeEmbeddedStepEntry.step.key;
                    const stepSelectedPath = getAgentWorkflowSelectedOptionPath(
                      {
                        step,
                        selectionValue: optimisticSelections[step.key],
                      }
                    );
                    const primarySelectedOption = stepSelectedPath[0] || null;
                    const selectedCountLabel =
                      stepSelectedPath.length > 0
                        ? `${stepSelectedPath.length} 项已选`
                        : "待选择";

                    return (
                      <div
                        key={step.key}
                        className={cn(
                            "group flex min-h-[64px] rounded-[14px] border px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                            active
                              ? "border-emerald-300/34 bg-emerald-400/[0.075]"
                              : completed
                                ? "border-white/14 bg-white/[0.045]"
                                : "border-white/10 bg-white/[0.022]"
                          )}
                        >
                          <div className="flex w-full items-center gap-2.5 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingAutoAdvanceStepKey(null);
                              setAutoAdvanceNotice(null);
                              setActiveEmbeddedStepKey(step.key);
                              setActiveEmbeddedOptionDepth(1);
                            }}
                              className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-transform duration-200 hover:-translate-y-[1px]"
                          >
                            <span
                              className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                                active
                                  ? "border-emerald-300 bg-emerald-300 text-black shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                                  : completed
                                    ? "border-white/30 bg-white text-black"
                                    : "border-white/12 bg-white/[0.04] text-white/62 group-hover:border-white/24 group-hover:text-white/82"
                              )}
                            >
                              {stepIndex + 1}
                            </span>
                              <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <div
                                  className={cn(
                                      "truncate text-[13px] font-semibold leading-5 transition-colors",
                                    active
                                      ? "text-white"
                                      : completed
                                        ? "text-white/82"
                                        : "text-white/52 group-hover:text-white/76"
                                  )}
                                >
                                  {step.title}
                                </div>
                                {active ? (
                                    <span className="inline-flex h-5 items-center rounded-full border border-emerald-300/28 bg-emerald-400/10 px-2 py-0 text-[9px] font-medium leading-none text-emerald-200">
                                    当前步骤
                                  </span>
                                ) : null}
                              </div>
                                <div className="flex min-w-0 items-center gap-1.5">
                                <span
                                  className={cn(
                                    "min-w-0 flex-1 truncate text-[11px] leading-4",
                                    active
                                      ? "text-emerald-100"
                                      : completed
                                        ? "text-white/68"
                                        : "text-white/38"
                                  )}
                                  title={
                                    primarySelectedOption?.buttonName ||
                                    "待选择"
                                  }
                                >
                                  {primarySelectedOption?.buttonName ||
                                    "待选择"}
                                </span>
                                {stepSelectedPath.length > 1 ? (
                                  <span className="shrink-0 text-[10px] leading-none text-white/38">
                                    {selectedCountLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  <div className="overflow-hidden rounded-[14px] border border-white/8 bg-black/20">
                  <button
                    type="button"
                    onClick={() =>
                      setIsEmbeddedPathExpanded((current) => !current)
                    }
                    aria-expanded={isEmbeddedPathExpanded}
                      className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-white/[0.035]"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] font-medium text-white/55">
                          当前步骤
                        </span>
                        <span className="truncate text-[11px] text-white/45">
                          {activeEmbeddedStepEntry.step.title}
                        </span>
                      </div>
                        <div
                          className="min-w-0 truncate text-xs text-white/68"
                        title={activeEmbeddedPathSummary}
                      >
                        {activeEmbeddedPrimaryOption?.buttonName ||
                          activeEmbeddedPathSummary}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-2">
                      <span className="text-[11px] text-white/35">
                        {activeEmbeddedPathStatusLabel}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/58">
                        {isEmbeddedPathExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>
                  </button>

                  {isEmbeddedPathExpanded ? (
                    <div className="border-t border-white/8 px-3.5 py-3">
                      {activeEmbeddedSelectedPath.length > 0 ? (
                        <div className="flex flex-wrap items-start gap-1.5">
                          {activeEmbeddedSelectedPath.map(
                            (option, optionIndex) => {
                              const optionDepth = optionIndex + 1;
                              const optionLevelActive =
                                (activeEmbeddedOptionLevel?.depth || 1) ===
                                optionDepth;

                              return (
                                <button
                                  key={`${activeEmbeddedStepEntry.step.key}-${option.key}-${optionDepth}`}
                                  type="button"
                                  onClick={() => {
                                    setPendingAutoAdvanceStepKey(null);
                                    setAutoAdvanceNotice(null);
                                    setActiveEmbeddedStepKey(
                                      activeEmbeddedStepEntry.step.key
                                    );
                                    setActiveEmbeddedOptionDepth(optionDepth);
                                  }}
                                  className={cn(
                                    "inline-flex min-h-[26px] max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] leading-[1.15] transition-colors",
                                    optionLevelActive
                                      ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-100"
                                      : "border-white/14 bg-white/[0.06] text-white/72 hover:border-white/22 hover:bg-white/[0.09] hover:text-white"
                                  )}
                                  title={`返回${getWorkflowOptionDepthLabel(optionDepth)}：${option.buttonName}`}
                                >
                                  <span className="text-[9px] opacity-70">
                                    {getWorkflowOptionDepthShortLabel(
                                      optionDepth
                                    )}
                                  </span>
                                  <span className="max-w-[14rem] break-words whitespace-normal">
                                    {option.buttonName}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <div className="text-xs leading-5 text-white/35">
                          先选择当前步骤的主卡片，完整子节点路径会收纳在这里，需要时再展开查看。
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

              {activeEmbeddedOptionLevel ? (
                <div className="space-y-5">
                {autoAdvanceNotice ? (
                  <motion.div
                    key={`${autoAdvanceNotice.completedStepTitle}-${autoAdvanceNotice.nextStepTitle}`}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,10,12,0.86))] px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300 text-black">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>
                        已完成「{autoAdvanceNotice.completedStepTitle}」
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-200/80" />
                      <span className="text-emerald-200">
                        已自动切换到「{autoAdvanceNotice.nextStepTitle}」
                      </span>
                    </div>
                    <div className="mt-1 pl-9 text-xs leading-5 text-emerald-50/72">
                      刚刚完成的内容：{autoAdvanceNotice.completedSummary}
                    </div>
                  </motion.div>
                ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/52">
                    {activeEmbeddedOptionLevel.depth === 1
                      ? "主卡片"
                      : `${activeEmbeddedOptionLevel.depth}级子卡片`}
                  </span>
                    <span className="text-xs leading-5 text-white/35">
                    {activeEmbeddedOptionLevel.depth === 1
                      ? "先选择当前步骤的主卡片"
                      : "当前层级只展示这一层的子节点卡片，选完再进入下一层"}
                  </span>
                </div>

                <VirtualizedOptionGrid
                  blockedOptionKeys={blockedOptionKeys}
                  onSelect={handleEmbeddedOptionSelect}
                  options={activeEmbeddedOptionLevel.options}
                  selectedKey={activeEmbeddedOptionLevel.selectedKey}
                  step={activeEmbeddedStepEntry.step}
                />
              </div>
            ) : null}
          </motion.section>
        ) : null
      ) : (
        flattenedResolvedSteps.map(({ step, depth }, stepIndex) => (
          <motion.section
            key={step.key}
            className={cn(
              "rounded-2xl border border-white/12 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
              depth > 1 && "ml-3 border-l-4 border-l-emerald-500/30 sm:ml-6"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + stepIndex * 0.05 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-xs font-bold text-emerald-400">
                {stepIndex + 2}
              </span>
              {step.title}
              {depth > 1 ? (
                <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] font-medium text-white/45">
                  {`${depth}级模块`}
                </span>
              ) : null}
            </h2>
            <div className="mb-3 text-xs text-white/55">
              {stepSelectionSummaryMap[step.key]
                ? `已选：${stepSelectionSummaryMap[step.key]}`
                : "待选择：先确定这一组风格卡片，系统再继续组合 Prompt"}
            </div>
            {step.description && (
              <p className="mb-4 text-sm text-white/40">{step.description}</p>
            )}
            {renderOptionLevels(step, step.options || [])}
          </motion.section>
        ))
      )}
    </div>
  );

  if (embedded) {
    return workflowContent;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black">
      <AgentCanvasTopNavDark
        siteName={siteName}
        siteLogo={siteLogo}
        siteLogoDark={siteLogoDark}
        activeKey="agent"
        rightSlot={topNavRightSlot}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain pt-16">
        {/* Hero Section */}
        <section className="relative">
          <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-8 xl:px-10">
            <AgentWorkflowShowcaseBanner
              config={showcaseConfig}
              actionLabel="开始选择风格"
              secondaryActionLabel={onSkipStep ? "进入风格生图" : undefined}
              onActionClick={() => {
                const target = document.getElementById(
                  "agent-workflow-content"
                );
                if (!target) return;
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onSecondaryActionClick={onSkipStep}
            />
          </div>
        </section>

        {/* Main Content */}
        <main className="pb-40">
          <div
            id="agent-workflow-content"
            className="mx-auto max-w-[1480px] px-6 lg:px-8 xl:px-10"
          >
            {workflowContent}
          </div>
        </main>

        {onNextStep ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-8 w-full max-w-[1480px] px-6 lg:px-8 xl:px-10"
          >
            <div className="flex w-full flex-col gap-3 rounded-[24px] border border-white/12 bg-black/88 px-3 py-3 shadow-[0_18px_54px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:px-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-white">
                    工作流进度
                  </div>
                  <div className="text-[11px] text-white/45">
                    已完成 {progress.completed} / {progress.total} 个步骤
                    {progress.isComplete
                      ? "，可以直接进入下一步"
                      : "，也可以选择跳过直接进入下一步"}
                  </div>
                </div>
                <div className="text-[13px] font-semibold text-white">
                  {progress.total > 0
                    ? Math.round((progress.completed / progress.total) * 100)
                    : 0}
                  %
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.45 }}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {onSkipStep ? (
                  <Button
                    variant="ghost"
                    onClick={onSkipStep}
                    className="h-10 gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 text-white/75 hover:bg-white/10 hover:text-white"
                  >
                    跳过并进入下一步
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  onClick={onNextStep}
                  disabled={progress.total > 0 && !progress.isComplete}
                  className={cn(
                    "h-10 gap-2 rounded-full px-6",
                    "bg-gradient-to-r from-emerald-500 to-teal-500",
                    "text-sm font-medium text-white",
                    "hover:from-emerald-400 hover:to-teal-400",
                    "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
                    "disabled:opacity-30"
                  )}
                >
                  下一步：选择生图模式
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* 页脚 */}
        <footer className="mt-8 border-t border-white/5 pb-8 pt-6">
          <div className="mx-auto max-w-[1480px] px-6 lg:px-8 xl:px-10">
            <div className="flex items-center justify-center gap-6 text-sm text-white/30">
              <a href="#" className="hover:text-white/60 transition-colors">
                使用协议
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                隐私条款
              </a>
              <span>© 2024 AI创作平台</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export const AgentWorkflowPanelDarkV2 = memo(AgentWorkflowPanelDarkV2Component);
