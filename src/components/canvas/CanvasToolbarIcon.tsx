// Modified for standalone community distribution; see NOTICE.
"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { CanvasToolbarItemConfig } from "@/src/lib/canvas-toolbar-config";
import { cn } from "@/src/lib/utils";

type CanvasToolbarIconProps = {
  item?: CanvasToolbarItemConfig | null;
  iconUrl?: string | null;
  fallback: LucideIcon;
  className?: string;
  style?: CSSProperties;
  active?: boolean;
};

function isSvgIconUrl(url: string) {
  return (
    /^data:image\/svg\+xml/i.test(url) ||
    /\.svg(?:[?#].*)?$/i.test(url)
  );
}

function stripImageFilterClasses(className?: string) {
  return String(className || "")
    .split(/\s+/)
    .filter(
      (token) =>
        token &&
        token !== "brightness-0" &&
        token !== "invert" &&
        token !== "dark:invert" &&
        token !== "dark:invert-0"
    )
    .join(" ");
}

export function CanvasToolbarIcon({
  item,
  iconUrl,
  fallback: FallbackIcon,
  className,
  style,
  active = false,
}: CanvasToolbarIconProps) {
  const resolvedIconUrl = String(iconUrl || item?.iconUrl || "").trim();

  if (resolvedIconUrl) {
    if (isSvgIconUrl(resolvedIconUrl)) {
      return (
        <span
          aria-hidden="true"
          className={cn(
            "inline-block shrink-0 bg-current",
            stripImageFilterClasses(className)
          )}
          style={{
            WebkitMaskImage: `url("${resolvedIconUrl}")`,
            maskImage: `url("${resolvedIconUrl}")`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            ...style,
          }}
        />
      );
    }

    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          "object-contain",
          active ? "brightness-0 invert opacity-95" : "brightness-0 opacity-80 dark:invert",
          className
        )}
        src={resolvedIconUrl}
        style={style}
      />
    );
  }

  return <FallbackIcon className={className} style={style} />;
}
