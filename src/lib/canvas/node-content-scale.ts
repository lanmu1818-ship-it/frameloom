// Modified for standalone community distribution; see NOTICE.
import type { CSSProperties } from "react";
import type { Size } from "@/types/canvas/index";

const DEFAULT_MIN_SCALE = 0.56;

export function getNodeContentScale(
  size: Size,
  baseSize: Size,
  minScale = DEFAULT_MIN_SCALE
) {
  if (!size.width || !size.height || !baseSize.width || !baseSize.height) {
    return 1;
  }

  const widthScale = size.width / baseSize.width;
  const heightScale = size.height / baseSize.height;
  return Math.min(1, Math.max(minScale, Math.min(widthScale, heightScale)));
}

export function getScaledNodeContentStyle(
  scale: number,
  options: { allowUpscale?: boolean } = {}
): CSSProperties | undefined {
  const shouldKeepDefault = options.allowUpscale
    ? Math.abs(scale - 1) < 0.001
    : scale >= 0.999;

  if (shouldKeepDefault) {
    return undefined;
  }

  return {
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };
}
