// Modified for standalone community distribution; see NOTICE.
import type { DetailUiProtocol, DetailUiScreenReviewPatch } from "@/src/lib/detail-ui-protocol";
import type { DetailUiDslV2Document } from "@/src/lib/detail-ui-dsl-v2";
import type { UiScreenDocument } from "@/src/lib/ui-screen/schema";
import type { UiSurfacePatch, UiSurfaceSnapshot } from "@/src/lib/ui-surface-protocol";
import type { PickedObjectAttachment } from "@/src/components/canvas/chat-panel/canvas-chat-session";

export type DetailBriefForm = {
  productSpu: string;
  demandType: string;
  productName: string;
  targetAudience: string;
  mainUser: string;
  usageScenario: string;
  triggerMoment: string;
  coreNeed: string;
  riskConcern: string;
  expectedResult: string;
  coreSellingPoint: string;
  positioningStatement: string;
  userVoice: string;
  competitorReference: string;
  priceBand: string;
  brandTone: string;
  bannedWords: string;
};

export type DetailSlotConfig = {
  key: string;
  label: string;
  role: "product" | "model" | "bundle";
};

export type DetailSectionKey = "required" | "strategy" | "assets" | "archives";
export type DetailGenerationMode = "classic" | "agent_layout";

export type DetailArchive = {
  id: string;
  title: string;
  prompt: string;
  generationMode: DetailGenerationMode;
  brief: DetailBriefForm;
  slots: Array<PickedObjectAttachment | null>;
  createdAt: number;
  updatedAt?: number;
  summary?: string;
  imageCount?: number;
  coverUrl?: string;
  uiSurfaceSnapshot?: UiSurfaceSnapshot | null;
  uiSurfaceLatestReview?: {
    screenIndex?: number;
    action?: "pass" | "protocol_patch" | "regenerate_image";
    passed?: boolean;
    issues?: string[];
  } | null;
};

export type DetailPlanResponse = {
  generationMode?: DetailGenerationMode;
  summary?: string;
  prompts?: string[];
  screenSize?: {
    width: number;
    height: number;
  };
  globalStyle?: {
    designLanguage?: string;
    typography?: {
      fontFamily?: string;
      title?: string;
      subtitle?: string;
      body?: string;
    };
    layout?: {
      grid?: string;
      safeArea?: string;
      rhythm?: string;
    };
    palette?: string;
  };
  screens?: Array<{
    index: number;
    screenType?: "A" | "B" | "C";
    objective?: string;
    title?: string;
    subtitle?: string;
    copy?: string;
    layoutNote?: string;
    useModel?: boolean;
    modelReason?: string;
    bundleShowcase?: boolean;
    bundleReason?: string;
    visualPrompt?: string;
    fabe?: {
      b?: string;
      f?: string;
      a?: string;
      e?: string;
    };
  }>;
  skillFlow?: {
    name?: string;
    version?: string;
    steps?: string[];
  };
  designSkill?: {
    version?: string;
    name?: string;
    source?: string;
    visualDirection?: string[];
    reviewChecklist?: string[];
  };
  qualityChecks?: {
    passed?: boolean;
    issues?: string[];
  };
  uiValidation?: {
    passed?: boolean;
    issues?: string[];
  };
  preflight?: {
    passed?: boolean;
    designDirectorScore?: number;
    marketingDirectorScore?: number;
    issues?: string[];
    rewriteApplied?: boolean;
  };
  model?: {
    id: string;
    displayName: string;
    providerType: string;
  };
  uiProtocol?: DetailUiProtocol;
  uiSurface?: UiSurfaceSnapshot;
  uiDslV2Screens?: DetailUiDslV2Document[];
  brandStyleBoard?: UiScreenDocument;
};

export type DetailPlanScreenSpec = NonNullable<DetailPlanResponse["screens"]>[number];

export type DetailReviewPlan = {
  index: number;
  title: string;
  reviewText: string;
  imagePrompt: string;
};

export type DetailReviewGroup = {
  reviewText: string;
  images: Array<{ originalUrl: string; thumbnailUrl: string }>;
};

export type DetailScreenReviewResult = {
  pass: boolean;
  reviewAction?: "pass" | "protocol_patch" | "regenerate_image";
  score?: number;
  issues?: string[];
  layoutFixes?: string[];
  revisedPrompt?: string;
  uiPatch?: DetailUiScreenReviewPatch;
  uiSurfacePatch?: UiSurfacePatch;
  uiValidation?: {
    passed?: boolean;
    issues?: string[];
  };
  model?: {
    id?: string;
    displayName?: string;
    providerType?: string;
  } | null;
};

export type DetailUiValidationSnapshot = {
  passed?: boolean;
  issues?: string[];
};

export type DetailUiReviewSnapshot = {
  screenIndex: number;
  action?: "pass" | "protocol_patch" | "regenerate_image";
  passed?: boolean;
  issues?: string[];
};

export const DETAIL_TARGET_WIDTH = 790;
export const DETAIL_TARGET_HEIGHT = 1300;
export const DETAIL_STYLE_BOARD_WIDTH = 790;
export const DETAIL_STYLE_BOARD_HEIGHT = 1080;
export const DETAIL_STYLE_BOARD_SPACING = 36;
export const DETAIL_REVIEW_COUNT = 3;
export const DETAIL_REVIEW_REGEN_COUNT = 2;
export const DETAIL_REVIEW_IMAGE_COUNT = 3;
export const DETAIL_REVIEW_IMAGE_WIDTH = 420;
export const DETAIL_REVIEW_IMAGE_HEIGHT = 420;
export const DETAIL_SCREEN_REVIEW_MAX_ATTEMPTS = 1;

export const DETAIL_TYPOGRAPHY_LOCK = {
  title: "主标题 64px / 700 / 行高1.15，建议单行最多2行，不得出现“第X屏”",
  subtitle: "副标题 34px / 600 / 行高1.25，位于主标题下方16px",
  body: "正文 24px / 500 / 行高1.45，段间距10px，每块最多4行",
  safeArea: "文字安全区固定 y=64~360，产品主体避免遮挡标题区",
  rhythm: "左右边距56px，模块间距24px，全套页面留白节奏一致",
} as const;

export const DETAIL_SLOT_CONFIGS: DetailSlotConfig[] = [
  { key: "product-1", label: "产品图1", role: "product" },
  { key: "product-2", label: "产品图2", role: "product" },
  { key: "product-3", label: "产品图3", role: "product" },
  { key: "product-4", label: "产品图4", role: "product" },
  { key: "product-5", label: "产品图5", role: "product" },
  { key: "model-1", label: "模特图", role: "model" },
  { key: "bundle-1", label: "搭配图1", role: "bundle" },
  { key: "bundle-2", label: "搭配图2", role: "bundle" },
  { key: "bundle-3", label: "搭配图3", role: "bundle" },
];

export const DETAIL_PRODUCT_SLOT_INDEXES = DETAIL_SLOT_CONFIGS.map((slot, index) =>
  slot.role === "product" ? index : -1
).filter((index) => index >= 0);

export const DETAIL_MODEL_SLOT_INDEX = DETAIL_SLOT_CONFIGS.findIndex(
  (slot) => slot.role === "model"
);

export const DETAIL_BUNDLE_SLOT_INDEXES = DETAIL_SLOT_CONFIGS.map((slot, index) =>
  slot.role === "bundle" ? index : -1
).filter((index) => index >= 0);

export const DETAIL_FIELD_EXAMPLES: Record<keyof DetailBriefForm, string> = {
  productSpu: "示例：SPU-889901",
  demandType: "示例：清洁除尘 / 户外通勤 / 礼赠",
  productName: "示例：Buyi-AI 无线手持吸尘器",
  targetAudience: "示例：25-40岁养宠家庭、宝妈",
  mainUser: "示例：家庭主理人、租房上班族",
  usageScenario: "示例：下班回家10分钟快速清洁",
  triggerMoment: "示例：宠物掉毛高峰、饭后碎屑清理",
  coreNeed: "示例：省时省力清除毛发与灰尘",
  riskConcern: "示例：担心吸力不足、续航短、噪音大",
  expectedResult: "示例：3分钟清洁桌面，地面无明显毛发",
  coreSellingPoint: "示例：18000Pa吸力、0.9kg轻量、一键倒尘",
  positioningStatement: "示例：让日常清洁更快更轻松",
  userVoice: "示例：家里有猫掉毛太多，希望安静一点不吵宝宝",
  competitorReference: "示例：对标戴森入门款，突出轻便高性价比",
  priceBand: "示例：199-299元",
  brandTone: "示例：专业、可靠、亲和",
  bannedWords: "示例：最强、第一、100%治愈",
};

export const DETAIL_GENERATION_MODE_OPTIONS: Array<{
  value: DetailGenerationMode;
  label: string;
  description: string;
}> = [
  {
    value: "classic",
    label: "传统生图",
    description: "整页直接生图，速度更快",
  },
  {
    value: "agent_layout",
    label: "AGENT排版",
    description: "生图只出画面，文字层可编辑",
  },
];

export function extractDetailFrameCount(text: string): number {
  const normalized = text.replace(/\s+/g, "");
  const matched = normalized.match(/(\d{1,2})(?:张|屏|页)/);
  if (!matched) return 15;
  const value = Number(matched[1]);
  if (!Number.isFinite(value)) return 15;
  return Math.min(20, Math.max(5, Math.round(value)));
}

export function normalizeDetailGenerationMode(value: unknown): DetailGenerationMode {
  return value === "agent_layout" ? "agent_layout" : "classic";
}

export function extractFirstNumber(value: string, fallback: number): number {
  const matched = String(value || "").match(/(\d{1,3})/);
  if (!matched) return fallback;
  const parsed = Number(matched[1]);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function extractFontWeight(value: string, fallback = "600"): string {
  const matched = String(value || "").match(/(?:\/\s*|weight[:：]?\s*)(\d{3})/i);
  if (!matched) return fallback;
  return matched[1] || fallback;
}

export function sanitizeDetailImageModelPrompt(prompt: string): string {
  const filteredLines = String(prompt || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (
        /^(字体规范|标题规范|副标题规范|正文规范|版式规范|留白节奏|Typography|Layout|Palette|固定字体锁定|固定副标题锁定|固定正文锁定|固定排版安全区|固定留白节奏)/i.test(
          line
        )
      ) {
        return "";
      }
      return line;
    })
    .filter(Boolean);

  let result = filteredLines.join("\n");

  const literalReplacements: Array<[RegExp, string]> = [
    [/输出为竖版电商详情图，尺寸固定\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "输出为竖版电商详情图。"],
    [/画布固定(?:竖版)?\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "画布为竖版详情页构图。"],
    [/尺寸固定\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "尺寸为竖版详情页比例。"],
    [/y\s*=\s*\d+\s*[-~～]\s*\d+/gi, "顶部标题安全区"],
    [/左右边距\s*\d+\s*px/gi, "左右留白充足"],
    [/模块间距\s*\d+\s*px/gi, "模块间距均匀"],
    [/标题和副标题间距\s*\d+\s*px/gi, "标题与副标题间距清晰"],
    [/主标题\s*\d+\s*px[^，。；\n]*/gi, "主标题醒目突出"],
    [/副标题\s*\d+\s*px[^，。；\n]*/gi, "副标题层级清晰"],
    [/正文\s*\d+\s*px[^，。；\n]*/gi, "正文精简易读"],
    [/商业摄影质感，留出清晰文案排版区，不要水印。?/gi, "商业摄影质感，留出清晰文字区域，不要水印。"],
  ];

  for (const [pattern, replacement] of literalReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/\b\d+\s*px\b/gi, "")
    .replace(/[（(]\s*顶部标题安全区\s*[)）]/g, "顶部标题安全区")
    .replace(/；{2,}/g, "；")
    .replace(/。{2,}/g, "。")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return result;
}

export function splitDetailKeywords(value: string, limit = 3): string[] {
  const raw = String(value || "")
    .split(/[\n,，、;；|]/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (raw.length > 0) return raw.slice(0, limit);
  return [];
}
