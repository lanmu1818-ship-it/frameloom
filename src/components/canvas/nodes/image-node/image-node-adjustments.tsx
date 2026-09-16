// Modified for standalone community distribution; see NOTICE.
import type React from "react";
import { createPortal } from "react-dom";
import {
  Blend,
  Box,
  CircleDot,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Slider } from "@/src/components/ui/slider";
import { cn } from "@/src/lib/utils";

export type ImageAdjustPanelTab = "light" | "color" | "detail" | "effects";

export type ImageAdjustmentState = {
  light: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  saturation: number;
  temperature: number;
  tint: number;
  sharpen: number;
  clarity: number;
  grain: number;
  vignette: number;
  softLight: number;
  glow: number;
};

export type ImageAdjustmentKey = keyof ImageAdjustmentState;

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustmentState = {
  light: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  sharpen: 0,
  clarity: 0,
  grain: 0,
  vignette: 0,
  softLight: 0,
  glow: 0,
};

export const IMAGE_ADJUSTMENT_KEYS = Object.keys(
  DEFAULT_IMAGE_ADJUSTMENTS
) as ImageAdjustmentKey[];

export const IMAGE_ADJUST_SECTIONS: Record<
  ImageAdjustPanelTab,
  Array<{
    key: ImageAdjustmentKey;
    label: string;
    min: number;
    max: number;
    trackClassName?: string;
  }>
> = {
  light: [
    { key: "light", label: "光线", min: -100, max: 100 },
    { key: "exposure", label: "曝光", min: -100, max: 100 },
    { key: "contrast", label: "对比度", min: -100, max: 100 },
    { key: "highlights", label: "高光", min: -100, max: 100 },
    { key: "shadows", label: "阴影", min: -100, max: 100 },
    { key: "whites", label: "白色", min: -100, max: 100 },
    { key: "blacks", label: "黑色", min: -100, max: 100 },
  ],
  color: [
    { key: "vibrance", label: "自然饱和度", min: -100, max: 100 },
    { key: "saturation", label: "饱和度", min: -100, max: 100 },
    {
      key: "temperature",
      label: "色温",
      min: -100,
      max: 100,
      trackClassName: "h-[4px] bg-[linear-gradient(90deg,#4aa7ff,#f2c23a)]",
    },
    {
      key: "tint",
      label: "色调",
      min: -100,
      max: 100,
      trackClassName: "h-[4px] bg-[linear-gradient(90deg,#ff66d7,#41d278)]",
    },
  ],
  detail: [
    { key: "sharpen", label: "锐化", min: 0, max: 100 },
    { key: "clarity", label: "清晰度", min: 0, max: 100 },
    { key: "grain", label: "颗粒", min: 0, max: 100 },
  ],
  effects: [
    { key: "vignette", label: "晕影", min: 0, max: 100 },
    { key: "softLight", label: "柔光", min: 0, max: 100 },
    { key: "glow", label: "辉光", min: 0, max: 100 },
  ],
};

const IMAGE_ADJUST_TAB_OPTIONS = [
  {
    id: "light" as const,
    label: "光线",
    icon: SlidersHorizontal,
  },
  {
    id: "color" as const,
    label: "颜色",
    icon: Blend,
  },
  {
    id: "detail" as const,
    label: "细节",
    icon: CircleDot,
  },
  {
    id: "effects" as const,
    label: "效果",
    icon: Box,
  },
];

const clampImageAdjustmentNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function normalizeImageAdjustments(value: unknown): ImageAdjustmentState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<ImageAdjustmentKey, unknown>>)
      : {};

  return {
    light: clampImageAdjustmentNumber(Number(raw.light ?? 0), -100, 100),
    exposure: clampImageAdjustmentNumber(Number(raw.exposure ?? 0), -100, 100),
    contrast: clampImageAdjustmentNumber(Number(raw.contrast ?? 0), -100, 100),
    highlights: clampImageAdjustmentNumber(Number(raw.highlights ?? 0), -100, 100),
    shadows: clampImageAdjustmentNumber(Number(raw.shadows ?? 0), -100, 100),
    whites: clampImageAdjustmentNumber(Number(raw.whites ?? 0), -100, 100),
    blacks: clampImageAdjustmentNumber(Number(raw.blacks ?? 0), -100, 100),
    vibrance: clampImageAdjustmentNumber(Number(raw.vibrance ?? 0), -100, 100),
    saturation: clampImageAdjustmentNumber(Number(raw.saturation ?? 0), -100, 100),
    temperature: clampImageAdjustmentNumber(Number(raw.temperature ?? 0), -100, 100),
    tint: clampImageAdjustmentNumber(Number(raw.tint ?? 0), -100, 100),
    sharpen: clampImageAdjustmentNumber(Number(raw.sharpen ?? 0), 0, 100),
    clarity: clampImageAdjustmentNumber(Number(raw.clarity ?? 0), 0, 100),
    grain: clampImageAdjustmentNumber(Number(raw.grain ?? 0), 0, 100),
    vignette: clampImageAdjustmentNumber(Number(raw.vignette ?? 0), 0, 100),
    softLight: clampImageAdjustmentNumber(Number(raw.softLight ?? 0), 0, 100),
    glow: clampImageAdjustmentNumber(Number(raw.glow ?? 0), 0, 100),
  };
}

export function areImageAdjustmentsEqual(
  left: ImageAdjustmentState,
  right: ImageAdjustmentState
) {
  return IMAGE_ADJUSTMENT_KEYS.every((key) => left[key] === right[key]);
}

export function isDefaultImageAdjustments(value: ImageAdjustmentState) {
  return areImageAdjustmentsEqual(value, DEFAULT_IMAGE_ADJUSTMENTS);
}

export function buildImageAdjustmentFilterStyle(
  adjustments: ImageAdjustmentState
): React.CSSProperties {
  const brightnessLift =
    adjustments.light * 0.34 +
    adjustments.exposure * 0.52 +
    adjustments.shadows * 0.2 +
    adjustments.whites * 0.12 -
    adjustments.blacks * 0.16 -
    adjustments.highlights * 0.06;
  const brightness = clampImageAdjustmentNumber(1 + brightnessLift / 100, 0.35, 2.2);
  const contrastBoost =
    adjustments.contrast * 0.78 +
    adjustments.clarity * 0.18 +
    adjustments.sharpen * 0.1 +
    adjustments.highlights * 0.06 -
    adjustments.shadows * 0.04;
  const contrast = clampImageAdjustmentNumber(1 + contrastBoost / 100, 0.45, 2.1);
  const saturationBoost =
    adjustments.saturation * 0.9 +
    adjustments.vibrance * 0.55 +
    adjustments.sharpen * 0.04;
  const saturate = clampImageAdjustmentNumber(1 + saturationBoost / 100, 0.1, 2.4);
  const hueRotate = clampImageAdjustmentNumber(adjustments.tint * 0.35, -36, 36);
  const sepia = clampImageAdjustmentNumber(
    adjustments.temperature > 0 ? adjustments.temperature * 0.18 : 0,
    0,
    22
  );

  return {
    filter: [
      `brightness(${brightness.toFixed(3)})`,
      `contrast(${contrast.toFixed(3)})`,
      `saturate(${saturate.toFixed(3)})`,
      `hue-rotate(${hueRotate.toFixed(1)}deg)`,
      `sepia(${sepia.toFixed(1)}%)`,
    ].join(" "),
    willChange: "filter",
  };
}

export function ImageAdjustPanelSlider({
  disabled = false,
  label,
  max,
  min,
  onChange,
  trackClassName = "h-[4px] bg-[#e5e5e5]",
  value,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  trackClassName?: string;
  value: number;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[18px] font-medium tracking-[0] text-[#1f232a]">
          {label}
        </span>
        <span className="text-[18px] font-medium tabular-nums tracking-[0] text-[#6f747c]">
          {Math.round(value)}
        </span>
      </div>
      <Slider
        className="w-full"
        disabled={disabled}
        max={max}
        min={min}
        onValueChange={([nextValue]) => onChange(nextValue ?? value)}
        rangeClassName="bg-transparent"
        thumbClassName="h-5 w-5 border-[5px] border-[#2d2f33] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
        trackClassName={trackClassName}
        value={[value]}
      />
    </div>
  );
}

export function ImageAdjustFloatingPanel({
  disabled = false,
  draft,
  hasImageSource,
  isSelected,
  label,
  onClose,
  onDraftChange,
  onReset,
  onTabChange,
  open,
  position,
  scale,
  tab,
}: {
  disabled?: boolean;
  draft: ImageAdjustmentState;
  hasImageSource: boolean;
  isSelected: boolean;
  label: string;
  onClose: () => void;
  onDraftChange: (updater: (previous: ImageAdjustmentState) => ImageAdjustmentState) => void;
  onReset: () => void;
  onTabChange: (tab: ImageAdjustPanelTab) => void;
  open: boolean;
  position: { left: number; top: number };
  scale: number;
  tab: ImageAdjustPanelTab;
}) {
  if (!isSelected || !open || !hasImageSource || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[9999] w-[520px] overflow-hidden rounded-[30px] border border-[#ebe7df] bg-white shadow-[0_24px_64px_rgba(17,24,39,0.12)]"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        top: position.top,
        left: position.left,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <div className="flex items-center justify-between px-8 pt-8 pb-5">
        <h3 className="text-[20px] font-semibold tracking-[0] text-[#18181b]">
          {label}
        </h3>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#8c8d92] transition-colors hover:bg-[#f4f2ed] hover:text-[#2f3136] disabled:cursor-not-allowed disabled:text-[#cbc7c0]"
            disabled={disabled || isDefaultImageAdjustments(draft)}
            onClick={onReset}
            type="button"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#8c8d92] transition-colors hover:bg-[#f4f2ed] hover:text-[#2f3136]"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-7 pb-7">
        <div className="rounded-[20px] bg-[#f3f1ec] p-1">
          <div className="grid grid-cols-4 gap-1">
            {IMAGE_ADJUST_TAB_OPTIONS.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  className={cn(
                    "inline-flex h-14 items-center justify-center rounded-[16px] text-[#7a7a7d] transition-all",
                    active
                      ? "bg-white text-[#23262d] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                      : "hover:text-[#2d3138]"
                  )}
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 max-h-[600px] overflow-y-auto pr-2">
          <div className="space-y-7 pb-2">
            {IMAGE_ADJUST_SECTIONS[tab].map((field) => (
              <ImageAdjustPanelSlider
                disabled={disabled}
                key={field.key}
                label={field.label}
                max={field.max}
                min={field.min}
                onChange={(value) =>
                  onDraftChange((previous) => ({
                    ...previous,
                    [field.key]: value,
                  }))
                }
                trackClassName={field.trackClassName}
                value={draft[field.key]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
