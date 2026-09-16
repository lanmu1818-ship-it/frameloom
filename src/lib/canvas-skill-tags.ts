// Modified for standalone community distribution; see NOTICE.
export const CANVAS_SKILL_TAGS_SETTING_KEY = "canvas_skill_tags";
export const DEFAULT_CANVAS_SKILL_TAGS_TITLE = "试试这些 Skills";

export type CanvasSkillTagSettings = {
  enabled: boolean;
  title: string;
  tags: CanvasSkillTag[];
};

export type CanvasSkillTag = {
  id: string;
  name: string;
  prompt: string;
  placeholder?: string;
  iconName?: string;
  iconUrl?: string;
};

export const DEFAULT_CANVAS_SKILL_TAGS: CanvasSkillTag[] = [
  {
    id: "social-carousel",
    name: "社媒轮播图",
    iconName: "layout-grid",
    placeholder: "例如：做一组 6 张小红书轮播，主色橙白，突出卖点对比",
    prompt:
      "你是资深社媒设计师。请输出可直接落地的轮播图方案，包含封面、核心卖点页、场景页与转化页。保持统一视觉风格、品牌色和字体层级，文案精炼且有行动号召。",
  },
  {
    id: "social-media-kit",
    name: "社交媒体",
    iconName: "image",
    placeholder: "例如：给这款产品做 3 套社媒视觉方向，分别偏简约/科技/生活化",
    prompt:
      "请基于用户需求产出社交媒体视觉方案，优先考虑强识别封面、信息层级清晰和移动端可读性。输出时强调平台适配和可复用模板结构。",
  },
  {
    id: "logo-branding",
    name: "Logo 与品牌",
    iconName: "palette",
    placeholder: "例如：品牌名 AURORA，主打轻奢护肤，设计 3 个 Logo 概念方向",
    prompt:
      "请以品牌设计顾问视角工作：先定义品牌关键词与调性，再给出 Logo 方向、配色、字体与应用场景建议。风格需统一、可执行，避免空泛描述。",
  },
  {
    id: "storyboard",
    name: "分镜故事板",
    iconName: "clapperboard",
    placeholder: "例如：30 秒产品广告，拆成 8 镜头，强调开箱与使用前后对比",
    prompt:
      "请先构建分镜叙事结构（开场-冲突-转折-收束），再给出每一镜头的画面构图、主体动作、镜头语言和文案要点。保证镜头连续性和视觉一致性。",
  },
  {
    id: "marketing-brochure",
    name: "营销宣传册",
    iconName: "megaphone",
    placeholder: "例如：做一份 4 页产品宣传册，受众是经销商，风格专业稳重",
    prompt:
      "请输出可印刷/可投放的宣传册方案，包含封面、核心卖点、案例背书与行动引导。要求信息层级明确、版式节奏均衡、品牌元素统一。",
  },
  {
    id: "ecommerce-main-image",
    name: "亚马逊产品套图",
    iconName: "shopping-bag",
    placeholder: "例如：亚马逊 7 张套图，主图白底，副图展示材质细节和使用场景",
    prompt:
      "请按电商平台高转化标准输出主图+副图方案，强调产品主体清晰、卖点可视化、场景可信和对比信息明确。保持产品外观一致，不虚构结构细节。",
  },
];

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeId(value: unknown, fallbackIndex: number) {
  const raw = normalizeString(value).toLowerCase();
  const id = raw
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return id || `tag-${fallbackIndex + 1}`;
}

export function normalizeCanvasSkillTags(value: unknown): CanvasSkillTag[] {
  const source = Array.isArray(value) ? value : DEFAULT_CANVAS_SKILL_TAGS;
  const usedIds = new Set<string>();
  const normalized: CanvasSkillTag[] = [];

  source.forEach((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = normalizeString(row.name);
    const prompt = normalizeString(row.prompt);
    const placeholder = normalizeString(row.placeholder);
    const iconName = normalizeString(row.iconName);
    const iconUrl = normalizeString(row.iconUrl);
    if (!name || !prompt) return;

    let id = normalizeId(row.id, index);
    while (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    usedIds.add(id);
    normalized.push({
      id,
      name,
      prompt,
      placeholder: placeholder || undefined,
      iconName: iconName || undefined,
      iconUrl: iconUrl || undefined,
    });
  });

  if (normalized.length === 0) {
    return DEFAULT_CANVAS_SKILL_TAGS;
  }

  return normalized.slice(0, 30);
}

export function normalizeCanvasSkillTagSettings(
  value: unknown
): CanvasSkillTagSettings {
  if (Array.isArray(value)) {
    return {
      enabled: true,
      title: DEFAULT_CANVAS_SKILL_TAGS_TITLE,
      tags: normalizeCanvasSkillTags(value),
    };
  }

  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const title = normalizeString(row.title) || DEFAULT_CANVAS_SKILL_TAGS_TITLE;
    return {
      enabled: row.enabled !== false,
      title,
      tags: normalizeCanvasSkillTags(row.tags),
    };
  }

  return {
    enabled: true,
    title: DEFAULT_CANVAS_SKILL_TAGS_TITLE,
    tags: normalizeCanvasSkillTags(null),
  };
}
