// Modified for standalone community distribution; see NOTICE.
"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Copy, RotateCcw, Sparkles, Wand2 } from "lucide-react";
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

interface AgentWorkflowPanelNewProps {
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

function StepCard({
  option,
  step,
  selected,
  onClick,
  index,
}: {
  option: { key: string; buttonName: string; description?: string | null; previewImageUrl?: string | null };
  step: { title: string };
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  const previewUrl = getAgentPresetPreviewImageUrl(option.previewImageUrl || "");

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group relative mx-auto w-full max-w-[230px] overflow-hidden rounded-2xl text-left transition-all duration-300",
        "border bg-white",
        selected
          ? [
              "border-brand-selection/50 shadow-[0_0_0_1px_rgba(233,255,56,0.2),0_8px_24px_rgba(233,255,56,0.12)]",
              "ring-1 ring-brand-selection/20",
            ]
          : [
              "border-slate-200/60 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_8px_rgba(0,0,0,0.04)]",
              "hover:border-brand-selection/50 hover:shadow-[0_0_0_1px_rgba(233,255,56,0.1),0_8px_24px_rgba(0,0,0,0.08)]",
            ]
      )}
    >
      {/* 选中指示器 */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] transition-all duration-300",
          selected
            ? "bg-brand-accent"
            : "bg-transparent group-hover:bg-brand-accent/20"
        )}
      />

      {/* 预览图 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-50">
        {previewUrl ? (
          <motion.img
            src={previewUrl}
            alt={option.buttonName}
            loading={index < 4 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index < 4 ? "high" : "low"}
            sizes={AGENT_PRESET_PREVIEW_IMAGE_SIZES}
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Wand2 className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* 选中标记 */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent text-brand-accent-foreground shadow-lg"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 步骤标签 */}
        <div className="absolute left-2 top-2">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur-sm">
            {step.title}
          </span>
        </div>
      </div>

      {/* 信息区 */}
      <div className="space-y-1 p-3">
        <h4 className="text-sm font-semibold text-slate-900">{option.buttonName}</h4>
        {option.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{option.description}</p>
        )}
      </div>
    </motion.button>
  );
}

export function AgentWorkflowPanelNew({
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
}: AgentWorkflowPanelNewProps) {
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
      toast.success("Prompt 已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-slate-950",
        embedded ? "" : "border-r border-slate-200/60 dark:border-slate-800/60"
      )}
    >
      {/* 头部 */}
      <div className="border-b border-slate-200/60 bg-white/50 p-5 dark:border-slate-800/60 dark:bg-slate-950/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Agent 工作流
              </h2>
            </motion.div>
            <motion.p
              className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              先完成工作流设定，下一步再进入生图模式执行
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onReset) {
                  onReset();
                  return;
                }
                onInputsChange({ primarySku: "", secondarySku: "", brand: "", store: "", officialSecondCategory: "", officialThirdCategory: "", thirdCategory: "", fourthCategory: "", fifthCategory: "", priceBand: "" });
                onMaterialsChange({
                  primary: createEmptyAgentWorkflowMaterialSelection(),
                  secondary: createEmptyAgentWorkflowMaterialSelection(),
                });
                onSelectionsChange({});
              }}
              className="h-9 gap-1.5 rounded-xl border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              清空
            </Button>
          </motion.div>
        </div>

        {/* 进度指示器 */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>完成进度</span>
            <span className="font-medium text-indigo-600">{progress.completed}/{progress.total}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-5">
          {/* 基础配置 */}
          <motion.section
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-600">
                1
              </span>
              基础配置
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <SearchableSelect
                value={inputs.brand}
                options={brandOptions}
                placeholder={`选择${firstCategoryLabel}`}
                searchPlaceholder={`输入${firstCategoryLabel}名筛选`}
                emptyText={`暂无${firstCategoryLabel}可选`}
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
                placeholder={`选择${secondCategoryLabel}`}
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
                placeholder="选择价格带"
                searchPlaceholder="输入价格带筛选"
                emptyText="暂无价格带可选"
                disabled={priceBandOptions.length === 0}
                onValueChange={(value) => onInputsChange({ ...inputs, priceBand: value })}
              />
            </div>
          </motion.section>

          {/* 工作流步骤 */}
          {resolvedConfig.steps.length > 0 ? (
            resolvedConfig.steps.map((step, stepIndex) => (
              <motion.section
                key={step.key}
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + stepIndex * 0.05 }}
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    {stepIndex + 2}
                  </span>
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-xs text-slate-500">{step.description}</p>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {step.options.map((option, optionIndex) => (
                    <StepCard
                      key={option.key}
                      option={option}
                      step={step}
                      selected={selections[step.key] === option.key}
                      onClick={() =>
                        onSelectionsChange({
                          ...selections,
                          [step.key]: selections[step.key] === option.key ? undefined : option.key,
                        })
                      }
                      index={optionIndex}
                    />
                  ))}
                </div>
              </motion.section>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30"
            >
              当前还没有启用的工作流步骤
            </motion.div>
          )}

          {/* 摘要区域 */}
          {summary.length > 0 && (
            <motion.section
              className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-800">当前选择</h3>
              <div className="space-y-2">
                {summary.map((item) => (
                  <div
                    key={`${item.stepKey}-${item.optionKey}`}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900"
                  >
                    <span className="text-slate-500">{item.stepTitle}</span>
                    <span className="font-medium text-slate-900">{item.optionName}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Prompt 预览 */}
          <motion.section
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Prompt 预览</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                className="h-8 gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                复制
              </Button>
            </div>
            <Textarea
              value={composerContext?.promptText || ""}
              readOnly
              rows={8}
              placeholder="选择工作流后，这里会自动生成结构化 Prompt"
              className="resize-none rounded-xl border-slate-200/60 bg-slate-50 text-xs leading-relaxed dark:border-slate-800/60 dark:bg-slate-900/50"
            />
          </motion.section>

          {/* 下一步按钮 */}
          {onNextStep && (
            <motion.div
              className="flex flex-wrap justify-end gap-2 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              {onSkipStep && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSkipStep}
                  className="h-10 gap-1.5 rounded-xl border-slate-200 text-slate-600"
                >
                  跳过选择
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                onClick={onNextStep}
                disabled={progress.total > 0 && !progress.isComplete}
                className="h-10 gap-1.5 rounded-xl bg-slate-900 px-6 text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                下一步：选择生图模式
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
