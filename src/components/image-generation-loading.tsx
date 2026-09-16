// Modified for standalone community distribution; see NOTICE.
"use client";

import { memo } from "react";
import { ChevronDown, CircleDot } from "lucide-react";
import { GenerationDotPlaceholder } from "@/src/components/generation-dot-placeholder";
import { cn } from "@/src/lib/utils";

type ColorTheme = "brand" | "purple" | "blue" | "green" | "orange" | "red";

interface ImageGenerationLoadingProps {
  imageCount?: number;
  maxImages?: number;
  colorTheme?: ColorTheme;
  modelName?: string;
  providerType?: string;
  phase?: "idle" | "queued" | "processing" | "finalizing" | "failed";
  elapsedSeconds?: number;
  queuePosition?: number;
  sameModelRunningCount?: number;
  concurrencyLimit?: number;
  estimatedWaitMs?: number;
}

const PROVIDER_MODEL_LABEL: Record<string, string> = {
  "alibaba-image": "千问图片",
  "ruxa-image": "RUXA 图片",
  "fal-image": "FAL 图片",
  "openai-image": "OpenAI 图片",
  "stepfun-image": "StepFun 图片",
  "98k-image": "AI 图片",
  midjourney: "Midjourney",
  "volcano-vision": "即梦 4.5",
  gemini: "Gemini 图片",
  krea: "Krea 图片",
};

const PHASE_HINT: Record<NonNullable<ImageGenerationLoadingProps["phase"]>, string> = {
  idle: "任务已创建，正在初始化生成参数。",
  queued: "任务已进入队列，请稍候。",
  processing: "模型正在生成图片，请稍候。",
  finalizing: "图片已生成完成，正在同步到对话。",
  failed: "生成失败，请重试。",
};

const LONG_PROCESSING_HINTS = [
  "正在读取参考图与文字需求。",
  "正在分析主体、场景和构图关系。",
  "正在提取画面中的关键视觉特征。",
  "正在确认图片比例和输出尺寸。",
  "正在匹配当前模型的最佳生成参数。",
  "正在把参考图信息提交给模型。",
  "正在等待模型完成第一阶段推理。",
  "正在生成初始画面结构。",
  "正在保持主体特征和参考一致。",
  "正在补全画面中的空间层次。",
  "正在调整光影方向和明暗关系。",
  "正在优化主体边缘与背景融合。",
  "正在细化材质、纹理和局部细节。",
  "正在减少画面噪点和不自然区域。",
  "正在提升清晰度与整体质感。",
  "正在检查生成结果的完整性。",
  "正在处理高分辨率输出。",
  "正在等待模型返回最终图片。",
  "正在保存图片并同步到对话。",
  "正在准备把结果显示到画布。",
];

function getLongProcessingHint(phase: NonNullable<ImageGenerationLoadingProps["phase"]>, elapsedSeconds: number) {
  if (phase !== "processing" && phase !== "finalizing") return PHASE_HINT[phase];
  const index = Math.min(
    LONG_PROCESSING_HINTS.length - 1,
    Math.floor(Math.max(0, elapsedSeconds) / 15)
  );
  return LONG_PROCESSING_HINTS[index];
}

function formatImageQueueWaitLabel(estimatedWaitMs?: number) {
  const numeric = Number(estimatedWaitMs || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "预计即将开始";
  }
  const seconds = Math.max(1, Math.round(numeric / 1000));
  if (seconds < 60) {
    return `预计 ${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return remainSeconds > 0
    ? `预计 ${minutes} 分 ${remainSeconds} 秒`
    : `预计 ${minutes} 分钟`;
}

function getPlaceholderGridClass(count: number) {
  if (count <= 1) return "";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

export const ImageGenerationLoading = memo(
  ({
    imageCount = 1,
    maxImages = 9,
    modelName,
    providerType,
    phase = "processing",
    elapsedSeconds = 0,
    queuePosition,
    sameModelRunningCount,
    concurrencyLimit,
    estimatedWaitMs,
  }: ImageGenerationLoadingProps) => {
    const requestedCount = Math.max(1, Math.round(Number(imageCount || 1)));
    const count = Math.min(requestedCount, Math.max(1, maxImages));
    const isMultiImage = requestedCount > 1;
    const resolvedModelName =
      modelName?.trim() || PROVIDER_MODEL_LABEL[providerType || ""] || "AI 图片模型";
    const estimateRangeLabel = providerType === "grsai-gpt-image" ? "2～5分钟" : "60～120秒";
    const elapsedLabel =
      elapsedSeconds > 0 ? `已等待 ${elapsedSeconds}s` : `预计 ${estimateRangeLabel}`;
    const phaseHint = getLongProcessingHint(phase, elapsedSeconds);
    const queueLine =
      phase === "queued" && Number.isFinite(queuePosition)
        ? Math.max(0, Number(queuePosition || 0)) > 0
          ? `排队中，前方 ${Math.max(0, Number(queuePosition || 0))} 个`
          : "排队中，等待进入执行"
        : null;
    const queueDetailLine =
      phase === "queued"
        ? `当前模型运行 ${Math.max(
            0,
            Number(sameModelRunningCount || 0)
          )}/${Math.max(1, Number(concurrencyLimit || 0) || 1)}，${formatImageQueueWaitLabel(
            estimatedWaitMs
          )}`
        : null;

    return (
      <div
        className="group/message fade-in w-full animate-in duration-300"
        data-role="assistant"
        data-testid="message-assistant-image-loading"
      >
        <div
          className={cn(
            "w-full space-y-2.5",
            isMultiImage ? "max-w-[760px]" : "max-w-[520px]"
          )}
        >
          <div className="flex items-center gap-2 text-[13px] text-[#9aa3b2]">
            <ChevronDown className="h-4 w-4" />
            <span className="font-medium">开始生成</span>
          </div>

          <div className="flex items-center gap-2 text-[#a8b1bf]">
            <CircleDot className="h-3.5 w-3.5 fill-current" />
            <span className="text-[14px]">{resolvedModelName}</span>
          </div>

          {isMultiImage ? (
            <div
              className={cn(
                "grid w-full gap-2.5 rounded-[24px] bg-black/[0.025] p-2.5 dark:bg-white/[0.035]",
                getPlaceholderGridClass(count)
              )}
            >
              {Array.from({ length: count }).map((_, index) => (
                <GenerationDotPlaceholder
                  className="aspect-square min-h-0 w-full rounded-[18px] p-3"
                  compact
                  key={`image-generation-placeholder-${index}`}
                  phase={phase}
                  showProgress={false}
                  title={`图 ${index + 1}/${requestedCount} 生成中`}
                />
              ))}
            </div>
          ) : (
            <GenerationDotPlaceholder
              className="h-[336px] min-h-[336px] w-full max-w-[336px]"
              phase={phase}
            />
          )}

          <div className="space-y-0.5 text-[#9aa3b2]">
            <div className="text-[13px] font-medium">
              使用 {resolvedModelName} 生成 {requestedCount} 张图片，预计 {estimateRangeLabel}
            </div>
            {queueLine ? <div className="text-[13px]">{queueLine}</div> : null}
            {queueDetailLine ? <div className="text-[13px]">{queueDetailLine}</div> : null}
            {(phase !== "processing" || elapsedSeconds > 0) && (
              <div className="text-[13px]">
                {phaseHint} {elapsedLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ImageGenerationLoading.displayName = "ImageGenerationLoading";
