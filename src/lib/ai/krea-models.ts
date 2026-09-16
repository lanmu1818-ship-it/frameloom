// Modified for standalone community distribution; see NOTICE.
import {
  recommendedVideoDurationOptions,
  recommendedVideoDurationReferenceCosts,
  recommendedVideoResolutionBaseCosts,
} from "@/src/lib/ai/video-model-config";

export type KreaModelKind = "image" | "image-enhance" | "video";

export interface KreaModelPreset {
  modelId: string;
  displayName: string;
  description: string;
  kind: KreaModelKind;
  supportsVision: boolean;
  supportsImageGen: boolean;
  requestFields: string[];
  requiredFields: string[];
  capabilities?: Record<string, any>;
  defaultParams: Record<string, any>;
  imageGenConfig?: Record<string, any>;
  sortOrder: number;
}

const KREA_OPENAPI_URL = "https://api.krea.ai/openapi.json";

const REFERENCE_INPUT_FIELDS = new Set([
  "imageUrl",
  "imageUrls",
  "image_url",
  "image_urls",
  "styleImages",
  "style_images",
  "imageStyleRefs",
  "image_style_references",
  "characterReferenceImages",
  "character_reference_images",
  "backgroundImage",
  "referenceImages",
  "reference_images",
  "startImage",
  "endImage",
  "init_image_url",
  "references",
  "subjects",
  "styleReferences",
  "style_references",
  "elementReferences",
  "element_references",
  "videoReference",
  "video_reference",
  "startVideo",
  "init_video",
  "referenceVideos",
  "reference_videos",
  "referenceAudios",
  "reference_audios",
]);

function hasReferenceInput(fields: string[]) {
  return fields.some((field) => REFERENCE_INPUT_FIELDS.has(field));
}

function createDefaultParams(
  kind: KreaModelKind,
  modelId: string,
  requestFields: string[],
  requiredFields: string[]
) {
  return {
    provider: "krea",
    kind,
    endpoint: modelId,
    requestFields,
    requiredFields,
    officialApi: KREA_OPENAPI_URL,
  };
}

function createImageConfig(fields: string[]) {
  return {
    // Krea removed batch generation; one request now produces one output.
    maxImages: 1,
    supportsSize: fields.includes("width") && fields.includes("height"),
    supports1K: true,
    supports2K: true,
    supports4K: fields.includes("resolution") || fields.includes("width"),
    supportsPromptExtend:
      fields.includes("skipPromptExpansion") ||
      fields.includes("skip_prompt_expansion"),
    supportsNegativePrompt: fields.includes("negative_prompt"),
    supportsWatermark: false,
    supportsSeed: fields.includes("seed"),
    creditCostPerImage: 0,
    enableLoadingPlaceholder: true,
    loadingColor: "blue",
  };
}

function createVideoDurationOptions(modelId: string) {
  if (modelId.includes("/bytedance/seedance-2")) {
    return Array.from({ length: 12 }, (_, index) => index + 4);
  }
  if (modelId.includes("/minimax/hailuo-02") || modelId.includes("/minimax/hailuo-2.3")) {
    return [6, 10];
  }
  if (modelId.includes("/google/veo")) {
    return [4, 8];
  }
  if (modelId.includes("/openai/sora-2")) {
    return [4, 8, 12, 20];
  }
  return [5, 10];
}

function createVideoCapabilities(modelId: string, fields: string[]) {
  const supportedModes = new Set<string>();
  if (fields.includes("prompt")) supportedModes.add("text-to-video");
  if (
    fields.includes("startImage") ||
    fields.includes("image_url") ||
    fields.includes("init_image_url")
  ) {
    supportedModes.add("first-frame");
  }
  if (fields.includes("endImage")) supportedModes.add("first-last-frame");
  if (
    fields.includes("referenceImages") ||
    fields.includes("styleReferences") ||
    fields.includes("elementReferences") ||
    fields.includes("subjects") ||
    fields.includes("references")
  ) {
    supportedModes.add("reference-images");
  }
  if (supportedModes.size === 0) supportedModes.add("text-to-video");

  const durationOptions = fields.includes("duration") ? createVideoDurationOptions(modelId) : [5];
  const resolutionOptions = fields.includes("resolution")
    ? modelId.includes("/bytedance/seedance-2")
      ? ["480p", "720p"]
      : (modelId.includes("/minimax/") ? ["720p", "1080p"] : ["480p", "720p", "1080p"])
    : ["720p"];
  const ratioOptions = modelId.includes("/bytedance/seedance-2")
    ? ["16:9", "9:16"]
    : ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

  return {
    supportedModes: Array.from(supportedModes),
    supportedResolutions: resolutionOptions,
    supportedRatios: ratioOptions,
    durationRange: {
      min: Math.min(...durationOptions),
      max: Math.max(...durationOptions),
    },
    durationOptions,
    supportWatermark: false,
    supportCameraFixed: fields.includes("cameraControl"),
    supportSeed: fields.includes("seed"),
    supportReturnLastFrame: fields.includes("endImage"),
    maxReferenceImages: fields.includes("referenceImages")
      ? modelId.includes("/seedance-2")
        ? 9
        : 4
      : fields.includes("styleReferences") || fields.includes("elementReferences")
        ? 3
        : undefined,
  };
}

function imagePreset(
  sortOrder: number,
  modelId: string,
  displayName: string,
  fields: string[],
  requiredFields: string[]
): KreaModelPreset {
  return {
    modelId,
    displayName,
    description: `Krea official image endpoint: ${modelId}`,
    kind: "image",
    supportsVision: hasReferenceInput(fields),
    supportsImageGen: true,
    requestFields: fields,
    requiredFields,
    imageGenConfig: createImageConfig(fields),
    defaultParams: createDefaultParams("image", modelId, fields, requiredFields),
    sortOrder,
  };
}

function enhancePreset(
  sortOrder: number,
  modelId: string,
  displayName: string,
  fields: string[],
  requiredFields: string[]
): KreaModelPreset {
  return {
    modelId,
    displayName,
    description: `Krea official image enhance endpoint: ${modelId}`,
    kind: "image-enhance",
    supportsVision: true,
    supportsImageGen: true,
    requestFields: fields,
    requiredFields,
    imageGenConfig: createImageConfig(fields),
    defaultParams: createDefaultParams("image-enhance", modelId, fields, requiredFields),
    sortOrder,
  };
}

function videoPreset(
  sortOrder: number,
  modelId: string,
  displayName: string,
  fields: string[],
  requiredFields: string[]
): KreaModelPreset {
  const durationOptions = fields.includes("duration") ? createVideoDurationOptions(modelId) : [];
  return {
    modelId,
    displayName,
    description: `Krea official video endpoint: ${modelId}`,
    kind: "video",
    supportsVision: hasReferenceInput(fields),
    supportsImageGen: false,
    requestFields: fields,
    requiredFields,
    capabilities: createVideoCapabilities(modelId, fields),
    defaultParams: createDefaultParams("video", modelId, fields, requiredFields),
    imageGenConfig: {
      creditCostPerVideo: recommendedVideoResolutionBaseCosts["480p"],
      videoDurationOptions:
        durationOptions.length > 0
          ? durationOptions
          : [...recommendedVideoDurationOptions],
      creditCostPerVideoByDuration: recommendedVideoDurationReferenceCosts,
      creditCostPerVideoByResolution: recommendedVideoResolutionBaseCosts,
      enableLoadingPlaceholder: true,
      loadingColor: "blue",
    },
    sortOrder,
  };
}

export const KREA_MODEL_PRESETS: KreaModelPreset[] = [
  imagePreset(10, "/generate/image/krea/krea-2/medium", "Krea 2 Medium", ["prompt", "seed", "styles", "image_style_references", "aspect_ratio", "resolution", "creativity", "moodboards"], ["prompt", "aspect_ratio", "resolution"]),
  imagePreset(20, "/generate/image/krea/krea-2/large", "Krea 2 Large", ["prompt", "seed", "styles", "image_style_references", "aspect_ratio", "resolution", "creativity", "moodboards"], ["prompt", "aspect_ratio", "resolution"]),
  imagePreset(30, "/generate/image/bfl/flux-1-dev", "Flux", ["prompt", "seed", "steps", "width", "height", "image_url", "styles", "strength", "guidance_scale", "style_images", "image_style_references"], ["prompt"]),
  imagePreset(40, "/generate/image/bfl/flux-1-kontext-dev", "Flux Kontext", ["prompt", "seed", "steps", "width", "height", "image_url", "strength", "guidance_scale", "style_images"], ["prompt"]),
  imagePreset(50, "/generate/image/google/nano-banana-pro", "Nano Banana Pro", ["prompt", "width", "height", "image_urls", "aspect_ratio", "resolution", "style_images"], ["prompt"]),
  imagePreset(60, "/generate/image/google/nano-banana-2", "Nano Banana 2", ["prompt", "width", "height", "image_urls", "aspect_ratio", "resolution", "style_images"], ["prompt"]),
  imagePreset(70, "/generate/image/google/nano-banana", "Nano Banana", ["prompt", "width", "height", "image_urls", "aspect_ratio", "style_images"], ["prompt"]),
  imagePreset(80, "/generate/image/bfl/flux-1.1-pro", "Flux 1.1 Pro", ["prompt", "width", "height", "seed"], ["prompt", "width", "height"]),
  imagePreset(90, "/generate/image/bfl/flux-1.1-pro-ultra", "Flux 1.1 Pro Ultra", ["prompt", "width", "height", "seed", "raw"], ["prompt"]),
  imagePreset(100, "/generate/image/ideogram/ideogram-2-turbo", "Ideogram 2.0A Turbo", ["prompt", "width", "height", "seed"], ["prompt"]),
  imagePreset(110, "/generate/image/ideogram/ideogram-3", "Ideogram 3.0", ["prompt", "width", "height", "seed", "character_reference_images", "style_images"], ["prompt"]),
  imagePreset(120, "/generate/image/google/imagen-3", "Imagen 3", ["prompt", "width", "height", "seed"], ["prompt"]),
  imagePreset(130, "/generate/image/google/imagen-4", "Imagen 4", ["prompt", "width", "height", "seed"], ["prompt"]),
  imagePreset(140, "/generate/image/google/imagen-4-fast", "Imagen 4 Fast", ["prompt", "width", "height", "seed"], ["prompt"]),
  imagePreset(150, "/generate/image/google/imagen-4-ultra", "Imagen 4 Ultra", ["prompt", "width", "height", "seed"], ["prompt"]),
  imagePreset(160, "/generate/image/runway/gen-4-image", "Runway Gen-4", ["prompt", "width", "height", "seed", "reference_images"], ["prompt", "reference_images"]),
  imagePreset(170, "/generate/image/openai/gpt-image", "ChatGPT Image", ["prompt", "width", "height", "quality", "image_urls", "styles", "style_images"], ["prompt"]),
  imagePreset(180, "/generate/image/openai/gpt-image-2", "ChatGPT Image 2", ["prompt", "quality", "image_urls", "width", "height", "aspect_ratio", "resolution", "style_images"], ["prompt"]),
  imagePreset(190, "/generate/image/luma/uni-1", "Luma Uni 1", ["prompt", "width", "height", "mode", "style", "output_format", "web_search", "style_images"], ["prompt"]),
  imagePreset(200, "/generate/image/bytedance/seedream-4", "Seedream 4", ["prompt", "width", "height", "seed", "style_images"], ["prompt", "width", "height"]),
  imagePreset(210, "/generate/image/bytedance/seedream-5-lite", "Seedream 5 Lite", ["prompt", "width", "height", "seed", "style_images"], ["prompt", "width", "height"]),
  imagePreset(220, "/generate/image/qwen/2512", "Qwen 2512", ["prompt", "negative_prompt", "width", "height", "num_inference_steps", "cfg_scale", "seed", "skip_prompt_expansion", "styles"], ["prompt"]),
  imagePreset(230, "/generate/image/z-image/z-image", "Z Image", ["prompt", "seed", "denoising_strength", "styles", "skip_prompt_expansion", "aspect_ratio", "resolution", "image_url", "style_images"], ["prompt", "aspect_ratio", "resolution"]),
  imagePreset(240, "/generate/image/bytedance/seededit", "SeedEdit", ["prompt", "seed", "image_url"], ["prompt", "image_url"]),
  enhancePreset(250, "/generate/enhance/topaz/generative-enhance", "Topaz Generative", ["prompt", "width", "height", "seed", "image_url", "model", "output_format", "subject_detection", "face_enhancement", "face_enhancement_creativity", "face_enhancement_strength", "crop_to_fill", "upscaling_activated", "image_scaling_factor", "creativity", "texture", "sharpen", "denoise", "detail"], ["width", "height", "image_url"]),
  enhancePreset(260, "/generate/enhance/topaz/standard-enhance", "Topaz", ["prompt", "width", "height", "seed", "image_url", "model", "output_format", "subject_detection", "face_enhancement", "face_enhancement_creativity", "face_enhancement_strength", "crop_to_fill", "upscaling_activated", "image_scaling_factor", "sharpen", "denoise", "fix_compression", "strength"], ["width", "height", "image_url", "model"]),
  enhancePreset(270, "/generate/enhance/topaz/bloom-enhance", "Topaz Bloom", ["prompt", "width", "height", "seed", "image_url", "output_format", "crop_to_fill", "creativity", "face_preservation", "color_preservation", "upscaling_activated", "image_scaling_factor"], ["width", "height", "image_url"]),
  videoPreset(280, "/generate/video/kling/kling-1", "Kling 1.0", ["startImage", "prompt", "aspectRatio", "duration", "cameraControl", "endImage", "mode"], ["prompt"]),
  videoPreset(290, "/generate/video/kling/kling-1.5", "Kling 1.5", ["startImage", "prompt", "aspectRatio", "duration", "cameraControl", "endImage"], ["prompt"]),
  videoPreset(300, "/generate/video/kling/kling-1.6", "Kling 1.6", ["startImage", "prompt", "aspectRatio", "duration", "cameraControl", "endImage", "mode"], ["prompt"]),
  videoPreset(310, "/generate/video/kling/kling-2", "Kling 2.0", ["startImage", "prompt", "aspectRatio", "endImage", "mode"], ["prompt"]),
  videoPreset(320, "/generate/video/kling/kling-2.1", "Kling 2.1", ["startImage", "prompt", "aspectRatio", "duration", "endImage", "mode"], ["prompt"]),
  videoPreset(330, "/generate/video/kling/kling-2.5", "Kling 2.5", ["startImage", "prompt", "aspectRatio", "duration", "endImage"], ["prompt"]),
  videoPreset(340, "/generate/video/kling/kling-2.6", "Kling 2.6", ["startImage", "prompt", "aspectRatio", "duration", "endImage", "generateAudio"], ["prompt"]),
  videoPreset(350, "/generate/video/kling/kling-o1", "Kling o1", ["startImage", "prompt", "aspectRatio", "duration", "endImage", "styleReferences", "elementReferences", "videoReference"], ["prompt"]),
  videoPreset(360, "/generate/video/minimax/hailuo", "Hailuo", ["startImage", "prompt", "expandPrompt", "cameraControl", "model", "subjects"], ["prompt"]),
  videoPreset(370, "/generate/video/minimax/hailuo-02", "Hailuo 02", ["startImage", "prompt", "expandPrompt", "endImage", "resolution", "duration"], ["prompt"]),
  videoPreset(380, "/generate/video/minimax/hailuo-2.3", "Hailuo 2.3", ["startImage", "prompt", "expandPrompt", "endImage", "resolution", "duration"], ["prompt"]),
  videoPreset(390, "/generate/video/minimax/hailuo-2.3-fast", "Hailuo 2.3 Fast", ["startImage", "prompt", "expandPrompt", "endImage", "resolution", "duration"], ["prompt"]),
  videoPreset(400, "/generate/video/alibaba/wan-2.1", "Wan 2.1", ["startImage", "prompt", "width", "height", "endImage", "aspectRatio", "frame_num", "styles"], ["prompt", "width", "height"]),
  videoPreset(410, "/generate/video/alibaba/wan-2.2", "Wan 2.2", ["startImage", "guide_scale", "prompt", "width", "height", "aspectRatio", "frame_num", "styles"], ["prompt", "width", "height"]),
  videoPreset(420, "/generate/video/alibaba/wan-2.5", "Wan 2.5", ["startImage", "prompt", "aspectRatio", "resolution", "enablePromptExpansion", "duration", "seed", "audio_url", "generateAudio"], ["prompt"]),
  videoPreset(430, "/generate/video/google/veo-2", "Veo 2", ["startImage", "prompt", "aspectRatio", "duration", "image_url"], ["prompt"]),
  videoPreset(440, "/generate/video/google/veo-3", "Veo 3", ["startImage", "prompt", "aspectRatio", "duration", "generateAudio", "resolution"], ["prompt"]),
  videoPreset(450, "/generate/video/google/veo-3-fast", "Veo 3 Fast", ["startImage", "prompt", "aspectRatio", "duration", "generateAudio", "resolution"], ["prompt"]),
  videoPreset(460, "/generate/video/google/veo-3.1", "Veo 3.1", ["startImage", "prompt", "aspectRatio", "duration", "generateAudio", "resolution", "endImage", "referenceImages"], ["prompt"]),
  videoPreset(470, "/generate/video/google/veo-3.1-fast", "Veo 3.1 Fast", ["startImage", "prompt", "aspectRatio", "duration", "generateAudio", "resolution", "endImage", "referenceImages"], ["prompt"]),
  videoPreset(480, "/generate/video/google/veo-3.1-lite", "Veo 3.1 Lite", ["startImage", "prompt", "aspectRatio", "duration", "resolution", "endImage"], ["prompt"]),
  videoPreset(490, "/generate/video/bytedance/seedance-1.0-lite", "Seedance Lite", ["startImage", "prompt", "aspectRatio", "endImage", "referenceImages", "duration", "resolution"], ["prompt"]),
  videoPreset(500, "/generate/video/bytedance/seedance-1.0-pro", "Seedance Pro", ["startImage", "prompt", "aspectRatio", "endImage", "referenceImages", "duration", "resolution"], ["prompt"]),
  videoPreset(510, "/generate/video/bytedance/seedance-1.0-pro-fast", "Seedance Pro Fast", ["startImage", "prompt", "aspectRatio", "duration", "resolution"], ["prompt"]),
  videoPreset(520, "/generate/video/bytedance/seedance-2", "Seedance 2.0", ["startImage", "prompt", "aspectRatio", "endImage", "referenceImages", "referenceVideos", "referenceAudios", "duration", "generateAudio", "resolution", "seed"], ["prompt"]),
  videoPreset(530, "/generate/video/bytedance/seedance-2-fast", "Seedance 2.0 Fast", ["startImage", "prompt", "aspectRatio", "endImage", "referenceImages", "referenceVideos", "referenceAudios", "duration", "generateAudio", "resolution", "seed"], ["prompt"]),
  videoPreset(540, "/generate/video/openai/sora-2", "Sora 2", ["startImage", "prompt", "duration", "aspectRatio"], ["prompt"]),
  videoPreset(550, "/generate/video/luma/ray-2", "Ray 2", ["startImage", "prompt", "aspectRatio", "loop", "width", "height"], ["prompt", "width", "height"]),
  videoPreset(560, "/generate/video/runway/gen-3", "Runway Gen-3", ["startImage", "prompt", "aspectRatio", "duration", "seed"], ["prompt"]),
  videoPreset(570, "/generate/video/runway/gen-4-video", "Runway Gen-4", ["startImage", "prompt", "aspectRatio", "duration", "seed"], ["prompt"]),
  videoPreset(580, "/generate/video/runway/gen-4.5", "Runway Gen-4.5", ["startImage", "prompt", "aspectRatio", "duration", "seed"], ["prompt"]),
  videoPreset(590, "/generate/video/runway/aleph", "Runway Aleph", ["startImage", "startVideo", "startVideoTrim", "endVideoTrim", "prompt", "init_video", "init_image_url", "references", "ratio", "seed", "contentModeration"], ["prompt", "init_video"]),
];

export function getKreaModelPresetById(modelId: string) {
  const normalized = String(modelId || "").trim();
  return KREA_MODEL_PRESETS.find((preset) => preset.modelId === normalized);
}

export function inferKreaModelKind(modelId?: string | null): KreaModelKind | null {
  const normalized = String(modelId || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("/generate/video/") || normalized.includes("/generate/video/")) {
    return "video";
  }
  if (normalized.startsWith("/generate/enhance/") || normalized.includes("/generate/enhance/")) {
    return "image-enhance";
  }
  if (normalized.startsWith("/generate/image/") || normalized.includes("/generate/image/")) {
    return "image";
  }
  return null;
}
