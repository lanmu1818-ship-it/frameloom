// Modified for standalone community distribution; see NOTICE.
import { isInternalCapabilityModel } from "@/src/lib/ai/internal-capability-model";
import { inferKreaModelKind } from "@/src/lib/ai/krea-models";

const STATIC_VIDEO_PROVIDER_TYPES = new Set([
  "bltcy-video",
  "doubao-video",
  "volcano-video",
  "qianwen-video",
  "fal-video",
  "ruxa-video",
  "google-video",
  "openai-video",
  "grok-video",
  "kling-video",
  "bytedance-video",
  "omni-video",
]);

const STATIC_IMAGE_PROVIDER_TYPES = new Set([
  "gemini",
  "huanke-gemini",
  "alibaba-image",
  "bfl-image",
  "ruxa-image",
  "fal-image",
  "grsai-gpt-image",
  "openai-image",
  "stepfun-image",
  "98k-image",
  "grok-image",
  "midjourney",
  "volcano-vision",
]);

const RUNWAY_IMAGE_MODEL_IDS = new Set([
  "gen4_image",
  "gen4_image_turbo",
  "gemini_2.5_flash",
]);

const RUNWAY_VIDEO_MODEL_PREFIXES = [
  "gen4.5",
  "gen4_turbo",
  "gen4_aleph",
  "gen3a_turbo",
  "veo3.1_fast",
  "veo3.1",
  "veo3",
  "act_two",
  "upscale_v1",
];

const VIDEO_MODE_KEYS = new Set([
  "text-to-video",
  "first-frame",
  "first-last-frame",
  "reference-images",
]);

const MODEL_TYPE_KEYS = {
  image: "image-generation",
  video: "video-generation",
  multimodalChat: "multimodal-chat",
  chat: "chat",
  audio: "audio",
} as const;

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function hasVideoModes(capabilities: unknown) {
  if (!capabilities || typeof capabilities !== "object") return false;
  const supportedModes = (capabilities as { supportedModes?: unknown }).supportedModes;
  if (!Array.isArray(supportedModes)) return false;
  return supportedModes.some((mode) => VIDEO_MODE_KEYS.has(String(mode || "").trim()));
}

function asCapabilityRecord(capabilities: unknown) {
  return capabilities && typeof capabilities === "object"
    ? (capabilities as Record<string, unknown>)
    : null;
}

function getNestedRecord(
  value: unknown,
  key: string
): Record<string, unknown> | null {
  const record = asCapabilityRecord(value);
  return asCapabilityRecord(record?.[key]);
}

export function getModelTypeFromCapabilities(capabilities: unknown): string {
  const record = asCapabilityRecord(capabilities);
  const raw =
    String(
      record?.modelType ||
        record?.modelCategory ||
        record?.providerModelType ||
        ""
    )
      .trim()
      .toLowerCase();
  return raw;
}

export function getModelRequestKind(params: {
  capabilities?: unknown;
  defaultParams?: unknown;
}): string {
  const capabilityRequest = getNestedRecord(params.capabilities, "request");
  const defaultRequest = getNestedRecord(params.defaultParams, "request");
  return normalizeText(String(defaultRequest?.kind || capabilityRequest?.kind || ""));
}

export function isOpenAIChatModelDescriptor(params: {
  capabilities?: unknown;
  defaultParams?: unknown;
  imageGenConfig?: unknown;
  supportsImageGen?: boolean | null;
}): boolean {
  if (getModelRequestKind(params) === "openai-chat") {
    return true;
  }

  const modelType =
    getModelTypeFromCapabilities(params.capabilities) ||
    getModelTypeFromCapabilities(params.defaultParams) ||
    getModelTypeFromCapabilities(params.imageGenConfig);

  return (
    params.supportsImageGen !== true &&
    (modelType === MODEL_TYPE_KEYS.chat ||
      modelType === MODEL_TYPE_KEYS.multimodalChat)
  );
}

export function isAudioModelDescriptor(params: {
  providerType?: string | null;
  modelId?: string | null;
  capabilities?: unknown;
}): boolean {
  const modelType = getModelTypeFromCapabilities(params.capabilities);
  if (modelType === MODEL_TYPE_KEYS.audio) return true;

  const normalizedModelId = normalizeText(params.modelId);
  const normalizedProviderType = normalizeText(params.providerType);
  if (/\b(audio|speech|voice|tts|stt|transcription)\b/.test(normalizedModelId)) {
    return true;
  }
  return /\b(audio|speech|voice)\b/.test(normalizedProviderType);
}

export function inferRunwayModelKind(modelId?: string | null): "image" | "video" | null {
  const normalized = normalizeText(modelId);
  if (!normalized) return null;
  if (RUNWAY_IMAGE_MODEL_IDS.has(normalized)) return "image";
  if (RUNWAY_VIDEO_MODEL_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}_`))) {
    return "video";
  }
  return null;
}

export function isStaticVideoProviderType(providerType?: string | null): boolean {
  return STATIC_VIDEO_PROVIDER_TYPES.has(normalizeText(providerType));
}

export function isVideoModelDescriptor(params: {
  providerType?: string | null;
  modelId?: string | null;
  capabilities?: unknown;
  supportsImageGen?: boolean | null;
}): boolean {
  const providerType = normalizeText(params.providerType);
  const modelType = getModelTypeFromCapabilities(params.capabilities);

  if (modelType === MODEL_TYPE_KEYS.video) return true;
  if (modelType === MODEL_TYPE_KEYS.image || modelType === MODEL_TYPE_KEYS.audio) {
    return false;
  }

  if (isStaticVideoProviderType(providerType)) {
    return true;
  }

  if (hasVideoModes(params.capabilities)) {
    return true;
  }

  if (providerType === "runway") {
    return inferRunwayModelKind(params.modelId) === "video";
  }

  if (providerType === "krea") {
    return inferKreaModelKind(params.modelId) === "video";
  }

  return false;
}

export function isImageGenerationModelDescriptor(params: {
  providerType?: string | null;
  modelId?: string | null;
  capabilities?: unknown;
  supportsImageGen?: boolean | null;
}): boolean {
  if (isInternalCapabilityModel(params)) return false;
  const providerType = normalizeText(params.providerType);
  const modelType = getModelTypeFromCapabilities(params.capabilities);

  if (modelType === MODEL_TYPE_KEYS.image) return true;
  if (
    modelType === MODEL_TYPE_KEYS.video ||
    modelType === MODEL_TYPE_KEYS.audio ||
    modelType === MODEL_TYPE_KEYS.chat ||
    modelType === MODEL_TYPE_KEYS.multimodalChat
  ) {
    return false;
  }

  if (providerType === "runway") {
    const runwayModelKind = inferRunwayModelKind(params.modelId);
    if (runwayModelKind === "image") return true;
    if (runwayModelKind === "video") return false;
  }

  if (providerType === "krea") {
    const kreaModelKind = inferKreaModelKind(params.modelId);
    if (kreaModelKind === "image" || kreaModelKind === "image-enhance") return true;
    if (kreaModelKind === "video") return false;
  }

  if (isVideoModelDescriptor(params)) {
    return false;
  }

  if (params.supportsImageGen === true) {
    return true;
  }

  return STATIC_IMAGE_PROVIDER_TYPES.has(providerType);
}
