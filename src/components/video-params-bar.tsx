// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Switch } from "@/src/components/ui/switch";
import { Separator } from "@/src/components/ui/separator";
import {
  Video,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Camera,
  Clock,
  Settings2,
  Clapperboard,
  Monitor,
  Ratio,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getVideoToolOptionsForMode } from "@/src/lib/ai/video-tool-capability";
import { cn } from "@/src/lib/utils";
import type { VideoToolCapabilityContract } from "@/types/video-tool-capability";

// 视频生成模式类型
type VideoGenerationMode =
  | "text-to-video"
  | "first-frame"
  | "first-last-frame"
  | "reference-images";

// 运镜模式类型（与官方一致）
type CameraMove =
  | "none"           // 智能运镜
  | "static"         // 固定镜头
  | "hitchcock-push" // 希区柯克推进
  | "hitchcock-pull" // 希区柯克拉远
  | "mechanical-arm" // 机械臂
  | "dynamic-orbit"  // 动感环绕
  | "center-orbit"   // 中心环绕
  | "crane"          // 起重机
  | "super-pull"     // 超级拉远
  | "ccw-rotate"     // 逆时针回旋
  | "cw-rotate"      // 顺时针回旋
  | "handheld"       // 手持运镜
  | "fast-push-pull"; // 快速推拉

// 视频参数接口
export interface VideoGenerationParams {
  mode: VideoGenerationMode;
  resolution: "480p" | "720p" | "1080p";
  ratio: "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9" | "adaptive";
  duration: number;
  generateAudio?: boolean;
  watermark: boolean;
  cameraFixed: boolean;
  cameraMove?: CameraMove; // 新增：运镜模式
  fps?: number;
  seed?: number;
  returnLastFrame?: boolean;
}

interface VideoParamsBarProps {
  modelName?: string;
  initialParams?: Partial<VideoGenerationParams>;
  onParamsChange?: (params: VideoGenerationParams) => void;
  inline?: boolean; // 内联模式：只显示参数按钮，不显示外层容器
  providerType?: string;
  capabilities?: VideoToolCapabilityContract | null;
}

const MODE_LABELS: Record<VideoGenerationMode, string> = {
  "text-to-video": "文生视频",
  "first-last-frame": "首尾帧",
  "reference-images": "智能多帧",
  "first-frame": "主体参考",
};

const RATIO_OPTIONS = [
  { value: "21:9", label: "21:9" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "3:4", label: "3:4" },
  { value: "9:16", label: "9:16" },
] as const;

const RESOLUTION_OPTIONS = [
  { value: "480p", label: "480P" },
  { value: "720p", label: "720P" },
  { value: "1080p", label: "1080P" },
] as const;

// 🎬 运镜模式选项（与官方一致）
const CAMERA_MOVE_OPTIONS = [
  { value: "none", label: "智能运镜" },
  { value: "static", label: "固定镜头" },
  { value: "hitchcock-push", label: "希区柯克推进" },
  { value: "hitchcock-pull", label: "希区柯克拉远" },
  { value: "mechanical-arm", label: "机械臂" },
  { value: "dynamic-orbit", label: "动感环绕" },
  { value: "center-orbit", label: "中心环绕" },
  { value: "crane", label: "起重机" },
  { value: "super-pull", label: "超级拉远" },
  { value: "ccw-rotate", label: "逆时针回旋" },
  { value: "cw-rotate", label: "顺时针回旋" },
  { value: "handheld", label: "手持运镜" },
  { value: "fast-push-pull", label: "快速推拉" },
] as const;

// 帧率选项
const FPS_OPTIONS = [
  { value: 24, label: "24fps" },
  { value: 30, label: "30fps" },
  { value: 60, label: "60fps" },
] as const;

const STANDARD_MODE_OPTIONS: Array<{ value: VideoGenerationMode; label: string }> = [
  { value: "text-to-video", label: "文生视频" },
  { value: "first-last-frame", label: "首尾帧" },
  { value: "reference-images", label: "智能多帧" },
  { value: "first-frame", label: "主体参考" },
];

const FAL_MODE_OPTIONS: Array<{ value: VideoGenerationMode; label: string }> = [
  { value: "first-frame", label: "图生视频" },
  { value: "first-last-frame", label: "首尾帧" },
];
const RUXA_MODE_OPTIONS: Array<{ value: VideoGenerationMode; label: string }> = [
  { value: "first-frame", label: "图生视频" },
];

const FAL_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
] as const;
const RUXA_RATIO_OPTIONS = FAL_RATIO_OPTIONS;

const STANDARD_DURATION_OPTIONS = [5, 10];
const FAL_DURATION_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const RUXA_DURATION_OPTIONS = [5, 10];
const STANDARD_RATIO_SET = new Set(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]);
const FAL_RATIO_SET = new Set(["16:9", "9:16", "1:1"]);
const RUXA_RATIO_SET = new Set(["16:9", "9:16", "1:1"]);

function normalizeVideoParamsByProvider(
  source: Partial<VideoGenerationParams> | undefined,
  providerType?: string,
  capability?: VideoToolCapabilityContract | null
): VideoGenerationParams {
  if (capability) {
    const modes = capability.modeOptions.map((item) => item.mode);
    const fallbackMode = capability.defaults.mode || modes[0] || "text-to-video";

    const merged = {
      mode: fallbackMode,
      resolution: (capability.defaults.resolution || "720p") as VideoGenerationParams["resolution"],
      ratio: (capability.defaults.ratio || "16:9") as VideoGenerationParams["ratio"],
      duration: Number(capability.defaults.duration) || 5,
      generateAudio: capability.defaults.generateAudio ?? false,
      watermark: false,
      cameraFixed: false,
      cameraMove: "none" as const,
      fps: capability.defaults.fps || 24,
      ...source,
    } as VideoGenerationParams;

    if (!modes.includes(merged.mode)) {
      merged.mode = fallbackMode as VideoGenerationParams["mode"];
    }

    const scopedOptions = getVideoToolOptionsForMode(capability, merged.mode);
    const ratios = scopedOptions.ratioOptions;
    const durations = scopedOptions.durationOptions;
    const resolutions = scopedOptions.resolutionOptions;
    const fallbackRatio =
      scopedOptions.defaults?.ratio || ratios[0] || capability.defaults.ratio || "16:9";
    const fallbackDuration =
      Number(scopedOptions.defaults?.duration) || durations[0] || Number(capability.defaults.duration) || 5;
    const fallbackResolution =
      scopedOptions.defaults?.resolution ||
      resolutions[0] ||
      capability.defaults.resolution ||
      "720p";

    if (!ratios.includes(merged.ratio)) {
      merged.ratio = fallbackRatio as VideoGenerationParams["ratio"];
    }
    if (!durations.includes(Number(merged.duration))) {
      merged.duration = fallbackDuration;
    } else {
      merged.duration = Number(merged.duration) || fallbackDuration;
    }
    if (resolutions.length > 0 && !resolutions.includes(merged.resolution)) {
      merged.resolution = fallbackResolution as VideoGenerationParams["resolution"];
    } else if (resolutions.length === 0) {
      merged.resolution = fallbackResolution as VideoGenerationParams["resolution"];
    }

    if (!capability.ui.showGenerateAudio) {
      merged.generateAudio = false;
    } else if (typeof merged.generateAudio !== "boolean") {
      merged.generateAudio = scopedOptions.defaults?.generateAudio ?? capability.defaults.generateAudio ?? false;
    }
    if (!capability.ui.showFps) {
      merged.fps = capability.defaults.fps || 24;
    }
    if (!capability.ui.showCameraMove) {
      merged.cameraMove = "none";
      merged.cameraFixed = false;
    }
    if (!capability.ui.showReturnLastFrame) {
      merged.returnLastFrame = false;
    }
    if (!capability.ui.showSeed) {
      merged.seed = undefined;
    }

    return merged;
  }

  const isFalVideo = providerType === "fal-video";
  const isRuxaVideo = providerType === "ruxa-video";
  const base: VideoGenerationParams = {
    mode: isFalVideo || isRuxaVideo ? "first-frame" : "text-to-video",
    resolution: "720p",
    ratio: "16:9",
    duration: 5,
    generateAudio: true,
    watermark: false,
    cameraFixed: false,
    cameraMove: "none",
    fps: 24,
  };
  const merged = { ...base, ...source };

  if (isFalVideo) {
    if (merged.mode !== "first-frame" && merged.mode !== "first-last-frame") {
      merged.mode = "first-frame";
    }
    merged.ratio = FAL_RATIO_SET.has(merged.ratio) ? merged.ratio : "16:9";
    merged.duration = Math.max(3, Math.min(15, Math.round(Number(merged.duration) || 5)));
    merged.generateAudio = merged.generateAudio ?? true;
    return merged;
  }

  if (isRuxaVideo) {
    merged.mode = "first-frame";
    merged.ratio = RUXA_RATIO_SET.has(merged.ratio) ? merged.ratio : "16:9";
    merged.duration = merged.duration >= 8 ? 10 : 5;
    merged.generateAudio = false;
    merged.cameraMove = "none";
    merged.cameraFixed = false;
    merged.fps = 24;
    return merged;
  }

  if (
    merged.mode !== "text-to-video" &&
    merged.mode !== "first-last-frame" &&
    merged.mode !== "reference-images" &&
    merged.mode !== "first-frame"
  ) {
    merged.mode = "text-to-video";
  }

  merged.ratio = STANDARD_RATIO_SET.has(merged.ratio) ? merged.ratio : "16:9";
  merged.duration = merged.duration >= 8 ? 10 : 5;
  return merged;
}

export function VideoParamsBar({
  modelName = "视频 3.0",
  initialParams,
  onParamsChange,
  inline = false,
  providerType = "volcano-video",
  capabilities,
}: VideoParamsBarProps) {
  const isFalVideo = providerType === "fal-video";
  const isRuxaVideo = providerType === "ruxa-video";

  const capabilityModeOptions = capabilities?.modeOptions?.length
    ? capabilities.modeOptions.map((item) => ({
        value: item.mode,
        label: item.label || MODE_LABELS[item.mode],
      }))
    : null;
  const modeOptions = capabilityModeOptions || (isFalVideo
    ? FAL_MODE_OPTIONS
    : isRuxaVideo
      ? RUXA_MODE_OPTIONS
      : STANDARD_MODE_OPTIONS);
  const showGenerateAudioControl = capabilities
    ? capabilities.ui.showGenerateAudio
    : isFalVideo;
  const showCameraMoveControl = capabilities
    ? capabilities.ui.showCameraMove
    : !isFalVideo && !isRuxaVideo;
  const showFpsControl = capabilities ? capabilities.ui.showFps : !isFalVideo && !isRuxaVideo;
  const showSeedControl = capabilities ? capabilities.ui.showSeed : true;
  const showReturnLastFrameControl = capabilities ? capabilities.ui.showReturnLastFrame : true;

  const [params, setParams] = useState<VideoGenerationParams>(() =>
    normalizeVideoParamsByProvider(initialParams, providerType, capabilities)
  );

  const scopedCapabilityOptions = getVideoToolOptionsForMode(capabilities, params.mode);
  const capabilityRatioOptions = scopedCapabilityOptions.ratioOptions.length
    ? scopedCapabilityOptions.ratioOptions.map((value) => ({ value, label: value }))
    : null;
  const ratioOptions = capabilityRatioOptions || (isFalVideo
    ? FAL_RATIO_OPTIONS
    : isRuxaVideo
      ? RUXA_RATIO_OPTIONS
      : RATIO_OPTIONS);
  const durationOptions = scopedCapabilityOptions.durationOptions.length
    ? scopedCapabilityOptions.durationOptions
    : (isFalVideo
    ? FAL_DURATION_OPTIONS
    : isRuxaVideo
      ? RUXA_DURATION_OPTIONS
      : STANDARD_DURATION_OPTIONS);
  const resolutionOptions = scopedCapabilityOptions.resolutionOptions.length
    ? scopedCapabilityOptions.resolutionOptions.map((value) => ({
        value,
        label: value.toUpperCase(),
      }))
    : RESOLUTION_OPTIONS;
  const showResolutionControl = capabilities
    ? capabilities.ui.showResolution && scopedCapabilityOptions.resolutionOptions.length > 0
    : !isFalVideo && !isRuxaVideo;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const normalized = normalizeVideoParamsByProvider(initialParams, providerType, capabilities);
    setParams((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(normalized)) {
        return prev;
      }
      return normalized;
    });
  }, [initialParams, providerType, capabilities]);

  // 获取当前运镜模式的标签
  const getCurrentCameraLabel = () => {
    if (params.cameraMove) {
      const option = CAMERA_MOVE_OPTIONS.find(opt => opt.value === params.cameraMove);
      return option ? option.label : "智能运镜";
    }
    return "智能运镜";
  };

  // 🆕 根据模式获取图片上传配置（根据火山引擎官方文档）
  const getImageUploadConfig = () => {
    if (capabilities?.modeOptions?.length) {
      const modeOption = capabilities.modeOptions.find((item) => item.mode === params.mode);
      if (!modeOption) {
        return { min: 0, max: 0, label: "" };
      }
      const label =
        modeOption.imageMax === 0
          ? `${modeOption.label}（无需图片）`
          : modeOption.imageMin === modeOption.imageMax
            ? `${modeOption.label}（${modeOption.imageMax} 张）`
            : `${modeOption.label}（${modeOption.imageMin}-${modeOption.imageMax} 张）`;
      return {
        min: modeOption.imageMin,
        max: modeOption.imageMax,
        label,
      };
    }
    if (isRuxaVideo) {
      return { min: 1, max: 1, label: "图生视频（1 张起始图）" };
    }
    if (isFalVideo) {
      switch (params.mode) {
        case "first-last-frame":
          return { min: 2, max: 2, label: "首尾帧（2 张）" };
        case "first-frame":
        default:
          return { min: 1, max: 1, label: "图生视频（1 张起始图）" };
      }
    }

    switch (params.mode) {
      case "text-to-video":
        return { min: 0, max: 0, label: "文生视频（无需图片）" };
      case "first-last-frame":
        return { min: 2, max: 2, label: "首尾帧（各 1 张）" };
      case "first-frame":
        return { min: 1, max: 1, label: "首帧模式（1 张）" };
      case "reference-images":
        return { min: 1, max: 4, label: "参考图（1-4 张）" };
      default:
        return { min: 0, max: 0, label: "" };
    }
  };

  const imageConfig = getImageUploadConfig();

  const updateParam = <K extends keyof VideoGenerationParams>(
    key: K,
    value: VideoGenerationParams[K]
  ) => {
    const newParams = normalizeVideoParamsByProvider(
      { ...params, [key]: value },
      providerType,
      capabilities
    );
    setParams(newParams);
    onParamsChange?.(newParams);
  };

  // 🆕 内联模式：只返回参数按钮，嵌入工具栏（统一玻璃面板风格）
  if (inline) {
    const modeLabel = modeOptions.find((o) => o.value === params.mode)?.label || MODE_LABELS[params.mode];
    const durationLabel = `${params.duration}s`;

    return (
      <div className="ml-1 flex items-center gap-1 border-l border-border/50 pl-1">
        {/* 主参数面板：模式 | 比例 | 时长 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 max-w-[200px] shrink rounded-[12px] border border-[#d6dbe2] bg-[#f3f4f6]/90 px-2 text-[11px] font-semibold text-[#2f3b48] hover:bg-[#edeff2]/90"
              title={`${modeLabel}，${params.ratio}，${durationLabel}`}
            >
              <Clapperboard className="mr-1 h-3.5 w-3.5 text-[#20262f]" />
              <span className="truncate">{modeLabel}</span>
              <span className="mx-1.5 h-3 w-px bg-[#cfd5de]" />
              <span className="truncate">{params.ratio}</span>
              <span className="mx-1.5 h-3 w-px bg-[#cfd5de]" />
              <span className="truncate">{durationLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="top"
            sideOffset={10}
            className="w-[312px] max-w-[calc(100vw-24px)] rounded-[14px] border border-[#d8dde4] bg-[#f3f4f6]/95 p-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
          >
            <div className="space-y-2.5">
              {/* 模式 */}
              <div>
                <p className="text-[11px] font-medium text-[#8a94a3]">选择模式</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5">
                  {modeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-center rounded-[9px] border text-[12px] font-semibold transition",
                        params.mode === option.value
                          ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("mode", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 比例 */}
              <div>
                <p className="text-[11px] font-medium text-[#8a94a3]">选择比例</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5">
                  {ratioOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-center rounded-[9px] border text-[12px] font-semibold transition",
                        params.ratio === option.value
                          ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("ratio", option.value as VideoGenerationParams["ratio"])}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 分辨率（非 fal） */}
              {showResolutionControl && (
                <div>
                  <p className="text-[11px] font-medium text-[#8a94a3]">选择分辨率</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1">
                    {resolutionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "h-8 rounded-[9px] text-[12px] font-semibold transition",
                          params.resolution === option.value
                            ? "bg-white text-[#111827] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                            : "bg-transparent text-[#5f6b7a] hover:bg-white/70"
                        )}
                        onClick={() => updateParam("resolution", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 时长 */}
              <div>
                <p className="text-[11px] font-medium text-[#8a94a3]">选择时长</p>
                <div className={cn(
                  "mt-1.5 grid gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5",
                  durationOptions.length > 6 ? "grid-cols-5" : "grid-cols-2"
                )}>
                  {durationOptions.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-center rounded-[9px] border text-[12px] font-semibold transition",
                        params.duration === duration
                          ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("duration", duration)}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 副参数：帧率 / 运镜 / 音频（合并为一个 Popover） */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-[12px] border border-[#d6dbe2] bg-[#f3f4f6]/90 p-0 text-[#5f6b7a] hover:bg-[#edeff2]/90"
              title="更多参数"
            >
              <SlidersHorizontal size={14} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            sideOffset={10}
            className="w-[280px] max-w-[calc(100vw-24px)] rounded-[14px] border border-[#d8dde4] bg-[#f3f4f6]/95 p-2 shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
          >
            <div className="space-y-2.5">
              {showGenerateAudioControl ? (
                <div>
                  <p className="text-[11px] font-medium text-[#8a94a3]">音频</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5">
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-center gap-1.5 rounded-[9px] border text-[12px] font-semibold transition",
                        (params.generateAudio ?? true)
                          ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("generateAudio", true)}
                    >
                      <Volume2 size={13} />
                      带音频
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 items-center justify-center gap-1.5 rounded-[9px] border text-[12px] font-semibold transition",
                        params.generateAudio === false
                          ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                          : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                      )}
                      onClick={() => updateParam("generateAudio", false)}
                    >
                      <VolumeX size={13} />
                      静音
                    </button>
                  </div>
                </div>
              ) : !showFpsControl && !showCameraMoveControl ? (
                <div className="rounded-[12px] bg-[#eceff2]/90 p-2 text-[11px] text-[#7b8796]">
                  当前模型支持图生视频（1 张起始图），已自动按官方参数约束处理。
                </div>
              ) : (
                <>
                  {showFpsControl && (
                    <div>
                      <p className="text-[11px] font-medium text-[#8a94a3]">帧率</p>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5">
                        {FPS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              "flex h-8 items-center justify-center rounded-[9px] border text-[12px] font-semibold transition",
                              (params.fps || 24) === option.value
                                ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                                : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                            )}
                            onClick={() => updateParam("fps", option.value as VideoGenerationParams["fps"])}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showCameraMoveControl && (
                    <div>
                      <p className="text-[11px] font-medium text-[#8a94a3]">运镜模式</p>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[12px] bg-[#eceff2]/90 p-1.5">
                        {CAMERA_MOVE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              "flex h-8 items-center justify-center rounded-[9px] border text-[11px] font-semibold transition",
                              params.cameraMove === option.value
                                ? "border-white bg-white text-[#1f2937] shadow-[0_1px_5px_rgba(15,23,42,0.08)]"
                                : "border-transparent text-[#5f6b7a] hover:bg-white/70"
                            )}
                            onClick={() => {
                              updateParam("cameraMove", option.value);
                              updateParam("cameraFixed", option.value === "static");
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 高级选项 */}
              <div className="space-y-2.5 border-t border-[#dce1e8] pt-2.5">
                {showReturnLastFrameControl && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#8a94a3]">返回尾帧</span>
                    <Switch
                      checked={params.returnLastFrame || false}
                      onCheckedChange={(checked) => updateParam("returnLastFrame", checked)}
                    />
                  </div>
                )}
                {showGenerateAudioControl && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#8a94a3]">生成音频</span>
                    <Switch
                      checked={params.generateAudio ?? true}
                      onCheckedChange={(checked) => updateParam("generateAudio", checked)}
                    />
                  </div>
                )}
                {showSeedControl && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-[#8a94a3]">随机种子</span>
                    <Input
                      type="number"
                      placeholder="留空则随机"
                      value={params.seed || ""}
                      onChange={(e) => updateParam("seed", Number(e.target.value) || undefined)}
                      className="h-7 rounded-[8px] border-[#dce1e8] bg-[#eef1f4]/90 text-[12px] text-[#2f3b48] placeholder:text-[#b0b8c4]"
                    />
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // 非内联模式（独立显示）
  if (collapsed) {
    return (
      <div className="flex items-center justify-between py-2 px-4 border-t bg-muted/20">
        <span className="text-sm text-muted-foreground">
          视频参数：{modeOptions.find((option) => option.value === params.mode)?.label || MODE_LABELS[params.mode]} | {params.ratio} | {params.duration}s
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
        >
          <ChevronDown size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background/90 backdrop-blur-sm border-t-0 p-2">
      {/* 🆕 图片上传区域（根据模式动态显示） */}
      {imageConfig.max > 0 && (
        <div className="pb-2 flex justify-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground mr-2">{imageConfig.label}</Label>
            {params.mode === "first-last-frame" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-14 w-20 flex-col border-dashed hover:border-solid hover:bg-accent/50"
                >
                  <span className="text-xl">+</span>
                  <span className="text-[10px]">首帧</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-14 w-20 flex-col border-dashed hover:border-solid hover:bg-accent/50"
                >
                  <span className="text-xl">➡</span>
                  <span className="text-[10px]">尾帧</span>
                </Button>
              </div>
            )}
            {params.mode === "first-frame" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-14 w-20 flex-col border-dashed hover:border-solid hover:bg-accent/50"
              >
                <span className="text-xl">+</span>
                <span className="text-[10px]">图帧</span>
              </Button>
            )}
            {params.mode === "reference-images" && (
              <div className="flex gap-2">
                {[1, 2, 3, 4].slice(0, imageConfig.max).map((idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-14 w-14 flex-col border-dashed hover:border-solid hover:bg-accent/50"
                  >
                    <span className="text-xl">+</span>
                    <span className="text-[10px]">{idx}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 参数配置栏 - 移除背景色和顶部边框，适应嵌入式布局 */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2">
          {/* 模式选择（无边框，更简洁） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                <Clapperboard size={14} />
                {modeOptions.find((option) => option.value === params.mode)?.label || MODE_LABELS[params.mode]}
                <ChevronDown size={12} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {modeOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => updateParam("mode", option.value)}>
                  <Check className={cn("mr-2 h-4 w-4", params.mode === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4" />

          {/* 宽高比 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                <Ratio size={14} />
                {params.ratio}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <div className="p-2 grid grid-cols-3 gap-1">
                {ratioOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={params.ratio === option.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateParam("ratio", option.value as VideoGenerationParams["ratio"])}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {showResolutionControl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                  {params.resolution}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[100px]">
                {resolutionOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => updateParam("resolution", option.value)}>
                    <Check className={cn("mr-2 h-4 w-4", params.resolution === option.value ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 时长 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                <Clock size={14} />
                {params.duration}s
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[80px]">
              {durationOptions.map((duration) => (
                <DropdownMenuItem key={duration} onClick={() => updateParam("duration", duration)}>
                  <Check className={cn("mr-2 h-4 w-4", params.duration === duration ? "opacity-100" : "opacity-0")} />
                  {duration}s
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {showGenerateAudioControl ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => updateParam("generateAudio", !(params.generateAudio ?? true))}
            >
              <Sparkles size={14} />
              {params.generateAudio === false ? "静音" : "带音频"}
            </Button>
          ) : !showFpsControl && !showCameraMoveControl ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled
            >
              <Sparkles size={14} />
              图生视频
            </Button>
          ) : (
            <>
              {showFpsControl && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                      {params.fps || 24}fps
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[100px]">
                    {FPS_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => updateParam("fps", option.value as VideoGenerationParams["fps"])}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            (params.fps || 24) === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {showCameraMoveControl && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 px-2 h-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                      <Camera size={14} />
                      {getCurrentCameraLabel()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[140px]">
                    {CAMERA_MOVE_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => {
                          updateParam("cameraMove", option.value);
                          updateParam("cameraFixed", option.value === "static");
                        }}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", params.cameraMove === option.value ? "opacity-100" : "opacity-0")}
                        />
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>

        {/* 高级选项（隐藏水印，默认关闭） */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0">
              <Settings2 size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[300px]">
            <DialogHeader>
              <DialogTitle className="text-sm">高级设置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {showReturnLastFrameControl && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs">返回尾帧</Label>
                  <Switch
                    checked={params.returnLastFrame || false}
                    onCheckedChange={(checked) => updateParam("returnLastFrame", checked)}
                    className="scale-75"
                  />
                </div>
              )}
              {showGenerateAudioControl && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs">生成音频</Label>
                  <Switch
                    checked={params.generateAudio ?? true}
                    onCheckedChange={(checked) => updateParam("generateAudio", checked)}
                    className="scale-75"
                  />
                </div>
              )}
              {showSeedControl && (
                <div className="space-y-1.5">
                  <Label className="text-xs">随机种子</Label>
                  <Input
                    type="number"
                    placeholder="留空则随机"
                    value={params.seed || ""}
                    onChange={(e) =>
                      updateParam("seed", Number(e.target.value) || undefined)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
