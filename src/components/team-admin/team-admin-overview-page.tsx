// Modified for standalone community distribution; see NOTICE.
"use client";

import { useState, type ReactNode } from "react";
import Link from "@/src/desktop/next-link-shim";
import { useRouter } from "@/src/desktop/next-navigation-shim";
import useSWR from "swr";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileText,
  HardDrive,
  ImageIcon,
  KeyRound,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { openApiSystemFromCurrentSession } from "@/src/client/api-system-launch";
import { apiFetch } from "@/src/client/api";
import { cn } from "@/src/lib/utils";

type TeamAdminOverviewResponse = {
  success: true;
  team: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    accountBalanceCredits: number;
    billingMetadata: unknown | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  viewer: {
    userId: string;
    teamRole: string;
    isTeamAdmin: boolean;
  };
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalGeneratedImages: number;
    totalVideoStoryboards: number;
    teamModelCount: number;
    globalModelCount: number;
    teamPresetCount: number;
    teamQuickPhraseCount: number;
    ledgerCount: number;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    teamRole: string | null;
    role: string | null;
    isActive: boolean | null;
    pointsBalance: number | null;
    monthlyImageLimit: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  records: {
    images: Array<{
      id: string;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
      thumbnailUrl: string | null;
      originalUrl: string | null;
      imageSize: string | null;
      prompt: string | null;
      modelId: string | null;
      createdAt: string | null;
    }>;
    videos: Array<{
      id: string;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
      status: string | null;
      providerType: string | null;
      modelRef: string | null;
      gridType: string | null;
      totalShots: number | null;
      createdAt: string | null;
      completedAt: string | null;
    }>;
  };
  analytics: {
    imageTasks: {
      total: number;
      succeeded: number;
      failed: number;
      byStatus: Array<{ status: string; count: number }>;
    };
    videoTasks: {
      total: number;
      completed: number;
      failed: number;
      byStatus: Array<{ status: string; count: number }>;
    };
    imageModels: Array<{ modelId: string; count: number }>;
    localArchive: {
      total: number;
      archived: number;
      failed: number;
      byStatus: Array<{ status: string; count: number }>;
    };
  };
  aiModels: Array<{
    id: string;
    modelId: string;
    displayName: string;
    avatarUrl: string | null;
    supportsVision: boolean | null;
    supportsImageGen: boolean | null;
    isEnabled: boolean | null;
    isHidden: boolean | null;
    isDefault: boolean | null;
    sortOrder: number | null;
    updatedAt: string | null;
  }>;
  quickPhrases: {
    count: number;
    teamPresetCount: number;
    source: string;
    teamScopedSettingsReady: boolean;
    items: Array<{
      id: string;
      title: string;
      content: string;
      category: string | null;
      isEnabled: boolean;
      sortOrder: number;
      usageCount: number;
      createdAt: string | null;
      updatedAt: string | null;
    }>;
  };
  billing: {
    accountBalanceCredits: number;
    paidAmountCents: number;
    pendingAmountCents: number;
    totalOrders: number;
    ledger: Array<{
      id: string;
      type: string;
      amountCredits: number;
      amountCents: number | null;
      currency: string | null;
      description: string | null;
      occurredAt: string | null;
      createdAt: string | null;
    }>;
  };
};

type TeamAdminApiError = Error & {
  status?: number;
};

type TeamImageRecord = TeamAdminOverviewResponse["records"]["images"][number];
type TeamVideoRecord = TeamAdminOverviewResponse["records"]["videos"][number];

type TeamAdminRecordsResponse = {
  success: true;
  records: {
    images: TeamImageRecord[];
    videos: TeamVideoRecord[];
  };
  pagination: {
    imageOffset: number;
    videoOffset: number;
    imageLimit: number;
    videoLimit: number;
    nextImageOffset: number | null;
    nextVideoOffset: number | null;
  };
};

type TeamBillingLedgerItem = TeamAdminOverviewResponse["billing"]["ledger"][number];

type TeamAdminBillingResponse = {
  success: true;
  billing: {
    accountBalanceCredits: number;
    ledgerCount: number;
    creditAmountCredits: number;
    debitAmountCredits: number;
    paidAmountCents: number;
    pendingAmountCents: number;
    totalOrders: number;
    ledger: TeamBillingLedgerItem[];
    orders: Array<{
      id: string;
      provider: string;
      outTradeNo: string;
      tradeNo: string | null;
      packageId: string | null;
      points: number;
      amountCents: number;
      currency: string;
      payType: string | null;
      status: string;
      paidAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    }>;
  };
  pagination: {
    ledgerOffset: number;
    orderOffset: number;
    ledgerLimit: number;
    orderLimit: number;
    nextLedgerOffset: number | null;
    nextOrderOffset: number | null;
  };
};

type TeamAccessKeyRecord = {
  id: string;
  label: string | null;
  status: "active" | "paused" | "revoked";
  source: string;
  prefix: string | null;
  suffix: string | null;
  firstVerifiedAt: string | null;
  firstAdminUserId: string | null;
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type TeamAdminAccessKeysResponse = {
  success: true;
  inviteCodes: TeamAccessKeyRecord[];
  accessKeys?: TeamAccessKeyRecord[];
  limits: {
    maxReturned: number;
  };
};

type TeamAdminAccessKeyMutationResponse = {
  success: true;
  inviteCode?: TeamAccessKeyRecord;
  accessKey?: TeamAccessKeyRecord;
  secret?: string;
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

type TeamAdminProviderCredentialsResponse = {
  success: true;
  scopeType: "team";
  providerOptions: ProviderCredentialOption[];
  credentials: ProviderCredentialRecord[];
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

type TeamAdminProviderUsageResponse = {
  success: true;
  scopeType: "team";
  snapshots: ProviderUsageSnapshot[];
  records: ProviderUsageRecord[];
};

type TeamMemberRole = "member" | "admin" | "owner";

type TeamMemberUpdatePayload = {
  teamRole?: TeamMemberRole;
  isActive?: boolean;
  monthlyImageLimit?: number | null;
};

type TeamModelUpdatePayload = {
  isEnabled?: boolean;
  isHidden?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

type TeamQuickPhraseUpdatePayload = {
  title?: string;
  content?: string;
  category?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
};

async function teamAdminFetcher(url: string) {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true) {
    const error = new Error(
      payload?.error || `获取团队管理概览失败：${response.status}`
    ) as TeamAdminApiError;
    error.status = response.status;
    throw error;
  }

  return payload as TeamAdminOverviewResponse;
}

async function teamAdminAccessKeysFetcher(url: string) {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true) {
    const error = new Error(
      payload?.error || `获取团队邀请码失败：${response.status}`
    ) as TeamAdminApiError;
    error.status = response.status;
    throw error;
  }

  return payload as TeamAdminAccessKeysResponse;
}

async function teamAdminProviderCredentialsFetcher(url: string) {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true) {
    const error = new Error(
      payload?.error || `获取团队 API Key 失败：${response.status}`
    ) as TeamAdminApiError;
    error.status = response.status;
    throw error;
  }

  return payload as TeamAdminProviderCredentialsResponse;
}

async function teamAdminProviderUsageFetcher(url: string) {
  const response = await apiFetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true) {
    const error = new Error(
      payload?.error || `获取团队 API 用量失败：${response.status}`
    ) as TeamAdminApiError;
    error.status = response.status;
    throw error;
  }

  return payload as TeamAdminProviderUsageResponse;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function formatCurrencyFromCents(value: number | null | undefined) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}

function formatPercent(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getPersonName(name?: string | null, email?: string | null) {
  return name || email || "未命名用户";
}

function getRoleLabel(role?: string | null) {
  if (role === "owner") return "所有者";
  if (role === "admin") return "管理员";
  return "成员";
}

function getStatusLabel(status?: string | null) {
  if (status === "active") return "正常";
  if (status === "suspended") return "已暂停";
  if (status === "disabled") return "已停用";
  return status || "未知";
}

function getAccessKeyStatusLabel(status?: string | null) {
  if (status === "active") return "启用";
  if (status === "paused") return "暂停";
  if (status === "revoked") return "已撤销";
  return status || "未知";
}

function maskAccessKey(prefix?: string | null, suffix?: string | null) {
  if (!prefix && !suffix) {
    return "未记录前后缀";
  }

  return `${prefix || "****"}...${suffix || "****"}`;
}

function maskProviderCredential(prefix?: string | null, suffix?: string | null) {
  if (!prefix && !suffix) {
    return "已保存";
  }

  return `${prefix || "****"}...${suffix || "****"}`;
}

function SectionShell({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-settings-panel p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand-accent text-black">
              {icon}
            </span>
            <h2 className="text-[16px] font-semibold text-[#151922] dark:text-white">
              {title}
            </h2>
          </div>
          {description ? (
            <p className="mt-2 text-[13px] leading-5 text-[#758092] dark:text-white/48">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="admin-settings-subpanel p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[#677386] dark:text-white/52">
          {label}
        </span>
        <span className="text-[#8a95a6] dark:text-white/42">{icon}</span>
      </div>
      <div className="mt-3 text-[26px] font-semibold leading-none text-[#111827] dark:text-white">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[12px] text-[#8a95a6] dark:text-white/38">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function StatusBreakdown({
  emptyLabel,
  items,
  total,
}: {
  emptyLabel: string;
  items: Array<{ status: string; count: number }>;
  total: number;
}) {
  if (items.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          className="admin-settings-subpanel px-3 py-2.5"
          key={item.status}
        >
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="truncate font-medium text-[#1f2937] dark:text-white/80">
              {item.status}
            </span>
            <span className="text-[#8792a4] dark:text-white/38">
              {formatNumber(item.count)} · {formatPercent(item.count, total)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-brand-accent"
              style={{ width: formatPercent(item.count, total) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="admin-settings-subpanel border-dashed px-4 py-8 text-center text-[13px] text-[#8a95a6] dark:text-white/38">
      {label}
    </div>
  );
}

export function TeamAdminOverviewPage() {
  const router = useRouter();
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [updatingModelId, setUpdatingModelId] = useState<string | null>(null);
  const [modelNotice, setModelNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [quickPhraseDraft, setQuickPhraseDraft] = useState({
    title: "",
    content: "",
    category: "",
  });
  const [isCreatingQuickPhrase, setIsCreatingQuickPhrase] = useState(false);
  const [updatingQuickPhraseId, setUpdatingQuickPhraseId] = useState<
    string | null
  >(null);
  const [quickPhraseNotice, setQuickPhraseNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [recordPage, setRecordPage] =
    useState<TeamAdminRecordsResponse | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordNotice, setRecordNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [billingPage, setBillingPage] =
    useState<TeamAdminBillingResponse | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingNotice, setBillingNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [accessKeyDraft, setAccessKeyDraft] = useState({
    label: "",
    expiresAt: "",
  });
  const [isCreatingAccessKey, setIsCreatingAccessKey] = useState(false);
  const [updatingAccessKeyId, setUpdatingAccessKeyId] = useState<string | null>(
    null
  );
  const [accessKeyNotice, setAccessKeyNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [revealedAccessKey, setRevealedAccessKey] = useState<{
    label: string;
    secret: string;
  } | null>(null);
  const [providerCredentialDraft, setProviderCredentialDraft] = useState({
    providerType: "",
    apiKey: "",
  });
  const [isSavingProviderCredential, setIsSavingProviderCredential] =
    useState(false);
  const [deletingProviderCredentialType, setDeletingProviderCredentialType] =
    useState<string | null>(null);
  const [providerCredentialNotice, setProviderCredentialNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { data, error, isLoading, mutate } =
    useSWR<TeamAdminOverviewResponse>(
      "/api/team-admin/overview",
      teamAdminFetcher,
      {
        revalidateOnFocus: false,
      }
    );
  const {
    data: accessKeysData,
    error: accessKeysError,
    isLoading: isLoadingAccessKeys,
    mutate: mutateAccessKeys,
  } = useSWR<TeamAdminAccessKeysResponse>(
    data ? "/api/team-admin/invite-codes" : null,
    teamAdminAccessKeysFetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const {
    data: providerCredentialsData,
    error: providerCredentialsError,
    isLoading: isLoadingProviderCredentials,
    mutate: mutateProviderCredentials,
  } = useSWR<TeamAdminProviderCredentialsResponse>(
    data ? "/api/team-admin/provider-credentials" : null,
    teamAdminProviderCredentialsFetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const {
    data: providerUsageData,
    error: providerUsageError,
    isLoading: isLoadingProviderUsage,
    mutate: mutateProviderUsage,
  } = useSWR<TeamAdminProviderUsageResponse>(
    data ? "/api/team-admin/provider-usage" : null,
    teamAdminProviderUsageFetcher,
    {
      revalidateOnFocus: false,
    }
  );
  const typedError = error as TeamAdminApiError | undefined;
  const isAccessError =
    typedError?.status === 401 || typedError?.status === 403;
  const accessKeysTypedError = accessKeysError as TeamAdminApiError | undefined;
  const providerCredentialsTypedError = providerCredentialsError as
    | TeamAdminApiError
    | undefined;
  const providerUsageTypedError = providerUsageError as
    | TeamAdminApiError
    | undefined;

  async function updateTeamMember(
    memberId: string,
    changes: TeamMemberUpdatePayload
  ) {
    setUpdatingMemberId(memberId);
    setMemberNotice(null);

    try {
      const response = await apiFetch(`/api/team-admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "成员更新失败");
      }

      await mutate();
      setMemberNotice({ type: "success", message: "成员设置已保存" });
    } catch (updateError) {
      setMemberNotice({
        type: "error",
        message:
          updateError instanceof Error
            ? updateError.message
            : "成员更新失败",
      });
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function updateTeamModel(
    modelId: string,
    changes: TeamModelUpdatePayload
  ) {
    setUpdatingModelId(modelId);
    setModelNotice(null);

    try {
      const response = await apiFetch(`/api/team-admin/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "模型设置更新失败");
      }

      await mutate();
      setModelNotice({ type: "success", message: "模型设置已保存" });
    } catch (updateError) {
      setModelNotice({
        type: "error",
        message:
          updateError instanceof Error
            ? updateError.message
            : "模型设置更新失败",
      });
    } finally {
      setUpdatingModelId(null);
    }
  }

  async function createTeamQuickPhrase() {
    const title = quickPhraseDraft.title.trim();
    const content = quickPhraseDraft.content.trim();
    const category = quickPhraseDraft.category.trim();

    if (!title || !content) {
      setQuickPhraseNotice({
        type: "error",
        message: "快捷短语标题和内容不能为空",
      });
      return;
    }

    setIsCreatingQuickPhrase(true);
    setQuickPhraseNotice(null);

    try {
      const response = await apiFetch("/api/team-admin/quick-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category: category || null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "快捷短语创建失败");
      }

      await mutate();
      setQuickPhraseDraft({ title: "", content: "", category: "" });
      setQuickPhraseNotice({ type: "success", message: "快捷短语已新增" });
    } catch (createError) {
      setQuickPhraseNotice({
        type: "error",
        message:
          createError instanceof Error
            ? createError.message
            : "快捷短语创建失败",
      });
    } finally {
      setIsCreatingQuickPhrase(false);
    }
  }

  async function updateTeamQuickPhrase(
    phraseId: string,
    changes: TeamQuickPhraseUpdatePayload
  ) {
    setUpdatingQuickPhraseId(phraseId);
    setQuickPhraseNotice(null);

    try {
      const response = await apiFetch(
        `/api/team-admin/quick-phrases/${phraseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "快捷短语更新失败");
      }

      await mutate();
      setQuickPhraseNotice({ type: "success", message: "快捷短语已保存" });
    } catch (updateError) {
      setQuickPhraseNotice({
        type: "error",
        message:
          updateError instanceof Error
            ? updateError.message
            : "快捷短语更新失败",
      });
    } finally {
      setUpdatingQuickPhraseId(null);
    }
  }

  async function deleteTeamQuickPhrase(phraseId: string) {
    if (!window.confirm("确定删除这条团队快捷短语吗？")) {
      return;
    }

    setUpdatingQuickPhraseId(phraseId);
    setQuickPhraseNotice(null);

    try {
      const response = await apiFetch(
        `/api/team-admin/quick-phrases/${phraseId}`,
        {
          method: "DELETE",
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "快捷短语删除失败");
      }

      await mutate();
      setQuickPhraseNotice({ type: "success", message: "快捷短语已删除" });
    } catch (deleteError) {
      setQuickPhraseNotice({
        type: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "快捷短语删除失败",
      });
    } finally {
      setUpdatingQuickPhraseId(null);
    }
  }

  async function loadTeamRecords() {
    if (isLoadingRecords) {
      return;
    }

    const imageOffset =
      recordPage?.pagination.nextImageOffset === null
        ? null
        : recordPage?.pagination.nextImageOffset ?? 0;
    const videoOffset =
      recordPage?.pagination.nextVideoOffset === null
        ? null
        : recordPage?.pagination.nextVideoOffset ?? 0;

    if (imageOffset === null && videoOffset === null) {
      return;
    }

    setIsLoadingRecords(true);
    setRecordNotice(null);

    try {
      const params = new URLSearchParams({
        imageOffset: String(imageOffset ?? recordPage?.records.images.length ?? 0),
        videoOffset: String(videoOffset ?? recordPage?.records.videos.length ?? 0),
        imageLimit: "20",
        videoLimit: "20",
      });
      const response = await apiFetch(
        `/api/team-admin/records?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "生成记录读取失败");
      }

      const nextPayload = payload as TeamAdminRecordsResponse;
      setRecordPage((current) => {
        if (!current) {
          return nextPayload;
        }

        return {
          ...nextPayload,
          records: {
            images: [...current.records.images, ...nextPayload.records.images],
            videos: [...current.records.videos, ...nextPayload.records.videos],
          },
        };
      });
    } catch (loadError) {
      setRecordNotice({
        type: "error",
        message:
          loadError instanceof Error ? loadError.message : "生成记录读取失败",
      });
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function loadTeamBilling() {
    if (isLoadingBilling) {
      return;
    }

    const ledgerOffset =
      billingPage?.pagination.nextLedgerOffset === null
        ? null
        : billingPage?.pagination.nextLedgerOffset ?? 0;
    const orderOffset =
      billingPage?.pagination.nextOrderOffset === null
        ? null
        : billingPage?.pagination.nextOrderOffset ?? 0;

    if (ledgerOffset === null && orderOffset === null) {
      return;
    }

    setIsLoadingBilling(true);
    setBillingNotice(null);

    try {
      const params = new URLSearchParams({
        ledgerOffset: String(ledgerOffset ?? billingPage?.billing.ledger.length ?? 0),
        ledgerLimit: "30",
        orderOffset: String(orderOffset ?? billingPage?.billing.orders.length ?? 0),
        orderLimit: "20",
      });
      const response = await apiFetch(
        `/api/team-admin/billing?${params.toString()}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "账单明细读取失败");
      }

      const nextPayload = payload as TeamAdminBillingResponse;
      setBillingPage((current) => {
        if (!current) {
          return nextPayload;
        }

        return {
          ...nextPayload,
          billing: {
            ...nextPayload.billing,
            ledger:
              ledgerOffset === null
                ? current.billing.ledger
                : [...current.billing.ledger, ...nextPayload.billing.ledger],
            orders:
              orderOffset === null
                ? current.billing.orders
                : [...current.billing.orders, ...nextPayload.billing.orders],
          },
        };
      });
    } catch (loadError) {
      setBillingNotice({
        type: "error",
        message:
          loadError instanceof Error ? loadError.message : "账单明细读取失败",
      });
    } finally {
      setIsLoadingBilling(false);
    }
  }

  async function createTeamAccessKey(params?: {
    rotateFromAccessKeyId?: string;
    label?: string;
  }) {
    const label = (
      params?.label ||
      accessKeyDraft.label ||
      "团队邀请码"
    ).trim();
    let expiresAt: string | null = null;

    if (accessKeyDraft.expiresAt) {
      const parsedExpiry = new Date(accessKeyDraft.expiresAt);
      if (
        Number.isNaN(parsedExpiry.getTime()) ||
        parsedExpiry.getTime() <= Date.now()
      ) {
        setAccessKeyNotice({
          type: "error",
          message: "过期时间必须晚于当前时间",
        });
        return;
      }
      expiresAt = parsedExpiry.toISOString();
    }

    setIsCreatingAccessKey(true);
    setAccessKeyNotice(null);
    setRevealedAccessKey(null);

    try {
      const response = await apiFetch("/api/team-admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          expiresAt,
          rotateFromAccessKeyId: params?.rotateFromAccessKeyId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "团队邀请码创建失败");
      }

      const nextPayload = payload as TeamAdminAccessKeyMutationResponse;
      const nextInviteCode = nextPayload.inviteCode ?? nextPayload.accessKey;
      await mutateAccessKeys();
      setAccessKeyDraft({ label: "", expiresAt: "" });
      if (nextPayload.secret && nextInviteCode) {
        setRevealedAccessKey({
          label: nextInviteCode.label || label,
          secret: nextPayload.secret,
        });
      }
      setAccessKeyNotice({
        type: "success",
        message: params?.rotateFromAccessKeyId
          ? "新邀请码已生成，旧邀请码已撤销"
          : "团队邀请码已生成",
      });
    } catch (createError) {
      setAccessKeyNotice({
        type: "error",
        message:
          createError instanceof Error
            ? createError.message
            : "团队邀请码创建失败",
      });
    } finally {
      setIsCreatingAccessKey(false);
    }
  }

  async function updateTeamAccessKey(
    accessKeyId: string,
    changes: Partial<Pick<TeamAccessKeyRecord, "label" | "status">> & {
      expiresAt?: string | null;
    }
  ) {
    setUpdatingAccessKeyId(accessKeyId);
    setAccessKeyNotice(null);

    try {
      const response = await apiFetch(
        `/api/team-admin/invite-codes/${accessKeyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "团队邀请码更新失败");
      }

      await mutateAccessKeys();
      setAccessKeyNotice({ type: "success", message: "团队邀请码已更新" });
    } catch (updateError) {
      setAccessKeyNotice({
        type: "error",
        message:
          updateError instanceof Error
            ? updateError.message
            : "团队邀请码更新失败",
      });
    } finally {
      setUpdatingAccessKeyId(null);
    }
  }

  async function revokeTeamAccessKey(accessKey: TeamAccessKeyRecord) {
    if (!window.confirm("撤销后该邀请码将无法用于加入团队，确定撤销吗？")) {
      return;
    }

    await updateTeamAccessKey(accessKey.id, { status: "revoked" });
  }

  async function copyRevealedAccessKey() {
    if (!revealedAccessKey?.secret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedAccessKey.secret);
      setAccessKeyNotice({ type: "success", message: "邀请码已复制" });
    } catch {
      setAccessKeyNotice({
        type: "error",
        message: "浏览器不允许自动复制，请手动选中邀请码复制",
      });
    }
  }

  async function saveTeamProviderCredential() {
    const apiKey = providerCredentialDraft.apiKey.trim();
    if (!apiKey) {
      setProviderCredentialNotice({
        type: "error",
        message: "请输入 API Key",
      });
      return;
    }

    setIsSavingProviderCredential(true);
    setProviderCredentialNotice(null);

    try {
      const response = await apiFetch("/api/team-admin/provider-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "团队 API Key 保存失败");
      }

      await mutateProviderCredentials();
      await mutateProviderUsage();
      setProviderCredentialDraft((current) => ({ ...current, apiKey: "" }));
      setProviderCredentialNotice({
        type: "success",
        message: "团队 API Key 已保存",
      });
    } catch (saveError) {
      setProviderCredentialNotice({
        type: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : "团队 API Key 保存失败",
      });
    } finally {
      setIsSavingProviderCredential(false);
    }
  }

  async function deleteTeamProviderCredential(credential: ProviderCredentialRecord) {
    if (!window.confirm("删除团队 API Key 后，该团队将无法使用对应生图/生视频服务，确定删除吗？")) {
      return;
    }

    setDeletingProviderCredentialType(credential.providerType);
    setProviderCredentialNotice(null);

    try {
      const params = new URLSearchParams({
        providerType: credential.providerType,
      });
      const response = await apiFetch(
        `/api/team-admin/provider-credentials?${params.toString()}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "团队 API Key 删除失败");
      }

      await mutateProviderCredentials();
      await mutateProviderUsage();
      setProviderCredentialNotice({
        type: "success",
        message: "团队 API Key 已删除",
      });
    } catch (deleteError) {
      setProviderCredentialNotice({
        type: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "团队 API Key 删除失败",
      });
    } finally {
      setDeletingProviderCredentialType(null);
    }
  }

  const displayedRecordImages = data
    ? recordPage
      ? recordPage.records.images
      : data.records.images.slice(0, 5)
    : [];
  const displayedRecordVideos = data
    ? recordPage
      ? recordPage.records.videos
      : data.records.videos.slice(0, 4)
    : [];
  const canLoadMoreRecords = data
    ? recordPage
      ? recordPage.pagination.nextImageOffset !== null ||
        recordPage.pagination.nextVideoOffset !== null
      : data.overview.totalGeneratedImages > displayedRecordImages.length ||
        data.overview.totalVideoStoryboards > displayedRecordVideos.length
    : false;
  const displayedBillingLedger = data
    ? billingPage
      ? billingPage.billing.ledger
      : data.billing.ledger.slice(0, 6)
    : [];
  const displayedBillingOrders = billingPage?.billing.orders ?? [];
  const canLoadMoreBilling = data
    ? billingPage
      ? billingPage.pagination.nextLedgerOffset !== null ||
        billingPage.pagination.nextOrderOffset !== null
      : data.overview.ledgerCount > displayedBillingLedger.length ||
        data.billing.totalOrders > displayedBillingOrders.length
    : false;
  const providerCredentialOptions =
    providerCredentialsData?.providerOptions ?? [];
  const selectedProviderType =
    providerCredentialDraft.providerType ||
    providerCredentialOptions[0]?.type ||
    "";
  const selectedProviderOption = providerCredentialOptions.find(
    (option) => option.type === selectedProviderType
  );
  const providerCredentials = providerCredentialsData?.credentials ?? [];
  const providerUsageSnapshots = providerUsageData?.snapshots ?? [];
  const providerUsageRecords = providerUsageData?.records ?? [];
  const primaryProviderUsage = providerUsageSnapshots[0] || null;
  const hasTeamProviderCredential = providerCredentials.length > 0;
  const teamProviderStatusLabel = !hasTeamProviderCredential
    ? "未配置"
    : primaryProviderUsage?.isBlocked
      ? "已暂停"
      : primaryProviderUsage?.apiKeyStatus || "可用";
  const teamProviderStatusClass = primaryProviderUsage?.isBlocked
    ? "text-red-600 dark:text-red-300"
    : hasTeamProviderCredential
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-[#8792a4] dark:text-white/38";

  return (
    <main className="admin-settings-surface">
      <div className="admin-settings-page">
        <div className="admin-settings-container flex flex-col gap-6">
          <header className="admin-settings-panel flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="admin-settings-eyebrow">
                <ShieldCheck className="h-4 w-4 text-brand-accent" />
                团队管理
              </div>
              <h1 className="admin-settings-title mt-3">团队系统设置</h1>
              <p className="admin-settings-description mt-1">
                管理成员、邀请码、团队 API Key、余额和生成记录。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="rounded-[14px] border-black/10 bg-white/80 text-[#1b2230] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                onClick={() => router.push("/")}
                type="button"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Button>
              <Button
                className="rounded-[14px] bg-brand-accent text-black hover:bg-brand-accent/90"
                onClick={() => void mutate()}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            </div>
          </header>

          {isLoading ? (
            <div className="admin-settings-panel flex min-h-[420px] items-center justify-center text-[#7c8797] dark:text-white/45">
              <div className="flex items-center gap-3 text-[14px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在读取团队数据...</span>
              </div>
            </div>
          ) : typedError ? (
            <div className="admin-settings-panel flex min-h-[420px] items-center justify-center p-6">
              <div className="max-w-[460px] text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-black/[0.06] text-[#111827] dark:bg-white/[0.08] dark:text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-[20px] font-semibold">
                  {isAccessError ? "没有团队管理员权限" : "团队数据读取失败"}
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-[#768194] dark:text-white/48">
                  {typedError.message}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  {isAccessError ? (
                    <Button
                      asChild
                      className="rounded-[14px] bg-brand-accent text-black hover:bg-brand-accent/90"
                    >
                      <Link href="/login?callbackUrl=%2Fteam-admin">
                        重新登录
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    className="rounded-[14px]"
                    onClick={() => void mutate()}
                    type="button"
                    variant="outline"
                  >
                    重试
                  </Button>
                </div>
              </div>
            </div>
          ) : data ? (
            <>
              <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="admin-settings-panel p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[24px] font-semibold text-[#111827] dark:text-white">
                          {data.team.name}
                        </h2>
                        <Badge className="border-transparent bg-brand-accent text-black hover:bg-brand-accent">
                          {getStatusLabel(data.team.status)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-black/10 text-[#667085] dark:border-white/12 dark:text-white/52"
                        >
                          {getRoleLabel(data.viewer.teamRole)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[13px] text-[#798499] dark:text-white/45">
                        {data.team.slug ? `/${data.team.slug}` : data.team.id}
                      </p>
                      <p className="mt-5 max-w-[760px] text-[14px] leading-6 text-[#687386] dark:text-white/50">
                        团队成员会共用这里的余额与 API Key。你可以在这里控制成员状态、邀请新成员，并查看团队生成用量。
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-brand-accent/35 bg-brand-accent/16 px-5 py-4 text-black dark:bg-brand-accent/18 dark:text-white">
                      <div className="flex items-center gap-2 text-[13px] font-medium text-[#4c5600] dark:text-brand-accent">
                        <Wallet className="h-4 w-4" />
                        团队余额
                      </div>
                      <div className="mt-2 text-[30px] font-semibold leading-none">
                        {formatNumber(data.billing.accountBalanceCredits)}
                      </div>
                      <div className="mt-2 text-[12px] text-[#69721c] dark:text-white/42">
                        积分
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <MetricTile
                    icon={<Users className="h-4 w-4" />}
                    label="成员"
                    value={`${formatNumber(data.overview.activeUsers)}/${formatNumber(data.overview.totalUsers)}`}
                    hint="活跃 / 全部"
                  />
                  <MetricTile
                    icon={<ImageIcon className="h-4 w-4" />}
                    label="生图"
                    value={formatNumber(data.overview.totalGeneratedImages)}
                    hint="团队累计"
                  />
                  <MetricTile
                    icon={<Video className="h-4 w-4" />}
                    label="视频任务"
                    value={formatNumber(data.overview.totalVideoStoryboards)}
                    hint="分镜任务"
                  />
                  <MetricTile
                    icon={<Bot className="h-4 w-4" />}
                    label="团队模型"
                    value={formatNumber(data.overview.teamModelCount)}
                    hint={`全局 ${formatNumber(data.overview.globalModelCount)}`}
                  />
                </div>
              </section>

            <SectionShell
              icon={<KeyRound className="h-4 w-4" />}
              title="团队邀请码"
              description="团队成员加入团队时使用。完整邀请码只在创建或轮换后显示一次，请及时保存。"
            >
              {accessKeyNotice ? (
                <div
                  className={cn(
                    "mb-3 rounded-[14px] px-3 py-2 text-[13px]",
                    accessKeyNotice.type === "success"
                      ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                      : "bg-red-500/10 text-red-700 dark:text-red-300"
                  )}
                >
                  {accessKeyNotice.message}
                </div>
              ) : null}

              {revealedAccessKey ? (
                <div className="mb-4 rounded-[18px] border border-brand-accent/50 bg-brand-accent/12 p-4 text-[#1f2937] dark:bg-brand-accent/10 dark:text-white">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#4b5600] dark:text-brand-accent">
                        请立即保存：{revealedAccessKey.label}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-[#6f781e] dark:text-white/48">
                        页面刷新后不会再次显示完整邀请码。后续列表只会显示前后缀。
                      </p>
                    </div>
                    <Button
                      className="h-9 rounded-[12px] bg-brand-accent px-3 text-[12px] text-black hover:bg-brand-accent/90"
                      onClick={() => void copyRevealedAccessKey()}
                      type="button"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      复制邀请码
                    </Button>
                  </div>
                  <code className="mt-3 block overflow-x-auto rounded-[14px] border border-black/10 bg-white/80 px-3 py-2 text-[12px] text-[#111827] dark:border-white/10 dark:bg-black/35 dark:text-white">
                    {revealedAccessKey.secret}
                  </code>
                </div>
              ) : null}

              <div className="grid gap-3 rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035] lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <input
                  aria-label="团队邀请码名称"
                  className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  maxLength={128}
                  onChange={(event) => {
                    setAccessKeyDraft((current) => ({
                      ...current,
                      label: event.currentTarget.value,
                    }));
                  }}
                  placeholder="邀请码名称，例如：设计组邀请"
                  value={accessKeyDraft.label}
                />
                <input
                  aria-label="团队邀请码过期时间"
                  className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(event) => {
                    setAccessKeyDraft((current) => ({
                      ...current,
                      expiresAt: event.currentTarget.value,
                    }));
                  }}
                  type="datetime-local"
                  value={accessKeyDraft.expiresAt}
                />
                <Button
                  className="h-10 rounded-[12px] bg-brand-accent px-4 text-[13px] text-black hover:bg-brand-accent/90 disabled:opacity-45"
                  disabled={isCreatingAccessKey}
                  onClick={() => void createTeamAccessKey()}
                  type="button"
                >
                  {isCreatingAccessKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  创建邀请码
                </Button>
              </div>

              <div className="mt-4">
                {isLoadingAccessKeys ? (
                  <div className="admin-settings-subpanel flex min-h-[120px] items-center justify-center text-[13px] text-[#8792a4] dark:text-white/38">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    正在读取团队邀请码...
                  </div>
                ) : accessKeysTypedError ? (
                  <div className="rounded-[14px] bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
                    {accessKeysTypedError.message}
                  </div>
                ) : accessKeysData?.inviteCodes.length ? (
                  <div className="overflow-hidden rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                    <table className="w-full min-w-[920px] text-left text-[13px]">
                      <thead className="bg-black/[0.035] text-[#687386] dark:bg-white/[0.05] dark:text-white/46">
                        <tr>
                          <th className="px-4 py-3 font-medium">名称</th>
                          <th className="px-4 py-3 font-medium">邀请码</th>
                          <th className="px-4 py-3 font-medium">状态</th>
                          <th className="px-4 py-3 font-medium">使用</th>
                          <th className="px-4 py-3 font-medium">过期时间</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                        {accessKeysData.inviteCodes.map((accessKey) => {
                          const isUpdating = updatingAccessKeyId === accessKey.id;
                          const isActive = accessKey.status === "active";
                          const isRevoked = accessKey.status === "revoked";

                          return (
                            <tr
                              className="text-[#1f2937] dark:text-white/82"
                              key={accessKey.id}
                            >
                              <td className="px-4 py-3">
                                <input
                                  aria-label="编辑团队邀请码名称"
                                  className="h-9 w-full max-w-[240px] rounded-[12px] border border-black/10 bg-white px-3 text-[13px] font-medium text-[#1f2937] outline-none transition focus:border-brand-accent disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                                  defaultValue={accessKey.label || ""}
                                  disabled={isUpdating || isRevoked}
                                  maxLength={128}
                                  onBlur={(event) => {
                                    const label =
                                      event.currentTarget.value.trim() ||
                                      "团队邀请码";
                                    if (label !== (accessKey.label || "")) {
                                      void updateTeamAccessKey(accessKey.id, {
                                        label,
                                      });
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <code className="rounded-[10px] bg-black/[0.04] px-2 py-1 text-[12px] text-[#4b5563] dark:bg-white/[0.07] dark:text-white/62">
                                  {maskAccessKey(
                                    accessKey.prefix,
                                    accessKey.suffix
                                  )}
                                </code>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={cn(
                                    "border-transparent",
                                    isActive
                                      ? "bg-brand-accent text-black hover:bg-brand-accent"
                                      : isRevoked
                                        ? "bg-red-500/10 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                                        : "bg-black/5 text-[#7b8797] hover:bg-black/5 dark:bg-white/8 dark:text-white/42"
                                  )}
                                >
                                  {getAccessKeyStatusLabel(accessKey.status)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                                <div>{formatNumber(accessKey.usageCount)} 次</div>
                                <div className="mt-1 text-[12px]">
                                  最近：{formatDateTime(accessKey.lastUsedAt)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                                {accessKey.expiresAt
                                  ? formatDateTime(accessKey.expiresAt)
                                  : "永不过期"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {!isRevoked ? (
                                    <Button
                                      className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                                      disabled={isUpdating}
                                      onClick={() => {
                                        void updateTeamAccessKey(accessKey.id, {
                                          status: isActive ? "paused" : "active",
                                        });
                                      }}
                                      type="button"
                                      variant="outline"
                                    >
                                      {isActive ? (
                                        <PauseCircle className="h-3.5 w-3.5" />
                                      ) : (
                                        <PlayCircle className="h-3.5 w-3.5" />
                                      )}
                                      {isActive ? "暂停" : "恢复"}
                                    </Button>
                                  ) : null}
                                  {!isRevoked ? (
                                    <Button
                                      className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                                      disabled={isCreatingAccessKey || isUpdating}
                                      onClick={() => {
                                        void createTeamAccessKey({
                                          rotateFromAccessKeyId: accessKey.id,
                                          label: `${accessKey.label || "团队邀请码"} 轮换`,
                                        });
                                      }}
                                      type="button"
                                      variant="outline"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      轮换
                                    </Button>
                                  ) : null}
                                  {!isRevoked ? (
                                    <Button
                                      className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-red-300 dark:hover:bg-red-500/10"
                                      disabled={isUpdating}
                                      onClick={() => {
                                        void revokeTeamAccessKey(accessKey);
                                      }}
                                      type="button"
                                      variant="outline"
                                    >
                                      撤销
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState label="还没有团队邀请码，创建后成员可用它加入团队" />
                )}
              </div>
            </SectionShell>

            <SectionShell
              icon={<KeyRound className="h-4 w-4" />}
              title="团队 API Key"
              description="团队模式下，生图和生视频会使用这里保存的团队级 API Key。建议为当前团队单独创建 Key。"
            >
              {providerCredentialNotice ? (
                <div
                  className={cn(
                    "mb-3 rounded-[14px] px-3 py-2 text-[13px]",
                    providerCredentialNotice.type === "success"
                      ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                      : "bg-red-500/10 text-red-700 dark:text-red-300"
                  )}
                >
                  {providerCredentialNotice.message}
                </div>
              ) : null}

              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div className="text-[12px] text-[#8792a4] dark:text-white/38">
                    Key 状态
                  </div>
                  <div className={cn("mt-2 text-[18px] font-semibold", teamProviderStatusClass)}>
                    {teamProviderStatusLabel}
                  </div>
                </div>
                <div className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div className="text-[12px] text-[#8792a4] dark:text-white/38">
                    当前余额
                  </div>
                  <div className="mt-2 text-[18px] font-semibold text-[#1f2937] dark:text-white/82">
                    {primaryProviderUsage?.balanceCents === null ||
                    primaryProviderUsage?.balanceCents === undefined
                      ? "-"
                      : formatCurrencyFromCents(primaryProviderUsage.balanceCents)}
                  </div>
                </div>
                <div className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div className="text-[12px] text-[#8792a4] dark:text-white/38">
                    近 30 天消耗
                  </div>
                  <div className="mt-2 text-[18px] font-semibold text-[#1f2937] dark:text-white/82">
                    {primaryProviderUsage
                      ? formatCurrencyFromCents(primaryProviderUsage.last30DaysCostCents)
                      : "-"}
                  </div>
                </div>
                <div className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div className="text-[12px] text-[#8792a4] dark:text-white/38">
                    最近同步
                  </div>
                  <div className="mt-2 truncate text-[13px] font-semibold text-[#1f2937] dark:text-white/82">
                    {formatDateTime(
                      primaryProviderUsage?.lastSyncedAt ||
                        primaryProviderUsage?.updatedAt
                    )}
                  </div>
                </div>
              </div>

              {primaryProviderUsage?.blockReason || primaryProviderUsage?.lastSyncError ? (
                <div className="mb-4 rounded-[14px] bg-red-500/10 px-3 py-2 text-[13px] leading-5 text-red-700 dark:text-red-300">
                  {primaryProviderUsage.blockReason || primaryProviderUsage.lastSyncError}
                </div>
              ) : null}

              <div className="grid gap-3 rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035] lg:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  aria-label="API Key"
                  autoComplete="off"
                  className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  onChange={(event) => {
                    setProviderCredentialDraft((current) => ({
                      ...current,
                      apiKey: event.currentTarget.value,
                    }));
                  }}
                  placeholder="粘贴从官网获取的 API Key"
                  type="password"
                  value={providerCredentialDraft.apiKey}
                />
                <Button
                  className="h-10 rounded-[12px] bg-brand-accent px-4 text-[13px] text-black hover:bg-brand-accent/90 disabled:opacity-45"
                  disabled={isSavingProviderCredential || !providerCredentialDraft.apiKey.trim()}
                  onClick={() => void saveTeamProviderCredential()}
                  type="button"
                >
                  {isSavingProviderCredential ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  保存 Key
                </Button>
              </div>

              {selectedProviderOption?.helpText ? (
                <div className="mt-2 flex flex-col gap-2 text-[12px] leading-5 text-[#8792a4] dark:text-white/40 sm:flex-row sm:items-center sm:justify-between">
                  <span>{selectedProviderOption.helpText}</span>
                  <button
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-[12px] border border-black/10 bg-white/80 px-3 text-[12px] font-medium text-[#1f2937] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white/72 dark:hover:bg-white/10"
                    onClick={() => {
                      void openApiSystemFromCurrentSession(
                        selectedProviderOption.apiKeyUrl
                      ).catch((error) => {
                        setProviderCredentialNotice({
                          type: "error",
                          message:
                            error instanceof Error
                              ? error.message
                              : "暂时无法进入 API 官网",
                        });
                      });
                    }}
                    type="button"
                  >
                    获取 API Key
                  </button>
                </div>
              ) : null}

              <div className="mt-4">
                {isLoadingProviderCredentials ? (
                  <div className="admin-settings-subpanel flex min-h-[120px] items-center justify-center text-[13px] text-[#8792a4] dark:text-white/38">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    正在读取团队 API Key...
                  </div>
                ) : providerCredentialsTypedError ? (
                  <div className="rounded-[14px] bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
                    {providerCredentialsTypedError.message}
                  </div>
                ) : providerCredentials.length ? (
                  <div className="overflow-hidden rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                    <table className="w-full min-w-[720px] text-left text-[13px]">
                      <thead className="bg-black/[0.035] text-[#687386] dark:bg-white/[0.05] dark:text-white/46">
                        <tr>
                          <th className="px-4 py-3 font-medium">Key</th>
                          <th className="px-4 py-3 font-medium">最近使用</th>
                          <th className="px-4 py-3 font-medium">更新时间</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                        {providerCredentials.map((credential) => {
                          const isDeleting =
                            deletingProviderCredentialType === credential.providerType;
                          return (
                            <tr
                              className="text-[#1f2937] dark:text-white/82"
                              key={credential.id}
                            >
                              <td className="px-4 py-3">
                                <code className="rounded-[10px] bg-black/[0.04] px-2 py-1 text-[12px] text-[#4b5563] dark:bg-white/[0.07] dark:text-white/62">
                                  {maskProviderCredential(
                                    credential.keyPrefix,
                                    credential.keySuffix
                                  )}
                                </code>
                              </td>
                              <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                                {formatDateTime(credential.lastUsedAt)}
                              </td>
                              <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                                {formatDateTime(credential.updatedAt)}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-red-300 dark:hover:bg-red-500/10"
                                  disabled={isDeleting}
                                  onClick={() => {
                                    void deleteTeamProviderCredential(credential);
                                  }}
                                  type="button"
                                  variant="outline"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  删除
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState label="还没有团队 API Key，保存后团队成员即可使用对应生图/生视频服务" />
                )}
              </div>

              <div className="mt-5 grid gap-4">
                <div className="overflow-hidden rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="border-b border-black/[0.06] bg-black/[0.025] px-4 py-3 text-[13px] font-semibold text-[#1f2937] dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white/82">
                    余额明细
                  </div>
                  {isLoadingProviderUsage ? (
                    <div className="flex min-h-[96px] items-center justify-center text-[13px] text-[#8792a4] dark:text-white/38">
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      正在读取余额...
                    </div>
                  ) : providerUsageTypedError ? (
                    <div className="px-4 py-3 text-[13px] text-red-700 dark:text-red-300">
                      {providerUsageTypedError.message}
                    </div>
                  ) : providerUsageSnapshots.length ? (
                    <table className="w-full min-w-[760px] text-left text-[13px]">
                      <thead className="bg-black/[0.035] text-[#687386] dark:bg-white/[0.05] dark:text-white/46">
                        <tr>
                          <th className="px-4 py-3 font-medium">项目</th>
                          <th className="px-4 py-3 font-medium">余额</th>
                          <th className="px-4 py-3 font-medium">状态</th>
                          <th className="px-4 py-3 font-medium">近 30 天消耗</th>
                          <th className="px-4 py-3 font-medium">最近同步</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                        {providerUsageSnapshots.map((snapshot) => (
                          <tr className="text-[#1f2937] dark:text-white/82" key={snapshot.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium">AI 生成服务</div>
                              {snapshot.blockReason || snapshot.lastSyncError ? (
                                <div className="mt-2 text-[12px] text-red-600 dark:text-red-300">
                                  {snapshot.blockReason || snapshot.lastSyncError}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              {snapshot.balanceCents === null
                                ? "-"
                                : formatCurrencyFromCents(snapshot.balanceCents)}
                            </td>
                            <td className={cn(
                              "px-4 py-3",
                              snapshot.isBlocked
                                ? "text-red-600 dark:text-red-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            )}>
                              {snapshot.isBlocked ? "已暂停" : snapshot.apiKeyStatus || "可用"}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrencyFromCents(snapshot.last30DaysCostCents)}
                            </td>
                            <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                              {formatDateTime(snapshot.lastSyncedAt || snapshot.updatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState label="暂无余额数据，保存 Key 后会自动同步" />
                  )}
                </div>

                <div className="overflow-hidden rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="border-b border-black/[0.06] bg-black/[0.025] px-4 py-3 text-[13px] font-semibold text-[#1f2937] dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white/82">
                    生图/生视频记录
                  </div>
                  {providerUsageRecords.length ? (
                    <table className="w-full min-w-[860px] text-left text-[13px]">
                      <thead className="bg-black/[0.035] text-[#687386] dark:bg-white/[0.05] dark:text-white/46">
                        <tr>
                          <th className="px-4 py-3 font-medium">任务</th>
                          <th className="px-4 py-3 font-medium">模型</th>
                          <th className="px-4 py-3 font-medium">类型</th>
                          <th className="px-4 py-3 font-medium">消耗</th>
                          <th className="px-4 py-3 font-medium">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                        {providerUsageRecords.map((record) => (
                          <tr className="text-[#1f2937] dark:text-white/82" key={record.id}>
                            <td className="px-4 py-3">
                              <div className="max-w-[210px] truncate">AI 生成任务</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[220px] truncate">{record.model || "-"}</div>
                            </td>
                            <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                              {record.requestType || record.mediaType || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrencyFromCents(record.actualCostCents)}
                            </td>
                            <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                              {formatDateTime(record.externalCreatedAt || record.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState label="暂无请求记录" />
                  )}
                </div>
              </div>
            </SectionShell>

            <SectionShell
              icon={<BarChart3 className="h-4 w-4" />}
              title="数据分析"
              description="按当前团队统计生成任务、用量和本地归档状态。"
            >
              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile
                  icon={<ImageIcon className="h-4 w-4" />}
                  label="图片成功率"
                  value={formatPercent(
                    data.analytics.imageTasks.succeeded,
                    data.analytics.imageTasks.total
                  )}
                  hint={`${formatNumber(data.analytics.imageTasks.succeeded)}/${formatNumber(data.analytics.imageTasks.total)} 个任务`}
                />
                <MetricTile
                  icon={<Sparkles className="h-4 w-4" />}
                  label="图片失败率"
                  value={formatPercent(
                    data.analytics.imageTasks.failed,
                    data.analytics.imageTasks.total
                  )}
                  hint={`${formatNumber(data.analytics.imageTasks.failed)} 个失败`}
                />
                <MetricTile
                  icon={<Video className="h-4 w-4" />}
                  label="视频完成率"
                  value={formatPercent(
                    data.analytics.videoTasks.completed,
                    data.analytics.videoTasks.total
                  )}
                  hint={`${formatNumber(data.analytics.videoTasks.completed)}/${formatNumber(data.analytics.videoTasks.total)} 个任务`}
                />
                <MetricTile
                  icon={<HardDrive className="h-4 w-4" />}
                  label="本地归档率"
                  value={formatPercent(
                    data.analytics.localArchive.archived,
                    data.analytics.localArchive.total
                  )}
                  hint={`${formatNumber(data.analytics.localArchive.failed)} 个失败`}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-4">
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                    图片任务状态
                  </h3>
                  <StatusBreakdown
                    emptyLabel="暂无图片任务状态"
                    items={data.analytics.imageTasks.byStatus}
                    total={data.analytics.imageTasks.total}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                    视频任务状态
                  </h3>
                  <StatusBreakdown
                    emptyLabel="暂无视频任务状态"
                    items={data.analytics.videoTasks.byStatus}
                    total={data.analytics.videoTasks.total}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                    图片生成分布
                  </h3>
                  <StatusBreakdown
                    emptyLabel="暂无图片生成数据"
                    items={data.analytics.imageModels.map((item) => ({
                      status: item.modelId,
                      count: item.count,
                    }))}
                    total={data.overview.totalGeneratedImages}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                    本地归档状态
                  </h3>
                  <StatusBreakdown
                    emptyLabel="暂无本地归档数据"
                    items={data.analytics.localArchive.byStatus}
                    total={data.analytics.localArchive.total}
                  />
                </div>
              </div>
            </SectionShell>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
              <SectionShell
                icon={<Users className="h-4 w-4" />}
                title="团队成员"
                description="管理成员角色、启停状态和月出图限额。"
              >
                {memberNotice ? (
                  <div
                    className={cn(
                      "mb-3 rounded-[14px] px-3 py-2 text-[13px]",
                      memberNotice.type === "success"
                        ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                        : "bg-red-500/10 text-red-700 dark:text-red-300"
                    )}
                  >
                    {memberNotice.message}
                  </div>
                ) : null}
                {data.users.length > 0 ? (
                  <div className="overflow-hidden rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                    <table className="w-full min-w-[920px] text-left text-[13px]">
                      <thead className="bg-black/[0.035] text-[#687386] dark:bg-white/[0.05] dark:text-white/46">
                        <tr>
                          <th className="px-4 py-3 font-medium">成员</th>
                          <th className="px-4 py-3 font-medium">团队角色</th>
                          <th className="px-4 py-3 font-medium">状态</th>
                          <th className="px-4 py-3 font-medium">月限额</th>
                          <th className="px-4 py-3 font-medium">积分</th>
                          <th className="px-4 py-3 font-medium">加入时间</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                        {data.users.map((item) => {
                          const isSelf = item.id === data.viewer.userId;
                          const isUpdating = updatingMemberId === item.id;
                          const normalizedRole = (item.teamRole ||
                            "member") as TeamMemberRole;

                          return (
                            <tr
                              key={item.id}
                              className="text-[#1f2937] dark:text-white/82"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">
                                  {getPersonName(item.name, item.email)}
                                </div>
                                <div className="mt-1 text-[12px] text-[#8792a4] dark:text-white/38">
                                  {item.email || item.id}
                                </div>
                                {isSelf ? (
                                  <Badge
                                    variant="outline"
                                    className="mt-2 border-black/10 text-[11px] text-[#667085] dark:border-white/12 dark:text-white/52"
                                  >
                                    当前账号
                                  </Badge>
                                ) : null}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  aria-label="团队角色"
                                  className="h-9 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] font-medium text-[#1f2937] outline-none transition focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                                  disabled={isUpdating || isSelf}
                                  onChange={(event) => {
                                    void updateTeamMember(item.id, {
                                      teamRole: event.currentTarget
                                        .value as TeamMemberRole,
                                    });
                                  }}
                                  value={normalizedRole}
                                >
                                  <option value="member">成员</option>
                                  <option value="admin">管理员</option>
                                  <option
                                    disabled={data.viewer.teamRole !== "owner"}
                                    value="owner"
                                  >
                                    所有者
                                  </option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px]",
                                    item.isActive
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "bg-black/5 text-[#768194] dark:bg-white/8 dark:text-white/38"
                                  )}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {item.isActive ? "启用" : "停用"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  aria-label="月出图限额"
                                  className="h-9 w-28 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                                  defaultValue={item.monthlyImageLimit ?? ""}
                                  disabled={isUpdating}
                                  inputMode="numeric"
                                  max={100_000}
                                  min={0}
                                  onBlur={(event) => {
                                    const raw = event.currentTarget.value.trim();
                                    const nextValue =
                                      raw === "" ? null : Number(raw);
                                    const currentValue =
                                      item.monthlyImageLimit ?? null;

                                    if (
                                      nextValue !== null &&
                                      (!Number.isInteger(nextValue) ||
                                        nextValue < 0 ||
                                        nextValue > 100_000)
                                    ) {
                                      setMemberNotice({
                                        type: "error",
                                        message:
                                          "月出图限额必须为 0 到 100000 之间的整数",
                                      });
                                      event.currentTarget.value =
                                        currentValue === null
                                          ? ""
                                          : String(currentValue);
                                      return;
                                    }

                                    if (nextValue !== currentValue) {
                                      void updateTeamMember(item.id, {
                                        monthlyImageLimit: nextValue,
                                      });
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  placeholder="无限制"
                                  type="number"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {formatNumber(item.pointsBalance)}
                              </td>
                              <td className="px-4 py-3 text-[#7b8797] dark:text-white/42">
                                {formatDateTime(item.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                                  disabled={
                                    isUpdating ||
                                    isSelf ||
                                    (item.teamRole === "owner" &&
                                      item.isActive === true)
                                  }
                                  onClick={() => {
                                    void updateTeamMember(item.id, {
                                      isActive: !item.isActive,
                                    });
                                  }}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : null}
                                  {item.isActive ? "停用" : "启用"}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState label="当前团队暂无成员数据" />
                )}
              </SectionShell>

              <SectionShell
                icon={<Sparkles className="h-4 w-4" />}
                title="生成记录"
                description="当前团队内图片与视频任务，可继续加载更多记录。"
              >
                <div className="grid gap-3">
                  {displayedRecordImages.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border border-black/[0.06] bg-white/66 p-3 dark:border-white/[0.07] dark:bg-white/[0.035]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06]">
                        {item.thumbnailUrl || item.originalUrl ? (
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            src={item.thumbnailUrl || item.originalUrl || ""}
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[#9aa4b3] dark:text-white/32" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#1f2937] dark:text-white/80">
                          {item.prompt || "未记录提示词"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-[#8792a4] dark:text-white/38">
                          <span>{getPersonName(item.userName, item.userEmail)}</span>
                          <span>{item.modelId || "默认模型"}</span>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {displayedRecordVideos.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border border-black/[0.06] bg-white/66 p-3 dark:border-white/[0.07] dark:bg-white/[0.035]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-black/[0.04] text-[#6c7687] dark:bg-white/[0.06] dark:text-white/42">
                        <Video className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#1f2937] dark:text-white/80">
                          {item.modelRef || "视频分镜任务"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-[#8792a4] dark:text-white/38">
                          <span>{getPersonName(item.userName, item.userEmail)}</span>
                          <span>{item.status || "unknown"}</span>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {displayedRecordImages.length === 0 &&
                  displayedRecordVideos.length === 0 ? (
                    <EmptyState label="当前团队暂无生成记录" />
                  ) : null}

                  {recordNotice ? (
                    <div
                      className={cn(
                        "rounded-[14px] px-3 py-2 text-[13px]",
                        recordNotice.type === "success"
                          ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                          : "bg-red-500/10 text-red-700 dark:text-red-300"
                      )}
                    >
                      {recordNotice.message}
                    </div>
                  ) : null}

                  {canLoadMoreRecords ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-[14px] border-black/10 bg-white/80 text-[13px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                      disabled={isLoadingRecords}
                      onClick={() => {
                        void loadTeamRecords();
                      }}
                    >
                      {isLoadingRecords ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {recordPage ? "加载更多记录" : "查看全部记录"}
                    </Button>
                  ) : recordPage ? (
                    <div className="text-center text-[12px] text-[#8792a4] dark:text-white/38">
                      已加载当前可访问的团队记录
                    </div>
                  ) : null}
                </div>
              </SectionShell>
            </section>

            <section className="grid gap-4">
              <SectionShell
                icon={<FileText className="h-4 w-4" />}
                title="快捷短语"
                description="团队级 prompt 片段，后续前端输入框可以直接从这里读取，不再写死在客户端。"
              >
                {quickPhraseNotice ? (
                  <div
                    className={cn(
                      "mb-3 rounded-[14px] px-3 py-2 text-[13px]",
                      quickPhraseNotice.type === "success"
                        ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                        : "bg-red-500/10 text-red-700 dark:text-red-300"
                    )}
                  >
                    {quickPhraseNotice.message}
                  </div>
                ) : null}

                <div className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <input
                      aria-label="快捷短语标题"
                      className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                      maxLength={128}
                      onChange={(event) => {
                        setQuickPhraseDraft((current) => ({
                          ...current,
                          title: event.currentTarget.value,
                        }));
                      }}
                      placeholder="标题，例如：社媒轮播图"
                      value={quickPhraseDraft.title}
                    />
                    <input
                      aria-label="快捷短语分类"
                      className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                      maxLength={64}
                      onChange={(event) => {
                        setQuickPhraseDraft((current) => ({
                          ...current,
                          category: event.currentTarget.value,
                        }));
                      }}
                      placeholder="分类"
                      value={quickPhraseDraft.category}
                    />
                  </div>
                  <textarea
                    aria-label="快捷短语内容"
                    className="mt-3 min-h-[92px] w-full rounded-[12px] border border-black/10 bg-white px-3 py-2 text-[13px] leading-5 text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    maxLength={4000}
                    onChange={(event) => {
                      setQuickPhraseDraft((current) => ({
                        ...current,
                        content: event.currentTarget.value,
                      }));
                    }}
                    placeholder="输入团队可复用的 prompt 片段"
                    value={quickPhraseDraft.content}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-[12px] text-[#8792a4] dark:text-white/38">
                      已配置 {formatNumber(data.quickPhrases.count)} 条
                    </div>
                    <Button
                      type="button"
                      className="h-9 rounded-[12px] bg-brand-accent px-4 text-[13px] text-black hover:bg-brand-accent/90 disabled:opacity-45"
                      disabled={
                        isCreatingQuickPhrase ||
                        !quickPhraseDraft.title.trim() ||
                        !quickPhraseDraft.content.trim()
                      }
                      onClick={() => {
                        void createTeamQuickPhrase();
                      }}
                    >
                      {isCreatingQuickPhrase ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      新增
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {data.quickPhrases.items.map((phrase) => {
                    const isUpdating = updatingQuickPhraseId === phrase.id;

                    return (
                      <div
                        key={phrase.id}
                        className="rounded-[16px] border border-black/[0.06] bg-white/66 p-4 dark:border-white/[0.07] dark:bg-white/[0.035]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              "border-transparent",
                              phrase.isEnabled
                                ? "bg-brand-accent text-black hover:bg-brand-accent"
                                : "bg-black/5 text-[#7b8797] hover:bg-black/5 dark:bg-white/8 dark:text-white/42"
                            )}
                          >
                            {phrase.isEnabled ? "启用" : "停用"}
                          </Badge>
                          {phrase.category ? (
                            <Badge
                              variant="outline"
                              className="border-black/10 text-[#667085] dark:border-white/12 dark:text-white/52"
                            >
                              {phrase.category}
                            </Badge>
                          ) : null}
                          <span className="text-[12px] text-[#8792a4] dark:text-white/38">
                            使用 {formatNumber(phrase.usageCount)} 次
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <input
                            aria-label="编辑快捷短语标题"
                            className="h-9 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] font-medium text-[#1f2937] outline-none transition focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                            defaultValue={phrase.title}
                            disabled={isUpdating}
                            maxLength={128}
                            onBlur={(event) => {
                              const title = event.currentTarget.value.trim();
                              if (!title) {
                                event.currentTarget.value = phrase.title;
                                setQuickPhraseNotice({
                                  type: "error",
                                  message: "快捷短语标题不能为空",
                                });
                                return;
                              }
                              if (title !== phrase.title) {
                                void updateTeamQuickPhrase(phrase.id, {
                                  title,
                                });
                              }
                            }}
                          />
                          <input
                            aria-label="编辑快捷短语分类"
                            className="h-9 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-[#1f2937] outline-none transition placeholder:text-[#9aa4b3] focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                            defaultValue={phrase.category || ""}
                            disabled={isUpdating}
                            maxLength={64}
                            onBlur={(event) => {
                              const category =
                                event.currentTarget.value.trim() || null;
                              if (category !== (phrase.category || null)) {
                                void updateTeamQuickPhrase(phrase.id, {
                                  category,
                                });
                              }
                            }}
                            placeholder="无分类"
                          />
                        </div>

                        <textarea
                          aria-label="编辑快捷短语内容"
                          className="mt-3 min-h-[86px] w-full rounded-[12px] border border-black/10 bg-white px-3 py-2 text-[13px] leading-5 text-[#1f2937] outline-none transition focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                          defaultValue={phrase.content}
                          disabled={isUpdating}
                          maxLength={4000}
                          onBlur={(event) => {
                            const content = event.currentTarget.value.trim();
                            if (!content) {
                              event.currentTarget.value = phrase.content;
                              setQuickPhraseNotice({
                                type: "error",
                                message: "快捷短语内容不能为空",
                              });
                              return;
                            }
                            if (content !== phrase.content) {
                              void updateTeamQuickPhrase(phrase.id, {
                                content,
                              });
                            }
                          }}
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-[12px] text-[#8792a4] dark:text-white/38">
                            排序
                            <input
                              aria-label="快捷短语排序"
                              className="h-8 w-20 rounded-[10px] border border-black/10 bg-white px-2 text-[12px] text-[#1f2937] outline-none transition focus:border-brand-accent dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                              defaultValue={phrase.sortOrder}
                              disabled={isUpdating}
                              inputMode="numeric"
                              onBlur={(event) => {
                                const nextValue = Number(
                                  event.currentTarget.value.trim() || 0
                                );
                                if (
                                  !Number.isInteger(nextValue) ||
                                  nextValue < -100_000 ||
                                  nextValue > 100_000
                                ) {
                                  event.currentTarget.value = String(
                                    phrase.sortOrder
                                  );
                                  setQuickPhraseNotice({
                                    type: "error",
                                    message:
                                      "快捷短语排序必须为 -100000 到 100000 之间的整数",
                                  });
                                  return;
                                }

                                if (nextValue !== phrase.sortOrder) {
                                  void updateTeamQuickPhrase(phrase.id, {
                                    sortOrder: nextValue,
                                  });
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.currentTarget.blur();
                                }
                              }}
                              type="number"
                            />
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                              disabled={isUpdating}
                              onClick={() => {
                                void updateTeamQuickPhrase(phrase.id, {
                                  isEnabled: !phrase.isEnabled,
                                });
                              }}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              {phrase.isEnabled ? "停用" : "启用"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-[12px] border-black/10 bg-white/80 px-3 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-red-300 dark:hover:bg-red-500/10"
                              disabled={isUpdating}
                              onClick={() => {
                                void deleteTeamQuickPhrase(phrase.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {data.quickPhrases.items.length === 0 ? (
                    <EmptyState label="还没有团队快捷短语，先新增一条可复用 prompt" />
                  ) : null}
                </div>
              </SectionShell>

              <SectionShell
                icon={<CreditCard className="h-4 w-4" />}
                title="余额与账单"
                description="团队余额、支付汇总和最近账单流水。"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile
                    icon={<Wallet className="h-4 w-4" />}
                    label="余额"
                    value={formatNumber(data.billing.accountBalanceCredits)}
                    hint="Credits"
                  />
                  <MetricTile
                    icon={<ReceiptText className="h-4 w-4" />}
                    label="已支付"
                    value={formatCurrencyFromCents(data.billing.paidAmountCents)}
                    hint={`${formatNumber(data.billing.totalOrders)} 笔订单`}
                  />
                  <MetricTile
                    icon={<CreditCard className="h-4 w-4" />}
                    label="待支付"
                    value={formatCurrencyFromCents(data.billing.pendingAmountCents)}
                    hint="Pending"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                      账单流水
                    </h3>
                    <span className="text-[12px] text-[#8792a4] dark:text-white/38">
                      Credits 变动
                    </span>
                  </div>
                  {displayedBillingLedger.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-[14px] border border-black/[0.06] bg-white/60 px-3 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.035]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">
                          {item.description || item.type}
                        </div>
                        <div className="mt-1 text-[12px] text-[#8792a4] dark:text-white/38">
                          {formatDateTime(item.occurredAt || item.createdAt)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-[13px] font-semibold",
                          item.amountCredits >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-[#7b8797] dark:text-white/42"
                        )}
                      >
                        {item.amountCredits >= 0 ? "+" : ""}
                        {formatNumber(item.amountCredits)}
                      </div>
                    </div>
                  ))}
                  {displayedBillingLedger.length === 0 ? (
                    <EmptyState label="暂无账单流水" />
                  ) : null}

                  {billingPage ? (
                    <div className="pt-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-[13px] font-semibold text-[#1f2937] dark:text-white/80">
                          支付订单明细
                        </h3>
                        <span className="text-[12px] text-[#8792a4] dark:text-white/38">
                          最近 {formatNumber(displayedBillingOrders.length)} 笔
                        </span>
                      </div>
                      <div className="space-y-2">
                        {displayedBillingOrders.map((order) => (
                          <div
                            className="rounded-[14px] border border-black/[0.06] bg-white/60 px-3 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.035]"
                            key={order.id}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-medium text-[#1f2937] dark:text-white/82">
                                  {order.packageId || order.outTradeNo}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-[#8792a4] dark:text-white/38">
                                  <span>{order.provider}</span>
                                  <span>{order.status}</span>
                                  <span>
                                    {formatDateTime(order.paidAt || order.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[13px] font-semibold text-[#111827] dark:text-white">
                                  {formatCurrencyFromCents(order.amountCents)}
                                </div>
                                <div className="mt-1 text-[12px] text-[#8792a4] dark:text-white/38">
                                  {formatNumber(order.points)} Credits
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {displayedBillingOrders.length === 0 ? (
                          <EmptyState label="暂无支付订单明细" />
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {billingNotice ? (
                    <div
                      className={cn(
                        "rounded-[14px] px-3 py-2 text-[13px]",
                        billingNotice.type === "success"
                          ? "bg-brand-accent/18 text-[#4b5600] dark:text-brand-accent"
                          : "bg-red-500/10 text-red-700 dark:text-red-300"
                      )}
                    >
                      {billingNotice.message}
                    </div>
                  ) : null}

                  {canLoadMoreBilling ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-[14px] border-black/10 bg-white/80 text-[13px] text-[#1f2937] hover:bg-white disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
                      disabled={isLoadingBilling}
                      onClick={() => {
                        void loadTeamBilling();
                      }}
                    >
                      {isLoadingBilling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {billingPage ? "加载更多账单" : "查看全部账单"}
                    </Button>
                  ) : billingPage ? (
                    <div className="text-center text-[12px] text-[#8792a4] dark:text-white/38">
                      已加载当前团队账单
                    </div>
                  ) : null}
                </div>
              </SectionShell>
            </section>
          </>
        ) : null}
        </div>
      </div>
    </main>
  );
}
