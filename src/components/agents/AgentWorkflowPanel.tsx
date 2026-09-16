// Modified for standalone community distribution; see NOTICE.
"use client";

import { useMemo } from "react";
import { ArrowRight, Copy, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { SearchableSelect } from "@/src/components/ui/searchable-select";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import {
  defaultAgentWorkflowUiConfig,
  getAgentWorkflowCategoryLabels,
  getAgentWorkflowBrandStoreEntries,
  getAgentWorkflowFifthCategoryOptionsByBrandStoreThirdFourth,
  getAgentWorkflowFourthCategoryOptionsByBrandStoreThirdCategory,
  getAgentWorkflowPriceBandOptions,
  getAgentWorkflowThirdCategoryOptionsByBrandStore,
  getAgentWorkflowStoreOptionsByBrand,
} from "@/src/lib/agents/workflow-ui-config";
import { createEmptyAgentWorkflowMaterialSelection } from "@/src/lib/agents/workflow-material-config";
import {
  buildAgentWorkflowComposerContext,
  getAgentWorkflowProgress,
} from "@/src/lib/agents/workflow-composer";
import type {
  AgentWorkflowComposerSelection,
  AgentWorkflowMaterialSelections,
  AgentWorkflowStepKey,
  AgentWorkflowUiConfig,
} from "@/types/agent";
import {
  AGENT_PRESET_PREVIEW_IMAGE_SIZES,
  getAgentPresetPreviewImageUrl,
} from "@/src/components/agents/agent-preset-preview";

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

interface AgentWorkflowPanelProps {
  config?: AgentWorkflowUiConfig | null;
  inputs: AgentWorkflowInputs;
  onInputsChange: (next: AgentWorkflowInputs) => void;
  materials: AgentWorkflowMaterialSelections;
  onMaterialsChange: (next: AgentWorkflowMaterialSelections) => void;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
  onSelectionsChange: (next: Partial<Record<AgentWorkflowStepKey, string>>) => void;
  onReset?: () => void;
  embedded?: boolean;
  onNextStep?: () => void;
  onSkipStep?: () => void;
}

function buildSelectionSummary(params: {
  config: AgentWorkflowUiConfig;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}) {
  const result: AgentWorkflowComposerSelection[] = [];

  for (const step of params.config.steps) {
    const selectedOptionKey = params.selections[step.key];
    if (!selectedOptionKey) continue;

    const option = step.options.find((item) => item.key === selectedOptionKey && item.enabled);
    if (!option) continue;

    result.push({
      stepKey: step.key,
      stepTitle: step.title,
      optionKey: option.key,
      optionName: option.buttonName,
      promptFragment: option.promptFragment || "",
    });
  }

  return result;
}

export function AgentWorkflowPanel({
  config,
  inputs,
  onInputsChange,
  materials,
  onMaterialsChange,
  selections,
  onSelectionsChange,
  onReset,
  embedded = false,
  onNextStep,
  onSkipStep,
}: AgentWorkflowPanelProps) {
  const categoryLabels = useMemo(
    () => getAgentWorkflowCategoryLabels(config),
    [config]
  );
  const firstCategoryLabel = categoryLabels.firstCategory;
  const secondCategoryLabel = categoryLabels.secondCategory;
  const thirdCategoryLabel = categoryLabels.thirdCategory;
  const fourthCategoryLabel = categoryLabels.fourthCategory;
  const fifthCategoryLabel = categoryLabels.fifthCategory;
  const brandOptions = useMemo(
    () => config?.inputOptions?.brands || defaultAgentWorkflowUiConfig.inputOptions?.brands || [],
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
  const fifthCategoryOptions = useMemo(
    () =>
      getAgentWorkflowFifthCategoryOptionsByBrandStoreThirdFourth({
        config,
        brand: inputs.brand,
        store: inputs.store,
        thirdCategory: inputs.thirdCategory,
        fourthCategory: inputs.fourthCategory,
      }),
    [config, inputs.brand, inputs.store, inputs.thirdCategory, inputs.fourthCategory]
  );
  const priceBandOptions = useMemo(
    () => getAgentWorkflowPriceBandOptions(config),
    [config]
  );
  const resolvedConfig = useMemo(() => {
    const source = config || defaultAgentWorkflowUiConfig;
    return {
      steps: [...source.steps]
        .filter((step) => step.enabled)
        .map((step) => ({
          ...step,
          options: [...step.options]
            .filter((option) => option.enabled)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        }))
        .filter((step) => step.options.length > 0)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    };
  }, [config]);

  const summary = useMemo(
    () => buildSelectionSummary({ config: resolvedConfig, selections }),
    [resolvedConfig, selections]
  );
  const composerContext = useMemo(
    () =>
      buildAgentWorkflowComposerContext({
        config: resolvedConfig,
        inputs,
        materials,
        selections,
      }),
    [inputs, materials, resolvedConfig, selections]
  );
  const progress = useMemo(
    () => getAgentWorkflowProgress({ config: resolvedConfig, selections }),
    [resolvedConfig, selections]
  );

  const handleCopyPrompt = async () => {
    if (!composerContext?.promptText) {
      toast.error("当前还没有可复制的 Prompt");
      return;
    }

    try {
      await navigator.clipboard.writeText(composerContext.promptText);
      toast.success("Prompt 已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-zinc-950",
        embedded ? "" : "border-r"
      )}
    >
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Agent 工作流
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              先完成工作流设定，下一步再进入生图模式执行。
            </div>
            <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              已完成 {progress.completed}/{progress.total} 个环节
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (onReset) {
                onReset();
                return;
              }
                onInputsChange({
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
                });
              onMaterialsChange({
                primary: createEmptyAgentWorkflowMaterialSelection(),
                secondary: createEmptyAgentWorkflowMaterialSelection(),
              });
              onSelectionsChange({});
            }}
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            清空
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <section className="space-y-3">
            <div className="text-sm font-medium">基础配置</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <SearchableSelect
                value={inputs.brand}
                options={brandOptions}
                placeholder={firstCategoryLabel}
                searchPlaceholder={`输入${firstCategoryLabel}名筛选`}
                emptyText={`暂无${firstCategoryLabel}可选，请先到系统设置配置`}
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
                    fifthCategory: "",
                  })
                }
              />
              <SearchableSelect
                value={inputs.store}
                options={storeOptions}
                placeholder={secondCategoryLabel}
                searchPlaceholder={`输入${secondCategoryLabel}名筛选`}
                emptyText={
                  inputs.brand
                    ? `当前${firstCategoryLabel}下暂无${secondCategoryLabel}可选`
                    : `请先选择${firstCategoryLabel}`
                }
                disabled={!inputs.brand || (brandStoreEntries.length > 0 && storeOptions.length === 0)}
                onValueChange={(value) =>
                  onInputsChange({
                    ...inputs,
                    store: value,
                    thirdCategory:
                      value.trim().toLowerCase() === inputs.store.trim().toLowerCase()
                        ? inputs.thirdCategory
                        : "",
                    fourthCategory: "",
                    fifthCategory: "",
                  })
                }
              />
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
                disabled={!inputs.store || thirdCategoryOptions.length === 0}
                onValueChange={(value) =>
                  onInputsChange({
                    ...inputs,
                    thirdCategory: value,
                    fourthCategory:
                      value.trim().toLowerCase() === inputs.thirdCategory.trim().toLowerCase()
                        ? inputs.fourthCategory
                        : "",
                    fifthCategory: "",
                  })
                }
              />
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
                disabled={!inputs.thirdCategory || fourthCategoryOptions.length === 0}
                onValueChange={(value) =>
                  onInputsChange({
                    ...inputs,
                    fourthCategory: value,
                    fifthCategory:
                      value.trim().toLowerCase() === inputs.fourthCategory.trim().toLowerCase()
                        ? inputs.fifthCategory
                        : "",
                  })
                }
              />
              <SearchableSelect
                value={inputs.fifthCategory}
                options={fifthCategoryOptions}
                placeholder={`选择${fifthCategoryLabel}`}
                searchPlaceholder={`输入${fifthCategoryLabel}筛选`}
                emptyText={
                  inputs.fourthCategory
                    ? `当前${fourthCategoryLabel}下暂无${fifthCategoryLabel}`
                    : `请先选择${fourthCategoryLabel}`
                }
                disabled={!inputs.fourthCategory || fifthCategoryOptions.length === 0}
                onValueChange={(value) => onInputsChange({ ...inputs, fifthCategory: value })}
              />
              <SearchableSelect
                value={inputs.priceBand}
                options={priceBandOptions}
                placeholder="价格带"
                searchPlaceholder="输入价格带筛选"
                emptyText="暂无价格带可选"
                disabled={priceBandOptions.length === 0}
                onValueChange={(value) => onInputsChange({ ...inputs, priceBand: value })}
              />
            </div>
            {(brandOptions.length > 0 || storeOptions.length > 0) && (
              <div className="text-xs text-muted-foreground">
                {firstCategoryLabel}和{secondCategoryLabel}支持输入关键字匹配下拉选择，候选列表由系统设置配置。
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              SKU / SPU 搜图已移动到下一步“生图模式”中，选中的图片会直接进入对应生图槽位。
            </div>
          </section>

          {resolvedConfig.steps.length > 0 ? (
            resolvedConfig.steps.map((step) => (
            <section key={step.key} className="space-y-3">
              <div>
                <div className="text-sm font-medium">{step.title}</div>
                {step.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">{step.description}</div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {step.options.map((option, optionIndex) => {
                  const selected = selections[step.key] === option.key;
                  const previewUrl = getAgentPresetPreviewImageUrl(option.previewImageUrl || "");
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        onSelectionsChange({
                          ...selections,
                          [step.key]: selected ? undefined : option.key,
                        })
                      }
                      className={cn(
                        "mx-auto w-full max-w-[230px] overflow-hidden rounded-2xl border text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
                          : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={option.buttonName}
                            loading={optionIndex < 4 ? "eager" : "lazy"}
                            decoding="async"
                            fetchPriority={optionIndex < 4 ? "high" : "low"}
                            sizes={AGENT_PRESET_PREVIEW_IMAGE_SIZES}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                            暂无预览图
                          </div>
                        )}
                        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-black shadow-sm">
                          {selected ? "已选择" : step.title}
                        </div>
                      </div>
                      <div className="space-y-1.5 p-3">
                        <div className="text-sm font-semibold">{option.buttonName}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {option.description || "点击选择该工作流方案"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            ))
          ) : (
            <section className="rounded-2xl border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
              当前还没有启用的工作流步骤，请先到系统设置新增步骤或启用现有步骤。
            </section>
          )}

          <section className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-medium">当前工作流摘要</div>
            {inputs.primarySku ||
            inputs.secondarySku ||
            inputs.brand ||
            inputs.store ||
            inputs.thirdCategory ||
            inputs.fourthCategory ||
            inputs.fifthCategory ||
            inputs.priceBand ||
            materials.primary.selectedImageIds.length > 0 ||
            materials.secondary.selectedImageIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {inputs.primarySku ? (
                  <span className="rounded-full bg-background px-2 py-1">主SKU：{inputs.primarySku}</span>
                ) : null}
                {inputs.secondarySku ? (
                  <span className="rounded-full bg-background px-2 py-1">搭配SKU：{inputs.secondarySku}</span>
                ) : null}
                {inputs.brand ? (
                  <span className="rounded-full bg-background px-2 py-1">{firstCategoryLabel}：{inputs.brand}</span>
                ) : null}
                {inputs.store ? (
                  <span className="rounded-full bg-background px-2 py-1">{secondCategoryLabel}：{inputs.store}</span>
                ) : null}
                {inputs.thirdCategory ? (
                  <span className="rounded-full bg-background px-2 py-1">{thirdCategoryLabel}：{inputs.thirdCategory}</span>
                ) : null}
                {inputs.fourthCategory ? (
                  <span className="rounded-full bg-background px-2 py-1">{fourthCategoryLabel}：{inputs.fourthCategory}</span>
                ) : null}
                {inputs.fifthCategory ? (
                  <span className="rounded-full bg-background px-2 py-1">{fifthCategoryLabel}：{inputs.fifthCategory}</span>
                ) : null}
                {inputs.priceBand ? (
                  <span className="rounded-full bg-background px-2 py-1">价格带：{inputs.priceBand}</span>
                ) : null}
                {materials.primary.selectedImageIds.length > 0 ? (
                  <span className="rounded-full bg-background px-2 py-1">
                    主SPU图：已选 {materials.primary.selectedImageIds.length} 张
                  </span>
                ) : null}
                {materials.secondary.selectedImageIds.length > 0 ? (
                  <span className="rounded-full bg-background px-2 py-1">
                    搭配SKU图：已选 {materials.secondary.selectedImageIds.length} 张
                  </span>
                ) : null}
              </div>
            ) : null}
            {summary.length > 0 ? (
              <div className="space-y-2">
                {summary.map((item) => (
                  <div
                    key={`${item.stepKey}-${item.optionKey}`}
                    className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{item.stepTitle}</span>
                    <span className="font-medium">{item.optionName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                还没有选择工作流方案，先从上面的卡片开始。
              </div>
            )}
            {composerContext?.referenceImages.length ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">已选素材图</div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {composerContext.referenceImages.map((image) => (
                    <span key={image.id} className="rounded-full bg-background px-2 py-1">
                      {image.sourceLabel} · {image.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Prompt 预览</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  右侧发送时，会把下面这份工作流设定作为隐藏上下文一起注入。
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt}>
                <Copy className="mr-1 h-4 w-4" />
                复制
              </Button>
            </div>
            <Textarea
              value={composerContext?.promptText || ""}
              readOnly
              rows={10}
              placeholder="选择左侧工作流后，这里会自动生成结构化 Prompt。"
              className="resize-none bg-background"
            />
            {onNextStep ? (
              <div className="flex flex-wrap justify-end gap-2">
                {onSkipStep ? (
                  <Button type="button" variant="outline" onClick={onSkipStep}>
                    跳过选择，直接进入下一步
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={onNextStep}
                  disabled={progress.total > 0 && !progress.isComplete}
                >
                  下一步：选择生图模式
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
