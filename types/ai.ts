// Modified for standalone community distribution; see NOTICE.
/**
 * 火山引擎视频生成相关类型定义
 */

// 视频生成模式
export type VideoGenerationMode =
  | "text-to-video" // 文生视频
  | "first-frame" // 图生视频-首帧
  | "first-last-frame" // 图生视频-首尾帧
  | "reference-images"; // 图生视频-参考图

// 视频分辨率
export type VideoResolution = "480p" | "720p" | "1080p";

// 视频宽高比
export type VideoRatio =
  | "16:9"
  | "4:3"
  | "1:1"
  | "3:4"
  | "9:16"
  | "21:9"
  | "adaptive";

// 模型能力配置
export interface VideoModelCapabilities {
  modelId: string;
  modelName: string;
  supportedModes: VideoGenerationMode[];
  supportedResolutions: VideoResolution[];
  supportedRatios: VideoRatio[];
  durationRange: { min: number; max: number }; // 时长范围（秒）
  durationOptions?: number[]; // 可选的离散时长（优先于区间）
  supportWatermark: boolean;
  supportCameraFixed: boolean;
  supportSeed: boolean;
  supportReturnLastFrame: boolean;
  maxReferenceImages?: number; // 参考图模式最多支持几张图
  rpmLimit?: number; // RPM限制
  concurrencyLimit?: number; // 并发限制
  recommendedFor?: string[]; // 推荐使用场景
  constraints?: Record<string, any>; // 特殊约束（如：参考图不支持1080p）
}

// 运镜模式类型（用于转换为自然语言提示词）
// 运镜模式类型（与官方一致）
export type CameraMove =
  | "none"           // 智能运镜
  | "static"         // 固定镜头
  | "hitchcock-push" // 希区柯克推进
  | "hitchcock-pull" // 希区柯克拉远
  | "mechanical-arm" // 机械臂
  | "dynamic-orbit"  // 动感环绕
  | "center-orbit"   // 中心环绕
  | "crane"          // 起重机
  | "super-pull"     // 超级拉远
  | "ccw-rotate"     // 逆时针回旋
  | "cw-rotate"      // 顺时针回旋
  | "handheld"       // 手持运镜
  | "fast-push-pull"; // 快速推拉

// 视频生成选项
export interface VideoGenerationOptions {
  prompt: string;
  model: string;
  mode: VideoGenerationMode; // 生成模式

  // 图片输入（可选）
  firstFrameImage?: string; // 首帧图片 URL/Base64
  lastFrameImage?: string; // 尾帧图片 URL/Base64
  referenceImages?: string[]; // 参考图数组（1-4张）

  // 视频参数
  resolution?: VideoResolution;
  ratio?: VideoRatio;
  duration?: number; // 按模型能力或管理员配置的秒数档位
  fps?: number; // 帧率（默认 24）
  watermark?: boolean; // 是否包含水印
  cameraFixed?: boolean; // 是否固定摄像头
  cameraMove?: CameraMove; // 🆕 运镜模式（转换为自然语言提示词）
  seed?: number; // 随机种子
  returnLastFrame?: boolean; // 是否返回尾帧
}

// 视频生成结果
export interface VideoGenerationResult {
  taskId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  videoUrl?: string;
  lastFrameUrl?: string; // 尾帧 URL（用于连续生成）
  error?: {
    code: string;
    message: string;
  };
  usage?: {
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: number;
  updatedAt: number;
}

// 视频元数据（存储在数据库中）
export interface VideoMetadata {
  taskId?: string;
  duration?: number;
  resolution?: string;
  ratio?: string;
  fileSize?: number;
  s3Key?: string;
  // 输入图片的永久URL（已上传到S3）
  inputImages?: {
    firstFrame?: string; // 首帧图片S3 URL
    lastFrame?: string; // 尾帧图片S3 URL
    references?: string[]; // 参考图数组S3 URL
  };
}

// 视频存储状态
export type VideoStorageStatus = "temporary" | "archiving" | "archived" | "failed";

// 火山引擎视频模型预设配置
export const VOLCANO_VIDEO_MODEL_PRESETS: VideoModelCapabilities[] = [
  {
    modelId: "doubao-seedance-1-0-pro-250528",
    modelName: "豆包 Seedance Pro 250528 (全功能版)",
    supportedModes: ["text-to-video", "first-frame", "first-last-frame"],
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    durationRange: { min: 2, max: 12 },
    supportWatermark: true,
    supportCameraFixed: true,
    supportSeed: true,
    supportReturnLastFrame: true,
    rpmLimit: 600,
    concurrencyLimit: 10,
    recommendedFor: ["高质量视频", "首尾帧过渡", "专业创作"],
  },
  {
    modelId: "doubao-seedance-1-0-pro-fast-251015",
    modelName: "豆包 Seedance Pro Fast 251015 (快速模式)",
    supportedModes: ["text-to-video", "first-frame"],
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    durationRange: { min: 2, max: 12 },
    supportWatermark: true,
    supportCameraFixed: false,
    supportSeed: false,
    supportReturnLastFrame: true,
    rpmLimit: 600,
    concurrencyLimit: 10,
    recommendedFor: ["快速生成", "批量创作", "内容预览"],
  },
  {
    modelId: "doubao-seedance-1-0-lite-t2v-250428",
    modelName: "豆包 Seedance Lite T2V 250428 (文生视频轻量版)",
    supportedModes: ["text-to-video"],
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    durationRange: { min: 2, max: 12 },
    supportWatermark: true,
    supportCameraFixed: true,
    supportSeed: true,
    supportReturnLastFrame: false,
    rpmLimit: 300,
    concurrencyLimit: 5,
    recommendedFor: ["轻量级应用", "文本转视频", "成本控制"],
  },
  {
    modelId: "doubao-seedance-1-0-lite-i2v-250428",
    modelName: "豆包 Seedance Lite I2V 250428 (图生视频轻量版)",
    supportedModes: ["first-frame", "first-last-frame", "reference-images"],
    supportedResolutions: ["480p", "720p"],
    supportedRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"],
    durationRange: { min: 2, max: 12 },
    supportWatermark: true,
    supportCameraFixed: true,
    supportSeed: true,
    supportReturnLastFrame: false,
    maxReferenceImages: 4,
    rpmLimit: 300,
    concurrencyLimit: 5,
    recommendedFor: ["参考图融合", "图片动态化", "多元素组合"],
    // 特殊约束
    constraints: {
      "reference-images": {
        supportedResolutions: ["480p", "720p"], // 参考图不支持 1080p
        supportCameraFixed: false, // 参考图不支持固定摄像头
        supportedRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"], // 不支持 adaptive
      },
    },
  },
];

// 默认视频参数配置
export const DEFAULT_VIDEO_PARAMS: Partial<VideoGenerationOptions> = {
  resolution: "720p",
  ratio: "16:9",
  duration: 5,
  watermark: true,
  cameraFixed: false,
  fps: 24,
};

// 快速预设模板
export const VIDEO_PRESETS = {
  "short-video": {
    name: "短视频 (抖音/快手)",
    params: {
      resolution: "1080p" as VideoResolution,
      ratio: "9:16" as VideoRatio,
      duration: 5,
      watermark: false,
    },
  },
  "hd-landscape": {
    name: "横屏高清 (B站/YouTube)",
    params: {
      resolution: "1080p" as VideoResolution,
      ratio: "16:9" as VideoRatio,
      duration: 8,
      watermark: false,
    },
  },
  "square-social": {
    name: "方形社交媒体",
    params: {
      resolution: "720p" as VideoResolution,
      ratio: "1:1" as VideoRatio,
      duration: 6,
      watermark: false,
    },
  },
  cinema: {
    name: "电影宽屏",
    params: {
      resolution: "1080p" as VideoResolution,
      ratio: "21:9" as VideoRatio,
      duration: 10,
      watermark: false,
      cameraFixed: true,
    },
  },
};
