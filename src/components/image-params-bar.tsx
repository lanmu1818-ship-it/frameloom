// Modified for standalone community distribution; see NOTICE.
"use client";

import { getGptImage2OutputSize } from "@/src/lib/ai/gpt-image-2-sizes";
import { isGptImage2Model } from "@/src/lib/ai/image-reference-limits";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { ChevronDown, ChevronUp, Link2, Scan, SlidersHorizontal, Sparkles } from "lucide-react";
import { getGrsaiGptImageOutputSize } from "@/src/lib/ai/grsai-gpt-image-sizes";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { Switch } from "@/src/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";

// 图片生成参数接口
export interface ImageGenerationParams {
  aspectRatio: string;
  imageSize: string;
  imageCount?: number;           // 生成图片数量
  // 🆕 阿里生图专用参数
  size?: string;                 // 自定义分辨率，如 "1024*1024"
  negativePrompt?: string;       // 反向提示词
  promptExtend?: boolean;        // 提示词智能优化
  enableWebSearch?: boolean;     // 联网 / 灵感搜索
  watermark?: boolean;           // 水印
  seed?: number;                 // 随机种子
}

interface ImageParamsBarProps {
  modelName?: string;
  modelId?: string;
  initialParams?: Partial<ImageGenerationParams>;
  onParamsChange?: (params: ImageGenerationParams) => void;
  inline?: boolean; // 内联模式：只显示参数按钮，不显示外层容器
  providerType?: string; // 模型类型：gemini, volcano-vision, alibaba-image, ruxa-image 等
  hideImageCount?: boolean; // 隐藏图片数量按钮（仅个别页面需要）
  hideAdvancedOptions?: boolean; // 隐藏高级设置按钮
  inlineTheme?: "light" | "dark" | "minimal";
  showInlineDivider?: boolean;
  minimalTriggerVariant?: "summary" | "icon";
  minimalTriggerClassName?: string;
  // 🆕 图片生成模型特性配置（从模型配置中读取）
  imageGenConfig?: {
    maxImages?: number;
    supportsSize?: boolean;
    supports1K?: boolean;
    supports2K?: boolean;
    supports4K?: boolean;
    supportedResolutions?: string[] | null;
    supportedRatios?: string[] | null;
    supportsPromptExtend?: boolean;
    supportsNegativePrompt?: boolean;
    supportsWatermark?: boolean;
    supportsSeed?: boolean;
  };
}

// 图片比例选项（根据 Nano Banana 文档）
const ASPECT_RATIO_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "5:4", label: "5:4" },
  { value: "4:5", label: "4:5" },
  { value: "21:9", label: "21:9" },
] as const;

// 图片大小选项（仅支持 nano-banana-pro）
const IMAGE_SIZE_OPTIONS = [
  { value: "1K", label: "1K", disabled: false },
  { value: "2K", label: "2K", disabled: false },
  { value: "4K", label: "4K", disabled: false },
] as const;
type ImageSizeValue = (typeof IMAGE_SIZE_OPTIONS)[number]["value"];

function normalizeImageSizeValue(value?: string, fallback: ImageSizeValue = "2K"): ImageSizeValue {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "1K" || normalized === "2K" || normalized === "4K") {
    return normalized;
  }
  return fallback;
}

const IMAGE_SIZE_PIXEL_MAP: Record<ImageSizeValue, number> = {
  "1K": 1024,
  "2K": 2048,
  "4K": 4096,
};

export function ImageParamsBar({
  modelName = "Gemini 图片生成",
  modelId,
  initialParams,
  onParamsChange,
  inline = false,
  providerType = "gemini", // 默认 gemini
  hideImageCount = false,
  hideAdvancedOptions = false,
  inlineTheme = "light",
  showInlineDivider = true,
  minimalTriggerVariant = "summary",
  minimalTriggerClassName,
  imageGenConfig,
}: ImageParamsBarProps) {
  const hasNormalizedParamDiff = (
    source: Partial<ImageGenerationParams> | undefined,
    normalized: ImageGenerationParams
  ) => {
    if (!source) return false;

    const keys: Array<keyof ImageGenerationParams> = [
      "aspectRatio",
      "imageSize",
      "imageCount",
      "size",
      "negativePrompt",
      "promptExtend",
      "enableWebSearch",
      "watermark",
      "seed",
    ];

    return keys.some(
      (key) => source[key] !== undefined && source[key] !== normalized[key]
    );
  };

  const getImageCountOptions = () => {
    if (imageGenConfig?.maxImages) {
      return Array.from({ length: imageGenConfig.maxImages }, (_, i) => i + 1);
    }

    if (inlineTheme === "minimal") {
      return Array.from({ length: 10 }, (_, i) => i + 1);
    }

    if (providerType === "ruxa-image") {
      return [1];
    }

    if (
      providerType === "openai-image" ||
      providerType === "stepfun-image" ||
      providerType === "98k-image" ||
      providerType === "midjourney"
    ) {
      return [1];
    }

    // 否则根据 providerType 判断
    if (providerType === "alibaba-image") {
      // 阿里生图：1~6 张（qwen-image-edit-plus）
      return [1, 2, 3, 4, 5, 6];
    }
    if (providerType === "volcano-vision") {
      // 即梦4.5（豆包）：1~3 张
      return [1, 2, 3];
    }
    // Gemini：1~2 张
    return [1, 2];
  };
  const isImageSizeAllowed = (s: ImageSizeValue) => {
    if (!imageGenConfig) return true;
    const supportedResolutions = Array.isArray(imageGenConfig.supportedResolutions)
      ? imageGenConfig.supportedResolutions
          .map((item) => String(item || "").trim().toUpperCase())
          .filter(Boolean)
      : [];
    if (supportedResolutions.length > 0) return supportedResolutions.includes(s);
    if (s === "1K") return imageGenConfig.supports1K !== false;
    if (s === "2K") return imageGenConfig.supports2K !== false;
    if (s === "4K") return imageGenConfig.supports4K !== false;
    return true;
  };

  const getFallbackImageSize = () =>
    (["2K", "1K", "4K"] as const).find(isImageSizeAllowed) || "2K";

  const is98kGptImage2 = providerType === "98k-image" && isGptImage2Model(modelId || modelName);

  const getAvailableAspectRatioOptions = (imageSize: string) => {
    const normalizedImageSize = normalizeImageSizeValue(imageSize);
    const configuredRatios = Array.isArray(imageGenConfig?.supportedRatios)
      ? Array.from(
          new Set(
            imageGenConfig.supportedRatios
              .map((item) => String(item || "").trim())
              .filter(Boolean)
          )
        )
      : [];
    const baseOptions =
      configuredRatios.length > 0
        ? configuredRatios.map((ratio) => ({ value: ratio, label: ratio }))
        : [...ASPECT_RATIO_OPTIONS];
    const options =
      normalizedImageSize === "4K" && !is98kGptImage2
        ? baseOptions.filter((option) => option.value === "1:1")
        : baseOptions;
    return options.length > 0 ? options : [{ value: "1:1", label: "1:1" }];
  };

  const getFallbackAspectRatio = (imageSize: string) => {
    const options = getAvailableAspectRatioOptions(imageSize);
    return (
      options.find((option) => option.value === "auto")?.value ||
      options.find((option) => option.value === "1:1")?.value ||
      options[0]?.value ||
      "1:1"
    );
  };

  const clampParamsByProvider = (raw: ImageGenerationParams): ImageGenerationParams => {
    const options = getImageCountOptions();
    const fallbackCount = options[0] ?? 1;
    const imageCount = options.includes(raw.imageCount || fallbackCount) ? (raw.imageCount || fallbackCount) : fallbackCount;
    // 根据模型配置校正分辨率：如果当前选择的档位被禁用，则降级到可用的档位
    let imageSize = normalizeImageSizeValue(raw.imageSize);
    if (!isImageSizeAllowed(imageSize)) {
      imageSize = getFallbackImageSize();
    }
    const ratioOptions = getAvailableAspectRatioOptions(imageSize);
    const rawAspectRatio = String(raw.aspectRatio || "").trim() || getFallbackAspectRatio(imageSize);
    const aspectRatio = ratioOptions.some((option) => option.value === rawAspectRatio)
      ? rawAspectRatio
      : getFallbackAspectRatio(imageSize);
    return {
      ...raw,
      aspectRatio,
      imageSize,
      imageCount,
    };
  };

  const isSameParams = (a: ImageGenerationParams, b: ImageGenerationParams) =>
    a.aspectRatio === b.aspectRatio &&
    a.imageSize === b.imageSize &&
    (a.imageCount || 1) === (b.imageCount || 1) &&
    a.size === b.size &&
    a.negativePrompt === b.negativePrompt &&
    a.promptExtend === b.promptExtend &&
    a.enableWebSearch === b.enableWebSearch &&
    a.watermark === b.watermark &&
    a.seed === b.seed;

  const buildBaseParams = (source?: Partial<ImageGenerationParams>) =>
    clampParamsByProvider({
      aspectRatio: inlineTheme === "minimal" ? "1:1" : "auto",
      imageSize: "2K",
      imageCount: 1,
      promptExtend: true,
      watermark: false,
      ...source,
      ...(inlineTheme === "minimal" && (!source?.aspectRatio || source.aspectRatio === "auto")
        ? { aspectRatio: "1:1" }
        : {}),
    });

  const [params, setParams] = useState<ImageGenerationParams>({
    ...buildBaseParams(initialParams),
  });
  const [minimalParamsOpen, setMinimalParamsOpen] = useState(false);
  const [qualityLabel, setQualityLabel] = useState<"自动" | "高" | "中" | "低">("中");

  const imageCountOptions = getImageCountOptions();
  const showImageCountSelector = !hideImageCount && imageCountOptions.length > 1;

  // 是否显示阿里生图专用参数
  const isAlibabaImage = providerType === "alibaba-image";
  const showPromptExtend = isAlibabaImage || imageGenConfig?.supportsPromptExtend;
  const showNegativePrompt = isAlibabaImage || imageGenConfig?.supportsNegativePrompt;

  // 根据模型配置过滤可用的分辨率档位
  const availableSizeOptions = IMAGE_SIZE_OPTIONS.filter((option) => {
    if (option.disabled) return false;
    return isImageSizeAllowed(option.value);
  });
  const availableAspectRatioOptions = getAvailableAspectRatioOptions(params.imageSize);

  const getComputedOutputSize = (aspectRatio: string, imageSize: string) => {
    if (is98kGptImage2) return getGptImage2OutputSize(aspectRatio, imageSize);
    if (providerType === "grsai-gpt-image") {
      return getGrsaiGptImageOutputSize(aspectRatio, imageSize);
    }

    const size = IMAGE_SIZE_PIXEL_MAP[normalizeImageSizeValue(imageSize)];
    if (aspectRatio === "auto" || aspectRatio === "1:1") {
      return { width: size, height: size };
    }

    const [wRaw, hRaw] = aspectRatio.split(":").map((item) => Number(item));
    if (!wRaw || !hRaw) {
      return { width: size, height: size };
    }

    if (wRaw >= hRaw) {
      return {
        width: size,
        height: Math.max(1, Math.round((size * hRaw) / wRaw)),
      };
    }

    return {
      width: Math.max(1, Math.round((size * wRaw) / hRaw)),
      height: size,
    };
  };

  const renderRatioGlyph = (ratioValue: string) => {
    if (ratioValue === "auto") {
      return <Scan className="h-4 w-4" />;
    }

    const [wRaw, hRaw] = ratioValue.split(":").map((item) => Number(item));
    if (!wRaw || !hRaw) {
      return <Scan className="h-4 w-4" />;
    }
    const maxSide = 14;
    let width = maxSide;
    let height = maxSide;
    if (wRaw >= hRaw) {
      width = maxSide;
      height = Math.max(6, Math.round((maxSide * hRaw) / wRaw));
    } else {
      height = maxSide;
      width = Math.max(6, Math.round((maxSide * wRaw) / hRaw));
    }

    return (
      <span
        className="inline-block rounded-[6px] border-2 border-current"
        style={{ width, height }}
      />
    );
  };

  // 仅同步展示状态；只有确实发生参数校正时才回写父层，避免和父组件互相触发更新。
  useEffect(() => {
    const nextParams = buildBaseParams(initialParams);
    setParams((prevParams) => (isSameParams(prevParams, nextParams) ? prevParams : nextParams));
    if (onParamsChange && hasNormalizedParamDiff(initialParams, nextParams)) {
      onParamsChange(nextParams);
    }
  }, [
    imageGenConfig?.maxImages,
    imageGenConfig?.supportedRatios,
    imageGenConfig?.supportedResolutions,
    imageGenConfig?.supports1K,
    imageGenConfig?.supports2K,
    imageGenConfig?.supports4K,
    initialParams,
    onParamsChange,
    providerType,
  ]);

  const updateParam = <K extends keyof ImageGenerationParams>(
    key: K,
    value: ImageGenerationParams[K]
  ) => {
    const newParams = clampParamsByProvider({ ...params, [key]: value });
    setParams((prevParams) => (isSameParams(prevParams, newParams) ? prevParams : newParams));
    if (!isSameParams(params, newParams)) {
      onParamsChange?.(newParams);
    }
  };

  const updateParams = (patch: Partial<ImageGenerationParams>) => {
    const newParams = clampParamsByProvider({ ...params, ...patch });
    setParams((prevParams) => (isSameParams(prevParams, newParams) ? prevParams : newParams));
    if (!isSameParams(params, newParams)) {
      onParamsChange?.(newParams);
    }
  };

  // 内联模式：只返回参数按钮，嵌入工具栏
  if (inline) {
    const isDarkInline = inlineTheme === "dark";
    const isMinimalInline = inlineTheme === "minimal";
    const outputSize = getComputedOutputSize(params.aspectRatio, params.imageSize);

    if (isMinimalInline) {
      const sizeOptions = [
        { label: "1:1", aspectRatio: "1:1", imageSize: "1K" },
        { label: "3:2", aspectRatio: "3:2", imageSize: "1K" },
        { label: "2:3", aspectRatio: "2:3", imageSize: "1K" },
        { label: "4:3", aspectRatio: "4:3", imageSize: "1K" },
        { label: "3:4", aspectRatio: "3:4", imageSize: "1K" },
        { label: "9:16", aspectRatio: "9:16", imageSize: "1K" },
        { label: "1:1(2k)", aspectRatio: "1:1", imageSize: "2K" },
        { label: "16:9(2k)", aspectRatio: "16:9", imageSize: "2K" },
        { label: "9:16(2k)", aspectRatio: "9:16", imageSize: "2K" },
        { label: "3:4(2k)", aspectRatio: "3:4", imageSize: "2K" },
        { label: "1:1(4K)", aspectRatio: "1:1", imageSize: "4K" },
        ...(is98kGptImage2 ? [
          { label: "16:9(4K)", aspectRatio: "16:9", imageSize: "4K" },
          { label: "9:16(4K)", aspectRatio: "9:16", imageSize: "4K" },
        ] : []),
        { label: "auto", aspectRatio: "auto", imageSize: params.imageSize || "1K" },
      ].filter((option) => {
        if (option.aspectRatio === "auto") return true;
        const imageSize = normalizeImageSizeValue(option.imageSize);
        return (
          isImageSizeAllowed(imageSize) &&
          getAvailableAspectRatioOptions(imageSize).some(
            (ratioOption) => ratioOption.value === option.aspectRatio
          )
        );
      });
      const imageCountOptions = getImageCountOptions();
      const selectedAspectLabel = params.aspectRatio === "auto" ? "auto" : params.aspectRatio;
      const selectedImageCount = params.imageCount || 1;
      const renderMinimalRatioGlyph = (ratioValue: string) => {
        if (ratioValue === "auto") {
          return <span className="text-[11px] leading-none">auto</span>;
        }

        const [wRaw, hRaw] = ratioValue.split(":").map((item) => Number(item));
        if (!wRaw || !hRaw) {
          return <Scan className="h-4 w-4" />;
        }
        const maxSide = 18;
        let width = maxSide;
        let height = maxSide;
        if (wRaw >= hRaw) {
          width = maxSide;
          height = Math.max(7, Math.round((maxSide * hRaw) / wRaw));
        } else {
          height = maxSide;
          width = Math.max(7, Math.round((maxSide * wRaw) / hRaw));
        }

        return (
          <span
            className="inline-block rounded-[3px] border border-current"
            style={{ width, height }}
          />
        );
      };

      return (
        <Popover open={minimalParamsOpen} onOpenChange={setMinimalParamsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                minimalTriggerVariant === "icon"
                  ? "h-9 w-9 shrink-0 rounded-[8px] border border-[#e4e8ee] bg-white p-0 text-[#111827] hover:bg-[#f8fafc] focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                  : "h-8 shrink-0 rounded-full bg-[#f1f1f2] px-2.5 text-[13px] font-normal text-[#20242a] hover:bg-[#e9eaec] focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-[#242529] dark:text-zinc-100 dark:hover:bg-[#2c2d33]",
                minimalTriggerClassName,
                minimalParamsOpen &&
                  minimalTriggerVariant === "icon" &&
                  "!border-brand-accent !bg-brand-accent !text-brand-accent-foreground hover:!bg-brand-accent-hover dark:!border-brand-accent dark:!bg-brand-accent dark:!text-brand-accent-foreground dark:hover:!bg-brand-accent-hover"
              )}
              title="生成参数"
            >
              {minimalTriggerVariant === "icon" ? (
                <>
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span className="sr-only">
                    生成参数：{qualityLabel}，{selectedAspectLabel}，
                    {selectedImageCount} 张
                  </span>
                </>
              ) : (
                <>
                  {qualityLabel} · {selectedAspectLabel} · {selectedImageCount} img
                  {minimalParamsOpen ? (
                    <ChevronUp className="ml-1 h-3 w-3" />
                  ) : (
                    <ChevronDown className="ml-1 h-3 w-3" />
                  )}
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="top"
            sideOffset={8}
            className="w-[280px] max-w-[calc(100vw-32px)] rounded-[12px] border border-[#c7ccd5] bg-white p-3 font-sans text-[11px] font-normal text-[#252b33] shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:border-white/12 dark:bg-[#141416] dark:text-zinc-100 dark:shadow-[0_22px_56px_rgba(0,0,0,0.40)]"
          >
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[11px] font-medium leading-none">质量</div>
                <div className="grid h-8 grid-cols-4 rounded-full bg-[#f4f4f5] p-0.5 dark:bg-white/8">
                  {(["自动", "高", "中", "低"] as const).map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      className={cn(
                        "rounded-full text-[11px] font-normal transition-colors",
                        qualityLabel === quality
                          ? "border border-brand-accent bg-brand-accent text-brand-accent-foreground shadow-none dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground"
                          : "text-[#3d434d] hover:bg-white/55 dark:text-zinc-300 dark:hover:bg-white/10"
                      )}
                      onClick={() => setQualityLabel(quality)}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-medium leading-none">尺寸</div>
                <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                  <div className="flex h-8 items-center gap-2 rounded-[7px] bg-[#f3f3f4] px-2.5 text-[11px] dark:bg-white/8">
                    <span className="text-[#68707c] dark:text-zinc-400">W</span>
                    <span>{outputSize.width}</span>
                  </div>
                  <Link2 className="mx-auto h-3.5 w-3.5 text-[#8b929c]" />
                  <div className="flex h-8 items-center gap-2 rounded-[7px] bg-[#f3f3f4] px-2.5 text-[11px] dark:bg-white/8">
                    <span className="text-[#68707c] dark:text-zinc-400">H</span>
                    <span>{outputSize.height}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-medium leading-none">Size</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {sizeOptions.map((option) => {
                    const selected =
                      params.aspectRatio === option.aspectRatio &&
                      (option.aspectRatio === "auto" || params.imageSize === option.imageSize);
                    return (
                      <button
                        key={`${option.aspectRatio}-${option.imageSize}-${option.label}`}
                        type="button"
                        className={cn(
                          "flex h-12 flex-col items-center justify-center gap-1 rounded-[7px] border text-[11px] font-normal transition-colors",
                          selected
                            ? "border-brand-accent bg-brand-accent text-brand-accent-foreground dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground"
                            : "border-[#d0d3d9] bg-white text-[#4c535d] hover:bg-[#f5f5f6] dark:border-white/12 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/8"
                        )}
                        onClick={() =>
                          updateParams({
                            aspectRatio: option.aspectRatio,
                            imageSize: option.imageSize,
                          })
                        }
                      >
                        <span className="flex h-5 items-center justify-center text-current">
                          {renderMinimalRatioGlyph(option.aspectRatio)}
                        </span>
                        <span className="whitespace-nowrap text-[10px] font-normal leading-4">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-medium leading-none">Image</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {imageCountOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={cn(
                        "h-8 rounded-[7px] border text-[11px] font-normal transition-colors",
                        selectedImageCount === count
                          ? "border-brand-accent bg-brand-accent text-brand-accent-foreground dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground"
                          : "border-[#d0d3d9] bg-white text-[#4c535d] hover:bg-[#f5f5f6] dark:border-white/12 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/8"
                      )}
                      onClick={() => updateParams({ imageCount: count })}
                    >
                      {count} img
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <div
        className={cn(
          "flex min-w-0 items-center",
          isMinimalInline ? "ml-0 gap-2 pl-0" : "ml-1 gap-1 pl-1",
          showInlineDivider &&
            !isMinimalInline &&
            (isDarkInline ? "border-l border-white/10" : "border-l border-border/50")
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "shrink-0 p-0",
                isMinimalInline
                  ? "h-11 w-11 rounded-full border border-transparent bg-transparent text-[#555b66] hover:bg-[#f3f4f6] hover:text-[#20242a]"
                  : "h-8 w-11 rounded-[12px]",
                !isMinimalInline && isDarkInline
                  ? "border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                  : !isMinimalInline
                    ? "border border-[#d6dbe2] bg-[#f3f4f6]/90 text-[#2f3b48] hover:bg-[#edeff2]/90"
                    : ""
              )}
              aria-label={`比例：${params.aspectRatio}，分辨率：${params.imageSize}`}
              title={`比例：${params.aspectRatio}，分辨率：${params.imageSize}`}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center",
                  isMinimalInline
                    ? "text-current"
                    : isDarkInline
                      ? "text-white/80"
                      : "text-[#20262f]"
                )}
              >
                {renderRatioGlyph(params.aspectRatio)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="top"
            sideOffset={10}
            className={cn(
              "w-[312px] max-w-[calc(100vw-24px)] rounded-[14px] p-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)]",
              isDarkInline
                ? "border border-white/12 bg-[#0d1013]/98 text-white backdrop-blur-xl"
                : "border border-[#d8dde4] bg-[#f3f4f6]/90"
            )}
          >
            <div className="space-y-2.5">
              <div>
                <p className={cn("text-[11px] font-medium", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>选择比例</p>
                <div
                  className={cn(
                    "mt-1.5 grid grid-cols-4 gap-1.5 rounded-[12px] p-1.5 md:grid-cols-5",
                    isDarkInline ? "bg-white/[0.04]" : "bg-[#eceff2]/90"
                  )}
                >
                  {availableAspectRatioOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex h-[46px] flex-col items-center justify-center rounded-[10px] border transition",
                        params.aspectRatio === option.value
                          ? isDarkInline
                            ? "border-emerald-400/50 bg-emerald-500/12 text-emerald-200 shadow-[0_1px_5px_rgba(15,23,42,0.18)]"
                            : "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : isDarkInline
                            ? "border-transparent text-white/62 hover:bg-white/[0.06]"
                            : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("aspectRatio", option.value)}
                    >
                      <span className="mb-0.5 flex h-4 items-center justify-center">
                        {renderRatioGlyph(option.value)}
                      </span>
                      <span className="text-[12px] font-semibold leading-none">
                        {option.value === "auto" ? "智能" : option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={cn("text-[11px] font-medium", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>选择分辨率</p>
                <div
                  className={cn(
                    "mt-1.5 grid grid-cols-2 gap-1.5 rounded-[12px] p-1",
                    isDarkInline ? "bg-white/[0.04]" : "bg-[#eceff2]/90"
                  )}
                >
                  {availableSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "h-8 rounded-[9px] text-[12px] font-semibold transition",
                        params.imageSize === option.value
                          ? isDarkInline
                            ? "bg-emerald-500/12 text-emerald-200 shadow-[0_1px_5px_rgba(15,23,42,0.18)]"
                            : "bg-white text-[#111827] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : isDarkInline
                            ? "bg-transparent text-white/62 hover:bg-white/[0.06]"
                            : "bg-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("imageSize", option.value)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={cn("text-[11px] font-medium", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>尺寸</p>
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
                  <div className={cn("h-7 rounded-[9px] px-2", isDarkInline ? "border border-white/10 bg-white/[0.04] text-white/68" : "border border-[#dce1e8] bg-[#eef1f4]/90 text-[#b0b8c4]")}>
                    <div className="flex h-full items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold">W</span>
                      <span className="text-[12px] font-semibold">{outputSize.width}</span>
                    </div>
                  </div>
                  <Link2 className={cn("h-3 w-3", isDarkInline ? "text-white/35" : "text-[#adb6c3]")} />
                  <div className={cn("h-7 rounded-[9px] px-2", isDarkInline ? "border border-white/10 bg-white/[0.04] text-white/68" : "border border-[#dce1e8] bg-[#eef1f4]/90 text-[#b0b8c4]")}>
                    <div className="flex h-full items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold">H</span>
                      <span className="text-[12px] font-semibold">{outputSize.height}</span>
                    </div>
                  </div>
                  <span className={cn("text-[11px] font-semibold", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>PX</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {showImageCountSelector && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "text-[12px] font-semibold focus-visible:ring-0 focus-visible:ring-offset-0",
                  isMinimalInline
                    ? "h-11 min-w-11 rounded-full border border-transparent bg-transparent px-0 text-[#555b66] hover:bg-[#f3f4f6] hover:text-[#20242a]"
                    : "h-8 min-w-[56px] rounded-[12px] px-2.5",
                  !isMinimalInline && isDarkInline
                    ? "border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                    : !isMinimalInline
                      ? "border border-[#d6dbe2] bg-[#f3f4f6]/90 text-[#2f3b48] hover:bg-[#edeff2]/90"
                      : ""
                )}
                title={`数量：${params.imageCount || 1}张`}
              >
                <Sparkles
                  className={cn(
                    isMinimalInline ? "h-5 w-5" : "mr-1 h-3.5 w-3.5",
                    isMinimalInline
                      ? "text-current"
                      : isDarkInline
                        ? "text-emerald-300"
                        : "text-[#6b7280]"
                  )}
                />
                {isMinimalInline ? (
                  <span className="sr-only">{params.imageCount || 1}张</span>
                ) : (
                  `${params.imageCount || 1}张`
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
            side="top"
            sideOffset={10}
            className={cn(
              "w-auto min-w-[120px] rounded-[14px] p-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)]",
              isDarkInline
                ? "border border-white/12 bg-[#0d1013]/98 text-white backdrop-blur-xl"
                : "border border-[#d8dde4] bg-[#f3f4f6]/95"
            )}
          >
              <div>
                <p className={cn("text-[11px] font-medium", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>生成数量</p>
                <div className={cn(
                  "mt-1.5 grid gap-1.5 rounded-[12px] p-1.5",
                  isDarkInline ? "bg-white/[0.04]" : "bg-[#eceff2]/90",
                  imageCountOptions.length <= 3 ? "grid-cols-3" : "grid-cols-3"
                )}>
                  {imageCountOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={cn(
                        "flex h-8 min-w-[36px] items-center justify-center rounded-[9px] border text-[12px] font-semibold transition",
                        (params.imageCount || 1) === count
                          ? isDarkInline
                            ? "border-emerald-400/50 bg-emerald-500/12 text-emerald-200 shadow-[0_1px_5px_rgba(15,23,42,0.18)]"
                            : "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : isDarkInline
                            ? "border-transparent text-white/62 hover:bg-white/[0.06]"
                            : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("imageCount", count)}
                    >
                      {count}张
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 🆕 阿里生图专用：提示词优化 & 反向提示词 */}
        {!hideAdvancedOptions && (showPromptExtend || showNegativePrompt) && (
          <Popover>
            <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "shrink-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                    isMinimalInline
                      ? "h-11 w-11 rounded-full border border-transparent bg-transparent text-[#555b66] hover:bg-[#f3f4f6] hover:text-[#20242a]"
                      : "h-8 w-8 rounded-[12px]",
                    !isMinimalInline && isDarkInline
                      ? "border border-white/12 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                      : !isMinimalInline
                        ? "border border-[#d6dbe2] bg-[#f3f4f6]/90 text-[#5f6b7a] hover:bg-[#edeff2]/90"
                        : "",
                    (params.promptExtend || params.negativePrompt) &&
                      (isMinimalInline
                        ? "text-[#20242a]"
                        : isDarkInline
                          ? "text-emerald-300"
                          : "text-primary")
                )}
                title="高级设置"
              >
                <SlidersHorizontal size={14} />
                <span className="sr-only">高级设置</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
            side="top"
            sideOffset={10}
            className={cn(
              "w-[280px] max-w-[calc(100vw-24px)] rounded-[14px] p-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)]",
              isDarkInline
                ? "border border-white/12 bg-[#0d1013]/98 text-white backdrop-blur-xl"
                : "border border-[#d8dde4] bg-[#f3f4f6]/95"
            )}
          >
              <div className="space-y-2.5">
                {/* 提示词智能优化 */}
                {showPromptExtend && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className={cn("text-[12px] font-semibold", isDarkInline ? "text-white/88" : "text-[#2f3b48]")}>提示词优化</span>
                      <p className={cn("text-[11px]", isDarkInline ? "text-white/45" : "text-[#8a94a3]")}>AI 自动优化您的描述</p>
                    </div>
                    <Switch
                      checked={params.promptExtend ?? true}
                      onCheckedChange={(checked) => updateParam("promptExtend", checked)}
                    />
                  </div>
                )}

                {/* 反向提示词 */}
                {showNegativePrompt && (
                  <div className="space-y-1">
                    <span className={cn("text-[12px] font-semibold", isDarkInline ? "text-white/88" : "text-[#2f3b48]")}>反向提示词</span>
                    <Input
                      placeholder="不希望出现的内容，如：低质量、模糊..."
                      value={params.negativePrompt || ""}
                      onChange={(e) => updateParam("negativePrompt", e.target.value)}
                      className={cn(
                        "h-7 rounded-[8px] text-[12px]",
                        isDarkInline
                          ? "border-white/12 bg-white/[0.04] text-white placeholder:text-white/28"
                          : "border-[#dce1e8] bg-[#eef1f4]/90 text-[#2f3b48] placeholder:text-[#b0b8c4]"
                      )}
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  // 非内联模式（暂时不实现，因为只需要内联模式）
  return null;
}
