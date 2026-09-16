// Modified for standalone community distribution; see NOTICE.
"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BookOpen,
  Clapperboard,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Palette,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export type CanvasSkillIconOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const CANVAS_SKILL_ICON_OPTIONS: CanvasSkillIconOption[] = [
  { value: "message-circle", label: "对话气泡", icon: MessageCircle },
  { value: "layout-grid", label: "网格", icon: LayoutGrid },
  { value: "image", label: "图片", icon: ImageIcon },
  { value: "palette", label: "调色盘", icon: Palette },
  { value: "shopping-bag", label: "购物袋", icon: ShoppingBag },
  { value: "megaphone", label: "扩音器", icon: Megaphone },
  { value: "book-open", label: "故事板", icon: BookOpen },
  { value: "clapperboard", label: "场记板", icon: Clapperboard },
  { value: "badge-percent", label: "营销标签", icon: BadgePercent },
  { value: "sparkles", label: "闪光", icon: Sparkles },
];

const ICON_MAP: Record<string, LucideIcon> = CANVAS_SKILL_ICON_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

export function getCanvasSkillIconComponent(iconName?: string | null): LucideIcon {
  const key = String(iconName || "").trim();
  return ICON_MAP[key] || MessageCircle;
}
