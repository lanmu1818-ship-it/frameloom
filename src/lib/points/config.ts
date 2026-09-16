// Modified for standalone community distribution; see NOTICE.
export const POINTS_SYSTEM_CONFIG_KEY = "points_system_config";
export const POINTS_PACKAGES_KEY = "points_packages";

export type ImageEnhancePointsChargeMode =
  | "fixed"
  | "resolution_bucket"
  | "scale_factor";

export type ImageEnhancePointsResolutionBucket = {
  id: string;
  name: string;
  maxMegapixels: number;
  cost: number;
};

export type ImageEnhancePointsPricingConfig = {
  enabled: boolean;
  chargeMode: ImageEnhancePointsChargeMode;
  fixedCost: number;
  chargeOnlyWhenUpscaling: boolean;
  batchSizeMultiplierEnabled: boolean;
  scaleFactorCosts: Record<string, number>;
  resolutionBuckets: ImageEnhancePointsResolutionBucket[];
  modelMultipliers: Record<string, number>;
};

export type PointsSystemConfig = {
  enabled: boolean;
  blockOnInsufficient: boolean;
  creditCostPerImageMultiView: number;
  creditCostPerImageRemoveBackground: number;
  creditCostPerImageBoxCutout: number;
  creditCostPerImageWatermarkRemove: number;
  creditCostPerImageExtend: number;
  creditCostPerImageRepaint: number;
  creditCostPerImageAngleEdit: number;
  imageEnhancePricing: ImageEnhancePointsPricingConfig;
};

export type ImageToolCreditFeature =
  | "multi-view"
  | "remove-background"
  | "box-cutout"
  | "watermark-remove"
  | "extend"
  | "repaint"
  | "angle-edit";

export type PointsPackage = {
  id: string;
  name: string;
  points: number;
  price: number;
  currency: string;
  isEnabled: boolean;
};

export const defaultPointsSystemConfig: PointsSystemConfig = {
  enabled: false,
  blockOnInsufficient: true,
  creditCostPerImageMultiView: 0,
  creditCostPerImageRemoveBackground: 0,
  creditCostPerImageBoxCutout: 0,
  creditCostPerImageWatermarkRemove: 0,
  creditCostPerImageExtend: 0,
  creditCostPerImageRepaint: 0,
  creditCostPerImageAngleEdit: 0,
  imageEnhancePricing: {
    enabled: false,
    chargeMode: "scale_factor",
    fixedCost: 20,
    chargeOnlyWhenUpscaling: false,
    batchSizeMultiplierEnabled: true,
    scaleFactorCosts: {
      "1": 20,
      "1.25": 25,
      "1.5": 30,
      "2": 40,
      "3": 60,
      "4": 80,
    },
    resolutionBuckets: [
      {
        id: "image-enhance-1mp",
        name: "1MP 以内",
        maxMegapixels: 1,
        cost: 20,
      },
      {
        id: "image-enhance-2mp",
        name: "2MP 以内",
        maxMegapixels: 2,
        cost: 30,
      },
      {
        id: "image-enhance-4mp",
        name: "4MP 以内",
        maxMegapixels: 4,
        cost: 45,
      },
      {
        id: "image-enhance-8mp",
        name: "8MP 以内",
        maxMegapixels: 8,
        cost: 65,
      },
      {
        id: "image-enhance-16mp",
        name: "16MP 以内",
        maxMegapixels: 16,
        cost: 90,
      },
    ],
    modelMultipliers: {
      Redefine: 1,
      Recovery: 1,
      "Recovery V2": 1,
      Reimagine: 1,
    },
  },
};

export const defaultPointsPackages: PointsPackage[] = [
  {
    id: "starter-1000",
    name: "入门包",
    points: 1000,
    price: 9.9,
    currency: "CNY",
    isEnabled: true,
  },
  {
    id: "pro-5000",
    name: "专业包",
    points: 5000,
    price: 39.9,
    currency: "CNY",
    isEnabled: true,
  },
];

function normalizeCost(input: unknown) {
  const parsedValue = Number(input);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.min(100000, Math.round(parsedValue))
    : 0;
}

function normalizeMultiplier(input: unknown, fallback: number) {
  const parsedValue = Number(input);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.min(10, Math.max(0.1, Number(parsedValue.toFixed(2))))
    : fallback;
}

function normalizeMegapixels(input: unknown, fallback: number) {
  const parsedValue = Number(input);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.min(100, Math.max(0.1, Number(parsedValue.toFixed(2))))
    : fallback;
}

function normalizeScaleFactor(input: unknown, fallback: number) {
  const parsedValue = Number(input);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.min(32, Math.max(1, Number(parsedValue.toFixed(2))))
    : fallback;
}

function tryParseScaleFactor(input: unknown) {
  const parsedValue = Number(input);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
  return Math.min(32, Math.max(1, Number(parsedValue.toFixed(2))));
}

export function formatImageEnhanceScaleFactorKey(input: unknown) {
  const normalized = normalizeScaleFactor(input, 1);
  return Number(normalized.toFixed(2)).toString();
}

function normalizeImageEnhanceScaleFactorCosts(value: unknown) {
  const defaults = defaultPointsSystemConfig.imageEnhancePricing.scaleFactorCosts;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .map(([factorKey, costValue]) => {
      const factor = tryParseScaleFactor(factorKey);
      if (factor === null) return null;
      return [formatImageEnhanceScaleFactorKey(factor), normalizeCost(costValue)] as const;
    })
    .filter((entry): entry is readonly [string, number] => Boolean(entry))
    .sort((left, right) => Number(left[0]) - Number(right[0]));

  if (normalizedEntries.length === 0) {
    return defaults;
  }

  return Object.fromEntries(normalizedEntries);
}

function normalizeImageEnhanceResolutionBucket(
  value: unknown,
  index: number,
  fallback: ImageEnhancePointsResolutionBucket
): ImageEnhancePointsResolutionBucket | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as Partial<ImageEnhancePointsResolutionBucket>;
  const id = String(raw.id || fallback.id || `image-enhance-bucket-${index + 1}`).trim();
  const name = String(raw.name || fallback.name || `档位 ${index + 1}`).trim();
  const maxMegapixels = normalizeMegapixels(
    raw.maxMegapixels,
    fallback.maxMegapixels
  );
  const cost = normalizeCost(raw.cost ?? fallback.cost);

  if (!id || !name || cost <= 0) {
    return null;
  }

  return {
    id: id.slice(0, 64),
    name: name.slice(0, 64),
    maxMegapixels,
    cost,
  };
}

export function normalizeImageEnhancePointsPricingConfig(
  value: unknown
): ImageEnhancePointsPricingConfig {
  const defaults = defaultPointsSystemConfig.imageEnhancePricing;
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<ImageEnhancePointsPricingConfig>)
      : {};

  const resolutionBuckets = Array.isArray(raw.resolutionBuckets)
    ? raw.resolutionBuckets
        .map((item, index) =>
          normalizeImageEnhanceResolutionBucket(
            item,
            index,
            defaults.resolutionBuckets[index] || defaults.resolutionBuckets[defaults.resolutionBuckets.length - 1]
          )
        )
        .filter((item): item is ImageEnhancePointsResolutionBucket => Boolean(item))
        .sort((left, right) => left.maxMegapixels - right.maxMegapixels)
    : defaults.resolutionBuckets;

  const modelMultipliersRaw =
    raw.modelMultipliers && typeof raw.modelMultipliers === "object"
      ? raw.modelMultipliers
      : defaults.modelMultipliers;
  const chargeMode: ImageEnhancePointsChargeMode =
    raw.chargeMode === "fixed" ||
    raw.chargeMode === "resolution_bucket" ||
    raw.chargeMode === "scale_factor"
      ? raw.chargeMode
      : defaults.chargeMode;

  return {
    enabled: raw.enabled === true,
    chargeMode,
    fixedCost: normalizeCost(raw.fixedCost ?? defaults.fixedCost),
    chargeOnlyWhenUpscaling: raw.chargeOnlyWhenUpscaling !== false,
    batchSizeMultiplierEnabled: raw.batchSizeMultiplierEnabled !== false,
    scaleFactorCosts: normalizeImageEnhanceScaleFactorCosts(
      raw.scaleFactorCosts
    ),
    resolutionBuckets:
      resolutionBuckets.length > 0 ? resolutionBuckets : defaults.resolutionBuckets,
    modelMultipliers: {
      Redefine: normalizeMultiplier(
        modelMultipliersRaw?.Redefine,
        defaults.modelMultipliers.Redefine
      ),
      Recovery: normalizeMultiplier(
        modelMultipliersRaw?.Recovery,
        defaults.modelMultipliers.Recovery
      ),
      "Recovery V2": normalizeMultiplier(
        modelMultipliersRaw?.["Recovery V2"],
        defaults.modelMultipliers["Recovery V2"]
      ),
      Reimagine: normalizeMultiplier(
        modelMultipliersRaw?.Reimagine,
        defaults.modelMultipliers.Reimagine
      ),
    },
  };
}

export function getImageEnhanceResolutionMegapixels(
  width: number,
  height: number
) {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  return Number(((safeWidth * safeHeight) / 1_048_576).toFixed(2));
}

export function calculateImageEnhancePointsEstimate(
  pointsConfig: PointsSystemConfig,
  params: {
    width: number;
    height: number;
    batchSize?: number;
    model?: string;
    upscalingActivated?: boolean;
    scaleFactor?: number;
  }
) {
  const pricing = normalizeImageEnhancePointsPricingConfig(
    pointsConfig.imageEnhancePricing
  );
  const model =
    params.model === "Recovery" ||
    params.model === "Recovery V2" ||
    params.model === "Reimagine" ||
    params.model === "Redefine"
      ? params.model
      : "Redefine";
  const megapixels = getImageEnhanceResolutionMegapixels(params.width, params.height);
  const batchSize = Math.max(1, Math.round(Number(params.batchSize) || 1));
  const upscalingActivated = params.upscalingActivated === true;
  const scaleFactor = normalizeScaleFactor(params.scaleFactor ?? 1, 1);
  const billingScaleFactor = upscalingActivated ? scaleFactor : 1;
  const batchMultiplier = pricing.batchSizeMultiplierEnabled ? batchSize : 1;
  const modelMultiplier =
    pricing.modelMultipliers[model] || defaultPointsSystemConfig.imageEnhancePricing.modelMultipliers[model];
  const bucket =
    pricing.chargeMode === "resolution_bucket"
      ? pricing.resolutionBuckets.find((item) => megapixels <= item.maxMegapixels) ||
        pricing.resolutionBuckets[pricing.resolutionBuckets.length - 1] ||
        null
      : null;
  const scaleFactorCosts = normalizeImageEnhanceScaleFactorCosts(
    pricing.scaleFactorCosts
  );
  const scaleFactorCostEntries = Object.entries(scaleFactorCosts)
    .map(([factorKey, cost]) => ({
      factorKey,
      factor: Number(factorKey),
      cost,
    }))
    .filter((item) => Number.isFinite(item.factor))
    .sort((left, right) => left.factor - right.factor);
  const scaleFactorCost =
    scaleFactorCostEntries.find(
      (item) => Math.abs(item.factor - billingScaleFactor) < 0.001
    ) || null;
  const linearScaleFactorCost = Math.ceil(pricing.fixedCost * billingScaleFactor);
  const baseCost =
    pricing.chargeOnlyWhenUpscaling && !upscalingActivated
      ? 0
      : pricing.chargeMode === "fixed"
        ? pricing.fixedCost
        : pricing.chargeMode === "scale_factor"
          ? Math.max(0, Number(scaleFactorCost?.cost ?? linearScaleFactorCost))
          : Math.max(0, Number(bucket?.cost || 0));
  const rawCost = baseCost * batchMultiplier * modelMultiplier;
  const cost = baseCost > 0 ? Math.max(1, Math.ceil(rawCost)) : 0;
  const enabled = pointsConfig.enabled === true && pricing.enabled === true;

  return {
    enabled,
    chargeable: enabled && cost > 0,
    chargeMode: pricing.chargeMode,
    chargeOnlyWhenUpscaling: pricing.chargeOnlyWhenUpscaling,
    upscalingActivated,
    scaleFactor,
    billingScaleFactor,
    megapixels,
    batchSize,
    batchMultiplier,
    model,
    modelMultiplier,
    baseCost,
    cost,
    scaleFactorCostKey: scaleFactorCost?.factorKey || null,
    bucketId: bucket?.id || null,
    bucketName: bucket?.name || null,
  };
}

export function getImageToolCreditCost(
  pointsConfig: PointsSystemConfig,
  feature: ImageToolCreditFeature | null | undefined
) {
  switch (feature) {
    case "multi-view":
      return normalizeCost(pointsConfig.creditCostPerImageMultiView);
    case "remove-background":
      return normalizeCost(pointsConfig.creditCostPerImageRemoveBackground);
    case "box-cutout":
      return normalizeCost(pointsConfig.creditCostPerImageBoxCutout);
    case "watermark-remove":
      return normalizeCost(pointsConfig.creditCostPerImageWatermarkRemove);
    case "extend":
      return normalizeCost(pointsConfig.creditCostPerImageExtend);
    case "repaint":
      return normalizeCost(pointsConfig.creditCostPerImageRepaint);
    case "angle-edit":
      return normalizeCost(pointsConfig.creditCostPerImageAngleEdit);
    default:
      return 0;
  }
}

export function normalizePointsSystemConfig(value: unknown): PointsSystemConfig {
  if (!value || typeof value !== "object") {
    return defaultPointsSystemConfig;
  }

  const raw = value as Partial<PointsSystemConfig>;
  return {
    enabled: raw.enabled === true,
    blockOnInsufficient: raw.blockOnInsufficient !== false,
    creditCostPerImageMultiView: normalizeCost(raw.creditCostPerImageMultiView),
    creditCostPerImageRemoveBackground: normalizeCost(
      raw.creditCostPerImageRemoveBackground
    ),
    creditCostPerImageBoxCutout: normalizeCost(raw.creditCostPerImageBoxCutout),
    creditCostPerImageWatermarkRemove: normalizeCost(
      raw.creditCostPerImageWatermarkRemove
    ),
    creditCostPerImageExtend: normalizeCost(raw.creditCostPerImageExtend),
    creditCostPerImageRepaint: normalizeCost(raw.creditCostPerImageRepaint),
    creditCostPerImageAngleEdit: normalizeCost(
      raw.creditCostPerImageAngleEdit
    ),
    imageEnhancePricing: normalizeImageEnhancePointsPricingConfig(
      raw.imageEnhancePricing
    ),
  };
}

export function normalizePointsPackages(value: unknown): PointsPackage[] {
  if (!Array.isArray(value)) {
    return defaultPointsPackages;
  }

  const normalized = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<PointsPackage>;
      const id = String(raw.id || `package-${index + 1}`).trim();
      const name = String(raw.name || "").trim();
      const points = Number(raw.points);
      const price = Number(raw.price);
      const currency = String(raw.currency || "CNY").trim().toUpperCase();

      if (!id || !name || !Number.isFinite(points) || points <= 0) return null;
      if (!Number.isFinite(price) || price < 0) return null;

      return {
        id: id.slice(0, 64),
        name: name.slice(0, 64),
        points: Math.round(points),
        price: Number(price.toFixed(2)),
        currency: currency.slice(0, 8) || "CNY",
        isEnabled: raw.isEnabled !== false,
      } satisfies PointsPackage;
    })
    .filter((item): item is PointsPackage => Boolean(item))
    .slice(0, 30);

  return normalized.length > 0 ? normalized : defaultPointsPackages;
}
