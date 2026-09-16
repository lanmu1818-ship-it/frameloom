// Modified for standalone community distribution; see NOTICE.
import type {
  VideoToolDefaults,
  VideoToolMode,
  VideoToolModeConstraint,
  VideoToolUiToggles,
} from "@/types/video-tool-capability";

type RunwayModeDefinition = VideoToolModeConstraint & {
  imageMin: number;
  imageMax: number;
  apiRatios: Record<string, string>;
  supportsAudio?: boolean;
  supportsSeed?: boolean;
};

type RunwayVideoModelDefinition = {
  defaults: VideoToolDefaults;
  ui: VideoToolUiToggles;
  modes: Partial<Record<VideoToolMode, RunwayModeDefinition>>;
};

const COMMON_IMAGE_TO_VIDEO_RATIOS = {
  "21:9": "1584:672",
  "16:9": "1280:720",
  "4:3": "1104:832",
  "1:1": "960:960",
  "3:4": "832:1104",
  "9:16": "720:1280",
} as const;

const PORTRAIT_LANDSCAPE_RATIOS = {
  "16:9": "1280:720",
  "9:16": "720:1280",
} as const;

const GEN3A_RATIOS = {
  "16:9": "1280:768",
  "9:16": "768:1280",
} as const;

const VEO_RATIOS = {
  "16:9": "1280:720",
  "9:16": "720:1280",
} as const;

const DURATIONS_2_TO_10 = Array.from({ length: 9 }, (_, index) => index + 2);
const DURATIONS_5_OR_10 = [5, 10];
const DURATIONS_4_6_8 = [4, 6, 8];

function buildModeDefinition(params: {
  imageMin: number;
  imageMax: number;
  ratioMap: Record<string, string>;
  durationOptions: number[];
  defaults?: Partial<VideoToolDefaults>;
  supportsAudio?: boolean;
  supportsSeed?: boolean;
}): RunwayModeDefinition {
  return {
    imageMin: params.imageMin,
    imageMax: params.imageMax,
    ratioOptions: Object.keys(params.ratioMap),
    durationOptions: [...params.durationOptions],
    resolutionOptions: [],
    defaults: params.defaults,
    apiRatios: { ...params.ratioMap },
    supportsAudio: params.supportsAudio,
    supportsSeed: params.supportsSeed,
  };
}

const RUNWAY_VIDEO_MODEL_DEFINITIONS: Array<[string, RunwayVideoModelDefinition]> = [
  [
    "gen4.5",
    {
      defaults: {
        mode: "text-to-video",
        ratio: "16:9",
        duration: 5,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: true,
      },
      modes: {
        "text-to-video": buildModeDefinition({
          imageMin: 0,
          imageMax: 0,
          ratioMap: PORTRAIT_LANDSCAPE_RATIOS,
          durationOptions: DURATIONS_2_TO_10,
          defaults: {
            ratio: "16:9",
            duration: 5,
          },
          supportsSeed: true,
        }),
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: COMMON_IMAGE_TO_VIDEO_RATIOS,
          durationOptions: DURATIONS_2_TO_10,
          defaults: {
            ratio: "16:9",
            duration: 5,
          },
          supportsSeed: true,
        }),
      },
    },
  ],
  [
    "gen4_turbo",
    {
      defaults: {
        mode: "first-frame",
        ratio: "16:9",
        duration: 5,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: true,
      },
      modes: {
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: COMMON_IMAGE_TO_VIDEO_RATIOS,
          durationOptions: DURATIONS_5_OR_10,
          defaults: {
            ratio: "16:9",
            duration: 5,
          },
          supportsSeed: true,
        }),
      },
    },
  ],
  [
    "gen3a_turbo",
    {
      defaults: {
        mode: "first-frame",
        ratio: "16:9",
        duration: 5,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: true,
      },
      modes: {
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: GEN3A_RATIOS,
          durationOptions: DURATIONS_5_OR_10,
          defaults: {
            ratio: "16:9",
            duration: 5,
          },
          supportsSeed: true,
        }),
        "first-last-frame": buildModeDefinition({
          imageMin: 2,
          imageMax: 2,
          ratioMap: GEN3A_RATIOS,
          durationOptions: DURATIONS_5_OR_10,
          defaults: {
            ratio: "16:9",
            duration: 5,
          },
          supportsSeed: true,
        }),
      },
    },
  ],
  [
    "veo3.1",
    {
      defaults: {
        mode: "text-to-video",
        ratio: "16:9",
        duration: 4,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: true,
        showReturnLastFrame: false,
        showSeed: false,
      },
      modes: {
        "text-to-video": buildModeDefinition({
          imageMin: 0,
          imageMax: 0,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
        "first-last-frame": buildModeDefinition({
          imageMin: 2,
          imageMax: 2,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
      },
    },
  ],
  [
    "veo3.1_fast",
    {
      defaults: {
        mode: "text-to-video",
        ratio: "16:9",
        duration: 4,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: true,
        showReturnLastFrame: false,
        showSeed: false,
      },
      modes: {
        "text-to-video": buildModeDefinition({
          imageMin: 0,
          imageMax: 0,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
        "first-last-frame": buildModeDefinition({
          imageMin: 2,
          imageMax: 2,
          ratioMap: VEO_RATIOS,
          durationOptions: DURATIONS_4_6_8,
          defaults: {
            ratio: "16:9",
            duration: 4,
            generateAudio: false,
          },
          supportsAudio: true,
          supportsSeed: false,
        }),
      },
    },
  ],
  [
    "veo3",
    {
      defaults: {
        mode: "text-to-video",
        ratio: "16:9",
        duration: 8,
        generateAudio: false,
        fps: 24,
      },
      ui: {
        showResolution: false,
        showFps: false,
        showCameraMove: false,
        showGenerateAudio: false,
        showReturnLastFrame: false,
        showSeed: false,
      },
      modes: {
        "text-to-video": buildModeDefinition({
          imageMin: 0,
          imageMax: 0,
          ratioMap: VEO_RATIOS,
          durationOptions: [8],
          defaults: {
            ratio: "16:9",
            duration: 8,
          },
          supportsSeed: false,
        }),
        "first-frame": buildModeDefinition({
          imageMin: 1,
          imageMax: 1,
          ratioMap: VEO_RATIOS,
          durationOptions: [8],
          defaults: {
            ratio: "16:9",
            duration: 8,
          },
          supportsSeed: false,
        }),
      },
    },
  ],
];

function normalizeModelId(modelId?: string | null) {
  return String(modelId || "").trim().toLowerCase();
}

export function getRunwayVideoModelDefinition(modelId?: string | null) {
  const normalizedModelId = normalizeModelId(modelId);
  if (!normalizedModelId) return null;

  for (const [key, definition] of RUNWAY_VIDEO_MODEL_DEFINITIONS) {
    if (
      normalizedModelId === key ||
      normalizedModelId.startsWith(`${key}_`) ||
      normalizedModelId.startsWith(`${key}:`) ||
      normalizedModelId.startsWith(`${key}-`)
    ) {
      return definition;
    }
  }

  return null;
}

export function getRunwayVideoModeDefinition(
  modelId?: string | null,
  mode?: VideoToolMode | null
) {
  const definition = getRunwayVideoModelDefinition(modelId);
  if (!definition) return null;

  const availableModes = Object.entries(definition.modes).filter(
    (entry): entry is [VideoToolMode, RunwayModeDefinition] => Boolean(entry[1])
  );
  if (availableModes.length === 0) return null;

  if (mode && definition.modes[mode]) {
    return {
      mode,
      definition: definition.modes[mode]!,
      model: definition,
    };
  }

  const fallbackMode = definition.defaults.mode;
  if (definition.modes[fallbackMode]) {
    return {
      mode: fallbackMode,
      definition: definition.modes[fallbackMode]!,
      model: definition,
    };
  }

  const [firstMode, firstDefinition] = availableModes[0];
  return {
    mode: firstMode,
    definition: firstDefinition,
    model: definition,
  };
}

export function resolveRunwayApiRatio(params: {
  modelId?: string | null;
  mode?: VideoToolMode | null;
  ratio?: string | null;
}) {
  const resolved = getRunwayVideoModeDefinition(params.modelId, params.mode);
  if (!resolved) {
    return params.ratio ? String(params.ratio).trim() : "1280:720";
  }

  const normalizedRatio = String(params.ratio || "").trim();
  if (normalizedRatio && resolved.definition.apiRatios[normalizedRatio]) {
    return resolved.definition.apiRatios[normalizedRatio];
  }

  const fallbackRatio =
    resolved.definition.defaults?.ratio ||
    resolved.model.defaults.ratio ||
    Object.keys(resolved.definition.apiRatios)[0] ||
    "16:9";

  return resolved.definition.apiRatios[fallbackRatio] || "1280:720";
}

export function normalizeRunwayDuration(params: {
  modelId?: string | null;
  mode?: VideoToolMode | null;
  duration?: number | null;
}) {
  const resolved = getRunwayVideoModeDefinition(params.modelId, params.mode);
  const allowedDurations = resolved?.definition.durationOptions || [5];
  const fallbackDuration =
    Number(resolved?.definition.defaults?.duration) ||
    Number(resolved?.model.defaults.duration) ||
    allowedDurations[0] ||
    5;

  if (!Number.isFinite(params.duration)) {
    return fallbackDuration;
  }

  const normalizedDuration = Math.round(Number(params.duration));
  if (allowedDurations.includes(normalizedDuration)) {
    return normalizedDuration;
  }

  return allowedDurations.reduce((closest, current) => {
    return Math.abs(current - normalizedDuration) < Math.abs(closest - normalizedDuration)
      ? current
      : closest;
  }, fallbackDuration);
}

export function isRunwayAudioSupported(modelId?: string | null, mode?: VideoToolMode | null) {
  const resolved = getRunwayVideoModeDefinition(modelId, mode);
  return Boolean(resolved?.definition.supportsAudio);
}

export function isRunwaySeedSupported(modelId?: string | null, mode?: VideoToolMode | null) {
  const resolved = getRunwayVideoModeDefinition(modelId, mode);
  return Boolean(resolved?.definition.supportsSeed);
}
