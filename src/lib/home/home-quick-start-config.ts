// Modified for standalone community distribution; see NOTICE.
export const HOME_QUICK_START_CONFIG_KEY = "home_quick_start_config";

export type HomeQuickStartItem = {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  position: string;
  enabled: boolean;
  sortOrder: number;
};

export type HomeQuickStartConfig = {
  items: HomeQuickStartItem[];
};

export const DEFAULT_HOME_QUICK_START_ITEMS: HomeQuickStartItem[] = [
  {
    id: "tea-brand",
    title: "中式茶饮品牌VI设计",
    prompt: "青岚中式茶饮品牌VI设计：东方韵味、中式茶韵、高级绿色、极简风格、精致复古宋体。先设计Logo与品牌配色规范，再生成茶叶礼盒、茶叶罐、手提袋、纸杯、茶饮杯、名片菜单、香薰蜡烛、线香茶具等8张3:4单品样机，最后生成苔藓太湖石展台上的21:9全品类包装物料集合展示。",
    imageUrl: "/placeholders/preview.svg",
    position: "center 46%",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "toy-character",
    title: "IP潮玩人物设定及表情包",
    prompt: "IP潮玩人物设定及表情包，蓝色角色，三视图与表情动作组合",
    imageUrl: "/placeholders/preview.svg",
    position: "center 44%",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "space-storyboard",
    title: "宇宙迷航短片分镜",
    prompt: "宇宙迷航短片分镜，电影感太空舱镜头，连续故事板",
    imageUrl: "/placeholders/preview.svg",
    position: "center 50%",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "perfume-poster",
    title: "香水产品系列海报",
    prompt: "香水产品系列海报，高级商业摄影，系列化版式和场景延展",
    imageUrl: "/placeholders/preview.svg",
    position: "center 52%",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "storybook",
    title: "治愈系插画故事绘本",
    prompt: "治愈系插画故事绘本，温暖叙事，多页分镜和角色场景",
    imageUrl: "/placeholders/preview.svg",
    position: "center 46%",
    enabled: true,
    sortOrder: 4,
  },
];

export const defaultHomeQuickStartConfig: HomeQuickStartConfig = {
  items: DEFAULT_HOME_QUICK_START_ITEMS,
};

function normalizeQuickStartItem(value: unknown, index: number): HomeQuickStartItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const title = String(raw.title || "").trim().slice(0, 48);
  const prompt = String(raw.prompt || "").trim().slice(0, 500);
  const imageUrl = String(raw.imageUrl || raw.image || "").trim().slice(0, 2000);

  if (!title || !prompt || !imageUrl) {
    return null;
  }

  const rawSortOrder = Number(raw.sortOrder);
  return {
    id:
      String(raw.id || "")
        .trim()
        .slice(0, 80) || `quick-start-${index + 1}`,
    title,
    prompt,
    imageUrl,
    position:
      String(raw.position || "")
        .trim()
        .slice(0, 40) || "center center",
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    sortOrder: Number.isFinite(rawSortOrder) ? rawSortOrder : index,
  };
}

export function normalizeHomeQuickStartConfig(value: unknown): HomeQuickStartConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(value)
      ? value
      : [];

  const items = rawItems
    .map((item, index) => normalizeQuickStartItem(item, index))
    .filter((item): item is HomeQuickStartItem => Boolean(item))
    .slice(0, 12)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (items.length === 0) {
    return defaultHomeQuickStartConfig;
  }

  return { items };
}
