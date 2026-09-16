// Modified for standalone community distribution; see NOTICE.
export type VideoDurationCostMap = Record<string, number>;
export type VideoResolutionCostMap = Record<string, number>;

export const recommendedVideoDurationOptions = [5, 10, 15] as const;
export const recommendedVideoDurationReferenceCosts: VideoDurationCostMap = {
  "5": 165,
  "10": 350,
  "15": 600,
};
export const recommendedVideoResolutionBaseCosts: VideoResolutionCostMap = {
  "480p": 600,
  "720p": 900,
  "1080p": 1200,
};

export type VideoImageGenConfigLike = {
  creditCostPerVideo?: number | null;
  videoDurationOptions?: number[] | null;
  creditCostPerVideoByDuration?: Record<string, number> | null;
  creditCostPerVideoByResolution?: Record<string, number> | null;
};

function normalizePositiveInteger(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  const rounded = Math.round(normalized);
  if (rounded < 1) return null;
  return rounded;
}

export function normalizeVideoDurationOptions(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => normalizePositiveInteger(item))
        .filter((item): item is number => item !== null)
    )
  ).sort((left, right) => left - right);
}

export function normalizeVideoDurationCostMap(
  value: unknown,
  durationOptions?: readonly number[] | null
): VideoDurationCostMap | undefined {
  if (!value || typeof value !== "object") return undefined;

  const allowedDurations = Array.isArray(durationOptions)
    ? new Set(durationOptions.map((item) => String(item)))
    : null;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([durationKey, costValue]) => {
      const normalizedDuration = normalizePositiveInteger(durationKey);
      const normalizedCost = Number(costValue);
      if (normalizedDuration === null || !Number.isFinite(normalizedCost)) {
        return null;
      }
      const durationText = String(normalizedDuration);
      if (allowedDurations && !allowedDurations.has(durationText)) {
        return null;
      }
      return [durationText, Math.max(0, Math.round(normalizedCost))] as const;
    })
    .filter((entry): entry is readonly [string, number] => Boolean(entry));

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function normalizeVideoResolutionKey(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "480p" || normalized === "480") return "480p";
  if (normalized === "720p" || normalized === "720") return "720p";
  if (normalized === "1080p" || normalized === "1080") return "1080p";
  if (normalized === "1k") return "1K";
  if (normalized === "2k") return "2K";
  if (normalized === "4k") return "4K";
  return null;
}

export function normalizeVideoResolutionCostMap(
  value: unknown
): VideoResolutionCostMap | undefined {
  if (!value || typeof value !== "object") return undefined;

  const entries: Array<readonly [string, number]> = [];
  for (const [resolutionKey, costValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedResolution = normalizeVideoResolutionKey(resolutionKey);
    const normalizedCost = Number(costValue);
    if (!normalizedResolution || !Number.isFinite(normalizedCost)) {
      continue;
    }
    entries.push([
      normalizedResolution,
      Math.max(0, Math.round(normalizedCost)),
    ] as const);
  }

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function getConfiguredVideoDurationOptions(
  config: VideoImageGenConfigLike | null | undefined
): number[] {
  return normalizeVideoDurationOptions(config?.videoDurationOptions);
}

export function buildVideoDurationCostMap(params: {
  durationOptions: readonly number[];
  costMap?: unknown;
  fallbackCost?: number | null | undefined;
}): VideoDurationCostMap | undefined {
  const fallbackCost = Number.isFinite(Number(params.fallbackCost))
    ? Math.max(0, Math.round(Number(params.fallbackCost)))
    : 0;
  const normalizedCostMap =
    normalizeVideoDurationCostMap(params.costMap, params.durationOptions) || {};

  if (params.durationOptions.length === 0 && Object.keys(normalizedCostMap).length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    params.durationOptions.map((duration) => {
      const key = String(duration);
      return [key, normalizedCostMap[key] ?? fallbackCost];
    })
  );
}

export function getVideoCreditCostFromConfig(
  config: VideoImageGenConfigLike | null | undefined,
  duration?: number | null,
  resolution?: string | null
): number {
  const normalizedDuration = normalizePositiveInteger(duration);
  const normalizedResolution = normalizeVideoResolutionKey(resolution);
  const resolutionCostMap = normalizeVideoResolutionCostMap(
    config?.creditCostPerVideoByResolution
  );
  const durationCostMap = normalizeVideoDurationCostMap(
    config?.creditCostPerVideoByDuration
  );
  const durationCostEntries = durationCostMap
    ? Object.entries(durationCostMap)
        .map(([durationKey, cost]) => ({
          duration: normalizePositiveInteger(durationKey),
          cost: Math.max(0, Math.round(Number(cost) || 0)),
        }))
        .filter((item): item is { duration: number; cost: number } =>
          item.duration !== null
        )
        .sort((left, right) => left.duration - right.duration)
    : [];
  const getDurationCost = () => {
    if (normalizedDuration === null || durationCostEntries.length === 0) return null;
    const matched =
      durationCostEntries.find((item) => item.duration === normalizedDuration) ||
      durationCostEntries.find((item) => normalizedDuration <= item.duration) ||
      durationCostEntries[durationCostEntries.length - 1] ||
      null;
    return matched?.cost ?? null;
  };

  if (normalizedResolution && resolutionCostMap) {
    if (Object.prototype.hasOwnProperty.call(resolutionCostMap, normalizedResolution)) {
      const resolutionBaseCost = resolutionCostMap[normalizedResolution] || 0;
      const durationCost = getDurationCost();
      const baseDurationCost =
        [...durationCostEntries]
          .reverse()
          .find((item) => item.cost > 0)?.cost ?? null;

      if (durationCost !== null && baseDurationCost && baseDurationCost > 0) {
        return Math.max(
          0,
          Math.round((resolutionBaseCost * durationCost) / baseDurationCost)
        );
      }

      return resolutionBaseCost;
    }
  }

  const durationCost = getDurationCost();
  if (durationCost !== null) {
    return durationCost;
  }

  const fallbackCost = Number(config?.creditCostPerVideo ?? 0);
  return Number.isFinite(fallbackCost) ? Math.max(0, Math.round(fallbackCost)) : 0;
}
