// Modified for standalone community distribution; see NOTICE.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/src/desktop/next-link-shim";
import { useRouter } from "@/src/desktop/next-navigation-shim";
import { useTheme } from "next-themes";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import {
  ArrowRight,
  ArrowUp,
  Bell,
  Clapperboard,
  Edit,
  Folder,
  Home,
  ImageIcon,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
  Users,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/src/components/ui/hover-card";
import type { ImageGenerationParams } from "@/src/components/image-params-bar";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/src/components/ui/select";
import { apiFetch } from "@/src/client/api";
import { clientSignOut } from "@/src/client/auth";
import {
  cn,
  fetcher,
} from "@/src/lib/utils";
import {
  dispatchProviderApiKeyPrompt,
  dispatchProviderApiKeyPromptFromError,
} from "@/src/client/provider-api-key-prompt";
import {
  type CanvasLaunchAttachment,
  getCanvasLaunchStorageKey,
} from "@/src/lib/canvas-launch";
import type { MembershipConfig } from "@/src/lib/membership/config";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import {
  DEFAULT_SITE_NAME,
  resolveDefaultSiteLogo,
  resolveDefaultSiteName,
  shouldInvertDefaultLogoForTheme,
} from "@/src/lib/branding/defaults";
import {
  normalizeHomeSidebarConfig,
  type HomeSidebarItemKey,
} from "@/src/lib/home/home-sidebar-config";
import {
  normalizeHomeQuickStartConfig,
  type HomeQuickStartConfig,
} from "@/src/lib/home/home-quick-start-config";
import { HomeFeaturedGallery } from "@/src/components/home/design/home-featured-gallery";
import {
  type HomeComposerToolMode,
  HomeHeroComposer,
  type InspirationImageResult,
} from "@/src/components/home/design/home-hero-composer";
import { HomeProjectsSection } from "@/src/components/home/design/home-projects-section";
import { HomeQuickStartSection } from "@/src/components/home/design/home-quick-start-section";
import { HomeSidebar } from "@/src/components/home/design/home-sidebar";

type ImageAnnotatorComponent = typeof import("@/src/components/image-annotator").ImageAnnotator;

const LOCAL_DEV_AUTH_USER_ID = "00000000-0000-4000-8000-000000000001";

type HomeUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  type?: string | null;
  teamId?: string | null;
  teamRole?: string | null;
};

type CanvasProject = {
  id: string;
  workspaceType?: "canvas" | "agent" | "video";
  title: string;
  thumbnail?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FeaturedImage = {
  id: string;
  thumbnailUrl: string;
  originalUrl: string;
  prompt?: string | null;
  featuredCategory?: string | null;
  user?: {
    name?: string;
    department?: string;
  };
};

type FeaturedResponse = {
  images: FeaturedImage[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type ModelOption = {
  id: string;
  modelId: string;
  displayName: string;
  avatarUrl?: string | null;
  providerType: string;
  supportsImageGen?: boolean;
  capabilities?: Record<string, unknown> | null;
  videoToolCapability?: unknown | null;
  imageGenConfig?: {
    maxImages?: number;
    supportsSize?: boolean;
    supports1K?: boolean;
    supports2K?: boolean;
    supports4K?: boolean;
    supportsPromptExtend?: boolean;
    supportsNegativePrompt?: boolean;
    supportsWatermark?: boolean;
    supportsSeed?: boolean;
    creditCostPerImage?: number;
    creditCostPerVideo?: number;
    videoDurationOptions?: number[];
    creditCostPerVideoByDuration?: Record<string, number>;
    creditCostPerVideoByResolution?: Record<string, number>;
  } | null;
};

type ContactConfig = {
  phone?: string;
  wechatQrUrl?: string;
};

type MembershipSummaryResponse = {
  config: MembershipConfig;
  currentPlanId: string;
  currentPlan: {
    id: string;
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    monthlyCredits: number;
    dailyFreeCredits: number;
    features: string[];
    badge?: string;
    highlighted?: boolean;
  };
  summary: {
    currentCredits: number;
    dailyFreeCredits: number;
    usedThisMonth: number;
    monthlyLimit: number | null;
    remainingThisMonth: number | null;
    totalImages: number;
  };
};

type ProviderCredentialOption = {
  type: string;
  label: string;
  category: "image" | "video";
  helpText: string;
  apiKeyUrl?: string | null;
};

type ProviderCredentialRecord = {
  id: string;
  scopeType: "personal" | "team";
  providerType: string;
  providerLabel: string;
  status: "active" | "paused" | "revoked";
  keyPrefix: string | null;
  keySuffix: string | null;
  lastValidatedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProviderUsageSnapshot = {
  id: string;
  credentialId: string;
  scopeType: "personal" | "team";
  providerType: string;
  providerLabel: string;
  balanceCents: number | null;
  currency: string;
  apiKeyStatus: string | null;
  isBlocked: boolean;
  blockReason: string | null;
  todayCostCents: number;
  last30DaysCostCents: number;
  totalCostCents: number;
  todayRequestCount: number;
  last30DaysRequestCount: number;
  totalRequestCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  updatedAt: string | null;
};

type ProviderUsageRecord = {
  id: string;
  credentialId: string;
  providerType: string;
  providerLabel: string;
  requestId: string;
  model: string | null;
  endpoint: string | null;
  requestType: string | null;
  actualCostCents: number;
  imageCount: number | null;
  mediaType: string | null;
  externalCreatedAt: string | null;
  createdAt: string | null;
};

type AccountCenterResponse = {
  profile: {
    name: string;
    email: string;
    currentPlanName: string;
    currentPlanId: string;
    availablePoints: number;
    monthlyCredits: number;
    dailyFreeCredits: number;
    billingMode?: "personal" | "team";
  };
  team: {
    id: string;
    name: string;
    status: "active" | "paused" | "archived";
    role: "member" | "admin" | "owner";
    billingMode: "team";
    canLeave: boolean;
    leaveBlockedReason: string | null;
  } | null;
  providerCredentials?: {
    scopeType: "personal" | "team";
    teamManaged: boolean;
    credentials: ProviderCredentialRecord[];
    providerOptions: ProviderCredentialOption[];
  };
  providerUsage?: {
    snapshots: ProviderUsageSnapshot[];
    records: ProviderUsageRecord[];
  };
  usageRecords: Array<{
    id: string;
    detail: string;
    status: "consumed" | "earned";
    amount: number;
    createdAt: string;
  }>;
  billingRecords: Array<{
    id: string;
    date: string;
    category: string;
    amount: number;
    status: "completed" | "pending" | "failed";
    invoice: string;
  }>;
};

type DesignHomeProps = {
  user?: HomeUser | null;
  isAuthenticated?: boolean;
  demoGuestMode?: boolean;
  siteName?: string;
  siteLogo?: string | null;
  siteLogoDark?: string | null;
  surpriseCategories?: string[];
  heroPromoText?: string | null;
  heroPromoActionText?: string | null;
  heroTitleText?: string | null;
  heroSubtitleText?: string | null;
};

type HomeSessionResponse = {
  valid: boolean;
  user?: HomeUser | null;
  userType?: string | null;
};

type UploadFileItem = {
  id: string;
  file?: File;
  previewUrl: string;
  name?: string;
  contentType?: string;
  remoteAttachment?: CanvasLaunchAttachment;
};

type ThemeMode = "system" | "light" | "dark";

const THEME_MODE_OPTIONS: Array<{
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

const DISCOVERY_DEFAULT_TABS = [
  "品牌设计",
  "海报与广告",
  "插画",
  "UI设计",
  "角色设计",
  "影片与分镜",
  "产品设计",
  "建筑设计",
];

const PROMPT_TAGS = [
  { key: "nanoBananaPro", label: "Nano Banana Pro", icon: Sparkles, highlighted: true },
  { key: "design", label: "Design", icon: ImageIcon, highlighted: false },
  { key: "branding", label: "Branding", icon: Star, highlighted: false },
  { key: "illustration", label: "Illustration", icon: Palette, highlighted: false },
  { key: "ecommerce", label: "E-Commerce", icon: Monitor, highlighted: false },
  { key: "video", label: "Video", icon: Clapperboard, highlighted: false },
] as const;

const HOME_SIDEBAR_FALLBACK_ICONS: Record<
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

type HomePromptTagKey = (typeof PROMPT_TAGS)[number]["key"];
type HomePromptTagVisibility = Record<HomePromptTagKey, boolean>;

const FEATURED_PAGE_SIZE = 24;
const COMPOSER_PREFIX_DEFAULT = "让「FrameLoom」";
const CREATIVE_SCENE_PRESET =
  "创意场景：请围绕主体构建一个可直接生成的高级视觉方案，明确场景背景、主体动作、镜头视角、光影氛围、材质细节、色彩关系和商业设计感。画面需要有完整空间层次，避免空泛描述。";

function SidebarSvgIcon({
  iconUrl,
  fallback: FallbackIcon,
  imgClassName,
  fallbackClassName,
}: {
  iconUrl?: string | null;
  fallback: LucideIcon;
  imgClassName: string;
  fallbackClassName: string;
}) {
  if (iconUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={imgClassName}
        src={iconUrl}
      />
    );
  }

  return <FallbackIcon className={fallbackClassName} />;
}

function normalizeComposerPreviewTail(text: string, fixedPrefix: string) {
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

function getUserInitials(user: HomeUser | null) {
  const source = (user?.name || user?.email || "mu").trim();
  if (!source) return "mu";
  return source.slice(0, 2).toLowerCase();
}

function getComposerModelType(capabilities: unknown) {
  if (!capabilities || typeof capabilities !== "object") return "";
  return String(
    (capabilities as Record<string, unknown>).modelType ||
      (capabilities as Record<string, unknown>).modelCategory ||
      (capabilities as Record<string, unknown>).providerModelType ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isVideoComposerModel(model?: ModelOption | null) {
  if (!model || model.id === "auto") return false;
  const providerType = String(model.providerType || "").toLowerCase();
  const modelId = String(model.modelId || model.id || "").toLowerCase();
  const displayName = String(model.displayName || "").toLowerCase();
  const capabilities = model.capabilities || {};
  const modelType = getComposerModelType(capabilities);
  const supportedModes = Array.isArray(
    (capabilities as { supportedModes?: unknown }).supportedModes
  )
    ? ((capabilities as { supportedModes?: unknown[] }).supportedModes || [])
    : [];

  if (modelType === "video-generation") return true;
  if (
    modelType === "image-generation" ||
    modelType === "audio" ||
    modelType === "chat" ||
    modelType === "multimodal-chat"
  ) {
    return false;
  }

  return Boolean(
    model.videoToolCapability ||
      providerType.includes("video") ||
      providerType.includes("kling") ||
      providerType.includes("seedance") ||
      providerType.includes("omni") ||
      model.imageGenConfig?.creditCostPerVideo ||
      supportedModes.some((mode) =>
        ["text-to-video", "first-frame", "first-last-frame", "reference-images"].includes(
          String(mode || "").trim()
        )
      ) ||
      /\b(veo|sora|kling|seedance|grok video|omni flash)\b/.test(
        `${modelId} ${displayName}`
      )
  );
}

function isImageComposerModel(model?: ModelOption | null) {
  if (!model || model.id === "auto") return false;
  const modelType = getComposerModelType(model.capabilities);
  if (modelType === "image-generation") return true;
  if (
    modelType === "video-generation" ||
    modelType === "audio" ||
    modelType === "chat" ||
    modelType === "multimodal-chat"
  ) {
    return false;
  }
  return model.supportsImageGen !== false && !isVideoComposerModel(model);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatProviderMoney(cents?: number | null, currency = "CNY") {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "-";
  const value = cents / 100;
  const prefix = currency === "CNY" ? "¥" : `${currency} `;
  return `${prefix}${value.toFixed(2)}`;
}

function maskProviderCredential(prefix?: string | null, suffix?: string | null) {
  if (!prefix && !suffix) return "已保存";
  return `${prefix || "****"}...${suffix || "****"}`;
}

function revokeHomePreviewUrl(url?: string) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function AccountMenuItem({
  accent = false,
  icon: Icon,
  label,
  onClick,
}: {
  accent?: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
        accent
          ? "bg-[#dfff1f] text-black shadow-[0_10px_26px_rgba(190,255,0,0.22)] hover:bg-[#d4f716] dark:bg-[#dfff1f] dark:text-black dark:hover:bg-[#d4f716]"
          : "text-black/78 hover:bg-black/[0.045] dark:text-white/82 dark:hover:bg-white/[0.07]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          accent
            ? "bg-black text-[#dfff1f]"
            : "bg-black/[0.055] text-black/64 dark:bg-white/[0.08] dark:text-white/68"
        )}
      >
        <Icon className="h-[16px] w-[16px]" />
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export function DesignHome({
  user: initialUser = null,
  isAuthenticated: initialIsAuthenticated = false,
  demoGuestMode = false,
  siteName: initialSiteName = DEFAULT_SITE_NAME,
  siteLogo: initialSiteLogo = null,
  siteLogoDark: initialSiteLogoDark = null,
  surpriseCategories: initialSurpriseCategories = ["全部", "精选"],
  heroPromoText: initialHeroPromoText = null,
  heroPromoActionText: initialHeroPromoActionText = null,
  heroTitleText: initialHeroTitleText = null,
  heroSubtitleText: initialHeroSubtitleText = null,
}: DesignHomeProps = {}) {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [isProjectsOnlyView, setIsProjectsOnlyView] = useState(false);
  const [accountCenterOpen, setAccountCenterOpen] = useState(false);
  const [accountCenterTab, setAccountCenterTab] = useState<
    "account" | "providerUsage" | "usage" | "billing"
  >("account");
  const [usageFilter, setUsageFilter] = useState<"all" | "consumed" | "earned">("all");
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [personalProviderCredentialDraft, setPersonalProviderCredentialDraft] =
    useState({
      providerType: "",
      apiKey: "",
    });
  const [
    isSavingPersonalProviderCredential,
    setIsSavingPersonalProviderCredential,
  ] = useState(false);
  const [
    deletingPersonalProviderCredentialType,
    setDeletingPersonalProviderCredentialType,
  ] = useState<string | null>(null);
  const [imageParams, setImageParams] = useState<ImageGenerationParams>({
    aspectRatio: "auto",
    imageSize: "2K",
    imageCount: 1,
  });
  const [composerToolMode, setComposerToolMode] =
    useState<HomeComposerToolMode>("agent");
  const [composerModelId, setComposerModelId] = useState("auto");
  const [hasComposerModelInteracted, setHasComposerModelInteracted] =
    useState(false);
  const [isComposerAgentModeActive, setIsComposerAgentModeActive] =
    useState(true);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState("");
  const [ImageAnnotatorLazy, setImageAnnotatorLazy] =
    useState<ImageAnnotatorComponent | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [typedPreviewText, setTypedPreviewText] = useState("");
  const [previewCursorVisible, setPreviewCursorVisible] = useState(true);
  const [isSecondaryDataReady, setIsSecondaryDataReady] = useState(false);
  const [isFeaturedDataReady, setIsFeaturedDataReady] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const projectSectionRef = useRef<HTMLDivElement | null>(null);
  const featuredSectionRef = useRef<HTMLElement | null>(null);
  const featuredLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const filesRef = useRef<UploadFileItem[]>([]);

  const { data: sessionData } = useSWR<HomeSessionResponse>(
    "/api/auth/validate-session",
    fetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const user = sessionData?.user ?? initialUser;
  const isAuthenticated = sessionData?.valid ?? initialIsAuthenticated;
  const isTeamAdminUser =
    user?.teamRole === "admin" || user?.teamRole === "owner";
  const isLocalDevAuthSession =
    process.env.NODE_ENV !== "production" &&
    user?.id === LOCAL_DEV_AUTH_USER_ID;

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const loadSecondaryData = () => setIsSecondaryDataReady(true);
    const idleWindow = window as Window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(loadSecondaryData, {
        timeout: 1200,
      });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(loadSecondaryData, 550);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isFeaturedDataReady) {
      return;
    }

    const loadFeaturedData = () => setIsFeaturedDataReady(true);
    const fallbackTimer = window.setTimeout(loadFeaturedData, 2500);

    if (!featuredSectionRef.current || !("IntersectionObserver" in window)) {
      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadFeaturedData();
        }
      },
      { rootMargin: "900px 0px 900px 0px" }
    );

    observer.observe(featuredSectionRef.current);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [isFeaturedDataReady]);

  const { data: canvasData, mutate: mutateCanvas } = useSWR<{
    success: boolean;
    data: CanvasProject[];
  }>(
    isAuthenticated && isSecondaryDataReady
      ? "/api/canvas?workspaceType=all"
      : null,
    fetcher
  );

  const { data: featuredPages, size: featuredPageCount, setSize: setFeaturedPageCount, isValidating: isFeaturedValidating } =
    useSWRInfinite<FeaturedResponse>(
      (pageIndex, previousPageData) => {
        if (!isSecondaryDataReady || !isFeaturedDataReady) {
          return null;
        }
        if (
          previousPageData?.pagination &&
          previousPageData.pagination.page >= previousPageData.pagination.totalPages
        ) {
          return null;
        }

        return `/api/featured?page=${pageIndex + 1}&pageSize=${FEATURED_PAGE_SIZE}`;
      },
      fetcher,
      {
        revalidateFirstPage: false,
        parallel: false,
      }
    );

  const { data: membershipData } = useSWR<MembershipSummaryResponse>(
    isAuthenticated && isSecondaryDataReady && !isLocalDevAuthSession
      ? "/api/user/membership-summary"
      : null,
    fetcher
  );

  const { data: accountCenterData, mutate: mutateAccountCenter } = useSWR<AccountCenterResponse>(
    isAuthenticated && accountCenterOpen && !isLocalDevAuthSession
      ? "/api/user/account-center"
      : null,
    fetcher
  );

  const { data: modelsData } = useSWR<{
    models: ModelOption[];
    agentModel?: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
      providerType: string;
      imageGenConfig?: {
        maxImages?: number;
        supportsSize?: boolean;
        supports1K?: boolean;
        supports2K?: boolean;
        supports4K?: boolean;
        supportsPromptExtend?: boolean;
        supportsNegativePrompt?: boolean;
        supportsWatermark?: boolean;
        supportsSeed?: boolean;
        creditCostPerImage?: number;
        creditCostPerVideo?: number;
        videoDurationOptions?: number[];
        creditCostPerVideoByDuration?: Record<string, number>;
        creditCostPerVideoByResolution?: Record<string, number>;
      } | null;
    } | null;
  }>(
    (isAuthenticated || demoGuestMode) &&
      isSecondaryDataReady &&
      !isLocalDevAuthSession
      ? "/api/models?includeUnavailable=1"
      : null,
    fetcher
  );

  const { data: siteSettingsData } = useSWR<{
    siteName?: string | null;
    siteLogo?: string | null;
    siteLogoDark?: string | null;
    homePromoText?: string | null;
    homePromoActionText?: string | null;
    homeHeroTitle?: string | null;
    homeHeroSubtitle?: string | null;
    surpriseCategories?: string[];
    canvasDefaultModelId?: string | null;
    homeComposerPrefix?: string | null;
    homeComposerPreviewTexts?: string[];
    homePromptTagVisibility?: Partial<HomePromptTagVisibility>;
    contactConfig?: ContactConfig;
    membershipConfig?: {
      enabled?: boolean;
    };
    agentEnabled?: boolean;
    videoCanvasEnabled?: boolean;
    dulupayConfig?: {
      enabled?: boolean;
      defaultType?: string;
    };
    homeSidebarConfig?: unknown;
    homeQuickStartConfig?: HomeQuickStartConfig | unknown;
  }>("/api/site-settings?scope=home", fetcher);

  const siteName = resolveDefaultSiteName(
    siteSettingsData?.siteName || initialSiteName
  );
  const siteLogo = resolveDefaultSiteLogo(
    siteSettingsData?.siteLogo || initialSiteLogo
  );
  const rawSiteLogoDark = String(
    siteSettingsData?.siteLogoDark || initialSiteLogoDark || ""
  ).trim();
  const siteLogoDark = rawSiteLogoDark
    ? resolveDefaultSiteLogo(rawSiteLogoDark)
    : "";
  const heroPromoText =
    siteSettingsData?.homePromoText ?? initialHeroPromoText;
  const heroPromoActionText =
    siteSettingsData?.homePromoActionText ?? initialHeroPromoActionText;
  const heroTitleText =
    siteSettingsData?.homeHeroTitle ?? initialHeroTitleText;
  const heroSubtitleText =
    siteSettingsData?.homeHeroSubtitle ?? initialHeroSubtitleText;
  const surpriseCategories =
    siteSettingsData?.surpriseCategories ?? initialSurpriseCategories;
  const isDarkHomeTheme = themeReady ? resolvedTheme === "dark" : false;
  const displayLogo =
    isDarkHomeTheme
      ? siteLogoDark || siteLogo || ""
      : siteLogo || siteLogoDark || "";
  const shouldInvertLogo =
    !siteLogoDark &&
    shouldInvertDefaultLogoForTheme(
      displayLogo,
      isDarkHomeTheme ? "dark" : "light"
    );

  const { data: homeAnimationData } = useSWR<{
    enabled?: boolean;
    htmlContent?: string;
    fileName?: string;
  }>(isSecondaryDataReady ? "/api/home-animation" : null, fetcher);

  const currentPlan = membershipData?.currentPlan;

  const autoComposerModel = useMemo<ModelOption>(
    () => ({
      id: "auto",
      modelId: "auto",
      displayName: "Agent 模式",
      providerType: "auto",
      supportsImageGen: true,
      avatarUrl: modelsData?.agentModel?.avatarUrl || null,
      imageGenConfig: modelsData?.agentModel?.imageGenConfig || undefined,
    }),
    [modelsData?.agentModel?.avatarUrl, modelsData?.agentModel?.imageGenConfig]
  );

  const composerModelOptions = useMemo<ModelOption[]>(() => {
    const seen = new Set<string>(["auto"]);
    const visualModels = (modelsData?.models || []).filter((model) => {
      if (!model?.id || seen.has(model.id)) return false;
      if (!isImageComposerModel(model) && !isVideoComposerModel(model)) {
        return false;
      }
      seen.add(model.id);
      return true;
    });
    return [autoComposerModel, ...visualModels];
  }, [autoComposerModel, modelsData?.models]);

  const imageComposerModels = useMemo(
    () => composerModelOptions.filter(isImageComposerModel),
    [composerModelOptions]
  );
  const videoComposerModels = useMemo(
    () => composerModelOptions.filter(isVideoComposerModel),
    [composerModelOptions]
  );
  const fallbackImageComposerModel = imageComposerModels[0] || autoComposerModel;
  const fallbackVideoComposerModel =
    videoComposerModels[0] || fallbackImageComposerModel;
  const activeDirectComposerModels =
    composerToolMode === "video" ? videoComposerModels : imageComposerModels;
  const fallbackComposerModel =
    composerToolMode === "video"
      ? fallbackVideoComposerModel
      : fallbackImageComposerModel;
  const selectedComposerModel =
    isComposerAgentModeActive || composerToolMode === "agent"
      ? autoComposerModel
      : activeDirectComposerModels.find((model) => model.id === composerModelId) ||
        fallbackComposerModel;
  const discoveryTabs = useMemo(() => {
    const configured = (surpriseCategories || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      // legacy typo compatibility: treat "惊喜" as "精选"
      .map((item) => (item === "惊喜" ? "精选" : item))
      .filter((item) => item !== "精选");

    const uniqueConfigured = Array.from(new Set(configured));
    if (uniqueConfigured.length > 0) {
      const configuredTabs = [
        "全部",
        ...uniqueConfigured.filter((item) => item !== "全部"),
      ];
      return Array.from(new Set(configuredTabs)).slice(0, 12);
    }

    return ["全部", ...DISCOVERY_DEFAULT_TABS].slice(0, 12);
  }, [surpriseCategories]);

  useEffect(() => {
    if (discoveryTabs.includes(activeCategory)) return;
    setActiveCategory(discoveryTabs[0] || "全部");
  }, [activeCategory, discoveryTabs]);

  const composerPreviewTexts = useMemo(() => {
    const configured = (siteSettingsData?.homeComposerPreviewTexts || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (configured.length > 0) {
      return configured;
    }

    return [
      "打造引人注目的社交媒体视觉",
      "帮我把这张产品图做成高级电商海报",
      "基于参考图延展 3 套同风格方案",
    ];
  }, [siteSettingsData?.homeComposerPreviewTexts]);

  const homeSidebarConfig = useMemo(
    () =>
      normalizeHomeSidebarConfig(siteSettingsData?.homeSidebarConfig),
    [siteSettingsData?.homeSidebarConfig]
  );
  const homeQuickStartConfig = useMemo(
    () => normalizeHomeQuickStartConfig(siteSettingsData?.homeQuickStartConfig),
    [siteSettingsData?.homeQuickStartConfig]
  );

  const getHomeSidebarItem = (key: HomeSidebarItemKey) =>
    homeSidebarConfig.items[key];

  const isHomeSidebarItemEnabled = (key: HomeSidebarItemKey) =>
    getHomeSidebarItem(key).enabled !== false;

  const composerFixedPrefix = useMemo(() => {
    return (
      String(siteSettingsData?.homeComposerPrefix || "").trim() ||
      COMPOSER_PREFIX_DEFAULT
    );
  }, [siteSettingsData?.homeComposerPrefix]);

  const composerPreviewTails = useMemo(() => {
    return composerPreviewTexts
      .map((text) => normalizeComposerPreviewTail(text, composerFixedPrefix))
      .filter(Boolean);
  }, [composerFixedPrefix, composerPreviewTexts]);

  const contactConfig = useMemo(
    () => ({
      phone: String(siteSettingsData?.contactConfig?.phone || "").trim(),
      wechatQrUrl: String(siteSettingsData?.contactConfig?.wechatQrUrl || "").trim(),
    }),
    [siteSettingsData?.contactConfig?.phone, siteSettingsData?.contactConfig?.wechatQrUrl]
  );

  const loadedFeaturedImages = useMemo(() => {
    return (featuredPages || []).flatMap((page) => page.images || []);
  }, [featuredPages]);

  const featuredPagination = featuredPages?.[featuredPages.length - 1]?.pagination;
  const hasMoreFeatured = Boolean(
    featuredPagination && featuredPagination.page < featuredPagination.totalPages
  );
  const isLoadingFeatured = !featuredPages && isFeaturedValidating;
  const isLoadingMoreFeatured =
    isFeaturedValidating &&
    !!featuredPages &&
    featuredPageCount > 0 &&
    featuredPageCount > featuredPages.length;

  const featuredItems = useMemo(() => {
    const images = loadedFeaturedImages;
    if (activeCategory === "全部") {
      return images;
    }
    return images.filter((item) =>
      item.featuredCategory
        ? String(item.featuredCategory) === activeCategory
        : String(item.prompt || "").toLowerCase().includes(activeCategory.toLowerCase())
    );
  }, [loadedFeaturedImages, activeCategory]);

  const recentProjects = useMemo(() => {
    const projects = canvasData?.data || [];
    return isProjectsOnlyView ? projects : projects.slice(0, 4);
  }, [canvasData?.data, isProjectsOnlyView]);

  const hasMoreProjects = useMemo(() => {
    return (canvasData?.data || []).length > 4;
  }, [canvasData?.data]);

  const filteredUsageRecords = useMemo(() => {
    const records = accountCenterData?.usageRecords || [];
    if (usageFilter === "all") return records;
    return records.filter((item) => item.status === usageFilter);
  }, [accountCenterData?.usageRecords, usageFilter]);

  const handleLogout = async () => {
    try {
      await clientSignOut({ callbackUrl: "/", redirect: false });
    } catch (_error) {}

    window.location.replace("/");
  };

  const handleLeaveTeam = async () => {
    const teamContext = accountCenterData?.team;
    if (!teamContext || isLeavingTeam) {
      return;
    }

    if (!teamContext.canLeave) {
      toast.error(teamContext.leaveBlockedReason || "当前无法退出团队");
      return;
    }

    const confirmed = window.confirm(
      `确定要退出「${teamContext.name}」吗？退出后你的新生成费用将回到个人账户承担。`
    );
    if (!confirmed) {
      return;
    }

    setIsLeavingTeam(true);
    try {
      const response = await apiFetch("/api/user/team/leave", {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "退出团队失败");
      }

      toast.success("已退出团队，正在刷新账号状态");
      await mutateAccountCenter();
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出团队失败");
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleSavePersonalProviderCredential = async () => {
    const apiKey = personalProviderCredentialDraft.apiKey.trim();

    if (!apiKey) {
      toast.error("请输入 API Key");
      return;
    }

    setIsSavingPersonalProviderCredential(true);
    try {
      const response = await apiFetch("/api/user/provider-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "API Key 保存失败");
      }

      setPersonalProviderCredentialDraft((current) => ({
        ...current,
        apiKey: "",
      }));
      await mutateAccountCenter();
      toast.success("API Key 已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API Key 保存失败");
    } finally {
      setIsSavingPersonalProviderCredential(false);
    }
  };

  const handleDeletePersonalProviderCredential = async (
    credential: ProviderCredentialRecord
  ) => {
    if (!window.confirm("删除 API Key 后，对应生图/生视频服务将不可用，确定删除吗？")) {
      return;
    }

    setDeletingPersonalProviderCredentialType(credential.providerType);
    try {
      const params = new URLSearchParams({
        providerType: credential.providerType,
      });
      const response = await apiFetch(
        `/api/user/provider-credentials?${params.toString()}`,
        { method: "DELETE" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "API Key 删除失败");
      }

      await mutateAccountCenter();
      toast.success("API Key 已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API Key 删除失败");
    } finally {
      setDeletingPersonalProviderCredentialType(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("home-image-params");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<ImageGenerationParams>;
      setImageParams((prev) => ({ ...prev, ...parsed }));
    } catch (error) {
      console.error("[DesignHome] Failed to load image params:", error);
    }
  }, []);

  useEffect(() => {
    if (isComposerAgentModeActive || composerToolMode === "agent") {
      if (composerModelId !== "auto") {
        setComposerModelId("auto");
      }
      return;
    }

    const fallbackModelId = fallbackComposerModel.id || "auto";

    if (
      !hasComposerModelInteracted &&
      !isComposerAgentModeActive &&
      composerModelId === "auto" &&
      fallbackModelId !== "auto"
    ) {
      setComposerModelId(fallbackModelId);
      return;
    }

    if (activeDirectComposerModels.some((model) => model.id === composerModelId)) {
      return;
    }

    setComposerModelId(fallbackModelId);
  }, [
    activeDirectComposerModels,
    composerModelId,
    composerToolMode,
    fallbackComposerModel.id,
    hasComposerModelInteracted,
    isComposerAgentModeActive,
  ]);

  const handleComposerModelChange = useCallback((modelId: string) => {
    const nextModel = composerModelOptions.find((model) => model.id === modelId);
    const nextMode = modelId === "auto"
      ? "agent"
      : isVideoComposerModel(nextModel)
        ? "video"
        : "auto";
    setHasComposerModelInteracted(true);
    setIsComposerAgentModeActive(modelId === "auto");
    setComposerToolMode(nextMode);
    setComposerModelId(modelId);
  }, [composerModelOptions]);

  const handleComposerToolModeChange = useCallback(
    (mode: HomeComposerToolMode) => {
      setComposerToolMode(mode);
      setHasComposerModelInteracted(true);

      if (mode === "agent") {
        setIsComposerAgentModeActive(true);
        setComposerModelId("auto");
        setImageParams((prev) => {
          const { enableWebSearch: _enableWebSearch, promptExtend: _promptExtend, ...rest } = prev;
          return rest;
        });
        return;
      }

      const isVideoMode = mode === "video";
      const fallbackModelId = isVideoMode
        ? fallbackVideoComposerModel.id || fallbackImageComposerModel.id || ""
        : fallbackImageComposerModel.id || fallbackVideoComposerModel.id || "";

      setIsComposerAgentModeActive(false);
      setComposerModelId(fallbackModelId);
      setImageParams((prev) => ({
        ...prev,
        enableWebSearch:
          mode === "inspiration"
            ? true
            : isVideoMode
              ? false
              : prev.enableWebSearch ?? false,
        promptExtend:
          mode === "creative"
            ? true
            : isVideoMode
              ? false
              : prev.promptExtend ?? false,
      }));
    },
    [fallbackImageComposerModel.id, fallbackVideoComposerModel.id]
  );

  const handleComposerImageParamsChange = useCallback(
    (params: Partial<ImageGenerationParams>) => {
      setImageParams((prev) => ({
        ...prev,
        ...params,
      }));
    },
    []
  );

  useEffect(() => {
    if (!featuredLoadMoreRef.current || !hasMoreFeatured) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMoreFeatured) return;
        setFeaturedPageCount((current) => current + 1);
      },
      { rootMargin: "1000px 0px 1200px 0px" }
    );

    observer.observe(featuredLoadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMoreFeatured, isLoadingMoreFeatured, setFeaturedPageCount]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (composerPreviewTails.length === 0) {
      setTypedPreviewText("");
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    let textIndex = 0;
    let charIndex = 0;

    const typeForward = () => {
      if (disposed) return;
      const currentText = composerPreviewTails[textIndex] || "";

      if (charIndex < currentText.length) {
        charIndex += 1;
        setTypedPreviewText(currentText.slice(0, charIndex));
        timer = setTimeout(typeForward, 55);
        return;
      }

      if (composerPreviewTails.length === 1) {
        setTypedPreviewText(currentText);
        return;
      }

      timer = setTimeout(typeBackward, 1200);
    };

    const typeBackward = () => {
      if (disposed) return;
      const currentText = composerPreviewTails[textIndex] || "";

      if (charIndex > 0) {
        charIndex -= 1;
        setTypedPreviewText(currentText.slice(0, charIndex));
        timer = setTimeout(typeBackward, 35);
        return;
      }

      textIndex = (textIndex + 1) % composerPreviewTails.length;
      timer = setTimeout(typeForward, 260);
    };

    setTypedPreviewText("");
    timer = setTimeout(typeForward, 260);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [composerPreviewTails]);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setPreviewCursorVisible((value) => !value);
    }, 450);

    return () => clearInterval(blinkTimer);
  }, []);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (!showImageEditor || ImageAnnotatorLazy) {
      return;
    }

    let disposed = false;
    void import("@/src/components/image-annotator").then((module) => {
      if (!disposed) {
        setImageAnnotatorLazy(() => module.ImageAnnotator);
      }
    });

    return () => {
      disposed = true;
    };
  }, [ImageAnnotatorLazy, showImageEditor]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => revokeHomePreviewUrl(item.previewUrl));
    };
  }, []);

  async function ensureUploadProviderCredential() {
    if (!isAuthenticated) {
      redirectToLogin("/canvas?new=1");
      return false;
    }

    try {
      const response = await apiFetch("/api/provider-credentials/upload-guard", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (response.status === 401) {
        redirectToLogin("/canvas?new=1");
        return false;
      }

      if (!response.ok || payload?.success === false) {
        const opened = dispatchProviderApiKeyPromptFromError(payload);
        if (!opened) {
          dispatchProviderApiKeyPrompt({
            code: payload?.code || "provider_api_key_required",
            error: payload?.error || "请先配置 API Key 后再上传图片。",
            providerType: payload?.providerType || null,
            providerLabel: payload?.providerLabel || null,
            scopeType:
              payload?.scopeType === "team" || user?.teamId ? "team" : "personal",
            apiKeyUrl: payload?.apiKeyUrl || null,
          });
        }
        return false;
      }

      return true;
    } catch (error) {
      if (dispatchProviderApiKeyPromptFromError(error)) {
        return false;
      }
      toast.error("API Key 状态检查失败，请稍后重试");
      return false;
    }
  }

  const handleAddFiles = async (targetFiles: FileList | null) => {
    if (!targetFiles || targetFiles.length === 0) return;

    const accepted = Array.from(targetFiles)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 6);

    if (accepted.length === 0) {
      toast.error("请上传图片文件");
      return;
    }

    const canUpload = await ensureUploadProviderCredential();
    if (!canUpload) return;

    const next = accepted.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      name: file.name,
      contentType: file.type || "image/jpeg",
      previewUrl: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...next].slice(0, 6));
  };

  const handleAddRemoteImage = (image: InspirationImageResult) => {
    if (!image?.imageUrl) return;

    const title = String(image.title || "灵感参考图").trim().slice(0, 80);
    const attachment: CanvasLaunchAttachment = {
      url: image.imageUrl,
      name: title || "灵感参考图",
      contentType: image.contentType || "image/jpeg",
    };

    setFiles((prev) => {
      if (prev.some((item) => item.remoteAttachment?.url === attachment.url)) {
        toast.info("这张参考图已经添加过了");
        return prev;
      }

      return [
        ...prev,
        {
          id: `remote-${image.id}-${Date.now()}`,
          previewUrl: image.thumbnailUrl || image.imageUrl,
          name: attachment.name,
          contentType: attachment.contentType,
          remoteAttachment: attachment,
        },
      ].slice(0, 6);
    });
    setImageParams((prev) => ({
      ...prev,
      enableWebSearch: true,
    }));
    toast.success("已添加灵感参考图");
  };

  const handleApplyCreativeScenePreset = useCallback(() => {
    setPrompt((current) => {
      const trimmed = current.trim();
      if (trimmed.includes("创意场景：")) {
        return current;
      }
      return trimmed ? `${trimmed}\n\n${CREATIVE_SCENE_PRESET}` : CREATIVE_SCENE_PRESET;
    });
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        revokeHomePreviewUrl(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const uploadSelectedFiles = async (): Promise<CanvasLaunchAttachment[]> => {
    const result: CanvasLaunchAttachment[] = [];

    for (const item of files) {
      if (item.remoteAttachment) {
        result.push(item.remoteAttachment);
        continue;
      }
      if (!item.file) {
        continue;
      }

      const formData = new FormData();
      formData.append("file", item.file);

      const response = await fetchUploadWithRetry(formData);
      if (!response.ok) {
        throw await createUploadErrorFromResponse(response, "上传失败");
      }
      const data = await response.json();
      if (!data?.url) {
        throw new Error("上传成功，但未返回可用图片地址");
      }

      result.push({
        url: data.url,
        name: item.name || item.file.name,
        contentType: item.contentType || item.file.type || "image/jpeg",
        assetId: typeof data.assetId === "string" ? data.assetId : undefined,
      });
    }

    return result;
  };

  const redirectToLogin = useCallback(
    (callbackUrl = "/") => {
      const safeCallbackUrl =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
      if (typeof window !== "undefined") {
        const targetUrl = new URL(loginUrl, window.location.origin);

        if (
          window.location.pathname === targetUrl.pathname &&
          window.location.search === targetUrl.search
        ) {
          window.location.reload();
          return;
        }

        window.location.assign(targetUrl.toString());
        return;
      }
      router.push(loginUrl);
    },
    [router]
  );

  const handleImageEditorConfirm = async (annotatedImageUrl: string) => {
    let finalUrl = annotatedImageUrl;

    if (annotatedImageUrl.startsWith("data:")) {
      try {
        const response = await fetch(annotatedImageUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, `edited-${Date.now()}.png`);
        const uploadResponse = await fetchUploadWithRetry(formData);

        if (!uploadResponse.ok) {
          throw await createUploadErrorFromResponse(uploadResponse, "上传失败");
        }

        const result = await uploadResponse.json();
        finalUrl = result.url;
      } catch (error) {
        const message = getUploadErrorMessage(error, "上传失败");
        if (message) {
          toast.error(message);
        }
        return;
      }
    }

    try {
      const response = await fetch(finalUrl);
      const blob = await response.blob();
      const extension =
        blob.type === "image/jpeg"
          ? "jpg"
          : blob.type === "image/webp"
            ? "webp"
            : "png";
      const file = new File([blob], `edited-${Date.now()}.${extension}`, {
        type: blob.type || "image/png",
      });

      setFiles((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: finalUrl,
        },
      ]);
      setShowImageEditor(false);
      setEditorImageUrl("");
      toast.success("已添加到对话框");
    } catch (_error) {
      toast.error("图片处理失败，请重试");
    }
  };

  const handleImageEditorCancel = () => {
    setShowImageEditor(false);
    setEditorImageUrl("");
  };

  const createCanvasFromComposer = async () => {
    if (!isAuthenticated) {
      redirectToLogin("/canvas?new=1");
      return;
    }

    if (!prompt.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      const uploadedAttachments = await uploadSelectedFiles();
      const title = prompt.trim()
        ? prompt.trim().slice(0, 24)
        : `新建项目 ${new Date().toLocaleDateString("zh-CN")}`;

      let canvasId = "";

      if (isLocalDevAuthSession) {
        canvasId = crypto.randomUUID();
        toast.info("本地数据库暂不可用，已创建临时画布");
      } else {
        try {
          const canvasResponse = await apiFetch("/api/canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          const canvasResult = await canvasResponse.json().catch(() => null);

          if (canvasResponse.status === 401) {
            redirectToLogin("/");
            return;
          }

          if (!canvasResponse.ok || !canvasResult?.data?.id) {
            throw new Error(canvasResult?.error || "创建项目失败");
          }

          canvasId = canvasResult.data.id;
        } catch (error) {
          if (process.env.NODE_ENV === "production") {
            throw error;
          }

          canvasId = crypto.randomUUID();
          console.warn("[Home] Using temporary local canvas because creation failed:", error);
          toast.info("本地数据库暂不可用，已创建临时画布");
        }
      }

      if (typeof window !== "undefined") {
        const isAgentLaunch =
          isComposerAgentModeActive || composerToolMode === "agent";
        const isVideoLaunch = composerToolMode === "video";
        const launchComposerMode =
          isAgentLaunch ? "agent" : isVideoLaunch ? "video" : "image";
        const launchImageParams = {
          ...imageParams,
          enableWebSearch:
            composerToolMode === "inspiration"
              ? true
              : isAgentLaunch || isVideoLaunch
                ? false
                : imageParams.enableWebSearch,
          promptExtend:
            composerToolMode === "creative"
              ? true
              : isVideoLaunch
                ? false
                : imageParams.promptExtend,
        };

        sessionStorage.setItem(
          getCanvasLaunchStorageKey(canvasId),
          JSON.stringify({
            prompt:
              prompt.trim() ||
              (uploadedAttachments.length > 0
                ? "请基于这些图片继续生成设计方案"
                : ""),
            attachments: uploadedAttachments,
            autoSend: true,
            createdAt: Date.now(),
            selectedModelId: launchComposerMode === "agent"
              ? "auto"
              : selectedComposerModel.id || fallbackComposerModel.id || "",
            composerMode: launchComposerMode,
            imageParams: launchImageParams,
          })
        );
      }

      files.forEach((item) => revokeHomePreviewUrl(item.previewUrl));
      setFiles([]);
      setPrompt("");
      await mutateCanvas();
      router.push(`/canvas/${canvasId}`);
    } catch (error) {
      const message = getUploadErrorMessage(error, "创建项目失败");
      if (message) {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVideoCanvas = () => {
    if (!isAuthenticated) {
      redirectToLogin("/video-canvas");
      return;
    }
    router.push("/video-canvas");
  };

  const openNewCanvas = () => {
    if (!isAuthenticated) {
      redirectToLogin("/canvas?new=1");
      return;
    }
    router.push("/canvas?new=1");
  };

  const handleDeleteProject = async (projectId: string, projectTitle?: string) => {
    if (deletingProjectId === projectId) return;

    const normalizedTitle = String(projectTitle || "").trim() || "未命名画布";
    const confirmed = window.confirm(`确定删除「${normalizedTitle}」吗？删除后不可恢复。`);
    if (!confirmed) return;

    setDeletingProjectId(projectId);
    try {
      const response = await apiFetch(`/api/canvas/${projectId}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || "删除画布失败");
      }

      await mutateCanvas((current) => {
        if (!current) return current;
        return {
          ...current,
          data: (current.data || []).filter((project) => project.id !== projectId),
        };
      }, false);
      toast.success("画布已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除画布失败");
      await mutateCanvas();
    } finally {
      setDeletingProjectId(null);
    }
  };

  const openAllProjectsInPage = () => {
    if (!isAuthenticated) {
      redirectToLogin("/");
      return;
    }
    setIsProjectsOnlyView(true);
    projectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleQuickStartPrompt = (quickStartPrompt: string) => {
    setIsProjectsOnlyView(false);
    setPrompt(quickStartPrompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderHomeSidebarIcon = (
    key: HomeSidebarItemKey,
    options?: {
      active?: boolean;
      filled?: boolean;
      sizeClassName?: string;
    }
  ) => {
    const item = getHomeSidebarItem(key);
    const FallbackIcon = HOME_SIDEBAR_FALLBACK_ICONS[key];
    const sizeClassName = options?.sizeClassName || "h-[18px] w-[18px]";

    if (options?.filled) {
      return (
        <SidebarSvgIcon
          iconUrl={item.iconUrl}
          fallback={FallbackIcon}
          imgClassName={cn(sizeClassName, "object-contain", "brightness-0 invert")}
          fallbackClassName={cn(sizeClassName, "text-white")}
        />
      );
    }

    return (
      <SidebarSvgIcon
        iconUrl={item.iconUrl}
        fallback={FallbackIcon}
        imgClassName={cn(
          sizeClassName,
          "object-contain",
          options?.active
            ? "brightness-0 opacity-90 dark:invert dark:opacity-95"
            : "brightness-0 opacity-88 dark:invert dark:opacity-72"
        )}
        fallbackClassName={cn(
          sizeClassName,
          options?.active
            ? "text-[#202020] dark:text-white"
            : "text-[#202020] dark:text-white/72"
        )}
      />
    );
  };

  const composerPlaceholder = `${composerFixedPrefix}${typedPreviewText}${
    previewCursorVisible ? " |" : ""
  }`;

  const userInitials = useMemo(() => getUserInitials(user), [user]);
  const userDisplayName = useMemo(() => {
    if (!user) return "";
    return (user.name || user.email || "用户").toString();
  }, [user]);

  const accountProfile = useMemo(() => {
    return {
      name: accountCenterData?.profile?.name || userDisplayName || "用户",
      email: accountCenterData?.profile?.email || user?.email || "",
      planName: accountCenterData?.profile?.currentPlanName || currentPlan?.name || "Free",
      availablePoints:
        accountCenterData?.profile?.availablePoints ?? membershipData?.summary?.currentCredits ?? 0,
      monthlyCredits:
        accountCenterData?.profile?.monthlyCredits ?? currentPlan?.monthlyCredits ?? 0,
      dailyFreeCredits:
        accountCenterData?.profile?.dailyFreeCredits ?? membershipData?.summary?.dailyFreeCredits ?? 0,
      billingMode: accountCenterData?.profile?.billingMode || "personal",
    };
  }, [accountCenterData?.profile, currentPlan?.monthlyCredits, currentPlan?.name, membershipData?.summary?.currentCredits, membershipData?.summary?.dailyFreeCredits, user?.email, userDisplayName]);
  const accountTeam = accountCenterData?.team || null;
  const accountProviderCredentials = accountCenterData?.providerCredentials;
  const providerUsageSnapshots = accountCenterData?.providerUsage?.snapshots || [];
  const providerUsageRecords = accountCenterData?.providerUsage?.records || [];
  const primaryProviderUsage = providerUsageSnapshots[0] || null;
  const providerUsageStatusLabel = primaryProviderUsage?.isBlocked
    ? "已暂停"
    : primaryProviderUsage?.apiKeyStatus || "可用";
  const providerUsageStatusClass = primaryProviderUsage?.isBlocked
    ? "text-red-600 dark:text-red-300"
    : "text-[#0f8a3c] dark:text-[#48d98a]";
  const personalProviderCredentialOptions =
    accountProviderCredentials?.providerOptions || [];
  const selectedPersonalProviderType =
    personalProviderCredentialDraft.providerType ||
    personalProviderCredentialOptions[0]?.type ||
    "";
  const selectedPersonalProviderOption =
    personalProviderCredentialOptions.find(
      (option) => option.type === selectedPersonalProviderType
    );
  const personalProviderCredentials =
    accountProviderCredentials?.credentials || [];
  const selectedThemeMode: ThemeMode =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  const selectedThemeOption =
    THEME_MODE_OPTIONS.find((option) => option.value === selectedThemeMode) ||
    THEME_MODE_OPTIONS[0];
  const ThemeTriggerIcon = isDarkHomeTheme ? Moon : Sun;
  const sidebarControlBaseClass =
    "relative flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent bg-transparent transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/35";
  const sidebarControlButtonClass = cn(
    sidebarControlBaseClass,
    isDarkHomeTheme
      ? "text-white/62 hover:bg-white/[0.08] hover:text-white data-[state=open]:bg-white/[0.08] data-[state=open]:text-white"
      : "text-[#6b7280] hover:bg-black/[0.07] hover:text-[#111827] data-[state=open]:bg-black/[0.07] data-[state=open]:text-[#111827]"
  );
  const mobileLoginButtonClass = cn(
    "fixed right-4 top-4 z-[120] flex h-10 w-10 items-center justify-center rounded-[12px] border transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/35 lg:hidden",
    isDarkHomeTheme
      ? "border-white/10 bg-[#17191f]/92 text-white/72 shadow-[0_12px_28px_rgba(0,0,0,0.28)] hover:bg-[#20232b] hover:text-white"
      : "border-black/10 bg-white/92 text-[#687180] shadow-[0_12px_28px_rgba(18,24,33,0.12)] hover:bg-white hover:text-[#111827]"
  );
  const sidebarAccountControls = (
    <>
      <button
        className={sidebarControlButtonClass}
        title="通知"
        type="button"
      >
        <Bell className="h-4 w-4" strokeWidth={1.95} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={sidebarControlButtonClass}
            title={`主题模式：${selectedThemeOption.label}`}
            aria-label={`主题模式：${selectedThemeOption.label}`}
          >
            <ThemeTriggerIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="right"
          sideOffset={16}
          className={cn(
            "!min-w-0 w-auto rounded-[18px] p-1.5 shadow-xl",
            isDarkHomeTheme
              ? "border-white/10 bg-[#141416]"
              : "border-black/10 bg-white"
          )}
        >
          <div className="flex items-center gap-1">
            {THEME_MODE_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = selectedThemeMode === option.value;

              return (
                <DropdownMenuItem
                  key={option.value}
                  aria-label={option.label}
                  className={cn(
                    "flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[10px] p-0",
                    isDarkHomeTheme
                      ? "text-white/70 focus:bg-white/8"
                      : "text-[#5b6472] focus:bg-black/5",
                    isSelected &&
                      (isDarkHomeTheme
                        ? "bg-white text-black focus:bg-white focus:text-black"
                        : "bg-black text-white focus:bg-black focus:text-white")
                  )}
                  onSelect={() => setTheme(option.value)}
                  title={option.label}
                >
                  <OptionIcon className="h-[15px] w-[15px]" />
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAuthenticated ? (
        <HoverCard openDelay={80} closeDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#d4551f] text-[12px] font-semibold text-white transition duration-200 hover:-translate-y-0.5"
              aria-label="Account menu"
            >
              {userInitials}
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            align="end"
            side="right"
            sideOffset={8}
            className={cn(
              "w-[300px] origin-bottom-left scale-[0.8] rounded-3xl p-0 shadow-xl",
              isDarkHomeTheme
                ? "border border-white/10 bg-[#141416] text-white"
                : "border border-black/10 bg-white text-[#101318] shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
            )}
          >
            <div className="p-3.5">
              <div
                className={cn(
                  "rounded-3xl p-3.5",
                  isDarkHomeTheme
                    ? "border border-white/10 bg-[#19191d]"
                    : "border border-black/10 bg-[#f7f8fa]"
                )}
              >
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4551f] text-[14px] font-semibold text-white">
                    {userInitials}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate text-[15px] font-semibold",
                        isDarkHomeTheme ? "text-white" : "text-[#101318]"
                      )}
                    >
                      {userDisplayName}
                    </div>
                    <div
                      className={cn(
                        "truncate text-[12px]",
                        isDarkHomeTheme ? "text-white/45" : "text-[#687386]"
                      )}
                    >
                      {user?.email || ""}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-4 border-t pt-3",
                    isDarkHomeTheme ? "border-white/10" : "border-black/10"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-1 py-1 text-[13px] font-semibold transition-colors",
                      isDarkHomeTheme
                        ? "text-white/80 hover:bg-white/6"
                        : "text-[#101318] hover:bg-black/[0.045]"
                    )}
                    onClick={() => {
                      setAccountCenterTab("account");
                      setUsageFilter("all");
                      setAccountCenterOpen(true);
                    }}
                  >
                    <span>积分</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 text-[13px] font-semibold",
                        isDarkHomeTheme ? "text-white/55" : "text-[#687386]"
                      )}
                    >
                      {membershipData?.summary?.currentCredits ?? 0}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <AccountMenuItem
                  icon={User}
                  label="账户管理"
                  onClick={() => {
                    setAccountCenterTab("account");
                    setUsageFilter("all");
                    setAccountCenterOpen(true);
                  }}
                />
                <AccountMenuItem
                  accent
                  icon={KeyRound}
                  label="API Key 配置"
                  onClick={() => {
                    dispatchProviderApiKeyPrompt({
                      error: "请先配置 API Key。",
                      scopeType: "personal",
                    });
                  }}
                />
                <AccountMenuItem
                  icon={ImageIcon}
                  label="个人生成记录"
                  onClick={() => {
                    setAccountCenterTab("providerUsage");
                    setUsageFilter("all");
                    setAccountCenterOpen(true);
                  }}
                />
                {isTeamAdminUser ? (
                  <AccountMenuItem
                    icon={Settings}
                    label="团队系统设置"
                    onClick={() => router.push("/team-admin")}
                  />
                ) : null}
                <AccountMenuItem
                  icon={Mail}
                  label="联系我们"
                  onClick={() => setContactDialogOpen(true)}
                />
                <AccountMenuItem
                  icon={LogOut}
                  label="退出登录"
                  onClick={() => {
                    void handleLogout();
                  }}
                />
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <Link
          aria-label="登录"
          className={sidebarControlButtonClass}
          href="/login?callbackUrl=%2F"
          onClick={(event) => {
            event.preventDefault();
            redirectToLogin("/");
          }}
          onPointerDown={(event) => {
            if (
              event.button !== 0 ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            ) {
              return;
            }
            event.preventDefault();
            redirectToLogin("/");
          }}
          title="登录"
        >
          <User className="h-4 w-4" strokeWidth={1.95} />
        </Link>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative min-h-svh overflow-x-hidden [&_button]:cursor-pointer [&_input]:cursor-pointer [&_img]:cursor-pointer [&_a]:cursor-pointer [&_[role=button]]:cursor-pointer",
        isDarkHomeTheme
          ? "bg-[#080809] text-zinc-100"
          : "bg-[#f8f9fa] text-[#171717]"
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed left-0 top-0 h-[260px] w-[1052px] blur-[52px]",
          isDarkHomeTheme ? "opacity-70" : "opacity-22"
        )}
        style={{
          background: isDarkHomeTheme
            ? "radial-gradient(circle at 24% 0%, rgb(var(--brand-accent-rgb) / 0.16), transparent 48%), radial-gradient(circle at 58% 8%, rgba(170, 78, 132, 0.13), transparent 42%)"
            : "radial-gradient(circle at 24% 0%, rgb(var(--brand-accent-rgb) / 0.11), transparent 48%), radial-gradient(circle at 58% 8%, rgba(130, 116, 255, 0.08), transparent 42%)",
        }}
      />
      <HomeSidebar
        accountControls={sidebarAccountControls}
        agentEnabled={false}
        getItem={getHomeSidebarItem}
        isEnabled={isHomeSidebarItemEnabled}
        isProjectsOnlyView={isProjectsOnlyView}
        onAllProjects={openAllProjectsInPage}
        onHome={() => {
          setIsProjectsOnlyView(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onNewCanvas={openNewCanvas}
        onVideoCanvas={openVideoCanvas}
        renderIcon={renderHomeSidebarIcon}
        shouldInvertLogo={shouldInvertLogo}
        siteLogo={displayLogo}
        siteName={siteName || "FrameLoom"}
        videoCanvasEnabled={siteSettingsData?.videoCanvasEnabled !== false}
        tone={isDarkHomeTheme ? "dark" : "light"}
      />

      {!isAuthenticated ? (
        <Link
          aria-label="登录"
          className={mobileLoginButtonClass}
          href="/login?callbackUrl=%2F"
          onClick={(event) => {
            event.preventDefault();
            redirectToLogin("/");
          }}
          onPointerDown={(event) => {
            if (
              event.button !== 0 ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            ) {
              return;
            }
            event.preventDefault();
            redirectToLogin("/");
          }}
          title="登录"
        >
          <User className="h-[18px] w-[18px]" strokeWidth={1.95} />
        </Link>
      ) : null}

      <main className="w-full max-w-none px-4 pb-16 pt-0 sm:px-6 lg:ml-[56px] lg:w-[calc(100%-56px)] lg:px-8 xl:px-[42px]">
        {!isProjectsOnlyView && (
          <HomeHeroComposer
            composerToolMode={composerToolMode}
            composerPlaceholder={composerPlaceholder}
            displayLogo={displayLogo}
            files={files}
            handleAddFiles={handleAddFiles}
            heroPromoActionText={heroPromoActionText}
            heroPromoText={heroPromoText}
            heroSubtitleText={heroSubtitleText}
            heroTitleText={heroTitleText}
            homeAnimationData={homeAnimationData}
            imageParams={imageParams}
            isAgentModeActive={isComposerAgentModeActive}
            isSubmitting={isSubmitting}
            modelOptions={composerModelOptions}
            onAddRemoteImage={handleAddRemoteImage}
            onApplyCreativeScene={handleApplyCreativeScenePreset}
            onComposerToolModeChange={handleComposerToolModeChange}
            onImageParamsChange={handleComposerImageParamsChange}
            onModelChange={handleComposerModelChange}
            onSubmit={createCanvasFromComposer}
            prompt={prompt}
            removeFile={removeFile}
            setPrompt={setPrompt}
            shouldInvertLogo={shouldInvertLogo}
            siteName={siteName}
            selectedModelId={selectedComposerModel.id}
            tone={isDarkHomeTheme ? "dark" : "light"}
          />
        )}

        {!isProjectsOnlyView && siteSettingsData?.videoCanvasEnabled !== false && (
          <div className="mb-6 flex justify-center">
            <button type="button" onClick={openVideoCanvas} className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-selection/30 bg-brand-accent px-5 text-sm font-medium text-brand-accent-foreground transition hover:bg-brand-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-selection focus-visible:ring-offset-2">
              <Clapperboard className="h-4 w-4" />
              视频画布
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {!isProjectsOnlyView && (
          <HomeQuickStartSection
            items={homeQuickStartConfig.items}
            onStart={handleQuickStartPrompt}
            tone={isDarkHomeTheme ? "dark" : "light"}
          />
        )}

        <HomeProjectsSection
          deletingProjectId={deletingProjectId}
          hasMoreProjects={hasMoreProjects}
          isProjectsOnlyView={isProjectsOnlyView}
          onCreateProject={openNewCanvas}
          onDeleteProject={handleDeleteProject}
          onOpenProject={(projectId) => {
            const project = recentProjects.find((item) => item.id === projectId);
            router.push(`/canvas/${projectId}${project?.workspaceType === "video" ? "?mode=video&workspaceType=video" : ""}`);
          }}
          onViewAllProjects={openAllProjectsInPage}
          projects={recentProjects}
          projectSectionRef={projectSectionRef}
          tone={isDarkHomeTheme ? "dark" : "light"}
        />

        {!isProjectsOnlyView && (
          <HomeFeaturedGallery
            activeCategory={activeCategory}
            categories={discoveryTabs}
            featuredItems={featuredItems}
            featuredLoadMoreRef={featuredLoadMoreRef}
            featuredSectionRef={featuredSectionRef}
            isLoadingFeatured={isLoadingFeatured}
            isLoadingMoreFeatured={isLoadingMoreFeatured}
            setActiveCategory={setActiveCategory}
          />
        )}
      </main>

      <button
        type="button"
        title="回到顶部"
        className="fixed bottom-8 right-8 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 shadow hover:text-black dark:border-white/12 dark:bg-[#141416] dark:text-white/55 dark:hover:text-white"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      {showImageEditor && ImageAnnotatorLazy ? (
        <ImageAnnotatorLazy
          imageUrl={editorImageUrl}
          onConfirm={handleImageEditorConfirm}
          submitMode="publish-new-canvas"
          onCancel={handleImageEditorCancel}
          onHomeClick={handleImageEditorCancel}
        />
      ) : showImageEditor ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 text-white backdrop-blur-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在加载图片编辑器...
        </div>
      ) : null}

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="w-[92vw] max-w-[420px] rounded-[20px] border-black/10 bg-white p-0 dark:border-white/10 dark:bg-[#141416]">
          <DialogHeader className="border-b border-black/10 px-5 py-4 dark:border-white/10">
            <DialogTitle className="text-[16px] font-semibold text-black dark:text-white">联系我们</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            {contactConfig.wechatQrUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={contactConfig.wechatQrUrl}
                  alt="微信二维码"
                  className="h-52 w-52 rounded-xl border border-black/10 object-cover dark:border-white/10"
                />
                <p className="text-[12px] text-black/50 dark:text-white/50">微信扫码添加客服</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-black/20 bg-black/[0.02] px-3 py-5 text-center text-[13px] text-black/45 dark:border-white/12 dark:bg-white/[0.03] dark:text-white/45">
                暂未配置微信二维码
              </div>
            )}

            <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[12px] text-black/50 dark:text-white/50">联系电话</div>
              <div className="mt-1 text-[15px] font-medium text-black dark:text-white">
                {contactConfig.phone || "暂未配置联系电话"}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={accountCenterOpen} onOpenChange={setAccountCenterOpen}>
        <DialogContent className="max-h-[88vh] w-[92vw] max-w-[980px] overflow-hidden rounded-[22px] border-black/10 bg-[#f6f6f7]/90 p-0 dark:border-white/10 dark:bg-[#101014]/95 dark:text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>账户管理</DialogTitle>
          </DialogHeader>
          <div className="flex h-full max-h-[88vh] flex-col p-4">
            <div className="mb-2.5 flex items-center gap-5 border-b border-black/8 pb-2 dark:border-white/8">
              <button
                type="button"
                className={`text-[13px] font-semibold leading-tight ${accountCenterTab === "account" ? "text-black dark:text-white" : "text-black/35 dark:text-white/35"}`}
                onClick={() => setAccountCenterTab("account")}
              >
                账户管理
              </button>
              <button
                type="button"
                className={`text-[13px] font-semibold leading-tight ${accountCenterTab === "usage" ? "text-black dark:text-white" : "text-black/35 dark:text-white/35"}`}
                onClick={() => setAccountCenterTab("usage")}
              >
                用量
              </button>
              <button
                type="button"
                className={`text-[13px] font-semibold leading-tight ${accountCenterTab === "providerUsage" ? "text-black dark:text-white" : "text-black/35 dark:text-white/35"}`}
                onClick={() => setAccountCenterTab("providerUsage")}
              >
                生成记录
              </button>
              <button
                type="button"
                className={`text-[13px] font-semibold leading-tight ${accountCenterTab === "billing" ? "text-black dark:text-white" : "text-black/35 dark:text-white/35"}`}
                onClick={() => setAccountCenterTab("billing")}
              >
                账单
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {accountCenterTab === "account" ? (
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#17171b]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4551f] text-[14px] font-semibold text-white">
                          {userInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-black dark:text-white">
                            {accountProfile.name}
                          </div>
                          <div className="truncate text-[12px] text-black/45 dark:text-white/45">{accountProfile.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          className="h-8 rounded-xl border border-black/10 bg-white px-3 text-[12px] text-black/75 hover:bg-black/5 dark:border-white/12 dark:bg-[#111115] dark:text-white/75 dark:hover:bg-white/6"
                          onClick={() => {
                            void handleLogout();
                          }}
                        >
                          退出登录
                        </Button>
                      </div>
                    </div>
                  </div>

	                  <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3.5 dark:border-white/10 dark:bg-[#17171b]">
	                    <div className="mb-2 flex items-center gap-4 text-[13px] font-semibold">
	                      <span className="text-black dark:text-white">账户信息</span>
	                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-y-2 text-[12px]">
                      <div className="text-black/55 dark:text-white/50">当前订阅</div>
                      <div className="text-black dark:text-white">{accountProfile.planName}</div>
                      <div className="text-black/55 dark:text-white/50">可用积分</div>
                      <div className="text-black dark:text-white">{accountProfile.availablePoints.toLocaleString()}</div>
                      <div className="text-black/55 dark:text-white/50">每月更新积分</div>
                      <div className="text-black dark:text-white">{accountProfile.monthlyCredits.toLocaleString()}</div>
	                      <div className="text-black/55 dark:text-white/50">每日免费积分</div>
	                      <div className="text-black dark:text-white">{accountProfile.dailyFreeCredits.toLocaleString()}</div>
	                    </div>
	                  </div>

	                  <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3.5 dark:border-white/10 dark:bg-[#17171b]">
	                    <div className="mb-2 flex items-center justify-between gap-3">
	                      <div className="flex items-center gap-2 text-[13px] font-semibold text-black dark:text-white">
	                        <Users className="h-4 w-4" />
	                        <span>团队与计费</span>
	                      </div>
	                      <span className="rounded-full border border-black/8 bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50">
	                        {accountProfile.billingMode === "team" ? "团队承担" : "个人承担"}
	                      </span>
	                    </div>
	                    {accountTeam ? (
	                      <div className="space-y-3">
	                        <div className="grid grid-cols-[110px_1fr] gap-y-2 text-[12px]">
	                          <div className="text-black/55 dark:text-white/50">当前团队</div>
	                          <div className="text-black dark:text-white">{accountTeam.name}</div>
	                          <div className="text-black/55 dark:text-white/50">团队角色</div>
	                          <div className="text-black dark:text-white">
	                            {accountTeam.role === "owner" ? "所有者" : accountTeam.role === "admin" ? "管理员" : "成员"}
	                          </div>
	                          <div className="text-black/55 dark:text-white/50">新生成费用</div>
	                          <div className="text-black dark:text-white">从团队账户余额扣除</div>
	                        </div>
	                        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-black/[0.025] px-3 py-2 text-[12px] dark:bg-white/[0.035]">
	                          <span className="text-black/50 dark:text-white/45">
	                            {accountTeam.canLeave
	                              ? "退出后账号保留，后续费用回到个人账户承担。"
	                              : accountTeam.leaveBlockedReason || "当前无法退出团队。"}
	                          </span>
	                          <Button
	                            variant="ghost"
	                            className="h-8 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-[12px] text-black/75 hover:bg-black/5 dark:border-white/12 dark:bg-[#111115] dark:text-white/75 dark:hover:bg-white/6"
	                            disabled={!accountTeam.canLeave || isLeavingTeam}
	                            onClick={() => {
	                              void handleLeaveTeam();
	                            }}
	                          >
	                            {isLeavingTeam ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
	                            退出团队
	                          </Button>
	                        </div>
	                      </div>
	                    ) : (
	                      <div className="rounded-[12px] bg-black/[0.025] px-3 py-2 text-[12px] text-black/55 dark:bg-white/[0.035] dark:text-white/50">
	                        当前是个人账号，新生成费用由个人账户承担。加入团队后，后续生图/视频费用将由团队账户承担。
	                      </div>
	                    )}
	                  </div>
	                </div>
	              ) : null}

              {accountCenterTab === "providerUsage" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#17171b]">
                      <div className="text-[11px] text-black/45 dark:text-white/40">
                        Key 状态
                      </div>
                      <div className={cn("mt-1.5 text-[18px] font-semibold", providerUsageStatusClass)}>
                        {providerUsageSnapshots.length ? providerUsageStatusLabel : "未同步"}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#17171b]">
                      <div className="text-[11px] text-black/45 dark:text-white/40">
                        当前余额
                      </div>
                      <div className="mt-1.5 text-[18px] font-semibold text-black dark:text-white">
                        {primaryProviderUsage
                          ? formatProviderMoney(
                              primaryProviderUsage.balanceCents,
                              primaryProviderUsage.currency
                            )
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#17171b]">
                      <div className="text-[11px] text-black/45 dark:text-white/40">
                        近 30 天消耗
                      </div>
                      <div className="mt-1.5 text-[18px] font-semibold text-black dark:text-white">
                        {primaryProviderUsage
                          ? formatProviderMoney(
                              primaryProviderUsage.last30DaysCostCents,
                              primaryProviderUsage.currency
                            )
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-[#17171b]">
                      <div className="text-[11px] text-black/45 dark:text-white/40">
                        最近同步
                      </div>
                      <div className="mt-1.5 truncate text-[13px] font-semibold text-black dark:text-white">
                        {formatDateTime(
                          primaryProviderUsage?.lastSyncedAt ||
                            primaryProviderUsage?.updatedAt ||
                            undefined
                        )}
                      </div>
                    </div>
                  </div>

                  {primaryProviderUsage?.blockReason ||
                  primaryProviderUsage?.lastSyncError ? (
                    <div className="rounded-[12px] bg-red-500/10 px-3 py-2 text-[12px] leading-5 text-red-600 dark:text-red-300">
                      {primaryProviderUsage.blockReason ||
                        primaryProviderUsage.lastSyncError}
                    </div>
                  ) : null}

                  <div className="rounded-[16px] border border-black/10 bg-white dark:border-white/10 dark:bg-[#17171b]">
                    <div className="border-b border-black/8 px-3.5 py-2 text-[12px] font-semibold text-black/80 dark:border-white/8 dark:text-white/75">
                      生成记录
                    </div>
                    {providerUsageRecords.length ? (
                      <div className="divide-y divide-black/8 dark:divide-white/8">
                        {providerUsageRecords.map((record) => (
                          <div
                            className="grid gap-2 px-3.5 py-3 text-[12px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center"
                            key={record.id}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-black/80 dark:text-white/80">
                                AI 生成任务
                              </div>
                              <div className="mt-1 truncate text-black/45 dark:text-white/42">
                                {record.requestType || record.mediaType || "-"}
                              </div>
                            </div>
                            <div className="truncate text-black/65 dark:text-white/55">
                              {record.model || "-"}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-black/55 dark:text-white/50 sm:justify-end">
                              <span className="font-medium text-black/75 dark:text-white/75">
                                {formatProviderMoney(record.actualCostCents)}
                              </span>
                              <span>
                                {formatDateTime(
                                  record.externalCreatedAt ||
                                    record.createdAt ||
                                    undefined
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[220px] items-center justify-center text-[12px] text-black/35 dark:text-white/35">
                        暂无请求记录。
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {accountCenterTab === "usage" ? (
                <div className="rounded-[16px] border border-black/10 bg-white dark:border-white/10 dark:bg-[#17171b]">
                  <div className="grid grid-cols-[2fr_1fr_2fr_1fr] items-center border-b border-black/8 px-3.5 py-2 text-[12px] font-semibold text-black/80 dark:border-white/8 dark:text-white/75">
                    <span>明细</span>
                    <Select value={usageFilter} onValueChange={(value: "all" | "consumed" | "earned") => setUsageFilter(value)}>
                      <SelectTrigger className="h-7 w-[104px] border-black/10 bg-white text-[12px] dark:border-white/10 dark:bg-[#111115] dark:text-white">
                        <span>{usageFilter === "all" ? "全部" : usageFilter === "consumed" ? "已消耗" : "已获取"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="consumed">已消耗</SelectItem>
                        <SelectItem value="earned">已获取</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>日期</span>
                    <span>积分消耗</span>
                  </div>
                  {filteredUsageRecords.length > 0 ? (
                    <div>
                      {filteredUsageRecords.map((record, idx) => (
                        <div
                          key={record.id}
                          className={`grid grid-cols-[2fr_1fr_2fr_1fr] items-center px-3.5 py-2 text-[12px] ${idx % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
                        >
                          <div className="truncate pr-3 text-black/80 dark:text-white/80">{record.detail}</div>
                          <div className="text-black/55 dark:text-white/50">{record.status === "consumed" ? "已消耗" : "已获取"}</div>
                          <div className="text-black/65 dark:text-white/55">{formatDateTime(record.createdAt)}</div>
                          <div className={record.amount < 0 ? "text-black dark:text-white" : "text-[#0f8a3c] dark:text-[#48d98a]"}>
                            {record.amount > 0 ? `+${record.amount}` : record.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[340px] items-center justify-center text-black/35 dark:text-white/35">暂无数据</div>
                  )}
                </div>
              ) : null}

              {accountCenterTab === "billing" ? (
                <div className="rounded-[16px] border border-black/10 bg-white dark:border-white/10 dark:bg-[#17171b]">
                  <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] items-center border-b border-black/8 px-3.5 py-2 text-[12px] font-semibold text-black/80 dark:border-white/8 dark:text-white/75">
                    <span>日期</span>
                    <span>类别</span>
                    <span>金额</span>
                    <span>状态</span>
                    <span>发票</span>
                  </div>
                  {accountCenterData?.billingRecords && accountCenterData.billingRecords.length > 0 ? (
                    <div>
                      {accountCenterData.billingRecords.map((record, idx) => (
                        <div
                          key={record.id}
                          className={`grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] items-center px-3.5 py-2 text-[12px] ${idx % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
                        >
                          <div className="text-black/65 dark:text-white/55">{formatDateTime(record.date)}</div>
                          <div className="text-black/80 dark:text-white/80">{record.category}</div>
                          <div className="text-black/80 dark:text-white/80">{record.amount > 0 ? `+${record.amount}` : record.amount}</div>
                          <div className="text-black/55 dark:text-white/50">{record.status === "completed" ? "完成" : record.status === "pending" ? "处理中" : "失败"}</div>
                          <div className="text-black/35 dark:text-white/35">{record.invoice || "-"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[340px] items-center justify-center text-black/35 dark:text-white/35">暂无数据</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
