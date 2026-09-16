// Modified for standalone community distribution; see NOTICE.
import type { ImageGenerationParams } from "@/src/components/image-params-bar";
import type { MembershipConfig } from "@/src/lib/membership/config";

export type HomeUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  type?: string | null;
  teamId?: string | null;
  teamRole?: string | null;
};

export type CanvasProject = {
  id: string;
  title: string;
  thumbnail?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FeaturedImage = {
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

export type FeaturedResponse = {
  images: FeaturedImage[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ModelOption = {
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
    creditCostPerVideo?: number;
    videoDurationOptions?: number[];
    creditCostPerVideoByDuration?: Record<string, number>;
    creditCostPerVideoByResolution?: Record<string, number>;
  } | null;
};

export type PublicAuthSettings = {
  isDingTalkEnabled?: boolean;
  isGoogleEnabled?: boolean;
  isGoogleConfigured?: boolean;
  isRegistrationEnabled?: boolean;
  organizations?: Array<{ name?: string } | string>;
  dingTalkOrganizations?: Array<{ name?: string } | string>;
};

export type ContactConfig = {
  phone?: string;
  wechatQrUrl?: string;
};

export type MembershipSummaryResponse = {
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

export type PointsPackage = {
  id: string;
  name: string;
  points: number;
  price: number;
  currency: string;
  isEnabled: boolean;
};

export type AccountCenterResponse = {
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

export type UploadFileItem = {
  id: string;
  file?: File;
  previewUrl: string;
  name?: string;
  contentType?: string;
  remoteAttachment?: {
    url: string;
    name: string;
    contentType: string;
    assetId?: string;
  };
};

export type ComposerImageParams = ImageGenerationParams;
