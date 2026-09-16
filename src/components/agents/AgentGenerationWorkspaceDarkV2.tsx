// Modified for standalone community distribution; see NOTICE.
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  CheckCircle2,
  Droplet,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  ImagePlus,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Upload,
  UserRound,
  Trash2,
  X,
  Wand2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { ImageParamsBar, type ImageGenerationParams } from "@/src/components/image-params-bar";
import { AgentWorkflowShowcaseBanner } from "@/src/components/agents/AgentWorkflowShowcaseBanner";
import { AgentDetailReferenceStitchDialog } from "@/src/components/agents/AgentDetailReferenceStitchDialog";
import { AgentImageTextEditDialog } from "@/src/components/agents/AgentImageTextEditDialog";
import { AgentPreviewImage } from "@/src/components/agents/AgentPreviewImage";
import {
  applyUploadedDetailReferenceToCard,
  createUploadedDetailReferenceCard,
  uploadDetailReferenceImageFile,
  type UploadedDetailReferenceImage,
} from "@/src/components/agents/detail-reference-upload";
import { ImageAnnotator } from "@/src/components/image-annotator";
import { GenerationDotPlaceholder } from "@/src/components/generation-dot-placeholder";
import { useCanvasStore } from "@/src/store/canvas/index";
import { imageGenerationService } from "@/src/services/canvas/index";
import {
  LOCAL_EDIT_COLORS,
  LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION,
  LOCAL_EDIT_MAX_REGIONS,
  createLocalEditReferenceImageId,
  createLocalEditRegionId,
  reindexLocalEditRegions,
  type LocalEditReferenceImage,
  type LocalEditRegion,
} from "@/src/components/canvas/nodes/image-node/image-node-local-edit";
import { apiFetch, createApiHref } from "@/src/client/api";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import { requestLongTaskResult } from "@/src/client/long-task";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import { extractImageUrlsFromText } from "@/src/lib/image-url";
import {
  AGENT_DETAIL_BUNDLE_SLOT_INDEXES,
  AGENT_DETAIL_FIELD_EXAMPLES,
  AGENT_DETAIL_MODEL_SLOT_INDEX,
  AGENT_DETAIL_PRODUCT_SLOT_INDEXES,
  AGENT_DETAIL_SLOT_CONFIGS,
  AGENT_DETAIL_TARGET_HEIGHT,
  AGENT_DETAIL_TARGET_WIDTH,
  createEmptyAgentDetailBriefForm,
  createEmptyAgentDetailSlots,
  extractAgentDetailFrameCount,
  normalizeAgentDetailGenerationMode,
  sanitizeAgentDetailBrief,
  sanitizeDetailImageModelPrompt,
} from "@/src/lib/agents/detail-generation-config";
import {
  normalizeAgentPresetModeConfig,
} from "@/src/lib/agents/preset-mode-config";
import {
  defaultAgentWorkflowBusinessModeSettings,
  normalizeAgentWorkflowBusinessModeSettings,
  normalizeAgentWorkflowPageFeatureSettings,
} from "@/src/lib/agents/workflow-ui-config";
import { buildAgentSceneImageRolePrompt } from "@/src/lib/agents/scene-image-role-prompt";
import type { Attachment, ChatMessage } from "@/src/lib/types";
import { cn, fetchWithErrorHandlers, fetcher, generateUUID } from "@/src/lib/utils";
import { AgentCanvasTopNavDark } from "@/src/components/agents/AgentCanvasTopNavDark";
import type {
  AgentDetailBriefForm,
  AgentDetailGenerationProgressState,
  AgentDetailReplacementStrategy,
  AgentGenerationProjectWorkspaceState,
  AgentGenerationProjectResultCollections,
  AgentGenerationResultModeType,
  AgentModeReferenceCandidate,
  AgentModeWorkspaceState,
  AgentPreset,
  AgentTaskDetailReferenceSource,
  AgentWorkflowShowcaseConfig,
  AgentWorkflowComposerContext,
  AgentWorkflowBusinessModeKey,
  AgentWorkflowBusinessModeConfig,
  AgentWorkflowBusinessModeSettings,
  AgentWorkflowMaterialQueryType,
  AgentWorkflowProductDetailChannel,
  AgentWorkflowReferenceQueryType,
  AgentWorkflowPageFeatureSettings,
  AgentWorkflowSelectedBrandModel,
} from "@/types/agent";
import {
  createEmptyAgentModeWorkspaceState,
} from "@/src/lib/agents/mode-workspace-state";
import {
  createEmptyAgentGenerationProjectWorkspaceState,
  normalizeAgentGenerationProjectPersistedState,
} from "@/src/lib/agents/generation-project-state";

export interface AgentGenerationWorkspaceDarkV2Props {
  chatId: string;
  projectId: string;
  selectedAgentPresetId?: string | null;
  selectedBrandModel?: AgentWorkflowSelectedBrandModel | null;
  workflowContext?: AgentWorkflowComposerContext | null;
  workflowBusinessModeSettings?: AgentWorkflowBusinessModeSettings | null;
  workflowFeatureSettings?: AgentWorkflowPageFeatureSettings | null;
  workflowPromptOptimizationEnabled?: boolean;
  getLatestWorkflowContext?: () => AgentWorkflowComposerContext | null;
  onBack?: () => void;
  brandStorePanel?: ReactNode;
  materialSelectionPanel?: ReactNode;
  brandModelPanel?: ReactNode;
  siteName?: string | null;
  siteLogo?: string | null;
  siteLogoDark?: string | null;
  syncGeneratedResultsToCanvas?: boolean;
  agentModeState?: AgentModeWorkspaceState | null;
  onAgentModeStateChange?: (next: AgentModeWorkspaceState) => void;
  onOpenCanvasEditor?: () => void;
  workspaceState?: AgentGenerationProjectWorkspaceState | null;
  onWorkspaceStateChange?: (next: AgentGenerationProjectWorkspaceState) => void;
  resultCollections?: AgentGenerationProjectResultCollections | null;
  deletedResultCollections?: AgentGenerationProjectResultCollections | null;
  onResultPreviewUrlsChange?: (
    modeType: AgentGenerationResultModeType,
    urls: string[]
  ) => void;
  onDeleteResultImage?: (
    modeType: AgentGenerationResultModeType,
    imageUrl: string
  ) => void;
  topNavRightSlot?: ReactNode;
  showcaseConfig?: AgentWorkflowShowcaseConfig | null;
  workflowStylePanel?: ReactNode;
}

interface AgentWorkflowModelOption {
  id: string;
  displayName: string;
  providerType: string;
  supportsImageGen?: boolean;
  isMultimodal?: boolean;
  imageGenConfig?: any;
}

interface PickedAttachment extends Attachment {}

type BatchDownloadScope = "scene" | "detail" | "sku";
type BatchDownloadTaskStatus =
  | "idle"
  | "starting"
  | "pending"
  | "running"
  | "completed"
  | "failed";

type BatchDownloadTaskSnapshot = {
  id: string;
  folderName: string;
  status: Exclude<BatchDownloadTaskStatus, "idle" | "starting">;
  stage: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progress: number;
  error: string;
  downloadUrl: string;
  expiresAt: number;
};

type BatchDownloadDialogState = {
  scope: BatchDownloadScope;
  zipName: string;
  status: BatchDownloadTaskStatus;
  taskId: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  progress: number;
  stage: string;
  error: string;
  downloadUrl: string;
  expiresAt: number;
};

type DetailResultLocalEditTarget = {
  cardId: string;
  imageUrl: string;
  mode?: DetailResultLocalEditMode;
  title: string;
  resultModeType: "detail_generation" | "detail_replacement";
};

type DetailResultLocalEditMode = "local_edit" | "scale_adjust";
type DetailResultScalePercent = -30 | -20 | -10 | 10 | 20 | 30;

type DetailResultLocalEditRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DetailResultLocalEditSubmitParams = {
  imageUrl: string;
  mode: DetailResultLocalEditMode;
  scalePercent?: DetailResultScalePercent;
  title: string;
  regions: LocalEditRegion[];
};

const MAX_CHAT_TEXT_PART_LENGTH = 2000;
const MAX_CHAT_HIDDEN_PROMPT_LENGTH = 4000;
const MAX_CHAT_ATTACHMENT_NAME_LENGTH = 100;
const MAX_AGENT_MODE_QUERY_LENGTH = 64;
const MAX_AGENT_MODE_REFERENCE_COUNT = 40;
const DETAIL_LOCAL_EDIT_REFERENCE_MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const DETAIL_SCALE_ADJUST_OPTIONS: DetailResultScalePercent[] = [
  -30,
  -20,
  -10,
  10,
  20,
  30,
];
const DIRECT_MODEL_UPLOAD_SLOT_COUNT = 4;
const PRODUCT_DETAIL_CHANNEL_OPTIONS: Array<{
  value: AgentWorkflowProductDetailChannel;
  label: string;
}> = [
  { value: "taobao", label: "淘宝" },
  { value: "1688", label: "1688" },
  { value: "douyin", label: "抖音" },
  { value: "jd", label: "京东" },
];
const CHAT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_CHAT_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
  "image/bmp",
  "image/svg+xml",
]);

function isValidChatUuid(value?: string | null): value is string {
  return Boolean(value && CHAT_UUID_REGEX.test(String(value).trim()));
}

function isValidChatHttpUrl(value?: string | null): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function clampChatRequestText(value?: string | null, maxLength = MAX_CHAT_TEXT_PART_LENGTH): string {
  return String(value || "").slice(0, maxLength);
}

function normalizeChatAttachmentName(value?: string | null): string {
  const normalized = String(value || "").trim() || "参考图";
  return normalized.slice(0, MAX_CHAT_ATTACHMENT_NAME_LENGTH);
}

function normalizeChatMediaType(value?: string | null): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "image/pjpeg") return "image/jpeg";
  if (normalized === "image/x-png") return "image/png";
  if (ALLOWED_CHAT_MEDIA_TYPES.has(normalized)) {
    return normalized;
  }
  return "image/jpeg";
}

function normalizeBatchDownloadTaskSnapshot(
  value: unknown
): BatchDownloadTaskSnapshot | null {
  const record = (value || {}) as Record<string, unknown>;
  const id = String(record.id || "").trim();
  const status = String(record.status || "").trim();
  if (
    !id ||
    (status !== "pending" &&
      status !== "running" &&
      status !== "completed" &&
      status !== "failed")
  ) {
    return null;
  }

  return {
    id,
    folderName: String(record.folderName || "").trim(),
    status,
    stage: String(record.stage || "").trim(),
    totalCount: Math.max(0, Number(record.totalCount || 0)),
    processedCount: Math.max(0, Number(record.processedCount || 0)),
    successCount: Math.max(0, Number(record.successCount || 0)),
    failedCount: Math.max(0, Number(record.failedCount || 0)),
    progress: Math.max(0, Math.min(100, Number(record.progress || 0))),
    error: String(record.error || "").trim(),
    downloadUrl: String(record.downloadUrl || "").trim(),
    expiresAt: Math.max(0, Number(record.expiresAt || 0)),
  };
}

function sanitizeChatAttachment(
  attachment?: PickedAttachment | null,
): PickedAttachment | null {
  if (!attachment || !isValidChatHttpUrl(attachment.url)) {
    return null;
  }

  return {
    ...attachment,
    url: attachment.url,
    name: normalizeChatAttachmentName(attachment.name),
    contentType: normalizeChatMediaType(attachment.contentType),
    assetId: isValidChatUuid(attachment.assetId) ? attachment.assetId : undefined,
  };
}

interface GeneratedImageGroup {
  messageId: string;
  imageUrls: string[];
  text: string;
  replacementCardId?: string | null;
}

interface AgentModeReferenceSearchResponse {
  success?: boolean;
  data?: {
    query: string;
    queryType: AgentWorkflowReferenceQueryType;
    target: AgentTaskDetailReferenceSource;
    matchedSpu?: string | null;
    matchedSku?: string | null;
    brandName?: string | null;
    categoryName?: string | null;
    shopName?: string | null;
    channel?: AgentWorkflowProductDetailChannel | null;
    candidateCount: number;
    candidates: AgentModeReferenceCandidate[];
    selectedCandidateId?: string | null;
    references: AgentModeWorkspaceState["detailReplacement"]["references"];
  };
  error?: {
    code?: string;
    message?: string;
  };
}

const AI_DETAIL_GENERATION_DISABLED_MESSAGE = "开发中";
const IS_AI_DETAIL_GENERATION_DISABLED = true;
const DEFAULT_DETAIL_REPLACEMENT_STRATEGY: AgentDetailReplacementStrategy =
  "scene_replace";

function getTaskDetailReferenceSourceLabel(source: AgentTaskDetailReferenceSource) {
  return source === "main" ? "主图" : source === "sku" ? "SKU图" : "详情图";
}

function getResultModeTypeByBusinessMode(
  mode: AgentWorkflowBusinessModeConfig | null | undefined,
  method: "reference_replace" | "ai_detail_generate"
): AgentGenerationResultModeType {
  if (mode?.key !== "detail") {
    return "scene_generation";
  }

  const canReferenceReplace = mode.referenceReplaceEnabled !== false;
  const canAiDetailGenerate =
    mode.aiDetailGenerateEnabled !== false && !IS_AI_DETAIL_GENERATION_DISABLED;
  if (method === "ai_detail_generate" && canAiDetailGenerate) {
    return "detail_generation";
  }
  if (canReferenceReplace) {
    return "detail_replacement";
  }
  return canAiDetailGenerate ? "detail_generation" : "detail_replacement";
}

function normalizeResultCollectionUrls(urls?: string[] | null) {
  return Array.from(
    new Set(
      (urls || [])
        .map((item) => String(item || "").trim())
        .filter((item) => /^https?:\/\//i.test(item))
    )
  );
}

function excludeDeletedResultUrls(
  urls: string[] | undefined | null,
  deletedUrls: string[] | undefined | null
) {
  const deletedUrlSet = new Set(normalizeResultCollectionUrls(deletedUrls));
  return normalizeResultCollectionUrls(urls).filter((url) => !deletedUrlSet.has(url));
}

function getResultModeLabel(modeType: AgentGenerationResultModeType) {
  return modeType === "detail_generation"
    ? "AI详情"
    : modeType === "detail_replacement"
    ? "参考图替换"
    : modeType === "sku_replacement"
      ? "SKU替换"
      : "场景图";
}

function areImageGenerationParamsEqual(
  left: ImageGenerationParams,
  right: ImageGenerationParams
) {
  return (
    left.aspectRatio === right.aspectRatio &&
    left.imageSize === right.imageSize &&
    (left.imageCount || 1) === (right.imageCount || 1) &&
    left.size === right.size &&
    left.negativePrompt === right.negativePrompt &&
    left.promptExtend === right.promptExtend &&
    left.watermark === right.watermark &&
    left.seed === right.seed
  );
}

function arePickedAttachmentsEqual(
  left: Array<PickedAttachment | null>,
  right: Array<PickedAttachment | null>
) {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem && !rightItem) continue;
    if (!leftItem || !rightItem) return false;
    if (
      leftItem.url !== rightItem.url ||
      leftItem.name !== rightItem.name ||
      leftItem.contentType !== rightItem.contentType ||
      leftItem.assetId !== rightItem.assetId
    ) {
      return false;
    }
  }

  return true;
}

function areAttachmentValuesEqual(
  left:
    | PickedAttachment
    | {
        url?: string | null;
        name?: string | null;
        contentType?: string | null;
        assetId?: string | null;
      }
    | null
    | undefined,
  right:
    | PickedAttachment
    | {
        url?: string | null;
        name?: string | null;
        contentType?: string | null;
        assetId?: string | null;
      }
    | null
    | undefined
) {
  return (
    String(left?.url || "").trim() === String(right?.url || "").trim() &&
    String(left?.name || "").trim() === String(right?.name || "").trim() &&
    String(left?.contentType || "").trim() === String(right?.contentType || "").trim() &&
    String(left?.assetId || "").trim() === String(right?.assetId || "").trim()
  );
}

function mergePersistedHistoryMessages(
  currentMessages: ChatMessage[],
  persistedMessages: ChatMessage[]
) {
  if (persistedMessages.length === 0) {
    return currentMessages;
  }

  if (currentMessages.length === 0) {
    return persistedMessages;
  }

  const persistedIds = new Set(persistedMessages.map((message) => message.id));
  const extraLocalMessages = currentMessages.filter(
    (message) => !persistedIds.has(message.id)
  );
  const mergedMessages = [...persistedMessages, ...extraLocalMessages];

  if (
    mergedMessages.length === currentMessages.length &&
    mergedMessages.every((message, index) => currentMessages[index]?.id === message.id)
  ) {
    return currentMessages;
  }

  return mergedMessages;
}

function getAttachmentIdentityKey(
  attachment:
    | PickedAttachment
    | {
        url?: string | null;
        assetId?: string | null;
      }
    | null
    | undefined
) {
  const assetId = String(attachment?.assetId || "").trim();
  if (assetId) {
    return `asset:${assetId}`;
  }

  const url = String(attachment?.url || "").trim();
  return url ? `url:${url}` : null;
}

function toWorkflowReferenceAttachment(params: {
  url?: string | null;
  name?: string | null;
  label?: string | null;
  mimeType?: string | null;
  assetId?: string | null;
}): PickedAttachment | null {
  const url = String(params.url || "").trim();
  if (!isValidChatHttpUrl(url)) {
    return null;
  }

  return {
    url,
    name: normalizeChatAttachmentName(params.name || params.label || "参考图"),
    contentType: normalizeChatMediaType(params.mimeType || "image/png"),
    assetId: isValidChatUuid(params.assetId) ? params.assetId || undefined : undefined,
  };
}

type ToolStepKey =
  | "preset"
  | "brand-model"
  | "materials"
  | "prompt"
  | "settings";

function buildPreviewImageUrl(url: string, width: number) {
  return buildImageProxyUrl(url, { width, quality: 86, format: "webp" });
}

const AGENT_DEFERRED_SECTION_STYLE = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 760px",
} as CSSProperties;

const AGENT_DEFERRED_RESULTS_STYLE = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 900px",
} as CSSProperties;

const AGENT_DEFERRED_LIST_CARD_STYLE = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 320px",
} as CSSProperties;

function handlePreviewImageLoadError(
  event: SyntheticEvent<HTMLImageElement, Event>,
  originalUrl: string
) {
  const fallbackUrl = String(originalUrl || "").trim();
  if (!fallbackUrl) {
    return;
  }

  const image = event.currentTarget;
  if (image.dataset.previewFallbackApplied === "1") {
    return;
  }

  image.dataset.previewFallbackApplied = "1";
  image.src = fallbackUrl;
}

function buildDownloadFilename(url: string): string {
  const fallback = `canvas-image-${Date.now()}.png`;
  const raw = String(url || "").trim();
  if (!raw) return fallback;
  try {
    const pathname = new URL(raw).pathname || "";
    const candidate = pathname.split("/").pop() || "";
    return candidate || fallback;
  } catch {
    const candidate = raw.split("/").pop()?.split("?")[0] || "";
    return candidate || fallback;
  }
}

function normalizeAssistantText(value: string) {
  return String(value || "")
    .replace(/\n*<!-- GENERATING_IMAGE -->\n*/g, "")
    .replace(/\n*<!-- IMAGE_GENERATION_START -->\n*/g, "")
    .replace(/\n*<!-- IMAGE_GENERATION_END -->\n*/g, "")
    .replace(/\n*<!-- AGENT_REPLACEMENT_CARD_ID:[^>]*-->\n*/g, "")
    .replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g, "")
    .trim();
}

function extractReplacementCardIdFromAssistantText(value: string) {
  const match = String(value || "").match(/<!--\s*AGENT_REPLACEMENT_CARD_ID:([^>]+?)\s*-->/);
  return match?.[1]?.trim() || null;
}

function hasLikelyGenerationErrorText(value: string | null | undefined) {
  const normalized = normalizeAssistantText(String(value || ""));
  if (!normalized) {
    return false;
  }

  return /失败|超时|重试|error|failed/i.test(normalized);
}

function getImageDimensions(url: string): Promise<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 500;
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      let width = originalWidth;
      let height = originalHeight;

      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const minSize = 150;
      if (width < minSize && height < minSize) {
        const scale = minSize / Math.min(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      resolve({ width, height, originalWidth, originalHeight });
    };
    img.onerror = () => {
      resolve({ width: 300, height: 300, originalWidth: 0, originalHeight: 0 });
    };
    img.src = url;
  });
}

type DirectDetailGenerationImage = {
  originalUrl: string;
  thumbnailUrl: string;
  title?: string;
  subtitle?: string;
  copy?: string;
};

type DirectDetailReviewResult = {
  reviewAction?: "pass" | "protocol_patch" | "regenerate_image";
  revisedPrompt?: string;
  issues?: string[];
  uiValidation?: {
    passed?: boolean;
    issues?: string[];
  };
};

const AGENT_IMAGE_TASK_POLL_INTERVAL_MS = 1600;
const AGENT_IMAGE_TASK_TIMEOUT_MS = 8 * 60 * 1000;
const AGENT_DETAIL_IMAGE_PARALLEL_WORKER_COUNT = 4;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isHttpImageUrl(url?: string) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

function getDetailLocalEditUploadFileName(file: File) {
  const extension = file.name.toLowerCase().split(".").pop() || "jpg";
  const baseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "detail-local-edit-ref";
  return `${baseName}-${Date.now()}.${extension}`;
}

async function uploadDetailLocalEditReferenceImage(
  file: File
): Promise<LocalEditReferenceImage> {
  const isImageFile =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!isImageFile) {
    throw new Error("请上传图片文件");
  }
  if (file.size > DETAIL_LOCAL_EDIT_REFERENCE_MAX_UPLOAD_BYTES) {
    throw new Error("参考图过大，请先压缩到 30MB 以内");
  }

  const formData = new FormData();
  formData.append("file", file, getDetailLocalEditUploadFileName(file));
  formData.append("purpose", "canvas-upload");

  const response = await fetchUploadWithRetry(formData);
  if (!response.ok) {
    throw await createUploadErrorFromResponse(response, "参考图上传失败");
  }
  const payload = await response.json().catch(() => null);
  if (!payload?.url) {
    throw new Error("参考图上传后未返回可用地址");
  }

  const uploadedUrl = String(payload.url || "").trim();
  if (!isHttpImageUrl(uploadedUrl)) {
    throw new Error("参考图上传后未返回可用地址");
  }

  return {
    id: createLocalEditReferenceImageId(),
    url: uploadedUrl,
    name: file.name || "区域参考图",
    source: "upload",
    createdAt: Date.now(),
  };
}

function getDetailScaleAdjustLabel(scalePercent: DetailResultScalePercent) {
  return scalePercent > 0 ? `放大 ${scalePercent}%` : `缩小 ${Math.abs(scalePercent)}%`;
}

function getDetailScaleAdjustRegionPrompt(scalePercent: DetailResultScalePercent | null) {
  return scalePercent ? `比例调整：${getDetailScaleAdjustLabel(scalePercent)}` : "比例调整";
}

function DetailResultLocalEditDialog({
  submitting,
  target,
  onClose,
  onSubmit,
}: {
  submitting: boolean;
  target: DetailResultLocalEditTarget | null;
  onClose: () => void;
  onSubmit: (params: DetailResultLocalEditSubmitParams) => void;
}) {
  const [regions, setRegions] = useState<LocalEditRegion[]>([]);
  const [draftRect, setDraftRect] = useState<DetailResultLocalEditRect | null>(null);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [uploadingRegionId, setUploadingRegionId] = useState<string | null>(null);
  const [selectedScalePercent, setSelectedScalePercent] =
    useState<DetailResultScalePercent | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const mode: DetailResultLocalEditMode =
    target?.mode === "scale_adjust" ? "scale_adjust" : "local_edit";
  const isScaleAdjustMode = mode === "scale_adjust";

  useEffect(() => {
    setRegions([]);
    setDraftRect(null);
    setActiveRegionId(null);
    setUploadingRegionId(null);
    setSelectedScalePercent(null);
    dragStartRef.current = null;
  }, [target?.cardId, target?.imageUrl, target?.mode]);

  useEffect(() => {
    if (regions.length === 0) {
      if (activeRegionId) setActiveRegionId(null);
      return;
    }
    if (!activeRegionId || !regions.some((region) => region.id === activeRegionId)) {
      setActiveRegionId(regions[0]?.id || null);
    }
  }, [activeRegionId, regions]);

  const getPoint = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0;
    const y = bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, []);

  const createRectFromPoints = useCallback(
    (start: { x: number; y: number }, point: { x: number; y: number }) => {
      const left = Math.min(start.x, point.x);
      const top = Math.min(start.y, point.y);
      return {
        x: left,
        y: top,
        width: Math.min(1 - left, Math.max(0.01, Math.abs(point.x - start.x))),
        height: Math.min(1 - top, Math.max(0.01, Math.abs(point.y - start.y))),
      };
    },
    []
  );

  const updateDraftRect = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start) return;
      const point = getPoint(event);
      setDraftRect(createRectFromPoints(start, point));
    },
    [createRectFromPoints, getPoint]
  );

  const updateRegionPrompt = useCallback((regionId: string, prompt: string) => {
    setRegions((current) =>
      current.map((region) => (region.id === regionId ? { ...region, prompt } : region))
    );
  }, []);

  const removeRegion = useCallback((regionId: string) => {
    setRegions((current) =>
      reindexLocalEditRegions(current.filter((region) => region.id !== regionId))
    );
  }, []);

  const removeReferenceImage = useCallback((regionId: string, referenceId: string) => {
    setRegions((current) =>
      current.map((region) =>
        region.id === regionId
          ? {
              ...region,
              referenceImages: (region.referenceImages || []).filter(
                (reference) => reference.id !== referenceId
              ),
            }
          : region
      )
    );
  }, []);

  const handleReferenceUpload = useCallback(
    async (regionId: string, fileList: FileList | null) => {
      const files = Array.from(fileList || []).filter(
        (file) =>
          file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
      );
      if (files.length === 0) return;

      const currentRegion = regions.find((region) => region.id === regionId);
      if (!currentRegion) return;

      const currentReferences = currentRegion.referenceImages || [];
      const remainingSlots =
        LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION - currentReferences.length;
      if (remainingSlots <= 0) {
        toast.info(
          `每个局部编辑区域最多添加 ${LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION} 张参考图`
        );
        return;
      }

      const selectedFiles = files.slice(0, remainingSlots);
      if (files.length > selectedFiles.length) {
        toast.info(
          `已自动保留前 ${LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION} 张参考图`
        );
      }

      setUploadingRegionId(regionId);
      try {
        const uploadedReferences = await Promise.all(
          selectedFiles.map((file) => uploadDetailLocalEditReferenceImage(file))
        );
        setRegions((current) =>
          reindexLocalEditRegions(
            current.map((region) =>
              region.id === regionId
                ? {
                    ...region,
                    referenceImages: [
                      ...(region.referenceImages || []),
                      ...uploadedReferences,
                    ].slice(0, LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION),
                  }
                : region
            )
          )
        );
        toast.success(
          uploadedReferences.length > 1
            ? `已添加 ${uploadedReferences.length} 张区域参考图`
            : "已添加区域参考图"
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "参考图上传失败");
      } finally {
        setUploadingRegionId(null);
      }
    },
    [regions]
  );

  const handleSubmit = useCallback(() => {
    if (!target) return;
    if (uploadingRegionId) {
      toast.info("参考图上传中，请稍候");
      return;
    }

    const validRegions = reindexLocalEditRegions(
      regions.map((region) => ({
        ...region,
        prompt: isScaleAdjustMode
          ? getDetailScaleAdjustRegionPrompt(selectedScalePercent)
          : region.prompt.trim(),
        referenceImages: (region.referenceImages || []).slice(
          0,
          LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION
        ),
      }))
    );

    if (validRegions.length === 0) {
      toast.error("请先框选至少一个局部编辑区域");
      return;
    }
    const invalidRegion = validRegions.find(
      (region) => region.rect.width < 0.025 || region.rect.height < 0.025
    );
    if (invalidRegion) {
      setActiveRegionId(invalidRegion.id);
      toast.error(`区域 ${invalidRegion.index} 太小，请重新框选`);
      return;
    }
    if (isScaleAdjustMode) {
      if (!selectedScalePercent) {
        toast.error("请选择放大或缩小比例");
        return;
      }
    } else {
      const emptyPromptRegion = validRegions.find((region) => !region.prompt);
      if (emptyPromptRegion) {
        setActiveRegionId(emptyPromptRegion.id);
        toast.error(`请填写区域 ${emptyPromptRegion.index} 的提示词`);
        return;
      }
    }
    onSubmit({
      imageUrl: target.imageUrl,
      mode,
      scalePercent: isScaleAdjustMode ? selectedScalePercent || undefined : undefined,
      title: target.title,
      regions: validRegions,
    });
  }, [isScaleAdjustMode, mode, onSubmit, regions, selectedScalePercent, target, uploadingRegionId]);

  const completeDraftRegion = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start) return;

      const point = getPoint(event);
      const nextRect = createRectFromPoints(start, point);
      dragStartRef.current = null;
      setDraftRect(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (nextRect.width < 0.025 || nextRect.height < 0.025) {
        toast.info("请拖拽框选更明确的编辑区域");
        return;
      }

      const nextRegion: LocalEditRegion = {
        id: createLocalEditRegionId(),
        index: regions.length + 1,
        color: LOCAL_EDIT_COLORS[regions.length % LOCAL_EDIT_COLORS.length],
        prompt: isScaleAdjustMode
          ? getDetailScaleAdjustRegionPrompt(selectedScalePercent)
          : "",
        rect: nextRect,
        referenceImages: [],
        createdAt: Date.now(),
      };
      setRegions((current) => {
        if (current.length >= LOCAL_EDIT_MAX_REGIONS) return current;
        return reindexLocalEditRegions([...current, nextRegion]);
      });
      setActiveRegionId(nextRegion.id);
    },
    [createRectFromPoints, getPoint, isScaleAdjustMode, regions.length, selectedScalePercent]
  );

  const completionCopy =
    target?.resultModeType === "detail_replacement"
      ? "处理完成后会更新当前套详情结果图。"
      : "处理完成后会加入 AI详情结果区。";
  const isBusy = submitting || Boolean(uploadingRegionId);
  const dialogTitle = isScaleAdjustMode ? "比例调整详情图" : "局部编辑详情图";
  const dialogDescription = isScaleAdjustMode
    ? "框选要调整比例的物体，选择固定放大或缩小幅度后生成。"
    : "在图片上拖拽框选编辑位置，可添加多个区域，并为每个区域上传专属参考图。";

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-6xl border-white/10 bg-[#101214] text-white">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="text-white/50">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3">
            {target?.imageUrl ? (
              <div
                className="relative max-h-[70vh] max-w-full touch-none select-none overflow-hidden rounded-xl"
                onPointerCancel={(event) => {
                  updateDraftRect(event);
                  dragStartRef.current = null;
                  setDraftRect(null);
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0 || isBusy) return;
                  if (regions.length >= LOCAL_EDIT_MAX_REGIONS) {
                    toast.info(
                      `${isScaleAdjustMode ? "比例调整" : "局部编辑"}最多支持 ${LOCAL_EDIT_MAX_REGIONS} 个区域`
                    );
                    return;
                  }
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const point = getPoint(event);
                  dragStartRef.current = point;
                  setDraftRect({ x: point.x, y: point.y, width: 0.01, height: 0.01 });
                }}
                onPointerMove={(event) => {
                  if (!dragStartRef.current) return;
                  event.preventDefault();
                  updateDraftRect(event);
                }}
                onPointerUp={(event) => {
                  completeDraftRegion(event);
                }}
              >
                <img
                  alt={target.title}
                  className="block max-h-[70vh] max-w-full object-contain"
                  draggable={false}
                  src={buildImageProxyUrl(target.imageUrl, { width: 1200, quality: 88 })}
                />
                {regions.map((region) => {
                  const isActive = region.id === activeRegionId;
                  return (
                    <button
                      className="absolute rounded-sm border-2 bg-black/0 text-left transition"
                      key={region.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveRegionId(region.id);
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveRegionId(region.id);
                      }}
                      style={{
                        borderColor: region.color,
                        boxShadow: isActive
                          ? `0 0 0 9999px rgba(0,0,0,0.20), 0 0 0 3px ${region.color}55`
                          : "0 0 0 9999px rgba(0,0,0,0.08)",
                        left: `${region.rect.x * 100}%`,
                        top: `${region.rect.y * 100}%`,
                        width: `${region.rect.width * 100}%`,
                        height: `${region.rect.height * 100}%`,
                      }}
                      title={`区域 ${region.index}`}
                      type="button"
                    >
                      <span
                        className="absolute -left-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-lg"
                        style={{ backgroundColor: region.color }}
                      >
                        {region.index}
                      </span>
                    </button>
                  );
                })}
                {draftRect ? (
                  <div
                    className="pointer-events-none absolute border-2 border-sky-300 bg-sky-400/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.24)]"
                    style={{
                      left: `${draftRect.x * 100}%`,
                      top: `${draftRect.y * 100}%`,
                      width: `${draftRect.width * 100}%`,
                      height: `${draftRect.height * 100}%`,
                    }}
                  />
                ) : null}
                {submitting ? (
                  <DetailResultProcessingScanOverlay
                    label={isScaleAdjustMode ? "比例调整处理中" : "局部编辑处理中"}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/58">
              {isScaleAdjustMode
                ? `拖拽框选物体，建议留出少量周边背景，最多 ${LOCAL_EDIT_MAX_REGIONS} 个区域。${completionCopy}`
                : `拖拽图片添加区域。最多 ${LOCAL_EDIT_MAX_REGIONS} 个区域，每个区域最多 ${LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION} 张参考图。${completionCopy}`}
            </div>
            {isScaleAdjustMode ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
                  Scale
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DETAIL_SCALE_ADJUST_OPTIONS.map((option) => {
                    const active = selectedScalePercent === option;
                    const Icon = option > 0 ? Maximize2 : Minimize2;
                    return (
                      <button
                        className={cn(
                          "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                          active
                            ? "border-emerald-300/70 bg-emerald-400/18 text-emerald-50"
                            : "border-white/10 bg-black/20 text-white/68 hover:border-white/24 hover:bg-white/[0.08] hover:text-white"
                        )}
                        disabled={isBusy}
                        key={option}
                        onClick={() => setSelectedScalePercent(option)}
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {getDetailScaleAdjustLabel(option)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {regions.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 text-center text-sm text-white/38">
                {isScaleAdjustMode
                  ? "在左侧图片上拖拽框选物体后，选择一个比例即可生成。"
                  : "在左侧图片上拖拽框选后，这里会显示区域提示词和参考图。"}
              </div>
            ) : (
              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {regions.map((region) => {
                  const isActive = region.id === activeRegionId;
                  const references = region.referenceImages || [];
                  const canUpload =
                    !isBusy &&
                    references.length < LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION;
                  return (
                    <div
                      className={cn(
                        "rounded-2xl border bg-white/[0.035] p-3 transition",
                        isActive
                          ? "border-white/28 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                          : "border-white/10"
                      )}
                      key={region.id}
                      onClick={() => setActiveRegionId(region.id)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                            style={{ backgroundColor: region.color }}
                          >
                            {region.index}
                          </span>
                          <span className="truncate text-sm font-semibold text-white">
                            区域 {region.index}
                          </span>
                          {isScaleAdjustMode ? (
                            <span className="text-xs text-white/36">
                              {selectedScalePercent
                                ? getDetailScaleAdjustLabel(selectedScalePercent)
                                : "待选比例"}
                            </span>
                          ) : (
                            <span className="text-xs text-white/36">
                              参考图 {references.length}/
                              {LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION}
                            </span>
                          )}
                        </div>
                        <button
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
                          disabled={submitting}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeRegion(region.id);
                          }}
                          title="删除区域"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {isScaleAdjustMode ? (
                        <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-white/52">
                          将框选物体按所选比例整体缩放，保持外观结构不变。
                        </div>
                      ) : (
                        <>
                          <Textarea
                            className="min-h-[92px] resize-none border-white/10 bg-black/30 text-sm text-white placeholder:text-white/30"
                            disabled={submitting}
                            maxLength={600}
                            onChange={(event) => updateRegionPrompt(region.id, event.target.value)}
                            placeholder={`区域 ${region.index} 要怎么改`}
                            value={region.prompt}
                          />
                          <input
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                            className="hidden"
                            id={`detail-local-edit-reference-upload-${region.id}`}
                            multiple
                            onChange={(event) => {
                              void handleReferenceUpload(region.id, event.currentTarget.files);
                              event.currentTarget.value = "";
                            }}
                            type="file"
                          />
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-medium text-white/72 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={!canUpload}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                document
                                  .getElementById(
                                    `detail-local-edit-reference-upload-${region.id}`
                                  )
                                  ?.click();
                              }}
                              type="button"
                            >
                              {uploadingRegionId === region.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ImagePlus className="h-3.5 w-3.5" />
                              )}
                              参考图
                            </button>
                            {references.length === 0 ? (
                              <span className="text-xs text-white/32">可选</span>
                            ) : null}
                          </div>
                          {references.length ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {references.map((reference) => (
                                <div
                                  className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                                  key={reference.id}
                                  title={reference.name || "区域参考图"}
                                >
                                  <img
                                    alt={reference.name || "区域参考图"}
                                    className="h-full w-full object-cover"
                                    draggable={false}
                                    src={buildImageProxyUrl(reference.url, {
                                      width: 240,
                                      quality: 82,
                                    })}
                                  />
                                  <button
                                    className="absolute inset-0 hidden items-center justify-center bg-black/55 text-white group-hover:flex"
                                    disabled={submitting}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      removeReferenceImage(region.id, reference.id);
                                    }}
                                    title="移除参考图"
                                    type="button"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-auto flex justify-end gap-2">
              <Button
                className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                disabled={submitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                取消
              </Button>
                <Button
                  className="bg-white text-black hover:bg-white/90"
                  disabled={
                    submitting ||
                    Boolean(uploadingRegionId) ||
                    regions.length === 0 ||
                    (isScaleAdjustMode && !selectedScalePercent)
                  }
                  onClick={handleSubmit}
                  type="button"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isScaleAdjustMode ? "生成比例调整" : "生成局部编辑"}
                </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function runAgentBoundedParallel<T>(
  items: T[],
  workerCount: number,
  worker: (item: T, index: number) => Promise<void>
) {
  const maxWorkers = Math.max(1, Math.min(workerCount, items.length));
  let cursor = 0;
  let firstError: unknown = null;

  const workers = Array.from({ length: maxWorkers }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      if (firstError) {
        return;
      }

      try {
        await worker(items[index]!, index);
      } catch (error) {
        firstError = firstError || error;
      }
    }
  });

  await Promise.all(workers);

  if (firstError) {
    throw firstError;
  }
}

function compactDirectDetailGenerationImages(
  images: Array<DirectDetailGenerationImage | null | undefined>
) {
  return images.filter(
    (item): item is DirectDetailGenerationImage => Boolean(item?.originalUrl || item?.thumbnailUrl)
  );
}

async function requestCanvasImageGeneration(
  payload: {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    imageCount?: number;
    negativePrompt?: string;
    referenceImage?: string;
    referenceImages?: string[];
  }
): Promise<{ images: Array<{ originalUrl?: string; thumbnailUrl?: string }> }> {
  const createResponse = await apiFetch("/api/canvas/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      async: true,
    }),
  });

  const createResult = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok || !createResult?.success) {
    throw new Error(createResult?.error || "创建生图任务失败");
  }

  if (Array.isArray(createResult?.data?.images) && createResult.data.images.length > 0) {
    return { images: createResult.data.images };
  }

  const taskId = String(createResult?.taskId || "").trim();
  if (!taskId) {
    throw new Error("创建生图任务失败：未返回任务ID");
  }

  const deadline = Date.now() + AGENT_IMAGE_TASK_TIMEOUT_MS;
  let lastError = "";

  while (Date.now() < deadline) {
    await sleep(AGENT_IMAGE_TASK_POLL_INTERVAL_MS);

    const statusResponse = await apiFetch(
      `/api/canvas/generate/image?taskId=${encodeURIComponent(taskId)}`,
      { cache: "no-store" }
    );
    const statusResult = await statusResponse.json().catch(() => ({}));

    if (!statusResponse.ok || !statusResult?.success) {
      lastError = statusResult?.error || `查询任务失败(${statusResponse.status})`;
      continue;
    }

    const task = statusResult?.task;
    const status = String(task?.status || "").trim();

    if (status === "succeeded") {
      const result = task?.result || {};
      const images = Array.isArray(result?.images) ? result.images : [];
      if (images.length === 0) {
        throw new Error("任务完成但未返回图片");
      }
      return { images };
    }

    if (status === "failed") {
      throw new Error(String(task?.error || "图片生成失败"));
    }
  }

  throw new Error(lastError || "图片生成超时，请稍后重试");
}

async function normalizeAgentDetailGeneratedImage(image: {
  originalUrl?: string;
  thumbnailUrl?: string;
}) {
  const imageUrl = String(image.originalUrl || image.thumbnailUrl || "").trim();
  if (!imageUrl) {
    throw new Error("缺少详情图地址");
  }

  const response = await apiFetch("/api/agent-workflow/detail-image-normalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      width: AGENT_DETAIL_TARGET_WIDTH,
      height: AGENT_DETAIL_TARGET_HEIGHT,
      fit: "cover-top",
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success || !result?.data?.originalUrl) {
    throw new Error(result?.error || "详情图尺寸归一化失败");
  }

  return {
    originalUrl: String(result.data.originalUrl || "").trim(),
    thumbnailUrl: String(result.data.thumbnailUrl || result.data.originalUrl || "").trim(),
  };
}

function buildReferenceCardsFromCandidate(params: {
  candidate: AgentModeReferenceCandidate | null | undefined;
  target: AgentTaskDetailReferenceSource;
  productCount?: number;
  assignProductIndex?: boolean;
}) {
  const candidate = params.candidate;
  if (!candidate) return [] as AgentModeWorkspaceState["detailReplacement"]["references"];

  const rawUrls =
    params.target === "main"
      ? candidate.mainImageUrls || []
      : params.target === "detail"
        ? candidate.detailImageUrls || []
        : candidate.skuImageUrls || [];
  const urls = rawUrls;
  const targetLabel = `${getTaskDetailReferenceSourceLabel(params.target)}参考图`;
  const prefix =
    candidate.sceneName || candidate.taskNo || candidate.productModel || "候选整套";

  return urls.map((url, index) => ({
    id: `${candidate.id}-${params.target}-${index + 1}`,
    label: `${prefix} ${targetLabel} ${String(index + 1).padStart(2, "0")}`,
    imageUrl: url,
    previewUrl: url,
    candidateId: candidate.id,
    sortOrder: index,
    passthrough: false,
    assignedProductIndex:
      params.assignProductIndex === true && (params.productCount || 0) > 0
        ? Math.min(index, Math.max((params.productCount || 1) - 1, 0))
        : null,
  }));
}

function formatCandidateMeta(candidate: AgentModeReferenceCandidate, target: AgentTaskDetailReferenceSource) {
  const rawImageCount =
    target === "main"
      ? candidate.mainImageUrls.length
      : target === "detail"
        ? candidate.detailImageUrls.length
        : candidate.skuImageUrls.length;
  const imageCount = rawImageCount;
  const uploadedAt = candidate.uploadedAt ? new Date(candidate.uploadedAt) : null;
  const timeText =
    uploadedAt && !Number.isNaN(uploadedAt.getTime())
      ? uploadedAt.toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  const parts = [
    candidate.sceneName || null,
    candidate.taskNo || null,
    imageCount > 0 ? `${imageCount}张` : null,
    timeText,
  ].filter(Boolean);

  return parts.join(" · ");
}

function getCandidatePreviewUrl(
  candidate: AgentModeReferenceCandidate,
  target: AgentTaskDetailReferenceSource
) {
  const rawTargetUrls =
    target === "main"
      ? candidate.mainImageUrls || []
      : target === "detail"
        ? candidate.mainImageUrls.length > 0
          ? candidate.mainImageUrls
          : candidate.detailImageUrls || []
        : candidate.skuImageUrls || [];
  const targetUrls = rawTargetUrls;
  return (
    targetUrls[0] ||
    candidate.mainImageUrls[0] ||
    candidate.allImageUrls[0] ||
    null
  );
}

function getCandidatePreviewUrls(
  candidate: AgentModeReferenceCandidate,
  target: AgentTaskDetailReferenceSource,
  maxCount = 4
) {
  const rawTargetUrls =
    target === "main"
      ? candidate.mainImageUrls || []
      : target === "detail"
        ? candidate.mainImageUrls.length > 0
          ? candidate.mainImageUrls
          : candidate.detailImageUrls || []
        : candidate.skuImageUrls || [];
  const targetUrls = rawTargetUrls;
  const fallbackUrls = [
    ...targetUrls,
    ...(candidate.mainImageUrls || []),
    ...(candidate.allImageUrls || []),
  ];

  return Array.from(new Set(fallbackUrls.filter(Boolean))).slice(0, maxCount);
}

function getCandidateTargetCount(
  candidate: AgentModeReferenceCandidate,
  target: AgentTaskDetailReferenceSource
) {
  const rawCount =
    target === "main"
      ? candidate.mainImageUrls.length
      : target === "detail"
        ? candidate.detailImageUrls.length
        : candidate.skuImageUrls.length;
  return rawCount;
}

const IMAGE_OVERLAY_BADGE_CLASS =
  "rounded-full border border-white/25 bg-zinc-950/82 px-3 py-1.5 font-semibold text-[11px] text-white shadow-[0_12px_34px_rgba(0,0,0,0.48)] backdrop-blur-md ring-1 ring-black/20";
const IMAGE_OVERLAY_ACTIVE_BADGE_CLASS =
  "rounded-full border border-emerald-100/80 bg-emerald-600/92 px-3 py-1.5 font-semibold text-[11px] text-white shadow-[0_12px_34px_rgba(16,185,129,0.30),0_10px_28px_rgba(0,0,0,0.48)] backdrop-blur-md";
const IMAGE_OVERLAY_STATUS_BASE_CLASS =
  "rounded-full border px-3 py-1.5 font-semibold text-[11px] shadow-[0_12px_34px_rgba(0,0,0,0.50)] backdrop-blur-md ring-1 ring-black/20";
const IMAGE_OVERLAY_ACTION_CLASS =
  "rounded-full border border-white/25 bg-zinc-950/82 px-3.5 py-1.5 font-semibold text-[11px] text-white shadow-[0_12px_34px_rgba(0,0,0,0.48)] backdrop-blur-md transition-colors hover:border-emerald-200/70 hover:bg-zinc-900/92";
const IMAGE_OVERLAY_DANGER_TEXT_CLASS =
  "rounded-full border border-rose-200/55 bg-zinc-950/82 px-3 py-1.5 font-semibold text-[11px] text-rose-50 shadow-[0_12px_34px_rgba(0,0,0,0.48)] backdrop-blur-md transition-colors hover:border-rose-100 hover:bg-rose-500/30";
const IMAGE_OVERLAY_DANGER_ICON_CLASS =
  "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/55 bg-zinc-950/82 text-rose-50 shadow-[0_12px_34px_rgba(0,0,0,0.50)] backdrop-blur-md transition-colors hover:border-rose-100 hover:bg-rose-500/35";

type ReplacementCardStatus =
  | "waiting"
  | "queued"
  | "generating"
  | "completed"
  | "passthrough"
  | "fallback"
  | "missing";

type ReplacementModeType = Extract<
  AgentGenerationResultModeType,
  "detail_replacement" | "sku_replacement"
>;

interface ReplacementResultRecord {
  url: string | null;
  text: string;
  status: Extract<ReplacementCardStatus, "completed" | "passthrough" | "fallback">;
  updatedAt: number;
}

interface ReplacementExecutionContext {
  modeType: ReplacementModeType;
  cardIds: string[];
}

interface ReplacementTextEditTarget {
  open: boolean;
  modeType: ReplacementModeType;
  cardId: string;
  imageUrl: string;
  title: string;
}

interface ReplacementRerunTarget {
  open: boolean;
  modeType: ReplacementModeType;
  cardId: string;
  title: string;
}

type ReplacementResultState = Record<
  ReplacementModeType,
  Record<string, ReplacementResultRecord>
>;

const MANUAL_PASSTHROUGH_RESULT_TEXT =
  "已按人工标记沿用参考图，直接应用当前切片，不参与继续生成。";

function createEmptyReplacementResultState(): ReplacementResultState {
  return {
    detail_replacement: {},
    sku_replacement: {},
  };
}

function inferReplacementCardStatusFromText(text: string | null | undefined): ReplacementCardStatus | null {
  const normalized = normalizeAssistantText(String(text || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("生成失败，当前先沿用参考图")) {
    return "fallback";
  }

  if (
    normalized.includes(MANUAL_PASSTHROUGH_RESULT_TEXT) ||
    normalized.includes("已按人工标记沿用参考图")
  ) {
    return "passthrough";
  }

  return "completed";
}

function getReplacementCardStatus(params: {
  index: number;
  resultUrl: string | null;
  resultText?: string | null;
  generatedCount: number;
  isGenerating: boolean;
  activeRunIndex?: number | null;
}): ReplacementCardStatus {
  if (
    typeof params.activeRunIndex === "number" &&
    params.activeRunIndex >= 0 &&
    params.generatedCount <= params.activeRunIndex
  ) {
    if (params.isGenerating) {
      return params.generatedCount === params.activeRunIndex ? "generating" : "queued";
    }
    if (!params.resultUrl && params.generatedCount > 0) {
      return "missing";
    }
  }

  if (params.resultUrl) {
    return inferReplacementCardStatusFromText(params.resultText) || "completed";
  }
  if (params.isGenerating) {
    return params.index === params.generatedCount ? "generating" : "queued";
  }
  if (params.generatedCount > 0 && params.index >= params.generatedCount) {
    return "missing";
  }
  return "waiting";
}

function getReplacementCardStatusMeta(status: ReplacementCardStatus) {
  switch (status) {
    case "passthrough":
      return {
        label: "不处理直出",
        className:
          "border-brand-accent/80 bg-brand-accent/92 text-brand-accent-foreground",
      };
    case "fallback":
      return {
        label: "失败已沿用",
        className: "border-amber-100/80 bg-amber-500/92 text-zinc-950",
      };
    case "completed":
      return {
        label: "已生成",
        className: "border-emerald-100/80 bg-emerald-600/92 text-white",
      };
    case "generating":
      return {
        label: "生成中",
        className: "border-sky-100/80 bg-sky-600/92 text-white",
      };
    case "queued":
      return {
        label: "排队中",
        className: "border-white/25 bg-zinc-950/82 text-white",
      };
    case "missing":
      return {
        label: "未回传",
        className: "border-amber-100/80 bg-amber-500/92 text-zinc-950",
      };
    default:
      return {
        label: "待生成",
        className: "border-white/25 bg-zinc-950/82 text-white",
      };
  }
}

interface LocalGenerationPendingState {
  chatId: string;
  modeType: AgentGenerationResultModeType;
  expectedCount: number;
  userTurnCountAtStart: number;
  timestamp: number;
  requestedCardIds?: string[] | null;
}

const AGENT_PENDING_GENERATION_STORAGE_KEY = "ai-chatbot-agent-pending-generations";
const AGENT_PENDING_GENERATION_EXPIRY_MS = 30 * 60 * 1000;
const AGENT_SCENE_PENDING_FAILURE_GRACE_MS = 3 * 60 * 1000;

function getStoredAgentPendingGenerations(): LocalGenerationPendingState[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AGENT_PENDING_GENERATION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const now = Date.now();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const record = item as Record<string, unknown>;
      const chatId = String(record.chatId || "").trim();
      const modeType = String(record.modeType || "").trim();
      const expectedCount = Number(record.expectedCount);
      const userTurnCountAtStart = Number(record.userTurnCountAtStart);
      const timestamp = Number(record.timestamp);
      return (
        Boolean(chatId) &&
        (modeType === "scene_generation" ||
          modeType === "detail_generation" ||
          modeType === "detail_replacement" ||
          modeType === "sku_replacement") &&
        Number.isFinite(expectedCount) &&
        expectedCount > 0 &&
        Number.isFinite(userTurnCountAtStart) &&
        Number.isFinite(timestamp) &&
        now - timestamp < AGENT_PENDING_GENERATION_EXPIRY_MS
      );
    }).map((item) => {
      const record = item as Record<string, unknown>;
      return {
        chatId: String(record.chatId || "").trim(),
        modeType: String(record.modeType || "").trim() as AgentGenerationResultModeType,
        expectedCount: Number(record.expectedCount),
        userTurnCountAtStart: Number(record.userTurnCountAtStart),
        timestamp: Number(record.timestamp),
        requestedCardIds: Array.isArray(record.requestedCardIds)
          ? record.requestedCardIds
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
              .slice(0, MAX_AGENT_MODE_REFERENCE_COUNT)
          : null,
      } satisfies LocalGenerationPendingState;
    });
  } catch {
    return [];
  }
}

function saveStoredAgentPendingGenerations(items: LocalGenerationPendingState[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      AGENT_PENDING_GENERATION_STORAGE_KEY,
      JSON.stringify(items)
    );
  } catch (error) {
    console.warn(
      "[AgentGenerationWorkspaceDarkV2] Failed to persist pending generation state:",
      error
    );
  }
}

function DetailResultProcessingScanOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-30 overflow-hidden rounded-[inherit] bg-[#030605]/48">
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-[0.36]"
        animate={{
          backgroundPosition: ["0px 0px, 0px 0px", "0px 24px, 24px 0px"],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.13) 0px, rgba(255,255,255,0.13) 1px, transparent 1px, transparent 24px), linear-gradient(90deg, rgba(16,185,129,0.1) 0px, rgba(16,185,129,0.1) 1px, transparent 1px, transparent 24px)",
          backgroundSize: "100% 24px, 24px 100%",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.12), transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.08), transparent 18%, transparent 82%, rgba(255,255,255,0.08))",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-[-6%] h-[34%] min-h-[150px]"
        animate={{ top: ["-36%", "108%"], opacity: [0.3, 1, 0.46] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: [0.33, 0, 0.67, 1] }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.04) 18%, rgb(var(--brand-accent-rgb) / 0.1) 38%, rgba(255,255,255,0.72) 50%, rgb(var(--brand-accent-rgb) / 0.1) 62%, rgba(16,185,129,0.04) 82%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-[3%] top-1/2 h-[2px] -translate-y-1/2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.86),0_0_18px_rgb(var(--brand-accent-rgb)/0.58)]" />
        <div className="absolute inset-x-[4%] top-[calc(50%-18px)] h-px bg-emerald-100/55" />
        <div className="absolute inset-x-[4%] top-[calc(50%+18px)] h-px bg-brand-accent/42" />
        <div
          className="absolute inset-x-[5%] top-[calc(50%-44px)] h-[88px] opacity-55"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.38) 0 1px, transparent 1px 12px)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 16%, black 84%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 16%, black 84%, transparent 100%)",
          }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-y-0 w-px bg-emerald-100/36"
        animate={{ left: ["8%", "92%", "8%"], opacity: [0.08, 0.35, 0.08] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-emerald-100/70 bg-zinc-950/88 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 shadow-[0_14px_36px_rgba(0,0,0,0.5),0_0_18px_rgba(16,185,129,0.2)] backdrop-blur-md">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-200" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function ResultProcessedHintBubble({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-zinc-950/88 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 shadow-[0_14px_34px_rgba(0,0,0,0.42),0_0_20px_rgba(16,185,129,0.22)] backdrop-blur-md">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
        <span>{label}</span>
      </div>
    </motion.div>
  );
}

function AnimatedGenerationPlaceholderCard(params: {
  title: string;
  description: string;
  badge: string;
  badgeClassName?: string;
  showSpinner?: boolean;
  animated?: boolean;
}) {
  const isAnimated = Boolean(params.animated);
  return (
    <GenerationDotPlaceholder
      className="h-full min-h-0 w-full rounded-[8px]"
      compact
      phase={isAnimated ? "processing" : "queued"}
      showProgress={isAnimated}
      title={isAnimated ? "正在生成" : params.badge}
    />
  );
}

export function AgentGenerationWorkspaceDarkV2({
  chatId,
  projectId,
  selectedAgentPresetId,
  selectedBrandModel = null,
  workflowContext = null,
  workflowBusinessModeSettings = null,
  workflowFeatureSettings = null,
  workflowPromptOptimizationEnabled = true,
  getLatestWorkflowContext,
  onBack,
  brandStorePanel,
  materialSelectionPanel,
  brandModelPanel,
  siteName,
  siteLogo,
  siteLogoDark,
  syncGeneratedResultsToCanvas = true,
  agentModeState = null,
  onAgentModeStateChange,
  onOpenCanvasEditor,
  workspaceState = null,
  resultCollections = null,
  deletedResultCollections = null,
  onWorkspaceStateChange,
  onResultPreviewUrlsChange,
  onDeleteResultImage,
  topNavRightSlot,
  showcaseConfig,
  workflowStylePanel,
}: AgentGenerationWorkspaceDarkV2Props) {
  const darkSelectContentClass =
    "border-white/10 bg-zinc-950 text-white shadow-2xl [--popover:hsl(240_10%_3.9%)] [--popover-foreground:hsl(0_0%_98%)] [--accent:rgba(255,255,255,0.08)] [--accent-foreground:hsl(0_0%_98%)] [--muted:rgba(255,255,255,0.04)] [--muted-foreground:rgba(255,255,255,0.56)]";
  const rawChatId = useMemo(
    () => (chatId.startsWith("canvas-") ? chatId.replace("canvas-", "") : chatId),
    [chatId]
  );
  const addNode = useCanvasStore((state) => state.addNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const selectNodes = useCanvasStore((state) => state.selectNodes);
  const requestImageNodeAction = useCanvasStore((state) => state.requestImageNodeAction);
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const detailSlotInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hiddenPromptRef = useRef<string | null>(null);
  const generatedImageKeysRef = useRef<Set<string>>(new Set());
  const lastSyncedBrandModelUrlRef = useRef<string | null>(null);
  const lastSyncedProductSlotKeysRef = useRef<Array<string | null>>([]);
  const lastSyncedDetailProductSlotKeysRef = useRef<Array<string | null>>([]);
  const lastSyncedDetailBundleSlotKeysRef = useRef<Array<string | null>>([]);
  const lastSyncedDetailModelSlotKeyRef = useRef<string | null>(null);
  const detailGenerationCancelRef = useRef(false);
  const workspaceStateSignatureRef = useRef<string>("");
  const generationRequestSnapshotRef = useRef<{
    hiddenPrompt: string | null;
    replacementExecutionCardIds: string[] | null;
  }>({
    hiddenPrompt: null,
    replacementExecutionCardIds: null,
  });
  const [localAgentModeState, setLocalAgentModeState] = useState<AgentModeWorkspaceState>(
    () => createEmptyAgentModeWorkspaceState()
  );
  const normalizedIncomingWorkspaceState = useMemo(
    () =>
      normalizeAgentGenerationProjectPersistedState({
        workflowState: {},
        workspaceState,
        resultImageUrls: [],
      }).workspaceState || createEmptyAgentGenerationProjectWorkspaceState(),
    [workspaceState]
  );
  const resolvedWorkflowFeatureSettings = useMemo(
    () => normalizeAgentWorkflowPageFeatureSettings(workflowFeatureSettings),
    [workflowFeatureSettings]
  );
  const resolvedBusinessModeSettings = useMemo(
    () => normalizeAgentWorkflowBusinessModeSettings(workflowBusinessModeSettings),
    [workflowBusinessModeSettings]
  );
  const isBusinessModeStepEnabled = resolvedWorkflowFeatureSettings.presetStepEnabled !== false;
  const isMaterialStepEnabled = resolvedWorkflowFeatureSettings.materialStepEnabled !== false;
  const requiresPresetSelection = false;
  const isDirectModelGenerationMode = !requiresPresetSelection;
  const hasMaterialStep = isMaterialStepEnabled && Boolean(materialSelectionPanel);

  const [input, setInput] = useState(normalizedIncomingWorkspaceState.input);
  const [attachments, setAttachments] = useState<Array<PickedAttachment | null>>(
    normalizedIncomingWorkspaceState.attachments.map((item) =>
      item
        ? {
            url: item.url,
            name: item.name || "参考图",
            contentType: item.contentType || "image/png",
            assetId: item.assetId || undefined,
          }
        : null
    )
  );
  const [isAttachmentSlotExpanded, setIsAttachmentSlotExpanded] = useState(false);
  const [isScenePromptExpanded, setIsScenePromptExpanded] = useState(false);
  const [slotUploading, setSlotUploading] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    normalizedIncomingWorkspaceState.selectedModelId || "auto"
  );
  const [selectedResultUrl, setSelectedResultUrl] = useState<string | null>(null);
  const [activeBusinessModeKey, setActiveBusinessModeKey] =
    useState<AgentWorkflowBusinessModeKey>("main_sku");
  const [activeResultModeType, setActiveResultModeType] =
    useState<AgentGenerationResultModeType>("scene_generation");
  const [fullscreenPreview, setFullscreenPreview] = useState<string | null>(null);
  const [sceneResizeEditorTargetUrl, setSceneResizeEditorTargetUrl] = useState<string | null>(null);
  const [detailLocalEditTarget, setDetailLocalEditTarget] =
    useState<DetailResultLocalEditTarget | null>(null);
  const [detailLocalEditSubmittingId, setDetailLocalEditSubmittingId] =
    useState<string | null>(null);
  const [detailLocalEditSubmittingMode, setDetailLocalEditSubmittingMode] =
    useState<DetailResultLocalEditMode | null>(null);
  const [detailEnhancingCardIds, setDetailEnhancingCardIds] = useState<Set<string>>(
    () => new Set()
  );
  const [batchDownloadState, setBatchDownloadState] =
    useState<null | BatchDownloadScope>(null);
  const [batchDownloadDialog, setBatchDownloadDialog] =
    useState<BatchDownloadDialogState | null>(null);
  const [detailReplacementSearchState, setDetailReplacementSearchState] = useState<{
    isLoading: boolean;
    lastQuery: string | null;
  }>({
    isLoading: false,
    lastQuery: null,
  });
  const [detailProductIdQueryInput, setDetailProductIdQueryInput] = useState("");
  const [detailReferenceStitchDialogOpen, setDetailReferenceStitchDialogOpen] = useState(false);
  const [activeDetailReferenceCardId, setActiveDetailReferenceCardId] = useState<string | null>(null);
  const [detailReferenceUploadTarget, setDetailReferenceUploadTarget] =
    useState<null | { type: "append" } | { type: "replace"; cardId: string }>(null);
  const [skuReplacementSearchState, setSkuReplacementSearchState] = useState<{
    isLoading: boolean;
    lastQuery: string | null;
  }>({
    isLoading: false,
    lastQuery: null,
  });
  const [activeSkuReferenceCardId, setActiveSkuReferenceCardId] = useState<string | null>(null);
  const [imageParams, setImageParams] = useState<ImageGenerationParams>({
    aspectRatio: normalizedIncomingWorkspaceState.imageParams?.aspectRatio || "auto",
    imageSize: normalizedIncomingWorkspaceState.imageParams?.imageSize || "2K",
    imageCount: normalizedIncomingWorkspaceState.imageParams?.imageCount || 1,
  });
  const [pendingGeneration, setPendingGeneration] =
    useState<LocalGenerationPendingState | null>(null);
  const [detailGenerationRunResults, setDetailGenerationRunResults] = useState<
    DirectDetailGenerationImage[]
  >([]);
  const [processedResultHintByUrl, setProcessedResultHintByUrl] = useState<
    Record<string, string>
  >({});
  const [replacementResultState, setReplacementResultState] = useState<ReplacementResultState>(
    () => createEmptyReplacementResultState()
  );
  const [replacementExecutionContext, setReplacementExecutionContext] =
    useState<ReplacementExecutionContext | null>(null);
  const [replacementTextEditTarget, setReplacementTextEditTarget] =
    useState<ReplacementTextEditTarget | null>(null);
  const [replacementRerunTarget, setReplacementRerunTarget] =
    useState<ReplacementRerunTarget | null>(null);
  const [replacementRerunPrompt, setReplacementRerunPrompt] = useState("");
  const [detailWatermarkRemoveCardIds, setDetailWatermarkRemoveCardIds] =
    useState<Set<string>>(() => new Set());
  const processedResultHintTimerRef = useRef<Record<string, number>>({});
  const normalizedDeletedResultCollections = useMemo(
    () => ({
      scene_generation: normalizeResultCollectionUrls(
        deletedResultCollections?.scene_generation
      ),
      detail_generation: normalizeResultCollectionUrls(
        deletedResultCollections?.detail_generation
      ),
      detail_replacement: normalizeResultCollectionUrls(
        deletedResultCollections?.detail_replacement
      ),
      sku_replacement: normalizeResultCollectionUrls(
        deletedResultCollections?.sku_replacement
      ),
    }),
    [deletedResultCollections]
  );

  useEffect(() => {
    const restored = getStoredAgentPendingGenerations().find(
      (item) => item.chatId === chatId
    );
    if (!restored) {
      return;
    }

    setPendingGeneration((current) => current || restored);
  }, [chatId]);

  useEffect(() => {
    const allItems = getStoredAgentPendingGenerations().filter(
      (item) => item.chatId !== chatId
    );
    if (pendingGeneration) {
      allItems.push(pendingGeneration);
    }
    saveStoredAgentPendingGenerations(allItems);
  }, [chatId, pendingGeneration]);

  const { data: historyData } = useSWR<{ messages: ChatMessage[] }>(
    rawChatId ? `/api/messages?chatId=${rawChatId}` : null,
    fetcher,
    {
      refreshInterval: selectedAgentPresetId || isDirectModelGenerationMode ? 3000 : 0,
      revalidateOnFocus: true,
    }
  );

  const { data: modelsData } = useSWR<{
    models: AgentWorkflowModelOption[];
    defaultModelId?: string | null;
    agentWorkflowConfiguredDefaultModelId?: string | null;
    agentWorkflowDefaultModelId?: string | null;
    agentWorkflowConfiguredModels?: AgentWorkflowModelOption[];
    agentModel?: any;
  }>("/api/models", fetcher);

  const { data: agentPresetResponse } = useSWR<{
    success?: boolean;
    data?: AgentPreset;
  }>(selectedAgentPresetId ? `/api/agents/${selectedAgentPresetId}` : null, fetcher);

  const selectedAgentPreset = useMemo(
    () => (agentPresetResponse?.success && agentPresetResponse.data ? agentPresetResponse.data : null),
    [agentPresetResponse]
  );

  const historyMessages = useMemo(() => historyData?.messages || [], [historyData?.messages]);
  const referenceImages = workflowContext?.referenceImages || [];
  const resolvedAgentModeState = agentModeState || localAgentModeState;
  const emitAgentModeState = onAgentModeStateChange || setLocalAgentModeState;
  const detailReplacementState = resolvedAgentModeState.detailReplacement;
  const detailReplacementMethod =
    detailReplacementState.method === "ai_detail_generate" && !IS_AI_DETAIL_GENERATION_DISABLED
      ? "ai_detail_generate"
      : "reference_replace";
  const detailReplacementReferenceCards = detailReplacementState.references;
  const detailReplacementQueryType = detailReplacementState.queryType || "spu";
  const detailReplacementProductDetailChannel =
    detailReplacementState.productDetailChannel || "taobao";
  const detailReplacementStrategy =
    detailReplacementState.replacementStrategy === "product_only"
      ? "product_only"
      : DEFAULT_DETAIL_REPLACEMENT_STRATEGY;
  const skuReplacementState = resolvedAgentModeState.skuReplacement;
  const skuReplacementReferenceCards = skuReplacementState.references;
  const presetModeConfig = useMemo(
    () => normalizeAgentPresetModeConfig(selectedAgentPreset?.defaultParams),
    [selectedAgentPreset?.defaultParams]
  );
  const businessModeCards = resolvedBusinessModeSettings.modes.length > 0
    ? resolvedBusinessModeSettings.modes
    : defaultAgentWorkflowBusinessModeSettings.modes;
  const activeBusinessMode = businessModeCards.find((mode) => mode.key === activeBusinessModeKey) ||
    businessModeCards[0] ||
    defaultAgentWorkflowBusinessModeSettings.modes[0];
  const activeBusinessModeDefaultModelId = !requiresPresetSelection
    ? String(activeBusinessMode?.defaultModelId || "").trim() || null
    : null;
  const lockedWorkflowModelId =
    activeBusinessModeDefaultModelId ||
    selectedAgentPreset?.defaultModelId ||
    modelsData?.agentWorkflowConfiguredDefaultModelId ||
    modelsData?.agentWorkflowDefaultModelId ||
    null;
  const isWorkflowModelLocked = Boolean(lockedWorkflowModelId);
  const effectiveDefaultModelId =
    lockedWorkflowModelId ||
    modelsData?.defaultModelId ||
    null;
  const presetDrivenResultModeType: AgentGenerationResultModeType =
    selectedAgentPreset?.type === "image" && presetModeConfig.modeType === "detail_replacement"
      ? detailReplacementMethod === "ai_detail_generate"
        ? "detail_generation"
        : "detail_replacement"
      : selectedAgentPreset?.type === "image" && presetModeConfig.modeType === "sku_replacement"
        ? "sku_replacement"
        : "scene_generation";
  const businessModeResultModeType = getResultModeTypeByBusinessMode(
    activeBusinessMode,
    detailReplacementMethod
  );
  const currentResultModeType: AgentGenerationResultModeType = requiresPresetSelection
    ? presetDrivenResultModeType
    : businessModeResultModeType;
  const isSceneGenerationPreset = currentResultModeType === "scene_generation";
  const isDetailReplacementPreset =
    currentResultModeType === "detail_replacement" ||
    currentResultModeType === "detail_generation";
  const isSkuReplacementPreset = currentResultModeType === "sku_replacement";
  const isDetailAiGenerationMethod = currentResultModeType === "detail_generation";
  const isReplacementPreset =
    currentResultModeType === "detail_replacement" || currentResultModeType === "sku_replacement";
  const isProductOnlyDetailReplacementMode =
    currentResultModeType === "detail_replacement" &&
    detailReplacementStrategy === "product_only";
  const isSelectedBusinessModeUnavailable = activeBusinessMode?.enabled === false;
  const productSlotCount =
    selectedAgentPreset?.type === "image" && requiresPresetSelection
      ? isSceneGenerationPreset
        ? presetModeConfig.scene.productImageSlotCount
        : isDetailReplacementPreset
          ? presetModeConfig.detail.productImageSlotCount
          : isSkuReplacementPreset
            ? presetModeConfig.sku.productImageSlotCount
            : 2
      : 2;
  const modelSlotEnabled =
    selectedAgentPreset?.type === "image" && requiresPresetSelection
      ? isSceneGenerationPreset
        ? presetModeConfig.scene.includeModelSlot
        : isDetailReplacementPreset
          ? presetModeConfig.detail.includeModelSlot
          : isSkuReplacementPreset
            ? presetModeConfig.sku.includeModelSlot
            : true
      : isSceneGenerationPreset || isDetailReplacementPreset || isSkuReplacementPreset;
  const modelSlotIndex = modelSlotEnabled ? productSlotCount : -1;
  const hasAgentUploadSlots = Boolean(
    hasMaterialStep && selectedAgentPreset && selectedAgentPreset.type !== "text"
  );
  const agentUploadSlots = useMemo(
    () => {
      if (!hasAgentUploadSlots) return [];
      const nextSlots = Array.from({ length: productSlotCount }, (_, index) => ({
        slotIndex: index,
        label: `产品图${index + 1}`,
      }));
      if (modelSlotEnabled) {
        nextSlots.push({
          slotIndex: modelSlotIndex,
          label: "模特图",
        });
      }
      return nextSlots;
    },
    [hasAgentUploadSlots, modelSlotEnabled, modelSlotIndex, productSlotCount]
  );
  const isDirectReferenceUploadEnabled = isDirectModelGenerationMode && !hasMaterialStep;
  const visibleAttachmentUploadSlots = agentUploadSlots;
  const hasVisibleAttachmentUploadSlots =
    hasAgentUploadSlots && visibleAttachmentUploadSlots.length > 0;
  const requiredProductUploadCount = hasAgentUploadSlots ? productSlotCount : 0;
  const detailReferenceTarget = presetModeConfig.detail.referenceImageSource;
  const skuReferenceTarget = presetModeConfig.sku.referenceImageSource;
  const detailReferenceSourceLabel = getTaskDetailReferenceSourceLabel(detailReferenceTarget);
  const skuReferenceSourceLabel = getTaskDetailReferenceSourceLabel(skuReferenceTarget);
  const getCurrentWorkflowBrandName = useCallback(
    () => String((getLatestWorkflowContext?.() ?? workflowContext)?.brand || "").trim(),
    [getLatestWorkflowContext, workflowContext]
  );
  const workflowBrandName = getCurrentWorkflowBrandName();
  const getCurrentWorkflowPrimarySpu = useCallback(
    () => {
      const latestWorkflowContext = getLatestWorkflowContext?.() ?? workflowContext;
      const explicitSpu = String(latestWorkflowContext?.primarySpu || "").trim();
      if (explicitSpu) {
        return explicitSpu;
      }

      const primaryReferenceSpu = latestWorkflowContext?.referenceImages
        ?.find((image) => image.source === "primary" && image.productModel)
        ?.productModel?.trim();
      if (primaryReferenceSpu) {
        return primaryReferenceSpu;
      }

      return String(latestWorkflowContext?.primarySku || "").trim();
    },
    [getLatestWorkflowContext, workflowContext]
  );
  const workflowPrimarySpu = getCurrentWorkflowPrimarySpu();
  const normalizedWorkflowPrimarySpu = workflowPrimarySpu.toUpperCase();
  const shouldAllowModelOverride =
    !isWorkflowModelLocked &&
    (isDirectModelGenerationMode || !isSceneGenerationPreset || presetModeConfig.scene.allowModelOverride);
  const brandModelAttachmentKeys = useMemo(() => {
    const keys = new Set<string>();
    referenceImages
      .filter((image) => image.source === "brandModel")
      .forEach((image) => {
        const key = getAttachmentIdentityKey(image);
        if (key) {
          keys.add(key);
        }
      });

    const selectedBrandModelKey = getAttachmentIdentityKey({
      url: selectedBrandModel?.imageUrl || null,
      assetId: selectedBrandModel?.assetId || null,
    });
    if (selectedBrandModelKey) {
      keys.add(selectedBrandModelKey);
    }

    const currentModelSlotKey =
      modelSlotIndex >= 0 ? getAttachmentIdentityKey(attachments[modelSlotIndex]) : null;
    if (currentModelSlotKey) {
      keys.add(currentModelSlotKey);
    }

    return keys;
  }, [
    attachments,
    modelSlotIndex,
    referenceImages,
    selectedBrandModel?.assetId,
    selectedBrandModel?.imageUrl,
  ]);
  const selectedProductAttachments = useMemo(
    () =>
      attachments
        .slice(0, productSlotCount)
        .filter((item): item is PickedAttachment => {
          if (!item) return false;
          const attachmentKey = getAttachmentIdentityKey(item);
          return !attachmentKey || !brandModelAttachmentKeys.has(attachmentKey);
        }),
    [attachments, brandModelAttachmentKeys, productSlotCount]
  );
  const selectedModelAttachment =
    modelSlotIndex >= 0 && attachments[modelSlotIndex] ? attachments[modelSlotIndex] : null;
  const detailReplacementProductSourceImages = useMemo(() => {
    const primaryImages = referenceImages.filter((image) => image.source === "primary");
    const fallbackProductImages = referenceImages.filter(
      (image) => image.source === "primary" || image.source === "secondary"
    );
    const productImages = primaryImages.length > 0 ? primaryImages : fallbackProductImages;

    return productImages
      .filter((image) => isValidChatHttpUrl(image.url))
      .slice(0, 16)
      .map((image) => ({
        url: image.url,
        label: image.label || image.name || "产品图",
        name: image.name || image.label || "产品图",
        assetId: image.assetId || null,
      }));
  }, [referenceImages]);
  const detailReplacementModelSourceImage = useMemo(() => {
    const referenceModelImage = referenceImages.find(
      (image) => image.source === "brandModel" && isValidChatHttpUrl(image.url)
    );
    if (referenceModelImage) {
      return {
        url: referenceModelImage.url,
        label: referenceModelImage.label || referenceModelImage.name || "模特图",
        name: referenceModelImage.name || referenceModelImage.label || "模特图",
        assetId: referenceModelImage.assetId || null,
      };
    }
    if (selectedModelAttachment && isValidChatHttpUrl(selectedModelAttachment.url)) {
      return {
        url: selectedModelAttachment.url,
        label: selectedModelAttachment.name || "模特图",
        name: selectedModelAttachment.name || "模特图",
        assetId: selectedModelAttachment.assetId || null,
      };
    }
    if (selectedBrandModel?.imageUrl && isValidChatHttpUrl(selectedBrandModel.imageUrl)) {
      return {
        url: selectedBrandModel.imageUrl,
        label: selectedBrandModel.displayName || `${selectedBrandModel.brandName || "品牌"}模特图`,
        name: selectedBrandModel.displayName || `${selectedBrandModel.brandName || "品牌"}模特图`,
        assetId: selectedBrandModel.assetId || null,
      };
    }
    return null;
  }, [
    referenceImages,
    selectedBrandModel?.assetId,
    selectedBrandModel?.brandName,
    selectedBrandModel?.displayName,
    selectedBrandModel?.imageUrl,
    selectedModelAttachment,
  ]);
  const scenePrimaryReferenceCount = useMemo(
    () => referenceImages.filter((image) => image.source === "primary").length,
    [referenceImages]
  );
  const sceneSecondaryReferenceAttachments = useMemo(() => {
    const seenKeys = new Set<string>();
    return referenceImages
      .filter((image) => image.source === "secondary")
      .map((image) =>
        toWorkflowReferenceAttachment({
          url: image.url,
          name: image.name,
          label: image.label,
          mimeType: image.mimeType,
          assetId: image.assetId || null,
        })
      )
      .filter((attachment): attachment is PickedAttachment => {
        if (!attachment) return false;
        const key = getAttachmentIdentityKey(attachment);
        if (key && seenKeys.has(key)) {
          return false;
        }
        if (key) {
          seenKeys.add(key);
        }
        return true;
      });
  }, [referenceImages]);
  const sceneSecondaryReferenceCount = sceneSecondaryReferenceAttachments.length;
  const sceneMessageAttachments = useMemo(() => {
    if (isDirectModelGenerationMode && hasMaterialStep) {
      const seenKeys = new Set<string>();
      const pushUnique = (attachment: PickedAttachment | null) => {
        if (!attachment) return null;
        const key = getAttachmentIdentityKey(attachment);
        if (key && seenKeys.has(key)) {
          return null;
        }
        if (key) {
          seenKeys.add(key);
        }
        return attachment;
      };

      const workflowAttachments = referenceImages
        .map((image) =>
          toWorkflowReferenceAttachment({
            url: image.url,
            name: image.name,
            label: image.label,
            mimeType: image.mimeType,
            assetId: image.assetId || null,
          })
        )
        .map(pushUnique)
        .filter((attachment): attachment is PickedAttachment => Boolean(attachment));
      const replacementAttachments =
        currentResultModeType === "detail_replacement"
          ? detailReplacementReferenceCards.map((card, index) =>
              toWorkflowReferenceAttachment({
                url: card.imageUrl,
                name: `详情参考图 ${index + 1}`,
                label: card.label,
                mimeType: "image/png",
                assetId: null,
              })
            )
          : currentResultModeType === "sku_replacement"
            ? skuReplacementReferenceCards.map((card, index) =>
                toWorkflowReferenceAttachment({
                  url: card.imageUrl,
                  name: `SKU参考图 ${index + 1}`,
                  label: card.label,
                  mimeType: "image/png",
                  assetId: null,
                })
              )
            : [];

      return [
        ...workflowAttachments,
        ...replacementAttachments
          .map(pushUnique)
          .filter((attachment): attachment is PickedAttachment => Boolean(attachment)),
      ];
    }

    if (isDirectReferenceUploadEnabled) {
      return attachments
        .slice(0, DIRECT_MODEL_UPLOAD_SLOT_COUNT)
        .map((attachment) => sanitizeChatAttachment(attachment))
        .filter((attachment): attachment is PickedAttachment => Boolean(attachment));
    }

    if (!isSceneGenerationPreset) {
      return attachments
        .map((attachment) => sanitizeChatAttachment(attachment))
        .filter((attachment): attachment is PickedAttachment => Boolean(attachment));
    }

    const ordered: PickedAttachment[] = [];
    const seenKeys = new Set<string>();
    const pushUniqueAttachment = (
      attachment:
        | PickedAttachment
        | {
            url?: string | null;
            name?: string | null;
            contentType?: string | null;
            assetId?: string | null;
          }
        | null
        | undefined
    ) => {
      const sanitized = sanitizeChatAttachment(attachment as PickedAttachment | null | undefined);
      if (!sanitized) return;
      const key = getAttachmentIdentityKey(sanitized);
      if (key && seenKeys.has(key)) {
        return;
      }
      if (key) {
        seenKeys.add(key);
      }
      ordered.push(sanitized);
    };

    const primaryVisibleCount = Math.min(
      Math.max(scenePrimaryReferenceCount, selectedProductAttachments.length > 0 ? 1 : 0),
      selectedProductAttachments.length
    );
    selectedProductAttachments.slice(0, primaryVisibleCount).forEach((attachment) => {
      pushUniqueAttachment(attachment);
    });
    selectedProductAttachments.slice(primaryVisibleCount).forEach((attachment) => {
      pushUniqueAttachment(attachment);
    });
    sceneSecondaryReferenceAttachments.forEach((attachment) => {
      pushUniqueAttachment(attachment);
    });
    pushUniqueAttachment(selectedModelAttachment);

    attachments.forEach((attachment) => {
      pushUniqueAttachment(attachment);
    });

    return ordered;
  }, [
    attachments,
    hasMaterialStep,
    currentResultModeType,
    detailReplacementReferenceCards,
    isDirectModelGenerationMode,
    isDirectReferenceUploadEnabled,
    isSceneGenerationPreset,
    referenceImages,
    scenePrimaryReferenceCount,
    sceneSecondaryReferenceAttachments,
    selectedModelAttachment,
    selectedProductAttachments,
    skuReplacementReferenceCards,
  ]);
  const filledProductAttachmentCount = selectedProductAttachments.length;
  const missingAttachmentCount = Math.max(
    requiredProductUploadCount - filledProductAttachmentCount,
    0
  );
  const productAttachmentSummary = `${selectedProductAttachments.length}/${productSlotCount} 张产品图`;
  const modelAttachmentSummary = modelSlotEnabled
    ? selectedModelAttachment
      ? "模特图已带入"
      : "模特图可不选"
    : null;
  const attachmentSummaryReady =
    hasAgentUploadSlots &&
    (requiredProductUploadCount === 0 || filledProductAttachmentCount >= requiredProductUploadCount);
  const sceneImageRolePromptPreview = useMemo(() => {
    const sceneHasModelReference = Boolean(selectedModelAttachment);
    if (
      !isSceneGenerationPreset ||
      scenePrimaryReferenceCount + sceneSecondaryReferenceCount + (sceneHasModelReference ? 1 : 0) <= 0
    ) {
      return "";
    }

    return buildAgentSceneImageRolePrompt({
      primaryProductImageCount: Math.max(scenePrimaryReferenceCount, selectedProductAttachments.length > 0 ? 1 : 0),
      bundleProductImageCount: sceneSecondaryReferenceCount,
      includeModelImage: sceneHasModelReference,
    });
  }, [
    isSceneGenerationPreset,
    scenePrimaryReferenceCount,
    sceneSecondaryReferenceCount,
    selectedModelAttachment,
    selectedProductAttachments.length,
  ]);
  const detailReplacementQueryInput = detailReplacementState.query;
  const detailReplacementQueryDisplay =
    detailReplacementSearchState.lastQuery ||
    (detailReplacementQueryType === "productId"
      ? detailProductIdQueryInput.trim()
      : detailReplacementQueryInput.trim().toUpperCase());
  const detailReplacementCandidates = detailReplacementState.candidates;
  const detailReplacementSelectedCandidateId = detailReplacementState.selectedCandidateId;
  const detailGenerationMode = normalizeAgentDetailGenerationMode(
    detailReplacementState.generationMode
  );
  const detailGenerationBrief = sanitizeAgentDetailBrief(detailReplacementState.brief);
  const replacementTextSuggestionContext = useMemo(() => {
    const latestWorkflowContext = getLatestWorkflowContext?.() ?? workflowContext;
    return {
      audience: detailGenerationBrief.targetAudience || null,
      usageScenario: detailGenerationBrief.usageScenario || null,
      coreNeed: detailGenerationBrief.coreNeed || null,
      productName: detailGenerationBrief.productName || null,
      workflowSummary: latestWorkflowContext?.summaryText || null,
      workflowPrompt: latestWorkflowContext?.promptText || null,
      userPrompt: input.trim() || null,
      presetName: selectedAgentPreset?.name || null,
    };
  }, [
    detailGenerationBrief.coreNeed,
    detailGenerationBrief.productName,
    detailGenerationBrief.targetAudience,
    detailGenerationBrief.usageScenario,
    getLatestWorkflowContext,
    input,
    selectedAgentPreset?.name,
    workflowContext,
  ]);
  const detailGenerationSlots =
    Array.isArray(detailReplacementState.slots) &&
    detailReplacementState.slots.length === AGENT_DETAIL_SLOT_CONFIGS.length
      ? detailReplacementState.slots
      : createEmptyAgentDetailSlots();
  const detailGenerationRequiredProductCount = Math.max(
    1,
    Math.min(
      isDetailReplacementPreset
        ? presetModeConfig.detail.productImageSlotCount
        : productSlotCount,
      AGENT_DETAIL_PRODUCT_SLOT_INDEXES.length
    )
  );
  const detailGenerationProductSlotIndexes = useMemo(
    () =>
      AGENT_DETAIL_PRODUCT_SLOT_INDEXES.slice(0, detailGenerationRequiredProductCount),
    [detailGenerationRequiredProductCount]
  );
  const detailGenerationVisibleSlotIndexes = useMemo(
    () => [
      ...detailGenerationProductSlotIndexes,
      ...(modelSlotEnabled && AGENT_DETAIL_MODEL_SLOT_INDEX >= 0
        ? [AGENT_DETAIL_MODEL_SLOT_INDEX]
        : []),
      ...AGENT_DETAIL_BUNDLE_SLOT_INDEXES,
    ],
    [detailGenerationProductSlotIndexes, modelSlotEnabled]
  );
  const detailGenerationProgress =
    (detailReplacementState.progress || {
      status: "idle",
      stage: "",
      current: 0,
      total: 0,
      startedAt: null,
      finishedAt: null,
    }) as AgentDetailGenerationProgressState;
  const detailGenerationProductCount = detailGenerationProductSlotIndexes.filter(
    (index) => Boolean(detailGenerationSlots[index]?.url)
  ).length;
  const detailGenerationBundleCount = AGENT_DETAIL_BUNDLE_SLOT_INDEXES.filter(
    (index) => Boolean(detailGenerationSlots[index]?.url)
  ).length;
  const detailGenerationModelReady = Boolean(
    modelSlotEnabled &&
      AGENT_DETAIL_MODEL_SLOT_INDEX >= 0 &&
      detailGenerationSlots[AGENT_DETAIL_MODEL_SLOT_INDEX]?.url
  );
  const detailGenerationValidationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!detailGenerationBrief.targetAudience) issues.push("缺少主购买人群");
    if (!detailGenerationBrief.usageScenario) issues.push("缺少需求场景");
    if (!detailGenerationBrief.coreNeed) issues.push("缺少核心需求");
    if (detailGenerationProductCount < detailGenerationRequiredProductCount) {
      issues.push(
        `产品图不足（${detailGenerationProductCount}/${detailGenerationRequiredProductCount}）`
      );
    }
    return issues;
  }, [
    detailGenerationBrief.coreNeed,
    detailGenerationBrief.targetAudience,
    detailGenerationBrief.usageScenario,
    detailGenerationProductCount,
    detailGenerationRequiredProductCount,
  ]);
  const skuReplacementQueryInput = skuReplacementState.query;
  const skuReplacementQueryType = skuReplacementState.queryType;
  const skuReplacementCandidates = skuReplacementState.candidates;
  const skuReplacementSelectedCandidateId = skuReplacementState.selectedCandidateId;
  const transportStateRef = useRef<{
    selectedAgentPresetId: string | null;
    selectedAgentPresetType: AgentPreset["type"] | null;
    selectedModelId: string;
    lockedWorkflowModelId: string | null;
    imageParams: ImageGenerationParams;
    isDetailReplacementPreset: boolean;
    isSkuReplacementPreset: boolean;
    detailReplacementQueryInput: string;
    detailReplacementQueryType: AgentWorkflowReferenceQueryType;
    detailReplacementStrategy: AgentDetailReplacementStrategy;
    detailReplacementSelectedCandidateId: string | null;
    detailReplacementReferenceCards: typeof detailReplacementReferenceCards;
    detailReplacementProductSourceImages: typeof detailReplacementProductSourceImages;
    detailReplacementModelSourceImage: typeof detailReplacementModelSourceImage;
    skuReplacementQueryInput: string;
    skuReplacementQueryType: typeof skuReplacementQueryType;
    skuReplacementSelectedCandidateId: string | null;
    skuReplacementReferenceCards: typeof skuReplacementReferenceCards;
    selectedProductAttachmentCount: number;
  }>({
    selectedAgentPresetId: null,
    selectedAgentPresetType: null,
    selectedModelId: "auto",
    lockedWorkflowModelId: null,
    imageParams: {
      aspectRatio: "auto",
      imageSize: "2K",
      imageCount: 1,
    },
    isDetailReplacementPreset: false,
    isSkuReplacementPreset: false,
    detailReplacementQueryInput: "",
    detailReplacementQueryType: "spu",
    detailReplacementStrategy: DEFAULT_DETAIL_REPLACEMENT_STRATEGY,
    detailReplacementSelectedCandidateId: null,
    detailReplacementReferenceCards: [],
    detailReplacementProductSourceImages: [],
    detailReplacementModelSourceImage: null,
    skuReplacementQueryInput: "",
    skuReplacementQueryType: "sku",
    skuReplacementSelectedCandidateId: null,
    skuReplacementReferenceCards: [],
    selectedProductAttachmentCount: 0,
  });
  transportStateRef.current = {
    selectedAgentPresetId: selectedAgentPresetId || null,
    selectedAgentPresetType: selectedAgentPreset?.type || null,
    selectedModelId,
    lockedWorkflowModelId,
    imageParams,
    isDetailReplacementPreset,
    isSkuReplacementPreset,
    detailReplacementQueryInput,
    detailReplacementQueryType,
    detailReplacementStrategy,
    detailReplacementSelectedCandidateId: detailReplacementSelectedCandidateId || null,
    detailReplacementReferenceCards,
    detailReplacementProductSourceImages,
    detailReplacementModelSourceImage,
    skuReplacementQueryInput,
    skuReplacementQueryType,
    skuReplacementSelectedCandidateId: skuReplacementSelectedCandidateId || null,
    skuReplacementReferenceCards,
    selectedProductAttachmentCount:
      currentResultModeType === "detail_replacement"
        ? detailReplacementProductSourceImages.length
        : selectedProductAttachments.length,
  };

  const selectableModels = useMemo(() => {
    const imageModels = (modelsData?.models || []).filter(
      (model) => model.supportsImageGen || model.isMultimodal
    );
    const autoOption = {
      id: "auto",
      displayName: "自动选择",
      providerType: "auto",
      imageGenConfig: modelsData?.agentModel?.imageGenConfig || undefined,
    };
    return [autoOption, ...imageModels];
  }, [modelsData?.agentModel?.imageGenConfig, modelsData?.models]);

  const configuredWorkflowModels = useMemo(
    () => modelsData?.agentWorkflowConfiguredModels || [],
    [modelsData?.agentWorkflowConfiguredModels]
  );
  const executableModelOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...selectableModels, ...configuredWorkflowModels].filter((model) => {
      if (seen.has(model.id)) return false;
      seen.add(model.id);
      return true;
    });
  }, [configuredWorkflowModels, selectableModels]);
  const executableModelIdSet = useMemo(
    () => new Set(executableModelOptions.map((model) => model.id)),
    [executableModelOptions]
  );
  const lockedWorkflowModel = useMemo(
    () =>
      lockedWorkflowModelId
        ? executableModelOptions.find((model) => model.id === lockedWorkflowModelId) || null
        : null,
    [executableModelOptions, lockedWorkflowModelId]
  );
  const currentModel = useMemo(
    () =>
      lockedWorkflowModel ||
      executableModelOptions.find((model) => model.id === selectedModelId) ||
      selectableModels[0],
    [executableModelOptions, lockedWorkflowModel, selectableModels, selectedModelId]
  );
  const lockedWorkflowModelLabel =
    lockedWorkflowModel?.displayName ||
    selectedAgentPreset?.defaultModel?.displayName ||
    (lockedWorkflowModelId ? `配置模型不可用（${lockedWorkflowModelId}）` : "未配置");
  const [activeToolStep, setActiveToolStep] = useState<ToolStepKey>("settings");
  const hasBrandModelStep = Boolean(brandModelPanel) && modelSlotEnabled;
  const hasBrandStoreStep = Boolean(brandStorePanel);
  const hasWorkflowStyleStep = Boolean(workflowStylePanel) || hasBrandModelStep;
  const visibleWorkflowSectionKeys = useMemo(
    () => [
      ...(hasBrandStoreStep ? ["brand"] : []),
      ...(hasWorkflowStyleStep ? ["style"] : []),
      ...(isBusinessModeStepEnabled ? ["mode"] : []),
      ...(hasMaterialStep ? ["materials"] : []),
      "generate",
    ],
    [hasBrandStoreStep, hasMaterialStep, hasWorkflowStyleStep, isBusinessModeStepEnabled]
  );
  const getWorkflowSectionBadge = useCallback(
    (key: "brand" | "mode" | "materials" | "style" | "generate") => {
      const index = visibleWorkflowSectionKeys.indexOf(key);
      return String(index >= 0 ? index + 1 : visibleWorkflowSectionKeys.length + 1).padStart(
        2,
        "0"
      );
    },
    [visibleWorkflowSectionKeys]
  );
  const firstWorkflowSectionAnchor = hasBrandStoreStep
    ? "agent-anchor-brand"
    : hasWorkflowStyleStep
      ? "agent-anchor-style"
      : isBusinessModeStepEnabled
        ? "agent-anchor-mode"
        : hasMaterialStep
          ? "agent-anchor-materials"
          : "agent-anchor-generate";

  const { messages, setMessages, sendMessage, status, stop } = useChat<ChatMessage>({
    id: chatId,
    messages: historyMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: createApiHref("/api/chat"),
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const transportState = transportStateRef.current;
        const requestedReplacementCardIdSet = new Set(
          (generationRequestSnapshotRef.current.replacementExecutionCardIds || [])
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        );
        const resolvedAgentPresetId =
          requiresPresetSelection
            ? transportState.selectedAgentPresetId || selectedAgentPresetId || undefined
            : undefined;
        const resolvedSelectedModelId =
          transportState.lockedWorkflowModelId ||
          (transportState.selectedModelId !== "auto"
            ? transportState.selectedModelId
            : effectiveDefaultModelId || transportState.selectedModelId);
        const replacementModePayload =
          transportState.isDetailReplacementPreset || transportState.isSkuReplacementPreset
            ? {
                modeType: transportState.isDetailReplacementPreset
                  ? ("detail_replacement" as const)
                  : ("sku_replacement" as const),
                query: clampChatRequestText(
                  transportState.isDetailReplacementPreset
                    ? transportState.detailReplacementQueryInput.trim()
                    : transportState.skuReplacementQueryInput.trim(),
                  MAX_AGENT_MODE_QUERY_LENGTH
                ),
                queryType: transportState.isDetailReplacementPreset
                  ? transportState.detailReplacementQueryType
                  : transportState.skuReplacementQueryType,
                replacementStrategy: transportState.isDetailReplacementPreset
                  ? transportState.detailReplacementStrategy
                  : undefined,
                selectedCandidateId: transportState.isDetailReplacementPreset
                  ? transportState.detailReplacementSelectedCandidateId || null
                  : transportState.skuReplacementSelectedCandidateId || null,
                references: (
                  transportState.isDetailReplacementPreset
                    ? transportState.detailReplacementReferenceCards
                    : transportState.skuReplacementReferenceCards
                )
                  .slice(0, MAX_AGENT_MODE_REFERENCE_COUNT)
                  .filter(
                    (item) =>
                      requestedReplacementCardIdSet.size === 0 ||
                      requestedReplacementCardIdSet.has(String(item.id || "").trim())
                  )
                  .filter((item) => Boolean(String(item.imageUrl || "").trim()))
                  .map((item) => ({
                    id: String(item.id || "").slice(0, 128),
                    label: String(item.label || "").slice(0, 255),
                    imageUrl: String(item.imageUrl || "").trim(),
                    candidateId: item.candidateId
                      ? String(item.candidateId).slice(0, 128)
                      : null,
                    sortOrder: item.sortOrder ?? 0,
                    passthrough: item.passthrough === true,
                    assignedProductIndex:
                      transportState.selectedProductAttachmentCount > 0
                        ? Math.min(
                            item.assignedProductIndex ?? 0,
                            Math.max(transportState.selectedProductAttachmentCount - 1, 0)
                          )
                        : null,
                  })),
                sourceImages: transportState.isDetailReplacementPreset
                  ? {
                      productImages: transportState.detailReplacementProductSourceImages,
                      modelImage: transportState.detailReplacementModelSourceImage,
                    }
                  : undefined,
              }
            : undefined;
        return {
          body: {
            id: rawChatId,
            message: request.messages.at(-1),
            hiddenPrompt:
              clampChatRequestText(
                generationRequestSnapshotRef.current.hiddenPrompt ||
                  hiddenPromptRef.current ||
                  "",
                MAX_CHAT_HIDDEN_PROMPT_LENGTH
              ) || undefined,
            workflowPromptOptimizationEnabled,
            agentPresetId: requiresPresetSelection && isValidChatUuid(resolvedAgentPresetId)
              ? resolvedAgentPresetId
              : undefined,
            selectedChatModel: String(resolvedSelectedModelId || "auto").trim() || "auto",
            composerMode:
              isDirectModelGenerationMode || selectedAgentPreset?.type === "image"
                ? ("image" as const)
                : ("agent" as const),
            selectedVisibilityType: "private",
            imageParams: transportState.imageParams,
            contextPayload: {
              source: "chat" as const,
              projectId: isValidChatUuid(projectId) ? projectId : undefined,
            },
            agentModePayload: replacementModePayload,
          },
        };
      },
    }),
  });

  useEffect(() => {
    if (!historyMessages.length) {
      return;
    }

    setMessages((currentMessages) =>
      mergePersistedHistoryMessages(currentMessages, historyMessages)
    );
  }, [historyMessages, setMessages]);

  useEffect(() => {
    return () => {
      Object.values(processedResultHintTimerRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      processedResultHintTimerRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (isWorkflowModelLocked) {
      setSelectedModelId((current) => (current === "auto" ? current : "auto"));
      return;
    }
    if (normalizedIncomingWorkspaceState.selectedModelId) {
      const nextModelId = normalizedIncomingWorkspaceState.selectedModelId;
      setSelectedModelId((current) =>
        current === nextModelId ? current : nextModelId
      );
      return;
    }
    if (effectiveDefaultModelId) {
      const nextModelId = effectiveDefaultModelId;
      setSelectedModelId((current) =>
        current === nextModelId ? current : nextModelId
      );
    }
  }, [
    effectiveDefaultModelId,
    isWorkflowModelLocked,
    normalizedIncomingWorkspaceState.selectedModelId,
  ]);

  // 初始化附件
  useEffect(() => {
    workspaceStateSignatureRef.current = "";
    lastSyncedProductSlotKeysRef.current = [];
    lastSyncedBrandModelUrlRef.current = null;
    lastSyncedDetailProductSlotKeysRef.current = [];
    lastSyncedDetailBundleSlotKeysRef.current = [];
    lastSyncedDetailModelSlotKeyRef.current = null;
    setInput("");
    setAttachments([]);
    setSelectedResultUrl(null);
    setFullscreenPreview(null);
    setPendingGeneration(null);
    setImageParams({
      aspectRatio: "auto",
      imageSize: "2K",
      imageCount: 1,
    });
  }, [projectId]);

  useEffect(() => {
    if (!hasAgentUploadSlots) {
      setAttachments((current) => (current.length === 0 ? current : []));
      lastSyncedProductSlotKeysRef.current = [];
      return;
    }
    const nextSlots: Array<PickedAttachment | null> = Array.from(
      { length: agentUploadSlots.length },
      () => null
    );
    const primaryImages = referenceImages.filter((image) => image.source === "primary");
    const secondaryImages = referenceImages.filter((image) => image.source === "secondary");
    const brandModelImages = referenceImages.filter((image) => image.source === "brandModel");
    const toAttachment = (image: (typeof referenceImages)[number] | undefined) =>
      image
        ? { url: image.url, name: image.name || image.label, contentType: image.mimeType || "image/png", assetId: image.assetId || undefined }
        : null;

    const orderedProductImages = [...primaryImages, ...secondaryImages].slice(0, productSlotCount);
    orderedProductImages.forEach((image, index) => {
      nextSlots[index] = toAttachment(image);
    });
    if (modelSlotEnabled && modelSlotIndex >= 0) {
      nextSlots[modelSlotIndex] = toAttachment(brandModelImages[0]);
    }

    setAttachments((current) => {
      const result: Array<PickedAttachment | null> = Array.from(
        { length: agentUploadSlots.length },
        (_, index) => current[index] || null
      );
      for (let index = 0; index < productSlotCount; index += 1) {
        const nextAttachment = nextSlots[index];
        const previousSyncedKey = lastSyncedProductSlotKeysRef.current[index] || null;

        if (nextAttachment) {
          result[index] = nextAttachment as PickedAttachment;
        } else if (previousSyncedKey) {
          result[index] = null;
        }
      }
      return arePickedAttachmentsEqual(current, result) ? current : result;
    });

    lastSyncedProductSlotKeysRef.current = Array.from(
      { length: productSlotCount },
      (_, index) => getAttachmentIdentityKey(nextSlots[index])
    );
  }, [
    agentUploadSlots.length,
    brandModelAttachmentKeys,
    hasAgentUploadSlots,
    modelSlotEnabled,
    modelSlotIndex,
    productSlotCount,
    referenceImages,
  ]);

  useEffect(() => {
    if (!hasAgentUploadSlots) {
      lastSyncedBrandModelUrlRef.current = null;
      return;
    }

    const nextAttachment = selectedBrandModel?.imageUrl
      ? {
          url: selectedBrandModel.imageUrl,
          name: selectedBrandModel.displayName || `${selectedBrandModel.brandName} 模特图`,
          contentType: selectedBrandModel.mimeType || "image/png",
          assetId: selectedBrandModel.assetId || undefined,
        }
      : null;

    setAttachments((current) => {
      const slots: Array<PickedAttachment | null> = Array.from(
        { length: Math.max(agentUploadSlots.length, Math.max(modelSlotIndex + 1, 1)) },
        (_, index) => current[index] ?? null
      );
      const currentSlot = modelSlotIndex >= 0 ? slots[modelSlotIndex] ?? null : null;
      const previousSyncedUrl = lastSyncedBrandModelUrlRef.current;

      if (modelSlotIndex >= 0 && nextAttachment) {
        slots[modelSlotIndex] = nextAttachment;
      } else if (modelSlotIndex >= 0 && previousSyncedUrl && currentSlot?.url === previousSyncedUrl) {
        slots[modelSlotIndex] = null;
      }

      return arePickedAttachmentsEqual(current, slots) ? current : slots;
    });

    lastSyncedBrandModelUrlRef.current = nextAttachment?.url || null;
  }, [
    agentUploadSlots.length,
    hasAgentUploadSlots,
    modelSlotIndex,
    selectedBrandModel?.assetId,
    selectedBrandModel?.brandName,
    selectedBrandModel?.displayName,
    selectedBrandModel?.id,
    selectedBrandModel?.imageUrl,
    selectedBrandModel?.mimeType,
  ]);
  const generatedGroups = useMemo<GeneratedImageGroup[]>(() => {
    return messages
      .filter((message) => message.role === "assistant")
      .map((message) => {
        const textParts = (message.parts || [])
          .filter((part: any) => part.type === "text" && part.text)
          .map((part: any) => String(part.text));
        const rawText = textParts.join("\n\n");
        const imageUrls = Array.from(
          new Set(textParts.flatMap((text) => extractImageUrlsFromText(text)))
        );
        return {
          messageId: message.id,
          imageUrls,
          text: normalizeAssistantText(rawText),
          replacementCardId: extractReplacementCardIdFromAssistantText(rawText),
        };
      })
      .filter((group) => group.imageUrls.length > 0);
  }, [messages]);
  const userMessageCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );
  const assistantMessagesAfterLastUser = useMemo(() => {
    const lastUserIndex = [...messages]
      .map((message) => message.role)
      .lastIndexOf("user");
    if (lastUserIndex < 0) {
      return [] as ChatMessage[];
    }

    return messages
      .slice(lastUserIndex + 1)
      .filter((message) => message.role === "assistant");
  }, [messages]);
  const hasAssistantFailureAfterLastUser = useMemo(
    () =>
      assistantMessagesAfterLastUser.some((message) => {
        const text = (message.parts || [])
          .filter((part: any) => part.type === "text" && part.text)
          .map((part: any) => String(part.text))
          .join("\n\n");
        if (!hasLikelyGenerationErrorText(text)) {
          return false;
        }
        const imageUrls = extractImageUrlsFromText(text);
        return imageUrls.length === 0;
      }),
    [assistantMessagesAfterLastUser]
  );

  const generatedGroupsAfterLastUser = useMemo(() => {
    return assistantMessagesAfterLastUser
      .map((message) => generatedGroups.find((group) => group.messageId === message.id) || null)
      .filter((group): group is GeneratedImageGroup => Boolean(group));
  }, [assistantMessagesAfterLastUser, generatedGroups]);

  const allGeneratedImages = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...generatedGroups.flatMap((group) => group.imageUrls),
            ...detailGenerationRunResults.map((item) => item.originalUrl),
            ...normalizeResultCollectionUrls(resultCollections?.scene_generation),
            ...normalizeResultCollectionUrls(resultCollections?.detail_generation),
            ...normalizeResultCollectionUrls(resultCollections?.detail_replacement),
            ...normalizeResultCollectionUrls(resultCollections?.sku_replacement),
          ].filter(
            (url) =>
              !normalizedDeletedResultCollections.scene_generation.includes(url) &&
              !normalizedDeletedResultCollections.detail_generation.includes(url) &&
              !normalizedDeletedResultCollections.detail_replacement.includes(url) &&
              !normalizedDeletedResultCollections.sku_replacement.includes(url)
          )
        )
      ),
    [detailGenerationRunResults, generatedGroups, normalizedDeletedResultCollections, resultCollections]
  );
  const currentSceneGeneratedUrls = useMemo(
    () => Array.from(new Set(generatedGroupsAfterLastUser.flatMap((group) => group.imageUrls))),
    [generatedGroupsAfterLastUser]
  );
  const replacementGeneratedGroupsAfterLastUser = useMemo(() => {
    return assistantMessagesAfterLastUser
      .map((message) => generatedGroups.find((group) => group.messageId === message.id) || null)
      .filter((group): group is GeneratedImageGroup => Boolean(group));
  }, [assistantMessagesAfterLastUser, generatedGroups]);
  const latestGeneratedGroup = useMemo(() => {
    const lastUserIndex = [...messages]
      .map((message) => message.role)
      .lastIndexOf("user");
    if (lastUserIndex >= 0) {
      const latestAssistantAfterLastUser = messages
        .slice(lastUserIndex + 1)
        .filter((message) => message.role === "assistant")
        .map((message) => generatedGroups.find((group) => group.messageId === message.id) || null)
        .filter((group): group is GeneratedImageGroup => Boolean(group))
        .at(-1);
      if (latestAssistantAfterLastUser) {
        return latestAssistantAfterLastUser;
      }
      const hasAssistantAfterLastUser = messages
        .slice(lastUserIndex + 1)
        .some((message) => message.role === "assistant");
      if (hasAssistantAfterLastUser) {
        return null;
      }
    }
    return generatedGroups[generatedGroups.length - 1] || null;
  }, [generatedGroups, messages]);
  const latestReplacementResults = useMemo(
    () =>
      replacementGeneratedGroupsAfterLastUser.map((group) => ({
        url: group.imageUrls[0] || null,
        text: group.text || "",
        replacementCardId: group.replacementCardId || null,
      })),
    [replacementGeneratedGroupsAfterLastUser]
  );
  const currentReplacementExecutionCardIds = useMemo(() => {
    if (currentResultModeType !== "detail_replacement" && currentResultModeType !== "sku_replacement") {
      return [] as string[];
    }

    if (
      replacementExecutionContext?.modeType === currentResultModeType &&
      replacementExecutionContext.cardIds.length > 0
    ) {
      return replacementExecutionContext.cardIds;
    }

    if (
      pendingGeneration?.modeType === currentResultModeType &&
      Array.isArray(pendingGeneration.requestedCardIds) &&
      pendingGeneration.requestedCardIds.length > 0
    ) {
      return pendingGeneration.requestedCardIds;
    }

    const fallbackCards =
      currentResultModeType === "detail_replacement"
        ? detailReplacementReferenceCards
        : skuReplacementReferenceCards;
    return fallbackCards.map((card) => card.id);
  }, [
    currentResultModeType,
    detailReplacementReferenceCards,
    pendingGeneration?.modeType,
    pendingGeneration?.requestedCardIds,
    replacementExecutionContext,
    skuReplacementReferenceCards,
  ]);
  useEffect(() => {
    setReplacementResultState((current) => {
      const detailCardIds = new Set(detailReplacementReferenceCards.map((card) => card.id));
      const skuCardIds = new Set(skuReplacementReferenceCards.map((card) => card.id));
      let changed = false;

      const nextDetail = Object.fromEntries(
        Object.entries(current.detail_replacement).filter(([cardId]) => detailCardIds.has(cardId))
      );
      if (Object.keys(nextDetail).length !== Object.keys(current.detail_replacement).length) {
        changed = true;
      }

      const nextSku = Object.fromEntries(
        Object.entries(current.sku_replacement).filter(([cardId]) => skuCardIds.has(cardId))
      );
      if (Object.keys(nextSku).length !== Object.keys(current.sku_replacement).length) {
        changed = true;
      }

      if (!changed) {
        return current;
      }

      return {
        detail_replacement: nextDetail,
        sku_replacement: nextSku,
      };
    });
  }, [detailReplacementReferenceCards, skuReplacementReferenceCards]);
  useEffect(() => {
    if (
      (currentResultModeType !== "detail_replacement" && currentResultModeType !== "sku_replacement") ||
      latestReplacementResults.length === 0
    ) {
      return;
    }

    const cardIds = currentReplacementExecutionCardIds;
    if (cardIds.length === 0) {
      return;
    }

    setReplacementResultState((current) => {
      const nextModeState = { ...current[currentResultModeType] };
      let changed = false;

      latestReplacementResults.forEach((result, index) => {
        const cardId = result.replacementCardId || cardIds[index];
        if (!cardId) {
          return;
        }
        const inferredStatus = inferReplacementCardStatusFromText(result.text);
        const nextRecord: ReplacementResultRecord = {
          url: result.url || null,
          text: result.text || "",
          status:
            inferredStatus === "passthrough" || inferredStatus === "fallback"
              ? inferredStatus
              : "completed",
          updatedAt: Date.now(),
        };
        const previousRecord = nextModeState[cardId];
        if (
          previousRecord?.url === nextRecord.url &&
          previousRecord?.text === nextRecord.text &&
          previousRecord?.status === nextRecord.status
        ) {
          return;
        }
        nextModeState[cardId] = nextRecord;
        changed = true;
      });

      if (!changed) {
        return current;
      }

      return {
        ...current,
        [currentResultModeType]: nextModeState,
      };
    });
  }, [currentReplacementExecutionCardIds, currentResultModeType, latestReplacementResults]);
  const detailReplacementResultUrls = useMemo(
    () =>
      detailReplacementReferenceCards
        .map((card) => {
          const recordUrl = replacementResultState.detail_replacement[card.id]?.url || null;
          const fallbackUrl = !recordUrl && card.passthrough ? card.imageUrl || null : null;
          const nextUrl = recordUrl || fallbackUrl;
          return nextUrl &&
            !normalizedDeletedResultCollections.detail_replacement.includes(nextUrl)
            ? nextUrl
            : null;
        })
        .filter((url): url is string => Boolean(url)),
    [
      detailReplacementReferenceCards,
      normalizedDeletedResultCollections.detail_replacement,
      replacementResultState.detail_replacement,
    ]
  );
  const skuReplacementResultUrls = useMemo(
    () =>
      skuReplacementReferenceCards
        .map((card) => {
          const nextUrl = replacementResultState.sku_replacement[card.id]?.url || null;
          return nextUrl && !normalizedDeletedResultCollections.sku_replacement.includes(nextUrl)
            ? nextUrl
            : null;
        })
        .filter((url): url is string => Boolean(url)),
    [
      normalizedDeletedResultCollections.sku_replacement,
      replacementResultState.sku_replacement,
      skuReplacementReferenceCards,
    ]
  );
  const detailGenerationRunResultUrls = useMemo(
    () =>
      detailGenerationRunResults
        .map((item) => item.originalUrl)
        .filter(Boolean)
        .filter(
          (url) => !normalizedDeletedResultCollections.detail_generation.includes(url)
        ),
    [detailGenerationRunResults, normalizedDeletedResultCollections.detail_generation]
  );
  const currentLiveResultUrls =
    currentResultModeType === "detail_generation"
      ? detailGenerationRunResultUrls
      : currentResultModeType === "detail_replacement"
        ? detailReplacementResultUrls
        : currentResultModeType === "sku_replacement"
          ? skuReplacementResultUrls
        : currentSceneGeneratedUrls;
  const transportIsGenerating = status === "streaming" || status === "submitted";
  const pendingGenerationProgressCount = useMemo(() => {
    if (!pendingGeneration) {
      return 0;
    }

    if (
      pendingGeneration.modeType !== "detail_generation" &&
      userMessageCount <= pendingGeneration.userTurnCountAtStart
    ) {
      return 0;
    }

    if (pendingGeneration.modeType === "scene_generation") {
      return currentSceneGeneratedUrls.length;
    }

    if (pendingGeneration.modeType === "detail_generation") {
      return detailGenerationRunResults.length;
    }

    return latestReplacementResults.length;
  }, [
    currentSceneGeneratedUrls.length,
    detailGenerationRunResults.length,
    latestReplacementResults.length,
    pendingGeneration,
    userMessageCount,
  ]);
  const isAnyGenerationRunning = transportIsGenerating || Boolean(pendingGeneration);
  const isSceneResultModeGenerating =
    (activeResultModeType === "scene_generation" &&
      pendingGeneration?.modeType === "scene_generation") ||
    (activeResultModeType === currentResultModeType &&
      currentResultModeType === "scene_generation" &&
      transportIsGenerating);
  const isDetailResultModeGenerating =
    pendingGeneration?.modeType === "detail_replacement" ||
    (currentResultModeType === "detail_replacement" && transportIsGenerating);
  const isDetailGenerationResultModeGenerating =
    pendingGeneration?.modeType === "detail_generation";
  const isSkuResultModeGenerating =
    pendingGeneration?.modeType === "sku_replacement" ||
    (currentResultModeType === "sku_replacement" && transportIsGenerating);
  const mergedResultCollections = useMemo(
    () => {
      const baseCollections = {
        scene_generation: excludeDeletedResultUrls(
          resultCollections?.scene_generation,
          normalizedDeletedResultCollections.scene_generation
        ),
        detail_generation: excludeDeletedResultUrls(
          resultCollections?.detail_generation,
          normalizedDeletedResultCollections.detail_generation
        ),
        detail_replacement: Array.from(
          new Set([
            ...detailReplacementResultUrls,
            ...excludeDeletedResultUrls(
              resultCollections?.detail_replacement,
              normalizedDeletedResultCollections.detail_replacement
            ),
          ])
        ),
        sku_replacement: Array.from(
          new Set([
            ...skuReplacementResultUrls,
            ...excludeDeletedResultUrls(
              resultCollections?.sku_replacement,
              normalizedDeletedResultCollections.sku_replacement
            ),
          ])
        ),
      };

      return {
        ...baseCollections,
        [currentResultModeType]: Array.from(
          new Set([
            ...baseCollections[currentResultModeType],
            ...excludeDeletedResultUrls(
              currentLiveResultUrls,
              normalizedDeletedResultCollections[currentResultModeType]
            ),
          ])
        ),
      } as Record<AgentGenerationResultModeType, string[]>;
    },
    [
      currentLiveResultUrls,
      currentResultModeType,
      detailReplacementResultUrls,
      normalizedDeletedResultCollections,
      resultCollections,
      skuReplacementResultUrls,
    ]
  );
  const availableResultModeTypes = useMemo(
    () =>
      ([
        "scene_generation",
        "detail_generation",
        "detail_replacement",
        "sku_replacement",
      ] as AgentGenerationResultModeType[])
        .filter(
          (modeType) =>
            modeType === currentResultModeType ||
            modeType === pendingGeneration?.modeType ||
            (mergedResultCollections[modeType] || []).length > 0
        ),
    [currentResultModeType, mergedResultCollections, pendingGeneration?.modeType]
  );
  const activeResultModeUrls = mergedResultCollections[activeResultModeType] || [];
  const displayedResultUrl = selectedResultUrl || activeResultModeUrls[0] || null;
  const detailResultCards = useMemo(
    () =>
      detailReplacementReferenceCards.map((card, index) => {
        const resultMeta = replacementResultState.detail_replacement[card.id] || null;
        const localPassthroughResultUrl =
          !resultMeta?.url && card.passthrough && card.imageUrl ? card.imageUrl : null;
        const resultUrl =
          resultMeta?.url &&
          !normalizedDeletedResultCollections.detail_replacement.includes(resultMeta.url)
            ? resultMeta.url
            : localPassthroughResultUrl &&
                !normalizedDeletedResultCollections.detail_replacement.includes(
                  localPassthroughResultUrl
                )
              ? localPassthroughResultUrl
              : null;
        const resultText = resultMeta?.url
          ? resultMeta?.text || ""
          : localPassthroughResultUrl
            ? MANUAL_PASSTHROUGH_RESULT_TEXT
            : "";
        const activeRunIndex =
          pendingGeneration?.modeType === "detail_replacement" &&
          Array.isArray(pendingGeneration.requestedCardIds)
            ? pendingGeneration.requestedCardIds.indexOf(card.id)
            : -1;
        return {
          ...card,
          index,
          resultUrl,
          resultText,
          queuePosition:
            activeRunIndex >= 0 && pendingGeneration?.modeType === "detail_replacement"
              ? activeRunIndex + 1
              : null,
          queueTotal:
            pendingGeneration?.modeType === "detail_replacement" &&
            Array.isArray(pendingGeneration.requestedCardIds)
              ? pendingGeneration.requestedCardIds.length
              : null,
          status: getReplacementCardStatus({
            index,
            resultUrl,
            resultText,
            generatedCount: pendingGeneration?.modeType === "detail_replacement"
              ? latestReplacementResults.length
              : 0,
            isGenerating: isDetailResultModeGenerating,
            activeRunIndex: activeRunIndex >= 0 ? activeRunIndex : null,
          }),
        };
      }),
    [
      detailReplacementReferenceCards,
      isDetailResultModeGenerating,
      latestReplacementResults,
      normalizedDeletedResultCollections.detail_replacement,
      pendingGeneration?.modeType,
      pendingGeneration?.requestedCardIds,
      replacementResultState.detail_replacement,
    ]
  );
  const skuResultCards = useMemo(
    () =>
      skuReplacementReferenceCards.map((card, index) => {
        const resultMeta = replacementResultState.sku_replacement[card.id] || null;
        const localPassthroughResultUrl =
          !resultMeta?.url && card.passthrough && card.imageUrl ? card.imageUrl : null;
        const resultUrl =
          resultMeta?.url &&
          !normalizedDeletedResultCollections.sku_replacement.includes(resultMeta.url)
            ? resultMeta.url
            : localPassthroughResultUrl &&
                !normalizedDeletedResultCollections.sku_replacement.includes(
                  localPassthroughResultUrl
                )
              ? localPassthroughResultUrl
              : null;
        const resultText = resultMeta?.url
          ? resultMeta?.text || ""
          : localPassthroughResultUrl
            ? MANUAL_PASSTHROUGH_RESULT_TEXT
            : "";
        const activeRunIndex =
          pendingGeneration?.modeType === "sku_replacement" &&
          Array.isArray(pendingGeneration.requestedCardIds)
            ? pendingGeneration.requestedCardIds.indexOf(card.id)
            : -1;
        return {
          ...card,
          index,
          resultUrl,
          resultText,
          status: getReplacementCardStatus({
            index,
            resultUrl,
            resultText,
            generatedCount: pendingGeneration?.modeType === "sku_replacement"
              ? latestReplacementResults.length
              : 0,
            isGenerating: isSkuResultModeGenerating,
            activeRunIndex: activeRunIndex >= 0 ? activeRunIndex : null,
          }),
        };
      }),
    [
      isSkuResultModeGenerating,
      latestReplacementResults,
      normalizedDeletedResultCollections.sku_replacement,
      pendingGeneration?.modeType,
      pendingGeneration?.requestedCardIds,
      replacementResultState.sku_replacement,
      skuReplacementReferenceCards,
    ]
  );
  const detailProcessedCount = useMemo(
    () =>
      detailResultCards.filter((card) =>
        ["completed", "passthrough", "fallback"].includes(card.status)
      ).length,
    [detailResultCards]
  );
  const skuProcessedCount = useMemo(
    () =>
      skuResultCards.filter((card) =>
        ["completed", "passthrough", "fallback"].includes(card.status)
      ).length,
    [skuResultCards]
  );
  const detailReplacementBatchDownloadUrls = useMemo(
    () =>
      detailResultCards
        .map((card) => card.resultUrl)
        .filter((url): url is string => Boolean(url)),
    [detailResultCards]
  );
  const skuReplacementBatchDownloadUrls = useMemo(
    () =>
      skuResultCards
        .map((card) => card.resultUrl)
        .filter((url): url is string => Boolean(url)),
    [skuResultCards]
  );
  const detailReplacementOrderedDownloadUrls =
    detailReplacementBatchDownloadUrls.length > 0
      ? detailReplacementBatchDownloadUrls
      : mergedResultCollections.detail_replacement;
  const skuReplacementOrderedDownloadUrls =
    skuReplacementBatchDownloadUrls.length > 0
      ? skuReplacementBatchDownloadUrls
      : mergedResultCollections.sku_replacement;
  const detailRemainingCount = useMemo(
    () =>
      detailResultCards.filter(
        (card) => !["completed", "passthrough", "fallback"].includes(card.status)
      ).length,
    [detailResultCards]
  );
  const skuRemainingCount = useMemo(
    () =>
      skuResultCards.filter(
        (card) => !["completed", "passthrough", "fallback"].includes(card.status)
      ).length,
    [skuResultCards]
  );
  const detailGenerationExpectedCount = useMemo(() => {
    if (
      pendingGeneration?.modeType === "detail_generation" &&
      Number.isFinite(pendingGeneration.expectedCount) &&
      pendingGeneration.expectedCount > 0
    ) {
      return pendingGeneration.expectedCount;
    }

    const progressTotal = Number(detailGenerationProgress.total || 0);
    if (progressTotal > 1) {
      return Math.max(
        detailGenerationRunResults.length,
        Math.round((progressTotal - 1) / 2)
      );
    }

    return detailGenerationRunResults.length;
  }, [
    detailGenerationProgress.total,
    detailGenerationRunResults.length,
    pendingGeneration?.expectedCount,
    pendingGeneration?.modeType,
  ]);
  const hasDetailGenerationPlaceholderState =
    currentResultModeType === "detail_generation" &&
    detailGenerationExpectedCount > detailGenerationRunResults.length &&
    (pendingGeneration?.modeType === "detail_generation" ||
      detailGenerationProgress.status === "running" ||
      detailGenerationProgress.status === "error");
  const gridRequestedImageCount =
    activeResultModeType === "detail_generation"
      ? Math.max(
          1,
          detailGenerationExpectedCount || activeResultModeUrls.length
        )
      : Math.max(1, imageParams.imageCount || 1);
  const gridPendingRemainingCount =
    activeResultModeType === "scene_generation" &&
    pendingGeneration?.modeType === "scene_generation"
      ? Math.max(pendingGeneration.expectedCount - currentSceneGeneratedUrls.length, 0)
      : activeResultModeType === "detail_generation" &&
          hasDetailGenerationPlaceholderState
        ? Math.max(
            detailGenerationExpectedCount - detailGenerationRunResults.length,
            0
          )
        : 0;
  const gridPendingCardCount =
    activeResultModeType === "scene_generation" ||
    activeResultModeType === "detail_generation"
      ? gridPendingRemainingCount
      : 0;
  const gridResultCardCount = Math.max(
    activeResultModeUrls.length + gridPendingCardCount,
    (activeResultModeType === "scene_generation" ||
      activeResultModeType === "detail_generation") &&
      pendingGeneration?.modeType === activeResultModeType
      ? activeResultModeUrls.length + gridPendingRemainingCount
      : activeResultModeType === currentResultModeType
        ? gridRequestedImageCount
        : activeResultModeUrls.length,
    1
  );
  const gridResultCards = useMemo(
    () => {
      const placeholderStartIndex = activeResultModeUrls.length;
      return Array.from({ length: gridResultCardCount }, (_, index) => {
        const url = activeResultModeUrls[index] || null;
        const placeholderOffset = Math.max(index - placeholderStartIndex, 0);
        return {
          id: url || `grid-result-placeholder-${activeResultModeType}-${index}`,
          index,
          url,
          status: url
            ? ("completed" as const)
            : activeResultModeType === "detail_generation" &&
                detailGenerationProgress.status === "error" &&
                gridPendingRemainingCount > 0
              ? ("missing" as const)
              : gridPendingRemainingCount > 0
              ? placeholderOffset === 0
                ? ("generating" as const)
                : ("queued" as const)
              : ("waiting" as const),
        };
      });
    },
    [
      activeResultModeType,
      activeResultModeUrls,
      detailGenerationProgress.status,
      gridPendingRemainingCount,
      gridResultCardCount,
    ]
  );
  const shouldShowGridResultSection =
    activeResultModeUrls.length > 0 ||
    ((activeResultModeType === "scene_generation" && isSceneResultModeGenerating) ||
      (activeResultModeType === "detail_generation" &&
        (isDetailGenerationResultModeGenerating || hasDetailGenerationPlaceholderState)));
  const hasBrandModelSelection = Boolean(
    selectedBrandModel?.imageUrl || referenceImages.some((image) => image.source === "brandModel")
  );
  const hasMaterialSelections = referenceImages.some(
    (image) => image.source === "primary" || image.source === "secondary"
  );
  const hasSatisfiedSlotRequirement =
    !hasAgentUploadSlots || filledProductAttachmentCount >= requiredProductUploadCount;
  const slotRequirementMessage =
    hasAgentUploadSlots && !hasSatisfiedSlotRequirement
      ? `当前还缺少 ${missingAttachmentCount} 张产品图，请先在“选择 SPU / SKU”步骤补齐后再继续。`
      : null;
  const mergedSettingsStepLabel = hasMaterialStep ? "选图与生成" : "生成参数";
  const mergedSettingsStepDescription = hasMaterialStep
    ? "搜索素材、补充要求、确认槽位并开始生成"
    : "补充要求并开始生成";
  const brandStepBadge = getWorkflowSectionBadge("brand");
  const modeStepBadge = getWorkflowSectionBadge("mode");
  const materialStepBadge = getWorkflowSectionBadge("materials");
  const styleStepBadge = getWorkflowSectionBadge("style");
  const generateStepBadge = getWorkflowSectionBadge("generate");

  const toolSteps = useMemo(
    () => [
      ...(hasBrandModelStep
        ? [
            {
              key: "brand-model" as const,
              label: "品牌模特",
              description: "根据品牌选择模特图",
              icon: UserRound,
              disabled: false,
              completed: hasBrandModelSelection,
              optional: true,
            },
          ]
        : []),
      {
        key: "settings" as const,
        label: mergedSettingsStepLabel,
        description: mergedSettingsStepDescription,
        icon: Settings2,
        disabled: false,
        completed:
          Boolean(input.trim()) || hasMaterialSelections || hasSatisfiedSlotRequirement,
        optional: false,
      },
    ],
    [
      hasBrandModelSelection,
      hasBrandModelStep,
      hasMaterialSelections,
      hasSatisfiedSlotRequirement,
      mergedSettingsStepDescription,
      mergedSettingsStepLabel,
      hasMaterialStep,
      input,
    ]
  );

  useEffect(() => {
    setActiveDetailReferenceCardId((current) =>
      detailReplacementReferenceCards.some((card) => card.id === current)
        ? current
        : detailReplacementReferenceCards[0]?.id || null
    );
  }, [detailReplacementReferenceCards]);

  useEffect(() => {
    setActiveSkuReferenceCardId((current) =>
      skuReplacementReferenceCards.some((card) => card.id === current)
        ? current
        : skuReplacementReferenceCards[0]?.id || null
    );
  }, [skuReplacementReferenceCards]);
  const activeToolStepIndex = Math.max(
    toolSteps.findIndex((step) => step.key === activeToolStep),
    0
  );
  const activeToolStepMeta = toolSteps[activeToolStepIndex] || toolSteps[0];
  const previousToolStep = activeToolStepIndex > 0 ? toolSteps[activeToolStepIndex - 1] : null;
  const nextToolStep =
    activeToolStepIndex < toolSteps.length - 1 ? toolSteps[activeToolStepIndex + 1] : null;

  useEffect(() => {
    const incomingSignature = JSON.stringify(normalizedIncomingWorkspaceState);
    if (incomingSignature === workspaceStateSignatureRef.current) {
      return;
    }
    workspaceStateSignatureRef.current = incomingSignature;
    setInput(normalizedIncomingWorkspaceState.input);
    setAttachments((current) => {
      const nextAttachments = normalizedIncomingWorkspaceState.attachments.map((item) =>
        item
          ? {
              url: item.url,
              name: item.name || "参考图",
              contentType: item.contentType || "image/png",
              assetId: item.assetId || undefined,
            }
          : null
      );
      return arePickedAttachmentsEqual(current, nextAttachments) ? current : nextAttachments;
    });
    setSelectedModelId((current) => {
      const nextModelId = isWorkflowModelLocked
        ? "auto"
        : normalizedIncomingWorkspaceState.selectedModelId || "auto";
      return current === nextModelId ? current : nextModelId;
    });
    setImageParams((current) => {
      const nextParams = {
        aspectRatio: normalizedIncomingWorkspaceState.imageParams?.aspectRatio || "auto",
        imageSize: normalizedIncomingWorkspaceState.imageParams?.imageSize || "2K",
        imageCount: normalizedIncomingWorkspaceState.imageParams?.imageCount || 1,
      };
      return areImageGenerationParamsEqual(current, nextParams) ? current : nextParams;
    });
  }, [isWorkflowModelLocked, normalizedIncomingWorkspaceState]);

  useEffect(() => {
    const nextWorkspaceState = {
      input,
      attachments: attachments.map((item) =>
        item
          ? {
              url: item.url,
              name: item.name || null,
              contentType: item.contentType || null,
              assetId: item.assetId || null,
            }
          : null
      ),
      selectedModelId,
      imageParams: {
        aspectRatio: imageParams.aspectRatio,
        imageSize: imageParams.imageSize,
        imageCount: imageParams.imageCount,
      },
    };
    workspaceStateSignatureRef.current = JSON.stringify(nextWorkspaceState);
    onWorkspaceStateChange?.(nextWorkspaceState);
  }, [
    attachments,
    imageParams.aspectRatio,
    imageParams.imageCount,
    imageParams.imageSize,
    input,
    onWorkspaceStateChange,
    selectedModelId,
  ]);

  useEffect(() => {
    setActiveResultModeType(currentResultModeType);
  }, [currentResultModeType]);

  useEffect(() => {
    if (!pendingGeneration) {
      return;
    }

    if (pendingGenerationProgressCount >= pendingGeneration.expectedCount) {
      setPendingGeneration(null);
    }
  }, [pendingGeneration, pendingGenerationProgressCount]);

  useEffect(() => {
    if (!pendingGeneration || transportIsGenerating) {
      return;
    }

    if (!hasAssistantFailureAfterLastUser) {
      return;
    }

    const hasProgress =
      pendingGeneration.modeType === "scene_generation"
        ? currentSceneGeneratedUrls.length > 0
        : pendingGeneration.modeType === "detail_generation"
          ? detailGenerationRunResults.length > 0
          : latestReplacementResults.length > 0;

    if (
      pendingGeneration.modeType === "scene_generation" &&
      !hasProgress &&
      Date.now() - pendingGeneration.timestamp < AGENT_SCENE_PENDING_FAILURE_GRACE_MS
    ) {
      return;
    }

    if (!hasProgress) {
      setPendingGeneration(null);
    }
  }, [
    currentSceneGeneratedUrls.length,
    detailGenerationRunResults.length,
    hasAssistantFailureAfterLastUser,
    latestReplacementResults.length,
    pendingGeneration,
    transportIsGenerating,
  ]);

  useEffect(() => {
    onResultPreviewUrlsChange?.(
      currentResultModeType,
      mergedResultCollections[currentResultModeType] || []
    );
  }, [currentResultModeType, mergedResultCollections, onResultPreviewUrlsChange]);

  useEffect(() => {
    if (activeResultModeUrls.length === 0) {
      if (selectedResultUrl) {
        setSelectedResultUrl(null);
      }
      return;
    }

    if (!selectedResultUrl || !activeResultModeUrls.includes(selectedResultUrl)) {
      setSelectedResultUrl(activeResultModeUrls[0] || null);
    }
  }, [activeResultModeUrls, selectedResultUrl]);

  useEffect(() => {
    if (!selectedAgentPresetId || !hasAgentUploadSlots) {
      setIsAttachmentSlotExpanded(false);
    }
  }, [hasAgentUploadSlots, selectedAgentPresetId]);

  useEffect(() => {
    if (requiresPresetSelection && !selectedAgentPresetId) {
      setActiveToolStep("preset");
      return;
    }

    setActiveToolStep((current) => {
      if (
        current !== "preset" &&
        current !== "materials" &&
        current !== "prompt"
      ) {
        return current;
      }

      if (hasBrandModelStep) return "brand-model";
      return "settings";
    });
  }, [
    hasBrandModelStep,
    requiresPresetSelection,
    selectedAgentPresetId,
  ]);

  useEffect(() => {
    if (!toolSteps.some((step) => step.key === activeToolStep)) {
      setActiveToolStep(toolSteps[0]?.key || "settings");
    }
  }, [activeToolStep, toolSteps]);

  useEffect(() => {
    if (!syncGeneratedResultsToCanvas) {
      return;
    }

    const latestUrls = latestGeneratedGroup?.imageUrls || [];
    if (latestUrls.length === 0) return;

    latestUrls.forEach(async (url, index) => {
      if (!url || generatedImageKeysRef.current.has(url)) return;
      generatedImageKeysRef.current.add(url);

      try {
        const dimensions = await getImageDimensions(url);
        const nodeIndex = nodes.length + index;
        const spacing = 20;
        const x = 120 + (nodeIndex % 3) * (dimensions.width + spacing);
        const y = 120 + Math.floor(nodeIndex / 3) * (dimensions.height + spacing);

        addNode({
          type: "image",
          position: { x, y },
          size: { width: dimensions.width, height: dimensions.height },
          data: {
            src: url,
            status: "completed",
            title: "生成结果",
            prompt: latestGeneratedGroup?.text || "生成结果",
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
            },
          },
          connections: [],
        });
      } catch (error) {
        console.warn("[AgentGenerationWorkspaceDarkV2] Failed to add generated image to canvas:", error);
      }
    });
  }, [addNode, latestGeneratedGroup, nodes.length, syncGeneratedResultsToCanvas]);

  const updateAttachmentAtSlot = useCallback((slotIndex: number, attachment: PickedAttachment | null) => {
    const slotCount = Math.max(visibleAttachmentUploadSlots.length, 1);
    setAttachments((current) => {
      const slots: Array<PickedAttachment | null> = Array.from(
        { length: slotCount },
        (_, index) => current[index] ?? null
      );
      slots[slotIndex] = attachment;
      return slots;
    });
  }, [visibleAttachmentUploadSlots.length]);

  const handleSlotFileChange = useCallback(
    async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        event.currentTarget.value = "";
        return;
      }
      setSlotUploading(slotIndex);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetchUploadWithRetry(formData);
        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "上传失败");
        }
        const data = await response.json().catch(() => null);
        if (!data?.url) {
          throw new Error("上传后未返回图片地址");
        }
        updateAttachmentAtSlot(slotIndex, {
          url: data.url,
          name: file.name,
          contentType: file.type || "image/jpeg",
          assetId: typeof data.assetId === "string" ? data.assetId : undefined,
        });
        toast.success(`${visibleAttachmentUploadSlots[slotIndex]?.label || `槽位${slotIndex + 1}`}上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error, "上传失败");
        if (message) toast.error(message);
      } finally {
        setSlotUploading(null);
        event.currentTarget.value = "";
      }
    },
    [updateAttachmentAtSlot, visibleAttachmentUploadSlots]
  );
  const handleBatchDownloadImages = useCallback(async (params: {
    imageUrls: string[];
    zipName: string;
    scope: BatchDownloadScope;
  }) => {
    const normalizedUrls = (params.imageUrls || [])
      .map((item) => String(item || "").trim())
      .filter((item) => /^https?:\/\//i.test(item));
    if (normalizedUrls.length === 0) {
      toast.error("当前没有可下载的结果图");
      return;
    }

    setBatchDownloadState(params.scope);
    setBatchDownloadDialog({
      scope: params.scope,
      zipName: params.zipName,
      status: "starting",
      taskId: "",
      totalCount: normalizedUrls.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      progress: 4,
      stage: "正在提交服务端打包任务",
      error: "",
      downloadUrl: "",
      expiresAt: 0,
    });
    try {
      const batchFileBaseName =
        params.scope === "sku"
          ? "sku-result"
          : params.scope === "scene"
            ? "scene-result"
            : "detail-result";

      const response = await apiFetch("/api/canvas/download-zip-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          folderName: params.zipName,
          files: normalizedUrls.map((imageUrl) => ({
            url: imageUrl,
            name: `${params.zipName}-${batchFileBaseName}`,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; task?: unknown; error?: string }
        | null;
      const task = normalizeBatchDownloadTaskSnapshot(payload?.task);
      if (!response.ok || payload?.success !== true || !task) {
        throw new Error(payload?.error || "创建打包任务失败");
      }

      setBatchDownloadDialog((current) => ({
        scope: current?.scope || params.scope,
        zipName: current?.zipName || params.zipName,
        status: task.status,
        taskId: task.id,
        totalCount: task.totalCount,
        processedCount: task.processedCount,
        successCount: task.successCount,
        failedCount: task.failedCount,
        progress: task.progress,
        stage: task.stage || "服务端正在打包",
        error: task.error,
        downloadUrl: task.downloadUrl,
        expiresAt: task.expiresAt,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量下载失败";
      setBatchDownloadState(null);
      setBatchDownloadDialog((current) => ({
        scope: current?.scope || params.scope,
        zipName: current?.zipName || params.zipName,
        status: "failed",
        taskId: current?.taskId || "",
        totalCount: current?.totalCount || normalizedUrls.length,
        processedCount: current?.processedCount || 0,
        successCount: current?.successCount || 0,
        failedCount: current?.failedCount || 0,
        progress: current?.progress || 0,
        stage: "打包任务创建失败",
        error: message,
        downloadUrl: "",
        expiresAt: 0,
      }));
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    const taskId = batchDownloadDialog?.taskId;
    const status = batchDownloadDialog?.status;
    if (!taskId || (status !== "pending" && status !== "running")) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    const pollTask = async () => {
      try {
        const response = await apiFetch(
          `/api/canvas/download-zip-task?taskId=${encodeURIComponent(taskId)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; task?: unknown; error?: string }
          | null;
        const task = normalizeBatchDownloadTaskSnapshot(payload?.task);
        if (!response.ok || payload?.success !== true || !task) {
          throw new Error(payload?.error || "查询打包进度失败");
        }
        if (cancelled) {
          return;
        }

        setBatchDownloadDialog((current) => {
          if (!current || current.taskId !== taskId) {
            return current;
          }
          return {
            ...current,
            status: task.status,
            totalCount: task.totalCount,
            processedCount: task.processedCount,
            successCount: task.successCount,
            failedCount: task.failedCount,
            progress: task.progress,
            stage: task.stage || current.stage,
            error: task.error,
            downloadUrl: task.downloadUrl,
            expiresAt: task.expiresAt,
          };
        });

        if (task.status === "completed") {
          setBatchDownloadState(null);
          toast.success("批量导出已打包完成，请在弹窗中下载");
          return;
        }
        if (task.status === "failed") {
          setBatchDownloadState(null);
          toast.error(task.error || "批量导出打包失败");
          return;
        }

        timeoutId = window.setTimeout(pollTask, 1000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "查询打包进度失败";
        setBatchDownloadState(null);
        setBatchDownloadDialog((current) =>
          current && current.taskId === taskId
            ? {
                ...current,
                status: "failed",
                stage: "查询打包进度失败",
                error: message,
              }
            : current
        );
        toast.error(message);
      }
    };

    timeoutId = window.setTimeout(pollTask, 600);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [batchDownloadDialog?.status, batchDownloadDialog?.taskId]);

  const handleDownloadPreparedBatchZip = useCallback(() => {
    if (!batchDownloadDialog?.downloadUrl) {
      toast.error("下载文件还没有准备好");
      return;
    }

    const link = document.createElement("a");
    link.href = batchDownloadDialog.downloadUrl;
    link.download = `${batchDownloadDialog.zipName || "batch-results"}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [batchDownloadDialog?.downloadUrl, batchDownloadDialog?.zipName]);

  const handleBatchDownloadDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      return;
    }
    setBatchDownloadDialog((current) => {
      if (
        current?.status === "starting" ||
        current?.status === "pending" ||
        current?.status === "running"
      ) {
        toast.info("批量导出仍在处理中，完成后即可下载");
        return current;
      }
      return null;
    });
  }, []);
  const handleSendResultToCanvasTextEdit = useCallback((params: {
    imageUrl: string;
    title: string;
  }) => {
    const rawUrl = String(params.imageUrl || "").trim();
    if (!rawUrl) {
      toast.error("结果图地址无效");
      return;
    }

    const previewTitle = String(params.title || "").trim() || "待改字结果";
    const nodeIndex = nodes.length;
    const nodeId = addNode({
      type: "image",
      position: {
        x: 160 + (nodeIndex % 3) * 340,
        y: 140 + Math.floor(nodeIndex / 3) * 340,
      },
      size: { width: 320, height: 320 },
      data: {
        src: rawUrl,
        status: "completed",
        title: previewTitle,
        prompt: previewTitle,
      },
      connections: [],
    });

    selectNodes([nodeId]);
    requestImageNodeAction(nodeId, "text-edit");
    onOpenCanvasEditor?.();
    toast.success("已送入画布，可继续改字");
  }, [addNode, nodes.length, onOpenCanvasEditor, requestImageNodeAction, selectNodes]);
  const handleUpdateReplacementResultRecord = useCallback((params: {
    modeType: ReplacementModeType;
    cardId: string;
    url: string | null;
    text?: string | null;
    status?: Extract<ReplacementCardStatus, "completed" | "passthrough" | "fallback">;
  }) => {
    setReplacementResultState((current) => {
      const currentModeState = current[params.modeType];
      const previousRecord = currentModeState[params.cardId];
      const inferredStatus = inferReplacementCardStatusFromText(params.text);
      const nextRecord: ReplacementResultRecord = {
        url: params.url,
        text: String(params.text || "").trim(),
        status:
          params.status ||
          (inferredStatus === "passthrough" || inferredStatus === "fallback"
            ? inferredStatus
            : null) ||
          previousRecord?.status ||
          "completed",
        updatedAt: Date.now(),
      };

      if (
        previousRecord?.url === nextRecord.url &&
        previousRecord?.text === nextRecord.text &&
        previousRecord?.status === nextRecord.status
      ) {
        return current;
      }

      return {
        ...current,
        [params.modeType]: {
          ...currentModeState,
          [params.cardId]: nextRecord,
        },
      };
    });
  }, []);
  const handleOpenReplacementTextEdit = useCallback((params: {
    modeType: ReplacementModeType;
    cardId: string;
    imageUrl: string;
    title: string;
  }) => {
    const rawUrl = String(params.imageUrl || "").trim();
    if (!rawUrl) {
      toast.error("结果图地址无效");
      return;
    }

    setReplacementTextEditTarget({
      open: true,
      modeType: params.modeType,
      cardId: params.cardId,
      imageUrl: rawUrl,
      title: String(params.title || "").trim() || "待改字结果",
    });
  }, []);
  const handleRemoveDetailResultWatermark = useCallback(
    async (params: {
      cardId: string;
      imageUrl: string;
    }) => {
      const rawUrl = String(params.imageUrl || "").trim();
      const cardId = String(params.cardId || "").trim();
      if (!cardId || !/^https?:\/\//i.test(rawUrl)) {
        toast.error("结果图地址无效，无法去水印");
        return;
      }
      if (isAnyGenerationRunning) {
        toast.info("当前仍有生成任务处理中，完成后再去水印");
        return;
      }
      if (detailWatermarkRemoveCardIds.has(cardId)) {
        return;
      }

      setDetailWatermarkRemoveCardIds((current) => {
        const next = new Set(current);
        next.add(cardId);
        return next;
      });
      toast.info("正在去水印...");

      try {
        const payload = await requestLongTaskResult({
          endpoint: "/api/watermark-remove",
          payload: {
            image_url: rawUrl,
          },
        });
        if (!payload?.success) {
          throw new Error(payload?.error || payload?.detail || "去水印失败");
        }
        const nextUrl = String(payload.original_url || payload.thumbnail_url || "").trim();
        if (!/^https?:\/\//i.test(nextUrl)) {
          throw new Error("去水印完成但结果地址无效");
        }

        handleUpdateReplacementResultRecord({
          modeType: "detail_replacement",
          cardId,
          url: nextUrl,
          text: "已完成去水印处理。",
          status: "completed",
        });
        setActiveResultModeType("detail_replacement");
        setSelectedResultUrl(nextUrl);
        toast.success("去水印完成，已更新当前结果图");
      } catch (error) {
        console.error("[AgentGenerationWorkspaceDarkV2] 去水印失败:", error);
        toast.error(error instanceof Error ? error.message : "去水印失败，请稍后重试");
      } finally {
        setDetailWatermarkRemoveCardIds((current) => {
          const next = new Set(current);
          next.delete(cardId);
          return next;
        });
      }
    },
    [
      detailWatermarkRemoveCardIds,
      handleUpdateReplacementResultRecord,
      isAnyGenerationRunning,
    ]
  );
  const getReplacementExecutionCards = useCallback(
    (params: {
      modeType: ReplacementModeType;
      requestedCardIds?: string[] | null;
    }) => {
      const requestedCardIds = (params.requestedCardIds || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean);
      const references =
        params.modeType === "detail_replacement"
          ? detailReplacementReferenceCards
          : skuReplacementReferenceCards;
      const resultCards =
        params.modeType === "detail_replacement" ? detailResultCards : skuResultCards;

      if (references.length === 0) {
        return {
          targetCards: [] as typeof references,
          isResume: false,
        };
      }

      if (requestedCardIds.length > 0) {
        const requestedCardIdSet = new Set(requestedCardIds);
        return {
          targetCards: references.filter((card) => requestedCardIdSet.has(card.id)),
          isResume: false,
        };
      }

      const processedStatuses = new Set<ReplacementCardStatus>([
        "completed",
        "passthrough",
        "fallback",
      ]);
      const remainingIds = resultCards
        .filter((card) => !card.passthrough && !processedStatuses.has(card.status))
        .map((card) => card.id);
      const processedCount = resultCards.length - remainingIds.length;
      const shouldResume =
        processedCount > 0 && remainingIds.length > 0 && remainingIds.length < references.length;

      return {
        targetCards: shouldResume
          ? references.filter((card) => remainingIds.includes(card.id))
          : references.filter((card) => !card.passthrough),
        isResume: shouldResume,
      };
    },
    [
      detailReplacementReferenceCards,
      detailResultCards,
      skuReplacementReferenceCards,
      skuResultCards,
    ]
  );

  const handleSend = useCallback((options?: {
    replacementModeType?: ReplacementModeType;
    replacementCardIds?: string[] | null;
    promptText?: string | null;
  }) => {
    if (isSelectedBusinessModeUnavailable || activeBusinessModeKey === "buyer_show") {
      toast.error("当前生图模式暂未开放");
      return;
    }
    if (isDetailReplacementPreset && isDetailAiGenerationMethod) {
      void handleRunAiDetailGeneration();
      return;
    }
    if (requiresPresetSelection && !selectedAgentPresetId) {
      toast.error("请先选择生图模式");
      return;
    }
    if (isDetailReplacementPreset && detailReplacementReferenceCards.length === 0) {
      toast.error(`请先查询并选择${detailReferenceSourceLabel}参考图`);
      return;
    }
    if (isSkuReplacementPreset && skuReplacementReferenceCards.length === 0) {
      toast.error(`请先查询并选择${skuReferenceSourceLabel}参考图`);
      return;
    }
    const resolvedWorkflowContext = getLatestWorkflowContext?.() ?? workflowContext;
    if (
      isDetailReplacementPreset &&
      detailReplacementStrategy !== "product_only" &&
      !String(resolvedWorkflowContext?.promptText || "").trim()
    ) {
      toast.error("请先在「Agent 提示词配置」里选择提示词组合，再执行详情场景替换");
      return;
    }
    const replacementModeType =
      options?.replacementModeType ||
      (isDetailReplacementPreset
        ? "detail_replacement"
        : isSkuReplacementPreset
          ? "sku_replacement"
          : null);
    const requestedReplacementCardIds = (options?.replacementCardIds || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const replacementExecutionPlan =
      replacementModeType
        ? getReplacementExecutionCards({
            modeType: replacementModeType,
            requestedCardIds: requestedReplacementCardIds,
          })
        : null;
    const replacementExecutionCards = replacementExecutionPlan?.targetCards || [];
    if (replacementModeType && replacementExecutionCards.length === 0) {
      if (requestedReplacementCardIds.length > 0) {
        toast.error("当前结果卡片不存在或已被移除");
        return;
      }
      toast.info("当前结果都已完成，如需调整请使用单张“重新生图”");
      return;
    }
    const uploadedProductAttachmentCount = selectedProductAttachments.length;
    if (hasAgentUploadSlots && uploadedProductAttachmentCount < requiredProductUploadCount) {
      toast.error(`当前模式需要上传 ${requiredProductUploadCount} 张产品图`);
      return;
    }
    const resolvedModelId =
      lockedWorkflowModelId ||
      (selectedModelId !== "auto"
        ? selectedModelId
        : effectiveDefaultModelId || selectedModelId);
    if (!resolvedModelId) {
      toast.error("当前 Agent 未配置模型");
      return;
    }
    if (
      resolvedModelId !== "auto" &&
      !executableModelIdSet.has(resolvedModelId)
    ) {
      toast.error("当前 Agent 绑定的模型不存在或已停用，请重新编辑 Agent 模型配置");
      return;
    }
    const parts: Array<{ type: "text"; text: string } | { type: "file"; mediaType: string; name: string; url: string; assetId?: string }> = [];
    const sanitizedAttachments = sceneMessageAttachments;
    if (
      hasAgentUploadSlots &&
      selectedProductAttachments.filter((attachment) => Boolean(attachment?.url)).length <
        requiredProductUploadCount
    ) {
      toast.error(`当前模式需要上传 ${requiredProductUploadCount} 张有效产品图`);
      return;
    }
    const primaryAttachmentCountForMessage = Math.min(
      scenePrimaryReferenceCount,
      sanitizedAttachments.length
    );
    const secondaryAttachmentCountForMessage = Math.min(
      sceneSecondaryReferenceCount,
      Math.max(
        sanitizedAttachments.length -
          primaryAttachmentCountForMessage -
          (selectedModelAttachment ? 1 : 0),
        0
      )
    );
    sanitizedAttachments.forEach((attachment, index) => {
      if (!attachment) return;
      let attachmentName = normalizeChatAttachmentName(attachment.name);
      if (isSceneGenerationPreset) {
        if (index < primaryAttachmentCountForMessage) {
          attachmentName = `主SKU参考图 ${index + 1}`;
        } else if (index < primaryAttachmentCountForMessage + secondaryAttachmentCountForMessage) {
          attachmentName = `搭配SKU参考图 ${index - primaryAttachmentCountForMessage + 1}`;
        } else if (
          selectedModelAttachment &&
          index === primaryAttachmentCountForMessage + secondaryAttachmentCountForMessage
        ) {
          attachmentName = "品牌模特图";
        }
      }
      parts.push({
        type: "file",
        mediaType: normalizeChatMediaType(attachment.contentType),
        name: attachmentName,
        url: attachment.url,
        assetId: isValidChatUuid(attachment.assetId) ? attachment.assetId : undefined,
      });
    });
    let textContent = String(options?.promptText || "").trim() || input.trim();
    if (!textContent && replacementModeType && replacementExecutionCards.length === 1) {
      textContent = "请重新生成当前这张替换结果，保持版式和主体一致。";
    }
    if (
      !textContent &&
      replacementModeType &&
      replacementExecutionPlan?.isResume &&
      replacementExecutionCards.length > 0
    ) {
      textContent = "请继续处理当前剩余的替换结果。";
    }
    if (!textContent && selectedAgentPreset?.type === "text" && resolvedWorkflowContext?.summaryText) {
      textContent = `请基于当前工作流设定生成方案：${resolvedWorkflowContext.summaryText}`;
    }
    if (!textContent && selectedAgentPreset?.type === "text" && selectedAgentPreset) {
      textContent = `请按「${selectedAgentPreset.name}」输出内容`;
    }
    textContent = clampChatRequestText(textContent, MAX_CHAT_TEXT_PART_LENGTH);
    if (textContent) {
      parts.push({ type: "text", text: textContent });
    }
    if (parts.length === 0) {
      toast.error("请至少补充要求或上传图片");
      return;
    }
    const nextHiddenPrompt = resolvedWorkflowContext?.promptText
      ? clampChatRequestText(
          `【工作流设定】\n${resolvedWorkflowContext.promptText}\n\n请严格遵循以上工作流设定输出内容，并保持整体结果一致。`,
          MAX_CHAT_HIDDEN_PROMPT_LENGTH
        )
      : null;
    hiddenPromptRef.current = nextHiddenPrompt;
    generationRequestSnapshotRef.current = {
      hiddenPrompt: nextHiddenPrompt,
      replacementExecutionCardIds:
        replacementModeType && replacementExecutionCards.length > 0
          ? replacementExecutionCards.map((card) => card.id)
          : null,
    };
    setReplacementExecutionContext(
      replacementModeType && replacementExecutionCards.length > 0
        ? {
            modeType: replacementModeType,
            cardIds: replacementExecutionCards.map((card) => card.id),
          }
        : null
    );
    setActiveResultModeType(currentResultModeType);
    setSelectedResultUrl(null);
    setPendingGeneration({
      chatId,
      modeType: currentResultModeType,
      expectedCount:
        currentResultModeType === "scene_generation"
          ? Math.max(1, imageParams.imageCount || 1)
          : replacementModeType && replacementExecutionCards.length > 0
            ? replacementExecutionCards.length
            : currentResultModeType === "detail_replacement"
              ? detailReplacementReferenceCards.length
              : skuReplacementReferenceCards.length,
      userTurnCountAtStart: userMessageCount,
      timestamp: Date.now(),
      requestedCardIds:
        replacementModeType && replacementExecutionCards.length > 0
          ? replacementExecutionCards.map((card) => card.id)
          : null,
    });
    if (replacementExecutionPlan?.isResume && replacementExecutionCards.length > 0) {
      toast.success(`继续处理剩余 ${replacementExecutionCards.length} 张结果图`);
    }
    try {
      sendMessage({ role: "user", parts });
      if (selectedAgentPreset?.type !== "image") {
        setInput("");
      }
    } catch (error) {
      generationRequestSnapshotRef.current = {
        hiddenPrompt: null,
        replacementExecutionCardIds: null,
      };
      setPendingGeneration(null);
      toast.error(error instanceof Error ? error.message : "发送生成请求失败");
    }
  }, [
    attachments,
    activeBusinessModeKey,
    detailResultCards,
    detailReplacementReferenceCards.length,
    detailReplacementStrategy,
    handleRunAiDetailGeneration,
    currentResultModeType,
    getReplacementExecutionCards,
    hasAgentUploadSlots,
    imageParams.imageCount,
    input,
    isDetailAiGenerationMethod,
    isDetailReplacementPreset,
    isSelectedBusinessModeUnavailable,
    isSkuReplacementPreset,
    effectiveDefaultModelId,
    executableModelIdSet,
    lockedWorkflowModelId,
    requiredProductUploadCount,
    requiresPresetSelection,
    selectedAgentPreset,
    selectedAgentPresetId,
    selectedModelId,
    sendMessage,
    setPendingGeneration,
    skuReplacementReferenceCards.length,
    skuResultCards,
    userMessageCount,
    getLatestWorkflowContext,
    isSceneGenerationPreset,
    workflowContext,
    sceneMessageAttachments,
    scenePrimaryReferenceCount,
    sceneSecondaryReferenceCount,
    selectedModelAttachment,
  ]);
  const handleStopGeneration = useCallback(() => {
    detailGenerationCancelRef.current = true;
    stop();
    generationRequestSnapshotRef.current = {
      hiddenPrompt: hiddenPromptRef.current,
      replacementExecutionCardIds: null,
    };
    setPendingGeneration(null);
    setMessages((current) => current);
    toast.info("已停止当前生成任务");
  }, [setMessages, stop]);
  const handleApplyReplacementTextEditResult = useCallback((result: {
    originalUrl: string;
    thumbnailUrl?: string | null;
    model?: string | null;
  }) => {
    if (!replacementTextEditTarget) {
      return;
    }

    handleUpdateReplacementResultRecord({
      modeType: replacementTextEditTarget.modeType,
      cardId: replacementTextEditTarget.cardId,
      url: result.originalUrl,
      text: "已在当前页面完成文字编辑。",
      status: "completed",
    });
    setReplacementTextEditTarget((current) =>
      current
        ? {
            ...current,
            imageUrl: result.originalUrl,
          }
        : current
    );
  }, [handleUpdateReplacementResultRecord, replacementTextEditTarget]);
  const handleConfirmReplacementRerun = useCallback(() => {
    if (!replacementRerunTarget) {
      return;
    }

    handleSend({
      replacementModeType: replacementRerunTarget.modeType,
      replacementCardIds: [replacementRerunTarget.cardId],
      promptText: replacementRerunPrompt,
    });
    setReplacementRerunTarget(null);
    setReplacementRerunPrompt("");
  }, [handleSend, replacementRerunPrompt, replacementRerunTarget]);

  const handleDownloadOriginalImage = useCallback(async (imageUrl: string) => {
    const raw = String(imageUrl || "").trim();
    if (!raw) {
      toast.error("图片地址无效");
      return;
    }

    const filename = buildDownloadFilename(raw);
    try {
      const response = await fetch(raw);
      if (!response.ok) {
        throw new Error(`download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = raw;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.message("已打开原图，可右键另存为");
    }
  }, []);
  const uploadBase64ResultToStorage = useCallback(async (base64Url: string) => {
    const response = await fetch(base64Url);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("file", blob, `agent-scene-resize-${Date.now()}.png`);

    const uploadResponse = await fetchUploadWithRetry(formData);
    if (!uploadResponse.ok) {
      throw await createUploadErrorFromResponse(uploadResponse, "上传失败");
    }

    const result = await uploadResponse.json().catch(() => ({}));
    const uploadedUrl = String(result?.url || "").trim();
    if (!/^https?:\/\//i.test(uploadedUrl)) {
      throw new Error("上传结果无效");
    }
    return uploadedUrl;
  }, []);
  const handleSceneResultResizeComplete = useCallback(
    async (resizedImageUrl: string) => {
      if (!onResultPreviewUrlsChange) {
        toast.error("当前项目未接入结果保存能力");
        return;
      }

      let finalUrl = String(resizedImageUrl || "").trim();
      if (finalUrl.startsWith("data:")) {
        try {
          toast.info("正在上传尺寸调整结果...");
          finalUrl = await uploadBase64ResultToStorage(finalUrl);
        } catch (error) {
          console.error("[AgentGenerationWorkspaceDarkV2] 上传尺寸调整结果失败:", error);
          const message = getUploadErrorMessage(
            error,
            "尺寸调整结果上传失败"
          );
          if (message) toast.error(message);
          return;
        }
      }

      if (!/^https?:\/\//i.test(finalUrl)) {
        toast.error("尺寸调整结果地址无效");
        return;
      }

      const nextSceneUrls = Array.from(
        new Set([
          ...normalizeResultCollectionUrls(mergedResultCollections.scene_generation),
          finalUrl,
        ])
      );

      onResultPreviewUrlsChange("scene_generation", nextSceneUrls);
      setActiveResultModeType("scene_generation");
      setSelectedResultUrl(finalUrl);
      setSceneResizeEditorTargetUrl(null);
      toast.success("尺寸调整结果已加入场景结果区");
    },
    [mergedResultCollections.scene_generation, onResultPreviewUrlsChange, uploadBase64ResultToStorage]
  );
	  const appendResultUrlToCollection = useCallback(
	    (modeType: AgentGenerationResultModeType, imageUrl: string) => {
	      const normalizedUrl = String(imageUrl || "").trim();
	      if (!normalizedUrl || !onResultPreviewUrlsChange) {
	        return false;
      }

      const nextUrls = Array.from(
        new Set([
          ...normalizeResultCollectionUrls(mergedResultCollections[modeType]),
          normalizedUrl,
        ])
      );
      onResultPreviewUrlsChange(modeType, nextUrls);
      if (activeResultModeType === modeType) {
        setSelectedResultUrl(normalizedUrl);
      }
      return true;
	    },
	    [activeResultModeType, mergedResultCollections, onResultPreviewUrlsChange]
	  );
	  const showProcessedResultHint = useCallback((imageUrl: string, label: string) => {
	    const normalizedUrl = String(imageUrl || "").trim();
	    const normalizedLabel = String(label || "").trim();
	    if (!/^https?:\/\//i.test(normalizedUrl) || !normalizedLabel) return;

	    const existingTimer = processedResultHintTimerRef.current[normalizedUrl];
	    if (existingTimer) {
	      window.clearTimeout(existingTimer);
	    }

	    setProcessedResultHintByUrl((current) => ({
	      ...current,
	      [normalizedUrl]: normalizedLabel,
	    }));

	    processedResultHintTimerRef.current[normalizedUrl] = window.setTimeout(() => {
	      setProcessedResultHintByUrl((current) => {
	        if (!(normalizedUrl in current)) return current;
	        const next = { ...current };
	        delete next[normalizedUrl];
	        return next;
	      });
	      delete processedResultHintTimerRef.current[normalizedUrl];
	    }, 2800);
	  }, []);
	  const handleEnhanceDetailGenerationResult = useCallback(
	    async (params: {
	      cardId: string;
	      imageUrl: string;
      resultModeType?: "detail_generation" | "detail_replacement";
    }) => {
      const cardId = String(params.cardId || "").trim();
      const imageUrl = String(params.imageUrl || "").trim();
      const resultModeType = params.resultModeType || "detail_generation";
      if (!cardId || !/^https?:\/\//i.test(imageUrl)) {
        toast.error("详情图地址无效，无法高清处理");
        return;
      }
      if (detailEnhancingCardIds.has(cardId)) return;

      setDetailEnhancingCardIds((current) => {
        const next = new Set(current);
        next.add(cardId);
        return next;
      });
      toast.info("正在高清处理详情图...");

      try {
        const result = await imageGenerationService.enhanceImage(imageUrl);
        if (!result.success || !result.data?.url) {
          throw new Error(result.error || "高清处理失败");
        }
        const nextUrl = result.data.url;
        if (resultModeType === "detail_replacement") {
          handleUpdateReplacementResultRecord({
            modeType: "detail_replacement",
            cardId,
            url: nextUrl,
            text: "已完成高清处理。",
            status: "completed",
          });
          setActiveResultModeType("detail_replacement");
          setActiveDetailReferenceCardId(cardId);
          setSelectedResultUrl(nextUrl);
        } else {
          if (!appendResultUrlToCollection("detail_generation", nextUrl)) {
            throw new Error("当前项目未接入结果保存能力");
          }
          setActiveResultModeType("detail_generation");
          setSelectedResultUrl(nextUrl);
        }
        toast.success(
          resultModeType === "detail_replacement"
            ? "高清处理完成，已更新当前套详情结果图"
            : "高清处理完成，已加入 AI详情结果区"
        );
      } catch (error) {
        console.error("[AgentGenerationWorkspaceDarkV2] 详情图高清失败:", error);
        toast.error(error instanceof Error ? error.message : "高清处理失败，请稍后重试");
      } finally {
        setDetailEnhancingCardIds((current) => {
          const next = new Set(current);
          next.delete(cardId);
          return next;
        });
      }
    },
    [
      appendResultUrlToCollection,
      detailEnhancingCardIds,
      handleUpdateReplacementResultRecord,
    ]
  );
  const handleSubmitDetailLocalEdit = useCallback(
    async (params: DetailResultLocalEditSubmitParams) => {
      const target = detailLocalEditTarget;
      const cardId = String(target?.cardId || "").trim();
      const imageUrl = String(params.imageUrl || "").trim();
      const resultModeType = target?.resultModeType || "detail_generation";
      const editMode: DetailResultLocalEditMode =
        params.mode || target?.mode || "local_edit";
      const isScaleAdjust = editMode === "scale_adjust";
      if (!target || !cardId || !/^https?:\/\//i.test(imageUrl)) {
        toast.error(`详情图地址无效，无法${isScaleAdjust ? "比例调整" : "局部编辑"}`);
        return;
      }
      if (detailLocalEditSubmittingId) return;

      setDetailLocalEditSubmittingId(cardId);
      setDetailLocalEditSubmittingMode(editMode);
      toast.info(isScaleAdjust ? "正在提交比例调整..." : "正在提交局部编辑...");

      try {
        const submitResult = await imageGenerationService.localEdit({
          aspectRatio: "auto",
          imageSize: "2K",
          operation: isScaleAdjust ? "scale-adjust" : undefined,
          scalePercent: isScaleAdjust ? params.scalePercent : undefined,
          sourceImageUrl: imageUrl,
          sourceNodeId: `agent-detail-${cardId}`,
          regions: params.regions.map((region) => ({
            id: region.id,
            index: region.index,
            color: region.color,
            prompt: region.prompt,
            rect: region.rect,
            referenceImages: (region.referenceImages || []).map((reference) => ({
              id: reference.id,
              url: reference.url,
              name: reference.name,
              source: reference.source,
            })),
          })),
        });

        if (!submitResult.success || !submitResult.data?.taskId) {
          throw new Error(submitResult.error || `${isScaleAdjust ? "比例调整" : "局部编辑"}提交失败`);
        }

        const deadline = Date.now() + AGENT_IMAGE_TASK_TIMEOUT_MS;
        let lastError = "";
        while (Date.now() < deadline) {
          await sleep(AGENT_IMAGE_TASK_POLL_INTERVAL_MS);
          const taskResult = await imageGenerationService.getImageTask(
            submitResult.data.taskId
          );
          const task = taskResult.data?.task;
          const status = String(task?.status || "").toLowerCase();

          if (!taskResult.success || !task) {
            lastError = taskResult.error || `查询${isScaleAdjust ? "比例调整" : "局部编辑"}任务失败`;
            continue;
          }

          if (status === "succeeded" || status === "completed") {
            const generatedImage = task.result?.images?.[0];
            const nextUrl =
              generatedImage?.originalUrl || generatedImage?.thumbnailUrl || "";
            if (!/^https?:\/\//i.test(nextUrl)) {
              throw new Error(`${isScaleAdjust ? "比例调整" : "局部编辑"}完成但结果地址无效`);
            }
            if (resultModeType === "detail_replacement") {
              handleUpdateReplacementResultRecord({
                modeType: "detail_replacement",
                cardId,
                url: nextUrl,
                text: isScaleAdjust ? "已完成比例调整处理。" : "已完成局部编辑处理。",
                status: "completed",
              });
              setActiveResultModeType("detail_replacement");
              setActiveDetailReferenceCardId(cardId);
              setSelectedResultUrl(nextUrl);
            } else {
              if (!appendResultUrlToCollection("detail_generation", nextUrl)) {
                throw new Error("当前项目未接入结果保存能力");
              }
              setActiveResultModeType("detail_generation");
              setSelectedResultUrl(nextUrl);
            }
            showProcessedResultHint(
              nextUrl,
              isScaleAdjust ? "比例调整完成" : "局部编辑完成"
            );
            setDetailLocalEditTarget(null);
            toast.success(
              resultModeType === "detail_replacement"
                ? `${isScaleAdjust ? "比例调整" : "局部编辑"}完成，已更新当前套详情结果图`
                : `${isScaleAdjust ? "比例调整" : "局部编辑"}完成，已加入 AI详情结果区`
            );
            return;
          }

          if (["failed", "cancelled", "expired", "banned"].includes(status)) {
            throw new Error(task.error || `${isScaleAdjust ? "比例调整" : "局部编辑"}生成失败`);
          }
        }

        throw new Error(
          lastError || `${isScaleAdjust ? "比例调整" : "局部编辑"}任务等待超时，请稍后重试`
        );
      } catch (error) {
        console.error(
          `[AgentGenerationWorkspaceDarkV2] 详情图${isScaleAdjust ? "比例调整" : "局部编辑"}失败:`,
          error
        );
        toast.error(
          error instanceof Error
            ? error.message
            : `${isScaleAdjust ? "比例调整" : "局部编辑"}失败，请稍后重试`
        );
      } finally {
        setDetailLocalEditSubmittingId(null);
        setDetailLocalEditSubmittingMode(null);
      }
    },
    [
      appendResultUrlToCollection,
      detailLocalEditSubmittingId,
      detailLocalEditTarget,
      handleUpdateReplacementResultRecord,
      showProcessedResultHint,
    ]
  );
  const handleDeleteResultImage = useCallback(
    (modeType: AgentGenerationResultModeType, imageUrl: string) => {
      const normalizedUrl = String(imageUrl || "").trim();
      if (!normalizedUrl || !onDeleteResultImage) {
        return;
      }

      if (selectedResultUrl === normalizedUrl) {
        setSelectedResultUrl(null);
      }
      if (fullscreenPreview === normalizedUrl) {
        setFullscreenPreview(null);
      }
      if (sceneResizeEditorTargetUrl === normalizedUrl) {
        setSceneResizeEditorTargetUrl(null);
      }
      const existingTimer = processedResultHintTimerRef.current[normalizedUrl];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        delete processedResultHintTimerRef.current[normalizedUrl];
      }
      setProcessedResultHintByUrl((current) => {
        if (!(normalizedUrl in current)) return current;
        const next = { ...current };
        delete next[normalizedUrl];
        return next;
      });

      onDeleteResultImage(modeType, normalizedUrl);
      toast.success("结果图已删除");
    },
    [fullscreenPreview, onDeleteResultImage, sceneResizeEditorTargetUrl, selectedResultUrl]
  );

  const handleToolStepChange = useCallback(
    (nextKey: ToolStepKey) => {
      const nextStep = toolSteps.find((step) => step.key === nextKey);
      if (!nextStep) return;
      if (nextStep.disabled) {
        toast.error("当前步骤暂不可用");
        return;
      }
      setActiveToolStep(nextKey);
    },
    [toolSteps]
  );
  const scrollToSection = useCallback((sectionId: string) => {
    if (
      (sectionId === "agent-anchor-generate" || sectionId === "agent-anchor-results") &&
      !isDetailAiGenerationMethod &&
      hasAgentUploadSlots &&
      !hasSatisfiedSlotRequirement
    ) {
      toast.error(slotRequirementMessage || "请先补齐输入图后再继续");
      const fallbackTarget = hasMaterialStep ? "agent-anchor-materials" : "agent-anchor-generate";
      const fallbackElement = typeof document !== "undefined"
        ? document.getElementById(fallbackTarget)
        : null;
      fallbackElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [
    hasAgentUploadSlots,
    hasMaterialStep,
    hasSatisfiedSlotRequirement,
    isDetailAiGenerationMethod,
    slotRequirementMessage,
  ]);
  const updateDetailReplacementState = useCallback(
    (
      updater:
        | Partial<AgentModeWorkspaceState["detailReplacement"]>
        | ((current: AgentModeWorkspaceState["detailReplacement"]) => AgentModeWorkspaceState["detailReplacement"])
    ) => {
      const current = resolvedAgentModeState.detailReplacement;
      const nextDetailReplacement =
        typeof updater === "function" ? updater(current) : { ...current, ...updater };
      if (nextDetailReplacement === current) {
        return;
      }
      emitAgentModeState({
        ...resolvedAgentModeState,
        detailReplacement: nextDetailReplacement,
      });
    },
    [emitAgentModeState, resolvedAgentModeState]
  );
  const updateSkuReplacementState = useCallback(
    (
      updater:
        | Partial<AgentModeWorkspaceState["skuReplacement"]>
        | ((current: AgentModeWorkspaceState["skuReplacement"]) => AgentModeWorkspaceState["skuReplacement"])
    ) => {
      const current = resolvedAgentModeState.skuReplacement;
      const nextSkuReplacement =
        typeof updater === "function" ? updater(current) : { ...current, ...updater };
      if (nextSkuReplacement === current) {
        return;
      }
      emitAgentModeState({
        ...resolvedAgentModeState,
        skuReplacement: nextSkuReplacement,
      });
    },
    [emitAgentModeState, resolvedAgentModeState]
  );
  useEffect(() => {
    if (!isDetailReplacementPreset) {
      lastSyncedDetailProductSlotKeysRef.current = [];
      lastSyncedDetailBundleSlotKeysRef.current = [];
      lastSyncedDetailModelSlotKeyRef.current = null;
      return;
    }

    const secondaryReferenceImages = referenceImages
      .filter((image) => image.source === "secondary")
      .slice(0, AGENT_DETAIL_BUNDLE_SLOT_INDEXES.length);
    const nextDetailProductSourceKeys = detailGenerationProductSlotIndexes.map((_, index) =>
      getAttachmentIdentityKey(selectedProductAttachments[index])
    );
    const nextDetailBundleSourceKeys = AGENT_DETAIL_BUNDLE_SLOT_INDEXES.map((_, index) =>
      getAttachmentIdentityKey(
        secondaryReferenceImages[index]
          ? {
              url: secondaryReferenceImages[index]?.url,
              assetId: secondaryReferenceImages[index]?.assetId || null,
            }
          : null
      )
    );
    const nextDetailModelSourceKey =
      modelSlotEnabled && AGENT_DETAIL_MODEL_SLOT_INDEX >= 0
        ? getAttachmentIdentityKey(selectedModelAttachment)
        : null;
    const latestWorkflowContext = getLatestWorkflowContext?.() ?? workflowContext;
    const workflowPrimarySpu = getCurrentWorkflowPrimarySpu().trim().toUpperCase();
    const workflowPriceBand = String(latestWorkflowContext?.priceBand || "").trim();

    updateDetailReplacementState((current) => {
      let changed = false;
      const nextBrief = {
        ...(current.brief || createEmptyAgentDetailBriefForm()),
      };
      if (!nextBrief.productSpu && workflowPrimarySpu) {
        nextBrief.productSpu = workflowPrimarySpu;
        changed = true;
      }
      if (!nextBrief.priceBand && workflowPriceBand) {
        nextBrief.priceBand = workflowPriceBand;
        changed = true;
      }

      const nextSlots = Array.from(
        { length: AGENT_DETAIL_SLOT_CONFIGS.length },
        (_, index) => current.slots?.[index] || null
      );
      detailGenerationProductSlotIndexes.forEach((slotIndex, index) => {
        const attachment = selectedProductAttachments[index];
        const currentSlot = nextSlots[slotIndex];
        const currentSlotKey = getAttachmentIdentityKey(currentSlot);
        const previousSyncedKey = lastSyncedDetailProductSlotKeysRef.current[index] || null;
        const currentIsPreviousAutoSelection =
          Boolean(previousSyncedKey) && currentSlotKey === previousSyncedKey;

        if (attachment) {
          const nextAttachment = {
            url: attachment.url,
            name: attachment.name || AGENT_DETAIL_SLOT_CONFIGS[slotIndex]?.label || null,
            contentType: attachment.contentType || "image/jpeg",
            assetId: attachment.assetId || null,
          };
          if (
            (!currentSlot || currentIsPreviousAutoSelection) &&
            !areAttachmentValuesEqual(currentSlot, nextAttachment)
          ) {
            nextSlots[slotIndex] = nextAttachment;
            changed = true;
          }
        } else if (currentIsPreviousAutoSelection) {
          nextSlots[slotIndex] = null;
          changed = true;
        }
      });
      if (
        modelSlotEnabled &&
        AGENT_DETAIL_MODEL_SLOT_INDEX >= 0 &&
        selectedModelAttachment
      ) {
        const currentSlot = nextSlots[AGENT_DETAIL_MODEL_SLOT_INDEX];
        const currentSlotKey = getAttachmentIdentityKey(currentSlot);
        const previousSyncedKey = lastSyncedDetailModelSlotKeyRef.current;
        const currentIsPreviousAutoSelection =
          Boolean(previousSyncedKey) && currentSlotKey === previousSyncedKey;
        const nextAttachment = {
          url: selectedModelAttachment.url,
          name:
            selectedModelAttachment.name ||
            AGENT_DETAIL_SLOT_CONFIGS[AGENT_DETAIL_MODEL_SLOT_INDEX]?.label ||
            null,
          contentType: selectedModelAttachment.contentType || "image/jpeg",
          assetId: selectedModelAttachment.assetId || null,
        };
        if (
          (!currentSlot || currentIsPreviousAutoSelection) &&
          !areAttachmentValuesEqual(currentSlot, nextAttachment)
        ) {
          nextSlots[AGENT_DETAIL_MODEL_SLOT_INDEX] = nextAttachment;
          changed = true;
        }
      } else if (modelSlotEnabled && AGENT_DETAIL_MODEL_SLOT_INDEX >= 0) {
        const currentSlot = nextSlots[AGENT_DETAIL_MODEL_SLOT_INDEX];
        const currentSlotKey = getAttachmentIdentityKey(currentSlot);
        const previousSyncedKey = lastSyncedDetailModelSlotKeyRef.current;
        const currentIsPreviousAutoSelection =
          Boolean(previousSyncedKey) && currentSlotKey === previousSyncedKey;
        if (currentIsPreviousAutoSelection) {
          nextSlots[AGENT_DETAIL_MODEL_SLOT_INDEX] = null;
          changed = true;
        }
      }
      AGENT_DETAIL_BUNDLE_SLOT_INDEXES.forEach((slotIndex, index) => {
        const image = secondaryReferenceImages[index];
        const currentSlot = nextSlots[slotIndex];
        const currentSlotKey = getAttachmentIdentityKey(currentSlot);
        const previousSyncedKey = lastSyncedDetailBundleSlotKeysRef.current[index] || null;
        const currentIsPreviousAutoSelection =
          Boolean(previousSyncedKey) && currentSlotKey === previousSyncedKey;

        if (image) {
          const nextAttachment = {
            url: image.url,
            name:
              image.name ||
              image.label ||
              AGENT_DETAIL_SLOT_CONFIGS[slotIndex]?.label ||
              null,
            contentType: image.mimeType || "image/jpeg",
            assetId: image.assetId || null,
          };
          if (
            (!currentSlot || currentIsPreviousAutoSelection) &&
            !areAttachmentValuesEqual(currentSlot, nextAttachment)
          ) {
            nextSlots[slotIndex] = nextAttachment;
            changed = true;
          }
        } else if (currentIsPreviousAutoSelection) {
          nextSlots[slotIndex] = null;
          changed = true;
        }
      });

      if (!changed) {
        lastSyncedDetailProductSlotKeysRef.current = nextDetailProductSourceKeys;
        lastSyncedDetailBundleSlotKeysRef.current = nextDetailBundleSourceKeys;
        lastSyncedDetailModelSlotKeyRef.current = nextDetailModelSourceKey;
        return current;
      }

      lastSyncedDetailProductSlotKeysRef.current = nextDetailProductSourceKeys;
      lastSyncedDetailBundleSlotKeysRef.current = nextDetailBundleSourceKeys;
      lastSyncedDetailModelSlotKeyRef.current = nextDetailModelSourceKey;

      return {
        ...current,
        brief: nextBrief,
        slots: nextSlots,
      };
    });
  }, [
    detailGenerationProductSlotIndexes,
    getCurrentWorkflowPrimarySpu,
    getLatestWorkflowContext,
    isDetailReplacementPreset,
    modelSlotEnabled,
    referenceImages,
    selectedModelAttachment,
    selectedProductAttachments,
    updateDetailReplacementState,
    workflowContext,
  ]);
  const updateDetailGenerationMethod = useCallback(
    (method: "reference_replace" | "ai_detail_generate") => {
      updateDetailReplacementState((current) => ({
        ...current,
        method,
      }));
    },
    [updateDetailReplacementState]
  );
  const updateDetailReplacementStrategy = useCallback(
    (replacementStrategy: AgentDetailReplacementStrategy) => {
      updateDetailReplacementState((current) => ({
        ...current,
        replacementStrategy,
      }));
    },
    [updateDetailReplacementState]
  );
  const handleAiDetailGenerationUnavailableClick = useCallback(() => {
    toast.info(AI_DETAIL_GENERATION_DISABLED_MESSAGE);
  }, []);
  useEffect(() => {
    if (!IS_AI_DETAIL_GENERATION_DISABLED) {
      return;
    }
    if (detailReplacementState.method !== "ai_detail_generate") {
      return;
    }
    updateDetailReplacementState((current) => ({
      ...current,
      method: "reference_replace",
    }));
  }, [detailReplacementState.method, updateDetailReplacementState]);
  const updateDetailGenerationBriefField = useCallback(
    (key: keyof AgentDetailBriefForm, value: string) => {
      updateDetailReplacementState((current) => ({
        ...current,
        brief: {
          ...(current.brief || createEmptyAgentDetailBriefForm()),
          [key]: value,
        },
      }));
    },
    [updateDetailReplacementState]
  );
  const updateDetailGenerationSlot = useCallback(
    (slotIndex: number, attachment: PickedAttachment | null) => {
      updateDetailReplacementState((current) => {
        const nextSlots = Array.from(
          { length: AGENT_DETAIL_SLOT_CONFIGS.length },
          (_, index) => current.slots?.[index] || null
        );
        nextSlots[slotIndex] = attachment
          ? {
              url: attachment.url,
              name: attachment.name || null,
              contentType: attachment.contentType || null,
              assetId: attachment.assetId || null,
            }
          : null;
        return {
          ...current,
          slots: nextSlots,
        };
      });
    },
    [updateDetailReplacementState]
  );
  const updateDetailGenerationProgressState = useCallback(
    (progress: AgentDetailGenerationProgressState) => {
      updateDetailReplacementState((current) => ({
        ...current,
        progress,
      }));
    },
    [updateDetailReplacementState]
  );
  const handleDetailGenerationSlotFileChange = useCallback(
    async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        event.currentTarget.value = "";
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetchUploadWithRetry(formData);
        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "上传失败");
        }
        const data = await response.json().catch(() => null);
        if (!data?.url) {
          throw new Error("上传后未返回图片地址");
        }
        updateDetailGenerationSlot(slotIndex, {
          url: data.url,
          name: file.name,
          contentType: file.type || "image/jpeg",
          assetId: typeof data.assetId === "string" ? data.assetId : undefined,
        });
        toast.success(`${AGENT_DETAIL_SLOT_CONFIGS[slotIndex]?.label || "素材"}上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error, "上传失败");
        if (message) toast.error(message);
      } finally {
        event.currentTarget.value = "";
      }
    },
    [updateDetailGenerationSlot]
  );
  async function handleRunAiDetailGeneration() {
    if (detailGenerationMode !== "classic") {
      toast.error("AGENT排版模式将在共享画布文字层能力接入后开放，当前请先使用经典详情");
      return;
    }
    if (detailGenerationValidationIssues.length > 0) {
      toast.error(detailGenerationValidationIssues[0] || "请先补齐 AI详情生成参数");
      return;
    }

    const productAttachments = detailGenerationProductSlotIndexes.map((index) =>
      detailGenerationSlots[index]
    ).filter((item): item is NonNullable<(typeof detailGenerationSlots)[number]> => Boolean(item?.url));
    const bundleAttachments = AGENT_DETAIL_BUNDLE_SLOT_INDEXES.map((index) =>
      detailGenerationSlots[index]
    ).filter((item): item is NonNullable<(typeof detailGenerationSlots)[number]> => Boolean(item?.url));
    const modelAttachment =
      modelSlotEnabled && AGENT_DETAIL_MODEL_SLOT_INDEX >= 0
        ? detailGenerationSlots[AGENT_DETAIL_MODEL_SLOT_INDEX]
        : null;

    const basePrompt = detailGenerationBrief.productName
      ? `${detailGenerationBrief.productName}详情页生成`
      : "电商详情页生成";
    const demandHint = detailGenerationBrief.demandType
      ? `，需求类型：${detailGenerationBrief.demandType}`
      : "";
    const userSupplementPrompt = input.trim();
    const detailPrompt =
      userSupplementPrompt ||
      `${basePrompt}，面向${detailGenerationBrief.targetAudience}，在${detailGenerationBrief.usageScenario}场景解决${detailGenerationBrief.coreNeed}${demandHint}`;
    const latestWorkflowContext = getLatestWorkflowContext?.() ?? workflowContext;
    const workflowHint = latestWorkflowContext?.promptText
      ? `\n\n【工作流风格要求】\n${latestWorkflowContext.promptText}`
      : "";
    const detailPromptWithWorkflow = `${detailPrompt}${workflowHint}`.trim();
    const detailCount = extractAgentDetailFrameCount(detailPrompt);
    const referenceImageNotes = detailGenerationVisibleSlotIndexes.map((slotIndex, visibleIndex) => {
      const config = AGENT_DETAIL_SLOT_CONFIGS[slotIndex];
      const current = detailGenerationSlots[slotIndex];
      return `${visibleIndex + 1}. ${config?.label || `素材${visibleIndex + 1}`}${current?.name ? `（${current.name}）` : ""}`;
    });
    const outputLanguage: "zh" | "en" = /[a-zA-Z]/.test(detailPromptWithWorkflow)
      ? "en"
      : "zh";
    const resolvedModelId =
      lockedWorkflowModelId ||
      (selectedModelId !== "auto"
        ? selectedModelId
        : effectiveDefaultModelId || undefined);
    if (
      resolvedModelId &&
      resolvedModelId !== "auto" &&
      !executableModelIdSet.has(resolvedModelId)
    ) {
      toast.error("当前 Agent 绑定的模型不存在或已停用，请重新编辑 Agent 模型配置");
      return;
    }

    detailGenerationCancelRef.current = false;
    setDetailGenerationRunResults([]);
    setActiveResultModeType("detail_generation");
    setSelectedResultUrl(null);
    const startedAt = new Date().toISOString();
    updateDetailGenerationProgressState({
      status: "running",
      stage: "Agent 正在解析需求并规划详情结构...",
      current: 0,
      total: Math.max(1, detailCount * 2 + 1),
      startedAt,
      finishedAt: null,
    });
    setPendingGeneration({
      chatId,
      modeType: "detail_generation",
      expectedCount: detailCount,
      userTurnCountAtStart: userMessageCount,
      timestamp: Date.now(),
    });

    let completedDetailGenerationCount = 0;

    try {
      const planResponse = await apiFetch("/api/canvas/detail-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: detailPromptWithWorkflow,
          count: detailCount,
          generationMode: "classic",
          referenceImages: detailGenerationSlots
            .filter((_, slotIndex) => detailGenerationVisibleSlotIndexes.includes(slotIndex))
            .map((slot) => slot?.url || "")
            .filter(Boolean)
            .slice(0, 12),
          referenceImageNotes,
          modelImageUrl: modelAttachment?.url || undefined,
          bundleImageUrls: bundleAttachments.map((item) => item.url),
          outputLanguage,
          brief: detailGenerationBrief,
        }),
      });
      const planResult = await planResponse.json().catch(() => ({}));
      if (!planResponse.ok || !planResult?.success) {
        throw new Error(planResult?.error || "详情分镜规划失败");
      }

      const planData = (planResult.data || {}) as {
        summary?: string;
        prompts?: string[];
        globalStyle?: Record<string, any>;
        screens?: Array<Record<string, any>>;
      };
      const prompts = Array.isArray(planData.prompts)
        ? planData.prompts.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      if (prompts.length === 0) {
        throw new Error("未获取到有效分镜提示词");
      }

      setPendingGeneration((current) =>
        current && current.chatId === chatId && current.modeType === "detail_generation"
          ? {
              ...current,
              expectedCount: prompts.length,
            }
          : current
      );
      updateDetailGenerationProgressState({
        status: "running",
        stage: "分镜规划完成，开始逐屏生成...",
        current: 1,
        total: Math.max(1, prompts.length * 2 + 1),
        startedAt,
        finishedAt: null,
      });

      const generatedImages: Array<DirectDetailGenerationImage | null> = Array.from(
        { length: prompts.length },
        () => null
      );
      const publishGeneratedImages = () => {
        const compactImages = compactDirectDetailGenerationImages(generatedImages);
        completedDetailGenerationCount = compactImages.length;
        setDetailGenerationRunResults(compactImages);
      };
      const generateDetailScreen = async (index: number) => {
        if (detailGenerationCancelRef.current) {
          throw new Error("已停止当前 AI详情生成任务");
        }

        const screen = Array.isArray(planData.screens) ? planData.screens[index] || {} : {};
        const useModelForScene = Boolean(screen?.useModel);
        const bundleShowcase = Boolean(screen?.bundleShowcase);
        const bundleReason = String(screen?.bundleReason || "").trim();
        const promptText = String(screen?.visualPrompt || prompts[index] || "").trim();
        const generationStepCurrent = 2 + index * 2;
        const reviewStepCurrent = generationStepCurrent + 1;

        updateDetailGenerationProgressState({
          status: "running",
          stage: `正在生成第 ${index + 1}/${prompts.length} 屏详情图`,
          current: generationStepCurrent,
          total: Math.max(1, prompts.length * 2 + 1),
          startedAt,
          finishedAt: null,
        });

        const globalStyle = planData.globalStyle || {};
        const styleDirective = [
          globalStyle.designLanguage ? `全局风格：${globalStyle.designLanguage}` : "",
          globalStyle.typography?.fontFamily
            ? `字体家族统一：${globalStyle.typography.fontFamily}`
            : "",
          globalStyle.typography?.title ? `标题规范：${globalStyle.typography.title}` : "",
          globalStyle.typography?.subtitle
            ? `副标题规范：${globalStyle.typography.subtitle}`
            : "",
          globalStyle.typography?.body ? `正文规范：${globalStyle.typography.body}` : "",
          globalStyle.layout?.grid ? `布局栅格：${globalStyle.layout.grid}` : "",
          globalStyle.layout?.safeArea ? `安全区：${globalStyle.layout.safeArea}` : "",
          globalStyle.layout?.rhythm ? `留白节奏：${globalStyle.layout.rhythm}` : "",
          globalStyle.palette ? `配色：${globalStyle.palette}` : "",
        ]
          .filter(Boolean)
          .join("；");
        const styleAnchorUrl =
          index > 0 ? generatedImages[0]?.originalUrl || generatedImages[0]?.thumbnailUrl : null;
        const generationReferenceImagesBase = [
          ...productAttachments.map((item) => item.url),
          ...(bundleShowcase ? bundleAttachments.map((item) => item.url) : []),
          ...(useModelForScene && modelAttachment?.url ? [modelAttachment.url] : []),
          ...(styleAnchorUrl ? [styleAnchorUrl] : []),
        ].filter(Boolean);

        const generationPrompt = sanitizeDetailImageModelPrompt(
          [
            promptText,
            styleDirective ? `全局样式约束：${styleDirective}` : "",
            screen?.screenType
              ? `分镜类型：${screen.screenType}（A=技术公信，B=场景共鸣，C=细节佐证）`
              : "",
            index === 0
              ? "首屏封面规则：必须做成海报主视觉，单一主体强焦点，产品主体占画面55%-70%，顶部标题区清晰留白，禁止拼贴式说明图。"
              : "",
            useModelForScene
              ? "人物规则：本屏涉及人物场景，固定使用提供的模特图同一人物（面部、发型、体型、服装风格保持一致）。"
              : "人物规则：本屏不要出现人物或人体部位，只展示产品与场景元素。",
            screen?.modelReason ? `人物融入依据：${screen.modelReason}` : "",
            bundleShowcase
              ? "搭配展示规则：本屏必须同场景展示主产品与搭配产品，主次层级清晰，突出组合购买价值与加购理由。"
              : "",
            bundleReason ? `搭配依据：${bundleReason}` : "",
            screen?.title ? `本屏标题：${screen.title}` : "",
            screen?.subtitle ? `本屏副标题：${screen.subtitle}` : "",
            screen?.copy ? `本屏文案说明：${screen.copy}` : "",
            screen?.layoutNote ? `本屏排版说明：${screen.layoutNote}` : "",
            screen?.fabe?.b ? `B（利益）：${screen.fabe.b}` : "",
            screen?.fabe?.f ? `F（特征）：${screen.fabe.f}` : "",
            screen?.fabe?.a ? `A（优势）：${screen.fabe.a}` : "",
            screen?.fabe?.e ? `E（证据）：${screen.fabe.e}` : "",
            `输出为竖版电商详情图，尺寸固定 ${AGENT_DETAIL_TARGET_WIDTH}x${AGENT_DETAIL_TARGET_HEIGHT} 像素。`,
            "文字安全区硬约束：所有标题、副标题、正文、标签和数字必须完整落在画布内，左右至少保留 8% 内边距，上下至少保留 5% 内边距，不得贴边、出血、半截显示或跑出画面。",
            "单页画布硬约束：只生成一张完整详情页，不允许把两个方案上下拼接，不允许重复同一张场景图，不允许出现明显横向分割线造成上下两段截图感。",
            "要求：整套详情图风格统一，产品外观严格一致，主标题/副标题/正文字体与层级全套一致，商业摄影质感，排版区域清晰。",
          ]
            .filter(Boolean)
            .join("\n\n")
        );

        const firstPass = await requestCanvasImageGeneration({
          prompt: generationPrompt,
          model: resolvedModelId,
          aspectRatio: "9:16",
          imageSize: imageParams.imageSize,
          imageCount: 1,
          negativePrompt: imageParams.negativePrompt,
          referenceImage: productAttachments[0]?.url,
          referenceImages: generationReferenceImagesBase,
        });
        const firstPassImage = firstPass.images[0];
        if (!firstPassImage?.originalUrl && !firstPassImage?.thumbnailUrl) {
          throw new Error(`第 ${index + 1} 屏生成失败`);
        }

        let finalImage = {
          originalUrl: String(
            firstPassImage.originalUrl || firstPassImage.thumbnailUrl || ""
          ).trim(),
          thumbnailUrl: String(
            firstPassImage.thumbnailUrl || firstPassImage.originalUrl || ""
          ).trim(),
        };

        updateDetailGenerationProgressState({
          status: "running",
          stage: `第 ${index + 1}/${prompts.length} 屏首稿完成，正在审稿优化...`,
          current: reviewStepCurrent,
          total: Math.max(1, prompts.length * 2 + 1),
          startedAt,
          finishedAt: null,
        });

        try {
          const reviewResponse = await apiFetch("/api/canvas/detail-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outputLanguage,
              generationMode: "classic",
              imageUrl: finalImage.originalUrl || finalImage.thumbnailUrl,
              referenceImages: generationReferenceImagesBase.slice(0, 6),
              brief: {
                productName: detailGenerationBrief.productName,
                targetAudience: detailGenerationBrief.targetAudience,
                usageScenario: detailGenerationBrief.usageScenario,
                coreNeed: detailGenerationBrief.coreNeed,
                coreSellingPoint: detailGenerationBrief.coreSellingPoint,
              },
              globalStyle: planData.globalStyle,
              screen: {
                index: index + 1,
                title: String(screen?.title || "").trim(),
                subtitle: String(screen?.subtitle || "").trim(),
                copy: String(screen?.copy || "").trim(),
                layoutNote: String(screen?.layoutNote || "").trim(),
                visualPrompt: generationPrompt,
                screenType: String(screen?.screenType || "").trim(),
              },
            }),
          });
          const reviewResult = (await reviewResponse.json().catch(() => ({}))) as {
            success?: boolean;
            data?: DirectDetailReviewResult;
          };

          if (
            reviewResponse.ok &&
            reviewResult?.success &&
            reviewResult.data?.reviewAction === "regenerate_image" &&
            typeof reviewResult.data?.revisedPrompt === "string" &&
            reviewResult.data.revisedPrompt.trim().length > 20
          ) {
            const regenerated = await requestCanvasImageGeneration({
              prompt: sanitizeDetailImageModelPrompt(reviewResult.data.revisedPrompt.trim()),
              model: resolvedModelId,
              aspectRatio: "9:16",
              imageSize: imageParams.imageSize,
              imageCount: 1,
              negativePrompt: imageParams.negativePrompt,
              referenceImage: productAttachments[0]?.url,
              referenceImages: [
                ...generationReferenceImagesBase,
                finalImage.originalUrl || finalImage.thumbnailUrl,
              ].filter(Boolean),
            });
            const regeneratedImage = regenerated.images[0];
            if (regeneratedImage?.originalUrl || regeneratedImage?.thumbnailUrl) {
              finalImage = {
                originalUrl: String(
                  regeneratedImage.originalUrl || regeneratedImage.thumbnailUrl || ""
                ).trim(),
                thumbnailUrl: String(
                  regeneratedImage.thumbnailUrl || regeneratedImage.originalUrl || ""
                ).trim(),
              };
            }
          }
        } catch (reviewError) {
          console.warn("[AgentGenerationWorkspaceDarkV2] AI detail review failed:", reviewError);
        }

        try {
          finalImage = await normalizeAgentDetailGeneratedImage(finalImage);
        } catch (normalizeError) {
          console.warn(
            "[AgentGenerationWorkspaceDarkV2] AI detail image normalize failed:",
            normalizeError
          );
        }

        const nextImage: DirectDetailGenerationImage = {
          originalUrl: finalImage.originalUrl,
          thumbnailUrl: finalImage.thumbnailUrl,
          title: String(screen?.title || "").trim() || `详情图 ${index + 1}`,
          subtitle: String(screen?.subtitle || "").trim(),
          copy: String(screen?.copy || "").trim(),
        };
        generatedImages[index] = nextImage;
        publishGeneratedImages();
      };

      await generateDetailScreen(0);
      const remainingPromptIndexes = prompts.slice(1).map((_, index) => index + 1);
      if (remainingPromptIndexes.length > 0) {
        await runAgentBoundedParallel(
          remainingPromptIndexes,
          AGENT_DETAIL_IMAGE_PARALLEL_WORKER_COUNT,
          async (promptIndex) => {
            await generateDetailScreen(promptIndex);
          }
        );
      }
      const finalGeneratedImages = compactDirectDetailGenerationImages(generatedImages);

      updateDetailGenerationProgressState({
        status: "done",
        stage: `AI详情生成完成，共 ${finalGeneratedImages.length}/${prompts.length} 屏`,
        current: Math.max(1, prompts.length * 2 + 1),
        total: Math.max(1, prompts.length * 2 + 1),
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      toast.success(`AI详情生成完成，已输出 ${finalGeneratedImages.length} 屏详情图`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI详情生成失败";
      updateDetailGenerationProgressState({
        status: /已停止/.test(message) ? "idle" : "error",
        stage: message,
        current: completedDetailGenerationCount,
        total: pendingGeneration?.expectedCount || detailCount,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      toast.error(message);
    } finally {
      setPendingGeneration(null);
    }
  }
  const handleDetailReplacementProductDetailChannelChange = useCallback(
    (channel: AgentWorkflowProductDetailChannel) => {
      updateDetailReplacementState((current) => ({
        ...current,
        productDetailChannel: channel,
      }));
    },
    [updateDetailReplacementState]
  );
  const handleDetailReplacementSearch = useCallback(async (
    queryType: Extract<AgentWorkflowReferenceQueryType, "spu" | "productId">
  ) => {
    const rawPrimarySpu = getCurrentWorkflowPrimarySpu();
    const rawQuery =
      queryType === "productId" ? detailProductIdQueryInput : rawPrimarySpu;
    const normalized =
      queryType === "productId" ? rawQuery.trim() : rawQuery.trim().toUpperCase();
    const currentWorkflowBrandName = getCurrentWorkflowBrandName();
    if (!currentWorkflowBrandName && queryType !== "productId") {
      toast.error("请先在第一步完成品牌选择后再检索可用模版");
      return;
    }
    if (!normalized) {
      toast.error(
        queryType === "productId"
          ? "请输入市场ID或商品ID后再查询详情"
          : "请先在第一步输入主商品SPU后再检索可用模版"
      );
      return;
    }

    setDetailReplacementSearchState({
      isLoading: true,
      lastQuery: normalized,
    });

    try {
      const searchParams = new URLSearchParams({
        keyword: normalized,
        queryType,
        target: detailReferenceTarget,
      });
      if (currentWorkflowBrandName) {
        searchParams.set("brandName", currentWorkflowBrandName);
      }
      if (queryType === "productId") {
        searchParams.set("channel", detailReplacementProductDetailChannel);
      } else {
        searchParams.set("strictQueryType", "true");
      }
      const response = await apiFetch(
        `/api/agent-workflow/reference-search?${searchParams.toString()}`,
        { cache: "no-store" }
      );
      const result = (await response.json().catch(() => ({}))) as AgentModeReferenceSearchResponse;

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error?.message || `${detailReferenceSourceLabel}参考图查询失败`);
      }

      updateDetailReplacementState({
        query: normalized,
        queryType: result.data.queryType || queryType,
        productDetailChannel:
          result.data.channel || detailReplacementProductDetailChannel,
        candidates: result.data.candidates || [],
        selectedCandidateId:
          result.data.selectedCandidateId || result.data.candidates?.[0]?.id || null,
        references: result.data.references || [],
      });
      setDetailReplacementSearchState({
        isLoading: false,
        lastQuery: normalized,
      });
      toast.success(`已载入 ${result.data.references?.length || 0} 张${detailReferenceSourceLabel}参考图`);
    } catch (error) {
      setDetailReplacementSearchState({
        isLoading: false,
        lastQuery: normalized,
      });
      toast.error(error instanceof Error ? error.message : `${detailReferenceSourceLabel}参考图查询失败`);
    }
  }, [
    detailReferenceSourceLabel,
    detailReferenceTarget,
    detailProductIdQueryInput,
    detailReplacementProductDetailChannel,
    getCurrentWorkflowPrimarySpu,
    getCurrentWorkflowBrandName,
    updateDetailReplacementState,
  ]);
  const handleSelectDetailReplacementCandidate = useCallback((candidateId: string) => {
      updateDetailReplacementState((current) => {
      const nextCandidate =
        current.candidates.find((candidate) => candidate.id === candidateId) || null;
      return {
        ...current,
        selectedCandidateId: candidateId,
        references: buildReferenceCardsFromCandidate({
          candidate: nextCandidate,
          target: detailReferenceTarget,
          productCount: selectedProductAttachments.length,
        }),
      };
    });
  }, [detailReferenceTarget, selectedProductAttachments.length, updateDetailReplacementState]);
  const handleRemoveDetailReferenceCard = useCallback((cardId: string) => {
    updateDetailReplacementState((current) => ({
      ...current,
      references: current.references.filter((card) => card.id !== cardId),
    }));
  }, [updateDetailReplacementState]);
  const handleToggleDetailReferenceCardPassthrough = useCallback((cardId: string) => {
    updateDetailReplacementState((current) => ({
      ...current,
      references: current.references.map((card) =>
        card.id === cardId
          ? {
              ...card,
              passthrough: card.passthrough ? false : true,
            }
          : card
      ),
    }));
  }, [updateDetailReplacementState]);
  const handleClearDetailReferenceCards = useCallback(() => {
    updateDetailReplacementState((current) => ({
      ...current,
      candidates: [],
      selectedCandidateId: null,
      references: [],
    }));
  }, [updateDetailReplacementState]);
  const clearDetailReplacementResultRecords = useCallback((cardIds: string[]) => {
    const idSet = new Set(cardIds.map((item) => String(item || "").trim()).filter(Boolean));
    if (idSet.size === 0) return;

    setReplacementResultState((current) => {
      const nextDetail = { ...current.detail_replacement };
      let changed = false;
      idSet.forEach((cardId) => {
        if (cardId in nextDetail) {
          delete nextDetail[cardId];
          changed = true;
        }
      });
      return changed
        ? {
            ...current,
            detail_replacement: nextDetail,
          }
        : current;
    });
  }, []);
  const handleAppendDetailReferenceFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      setDetailReferenceUploadTarget({ type: "append" });
      try {
        const uploads: UploadedDetailReferenceImage[] = [];
        for (const file of files) {
          uploads.push(await uploadDetailReferenceImageFile(file));
        }

        updateDetailReplacementState((current) => {
          const startIndex = current.references.length;
          const uploadedCards = uploads.map((upload, uploadIndex) =>
            createUploadedDetailReferenceCard({
              upload,
              index: startIndex + uploadIndex,
              labelPrefix: "上传目标详情",
            })
          );
          return {
            ...current,
            references: [...current.references, ...uploadedCards].map((card, index) => ({
              ...card,
              sortOrder: index,
            })),
          };
        });
        toast.success(`已上传 ${uploads.length} 张目标详情`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "目标详情上传失败");
      } finally {
        setDetailReferenceUploadTarget(null);
        input.value = "";
      }
    },
    [updateDetailReplacementState]
  );
  const handleReplaceDetailReferenceCardFile = useCallback(
    async (cardId: string, event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;

      setDetailReferenceUploadTarget({ type: "replace", cardId });
      try {
        const upload = await uploadDetailReferenceImageFile(file);
        let didReplace = false;
        updateDetailReplacementState((current) => ({
          ...current,
          references: current.references.map((card, index) => {
            if (card.id !== cardId) return card;
            didReplace = true;
            return {
              ...applyUploadedDetailReferenceToCard(card, upload),
              sortOrder: card.sortOrder ?? index,
            };
          }),
        }));
        if (didReplace) {
          clearDetailReplacementResultRecords([cardId]);
          toast.success("已更换当前目标详情图");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "目标详情更换失败");
      } finally {
        setDetailReferenceUploadTarget(null);
        input.value = "";
      }
    },
    [clearDetailReplacementResultRecords, updateDetailReplacementState]
  );
  const handlePreparedDetailReferenceCards = useCallback(
    (preparedCards: AgentModeWorkspaceState["detailReplacement"]["references"]) => {
      const preparedById = new Map(preparedCards.map((card) => [card.id, card]));
      updateDetailReplacementState((current) => ({
        ...current,
        references: current.references.map((card) => {
          const prepared = preparedById.get(card.id);
          if (!prepared) return card;
          return {
            ...card,
            previewUrl: prepared.previewUrl || card.previewUrl || card.imageUrl || null,
            width: prepared.width || card.width || null,
            height: prepared.height || card.height || null,
          };
        }),
      }));
    },
    [updateDetailReplacementState]
  );
  const handleApplyStitchedDetailReferenceCards = useCallback(
    (nextCards: AgentModeWorkspaceState["detailReplacement"]["references"]) => {
      updateDetailReplacementState((current) => ({
        ...current,
        references: nextCards,
      }));
    },
    [updateDetailReplacementState]
  );
  const handleSkuReplacementSearch = useCallback(async () => {
    const normalized = skuReplacementQueryInput.trim().toUpperCase();
    const currentWorkflowBrandName = getCurrentWorkflowBrandName();
    if (!currentWorkflowBrandName) {
      toast.error("请先在第一步完成品牌选择后再查询参考图");
      return;
    }
    if (!normalized) {
      toast.error(`请输入${skuReplacementQueryType === "spu" ? "SPU" : "SKU"}后再查询${skuReferenceSourceLabel}参考图`);
      return;
    }

    setSkuReplacementSearchState({
      isLoading: true,
      lastQuery: normalized,
    });

    try {
      const searchParams = new URLSearchParams({
        keyword: normalized,
        queryType: skuReplacementQueryType,
        target: skuReferenceTarget,
      });
      searchParams.set("brandName", currentWorkflowBrandName);
      const response = await apiFetch(
        `/api/agent-workflow/reference-search?${searchParams.toString()}`,
        { cache: "no-store" }
      );
      const result = (await response.json().catch(() => ({}))) as AgentModeReferenceSearchResponse;

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error?.message || `${skuReferenceSourceLabel}参考图查询失败`);
      }

      updateSkuReplacementState({
        query: normalized,
        queryType:
          result.data.queryType === "spu" || result.data.queryType === "sku"
            ? result.data.queryType
            : skuReplacementQueryType,
        candidates: result.data.candidates || [],
        selectedCandidateId:
          result.data.selectedCandidateId || result.data.candidates?.[0]?.id || null,
        references:
          (result.data.references || []).map((item, index) => ({
            ...item,
            assignedProductIndex:
              selectedProductAttachments.length > 0
                ? Math.min(index, Math.max(selectedProductAttachments.length - 1, 0))
                : null,
          })) || [],
      });
      setSkuReplacementSearchState({
        isLoading: false,
        lastQuery: normalized,
      });
      toast.success(`已载入 ${result.data.references?.length || 0} 张${skuReferenceSourceLabel}参考图`);
    } catch (error) {
      setSkuReplacementSearchState({
        isLoading: false,
        lastQuery: normalized,
      });
      toast.error(error instanceof Error ? error.message : `${skuReferenceSourceLabel}参考图查询失败`);
    }
  }, [
    selectedProductAttachments.length,
    skuReferenceSourceLabel,
    skuReferenceTarget,
    skuReplacementQueryInput,
    skuReplacementQueryType,
    getCurrentWorkflowBrandName,
    updateSkuReplacementState,
  ]);
  const handleSelectSkuReplacementCandidate = useCallback((candidateId: string) => {
    updateSkuReplacementState((current) => {
      const nextCandidate =
        current.candidates.find((candidate) => candidate.id === candidateId) || null;
      return {
        ...current,
        selectedCandidateId: candidateId,
        references: buildReferenceCardsFromCandidate({
          candidate: nextCandidate,
          target: skuReferenceTarget,
          productCount: selectedProductAttachments.length,
          assignProductIndex: true,
        }),
      };
    });
  }, [selectedProductAttachments.length, skuReferenceTarget, updateSkuReplacementState]);
  const handleAssignSkuReferenceProduct = useCallback((cardId: string, productIndex: number) => {
    updateSkuReplacementState((current) => ({
      ...current,
      references: current.references.map((card) =>
        card.id === cardId
          ? {
              ...card,
              assignedProductIndex: productIndex,
            }
          : card
      ),
    }));
  }, [updateSkuReplacementState]);
  const handleRemoveSkuReferenceCard = useCallback((cardId: string) => {
    updateSkuReplacementState((current) => ({
      ...current,
      references: current.references.filter((card) => card.id !== cardId),
    }));
  }, [updateSkuReplacementState]);
  const handleClearSkuReferenceCards = useCallback(() => {
    updateSkuReplacementState((current) => ({
      ...current,
      candidates: [],
      selectedCandidateId: null,
      references: [],
    }));
  }, [updateSkuReplacementState]);

  const aiDetailWorkbenchPanel = isDetailAiGenerationMethod ? (
    <div className="rounded-[28px] border border-white/12 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Wand2 className="h-4 w-4 text-emerald-300" />
            AI详情工作台
          </h3>
          <p className="mt-1 text-xs text-white/45">
            复用无限画布中的 AI详情生成链路，直接完成分镜规划和逐屏详情生图。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              detailGenerationProgress.status === "running"
                ? "border-sky-400/25 bg-sky-500/[0.10] text-sky-100"
                : detailGenerationProgress.status === "done"
                  ? "border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100"
                  : detailGenerationProgress.status === "error"
                    ? "border-rose-400/25 bg-rose-500/[0.10] text-rose-100"
                    : "border-white/10 bg-white/[0.03] text-white/55"
            )}
          >
            {detailGenerationProgress.status === "running"
              ? "生成中"
              : detailGenerationProgress.status === "done"
                ? "已完成"
                : detailGenerationProgress.status === "error"
                  ? "异常"
                  : "待启动"}
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60">
            经典详情
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-white/82">生成进度</div>
          <div className="text-[11px] text-white/45">
            {detailGenerationProgress.current}/{detailGenerationProgress.total || 0}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
            style={{
              width: `${
                detailGenerationProgress.total > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (detailGenerationProgress.current / detailGenerationProgress.total) * 100
                      )
                    )
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="mt-2 text-[11px] text-white/48">
          {detailGenerationProgress.stage || "请先补齐核心参数和素材后开始生成"}
        </div>
        {detailGenerationValidationIssues.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {detailGenerationValidationIssues.map((issue) => (
              <span
                key={issue}
                className="rounded-full border border-amber-400/20 bg-amber-500/[0.10] px-2.5 py-1 text-[11px] text-amber-100"
              >
                {issue}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 text-xs font-medium text-white/82">核心参数</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["productSpu", "商品SPU"],
              ["productName", "产品名称"],
              ["targetAudience", "主购买人群 *"],
              ["usageScenario", "需求场景 *"],
              ["coreNeed", "核心需求 *"],
              ["priceBand", "价格带"],
              ["demandType", "需求类型"],
              ["brandTone", "品牌语气"],
            ] as Array<[keyof AgentDetailBriefForm, string]>).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-[11px] text-white/58">{label}</label>
                <Input
                  value={detailGenerationBrief[key]}
                  onChange={(event) =>
                    updateDetailGenerationBriefField(key, event.target.value)
                  }
                  placeholder={AGENT_DETAIL_FIELD_EXAMPLES[key]}
                  className="h-10 rounded-[18px] border-white/10 bg-black text-sm text-white placeholder:text-white/22 focus:border-emerald-400/30"
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] text-white/58">核心卖点关键词</label>
              <Input
                value={detailGenerationBrief.coreSellingPoint}
                onChange={(event) =>
                  updateDetailGenerationBriefField("coreSellingPoint", event.target.value)
                }
                placeholder={AGENT_DETAIL_FIELD_EXAMPLES.coreSellingPoint}
                className="h-10 rounded-[18px] border-white/10 bg-black text-sm text-white placeholder:text-white/22 focus:border-emerald-400/30"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] text-white/58">竞品对标</label>
              <Input
                value={detailGenerationBrief.competitorReference}
                onChange={(event) =>
                  updateDetailGenerationBriefField("competitorReference", event.target.value)
                }
                placeholder={AGENT_DETAIL_FIELD_EXAMPLES.competitorReference}
                className="h-10 rounded-[18px] border-white/10 bg-black text-sm text-white placeholder:text-white/22 focus:border-emerald-400/30"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] text-white/58">用户原话样本</label>
              <Textarea
                value={detailGenerationBrief.userVoice}
                onChange={(event) =>
                  updateDetailGenerationBriefField("userVoice", event.target.value)
                }
                placeholder={AGENT_DETAIL_FIELD_EXAMPLES.userVoice}
                className="min-h-[88px] rounded-[18px] border-white/10 bg-black text-sm text-white placeholder:text-white/22 focus:border-emerald-400/30"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-medium text-white/82">素材中心</div>
            <div className="text-[11px] text-white/45">
              产品图 {detailGenerationProductCount}/{detailGenerationRequiredProductCount}
              {modelSlotEnabled
                ? ` · 模特图 ${detailGenerationModelReady ? "已带入" : "可不选"}`
                : ""}
              {` · 搭配图 ${detailGenerationBundleCount}/3`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {detailGenerationVisibleSlotIndexes.map((index) => {
              const slot = AGENT_DETAIL_SLOT_CONFIGS[index];
              const attachment = detailGenerationSlots[index];
              return (
                <div
                  key={slot.key}
                  className="group relative aspect-square overflow-hidden rounded-[18px] border border-white/10 bg-black/30"
                >
                  <input
                    ref={(element) => {
                      detailSlotInputRefs.current[index] = element;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleDetailGenerationSlotFileChange(index, event);
                    }}
                  />
                  {attachment ? (
                    <>
                      <AgentPreviewImage
                        src={attachment.url}
                        alt={attachment.name || slot.label}
                        className="h-full w-full object-cover"
                        previewWidth={360}
                        previewQuality={76}
                        onError={(event) => handlePreviewImageLoadError(event, attachment.url)}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-[11px] text-white">
                        {slot.label}
                      </div>
                      <div className="absolute left-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => detailSlotInputRefs.current[index]?.click()}
                          className="rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-white"
                        >
                          更换
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDetailGenerationSlot(index, null)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white transition-colors hover:border-white/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => detailSlotInputRefs.current[index]?.click()}
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/55 transition-colors hover:text-white/78"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-[11px]">{slot.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const attachmentSlotPanel = (
    <Collapsible
      open={isAttachmentSlotExpanded}
      onOpenChange={setIsAttachmentSlotExpanded}
    >
      <div className="rounded-[28px] border border-white/12 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ImagePlus className="h-4 w-4 text-emerald-300" />
              输入图槽位
            </div>

            {hasVisibleAttachmentUploadSlots ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      attachmentSummaryReady
                        ? "border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100"
                        : "border-amber-400/25 bg-amber-500/[0.10] text-amber-100"
                    )}
                  >
                    {productAttachmentSummary}
                  </span>
                  {modelAttachmentSummary ? (
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        selectedModelAttachment
                          ? "border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100"
                          : "border-white/10 bg-black/20 text-white/60"
                      )}
                    >
                      {modelAttachmentSummary}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
                    共 {agentUploadSlots.length} 个输入槽位
                  </span>
                </div>

                <p className="text-xs leading-6 text-white/55">
                  {missingAttachmentCount > 0
                    ? `当前还需补充 ${missingAttachmentCount} 张产品图，展开后可继续检查或替换。`
                    : "产品图已自动带入并准备完成；模特图槽位可按需补充，不选也可以继续生成。"}
                </p>
              </>
            ) : (
              <p className="text-xs leading-6 text-white/45">
                当前生图模式会直接使用上方已选素材；如需补充图片，可在素材选择或生成参数里上传。
              </p>
            )}
          </div>

          {hasVisibleAttachmentUploadSlots ? (
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="border-white/12 bg-black/25 text-white/82 hover:border-white/22 hover:bg-white/[0.06] hover:text-white"
              >
                {isAttachmentSlotExpanded ? "收起素材槽位" : "检查/替换素材"}
                {isAttachmentSlotExpanded ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : null}
        </div>

        {hasVisibleAttachmentUploadSlots ? (
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3 text-xs leading-6 text-emerald-100/80">
              上一步已选的白底图和品牌模特图会自动带入对应槽位，这里只保留最终检查与单张上传替换，不再重复展示已选素材列表。
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {visibleAttachmentUploadSlots.map((slot, index) => {
                return (
                  <div
                    key={slot.label}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-[24px] transition-all",
                      attachments[index]
                        ? "ring-2 ring-emerald-400/45"
                        : "border-2 border-dashed border-white/15 bg-black/25 hover:border-emerald-400/35"
                    )}
                  >
                    <input
                      ref={(el) => {
                        fileInputRefs.current[index] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSlotFileChange(index, e)}
                    />
                    {attachments[index] ? (
                      <>
                        <AgentPreviewImage
                          src={attachments[index]!.url}
                          alt={attachments[index]!.name || slot.label}
                          className="h-full w-full object-cover"
                          previewWidth={320}
                          previewQuality={74}
                          onError={(event) =>
                            handlePreviewImageLoadError(event, attachments[index]!.url)
                          }
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs font-medium text-white">
                          {slot.label}
                        </div>
                        <button
                          type="button"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white transition-opacity hover:bg-white/30"
                          onClick={() => updateAttachmentAtSlot(index, null)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-white/55">
                        {slotUploading === index ? (
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6" />
                            <span className="text-sm font-medium text-white/72">{slot.label}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] text-white/80 transition-colors hover:border-white/20 hover:text-white"
                      >
                        {attachments[index] ? "更换" : "上传"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        ) : (
          <div className="mt-4 flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-black/20 px-4 text-center text-sm text-white/45">
            <ImagePlus className="mb-2 h-5 w-5 opacity-60" />
            当前生图模式暂无需要手动补充的输入槽位，请在上方选择素材或直接生成。
          </div>
        )}
      </div>
    </Collapsible>
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlBackgroundColor = html.style.backgroundColor;
    const previousBodyBackgroundColor = body.style.backgroundColor;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    html.style.backgroundColor = "#050607";
    body.style.backgroundColor = "#050607";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      html.style.backgroundColor = previousHtmlBackgroundColor;
      body.style.backgroundColor = previousBodyBackgroundColor;
    };
  }, []);

  const batchDownloadProgress = Math.round(
    Math.max(0, Math.min(100, batchDownloadDialog?.progress || 0))
  );
  const isBatchDownloadRunning =
    batchDownloadDialog?.status === "starting" ||
    batchDownloadDialog?.status === "pending" ||
    batchDownloadDialog?.status === "running";
  const isBatchDownloadCompleted =
    batchDownloadDialog?.status === "completed";
  const isBatchDownloadFailed = batchDownloadDialog?.status === "failed";
  const batchDownloadScopeLabel =
    batchDownloadDialog?.scope === "sku"
      ? "SKU 替换结果"
      : batchDownloadDialog?.scope === "scene"
        ? "场景生图结果"
        : "详情替换结果";

  return (
    <div
      ref={workspaceRootRef}
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-black"
      data-image-delivery-scope="manual"
    >
      <AgentCanvasTopNavDark
        siteName={siteName}
        siteLogo={siteLogo}
        siteLogoDark={siteLogoDark}
        onBack={onBack}
        activeKey="agent"
        rightSlot={topNavRightSlot || <div className="w-10" />}
      />

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-none bg-black pt-16">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-6 py-6 pb-24 lg:px-8 xl:px-10">
          {showcaseConfig ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
            >
              <AgentWorkflowShowcaseBanner
                config={showcaseConfig}
                actionLabel="开始配置"
                secondaryActionLabel={allGeneratedImages.length > 0 ? "查看结果预览" : undefined}
                onActionClick={() => scrollToSection(firstWorkflowSectionAnchor)}
                onSecondaryActionClick={() => scrollToSection("agent-anchor-results")}
              />
            </motion.section>
          ) : null}

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="rounded-[28px] border border-white/12 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              style={AGENT_DEFERRED_SECTION_STYLE}
              data-agent-workflow-section="brand"
            >
            <div className="space-y-6">
              {hasBrandStoreStep ? (
                <section
                  id="agent-anchor-brand"
                  className="scroll-mt-24 rounded-[24px] border border-white/10 bg-black/20 p-4"
                  style={AGENT_DEFERRED_SECTION_STYLE}
                  data-agent-workflow-section="brand"
                >
                  <div className="mb-4 flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                          {brandStepBadge}
                        </span>
                        <span className="text-sm font-semibold text-white">选择品牌上下文</span>
                      </div>
                      <p className="text-sm text-white/45">
                        先确定品牌、店铺和类目，让后续 Agent 提示词与素材搜索拿到同一套业务上下文。
                      </p>
                    </div>
                  </div>
                  {brandStorePanel}
                </section>
              ) : null}

              {hasWorkflowStyleStep ? (
                <section
                  id="agent-anchor-style"
                  className="scroll-mt-24 rounded-[24px] border border-white/10 bg-black/20 p-5 md:p-6"
                  style={AGENT_DEFERRED_SECTION_STYLE}
                  data-agent-workflow-section="style"
                >
                  <div className="mb-5 space-y-1 border-b border-white/10 pb-5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        {styleStepBadge}
                      </span>
                      <span className="text-sm font-semibold text-white">Agent 提示词配置</span>
                    </div>
                    <p className="text-sm text-white/45">
                      先完成风格、空间、光线、机位、人群等通用提示词配置；这些配置会被后面的不同生图模式共用。
                    </p>
                  </div>

                  <div className="space-y-7">
                    {workflowStylePanel}
                    {hasBrandModelStep ? brandModelPanel : null}
                  </div>
                </section>
              ) : null}

              {isBusinessModeStepEnabled ? (
                <section
                  id="agent-anchor-mode"
                  className="scroll-mt-24 rounded-[24px] border border-white/10 bg-black/20 p-4"
                  style={AGENT_DEFERRED_SECTION_STYLE}
                  data-agent-workflow-section="mode"
                >
                  <div className="mb-4 space-y-1 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        {modeStepBadge}
                      </span>
                      <span className="text-sm font-semibold text-white">选择生图模式</span>
                    </div>
                    <p className="text-sm text-white/45">
                      生图模式只决定输出链路和素材规则，前面配置好的 Agent 提示词会在不同模式中共用。
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {businessModeCards.map((mode) => {
                      const isActive = activeBusinessModeKey === mode.key;
                      const Icon =
                        mode.key === "detail"
                          ? Settings2
                          : mode.key === "buyer_show"
                            ? UserRound
                            : ImagePlus;
                      const modeStatusText =
                        mode.key === "buyer_show" && mode.enabled === false
                          ? "预留中"
                          : mode.enabled === false
                            ? "已关闭"
                            : isActive
                              ? "当前模式"
                              : "可选择";

                      return (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={() => {
                            setActiveBusinessModeKey(mode.key);
                            if (mode.enabled === false || mode.key === "buyer_show") {
                              toast.info("当前生图模式已预留，暂未开放生成");
                            }
                          }}
                          className={cn(
                            "group min-h-[148px] rounded-[22px] border p-4 text-left transition-all",
                            isActive
                              ? "border-emerald-300/55 bg-emerald-500/[0.12] shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
                            mode.enabled === false ? "opacity-70" : ""
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                              {mode.customSvgUrl ? (
                                <img
                                  src={mode.customSvgUrl}
                                  alt={mode.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-7 w-7 object-contain"
                                />
                              ) : (
                                <Icon className="h-6 w-6 text-emerald-200/80" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-1 text-[11px]",
                                isActive
                                  ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                                  : "border-white/10 bg-black/20 text-white/45"
                              )}
                            >
                              {modeStatusText}
                            </span>
                          </div>
                          <div className="mt-4 text-sm font-semibold text-white">{mode.title}</div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/46">
                            {mode.description || "当前模式暂无说明。"}
                          </p>
                          {mode.key === "detail" ? (
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                              {mode.referenceReplaceEnabled !== false ? (
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-white/55">
                                  详情图替换
                                </span>
                              ) : null}
                              {mode.aiDetailGenerateEnabled !== false ? (
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-white/55">
                                  详情图生成
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {hasMaterialStep ? (
                <section
                  id="agent-anchor-materials"
                  className="scroll-mt-24 rounded-[24px] border border-white/10 bg-black/20 p-4"
                  style={AGENT_DEFERRED_SECTION_STYLE}
                  data-agent-workflow-section="materials"
                >
                  <div className="mb-4 space-y-1 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        {materialStepBadge}
                      </span>
                      <span className="text-sm font-semibold text-white">选择 SPU / SKU</span>
                    </div>
                    <p className="text-sm text-white/45">
                      根据当前生图模式选择商品白底图、SKU 图、详情参考图或手动上传素材，素材确认后再进入结果生成。
                    </p>
                  </div>
                  {materialSelectionPanel}
                </section>
              ) : null}

              <section
                id="agent-anchor-generate"
                className="scroll-mt-24 rounded-[24px] border border-white/10 bg-black/20 p-4"
                style={AGENT_DEFERRED_SECTION_STYLE}
                data-agent-workflow-section="generate"
              >
                <div className="mb-4 space-y-1 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                      {generateStepBadge}
                    </span>
                    <span className="text-sm font-semibold text-white">生图与结果预览</span>
                  </div>
                  <p className="text-sm text-white/45">
                    确认补充要求、输入图槽位和生成参数后直接开始生成，结果会显示在当前页底部预览区。
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/12 bg-white/[0.02] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                      {isDetailAiGenerationMethod ? "详情需求补充" : "补充要求"}
                    </h3>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isProductOnlyDetailReplacementMode}
                      placeholder={
                        isDetailAiGenerationMethod
                          ? "补充详情页想强调的卖点、视觉氛围、风格要求或屏数，例如：生成12屏现代极简风详情页..."
                          : isProductOnlyDetailReplacementMode
                            ? "仅替换产品模式会忽略提示词，直接把输入产品替换到参考详情图的产品区域。"
                          : "描述你想要的风格、氛围、构图..."
                      }
                      className={cn(
                        "min-h-[160px] resize-none rounded-[24px] border-white/12 bg-black text-sm text-white placeholder:text-white/20 focus:border-emerald-400/30",
                        isProductOnlyDetailReplacementMode
                          ? "cursor-not-allowed opacity-70"
                          : ""
                      )}
                    />
                  </div>

                  {hasAgentUploadSlots && hasMaterialStep && hasSatisfiedSlotRequirement ? (
                    <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-white">输入图已在上一步确认</div>
                        <div className="text-xs text-white/45">
                          {productAttachmentSummary}
                          {modelAttachmentSummary ? `，${modelAttachmentSummary}` : ""}
                          。如需微调，再手动展开编辑即可。
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAttachmentSlotExpanded(true)}
                        className="border-white/12 bg-black/25 text-white/82 hover:border-white/22 hover:bg-white/[0.06] hover:text-white"
                      >
                        手动调整输入图
                      </Button>
                    </div>
                  ) : null}

                  {hasAgentUploadSlots && isAttachmentSlotExpanded ? attachmentSlotPanel : null}

                  <div className="rounded-[28px] border border-white/12 bg-white/[0.02] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <Settings2 className="h-4 w-4 text-emerald-300" />
                      生成参数
                    </h3>
                    <div className="space-y-3">
                      {isDetailReplacementPreset ? (
                        <div className="rounded-[24px] border border-emerald-400/22 bg-emerald-500/[0.08] p-3 shadow-[0_0_0_1px_rgba(52,211,153,0.08),0_12px_36px_rgba(16,185,129,0.08)]">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-white">详情模式</div>
                              <div className="text-xs text-emerald-100/72">
                                当前可使用“参考图替换”，“AI详情生成”暂为开发中，后续开放后会自动归档到对应分类。
                              </div>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[360px]">
                              <button
                                type="button"
                                onClick={() => updateDetailGenerationMethod("reference_replace")}
                                className={cn(
                                  "flex h-11 items-center justify-center rounded-[18px] border text-sm font-medium transition-all",
                                  !isDetailAiGenerationMethod
                                    ? "border-emerald-300/45 bg-emerald-400/18 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.2),0_10px_28px_rgba(16,185,129,0.16)]"
                                    : "border-white/12 bg-black/25 text-white/68 hover:border-white/22 hover:text-white"
                                )}
                              >
                                参考图替换
                              </button>
                              <button
                                type="button"
                                onClick={handleAiDetailGenerationUnavailableClick}
                                aria-disabled="true"
                                className={cn(
                                  "flex h-11 items-center justify-center rounded-[18px] border text-sm font-medium transition-all",
                                  "cursor-not-allowed border-white/10 bg-white/5 text-white/38 hover:border-white/10 hover:bg-white/5 hover:text-white/38"
                                )}
                              >
                                AI详情生成
                              </button>
                            </div>
                          </div>
                          {!isDetailAiGenerationMethod ? (
                            <div className="mt-3 rounded-[20px] border border-white/10 bg-black/20 p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="text-sm font-medium text-white">替换策略</div>
                                <div className="text-[11px] text-white/45">
                                  {isProductOnlyDetailReplacementMode
                                    ? "忽略提示词，只替换产品"
                                    : "结合提示词重建场景"}
                                </div>
                              </div>
                              <div className="grid gap-2 lg:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDetailReplacementStrategy("scene_replace")
                                  }
                                  className={cn(
                                    "rounded-[18px] border px-4 py-3 text-left transition-all",
                                    detailReplacementStrategy === "scene_replace"
                                      ? "border-emerald-300/45 bg-emerald-400/18 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.16),0_10px_28px_rgba(16,185,129,0.14)]"
                                      : "border-white/12 bg-black/25 text-white/70 hover:border-white/22 hover:text-white"
                                  )}
                                >
                                  <div className="text-sm font-medium">场景整体替换</div>
                                  <div className="mt-1 text-xs leading-5 text-inherit/80">
                                    使用提示词和工作流风格，重建参考图里的产品/背景场景区域。
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDetailReplacementStrategy("product_only")
                                  }
                                  className={cn(
                                    "rounded-[18px] border px-4 py-3 text-left transition-all",
                                    detailReplacementStrategy === "product_only"
                                      ? "border-emerald-300/45 bg-emerald-400/18 text-white shadow-[0_0_0_1px_rgba(110,231,183,0.16),0_10px_28px_rgba(16,185,129,0.14)]"
                                      : "border-white/12 bg-black/25 text-white/70 hover:border-white/22 hover:text-white"
                                  )}
                                >
                                  <div className="text-sm font-medium">仅替换产品</div>
                                  <div className="mt-1 text-xs leading-5 text-inherit/80">
                                    不使用提示词，只把输入产品替换进参考详情图的产品区域，其余文案、排版和场景保持不变。
                                  </div>
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {aiDetailWorkbenchPanel}

                      {isReplacementPreset || isDetailAiGenerationMethod ? (
                        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100/90">
                          {isDetailAiGenerationMethod
                            ? "AI详情生成会先自动规划整套详情分镜，再按顺序逐屏生成，结果会保留在“AI详情”分类中。"
                            : isDetailReplacementPreset
                            ? isProductOnlyDetailReplacementMode
                              ? "仅替换产品会逐张锁定参考图版式和文案，只替换其中的产品主体，结果将在下方结果区一一回显。"
                              : "参考图替换会按当前参考图顺序逐张执行，结果将在下方结果区一一回显。"
                            : "SKU替换会按当前参考图顺序执行一对一替换，结果将在下方结果区一一回显。"}
                        </div>
                      ) : null}

                      {shouldAllowModelOverride ? (
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                          <SelectTrigger className="h-10 rounded-[24px] border-white/12 bg-black text-white">
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                          <SelectContent className={darkSelectContentClass}>
                            {selectableModels.map((model) => (
                              <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-white focus:bg-white/10 focus:text-white"
                              >
                                {model.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-[24px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
                          {isWorkflowModelLocked ? "后台已锁定生图模型：" : "当前生图模式使用默认模型："}
                          <span className="ml-2 font-medium text-white">
                            {isWorkflowModelLocked
                              ? lockedWorkflowModelLabel
                              : currentModel?.displayName || "自动选择"}
                          </span>
                        </div>
                      )}

                      <ImageParamsBar
                        modelName={currentModel?.displayName}
                        initialParams={imageParams}
                        onParamsChange={setImageParams}
                        inline
                        inlineTheme="dark"
                        showInlineDivider={false}
                        providerType={currentModel?.providerType}
                        imageGenConfig={currentModel?.imageGenConfig || undefined}
                      />
                      {isDetailAiGenerationMethod ? (
                        <div className="rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-xs leading-6 text-white/52">
                          AI详情模式下，详情屏数会优先按你在需求里写的“X屏 / X张 / X页”来规划；这里的数量参数不会直接决定最终屏数。
                        </div>
                      ) : null}

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleSend()}
                          disabled={
                            isAnyGenerationRunning ||
                            (requiresPresetSelection && !selectedAgentPresetId) ||
                            (isDetailAiGenerationMethod
                              ? detailGenerationValidationIssues.length > 0
                              : hasAgentUploadSlots && !hasSatisfiedSlotRequirement)
                          }
                          className={cn(
                            "h-11 flex-1 gap-2 rounded-[24px]",
                            "bg-gradient-to-r from-emerald-500 to-teal-500",
                            "text-white font-medium",
                            "hover:from-emerald-400 hover:to-teal-400",
                            "shadow-[0_0_24px_rgba(16,185,129,0.24)]",
                            "disabled:opacity-30"
                          )}
                        >
                          {isAnyGenerationRunning ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {pendingGeneration?.modeType === currentResultModeType
                                ? `${isDetailAiGenerationMethod ? "详情生成中" : isReplacementPreset ? "替换处理中" : "生成中"} ${Math.min(
                                    pendingGenerationProgressCount,
                                    pendingGeneration.expectedCount
                                  )}/${pendingGeneration.expectedCount}`
                                : "任务处理中..."}
                            </>
                          ) : (
                            <>
                              <ArrowUp className="h-4 w-4" />
                              {isDetailAiGenerationMethod
                                ? "开始AI详情生成"
                                : isReplacementPreset
                                  ? ((currentResultModeType === "detail_replacement"
                                      ? detailProcessedCount > 0 && detailRemainingCount > 0
                                      : skuProcessedCount > 0 && skuRemainingCount > 0)
                                      ? "继续批量替换"
                                      : "开始批量替换")
                                  : "开始生成"}
                            </>
                          )}
                        </Button>
                        {isAnyGenerationRunning ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleStopGeneration}
                            className="h-11 shrink-0 rounded-[24px] border-white/12 bg-black/30 px-4 text-white hover:bg-white/[0.08]"
                          >
                            <X className="mr-2 h-4 w-4" />
                            停止生成
                          </Button>
                        ) : null}
                      </div>
                      {slotRequirementMessage ? (
                        <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-xs leading-6 text-amber-100/90">
                          {slotRequirementMessage}
                        </div>
                      ) : null}
                      {sceneImageRolePromptPreview ? (
                        <Collapsible
                          open={isScenePromptExpanded}
                          onOpenChange={setIsScenePromptExpanded}
                          className="rounded-[22px] border border-white/10 bg-black/25"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-white">系统预设约束</div>
                              <div className="mt-1 text-xs leading-6 text-white/55">
                                最终发送给模型时，会自动追加产品锁定约束
                                {modelSlotEnabled ? "和模特锁定约束" : ""}。
                              </div>
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-[18px] border-white/12 bg-black/20 px-3 text-white/80 hover:border-white/22 hover:bg-white/[0.06] hover:text-white"
                              >
                                {isScenePromptExpanded ? "收起约束" : "查看约束"}
                                {isScenePromptExpanded ? (
                                  <ChevronUp className="ml-2 h-4 w-4" />
                                ) : (
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <div className="border-t border-white/8 px-4 py-4">
                              <pre className="whitespace-pre-wrap text-xs leading-6 text-white/78">
                                {sceneImageRolePromptPreview}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.section>

          {isDetailReplacementPreset && !isDetailAiGenerationMethod ? (
            <motion.section
              className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            style={AGENT_DEFERRED_SECTION_STYLE}
            data-agent-workflow-section="references"
          >
              <div className="border-b border-white/12 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">参考详情搜索</div>
                    <div className="text-xs text-white/40">
                      支持自动复用主 SPU 检索素材库模版，也可以输入市场ID按渠道拉取详情图。
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                    当前已选 {detailReplacementReferenceCards.length} 张
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs text-white/42">
                        自动复用第一步主商品信息检索参考详情；市场ID查询需要单独输入商品ID。
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-100">
                          主 SPU / {normalizedWorkflowPrimarySpu || "未填写"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                          品牌 / {workflowBrandName || "未选择"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                          目标 / {detailReferenceSourceLabel}
                        </span>
                      </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <label
                          className={cn(
                            "inline-flex h-12 cursor-pointer items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.03] px-5 text-sm text-white transition-colors hover:bg-white/[0.08]",
                            detailReferenceUploadTarget !== null && "pointer-events-none opacity-60"
                          )}
                        >
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            multiple
                            className="hidden"
                            disabled={detailReferenceUploadTarget !== null}
                            onChange={(event) => {
                              void handleAppendDetailReferenceFiles(event);
                            }}
                          />
                          {detailReferenceUploadTarget?.type === "append" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          上传目标详情
                        </label>
                        <Input
                          value={detailProductIdQueryInput}
                          onChange={(event) => setDetailProductIdQueryInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleDetailReplacementSearch("productId");
                          }
                        }}
                        disabled={detailReplacementSearchState.isLoading}
                        placeholder="输入市场ID / 商品ID"
                        className="h-12 rounded-[22px] border-white/10 bg-black/20 text-sm text-white placeholder:text-white/28 focus:border-emerald-400/30 sm:w-[220px]"
                      />
                      <Select
                        value={detailReplacementProductDetailChannel}
                        onValueChange={(value) =>
                          handleDetailReplacementProductDetailChannelChange(
                            value as AgentWorkflowProductDetailChannel
                          )
                        }
                      >
                        <SelectTrigger className="h-12 rounded-[22px] border-white/10 bg-black/20 text-sm text-white focus:border-emerald-400/30 sm:w-[150px]">
                          <SelectValue placeholder="渠道" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_DETAIL_CHANNEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={() => handleDetailReplacementSearch("productId")}
                        disabled={detailReplacementSearchState.isLoading}
                        className="h-12 rounded-[22px] bg-white/[0.04] px-5 text-sm text-white hover:bg-white/[0.08]"
                      >
                        {detailReplacementSearchState.isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        市场ID查询详情
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDetailReplacementSearch("spu")}
                        disabled={detailReplacementSearchState.isLoading}
                        className="h-12 rounded-[22px] bg-emerald-500 px-5 font-semibold text-sm text-black shadow-[0_0_24px_rgba(16,185,129,0.22)] hover:bg-emerald-400"
                      >
                        {detailReplacementSearchState.isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        检索可用模版
                      </Button>
                    </div>
                  </div>
                </div>

                {detailReplacementReferenceCards.length > 0 ? (
                  <div className="flex flex-col gap-2 lg:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDetailReferenceStitchDialogOpen(true)}
                      className="h-12 rounded-[22px] border-emerald-400/20 bg-emerald-500/[0.08] px-5 text-sm text-emerald-100 hover:bg-emerald-500/[0.14] hover:text-emerald-50"
                    >
                      拼合切割参考图
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearDetailReferenceCards}
                      className="h-12 rounded-[22px] border-white/10 bg-white/[0.03] px-5 text-sm text-white hover:bg-white/[0.08]"
                    >
                      清空参考图
                    </Button>
                  </div>
                ) : null}

                {detailReplacementQueryDisplay ? (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/48">
                    当前参考图查询：
                    {detailReplacementQueryType === "productId"
                      ? "商品ID"
                      : detailReplacementQueryType === "sku"
                        ? "SKU"
                        : "SPU"} /
                    {detailReplacementQueryDisplay}
                    {workflowBrandName ? (
                      <span className="ml-2 text-white/40">{`品牌 / ${workflowBrandName}`}</span>
                    ) : null}
                    {detailReplacementQueryType === "productId" ? (
                      <span className="ml-2 text-white/40">
                        {`渠道 / ${
                          PRODUCT_DETAIL_CHANNEL_OPTIONS.find(
                            (option) => option.value === detailReplacementProductDetailChannel
                          )?.label || detailReplacementProductDetailChannel
                        }`}
                      </span>
                    ) : null}
                    <span className="ml-2 text-emerald-200/70">
                      {detailReplacementQueryType === "productId"
                        ? "商品ID详情图接口已服务端接入"
                        : `已接入真实${detailReferenceSourceLabel}参考图接口`}
                    </span>
                  </div>
                ) : null}

                {detailReplacementCandidates.length > 0 ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-xs text-white/42">
                        候选整套素材 {detailReplacementCandidates.length} 套
                      </div>
                      <div className="text-[11px] text-emerald-200/70">
                        默认载入最新一套，可随时切换
                      </div>
                    </div>
                    <div className="agent-dark-scrollbar grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-4">
                      {detailReplacementCandidates.map((candidate) => {
                        const isSelected = detailReplacementSelectedCandidateId === candidate.id;
                        const previewUrls = getCandidatePreviewUrls(
                          candidate,
                          detailReferenceTarget,
                          4
                        );
                        const primaryPreviewUrl =
                          previewUrls[0] || getCandidatePreviewUrl(candidate, detailReferenceTarget);
                        const uploadedAtText = (() => {
                          const raw = candidate.uploadedAt ? new Date(candidate.uploadedAt) : null;
                          if (!raw || Number.isNaN(raw.getTime())) return "未记录";
                          return raw.toLocaleString("zh-CN", {
                            timeZone: "Asia/Shanghai",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        })();
                        const summaryBadges = [
                          `${detailReferenceSourceLabel}`,
                          `${getCandidateTargetCount(candidate, detailReferenceTarget)}张`,
                          candidate.brandName || null,
                          candidate.categoryName || null,
                        ].filter((item): item is string => Boolean(item));
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => handleSelectDetailReplacementCandidate(candidate.id)}
                            style={AGENT_DEFERRED_LIST_CARD_STYLE}
                            className={cn(
                              "group relative min-w-0 overflow-hidden rounded-2xl border p-2 text-left transition-all duration-300",
                              isSelected
                                ? "border-emerald-400/40 bg-emerald-500/[0.08] shadow-[0_0_24px_rgba(16,185,129,0.14)]"
                                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                            )}
                          >
                            <div className="flex items-stretch gap-3">
                              <div className="relative w-[72px] min-h-[96px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white">
                                <div className="h-full w-full">
                                  {primaryPreviewUrl ? (
                                    <AgentPreviewImage
                                      src={primaryPreviewUrl}
                                      alt={candidate.sceneName || candidate.taskNo || candidate.productModel || "候选整套"}
                                      className="h-full w-full object-contain object-top transition-transform duration-500 group-hover:scale-[1.02]"
                                      previewWidth={360}
                                      previewQuality={72}
                                      onError={(event) =>
                                        handlePreviewImageLoadError(event, primaryPreviewUrl)
                                      }
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                                <div className="absolute left-1.5 top-1.5 rounded-full border border-white/10 bg-black/45 px-1.5 py-0.5 text-[9px] text-white/78">
                                  {getCandidateTargetCount(candidate, detailReferenceTarget)}张
                                </div>
                              </div>
                              <div className="flex min-h-[96px] min-w-0 flex-1 flex-col justify-between pr-5">
                                <div className="line-clamp-2 text-[12px] font-semibold leading-5 text-white">
                                  {candidate.sceneName || candidate.taskNo || candidate.productModel || "候选整套"}
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {summaryBadges.map((badge, badgeIndex) => (
                                    <span
                                      key={`${candidate.id}-badge-${badgeIndex}-${badge}`}
                                      className={cn(
                                        "rounded-full border px-1.5 py-0.5 text-[8px] leading-none",
                                        badgeIndex === 0
                                          ? "border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100"
                                          : "border-white/10 bg-white/[0.04] text-white/62"
                                      )}
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-1.5 text-[9px] leading-4 text-white/45">
                                  <div className="truncate">
                                    场景名称：{candidate.sceneName || candidate.productModel || "未命名整套"}
                                  </div>
                                  <div className="truncate">
                                    任务编号：{candidate.taskNo || "未记录"}
                                  </div>
                                </div>
                                <div className="mt-1.5 flex flex-col gap-0.5 text-[9px] text-white/50">
                                  {candidate.brandName ? (
                                    <div className="truncate">品牌：{candidate.brandName}</div>
                                  ) : null}
                                  <div className="truncate">店铺：{candidate.shopName || "未记录"}</div>
                                  <div className="truncate">更新时间：{uploadedAtText}</div>
                                </div>
                              </div>
                              {isSelected ? (
                                <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.18),0_0_18px_rgba(52,211,153,0.45)]" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.section>
          ) : null}

          {isDetailReplacementPreset && !isDetailAiGenerationMethod ? (
            <AgentDetailReferenceStitchDialog
              open={detailReferenceStitchDialogOpen}
                onOpenChange={setDetailReferenceStitchDialogOpen}
                cards={detailReplacementReferenceCards}
                sourceLabel={`${detailReferenceSourceLabel}参考图`}
                onPrepared={handlePreparedDetailReferenceCards}
                onApply={handleApplyStitchedDetailReferenceCards}
              />
          ) : null}

          <motion.section
            id="agent-anchor-results"
            className={cn(
              "relative flex min-h-[620px] flex-col rounded-[28px] border border-white/12 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
              isDetailReplacementPreset ? "overflow-visible" : "overflow-hidden"
            )}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            style={AGENT_DEFERRED_RESULTS_STYLE}
            data-agent-workflow-section="results"
          >
            <div className="flex items-center justify-between border-b border-white/12 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">结果预览</div>
                <div className="text-xs text-white/40">
                  {isDetailReplacementPreset
                    ? isDetailAiGenerationMethod
                      ? "AI详情生成结果会按生成顺序保留在当前项目中，并独立归档到“AI详情”分类。"
                      : "参考图替换结果会按参考图顺序纵向展示，并保持在当前工作台预览，不会自动回写到无限画布。"
                    : isSkuReplacementPreset
                      ? "SKU替换结果会按参考图顺序一对一展示，并保持在当前工作台预览，不会自动回写到无限画布。"
                    : "结果仅保留在当前生图工作台预览，不会自动回写到无限画布。"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {availableResultModeTypes.map((modeType) => {
                  const isActive = activeResultModeType === modeType;
                  const count = (mergedResultCollections[modeType] || []).length;
                  return (
                    <button
                      key={modeType}
                      type="button"
                      onClick={() => setActiveResultModeType(modeType)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        isActive
                          ? "border-emerald-400/30 bg-emerald-500/[0.10] text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/78"
                      )}
                    >
                      {getResultModeLabel(modeType)}
                      {count > 0 ? ` · ${count}` : ""}
                    </button>
                  );
                })}
                {activeResultModeType === "detail_replacement" &&
                detailReplacementOrderedDownloadUrls.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleBatchDownloadImages({
                        imageUrls: detailReplacementOrderedDownloadUrls,
                        zipName: `${selectedAgentPreset?.name || "detail-replacement"}-results`,
                        scope: "detail",
                      })
                    }
                    disabled={batchDownloadState === "detail"}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/[0.14] disabled:opacity-50"
                  >
                    {batchDownloadState === "detail" ? "打包中..." : "批量下载"}
                  </button>
                ) : null}
                {activeResultModeType === "detail_generation" &&
                mergedResultCollections.detail_generation.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleBatchDownloadImages({
                        imageUrls: mergedResultCollections.detail_generation,
                        zipName: `${selectedAgentPreset?.name || "ai-detail"}-results`,
                        scope: "detail",
                      })
                    }
                    disabled={batchDownloadState === "detail"}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/[0.14] disabled:opacity-50"
                  >
                    {batchDownloadState === "detail" ? "打包中..." : "批量下载"}
                  </button>
                ) : null}
                {activeResultModeType === "sku_replacement" &&
                skuReplacementOrderedDownloadUrls.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleBatchDownloadImages({
                        imageUrls: skuReplacementOrderedDownloadUrls,
                        zipName: `${selectedAgentPreset?.name || "sku-replacement"}-results`,
                        scope: "sku",
                      })
                    }
                    disabled={batchDownloadState === "sku"}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/[0.14] disabled:opacity-50"
                  >
                    {batchDownloadState === "sku" ? "打包中..." : "批量下载"}
                  </button>
                ) : null}
                {activeResultModeType === "scene_generation" && activeResultModeUrls.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleBatchDownloadImages({
                        imageUrls: activeResultModeUrls,
                        zipName: `${selectedAgentPreset?.name || "scene-generation"}-results`,
                        scope: "scene",
                      })
                    }
                    disabled={batchDownloadState === "scene"}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/[0.14] disabled:opacity-50"
                  >
                    {batchDownloadState === "scene" ? "打包中..." : "批量下载"}
                  </button>
                ) : null}

                {activeResultModeType === "detail_replacement" &&
                isDetailReplacementPreset &&
                activeResultModeType === currentResultModeType ? (
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/60">
                    预估 {detailReplacementReferenceCards.length} 屏
                  </div>
                ) : activeResultModeType === "detail_generation" &&
                  isDetailAiGenerationMethod &&
                  activeResultModeType === currentResultModeType ? (
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/60">
                    预估 {detailGenerationExpectedCount || 0} 屏
                  </div>
                ) : activeResultModeType === "sku_replacement" &&
                  isSkuReplacementPreset &&
                  activeResultModeType === currentResultModeType ? (
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/60">
                    预估 {skuReplacementReferenceCards.length} 组
                  </div>
                ) : activeResultModeUrls.length > 0 ? (
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/60">
                    共 {activeResultModeUrls.length} 张
                  </div>
                ) : null}
                {pendingGeneration?.modeType === activeResultModeType ? (
                  <div className="rounded-full border border-sky-400/25 bg-sky-500/[0.10] px-3 py-1 text-xs text-sky-100">
                    处理中 {Math.min(pendingGenerationProgressCount, pendingGeneration.expectedCount)}/
                    {pendingGeneration.expectedCount}
                  </div>
                ) : activeResultModeType === "detail_generation" &&
                  detailGenerationProgress.status === "running" &&
                  detailGenerationExpectedCount > 0 ? (
                  <div className="rounded-full border border-sky-400/25 bg-sky-500/[0.10] px-3 py-1 text-xs text-sky-100">
                    处理中 {Math.min(detailGenerationRunResults.length, detailGenerationExpectedCount)}/
                    {detailGenerationExpectedCount}
                  </div>
                ) : null}
              </div>
            </div>

            {isDetailReplacementPreset &&
            !isDetailAiGenerationMethod &&
            activeResultModeType === currentResultModeType ? (
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 xl:grid-cols-[320px_repeat(2,minmax(0,1fr))]">
                <div className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">输入图</div>
                      <div className="text-xs text-white/40">
                        选中的白底图会作为参考图替换的输入图组
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                      {selectedProductAttachments.length} 张
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedProductAttachments.length > 0 ? (
                      selectedProductAttachments.map((attachment, index) => (
                        <div
                          key={`${attachment?.url || "input"}-${index}`}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20"
                        >
                          <div className="aspect-square overflow-hidden bg-black/30">
                            <AgentPreviewImage
                              src={attachment!.url}
                              alt={attachment!.name || `输入图 ${index + 1}`}
                              className="h-full w-full object-cover"
                              previewWidth={400}
                              previewQuality={74}
                              onError={(event) =>
                                handlePreviewImageLoadError(event, attachment!.url)
                              }
                            />
                          </div>
                          <div className="border-t border-white/10 px-3 py-2">
                            <div className="text-xs font-medium text-white/80">
                              输入图 {index + 1}
                            </div>
                            <div className="truncate text-[11px] text-white/40">
                              {attachment?.name || "已选择白底图"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-4 text-center text-sm text-white/42">
                        请先在当前“选图与生成”页的输入图槽位中确认用于参考图替换的白底输入图。
                      </div>
                    )}

                    {selectedModelAttachment ? (
                      <div className="overflow-hidden rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.06]">
                        <div className="relative aspect-[5/4] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_58%),linear-gradient(180deg,#08110d_0%,#101916_100%)]">
                          <AgentPreviewImage
                            src={selectedModelAttachment.url}
                            alt={selectedModelAttachment.name || "模特图"}
                            className="h-full w-full object-cover"
                            previewWidth={720}
                            previewQuality={76}
                            onError={(event) =>
                              handlePreviewImageLoadError(event, selectedModelAttachment.url)
                            }
                          />
                          <div className="absolute left-3 top-3 rounded-full border border-emerald-300/25 bg-black/45 px-2.5 py-1 text-[11px] text-emerald-100">
                            模特图
                          </div>
                        </div>
                        <div className="border-t border-emerald-400/15 px-3 py-2">
                          <div className="truncate text-xs font-medium text-emerald-100">
                            {selectedModelAttachment.name || "已选择模特图"}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{detailReferenceSourceLabel}参考图</div>
                      <div className="text-xs text-white/40">
                        支持按 SPU / SKU 自动兜底查询任务整套候选，并切换某一套的{detailReferenceSourceLabel}参考图。
                      </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          className={cn(
                            "inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white",
                            detailReferenceUploadTarget !== null && "pointer-events-none opacity-60"
                          )}
                        >
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            multiple
                            className="hidden"
                            disabled={detailReferenceUploadTarget !== null}
                            onChange={(event) => {
                              void handleAppendDetailReferenceFiles(event);
                            }}
                          />
                          {detailReferenceUploadTarget?.type === "append" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          上传
                        </label>
                        {detailReplacementReferenceCards.length > 0 ? (
                          <button
                          type="button"
                          onClick={() => setDetailReferenceStitchDialogOpen(true)}
                          className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-100 transition-colors hover:bg-emerald-500/[0.14]"
                        >
                          拼合切割
                        </button>
                      ) : null}
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                        {detailReplacementReferenceCards.length} 张
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {detailReplacementReferenceCards.length > 0 ? (
                        detailReplacementReferenceCards.map((card, index) => (
                          (() => {
                            const isActive = activeDetailReferenceCardId === card.id;
                            const isReplacingReference =
                              detailReferenceUploadTarget?.type === "replace" &&
                              detailReferenceUploadTarget.cardId === card.id;
                            return (
                          <div
                          key={card.id}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className={cn(
                            "w-full cursor-pointer overflow-hidden rounded-[22px] border bg-black/20 transition-colors",
                            isActive
                              ? "border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
                              : "border-white/10"
                          )}
                          onClick={() => setActiveDetailReferenceCardId(card.id)}
                        >
                            <div className="relative min-h-[220px] overflow-hidden bg-white/95">
                              <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
                                <label
                                  className={cn(
                                    IMAGE_OVERLAY_ACTION_CLASS,
                                    "inline-flex cursor-pointer items-center gap-1.5",
                                    detailReferenceUploadTarget !== null && "pointer-events-none opacity-60"
                                  )}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <input
                                    type="file"
                                    accept="image/*,.heic,.heif"
                                    className="hidden"
                                    disabled={detailReferenceUploadTarget !== null}
                                    onChange={(event) => {
                                      void handleReplaceDetailReferenceCardFile(card.id, event);
                                    }}
                                  />
                                  {isReplacingReference ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                  <span>{isReplacingReference ? "更换中" : "更换"}</span>
                                </label>
                                <button
                                  type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveDetailReferenceCard(card.id);
                                }}
                                className={IMAGE_OVERLAY_DANGER_TEXT_CLASS}
                              >
                                删除
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleToggleDetailReferenceCardPassthrough(card.id);
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold text-[12px] backdrop-blur-md shadow-[0_12px_34px_rgba(0,0,0,0.50)] transition-colors",
                                  card.passthrough
                                    ? "border-emerald-100/85 bg-emerald-600/92 text-white shadow-[0_12px_34px_rgba(16,185,129,0.34),0_10px_28px_rgba(0,0,0,0.45)]"
                                    : "border-emerald-100/70 bg-zinc-950/82 text-emerald-50 hover:border-emerald-50 hover:bg-emerald-700/80"
                                )}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{card.passthrough ? "已勾选不处理" : "勾选不处理"}</span>
                              </button>
                            </div>
                            {card.imageUrl ? (
                              <AgentPreviewImage
                                src={card.imageUrl}
                                alt={card.label}
                                className="block h-auto w-full"
                                previewWidth={720}
                                previewQuality={76}
                                onError={(event) =>
                                  handlePreviewImageLoadError(event, card.imageUrl || "")
                                }
                              />
                            ) : null}
                            <div className={cn("absolute left-3 top-3", IMAGE_OVERLAY_BADGE_CLASS)}>
                              参考图 {index + 1}
                            </div>
                            {card.passthrough ? (
                              <div className={cn("absolute left-3 top-12", IMAGE_OVERLAY_STATUS_BASE_CLASS, "border-brand-accent/80 bg-brand-accent/92 text-brand-accent-foreground")}>
                                不处理直出
                              </div>
                            ) : null}
                            {isActive ? (
                              <div
                                className={cn(
                                  "absolute",
                                  IMAGE_OVERLAY_ACTIVE_BADGE_CLASS,
                                  card.passthrough ? "left-3 top-[3.75rem]" : "left-3 top-12"
                                )}
                              >
                                当前联动
                              </div>
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 py-3">
                              <div className="text-sm font-medium text-white/88">{card.label}</div>
                              <div className="text-xs text-white/45">
                                第 {index + 1} 张{detailReferenceSourceLabel}参考图
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/45">
                            {card.passthrough
                              ? "当前切片不会参与生图，会直接进入结果区。"
                              : "删除某张后，后面的参考图会自动上移补位，不留空位。"}
                          </div>
                        </div>
                          );
                        })()
                      ))
                    ) : (
                      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-5 text-center">
                        <div className="text-sm font-medium text-white/72">等待{detailReferenceSourceLabel}参考图</div>
                          <div className="mt-2 text-xs leading-6 text-white/40">
                            点击“检索可用模版”后，这里会展示当前品牌下主 SPU 对应的真实{detailReferenceSourceLabel}参考图；也可以直接上传目标详情图。
                            删除不需要的参考图后，列表会自动上移补位。
                          </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-h-0 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">替换结果</div>
                      <div className="text-xs text-white/40">
                        每张{detailReferenceSourceLabel}参考图将对应生成一张替换结果，并支持逐屏文字编辑。
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-emerald-200/80">
                      已处理 {detailProcessedCount}/{detailResultCards.length || 0}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {detailResultCards.length > 0 ? (
                      detailResultCards.map((card) => (
                          (() => {
                            const isActive = activeDetailReferenceCardId === card.id;
                            const statusMeta = getReplacementCardStatusMeta(card.status);
                            const isPending = card.status === "generating" || card.status === "queued";
                            const hasResult = Boolean(card.resultUrl);
                            const isWatermarkRemoving = detailWatermarkRemoveCardIds.has(card.id);
                            const isDetailLocalEditBusy = detailLocalEditSubmittingId === card.id;
                            const isDetailLocalEditing =
                              isDetailLocalEditBusy && detailLocalEditSubmittingMode !== "scale_adjust";
                            const isDetailScaleAdjusting =
                              isDetailLocalEditBusy && detailLocalEditSubmittingMode === "scale_adjust";
                            const isDetailEnhancing = detailEnhancingCardIds.has(card.id);
                            const processingLabel = isDetailScaleAdjusting
                              ? "比例调整中"
                              : isDetailLocalEditing
                                ? "局部编辑中"
                                : isDetailEnhancing
                                  ? "高清处理中"
                                  : isWatermarkRemoving
                                    ? "去水印中"
                                    : card.resultUrl && card.status === "generating"
                                      ? "重新生图中"
                                      : card.resultUrl && card.status === "queued"
                                        ? "排队处理中"
                                        : "";
                            return (
                        <div
                          key={`${card.id}-result`}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className={cn(
                            "w-full cursor-pointer overflow-hidden rounded-[22px] border bg-black/20 transition-colors",
                            hasResult && isActive
                              ? "border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
                              : isActive
                                ? "border-white/18 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                                : "border-white/10"
                          )}
                        >
                          {hasResult ? (
                            <div className="relative min-h-[220px] overflow-hidden bg-white/95">
                              <AgentPreviewImage
                                src={card.resultUrl!}
                                alt={`结果图 ${card.index + 1}`}
                                className="block h-auto w-full cursor-zoom-in"
                                previewWidth={720}
                                previewQuality={78}
                                onError={(event) =>
                                  handlePreviewImageLoadError(event, card.resultUrl!)
                                }
                                onClick={() => {
                                  setActiveDetailReferenceCardId(card.id);
                                  setFullscreenPreview(card.resultUrl!);
                                }}
                              />
                              <div className={cn("absolute left-3 top-3", IMAGE_OVERLAY_STATUS_BASE_CLASS, statusMeta.className)}>
                                {statusMeta.label}
                              </div>
                              <AnimatePresence>
                                {card.resultUrl && processedResultHintByUrl[card.resultUrl] ? (
                                  <ResultProcessedHintBubble
                                    label={processedResultHintByUrl[card.resultUrl]}
                                  />
                                ) : null}
                              </AnimatePresence>
                              {isActive ? (
                                <div className={cn("absolute left-3 top-12", IMAGE_OVERLAY_ACTIVE_BADGE_CLASS)}>
                                  当前联动
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteResultImage("detail_replacement", card.resultUrl!)
                                }
                                className={IMAGE_OVERLAY_DANGER_ICON_CLASS}
                                aria-label="删除结果图"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDownloadOriginalImage(card.resultUrl!);
                                }}
                                className={cn("absolute bottom-3 right-3", IMAGE_OVERLAY_ACTION_CLASS)}
                              >
                                下载
                              </button>
                              <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-6.5rem)] flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={isDetailLocalEditBusy}
                                    onClick={() => {
                                      setDetailLocalEditTarget({
                                        cardId: card.id,
                                        imageUrl: card.resultUrl!,
                                        mode: "local_edit",
                                        title: `${detailReferenceSourceLabel}结果图 ${card.index + 1}`,
                                        resultModeType: "detail_replacement",
                                    });
                                  }}
                                  className={cn(
                                    IMAGE_OVERLAY_ACTION_CLASS,
                                    "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                    )}
                                  >
                                    {isDetailLocalEditBusy && !isDetailScaleAdjusting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Wand2 className="h-3.5 w-3.5" />
                                    )}
                                    <span>{isDetailLocalEditing ? "编辑中" : "局部编辑"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDetailLocalEditBusy}
                                    onClick={() => {
                                      setDetailLocalEditTarget({
                                        cardId: card.id,
                                        imageUrl: card.resultUrl!,
                                        mode: "scale_adjust",
                                        title: `${detailReferenceSourceLabel}结果图 ${card.index + 1}`,
                                        resultModeType: "detail_replacement",
                                      });
                                    }}
                                    className={cn(
                                      IMAGE_OVERLAY_ACTION_CLASS,
                                      "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                    )}
                                  >
                                    {isDetailScaleAdjusting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Maximize2 className="h-3.5 w-3.5" />
                                    )}
                                    <span>{isDetailScaleAdjusting ? "调整中" : "比例调整"}</span>
                                  </button>
                                  <button
                                  type="button"
                                  disabled={isDetailEnhancing}
                                  onClick={() =>
                                    void handleEnhanceDetailGenerationResult({
                                      cardId: card.id,
                                      imageUrl: card.resultUrl!,
                                      resultModeType: "detail_replacement",
                                    })
                                  }
                                  className={cn(
                                    IMAGE_OVERLAY_ACTION_CLASS,
                                    "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                  )}
                                >
                                  {isDetailEnhancing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                  )}
                                  <span>{isDetailEnhancing ? "高清中" : "高清"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenReplacementTextEdit({
                                      modeType: "detail_replacement",
                                      cardId: card.id,
                                      imageUrl: card.resultUrl!,
                                      title: `${selectedAgentPreset?.name || "参考图替换"} 结果图 ${card.index + 1}`,
                                    })
                                  }
                                  className={IMAGE_OVERLAY_ACTION_CLASS}
                                >
                                  当前页改字
                                </button>
                                <button
                                  type="button"
                                  disabled={isAnyGenerationRunning}
                                  onClick={() => {
                                    setReplacementRerunTarget({
                                      open: true,
                                      modeType: "detail_replacement",
                                      cardId: card.id,
                                      title: `${detailReferenceSourceLabel}结果图 ${card.index + 1}`,
                                    });
                                    setReplacementRerunPrompt("");
                                  }}
                                  className={cn(IMAGE_OVERLAY_ACTION_CLASS, "disabled:cursor-not-allowed disabled:opacity-45")}
                                >
                                  重新生图
                                </button>
                                <button
                                  type="button"
                                  disabled={isAnyGenerationRunning || isWatermarkRemoving}
                                  onClick={() =>
                                    void handleRemoveDetailResultWatermark({
                                      cardId: card.id,
                                      imageUrl: card.resultUrl!,
                                    })
                                  }
                                  className={cn(
                                    IMAGE_OVERLAY_ACTION_CLASS,
                                    "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                  )}
                                  >
                                    {isWatermarkRemoving ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Droplet className="h-3.5 w-3.5" />
                                    )}
                                    <span>{isWatermarkRemoving ? "去水印中" : "去水印"}</span>
                                  </button>
                                </div>
                                {processingLabel ? (
                                  <DetailResultProcessingScanOverlay label={processingLabel} />
                                ) : null}
                              </div>
                            ) : (
                            <div
                              className="aspect-[5/3]"
                              onClick={() => setActiveDetailReferenceCardId(card.id)}
                            >
                              <AnimatedGenerationPlaceholderCard
                                badge={statusMeta.label}
                                badgeClassName={statusMeta.className}
                                animated={card.status === "generating"}
                                showSpinner={card.status === "generating"}
                                title={`结果图 ${card.index + 1}`}
                                description={
                                  card.status === "queued" &&
                                  card.queuePosition &&
                                  card.queueTotal
                                    ? `批次内排队 ${card.queuePosition}/${card.queueTotal}，将按“输入图组 + 第 ${card.index + 1} 张${detailReferenceSourceLabel}参考图”继续生成`
                                    : `将按“输入图组 + 第 ${card.index + 1} 张${detailReferenceSourceLabel}参考图”生成`
                                }
                              />
                            </div>
                          )}
                          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/45">
                            {isPending
                              ? card.status === "generating"
                                ? "正在重做这一屏，新的结果回来后会直接覆盖当前展示。"
                                : card.queuePosition && card.queueTotal
                                  ? `当前批次位次 ${card.queuePosition}/${card.queueTotal}，前面的屏完成后会继续处理这一屏。`
                                  : "前面的屏生成完成后，会继续处理这一屏。"
                              : card.resultUrl
                                ? card.status === "passthrough"
                                  ? "当前参考图未检测到可替换产品，本屏先沿用参考图展示；如需继续调整，仍可在当前页改字或重新生图。"
                                  : card.status === "fallback"
                                    ? "当前参考图替换失败，本屏先沿用参考图展示。"
                                    : "已生成，可直接在当前页改字；如果不满意，也可以补充提示词重新生图。"
                                : card.status === "missing"
                                  ? "当前这屏还没有回传结果，继续批量时会从这张开始补跑。"
                                  : "生成完成后，这里支持直接在当前页面改字和单张重生。"}
                          </div>
                        </div>
                          );
                        })()
                      ))
                    ) : (
                      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-5 text-center">
                        <div className="text-sm font-medium text-white/72">等待替换结果</div>
                        <div className="mt-2 text-xs leading-6 text-white/40">
                          {detailReferenceSourceLabel}参考图加载后，右侧会按相同顺序生成对应结果图，并逐屏支持文字编辑。
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isSkuReplacementPreset && activeResultModeType === currentResultModeType ? (
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
                <div className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">输入图</div>
                      <div className="text-xs text-white/40">
                        选中的白底图会和{skuReferenceSourceLabel}参考图建立一对一替换关系
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                      {selectedProductAttachments.length} 张
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedProductAttachments.length > 0 ? (
                      selectedProductAttachments.map((attachment, index) => (
                        <div
                          key={`${attachment?.url || "sku-input"}-${index}`}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20"
                        >
                          <div className="aspect-square overflow-hidden bg-black/30">
                            <AgentPreviewImage
                              src={attachment!.url}
                              alt={attachment!.name || `输入图 ${index + 1}`}
                              className="h-full w-full object-cover"
                              previewWidth={400}
                              previewQuality={74}
                              onError={(event) =>
                                handlePreviewImageLoadError(event, attachment!.url)
                              }
                            />
                          </div>
                          <div className="border-t border-white/10 px-3 py-2">
                            <div className="text-xs font-medium text-white/80">
                              输入图 {index + 1}
                            </div>
                            <div className="truncate text-[11px] text-white/40">
                              {attachment?.name || "已选择白底图"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-4 text-center text-sm text-white/42">
                        请先在当前“选图与生成”页的输入图槽位中确认用于 SKU 替换的白底输入图。
                      </div>
                    )}

                    {selectedModelAttachment ? (
                      <div className="overflow-hidden rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.06]">
                        <div className="relative aspect-[5/4] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_58%),linear-gradient(180deg,#08110d_0%,#101916_100%)]">
                          <AgentPreviewImage
                            src={selectedModelAttachment.url}
                            alt={selectedModelAttachment.name || "模特图"}
                            className="h-full w-full object-cover"
                            previewWidth={720}
                            previewQuality={76}
                            onError={(event) =>
                              handlePreviewImageLoadError(event, selectedModelAttachment.url)
                            }
                          />
                          <div className="absolute left-3 top-3 rounded-full border border-emerald-300/25 bg-black/45 px-2.5 py-1 text-[11px] text-emerald-100">
                            模特图
                          </div>
                        </div>
                        <div className="border-t border-emerald-400/15 px-3 py-2">
                          <div className="truncate text-xs font-medium text-emerald-100">
                            {selectedModelAttachment.name || "已选择模特图"}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{skuReferenceSourceLabel}参考图</div>
                      <div className="text-xs text-white/40">
                        支持按 SKU 或 SPU 查询任务整套候选，并切换对应的{skuReferenceSourceLabel}参考图。
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                      {skuReplacementReferenceCards.length} 张
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {(["sku", "spu"] as const).map((queryType) => (
                      <button
                        key={queryType}
                        type="button"
                        onClick={() =>
                          updateSkuReplacementState((current) => ({
                            ...current,
                            queryType,
                            candidates:
                              current.queryType === queryType ? current.candidates : [],
                            selectedCandidateId:
                              current.queryType === queryType ? current.selectedCandidateId : null,
                            references:
                              current.queryType === queryType ? current.references : [],
                          }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          skuReplacementQueryType === queryType
                            ? "border-emerald-400/45 bg-emerald-500/[0.12] text-emerald-200"
                            : "border-white/10 bg-white/[0.03] text-white/58 hover:border-white/18 hover:text-white"
                        )}
                      >
                        按{queryType === "spu" ? "SPU" : "SKU"}查询
                      </button>
                    ))}
                  </div>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={skuReplacementQueryInput}
                      onChange={(e) =>
                        updateSkuReplacementState({
                          query: e.target.value,
                        })
                      }
                      placeholder={`输入${skuReplacementQueryType === "spu" ? "SPU" : "SKU"}，查询任务整套中的${skuReferenceSourceLabel}参考图`}
                      className="h-12 rounded-[22px] border-white/10 bg-black/20 text-sm text-white placeholder:text-white/22 focus:border-emerald-400/30"
                    />
                    <Button
                      type="button"
                      onClick={handleSkuReplacementSearch}
                      disabled={skuReplacementSearchState.isLoading}
                      className="h-12 rounded-[22px] bg-white/[0.04] px-5 text-sm text-white hover:bg-white/[0.08]"
                    >
                      {skuReplacementSearchState.isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          查询中
                        </>
                      ) : (
                        `查询${skuReferenceSourceLabel}`
                      )}
                    </Button>
                    {skuReplacementReferenceCards.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearSkuReferenceCards}
                        className="h-12 rounded-[22px] border-white/10 bg-white/[0.03] px-5 text-sm text-white hover:bg-white/[0.08]"
                      >
                        清空参考图
                      </Button>
                    ) : null}
                  </div>

                  {(skuReplacementSearchState.lastQuery || skuReplacementQueryInput.trim()) ? (
                    <div className="mb-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/48">
                      当前参考图查询：
                      {skuReplacementQueryType === "spu" ? "SPU" : "SKU"} /
                      {skuReplacementSearchState.lastQuery ||
                        skuReplacementQueryInput.trim().toUpperCase()}
                      {workflowBrandName ? (
                        <span className="ml-2 text-white/40">{`品牌 / ${workflowBrandName}`}</span>
                      ) : null}
                      <span className="ml-2 text-emerald-200/70">
                        {`已接入真实${skuReferenceSourceLabel}参考图接口`}
                      </span>
                    </div>
                  ) : null}

                  {skuReplacementCandidates.length > 0 ? (
                    <div className="mb-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs text-white/42">
                          候选整套素材 {skuReplacementCandidates.length} 套
                        </div>
                        <div className="text-[11px] text-emerald-200/70">
                          默认载入最新一套，可随时切换
                        </div>
                      </div>
                      <div className="agent-dark-scrollbar flex gap-2 overflow-x-auto pb-1">
                        {skuReplacementCandidates.map((candidate) => {
                          const isSelected = skuReplacementSelectedCandidateId === candidate.id;
                          const previewUrl = getCandidatePreviewUrl(candidate, skuReferenceTarget);
                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() => handleSelectSkuReplacementCandidate(candidate.id)}
                              style={AGENT_DEFERRED_LIST_CARD_STYLE}
                              className={cn(
                                "min-w-[280px] overflow-hidden rounded-[20px] border text-left transition-colors",
                                isSelected
                                  ? "border-emerald-400/45 bg-emerald-500/[0.10]"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/18"
                              )}
                            >
                              <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%),linear-gradient(180deg,#0b0d0f_0%,#11161a_100%)]">
                                {previewUrl ? (
                                  <AgentPreviewImage
                                    src={previewUrl}
                                    alt={candidate.sceneName || candidate.taskNo || candidate.productModel || "候选整套"}
                                    className="h-full w-full object-cover"
                                    previewWidth={640}
                                    previewQuality={74}
                                    onError={(event) =>
                                      handlePreviewImageLoadError(event, previewUrl)
                                    }
                                  />
                                ) : null}
                                <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] text-white/78">
                                  {getCandidateTargetCount(candidate, skuReferenceTarget)} 张{skuReferenceSourceLabel}
                                </div>
                                {isSelected ? (
                                  <div className="absolute right-3 top-3 rounded-full border border-emerald-300/35 bg-emerald-500/[0.14] px-2.5 py-1 text-[11px] text-emerald-100">
                                    当前使用
                                  </div>
                                ) : null}
                              </div>
                              <div className="space-y-2 px-3 py-3">
                                <div className="truncate text-sm font-medium text-white">
                                  {candidate.sceneName || candidate.taskNo || candidate.productModel || "候选整套"}
                                </div>
                                <div className="mt-1 line-clamp-2 text-[11px] text-white/42">
                                  {formatCandidateMeta(candidate, skuReferenceTarget) || `点击切换这套${skuReferenceSourceLabel}参考图`}
                                </div>
                                <div className="flex flex-wrap gap-1.5 text-[11px] text-white/48">
                                  {candidate.brandName ? (
                                    <span className="rounded-full bg-white/[0.05] px-2 py-1">
                                      品牌：{candidate.brandName}
                                    </span>
                                  ) : null}
                                  {candidate.shopName ? (
                                    <span className="rounded-full bg-white/[0.05] px-2 py-1">
                                      {candidate.shopName}
                                    </span>
                                  ) : null}
                                  {candidate.categoryName ? (
                                    <span className="rounded-full bg-white/[0.05] px-2 py-1">
                                      {candidate.categoryName}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="agent-dark-scrollbar max-h-[620px] space-y-3 overflow-y-auto pr-1">
                    {skuReplacementReferenceCards.length > 0 ? (
                      skuReplacementReferenceCards.map((card, index) => (
                        <div
                          key={card.id}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className={cn(
                            "w-full cursor-pointer overflow-hidden rounded-[22px] border bg-black/20 transition-colors",
                            activeSkuReferenceCardId === card.id
                              ? "border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
                              : "border-white/10"
                          )}
                          onClick={() => setActiveSkuReferenceCardId(card.id)}
                        >
                          {(() => {
                            const resolvedAssignedProductIndex =
                              selectedProductAttachments.length > 0
                                ? Math.min(
                                    typeof card.assignedProductIndex === "number"
                                      ? card.assignedProductIndex
                                      : index,
                                    Math.max(selectedProductAttachments.length - 1, 0)
                                  )
                                : null;
                            return (
                              <>
                          <div className="relative aspect-[5/3] overflow-hidden bg-white/95">
                            <button
                              type="button"
                              onClick={() => handleRemoveSkuReferenceCard(card.id)}
                              className={IMAGE_OVERLAY_DANGER_TEXT_CLASS}
                            >
                              删除
                            </button>
                            {card.imageUrl ? (
                              <AgentPreviewImage
                                src={card.imageUrl}
                                alt={card.label}
                                className="h-full w-full object-contain"
                                previewWidth={720}
                                previewQuality={76}
                                onError={(event) =>
                                  handlePreviewImageLoadError(event, card.imageUrl || "")
                                }
                              />
                            ) : null}
                            <div className={cn("absolute left-3 top-3", IMAGE_OVERLAY_BADGE_CLASS)}>
                              参考图 {index + 1}
                            </div>
                            {activeSkuReferenceCardId === card.id ? (
                              <div className={cn("absolute left-3 top-12", IMAGE_OVERLAY_ACTIVE_BADGE_CLASS)}>
                                当前联动
                              </div>
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 py-3">
                              <div className="text-sm font-medium text-white/88">{card.label}</div>
                              <div className="text-xs text-white/45">
                                第 {index + 1} 张{skuReferenceSourceLabel}参考图
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-white/10 px-3 py-2">
                            {selectedProductAttachments.length > 0 ? (
                              <>
                              <div className="mb-2 text-[11px] text-white/45">
                                当前对应输入图：
                                {typeof resolvedAssignedProductIndex === "number"
                                  ? `输入图 ${resolvedAssignedProductIndex + 1}`
                                  : "未指定"}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProductAttachments.map((_, productIndex) => (
                                  <button
                                    key={`${card.id}-product-${productIndex}`}
                                    type="button"
                                    onClick={() =>
                                      handleAssignSkuReferenceProduct(card.id, productIndex)
                                    }
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                                      resolvedAssignedProductIndex === productIndex
                                        ? "border-emerald-400/45 bg-emerald-500/[0.12] text-emerald-200"
                                        : "border-white/10 bg-white/[0.03] text-white/58 hover:border-white/20 hover:text-white"
                                    )}
                                  >
                                    输入图 {productIndex + 1}
                                  </button>
                                ))}
                              </div>
                              </>
                            ) : null}
                            <div className={cn("text-[11px] text-white/45", selectedProductAttachments.length > 0 ? "mt-2" : "")}>
                              删除某张后，后面的参考图会自动上移补位，不留空位。
                            </div>
                          </div>
                              </>
                            );
                          })()}
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-5 text-center">
                        <div className="text-sm font-medium text-white/72">等待{skuReferenceSourceLabel}参考图</div>
                        <div className="mt-2 text-xs leading-6 text-white/40">
                          输入 SKU 或 SPU 后，这里会展示任务整套里的真实{skuReferenceSourceLabel}参考图。
                          选择多少张图，就会按相同数量进入替换流程。
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-h-0 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">替换结果</div>
                      <div className="text-xs text-white/40">
                        每张{skuReferenceSourceLabel}参考图会对应一张结果图，形成一对一批量替换结果。
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-emerald-200/80">
                      已处理 {skuProcessedCount}/{skuResultCards.length || 0}
                    </div>
                  </div>

                  <div className="agent-dark-scrollbar max-h-[720px] space-y-3 overflow-y-auto pr-1">
                    {skuResultCards.length > 0 ? (
                      skuResultCards.map((card) => {
                        const statusMeta = getReplacementCardStatusMeta(card.status);
                        const isPending = card.status === "generating" || card.status === "queued";
                        const hasResult = Boolean(card.resultUrl) && !isPending;
                        return (
                        <div
                          key={`${card.id}-result`}
                          style={AGENT_DEFERRED_LIST_CARD_STYLE}
                          className={cn(
                            "w-full cursor-pointer overflow-hidden rounded-[22px] border bg-black/20 transition-colors",
                            hasResult && activeSkuReferenceCardId === card.id
                              ? "border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
                              : activeSkuReferenceCardId === card.id
                                ? "border-white/18 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                                : "border-white/10"
                          )}
                        >
                          {hasResult ? (
                            <div className="relative aspect-[5/3] overflow-hidden bg-white/95">
                              <AgentPreviewImage
                                src={card.resultUrl!}
                                alt={`结果图 ${card.index + 1}`}
                                className="h-full w-full cursor-zoom-in object-contain"
                                previewWidth={720}
                                previewQuality={78}
                                onError={(event) =>
                                  handlePreviewImageLoadError(event, card.resultUrl!)
                                }
                                onClick={() => {
                                  setActiveSkuReferenceCardId(card.id);
                                  setFullscreenPreview(card.resultUrl!);
                                }}
                              />
                              <div className={cn("absolute left-3 top-3", IMAGE_OVERLAY_STATUS_BASE_CLASS, statusMeta.className)}>
                                {statusMeta.label}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteResultImage("sku_replacement", card.resultUrl!)
                                }
                                className={IMAGE_OVERLAY_DANGER_ICON_CLASS}
                                aria-label="删除结果图"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDownloadOriginalImage(card.resultUrl!);
                                }}
                                className={cn("absolute bottom-3 right-3", IMAGE_OVERLAY_ACTION_CLASS)}
                              >
                                下载
                              </button>
                              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenReplacementTextEdit({
                                      modeType: "sku_replacement",
                                      cardId: card.id,
                                      imageUrl: card.resultUrl!,
                                      title: `${selectedAgentPreset?.name || "SKU替换"} 结果图 ${card.index + 1}`,
                                    })
                                  }
                                  className={IMAGE_OVERLAY_ACTION_CLASS}
                                >
                                  当前页改字
                                </button>
                                <button
                                  type="button"
                                  disabled={isAnyGenerationRunning}
                                  onClick={() => {
                                    setReplacementRerunTarget({
                                      open: true,
                                      modeType: "sku_replacement",
                                      cardId: card.id,
                                      title: `${skuReferenceSourceLabel}结果图 ${card.index + 1}`,
                                    });
                                    setReplacementRerunPrompt("");
                                  }}
                                  className={cn(IMAGE_OVERLAY_ACTION_CLASS, "disabled:cursor-not-allowed disabled:opacity-45")}
                                >
                                  重新生图
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="aspect-[5/3]"
                              onClick={() => setActiveSkuReferenceCardId(card.id)}
                            >
                              <AnimatedGenerationPlaceholderCard
                                badge={statusMeta.label}
                                badgeClassName={statusMeta.className}
                                animated={card.status === "generating"}
                                showSpinner={card.status === "generating"}
                                title={`结果图 ${card.index + 1}`}
                                description={`将按“输入图 + 第 ${card.index + 1} 张${skuReferenceSourceLabel}参考图”生成`}
                              />
                            </div>
                          )}
                          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/45">
                            {isPending
                              ? card.status === "generating"
                                ? "正在重做这一张，新的结果回来后会直接覆盖当前展示。"
                                : "前面的图生成完成后，会继续处理这一张。"
                              : card.resultUrl
                                ? card.status === "passthrough"
                                  ? "当前参考图未检测到可替换产品，这一张先沿用参考图展示；如需继续调整，仍可在当前页改字或重新生图。"
                                  : card.status === "fallback"
                                    ? "当前参考图替换失败，这一张先沿用参考图展示。"
                                    : "已生成，可直接在当前页改字；如果不满意，也可以补充提示词重新生图。"
                                : card.status === "missing"
                                  ? "当前这张还没有回传结果，继续批量时会从这张开始补跑。"
                                  : "生成完成后，这里支持直接改字、单张重生和批量下载。"}
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 px-5 text-center">
                        <div className="text-sm font-medium text-white/72">等待替换结果</div>
                        <div className="mt-2 text-xs leading-6 text-white/40">
                          {skuReferenceSourceLabel}参考图加载后，右侧会按相同顺序生成一对一替换结果，并支持批量下载。
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {shouldShowGridResultSection ? (
                  <motion.div
                    key={`result-${activeResultModeType}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-1 flex-col px-6 pb-6 pt-5 md:px-8"
                  >
                    <div className="mx-auto w-full max-w-[1200px]">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          {gridResultCards.map((card) => {
                            const isActive = card.url && displayedResultUrl === card.url;
                            const isSceneResultCard = activeResultModeType === "scene_generation";
                            const isDetailGenerationCard =
                              activeResultModeType === "detail_generation";
                            const isDetailEnhancing = detailEnhancingCardIds.has(card.id);
                            const isDetailLocalEditBusy =
                              detailLocalEditSubmittingId === card.id;
                            const isDetailLocalEditing =
                              isDetailLocalEditBusy && detailLocalEditSubmittingMode !== "scale_adjust";
                            const isDetailScaleAdjusting =
                              isDetailLocalEditBusy && detailLocalEditSubmittingMode === "scale_adjust";
                            const processingLabel = isDetailGenerationCard
                              ? isDetailScaleAdjusting
                                ? "比例调整中"
                                : isDetailLocalEditing
                                  ? "局部编辑中"
                                  : isDetailEnhancing
                                    ? "高清处理中"
                                    : ""
                              : "";

                          return (
                            <div
                              key={card.id}
                              role={card.url ? "button" : undefined}
                              tabIndex={card.url ? 0 : -1}
                              style={AGENT_DEFERRED_LIST_CARD_STYLE}
                              onClick={() => {
                                if (!card.url) return;
                                setSelectedResultUrl(card.url);
                              }}
                              onDoubleClick={() => {
                                if (!card.url) return;
                                setSelectedResultUrl(card.url);
                                setFullscreenPreview(card.url);
                              }}
                              onKeyDown={(event) => {
                                if (!card.url) return;
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedResultUrl(card.url);
                                }
                              }}
                              className={cn(
                                "overflow-hidden rounded-[22px] border transition-all",
                                card.url ? "cursor-pointer" : "cursor-default",
                                card.url && isActive
                                  ? "border-emerald-400/55 bg-emerald-500/[0.08] ring-1 ring-emerald-400/35"
                                  : !card.url && isActive
                                    ? "border-white/18 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                                    : "border-white/10 bg-black/20 hover:border-white/18"
                              )}
                            >
                              <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(180deg,#090b0c_0%,#111417_100%)]">
                                {card.url ? (
                                  <>
                                    <AgentPreviewImage
                                      src={card.url}
                                      alt={`${getResultModeLabel(activeResultModeType)} 结果图 ${card.index + 1}`}
                                      className="h-full w-full object-contain p-2"
                                      previewWidth={720}
                                      previewQuality={78}
                                    />
                                    {isSceneResultCard ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedResultUrl(card.url!);
                                            setSceneResizeEditorTargetUrl(card.url!);
                                          }}
                                          className={cn("absolute left-3 top-3 flex h-9 w-9 items-center justify-center", IMAGE_OVERLAY_ACTIVE_BADGE_CLASS, "px-0 py-0")}
                                          aria-label="调整尺寸"
                                        >
                                          <Maximize2 className="h-4 w-4" />
                                        </button>
                                        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-white/25 bg-zinc-950/82 px-3 py-2 font-semibold text-[11px] text-white shadow-[0_12px_34px_rgba(0,0,0,0.48)] backdrop-blur-md">
                                          双击查看大图
                                        </div>
                                      </>
                                    ) : null}
                                    <AnimatePresence>
                                      {card.url && processedResultHintByUrl[card.url] ? (
                                        <ResultProcessedHintBubble
                                          label={processedResultHintByUrl[card.url]}
                                        />
                                      ) : null}
                                    </AnimatePresence>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeleteResultImage(activeResultModeType, card.url!);
                                      }}
                                      className={IMAGE_OVERLAY_DANGER_ICON_CLASS}
                                      aria-label="删除结果图"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    {isDetailGenerationCard ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void handleDownloadOriginalImage(card.url!);
                                          }}
                                          className={cn("absolute bottom-3 right-3", IMAGE_OVERLAY_ACTION_CLASS)}
                                        >
                                          下载
                                        </button>
                                        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-6.5rem)] flex-wrap gap-2">
                                          <button
                                            type="button"
                                            disabled={isDetailLocalEditBusy}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setDetailLocalEditTarget({
                                                cardId: card.id,
                                                imageUrl: card.url!,
                                                mode: "local_edit",
                                                title: `AI详情 ${card.index + 1}`,
                                                resultModeType: "detail_generation",
                                              });
                                            }}
                                            className={cn(
                                              IMAGE_OVERLAY_ACTION_CLASS,
                                              "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                            )}
                                          >
                                            {isDetailLocalEditBusy && !isDetailScaleAdjusting ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Wand2 className="h-3.5 w-3.5" />
                                            )}
                                            <span>{isDetailLocalEditing ? "编辑中" : "局部编辑"}</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isDetailLocalEditBusy}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setDetailLocalEditTarget({
                                                cardId: card.id,
                                                imageUrl: card.url!,
                                                mode: "scale_adjust",
                                                title: `AI详情 ${card.index + 1}`,
                                                resultModeType: "detail_generation",
                                              });
                                            }}
                                            className={cn(
                                              IMAGE_OVERLAY_ACTION_CLASS,
                                              "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                            )}
                                          >
                                            {isDetailScaleAdjusting ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Maximize2 className="h-3.5 w-3.5" />
                                            )}
                                            <span>{isDetailScaleAdjusting ? "调整中" : "比例调整"}</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isDetailEnhancing}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleEnhanceDetailGenerationResult({
                                                cardId: card.id,
                                                imageUrl: card.url!,
                                              });
                                            }}
                                            className={cn(
                                              IMAGE_OVERLAY_ACTION_CLASS,
                                              "inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                                            )}
                                          >
                                            {isDetailEnhancing ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Sparkles className="h-3.5 w-3.5" />
                                            )}
                                            <span>高清</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleSendResultToCanvasTextEdit({
                                                imageUrl: card.url!,
                                                title: `AI详情 ${card.index + 1}`,
                                              });
                                            }}
                                            className={IMAGE_OVERLAY_ACTION_CLASS}
                                          >
                                              送入画布改字
                                            </button>
                                          </div>
                                        </>
                                      ) : null}
                                      {processingLabel ? (
                                        <DetailResultProcessingScanOverlay label={processingLabel} />
                                      ) : null}
                                    </>
                                  ) : (
                                  <AnimatedGenerationPlaceholderCard
                                    badge={card.status === "generating" ? "生成中" : card.status === "queued" ? "排队中" : "待生成"}
                                    badgeClassName={
                                      card.status === "generating"
                                        ? "border-sky-400/30 bg-sky-500/[0.10] text-sky-100"
                                        : card.status === "queued"
                                          ? "border-white/12 bg-white/[0.05] text-white/62"
                                        : "border-white/10 bg-white/[0.04] text-white/58"
                                    }
                                    animated={card.status === "generating"}
                                    showSpinner={card.status === "generating"}
                                    title={`${getResultModeLabel(activeResultModeType)} 结果图 ${card.index + 1}`}
                                    description={
                                      card.status === "generating"
                                        ? "当前图片正在生成中，结果返回后会自动替换这张占位卡。"
                                        : card.status === "queued"
                                          ? "前面的结果完成后会继续处理这一张，请保持当前页面即可。"
                                          : "开始生成后，这里会出现对应数量的结果预览卡片。"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${activeResultModeType}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-1 flex-col items-center justify-center px-6 text-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                      <Wand2 className="h-8 w-8 text-white/20" />
                    </div>
                    <p className="text-base font-medium text-white/60">
                      {`${getResultModeLabel(activeResultModeType)}结果暂为空`}
                    </p>
                    <p className="mt-2 text-sm text-white/30">
                      选择模型并开始生成后，结果会保留在当前项目的对应分类中。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.section>
        </div>
      </main>

      {sceneResizeEditorTargetUrl ? (
        <ImageAnnotator
          key={`agent-scene-resize-${sceneResizeEditorTargetUrl}`}
          imageUrl={sceneResizeEditorTargetUrl}
          initialResizeMode
          confirmButtonText="保存处理结果"
          appearance="dark"
          onConfirm={handleSceneResultResizeComplete}
          onCancel={() => setSceneResizeEditorTargetUrl(null)}
          open={Boolean(sceneResizeEditorTargetUrl)}
          onOpenChange={(open) => {
            if (!open) {
              setSceneResizeEditorTargetUrl(null);
            }
          }}
        />
      ) : null}

      <AgentImageTextEditDialog
        open={Boolean(replacementTextEditTarget?.open)}
        imageUrl={replacementTextEditTarget?.imageUrl}
        title={replacementTextEditTarget?.title}
        copySuggestionContext={replacementTextSuggestionContext}
        onOpenChange={(open) => {
          if (!open) {
            setReplacementTextEditTarget(null);
          }
        }}
        onApplySuccess={handleApplyReplacementTextEditResult}
      />

      <Dialog
        open={Boolean(batchDownloadDialog)}
        onOpenChange={handleBatchDownloadDialogOpenChange}
      >
        <DialogContent className="border-white/10 bg-[#101112] text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {isBatchDownloadCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ) : isBatchDownloadFailed ? (
                <X className="h-5 w-5 text-red-300" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
              )}
              批量导出结果
            </DialogTitle>
            <DialogDescription className="text-white/52">
              {isBatchDownloadCompleted
                ? "服务端已完成打包，点击下方按钮下载 ZIP 文件。"
                : isBatchDownloadFailed
                  ? "本次打包没有完成，可关闭弹窗后重新尝试。"
                  : `正在服务端打包 ${batchDownloadScopeLabel}，页面可保持打开等待完成。`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-white">
                    {batchDownloadDialog?.zipName || "批量导出"}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {batchDownloadDialog?.stage || "准备打包"}
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs",
                    isBatchDownloadCompleted
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                      : isBatchDownloadFailed
                        ? "border-red-400/25 bg-red-500/10 text-red-100"
                        : "border-sky-400/25 bg-sky-500/10 text-sky-100"
                  )}
                >
                  {isBatchDownloadCompleted
                    ? "已完成"
                    : isBatchDownloadFailed
                      ? "失败"
                      : "处理中"}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/45">
                    已处理 {batchDownloadDialog?.processedCount || 0}/
                    {batchDownloadDialog?.totalCount || 0}
                  </span>
                  <span className="font-medium text-white/72">
                    {batchDownloadProgress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isBatchDownloadFailed
                        ? "bg-red-400"
                        : "bg-gradient-to-r from-emerald-500 via-teal-300 to-sky-400"
                    )}
                    style={{ width: `${batchDownloadProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-white/42">总数</div>
                  <div className="mt-1 font-semibold text-white">
                    {batchDownloadDialog?.totalCount || 0}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2">
                  <div className="text-emerald-100/55">成功</div>
                  <div className="mt-1 font-semibold text-emerald-100">
                    {batchDownloadDialog?.successCount || 0}
                  </div>
                </div>
                <div className="rounded-xl border border-red-400/15 bg-red-500/10 px-3 py-2">
                  <div className="text-red-100/55">失败</div>
                  <div className="mt-1 font-semibold text-red-100">
                    {batchDownloadDialog?.failedCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {isBatchDownloadCompleted &&
            (batchDownloadDialog?.failedCount || 0) > 0 ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-50/80 text-xs leading-relaxed">
                有 {batchDownloadDialog?.failedCount || 0} 张图片暂时无法下载，ZIP
                内已附带 _download-failures.txt，可用于排查源图链接。
              </div>
            ) : null}

            {isBatchDownloadFailed ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-red-50/80 text-xs leading-relaxed">
                {batchDownloadDialog?.error || "打包下载失败，请稍后重试。"}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              disabled={isBatchDownloadRunning}
              onClick={() => setBatchDownloadDialog(null)}
            >
              {isBatchDownloadRunning ? "处理中" : "关闭"}
            </Button>
            <Button
              type="button"
              disabled={!isBatchDownloadCompleted || !batchDownloadDialog?.downloadUrl}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-45"
              onClick={handleDownloadPreparedBatchZip}
            >
              <Download className="mr-2 h-4 w-4" />
              下载 ZIP
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(replacementRerunTarget?.open)}
        onOpenChange={(open) => {
          if (!open) {
            setReplacementRerunTarget(null);
            setReplacementRerunPrompt("");
          }
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-[560px] dark:border-zinc-800 dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle>重新生图</DialogTitle>
            <DialogDescription>
              当前会只重做这一张结果图，不会把已经完成的其它结果重新跑一遍。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {replacementRerunTarget?.title || "当前结果图"}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                补充提示词
              </div>
              <Textarea
                value={replacementRerunPrompt}
                onChange={(event) => setReplacementRerunPrompt(event.target.value)}
                className="min-h-[140px] resize-y"
                placeholder="例如：标题更有冲击力、背景更明亮、保留版式但优化卖点文案层级..."
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setReplacementRerunTarget(null);
                setReplacementRerunPrompt("");
              }}
            >
              取消
            </Button>
            <Button type="button" onClick={handleConfirmReplacementRerun}>
              <RefreshCw className="mr-2 h-4 w-4" />
              开始重生
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DetailResultLocalEditDialog
        submitting={Boolean(detailLocalEditSubmittingId)}
          target={detailLocalEditTarget}
          onClose={() => {
            if (detailLocalEditSubmittingId) {
              toast.info(
                detailLocalEditSubmittingMode === "scale_adjust"
                  ? "比例调整正在处理中，请稍候"
                  : "局部编辑正在处理中，请稍候"
              );
              return;
            }
            setDetailLocalEditTarget(null);
        }}
        onSubmit={handleSubmitDetailLocalEdit}
      />

      {/* Fullscreen Preview */}
      <AnimatePresence>
        {fullscreenPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setFullscreenPreview(null)}
          >
            <img
              src={fullscreenPreview}
              alt="预览"
              decoding="async"
              className="max-h-[95vh] max-w-[95vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreenPreview(null)}
              className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
