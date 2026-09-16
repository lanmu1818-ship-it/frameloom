// Modified for standalone community distribution; see NOTICE.
import { getVideoCreditCostFromConfig, type VideoImageGenConfigLike } from "@/src/lib/ai/video-model-config";

export type DiscountableImageGenConfigLike = VideoImageGenConfigLike & {
  creditCostPerImage?: number | null;
  creditDiscountRate?: number | null;
  creditCostMultiplierBySize?: Record<string, number | null | undefined> | null;
};

function normalizeRoundedCost(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.round(normalized));
}

export function normalizeImageModelCreditDiscountRate(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  const rounded = Math.round(normalized * 10) / 10;
  if (rounded <= 0 || rounded >= 10) return null;
  return rounded;
}

export function formatImageModelCreditDiscountLabel(value: unknown) {
  const normalized = normalizeImageModelCreditDiscountRate(value);
  if (normalized === null) return null;
  const displayValue = Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(1).replace(/\.0$/, "");
  return `${displayValue}折`;
}

export function getImageModelCreditDiscountLabel(
  config: DiscountableImageGenConfigLike | null | undefined
) {
  return formatImageModelCreditDiscountLabel(config?.creditDiscountRate);
}

export function applyImageModelCreditDiscount(
  rawCost: unknown,
  config: DiscountableImageGenConfigLike | null | undefined
) {
  const baseCost = normalizeRoundedCost(rawCost);
  if (baseCost <= 0) return 0;

  const normalizedDiscountRate = normalizeImageModelCreditDiscountRate(
    config?.creditDiscountRate
  );
  if (normalizedDiscountRate === null) return baseCost;

  return Math.max(0, Math.round((baseCost * normalizedDiscountRate) / 10));
}

function normalizeImageSizeKey(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "1K" || normalized === "2K" || normalized === "4K") {
    return normalized;
  }
  return null;
}

export function normalizeImageSizeCreditMultiplier(value: unknown, fallback = 1) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) return fallback;
  return Math.min(100, Math.max(0.01, Number(normalized.toFixed(2))));
}

export function getImageSizeCreditMultiplier(
  config: DiscountableImageGenConfigLike | null | undefined,
  imageSize?: string | null
) {
  const sizeKey = normalizeImageSizeKey(imageSize);
  if (!sizeKey) return 1;
  return normalizeImageSizeCreditMultiplier(
    config?.creditCostMultiplierBySize?.[sizeKey],
    1
  );
}

export function getGenerationCreditCostFromImageGenConfig(
  config: DiscountableImageGenConfigLike | null | undefined,
  target: "image" | "video",
  options?: {
    duration?: number | null;
    imageSize?: string | null;
    resolution?: string | null;
  }
) {
  const sourceValue =
    target === "video"
      ? (() => {
          const resolvedVideoCost = getVideoCreditCostFromConfig(
            config,
            options?.duration,
            options?.resolution
          );
          if (resolvedVideoCost > 0) return resolvedVideoCost;
          return config?.creditCostPerVideo ?? config?.creditCostPerImage ?? 0;
        })()
      : config?.creditCostPerImage ?? 0;

  const discountedCost = applyImageModelCreditDiscount(sourceValue, config);
  if (target !== "image" || discountedCost <= 0) {
    return discountedCost;
  }

  return Math.max(
    0,
    Math.round(discountedCost * getImageSizeCreditMultiplier(config, options?.imageSize))
  );
}

export function getImageCreditCostFromConfig(
  config: DiscountableImageGenConfigLike | null | undefined,
  imageSize?: string | null
) {
  return getGenerationCreditCostFromImageGenConfig(config, "image", { imageSize });
}

export function getModelGenerationCreditCost(
  modelConfig: { imageGenConfig?: DiscountableImageGenConfigLike | null } | null | undefined,
  target: "image" | "video",
  options?: {
    duration?: number | null;
    imageSize?: string | null;
    resolution?: string | null;
  }
) {
  return getGenerationCreditCostFromImageGenConfig(
    modelConfig?.imageGenConfig,
    target,
    options
  );
}

export function normalizeImageGenPricingConfig<
  T extends DiscountableImageGenConfigLike | null | undefined,
>(config: T): T {
  if (!config) return config;

  const normalizedDiscountRate = normalizeImageModelCreditDiscountRate(
    config.creditDiscountRate
  );

  return {
    ...config,
    creditDiscountRate: normalizedDiscountRate ?? undefined,
    creditCostMultiplierBySize: {
      ...config.creditCostMultiplierBySize,
      ...(config.creditCostMultiplierBySize?.["1K"] !== undefined
        ? {
            "1K": normalizeImageSizeCreditMultiplier(
              config.creditCostMultiplierBySize["1K"]
            ),
          }
        : {}),
      ...(config.creditCostMultiplierBySize?.["2K"] !== undefined
        ? {
            "2K": normalizeImageSizeCreditMultiplier(
              config.creditCostMultiplierBySize["2K"]
            ),
          }
        : {}),
      ...(config.creditCostMultiplierBySize?.["4K"] !== undefined
        ? {
            "4K": normalizeImageSizeCreditMultiplier(
              config.creditCostMultiplierBySize["4K"]
            ),
          }
        : {}),
    },
  } as T;
}
