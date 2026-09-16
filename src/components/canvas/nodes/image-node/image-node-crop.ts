// Modified for standalone community distribution; see NOTICE.
import type { NormalizedCropRect } from "@/src/services/canvas/index";

export type CropPanelGroupKey =
  | "common"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube";

export type CropInteractionHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

export type CropPresetOption = {
  id: string;
  label: string;
  ratio: number;
};

export type CropPresetGroup = {
  key: CropPanelGroupKey;
  label: string;
  options: CropPresetOption[];
};

export interface BoxCutoutPoint {
  x: number;
  y: number;
}

export const DEFAULT_CROP_PRESET_ID = "1:1";

export const CROP_PRESET_GROUPS: CropPresetGroup[] = [
  {
    key: "common",
    label: "通用",
    options: [
      { id: "1:1", label: "1:1", ratio: 1 },
      { id: "3:4", label: "3:4", ratio: 3 / 4 },
      { id: "2:3", label: "2:3", ratio: 2 / 3 },
      { id: "9:16", label: "9:16", ratio: 9 / 16 },
      { id: "4:3", label: "4:3", ratio: 4 / 3 },
      { id: "3:2", label: "3:2", ratio: 3 / 2 },
      { id: "16:9", label: "16:9", ratio: 16 / 9 },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    options: [
      { id: "ig-square", label: "1:1", ratio: 1 },
      { id: "ig-portrait", label: "4:5", ratio: 4 / 5 },
      { id: "ig-story", label: "9:16", ratio: 9 / 16 },
    ],
  },
  {
    key: "facebook",
    label: "Facebook",
    options: [
      { id: "fb-feed", label: "4:5", ratio: 4 / 5 },
      { id: "fb-cover", label: "16:9", ratio: 16 / 9 },
    ],
  },
  {
    key: "tiktok",
    label: "TikTok",
    options: [{ id: "tt-video", label: "9:16", ratio: 9 / 16 }],
  },
  {
    key: "youtube",
    label: "YouTube",
    options: [
      { id: "yt-cover", label: "16:9", ratio: 16 / 9 },
      { id: "yt-short", label: "9:16", ratio: 9 / 16 },
    ],
  },
];

const clampCropNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createNormalizedRect = (
  start: BoxCutoutPoint,
  end: BoxCutoutPoint
): NormalizedCropRect => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  return {
    x,
    y,
    width: clampCropNumber(right - x, 0, 1),
    height: clampCropNumber(bottom - y, 0, 1),
  };
};

export const getCropPresetById = (presetId: string) => {
  for (const group of CROP_PRESET_GROUPS) {
    const matched = group.options.find((option) => option.id === presetId);
    if (matched) return matched;
  }
  return null;
};

export const getNormalizedMinCropSize = (
  naturalWidth: number,
  naturalHeight: number
) => ({
  width: naturalWidth > 0 ? Math.min(1, 24 / naturalWidth) : 0.02,
  height: naturalHeight > 0 ? Math.min(1, 24 / naturalHeight) : 0.02,
});

export const createCenteredCropRectForAspect = (
  ratio: number,
  centerX = 0.5,
  centerY = 0.5
): NormalizedCropRect => {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const maxHalfWidth = Math.min(centerX, 1 - centerX);
  const maxHalfHeight = Math.min(centerY, 1 - centerY);

  let width = maxHalfHeight * 2 * safeRatio;
  let height = width / safeRatio;

  if (width > maxHalfWidth * 2) {
    width = maxHalfWidth * 2;
    height = width / safeRatio;
  }

  if (height > maxHalfHeight * 2) {
    height = maxHalfHeight * 2;
    width = height * safeRatio;
  }

  return {
    x: clampCropNumber(centerX - width / 2, 0, 1 - width),
    y: clampCropNumber(centerY - height / 2, 0, 1 - height),
    width: clampCropNumber(width, 0, 1),
    height: clampCropNumber(height, 0, 1),
  };
};

export const createCenteredCropRectFromSize = (
  centerX: number,
  centerY: number,
  width: number,
  height: number
): NormalizedCropRect => {
  const safeWidth = clampCropNumber(width, 0.0001, 1);
  const safeHeight = clampCropNumber(height, 0.0001, 1);
  let x = centerX - safeWidth / 2;
  let y = centerY - safeHeight / 2;

  x = clampCropNumber(x, 0, 1 - safeWidth);
  y = clampCropNumber(y, 0, 1 - safeHeight);

  return {
    x,
    y,
    width: safeWidth,
    height: safeHeight,
  };
};

export const updateCropRectWithPointer = ({
  aspectRatio,
  handle,
  minHeight,
  minWidth,
  pointer,
  startPoint,
  startRect,
}: {
  aspectRatio: number | null;
  handle: CropInteractionHandle;
  minHeight: number;
  minWidth: number;
  pointer: BoxCutoutPoint;
  startPoint: BoxCutoutPoint;
  startRect: NormalizedCropRect;
}): NormalizedCropRect => {
  const startRight = startRect.x + startRect.width;
  const startBottom = startRect.y + startRect.height;
  const currentAspect =
    aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : null;

  if (handle === "move") {
    const nextX = clampCropNumber(
      startRect.x + (pointer.x - startPoint.x),
      0,
      1 - startRect.width
    );
    const nextY = clampCropNumber(
      startRect.y + (pointer.y - startPoint.y),
      0,
      1 - startRect.height
    );
    return {
      x: nextX,
      y: nextY,
      width: startRect.width,
      height: startRect.height,
    };
  }

  if (!currentAspect) {
    let x = startRect.x;
    let y = startRect.y;
    let width = startRect.width;
    let height = startRect.height;

    if (handle.includes("w")) {
      x = clampCropNumber(pointer.x, 0, startRight - minWidth);
      width = startRight - x;
    }
    if (handle.includes("e")) {
      width = clampCropNumber(pointer.x - startRect.x, minWidth, 1 - startRect.x);
    }
    if (handle.includes("n")) {
      y = clampCropNumber(pointer.y, 0, startBottom - minHeight);
      height = startBottom - y;
    }
    if (handle.includes("s")) {
      height = clampCropNumber(pointer.y - startRect.y, minHeight, 1 - startRect.y);
    }

    return {
      x,
      y,
      width,
      height,
    };
  }

  if (handle === "n" || handle === "s") {
    const anchorY = handle === "n" ? startBottom : startRect.y;
    let height = Math.abs(anchorY - pointer.y);
    height = clampCropNumber(
      height,
      minHeight,
      handle === "n" ? anchorY : 1 - anchorY
    );
    let width = height * currentAspect;
    const centerX = startRect.x + startRect.width / 2;
    const maxWidth = Math.min(centerX, 1 - centerX) * 2;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / currentAspect;
    }
    return {
      x: clampCropNumber(centerX - width / 2, 0, 1 - width),
      y: handle === "n" ? anchorY - height : anchorY,
      width,
      height,
    };
  }

  if (handle === "w" || handle === "e") {
    const anchorX = handle === "w" ? startRight : startRect.x;
    let width = Math.abs(anchorX - pointer.x);
    width = clampCropNumber(width, minWidth, handle === "w" ? anchorX : 1 - anchorX);
    let height = width / currentAspect;
    const centerY = startRect.y + startRect.height / 2;
    const maxHeight = Math.min(centerY, 1 - centerY) * 2;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * currentAspect;
    }
    return {
      x: handle === "w" ? anchorX - width : anchorX,
      y: clampCropNumber(centerY - height / 2, 0, 1 - height),
      width,
      height,
    };
  }

  const isWest = handle.includes("w");
  const isNorth = handle.includes("n");
  const anchorX = isWest ? startRight : startRect.x;
  const anchorY = isNorth ? startBottom : startRect.y;
  const maxWidth = isWest ? anchorX : 1 - anchorX;
  const maxHeight = isNorth ? anchorY : 1 - anchorY;

  let width = Math.abs(anchorX - pointer.x);
  let height = width / currentAspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * currentAspect;
  }
  if (width > maxWidth) {
    width = maxWidth;
    height = width / currentAspect;
  }
  if (width < minWidth) {
    width = minWidth;
    height = width / currentAspect;
  }
  if (height < minHeight) {
    height = minHeight;
    width = height * currentAspect;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * currentAspect;
  }
  if (width > maxWidth) {
    width = maxWidth;
    height = width / currentAspect;
  }

  return {
    x: isWest ? anchorX - width : anchorX,
    y: isNorth ? anchorY - height : anchorY,
    width,
    height,
  };
};
