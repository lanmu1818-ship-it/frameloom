// Modified for standalone community distribution; see NOTICE.
import {
  Compass,
  Clapperboard,
  Frame,
  GalleryThumbnails,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  getDefaultDesignHomeSidebarItem,
  type HomeSidebarItemKey,
} from "@/src/lib/home/home-sidebar-config";

type SidebarItem = {
  iconUrl?: string | null;
  label: string;
};

type HomeSidebarProps = {
  accountControls?: ReactNode;
  agentEnabled: boolean;
  getItem: (key: HomeSidebarItemKey) => SidebarItem;
  isEnabled: (key: HomeSidebarItemKey) => boolean;
  isProjectsOnlyView: boolean;
  onAllProjects: () => void;
  onHome: () => void;
  onNewCanvas: () => void;
  onVideoCanvas: () => void;
  renderIcon: (
    key: HomeSidebarItemKey,
    options?: {
      active?: boolean;
      filled?: boolean;
      sizeClassName?: string;
    }
  ) => ReactNode;
  shouldInvertLogo?: boolean;
  siteLogo?: string | null;
  siteName: string;
  videoCanvasEnabled: boolean;
  tone?: "light" | "dark";
};

const COMPACT_SIDEBAR_ITEMS: Array<{
  key: HomeSidebarItemKey;
  defaultLabel: string;
  fallbackIcon: LucideIcon;
}> = [
  { key: "home", defaultLabel: "灵感", fallbackIcon: Compass },
  { key: "newProject", defaultLabel: "生成", fallbackIcon: WandSparkles },
  { key: "projects", defaultLabel: "资产", fallbackIcon: GalleryThumbnails },
  { key: "flowBoard", defaultLabel: "画布", fallbackIcon: Frame },
  { key: "videoCanvas", defaultLabel: "视频", fallbackIcon: Clapperboard },
];

const COMPACT_SIDEBAR_BUTTON_CLASS =
  "group flex h-[40px] w-[40px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-[8px] transition duration-200 hover:-translate-y-0.5";
const COMPACT_SIDEBAR_LABEL_CLASS =
  "text-[8.4px] leading-none font-medium tracking-normal";
const COMPACT_SIDEBAR_ITEM_GAP_CLASS = "gap-[8px]";

export function HomeSidebar({
  accountControls,
  getItem,
  isProjectsOnlyView,
  isEnabled,
  onAllProjects,
  onHome,
  onNewCanvas,
  onVideoCanvas,
  videoCanvasEnabled,
  renderIcon,
  shouldInvertLogo = false,
  siteLogo,
  siteName,
  tone = "light",
}: HomeSidebarProps) {
  const [isLogoBroken, setIsLogoBroken] = useState(false);
  const isDark = tone === "dark";
  const navIconClass = isDark ? "text-white" : "text-[#181b21]";
  const navIconSize = "h-4 w-4";
  const navIconStroke = 1.9;

  useEffect(() => {
    setIsLogoBroken(false);
  }, [siteLogo]);

  const getCompactLabel = (key: HomeSidebarItemKey, defaultLabel: string) => {
    const configuredLabel = String(getItem(key)?.label || "").trim();
    const defaultConfigLabel = getDefaultDesignHomeSidebarItem(key).label;

    if (!configuredLabel || configuredLabel === defaultConfigLabel) {
      return defaultLabel;
    }

    return configuredLabel;
  };

  const getCompactIcon = ({
    active,
    fallbackIcon: FallbackIcon,
    key,
  }: {
    active?: boolean;
    fallbackIcon: LucideIcon;
    key: HomeSidebarItemKey;
  }) => {
    const configuredIconUrl = String(getItem(key)?.iconUrl || "").trim();

    if (configuredIconUrl) {
      return renderIcon(key, {
        active,
        sizeClassName: navIconSize,
      });
    }

    return (
      <FallbackIcon className={navIconSize} strokeWidth={navIconStroke} />
    );
  };

  const navItem = ({
    active,
    icon,
    itemKey,
    label,
    onClick,
  }: {
    active?: boolean;
    icon: ReactNode;
    itemKey?: string;
    label: string;
    onClick: () => void;
  }) => (
    <button
      key={itemKey}
      type="button"
      className={[
        COMPACT_SIDEBAR_BUTTON_CLASS,
        isDark
          ? active
            ? "bg-white/[0.08] text-white"
            : "text-white/76 hover:bg-white/[0.06] hover:text-white"
          : active
            ? "bg-black/[0.07] text-[#111827]"
            : "text-[#515866] hover:bg-black/[0.055] hover:text-[#111827]",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      title={label}
    >
      <span className={`${navIconClass} transition group-hover:scale-105`}>
        {icon}
      </span>
      <span className={COMPACT_SIDEBAR_LABEL_CLASS}>{label}</span>
    </button>
  );

  return (
    <aside
      className="fixed bottom-0 left-0 top-0 z-[100] hidden w-[56px] flex-col items-center bg-transparent lg:flex"
    >
      <div className="flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden px-2 pb-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition duration-200 hover:-translate-y-0.5 hover:opacity-90"
          onClick={onHome}
          title={siteName}
        >
          {siteLogo && !isLogoBroken ? (
            <img
              src={siteLogo}
              alt=""
              aria-hidden="true"
              onError={() => setIsLogoBroken(true)}
              className={[
                "h-7 w-7 object-contain",
                shouldInvertLogo ? "brightness-0" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand-accent text-brand-accent-foreground shadow-[0_8px_20px_rgb(var(--brand-accent-rgb)/0.22)]">
              <Sparkles className="h-4 w-4" fill="rgba(7,9,13,0.22)" strokeWidth={1.8} />
            </span>
          )}
        </button>

        <div
          className={[
            "mt-5 flex w-full flex-col items-center",
            COMPACT_SIDEBAR_ITEM_GAP_CLASS,
          ].join(" ")}
        >
          {COMPACT_SIDEBAR_ITEMS.filter((item) => isEnabled(item.key) && (item.key !== "videoCanvas" || videoCanvasEnabled)).map(
            (item) => {
              const active =
                item.key === "home"
                  ? !isProjectsOnlyView
                  : item.key === "projects"
                    ? isProjectsOnlyView
                    : false;
              const onClick =
                item.key === "home"
                  ? onHome
                  : item.key === "projects"
                    ? onAllProjects
                    : item.key === "videoCanvas"
                      ? onVideoCanvas
                      : onNewCanvas;

              return navItem({
                active,
                icon: getCompactIcon({
                  active,
                  fallbackIcon: item.fallbackIcon,
                  key: item.key,
                }),
                itemKey: item.key,
                label: getCompactLabel(item.key, item.defaultLabel),
                onClick,
              });
            }
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 pt-5">
          {accountControls ? (
            <div className="flex flex-col items-center gap-2">
              {accountControls}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
