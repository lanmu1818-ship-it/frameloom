// Modified for standalone community distribution; see NOTICE.
export type GrsaiGptImageSizeBucket = "1K" | "2K" | "4K";

type GrsaiGptImageSizeOption = {
  bucket: GrsaiGptImageSizeBucket;
  width: number;
  height: number;
};

const GRSAI_GPT_IMAGE_SIZE_OPTIONS: GrsaiGptImageSizeOption[] = [
  { bucket: "1K", width: 1280, height: 1280 },
  { bucket: "1K", width: 848, height: 1280 },
  { bucket: "1K", width: 1280, height: 848 },
  { bucket: "1K", width: 960, height: 1280 },
  { bucket: "1K", width: 1280, height: 960 },
  { bucket: "1K", width: 1024, height: 1280 },
  { bucket: "1K", width: 1280, height: 1024 },
  { bucket: "1K", width: 720, height: 1280 },
  { bucket: "1K", width: 1280, height: 720 },
  { bucket: "1K", width: 1280, height: 544 },
  { bucket: "2K", width: 2048, height: 2048 },
  { bucket: "2K", width: 1360, height: 2048 },
  { bucket: "2K", width: 2048, height: 1360 },
  { bucket: "2K", width: 1536, height: 2048 },
  { bucket: "2K", width: 2048, height: 1536 },
  { bucket: "2K", width: 1632, height: 2048 },
  { bucket: "2K", width: 2048, height: 1632 },
  { bucket: "2K", width: 1152, height: 2048 },
  { bucket: "2K", width: 2048, height: 1152 },
  { bucket: "2K", width: 2048, height: 864 },
  { bucket: "4K", width: 2880, height: 2880 },
  { bucket: "4K", width: 2336, height: 3520 },
  { bucket: "4K", width: 3520, height: 2336 },
  { bucket: "4K", width: 2480, height: 3312 },
  { bucket: "4K", width: 3312, height: 2480 },
  { bucket: "4K", width: 2560, height: 3216 },
  { bucket: "4K", width: 3216, height: 2560 },
  { bucket: "4K", width: 2160, height: 3840 },
  { bucket: "4K", width: 3840, height: 2160 },
  { bucket: "4K", width: 3840, height: 1632 },
];

const GRSAI_GPT_IMAGE_SIZE_VALUES = new Set(
  GRSAI_GPT_IMAGE_SIZE_OPTIONS.map((option) => `${option.width}x${option.height}`)
);

function normalizeGrsaiGptImageBucket(imageSize?: string): GrsaiGptImageSizeBucket {
  const normalized = String(imageSize || "").trim().toUpperCase();
  if (normalized === "1K" || normalized === "2K" || normalized === "4K") {
    return normalized;
  }
  return "2K";
}

function parseAspectRatioValue(aspectRatio?: string): number {
  const normalized = String(aspectRatio || "").trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return 1;
  }

  const [widthRaw, heightRaw] = normalized.split(":").map((part) => Number(part));
  if (!Number.isFinite(widthRaw) || !Number.isFinite(heightRaw) || widthRaw <= 0 || heightRaw <= 0) {
    return 1;
  }

  return widthRaw / heightRaw;
}

export function getGrsaiGptImageOutputSize(aspectRatio?: string, imageSize?: string) {
  const bucket = normalizeGrsaiGptImageBucket(imageSize);
  const targetRatio = parseAspectRatioValue(aspectRatio);
  const candidates = GRSAI_GPT_IMAGE_SIZE_OPTIONS.filter((option) => option.bucket === bucket);
  const best = candidates.reduce((currentBest, option) => {
    const currentDelta = Math.abs(currentBest.width / currentBest.height - targetRatio);
    const optionDelta = Math.abs(option.width / option.height - targetRatio);
    if (optionDelta < currentDelta) {
      return option;
    }
    if (optionDelta === currentDelta) {
      const currentArea = currentBest.width * currentBest.height;
      const optionArea = option.width * option.height;
      return optionArea > currentArea ? option : currentBest;
    }
    return currentBest;
  }, candidates[0]);

  return { width: best.width, height: best.height };
}

export function resolveGrsaiGptImageSize(aspectRatio?: string, imageSize?: string): string {
  const requestedSize = String(imageSize || "").trim().toLowerCase();
  if (/^\d+x\d+$/.test(requestedSize) && GRSAI_GPT_IMAGE_SIZE_VALUES.has(requestedSize)) {
    return requestedSize;
  }

  const { width, height } = getGrsaiGptImageOutputSize(aspectRatio, imageSize);
  return `${width}x${height}`;
}
