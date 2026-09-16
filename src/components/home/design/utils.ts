// Modified for standalone community distribution; see NOTICE.
import {
  Clapperboard,
  Edit,
  Folder,
  Home,
  ImageIcon,
  Monitor,
  Moon,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { HomeSidebarItemKey } from "@/src/lib/home/home-sidebar-config";
import type { HomeUser } from "@/src/components/home/design/types";

export type ThemeMode = "system" | "light" | "dark";

export const THEME_MODE_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "system",
    label: "跟随系统",
    description: "随浏览器/系统深浅色自动切换",
    icon: Monitor,
  },
  {
    value: "light",
    label: "浅色模式",
    description: "始终使用明亮界面",
    icon: Sun,
  },
  {
    value: "dark",
    label: "深色模式",
    description: "始终使用暗色界面",
    icon: Moon,
  },
];

export const DISCOVERY_DEFAULT_TABS = [
  "品牌设计",
  "海报与广告",
  "插画",
  "UI设计",
  "角色设计",
  "影片与分镜",
  "产品设计",
  "建筑设计",
];

export const PROMPT_TAGS = [
  { key: "nanoBananaPro", label: "Nano Banana Pro", icon: Sparkles, highlighted: true },
  { key: "design", label: "Design", icon: ImageIcon, highlighted: false },
  { key: "branding", label: "Branding", icon: Star, highlighted: false },
  { key: "illustration", label: "Illustration", icon: Palette, highlighted: false },
  { key: "ecommerce", label: "E-Commerce", icon: Monitor, highlighted: false },
  { key: "video", label: "Video", icon: Clapperboard, highlighted: false },
] as const;

export const HOME_SIDEBAR_FALLBACK_ICONS: Record<
  HomeSidebarItemKey,
  LucideIcon
> = {
  newProject: Plus,
  home: Home,
  projects: Folder,
  profile: User,
  gallery: ImageIcon,
  imageEditor: Edit,
  agent: Wand2,
  videoCanvas: Clapperboard,
  flowBoard: Workflow,
  settings: Settings,
};

export type HomePromptTagKey = (typeof PROMPT_TAGS)[number]["key"];
export type HomePromptTagVisibility = Record<HomePromptTagKey, boolean>;

export const MASONRY_HEIGHTS = [420, 290, 340, 470, 300, 360, 430, 320];
export const FEATURED_PAGE_SIZE = 24;
export const COMPOSER_PREFIX_DEFAULT = "让「FrameLoom」";

export function normalizeComposerPreviewTail(text: string, fixedPrefix: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const sanitizedPrefix = fixedPrefix.trim();
  if (sanitizedPrefix && trimmed.startsWith(sanitizedPrefix)) {
    return trimmed.slice(sanitizedPrefix.length).trimStart();
  }

  const legacyPrefixRemoved = trimmed
    .replace(/^让\s*buyi[-_ ]?ai\s*/i, "")
    .replace(/^让\s*home\s*/i, "")
    .trimStart();
  if (legacyPrefixRemoved !== trimmed) {
    return legacyPrefixRemoved;
  }

  return trimmed;
}

export function getUserInitials(user: HomeUser | null) {
  const source = (user?.name || user?.email || "mu").trim();
  if (!source) return "mu";
  return source.slice(0, 2).toLowerCase();
}

export function formatRelativeTime(value?: string) {
  if (!value) return "更新于 Jun 11, 2026";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新于 Jun 11, 2026";
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `更新于 ${formatted}`;
}

export function formatPrice(currency: string, value: number) {
  if (value <= 0) return "免费";
  return `${currency}${value}`;
}

export function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}
