// Modified for standalone community distribution; see NOTICE.
"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Images, LayoutGrid, Wand2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  isDefaultSiteLogo,
  resolveDefaultSiteLogo,
} from "@/src/lib/branding/defaults";
import { cn } from "@/src/lib/utils";

interface AgentCanvasTopNavDarkProps {
  siteName?: string | null;
  siteLogo?: string | null;
  siteLogoDark?: string | null;
  onBack?: () => void;
  rightSlot?: ReactNode;
  activeKey?: "agent" | "canvas" | "gallery";
}

const NAV_ITEMS = [
  {
    key: "agent" as const,
    label: "Agent",
    icon: Wand2,
    onClick: () => window.location.assign("/canvas?mode=agent"),
  },
  {
    key: "canvas" as const,
    label: "无限画布",
    icon: LayoutGrid,
    onClick: () => window.location.assign(`/canvas/${crypto.randomUUID()}`),
  },
  {
    key: "gallery" as const,
    label: "我的图册",
    icon: Images,
    onClick: () => window.location.assign("/gallery"),
  },
];

export function AgentCanvasTopNavDark({
  siteName = "FrameLoom",
  siteLogo,
  siteLogoDark,
  onBack,
  rightSlot = null,
  activeKey = "agent",
}: AgentCanvasTopNavDarkProps) {
  const resolvedSiteName = String(siteName || "FrameLoom").trim() || "FrameLoom";
  const lightLogo = siteLogo?.trim() ? resolveDefaultSiteLogo(siteLogo) : "";
  const darkLogo = siteLogoDark?.trim()
    ? resolveDefaultSiteLogo(siteLogoDark)
    : "";
  const displayLogo = darkLogo || lightLogo;
  const shouldInvertLogo =
    !siteLogoDark?.trim() &&
    Boolean(siteLogo?.trim()) &&
    !isDefaultSiteLogo(lightLogo);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1480px] px-6 lg:px-8 xl:px-10">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="返回上一步"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={resolvedSiteName}
                  className={cn(
                    "h-9 w-9 shrink-0 object-contain",
                    shouldInvertLogo && "brightness-0 invert"
                  )}
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Wand2 className="h-4 w-4 text-white" />
                </div>
              )}
              <span className="truncate text-base font-semibold text-white">{resolvedSiteName}</span>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <nav className="hidden items-center gap-2 md:flex">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === activeKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                      isActive
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {rightSlot ? <div className="flex items-center justify-end">{rightSlot}</div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
