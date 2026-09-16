// Modified for standalone community distribution; see NOTICE.
import type { VideoModelCapabilities } from "@/types/ai";
import { getRunwayVideoModelDefinition } from "@/src/lib/ai/runway-video-models";
import { getConfiguredVideoDurationOptions } from "@/src/lib/ai/video-model-config";
import type {
  VideoToolCapabilityContract,
  VideoToolDefaults,
  VideoToolMode,
  VideoToolModeConstraint,
  VideoToolModeOption,
  VideoToolResolution,
} from "@/types/video-tool-capability";

const MODE_LABELS: Record<VideoToolMode, string> = {
  "text-to-video": "文生视频",
  "first-frame": "主体参考",
  "first-last-frame": "首尾帧",
  "reference-images": "智能多帧",
};

const MODE_ORDER: VideoToolMode[] = [
  "text-to-video",
  "first-last-frame",
  "reference-images",
  "first-frame",
];

const STANDARD_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const PORTRAIT_RATIOS = ["16:9", "9:16", "1:1"];
const STANDARD_RESOLUTIONS: VideoToolResolution[] = ["480p", "720p", "1080p"];
const STANDARD_DURATIONS = [5, 10];

type ParsedVideoCapabilities = Partial<VideoModelCapabilities> & {
  constraints?: Partial<Record<VideoToolMode, VideoToolModeConstraint>>;
  durationOptions?: number[];
};

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, any>) : null;
}

function normalizeDurations(min?: number, max?: number) {
  const safeMin = Number.isFinite(min) ? Math.max(1, Math.round(Number(min))) : undefined;
  const safeMax = Number.isFinite(max) ? Math.max(1, Math.round(Number(max))) : undefined;
  if (!safeMin || !safeMax || safeMax < safeMin) {
    return [...STANDARD_DURATIONS];
  }

  if (safeMax - safeMin <= 12) {
    return Array.from({ length: safeMax - safeMin + 1 }, (_, index) => safeMin + index);
  }
  return [safeMin, safeMax];
}

function normalizeModeOptions(
  modes: VideoToolMode[],
  maxReferenceImages = 4
): VideoToolModeOption[] {
  return MODE_ORDER.filter((mode) => modes.includes(mode)).map((mode) => {
    if (mode === "text-to-video") {
      return { mode, label: MODE_LABELS[mode], imageMin: 0, imageMax: 0 };
    }
    if (mode === "first-frame") {
      return { mode, label: MODE_LABELS[mode], imageMin: 1, imageMax: 1 };
    }
    if (mode === "first-last-frame") {
      return { mode, label: MODE_LABELS[mode], imageMin: 2, imageMax: 2 };
    }
    return {
      mode,
      label: MODE_LABELS[mode],
      imageMin: 1,
      imageMax: Math.max(1, Math.min(8, maxReferenceImages)),
    };
  });
}

function normalizeModeConstraints(
  rawConstraints: unknown
): Partial<Record<VideoToolMode, VideoToolModeConstraint>> | undefined {
  const raw = asObject(rawConstraints);
  if (!raw) return undefined;

  const modeConstraints: Partial<Record<VideoToolMode, VideoToolModeConstraint>> = {};

  for (const mode of MODE_ORDER) {
    const entry = asObject(raw[mode]);
    if (!entry) continue;

    const ratioOptions = Array.isArray(entry.ratioOptions)
      ? entry.ratioOptions.map((item) => String(item || "").trim()).filter(Boolean)
      : undefined;
    const durationOptions = Array.isArray(entry.durationOptions)
      ? entry.durationOptions
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item))
          .map((item) => Math.round(item))
      : undefined;
    const resolutionOptions = Array.isArray(entry.resolutionOptions)
      ? entry.resolutionOptions.filter(
          (item): item is VideoToolResolution =>
            item === "480p" || item === "720p" || item === "1080p"
        )
      : undefined;
    const defaults = asObject(entry.defaults);

    modeConstraints[mode] = {
      ratioOptions: ratioOptions?.length ? Array.from(new Set(ratioOptions)) : undefined,
      durationOptions: durationOptions?.length ? Array.from(new Set(durationOptions)) : undefined,
      resolutionOptions: resolutionOptions?.length ? Array.from(new Set(resolutionOptions)) : undefined,
      defaults: defaults
        ? {
            mode,
            ratio: typeof defaults.ratio === "string" ? defaults.ratio : undefined,
            duration: Number.isFinite(Number(defaults.duration))
              ? Math.round(Number(defaults.duration))
              : undefined,
            resolution:
              defaults.resolution === "480p" ||
              defaults.resolution === "720p" ||
              defaults.resolution === "1080p"
                ? defaults.resolution
                : undefined,
            generateAudio:
              typeof defaults.generateAudio === "boolean" ? defaults.generateAudio : undefined,
            fps: Number.isFinite(Number(defaults.fps)) ? Math.round(Number(defaults.fps)) : undefined,
          }
        : undefined,
    };
  }

  return Object.keys(modeConstraints).length > 0 ? modeConstraints : undefined;
}

function normalizeVideoCapabilities(rawCapabilities: unknown): ParsedVideoCapabilities {
  const raw = asObject(rawCapabilities);
  if (!raw) return {};

  const supportedModes = Array.isArray(raw.supportedModes)
    ? raw.supportedModes.filter((item): item is VideoToolMode =>
        item === "text-to-video" ||
        item === "first-frame" ||
        item === "first-last-frame" ||
        item === "reference-images"
      )
    : undefined;

  const supportedRatios = Array.isArray(raw.supportedRatios)
    ? raw.supportedRatios
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : undefined;

  const supportedResolutions = Array.isArray(raw.supportedResolutions)
    ? raw.supportedResolutions.filter(
        (item): item is VideoToolResolution => item === "480p" || item === "720p" || item === "1080p"
      )
    : undefined;

  const durationRange = asObject(raw.durationRange);
  const min = Number(durationRange?.min);
  const max = Number(durationRange?.max);
  const durationOptions = Array.isArray(raw.durationOptions)
    ? raw.durationOptions
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
        .map((item) => Math.round(item))
    : undefined;

  return {
    supportedModes,
    supportedRatios: supportedRatios as any,
    supportedResolutions: supportedResolutions as any,
    durationRange:
      Number.isFinite(min) && Number.isFinite(max)
        ? { min: Math.round(min), max: Math.round(max) }
        : undefined,
    durationOptions: durationOptions?.length ? Array.from(new Set(durationOptions)) : undefined,
    maxReferenceImages: Number.isFinite(Number(raw.maxReferenceImages))
      ? Math.round(Number(raw.maxReferenceImages))
      : undefined,
    supportReturnLastFrame:
      typeof raw.supportReturnLastFrame === "boolean" ? raw.supportReturnLastFrame : undefined,
    supportSeed: typeof raw.supportSeed === "boolean" ? raw.supportSeed : undefined,
    constraints: normalizeModeConstraints(raw.modeConstraints || raw.constraints),
  };
}

function createRunwayDefaultCapability(modelId?: string | null): VideoToolCapabilityContract {
  const definition = getRunwayVideoModelDefinition(modelId);

  if (!definition) {
    return {
      schemaVersion: "v1",
      source: "provider-default",
      providerType: "runway",
      modelId: modelId || undefined,
      modeOptions: normalizeModeOptions(["text-to-video", "first-frame"]),
      ratioOptions: [...STANDARD_RATIOS],
      durationOptions: [5, 10],
      resolutionOptions: [],
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: true,
      },
      defaults: {
        mode: "text-to-video",
        ratio: "16:9",
        duration: 5,
        generateAudio: false,
        fps: 24,
      },
    };
  }

  const modeEntries = MODE_ORDER.map((mode) => {
    const modeDefinition = definition.modes[mode];
    if (!modeDefinition) return null;
    return {
      mode,
      label: MODE_LABELS[mode],
      imageMin: modeDefinition.imageMin,
      imageMax: modeDefinition.imageMax,
    } satisfies VideoToolModeOption;
  }).filter((item): item is VideoToolModeOption => Boolean(item));

  const modeConstraints = MODE_ORDER.reduce<Partial<Record<VideoToolMode, VideoToolModeConstraint>>>(
    (acc, mode) => {
      const modeDefinition = definition.modes[mode];
      if (!modeDefinition) return acc;
      acc[mode] = {
        ratioOptions: modeDefinition.ratioOptions,
        durationOptions: modeDefinition.durationOptions,
        resolutionOptions: modeDefinition.resolutionOptions || [],
        defaults: modeDefinition.defaults,
      };
      return acc;
    },
    {}
  );

  const ratioOptions = Array.from(
    new Set(
      Object.values(definition.modes)
        .flatMap((modeDefinition) => modeDefinition?.ratioOptions || [])
        .filter(Boolean)
    )
  );
  const durationOptions = Array.from(
    new Set(
      Object.values(definition.modes)
        .flatMap((modeDefinition) => modeDefinition?.durationOptions || [])
        .filter((item): item is number => Number.isFinite(item))
    )
  ).sort((a, b) => a - b);

  return {
    schemaVersion: "v1",
    source: "provider-default",
    providerType: "runway",
    modelId: modelId || undefined,
    modeOptions: modeEntries,
    ratioOptions,
    durationOptions,
    resolutionOptions: [],
    modeConstraints,
    ui: { ...definition.ui },
    defaults: { ...definition.defaults },
  };
}

function createProviderDefaultCapability(
  providerType: string,
  modelId?: string | null
): VideoToolCapabilityContract {
  if (providerType === "fal-video") {
    return {
      schemaVersion: "v1",
      source: "provider-default",
      providerType,
      modeOptions: normalizeModeOptions(["first-frame", "first-last-frame"]),
      ratioOptions: [...PORTRAIT_RATIOS],
      durationOptions: Array.from({ length: 13 }, (_, index) => index + 3),
      resolutionOptions: [],
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: true,
        showReturnLastFrame: true,
        showSeed: true,
      },
      defaults: {
        mode: "first-frame",
        ratio: "16:9",
        duration: 5,
        generateAudio: true,
        fps: 24,
      },
    };
  }

  if (providerType === "ruxa-video") {
    return {
      schemaVersion: "v1",
      source: "provider-default",
      providerType,
      modeOptions: normalizeModeOptions(["first-frame"]),
      ratioOptions: [...PORTRAIT_RATIOS],
      durationOptions: [5, 10],
      resolutionOptions: [],
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: false,
      },
      defaults: {
        mode: "first-frame",
        ratio: "16:9",
        duration: 10,
        generateAudio: false,
        fps: 24,
      },
    };
  }

  if (providerType === "qianwen-video") {
    return {
      schemaVersion: "v1",
      source: "provider-default",
      providerType,
      modeOptions: normalizeModeOptions(["first-frame"]),
      ratioOptions: ["16:9"],
      durationOptions: [5],
      resolutionOptions: [],
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: false,
      },
      defaults: {
        mode: "first-frame",
        ratio: "16:9",
        duration: 5,
        generateAudio: false,
        fps: 24,
      },
    };
  }

  if (providerType === "runway") {
    return createRunwayDefaultCapability(modelId);
  }

  return {
    schemaVersion: "v1",
    source: "provider-default",
    providerType,
    modeOptions: normalizeModeOptions([
      "text-to-video",
      "first-last-frame",
      "reference-images",
      "first-frame",
    ]),
    ratioOptions: [...STANDARD_RATIOS],
    durationOptions: [...STANDARD_DURATIONS],
    resolutionOptions: [...STANDARD_RESOLUTIONS],
    ui: {
      showResolution: true,
      showFps: true,
      showCameraMove: true,
      showGenerateAudio: false,
      showReturnLastFrame: true,
      showSeed: true,
    },
    defaults: {
      mode: "text-to-video",
      ratio: "16:9",
      duration: 5,
      resolution: "720p",
      generateAudio: false,
      fps: 24,
    },
  };
}

function pickPreferredRatio(ratioOptions: string[]) {
  if (ratioOptions.includes("16:9")) return "16:9";
  return ratioOptions[0] || "16:9";
}

function pickPreferredDuration(durationOptions: number[]) {
  if (durationOptions.includes(5)) return 5;
  if (durationOptions.includes(10)) return 10;
  return durationOptions[0] || 5;
}

function pickPreferredMode(modeOptions: VideoToolModeOption[], fallback: VideoToolMode) {
  const modeSet = new Set(modeOptions.map((item) => item.mode));
  if (modeSet.has(fallback)) return fallback;
  if (modeSet.has("first-frame")) return "first-frame";
  if (modeSet.has("text-to-video")) return "text-to-video";
  return modeOptions[0]?.mode || fallback;
}

function pickPreferredResolution(resolutionOptions: VideoToolResolution[]) {
  return resolutionOptions.includes("720p") ? "720p" : resolutionOptions[0] || undefined;
}

function getModeConstraintOptions(
  modeConstraints: Partial<Record<VideoToolMode, VideoToolModeConstraint>> | undefined,
  mode: VideoToolMode | undefined,
  defaults: VideoToolDefaults
) {
  const constraint = mode ? modeConstraints?.[mode] : undefined;
  const ratioOptions = constraint?.ratioOptions?.length ? constraint.ratioOptions : [];
  const durationOptions = constraint?.durationOptions?.length ? constraint.durationOptions : [];
  const hasResolutionOptions = Array.isArray(constraint?.resolutionOptions);
  const resolutionOptions = hasResolutionOptions ? constraint?.resolutionOptions || [] : [];

  return {
    ratioOptions,
    durationOptions,
    resolutionOptions,
    hasResolutionOptions,
    defaults: {
      ...defaults,
      ...(constraint?.defaults || {}),
    } as VideoToolDefaults,
  };
}

function restrictModeConstraintResolutions(
  modeConstraints: Partial<Record<VideoToolMode, VideoToolModeConstraint>> | undefined,
  allowedResolutions: VideoToolResolution[]
) {
  if (!modeConstraints || allowedResolutions.length === 0) {
    return modeConstraints;
  }

  const allowedSet = new Set<VideoToolResolution>(allowedResolutions);
  return MODE_ORDER.reduce<Partial<Record<VideoToolMode, VideoToolModeConstraint>>>(
    (acc, mode) => {
      const current = modeConstraints[mode];
      if (!current) return acc;
      acc[mode] = {
        ...current,
        resolutionOptions: Array.isArray(current.resolutionOptions)
          ? current.resolutionOptions.filter((item) => allowedSet.has(item))
          : undefined,
      };
      return acc;
    },
    {}
  );
}

function applyConfiguredDurationOptions(
  capability: VideoToolCapabilityContract,
  configuredDurationOptions: number[]
) {
  if (configuredDurationOptions.length === 0) {
    return capability;
  }

  const nextModeConstraints = capability.modeConstraints
    ? MODE_ORDER.reduce<Partial<Record<VideoToolMode, VideoToolModeConstraint>>>((acc, mode) => {
        if (!capability.modeOptions.some((item) => item.mode === mode)) return acc;
        const current = capability.modeConstraints?.[mode];
        acc[mode] = {
          ...(current || {}),
          durationOptions: configuredDurationOptions,
          defaults: {
            ...(current?.defaults || {}),
            duration: pickPreferredDuration(configuredDurationOptions),
          },
        };
        return acc;
      }, {})
    : undefined;

  return {
    ...capability,
    durationOptions: configuredDurationOptions,
    modeConstraints: nextModeConstraints,
    defaults: {
      ...capability.defaults,
      duration: pickPreferredDuration(configuredDurationOptions),
    },
  };
}

export function getVideoToolOptionsForMode(
  capability: VideoToolCapabilityContract | null | undefined,
  mode?: VideoToolMode | null
) {
  if (!capability) {
    return {
      ratioOptions: [] as string[],
      durationOptions: [] as number[],
      resolutionOptions: [] as VideoToolResolution[],
      defaults: null as VideoToolDefaults | null,
    };
  }

  const fallbackMode =
    (mode && capability.modeOptions.some((item) => item.mode === mode) ? mode : undefined) ||
    capability.defaults.mode ||
    capability.modeOptions[0]?.mode;

  const scoped = getModeConstraintOptions(capability.modeConstraints, fallbackMode, capability.defaults);

  return {
    ratioOptions: scoped.ratioOptions.length ? scoped.ratioOptions : capability.ratioOptions,
    durationOptions: scoped.durationOptions.length
      ? scoped.durationOptions
      : capability.durationOptions,
    resolutionOptions: scoped.resolutionOptions.length
      ? scoped.resolutionOptions
      : scoped.hasResolutionOptions
        ? []
      : capability.resolutionOptions,
    defaults: scoped.defaults,
  };
}

export function buildVideoToolCapability(params: {
  providerType?: string | null;
  modelId?: string | null;
  rawCapabilities?: unknown;
  imageGenConfig?: { videoDurationOptions?: number[] | null } | null;
}): VideoToolCapabilityContract | null {
  const providerType = String(params.providerType || "").trim();
  if (!providerType) return null;
  const base = createProviderDefaultCapability(providerType, params.modelId);
  const configuredDurationOptions = getConfiguredVideoDurationOptions(params.imageGenConfig);

  if (providerType === "fal-video" || providerType === "qianwen-video" || providerType === "ruxa-video") {
    return applyConfiguredDurationOptions({
      ...base,
      modelId: params.modelId || undefined,
    }, configuredDurationOptions);
  }

  const parsed = normalizeVideoCapabilities(params.rawCapabilities);
  const hasModelCapability =
    Boolean(parsed.supportedModes?.length) ||
    Boolean(parsed.supportedRatios?.length) ||
    Boolean(parsed.supportedResolutions?.length) ||
    Boolean(parsed.durationRange) ||
    Boolean(
      parsed.constraints &&
        Object.values(parsed.constraints).some((constraint) => Boolean(constraint))
    );

  if (!hasModelCapability) {
    return applyConfiguredDurationOptions({
      ...base,
      modelId: params.modelId || undefined,
    }, configuredDurationOptions);
  }

  const supportedModes =
    parsed.supportedModes && parsed.supportedModes.length > 0
      ? parsed.supportedModes
      : parsed.constraints && Object.keys(parsed.constraints).length > 0
        ? MODE_ORDER.filter((mode) => Boolean(parsed.constraints?.[mode]))
      : base.modeOptions.map((item) => item.mode);

  const modeOptions = normalizeModeOptions(supportedModes, parsed.maxReferenceImages || 4);
  const ratioOptions =
    parsed.supportedRatios && parsed.supportedRatios.length > 0
      ? Array.from(new Set(parsed.supportedRatios))
      : base.ratioOptions;
  const resolutionOptions =
    parsed.supportedResolutions && parsed.supportedResolutions.length > 0
      ? parsed.supportedResolutions
      : base.resolutionOptions;
  const durationOptions = parsed.durationOptions?.length
    ? parsed.durationOptions
    : parsed.durationRange
      ? normalizeDurations(parsed.durationRange.min, parsed.durationRange.max)
      : base.durationOptions;
  const baseModeConstraints = base.modeConstraints || {};
  const nextModeConstraints =
    parsed.constraints && Object.keys(parsed.constraints).length > 0
      ? MODE_ORDER.reduce<Partial<Record<VideoToolMode, VideoToolModeConstraint>>>((acc, mode) => {
          const baseConstraint = baseModeConstraints[mode];
          const parsedConstraint = parsed.constraints?.[mode];
          if (!baseConstraint && !parsedConstraint) return acc;
          acc[mode] = {
            ratioOptions:
              parsedConstraint?.ratioOptions?.length
                ? parsedConstraint.ratioOptions
                : baseConstraint?.ratioOptions,
            durationOptions:
              parsedConstraint?.durationOptions?.length
                ? parsedConstraint.durationOptions
                : parsedConstraint
                  ? durationOptions
                  : baseConstraint?.durationOptions,
            resolutionOptions:
              parsedConstraint?.resolutionOptions?.length
                ? parsedConstraint.resolutionOptions
                : baseConstraint?.resolutionOptions,
            defaults: {
              ...(baseConstraint?.defaults || {}),
              ...(parsedConstraint?.defaults || {}),
            },
          };
          return acc;
        }, {})
      : base.modeConstraints;
  const restrictedModeConstraints = restrictModeConstraintResolutions(
    nextModeConstraints,
    parsed.supportedResolutions && parsed.supportedResolutions.length
      ? parsed.supportedResolutions
      : []
  );
  const defaultMode = pickPreferredMode(modeOptions, base.defaults.mode);
  const modeScopedDefaults = getModeConstraintOptions(
    restrictedModeConstraints,
    defaultMode,
    base.defaults
  );
  const effectiveRatioOptions = modeScopedDefaults.ratioOptions.length
    ? modeScopedDefaults.ratioOptions
    : ratioOptions;
  const effectiveDurationOptions = modeScopedDefaults.durationOptions.length
    ? modeScopedDefaults.durationOptions
    : durationOptions;
  const effectiveResolutionOptions = modeScopedDefaults.hasResolutionOptions
    ? modeScopedDefaults.resolutionOptions
    : resolutionOptions;

  return applyConfiguredDurationOptions({
    ...base,
    source: "model-capabilities",
    modelId: params.modelId || undefined,
    modeOptions,
    ratioOptions,
    resolutionOptions,
    durationOptions,
    modeConstraints: restrictedModeConstraints,
    ui: {
      ...base.ui,
      showReturnLastFrame:
        typeof parsed.supportReturnLastFrame === "boolean"
          ? parsed.supportReturnLastFrame
          : base.ui.showReturnLastFrame,
      showSeed:
        typeof parsed.supportSeed === "boolean" ? parsed.supportSeed : base.ui.showSeed,
    },
    defaults: {
      ...base.defaults,
      ...modeScopedDefaults.defaults,
      mode: defaultMode,
      ratio: pickPreferredRatio(effectiveRatioOptions),
      duration: pickPreferredDuration(effectiveDurationOptions),
      resolution: pickPreferredResolution(effectiveResolutionOptions),
    },
  }, configuredDurationOptions);
}
