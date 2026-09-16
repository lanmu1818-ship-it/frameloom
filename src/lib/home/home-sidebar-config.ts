// Modified for standalone community distribution; see NOTICE.
export const HOME_SIDEBAR_CONFIG_KEY = "home_sidebar_config";

export const DEFAULT_HOME_SIDEBAR_ITEMS = [
  {
    key: "newProject",
    label: "新建项目",
    description: "首页左侧顶部的新建项目按钮",
  },
  {
    key: "home",
    label: "首页",
    description: "回到首页主视图",
  },
  {
    key: "projects",
    label: "项目列表",
    description: "打开项目列表视图",
  },
  {
    key: "profile",
    label: "个人主页",
    description: "首页侧边栏个人主页入口",
  },
  {
    key: "gallery",
    label: "个人相册",
    description: "跳转到个人相册",
  },
  {
    key: "imageEditor",
    label: "图片编辑",
    description: "打开图片编辑功能",
  },
  {
    key: "agent",
    label: "Agent",
    description: "打开 Agent 创作入口",
  },
  {
    key: "videoCanvas",
    label: "视频画布",
    description: "跳转视频画布页面",
  },
  {
    key: "flowBoard",
    label: "流程白板",
    description: "跳转流程白板页面",
  },
  {
    key: "settings",
    label: "管理后台",
    description: "全站管理员管理入口",
  },
] as const;

export type HomeSidebarItemKey =
  (typeof DEFAULT_HOME_SIDEBAR_ITEMS)[number]["key"];

export type HomeSidebarItemConfig = {
  label: string;
  iconUrl: string;
  enabled: boolean;
};

export type HomeSidebarConfig = {
  items: Record<HomeSidebarItemKey, HomeSidebarItemConfig>;
};

const DEFAULT_ITEMS = DEFAULT_HOME_SIDEBAR_ITEMS.reduce(
  (accumulator, item) => {
    accumulator[item.key] = {
      label: item.label,
      iconUrl: "",
      enabled: true,
    };
    return accumulator;
  },
  {} as Record<HomeSidebarItemKey, HomeSidebarItemConfig>
);

export const defaultHomeSidebarConfig: HomeSidebarConfig = {
  items: DEFAULT_ITEMS,
};

export function getDefaultDesignHomeSidebarItem(
  key: HomeSidebarItemKey
): HomeSidebarItemConfig {
  return defaultHomeSidebarConfig.items[key];
}

export function normalizeHomeSidebarConfig(
  value: unknown
): HomeSidebarConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawItems =
    raw.items && typeof raw.items === "object" && !Array.isArray(raw.items)
      ? (raw.items as Record<string, unknown>)
      : {};

  const items = DEFAULT_HOME_SIDEBAR_ITEMS.reduce(
    (accumulator, item) => {
      const itemRaw =
        rawItems[item.key] &&
        typeof rawItems[item.key] === "object" &&
        !Array.isArray(rawItems[item.key])
          ? (rawItems[item.key] as Record<string, unknown>)
          : {};

      const label = String(itemRaw.label || "")
        .trim()
        .slice(0, 32);
      const iconUrl = String(itemRaw.iconUrl || "")
        .trim()
        .slice(0, 2000);

      accumulator[item.key] = {
        label: label || item.label,
        iconUrl,
        enabled:
          typeof itemRaw.enabled === "boolean" ? itemRaw.enabled : true,
      };
      return accumulator;
    },
    {} as Record<HomeSidebarItemKey, HomeSidebarItemConfig>
  );

  return { items };
}
