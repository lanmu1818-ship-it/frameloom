// Modified for standalone community distribution; see NOTICE.
import type {
  AgentDetailBriefForm,
  AgentDetailGenerationMode,
  AgentDetailGenerationSlot,
  AgentDetailGenerationSlotRole,
} from "@/types/agent";

export const AGENT_DETAIL_TARGET_WIDTH = 790;
export const AGENT_DETAIL_TARGET_HEIGHT = 1300;

export const AGENT_DETAIL_SLOT_CONFIGS: Array<{
  key: string;
  label: string;
  role: AgentDetailGenerationSlotRole;
}> = [
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

export const AGENT_DETAIL_PRODUCT_SLOT_INDEXES = AGENT_DETAIL_SLOT_CONFIGS.map((slot, index) =>
  slot.role === "product" ? index : -1
).filter((index) => index >= 0);

export const AGENT_DETAIL_MODEL_SLOT_INDEX = AGENT_DETAIL_SLOT_CONFIGS.findIndex(
  (slot) => slot.role === "model"
);

export const AGENT_DETAIL_BUNDLE_SLOT_INDEXES = AGENT_DETAIL_SLOT_CONFIGS.map((slot, index) =>
  slot.role === "bundle" ? index : -1
).filter((index) => index >= 0);

export const AGENT_DETAIL_FIELD_EXAMPLES: Record<keyof AgentDetailBriefForm, string> = {
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

export const AGENT_DETAIL_GENERATION_MODE_OPTIONS: Array<{
  value: AgentDetailGenerationMode;
  label: string;
  description: string;
}> = [
  {
    value: "classic",
    label: "经典详情",
    description: "整页直接生图，适合当前 Agent 页快速生成。",
  },
  {
    value: "agent_layout",
    label: "AGENT排版",
    description: "保留给后续共享画布排版层能力后开放。",
  },
];

export function createEmptyAgentDetailBriefForm(): AgentDetailBriefForm {
  return {
    productSpu: "",
    demandType: "",
    productName: "",
    targetAudience: "",
    mainUser: "",
    usageScenario: "",
    triggerMoment: "",
    coreNeed: "",
    riskConcern: "",
    expectedResult: "",
    coreSellingPoint: "",
    positioningStatement: "",
    userVoice: "",
    competitorReference: "",
    priceBand: "",
    brandTone: "",
    bannedWords: "",
  };
}

export function createEmptyAgentDetailSlots(): Array<AgentDetailGenerationSlot | null> {
  return AGENT_DETAIL_SLOT_CONFIGS.map(() => null);
}

export function normalizeAgentDetailGenerationMode(
  value: unknown
): AgentDetailGenerationMode {
  return value === "agent_layout" ? "agent_layout" : "classic";
}

export function sanitizeAgentDetailBrief(input: unknown): AgentDetailBriefForm {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const normalize = (key: keyof AgentDetailBriefForm) =>
    String(raw[key] || "")
      .replace(/\s+/g, " ")
      .trim();

  return {
    productSpu: normalize("productSpu"),
    demandType: normalize("demandType"),
    productName: normalize("productName"),
    targetAudience: normalize("targetAudience"),
    mainUser: normalize("mainUser"),
    usageScenario: normalize("usageScenario"),
    triggerMoment: normalize("triggerMoment"),
    coreNeed: normalize("coreNeed"),
    riskConcern: normalize("riskConcern"),
    expectedResult: normalize("expectedResult"),
    coreSellingPoint: normalize("coreSellingPoint"),
    positioningStatement: normalize("positioningStatement"),
    userVoice: normalize("userVoice"),
    competitorReference: normalize("competitorReference"),
    priceBand: normalize("priceBand"),
    brandTone: normalize("brandTone"),
    bannedWords: normalize("bannedWords"),
  };
}

export function extractAgentDetailFrameCount(text: string) {
  const normalized = String(text || "").replace(/\s+/g, "");
  const matched = normalized.match(/(\d{1,2})(?:张|屏|页)/);
  if (!matched) return 15;
  const value = Number(matched[1]);
  if (!Number.isFinite(value)) return 15;
  return Math.min(20, Math.max(5, Math.round(value)));
}

export function sanitizeDetailImageModelPrompt(prompt: string): string {
  const filteredLines = String(prompt || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (
        /^(字体规范|标题规范|副标题规范|正文规范|版式规范|安全区|留白节奏|Typography|Layout|Palette|固定字体锁定|固定副标题锁定|固定正文锁定|固定排版安全区|固定留白节奏)/i.test(
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
    [/画布固定(?:竖版)?\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "画布为竖版详情页构图。"],
    [/尺寸固定\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "尺寸为竖版详情页比例。"],
    [/输出为竖版电商详情图，尺寸固定\s*\d+\s*x\s*\d+\s*(?:像素|pixels?)。?/gi, "输出为竖版电商详情图。"],
    [/y\s*=\s*\d+\s*[-~～]\s*\d+/gi, "顶部标题安全区"],
    [/左右边距\s*\d+\s*px/gi, "左右留白充足"],
    [/模块间距\s*\d+\s*px/gi, "模块间距均匀"],
    [/标题和副标题间距\s*\d+\s*px/gi, "标题与副标题间距清晰"],
    [/主标题\s*\d+\s*px[^，。；\n]*/gi, "主标题醒目突出"],
    [/副标题\s*\d+\s*px[^，。；\n]*/gi, "副标题层级清晰"],
    [/正文\s*\d+\s*px[^，。；\n]*/gi, "正文精简易读"],
  ];

  for (const [pattern, replacement] of literalReplacements) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/\b\d+\s*px\b/gi, "")
    .replace(/[（(]\s*顶部标题安全区\s*[)）]/g, "顶部标题安全区")
    .replace(/；{2,}/g, "；")
    .replace(/。{2,}/g, "。")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
