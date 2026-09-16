// Modified for standalone community distribution; see NOTICE.
export type VideoToolMode =
  | "text-to-video"
  | "first-frame"
  | "first-last-frame"
  | "reference-images";

export type VideoToolResolution = "480p" | "720p" | "1080p";

export interface VideoToolModeOption {
  mode: VideoToolMode;
  label: string;
  imageMin: number;
  imageMax: number;
}

export interface VideoToolUiToggles {
  showResolution: boolean;
  showFps: boolean;
  showCameraMove: boolean;
  showGenerateAudio: boolean;
  showReturnLastFrame: boolean;
  showSeed: boolean;
}

export interface VideoToolDefaults {
  mode: VideoToolMode;
  ratio: string;
  duration: number;
  resolution?: VideoToolResolution;
  generateAudio?: boolean;
  fps?: number;
}

export interface VideoToolModeConstraint {
  ratioOptions?: string[];
  durationOptions?: number[];
  resolutionOptions?: VideoToolResolution[];
  defaults?: Partial<VideoToolDefaults>;
}

export interface VideoToolCapabilityContract {
  schemaVersion: "v1";
  source: "provider-default" | "model-capabilities";
  providerType: string;
  modelId?: string;
  modeOptions: VideoToolModeOption[];
  ratioOptions: string[];
  durationOptions: number[];
  resolutionOptions: VideoToolResolution[];
  modeConstraints?: Partial<Record<VideoToolMode, VideoToolModeConstraint>>;
  ui: VideoToolUiToggles;
  defaults: VideoToolDefaults;
}
