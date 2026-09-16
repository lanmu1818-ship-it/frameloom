// Modified for standalone community distribution; see NOTICE.
"use client";

import { getImageReferenceLimit } from "@/src/lib/ai/image-reference-limits";
import { isInternalCapabilityModel } from "@/src/lib/ai/internal-capability-model";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useCallback, useMemo, type ClipboardEvent as ReactClipboardEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import dynamic from "@/src/desktop/next-dynamic-shim";
import { createPortal } from "react-dom";
import { useSession } from "@/src/providers/auth-session-provider";
import type { DetailUiProtocol } from "@/src/lib/detail-ui-protocol";
import type { DetailUiScreenReviewPatch } from "@/src/lib/detail-ui-protocol";
import { buildDetailUiScreenOverlaySnapshot } from "@/src/lib/detail-ui-surface-adapter";
import type { DetailUiDslV2Document } from "@/src/lib/detail-ui-dsl-v2";
import { buildDetailUiDslV2 } from "@/src/lib/detail-ui-dsl-v2-builder";
import {
  buildDetailTextLayerNodes,
  buildDetailTextLayerNodesFromReviewPatch,
  buildDetailTextLayerNodesFromSurfaceScreen,
  collectManagedDetailTextLayerNodeIds,
} from "@/src/lib/detail-ui-renderer";
import { buildUiScreenDocumentFromDetailUiDsl } from "@/src/lib/ui-screen/detail-adapter";
import type { UiScreenDocument } from "@/src/lib/ui-screen/schema";
import {
  applyUiSurfacePatch,
  type UiSurfacePatch,
  type UiSurfaceSnapshot,
} from "@/src/lib/ui-surface-protocol";
import useSWR, { useSWRConfig } from "swr";
import { Loader2, ImagePlus, X, Plus, History, LayoutGrid, ArrowRightToLine, RefreshCw, Globe, ArrowUp, Video, Sparkles, Check, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Brain, ThumbsUp, ThumbsDown, Eye, Trash2, Download, MessageCircle, Clapperboard, Bot, Lightbulb, Expand, Mic, Minimize2, MessageCirclePlus, Search, ListFilter, Copy } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/src/components/ui/select";
import { toast } from "sonner";
import { useCanvasStore } from "@/src/store/canvas/index";
import { cn } from "@/src/lib/utils";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/src/lib/utils";
import { apiFetch, createApiHref } from "@/src/client/api";
import {
  dispatchProviderApiKeyPrompt,
  dispatchProviderApiKeyPromptFromError,
  getProviderApiKeyPromptPayload,
} from "@/src/client/provider-api-key-prompt";
import { getUserFacingError } from "@/src/client/user-facing-error";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import {
  inferOriginalImageUrl,
} from "@/src/lib/image-url";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import {
  isImageGenerationModelDescriptor,
  isVideoModelDescriptor,
} from "@/src/lib/ai/model-classification";
import {
  getGenerationCreditCostFromImageGenConfig,
  getImageCreditCostFromConfig,
  getImageModelCreditDiscountLabel,
} from "@/src/lib/ai/image-model-pricing";
import { getVideoToolOptionsForMode } from "@/src/lib/ai/video-tool-capability";
import type { ChatMessage } from "@/src/lib/types";
import type {
  AgentPreset,
  AgentWorkflowComposerContext,
} from "@/types/agent";
import type { CanvasNode } from "@/types/canvas/index";
import { type CanvasLaunchPayload, getCanvasLaunchStorageKey } from "@/src/lib/canvas-launch";
import {
  DEFAULT_CANVAS_SKILL_TAGS_TITLE,
  normalizeCanvasSkillTags,
  type CanvasSkillTag,
} from "@/src/lib/canvas-skill-tags";
import {
  isCanvasImageReadyForAi,
  isCanvasImageUploadPending,
} from "@/src/lib/canvas/local-upload-state";
import { getCanvasSkillIconComponent } from "@/src/components/canvas/canvas-skill-icons";
import type { ImageGenerationParams } from "@/src/components/image-params-bar";
import type { VideoGenerationParams } from "@/src/components/video-params-bar";
import type { VideoToolCapabilityContract } from "@/types/video-tool-capability";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import {
  getCanvasToolbarItem,
  normalizeCanvasToolbarConfig,
  type CanvasToolbarConfig,
  type CanvasToolbarItemKey,
} from "@/src/lib/canvas-toolbar-config";
import {
  AGENT_PROGRESS_STEPS,
  type AgentProgressStreamPayload,
  type AgentTargetLockRefPreview,
  type AgentTargetLockStreamPayload,
  type CanvasMediaStreamPayload,
  getAgentProgressFallbackTitle,
  getAgentTargetLockTitle,
  getAgentTargetResolutionLabel,
  type ImageGenerationStatusStreamPayload,
} from "@/src/components/canvas/chat-panel/canvas-agent-stream";
import {
  type DetailArchive,
  type DetailBriefForm,
  DETAIL_BUNDLE_SLOT_INDEXES,
  DETAIL_FIELD_EXAMPLES,
  DETAIL_GENERATION_MODE_OPTIONS,
  type DetailGenerationMode,
  DETAIL_MODEL_SLOT_INDEX,
  type DetailPlanResponse,
  type DetailPlanScreenSpec,
  DETAIL_PRODUCT_SLOT_INDEXES,
  DETAIL_REVIEW_COUNT,
  DETAIL_REVIEW_IMAGE_COUNT,
  DETAIL_REVIEW_IMAGE_HEIGHT,
  DETAIL_REVIEW_IMAGE_WIDTH,
  DETAIL_REVIEW_REGEN_COUNT,
  type DetailReviewGroup,
  type DetailReviewPlan,
  type DetailScreenReviewResult,
  type DetailSectionKey,
  DETAIL_SCREEN_REVIEW_MAX_ATTEMPTS,
  DETAIL_SLOT_CONFIGS,
  DETAIL_STYLE_BOARD_HEIGHT,
  DETAIL_STYLE_BOARD_SPACING,
  DETAIL_STYLE_BOARD_WIDTH,
  DETAIL_TARGET_HEIGHT,
  DETAIL_TARGET_WIDTH,
  DETAIL_TYPOGRAPHY_LOCK,
  type DetailUiReviewSnapshot,
  type DetailUiValidationSnapshot,
  extractDetailFrameCount,
  extractFirstNumber,
  extractFontWeight,
  normalizeDetailGenerationMode,
  sanitizeDetailImageModelPrompt,
} from "@/src/components/canvas/chat-panel/canvas-detail-config";
import {
  buildDetailResultMarkdown,
  buildDetailReviewAppendMarkdown,
  buildDetailReviewPlans,
} from "@/src/components/canvas/chat-panel/canvas-detail-markdown";
import {
  createDetailArchiveSnapshot,
  patchDetailArchiveList,
  prependDetailArchive,
  replaceSavedDetailArchive,
  sanitizeDetailArchiveList,
} from "@/src/components/canvas/chat-panel/canvas-detail-archive";
import {
  applyDetailSlotAttachment,
  fillDetailSlotAttachments,
  getDetailSlotTargetIndexes,
} from "@/src/components/canvas/chat-panel/canvas-detail-slots";
import {
  buildCanvasUploadedImageAttachment,
  getCanvasUploadImageTitle,
  normalizeUploadedAssetId,
  validateCanvasImageUploadFile,
} from "@/src/components/canvas/chat-panel/canvas-upload-helpers";
import {
  clampChatRequestText,
  deriveSessionTitleFromMessages,
  extractUserTextPrompt,
  findNearestUserPrompt,
  getSessionRootStorageKey,
  getSessionStorageKey,
  isGenericCanvasPrompt,
  isValidChatHttpUrl,
  isValidChatUuid,
  MAX_CHAT_AUTO_CONTEXT_LENGTH,
  MAX_CHAT_HIDDEN_PROMPT_LENGTH,
  MAX_CHAT_TEXT_PART_LENGTH,
  normalizeChatAttachmentName,
  normalizeChatMediaType,
  type PickedObjectAttachment,
  sanitizeChatAttachment,
  toRawCanvasChatId,
} from "@/src/components/canvas/chat-panel/canvas-chat-session";
import {
  buildCanvasHistoryMessagesSignature,
  buildDownloadFilename,
  extractAssistantImageUrls,
  extractCanvasModelName,
  extractImageUrls,
  extractVideoUrls,
  formatMessageDateLabel,
  getAssistantImageNodeIdentityKey,
  getCanvasAssistantMessagesAfterTargetUser,
  getMessageDayKey,
  getMessageTimestamp,
  getNearestUserImageUrlKeys,
  getNearestUserImageUrls,
  hasCanvasImageMarkdown,
  hasCanvasLikelyGenerationErrorMessage,
  messageHasAssistantMedia,
  normalizeImageIdentityUrl,
  normalizeMediaUrl,
  reconcileCanvasMessagesWithHistory,
  sortCanvasMessagesByCreatedAt,
  stripCanvasModelRoutingLines,
  stripMediaMarkup,
  triggerBrowserDownload,
} from "@/src/components/canvas/chat-panel/canvas-chat-media";

const Response = dynamic(
  () => import("@/src/components/elements/response").then((module) => module.Response),
  {
    loading: () => null,
    ssr: false,
  }
);

const ImageParamsBar = dynamic(
  () =>
    import("@/src/components/image-params-bar").then(
      (module) => module.ImageParamsBar
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const VideoParamsBar = dynamic(
  () =>
    import("@/src/components/video-params-bar").then(
      (module) => module.VideoParamsBar
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const ImageGenerationLoading = dynamic(
  () =>
    import("@/src/components/image-generation-loading").then(
      (module) => module.ImageGenerationLoading
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const DetailUiValidationPanel = dynamic(
  () =>
    import("@/src/components/canvas/DetailUiValidationPanel").then(
      (module) => module.DetailUiValidationPanel
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const DetailSurfaceInspectorPanel = dynamic(
  () =>
    import("@/src/components/canvas/DetailSurfaceInspectorPanel").then(
      (module) => module.DetailSurfaceInspectorPanel
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

// 标签悬停预览信息
interface TagPreviewInfo {
  url: string;
  name: string;
  x: number;  // 标签中心x位置
  y: number;  // 标签顶部y位置
  // 聊天面板容器边界
  containerBounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  // 物品标签额外信息
  pickedObject?: {
    objectName: string;
    objectPosition: string;
    clickX: number;
    clickY: number;
  };
}

interface CanvasChatPanelProps {
  chatId: string;
  initialMessages?: ChatMessage[];
  onClose?: () => void;
  onOpenFileList?: () => void;
  selectedAgentPresetId?: string | null;
  chatScope?: "canvas" | "agent";
  workflowContext?: AgentWorkflowComposerContext | null;
  presentation?: "panel" | "workspace";
  agentEnabled?: boolean;
  workspaceVariant?: "canvas" | "video";
  panelTone?: "auto" | "light" | "dark";
  canvasToolbarConfig?: CanvasToolbarConfig;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type VideoStoryboardStreamData =
  | {
      stage: "detecting";
      provider?: string;
      message?: string;
    }
  | {
      stage: "start";
      provider?: string;
      taskId: string;
      totalShots: number;
      gridType?: "grid_2x2" | "grid_3x2" | "grid_3x3";
      rows?: number;
      cols?: number;
      confidence?: number;
      sourceImageUrl?: string;
      shots?: Array<{
        shotIndex: number;
        tileImageUrl?: string;
        prompt?: string;
      }>;
    }
  | {
      stage: "hd_shot_completed";
      provider?: string;
      taskId: string;
      shotIndex: number;
      imageUrl: string;
      prompt?: string;
    }
  | {
      stage: "hd_shot_failed";
      provider?: string;
      taskId: string;
      shotIndex: number;
      error?: string;
    }
  | {
      stage: "awaiting_confirmation";
      provider?: string;
      taskId: string;
      totalShots: number;
      gridType?: "grid_2x2" | "grid_3x2" | "grid_3x3";
      rows?: number;
      cols?: number;
      message?: string;
      shots?: Array<{
        shotIndex: number;
        tileImageUrl?: string;
        previewImageUrl?: string;
        prompt?: string;
      }>;
    }
  | {
      stage: "shot_completed";
      provider?: string;
      taskId: string;
      shotIndex: number;
      modelId?: string;
      videoUrl: string;
      text?: string;
    }
  | {
      stage: "shot_failed";
      provider?: string;
      taskId: string;
      shotIndex: number;
      error?: string;
    }
  | {
      stage: "completed";
      provider?: string;
      taskId: string;
      totalShots?: number;
      successCount?: number;
      failedCount?: number;
    }
  | {
      stage: "failed";
      provider?: string;
      taskId: string;
      error?: string;
    }
  | {
      stage: "shot_retry";
      provider?: string;
      taskId: string;
      shotIndex: number;
      attempt?: number;
      modelId?: string;
      error?: string;
    };

// 建议卡片数据 - 已移除
const SUGGESTIONS: { title: string; desc: string; image: string }[] = [];
const CANVAS_COMPOSER_PREFIX_DEFAULT = "让「FrameLoom」";
const CANVAS_COMPOSER_PREVIEW_TEXTS_DEFAULT = [
  "打造引人注目的社交媒体视觉",
  "帮我把这张产品图做成高级电商海报",
  "基于参考图延展 3 套同风格方案",
];

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

// 获取图片尺寸（保留原图分辨率 + 画布显示尺寸）
function getImageDimensions(url: string): Promise<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 限制最大尺寸，避免节点过大
      const maxSize = 500;
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      let width = originalWidth;
      let height = originalHeight;

      // 如果图片太大，按比例缩小
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // 设置最小尺寸
      const minSize = 150;
      if (width < minSize && height < minSize) {
        const scale = minSize / Math.min(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      resolve({ width, height, originalWidth, originalHeight });
    };
    img.onerror = () => {
      // 加载失败时使用默认尺寸
      resolve({ width: 300, height: 300, originalWidth: 0, originalHeight: 0 });
    };
    img.src = url;
  });
}

function buildPreviewImageUrl(url: string, width: number): string {
  return buildImageProxyUrl(url, {
    width,
    quality: 86,
    format: "webp",
  });
}

const CANVAS_IMAGE_ANALYSIS_TITLE = "图片分析";
const CANVAS_IMAGE_DONE_SUMMARY = "已完成本次生成，如需微调可继续告诉我。";
const CANVAS_AGENT_SECTION_TITLES = new Set([
  "意图分析",
  "任务规划",
  "需求理解",
  CANVAS_IMAGE_ANALYSIS_TITLE,
  "执行计划",
  "优化后提示词",
  "输出设置",
]);
const CANVAS_IMAGE_TASK_POLL_INTERVAL_MS = 1600;
const CANVAS_IMAGE_TASK_TIMEOUT_MS = 4 * 60 * 1000;
const CANVAS_GENERATION_NODE_GAP = 56;
const CANVAS_GENERATION_STACK_GAP = 28;
const CANVAS_GENERATION_COLLISION_GAP = 32;

function hashCanvasChatValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildCanvasMediaFallbackMessageId(chatId: string, urls: string[]) {
  const key = urls.map((url) => normalizeMediaUrl(url)).filter(Boolean).join("|");
  return `canvas-media-${chatId}-${hashCanvasChatValue(key || String(Date.now()))}`;
}

function buildCanvasMediaMarkdown(params: {
  imageUrls: string[];
  videoUrls: string[];
}) {
  return [
    ...params.imageUrls.map((url) => `![Generated Image](${url})`),
    ...params.videoUrls.map((url) => `[生成视频](${url})`),
  ].join("\n\n");
}

function isInternalCanvasImageGenerationFailureText(parts: Array<any>) {
  const text = parts
    .filter((part) => part?.type === "text" && typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (!text) return false;

  const normalized = stripCanvasModelRoutingLines(stripMediaMarkup(text)).trim();
  if (!normalized) return false;
  if (extractAssistantImageUrls(normalized).length > 0 || extractVideoUrls(normalized).length > 0) {
    return false;
  }

  return (
    /^(?:生成图片失败|图片生成失败)[，,：:\s]*(?:未找到图片数据|未解析到图片|模型未返回生成图片|图片数据不可用|未返回可用图片)?$/i.test(
      normalized
    ) ||
    (/未返回可用图片/i.test(normalized) &&
      /未找到图片数据|未解析到图片|模型未返回生成图片|图片数据不可用|模型响应未包含可用图片/i.test(
        normalized
      ))
  );
}

function findCanvasImageAnchorNode(
  nodes: CanvasNode[],
  params: {
    selectedNodes?: CanvasNode[];
    sourceImageUrls?: string[];
  } = {}
) {
  const sourceKeys = new Set(
    (params.sourceImageUrls || [])
      .map((url) => normalizeImageIdentityUrl(url))
      .filter(Boolean)
  );

  if (sourceKeys.size > 0) {
    const matchedNode = nodes.find((node) => {
      if (node.type !== "image") return false;
      const src = String((node.data as any)?.src || "").trim();
      return sourceKeys.has(normalizeImageIdentityUrl(src));
    });
    if (matchedNode) return matchedNode;
  }

  return params.selectedNodes?.find((node) => node.type === "image") || null;
}

function getAnchoredGenerationPosition(params: {
  anchorNode?: CanvasNode | null;
  existingNodes?: CanvasNode[];
  excludeNodeIds?: string[];
  size: { width: number; height: number };
  index?: number;
  fallbackNodeCount?: number;
  viewport?: { x: number; y: number; zoom: number };
}) {
  const index = params.index || 0;
  const anchorNode = params.anchorNode || null;
  const size = {
    width: Math.max(1, Number(params.size?.width || 300)),
    height: Math.max(1, Number(params.size?.height || 300)),
  };
  const excludedIds = new Set(params.excludeNodeIds || []);

  const overlapsExistingNode = (position: { x: number; y: number }) => {
    const padding = CANVAS_GENERATION_COLLISION_GAP;
    const left = position.x - padding;
    const top = position.y - padding;
    const right = position.x + size.width + padding;
    const bottom = position.y + size.height + padding;

    return (params.existingNodes || []).some((existingNode) => {
      if (!existingNode || excludedIds.has(existingNode.id)) return false;
      const nodeWidth = Math.max(1, Number(existingNode.size?.width || 300));
      const nodeHeight = Math.max(1, Number(existingNode.size?.height || 300));
      const nodeLeft = Number(existingNode.position?.x || 0);
      const nodeTop = Number(existingNode.position?.y || 0);
      const nodeRight = nodeLeft + nodeWidth;
      const nodeBottom = nodeTop + nodeHeight;

      return !(
        right <= nodeLeft ||
        left >= nodeRight ||
        bottom <= nodeTop ||
        top >= nodeBottom
      );
    });
  };

  const firstFreePosition = (candidates: Array<{ x: number; y: number }>) => {
    return candidates.find((candidate) => !overlapsExistingNode(candidate)) || null;
  };

  if (anchorNode) {
    const anchorWidth = Number(anchorNode.size?.width || 300);
    const anchorHeight = Number(anchorNode.size?.height || 300);
    const stackStep = Math.max(
      96,
      Math.min(size.height, anchorHeight) + CANVAS_GENERATION_STACK_GAP
    );
    const anchorLeft = Number(anchorNode.position?.x || 0);
    const anchorTop = Number(anchorNode.position?.y || 0);
    const anchorRight = anchorLeft + anchorWidth;
    const anchorBottom = anchorTop + anchorHeight;
    const gap = CANVAS_GENERATION_NODE_GAP;
    const preferred = [
      {
        x: anchorRight + gap,
        y: anchorTop + index * stackStep,
      },
      {
        x: anchorLeft - size.width - gap,
        y: anchorTop + index * stackStep,
      },
      {
        x: anchorLeft + index * (size.width + CANVAS_GENERATION_STACK_GAP),
        y: anchorBottom + gap,
      },
      {
        x: anchorLeft + index * (size.width + CANVAS_GENERATION_STACK_GAP),
        y: anchorTop - size.height - gap,
      },
    ];
    const preferredFree = firstFreePosition(preferred);
    if (preferredFree) return preferredFree;

    const horizontalStep = size.width + gap;
    const verticalStep = size.height + gap;
    const spiralCandidates: Array<{ x: number; y: number }> = [];
    for (let ring = 1; ring <= 10; ring += 1) {
      const rightX = anchorRight + gap + (ring - 1) * horizontalStep;
      const leftX = anchorLeft - size.width - gap - (ring - 1) * horizontalStep;
      const downY = anchorBottom + gap + (ring - 1) * verticalStep;
      const upY = anchorTop - size.height - gap - (ring - 1) * verticalStep;

      spiralCandidates.push(
        { x: rightX, y: anchorTop },
        { x: leftX, y: anchorTop },
        { x: anchorLeft, y: downY },
        { x: anchorLeft, y: upY },
        { x: rightX, y: downY },
        { x: rightX, y: upY },
        { x: leftX, y: downY },
        { x: leftX, y: upY }
      );
    }
    const spiralFree = firstFreePosition(spiralCandidates);
    if (spiralFree) return spiralFree;

    return preferred[0]!;
  }

  const viewport = params.viewport || { x: 0, y: 0, zoom: 1 };
  const zoom = Math.max(0.1, viewport.zoom || 1);
  if (typeof window !== "undefined") {
    const centerPosition = {
      x:
        (-viewport.x + window.innerWidth * 0.52) / zoom -
        size.width / 2 +
        index * 28,
      y:
        (-viewport.y + window.innerHeight * 0.46) / zoom -
        size.height / 2 +
        index * 28,
    };
    if (!overlapsExistingNode(centerPosition)) return centerPosition;
  }

  const fallbackNodeCount = params.fallbackNodeCount || 0;
  const fallbackBase = {
    x:
      100 +
      (fallbackNodeCount % 3) *
        (size.width + CANVAS_GENERATION_COLLISION_GAP),
    y:
      100 +
      Math.floor(fallbackNodeCount / 3) *
        (size.height + CANVAS_GENERATION_COLLISION_GAP),
  };
  if (!overlapsExistingNode(fallbackBase)) return fallbackBase;

  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const candidate = {
        x: 100 + col * (size.width + CANVAS_GENERATION_COLLISION_GAP),
        y: 100 + row * (size.height + CANVAS_GENERATION_COLLISION_GAP),
      };
      if (!overlapsExistingNode(candidate)) return candidate;
    }
  }

  return fallbackBase;
}

type CanvasImageGenerationRequest = {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  imageCount?: number;
  negativePrompt?: string;
  referenceImage?: string;
  referenceImages?: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const CANVAS_BRAND_VI_PLACEHOLDER_IMAGE_COUNT = 10;

const CANVAS_CHINESE_IMAGE_COUNT_MAP: Record<string, number> = {
  一: 1,
  两: 2,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function normalizeCanvasImageCount(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(12, Math.round(numeric)));
}

function getLatestCanvasUserPrompt(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const text = extractUserTextPrompt(message).trim();
    if (text) return text;
  }
  return "";
}

function getCanvasAppendMessageText(messageData: any) {
  const parts = Array.isArray(messageData?.parts) ? messageData.parts : [];
  return parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => String(part.text))
    .join("\n")
    .trim();
}

function inferCanvasImageGenerationCountFromText(...values: string[]) {
  const text = values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
  if (!text) return null;

  if (
    /品牌\s*VI|品牌VI|VI\s*设计|vi\s*设计/i.test(text) &&
    /(包装|物料|样机|全品类|配色|Logo|logo|视觉延展|规范)/i.test(text)
  ) {
    return CANVAS_BRAND_VI_PLACEHOLDER_IMAGE_COUNT;
  }

  if (/九宫格|9\s*宫格|九\s*张|9\s*张/.test(text)) return 9;

  const counts: number[] = [];
  const arabicPattern = /(?:^|[^\d])([1-9]|1[0-2])\s*(?:张|幅|组|套|个图|宫格)/g;
  let arabicMatch: RegExpExecArray | null;
  while ((arabicMatch = arabicPattern.exec(text)) !== null) {
    const count = normalizeCanvasImageCount(arabicMatch[1]);
    if (count) counts.push(count);
  }

  const chinesePattern = /([一两二三四五六七八九十])\s*(?:张|幅|组|套|个图|宫格)/g;
  let chineseMatch: RegExpExecArray | null;
  while ((chineseMatch = chinesePattern.exec(text)) !== null) {
    const count = normalizeCanvasImageCount(
      CANVAS_CHINESE_IMAGE_COUNT_MAP[chineseMatch[1] || ""]
    );
    if (count) counts.push(count);
  }

  if (counts.length > 0) return Math.max(...counts);
  if (/(多图|多张|一组|整套|系列|全套|多个方案)/.test(text)) return 4;
  return null;
}

const CANVAS_CHAT_MESSAGE_SNAPSHOT_PREFIX = "astra:canvas-chat-messages:";
const CANVAS_CHAT_MESSAGE_SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const CANVAS_CHAT_MESSAGE_SNAPSHOT_MAX_MESSAGES = 80;

function getCanvasChatMessageSnapshotKey(chatSessionId: string) {
  const rawChatId = toRawCanvasChatId(chatSessionId) || chatSessionId;
  return `${CANVAS_CHAT_MESSAGE_SNAPSHOT_PREFIX}${rawChatId}`;
}

function sanitizeCanvasMessageSnapshot(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is ChatMessage => {
      const record = message as Record<string, unknown>;
      const role = String(record?.role || "");
      return Boolean(record?.id) && (role === "user" || role === "assistant");
    })
    .slice(-CANVAS_CHAT_MESSAGE_SNAPSHOT_MAX_MESSAGES);
}

function readCanvasChatMessageSnapshot(chatSessionId: string): ChatMessage[] {
  if (typeof window === "undefined" || !chatSessionId) return [];
  try {
    const raw = window.sessionStorage.getItem(
      getCanvasChatMessageSnapshotKey(chatSessionId)
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      messages?: unknown;
    };
    const savedAt = Number(parsed?.savedAt || 0);
    if (
      !Number.isFinite(savedAt) ||
      Date.now() - savedAt > CANVAS_CHAT_MESSAGE_SNAPSHOT_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(getCanvasChatMessageSnapshotKey(chatSessionId));
      return [];
    }
    return sanitizeCanvasMessageSnapshot(parsed?.messages);
  } catch {
    return [];
  }
}

function writeCanvasChatMessageSnapshot(
  chatSessionId: string,
  messages: ChatMessage[]
) {
  if (typeof window === "undefined" || !chatSessionId || messages.length === 0) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      getCanvasChatMessageSnapshotKey(chatSessionId),
      JSON.stringify({
        savedAt: Date.now(),
        messages: sanitizeCanvasMessageSnapshot(messages),
      })
    );
  } catch {
    // Best-effort reload recovery only.
  }
}

async function requestCanvasImageGeneration(
  payload: CanvasImageGenerationRequest
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
    dispatchProviderApiKeyPromptFromError(createResult);
    throw new Error(createResult?.error || "创建生图任务失败");
  }

  if (Array.isArray(createResult?.data?.images) && createResult.data.images.length > 0) {
    return { images: createResult.data.images };
  }

  const taskId = String(createResult?.taskId || "").trim();
  if (!taskId) {
    throw new Error("创建生图任务失败：未返回任务ID");
  }

  const deadline = Date.now() + CANVAS_IMAGE_TASK_TIMEOUT_MS;
  let lastError = "";

  while (Date.now() < deadline) {
    await sleep(CANVAS_IMAGE_TASK_POLL_INTERVAL_MS);

    const statusResponse = await apiFetch(
      `/api/canvas/generate/image?taskId=${encodeURIComponent(taskId)}`,
      { cache: "no-store" }
    );
    const statusResult = await statusResponse.json().catch(() => ({}));

    if (!statusResponse.ok || !statusResult?.success) {
      dispatchProviderApiKeyPromptFromError(statusResult);
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
      dispatchProviderApiKeyPromptFromError(task);
      throw new Error(String(task?.error || "图片生成失败"));
    }
  }

  throw new Error(lastError || "图片生成超时，请稍后重试");
}

type CanvasAnalysisSection = {
  before: string;
  analysis: string;
  after: string;
};

type CanvasTypewriterTextProps = {
  text: string;
  typingKey: string;
  enabled: boolean;
  className?: string;
  renderMarkdown?: boolean;
  onActiveChange?: (typingKey: string, active: boolean) => void;
  onComplete?: (typingKey: string) => void;
};

const CANVAS_TYPEWRITER_BASE_DELAY_MS = 36;
const CANVAS_TYPEWRITER_PUNCTUATION_DELAY_MS = 72;
const CANVAS_TYPEWRITER_LINE_BREAK_DELAY_MS = 120;

function getCanvasTypewriterDelay(unit: string) {
  if (unit === "\n") return CANVAS_TYPEWRITER_LINE_BREAK_DELAY_MS;
  if (/[\u3002\uff01\uff1f\uff1b\uff1a.!?;:]/.test(unit)) {
    return CANVAS_TYPEWRITER_PUNCTUATION_DELAY_MS;
  }
  if (/[\uff0c\u3001,]/.test(unit)) {
    return Math.round(CANVAS_TYPEWRITER_PUNCTUATION_DELAY_MS * 0.72);
  }
  return CANVAS_TYPEWRITER_BASE_DELAY_MS;
}

function CanvasTypewriterText({
  text,
  typingKey,
  enabled,
  className,
  renderMarkdown = false,
  onActiveChange,
  onComplete,
}: CanvasTypewriterTextProps) {
  const content = String(text || "");
  const [displayText, setDisplayText] = useState(enabled ? "" : content);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!enabled || !content) {
      setDisplayText(content);
      if (activeRef.current) {
        activeRef.current = false;
        onActiveChange?.(typingKey, false);
      }
      return;
    }

    let cursor = 0;
    let timer: number | null = null;
    const units = Array.from(content);
    activeRef.current = true;
    onActiveChange?.(typingKey, true);
    setDisplayText("");

    const tick = () => {
      cursor += 1;
      if (cursor >= units.length) {
        setDisplayText(content);
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (activeRef.current) {
          activeRef.current = false;
          onActiveChange?.(typingKey, false);
        }
        onComplete?.(typingKey);
        return;
      }
      setDisplayText(units.slice(0, cursor).join(""));
      timer = window.setTimeout(tick, getCanvasTypewriterDelay(units[cursor - 1] || ""));
    };

    timer = window.setTimeout(tick, CANVAS_TYPEWRITER_BASE_DELAY_MS);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      if (activeRef.current) {
        activeRef.current = false;
        onActiveChange?.(typingKey, false);
      }
    };
  }, [content, enabled, onActiveChange, onComplete, typingKey]);

  if (renderMarkdown) {
    return <Response className={className}>{displayText}</Response>;
  }

  return <div className={className}>{displayText}</div>;
}

function normalizeCanvasAgentText(value: string): string {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasCanvasRenderableMarkdown(value: string): boolean {
  const text = String(value || "");
  if (!text) return false;

  return (
    /(^|\n)\s*#{1,6}\s+/.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /(^|\n)\s*[-*+]\s+/.test(text) ||
    /(^|\n)\s*\d+\.\s+/.test(text) ||
    /\[[^\]]+\]\([^)]+\)/.test(text)
  );
}

function normalizeCanvasSectionTitle(line: string): string {
  let normalized = line.trim();
  if (!normalized) return "";

  normalized = normalized
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^\[(.+)\]$/, "$1")
    .replace(/^【(.+)】$/, "$1")
    .replace(/[：:]+$/, "")
    .trim();

  return normalized;
}

function shouldSplitCanvasAnalysisAfterLine(line: string): boolean {
  const normalized = String(line || "")
    .replace(/^[-*]\s*/, "")
    .trim();
  if (!normalized) return false;

  if (
    /^(现在我将|接下来|下一步|我将|现在开始|下面我|随后|Then\b|Next\b|Now\b)/i.test(
      normalized
    )
  ) {
    return true;
  }

  // 模型徽标行（例如：◈ Nano Banana Pro）
  return /^[◈◇◆🔹⬡✦•·]\s*[^\n]+$/i.test(normalized);
}

function extractCanvasImageAnalysisSection(content: string): CanvasAnalysisSection | null {
  const lines = String(content || "").split(/\r?\n/);
  let startIndex = -1;
  let inlineAnalysis = "";

  for (let i = 0; i < lines.length; i += 1) {
    const title = normalizeCanvasSectionTitle(lines[i]);
    if (!title || !title.startsWith(CANVAS_IMAGE_ANALYSIS_TITLE)) continue;

    startIndex = i;
    const headingText = lines[i]
      .trim()
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/^\[(.+)\]$/, "$1")
      .replace(/^【(.+)】$/, "$1")
      .trim();
    const inlineMatch = headingText.match(/^图片分析[：:]\s*(.+)$/);
    if (inlineMatch?.[1]) {
      inlineAnalysis = inlineMatch[1].trim();
    }
    break;
  }

  if (startIndex < 0) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (shouldSplitCanvasAnalysisAfterLine(lines[i])) {
      endIndex = i;
      break;
    }
    const title = normalizeCanvasSectionTitle(lines[i]);
    if (!title || title.startsWith(CANVAS_IMAGE_ANALYSIS_TITLE)) continue;
    if (CANVAS_AGENT_SECTION_TITLES.has(title)) {
      endIndex = i;
      break;
    }
  }

  const analysisLines = lines.slice(startIndex + 1, endIndex);
  if (inlineAnalysis) {
    analysisLines.unshift(inlineAnalysis);
  }

  const analysis = normalizeCanvasAgentText(analysisLines.join("\n"));
  if (!analysis) return null;

  return {
    before: normalizeCanvasAgentText(lines.slice(0, startIndex).join("\n")),
    analysis,
    after: normalizeCanvasAgentText(lines.slice(endIndex).join("\n")),
  };
}

function normalizeVideoParamsForProvider(
  params: Partial<VideoGenerationParams> | null | undefined,
  providerType?: string,
  capability?: VideoToolCapabilityContract | null
): VideoGenerationParams {
  if (capability) {
    const modeOptions = capability.modeOptions || [];
    const modeSet = new Set(modeOptions.map((item) => item.mode));
    const fallbackMode = capability.defaults?.mode || modeOptions[0]?.mode || "text-to-video";

    const merged = {
      mode: fallbackMode,
      resolution: (capability.defaults?.resolution || "720p") as VideoGenerationParams["resolution"],
      ratio: (capability.defaults?.ratio || "16:9") as VideoGenerationParams["ratio"],
      duration: Number(capability.defaults?.duration) || 5,
      generateAudio: capability.defaults?.generateAudio ?? false,
      watermark: false,
      cameraFixed: false,
      cameraMove: "none" as VideoGenerationParams["cameraMove"],
      fps: capability.defaults?.fps || 24,
      ...(params || {}),
    } as VideoGenerationParams;

    if (!modeSet.has(merged.mode)) {
      merged.mode = fallbackMode as VideoGenerationParams["mode"];
    }

    const scopedOptions = getVideoToolOptionsForMode(capability, merged.mode);
    const ratioOptions = scopedOptions.ratioOptions || [];
    const durationOptions = scopedOptions.durationOptions || [];
    const resolutionOptions = scopedOptions.resolutionOptions || [];
    const ratioSet = new Set(ratioOptions);
    const durationSet = new Set(durationOptions);
    const resolutionSet = new Set(resolutionOptions);
    const fallbackRatio =
      scopedOptions.defaults?.ratio || ratioOptions[0] || capability.defaults?.ratio || "16:9";
    const fallbackDuration =
      Number(scopedOptions.defaults?.duration) ||
      durationOptions[0] ||
      Number(capability.defaults?.duration) ||
      5;
    const fallbackResolution =
      scopedOptions.defaults?.resolution ||
      resolutionOptions[0] ||
      capability.defaults?.resolution ||
      "720p";

    if (!ratioSet.has(merged.ratio)) {
      merged.ratio = fallbackRatio as VideoGenerationParams["ratio"];
    }
    if (!durationSet.has(Number(merged.duration))) {
      merged.duration = fallbackDuration;
    } else {
      merged.duration = Number(merged.duration) || fallbackDuration;
    }
    if (resolutionOptions.length > 0 && !resolutionSet.has(merged.resolution)) {
      merged.resolution = fallbackResolution as VideoGenerationParams["resolution"];
    } else if (resolutionOptions.length === 0) {
      merged.resolution = fallbackResolution as VideoGenerationParams["resolution"];
    }
    if (!capability.ui.showGenerateAudio) {
      merged.generateAudio = false;
    }
    if (!capability.ui.showFps) {
      merged.fps = capability.defaults?.fps || 24;
    }
    if (!capability.ui.showCameraMove) {
      merged.cameraMove = "none";
      merged.cameraFixed = false;
    }
    if (!capability.ui.showReturnLastFrame) {
      merged.returnLastFrame = false;
    }
    if (!capability.ui.showSeed) {
      merged.seed = undefined;
    }
    return merged;
  }

  const isFalVideo = providerType === "fal-video";
  const isRuxaVideo = providerType === "ruxa-video";
  const base: VideoGenerationParams = {
    mode: isFalVideo || isRuxaVideo ? "first-frame" : "text-to-video",
    resolution: "720p",
    ratio: "16:9",
    duration: 5,
    generateAudio: true,
    watermark: false,
    cameraFixed: false,
    cameraMove: "none",
    fps: 24,
  };
  const merged = { ...base, ...(params || {}) };

  if (isFalVideo) {
    if (merged.mode !== "first-frame" && merged.mode !== "first-last-frame") {
      merged.mode = "first-frame";
    }
    if (!["16:9", "9:16", "1:1"].includes(merged.ratio)) {
      merged.ratio = "16:9";
    }
    merged.duration = Math.max(3, Math.min(15, Math.round(Number(merged.duration) || 5)));
    merged.generateAudio = merged.generateAudio ?? true;
    return merged;
  }

  if (isRuxaVideo) {
    merged.mode = "first-frame";
    if (!["16:9", "9:16", "1:1"].includes(merged.ratio)) {
      merged.ratio = "16:9";
    }
    merged.duration = merged.duration >= 8 ? 10 : 5;
    merged.generateAudio = false;
    merged.cameraMove = "none";
    merged.cameraFixed = false;
    merged.fps = 24;
    return merged;
  }

  if (!["text-to-video", "first-frame", "first-last-frame", "reference-images"].includes(merged.mode)) {
    merged.mode = "text-to-video";
  }
  if (!["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].includes(merged.ratio)) {
    merged.ratio = "16:9";
  }
  merged.duration = merged.duration >= 8 ? 10 : 5;
  return merged;
}

function getVideoImageLimit(
  params: VideoGenerationParams | null | undefined,
  providerType?: string,
  capability?: VideoToolCapabilityContract | null
): { min: number; max: number } {
  if (!params) {
    return { min: 0, max: 0 };
  }
  if (capability?.modeOptions?.length) {
    const modeOption = capability.modeOptions.find((item) => item.mode === params.mode);
    if (modeOption) {
      return { min: modeOption.imageMin, max: modeOption.imageMax };
    }
  }
  const isFalVideo = providerType === "fal-video";
  const isRuxaVideo = providerType === "ruxa-video";
  if (isRuxaVideo) {
    return { min: 1, max: 1 };
  }
  if (isFalVideo) {
    if (params.mode === "first-last-frame") {
      return { min: 2, max: 2 };
    }
    return { min: 1, max: 1 };
  }

  switch (params.mode) {
    case "text-to-video":
      return { min: 0, max: 0 };
    case "first-last-frame":
      return { min: 2, max: 2 };
    case "first-frame":
      return { min: 1, max: 1 };
    case "reference-images":
      return { min: 1, max: 4 };
    default:
      return { min: 0, max: 0 };
  }
}

type MessageVote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

interface CanvasChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

type CopiedUserMessagePayload = {
  text: string;
  attachments: PickedObjectAttachment[];
  createdAt: number;
};

type ComposerUploadedImage = {
  imageUrl: string;
  name: string;
  contentType: string;
  assetId?: string;
  width?: number;
  height?: number;
};

const COPIED_USER_MESSAGE_TTL_MS = 10 * 60 * 1000;

function getComposerPlainTextFromElement(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-attachment-url]").forEach((el) => el.remove());
  return (clone.textContent || "")
    .replace(/\u200b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyVideoAttachment(url: string, contentType: string) {
  return (
    contentType.startsWith("video/") ||
    /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(url)
  );
}

function buildCopiedMessageAttachment(
  value: any,
  fallbackName: string
): PickedObjectAttachment | null {
  const rawUrl =
    typeof value?.url === "string" && value.url.trim()
      ? value.url.trim()
      : typeof value?.data === "string" && value.data.trim()
        ? value.data.trim()
        : "";
  if (!isValidChatHttpUrl(rawUrl)) return null;

  const contentType = normalizeChatMediaType(
    value?.contentType || value?.mediaType || value?.mimeType
  );
  if (isLikelyVideoAttachment(rawUrl, contentType)) return null;

  const width = Number(value?.width);
  const height = Number(value?.height);
  return sanitizeChatAttachment({
    url: rawUrl,
    name: normalizeChatAttachmentName(value?.name || fallbackName),
    contentType,
    assetId:
      typeof value?.assetId === "string" && value.assetId.trim()
        ? value.assetId.trim()
        : undefined,
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : undefined,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : undefined,
    pickedObject: value?.pickedObject,
  } as PickedObjectAttachment);
}

function getUserMessageCopyPayload(message: ChatMessage): Omit<CopiedUserMessagePayload, "createdAt"> {
  const text = extractUserTextPrompt(message);
  const attachments: PickedObjectAttachment[] = [];
  const seenUrls = new Set<string>();

  const appendAttachment = (attachment: PickedObjectAttachment | null) => {
    if (!attachment || seenUrls.has(attachment.url)) return;
    seenUrls.add(attachment.url);
    attachments.push(attachment);
  };

  ((message as any).parts || []).forEach((part: any, index: number) => {
    if (!part || part.type === "text") return;
    appendAttachment(
      buildCopiedMessageAttachment(part, part?.name || `图片${index + 1}`)
    );
  });

  (((message as any).attachments || []) as any[]).forEach((attachment, index) => {
    appendAttachment(
      buildCopiedMessageAttachment(attachment, attachment?.name || `图片${index + 1}`)
    );
  });

  return { text, attachments };
}

function getAssistantMessageCopyText(message: ChatMessage) {
  const text = ((message as any).parts || [])
    .filter((part: any) => part?.type === "text")
    .map((part: any) => String(part.text || ""))
    .join("\n")
    .trim();
  const fallbackText =
    typeof (message as any).content === "string" ? String((message as any).content) : "";
  return stripCanvasModelRoutingLines(stripMediaMarkup(text || fallbackText)).trim();
}

async function writeTextToClipboard(text: string) {
  const value = text || " ";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") return;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CanvasChatPanel({
  chatId,
  initialMessages = [],
  onClose,
  onOpenFileList,
  selectedAgentPresetId,
  chatScope = "canvas",
  workflowContext = null,
  presentation = "panel",
  agentEnabled = true,
  workspaceVariant = "canvas",
  panelTone = "auto",
  canvasToolbarConfig: rawCanvasToolbarConfig,
  isExpanded = false,
  onToggleExpand,
}: CanvasChatPanelProps) {
  const isWorkspacePresentation = presentation === "workspace";
  const isVideoWorkspace = workspaceVariant === "video";
  const forceLightPanelTone = panelTone === "light";
  const forceDarkPanelTone = panelTone === "dark";
  const propCanvasToolbarConfig = useMemo(
    () => normalizeCanvasToolbarConfig(rawCanvasToolbarConfig),
    [rawCanvasToolbarConfig]
  );
  const effectiveAgentEnabled = agentEnabled && !isVideoWorkspace;
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PickedObjectAttachment[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    effectiveAgentEnabled ? "auto" : ""
  );
  const [isDetailGenerationMode, setIsDetailGenerationMode] = useState(false);
  const [detailGenerationMode, setDetailGenerationMode] = useState<DetailGenerationMode>("classic");
  const [isDetailGenerating, setIsDetailGenerating] = useState(false);
  const [detailSections, setDetailSections] = useState<Record<DetailSectionKey, boolean>>({
    required: true,
    strategy: false,
    assets: true,
    archives: true,
  });
  const [isDetailWorkbenchCollapsed, setIsDetailWorkbenchCollapsed] = useState(true);
  const [detailProgress, setDetailProgress] = useState<{
    status: "idle" | "running" | "done" | "error";
    stage: string;
    current: number;
    total: number;
  }>({
    status: "idle",
    stage: "",
    current: 0,
    total: 0,
  });
  const [detailUiValidation, setDetailUiValidation] = useState<{
    plan: DetailUiValidationSnapshot | null;
    latestScreen: DetailUiReviewSnapshot | null;
  }>({
    plan: null,
    latestScreen: null,
  });
  const [detailSurfaceSnapshot, setDetailSurfaceSnapshot] = useState<UiSurfaceSnapshot | null>(
    null,
  );
  const [detailSlots, setDetailSlots] = useState<Array<PickedObjectAttachment | null>>(
    () => DETAIL_SLOT_CONFIGS.map(() => null)
  );
  const [detailSlotUploading, setDetailSlotUploading] = useState<number | null>(null);
  const [detailSlotPickerIndex, setDetailSlotPickerIndex] = useState<number | null>(null);
  const [detailArchives, setDetailArchives] = useState<DetailArchive[]>([]);
  const [deletingDetailArchiveId, setDeletingDetailArchiveId] = useState<string | null>(null);
  const [detailBrief, setDetailBrief] = useState<DetailBriefForm>({
    productSpu: "",
    demandType: "",
    productName: "",
    targetAudience: "",
    mainUser: "",
    usageScenario: "",
    triggerMoment: "",
    coreNeed: "",
    riskConcern: "",
    expectedResult: "",
    coreSellingPoint: "",
    positioningStatement: "",
    userVoice: "",
    competitorReference: "",
    priceBand: "",
    brandTone: "",
    bannedWords: "",
  });
  const [detailModeMessageStartIndex, setDetailModeMessageStartIndex] = useState(0);
  const canvasId = useMemo(() => toRawCanvasChatId(chatId), [chatId]);
  const [activeChatId, setActiveChatId] = useState<string>(chatId);
  const activeChatIdRef = useRef<string>(chatId);
  const inFlightChatIdRef = useRef<string | null>(null);
  const inFlightRawChatIdRef = useRef<string | null>(null);
  const inFlightUserMessageIdRef = useRef<string | null>(null);
  const pendingPersistenceMessageIdsRef = useRef<Set<string>>(new Set());
  const [chatSessions, setChatSessions] = useState<CanvasChatSession[]>([]);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isComposerModeMenuOpen, setIsComposerModeMenuOpen] = useState(false);
  const [selectedSkillTagId, setSelectedSkillTagId] = useState<string | null>(null);
  const [messageViewportKey, setMessageViewportKey] = useState(0);
  const visibleMessagesRef = useRef<ChatMessage[]>([]);
  const visibleMessagesChatIdRef = useRef<string>(chatId);
  const lastNonEmptyMessagesByChatIdRef = useRef<Record<string, ChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoSlotInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const agentSlotInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const detailSlotInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const detailModeSwitchRef = useRef(false);
  const hiddenPromptRef = useRef<string | null>(null);
  const autoContextRef = useRef<string | null>(null);
  const contextPayloadRef = useRef<any>(null);
  const lastWorkflowAutofillSignatureRef = useRef<string | null>(null);
  const lastWorkflowAutofillUrlsRef = useRef<string[]>([]);
  const pendingLaunchRef = useRef<CanvasLaunchPayload | null>(null);
  const copiedUserMessageRef = useRef<CopiedUserMessagePayload | null>(null);
  const [launchAutoSendTick, setLaunchAutoSendTick] = useState(0);
  const hasInitializedChatStateRef = useRef(false);
  const hasInitializedVideoWorkspaceRef = useRef(false);
  const sessionMenuRef = useRef<HTMLDivElement>(null);
  const historyScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceHistoryHydrationRef = useRef<string | null>(null);

  // 🆕 标签悬停预览状态
  const [tagPreview, setTagPreview] = useState<TagPreviewInfo | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fullscreenPreview, setFullscreenPreview] = useState<{
    url: string;
    alt?: string;
  } | null>(null);
  const fullscreenPreviewSrc = useMemo(() => {
    if (!fullscreenPreview?.url) return "";
    const originalUrl = inferOriginalImageUrl(fullscreenPreview.url);
    return buildImageProxyUrl(originalUrl || fullscreenPreview.url, {
      delivery: "proxy",
      width: 2400,
      quality: 90,
      format: "webp",
    });
  }, [fullscreenPreview]);

  // 🆕 图片参数状态
  const [imageParams, setImageParams] = useState<ImageGenerationParams>({
    aspectRatio: "auto",
    imageSize: "2K",
    imageCount: 1,
  });
  const [videoParams, setVideoParams] = useState<VideoGenerationParams | null>(null);
  const [videoSlotUploading, setVideoSlotUploading] = useState<number | null>(null);
  const [agentSlotUploading, setAgentSlotUploading] = useState<number | null>(null);
  const [lastImageModelId, setLastImageModelId] = useState<string | null>(null);
  const [lastVideoModelId, setLastVideoModelId] = useState<string | null>(null);
  const [lastConversationModelId, setLastConversationModelId] = useState<string | null>(null);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [analysisCollapseState, setAnalysisCollapseState] = useState<Record<string, boolean>>({});
  const [typedAssistantSections, setTypedAssistantSections] = useState<Record<string, boolean>>({});
  const [activeTypingSections, setActiveTypingSections] = useState<Record<string, boolean>>({});
  const [insufficientPointsState, setInsufficientPointsState] = useState<{
    balance: number;
    expectedCost: number;
    unitCost: number;
    imageCount: number;
  } | null>(null);
  const [streamImageGenerationStateByChatId, setStreamImageGenerationStateByChatId] =
    useState<Record<string, ImageGenerationStatusStreamPayload | null>>({});
  const canvasGenerationPlaceholderByChatIdRef = useRef<Record<string, string[]>>({});
  const streamImageGenerationState = useMemo(
    () => streamImageGenerationStateByChatId[activeChatId] || null,
    [activeChatId, streamImageGenerationStateByChatId]
  );
  const [agentTargetLockStateByChatId, setAgentTargetLockStateByChatId] =
    useState<Record<string, AgentTargetLockStreamPayload | null>>({});
  const activeAgentTargetLock = useMemo(
    () => agentTargetLockStateByChatId[activeChatId] || null,
    [activeChatId, agentTargetLockStateByChatId]
  );
  const [agentProgressStateByChatId, setAgentProgressStateByChatId] =
    useState<Record<string, AgentProgressStreamPayload | null>>({});
  const activeAgentProgress = useMemo(
    () => agentProgressStateByChatId[activeChatId] || null,
    [activeChatId, agentProgressStateByChatId]
  );
  const imageParamsRef = useRef(imageParams);
  const videoParamsRef = useRef(videoParams);
  const deepThinkingEnabledRef = useRef(deepThinkingEnabled);
  const imageAutoTitleCacheRef = useRef<Map<string, string>>(new Map());
  const sendGuardRef = useRef<Record<string, {
    inFlight: boolean;
    signature: string;
    timestamp: number;
  }>>({});
  const storyboardNodeMapRef = useRef<Record<string, Record<number, string>>>({});
  const getSendGuard = useCallback((chatSessionId: string) => {
    return (
      sendGuardRef.current[chatSessionId] || {
        inFlight: false,
        signature: "",
        timestamp: 0,
      }
    );
  }, []);

  const setSendGuard = useCallback(
    (
      chatSessionId: string,
      next: {
        inFlight: boolean;
        signature: string;
        timestamp: number;
      }
    ) => {
      sendGuardRef.current[chatSessionId] = next;
    },
    []
  );

  const releaseSendGuard = useCallback(
    (chatSessionId: string) => {
      sendGuardRef.current[chatSessionId] = {
        ...getSendGuard(chatSessionId),
        inFlight: false,
      };
    },
    [getSendGuard]
  );

  const setStreamImageGenerationStateForChat = useCallback(
    (chatSessionId: string, next: ImageGenerationStatusStreamPayload | null) => {
      setStreamImageGenerationStateByChatId((prev) => ({
        ...prev,
        [chatSessionId]: next,
      }));
    },
    []
  );

  const clearStreamImageGenerationStateForChat = useCallback((chatSessionId: string) => {
    setStreamImageGenerationStateByChatId((prev) => {
      if (!(chatSessionId in prev)) return prev;
      const next = { ...prev };
      delete next[chatSessionId];
      return next;
    });
  }, []);

  const setAgentProgressStateForChat = useCallback(
    (chatSessionId: string, next: AgentProgressStreamPayload | null) => {
      setAgentProgressStateByChatId((prev) => ({
        ...prev,
        [chatSessionId]: next,
      }));
    },
    []
  );

  const clearAgentProgressStateForChat = useCallback((chatSessionId: string) => {
    setAgentProgressStateByChatId((prev) => {
      if (!(chatSessionId in prev)) return prev;
      const next = { ...prev };
      delete next[chatSessionId];
      return next;
    });
  }, []);

  const shouldBlockDuplicateSend = useCallback((chatSessionId: string, signature: string) => {
    const now = Date.now();
    const previous = getSendGuard(chatSessionId);
    return (
      previous.signature === signature &&
      now - previous.timestamp < 4500
    );
  }, [getSendGuard]);

  const handleTypewriterActiveChange = useCallback((typingKey: string, active: boolean) => {
    setActiveTypingSections((prev) => {
      if (active) {
        if (prev[typingKey]) return prev;
        return { ...prev, [typingKey]: true };
      }
      if (!prev[typingKey]) return prev;
      const next = { ...prev };
      delete next[typingKey];
      return next;
    });
  }, []);

  const handleTypewriterComplete = useCallback((typingKey: string) => {
    setTypedAssistantSections((prev) =>
      prev[typingKey] ? prev : { ...prev, [typingKey]: true }
    );
  }, []);

  const autoNameGeneratedImageNode = useCallback(
    async (nodeId: string, imageUrl: string) => {
      if (!nodeId || !imageUrl) return;

      const normalizeAutoTitle = (rawTitle: string) => {
        const compact = String(rawTitle || "").replace(/\s+/g, "").trim();
        if (!compact || compact === "新画布" || compact === "未命名画布" || compact.includes("画布")) {
          return "图片";
        }
        return compact.slice(0, 12);
      };

      const applyNodeTitle = (title: string) => {
        const storeState = useCanvasStore.getState();
        const currentNode = storeState.getNode(nodeId);
        if (!currentNode) return;
        const currentData = ((currentNode.data as any) || {}) as Record<string, any>;
        storeState.updateNode(nodeId, {
          data: {
            ...currentData,
            title,
            metadata: {
              ...(currentData.metadata || {}),
              autoTitle: title,
            },
          },
        } as any);
      };

      const cachedTitle = imageAutoTitleCacheRef.current.get(imageUrl);
      if (cachedTitle) {
        applyNodeTitle(cachedTitle);
        return;
      }

      try {
        const response = await apiFetch('/api/canvas/auto-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        const data = await response.json().catch(() => ({}));
        const title = normalizeAutoTitle(String(data?.title || ""));
        imageAutoTitleCacheRef.current.set(imageUrl, title);
        applyNodeTitle(title);
      } catch (error) {
        console.warn('[CanvasChat] 自动命名图片失败:', error);
        applyNodeTitle("图片");
      }
    },
    [],
  );

  // 🆕 保存图片参数到 localStorage
  const handleImageParamsChange = (params: ImageGenerationParams) => {
    setImageParams(params);
    imageParamsRef.current = params;
    try {
      localStorage.setItem("canvas-image-params", JSON.stringify(params));
    } catch (e) {
      console.error("Failed to save image params:", e);
    }
  };

  // 加载图片参数
  useEffect(() => {
    try {
      const saved = localStorage.getItem("canvas-image-params");
      if (saved) {
        const parsed = JSON.parse(saved);
        setImageParams((prev) => {
          const next = { ...prev, ...parsed };
          imageParamsRef.current = next;
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to load image params:", e);
    }
  }, []);

  const handleVideoParamsChange = (params: VideoGenerationParams) => {
    setVideoParams(params);
    videoParamsRef.current = params;
    try {
      localStorage.setItem("canvas-video-params", JSON.stringify(params));
    } catch (e) {
      console.error("Failed to save video params:", e);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("canvas-video-params");
      if (saved) {
        const parsed = JSON.parse(saved);
        setVideoParams(parsed);
        videoParamsRef.current = parsed;
      }
    } catch (e) {
      console.error("Failed to load video params:", e);
    }
  }, []);

  useEffect(() => {
    if (!fullscreenPreview) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenPreview(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fullscreenPreview]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    setTypedAssistantSections({});
    setActiveTypingSections({});
    setSelectedSkillTagId(null);
  }, [activeChatId]);

  useEffect(() => {
    const now = Date.now();
    let rootChatId = chatId;

    if (chatScope === "agent") {
      try {
        const rootKey = getSessionRootStorageKey(canvasId, chatScope);
        const savedRootChatId = localStorage.getItem(rootKey);
        if (savedRootChatId && savedRootChatId.startsWith("canvas-")) {
          rootChatId = savedRootChatId;
        } else {
          rootChatId = `canvas-${crypto.randomUUID()}`;
          localStorage.setItem(rootKey, rootChatId);
        }
      } catch (error) {
        console.error("[CanvasChat] Failed to initialize agent root chat id:", error);
        rootChatId = `canvas-${crypto.randomUUID()}`;
      }
    }

    const fallbackSession: CanvasChatSession = {
      id: rootChatId,
      title: "对话 1",
      createdAt: now,
      updatedAt: now,
    };

    try {
      const key = getSessionStorageKey(canvasId, chatScope);
      const saved = localStorage.getItem(key);
      const parsed = saved ? (JSON.parse(saved) as CanvasChatSession[]) : [];

      const sanitized = parsed
        .filter((session) => session?.id)
        .map((session) => ({
          id: session.id,
          title: (session.title || "").trim() || "新对话",
          createdAt: Number(session.createdAt) || now,
          updatedAt: Number(session.updatedAt) || now,
        }));

      const hasCurrent = sanitized.some((session) => session.id === rootChatId);
      const nextSessions = hasCurrent
        ? sanitized
        : [fallbackSession, ...sanitized];

      const sorted = [...nextSessions].sort((a, b) => b.updatedAt - a.updatedAt);
      setChatSessions(sorted);
      setActiveChatId(rootChatId);
      localStorage.setItem(key, JSON.stringify(sorted));
    } catch (error) {
      console.error("[CanvasChat] Failed to load chat sessions:", error);
      setChatSessions([fallbackSession]);
      setActiveChatId(rootChatId);
    }
  }, [canvasId, chatId, chatScope]);

  useEffect(() => {
    if (!isSessionMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!sessionMenuRef.current?.contains(event.target as Node)) {
        setIsSessionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSessionMenuOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        getSessionStorageKey(canvasId, chatScope),
        JSON.stringify(chatSessions)
      );
    } catch (error) {
      console.error("[CanvasChat] Failed to save chat sessions:", error);
    }
  }, [canvasId, chatScope, chatSessions]);

  // Canvas store
  const addNode = useCanvasStore((state) => state.addNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const projectTitle = useCanvasStore((state) => state.projectTitle);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const selectNodes = useCanvasStore((state) => state.selectNodes);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const pendingChatAttachments = useCanvasStore((state) => state.pendingChatAttachments);
  const clearPendingChatAttachments = useCanvasStore((state) => state.clearPendingChatAttachments);
  // 🆕 物品拾取
  const pendingPickedObjects = useCanvasStore((state) => state.pendingPickedObjects);
  const clearPendingPickedObjects = useCanvasStore((state) => state.clearPendingPickedObjects);

  // 获取纯 UUID（去掉 canvas- 前缀）用于 API 调用
  const rawChatId = toRawCanvasChatId(activeChatId);
  const { mutate } = useSWRConfig();
  const [votingMessageId, setVotingMessageId] = useState<string | null>(null);
  const handleDownloadOriginalImage = useCallback(async (imageUrl: string) => {
    const raw = String(imageUrl || "").trim();
    if (!raw) {
      toast.error("图片地址无效");
      return;
    }

    const originalUrl = inferOriginalImageUrl(raw) || raw;
    const filename = buildDownloadFilename(originalUrl);
    try {
      const response = await fetch(
        buildImageProxyUrl(originalUrl, { delivery: "proxy" })
      );
      if (!response.ok) {
        throw new Error(`download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      triggerBrowserDownload(blobUrl, filename);
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch (error) {
      console.error("下载原图失败:", error);
      try {
        triggerBrowserDownload(originalUrl, filename);
        toast.message("代理下载失败，已切换为原图直链下载");
        return;
      } catch (fallbackError) {
        console.error("原图直链下载失败:", fallbackError);
      }

      triggerBrowserDownload(originalUrl, undefined, { openInNewTab: true });
      toast.message("已打开原图，可右键另存为");
    }
  }, []);

  // 从 API 加载历史消息
  const { data: historyData, mutate: mutateHistoryData } = useSWR<{
    messages: ChatMessage[];
  }>(rawChatId ? `/api/messages?chatId=${rawChatId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });
  const initialCanvasMessageCount =
    activeChatId === chatId ? initialMessages.length : 0;
  const voteSWRKey =
    rawChatId &&
    (historyData?.messages?.length ?? initialCanvasMessageCount) >= 2
      ? `/api/vote?chatId=${rawChatId}`
      : null;
  const { data: messageVotes } = useSWR<MessageVote[]>(
    voteSWRKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  // 获取选中的图片节点
  const selectedImageNodes = useMemo(
    () =>
      nodes.filter(
        (node) => selectedNodeIds.includes(node.id) && isCanvasImageReadyForAi(node)
      ),
    [nodes, selectedNodeIds]
  );
  const selectedImageNodesRef = useRef<CanvasNode[]>([]);
  const generationAnchorNodesRef = useRef<CanvasNode[]>([]);

  useEffect(() => {
    selectedImageNodesRef.current = selectedImageNodes;
  }, [selectedImageNodes]);

  const focusCanvasOnNode = useCallback(
    (node: Pick<CanvasNode, "position" | "size">) => {
      if (typeof window === "undefined") return;
      const { viewport } = useCanvasStore.getState();
      const width = Number(node.size?.width || 300);
      const height = Number(node.size?.height || 300);
      const availableWidth = Math.max(360, window.innerWidth * 0.54);
      const availableHeight = Math.max(320, window.innerHeight * 0.52);
      const fitZoom = Math.min(
        1.16,
        availableWidth / Math.max(width, 1),
        availableHeight / Math.max(height, 1)
      );
      const zoom = Math.max(0.48, Math.min(fitZoom, 4));
      const centerX = node.position.x + width / 2;
      const centerY = node.position.y + height / 2;
      window.requestAnimationFrame(() => {
        setViewport({
          x: window.innerWidth * 0.52 - centerX * zoom,
          y: window.innerHeight * 0.46 - centerY * zoom,
          zoom,
        });
      });
    },
    [setViewport]
  );

  const handleAssistantVote = useCallback(
    async (messageId: string, type: "up" | "down") => {
      if (!rawChatId) return;

      setVotingMessageId(messageId);
      try {
        const response = await apiFetch("/api/vote", {
          method: "PATCH",
          body: JSON.stringify({
            chatId: rawChatId,
            messageId,
            type,
          }),
        });

        if (!response.ok) {
          throw new Error("Vote failed");
        }

        mutate<MessageVote[]>(
          voteSWRKey,
          (currentVotes) => {
            const baseVotes = Array.isArray(currentVotes) ? currentVotes : [];
            const filteredVotes = baseVotes.filter(
              (vote) => vote.messageId !== messageId
            );
            return [
              ...filteredVotes,
              {
                chatId: rawChatId,
                messageId,
                isUpvoted: type === "up",
              },
            ];
          },
          { revalidate: false }
        );

        toast.success(type === "up" ? "已点赞" : "已点踩");
      } catch (error) {
        console.error("[CanvasChat] vote failed:", error);
        toast.error(type === "up" ? "点赞失败，请稍后重试" : "点踩失败，请稍后重试");
      } finally {
        setVotingMessageId(null);
      }
    },
    [mutate, rawChatId, voteSWRKey]
  );

  const handleCopyUserMessage = useCallback(async (message: ChatMessage) => {
    const payload = getUserMessageCopyPayload(message);
    if (!payload.text && payload.attachments.length === 0) {
      toast.info("这条消息没有可复制的内容");
      return;
    }

    copiedUserMessageRef.current = {
      ...payload,
      createdAt: Date.now(),
    };

    try {
      await writeTextToClipboard(payload.text);
      toast.success(
        payload.attachments.length > 0
          ? `已复制文字和 ${payload.attachments.length} 张图片，可粘贴到输入框`
          : "已复制文字，可粘贴到输入框"
      );
    } catch (error) {
      console.error("[CanvasChat] copy user message failed:", error);
      toast.error("复制失败，请重试");
    }
  }, []);

  const handleCopyAssistantMessage = useCallback(async (message: ChatMessage) => {
    const text = getAssistantMessageCopyText(message);
    if (!text) {
      toast.info("这条回复没有可复制的文本");
      return;
    }

    try {
      await writeTextToClipboard(text);
      toast.success("回复内容已复制");
    } catch (error) {
      console.error("[CanvasChat] copy assistant message failed:", error);
      toast.error("复制失败，请重试");
    }
  }, []);

  const getCanvasNodeAttachment = useCallback(
    (node: any, fallbackName: string): PickedObjectAttachment | null => {
      if (isCanvasImageUploadPending(node)) return null;
      const nodeData = (node?.data as any) || {};
      const src = nodeData.src;
      if (!src || typeof src !== "string" || !isValidChatHttpUrl(src)) return null;

      const nodeTitle =
        String(nodeData.title || "").trim() ||
        String(nodeData.prompt || "").trim() ||
        fallbackName;
      const metadata = (nodeData.metadata || {}) as Record<string, unknown>;
      const width =
        Number(metadata.originalWidth || 0) || Number(node?.size?.width || 0) || 0;
      const height =
        Number(metadata.originalHeight || 0) || Number(node?.size?.height || 0) || 0;

      return {
        url: src,
        name: nodeTitle,
        contentType: "image/jpeg",
        assetId:
          typeof (node?.data as any)?.assetId === "string" && (node?.data as any)?.assetId.trim()
            ? String((node?.data as any)?.assetId).trim()
            : undefined,
        width: Number.isFinite(width) && width > 0 ? Math.round(width) : undefined,
        height: Number.isFinite(height) && height > 0 ? Math.round(height) : undefined,
      };
    },
    []
  );

  // 🆕 辅助函数：在 contenteditable 中插入图片标签
  const insertImageTagInEditor = useCallback((url: string, name: string, index: number) => {
    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (!editableDiv) return;
    if (!isValidChatHttpUrl(url)) {
      console.warn('[CanvasChat] 跳过非 HTTP 图片标签:', String(url || '').slice(0, 40));
      return;
    }

    // 检查 DOM 中是否已存在该 URL 的标签（如果存在则不重复添加）
    const existing = Array.from(
      editableDiv.querySelectorAll<HTMLElement>('[data-attachment-url]')
    ).find((element) => element.getAttribute('data-attachment-url') === url);
    if (existing) {
      console.log('[CanvasChat] 标签已存在于 DOM 中，跳过:', url.substring(0, 50));
      return;
    }

    const tagSpan = document.createElement('span');
    tagSpan.contentEditable = 'false';
    tagSpan.setAttribute('data-attachment-index', String(index));
    tagSpan.setAttribute('data-attachment-url', url);
    tagSpan.setAttribute('data-attachment-name', name);
    tagSpan.className = 'inline-flex items-center gap-1 bg-muted/60 hover:bg-muted dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-100 rounded-full pl-1 pr-2 py-0.5 mx-0.5 align-middle cursor-default select-none';
    const shortName = name.length > 10 ? name.substring(0, 8) + '...' : name;

    const image = document.createElement('img');
    image.src = buildPreviewImageUrl(url, 48);
    image.alt = '';
    image.className = 'h-5 w-5 object-cover rounded-full border border-border/50';

    const label = document.createElement('span');
    label.className = 'text-xs text-foreground/80';
    label.textContent = shortName;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.contentEditable = 'false';
    removeButton.setAttribute('data-attachment-remove', 'true');
    removeButton.className = 'ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none text-foreground/45 hover:bg-black/10 hover:text-foreground dark:hover:bg-white/15';
    removeButton.textContent = '×';

    tagSpan.appendChild(image);
    tagSpan.appendChild(label);
    tagSpan.appendChild(removeButton);

    // 在光标位置插入，或添加到末尾，并在标签后插入一个零宽空格，方便光标落在标签后继续输入
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editableDiv.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const spaceNode = document.createTextNode("\u200b");
      range.insertNode(spaceNode);
      range.insertNode(tagSpan);
      range.setStartAfter(spaceNode);
      range.setEndAfter(spaceNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editableDiv.appendChild(tagSpan);
      editableDiv.appendChild(document.createTextNode("\u200b"));
    }

    console.log('[CanvasChat] 已插入图片标签:', url.substring(0, 50));
  }, []);

  // 🆕 辅助函数：在 contenteditable 中插入物品标签（带图片缩略图，样式与普通图片标签一致）
  const insertPickedObjectTagInEditor = useCallback((
    url: string,
    objectName: string,
    objectPosition: string,
    index: number
  ) => {
    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (!editableDiv) return;

    // 检查 DOM 中是否已存在该物品的标签
    const existingTags = editableDiv.querySelectorAll('[data-picked-object="true"]');
    for (const tag of existingTags) {
      if (tag.getAttribute('data-attachment-url') === url &&
          tag.getAttribute('data-object-name') === objectName) {
        console.log('[CanvasChat] 物品标签已存在，跳过');
        return;
      }
    }

    const tagSpan = document.createElement('span');
    tagSpan.contentEditable = 'false';
    tagSpan.setAttribute('data-attachment-index', String(index));
    tagSpan.setAttribute('data-attachment-url', url);
    tagSpan.setAttribute('data-picked-object', 'true');
    tagSpan.setAttribute('data-object-name', objectName);
    tagSpan.setAttribute('data-object-position', objectPosition);
    tagSpan.setAttribute('data-attachment-name', objectName);
    // 样式与普通图片标签一致
    tagSpan.className = 'inline-flex items-center gap-1 bg-muted/60 hover:bg-muted dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-100 rounded-full pl-1 pr-2 py-0.5 mx-0.5 align-middle cursor-default select-none';
    // 使用图片缩略图，不使用 emoji 或图标
    tagSpan.innerHTML = `
      <img src="${url}" alt="" class="h-5 w-5 object-cover rounded-full border border-border/50" />
      <span class="text-xs text-foreground/80">${objectName}</span>
      <span class="text-xs text-foreground/50">·</span>
      <span class="text-xs text-foreground/70">${objectPosition}</span>
      <button type="button" data-attachment-remove="true" class="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none text-foreground/45 hover:bg-black/10 hover:text-foreground dark:hover:bg-white/15">×</button>
    `;

    // 在光标位置插入，或添加到末尾，并在标签后插入一个零宽空格，方便光标落在标签后继续输入
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editableDiv.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const spaceNode = document.createTextNode("\u200b");
      range.insertNode(spaceNode);
      range.insertNode(tagSpan);
      range.setStartAfter(spaceNode);
      range.setEndAfter(spaceNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editableDiv.appendChild(tagSpan);
      editableDiv.appendChild(document.createTextNode("\u200b"));
    }

    console.log('[CanvasChat] 已插入物品标签:', objectName, objectPosition);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storageKey = getCanvasLaunchStorageKey(canvasId);
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;

      sessionStorage.removeItem(storageKey);
      const parsed = JSON.parse(raw) as CanvasLaunchPayload;
      const normalizedAttachments = Array.isArray(parsed.attachments)
        ? parsed.attachments
            .filter((item) => item?.url)
            .map((item) => ({
              url: String(item.url),
              name: String(item.name || "参考图"),
              contentType: String(item.contentType || "image/jpeg"),
              assetId:
                typeof item.assetId === "string" && item.assetId.trim()
                  ? item.assetId.trim()
                  : undefined,
            }))
        : [];
      const normalizedPrompt = String(parsed.prompt || "").trim();
      const launchComposerMode =
        parsed.composerMode === "agent" ||
        parsed.composerMode === "image" ||
        parsed.composerMode === "video" ||
        parsed.composerMode === "detail"
          ? parsed.composerMode
          : null;

      if (!normalizedPrompt && normalizedAttachments.length === 0) {
        return;
      }

      setAttachments(normalizedAttachments as PickedObjectAttachment[]);
      setInput(normalizedPrompt);

      if (launchComposerMode) {
        activeComposerModeRef.current = launchComposerMode;
        setComposerModeOverride(launchComposerMode);
        if (launchComposerMode === "agent") {
          setAgentEntryMode("auto");
          setIsDetailGenerationMode(false);
        } else if (launchComposerMode === "detail") {
          setIsDetailGenerationMode(true);
        } else {
          setIsDetailGenerationMode(false);
        }
      }

      if (parsed.selectedModelId) {
        setSelectedModelId(String(parsed.selectedModelId));
      }

      if (parsed.imageParams && typeof parsed.imageParams === "object") {
        setImageParams((prev) => {
          const next = {
            ...prev,
            ...parsed.imageParams,
          };
          imageParamsRef.current = next;
          return next;
        });
      }

      if (!parsed.autoSend) {
        setTimeout(() => {
          const editableDiv = textareaRef.current as HTMLDivElement | null;
          if (editableDiv) {
            editableDiv.innerHTML = "";
            if (normalizedPrompt) {
              editableDiv.appendChild(document.createTextNode(normalizedPrompt));
              const selection = window.getSelection();
              if (selection) {
                const range = document.createRange();
                range.selectNodeContents(editableDiv);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }

          normalizedAttachments.forEach((attachment, index) => {
            insertImageTagInEditor(attachment.url, attachment.name, index);
          });
        }, 50);
      }

      if (parsed.autoSend) {
        pendingLaunchRef.current = {
          prompt: normalizedPrompt,
          attachments: normalizedAttachments,
          autoSend: true,
          createdAt: parsed.createdAt,
          selectedModelId: parsed.selectedModelId,
          composerMode: launchComposerMode || undefined,
          imageParams: parsed.imageParams,
        };
        setLaunchAutoSendTick((value) => value + 1);
      }

      normalizedAttachments.forEach(async (attachment, index) => {
        const dimensions = await getImageDimensions(attachment.url);
        addNode({
          type: "image",
          position: {
            x: -260 + index * 80,
            y: -120 + (index % 2) * 40,
          },
          size: {
            width: dimensions.width,
            height: dimensions.height,
          },
          data: {
            src: attachment.url,
            status: "completed",
            title: attachment.name || `参考图 ${index + 1}`,
            prompt: normalizedPrompt || "",
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
            },
          },
          connections: [],
        });
      });
    } catch (error) {
      console.error("[CanvasChat] Failed to restore launch payload:", error);
    }
  }, [canvasId, addNode, insertImageTagInEditor]);

  // 🆕 监听 pendingPickedObjects，当用户确认拾取物品时添加标签
  useEffect(() => {
    if (pendingPickedObjects.length > 0) {
      const currentAttachments = [...attachments];

      pendingPickedObjects.forEach((picked, i) => {
        // 检查是否已存在相同的物品
        const exists = currentAttachments.some(a =>
          a.url === picked.imageUrl &&
          a.pickedObject?.objectName === picked.objectName
        );

        if (!exists) {
          // 插入物品标签到编辑器
          insertPickedObjectTagInEditor(
            picked.imageUrl,
            picked.objectName,
            picked.objectPosition,
            currentAttachments.length + i
          );

          // 添加到附件列表（带物品信息，原图片 URL 会发送给 AI 用于多图融合编辑）
          currentAttachments.push({
            url: picked.imageUrl,  // 原图片 URL
            name: `${picked.objectName}-${picked.objectPosition}`,  // 物品名称-位置
            contentType: 'image/jpeg',
            pickedObject: {
              objectName: picked.objectName,
              objectPosition: picked.objectPosition,
              clickX: picked.clickX,
              clickY: picked.clickY,
              boundingBox: picked.boundingBox,
            },
          });
        }
      });

      setAttachments(currentAttachments);

      // 聚焦到输入框
      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);

      // 清空待添加列表
      clearPendingPickedObjects();
    }
  }, [pendingPickedObjects, attachments, insertPickedObjectTagInEditor, clearPendingPickedObjects]);

  // 🆕 标签悬停预览 - 使用全局事件监听
  useEffect(() => {
    let lastTagElement: HTMLElement | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagSpan = target.closest('[data-attachment-url]') as HTMLElement | null;

      // 检查是否在预览弹窗内
      const inPreview = target.closest('[data-tag-preview]');
      if (inPreview) {
        // 在预览弹窗内，保持显示
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
          previewTimeoutRef.current = null;
        }
        return;
      }

      if (tagSpan && tagSpan !== lastTagElement) {
        lastTagElement = tagSpan;

        // 清除之前的延迟隐藏
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
          previewTimeoutRef.current = null;
        }

        const url = tagSpan.getAttribute('data-attachment-url');
        const isPickedObject = tagSpan.getAttribute('data-picked-object') === 'true';
        const objectName = tagSpan.getAttribute('data-object-name');
        const attachmentName = tagSpan.getAttribute('data-attachment-name');

        if (url) {
          const rect = tagSpan.getBoundingClientRect();
          // 从 attachments 中获取物品信息
          const attachment = attachments.find(a =>
            a.url === url &&
            (isPickedObject ? a.pickedObject?.objectName === objectName : true)
          );

          // 获取聊天面板容器边界（向上查找最近的面板容器）
          const panelContainer = tagSpan.closest('.flex.flex-col.h-full') as HTMLElement | null;
          let containerBounds: TagPreviewInfo['containerBounds'] = undefined;
          if (panelContainer) {
            const panelRect = panelContainer.getBoundingClientRect();
            containerBounds = {
              left: panelRect.left,
              right: panelRect.right,
              top: panelRect.top,
              bottom: panelRect.bottom,
            };
          }

          setTagPreview({
            url,
            name: objectName || attachmentName || tagSpan.textContent || '图片',
            x: rect.left + rect.width / 2,
            y: rect.top,
            containerBounds,
            pickedObject: attachment?.pickedObject ? {
              objectName: attachment.pickedObject.objectName,
              objectPosition: attachment.pickedObject.objectPosition,
              clickX: attachment.pickedObject.clickX,
              clickY: attachment.pickedObject.clickY,
            } : undefined,
          });
        }
      } else if (!tagSpan && lastTagElement) {
        // 离开标签
        lastTagElement = null;
        previewTimeoutRef.current = setTimeout(() => {
          setTagPreview(null);
        }, 200);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [attachments]);

  // 获取模型列表
  const { data: modelsData } = useSWR<{
    models: Array<{
      id: string;
      modelId: string;
      displayName: string;
      avatarUrl?: string | null;
      sortOrder?: number;
      providerType: string;
      supportsVision?: boolean;
      supportsImageGen?: boolean;
      isMultimodal?: boolean;
      availabilityStatus?: "available" | "maintenance" | "testing";
      availabilityLabel?: string | null;
      selectable?: boolean;
      disabledReason?: string | null;
      capabilities?: any;
      videoToolCapability?: VideoToolCapabilityContract | null;
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
        creditCostMultiplierBySize?: Record<string, number>;
        creditDiscountRate?: number;
        creditCostPerVideo?: number;
        videoDurationOptions?: number[];
        creditCostPerVideoByDuration?: Record<string, number>;
        creditCostPerVideoByResolution?: Record<string, number>;
      } | null;
    }>;
    agentModel?: {
      id: string;
      modelId?: string;
      displayName: string;
      avatarUrl?: string | null;
      providerType: string;
      supportsVision?: boolean;
      supportsImageGen?: boolean;
      isMultimodal?: boolean;
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
        creditCostMultiplierBySize?: Record<string, number>;
        creditDiscountRate?: number;
        creditCostPerVideo?: number;
        videoDurationOptions?: number[];
        creditCostPerVideoByDuration?: Record<string, number>;
        creditCostPerVideoByResolution?: Record<string, number>;
      } | null;
    } | null;
  }>("/api/models?includeUnavailable=1", fetcher, {
    dedupingInterval: 60_000,
    refreshInterval: 5 * 60_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // 获取网站设置（包含广告横幅配置和画布设置）
  const { data: siteSettings } = useSWR<{
    bannerEnabled?: boolean;
    bannerText?: string;
    bannerLink?: string | null;
    homeComposerPrefix?: string | null;
    homeComposerPreviewTexts?: string[];
    canvasEnabled?: boolean;
    aiDetailGenerationEnabled?: boolean;
    canvasDefaultModelId?: string | null;
    canvasAutoModeDefaultModelId?: string | null;
    canvasDetailDefaultModelId?: string | null;
    canvasToolbarConfig?: CanvasToolbarConfig;
  }>("/api/site-settings?scope=canvas-chat", fetcher);
  const { data: canvasSkillTagsData } = useSWR<{
    enabled?: boolean;
    title?: string;
    tags?: CanvasSkillTag[];
  }>(
    "/api/canvas-skill-tags",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );
  const { data: membershipSummary } = useSWR<{
    isHighVip?: boolean;
    pointsSystemConfig?: {
      enabled?: boolean;
      blockOnInsufficient?: boolean;
    };
    summary?: {
      currentCredits?: number;
    };
  } | null>("/api/user/membership-summary", async (url: string) => {
    const response = await apiFetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  });
  const canvasToolbarConfig = useMemo(
    () =>
      rawCanvasToolbarConfig
        ? propCanvasToolbarConfig
        : normalizeCanvasToolbarConfig(siteSettings?.canvasToolbarConfig),
    [propCanvasToolbarConfig, rawCanvasToolbarConfig, siteSettings?.canvasToolbarConfig]
  );
  const getToolbarItem = useCallback(
    (key: CanvasToolbarItemKey) => getCanvasToolbarItem(canvasToolbarConfig, key),
    [canvasToolbarConfig]
  );
  const { data: userImageStats } = useSWR<{ totalImages?: number } | null>(
    "/api/user/image-stats",
    async (url: string) => {
      const response = await apiFetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return response.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );
  const { data: agentPresetResponse } = useSWR<{ success?: boolean; data?: AgentPreset }>(
    selectedAgentPresetId ? `/api/agents/${selectedAgentPresetId}` : null,
    fetcher
  );
  const greetingUserName = useMemo(() => {
    const userName = String(session?.user?.name || "").trim();
    if (userName) return userName;
    const email = String(session?.user?.email || "").trim();
    if (email.includes("@")) {
      return email.split("@")[0];
    }
    return "";
  }, [session?.user?.email, session?.user?.name]);
  const [canvasTypedPreviewText, setCanvasTypedPreviewText] = useState("");
  const [canvasPreviewCursorVisible, setCanvasPreviewCursorVisible] = useState(true);
  const [greetingPeriodText, setGreetingPeriodText] = useState("中午好！");
  const [isCanvasBannerDismissed, setIsCanvasBannerDismissed] = useState(false);
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setGreetingPeriodText("早上好！");
      return;
    }
    if (hour >= 11 && hour < 18) {
      setGreetingPeriodText("中午好！");
      return;
    }
    if (hour >= 18) {
      setGreetingPeriodText("晚上好！");
      return;
    }
    setGreetingPeriodText("深夜好！");
  }, []);
  const canvasComposerPrefix = useMemo(
    () =>
      String(siteSettings?.homeComposerPrefix || "").trim() ||
      CANVAS_COMPOSER_PREFIX_DEFAULT,
    [siteSettings?.homeComposerPrefix]
  );
  const canvasComposerPreviewTexts = useMemo(() => {
    const configured = (siteSettings?.homeComposerPreviewTexts || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return configured.length > 0
      ? configured
      : CANVAS_COMPOSER_PREVIEW_TEXTS_DEFAULT;
  }, [siteSettings?.homeComposerPreviewTexts]);
  const canvasComposerPreviewTails = useMemo(
    () =>
      canvasComposerPreviewTexts
        .map((text) => normalizeComposerPreviewTail(text, canvasComposerPrefix))
        .filter(Boolean),
    [canvasComposerPrefix, canvasComposerPreviewTexts]
  );
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (canvasComposerPreviewTails.length === 0) {
      setCanvasTypedPreviewText("");
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    let textIndex = 0;
    let charIndex = 0;

    const typeForward = () => {
      if (disposed) return;
      const currentText = canvasComposerPreviewTails[textIndex] || "";

      if (charIndex < currentText.length) {
        charIndex += 1;
        setCanvasTypedPreviewText(currentText.slice(0, charIndex));
        timer = setTimeout(typeForward, 55);
        return;
      }

      if (canvasComposerPreviewTails.length === 1) {
        setCanvasTypedPreviewText(currentText);
        return;
      }

      timer = setTimeout(typeBackward, 1200);
    };

    const typeBackward = () => {
      if (disposed) return;
      const currentText = canvasComposerPreviewTails[textIndex] || "";

      if (charIndex > 0) {
        charIndex -= 1;
        setCanvasTypedPreviewText(currentText.slice(0, charIndex));
        timer = setTimeout(typeBackward, 35);
        return;
      }

      textIndex = (textIndex + 1) % canvasComposerPreviewTails.length;
      timer = setTimeout(typeForward, 260);
    };

    setCanvasTypedPreviewText("");
    timer = setTimeout(typeForward, 260);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [canvasComposerPreviewTails]);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setCanvasPreviewCursorVisible((value) => !value);
    }, 450);

    return () => clearInterval(blinkTimer);
  }, []);

  const canvasDynamicPlaceholder = `${canvasComposerPrefix}${canvasTypedPreviewText}${
    canvasPreviewCursorVisible ? " |" : ""
  }`;
  const totalGeneratedImages = Number(userImageStats?.totalImages ?? NaN);
  const aiDetailGenerationEnabled = siteSettings?.aiDetailGenerationEnabled === true;
  const canUseDetailGeneration = aiDetailGenerationEnabled && !isVideoWorkspace;
  const shouldShowCanvasBanner =
    !isDetailGenerationMode &&
    !isCanvasBannerDismissed &&
    (siteSettings?.bannerEnabled ?? true) &&
    Boolean(siteSettings?.bannerText || "限时特惠：升级会员最高立享 45% OFF!");
  useEffect(() => {
    setIsCanvasBannerDismissed(false);
  }, [siteSettings?.bannerEnabled, siteSettings?.bannerText]);
  const canvasSkillTagsEnabled = canvasSkillTagsData?.enabled !== false;
  const canvasSkillTagsTitle =
    String(canvasSkillTagsData?.title || "").trim() || DEFAULT_CANVAS_SKILL_TAGS_TITLE;
  const canvasSkillTags = useMemo(
    () => (canvasSkillTagsEnabled ? normalizeCanvasSkillTags(canvasSkillTagsData?.tags) : []),
    [canvasSkillTagsData?.tags, canvasSkillTagsEnabled]
  );
  const selectedSkillTag = useMemo(
    () => canvasSkillTags.find((tag) => tag.id === selectedSkillTagId) || null,
    [canvasSkillTags, selectedSkillTagId]
  );
  const selectedAgentPreset = useMemo(
    () => (agentPresetResponse?.success && agentPresetResponse.data ? agentPresetResponse.data : null),
    [agentPresetResponse]
  );
  const workflowReferenceImages = workflowContext?.referenceImages || [];
  const hasWorkflowContext = Boolean(
    workflowContext &&
      (String(workflowContext.summaryText || "").trim() ||
        String(workflowContext.promptText || "").trim() ||
        workflowContext.selections.length > 0 ||
        workflowReferenceImages.length > 0)
  );
  const SelectedSkillTagIcon = useMemo(
    () => getCanvasSkillIconComponent(selectedSkillTag?.iconName),
    [selectedSkillTag?.iconName]
  );

  useEffect(() => {
    if (!selectedSkillTagId) return;
    if (!canvasSkillTags.some((tag) => tag.id === selectedSkillTagId)) {
      setSelectedSkillTagId(null);
    }
  }, [canvasSkillTags, selectedSkillTagId]);

  useEffect(() => {
    if (!isWorkspacePresentation) return;
    if (!selectedSkillTagId) return;
    setSelectedSkillTagId(null);
  }, [isWorkspacePresentation, selectedSkillTagId]);

  const visualModels = useMemo(() => {
    const filtered =
      modelsData?.models?.filter(
        (model) =>
          !isInternalCapabilityModel(model) &&
          model.modelId !== "volcano-video-master" &&
          (
            isImageGenerationModelDescriptor({
              providerType: model.providerType,
              modelId: model.modelId,
              capabilities: model.capabilities,
              supportsImageGen: model.supportsImageGen,
            }) ||
            model.isMultimodal ||
            isVideoModelDescriptor({
              providerType: model.providerType,
              modelId: model.modelId,
              capabilities: model.capabilities,
              supportsImageGen: model.supportsImageGen,
            })
          )
      ) || [];

    return [...filtered].sort((a, b) => {
      const leftOrder = Number.isFinite(a.sortOrder as number) ? Number(a.sortOrder) : 0;
      const rightOrder = Number.isFinite(b.sortOrder as number) ? Number(b.sortOrder) : 0;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(a.displayName || "").localeCompare(String(b.displayName || ""), "zh-Hans-CN");
    });
  }, [modelsData?.models]);

  // Agent 模式（自动路由）模型选项
  const SMART_AUTO_MODEL = {
    id: "auto",
    modelId: "auto",
    displayName: "Agent 模式",
    avatarUrl: modelsData?.agentModel?.avatarUrl || null,
    sortOrder: -999,
    providerType: "auto",
    supportsImageGen: true,
    capabilities: null,
    isMultimodal: false,
    selectable: true,
    availabilityStatus: "available" as const,
    availabilityLabel: null,
    disabledReason: null,
    videoToolCapability: null,
    imageGenConfig: modelsData?.agentModel?.imageGenConfig || undefined,
  };
  const multimodalAgentModel = useMemo(() => {
    if (!modelsData?.agentModel?.id || !modelsData.agentModel.isMultimodal) {
      return null;
    }

    return {
      id: modelsData.agentModel.id,
      modelId: modelsData.agentModel.modelId || modelsData.agentModel.id,
      displayName: modelsData.agentModel.displayName,
      avatarUrl: modelsData.agentModel.avatarUrl || null,
      sortOrder: -998,
      providerType: modelsData.agentModel.providerType,
      supportsVision: modelsData.agentModel.supportsVision,
      supportsImageGen: modelsData.agentModel.supportsImageGen,
      capabilities: null,
      isMultimodal: true,
      selectable: true,
      availabilityStatus: "available" as const,
      availabilityLabel: null,
      disabledReason: null,
      videoToolCapability: null,
      imageGenConfig: modelsData.agentModel.imageGenConfig || undefined,
    };
  }, [modelsData?.agentModel]);

  // 所有可选模型（Agent 模式 + 可视化模型）
  const allModels = useMemo(() => {
    const merged = [
      ...(effectiveAgentEnabled ? [SMART_AUTO_MODEL] : []),
      ...(multimodalAgentModel ? [multimodalAgentModel] : []),
      ...visualModels,
    ];
    const seen = new Set<string>();
    return merged.filter((model) => {
      if (!model?.id || seen.has(model.id)) {
        return false;
      }
      seen.add(model.id);
      return true;
    });
  }, [SMART_AUTO_MODEL, effectiveAgentEnabled, multimodalAgentModel, visualModels]);
  const imageOnlyModels = useMemo(
    () =>
      visualModels.filter(
        (model) =>
          isImageGenerationModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          }) &&
          !isVideoModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          })
      ),
    [visualModels]
  );
  const conversationOnlyModels = useMemo(
    () =>
      allModels.filter(
        (model) =>
          model.id !== "auto" &&
          model.id !== modelsData?.agentModel?.id &&
          model.isMultimodal &&
          !isImageGenerationModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          }) &&
          !isVideoModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          })
      ),
    [allModels, modelsData?.agentModel?.id]
  );
  const videoOnlyModels = useMemo(
    () =>
      visualModels.filter((model) =>
        isVideoModelDescriptor({
          providerType: model.providerType,
          modelId: model.modelId,
          capabilities: model.capabilities,
          supportsImageGen: model.supportsImageGen,
        })
      ),
    [visualModels]
  );
  const currentModel = allModels.find((model) => model.id === selectedModelId);
  const isCanvasVideoModel = useCallback(
    (model?: (typeof allModels)[number] | null) =>
      Boolean(
        model &&
          isVideoModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          })
      ),
    []
  );
  const isCanvasImageModel = useCallback(
    (model?: (typeof allModels)[number] | null) =>
      Boolean(
        model &&
          isImageGenerationModelDescriptor({
            providerType: model.providerType,
            modelId: model.modelId,
            capabilities: model.capabilities,
            supportsImageGen: model.supportsImageGen,
          })
      ),
    []
  );
  const isCanvasConversationOnlyModel = useCallback(
    (model?: (typeof allModels)[number] | null) =>
      Boolean(
        model &&
          model.id !== "auto" &&
          model.isMultimodal &&
          !isCanvasImageModel(model) &&
          !isCanvasVideoModel(model)
      ),
    [isCanvasImageModel, isCanvasVideoModel]
  );
  const isVideoModel = Boolean(
    currentModel && isCanvasVideoModel(currentModel)
  );
  const isConversationModel = Boolean(
    currentModel && isCanvasConversationOnlyModel(currentModel)
  );
  const hasSelectedAgentPreset = Boolean(String(selectedAgentPresetId || "").trim());
  const [agentEntryMode, setAgentEntryMode] = useState<"auto" | "preset">(
    hasSelectedAgentPreset ? "preset" : "auto"
  );
  const isPresetAgentSelection = hasSelectedAgentPreset && agentEntryMode === "preset";
  const isAgentModel =
    effectiveAgentEnabled &&
    hasSelectedAgentPreset &&
    !isDetailGenerationMode &&
    (!selectedModelId || selectedModelId === "auto" || isConversationModel);
  const computedComposerMode = useMemo<"agent" | "image" | "video" | "detail">(() => {
    if (isDetailGenerationMode) return "detail";
    if (isVideoModel) return "video";
    if (isAgentModel) return "agent";
    return "image";
  }, [isAgentModel, isDetailGenerationMode, isVideoModel]);
  const [composerModeOverride, setComposerModeOverride] = useState<
    "agent" | "image" | "video" | "detail" | null
  >(null);
  const activeComposerMode = composerModeOverride || computedComposerMode;
  const agentSelectableModels = useMemo(
    () =>
      effectiveAgentEnabled ? [SMART_AUTO_MODEL, ...conversationOnlyModels] : conversationOnlyModels,
    [SMART_AUTO_MODEL, effectiveAgentEnabled, conversationOnlyModels]
  );
  const selectableModels = useMemo(() => {
    if (activeComposerMode === "detail") {
      return [SMART_AUTO_MODEL];
    }
    if (activeComposerMode === "video") {
      return videoOnlyModels;
    }
    if (activeComposerMode === "agent") {
      return agentSelectableModels;
    }
    return imageOnlyModels;
  }, [
    SMART_AUTO_MODEL,
    activeComposerMode,
    agentSelectableModels,
    imageOnlyModels,
    videoOnlyModels,
  ]);
  const enabledSelectableModels = useMemo(
    () => selectableModels.filter((model) => model.selectable !== false),
    [selectableModels]
  );
  const modelSelectValue = enabledSelectableModels.some((model) => model.id === selectedModelId)
    ? selectedModelId
    : enabledSelectableModels[0]?.id || selectedModelId;
  const selectDisplayModel =
    selectableModels.find((model) => model.id === modelSelectValue) ||
    currentModel ||
    SMART_AUTO_MODEL;
  const agentDisplayName =
    activeComposerMode === "agent"
      ? isPresetAgentSelection
        ? selectedAgentPreset?.name || "预设 Agent"
        : "Auto Agent"
      : currentModel?.displayName || selectDisplayModel?.displayName || "Agent 模式";
  const videoFrameSlots = useMemo(() => {
    if (!isVideoModel || !videoParams) return [] as string[];
    if (videoParams.mode === "first-last-frame") return ["首帧", "尾帧"] as string[];
    if (videoParams.mode === "first-frame") return ["首帧"] as string[];
    return [] as string[];
  }, [isVideoModel, videoParams]);
  const preferredVideoWorkspaceModel = useMemo(() => {
    if (isVideoModel && currentModel) {
      return currentModel;
    }

    const lastPreferredModel = allModels.find((model) => model.id === lastVideoModelId);
    if (lastPreferredModel && isCanvasVideoModel(lastPreferredModel)) {
      return lastPreferredModel;
    }

    return videoOnlyModels[0] || null;
  }, [
    allModels,
    currentModel,
    isCanvasVideoModel,
    isVideoModel,
    lastVideoModelId,
    videoOnlyModels,
  ]);
  const videoWorkspaceQuickActions = useMemo(() => {
    const supportedModes = new Set(
      preferredVideoWorkspaceModel?.videoToolCapability?.modeOptions?.map((item) => item.mode) || [
        "text-to-video",
        "first-frame",
        "first-last-frame",
        "reference-images",
      ]
    );

    return [
      {
        mode: "text-to-video" as const,
        title: "文生视频",
        description: "直接描述主体、镜头和运动",
        icon: Clapperboard,
        disabled: !supportedModes.has("text-to-video"),
      },
      {
        mode: "first-frame" as const,
        title: "主体参考",
        description: "用首帧锁定主体与画风",
        icon: ImagePlus,
        disabled: !supportedModes.has("first-frame"),
      },
      {
        mode: "first-last-frame" as const,
        title: "首尾帧",
        description: "同时控制开场和收尾画面",
        icon: ArrowRightToLine,
        disabled: !supportedModes.has("first-last-frame"),
      },
      {
        mode: "reference-images" as const,
        title: "智能多帧",
        description: "多图共同约束场景一致性",
        icon: LayoutGrid,
        disabled: !supportedModes.has("reference-images"),
      },
    ];
  }, [preferredVideoWorkspaceModel]);
  const activeComposerModeRef = useRef(activeComposerMode);
  const agentEntryModeRef = useRef(agentEntryMode);
  const agentUploadSlots = useMemo(() => {
    if (
      activeComposerMode !== "agent" ||
      !isPresetAgentSelection ||
      !selectedAgentPreset ||
      selectedAgentPreset.type === "text"
    ) {
      return [] as Array<{
        slotIndex: number;
        label: string;
      }>;
    }

    return [
      { slotIndex: 0, label: "产品图1" },
      { slotIndex: 1, label: "产品图2" },
      { slotIndex: 2, label: "模特图" },
    ];
  }, [activeComposerMode, isPresetAgentSelection, selectedAgentPreset]);
  const hasAgentUploadSlots =
    activeComposerMode === "agent" && agentUploadSlots.length > 0;
  const agentRequiredUploadCount = hasAgentUploadSlots ? 3 : 0;

  const addCopiedAttachmentsToComposer = useCallback((items: PickedObjectAttachment[]) => {
    const safeItems = items
      .map((item) => sanitizeChatAttachment(item))
      .filter((item): item is PickedObjectAttachment => Boolean(item));

    if (safeItems.length === 0) return 0;

    if (hasAgentUploadSlots) {
      const slotCount = agentUploadSlots.length;
      const next: Array<PickedObjectAttachment | null> = Array.from(
        { length: slotCount },
        (_, index) => attachments[index] ?? null
      );
      const existingUrls = new Set(next.filter(Boolean).map((item) => item!.url));
      let inserted = 0;
      for (const item of safeItems) {
        const slotIndex = next.findIndex((slot) => !slot);
        if (slotIndex < 0) break;
        if (existingUrls.has(item.url)) continue;
        next[slotIndex] = item;
        existingUrls.add(item.url);
        inserted += 1;
      }
      setAttachments(next.filter((item): item is PickedObjectAttachment => Boolean(item)));
      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);
      return inserted;
    }

    if (isVideoModel && videoFrameSlots.length > 0) {
      const slotCount = videoFrameSlots.length;
      const next: Array<PickedObjectAttachment | null> = Array.from(
        { length: slotCount },
        (_, index) => attachments[index] ?? null
      );
      const existingUrls = new Set(next.filter(Boolean).map((item) => item!.url));
      let inserted = 0;
      for (const item of safeItems) {
        const slotIndex = next.findIndex((slot) => !slot);
        if (slotIndex < 0) break;
        if (existingUrls.has(item.url)) continue;
        next[slotIndex] = item;
        existingUrls.add(item.url);
        inserted += 1;
      }
      setAttachments(next.filter((item): item is PickedObjectAttachment => Boolean(item)));
      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);
      return inserted;
    }

    const existingUrls = new Set(attachments.map((item) => item.url));
    const toAdd = safeItems.filter((item) => !existingUrls.has(item.url));
    if (toAdd.length > 0) {
      setTimeout(() => {
        toAdd.forEach((item, index) => {
          insertImageTagInEditor(item.url, item.name, attachments.length + index);
        });
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);
    }

    setAttachments([...attachments, ...toAdd]);
    return toAdd.length;
  }, [
    agentUploadSlots.length,
    attachments,
    hasAgentUploadSlots,
    insertImageTagInEditor,
    isVideoModel,
    videoFrameSlots.length,
  ]);

  // 监听 pendingChatAttachments：视频模式时填充首尾帧槽位，非视频模式插入对话标签
  useEffect(() => {
    if (pendingChatAttachments.length === 0) return;

    const safePendingChatAttachments = pendingChatAttachments
      .map((item) => sanitizeChatAttachment(item as PickedObjectAttachment))
      .filter((item): item is PickedObjectAttachment => Boolean(item));

    if (safePendingChatAttachments.length === 0) {
      toast.error("图片还未完成上传，请重新添加到对话");
      clearPendingChatAttachments();
      return;
    }

    if (safePendingChatAttachments.length < pendingChatAttachments.length) {
      toast.warning("部分图片地址不可用，已跳过以避免页面卡顿");
    }

    if (isDetailGenerationMode) {
      const normalized = safePendingChatAttachments.map((item) => ({
        ...item,
        name: item.name || "素材图",
      }));

      if (normalized.length > 0) {
        let inserted = 0;
        const targetSlotIndex = detailSlotPickerIndex;

        setDetailSlots((current) => {
          const next = [...current];

          const allIndexes = DETAIL_SLOT_CONFIGS.map((_, index) => index);
          let priorityIndexes = allIndexes;

          if (targetSlotIndex !== null && targetSlotIndex >= 0 && targetSlotIndex < DETAIL_SLOT_CONFIGS.length) {
            const role = DETAIL_SLOT_CONFIGS[targetSlotIndex]?.role;
            const sameRoleIndexes = DETAIL_SLOT_CONFIGS.map((slot, index) =>
              slot.role === role ? index : -1
            ).filter((index) => index >= 0);
            const sameRoleStart = sameRoleIndexes.indexOf(targetSlotIndex);
            const orderedSameRole =
              sameRoleStart >= 0 ? sameRoleIndexes.slice(sameRoleStart) : sameRoleIndexes;
            priorityIndexes = [targetSlotIndex, ...orderedSameRole.filter((index) => index !== targetSlotIndex)];
          }

          let cursor = 0;
          for (let i = 0; i < priorityIndexes.length && cursor < normalized.length; i += 1) {
            const slotIdx = priorityIndexes[i]!;
            const canReplaceActive = targetSlotIndex !== null && slotIdx === targetSlotIndex && cursor === 0;
            if (!canReplaceActive && next[slotIdx]) continue;
            next[slotIdx] = normalized[cursor]!;
            cursor += 1;
            inserted += 1;
          }

          return next;
        });

        if (inserted > 0) {
          toast.success(
            inserted > 1 ? `已添加 ${inserted} 张到 AI详情素材槽位` : "已添加到 AI详情素材槽位"
          );
          if (targetSlotIndex !== null) {
            setDetailSlotPickerIndex(null);
          }
        } else {
          toast.info("详情素材槽位已满，请先替换或清空后再添加");
        }
      }

      clearPendingChatAttachments();
      return;
    }

    if (hasAgentUploadSlots) {
      const slotCount = agentUploadSlots.length;
      const currentSlots: Array<PickedObjectAttachment | null> = Array.from(
        { length: slotCount },
        (_, index) => attachments[index] ?? null
      );
      const existingUrls = new Set(currentSlots.filter(Boolean).map((item) => item!.url));
      const toAdd = safePendingChatAttachments
        .filter((item) => !existingUrls.has(item.url))
        .map((item) => ({
          ...item,
          name: item.name || "参考图",
        })) as PickedObjectAttachment[];

      let cursor = 0;
      let inserted = 0;
      for (let index = 0; index < slotCount && cursor < toAdd.length; index += 1) {
        if (currentSlots[index]) continue;
        currentSlots[index] = toAdd[cursor]!;
        cursor += 1;
        inserted += 1;
      }

      if (inserted > 0) {
        const next = currentSlots
          .slice(0, slotCount)
          .filter((item): item is PickedObjectAttachment => Boolean(item));
        setAttachments(next);
        toast.success(
          slotCount === 1
            ? "已添加到 Agent 图片槽位"
            : `已添加到 Agent 槽位（${inserted}/${slotCount}）`
        );
      } else if (toAdd.length > 0) {
        toast.info("Agent 图片槽位已满，请先替换或移除");
      }

      if (toAdd.length - inserted > 0) {
        toast.info(`还有 ${toAdd.length - inserted} 张未添加，可继续替换 Agent 图片槽位`);
      }

      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);

      clearPendingChatAttachments();
      return;
    }

    if (isVideoModel && videoFrameSlots.length > 0) {
      const slotCount = videoFrameSlots.length;
      const currentSlots: Array<PickedObjectAttachment | null> = Array.from(
        { length: slotCount },
        (_, index) => attachments[index] ?? null
      );
      const existingUrls = new Set(currentSlots.filter(Boolean).map((item) => item!.url));
      const toAdd = safePendingChatAttachments
        .filter((item) => !existingUrls.has(item.url))
        .map((item) => ({
          ...item,
          name: item.name || "参考图",
        })) as PickedObjectAttachment[];

      let cursor = 0;
      let inserted = 0;
      for (let index = 0; index < slotCount && cursor < toAdd.length; index += 1) {
        if (currentSlots[index]) continue;
        currentSlots[index] = toAdd[cursor]!;
        cursor += 1;
        inserted += 1;
      }

      if (inserted > 0) {
        const next = currentSlots
          .slice(0, slotCount)
          .filter((item): item is PickedObjectAttachment => Boolean(item));
        setAttachments(next);
        toast.success(slotCount === 1 ? "已添加到视频首帧" : "已添加到首尾帧槽位");
      } else if (toAdd.length > 0) {
        toast.info("首尾帧槽位已满，请先替换或移除");
      }

      if (toAdd.length - inserted > 0) {
        toast.info(`还有 ${toAdd.length - inserted} 张未添加，可继续替换首尾帧`);
      }

      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);

      clearPendingChatAttachments();
      return;
    }

    const currentAttachments = [...attachments];
    const existingUrls = new Set(currentAttachments.map((item) => item.url));
    const toAdd = safePendingChatAttachments.filter((item) => !existingUrls.has(item.url));

    if (toAdd.length > 0) {
      toAdd.forEach((item, index) => {
        insertImageTagInEditor(item.url, item.name, currentAttachments.length + index);
      });

      setAttachments([...currentAttachments, ...toAdd]);

      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);
    }

    clearPendingChatAttachments();
  }, [
    pendingChatAttachments,
    isDetailGenerationMode,
    detailSlotPickerIndex,
    hasAgentUploadSlots,
    agentUploadSlots.length,
    isVideoModel,
    videoFrameSlots.length,
    attachments,
    insertImageTagInEditor,
    clearPendingChatAttachments,
  ]);

  const firstImageModelId = useMemo(
    () => imageOnlyModels.find((model) => model.selectable !== false)?.id || null,
    [imageOnlyModels]
  );
  const firstVideoModelId = useMemo(
    () => videoOnlyModels.find((model) => model.selectable !== false)?.id || null,
    [videoOnlyModels]
  );
  const activeModeLabel =
    activeComposerMode === "video"
      ? "视频"
      : activeComposerMode === "detail"
        ? getToolbarItem("chatModeDetailActive").label
      : activeComposerMode === "image"
          ? "图像"
          : isPresetAgentSelection
            ? getToolbarItem("chatModePresetAgent").label
            : "Agent";
  const activeModeToolbarIcon =
    activeComposerMode === "video"
      ? {
          fallback: Video,
          item: getToolbarItem("chatModeVideoActive"),
        }
      : activeComposerMode === "detail"
        ? {
            fallback: LayoutGrid,
            item: getToolbarItem("chatModeDetailActive"),
          }
        : activeComposerMode === "image"
          ? {
              fallback: ImagePlus,
              item: getToolbarItem("chatModeImageActive"),
            }
          : {
              fallback: Bot,
              item: isPresetAgentSelection
                ? getToolbarItem("chatModePresetAgent")
                : getToolbarItem("chatModeAgentActive"),
            };
  const shouldMaskAgentRuntimeModelName =
    activeComposerMode === "agent" || selectedModelId === "auto";
  const getAgentSafeModelName = useCallback(
    (modelName?: string | null) => {
      const normalized = String(modelName || "").trim();
      if (!shouldMaskAgentRuntimeModelName) {
        return normalized || undefined;
      }
      return normalized ? "agent model" : "agent model";
    },
    [shouldMaskAgentRuntimeModelName]
  );

  // 默认选择模型（根据系统设置）
  useEffect(() => {
    activeComposerModeRef.current = activeComposerMode;
  }, [activeComposerMode]);

  useEffect(() => {
    agentEntryModeRef.current = agentEntryMode;
  }, [agentEntryMode]);

  useEffect(() => {
    setAgentEntryMode(hasSelectedAgentPreset ? "preset" : "auto");
  }, [hasSelectedAgentPreset, selectedAgentPresetId]);

  useEffect(() => {
    if (!selectedModelId && siteSettings) {
      const nextModelId = effectiveAgentEnabled
        ? "auto"
        : firstImageModelId || firstVideoModelId || "";
      currentModelIdRef.current = nextModelId;
      setSelectedModelId(nextModelId);
    }
  }, [
    effectiveAgentEnabled,
    firstImageModelId,
    firstVideoModelId,
    selectedModelId,
    siteSettings,
  ]);

  useEffect(() => {
    if (effectiveAgentEnabled) return;
    if (selectedModelId !== "auto" && activeComposerMode !== "agent") return;

    const fallbackModelId = firstImageModelId || firstVideoModelId || "";
    currentModelIdRef.current = fallbackModelId;
    setSelectedModelId(fallbackModelId);
    setComposerModeOverride(firstVideoModelId && fallbackModelId === firstVideoModelId ? "video" : "image");
    if (isDetailGenerationMode) {
      setIsDetailGenerationMode(false);
    }
  }, [
    activeComposerMode,
    effectiveAgentEnabled,
    firstImageModelId,
    firstVideoModelId,
    isDetailGenerationMode,
    selectedModelId,
  ]);

  useEffect(() => {
    if (!canUseDetailGeneration && isDetailGenerationMode) {
      setIsDetailGenerationMode(false);
    }
  }, [canUseDetailGeneration, isDetailGenerationMode]);

  useEffect(() => {
    if (!modelSelectValue || modelSelectValue === selectedModelId) return;
    currentModelIdRef.current = modelSelectValue;
    setSelectedModelId(modelSelectValue);
  }, [modelSelectValue, selectedModelId]);

  useEffect(() => {
    if (!effectiveAgentEnabled) return;
    if (activeComposerMode !== "agent") return;
    if (!isPresetAgentSelection) return;
    if (!selectedAgentPresetId) return;
    if (!selectedAgentPreset?.defaultModelId) return;
    if (currentModelIdRef.current === selectedAgentPreset.defaultModelId) return;

    currentModelIdRef.current = selectedAgentPreset.defaultModelId;
    setSelectedModelId(selectedAgentPreset.defaultModelId);
    if (isDetailGenerationMode) {
      setIsDetailGenerationMode(false);
    }
  }, [
    activeComposerMode,
    effectiveAgentEnabled,
    isPresetAgentSelection,
    isDetailGenerationMode,
    selectedAgentPreset,
    selectedAgentPresetId,
  ]);

  useEffect(() => {
    if (isDetailGenerationMode) {
      setAttachments([]);
      setDetailSections({ required: true, strategy: false, assets: true, archives: true });
      const editableDiv = textareaRef.current as HTMLDivElement | null;
      if (editableDiv) {
        editableDiv.querySelectorAll("[data-attachment-url]").forEach((element) => element.remove());
      }
    } else {
      setDetailProgress({ status: "idle", stage: "", current: 0, total: 0 });
    }
  }, [isDetailGenerationMode]);

  const currentModelIdRef = useRef(selectedModelId);
  const isVideoModelRef = useRef(isVideoModel);

  useEffect(() => {
    currentModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  useEffect(() => {
    imageParamsRef.current = imageParams;
  }, [imageParams]);

  useEffect(() => {
    videoParamsRef.current = videoParams;
  }, [videoParams]);

  useEffect(() => {
    deepThinkingEnabledRef.current = deepThinkingEnabled;
  }, [deepThinkingEnabled]);

  useEffect(() => {
    isVideoModelRef.current = isVideoModel;
  }, [isVideoModel]);

  const handleModelSelectionChange = useCallback(
    (value: string) => {
      const nextModel = allModels.find((model) => model.id === value);
      if (nextModel?.selectable === false) {
        toast.info(nextModel.disabledReason || "模型维护中，请稍后再试");
        return;
      }

      const nextIsVideoModel = isCanvasVideoModel(nextModel);
      const nextIsConversationModel = isCanvasConversationOnlyModel(nextModel);
      currentModelIdRef.current = value;
      setSelectedModelId(value);

      if (value === "auto" || nextIsConversationModel) {
        setComposerModeOverride("agent");
      } else if (nextIsVideoModel) {
        setComposerModeOverride("video");
      } else {
        setComposerModeOverride("image");
      }

      if (value !== "auto" || !canUseDetailGeneration) {
        setIsDetailGenerationMode(false);
      }
    },
    [
      allModels,
      canUseDetailGeneration,
      isCanvasConversationOnlyModel,
      isCanvasVideoModel,
    ]
  );

  useEffect(() => {
    if (!isVideoModel) return;
    const normalized = normalizeVideoParamsForProvider(
      videoParams,
      currentModel?.providerType,
      currentModel?.videoToolCapability
    );
    if (!videoParams || JSON.stringify(videoParams) !== JSON.stringify(normalized)) {
      setVideoParams(normalized);
    }
  }, [isVideoModel, currentModel?.providerType, currentModel?.videoToolCapability, videoParams]);

  useEffect(() => {
    if (!isVideoModel || videoFrameSlots.length === 0) return;
    const maxAttachments = videoFrameSlots.length;
    setAttachments((current) => {
      if (current.length <= maxAttachments) return current;
      return current.slice(0, maxAttachments);
    });
  }, [isVideoModel, videoFrameSlots.length]);

  useEffect(() => {
    if (!hasAgentUploadSlots) return;
    const maxAttachments = agentUploadSlots.length;
    setAttachments((current) => {
      if (current.length <= maxAttachments) return current;
      return current.slice(0, maxAttachments);
    });
  }, [agentUploadSlots.length, hasAgentUploadSlots]);

  useEffect(() => {
    if (!hasAgentUploadSlots || workflowReferenceImages.length === 0) {
      lastWorkflowAutofillSignatureRef.current = null;
      lastWorkflowAutofillUrlsRef.current = [];
      return;
    }

    const primaryImages = workflowReferenceImages.filter((image) => image.source === "primary");
    const secondaryImages = workflowReferenceImages.filter((image) => image.source === "secondary");
    const usedUrls = new Set<string>();
    const pickNextImage = (
      candidates: typeof workflowReferenceImages
    ) =>
      candidates.find((image) => {
        if (!image?.url || usedUrls.has(image.url)) return false;
        usedUrls.add(image.url);
        return true;
      }) || null;

    const productSlot1Image = pickNextImage(primaryImages) || pickNextImage(secondaryImages);
    const productSlot2Image =
      pickNextImage(secondaryImages) ||
      pickNextImage(primaryImages) ||
      pickNextImage(workflowReferenceImages);

    const suggestedSlots: Array<PickedObjectAttachment | null> = Array.from(
      { length: agentUploadSlots.length },
      () => null
    );
    const toAttachment = (image: (typeof workflowReferenceImages)[number] | null) =>
      image
        ? {
            url: image.url,
            name: image.name || image.label || image.sourceLabel,
            contentType: image.mimeType || "image/png",
            assetId: image.assetId || undefined,
          }
        : null;

    if (agentUploadSlots.length > 0) {
      suggestedSlots[0] = toAttachment(productSlot1Image);
    }
    if (agentUploadSlots.length > 1) {
      suggestedSlots[1] = toAttachment(productSlot2Image);
    }

    const nextSuggestedUrls = suggestedSlots
      .filter((item): item is PickedObjectAttachment => Boolean(item))
      .map((item) => item.url);
    if (nextSuggestedUrls.length === 0) return;

    const nextSignature = JSON.stringify({
      presetId: selectedAgentPresetId || "",
      urls: nextSuggestedUrls,
    });
    if (lastWorkflowAutofillSignatureRef.current === nextSignature) {
      return;
    }

    setAttachments((current) => {
      const previousAutoUrls = new Set(lastWorkflowAutofillUrlsRef.current);
      const next: Array<PickedObjectAttachment | null> = Array.from(
        { length: agentUploadSlots.length },
        (_, index) => current[index] ?? null
      );
      let changed = false;

      suggestedSlots.forEach((attachment, index) => {
        if (!attachment || index >= 2) return;
        const existing = next[index];
        const canReplace = !existing?.url || previousAutoUrls.has(existing.url);
        if (!canReplace) return;
        if (existing?.url === attachment.url) return;
        next[index] = attachment;
        changed = true;
      });

      if (!changed) {
        return current;
      }
      lastWorkflowAutofillSignatureRef.current = nextSignature;
      lastWorkflowAutofillUrlsRef.current = nextSuggestedUrls;
      return next.filter((item): item is PickedObjectAttachment => Boolean(item));
    });
  }, [
    agentUploadSlots.length,
    hasAgentUploadSlots,
    selectedAgentPresetId,
    workflowReferenceImages,
  ]);

  useEffect(() => {
    if (!currentModel) return;
    if (currentModel.id !== "auto" && isDetailGenerationMode) {
      setIsDetailGenerationMode(false);
    }
    if (isVideoModel) {
      setLastVideoModelId(currentModel.id);
      return;
    }
    if (isConversationModel) {
      setLastConversationModelId(currentModel.id);
      return;
    }
    if (currentModel.id !== "auto") {
      setLastImageModelId(currentModel.id);
    }
  }, [currentModel, isConversationModel, isDetailGenerationMode, isVideoModel]);

  useEffect(() => {
    if (!isVideoWorkspace) return;
    if (hasInitializedVideoWorkspaceRef.current) return;
    if (!preferredVideoWorkspaceModel) return;
    hasInitializedVideoWorkspaceRef.current = true;
    if (isDetailGenerationMode) {
      setIsDetailGenerationMode(false);
    }
    setComposerModeOverride("video");
    if (
      !selectedModelId ||
      selectedModelId === "auto" ||
      !isCanvasVideoModel(currentModel || null)
    ) {
      currentModelIdRef.current = preferredVideoWorkspaceModel.id;
      setSelectedModelId(preferredVideoWorkspaceModel.id);
    }
  }, [
    currentModel,
    isCanvasVideoModel,
    isDetailGenerationMode,
    isVideoWorkspace,
    preferredVideoWorkspaceModel,
    selectedModelId,
  ]);

  const handleSelectGenerationMode = useCallback(
    (mode: "agent" | "image" | "video" | "detail") => {
      hiddenPromptRef.current = null;
      autoContextRef.current = null;
      activeComposerModeRef.current = mode;
      setComposerModeOverride(mode);

      if (mode === "agent") {
        if (!effectiveAgentEnabled) {
          return;
        }
        currentModelIdRef.current = "auto";
        setSelectedModelId("auto");
        setIsDetailGenerationMode(false);
        return;
      }

      if (mode === "detail") {
        if (!canUseDetailGeneration) {
          toast.error("AI详情生成功能未开启");
          return;
        }
        const detailModelId = effectiveAgentEnabled ? "auto" : "";
        currentModelIdRef.current = detailModelId;
        setSelectedModelId(detailModelId);
        setIsDetailGenerationMode(true);
        setIsDetailWorkbenchCollapsed(true);
        return;
      }

      if (mode === "image") {
        const preferredImageModelId =
          allModels.find(
            (model) =>
              model.id === lastImageModelId &&
              model.id !== "auto" &&
              isCanvasImageModel(model) &&
              !model.isMultimodal
          )?.id || firstImageModelId;

        if (!preferredImageModelId) {
          toast.error("当前没有可用的图像模型");
          return;
        }
        currentModelIdRef.current = preferredImageModelId;
        setSelectedModelId(preferredImageModelId);
        setIsDetailGenerationMode(false);
        return;
      }

      const preferredVideoModelId =
        allModels.find((model) => model.id === lastVideoModelId && isCanvasVideoModel(model))?.id ||
        firstVideoModelId;

      if (!preferredVideoModelId) {
        toast.error("当前没有可用的视频模型");
        return;
      }
      currentModelIdRef.current = preferredVideoModelId;
      setSelectedModelId(preferredVideoModelId);
      setIsDetailGenerationMode(false);
    },
    [
      canUseDetailGeneration,
      effectiveAgentEnabled,
      allModels,
      computedComposerMode,
      firstImageModelId,
      firstVideoModelId,
      hasSelectedAgentPreset,
      lastConversationModelId,
      lastImageModelId,
      isCanvasConversationOnlyModel,
      isCanvasImageModel,
      isCanvasVideoModel,
      lastVideoModelId,
    ]
  );

  const applyVideoWorkspacePreset = useCallback(
    (mode: VideoGenerationParams["mode"]) => {
      if (!preferredVideoWorkspaceModel) {
        toast.error("当前没有可用的视频模型");
        return;
      }

      handleSelectGenerationMode("video");
      const nextParams = normalizeVideoParamsForProvider(
        {
          ...(videoParamsRef.current || {}),
          mode,
        },
        preferredVideoWorkspaceModel.providerType,
        preferredVideoWorkspaceModel.videoToolCapability
      );
      handleVideoParamsChange(nextParams);

      setTimeout(() => {
        (textareaRef.current as HTMLDivElement | null)?.focus();
      }, 0);
    },
    [handleSelectGenerationMode, preferredVideoWorkspaceModel]
  );

  const updateDetailBriefField = useCallback(
    (key: keyof DetailBriefForm, value: string) => {
      setDetailBrief((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const normalizedDetailBrief = useMemo(() => {
    const normalizeValue = (value: string) => value.replace(/\s+/g, " ").trim();
    return {
      productSpu: normalizeValue(detailBrief.productSpu),
      demandType: normalizeValue(detailBrief.demandType),
      productName: normalizeValue(detailBrief.productName),
      targetAudience: normalizeValue(detailBrief.targetAudience),
      mainUser: normalizeValue(detailBrief.mainUser),
      usageScenario: normalizeValue(detailBrief.usageScenario),
      triggerMoment: normalizeValue(detailBrief.triggerMoment),
      coreNeed: normalizeValue(detailBrief.coreNeed),
      riskConcern: normalizeValue(detailBrief.riskConcern),
      expectedResult: normalizeValue(detailBrief.expectedResult),
      coreSellingPoint: normalizeValue(detailBrief.coreSellingPoint),
      positioningStatement: normalizeValue(detailBrief.positioningStatement),
      userVoice: normalizeValue(detailBrief.userVoice),
      competitorReference: normalizeValue(detailBrief.competitorReference),
      priceBand: normalizeValue(detailBrief.priceBand),
      brandTone: normalizeValue(detailBrief.brandTone),
      bannedWords: normalizeValue(detailBrief.bannedWords),
    };
  }, [detailBrief]);

  const detailValidationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!normalizedDetailBrief.targetAudience) issues.push("缺少主购买人群");
    if (!normalizedDetailBrief.usageScenario) issues.push("缺少需求场景");
    if (!normalizedDetailBrief.coreNeed) issues.push("缺少核心需求");
    const productCount = DETAIL_PRODUCT_SLOT_INDEXES.filter((index) => Boolean(detailSlots[index]?.url)).length;
    if (productCount < 5) issues.push(`产品图不足（${productCount}/5）`);
    if (DETAIL_MODEL_SLOT_INDEX < 0 || !detailSlots[DETAIL_MODEL_SLOT_INDEX]?.url) {
      issues.push("缺少模特图（1/1）");
    }
    return issues;
  }, [detailSlots, normalizedDetailBrief]);

  const hasGeneratedDetailImages = useMemo(
    () =>
      nodes.some(
        (node) =>
          node.type === "image" &&
          Boolean((node.data as any)?.metadata?.detailSectionIndex)
      ),
    [nodes]
  );

  const toggleDetailSection = useCallback((key: DetailSectionKey) => {
    setDetailSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadDetailArchives = async () => {
      try {
        const response = await apiFetch(`/api/canvas/${canvasId}/detail-archives`, {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));
        if (isCancelled) return;
        if (!response.ok || !result?.success) {
          setDetailArchives([]);
          return;
        }

        setDetailArchives(sanitizeDetailArchiveList(result.data));
      } catch (error) {
        if (isCancelled) return;
        console.error("[CanvasChat] Failed to load detail archives:", error);
        setDetailArchives([]);
      }
    };

    void loadDetailArchives();
    return () => {
      isCancelled = true;
    };
  }, [canvasId]);

  useEffect(() => {
    if (videoFrameSlots.length === 0) return;
    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (!editableDiv) return;
    editableDiv.querySelectorAll("[data-attachment-url]").forEach((element) => element.remove());
  }, [videoFrameSlots.length]);

  // 合并 initialMessages 和历史消息
  const mergedInitialMessages = useMemo(
    () =>
      sortCanvasMessagesByCreatedAt(
        historyData?.messages ?? (activeChatId === chatId ? initialMessages : [])
      ),
    [activeChatId, chatId, historyData?.messages, initialMessages]
  );

  const removeCanvasGenerationPlaceholders = useCallback(
    (chatSessionId?: string) => {
      const state = useCanvasStore.getState();
      const ids = state.nodes
        .filter((node) => {
          if (node.type !== "image") return false;
          const metadata = ((node.data as any)?.metadata || {}) as Record<string, unknown>;
          if (metadata.canvasGenerationPlaceholder !== true) return false;
          if (!chatSessionId) return true;
          return String(metadata.chatId || "") === chatSessionId;
        })
        .map((node) => node.id);

      ids.forEach((nodeId) => deleteNode(nodeId));
      if (chatSessionId) {
        delete canvasGenerationPlaceholderByChatIdRef.current[chatSessionId];
      } else {
        canvasGenerationPlaceholderByChatIdRef.current = {};
      }
    },
    [deleteNode]
  );

  const appendStreamMediaToCanvas = useCallback(
    async (payload: CanvasMediaStreamPayload) => {
      const imageUrls = Array.isArray(payload.imageUrls)
        ? payload.imageUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
        : [];
      const videoUrls = Array.isArray(payload.videoUrls)
        ? payload.videoUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
        : [];
      if (imageUrls.length === 0 && videoUrls.length === 0) {
        return;
      }

      const latestNodes = useCanvasStore.getState().nodes;
      const placeholderNodes = latestNodes.filter((node) => {
        if (node.type !== "image") return false;
        const metadata = ((node.data as any)?.metadata || {}) as Record<string, unknown>;
        return (
          metadata.canvasGenerationPlaceholder === true &&
          (!metadata.chatId || String(metadata.chatId) === activeChatId)
        );
      }).sort((left, right) => {
        const leftMetadata = ((left.data as any)?.metadata || {}) as Record<string, unknown>;
        const rightMetadata = ((right.data as any)?.metadata || {}) as Record<string, unknown>;
        return Number(leftMetadata.placeholderIndex || 0) - Number(rightMetadata.placeholderIndex || 0);
      });
      const suppressedMediaKeys = new Set(
        (useCanvasStore.getState().getCanvasState().suppressedMediaKeys || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      );
      const existingImageUrlKeys = new Set(
        latestNodes
          .filter((node) => node.type === "image" && (node.data as any)?.src)
          .map((node) => normalizeImageIdentityUrl(String((node.data as any)?.src || "")))
          .filter(Boolean)
      );
      const existingMessageImageKeys = new Set(
        latestNodes
          .filter((node) => node.type === "image")
          .map((node) => {
            const data = ((node.data as any) || {}) as Record<string, any>;
            const metadata = ((data.metadata as any) || {}) as Record<string, any>;
            const sourceMessageId = String(metadata.sourceMessageId || "").trim();
            const sourceImageKey = normalizeImageIdentityUrl(
              String(metadata.sourceImageKey || data.src || "").trim()
            );
            if (!sourceMessageId || !sourceImageKey) return "";
            return `${sourceMessageId}::${sourceImageKey}`;
          })
          .filter(Boolean)
      );
      const existingVideoUrlKeys = new Set(
        latestNodes
          .filter((node) => node.type === "video" && (node.data as any)?.src)
          .map((node) => normalizeMediaUrl(String((node.data as any)?.src || "")))
          .filter(Boolean)
      );

      const sourceImageUrls = Array.isArray(payload.sourceImageUrls)
        ? payload.sourceImageUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
        : [];
      const messageId = String(payload.messageId || "").trim();
      const generationPrompt = String(payload.prompt || "").trim() || "对话生成";
      const agentPresetId = String(payload.agentPresetId || "").trim() || undefined;
      const agentPresetName = String(payload.agentPresetName || "").trim() || undefined;
      const agentCategoryId = String(payload.agentCategoryId || "").trim() || undefined;
      const agentCategoryName = String(payload.agentCategoryName || "").trim() || undefined;
      const agentExecutionSnapshotId =
        String(payload.agentExecutionSnapshotId || "").trim() || undefined;
      let addedImageCount = 0;
      let addedVideoCount = 0;
      const insertedNodeIds: string[] = [];
      const completedAt = Date.now();

      for (let index = 0; index < imageUrls.length; index += 1) {
        const url = imageUrls[index]!;
        const sourceImageKey = normalizeImageIdentityUrl(url);
        if (!sourceImageKey || existingImageUrlKeys.has(sourceImageKey)) {
          continue;
        }
        const messageImageKey = messageId ? `${messageId}::${sourceImageKey}` : "";
        if (
          suppressedMediaKeys.has(`image:${messageImageKey}`) ||
          suppressedMediaKeys.has(`image-url:${url}`)
        ) {
          continue;
        }
        if (messageImageKey && existingMessageImageKeys.has(messageImageKey)) {
          continue;
        }

        existingImageUrlKeys.add(sourceImageKey);
        if (messageImageKey) {
          existingMessageImageKeys.add(messageImageKey);
        }

        const dimensions = await getImageDimensions(url);
        const compareSourceUrlRaw =
          sourceImageUrls[Math.min(index, Math.max(0, sourceImageUrls.length - 1))] ||
          sourceImageUrls[0] ||
          "";
        const compareSourceUrl = String(compareSourceUrlRaw || "").trim();
        const normalizedCompareSource = normalizeImageIdentityUrl(compareSourceUrl);
        const canUseCompareSource =
          Boolean(normalizedCompareSource) &&
          normalizedCompareSource !== sourceImageKey;
        const sourceNodeId = canUseCompareSource
          ? useCanvasStore
              .getState()
              .nodes.find((node) => {
                if (node.type !== "image") return false;
                const src = String(((node.data as any) || {}).src || "").trim();
                return normalizeImageIdentityUrl(src) === normalizedCompareSource;
              })?.id || ""
          : "";

        const currentNodes = useCanvasStore.getState().nodes;
        const anchorNode = findCanvasImageAnchorNode(currentNodes, {
          selectedNodes:
            generationAnchorNodesRef.current.length > 0
              ? generationAnchorNodesRef.current
              : selectedImageNodesRef.current,
          sourceImageUrls,
        });
        const placeholderNode = placeholderNodes[index];
        const size = anchorNode
          ? {
              width: Math.max(
                1,
                Math.round(Number(anchorNode.size?.width || dimensions.width))
              ),
              height: Math.max(
                1,
                Math.round(Number(anchorNode.size?.height || dimensions.height))
              ),
            }
          : { width: dimensions.width, height: dimensions.height };
        const position = getAnchoredGenerationPosition({
          anchorNode,
          existingNodes: currentNodes,
          excludeNodeIds: placeholderNode ? [placeholderNode.id] : [],
          fallbackNodeCount: currentNodes.length + addedImageCount + addedVideoCount,
          index,
          size,
          viewport: useCanvasStore.getState().viewport,
        });
        const data = {
          src: url,
          status: "completed" as const,
          title: "图片",
          prompt: generationPrompt,
          originalSrc: canUseCompareSource ? compareSourceUrl : undefined,
          metadata: {
            originalWidth: dimensions.originalWidth,
            originalHeight: dimensions.originalHeight,
            generationPrompt,
            sourceMessageId: messageId || undefined,
            sourceImageKey,
            compareSourceUrl: canUseCompareSource ? compareSourceUrl : undefined,
            agentPresetId,
            agentPresetName,
            agentCategoryId,
            agentCategoryName,
            agentExecutionSnapshotId,
            sourceNodeId: sourceNodeId || anchorNode?.id || undefined,
            placementMode: "anchored-generation",
            recentlyGeneratedAt: completedAt,
          },
        };
        const nodeId = placeholderNode
          ? placeholderNode.id
          : addNode({
              type: "image",
              position,
              size,
              data,
              connections: sourceNodeId ? [sourceNodeId] : anchorNode?.id ? [anchorNode.id] : [],
            });
        if (placeholderNode) {
          updateNode(nodeId, {
            position,
            size,
            data,
            connections: sourceNodeId ? [sourceNodeId] : anchorNode?.id ? [anchorNode.id] : [],
          });
        }
        insertedNodeIds.push(nodeId);
        void autoNameGeneratedImageNode(nodeId, url);
        addedImageCount += 1;
      }

      placeholderNodes.slice(imageUrls.length).forEach((node) => deleteNode(node.id));
      if (insertedNodeIds.length > 0) {
        selectNodes(insertedNodeIds);
        const focusNode = useCanvasStore
          .getState()
          .nodes.find((node) => node.id === insertedNodeIds[0]);
        if (focusNode) {
          focusCanvasOnNode(focusNode);
        }
      } else if (videoUrls.length > 0) {
        removeCanvasGenerationPlaceholders(activeChatId);
      }

      for (let index = 0; index < videoUrls.length; index += 1) {
        const url = videoUrls[index]!;
        const key = normalizeMediaUrl(url);
        if (!key || existingVideoUrlKeys.has(key)) {
          continue;
        }
        if (suppressedMediaKeys.has(`video:${url}`)) {
          continue;
        }
        existingVideoUrlKeys.add(key);
        const currentNodes = useCanvasStore.getState().nodes;
        const existingNodes = currentNodes.length + addedImageCount + addedVideoCount;
        const x = 120 + (existingNodes % 2) * 420;
        const y = 120 + Math.floor(existingNodes / 2) * 260;
        addNode({
          type: "video",
          position: { x, y },
          size: { width: 380, height: 220 },
          data: {
            src: url,
            status: "completed",
            prompt: generationPrompt,
            metadata: {
              agentPresetId,
              agentPresetName,
              agentCategoryId,
              agentCategoryName,
              agentExecutionSnapshotId,
            },
          },
          connections: [],
        });
        addedVideoCount += 1;
      }

    },
    [
      activeChatId,
      addNode,
      autoNameGeneratedImageNode,
      deleteNode,
      focusCanvasOnNode,
      removeCanvasGenerationPlaceholders,
      selectNodes,
      updateNode,
    ]
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat<ChatMessage>({
    id: activeChatId,
    messages: mergedInitialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: createApiHref("/api/chat"),
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        // 从 canvas-{uuid} 格式中提取纯 UUID，后端 schema 要求纯 UUID
        const rawId = request.id.startsWith('canvas-')
          ? request.id.replace('canvas-', '')
          : request.id;

        const capturedContextPayload = contextPayloadRef.current ?? buildContextPayload();
        console.log("[CanvasChat] Preparing request:", {
          id: rawId,
          modelId: currentModelIdRef.current,
          composerMode: activeComposerModeRef.current,
          agentEntryMode: agentEntryModeRef.current,
          imageParams: imageParamsRef.current,
          contextPayload: capturedContextPayload,
          lastMessage: request.messages.at(-1),
        });
        const effectiveComposerMode = activeComposerModeRef.current || activeComposerMode;
        const effectiveAgentEntryMode = agentEntryModeRef.current;
        const hiddenPrompt = hiddenPromptRef.current || undefined;
        const autoContext = autoContextRef.current || undefined;
        const contextPayload = capturedContextPayload;
        const requestModel = allModels.find((model) => model.id === currentModelIdRef.current);
        const requestIsVideoModel = isCanvasVideoModel(requestModel);
        const requestIsConversationModel = isCanvasConversationOnlyModel(requestModel);
        const shouldIncludeImageParams =
          !requestIsVideoModel &&
          (!requestIsConversationModel || effectiveComposerMode === "agent");
        hiddenPromptRef.current = null;
        autoContextRef.current = null;
        contextPayloadRef.current = null;
        return {
          body: {
            ...request.body,
            id: rawId,
            message: request.messages.at(-1),
            agentPresetId:
              effectiveComposerMode === "agent" &&
              effectiveAgentEntryMode === "preset" &&
              selectedAgentPreset?.id
                ? selectedAgentPreset.id
                : undefined,
            selectedChatModel: currentModelIdRef.current,
            composerMode: effectiveComposerMode,
            selectedVisibilityType: "private",
            deepThinkingEnabled: requestIsConversationModel
              ? false
              : requestIsVideoModel || currentModelIdRef.current === "auto"
                ? undefined
                : deepThinkingEnabledRef.current,
            videoParams: requestIsVideoModel ? videoParamsRef.current || undefined : undefined,
            imageParams: shouldIncludeImageParams
              ? imageParamsRef.current || undefined
              : undefined,
            hiddenPrompt,
            autoContext,
            contextPayload,
          },
        };
      },
    }),
    onData: (dataPart: any) => {
      const eventChatId = inFlightChatIdRef.current || activeChatId;
      const isEventForActiveChat = eventChatId === activeChatIdRef.current;

      if (dataPart.type === "data-imageGenerationStatus") {
        try {
          const payload: ImageGenerationStatusStreamPayload =
            typeof dataPart.data === "string" ? JSON.parse(dataPart.data) : dataPart.data;
          if (!payload || typeof payload !== "object") return;
          if (payload.phase === "completed") {
            clearStreamImageGenerationStateForChat(eventChatId);
            return;
          }
          const previousState =
            streamImageGenerationStateByChatId[eventChatId] || null;
          const payloadImageCount = normalizeCanvasImageCount(payload.imageCount);
          const previousImageCount = normalizeCanvasImageCount(previousState?.imageCount);
          setStreamImageGenerationStateForChat(eventChatId, {
            phase: payload.phase || "processing",
            providerType: payload.providerType,
            modelName: getAgentSafeModelName(payload.modelName),
            imageCount:
              payloadImageCount || previousImageCount || undefined,
            queuePosition:
              Number.isFinite(Number(payload.queuePosition)) &&
              Number(payload.queuePosition) >= 0
                ? Number(payload.queuePosition)
                : undefined,
            sameModelRunningCount:
              Number.isFinite(Number(payload.sameModelRunningCount)) &&
              Number(payload.sameModelRunningCount) >= 0
                ? Number(payload.sameModelRunningCount)
                : undefined,
            concurrencyLimit:
              Number.isFinite(Number(payload.concurrencyLimit)) &&
              Number(payload.concurrencyLimit) > 0
                ? Number(payload.concurrencyLimit)
                : undefined,
            estimatedWaitMs:
              Number.isFinite(Number(payload.estimatedWaitMs)) &&
              Number(payload.estimatedWaitMs) >= 0
                ? Number(payload.estimatedWaitMs)
                : undefined,
          });
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-imageGenerationStatus:", e);
        }
        return;
      }

      if (dataPart.type === "data-canvasMedia") {
        try {
          const payload: CanvasMediaStreamPayload =
            typeof dataPart.data === "string" ? JSON.parse(dataPart.data) : dataPart.data;
          if (!payload || typeof payload !== "object") return;
          const imageUrls = Array.isArray(payload.imageUrls)
            ? payload.imageUrls.filter(
                (url): url is string =>
                  typeof url === "string" && /^https?:\/\//i.test(url)
              )
            : [];
          const videoUrls = Array.isArray(payload.videoUrls)
            ? payload.videoUrls.filter(
                (url): url is string =>
                  typeof url === "string" && /^https?:\/\//i.test(url)
              )
            : [];
          if (isEventForActiveChat && (imageUrls.length > 0 || videoUrls.length > 0)) {
            const allUrls = [...imageUrls, ...videoUrls];
            const fallbackMessageId =
              String(payload.messageId || "").trim() ||
              buildCanvasMediaFallbackMessageId(eventChatId, allUrls);
            const mediaMarkdown = buildCanvasMediaMarkdown({ imageUrls, videoUrls });
            const mediaUrlKeys = new Set(
              allUrls.map((url) => normalizeMediaUrl(url)).filter(Boolean)
            );

            setMessages((prevMessages) => {
              const existingIndex = prevMessages.findIndex(
                (message) => message.id === fallbackMessageId
              );
              if (existingIndex >= 0) {
                const existingMessage = prevMessages[existingIndex] as any;
                const existingText = ((existingMessage.parts || []) as any[])
                  .filter((part) => part?.type === "text" && typeof part.text === "string")
                  .map((part) => String(part.text))
                  .join("\n");
                const existingUrlKeys = new Set(
                  [
                    ...extractAssistantImageUrls(existingText),
                    ...extractVideoUrls(existingText),
                  ]
                    .map((url) => normalizeMediaUrl(url))
                    .filter(Boolean)
                );
                const hasAllMedia = Array.from(mediaUrlKeys).every((key) =>
                  existingUrlKeys.has(key)
                );
                if (hasAllMedia) return prevMessages;

                const nextText = [existingText, mediaMarkdown]
                  .filter((text) => String(text || "").trim())
                  .join("\n\n");
                const nextMessages = [...prevMessages];
                nextMessages[existingIndex] = {
                  ...existingMessage,
                  role: "assistant",
                  content: nextText,
                  parts: [{ type: "text", text: nextText }],
                };
                return sortCanvasMessagesByCreatedAt(nextMessages);
              }

              const createdAt = new Date();
              return sortCanvasMessagesByCreatedAt([
                ...prevMessages,
                {
                  id: fallbackMessageId,
                  role: "assistant",
                  content: mediaMarkdown,
                  createdAt,
                  parts: [{ type: "text", text: mediaMarkdown }],
                } as any,
              ]);
            });
          }
          void appendStreamMediaToCanvas(payload);
          clearStreamImageGenerationStateForChat(eventChatId);
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-canvasMedia:", e);
        }
        return;
      }

      if (dataPart.type === "data-agentTargetLock") {
        try {
          const payload: AgentTargetLockStreamPayload =
            typeof dataPart.data === "string" ? JSON.parse(dataPart.data) : dataPart.data;
          if (!payload || typeof payload !== "object") return;
          setAgentTargetLockStateByChatId((prev) => ({
            ...prev,
            [eventChatId]: payload,
          }));
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-agentTargetLock:", e);
        }
        return;
      }

      if (dataPart.type === "data-agentProgress") {
        try {
          const payload: AgentProgressStreamPayload =
            typeof dataPart.data === "string" ? JSON.parse(dataPart.data) : dataPart.data;
          if (!payload || typeof payload !== "object") return;
          setAgentProgressStateForChat(eventChatId, {
            stage: payload.stage || "planning",
            currentStep: payload.currentStep || "analyze",
            title: payload.title,
            message: payload.message,
            toolName: payload.toolName,
            capability: payload.capability,
          });
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-agentProgress:", e);
        }
        return;
      }

      // 处理后端返回的自定义消息
      if (dataPart.type === "data-appendMessage") {
        try {
          const messageData = typeof dataPart.data === 'string'
            ? JSON.parse(dataPart.data)
            : dataPart.data;
          const hasImageGenStartMarker = Array.isArray(messageData.parts)
            ? messageData.parts.some(
                (part: any) =>
                  part?.type === "text" &&
                  typeof part?.text === "string" &&
                  part.text.includes("<!-- IMAGE_GENERATION_START -->")
              )
            : false;
          const hasImageGenEndMarker = Array.isArray(messageData.parts)
            ? messageData.parts.some(
                (part: any) =>
                  part?.type === "text" &&
                  typeof part?.text === "string" &&
                  part.text.includes("<!-- IMAGE_GENERATION_END -->")
              )
            : false;
          const normalizedParts = Array.isArray(messageData.parts) ? messageData.parts : [];
          const appendMessageText = getCanvasAppendMessageText(messageData);
          const normalizedAttachments = Array.isArray(messageData.attachments)
            ? messageData.attachments
            : [];
          const emptyNearestUserImageKeys = new Set<string>();
          const incomingImageUrls = normalizedParts.flatMap((part: any) =>
            part?.type === "text" && typeof part?.text === "string"
              ? extractAssistantImageUrls(part.text, emptyNearestUserImageKeys)
              : typeof part?.url === "string" && /^https?:\/\//i.test(part.url)
                ? [part.url]
                : []
          );
          const incomingVideoUrls = normalizedParts.flatMap((part: any) =>
            part?.type === "text" && typeof part?.text === "string"
              ? extractVideoUrls(part.text)
              : typeof part?.url === "string" &&
                  /^https?:\/\//i.test(part.url) &&
                  /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(part.url)
                ? [part.url]
                : []
          );
          normalizedAttachments.forEach((attachment: any) => {
            const rawUrl = String(attachment?.url || "").trim();
            if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return;
            const contentType = String(attachment?.contentType || "").toLowerCase();
            if (
              contentType.startsWith("video/") ||
              /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(rawUrl)
            ) {
              incomingVideoUrls.push(rawUrl);
              return;
            }
            incomingImageUrls.push(rawUrl);
          });
          if (hasImageGenStartMarker) {
            const previousState =
              streamImageGenerationStateByChatId[eventChatId] || null;
            const latestUserPrompt = getLatestCanvasUserPrompt(
              visibleMessagesChatIdRef.current === eventChatId
                ? visibleMessagesRef.current
                : messages
            );
            const inferredImageCount = inferCanvasImageGenerationCountFromText(
              latestUserPrompt,
              appendMessageText
            );
            const previousImageCount = normalizeCanvasImageCount(previousState?.imageCount);
            const paramImageCount = normalizeCanvasImageCount(
              imageParamsRef.current?.imageCount || 1
            );
            setStreamImageGenerationStateForChat(eventChatId, {
              phase: "processing",
              providerType:
                previousState?.providerType ||
                (activeComposerMode === "agent" ? "alibaba-image" : currentModel?.providerType),
              modelName:
                previousState?.modelName ||
                getAgentSafeModelName(currentModel?.displayName),
              imageCount:
                Math.max(
                  previousImageCount || 0,
                  inferredImageCount || 0,
                  paramImageCount || 1
                ) || 1,
            });
          }
          if (hasImageGenEndMarker || incomingImageUrls.length > 0 || incomingVideoUrls.length > 0) {
            clearStreamImageGenerationStateForChat(eventChatId);
          }

          if (!isEventForActiveChat) {
            return;
          }

          setMessages((prevMessages) => {
            const existingIndex = prevMessages.findIndex(
              (message) => message.id === messageData.id
            );

            if (existingIndex >= 0) {
              const existingMessage = prevMessages[existingIndex];
              const updatedMessage: any = {
                ...existingMessage,
                role: messageData.role || existingMessage.role,
                content:
                  normalizedParts.find((part: any) => part?.type === "text")?.text ||
                  (existingMessage as any).content ||
                  "",
                parts: normalizedParts,
                attachments: normalizedAttachments,
              };

              const nextMessages = [...prevMessages];
              nextMessages[existingIndex] = updatedMessage;
              return sortCanvasMessagesByCreatedAt(nextMessages);
            }

            const createdAtValue =
              messageData.createdAt ||
              messageData.created_at ||
              messageData.timestamp ||
              new Date();
            const newMessage: any = {
              id: messageData.id,
              role: messageData.role,
              content: normalizedParts.find((part: any) => part?.type === "text")?.text || "",
              createdAt: createdAtValue,
              parts: normalizedParts,
              attachments: normalizedAttachments,
            };

            return sortCanvasMessagesByCreatedAt([...prevMessages, newMessage]);
          });
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-appendMessage:", e);
        }
        return;
      }

      if (dataPart.type === "data-videoStoryboard") {
        try {
          const payload: VideoStoryboardStreamData =
            typeof dataPart.data === "string"
              ? JSON.parse(dataPart.data)
              : dataPart.data;
          if (!payload || typeof payload !== "object") return;

          if (payload.stage === "start") {
            const taskId = String(payload.taskId || "").trim();
            if (!taskId) return;
            if (storyboardNodeMapRef.current[taskId]) return;

            const totalShots = Math.max(1, Math.min(9, Number(payload.totalShots || 9)));
            const layoutCols =
              Math.max(1, Math.min(3, Number(payload.cols || (totalShots === 4 ? 2 : 3)))) || 3;
            const shotNodeMap: Record<number, string> = {};
            const currentNodes = useCanvasStore.getState().nodes;
            const baseOffset = currentNodes.length;
            const cardWidth = 320;
            const cardHeight = 196;
            const gapX = 30;
            const gapY = 24;
            const startX = 120 + (baseOffset % 2) * 420;
            const startY = 120 + Math.floor(baseOffset / 2) * 260;

            for (let shotIndex = 1; shotIndex <= totalShots; shotIndex += 1) {
              const shotData = payload.shots?.find((item) => Number(item.shotIndex) === shotIndex);
              const col = (shotIndex - 1) % layoutCols;
              const row = Math.floor((shotIndex - 1) / layoutCols);
              const nodeId = addNode({
                type: "image",
                position: {
                  x: startX + col * (cardWidth + gapX),
                  y: startY + row * (cardHeight + gapY),
                },
                size: { width: cardWidth, height: cardHeight },
                data: {
                  src: shotData?.tileImageUrl || "",
                  status: "generating",
                  title: `镜头 ${shotIndex}`,
                  prompt: shotData?.prompt || `分镜 ${shotIndex} 生成中`,
                  originalSrc: shotData?.tileImageUrl || "",
                  metadata: {
                    storyboardTaskId: taskId,
                    shotIndex,
                    stage: "preview",
                  },
                },
                connections: [],
              });
              shotNodeMap[shotIndex] = nodeId;
            }

            storyboardNodeMapRef.current[taskId] = shotNodeMap;
            toast.message(`分镜预览任务已开始（${totalShots} 段）`);
            return;
          }

          if (payload.stage === "hd_shot_completed") {
            const taskId = String(payload.taskId || "").trim();
            const shotIndex = Math.max(1, Number(payload.shotIndex || 0));
            const imageUrl = String(payload.imageUrl || "").trim();
            if (!taskId || !shotIndex || !imageUrl) return;

            let nodeId = storyboardNodeMapRef.current[taskId]?.[shotIndex];
            if (!nodeId) {
              nodeId = addNode({
                type: "image",
                position: { x: 140 + ((shotIndex - 1) % 3) * 350, y: 150 + Math.floor((shotIndex - 1) / 3) * 230 },
                size: { width: 320, height: 196 },
                data: {
                  src: imageUrl,
                  status: "completed",
                  title: `镜头 ${shotIndex}`,
                  prompt: payload.prompt || `镜头 ${shotIndex}`,
                  metadata: {
                    storyboardTaskId: taskId,
                    shotIndex,
                    stage: "preview",
                  },
                },
                connections: [],
              });
              if (!storyboardNodeMapRef.current[taskId]) {
                storyboardNodeMapRef.current[taskId] = {};
              }
              storyboardNodeMapRef.current[taskId]![shotIndex] = nodeId;
              return;
            }

            const currentNode = useCanvasStore.getState().getNode(nodeId);
            const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
            updateNode(nodeId, {
              data: {
                ...currentData,
                src: imageUrl,
                status: "completed",
                title: currentData.title || `镜头 ${shotIndex}`,
                prompt: payload.prompt || currentData.prompt || `镜头 ${shotIndex}`,
                metadata: {
                  ...(currentData.metadata || {}),
                  storyboardTaskId: taskId,
                  shotIndex,
                  stage: "preview",
                },
              },
            } as any);
            return;
          }

          if (payload.stage === "hd_shot_failed") {
            const taskId = String(payload.taskId || "").trim();
            const shotIndex = Math.max(1, Number(payload.shotIndex || 0));
            if (!taskId || !shotIndex) return;

            const nodeId = storyboardNodeMapRef.current[taskId]?.[shotIndex];
            if (!nodeId) return;
            const currentNode = useCanvasStore.getState().getNode(nodeId);
            const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
            updateNode(nodeId, {
              data: {
                ...currentData,
                status: "failed",
                metadata: {
                  ...(currentData.metadata || {}),
                  previewError: payload.error || "预览图生成失败",
                },
              },
            } as any);
            return;
          }

          if (payload.stage === "awaiting_confirmation") {
            const taskId = String(payload.taskId || "").trim();
            if (!taskId) return;

            const previewShots = Array.isArray(payload.shots) ? payload.shots : [];
            for (const shot of previewShots) {
              const shotIndex = Math.max(1, Number(shot.shotIndex || 0));
              const nodeId = storyboardNodeMapRef.current[taskId]?.[shotIndex];
              if (!nodeId) continue;
              const currentNode = useCanvasStore.getState().getNode(nodeId);
              const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
              updateNode(nodeId, {
                data: {
                  ...currentData,
                  src: String(shot.previewImageUrl || currentData.src || shot.tileImageUrl || ""),
                  originalSrc: String(shot.tileImageUrl || currentData.originalSrc || ""),
                  status: "completed",
                  title: currentData.title || `镜头 ${shotIndex}`,
                  prompt: shot.prompt || currentData.prompt || `镜头 ${shotIndex}`,
                  metadata: {
                    ...(currentData.metadata || {}),
                    storyboardTaskId: taskId,
                    shotIndex,
                    stage: "awaiting_confirmation",
                  },
                },
              } as any);
            }

            toast.message(payload.message || "分镜预览已完成，请先确认镜头内容");
            return;
          }

          if (payload.stage === "shot_completed") {
            const taskId = String(payload.taskId || "").trim();
            const shotIndex = Math.max(1, Number(payload.shotIndex || 0));
            const videoUrl = String(payload.videoUrl || "").trim();
            if (!taskId || !shotIndex || !videoUrl) return;

            let nodeId = storyboardNodeMapRef.current[taskId]?.[shotIndex];
            if (!nodeId) {
              nodeId = addNode({
                type: "video",
                position: { x: 140 + ((shotIndex - 1) % 3) * 350, y: 150 + Math.floor((shotIndex - 1) / 3) * 230 },
                size: { width: 320, height: 196 },
                data: {
                  src: videoUrl,
                  status: "completed",
                  prompt: `分镜 ${shotIndex}`,
                },
                connections: [],
              });
              if (!storyboardNodeMapRef.current[taskId]) {
                storyboardNodeMapRef.current[taskId] = {};
              }
              storyboardNodeMapRef.current[taskId]![shotIndex] = nodeId;
              return;
            }

            const currentNode = useCanvasStore.getState().getNode(nodeId);
            const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
            updateNode(nodeId, {
              type: "video",
              data: {
                src: videoUrl,
                status: "completed",
                prompt: currentData.prompt || `分镜 ${shotIndex}`,
                coverImage: currentData.src || currentData.originalSrc || "",
                metadata: {
                  ...(currentData.metadata || {}),
                  storyboardTaskId: taskId,
                  shotIndex,
                  stage: "video",
                },
              },
            } as any);
            return;
          }

          if (payload.stage === "shot_failed") {
            const taskId = String(payload.taskId || "").trim();
            const shotIndex = Math.max(1, Number(payload.shotIndex || 0));
            if (!taskId || !shotIndex) return;
            const nodeId = storyboardNodeMapRef.current[taskId]?.[shotIndex];
            if (!nodeId) return;
            const currentNode = useCanvasStore.getState().getNode(nodeId);
            const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
            updateNode(nodeId, {
              data: {
                ...currentData,
                status: "failed",
              },
            } as any);
            return;
          }

          if (payload.stage === "completed") {
            const successCount = Math.max(0, Number(payload.successCount || 0));
            const failedCount = Math.max(0, Number(payload.failedCount || 0));
            toast.success(`分镜视频完成：成功 ${successCount}，失败 ${failedCount}`);
            return;
          }

          if (payload.stage === "failed") {
            toast.error(payload.error || "分镜视频任务失败");
          }
        } catch (e) {
          console.error("[CanvasChat] Failed to parse data-videoStoryboard:", e);
        }
      }
    },
    onFinish: async () => {
      const finishedChatId = inFlightChatIdRef.current || activeChatId;
      const finishedRawChatId =
        inFlightRawChatIdRef.current || toRawCanvasChatId(finishedChatId);
      const finishedUserMessageId = inFlightUserMessageIdRef.current;
      if (!finishedRawChatId) return;

      const syncMessagesFromDatabase = (dbMessages: ChatMessage[]) => {
        if (finishedChatId !== activeChatIdRef.current) {
          void mutate(`/api/messages?chatId=${finishedRawChatId}`);
          return true;
        }

        const visibleMessagesBelongToFinishedChat =
          visibleMessagesChatIdRef.current === finishedChatId ||
          visibleMessagesChatIdRef.current === finishedRawChatId;
        if (
          dbMessages.length === 0 &&
          visibleMessagesBelongToFinishedChat &&
          visibleMessagesRef.current.length > 0
        ) {
          console.warn(
            "[CanvasChat] 跳过空历史覆盖，等待数据库消息同步完成:",
            finishedRawChatId,
          );
          return false;
        }

        const historySignature = buildCanvasHistoryMessagesSignature(finishedRawChatId, dbMessages);
        loadedHistorySignatureRef.current = historySignature;
        processedMessageIds.current = new Set();
        hasHydratedHistoryRef.current = true;

        const sortedDbMessages = reconcileCanvasMessagesWithHistory({
          visibleMessages: visibleMessagesRef.current,
          historyMessages: dbMessages,
          preserveMessageIds: pendingPersistenceMessageIdsRef.current,
        });
        setMessages(sortedDbMessages);
        if (sortedDbMessages.length > 0) {
          lastNonEmptyMessagesByChatIdRef.current[finishedChatId] = sortedDbMessages;
          lastNonEmptyMessagesByChatIdRef.current[finishedRawChatId] = sortedDbMessages;
          writeCanvasChatMessageSnapshot(finishedChatId, sortedDbMessages);
        }

        if (dbMessages.length > 0) {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
          });
        }
        return true;
      };

      const reloadMessagesOnce = async () => {
        const response = await apiFetch(`/api/messages?chatId=${finishedRawChatId}&_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return {
            hasResponse: false,
            hasResult: false,
            hasError: false,
            hasTarget: false,
          };
        }

        const data = await response.json().catch(() => ({}));
        if (!Array.isArray(data?.messages)) {
          return {
            hasResponse: false,
            hasResult: false,
            hasError: false,
            hasTarget: false,
          };
        }

        const dbMessages = data.messages as ChatMessage[];
        const didSyncMessages = syncMessagesFromDatabase(dbMessages);
        if (!didSyncMessages) {
          return {
            hasResponse: false,
            hasResult: false,
            hasError: false,
            hasTarget: false,
          };
        }

        const hasTarget = finishedUserMessageId
          ? dbMessages.some(
              (currentMessage) =>
                currentMessage.role === "user" &&
                currentMessage.id === finishedUserMessageId
            )
          : true;
        const assistantMessages =
          getCanvasAssistantMessagesAfterTargetUser(
            dbMessages,
            finishedUserMessageId
          );
        const hasResponse = assistantMessages.length > 0;
        const hasResult = assistantMessages.some((message) => {
          if (hasCanvasImageMarkdown((message as any).parts)) return true;
          const text = ((message as any).parts || [])
            .filter((part: any) => part?.type === "text" && typeof part.text === "string")
            .map((part: any) => String(part.text))
            .join("\n");
          return extractAssistantImageUrls(text).length > 0 || extractVideoUrls(text).length > 0;
        });
        const hasError = assistantMessages.some((message) =>
          hasCanvasLikelyGenerationErrorMessage(message),
        );

        return { hasResponse, hasResult, hasError, hasTarget };
      };

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 450));

        let result = await reloadMessagesOnce();
        if (!result.hasResponse && !result.hasError) {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            result = await reloadMessagesOnce();
            if (result.hasResponse || result.hasError) {
              break;
            }
          }
        }
        if (finishedUserMessageId && result.hasTarget) {
          pendingPersistenceMessageIdsRef.current.delete(
            finishedUserMessageId
          );
        }
      } catch (error) {
        console.error("[CanvasChat] Failed to sync messages after finish:", error);
      } finally {
        if (inFlightChatIdRef.current === finishedChatId) {
          inFlightChatIdRef.current = null;
          inFlightRawChatIdRef.current = null;
          inFlightUserMessageIdRef.current = null;
        }
      }
    },
    onError: (error) => {
      const failedChatId = inFlightChatIdRef.current || activeChatId;
      const fallbackMessage =
        error instanceof Error ? error.message : "生成失败";
      const providerPrompt = getProviderApiKeyPromptPayload(error);
      const isProviderApiKeyError = Boolean(providerPrompt);
      if (providerPrompt) {
        dispatchProviderApiKeyPrompt(providerPrompt);
      }
      const userFacingError = getUserFacingError(
        error,
        "生成失败，请稍后重试"
      );
      const progressMessage = providerPrompt?.error || userFacingError.message;
      clearStreamImageGenerationStateForChat(failedChatId);
      setAgentProgressStateForChat(failedChatId, {
        stage: "failed",
        currentStep: "execute",
        title: "本轮请求失败",
        message: progressMessage,
      });
      releaseSendGuard(failedChatId);
      if (inFlightChatIdRef.current === failedChatId) {
        inFlightChatIdRef.current = null;
        inFlightRawChatIdRef.current = null;
        inFlightUserMessageIdRef.current = null;
      }
      const responseData = (error as any)?.data;
      const isInsufficientPoints =
        responseData?.error === "insufficient_points" ||
        /积分不足/.test(fallbackMessage);

      if (isInsufficientPoints) {
        const balance = Math.max(0, Number(responseData?.balance ?? 0));
        const expectedCost = Math.max(0, Number(responseData?.expectedCost ?? 0));
        const unitCost = Math.max(0, Number(responseData?.unitCost ?? 0));
        const imageCount =
          unitCost > 0 && expectedCost > 0
            ? Math.max(1, Math.round(expectedCost / unitCost))
            : Math.max(1, Math.round(Number(imageParamsRef.current?.imageCount || 1)));
        setInsufficientPointsState({
          balance,
          expectedCost,
          unitCost,
          imageCount,
        });
      }

      if (failedChatId === activeChatIdRef.current && !isProviderApiKeyError) {
        toast.error(userFacingError.message);
      }
    },
  });

  useEffect(() => {
    visibleMessagesRef.current = messages;
    visibleMessagesChatIdRef.current = activeChatId;
    if (messages.length === 0) return;

    const sortedMessages = sortCanvasMessagesByCreatedAt(messages);
    lastNonEmptyMessagesByChatIdRef.current[activeChatId] = sortedMessages;
    const rawActiveChatId = toRawCanvasChatId(activeChatId);
    if (rawActiveChatId) {
      lastNonEmptyMessagesByChatIdRef.current[rawActiveChatId] = sortedMessages;
    }
    writeCanvasChatMessageSnapshot(activeChatId, sortedMessages);
  }, [activeChatId, messages]);

  useEffect(() => {
    if (status === "ready") {
      releaseSendGuard(activeChatId);
    }
  }, [activeChatId, releaseSendGuard, status]);

  useEffect(() => {
    const launchPayload = pendingLaunchRef.current;
    if (!launchPayload?.autoSend) return;
    if (!selectedModelId || status !== "ready") return;

    const launchAttachments = (launchPayload.attachments || [])
      .map((attachment) => sanitizeChatAttachment(attachment as PickedObjectAttachment))
      .filter((attachment): attachment is PickedObjectAttachment => Boolean(attachment));
    const textContent =
      clampChatRequestText(launchPayload.prompt?.trim() || "", MAX_CHAT_TEXT_PART_LENGTH) ||
      (launchAttachments.length > 0 ? "请基于这些图片继续生成设计方案" : "");

    if (!textContent && launchAttachments.length === 0) {
      pendingLaunchRef.current = null;
      return;
    }

    const parts: any[] = launchAttachments.map((attachment) => ({
      type: "file" as const,
      mediaType: normalizeChatMediaType(attachment.contentType),
      name: normalizeChatAttachmentName(attachment.name),
      url: attachment.url,
      assetId: isValidChatUuid(attachment.assetId) ? attachment.assetId : undefined,
    }));

    if (textContent) {
      parts.push({ type: "text" as const, text: textContent });
    }

    // 强制同步当前模型，避免模型切换后瞬时发送命中旧模型
    const launchUserMessageId = generateUUID();
    currentModelIdRef.current = selectedModelId;
    inFlightChatIdRef.current = activeChatId;
    inFlightRawChatIdRef.current = rawChatId;
    inFlightUserMessageIdRef.current = launchUserMessageId;
    pendingPersistenceMessageIdsRef.current.add(launchUserMessageId);
    const launchCreatedAt = new Date();
    const launchUserMessage = {
      id: launchUserMessageId,
      role: "user",
      parts,
      attachments: launchAttachments,
      createdAt: launchCreatedAt,
      metadata: {
        createdAt: launchCreatedAt.toISOString(),
        composerMode: activeComposerModeRef.current || activeComposerMode,
        modelId: selectedModelId,
      },
    } as ChatMessage;

    void sendMessage(launchUserMessage as any);
    hasHydratedHistoryRef.current = true;

    pendingLaunchRef.current = null;
    setInput("");
    setAttachments([]);
    clearSelection();

    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (editableDiv) {
      editableDiv.innerHTML = "";
    }
  }, [activeChatId, rawChatId, selectedModelId, status, sendMessage, setMessages, clearSelection, launchAutoSendTick, activeComposerMode]);

  // 当历史消息加载完成后，更新消息列表（支持同一会话的增量刷新）
  const loadedHistorySignatureRef = useRef<string>("");
  useEffect(() => {
    if (historyScrollTimerRef.current) {
      clearTimeout(historyScrollTimerRef.current);
      historyScrollTimerRef.current = null;
    }

    if (!historyData || !rawChatId) return;
    const shouldForceHydrate = forceHistoryHydrationRef.current === rawChatId;
    if ((status === "streaming" || status === "submitted") && !shouldForceHydrate) return;

    const historyMessages = historyData.messages || [];
    const signature = buildCanvasHistoryMessagesSignature(rawChatId, historyMessages);

    if (loadedHistorySignatureRef.current === signature) return;

    if (historyMessages.length === 0 && !shouldForceHydrate) {
      const cachedMessages =
        lastNonEmptyMessagesByChatIdRef.current[activeChatId] ||
        lastNonEmptyMessagesByChatIdRef.current[rawChatId] ||
        readCanvasChatMessageSnapshot(activeChatId);
      const visibleMessagesBelongToActiveChat =
        visibleMessagesChatIdRef.current === activeChatId ||
        visibleMessagesChatIdRef.current === rawChatId;
      const currentVisibleMessages = visibleMessagesBelongToActiveChat
        ? visibleMessagesRef.current
        : [];
      const messagesToPreserve =
        currentVisibleMessages.length > 0 ? currentVisibleMessages : cachedMessages;

      if (messagesToPreserve.length > 0) {
        const sortedMessages = sortCanvasMessagesByCreatedAt(messagesToPreserve);
        if (visibleMessagesRef.current.length === 0) {
          setMessages(sortedMessages);
          setMessageViewportKey((prev) => prev + 1);
        }
        lastNonEmptyMessagesByChatIdRef.current[activeChatId] = sortedMessages;
        lastNonEmptyMessagesByChatIdRef.current[rawChatId] = sortedMessages;
        hasHydratedHistoryRef.current = true;
        console.warn(
          "[CanvasChat] 跳过空历史覆盖，保留当前会话消息:",
          sortedMessages.length,
          rawChatId,
        );
        return;
      }
    }

    loadedHistorySignatureRef.current = signature;
    processedMessageIds.current = new Set();
    hasHydratedHistoryRef.current = true;
    forceHistoryHydrationRef.current = null;
    const persistedHistoryIds = new Set(
      historyMessages.map((message) => message.id)
    );
    for (const pendingMessageId of pendingPersistenceMessageIdsRef.current) {
      if (persistedHistoryIds.has(pendingMessageId)) {
        pendingPersistenceMessageIdsRef.current.delete(pendingMessageId);
      }
    }
    const sortedHistoryMessages = reconcileCanvasMessagesWithHistory({
      visibleMessages: visibleMessagesRef.current,
      historyMessages,
      preserveMessageIds: pendingPersistenceMessageIdsRef.current,
    });
    setMessages(sortedHistoryMessages);
    if (sortedHistoryMessages.length > 0) {
      lastNonEmptyMessagesByChatIdRef.current[activeChatId] = sortedHistoryMessages;
      lastNonEmptyMessagesByChatIdRef.current[rawChatId] = sortedHistoryMessages;
      writeCanvasChatMessageSnapshot(activeChatId, sortedHistoryMessages);
    }
    setMessageViewportKey((prev) => prev + 1);
    console.log("[CanvasChat] 已同步历史消息:", historyMessages.length, signature);

    if (historyMessages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      });
      historyScrollTimerRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        historyScrollTimerRef.current = null;
      }, 160);
      return () => {
        if (historyScrollTimerRef.current) {
          clearTimeout(historyScrollTimerRef.current);
          historyScrollTimerRef.current = null;
        }
      };
    }
  }, [activeChatId, historyData, rawChatId, setMessages, status]);

  useEffect(() => {
    const streamState = streamImageGenerationStateByChatId[activeChatId];
    if (!rawChatId || !streamState) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        await mutateHistoryData();
      } catch (error) {
        console.error("[CanvasChat] Failed to poll message history:", error);
      }
    };

    void poll();
    const timer = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeChatId, rawChatId, streamImageGenerationStateByChatId, mutateHistoryData]);

  useEffect(() => {
    const streamState = streamImageGenerationStateByChatId[activeChatId];
    if (!streamState || messages.length === 0) return;

    const lastUserIndex = [...messages]
      .map((message) => message.role)
      .lastIndexOf("user");
    const assistantMessages =
      lastUserIndex >= 0
        ? messages.slice(lastUserIndex + 1).filter((message) => message.role === "assistant")
        : messages.filter((message) => message.role === "assistant");

    const hasCompletedMedia = assistantMessages.some((message) => {
      const parts = (message.parts || []) as any[];
      const textContent = parts
        .filter((part) => part?.type === "text" && typeof part?.text === "string")
        .map((part) => String(part.text))
        .join("\n");
      return (
        extractAssistantImageUrls(textContent).length > 0 ||
        extractVideoUrls(textContent).length > 0 ||
        /失败|超时|重试|error|failed/i.test(textContent)
      );
    });

    if (hasCompletedMedia) {
      clearStreamImageGenerationStateForChat(activeChatId);
    }
  }, [
    activeChatId,
    messages,
    streamImageGenerationStateByChatId,
    clearStreamImageGenerationStateForChat,
  ]);

  // 监听消息变化，提取图片并添加到画布
  // 仅处理历史同步后的新消息，避免刷新后把历史图片重复回灌到画布
  const processedMessageIds = useRef<Set<string>>(new Set());
  const hasHydratedHistoryRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedChatStateRef.current) {
      hasInitializedChatStateRef.current = true;
      return;
    }

    loadedHistorySignatureRef.current = "";
    processedMessageIds.current.clear();
    hasHydratedHistoryRef.current = false;
    hiddenPromptRef.current = null;
    autoContextRef.current = null;
    pendingLaunchRef.current = null;
    setMessageViewportKey((prev) => prev + 1);
    const rawNextChatId = toRawCanvasChatId(activeChatId);
    const restoredMessages = sortCanvasMessagesByCreatedAt(
      lastNonEmptyMessagesByChatIdRef.current[activeChatId] ||
        (rawNextChatId
          ? lastNonEmptyMessagesByChatIdRef.current[rawNextChatId]
          : undefined) ||
        readCanvasChatMessageSnapshot(activeChatId)
    );
    visibleMessagesChatIdRef.current = activeChatId;
    visibleMessagesRef.current = restoredMessages;
    hasHydratedHistoryRef.current = restoredMessages.length > 0;
    setMessages(restoredMessages);
    setInput("");
    setAttachments([]);
    setIsSessionMenuOpen(false);
    setDetailSlotPickerIndex(null);

    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (editableDiv) {
      editableDiv.innerHTML = "";
    }
  }, [activeChatId, setMessages]);

  useEffect(() => {
    if (!activeChatId) return;

    const derivedTitle = deriveSessionTitleFromMessages(messages);
    const now = Date.now();

    setChatSessions((prevSessions) => {
      const currentIndex = prevSessions.findIndex(
        (session) => session.id === activeChatId
      );
      const fallbackTitle = `对话 ${prevSessions.length + 1}`;

      if (currentIndex < 0) {
        const created: CanvasChatSession = {
          id: activeChatId,
          title: derivedTitle || fallbackTitle,
          createdAt: now,
          updatedAt: now,
        };
        return [created, ...prevSessions];
      }

      const current = prevSessions[currentIndex];
      const nextTitle = derivedTitle || current.title || fallbackTitle;
      const shouldUpdate =
        current.title !== nextTitle || current.updatedAt !== now;

      if (!shouldUpdate) return prevSessions;

      const nextSessions = [...prevSessions];
      nextSessions[currentIndex] = {
        ...current,
        title: nextTitle,
        updatedAt: now,
      };
      nextSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      return nextSessions;
    });
  }, [activeChatId, messages]);

  useEffect(() => {
    if (!hasHydratedHistoryRef.current) return;

    let cancelled = false;

    const processNewAssistantMessages = async () => {
      const suppressedMediaKeys = new Set(
        (useCanvasStore.getState().getCanvasState().suppressedMediaKeys || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      );
      const existingImageUrlKeys = new Set(
        nodes
          .filter((n) => n.type === "image" && (n.data as any)?.src)
          .map((n) => normalizeImageIdentityUrl((n.data as any).src))
          .filter(Boolean)
      );
      const existingMessageImageKeys = new Set(
        nodes
          .filter((n) => n.type === "image")
          .map((n) => {
            const data = ((n.data as any) || {}) as Record<string, any>;
            const metadata = ((data.metadata as any) || {}) as Record<string, any>;
            const sourceMessageId = String(metadata.sourceMessageId || "").trim();
            if (!sourceMessageId) return "";
            const sourceImageKey = normalizeImageIdentityUrl(
              String(metadata.sourceImageKey || data.src || "").trim()
            );
            if (!sourceImageKey) return "";
            return `${sourceMessageId}::${sourceImageKey}`;
          })
          .filter(Boolean)
      );
      const existingVideoUrlKeys = new Set(
        nodes
          .filter((n) => n.type === "video" && (n.data as any)?.src)
          .map((n) => normalizeMediaUrl((n.data as any).src))
          .filter(Boolean)
      );

      for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
        if (cancelled) return;
        const message = messages[messageIndex];
        if (message.role !== "assistant" || processedMessageIds.current.has(message.id)) {
          continue;
        }

        const nearestUserImageKeys = getNearestUserImageUrlKeys(messages, messageIndex);
        const nearestUserImageUrls = getNearestUserImageUrls(messages, messageIndex);
        const imageUrlSet = new Set<string>();
        const videoUrlSet = new Set<string>();
        const parts = (message.parts || []) as any[];

        parts.forEach((part) => {
          if (!part) return;

          if (part.type === "text" && typeof part.text === "string") {
            extractAssistantImageUrls(part.text, nearestUserImageKeys).forEach((url) =>
              imageUrlSet.add(url)
            );
            extractVideoUrls(part.text).forEach((url) => videoUrlSet.add(url));
            return;
          }

          const rawUrl =
            typeof part.url === "string" && part.url.trim()
              ? part.url.trim()
              : typeof part.data === "string" && part.data.trim()
                ? part.data.trim()
                : "";
          if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return;

          const mediaType = String(
            part.mediaType || part.mimeType || part.contentType || ""
          ).toLowerCase();
          if (
            mediaType.startsWith("video/") ||
            /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(rawUrl)
          ) {
            videoUrlSet.add(rawUrl);
            return;
          }

          imageUrlSet.add(rawUrl);
        });

        const messageAttachments = ((message as any).attachments || []) as Array<{
          url?: string;
          contentType?: string;
        }>;
        messageAttachments.forEach((attachment) => {
          const rawUrl = String(attachment?.url || "").trim();
          if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return;
          const contentType = String(attachment?.contentType || "").toLowerCase();
          if (
            contentType.startsWith("video/") ||
            /\.(mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(rawUrl)
          ) {
            videoUrlSet.add(rawUrl);
            return;
          }
          imageUrlSet.add(rawUrl);
        });

        const legacyContent =
          typeof (message as any).content === "string"
            ? (message as any).content
            : "";
        if (legacyContent) {
          extractAssistantImageUrls(legacyContent, nearestUserImageKeys).forEach((url) =>
            imageUrlSet.add(url)
          );
          extractVideoUrls(legacyContent).forEach((url) => videoUrlSet.add(url));
        }

        const imageUrls = Array.from(imageUrlSet);
        const videoUrls = Array.from(videoUrlSet);
        if (imageUrls.length === 0 && videoUrls.length === 0) continue;

        processedMessageIds.current.add(message.id);
        const generationPrompt = findNearestUserPrompt(messages, messageIndex);

        let addedImageCount = 0;
        let addedVideoCount = 0;
        const insertedNodeIds: string[] = [];
        const completedAt = Date.now();

        const newImageEntries = imageUrls.reduce<Array<{ url: string; sourceImageKey: string }>>(
          (acc, url) => {
            const sourceImageKey = normalizeImageIdentityUrl(url);
            if (!sourceImageKey || existingImageUrlKeys.has(sourceImageKey)) {
              return acc;
            }
            const messageImageKey = `${message.id}::${sourceImageKey}`;
            if (
              suppressedMediaKeys.has(`image:${messageImageKey}`) ||
              suppressedMediaKeys.has(`image-url:${url}`)
            ) {
              return acc;
            }
            if (existingMessageImageKeys.has(messageImageKey)) {
              return acc;
            }
            existingImageUrlKeys.add(sourceImageKey);
            existingMessageImageKeys.add(messageImageKey);
            acc.push({ url, sourceImageKey });
            return acc;
          },
          []
        );

        for (let index = 0; index < newImageEntries.length; index += 1) {
          if (cancelled) return;
          const imageEntry = newImageEntries[index];
          const url = imageEntry.url;
          const messageImageKey = `${message.id}::${imageEntry.sourceImageKey}`;
          const hasDuplicateInStore = useCanvasStore
            .getState()
            .nodes.some((node) => {
              if (node.type !== "image") return false;
              const data = ((node.data as any) || {}) as Record<string, any>;
              const metadata = ((data.metadata as any) || {}) as Record<string, any>;
              const sourceMessageId = String(metadata.sourceMessageId || "").trim();
              const sourceImageKey = normalizeImageIdentityUrl(
                String(metadata.sourceImageKey || data.src || "").trim()
              );
              if (!sourceImageKey) return false;
              const nodeMessageImageKey = sourceMessageId
                ? `${sourceMessageId}::${sourceImageKey}`
                : "";
              return (
                nodeMessageImageKey === messageImageKey ||
                sourceImageKey === imageEntry.sourceImageKey
              );
            });
          if (hasDuplicateInStore) {
            continue;
          }

          const dimensions = await getImageDimensions(url);
          const compareSourceUrlRaw =
            nearestUserImageUrls[Math.min(index, Math.max(0, nearestUserImageUrls.length - 1))] ||
            nearestUserImageUrls[0] ||
            "";
          const compareSourceUrl = String(compareSourceUrlRaw || "").trim();
          const normalizedCompareSource = normalizeImageIdentityUrl(compareSourceUrl);
          const canUseCompareSource =
            Boolean(normalizedCompareSource) &&
            normalizedCompareSource !== imageEntry.sourceImageKey;
          const sourceNodeId = canUseCompareSource
            ? useCanvasStore
                .getState()
                .nodes.find((node) => {
                  if (node.type !== "image") return false;
                  const src = String(((node.data as any) || {}).src || "").trim();
                  return normalizeImageIdentityUrl(src) === normalizedCompareSource;
                })?.id || ""
            : "";

          const currentNodes = useCanvasStore.getState().nodes;
          const anchorNode = findCanvasImageAnchorNode(currentNodes, {
            selectedNodes:
              generationAnchorNodesRef.current.length > 0
                ? generationAnchorNodesRef.current
                : selectedImageNodesRef.current,
            sourceImageUrls: nearestUserImageUrls,
          });
          const size = anchorNode
            ? {
                width: Math.max(
                  1,
                  Math.round(Number(anchorNode.size?.width || dimensions.width))
                ),
                height: Math.max(
                  1,
                  Math.round(Number(anchorNode.size?.height || dimensions.height))
                ),
              }
            : { width: dimensions.width, height: dimensions.height };
          const position = getAnchoredGenerationPosition({
            anchorNode,
            existingNodes: currentNodes,
            fallbackNodeCount: currentNodes.length + addedImageCount + addedVideoCount,
            index,
            size,
            viewport: useCanvasStore.getState().viewport,
          });

          const nodeId = addNode({
            type: "image",
            position,
            size,
            data: {
              src: url,
              status: "completed",
              title: "图片",
              prompt: generationPrompt || "对话生成",
              originalSrc: canUseCompareSource ? compareSourceUrl : undefined,
              metadata: {
                originalWidth: dimensions.originalWidth,
                originalHeight: dimensions.originalHeight,
                generationPrompt: generationPrompt || undefined,
                sourceMessageId: message.id,
                sourceImageKey: imageEntry.sourceImageKey,
                compareSourceUrl: canUseCompareSource ? compareSourceUrl : undefined,
                sourceNodeId: sourceNodeId || anchorNode?.id || undefined,
                placementMode: "anchored-generation",
                recentlyGeneratedAt: completedAt,
              },
            },
            connections: sourceNodeId ? [sourceNodeId] : anchorNode?.id ? [anchorNode.id] : [],
          });
          insertedNodeIds.push(nodeId);
          void autoNameGeneratedImageNode(nodeId, url);
          addedImageCount += 1;
        }

        if (insertedNodeIds.length > 0) {
          selectNodes(insertedNodeIds);
          const focusNode = useCanvasStore
            .getState()
            .nodes.find((node) => node.id === insertedNodeIds[0]);
          if (focusNode) {
            focusCanvasOnNode(focusNode);
          }
        }

        const newVideoUrls = videoUrls.filter((url) => {
          const key = normalizeMediaUrl(url);
          if (!key || existingVideoUrlKeys.has(key)) return false;
          if (suppressedMediaKeys.has(`video:${url}`)) return false;
          existingVideoUrlKeys.add(key);
          return true;
        });

        for (let index = 0; index < newVideoUrls.length; index += 1) {
          if (cancelled) return;
          const url = newVideoUrls[index];
          const existingNodes = nodes.length + addedImageCount + addedVideoCount;
          const x = 120 + (existingNodes % 2) * 420;
          const y = 120 + Math.floor(existingNodes / 2) * 260;
          addNode({
            type: "video",
            position: { x, y },
            size: { width: 380, height: 220 },
            data: {
              src: url,
              status: "completed",
              prompt: generationPrompt || "对话生成",
            },
            connections: [],
          });
          addedVideoCount += 1;
        }

      }
    };

    void processNewAssistantMessages();
    return () => {
      cancelled = true;
    };
  }, [
    messages,
    addNode,
    nodes,
    autoNameGeneratedImageNode,
    focusCanvasOnNode,
    selectNodes,
  ]);

  useEffect(() => {
    if (nodes.length < 2) return;

    const seenKeys = new Set<string>();
    const duplicateNodeIds: string[] = [];

    for (const node of nodes) {
      const identityKey = getAssistantImageNodeIdentityKey(node);
      if (!identityKey) continue;
      if (seenKeys.has(identityKey)) {
        duplicateNodeIds.push(node.id);
        continue;
      }
      seenKeys.add(identityKey);
    }

    if (duplicateNodeIds.length === 0) return;

    duplicateNodeIds.forEach((nodeId) => deleteNode(nodeId));
    console.warn(
      "[CanvasChat] Removed duplicate assistant image nodes:",
      duplicateNodeIds.length
    );
  }, [deleteNode, nodes]);

  // 为历史节点补全可编辑的原始提示词（旧数据里可能只有“对话生成”占位文案）
  useEffect(() => {
    if (!messages.length || !nodes.length) return;

    const promptByImageUrl = new Map<string, string>();
    messages.forEach((message, messageIndex) => {
      if (message.role !== "assistant") return;
      const content = message.parts?.map((p: any) => p.text || "").join("") || "";
      const imageUrls = extractImageUrls(content);
      if (!imageUrls.length) return;

      const prompt = findNearestUserPrompt(messages, messageIndex);
      if (!prompt) return;

      imageUrls.forEach((url) => {
        if (!promptByImageUrl.has(url)) {
          promptByImageUrl.set(url, prompt);
        }
      });
    });

    nodes.forEach((node) => {
      if (node.type !== "image") return;
      const data = (node.data as any) || {};
      const src = data.src as string | undefined;
      if (!src) return;
      if (!isGenericCanvasPrompt(data.prompt)) return;

      const prompt = promptByImageUrl.get(src);
      if (!prompt) return;

      updateNode(node.id, {
        data: {
          ...data,
          prompt,
          metadata: {
            ...(data.metadata || {}),
            generationPrompt: prompt,
          },
        },
      });
    });
  }, [messages, nodes, updateNode]);

  // 滚动到底部
  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 标记是否已经为当前画布设置过标题（避免重复调用）
  const hasSetCanvasTitle = useRef(false);

  // 🆕 Agent 模式上下文（画布图片布局）
  const buildAutoContext = useCallback(() => {
    const imageNodes = nodes.filter((n) => isCanvasImageReadyForAi(n));
    if (imageNodes.length === 0) return "";

    const MAX_CONTEXT_IMAGES = 6;
    const xs = imageNodes.map(n => n.position.x);
    const ys = imageNodes.map(n => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const positionLabel = (node: (typeof imageNodes)[number]) => {
      const relX = (node.position.x - minX) / spanX;
      const relY = (node.position.y - minY) / spanY;
      const horizontal = relX <= 0.33 ? "左" : relX >= 0.66 ? "右" : "中";
      const vertical = relY <= 0.33 ? "上" : relY >= 0.66 ? "下" : "中";
      if (horizontal === "中" && vertical === "中") return "中间";
      return `${vertical}${horizontal}`;
    };

    const selectedNodes = selectedImageNodes.length > 0 ? selectedImageNodes : [];
    const contextNodes = (selectedNodes.length > 0 ? selectedNodes : imageNodes.slice(-MAX_CONTEXT_IMAGES)).slice(0, MAX_CONTEXT_IMAGES);

    const lines = [
      `画布图片总数: ${imageNodes.length}`,
      selectedNodes.length > 0
        ? `用户已选中 ${selectedNodes.length} 张图片，优先处理这些`
        : `用户未选中图片，默认使用最近 ${contextNodes.length} 张`,
      ...contextNodes.map((node, index) => {
        const label = positionLabel(node);
        const metadata = (node.data as any)?.metadata;
        const originalWidth = Number(metadata?.originalWidth || 0);
        const originalHeight = Number(metadata?.originalHeight || 0);
        const originalSize =
          originalWidth > 0 && originalHeight > 0
            ? `，原图分辨率 ${Math.round(originalWidth)}x${Math.round(originalHeight)}`
            : "";
        const prompt = (node.data as any)?.prompt;
        return `图片${index + 1}: ${label}${originalSize}${prompt ? `，描述：${String(prompt).slice(0, 60)}` : ""}`;
      }),
      "若用户提到左/右/上/下/中等方位，请匹配对应位置的图片。",
    ];

    return lines.join("\n");
  }, [nodes, selectedImageNodes]);

  const buildContextPayload = useCallback(() => {
    const imageNodes = nodes.filter(
      (node) =>
        node.type === "image" &&
        isValidChatHttpUrl(String((node.data as any)?.src || "").trim()),
    );

    if (imageNodes.length === 0) {
      generationAnchorNodesRef.current = [];
      return undefined;
    }

    const effectiveComposerMode = activeComposerModeRef.current || activeComposerMode;
    const shouldIsolateDirectModeContext = effectiveComposerMode !== "agent";
    const selectedImageNodesForContext = selectedImageNodes.filter((node) =>
      isValidChatHttpUrl(String((node.data as any)?.src || "").trim())
    );

    if (shouldIsolateDirectModeContext && selectedImageNodesForContext.length === 0) {
      generationAnchorNodesRef.current = [];
      return undefined;
    }

    const MAX_CONTEXT_IMAGES = 12;
    const selectedContextNodes = shouldIsolateDirectModeContext
      ? selectedImageNodesForContext
      : selectedImageNodesForContext.slice(0, 20);
    generationAnchorNodesRef.current = selectedContextNodes.slice(0, 4);
    const selectedIds = new Set(selectedContextNodes.map((node) => node.id));
    const prioritizedNodes =
      shouldIsolateDirectModeContext
        ? selectedContextNodes
      : selectedContextNodes.length > 0
        ? [
            ...selectedContextNodes,
            ...imageNodes.filter((node) => !selectedIds.has(node.id)),
          ]
        : imageNodes;
    const contextNodes = shouldIsolateDirectModeContext
      ? prioritizedNodes
      : prioritizedNodes.slice(0, MAX_CONTEXT_IMAGES);
    const selectedAssetIds = Array.from(
      new Set(
        selectedContextNodes
          .map((node) => {
            const assetId = (node.data as any)?.assetId;
            return isValidChatUuid(assetId) ? assetId.trim() : null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const annotations = contextNodes.flatMap((node) => {
      const metadata = (node.data as any)?.metadata;
      const localEditRegions = Array.isArray(metadata?.localEditRegions)
        ? metadata.localEditRegions
        : [];
      return localEditRegions
        .map((region: any, index: number) => {
          const rect = region?.rect;
          if (!rect || typeof rect !== "object") return null;
          return {
            id: String(region.id || `${node.id}-local-edit-${index + 1}`).slice(0, 128),
            sourceNodeId: node.id,
            type: "crop-box" as const,
            text:
              typeof region.prompt === "string"
                ? region.prompt.slice(0, 1000)
                : undefined,
            bounds: {
              x: Number(rect.x || 0),
              y: Number(rect.y || 0),
              width: Number(rect.width || 0),
              height: Number(rect.height || 0),
            },
            color:
              typeof region.color === "string"
                ? region.color.slice(0, 32)
                : undefined,
            createdAt:
              typeof region.createdAt === "number"
                ? new Date(region.createdAt).toISOString()
                : undefined,
          };
        })
        .filter((item: any): item is NonNullable<typeof item> => Boolean(item));
    });

    return {
      source: "canvas" as const,
      projectId: isValidChatUuid(canvasId) ? canvasId : undefined,
      selectedNodeIds: selectedContextNodes.map((node) => node.id).slice(0, 20),
      selectedAssetIds,
      focusPolicy: selectedContextNodes.length > 0 ? ("selected" as const) : ("auto" as const),
      annotations: annotations.length > 0 ? annotations.slice(0, 80) : undefined,
      canvasImageNodes: contextNodes.map((node) => ({
        nodeId: node.id,
        assetId: isValidChatUuid((node.data as any)?.assetId)
          ? String((node.data as any).assetId).trim()
          : undefined,
        url: String((node.data as any)?.src || "").trim(),
        title:
          typeof (node.data as any)?.title === "string"
            ? String((node.data as any).title).slice(0, 256)
            : undefined,
        prompt:
          typeof (node.data as any)?.prompt === "string"
            ? String((node.data as any).prompt).slice(0, 2000)
            : undefined,
        x: Number(node.position.x || 0),
        y: Number(node.position.y || 0),
        width: Number(node.size?.width || 0) || undefined,
        height: Number(node.size?.height || 0) || undefined,
        isSelected: selectedIds.has(node.id),
      })),
    };
  }, [activeComposerMode, canvasId, nodes, selectedImageNodes]);

  const updateAttachmentAtVideoSlot = useCallback(
    (slotIndex: number, attachment: PickedObjectAttachment | null) => {
      const slotCount = Math.max(videoFrameSlots.length, 2);
      setAttachments((current) => {
        const slots: Array<PickedObjectAttachment | null> = Array.from(
          { length: slotCount },
          (_, index) => current[index] ?? null
        );
        slots[slotIndex] = attachment;
        while (slots.length > 0 && !slots[slots.length - 1]) {
          slots.pop();
        }
        return slots.filter((item): item is PickedObjectAttachment => Boolean(item));
      });
    },
    [videoFrameSlots.length]
  );

  const updateAttachmentAtAgentSlot = useCallback(
    (slotIndex: number, attachment: PickedObjectAttachment | null) => {
      const slotCount = Math.max(agentUploadSlots.length, 1);
      setAttachments((current) => {
        const slots: Array<PickedObjectAttachment | null> = Array.from(
          { length: slotCount },
          (_, index) => current[index] ?? null
        );
        slots[slotIndex] = attachment;
        while (slots.length > 0 && !slots[slots.length - 1]) {
          slots.pop();
        }
        return slots.filter((item): item is PickedObjectAttachment => Boolean(item));
      });
    },
    [agentUploadSlots.length]
  );

  const fillVideoSlotFromCanvasSelection = useCallback(
    (slotIndex: number) => {
      const preferredNode = selectedImageNodes[slotIndex] || selectedImageNodes[0];
      const attachment = preferredNode
        ? getCanvasNodeAttachment(preferredNode, `参考图 ${slotIndex + 1}`)
        : null;
      if (!attachment) return false;

      updateAttachmentAtVideoSlot(slotIndex, attachment);
      return true;
    },
    [getCanvasNodeAttachment, selectedImageNodes, updateAttachmentAtVideoSlot]
  );

  const fillAgentSlotFromCanvasSelection = useCallback(
    (slotIndex: number) => {
      const preferredNode = selectedImageNodes[slotIndex] || selectedImageNodes[0];
      const attachment = preferredNode
        ? getCanvasNodeAttachment(preferredNode, `Agent 图片 ${slotIndex + 1}`)
        : null;
      if (!attachment) return false;

      updateAttachmentAtAgentSlot(slotIndex, attachment);
      return true;
    },
    [getCanvasNodeAttachment, selectedImageNodes, updateAttachmentAtAgentSlot]
  );

  const handleVideoSlotFileChange = useCallback(
    async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validation = validateCanvasImageUploadFile(file);
      if (!validation.ok) {
        toast.error(validation.message);
        event.currentTarget.value = "";
        return;
      }

      setVideoSlotUploading(slotIndex);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "canvas-upload");

        const response = await fetchUploadWithRetry(formData);

        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "图片上传失败");
        }

        const data = await response.json();
        const imageUrl = data.url as string;
        const assetId = normalizeUploadedAssetId(data.assetId);

        updateAttachmentAtVideoSlot(
          slotIndex,
          buildCanvasUploadedImageAttachment({ file, imageUrl, assetId })
        );

        const dimensions = await getImageDimensions(imageUrl);
        const nodeIndex = nodes.length + slotIndex;
        const spacing = 20;
        const x = 100 + (nodeIndex % 3) * (dimensions.width + spacing);
        const y = 100 + Math.floor(nodeIndex / 3) * (dimensions.height + spacing);
        addNode({
          type: "image",
          position: { x, y },
          size: { width: dimensions.width, height: dimensions.height },
          data: {
            src: imageUrl,
            status: "completed",
            title: getCanvasUploadImageTitle(file.name),
            prompt: getCanvasUploadImageTitle(file.name),
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
            },
          },
          connections: [],
        });
        toast.success(`${slotIndex === 0 ? "首帧" : "尾帧"}上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error, "图片上传失败");
        if (message) toast.error(message);
      } finally {
        setVideoSlotUploading(null);
        event.currentTarget.value = "";
      }
    },
    [addNode, nodes.length, updateAttachmentAtVideoSlot]
  );

  const handleAgentSlotFileChange = useCallback(
    async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validation = validateCanvasImageUploadFile(file);
      if (!validation.ok) {
        toast.error(validation.message);
        event.currentTarget.value = "";
        return;
      }

      setAgentSlotUploading(slotIndex);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "canvas-upload");

        const response = await fetchUploadWithRetry(formData);

        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "图片上传失败");
        }

        const data = await response.json();
        const imageUrl = data.url as string;
        const assetId = normalizeUploadedAssetId(data.assetId);

        updateAttachmentAtAgentSlot(
          slotIndex,
          buildCanvasUploadedImageAttachment({ file, imageUrl, assetId })
        );

        const dimensions = await getImageDimensions(imageUrl);
        const nodeIndex = nodes.length + slotIndex;
        const spacing = 20;
        const x = 100 + (nodeIndex % 3) * (dimensions.width + spacing);
        const y = 100 + Math.floor(nodeIndex / 3) * (dimensions.height + spacing);
        addNode({
          type: "image",
          position: { x, y },
          size: { width: dimensions.width, height: dimensions.height },
          data: {
            src: imageUrl,
            status: "completed",
            title: getCanvasUploadImageTitle(file.name),
            prompt: getCanvasUploadImageTitle(file.name),
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
            },
          },
          connections: [],
        });

        const slotLabel = agentUploadSlots[slotIndex]?.label || `第${slotIndex + 1}张`;
        toast.success(`${slotLabel}上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error, "图片上传失败");
        if (message) toast.error(message);
      } finally {
        setAgentSlotUploading(null);
        event.currentTarget.value = "";
      }
    },
    [addNode, agentUploadSlots, nodes.length, updateAttachmentAtAgentSlot]
  );

  const updateDetailSlotAttachment = useCallback(
    (slotIndex: number, attachment: PickedObjectAttachment | null) => {
      setDetailSlots((current) => applyDetailSlotAttachment(current, slotIndex, attachment));
    },
    []
  );

  const fillDetailSlotsFromCanvasSelection = useCallback(
    (slotIndex: number) => {
      if (slotIndex < 0 || slotIndex >= DETAIL_SLOT_CONFIGS.length) return 0;
      if (selectedImageNodes.length === 0) return 0;

      const targetIndexes = getDetailSlotTargetIndexes(slotIndex);
      if (targetIndexes.length === 0) return 0;

      const candidateAttachments = selectedImageNodes
        .map((node, index) =>
          getCanvasNodeAttachment(
            node,
            `${DETAIL_SLOT_CONFIGS[slotIndex]?.label || "素材"}-${index + 1}`
          )
        )
        .filter((item): item is PickedObjectAttachment => Boolean(item));

      if (candidateAttachments.length === 0) return 0;

      let filledCount = 0;
      setDetailSlots((current) => {
        const result = fillDetailSlotAttachments(current, targetIndexes, candidateAttachments);
        filledCount = result.filledCount;
        return result.slots;
      });
      return filledCount;
    },
    [getCanvasNodeAttachment, selectedImageNodes]
  );

  const activateDetailSlotCanvasPicker = useCallback(
    (slotIndex: number) => {
      const filled = fillDetailSlotsFromCanvasSelection(slotIndex);
      if (filled > 0) {
        const label = DETAIL_SLOT_CONFIGS[slotIndex]?.label || "素材";
        toast.success(
          filled > 1 ? `已从画布批量填入 ${filled} 张到${label}分组` : `已从画布填入${label}`
        );
        setDetailSlotPickerIndex(null);
        return;
      }
      setDetailSlotPickerIndex(slotIndex);
      const label = DETAIL_SLOT_CONFIGS[slotIndex]?.label || "素材";
      toast.info(`已选中${label}，请在画布中点击图片即可自动填入`);
    },
    [fillDetailSlotsFromCanvasSelection]
  );

  useEffect(() => {
    if (!isDetailGenerationMode) {
      setDetailSlotPickerIndex(null);
      return;
    }
    if (detailSlotPickerIndex === null) return;
    if (selectedImageNodes.length === 0) return;

    const filled = fillDetailSlotsFromCanvasSelection(detailSlotPickerIndex);
    if (filled > 0) {
      const label = DETAIL_SLOT_CONFIGS[detailSlotPickerIndex]?.label || "素材";
      toast.success(
        filled > 1 ? `已从画布批量填入 ${filled} 张到${label}分组` : `已从画布填入${label}`
      );
      setDetailSlotPickerIndex(null);
    }
  }, [
    detailSlotPickerIndex,
    fillDetailSlotsFromCanvasSelection,
    isDetailGenerationMode,
    selectedImageNodes.length,
  ]);

  useEffect(() => {
    if (!isDetailGenerationMode) {
      setIsDetailWorkbenchCollapsed(false);
    }
  }, [isDetailGenerationMode]);

  const handleDetailSlotFileChange = useCallback(
    async (slotIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validation = validateCanvasImageUploadFile(file);
      if (!validation.ok) {
        toast.error(validation.message);
        event.currentTarget.value = "";
        return;
      }

      setDetailSlotUploading(slotIndex);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "canvas-upload");

        const response = await fetchUploadWithRetry(formData);

        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "图片上传失败");
        }

        const data = await response.json();
        const imageUrl = String(data.url || "").trim();
        const assetId = normalizeUploadedAssetId(data.assetId);
        if (!imageUrl) {
          throw new Error("未获取到图片地址");
        }

        updateDetailSlotAttachment(
          slotIndex,
          buildCanvasUploadedImageAttachment({ file, imageUrl, assetId })
        );
        toast.success(`${DETAIL_SLOT_CONFIGS[slotIndex]?.label || "图片"}上传成功`);
      } catch (error) {
        const message = getUploadErrorMessage(error, "图片上传失败");
        if (message) toast.error(message);
      } finally {
        setDetailSlotUploading(null);
        event.currentTarget.value = "";
      }
    },
    [updateDetailSlotAttachment]
  );

  const updateLocalDetailArchive = useCallback(
    (archiveId: string, patch: Partial<DetailArchive>) => {
      setDetailArchives((prev) => patchDetailArchiveList(prev, archiveId, patch));
    },
    []
  );

  const createDetailArchiveInDatabase = useCallback(
    async (archive: DetailArchive): Promise<DetailArchive | null> => {
      try {
        const response = await apiFetch(`/api/canvas/${canvasId}/detail-archives`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ archive }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success || !result?.data?.id) {
          console.error("[CanvasChat] Failed to persist detail archive:", result?.error || response.statusText);
          return null;
        }
        const createdAtValue =
          typeof result.data.createdAt === "number"
            ? result.data.createdAt
            : Date.parse(String(result.data.createdAt || ""));
        return {
          ...archive,
          id: String(result.data.id),
          createdAt: Number.isFinite(createdAtValue) ? createdAtValue : archive.createdAt,
          updatedAt: Number.isFinite(createdAtValue) ? createdAtValue : archive.createdAt,
        };
      } catch (error) {
        console.error("[CanvasChat] Failed to persist detail archive:", error);
        return null;
      }
    },
    [canvasId]
  );

  const patchDetailArchiveInDatabase = useCallback(
    async (archiveId: string, archive: DetailArchive) => {
      try {
        const response = await apiFetch(`/api/canvas/${canvasId}/detail-archives`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ archiveId, archive }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success) {
          console.error(
            "[CanvasChat] Failed to update detail archive:",
            result?.error || response.statusText
          );
          return false;
        }
        return true;
      } catch (error) {
        console.error("[CanvasChat] Failed to update detail archive:", error);
        return false;
      }
    },
    [canvasId]
  );

  const saveDetailArchiveSnapshot = useCallback(
    async (params: {
      summary?: string;
      imageCount?: number;
      coverUrl?: string;
      prompt: string;
      generationMode: DetailGenerationMode;
      brief: DetailBriefForm;
      slots: Array<PickedObjectAttachment | null>;
      uiSurfaceSnapshot?: UiSurfaceSnapshot | null;
      uiSurfaceLatestReview?: DetailArchive["uiSurfaceLatestReview"];
    }): Promise<DetailArchive | null> => {
      const createdAt = Date.now();
      const archive = createDetailArchiveSnapshot({
        ...params,
        archiveId: generateUUID(),
        createdAt,
      });

      setDetailArchives((prev) => prependDetailArchive(prev, archive));
      const saved = await createDetailArchiveInDatabase(archive);
      if (saved?.id) {
        setDetailArchives((prev) => replaceSavedDetailArchive(prev, archive.id, saved));
        return saved;
      }
      return archive;
    },
    [createDetailArchiveInDatabase]
  );

  const loadDetailArchive = useCallback((archive: DetailArchive) => {
    setIsDetailGenerationMode(true);
    setDetailGenerationMode(normalizeDetailGenerationMode(archive.generationMode));
    setDetailBrief({ ...archive.brief });
    setDetailSurfaceSnapshot(archive.uiSurfaceSnapshot || null);
    setDetailUiValidation({
      plan: archive.uiSurfaceSnapshot?.validation
        ? {
            passed: archive.uiSurfaceSnapshot.validation.passed,
            issues: archive.uiSurfaceSnapshot.validation.issues || [],
          }
        : null,
      latestScreen:
        archive.uiSurfaceLatestReview?.screenIndex
          ? {
              screenIndex: archive.uiSurfaceLatestReview.screenIndex,
              action: archive.uiSurfaceLatestReview.action,
              passed: archive.uiSurfaceLatestReview.passed,
              issues: archive.uiSurfaceLatestReview.issues || [],
            }
          : null,
    });
    setDetailSlots(
      DETAIL_SLOT_CONFIGS.map((_, index) => {
        const slot = archive.slots[index];
        return slot
          ? {
              url: slot.url,
              name: slot.name,
              contentType: slot.contentType || "image/jpeg",
            }
          : null;
      })
    );
    setInput(archive.prompt || "");
    setDetailSections((prev) => ({
      ...prev,
      required: true,
      assets: true,
      archives: true,
    }));
    setDetailSlotPickerIndex(null);
    setTimeout(() => {
      const editableDiv = textareaRef.current as HTMLDivElement | null;
      if (editableDiv) {
        editableDiv.textContent = archive.prompt || "";
        editableDiv.focus();
      }
    }, 0);
    toast.success("已加载历史详情项目，可继续修改后重新生成（会自动存为新存档）");
  }, []);

  const deleteDetailArchive = useCallback(
    async (archiveId: string) => {
      if (!archiveId || deletingDetailArchiveId === archiveId) return;
      const targetArchive = detailArchives.find((item) => item.id === archiveId);
      const targetTitle = targetArchive?.title || "该存档";
      if (!window.confirm(`确认删除“${targetTitle}”吗？删除后不可恢复。`)) {
        return;
      }

      setDeletingDetailArchiveId(archiveId);
      try {
        const response = await apiFetch(
          `/api/canvas/${canvasId}/detail-archives?archiveId=${encodeURIComponent(archiveId)}`,
          { method: "DELETE" }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.success) {
          throw new Error(String(result?.error || "删除失败"));
        }

        setDetailArchives((prev) => prev.filter((item) => item.id !== archiveId));
        toast.success("已删除历史存档");
      } catch (error) {
        console.error("[CanvasChat] Failed to delete detail archive:", error);
        toast.error(error instanceof Error ? error.message : "删除历史存档失败");
      } finally {
        setDeletingDetailArchiveId((current) => (current === archiveId ? null : current));
      }
    },
    [canvasId, deletingDetailArchiveId, detailArchives]
  );

  const handleDetailGeneration = useCallback(async () => {
    if (isDetailGenerating) return;

    const brief = normalizedDetailBrief;
    if (!brief.targetAudience || !brief.usageScenario || !brief.coreNeed) {
      toast.error("请先补充 AI详情生成必填项：主购买人群、需求场景、核心需求");
      return;
    }
    const productAttachments = DETAIL_PRODUCT_SLOT_INDEXES
      .map((index) => detailSlots[index])
      .filter((item): item is PickedObjectAttachment => Boolean(item?.url));
    if (productAttachments.length < 5) {
      toast.error("请先上传 5 张产品图后再执行 AI详情生成");
      return;
    }
    const modelAttachment =
      DETAIL_MODEL_SLOT_INDEX >= 0 ? detailSlots[DETAIL_MODEL_SLOT_INDEX] : null;
    if (!modelAttachment?.url) {
      toast.error("请上传 1 张人物模特图后再执行 AI详情生成");
      return;
    }
    const bundleAttachments = DETAIL_BUNDLE_SLOT_INDEXES
      .map((index) => detailSlots[index])
      .filter((item): item is PickedObjectAttachment => Boolean(item?.url));

    const userText = input
      .replace(/\u200b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const basePrompt = brief.productName
      ? `${brief.productName}详情页生成`
      : "电商详情页生成";
    const demandHint = brief.demandType ? `，需求类型：${brief.demandType}` : "";
    const detailPrompt =
      userText ||
      `${basePrompt}，面向${brief.targetAudience}，在${brief.usageScenario}场景解决${brief.coreNeed}${demandHint}`;
    const archiveSnapshot = {
      prompt: detailPrompt,
      generationMode: detailGenerationMode,
      brief: { ...detailBrief },
      slots: DETAIL_SLOT_CONFIGS.map((_, index) => {
        const slot = detailSlots[index];
        return slot
          ? {
              url: slot.url,
              name: slot.name,
              contentType: slot.contentType,
            }
          : null;
      }),
    };
    const detailCount = extractDetailFrameCount(detailPrompt);
    const assistantMessageId = generateUUID();
    const skillLogicPreview = [
      "### AI详情生成",
      detailGenerationMode === "agent_layout"
        ? "当前模式：AGENT排版（画面与文字分层生成）"
        : "当前模式：传统生图（整页直接生成）",
      "我们将基于《详情升级文案方案》执行以下技能流程：",
      "1. 定位卡：锁定人群/场景/触发时刻/风险与期望结果",
      "2. 需求拆解：卖点转买点，确定核心需求优先级",
      "3. 黄金五屏：核心卖点 -> 差异强化 -> 证据收口",
      "4. FABE文案：每屏输出利益/特征/优势/证据",
      "5. A/B/C视觉节奏：场景共鸣 + 理性证明 + 转化收尾",
      "6. 字体规范：主标题64/700，副标题34/600，正文24/500，全套一致",
      "7. 分镜预审：先走平面设计总监+营销总监双审，不通过先重写再放行",
      "8. 逐屏质检：每屏先生成再由 Agent 复检，必要时自动二次修图",
      "",
      "正在规划分镜提示词...",
    ].join("\n");
    const referenceImageNotes = DETAIL_SLOT_CONFIGS.map((config, index) => {
      const current = detailSlots[index];
      return `${index + 1}. ${config.label}${current?.name ? `（${current.name}）` : ""}`;
    });
    const modelImageHint = `模特图固定策略：涉及人物场景时必须使用第${DETAIL_MODEL_SLOT_INDEX + 1}张模特图同一人物，不得替换人物。`;
    const bundleImageHint =
      bundleAttachments.length > 0
        ? `已上传${bundleAttachments.length}张搭配产品图：必须新增1屏场景化产品搭配展示，突出关联销售。`
        : "未上传搭配产品图：不强制搭配展示屏。";
    const detailBriefText = [
      "【AI详情生成输入】",
      brief.productSpu ? `商品SPU：${brief.productSpu}` : "",
      brief.demandType ? `需求类型：${brief.demandType}` : "",
      brief.productName ? `产品：${brief.productName}` : "",
      `主购买人群：${brief.targetAudience}`,
      brief.mainUser ? `主使用者：${brief.mainUser}` : "",
      `需求场景：${brief.usageScenario}`,
      brief.triggerMoment ? `触发时刻：${brief.triggerMoment}` : "",
      `核心需求：${brief.coreNeed}`,
      brief.riskConcern ? `用户顾虑：${brief.riskConcern}` : "",
      brief.expectedResult ? `期望结果：${brief.expectedResult}` : "",
      brief.coreSellingPoint ? `核心卖点关键词：${brief.coreSellingPoint}` : "",
      brief.positioningStatement ? `一句话定位：${brief.positioningStatement}` : "",
      brief.userVoice ? `用户原话样本：${brief.userVoice}` : "",
      brief.competitorReference ? `竞品对标：${brief.competitorReference}` : "",
      brief.priceBand ? `价格带：${brief.priceBand}` : "",
      brief.brandTone ? `品牌语气：${brief.brandTone}` : "",
      brief.bannedWords ? `禁用表达：${brief.bannedWords}` : "",
      `参考图说明：${referenceImageNotes.join("；")}`,
      modelImageHint,
      bundleImageHint,
      `输出规格：每屏 ${DETAIL_TARGET_WIDTH}x${DETAIL_TARGET_HEIGHT} 像素`,
      `生成模式：${detailGenerationMode === "agent_layout" ? "AGENT排版（画面+可编辑文字层）" : "传统生图（整页出图）"}`,
      `字体规范：${DETAIL_TYPOGRAPHY_LOCK.title}；${DETAIL_TYPOGRAPHY_LOCK.subtitle}；${DETAIL_TYPOGRAPHY_LOCK.body}`,
    ]
      .filter(Boolean)
      .join("\n");
    const outputLanguage: "zh" | "en" = /[a-zA-Z]/.test(detailPrompt) ? "en" : "zh";
    let workingArchive: DetailArchive | null = null;
    let completedDetailImageCount = 0;
    const generatedImages: Array<{ originalUrl: string; thumbnailUrl: string }> = [];
    let detailPlaceholderNodeIds: string[] = [];
    let currentDetailSurfaceSnapshot: UiSurfaceSnapshot | null = null;
    let latestSurfaceReviewState: DetailArchive["uiSurfaceLatestReview"] = null;
    const detailPlaceholderSpacing = 24;
    const detailPlaceholderItemWidth = DETAIL_TARGET_WIDTH;
    const detailPlaceholderItemHeight = DETAIL_TARGET_HEIGHT;
    const detailPlaceholderStartX = 120;
    const detailStyleBoardStartY = 120;
    const detailPlaceholderStartY =
      detailStyleBoardStartY + DETAIL_STYLE_BOARD_HEIGHT + DETAIL_STYLE_BOARD_SPACING;
    const getDetailPlaceholderPosition = (index: number) => ({
      x: detailPlaceholderStartX,
      y:
        detailPlaceholderStartY +
        index * (detailPlaceholderItemHeight + detailPlaceholderSpacing),
    });
    const expectedPlaceholderCount =
      bundleAttachments.length > 0 ? Math.min(20, detailCount + 1) : detailCount;
    const patchDetailPlaceholder = (
      index: number,
      options: {
        label?: string;
        status?: "generating" | "completed" | "failed";
        src?: string;
        prompt?: string;
        title?: string;
        metadata?: Record<string, unknown>;
      } = {}
    ) => {
      const nodeId = detailPlaceholderNodeIds[index];
      if (!nodeId) return;
      const storeState = useCanvasStore.getState();
      const currentNode = storeState.getNode(nodeId);
      const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
      const currentMetadata = ((currentData.metadata as any) || {}) as Record<string, any>;
      const currentStatus =
        currentData.status === "completed" || currentData.status === "failed"
          ? currentData.status
          : "generating";
      const nextStatus = options.status || currentStatus;
      updateNode(nodeId, {
        size: {
          width: detailPlaceholderItemWidth,
          height: detailPlaceholderItemHeight,
        },
        data: {
          ...currentData,
          src: String(options.src ?? currentData.src ?? ""),
          status: nextStatus,
          prompt: options.prompt ?? currentData.prompt,
          title: options.title ?? currentData.title ?? `详情图-${index + 1}`,
          metadata: {
            ...currentMetadata,
            detailSectionIndex: index + 1,
            detailTargetWidth: DETAIL_TARGET_WIDTH,
            detailTargetHeight: DETAIL_TARGET_HEIGHT,
            detailGeneratingPlaceholder: nextStatus !== "completed",
            detailProgressLabel:
              options.label ??
              currentMetadata.detailProgressLabel ??
              (nextStatus === "failed" ? "生成失败" : "平面设计中..."),
            ...(options.metadata || {}),
          },
        },
      });
    };
    const ensureDetailPlaceholders = (count: number, defaultLabel: string) => {
      for (let index = detailPlaceholderNodeIds.length; index < count; index += 1) {
        const { x, y } = getDetailPlaceholderPosition(index);
        const nodeId = addNode({
          type: "image",
          position: { x, y },
          size: { width: detailPlaceholderItemWidth, height: detailPlaceholderItemHeight },
          data: {
            src: "",
            status: "generating",
            prompt: detailPrompt,
            title: `详情图-${index + 1}`,
            metadata: {
              detailSectionIndex: index + 1,
              detailTargetWidth: DETAIL_TARGET_WIDTH,
              detailTargetHeight: DETAIL_TARGET_HEIGHT,
              detailGeneratingPlaceholder: true,
              detailProgressLabel: defaultLabel,
            },
          },
          connections: [],
        });
        detailPlaceholderNodeIds.push(nodeId);
      }
    };
    const markExtraPlaceholders = (startIndex: number, label: string) => {
      for (let index = startIndex; index < detailPlaceholderNodeIds.length; index += 1) {
        patchDetailPlaceholder(index, {
          status: "failed",
          label,
          metadata: {
            detailSkipped: true,
          },
        });
      }
    };

    setIsDetailWorkbenchCollapsed(true);
    setIsDetailGenerating(true);
    setDetailUiValidation({
      plan: null,
      latestScreen: null,
    });
    setDetailSurfaceSnapshot(null);
    setDetailProgress({
      status: "running",
      stage: "Agent 正在解析需求并规划详情结构...",
      current: 0,
      total: Math.max(1, detailCount * 2 + 1 + DETAIL_REVIEW_COUNT),
    });
    ensureDetailPlaceholders(expectedPlaceholderCount, "需求解析与分镜规划中...");
    try {
      workingArchive = await saveDetailArchiveSnapshot({
        summary: `进行中：已完成 0/${detailCount} 张详情图`,
        imageCount: 0,
        coverUrl: undefined,
        prompt: archiveSnapshot.prompt,
        generationMode: archiveSnapshot.generationMode,
        brief: archiveSnapshot.brief,
        slots: archiveSnapshot.slots,
        uiSurfaceSnapshot: null,
        uiSurfaceLatestReview: null,
      });

      const detailReferenceAttachments = DETAIL_SLOT_CONFIGS.map((config, index) => {
        const current = detailSlots[index];
        if (!current?.url) return null;
        return {
          ...current,
          name: `${config.label}${current.name ? `-${current.name}` : ""}`,
        };
      }).filter((item): item is PickedObjectAttachment => Boolean(item));
      const userParts: any[] = detailReferenceAttachments.map((item) => ({
        type: "file",
        mediaType: item.contentType,
        name: item.name,
        url: item.url,
      }));
      userParts.push({
        type: "text",
        text: `${detailPrompt}\n\n${detailBriefText}`,
      });

      const userMessage: any = {
        id: generateUUID(),
        role: "user",
        parts: userParts,
      };
      const assistantPendingMessage: any = {
        id: assistantMessageId,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: skillLogicPreview,
          },
        ],
      };

      setMessages((prev) => [...prev, userMessage, assistantPendingMessage]);

      setInput("");
      setAttachments([]);
      clearSelection();
      const editableDiv = textareaRef.current as HTMLDivElement | null;
      if (editableDiv) {
        editableDiv.innerHTML = "";
      }

      const planResponse = await apiFetch("/api/canvas/detail-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: detailPrompt,
          count: detailCount,
          generationMode: detailGenerationMode,
          referenceImages: detailReferenceAttachments.map((item) => item.url).slice(0, 12),
          referenceImageNotes,
          modelImageUrl: modelAttachment.url,
          bundleImageUrls: bundleAttachments.map((item) => item.url),
          outputLanguage,
          brief,
        }),
      });

      const planResult = await planResponse.json();
      if (!planResponse.ok || !planResult?.success) {
        throw new Error(planResult?.error || "详情分镜规划失败");
      }

      const planData = (planResult.data || {}) as DetailPlanResponse;
      const activeDetailGenerationMode = normalizeDetailGenerationMode(
        planData.generationMode || detailGenerationMode
      );
      currentDetailSurfaceSnapshot = planData.uiSurface || null;
      if (planData.brandStyleBoard) {
        addNode({
          type: "ui-screen",
          position: {
            x: detailPlaceholderStartX,
            y: detailStyleBoardStartY,
          },
          size: {
            width: DETAIL_STYLE_BOARD_WIDTH,
            height: DETAIL_STYLE_BOARD_HEIGHT,
          },
          data: {
            status: "completed",
            document: planData.brandStyleBoard,
            source: {
              prompt: detailPrompt,
              model: "detail-agent-brand-style-board",
            },
            evaluation: {
              score: planData.preflight?.designDirectorScore,
              issues: Array.isArray(planData.qualityChecks?.issues)
                ? planData.qualityChecks.issues.filter(Boolean)
                : undefined,
            },
            metadata: {
              detailBrandStyleBoard: true,
              detailPlanSummary: planData.summary || "",
              detailGlobalStyle: planData.globalStyle || null,
              detailDesignSkill: planData.designSkill || null,
              detailGenerationMode: activeDetailGenerationMode,
            },
          },
          connections: [],
        });
      }
      if (activeDetailGenerationMode !== detailGenerationMode) {
        setDetailGenerationMode(activeDetailGenerationMode);
      }
      const perScreenSteps = activeDetailGenerationMode === "agent_layout" ? 1 : 2;
      const prompts = Array.isArray(planData.prompts)
        ? planData.prompts.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      if (prompts.length === 0) {
        throw new Error("未获取到有效分镜提示词");
      }
      const screenSpecs = Array.isArray(planData.screens) ? planData.screens : [];
      const reviewPlans = buildDetailReviewPlans({
        brief,
        summary: planData.summary,
        language: outputLanguage,
        count: DETAIL_REVIEW_COUNT,
      });
      const totalSteps = prompts.length * perScreenSteps + 1 + reviewPlans.length;
      const qualityIssues = Array.isArray(planData.qualityChecks?.issues)
        ? planData.qualityChecks?.issues.filter(Boolean)
        : [];
      const preflightIssues = Array.isArray(planData.preflight?.issues)
        ? planData.preflight?.issues.filter(Boolean)
        : [];
      const planUiIssues = Array.isArray(planData.uiValidation?.issues)
        ? planData.uiValidation.issues.filter(Boolean)
        : [];
      const preflightDesignScore = Number(planData.preflight?.designDirectorScore || 0);
      const preflightMarketingScore = Number(planData.preflight?.marketingDirectorScore || 0);
      const preflightPassed = planData.preflight?.passed !== false;
      setDetailUiValidation({
        plan: {
          passed: planData.uiValidation?.passed !== false,
          issues: planUiIssues,
        },
        latestScreen: null,
      });
      setDetailSurfaceSnapshot(planData.uiSurface || null);
      if (workingArchive?.id && planData.uiSurface) {
        const plannedArchive: DetailArchive = {
          ...workingArchive,
          uiSurfaceSnapshot: planData.uiSurface,
          uiSurfaceLatestReview: null,
        };
        workingArchive = plannedArchive;
        updateLocalDetailArchive(plannedArchive.id, {
          uiSurfaceSnapshot: plannedArchive.uiSurfaceSnapshot,
          uiSurfaceLatestReview: plannedArchive.uiSurfaceLatestReview,
        });
        await patchDetailArchiveInDatabase(plannedArchive.id, plannedArchive);
      }
      setDetailProgress({
        status: "running",
        stage:
          planData.qualityChecks?.passed === false
            ? `分镜预审未通过：${qualityIssues[0] || "已自动切换为稳定方案"}`
            : planData.uiValidation?.passed === false
              ? `协议排版校验提示：${planUiIssues[0] || "已记录待优化项，继续逐屏执行"}`
            : preflightPassed
              ? `双总监预审通过（设计${preflightDesignScore || "--"} / 营销${preflightMarketingScore || "--"}），开始逐屏生成`
              : `双总监预审提示：${preflightIssues[0] || "已自动重写分镜后放行"}`,
        current: 1,
        total: totalSteps,
      });

      const modelForGeneration =
        selectedModelId !== "auto"
          ? selectedModelId
          : siteSettings?.canvasDetailDefaultModelId ||
            siteSettings?.canvasAutoModeDefaultModelId ||
            siteSettings?.canvasDefaultModelId ||
            undefined;
      ensureDetailPlaceholders(prompts.length, "需求解析与分镜规划中...");
      if (detailPlaceholderNodeIds.length > prompts.length) {
        markExtraPlaceholders(prompts.length, "本轮未使用");
      }
      const isAgentLayoutMode = activeDetailGenerationMode === "agent_layout";
      const titleFontSize = Math.max(
        36,
        Math.min(
          80,
          extractFirstNumber(planData.globalStyle?.typography?.title || "", 64)
        )
      );
      const subtitleFontSize = Math.max(
        24,
        Math.min(
          50,
          extractFirstNumber(planData.globalStyle?.typography?.subtitle || "", 34)
        )
      );
      const bodyFontSize = Math.max(
        18,
        Math.min(
          36,
          extractFirstNumber(planData.globalStyle?.typography?.body || "", 24)
        )
      );
      const titleFontWeight = extractFontWeight(planData.globalStyle?.typography?.title || "", "700");
      const subtitleFontWeight = extractFontWeight(
        planData.globalStyle?.typography?.subtitle || "",
        "600"
      );
      const bodyFontWeight = extractFontWeight(planData.globalStyle?.typography?.body || "", "500");
      const replaceDetailTextLayers = (params: {
        nodeId: string;
        drafts: Array<Omit<CanvasNode, "id" | "createdAt" | "updatedAt">>;
      }) => {
        const storeState = useCanvasStore.getState();
        const childTextNodeIds = collectManagedDetailTextLayerNodeIds(
          storeState.nodes,
          params.nodeId,
        );

        childTextNodeIds.forEach((nodeId) => deleteNode(nodeId));
        params.drafts.forEach((draft) => addNode(draft));
      };
      const createAgentLayoutTextLayers = (params: {
        nodeId: string;
        screenIndex: number;
        screen?: DetailPlanScreenSpec;
        screenProtocol?: DetailUiProtocol["screens"][number];
        surfaceSnapshot?: UiSurfaceSnapshot | null;
      }) => {
        if (!isAgentLayoutMode) return;
        const storeState = useCanvasStore.getState();
        if (params.surfaceSnapshot) {
          replaceDetailTextLayers({
            nodeId: params.nodeId,
            drafts: [],
          });
          return;
        }
        const imageNode = storeState.getNode(params.nodeId);
        if (!imageNode) return;
        if (imageNode.type === "ui-screen") {
          replaceDetailTextLayers({
            nodeId: params.nodeId,
            drafts: [],
          });
          return;
        }
        const x = Number(imageNode.position?.x || 0);
        const y = Number(imageNode.position?.y || 0);
        const width = Number(imageNode.size?.width || DETAIL_TARGET_WIDTH);
        const height = Number(imageNode.size?.height || DETAIL_TARGET_HEIGHT);
        const drafts: Array<Omit<CanvasNode, "id" | "createdAt" | "updatedAt">> = [];
        const finalDrafts =
          drafts.length > 0
            ? drafts
            : buildDetailTextLayerNodes({
                parentNodeId: params.nodeId,
                parentPosition: { x, y },
                parentSize: { width, height },
                screenSize: planData.uiProtocol?.screenSize || {
                  width: DETAIL_TARGET_WIDTH,
                  height: DETAIL_TARGET_HEIGHT,
                },
                screenIndex: params.screenIndex,
                screen: params.screen,
                screenProtocol: params.screenProtocol,
                typography: {
                  titleFontSize,
                  titleFontWeight,
                  subtitleFontSize,
                  subtitleFontWeight,
                  bodyFontSize,
                  bodyFontWeight,
                },
              });

        replaceDetailTextLayers({
          nodeId: params.nodeId,
          drafts: finalDrafts,
        });
      };
      for (let index = 0; index < prompts.length; index += 1) {
        const screen = screenSpecs[index];
        patchDetailPlaceholder(index, {
          label: "分镜规划完成",
          status: "generating",
          prompt: String(screen?.visualPrompt || prompts[index] || "").trim(),
          title: `详情图-${index + 1}`,
          metadata: {
            detailTitle: screen?.title || "",
            detailSubtitle: screen?.subtitle || "",
            detailScreenType: screen?.screenType || "",
            detailLayoutNote: screen?.layoutNote || "",
            detailPlanSummary: planData.summary || "",
            detailGlobalStyle: planData.globalStyle || null,
            detailPreflight: planData.preflight || null,
            detailGenerationMode: activeDetailGenerationMode,
            detailGeneratingPlaceholder: true,
          },
        });
      }
      const preflightLabel = planData.preflight?.rewriteApplied
        ? "双总监预审重写完成"
        : "双总监预审通过";
      const requestDetailSubjectAnalysis = async (imageUrl?: string) => {
        const normalized = String(imageUrl || "").trim();
        if (!/^https?:\/\//i.test(normalized)) return null;

        try {
          const response = await apiFetch("/api/canvas/detail-subject-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: normalized }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result?.success) {
            return null;
          }
          return result.data || null;
        } catch (error) {
          console.warn("[CanvasChat] Detail subject analyze failed:", error);
          return null;
        }
      };
      for (let index = 0; index < prompts.length; index += 1) {
        patchDetailPlaceholder(index, {
          label: preflightLabel,
          status: "generating",
        });
      }
      for (let index = 0; index < prompts.length; index += 1) {
        patchDetailPlaceholder(index, {
          label: `排队待生成 ${index + 1}/${prompts.length}`,
          status: "generating",
        });
      }
      for (let index = 0; index < prompts.length; index += 1) {
        const screen = screenSpecs[index];
        const useModelForScene = Boolean(screen?.useModel);
        const bundleShowcase = Boolean((screen as any)?.bundleShowcase);
        const bundleReason = String((screen as any)?.bundleReason || "").trim();
        const promptText =
          String(screen?.visualPrompt || "").trim() || prompts[index]!;
        const generationStepCurrent = 2 + index * perScreenSteps;
        const reviewStepCurrent = generationStepCurrent + 1;
        patchDetailPlaceholder(index, {
          label: `主图首稿生成中 ${index + 1}/${prompts.length}`,
          status: "generating",
          prompt: promptText,
        });
        setDetailProgress({
          status: "running",
          stage: `正在生成第 ${index + 1}/${prompts.length} 屏详情图`,
          current: generationStepCurrent,
          total: totalSteps,
        });
        const globalStyle = planData.globalStyle;
        const styleDirective = [
          globalStyle?.designLanguage ? `全局风格：${globalStyle.designLanguage}` : "",
          globalStyle?.typography?.fontFamily
            ? `字体家族统一：${globalStyle.typography.fontFamily}`
            : "",
          globalStyle?.typography?.title ? `标题规范：${globalStyle.typography.title}` : "",
          globalStyle?.typography?.subtitle
            ? `副标题规范：${globalStyle.typography.subtitle}`
            : "",
          globalStyle?.typography?.body ? `正文规范：${globalStyle.typography.body}` : "",
          globalStyle?.layout?.grid ? `布局栅格：${globalStyle.layout.grid}` : "",
          globalStyle?.layout?.safeArea ? `安全区：${globalStyle.layout.safeArea}` : "",
          globalStyle?.layout?.rhythm ? `留白节奏：${globalStyle.layout.rhythm}` : "",
          globalStyle?.palette ? `配色：${globalStyle.palette}` : "",
          `固定字体锁定：${DETAIL_TYPOGRAPHY_LOCK.title}`,
          `固定副标题锁定：${DETAIL_TYPOGRAPHY_LOCK.subtitle}`,
          `固定正文锁定：${DETAIL_TYPOGRAPHY_LOCK.body}`,
          `固定排版安全区：${DETAIL_TYPOGRAPHY_LOCK.safeArea}`,
          `固定留白节奏：${DETAIL_TYPOGRAPHY_LOCK.rhythm}`,
        ]
          .filter(Boolean)
          .join("；");
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  parts: [
                    {
                      type: "text",
                      text: isAgentLayoutMode
                        ? `### AI详情生成\n正在生成第 ${index + 1}/${prompts.length} 屏画面层，随后自动渲染可编辑文字层...`
                        : `### AI详情生成\n正在生成第 ${index + 1}/${prompts.length} 屏，并锁定统一字体与版式...`,
                    },
                  ],
                }
              : message,
          ),
        );

        const generationPrompt = sanitizeDetailImageModelPrompt([
          promptText,
          styleDirective ? `全局样式约束：${styleDirective}` : "",
          screen?.screenType
            ? `分镜类型：${screen.screenType}（A=技术公信，B=场景共鸣，C=细节佐证）`
            : "",
          index === 0
            ? "首屏封面规则：必须做成海报主视觉，单一主体强焦点，产品主体占画面55%-70%，顶部标题区清晰留白，禁止拼贴式说明图。"
            : "",
          useModelForScene
            ? `人物规则：本屏涉及人物场景，固定使用提供的模特图同一人物（面部、发型、体型、服装风格保持一致）。`
            : "人物规则：本屏不要出现人物或人体部位，只展示产品与场景元素。",
          screen?.modelReason ? `人物融入依据：${screen.modelReason}` : "",
          bundleShowcase
            ? "搭配展示规则：本屏必须同场景展示主产品与搭配产品，主次层级清晰，突出组合购买价值与加购理由。"
            : "",
          bundleReason ? `搭配依据：${bundleReason}` : "",
          isAgentLayoutMode
            ? "生成策略：仅生成画面层（产品、光影、材质、场景），不要生成任何文字、数字、Logo、标语、水印。"
            : screen?.title
              ? `本屏标题：${screen.title}`
              : "",
          isAgentLayoutMode ? "" : screen?.subtitle ? `本屏副标题：${screen.subtitle}` : "",
          isAgentLayoutMode ? "" : screen?.copy ? `本屏文案说明：${screen.copy}` : "",
          screen?.layoutNote ? `本屏排版说明：${screen.layoutNote}` : "",
          screen?.fabe?.b ? `B（利益）：${screen.fabe.b}` : "",
          screen?.fabe?.f ? `F（特征）：${screen.fabe.f}` : "",
          screen?.fabe?.a ? `A（优势）：${screen.fabe.a}` : "",
          screen?.fabe?.e ? `E（证据）：${screen.fabe.e}` : "",
          `输出为竖版电商详情图，尺寸固定 ${DETAIL_TARGET_WIDTH}x${DETAIL_TARGET_HEIGHT} 像素。`,
          isAgentLayoutMode
            ? "硬性约束：禁止输出任何可见文字或字符，排版文字由后续程序化图层渲染。"
            : "要求：整套详情图风格统一，产品外观严格一致，主标题/副标题/正文字体与层级全套一致，商业摄影质感，排版区域清晰，标题不得包含“第X屏”。",
        ]
          .filter(Boolean)
          .join("\n\n"));
        const styleAnchorUrl =
          index > 0 ? generatedImages[0]?.originalUrl || generatedImages[0]?.thumbnailUrl : null;
        const generationReferenceImagesBase = [
          ...productAttachments.map((item) => item.url),
          ...(bundleShowcase ? bundleAttachments.map((item) => item.url) : []),
          ...(useModelForScene ? [modelAttachment.url] : []),
          ...(styleAnchorUrl ? [styleAnchorUrl] : []),
        ].filter(Boolean);
        const generateDetailFrame = async (
          promptOverride: string,
          extraReferenceImages: string[] = []
        ): Promise<{ originalUrl: string; thumbnailUrl: string }> => {
          const sanitizedPrompt = sanitizeDetailImageModelPrompt(promptOverride);
          const generationReferenceImages = [
            ...generationReferenceImagesBase,
            ...extraReferenceImages,
          ].filter(Boolean);
          const result = await requestCanvasImageGeneration({
            prompt: sanitizedPrompt,
            model: modelForGeneration,
            aspectRatio: "9:16",
            imageSize: imageParams.imageSize,
            imageCount: 1,
            negativePrompt: imageParams.negativePrompt,
            referenceImage: productAttachments[0]?.url,
            referenceImages: generationReferenceImages,
          });
          if (!Array.isArray(result?.images) || result.images.length === 0) {
            throw new Error(`第 ${index + 1} 张生成失败`);
          }
          const generatedImage = result.images[0];
          return {
            originalUrl: String(generatedImage?.originalUrl || generatedImage?.thumbnailUrl || "").trim(),
            thumbnailUrl: String(generatedImage?.thumbnailUrl || generatedImage?.originalUrl || "").trim(),
          };
        };

        const firstPassImage = await generateDetailFrame(generationPrompt);
        let finalGenerated = firstPassImage;
        let finalGenerationPrompt = generationPrompt;
        let screenReviewResult: DetailScreenReviewResult | null = null;
        const targetNodeId = detailPlaceholderNodeIds[index];
        patchDetailPlaceholder(index, {
          label: isAgentLayoutMode
            ? `协议质检中 ${index + 1}/${prompts.length}`
            : `双总监审稿中 ${index + 1}/${prompts.length}`,
          status: "generating",
        });

        setDetailProgress({
          status: "running",
          stage: isAgentLayoutMode
            ? `第 ${index + 1}/${prompts.length} 屏协议质检中，Agent 正在检查背景与文字层协议...`
            : `第 ${index + 1}/${prompts.length} 屏质检中，Agent 正在检查标题与排版...`,
          current: reviewStepCurrent,
          total: totalSteps,
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  parts: [
                    {
                      type: "text",
                      text: isAgentLayoutMode
                        ? `### AI详情生成\n第 ${index + 1}/${prompts.length} 屏首稿完成，正在检查背景画面与协议文字层...`
                        : `### AI详情生成\n第 ${index + 1}/${prompts.length} 屏首稿完成，正在质检与排版复核...`,
                    },
                  ],
                }
              : message,
          ),
        );

        try {
          const reviewResponse = await apiFetch("/api/canvas/detail-review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outputLanguage,
              generationMode: activeDetailGenerationMode,
              surfaceId: currentDetailSurfaceSnapshot?.surfaceId,
              imageUrl: firstPassImage.originalUrl || firstPassImage.thumbnailUrl,
              referenceImages: generationReferenceImagesBase.slice(0, 6),
              brief,
              globalStyle: planData.globalStyle,
              screen: {
                index: index + 1,
                title: screen?.title || "",
                subtitle: screen?.subtitle || "",
                copy: screen?.copy || "",
                layoutNote: screen?.layoutNote || "",
                visualPrompt: generationPrompt,
                screenType: screen?.screenType || "",
              },
            }),
          });
          const reviewResult = await reviewResponse.json().catch(() => ({}));
          if (reviewResponse.ok && reviewResult?.success) {
            screenReviewResult = (reviewResult?.data || {}) as DetailScreenReviewResult;
          }
        } catch (reviewError) {
          console.error("[CanvasChat] Detail screen review failed:", reviewError);
        }

        if (screenReviewResult) {
          const latestScreenIssues = Array.isArray(screenReviewResult.uiValidation?.issues)
            ? screenReviewResult.uiValidation.issues.filter(Boolean)
            : Array.isArray(screenReviewResult.issues)
              ? screenReviewResult.issues.filter(Boolean)
              : [];
          latestSurfaceReviewState = {
            screenIndex: index + 1,
            action: screenReviewResult?.reviewAction,
            passed:
              typeof screenReviewResult.uiValidation?.passed === "boolean"
                ? screenReviewResult.uiValidation.passed
                : screenReviewResult.pass,
            issues: latestScreenIssues,
          };
          if (screenReviewResult.uiSurfacePatch) {
            currentDetailSurfaceSnapshot = applyUiSurfacePatch(
              currentDetailSurfaceSnapshot,
              screenReviewResult.uiSurfacePatch,
            );
            setDetailSurfaceSnapshot(currentDetailSurfaceSnapshot);
          }
          const nextLatestSurfaceReview = latestSurfaceReviewState || {
            screenIndex: index + 1,
            action: screenReviewResult?.reviewAction,
            passed:
              typeof screenReviewResult.uiValidation?.passed === "boolean"
                ? screenReviewResult.uiValidation.passed
                : screenReviewResult.pass,
            issues: latestScreenIssues,
          };
          setDetailUiValidation((prev) => ({
            ...prev,
            latestScreen: {
              screenIndex: nextLatestSurfaceReview.screenIndex || index + 1,
              action: nextLatestSurfaceReview.action,
              passed: nextLatestSurfaceReview.passed,
              issues: nextLatestSurfaceReview.issues || [],
            },
          }));
        }

        const shouldApplyProtocolPatch = Boolean(
          screenReviewResult?.uiPatch &&
            screenReviewResult?.reviewAction === "protocol_patch",
        );
        const shouldRegenerate =
          !shouldApplyProtocolPatch &&
          screenReviewResult?.reviewAction === "regenerate_image" &&
          typeof screenReviewResult?.revisedPrompt === "string" &&
          screenReviewResult.revisedPrompt.trim().length > 20;

        if (shouldApplyProtocolPatch) {
          patchDetailPlaceholder(index, {
            label: `协议修正中 ${index + 1}/${prompts.length}`,
            status: "generating",
          });
          const issueHint = Array.isArray(screenReviewResult?.issues)
            ? screenReviewResult.issues.filter(Boolean).slice(0, 2).join("；")
            : "";
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    parts: [
                      {
                        type: "text",
                        text: `### AI详情生成\n第 ${index + 1}/${prompts.length} 屏质检发现排版/文案层可优化${issueHint ? `：${issueHint}` : ""}，正在直接修正协议文字层...`,
                      },
                    ],
                  }
                : message,
            ),
          );

          const currentNode = targetNodeId
            ? useCanvasStore.getState().getNode(targetNodeId)
            : null;
          if (currentNode && targetNodeId) {
            if (currentDetailSurfaceSnapshot) {
              createAgentLayoutTextLayers({
                nodeId: targetNodeId,
                screenIndex: index,
                screen,
                screenProtocol: planData.uiProtocol?.screens?.[index],
                surfaceSnapshot: currentDetailSurfaceSnapshot,
              });
            } else {
              const replacementDrafts = buildDetailTextLayerNodesFromReviewPatch({
                parentNodeId: targetNodeId,
                parentPosition: {
                  x: Number(currentNode.position?.x || 0),
                  y: Number(currentNode.position?.y || 0),
                },
                parentSize: {
                  width: Number(currentNode.size?.width || DETAIL_TARGET_WIDTH),
                  height: Number(currentNode.size?.height || DETAIL_TARGET_HEIGHT),
                },
                screenSize: planData.uiProtocol?.screenSize || {
                  width: DETAIL_TARGET_WIDTH,
                  height: DETAIL_TARGET_HEIGHT,
                },
                uiPatch: screenReviewResult?.uiPatch,
              });
              if (replacementDrafts.length > 0) {
                replaceDetailTextLayers({
                  nodeId: targetNodeId,
                  drafts: replacementDrafts,
                });
              }
            }
          }
        } else if (shouldRegenerate) {
          patchDetailPlaceholder(index, {
            label: `二次优化生成中 ${index + 1}/${prompts.length}`,
            status: "generating",
          });
          const issueHint = Array.isArray(screenReviewResult?.issues)
            ? screenReviewResult.issues.filter(Boolean).slice(0, 2).join("；")
            : "";
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    parts: [
                      {
                        type: "text",
                        text: `### AI详情生成\n第 ${index + 1}/${prompts.length} 屏质检发现可优化项${issueHint ? `：${issueHint}` : ""}，正在二次修图...`,
                      },
                    ],
                  }
                : message,
            ),
          );

          for (let retry = 0; retry < DETAIL_SCREEN_REVIEW_MAX_ATTEMPTS; retry += 1) {
            try {
              const revisedPrompt = sanitizeDetailImageModelPrompt(
                String(screenReviewResult?.revisedPrompt || "").trim()
              );
              const regenerated = await generateDetailFrame(revisedPrompt, [
                firstPassImage.originalUrl || firstPassImage.thumbnailUrl,
              ]);
              finalGenerated = regenerated;
              finalGenerationPrompt = revisedPrompt;
              break;
            } catch (regenError) {
              if (retry === DETAIL_SCREEN_REVIEW_MAX_ATTEMPTS - 1) {
                console.error("[CanvasChat] Detail second-pass generation failed:", regenError);
              }
            }
          }
        } else if (isAgentLayoutMode) {
          patchDetailPlaceholder(index, {
            label: `排版层渲染中 ${index + 1}/${prompts.length}`,
            status: "generating",
          });
        }

        generatedImages.push(finalGenerated);
        completedDetailImageCount = generatedImages.length;

        if (workingArchive?.id) {
          const progressSummary = `进行中：已完成 ${completedDetailImageCount}/${prompts.length} 张详情图`;
          const progressCoverUrl = generatedImages[0]?.thumbnailUrl || generatedImages[0]?.originalUrl;
          const nextArchive: DetailArchive = {
            ...workingArchive,
            summary: progressSummary,
            imageCount: completedDetailImageCount,
            coverUrl: progressCoverUrl,
            uiSurfaceSnapshot: currentDetailSurfaceSnapshot,
            uiSurfaceLatestReview: latestSurfaceReviewState,
          };
          workingArchive = nextArchive;
          updateLocalDetailArchive(nextArchive.id, {
            summary: progressSummary,
            imageCount: completedDetailImageCount,
            coverUrl: progressCoverUrl,
            uiSurfaceSnapshot: currentDetailSurfaceSnapshot,
            uiSurfaceLatestReview: latestSurfaceReviewState,
          });
          await patchDetailArchiveInDatabase(nextArchive.id, nextArchive);
        }

        const dimensions = await getImageDimensions(
          finalGenerated.originalUrl || finalGenerated.thumbnailUrl
        );
        const detailSubjectAnalysis = isAgentLayoutMode
          ? await requestDetailSubjectAnalysis(
              finalGenerated.originalUrl || finalGenerated.thumbnailUrl,
            )
          : null;
        if (targetNodeId) {
          const storeState = useCanvasStore.getState();
          const currentNode = storeState.getNode(targetNodeId);
          const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
          const finalImageUrl = finalGenerated.originalUrl || finalGenerated.thumbnailUrl;
          const detailUiScreenOverlay = buildDetailUiScreenOverlaySnapshot({
            surface: currentDetailSurfaceSnapshot,
            screenIndex: index + 1,
          });
          const detailUiDslDocument =
            Array.isArray(planData.uiDslV2Screens) && planData.uiDslV2Screens[index]
              ? planData.uiDslV2Screens[index]
              : detailUiScreenOverlay
                ? buildDetailUiDslV2({
                    overlay: detailUiScreenOverlay,
                    subjectAnalysis: detailSubjectAnalysis,
                  })
                : null;
          const completedDetailMetadata = {
            ...(currentData.metadata || {}),
            originalWidth: dimensions.originalWidth,
            originalHeight: dimensions.originalHeight,
            generationPrompt: finalGenerationPrompt,
            detailSectionIndex: index + 1,
            detailPlanSummary: planData.summary || "",
            detailTargetWidth: DETAIL_TARGET_WIDTH,
            detailTargetHeight: DETAIL_TARGET_HEIGHT,
            detailTitle: screen?.title || "",
            detailSubtitle: screen?.subtitle || "",
            detailScreenType: screen?.screenType || "",
            detailLayoutNote: screen?.layoutNote || "",
            detailUseModel: useModelForScene,
            detailModelReason: screen?.modelReason || "",
            detailBundleShowcase: bundleShowcase,
            detailBundleReason: bundleReason,
            detailGlobalStyle: planData.globalStyle || null,
            detailDesignSkill: planData.designSkill || null,
            detailGenerationMode: activeDetailGenerationMode,
            detailScreenReview: screenReviewResult || null,
            detailUiSurfaceId: currentDetailSurfaceSnapshot?.surfaceId || null,
            detailUiSurfaceType: currentDetailSurfaceSnapshot?.surfaceType || null,
            detailUiScreenOverlay,
            detailUiDslDocument,
            detailSubjectAnalysis,
            detailGeneratingPlaceholder: false,
            detailProgressLabel: `该屏完成 ${index + 1}/${prompts.length}`,
          };
          const uiScreenDocument =
            isAgentLayoutMode && detailUiDslDocument
              ? buildUiScreenDocumentFromDetailUiDsl({
                  dsl: detailUiDslDocument,
                  background: {
                    src: finalImageUrl,
                    thumbnailUrl: finalGenerated.thumbnailUrl,
                    alt: screen?.title || `详情图-${index + 1}`,
                  },
                  title: screen?.title || `详情图-${index + 1}`,
                  metadata: completedDetailMetadata,
                })
              : null;
          updateNode(targetNodeId, {
            type: uiScreenDocument ? "ui-screen" : currentNode?.type || "image",
            size: {
              width: DETAIL_TARGET_WIDTH,
              height: DETAIL_TARGET_HEIGHT,
            },
            data: uiScreenDocument
              ? {
                  status: "completed",
                  document: uiScreenDocument,
                  renderArtifacts: {
                    screenshotUrl: finalGenerated.originalUrl,
                    thumbnailUrl: finalGenerated.thumbnailUrl,
                  },
                  source: {
                    prompt: finalGenerationPrompt,
                    model: modelForGeneration,
                  },
                  evaluation: {
                    score:
                      typeof screenReviewResult?.score === "number"
                        ? screenReviewResult.score
                        : undefined,
                    issues: Array.isArray(screenReviewResult?.issues)
                      ? screenReviewResult.issues.filter(Boolean)
                      : undefined,
                  },
                  metadata: completedDetailMetadata,
                }
              : {
                  ...currentData,
                  src: finalImageUrl,
                  status: "completed",
                  prompt: promptText,
                  title: `详情图-${index + 1}`,
                  metadata: completedDetailMetadata,
                },
          });
          createAgentLayoutTextLayers({
            nodeId: targetNodeId,
            screenIndex: index,
            screen,
            screenProtocol: planData.uiProtocol?.screens?.[index],
            surfaceSnapshot: currentDetailSurfaceSnapshot,
          });
        }
      }
      if (generatedImages.length !== prompts.length) {
        throw new Error(
          `详情主图未完整生成：计划 ${prompts.length} 屏，实际完成 ${generatedImages.length} 屏`
        );
      }

      const reviewGroups: DetailReviewGroup[] = [];
      const reviewFailures: string[] = [];
      const detailStartX = 120;
      const detailStartY = detailPlaceholderStartY;
      const detailSpacing = 24;
      const reviewStartY =
        detailStartY + prompts.length * (DETAIL_TARGET_HEIGHT + detailSpacing) + 120;

      for (let reviewIndex = 0; reviewIndex < reviewPlans.length; reviewIndex += 1) {
        const reviewPlan = reviewPlans[reviewIndex]!;
        const reviewStepCurrent = prompts.length * 2 + 2 + reviewIndex;
        setDetailProgress({
          status: "running",
          stage: `正在生成买家评价与晒图 ${reviewIndex + 1}/${reviewPlans.length}`,
          current: reviewStepCurrent,
          total: totalSteps,
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  parts: [
                    {
                      type: "text",
                      text: `### AI详情生成\n详情图已完成，正在生成买家评价与晒图 ${reviewIndex + 1}/${reviewPlans.length}...`,
                    },
                  ],
                }
              : message,
          ),
        );

        const reviewPrompt = [
          reviewPlan.imagePrompt,
          `评价文本：${reviewPlan.reviewText}`,
          "输出要求：生成真实电商买家晒单风格图片，避免夸张广告质感。",
          "人物规则：买家秀必须使用真实买家视角，不得复用上传的官方模特图形象。",
          `同一条评价连续输出 ${DETAIL_REVIEW_IMAGE_COUNT} 张图片，场景和构图要保持同一叙事主题但角度不同。`,
          "图片内容要看得见产品主体和真实使用痕迹，适合放在详情页评价区。",
        ]
          .filter(Boolean)
          .join("\n\n");

        const reviewReferenceImages = [
          ...productAttachments.map((item) => item.url),
          ...(bundleAttachments.length ? bundleAttachments.map((item) => item.url) : []),
        ].filter(Boolean);

        const reviewResult = await requestCanvasImageGeneration({
          prompt: reviewPrompt,
          model: modelForGeneration,
          aspectRatio: "1:1",
          imageSize: imageParams.imageSize,
          imageCount: DETAIL_REVIEW_IMAGE_COUNT,
          negativePrompt: imageParams.negativePrompt,
          referenceImage: productAttachments[0]?.url,
          referenceImages: reviewReferenceImages,
        });
        const reviewImagesRaw = Array.isArray(reviewResult?.images) ? reviewResult.images : [];
        if (reviewImagesRaw.length === 0) {
          reviewFailures.push(`评价${reviewIndex + 1}生成失败`);
          continue;
        }

        const reviewImages = reviewImagesRaw
          .slice(0, DETAIL_REVIEW_IMAGE_COUNT)
          .map((item: any) => ({
            originalUrl: String(item?.originalUrl || item?.thumbnailUrl || "").trim(),
            thumbnailUrl: String(item?.thumbnailUrl || item?.originalUrl || "").trim(),
          }))
          .filter((item: { originalUrl: string; thumbnailUrl: string }) => Boolean(item.originalUrl));

        if (reviewImages.length === 0) {
          reviewFailures.push(`评价${reviewIndex + 1}未返回有效图片`);
          continue;
        }

        reviewGroups.push({
          reviewText: reviewPlan.reviewText,
          images: reviewImages,
        });

        reviewImages.forEach((image: { originalUrl: string; thumbnailUrl: string }, imageIndex: number) => {
          const x =
            detailStartX +
            imageIndex * (DETAIL_REVIEW_IMAGE_WIDTH + 20);
          const y =
            reviewStartY +
            reviewIndex * (DETAIL_REVIEW_IMAGE_HEIGHT + 72);
          addNode({
            type: "image",
            position: { x, y },
            size: {
              width: DETAIL_REVIEW_IMAGE_WIDTH,
              height: DETAIL_REVIEW_IMAGE_HEIGHT,
            },
            data: {
              src: image.originalUrl || image.thumbnailUrl,
              status: "completed",
              prompt: reviewPlan.imagePrompt,
              title: `买家晒图-${reviewPlan.index}-${imageIndex + 1}`,
              note: reviewPlan.reviewText,
              metadata: {
                detailReviewIndex: reviewPlan.index,
                detailReviewTitle: reviewPlan.title,
                detailReviewText: reviewPlan.reviewText,
                detailReviewImageIndex: imageIndex + 1,
                detailReviewImageCount: DETAIL_REVIEW_IMAGE_COUNT,
              },
            },
            connections: [],
          });
        });
      }

      const finalMarkdown = buildDetailResultMarkdown({
        generationMode: activeDetailGenerationMode,
        summary: planData.summary,
        images: generatedImages,
        prompts,
        skillFlow: planData.skillFlow,
        designSkill: planData.designSkill,
        qualityChecks: planData.qualityChecks,
        uiValidation: planData.uiValidation,
        brandStyleBoard: planData.brandStyleBoard,
        globalStyle: planData.globalStyle,
        screens: screenSpecs,
        reviewGroups,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [
                  {
                    type: "text",
                    text: finalMarkdown,
                  },
                ],
              }
            : message,
        ),
      );
      setDetailProgress({
        status: "done",
        stage:
          reviewFailures.length > 0
            ? `详情主图完成 ${generatedImages.length}/${prompts.length} 屏，评价晒图部分失败 ${reviewFailures.length} 条`
            : `详情主图完成 ${generatedImages.length}/${prompts.length} 屏 + ${reviewGroups.length} 条评价晒图`,
        current: totalSteps,
        total: totalSteps,
      });
      const finalSummary =
        planData.summary ||
        (reviewFailures.length > 0
          ? `详情主图完成 ${generatedImages.length}/${prompts.length} 屏，评价晒图部分失败 ${reviewFailures.length} 条`
          : `详情主图完成 ${generatedImages.length}/${prompts.length} 屏 + ${reviewGroups.length} 条评价晒图`);
      if (workingArchive?.id) {
        const finalArchive: DetailArchive = {
          ...workingArchive,
          summary: finalSummary,
          imageCount: generatedImages.length,
          coverUrl: generatedImages[0]?.thumbnailUrl || generatedImages[0]?.originalUrl,
          uiSurfaceSnapshot: currentDetailSurfaceSnapshot,
          uiSurfaceLatestReview: latestSurfaceReviewState,
        };
        workingArchive = finalArchive;
        updateLocalDetailArchive(finalArchive.id, {
          summary: finalArchive.summary,
          imageCount: finalArchive.imageCount,
          coverUrl: finalArchive.coverUrl,
          uiSurfaceSnapshot: finalArchive.uiSurfaceSnapshot,
          uiSurfaceLatestReview: finalArchive.uiSurfaceLatestReview,
        });
        await patchDetailArchiveInDatabase(finalArchive.id, finalArchive);
      } else {
        await saveDetailArchiveSnapshot({
          summary: finalSummary,
          imageCount: generatedImages.length,
          coverUrl: generatedImages[0]?.thumbnailUrl || generatedImages[0]?.originalUrl,
          prompt: archiveSnapshot.prompt,
          generationMode: archiveSnapshot.generationMode,
          brief: archiveSnapshot.brief,
          slots: archiveSnapshot.slots,
          uiSurfaceSnapshot: currentDetailSurfaceSnapshot,
          uiSurfaceLatestReview: latestSurfaceReviewState,
        });
      }

      if (reviewFailures.length > 0) {
        toast.warning(
          `详情主图完成 ${generatedImages.length}/${prompts.length} 屏，买家评价晒图成功 ${reviewGroups.length} 条，失败 ${reviewFailures.length} 条`
        );
      } else {
        toast.success(
          `AI详情生成完成：详情主图 ${generatedImages.length}/${prompts.length} 屏，评价晒图 ${reviewGroups.length} 条`
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "AI详情生成失败";
      if (detailPlaceholderNodeIds.length > 0) {
        for (let index = completedDetailImageCount; index < detailPlaceholderNodeIds.length; index += 1) {
          const nodeId = detailPlaceholderNodeIds[index];
          if (!nodeId) continue;
          const storeState = useCanvasStore.getState();
          const currentNode = storeState.getNode(nodeId);
          const currentData = ((currentNode?.data as any) || {}) as Record<string, any>;
          if (currentData.status === "completed") continue;
          updateNode(nodeId, {
            data: {
              ...currentData,
              src: String(currentData.src || ""),
              status: "failed",
              metadata: {
                ...(currentData.metadata || {}),
                detailGeneratingPlaceholder: false,
                detailFailedReason: errMsg,
              },
            },
          });
        }
      }
      if (workingArchive?.id) {
        const failedSummary = `异常中断：已完成 ${completedDetailImageCount} 张详情图，错误：${errMsg}`;
        const failedArchive: DetailArchive = {
          ...workingArchive,
          summary: failedSummary,
          imageCount: completedDetailImageCount,
          coverUrl: generatedImages[0]?.thumbnailUrl || generatedImages[0]?.originalUrl,
          uiSurfaceSnapshot: currentDetailSurfaceSnapshot,
          uiSurfaceLatestReview: latestSurfaceReviewState,
        };
        updateLocalDetailArchive(failedArchive.id, {
          summary: failedSummary,
          imageCount: completedDetailImageCount,
          coverUrl: failedArchive.coverUrl,
          uiSurfaceSnapshot: failedArchive.uiSurfaceSnapshot,
          uiSurfaceLatestReview: failedArchive.uiSurfaceLatestReview,
        });
        void patchDetailArchiveInDatabase(failedArchive.id, failedArchive);
      }
      setDetailProgress((prev) => ({
        status: "error",
        stage: errMsg,
        current: prev.current,
        total: prev.total,
      }));
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [
                  {
                    type: "text",
                    text: `### AI详情生成失败\n${errMsg}`,
                  },
                ],
              }
            : message,
        ),
      );
      toast.error(errMsg);
    } finally {
      setIsDetailGenerating(false);
    }
  }, [
    addNode,
    clearSelection,
    detailBrief,
    detailGenerationMode,
    detailSlots,
    imageParams.negativePrompt,
    input,
    isDetailGenerating,
    normalizedDetailBrief,
    patchDetailArchiveInDatabase,
    selectedModelId,
    saveDetailArchiveSnapshot,
    setMessages,
    siteSettings?.canvasAutoModeDefaultModelId,
    siteSettings?.canvasDetailDefaultModelId,
    siteSettings?.canvasDefaultModelId,
    updateLocalDetailArchive,
  ]);

  const handleGenerateMoreDetailReviews = useCallback(async () => {
    if (isDetailGenerating) return;
    if (!hasGeneratedDetailImages) {
      toast.error("请先完成一轮AI详情生成，再追加评价晒图");
      return;
    }

    const brief = normalizedDetailBrief;
    if (!brief.targetAudience || !brief.usageScenario || !brief.coreNeed) {
      toast.error("请先补充 AI详情生成必填项后再追加评价晒图");
      return;
    }

    const productAttachments = DETAIL_PRODUCT_SLOT_INDEXES
      .map((index) => detailSlots[index])
      .filter((item): item is PickedObjectAttachment => Boolean(item?.url));
    if (productAttachments.length < 5) {
      toast.error("请先补齐5张产品图，再追加评价晒图");
      return;
    }
    const bundleAttachments = DETAIL_BUNDLE_SLOT_INDEXES
      .map((index) => detailSlots[index])
      .filter((item): item is PickedObjectAttachment => Boolean(item?.url));

    const languageSeed = [
      brief.productName,
      brief.targetAudience,
      brief.usageScenario,
      brief.coreNeed,
    ]
      .filter(Boolean)
      .join(" ");
    const outputLanguage: "zh" | "en" = /[a-zA-Z]/.test(languageSeed) ? "en" : "zh";
    const reviewPlans = buildDetailReviewPlans({
      brief,
      language: outputLanguage,
      count: DETAIL_REVIEW_REGEN_COUNT,
    });
    if (reviewPlans.length === 0) {
      toast.error("未生成可用的评价方案");
      return;
    }

    const assistantMessageId = generateUUID();
    const modelForGeneration =
      selectedModelId !== "auto"
        ? selectedModelId
        : siteSettings?.canvasDetailDefaultModelId ||
          siteSettings?.canvasAutoModeDefaultModelId ||
          siteSettings?.canvasDefaultModelId ||
          undefined;
    const existingImageBottom = nodes
      .filter((node) => node.type === "image")
      .reduce((max, node) => {
        const currentBottom = Number(node.position?.y || 0) + Number(node.size?.height || 0);
        return Math.max(max, currentBottom);
      }, 120);
    const reviewStartY = existingImageBottom + 120;
    const reviewStartX = 120;
    const reviewGroups: DetailReviewGroup[] = [];
    const reviewFailures: string[] = [];
    const batchId = generateUUID();

    setIsDetailGenerating(true);
    setDetailProgress({
      status: "running",
      stage: "正在追加买家评价与晒图...",
      current: 0,
      total: reviewPlans.length,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `### 买家评价与晒图\n正在生成新的 ${reviewPlans.length} 条评价，每条 ${DETAIL_REVIEW_IMAGE_COUNT} 张...`,
          },
        ],
      } as any,
    ]);

    try {
      for (let reviewIndex = 0; reviewIndex < reviewPlans.length; reviewIndex += 1) {
        const reviewPlan = reviewPlans[reviewIndex]!;
        setDetailProgress({
          status: "running",
          stage: `正在追加第 ${reviewIndex + 1}/${reviewPlans.length} 条评价晒图`,
          current: reviewIndex + 1,
          total: reviewPlans.length,
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  parts: [
                    {
                      type: "text",
                      text: `### 买家评价与晒图\n正在追加第 ${reviewIndex + 1}/${reviewPlans.length} 条...`,
                    },
                  ],
                }
              : message
          )
        );

        const reviewPrompt = [
          reviewPlan.imagePrompt,
          `评价文本：${reviewPlan.reviewText}`,
          "输出要求：生成真实电商买家晒单风格图片，避免夸张广告质感。",
          "人物规则：买家秀必须使用真实买家视角，不得复用上传的官方模特图形象。",
          `同一条评价连续输出 ${DETAIL_REVIEW_IMAGE_COUNT} 张图片，场景和构图保持同一叙事主题但角度不同。`,
          "图片内容需要清晰展示产品主体与使用场景，可直接用于详情页评价区。",
        ]
          .filter(Boolean)
          .join("\n\n");
        const reviewReferenceImages = [
          ...productAttachments.map((item) => item.url),
          ...(bundleAttachments.length ? bundleAttachments.map((item) => item.url) : []),
        ].filter(Boolean);

        const reviewResult = await requestCanvasImageGeneration({
          prompt: reviewPrompt,
          model: modelForGeneration,
          aspectRatio: "1:1",
          imageSize: imageParams.imageSize,
          imageCount: DETAIL_REVIEW_IMAGE_COUNT,
          negativePrompt: imageParams.negativePrompt,
          referenceImage: productAttachments[0]?.url,
          referenceImages: reviewReferenceImages,
        });
        const reviewImagesRaw = Array.isArray(reviewResult?.images) ? reviewResult.images : [];
        if (reviewImagesRaw.length === 0) {
          reviewFailures.push(`第${reviewIndex + 1}条生成失败`);
          continue;
        }

        const reviewImages = reviewImagesRaw
          .slice(0, DETAIL_REVIEW_IMAGE_COUNT)
          .map((item: any) => ({
            originalUrl: String(item?.originalUrl || item?.thumbnailUrl || "").trim(),
            thumbnailUrl: String(item?.thumbnailUrl || item?.originalUrl || "").trim(),
          }))
          .filter((item: { originalUrl: string; thumbnailUrl: string }) =>
            Boolean(item.originalUrl)
          );
        if (reviewImages.length === 0) {
          reviewFailures.push(`第${reviewIndex + 1}条无有效图片`);
          continue;
        }

        const rowIndex = reviewGroups.length;
        reviewGroups.push({
          reviewText: reviewPlan.reviewText,
          images: reviewImages,
        });

        reviewImages.forEach((image: { originalUrl: string; thumbnailUrl: string }, imageIndex: number) => {
          const x = reviewStartX + imageIndex * (DETAIL_REVIEW_IMAGE_WIDTH + 20);
          const y = reviewStartY + rowIndex * (DETAIL_REVIEW_IMAGE_HEIGHT + 72);
          addNode({
            type: "image",
            position: { x, y },
            size: {
              width: DETAIL_REVIEW_IMAGE_WIDTH,
              height: DETAIL_REVIEW_IMAGE_HEIGHT,
            },
            data: {
              src: image.originalUrl || image.thumbnailUrl,
              status: "completed",
              prompt: reviewPlan.imagePrompt,
              title: `买家晒图-${reviewPlan.index}-${imageIndex + 1}`,
              note: reviewPlan.reviewText,
              metadata: {
                detailReviewIndex: reviewPlan.index,
                detailReviewTitle: reviewPlan.title,
                detailReviewText: reviewPlan.reviewText,
                detailReviewImageIndex: imageIndex + 1,
                detailReviewImageCount: DETAIL_REVIEW_IMAGE_COUNT,
                detailReviewBatchId: batchId,
                detailReviewBatchType: "manual-append",
              },
            },
            connections: [],
          });
        });
      }

      const finalText = buildDetailReviewAppendMarkdown({
        groups: reviewGroups,
        failedCount: reviewFailures.length,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [
                  {
                    type: "text",
                    text: finalText,
                  },
                ],
              }
            : message
        )
      );
      setDetailProgress({
        status: "done",
        stage:
          reviewFailures.length > 0
            ? `已追加 ${reviewGroups.length} 条，失败 ${reviewFailures.length} 条`
            : `已追加 ${reviewGroups.length} 条买家评价晒图`,
        current: reviewPlans.length,
        total: reviewPlans.length,
      });

      if (reviewFailures.length > 0) {
        toast.warning(`追加成功 ${reviewGroups.length} 条，失败 ${reviewFailures.length} 条`);
      } else {
        toast.success(`已追加 ${reviewGroups.length} 条买家评价晒图`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "追加买家评价与晒图失败";
      setDetailProgress({
        status: "error",
        stage: errMsg,
        current: 0,
        total: reviewPlans.length,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [
                  {
                    type: "text",
                    text: `### 买家评价与晒图追加失败\n${errMsg}`,
                  },
                ],
              }
            : message
        )
      );
      toast.error(errMsg);
    } finally {
      setIsDetailGenerating(false);
    }
  }, [
    addNode,
    detailSlots,
    hasGeneratedDetailImages,
    imageParams.negativePrompt,
    isDetailGenerating,
    nodes,
    normalizedDetailBrief,
    selectedModelId,
    setMessages,
    siteSettings?.canvasAutoModeDefaultModelId,
    siteSettings?.canvasDetailDefaultModelId,
    siteSettings?.canvasDefaultModelId,
  ]);

  const ensureImagePointsBeforeSend = useCallback(() => {
    if (isVideoModel || activeComposerMode === "agent") return true;
    if (membershipSummary?.isHighVip) return true;

    const pointsEnabled = membershipSummary?.pointsSystemConfig?.enabled === true;
    const blockOnInsufficient =
      membershipSummary?.pointsSystemConfig?.blockOnInsufficient !== false;
    const unitCost = getImageCreditCostFromConfig(
      currentModel?.imageGenConfig,
      imageParams?.imageSize
    );

    if (!pointsEnabled || !blockOnInsufficient || unitCost <= 0) {
      return true;
    }

    const requestedImageCount = Math.max(
      1,
      Math.round(Number(imageParams?.imageCount || 1))
    );
    const expectedCost = unitCost * requestedImageCount;
    const currentBalance = Math.max(
      0,
      Number(membershipSummary?.summary?.currentCredits ?? 0)
    );

    if (currentBalance >= expectedCost) {
      return true;
    }

    setInsufficientPointsState({
      balance: currentBalance,
      expectedCost,
      unitCost,
      imageCount: requestedImageCount,
    });
    toast.error("积分不足，请先充值后再生图");
    return false;
  }, [
    activeComposerMode,
    currentModel?.imageGenConfig,
    imageParams?.imageCount,
    imageParams?.imageSize,
    isVideoModel,
    membershipSummary?.isHighVip,
    membershipSummary?.pointsSystemConfig?.blockOnInsufficient,
    membershipSummary?.pointsSystemConfig?.enabled,
    membershipSummary?.summary?.currentCredits,
  ]);

  const estimatedPointsCost = useMemo(() => {
    if (membershipSummary?.isHighVip) return null;
    if (membershipSummary?.pointsSystemConfig?.enabled !== true) return null;
    if (activeComposerMode === "agent") return null;

    if (isVideoModel) {
      const cost = getGenerationCreditCostFromImageGenConfig(
        currentModel?.imageGenConfig,
        "video",
        {
          duration: videoParams?.duration,
          resolution: videoParams?.resolution,
        }
      );
      return cost > 0
        ? {
            cost,
            title: `本次预计消耗 ${cost} 积分`,
          }
        : null;
    }

    const unitCost = getImageCreditCostFromConfig(
      currentModel?.imageGenConfig,
      imageParams?.imageSize
    );
    const imageCount = Math.max(
      1,
      Math.round(Number(imageParams?.imageCount || 1))
    );
    const cost = unitCost * imageCount;
    return cost > 0
      ? {
          cost,
          title: `本次预计消耗 ${cost} 积分（${unitCost} × ${imageCount} 张）`,
        }
      : null;
  }, [
    activeComposerMode,
    currentModel?.imageGenConfig,
    imageParams?.imageCount,
    imageParams?.imageSize,
    isVideoModel,
    membershipSummary?.isHighVip,
    membershipSummary?.pointsSystemConfig?.enabled,
    videoParams?.duration,
    videoParams?.resolution,
  ]);

  // 处理发送（图片已在上传时添加到画布，这里只发送消息）
  const handleSend = useCallback(async () => {
    const currentSendGuard = getSendGuard(activeChatId);
    if (currentSendGuard.inFlight || status === "streaming" || status === "submitted") {
      return;
    }

    if (isDetailGenerationMode && canUseDetailGeneration) {
      setSendGuard(activeChatId, {
        inFlight: true,
        signature: `detail:${activeChatId}:${Date.now()}`,
        timestamp: Date.now(),
      });
      try {
        await handleDetailGeneration();
      } finally {
        releaseSendGuard(activeChatId);
      }
      return;
    }

    if (!input.trim() && attachments.length === 0 && !selectedSkillTag && !hasWorkflowContext) {
      return;
    }
    const effectiveModelId = currentModelIdRef.current || selectedModelId;
    if (!effectiveModelId) {
      toast.error("请选择一个模型");
      return;
    }

    if (!ensureImagePointsBeforeSend()) {
      return;
    }

    // 构建 parts 数组：文件在前，文本在后，保持后端消息解析顺序稳定。
    const parts: any[] = [];

    let effectiveAttachments = attachments
      .map((attachment) => sanitizeChatAttachment(attachment))
      .filter((attachment): attachment is PickedObjectAttachment => Boolean(attachment));
    if (hasAgentUploadSlots) {
      if (effectiveAttachments.length > agentRequiredUploadCount) {
        effectiveAttachments = effectiveAttachments.slice(0, agentRequiredUploadCount);
      }

      if (effectiveAttachments.length < agentRequiredUploadCount) {
        toast.error("当前 Agent 需要上传 3 张图片：产品图1、产品图2、模特图");
        return;
      }
    }
    if (activeComposerMode === "image") {
      const referenceUrls = new Set([
        ...effectiveAttachments.filter((a) => normalizeChatMediaType(a.contentType).startsWith("image/"))
          .map((a) => a.url.trim()),
        ...selectedImageNodes.map((node) => String((node.data as any)?.src || "").trim())
          .filter(isValidChatHttpUrl),
      ]);
      const limit = getImageReferenceLimit(
        currentModel?.modelId || effectiveModelId,
        currentModel?.providerType,
        (currentModel?.imageGenConfig as any)?.maxReferenceImages,
      );
      if (limit !== undefined && referenceUrls.size > limit) {
        toast.error(`当前模型最多支持 ${limit} 张参考图，已选择 ${referenceUrls.size} 张，请减少后重试。`);
        return;
      }
    }
    const videoImageLimit = isVideoModel
      ? getVideoImageLimit(videoParams, currentModel?.providerType, currentModel?.videoToolCapability)
      : null;

    if (videoImageLimit) {
      if (videoImageLimit.max === 0) {
        effectiveAttachments = [];
      } else if (effectiveAttachments.length > videoImageLimit.max) {
        effectiveAttachments = effectiveAttachments.slice(0, videoImageLimit.max);
      }

      if (effectiveAttachments.length < videoImageLimit.min) {
        toast.error(
          videoImageLimit.min === 1
            ? "当前视频模式需要至少 1 张参考图"
            : "当前视频模式需要 2 张首尾帧图片"
        );
        return;
      }
    }

    // 🆕 检查是否有标注的图片
    const annotatedNodes = selectedImageNodes.filter(node => (node.data as any)?.hasAnnotations);
    const hasAnnotatedImages = annotatedNodes.length > 0;

    // 添加文件部分（作为 file 类型的 part）
    // 🆕 收集物品信息用于构建隐藏提示
    const pickedObjectInfos: string[] = [];

    effectiveAttachments.forEach((a) => {
      const att = a as PickedObjectAttachment;
      parts.push({
        type: "file" as const,
        mediaType: normalizeChatMediaType(a.contentType),
        name: normalizeChatAttachmentName(a.name),
        url: a.url,
        assetId: isValidChatUuid(a.assetId) ? a.assetId : undefined,
        hasAnnotations: hasAnnotatedImages, // 🆕 标记图片是否有标注
        pickedObject: att.pickedObject, // 🆕 包含物品信息
      });

      // 收集物品信息
      if (att.pickedObject) {
        const { objectName, objectPosition, boundingBox } = att.pickedObject;
        pickedObjectInfos.push(
          `【物品：${objectName}】位置：${objectPosition}，边界框：(${Math.round(boundingBox.x * 100)}%, ${Math.round(boundingBox.y * 100)}%) - (${Math.round((boundingBox.x + boundingBox.width) * 100)}%, ${Math.round((boundingBox.y + boundingBox.height) * 100)}%)`
        );
      }
    });

    // 添加文本部分（用户可见）
    let textContent = input
      .replace(/\u200b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (textContent && effectiveAttachments.length > 0) {
      let strippedText = textContent;
      for (const attachment of effectiveAttachments) {
        const fullName = (attachment.name || "").trim();
        const shortName = fullName.length > 10 ? `${fullName.substring(0, 8)}...` : fullName;
        for (const candidate of [fullName, shortName]) {
          if (!candidate) continue;
          if (strippedText.startsWith(candidate)) {
            strippedText = strippedText.slice(candidate.length).trimStart();
          }
        }
      }
      textContent = strippedText || textContent;
    }

    if (!textContent && effectiveAttachments.length > 0) {
      textContent = "请处理这张图片";
    }
    if (!textContent && hasWorkflowContext && workflowContext?.summaryText) {
      textContent = `请基于当前工作流设定生成方案：${workflowContext.summaryText}`;
    }
    const effectiveComposerMode = activeComposerModeRef.current || activeComposerMode;
    const effectiveAgentEntryMode = agentEntryModeRef.current || agentEntryMode;
    if (!textContent && hasAgentUploadSlots && selectedAgentPreset) {
      textContent = `请按「${selectedAgentPreset.name}」Agent 配置顺序处理产品图1、产品图2和模特图。`;
    }
    if (!textContent && selectedSkillTag) {
      textContent = `请按「${selectedSkillTag.name}」标签的要求处理。`;
    }
    textContent = clampChatRequestText(textContent, MAX_CHAT_TEXT_PART_LENGTH);

    // 🆕 隐藏提示词（不在 UI 中展示）
    const hiddenSegments: string[] = [];
    if (selectedSkillTag?.prompt) {
      hiddenSegments.push(
        `【快捷标签：${selectedSkillTag.name}】\n${selectedSkillTag.prompt}`
      );
    }
    if (hasWorkflowContext && workflowContext?.promptText) {
      hiddenSegments.push(
        `【工作流设定】\n${workflowContext.promptText}\n\n请严格遵循以上工作流设定输出内容，并保持整体结果一致。`
      );
    }
    if (
      effectiveComposerMode === "agent" &&
      effectiveAgentEntryMode === "preset" &&
      selectedAgentPreset?.type === "text" &&
      selectedAgentPreset.slots?.length
    ) {
      const presetPrompt = selectedAgentPreset.slots
        .map((slot, index) => {
          const title = String(slot.title || slot.uploadLabel || `模板${index + 1}`).trim();
          const promptText = String(slot.promptTemplate || "").trim();
          if (!promptText) return "";
          return `【Agent：${selectedAgentPreset.name}｜${title}】\n${promptText}`;
        })
        .filter(Boolean)
        .join("\n\n");
      if (presetPrompt) {
        hiddenSegments.push(presetPrompt);
      }
    }
    if (pickedObjectInfos.length > 0) {
      const objectsPrompt = pickedObjectInfos.join('\n');
      hiddenSegments.push(
        `【用户指定的物品】\n${objectsPrompt}\n\n请精准地只处理上述指定的物品区域，保持其他部分不变。`
      );
      console.log('[CanvasChat] 检测到拾取物品，已生成隐藏提示:', pickedObjectInfos.length, '个');
    }
    if (hasAnnotatedImages) {
      hiddenSegments.push("【注意：图片中有标注（箭头、圆圈、文字等）标记的区域是需要重点关注或修改的部分，请根据标注进行处理】");
      console.log('[CanvasChat] 检测到标注图片，已生成隐藏提示');
    }
    if (isDetailGenerationMode && canUseDetailGeneration) {
      hiddenSegments.push(
        [
          "【AI详情生成模式】",
          "你正在处理电商详情页任务，请先规划分镜结构，再执行生图。",
          "要求：保持同一产品外观一致、风格一致、文案排版一致，按详情页叙事顺序输出结果。",
        ].join("\n")
      );
    }
    const hiddenPrompt = hiddenSegments.join('\n\n').trim();
    hiddenPromptRef.current =
      clampChatRequestText(hiddenPrompt, MAX_CHAT_HIDDEN_PROMPT_LENGTH) || null;

    const autoContext = buildAutoContext();
    autoContextRef.current =
      clampChatRequestText(autoContext, MAX_CHAT_AUTO_CONTEXT_LENGTH) || null;
    contextPayloadRef.current = buildContextPayload() || null;

    if (textContent) {
      parts.push({ type: "text" as const, text: textContent });
    }

    // 若 ref 为空才回填，避免覆盖“刚切换但状态尚未刷新的新模型值”
    if (!currentModelIdRef.current) {
      currentModelIdRef.current = effectiveModelId;
    }

    const normalizedAttachmentKeys = effectiveAttachments
      .map((attachment) => normalizeMediaUrl(attachment.url))
      .filter(Boolean)
      .sort();
    const sendSignature = JSON.stringify({
      chatId: activeChatId,
      model: effectiveModelId,
      text: textContent,
      attachments: normalizedAttachmentKeys,
      skillTagId: selectedSkillTag?.id || null,
      mode: effectiveComposerMode,
    });

    if (shouldBlockDuplicateSend(activeChatId, sendSignature)) {
      toast.message("检测到重复发送，已自动忽略");
      return;
    }

    setSendGuard(activeChatId, {
      inFlight: true,
      signature: sendSignature,
      timestamp: Date.now(),
    });
    inFlightChatIdRef.current = activeChatId;
    inFlightRawChatIdRef.current = rawChatId;
    clearStreamImageGenerationStateForChat(activeChatId);
    clearAgentProgressStateForChat(activeChatId);

    const optimisticUserMessageId = generateUUID();
    inFlightUserMessageIdRef.current = optimisticUserMessageId;
    pendingPersistenceMessageIdsRef.current.add(optimisticUserMessageId);
    const optimisticCreatedAt = new Date();
    const optimisticUserMessage = {
      id: optimisticUserMessageId,
      role: "user",
      parts,
      attachments: effectiveAttachments,
      createdAt: optimisticCreatedAt,
      metadata: {
        createdAt: optimisticCreatedAt.toISOString(),
        composerMode: effectiveComposerMode,
        modelId: effectiveModelId,
      },
    } as ChatMessage;

    // sendMessage 会负责把用户消息加入 useChat 状态；这里不要再手动 setMessages，
    // 否则同一条用户消息会在画布对话里显示两次。
    void sendMessage(optimisticUserMessage as any).catch((error) => {
      setMessages((previousMessages) =>
        previousMessages.filter((message) => message.id !== optimisticUserMessageId)
      );
      pendingPersistenceMessageIdsRef.current.delete(optimisticUserMessageId);
      releaseSendGuard(activeChatId);
      if (inFlightChatIdRef.current === activeChatId) {
        inFlightChatIdRef.current = null;
        inFlightRawChatIdRef.current = null;
        inFlightUserMessageIdRef.current = null;
      }
      contextPayloadRef.current = null;
      console.error("[CanvasChat] sendMessage failed:", error);
      toast.error("发送失败，请重试");
    });
    hasHydratedHistoryRef.current = true;

    // 清空状态
    setInput("");
    setAttachments([]);

    // 🆕 清空画布选中状态（防止 useEffect 重新添加标签）
    clearSelection();

    // 🆕 清空 contenteditable div 的内容
    const editableDiv = textareaRef.current as HTMLDivElement | null;
    if (editableDiv) {
      editableDiv.innerHTML = '';
      console.log('[CanvasChat] 已清空输入框和选中状态');
    }
  }, [
    activeChatId,
    activeComposerMode,
    agentEntryMode,
    agentRequiredUploadCount,
    rawChatId,
    input,
    attachments,
    hasAgentUploadSlots,
    hasWorkflowContext,
    selectedSkillTag,
    selectedAgentPreset,
    selectedModelId,
    sendMessage,
    clearSelection,
    buildAutoContext,
    buildContextPayload,
    isVideoModel,
    videoParams,
    videoFrameSlots.length,
    currentModel?.providerType,
    currentModel?.modelId,
    currentModel?.imageGenConfig,
    selectedImageNodes,
    isDetailGenerationMode,
    canUseDetailGeneration,
    handleDetailGeneration,
    ensureImagePointsBeforeSend,
    getSendGuard,
    clearStreamImageGenerationStateForChat,
    clearAgentProgressStateForChat,
    computedComposerMode,
    releaseSendGuard,
    setSendGuard,
    setMessages,
    shouldBlockDuplicateSend,
    status,
    workflowContext,
  ]);

  const maybeAutoSetCanvasTitle = useCallback(async (firstImageUrl: string | null) => {
    if (!firstImageUrl || hasSetCanvasTitle.current) {
      return;
    }

    hasSetCanvasTitle.current = true;
    console.log('[CanvasChat] 开始调用 auto-title API...');

    try {
      console.log('[CanvasChat] 发送 auto-title 请求:', firstImageUrl);
      const response = await apiFetch('/api/canvas/auto-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: firstImageUrl }),
      });

      console.log('[CanvasChat] auto-title 响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        const title = data.title || '未命名画布';
        console.log('[CanvasChat] 识别到的标题:', title);

        const rawId = chatId.startsWith('canvas-')
          ? chatId.replace('canvas-', '')
          : chatId;

        console.log('[CanvasChat] 更新画布:', rawId);

        const updateResponse = await apiFetch(`/api/canvas/${rawId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            thumbnail: firstImageUrl,
          }),
        });

        console.log('[CanvasChat] 画布更新响应:', updateResponse.status);
      } else {
        console.error('[CanvasChat] auto-title API 请求失败:', response.status);
      }
    } catch (error) {
      console.error('[CanvasChat] 自动命名失败:', error);
    }
  }, [chatId]);

  const addUploadedImageAttachmentToComposer = useCallback(
    (uploaded: ComposerUploadedImage) => {
      setAttachments((current) => {
        if (current.some((attachment) => attachment.url === uploaded.imageUrl)) {
          return current;
        }

        const newIndex = current.length;
        setTimeout(() => {
          insertImageTagInEditor(uploaded.imageUrl, uploaded.name, newIndex);
          (textareaRef.current as HTMLDivElement | null)?.focus();
        }, 0);

        return [
          ...current,
          {
            url: uploaded.imageUrl,
            name: uploaded.name,
            contentType: uploaded.contentType,
            assetId: uploaded.assetId,
            width: uploaded.width,
            height: uploaded.height,
          },
        ];
      });
    },
    [insertImageTagInEditor]
  );

  const updateUploadedImageAttachmentDimensions = useCallback(
    (
      imageUrl: string,
      dimensions: {
        width?: number;
        height?: number;
        originalWidth?: number;
        originalHeight?: number;
      }
    ) => {
      setAttachments((current) =>
        current.map((attachment) =>
          attachment.url === imageUrl
            ? {
                ...attachment,
                width:
                  dimensions.originalWidth || dimensions.width || attachment.width,
                height:
                  dimensions.originalHeight || dimensions.height || attachment.height,
              }
            : attachment
        )
      );
    },
    []
  );

  const uploadImageFileAndAddToCanvas = useCallback(async (
    file: File,
    nodeIndex: number,
    onUploaded?: (uploaded: ComposerUploadedImage) => void
  ): Promise<ComposerUploadedImage | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return null;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('图片大小不能超过 50MB');
      return null;
    }

    const ext = file.type.split('/')[1] || 'png';
    const fileName = (file.name || '').trim() || `粘贴图片-${Date.now()}-${nodeIndex + 1}.${ext}`;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'canvas-upload');

      const response = await fetchUploadWithRetry(formData);

      if (!response.ok) {
        throw await createUploadErrorFromResponse(response, "图片上传失败");
      }

      const data = await response.json();
      const imageUrl = data.url as string;
      const assetId =
        typeof data.assetId === "string" && data.assetId.trim() ? data.assetId.trim() : undefined;
      const uploadedBase: ComposerUploadedImage = {
        imageUrl,
        name: fileName,
        contentType: file.type || 'image/jpeg',
        assetId,
      };
      onUploaded?.(uploadedBase);
      const dimensions = await getImageDimensions(imageUrl);
      const spacing = 20;
      const x = 100 + (nodeIndex % 3) * (dimensions.width + spacing);
      const y = 100 + Math.floor(nodeIndex / 3) * (dimensions.height + spacing);

      addNode({
        type: 'image',
        position: { x, y },
        size: { width: dimensions.width, height: dimensions.height },
        data: {
          src: imageUrl,
          assetId,
          status: 'completed',
          title: fileName.replace(/\.[^.]+$/, ""),
          prompt: fileName.replace(/\.[^.]+$/, ""),
          metadata: {
            originalWidth: dimensions.originalWidth,
            originalHeight: dimensions.originalHeight,
          },
        },
        connections: [],
      });

      return {
        ...uploadedBase,
        width: dimensions.originalWidth || dimensions.width,
        height: dimensions.originalHeight || dimensions.height,
      };
    } catch (error) {
      const message = getUploadErrorMessage(error, "图片上传失败");
      if (message) toast.error(message);
      return null;
    }
  }, [addNode]);

  const handlePastedImages = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    let firstImageUrl: string | null = null;
    const baseNodeCount = nodes.length;
    let uploadIndex = 0;

    if (hasAgentUploadSlots) {
      const slotCount = agentUploadSlots.length;
      const currentSlots = Array.from({ length: slotCount }, (_, index) => attachments[index] ?? null);
      let handledCount = 0;

      for (const file of files) {
        const targetSlotIndex = currentSlots.findIndex((slot) => !slot);
        if (targetSlotIndex < 0) break;

        const uploaded = await uploadImageFileAndAddToCanvas(file, baseNodeCount + uploadIndex);
        if (!uploaded) continue;

        const attachment: PickedObjectAttachment = {
          url: uploaded.imageUrl,
          name: uploaded.name,
          contentType: uploaded.contentType,
          assetId: uploaded.assetId,
          width: uploaded.width,
          height: uploaded.height,
        };
        updateAttachmentAtAgentSlot(targetSlotIndex, attachment);
        currentSlots[targetSlotIndex] = attachment;
        handledCount += 1;
        uploadIndex += 1;
        if (!firstImageUrl) {
          firstImageUrl = uploaded.imageUrl;
        }
      }

      if (handledCount > 0) {
        toast.success(
          handledCount === 1
            ? "已粘贴图片到 Agent 槽位"
            : `已粘贴 ${handledCount} 张图片到 Agent 槽位`
        );
      }
      if (handledCount < files.length) {
        toast.info("Agent 图片槽位已满，剩余图片未添加");
      }
      void maybeAutoSetCanvasTitle(firstImageUrl);
      return;
    }

    if (isVideoModel && videoFrameSlots.length > 0) {
      const slotCount = videoFrameSlots.length;
      const currentSlots = Array.from({ length: slotCount }, (_, index) => attachments[index] ?? null);
      let handledCount = 0;

      for (const file of files) {
        const targetSlotIndex = currentSlots.findIndex((slot) => !slot);
        if (targetSlotIndex < 0) break;

        const uploaded = await uploadImageFileAndAddToCanvas(file, baseNodeCount + uploadIndex);
        if (!uploaded) continue;

        const attachment: PickedObjectAttachment = {
          url: uploaded.imageUrl,
          name: uploaded.name,
          contentType: uploaded.contentType,
          width: uploaded.width,
          height: uploaded.height,
        };
        updateAttachmentAtVideoSlot(targetSlotIndex, attachment);
        currentSlots[targetSlotIndex] = attachment;
        handledCount += 1;
        uploadIndex += 1;
        if (!firstImageUrl) {
          firstImageUrl = uploaded.imageUrl;
        }
      }

      if (handledCount > 0) {
        toast.success(handledCount === 1 ? "已粘贴图片到视频槽位" : `已粘贴 ${handledCount} 张图片到视频槽位`);
      }
      if (handledCount < files.length) {
        toast.info("视频模式图片槽位已满，剩余图片未添加");
      }
      void maybeAutoSetCanvasTitle(firstImageUrl);
      return;
    }

    let handledCount = 0;
    for (const file of files) {
      let addedToComposer = false;
      const uploaded = await uploadImageFileAndAddToCanvas(
        file,
        baseNodeCount + uploadIndex,
        (instantUploaded) => {
          addedToComposer = true;
          addUploadedImageAttachmentToComposer(instantUploaded);
        }
      );
      if (!uploaded) continue;

      handledCount += 1;
      uploadIndex += 1;
      if (!firstImageUrl) {
        firstImageUrl = uploaded.imageUrl;
      }

      if (!addedToComposer) {
        addUploadedImageAttachmentToComposer(uploaded);
      }
      updateUploadedImageAttachmentDimensions(uploaded.imageUrl, uploaded);
    }

    if (handledCount > 0) {
      toast.success(handledCount === 1 ? "图片已添加到画布" : `已粘贴并添加 ${handledCount} 张图片`);
    }

    void maybeAutoSetCanvasTitle(firstImageUrl);
  }, [
    addUploadedImageAttachmentToComposer,
    agentUploadSlots.length,
    attachments,
    hasAgentUploadSlots,
    isVideoModel,
    maybeAutoSetCanvasTitle,
    nodes.length,
    updateAttachmentAtAgentSlot,
    updateAttachmentAtVideoSlot,
    updateUploadedImageAttachmentDimensions,
    uploadImageFileAndAddToCanvas,
    videoFrameSlots.length,
  ]);

  const handleCopiedUserMessagePaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      const clipboardText = event.clipboardData.getData("text/plain");
      const copiedPayload = copiedUserMessageRef.current;
      const isRecentCopiedUserMessage =
        copiedPayload &&
        Date.now() - copiedPayload.createdAt <= COPIED_USER_MESSAGE_TTL_MS;
      const matchesCopiedUserMessage =
        Boolean(isRecentCopiedUserMessage) &&
        copiedPayload!.attachments.length > 0 &&
        copiedPayload!.text.trim() === clipboardText.trim();

      if (!matchesCopiedUserMessage || !copiedPayload) {
        return false;
      }

      event.preventDefault();
      if (copiedPayload.text.trim()) {
        document.execCommand("insertText", false, copiedPayload.text);
      }

      const editableDiv = textareaRef.current as HTMLDivElement | null;
      if (editableDiv) {
        setInput(getComposerPlainTextFromElement(editableDiv));
      }

      const inserted = addCopiedAttachmentsToComposer(copiedPayload.attachments);
      if (inserted > 0) {
        toast.success(
          inserted === 1 ? "已粘贴文字和图片" : `已粘贴文字和 ${inserted} 张图片`
        );
      } else {
        toast.info("这条消息的图片已在输入框中，未重复添加");
      }
      return true;
    },
    [addCopiedAttachmentsToComposer]
  );

  // 处理文件选择 - 上传后立即添加到画布
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    let firstImageUrl: string | null = null;
    // 记录本次上传开始时的节点数量，用于计算新图片位置
    const baseNodeCount = nodes.length;
    let uploadIndex = 0;

    if (hasAgentUploadSlots) {
      const slotCount = agentUploadSlots.length;
      const currentSlots = Array.from({ length: slotCount }, (_, index) => attachments[index] ?? null);
      let handledCount = 0;

      for (const file of Array.from(files)) {
        const targetSlotIndex = currentSlots.findIndex((slot) => !slot);
        if (targetSlotIndex < 0) break;

        const uploaded = await uploadImageFileAndAddToCanvas(file, baseNodeCount + uploadIndex);
        if (!uploaded) continue;

        updateAttachmentAtAgentSlot(targetSlotIndex, {
          url: uploaded.imageUrl,
          name: uploaded.name,
          contentType: uploaded.contentType,
          assetId: uploaded.assetId,
          width: uploaded.width,
          height: uploaded.height,
        });

        currentSlots[targetSlotIndex] = {
          url: uploaded.imageUrl,
          name: uploaded.name,
          contentType: uploaded.contentType,
          assetId: uploaded.assetId,
          width: uploaded.width,
          height: uploaded.height,
        };
        handledCount += 1;
        uploadIndex += 1;
        if (!firstImageUrl) {
          firstImageUrl = uploaded.imageUrl;
        }
      }

      if (handledCount > 0) {
        toast.success(
          handledCount === 1
            ? "图片已添加到 Agent 槽位"
            : `已添加 ${handledCount} 张图片到 Agent 槽位`
        );
      }
      if (handledCount < files.length) {
        toast.info("Agent 需要的图片槽位已满，剩余图片未添加");
      }

      void maybeAutoSetCanvasTitle(firstImageUrl);
      e.target.value = '';
      return;
    }

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error('图片大小不能超过 50MB');
        continue;
      }

      // 上传文件
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'canvas-upload');

        const response = await fetchUploadWithRetry(formData);

        if (!response.ok) {
          throw await createUploadErrorFromResponse(response, "图片上传失败");
        }

        const data = await response.json();
        const imageUrl = data.url;
        const assetId =
          typeof data.assetId === "string" && data.assetId.trim() ? data.assetId.trim() : undefined;
        const uploadedAttachment: ComposerUploadedImage = {
          imageUrl,
          name: file.name,
          contentType: file.type || 'image/jpeg',
          assetId,
        };
        addUploadedImageAttachmentToComposer(uploadedAttachment);

        // 记录第一张图片的 URL（用于自动命名和缩略图）
        if (!firstImageUrl) {
          firstImageUrl = imageUrl;
        }

        // 获取图片原始尺寸后添加到画布
        const dimensions = await getImageDimensions(imageUrl);
        updateUploadedImageAttachmentDimensions(imageUrl, dimensions);
        // 使用 baseNodeCount + uploadIndex 计算位置，确保多张图片不重叠
        const nodeIndex = baseNodeCount + uploadIndex;
        const spacing = 20;
        const x = 100 + (nodeIndex % 3) * (dimensions.width + spacing);
        const y = 100 + Math.floor(nodeIndex / 3) * (dimensions.height + spacing);
        uploadIndex++; // 递增索引

        addNode({
          type: 'image',
          position: { x, y },
          size: { width: dimensions.width, height: dimensions.height },
          data: {
            src: imageUrl,
            assetId,
            status: 'completed',
            title: file.name.replace(/\.[^.]+$/, ""),
            prompt: file.name.replace(/\.[^.]+$/, ""),
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
            },
          },
          connections: [],
        });

        toast.success('图片已添加到画布');

      } catch (error) {
        const message = getUploadErrorMessage(error, "图片上传失败");
        if (message) toast.error(message);
      }
    }

    console.log('[CanvasChat] 检查是否需要自动命名:', {
      firstImageUrl: !!firstImageUrl,
      hasSetCanvasTitle: hasSetCanvasTitle.current
    });
    void maybeAutoSetCanvasTitle(firstImageUrl);

    e.target.value = '';
  };

  // 移除附件（通过标签元素删除，支持同图多物品）
  const removeAttachmentByTagElement = (tagEl: HTMLElement) => {
    const url = tagEl.getAttribute('data-attachment-url') || '';
    const isPicked = tagEl.getAttribute('data-picked-object') === 'true';
    const objectName = tagEl.getAttribute('data-object-name') || '';
    const objectPosition = tagEl.getAttribute('data-object-position') || '';
    setAttachments(prev => prev.filter(a => {
      if (!url) return true;
      if (isPicked) {
        return !(
          a.url === url &&
          a.pickedObject?.objectName === objectName &&
          a.pickedObject?.objectPosition === objectPosition
        );
      }
      return a.url !== url;
    }));
    if (url) {
      console.log('[CanvasChat] 已移除附件:', url.substring(0, 50));
    }
  };

  // 从编辑器 DOM 同步附件列表，避免删除标签后仍发送
  const syncAttachmentsWithEditor = useCallback((editableDiv?: HTMLDivElement | null) => {
    const container = editableDiv || (textareaRef.current as HTMLDivElement | null);
    if (!container) return;
    const tagElements = Array.from(container.querySelectorAll('[data-attachment-url]')) as HTMLElement[];
    const tagKeys = new Set<string>();
    tagElements.forEach((el) => {
      const url = el.getAttribute('data-attachment-url') || '';
      if (!url) return;
      const isPicked = el.getAttribute('data-picked-object') === 'true';
      if (isPicked) {
        const objectName = el.getAttribute('data-object-name') || '';
        const objectPosition = el.getAttribute('data-object-position') || '';
        tagKeys.add(`picked|${url}|${objectName}|${objectPosition}`);
      } else {
        tagKeys.add(`image|${url}`);
      }
    });
    setAttachments(prev => prev.filter((att) => {
      if (att.pickedObject) {
        const key = `picked|${att.url}|${att.pickedObject.objectName}|${att.pickedObject.objectPosition}`;
        return tagKeys.has(key);
      }
      return tagKeys.has(`image|${att.url}`);
    }));
  }, []);

  useEffect(() => {
    if (isDetailGenerationMode && !detailModeSwitchRef.current) {
      setDetailModeMessageStartIndex(messages.length);
    }
    detailModeSwitchRef.current = isDetailGenerationMode;
  }, [isDetailGenerationMode, messages.length]);

  const visibleMessages = useMemo(
    () => {
      const scopedMessages = isDetailGenerationMode
        ? messages.slice(detailModeMessageStartIndex)
        : messages;
      return sortCanvasMessagesByCreatedAt(scopedMessages);
    },
    [detailModeMessageStartIndex, isDetailGenerationMode, messages]
  );

  const isLoading = status === 'streaming' || status === 'submitted';
  const isSubmitting = isLoading || isDetailGenerating;
  const hasInputOrAttachments = Boolean(
    input.trim() || attachments.length > 0 || (!isDetailGenerationMode && selectedSkillTag)
  );
  const hasEnoughAgentUploads = !hasAgentUploadSlots || attachments.length >= agentRequiredUploadCount;
  const composerPlaceholder = isWorkspacePresentation
    ? isDetailGenerationMode
      ? "可选补充：风格、情绪氛围、禁用元素、期望生成张数（如：生成8张）"
      : isVideoWorkspace
        ? "描述镜头、主体和运动方式，也可以先切到首帧或首尾帧模式"
      : activeComposerMode === "agent" && !isPresetAgentSelection
        ? ""
      : hasAgentUploadSlots
        ? "可选补充本次生图要求，例如：高级感、暖灰色、近景特写、生成3张。"
        : "可选补充本次生成要求，例如：更高级、更生活化、暖调灯光。"
    : isDetailGenerationMode
      ? "可选补充：风格、情绪氛围、禁用元素、期望生成张数（如：生成8张）"
      : isVideoWorkspace
        ? isVideoModel && videoFrameSlots.length > 0
          ? `描述镜头、主体和运动方式；可从画布填充${videoFrameSlots.join(" / ")}`
          : "描述视频镜头、主体、运动方式与时长，也可以切换到首帧或首尾帧模式"
      : activeComposerMode === "agent" && !isPresetAgentSelection
        ? ""
      : activeComposerMode === "agent" && selectedAgentPreset?.type === "text"
        ? "可上传图片做分析，也可直接输入文案需求"
      : hasAgentUploadSlots
        ? "请先上传产品图1、产品图2、模特图，再补充说明"
      : selectedSkillTag?.placeholder?.trim() ||
        (selectedSkillTag
          ? `请输入「${selectedSkillTag.name}」相关需求`
          : "请输入你的设计需求");
  const detailProductCount = DETAIL_PRODUCT_SLOT_INDEXES.filter((index) => Boolean(detailSlots[index]?.url)).length;
  const detailModelReady = DETAIL_MODEL_SLOT_INDEX >= 0 ? Boolean(detailSlots[DETAIL_MODEL_SLOT_INDEX]?.url) : false;
  const detailBundleCount = DETAIL_BUNDLE_SLOT_INDEXES.filter((index) => Boolean(detailSlots[index]?.url)).length;
  const detailProgressPercent =
    detailProgress.total > 0
      ? Math.min(100, Math.round((detailProgress.current / detailProgress.total) * 100))
      : 0;
  const canSend = isDetailGenerationMode
    ? detailValidationIssues.length === 0 && !isDetailGenerating
    : hasInputOrAttachments &&
      hasEnoughAgentUploads;
  const currentVideoImageLimit = isVideoModel
    ? getVideoImageLimit(videoParams, currentModel?.providerType, currentModel?.videoToolCapability)
    : null;
  const showVideoAttachmentButton = Boolean(
    isVideoModel &&
      currentVideoImageLimit &&
      currentVideoImageLimit.max > 0 &&
      videoFrameSlots.length === 0
  );
  const lastUserIndexForMarkers = visibleMessages.findLastIndex(m => m.role === "user");
  const messagesAfterLastUser = lastUserIndexForMarkers >= 0 ? visibleMessages.slice(lastUserIndexForMarkers + 1) : visibleMessages;
  const hasGenerationStart = messagesAfterLastUser.some(msg =>
    msg.role === "assistant" && msg.parts?.some(
      (part: any) => part.type === "text" && part.text?.includes("<!-- IMAGE_GENERATION_START -->")
    )
  );
  const hasGenerationEnd = messagesAfterLastUser.some(msg =>
    msg.role === "assistant" && msg.parts?.some(
      (part: any) => part.type === "text" && part.text?.includes("<!-- IMAGE_GENERATION_END -->")
    )
  );
  const shouldShowImageLoading =
    Boolean(streamImageGenerationState) ||
    (hasGenerationStart &&
      !hasGenerationEnd &&
      Boolean(currentModel || activeComposerMode === "agent"));
  const hasActiveTypewriter = Object.keys(activeTypingSections).length > 0;
  const shouldRenderImageLoading =
    shouldShowImageLoading && (Boolean(streamImageGenerationState) || !hasActiveTypewriter);
  const inferredLoadingImageCount = useMemo(
    () =>
      inferCanvasImageGenerationCountFromText(
        getLatestCanvasUserPrompt(visibleMessages),
        messagesAfterLastUser
          .map((message) =>
            (message.parts || [])
              .filter((part: any) => part?.type === "text" && typeof part.text === "string")
              .map((part: any) => String(part.text))
              .join("\n")
          )
          .join("\n")
      ),
    [messagesAfterLastUser, visibleMessages]
  );
  const loadingImageCount =
    streamImageGenerationState?.imageCount ||
    inferredLoadingImageCount ||
    imageParams.imageCount ||
    1;
  const loadingProviderType =
    streamImageGenerationState?.providerType ||
    (activeComposerMode === "agent" ? "alibaba-image" : currentModel?.providerType);
  const loadingModelName =
    streamImageGenerationState?.modelName ||
    (activeComposerMode === "agent"
      ? "智能处理"
      : currentModel?.displayName || undefined);
  const loadingPhase =
    streamImageGenerationState?.phase === "queued" ||
    streamImageGenerationState?.phase === "processing" ||
    streamImageGenerationState?.phase === "finalizing" ||
    streamImageGenerationState?.phase === "failed"
      ? streamImageGenerationState.phase
      : "processing";
  const loadingQueuePosition = streamImageGenerationState?.queuePosition;
  const loadingSameModelRunningCount =
    streamImageGenerationState?.sameModelRunningCount;
  const loadingConcurrencyLimit = streamImageGenerationState?.concurrencyLimit;
  const loadingEstimatedWaitMs = streamImageGenerationState?.estimatedWaitMs;
  useEffect(() => {
    const streamState = streamImageGenerationStateByChatId[activeChatId] || null;
    const placeholderIds = canvasGenerationPlaceholderByChatIdRef.current[activeChatId] || [];

    if (!streamState) {
      removeCanvasGenerationPlaceholders(activeChatId);
      return;
    }

    const phase = streamState.phase || "processing";
    const label =
      phase === "queued"
        ? "等待开始生成"
        : phase === "finalizing"
          ? "正在润饰细节"
          : phase === "failed"
            ? "生成失败"
            : "正在创建图片";
    const status = phase === "failed" ? "failed" : "generating";
    const currentNodes = useCanvasStore.getState().nodes;
    const existingPlaceholderIds = new Set(placeholderIds);
    const existingPlaceholderNodes = currentNodes
      .filter((node) => existingPlaceholderIds.has(node.id))
      .sort((left, right) => {
        const leftMetadata = ((left.data as any)?.metadata || {}) as Record<string, unknown>;
        const rightMetadata = ((right.data as any)?.metadata || {}) as Record<string, unknown>;
        return Number(leftMetadata.placeholderIndex || 0) - Number(rightMetadata.placeholderIndex || 0);
      });
    const anchorNode = findCanvasImageAnchorNode(currentNodes, {
      selectedNodes:
        generationAnchorNodesRef.current.length > 0
          ? generationAnchorNodesRef.current
          : selectedImageNodesRef.current,
    });
    const imageParamSnapshot = imageParamsRef.current || imageParams;
    const aspectRatio =
      imageParamSnapshot.aspectRatio && imageParamSnapshot.aspectRatio !== "auto"
        ? imageParamSnapshot.aspectRatio
        : "1:1";
    const [ratioWidthRaw, ratioHeightRaw] = aspectRatio.split(":").map((item) => Number(item));
    const ratioWidth = Number.isFinite(ratioWidthRaw) && ratioWidthRaw > 0 ? ratioWidthRaw : 1;
    const ratioHeight = Number.isFinite(ratioHeightRaw) && ratioHeightRaw > 0 ? ratioHeightRaw : 1;
    const requestedPlaceholderCount = Math.max(
      1,
      Math.min(
        12,
        Math.round(Number(streamState.imageCount || imageParamSnapshot.imageCount || 1))
      )
    );
    const isMultiPlaceholder = requestedPlaceholderCount > 1;
    const baseSide = isMultiPlaceholder ? 220 : 340;
    const ratioPlaceholderSize =
      ratioWidth >= ratioHeight
        ? {
            width: baseSide,
            height: Math.max(190, Math.round((baseSide * ratioHeight) / ratioWidth)),
          }
        : {
            width: Math.max(190, Math.round((baseSide * ratioWidth) / ratioHeight)),
            height: baseSide,
          };
    const placeholderSize = anchorNode
      ? {
          width: isMultiPlaceholder
            ? Math.max(
                170,
                Math.min(
                  240,
                  Math.round(Number(anchorNode.size?.width || ratioPlaceholderSize.width))
                )
              )
            : Math.max(
                180,
                Math.round(Number(anchorNode.size?.width || ratioPlaceholderSize.width))
              ),
          height: isMultiPlaceholder
            ? Math.max(
                170,
                Math.min(
                  240,
                  Math.round(Number(anchorNode.size?.height || ratioPlaceholderSize.height))
                )
              )
            : Math.max(
                180,
                Math.round(Number(anchorNode.size?.height || ratioPlaceholderSize.height))
              ),
        }
      : ratioPlaceholderSize;
    const placeholderGridColumns =
      requestedPlaceholderCount <= 1
        ? 1
        : requestedPlaceholderCount <= 4
          ? 2
          : 3;
    const placeholderGap = isMultiPlaceholder ? 28 : 0;
    const gridRows = Math.ceil(requestedPlaceholderCount / placeholderGridColumns);
    const groupSize = {
      width:
        placeholderSize.width * placeholderGridColumns +
        placeholderGap * Math.max(0, placeholderGridColumns - 1),
      height:
        placeholderSize.height * gridRows +
        placeholderGap * Math.max(0, gridRows - 1),
    };
    const position = getAnchoredGenerationPosition({
      anchorNode,
      existingNodes: currentNodes,
      excludeNodeIds: placeholderIds,
      fallbackNodeCount: currentNodes.length,
      size: groupSize,
      viewport: useCanvasStore.getState().viewport,
    });
    const baseMetadata = {
      canvasGenerationPlaceholder: true,
      chatId: activeChatId,
      detailProgressLabel: label,
      generationProgress:
        phase === "queued"
          ? 12
          : phase === "finalizing"
            ? 96
            : phase === "failed"
              ? 100
              : undefined,
      modelName: streamState.modelName || currentModel?.displayName || undefined,
      providerType: streamState.providerType || currentModel?.providerType || undefined,
      placementMode: "anchored-generation",
    };
    const nextPlaceholderIds: string[] = [];

    for (let index = 0; index < requestedPlaceholderCount; index += 1) {
      const row = Math.floor(index / placeholderGridColumns);
      const column = index % placeholderGridColumns;
      const nodePosition = {
        x: position.x + column * (placeholderSize.width + placeholderGap),
        y: position.y + row * (placeholderSize.height + placeholderGap),
      };
      const metadata = {
        ...baseMetadata,
        placeholderIndex: index,
        placeholderCount: requestedPlaceholderCount,
      };
      const existingNode = existingPlaceholderNodes[index];

      if (existingNode) {
        updateNode(existingNode.id, {
          data: {
            ...((existingNode.data as any) || {}),
            src: "",
            status,
            title: `${label}${requestedPlaceholderCount > 1 ? ` ${index + 1}/${requestedPlaceholderCount}` : ""}`,
            prompt: label,
            metadata: {
              ...(((existingNode.data as any)?.metadata || {}) as Record<string, unknown>),
              ...metadata,
            },
          },
          position: nodePosition,
          size: placeholderSize,
        });
        nextPlaceholderIds.push(existingNode.id);
        continue;
      }

      const nodeId = addNode({
        type: "image",
        position: nodePosition,
        size: placeholderSize,
        data: {
          src: "",
          status,
          title: `${label}${requestedPlaceholderCount > 1 ? ` ${index + 1}/${requestedPlaceholderCount}` : ""}`,
          prompt: label,
          metadata,
        },
        connections: anchorNode?.id ? [anchorNode.id] : [],
      });
      nextPlaceholderIds.push(nodeId);
    }

    existingPlaceholderNodes
      .slice(requestedPlaceholderCount)
      .forEach((node) => deleteNode(node.id));
    canvasGenerationPlaceholderByChatIdRef.current[activeChatId] = nextPlaceholderIds;
    selectNodes(nextPlaceholderIds);
    focusCanvasOnNode({ position, size: groupSize });
  }, [
    activeChatId,
    addNode,
    currentModel?.displayName,
    currentModel?.providerType,
    imageParams,
    focusCanvasOnNode,
    removeCanvasGenerationPlaceholders,
    selectNodes,
    streamImageGenerationStateByChatId,
    deleteNode,
    updateNode,
  ]);
  const renderableVisibleMessages = useMemo(() => {
    return visibleMessages.reduce<ChatMessage[]>((acc, message) => {
      const rawParts = (message.parts || []) as any[];
      const cleanedParts = rawParts.map((part: any) => {
        if (part.type === "text" && part.text) {
          return {
            ...part,
            text: String(part.text)
              .replace(/\n*<!-- GENERATING_IMAGE -->\n*/g, "")
              .replace(/\n*<!-- IMAGE_GENERATION_START -->\n*/g, "")
              .replace(/\n*<!-- IMAGE_GENERATION_END -->\n*/g, "")
              .trim(),
          };
        }
        return part;
      });

      const fallbackContent =
        typeof (message as any).content === "string"
          ? String((message as any).content).trim()
          : "";

      if (cleanedParts.length === 0 && fallbackContent) {
        cleanedParts.push({ type: "text", text: fallbackContent } as any);
      }

      if (
        message.role === "assistant" &&
        isInternalCanvasImageGenerationFailureText(cleanedParts)
      ) {
        return acc;
      }

      let hasContent = false;
      for (const part of cleanedParts) {
        if (part?.type === "text" && part?.text && String(part.text).trim().length > 0) {
          hasContent = true;
          break;
        }
        const fileUrl =
          typeof part?.url === "string" && part.url.trim()
            ? part.url
            : typeof part?.data === "string" && part.data.trim()
              ? part.data
              : "";
        if ((part?.type === "file" || part?.type === "image") && fileUrl) {
          hasContent = true;
          break;
        }
      }

      const attachmentsList = (message as any).attachments || [];
      if (!hasContent && attachmentsList.length > 0) {
        hasContent = true;
      }

      if (!hasContent) {
        return acc;
      }

      acc.push({ ...message, parts: cleanedParts } as ChatMessage);
      return acc;
    }, []);
  }, [visibleMessages]);

  const isDetailEmptyState =
    isDetailGenerationMode &&
    renderableVisibleMessages.length === 0 &&
    !isLoading &&
    !shouldShowImageLoading;
  const isPlainCanvasEmptyState =
    !isWorkspacePresentation &&
    !isDetailGenerationMode &&
    !isVideoWorkspace &&
    renderableVisibleMessages.length === 0 &&
    !isLoading &&
    !shouldShowImageLoading;
  const workspaceEmptyTitle =
    activeComposerMode === "agent" && !isPresetAgentSelection
    ? "开始 Auto Agent 对话"
    : hasAgentUploadSlots && attachments.length < agentRequiredUploadCount
      ? `请先补齐图片槽位（${attachments.length}/${agentRequiredUploadCount}）`
      : "准备开始生成";
  const workspaceEmptyDescription =
    activeComposerMode === "agent" && !isPresetAgentSelection
    ? hasSelectedAgentPreset
      ? ""
      : ""
    : hasAgentUploadSlots && attachments.length < agentRequiredUploadCount
      ? "从左侧 SKU / SPU 获取图片，或在下方继续上传替换后，再点击开始生成。"
      : "可在下方补充要求后点击开始生成，结果会显示在这里。";
  const shouldShowAgentTargetLockCard =
    false;
  const isAgentTargetClarificationActive =
    shouldShowAgentTargetLockCard && activeAgentTargetLock?.stage === "clarify";
  const shouldShowAgentProgressCard =
    activeComposerMode === "agent" && Boolean(activeAgentProgress);
  const agentTargetLockPreviewItems = useMemo(() => {
    if (!activeAgentTargetLock) return [] as AgentTargetLockRefPreview[];
    const targets = Array.isArray(activeAgentTargetLock.targets) ? activeAgentTargetLock.targets : [];
    const candidates = Array.isArray(activeAgentTargetLock.candidates)
      ? activeAgentTargetLock.candidates
      : [];
    if (targets.length > 0) return targets.slice(0, 4);
    return candidates.slice(0, 4);
  }, [activeAgentTargetLock]);
  const agentTargetLockTitle = getAgentTargetLockTitle(activeAgentTargetLock);
  const agentTargetResolutionLabel = getAgentTargetResolutionLabel(
    activeAgentTargetLock?.resolutionMode
  );
  const agentTargetLockPrimaryMessage =
    activeAgentTargetLock?.stage === "clarify"
      ? activeAgentTargetLock.clarificationMessage ||
        activeAgentTargetLock.reason ||
        "我需要先确认目标图或执行范围，避免误处理。"
      : activeAgentTargetLock?.reason ||
        activeAgentTargetLock?.clarificationMessage ||
        "系统正在根据当前上下文锁定目标图。";
  const agentTargetLockSecondaryMessage =
    activeAgentTargetLock?.stage === "clarify" &&
    activeAgentTargetLock.reason &&
    activeAgentTargetLock.clarificationMessage &&
    activeAgentTargetLock.reason !== activeAgentTargetLock.clarificationMessage
      ? activeAgentTargetLock.reason
      : "";
  const agentProgressTitle =
    activeAgentProgress?.title?.trim() || getAgentProgressFallbackTitle(activeAgentProgress);
  const agentProgressMessage =
    activeAgentProgress?.message?.trim() || "我正在根据当前上下文持续推进这一步。";
  const agentProgressSteps = useMemo(() => {
    const currentStepIndex = Math.max(
      0,
      AGENT_PROGRESS_STEPS.findIndex((step) => step.key === activeAgentProgress?.currentStep)
    );
    return AGENT_PROGRESS_STEPS.map((step, index) => {
      let state: "upcoming" | "current" | "completed" | "failed" = "upcoming";
      if (activeAgentProgress?.stage === "failed") {
        state = index < currentStepIndex ? "completed" : index === currentStepIndex ? "failed" : "upcoming";
      } else if (activeAgentProgress?.stage === "completed") {
        state = "completed";
      } else {
        state = index < currentStepIndex ? "completed" : index === currentStepIndex ? "current" : "upcoming";
      }
      return {
        ...step,
        state,
      };
    });
  }, [activeAgentProgress]);

  const renderModelSelectContent = () => (
    <SelectContent
      align="end"
      position="popper"
      sideOffset={6}
      className={cn(
        "w-[280px] max-w-[calc(100vw-24px)] max-h-[320px] overflow-hidden rounded-[12px] border border-[#d9dde4] bg-white p-0 text-[#252b33] shadow-[0_10px_28px_rgba(15,23,42,0.14)]",
        isVideoWorkspace
          ? "border border-border/60 bg-background/95 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          : "dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100"
      )}
    >
      <div className="max-h-[304px] space-y-0.5 overflow-y-auto p-1.5">
        {selectableModels.map((model) => {
          const discountLabel = getImageModelCreditDiscountLabel(
            model.imageGenConfig
          );

          return (
          <SelectItem
            key={model.id}
            value={model.id}
            disabled={model.selectable === false}
            className={cn(
              "h-8 rounded-[6px] px-2.5 text-[12px] font-normal [&>span:first-child]:hidden [&>span:last-child]:block [&>span:last-child]:w-full",
              isVideoWorkspace
                ? "text-foreground focus:bg-background focus:text-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground"
                : "text-[#2f3640] focus:bg-[#f4f5f6] focus:text-[#1f2937] data-[state=checked]:bg-transparent data-[state=checked]:text-[#1f2937] dark:text-zinc-100 dark:focus:bg-white/10 dark:focus:text-white dark:data-[state=checked]:text-white",
              model.selectable === false && "opacity-55"
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full leading-none",
                    isVideoWorkspace
                      ? "border border-border/60 bg-background"
                      : "border border-transparent bg-white dark:border-white/20 dark:bg-white"
                  )}
                >
                  {model.avatarUrl ? (
                    <img
                      src={buildPreviewImageUrl(model.avatarUrl, 40)}
                      alt={model.displayName}
                      className="block h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        if (event.currentTarget.src !== model.avatarUrl) {
                          event.currentTarget.src = model.avatarUrl || "";
                        }
                      }}
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-full w-full items-center justify-center text-[11px] font-medium leading-none",
                        isVideoWorkspace ? "text-muted-foreground" : "text-[#6b7280]"
                      )}
                    >
                      {model.id === "auto" ? "A" : model.displayName.slice(0, 1)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[12px] font-normal leading-4">
                  {model.displayName}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {discountLabel ? (
                  <span
                    className={cn(
                      "rounded-[7px] border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      isVideoWorkspace
                        ? "border-border/70 bg-muted/80 text-foreground/80"
                        : "border-[#d0d4dc] bg-[#eef1f5] text-[#5c6574] dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
                    )}
                  >
                    {discountLabel}
                  </span>
                ) : null}
                {model.availabilityLabel ? (
                  <span
                    className={cn(
                      "rounded-[7px] border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      model.availabilityStatus === "maintenance"
                        ? isVideoWorkspace
                          ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                        : isVideoWorkspace
                          ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                          : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200"
                    )}
                  >
                    {model.availabilityLabel}
                  </span>
                ) : null}
                {modelSelectValue === model.id ? (
                  <Check className={cn("h-4 w-4", isVideoWorkspace ? "text-foreground" : "text-[#1f2937]")} />
                ) : null}
              </span>
            </span>
          </SelectItem>
          );
        })}
        {selectableModels.length === 0 ? (
          <div
            className={cn(
              "flex h-9 items-center px-2 text-[12px]",
              isVideoWorkspace ? "text-muted-foreground" : "text-[#6b7280]"
            )}
          >
            暂无可用模型
          </div>
        ) : null}
      </div>
    </SelectContent>
  );

  const createNewChatSession = useCallback(() => {
    const now = Date.now();
    const newChatSessionId = `canvas-${crypto.randomUUID()}`;
    const fallbackTitle = `对话 ${chatSessions.length + 1}`;
    const newSession: CanvasChatSession = {
      id: newChatSessionId,
      title: fallbackTitle,
      createdAt: now,
      updatedAt: now,
    };

    releaseSendGuard(activeChatId);
    setChatSessions((prevSessions) => [newSession, ...prevSessions]);
    setActiveChatId(newChatSessionId);
    toast.success("已新建聊天窗口");
  }, [activeChatId, chatSessions.length, releaseSendGuard]);

  const switchToSession = useCallback((sessionId: string) => {
    if (!sessionId || sessionId === activeChatId) {
      setIsSessionMenuOpen(false);
      return;
    }
    forceHistoryHydrationRef.current = toRawCanvasChatId(sessionId);
    releaseSendGuard(activeChatId);
    setActiveChatId(sessionId);
    setIsSessionMenuOpen(false);
    toast.success("已切换聊天窗口");
  }, [activeChatId, releaseSendGuard]);

  const activeSessionTitle = useMemo(() => {
    const current = chatSessions.find((session) => session.id === activeChatId);
    return String(current?.title || "").trim();
  }, [chatSessions, activeChatId]);

  const displayCanvasName = useMemo(() => {
    if (activeSessionTitle) return activeSessionTitle;
    const fallbackTitle = String(projectTitle || "").trim();
    return fallbackTitle || "未命名画布";
  }, [activeSessionTitle, projectTitle]);

  const useJimengCanvasChrome = !isWorkspacePresentation && !isVideoWorkspace;
  const useJimengCanvasComposer =
    useJimengCanvasChrome &&
    !isDetailGenerationMode &&
    !hasAgentUploadSlots &&
    (!isVideoModel || videoFrameSlots.length === 0);
  const jimengComposerPlaceholder =
    "输入想法、剧本或上传参考，支持 “/” 使用技能， @ 添加主体，和 Agent 一起创作";

  const handleApplyJimengSkill = useCallback(
    (skillName: "灵感搜索" | "创意设计") => {
      const matchedTag = canvasSkillTags.find((tag) => {
        const name = String(tag.name || "").replace(/\s+/g, "");
        return name.includes(skillName) || skillName.includes(name);
      });
      if (matchedTag) {
        setSelectedSkillTagId(matchedTag.id);
        textareaRef.current?.focus();
        return;
      }
      toast.info(`${skillName}已切换到快捷入口，后续可接入专属技能配置`);
    },
    [canvasSkillTags]
  );

  const handleJimengComposerInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const clone = target.cloneNode(true) as HTMLDivElement;
      clone.querySelectorAll("[data-attachment-url]").forEach((element) => element.remove());
      const textContent = (clone.textContent || "")
        .replace(/\u200b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setInput(textContent);
      syncAttachmentsWithEditor(target);
    },
    [syncAttachmentsWithEditor]
  );

  const handleJimengComposerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
      if (event.key === "Backspace") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.collapsed && range.startOffset === 0) {
            const prevSibling = range.startContainer.previousSibling as HTMLElement;
            if (prevSibling && prevSibling.getAttribute?.("data-attachment-url")) {
              event.preventDefault();
              event.stopPropagation();
              removeAttachmentByTagElement(prevSibling);
              prevSibling.remove();
            }
          }
        }
      }
    },
    [handleSend, removeAttachmentByTagElement]
  );

  const handleJimengComposerPaste = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>) => {
      if (handleCopiedUserMessagePaste(event)) {
        return;
      }

      const clipboardItems = Array.from(event.clipboardData?.items || []);
      const imageFiles = clipboardItems
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (imageFiles.length > 0) {
        event.preventDefault();
        void handlePastedImages(imageFiles);
        return;
      }

      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    },
    [handleCopiedUserMessagePaste, handlePastedImages]
  );

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col",
        forceDarkPanelTone && "dark",
        isWorkspacePresentation
          ? "bg-transparent"
          : isVideoWorkspace
            ? "bg-transparent"
            : "bg-white dark:bg-zinc-950",
        forceLightPanelTone && "!bg-white !text-[#111827]"
      )}
      data-panel-tone={panelTone}
    >
      {/* 全局遮罩提示 - 当处于画布选图模式时显示 */}
      {detailSlotPickerIndex !== null && (
        <div
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 animate-in fade-in duration-200",
            forceLightPanelTone && "!bg-white"
          )}
        >
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5 animate-pulse">
              <ImagePlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">正在从画布选择图片</h3>
              <p className="text-sm text-muted-foreground">
                请点击画布中的任意图片以填入
                <span className="font-medium text-primary">
                  “{DETAIL_SLOT_CONFIGS[detailSlotPickerIndex]?.label || "素材槽位"}”
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailSlotPickerIndex(null)}
              className="mt-2"
            >
              取消选择
            </Button>
          </div>
        </div>
      )}
      {!isWorkspacePresentation ? (
        useJimengCanvasChrome ? (
          <div
            className={cn(
              "z-20 flex h-[52px] items-center justify-end gap-3 px-7",
              forceLightPanelTone && "!text-[#111827]",
              forceDarkPanelTone && "text-white"
            )}
          >
            <div className="relative flex shrink-0 items-center gap-3" ref={sessionMenuRef}>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[#111820] transition-colors hover:bg-[#f2f4f6] hover:text-[#05070a] dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:text-white"
                title="筛选对话"
                onClick={() => setIsSessionMenuOpen((open) => !open)}
              >
                <ListFilter className="h-[18px] w-[18px] stroke-[1.85]" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[#111820] transition-colors hover:bg-[#f2f4f6] hover:text-[#05070a] dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:text-white"
                title="新建对话"
                onClick={createNewChatSession}
              >
                <MessageCirclePlus className="h-[18px] w-[18px] stroke-[1.85]" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[#111820] transition-colors hover:bg-[#f2f4f6] hover:text-[#05070a] disabled:cursor-not-allowed disabled:opacity-45 dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:text-white"
                title={isExpanded ? "收缩对话框" : "展开对话框"}
                onClick={onToggleExpand}
                disabled={!onToggleExpand}
              >
                {isExpanded ? (
                  <Minimize2 className="h-[18px] w-[18px] stroke-[1.85]" />
                ) : (
                  <Expand className="h-[18px] w-[18px] stroke-[1.85]" />
                )}
              </button>
              {isSessionMenuOpen && (
                <div
                  className={cn(
                    "absolute right-0 top-11 z-30 w-64 rounded-2xl border border-[#e6e8ec] bg-white p-2 text-[#111827] shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:border-white/[0.10] dark:bg-[#121416] dark:text-white dark:shadow-[0_18px_52px_rgba(0,0,0,0.42)]"
                  )}
                >
                  <div className="px-2 py-1 text-xs text-[#8a96a3]">聊天窗口记录</div>
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {chatSessions.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-[#8a96a3]">暂无记录</div>
                    ) : (
                      chatSessions.map((session, index) => {
                        const isActive = session.id === activeChatId;
                        const timeLabel = new Date(session.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <button
                            key={session.id}
                            type="button"
                            className={cn(
                              "w-full rounded-xl px-3 py-2 text-left transition-colors",
                              isActive
                                ? "bg-[#f3f5f7] text-[#111827]"
                                : "text-[#536471] hover:bg-[#f7f8f9] hover:text-[#111827]"
                            )}
                            onClick={() => switchToSession(session.id)}
                          >
                            <div className="truncate text-sm font-medium">
                              {session.title || `对话 ${index + 1}`}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#8a96a3]">
                              最近更新 {timeLabel}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="z-20 flex items-center justify-between gap-3 p-4 pb-2">
            <div className="min-w-0 flex flex-1 items-center gap-2 pr-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border/60 bg-background/80 text-foreground/70">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-tight tracking-tight text-foreground" title={displayCanvasName}>
                {displayCanvasName}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 bg-background/72 hover:bg-background" onClick={createNewChatSession} title="新建聊天窗口">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 bg-background/72 hover:bg-background" onClick={() => setIsSessionMenuOpen((open) => !open)} title="聊天窗口记录">
                <History className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 bg-background/72 hover:bg-background" onClick={onOpenFileList} title="已生成文件列表">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border/60 bg-background/72 hover:bg-background" onClick={onClose} disabled={!onClose} title="收起聊天面板">
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      ) : null}

      {/* 消息列表 */}
      {isDetailEmptyState ? (
        <div className="flex-1 min-h-0" />
      ) : (
      <div
        key={`${activeChatId}-${messageViewportKey}`}
        className={cn(
          "flex-1 min-h-0 overflow-x-hidden",
          isPlainCanvasEmptyState ? "overflow-hidden" : "overflow-y-auto",
          isWorkspacePresentation ? "p-6" : isVideoWorkspace ? "p-4" : "px-5 py-4",
          isPlainCanvasEmptyState
            ? "pt-0"
            : isDetailGenerationMode && renderableVisibleMessages.length === 0
              ? "pt-10"
              : "pt-4"
        )}
      >
        <div className={cn(
          "space-y-6 overflow-x-hidden pr-1",
          isPlainCanvasEmptyState ? "h-full pb-0" : "pb-24"
        )}>
          {!isDetailGenerationMode && renderableVisibleMessages.length === 0 ? (
            useJimengCanvasChrome ? (
              <div className="flex h-full min-h-[360px] flex-col px-7 pt-8 pb-6">
                <div className="text-left">
                  <h1
                    className={cn(
                      "text-[22px] font-semibold leading-tight tracking-tight text-[#101820] dark:text-white",
                      forceLightPanelTone && "!text-[#101820]"
                    )}
                  >
                    Hi,{" "}
                    {greetingUserName ? (
                      <span className="text-brand-selection">{greetingUserName}</span>
                    ) : null}{" "}
                    {greetingPeriodText}
                  </h1>
                  <p
                    className={cn(
                      "mt-2 text-[13px] leading-5 text-[#7a8491] dark:text-white/48",
                      forceLightPanelTone && "!text-[#7a8491]"
                    )}
                  >
                    开始创作吧! 累计为你生成了{" "}
                    <span className="font-semibold text-brand-selection">
                      {Number.isFinite(totalGeneratedImages) ? totalGeneratedImages : 0}
                    </span>{" "}
                    张图。
                  </p>
                </div>

                {canvasSkillTags.length > 0 ? (
                  <div
                    className={cn(
                      "mt-7 rounded-[22px] border border-black/[0.08] bg-white/72 px-4 py-4 dark:border-white/[0.09] dark:bg-white/[0.035]",
                      forceLightPanelTone && "!border-black/[0.08] !bg-white/72"
                    )}
                  >
                    <h3
                      className={cn(
                        "text-[13px] font-semibold leading-none text-[#1f2328] dark:text-white/84",
                        forceLightPanelTone && "!text-[#1f2328]"
                      )}
                    >
                      预设快捷功能
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canvasSkillTags.slice(0, 4).map((tag) => {
                        const isActive = selectedSkillTag?.id === tag.id;
                        const TagIcon = getCanvasSkillIconComponent(tag.iconName);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              setSelectedSkillTagId(tag.id);
                              const editor = textareaRef.current as HTMLDivElement | null;
                              editor?.focus();
                            }}
                            className={cn(
                              "inline-flex h-8 max-w-full items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-medium leading-none transition-colors",
                              isActive
                                ? "border-[#d8dce4] bg-[#f7f8fa] text-[#1f2328] dark:border-brand-accent/40 dark:bg-brand-accent/14 dark:text-brand-accent"
                                : "border-[#e5e7eb] bg-white/82 text-[#1f2328] hover:border-[#d6dae3] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/72 dark:hover:border-white/20 dark:hover:bg-white/10",
                              forceLightPanelTone &&
                                (isActive
                                  ? "!border-brand-accent !bg-brand-accent !text-brand-accent-foreground"
                                  : "!border-[#e5e7eb] !bg-white/82 !text-[#1f2328] hover:!border-[#d6dae3] hover:!bg-white")
                            )}
                          >
                            {tag.iconUrl ? (
                              <img
                                src={buildPreviewImageUrl(tag.iconUrl, 40)}
                                alt={tag.name}
                                className="h-3.5 w-3.5 rounded-sm object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={(event) => {
                                  if (event.currentTarget.src !== tag.iconUrl) {
                                    event.currentTarget.src = tag.iconUrl || "";
                                  }
                                }}
                              />
                            ) : (
                              <TagIcon className="h-3.5 w-3.5 text-current opacity-70" />
                            )}
                            <span className="truncate">{tag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : isWorkspacePresentation ? (
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <div
                  className={cn(
                    "w-full max-w-3xl rounded-[28px] border border-dashed border-[#d7dce5] bg-white/78 p-10 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60",
                    forceLightPanelTone && "!border-[#d7dce5] !bg-white/78"
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f46e5] dark:bg-[#312e81]/40 dark:text-[#a5b4fc]",
                      forceLightPanelTone && "!bg-[#eef2ff] !text-[#4f46e5]"
                    )}
                  >
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-foreground">
                    {workspaceEmptyTitle}
                  </div>
                  {workspaceEmptyDescription ? (
                    <div className="mt-3 text-sm leading-6 text-muted-foreground">
                      {workspaceEmptyDescription}
                    </div>
                  ) : null}
                  {attachments.length > 0 ? (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {attachments.map((attachment, index) => (
                        <div
                          key={`${attachment.url}-${index}`}
                          className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900"
                        >
                          <img
                            src={buildPreviewImageUrl(attachment.url, 160)}
                            alt={attachment.name || `素材${index + 1}`}
                            className="h-20 w-20 object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.src !== attachment.url) {
                                event.currentTarget.src = attachment.url;
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex h-full flex-col",
                  isPlainCanvasEmptyState ? "min-h-0" : "min-h-[360px]",
                  isDetailGenerationMode ? "pt-0" : "pt-4"
                )}
              >
                {isVideoWorkspace ? (
                  <div className="mb-8 rounded-[30px] border border-border/60 bg-background/82 p-5 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-primary shadow-sm">
                        <Clapperboard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                          视频画布助手
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          先选择一种起手方式，再把脚本、参考图、分镜或角色场景节点接进来，右侧会继续承接提示词和视频参数。
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {videoWorkspaceQuickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={`empty-${action.mode}`}
                            type="button"
                            onClick={() => applyVideoWorkspacePreset(action.mode)}
                            disabled={action.disabled || isSubmitting}
                            className={cn(
                              "flex items-start gap-2 rounded-2xl border px-3 py-3 text-left shadow-sm transition-colors",
                              action.disabled || isSubmitting
                                ? "cursor-not-allowed border-border/50 bg-background/55 text-muted-foreground/50"
                                : "border-border/60 bg-background/92 text-foreground hover:border-primary/40 hover:bg-background"
                            )}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{action.title}</span>
                              <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                                {action.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {attachments.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {attachments.slice(0, 4).map((attachment, index) => (
                          <div
                            key={`video-empty-${attachment.url}-${index}`}
                            className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
                          >
                            <img
                              src={buildPreviewImageUrl(attachment.url, 160)}
                              alt={attachment.name || `素材${index + 1}`}
                              className="h-16 w-16 object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={(event) => {
                                if (event.currentTarget.src !== attachment.url) {
                                  event.currentTarget.src = attachment.url;
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col px-7 pt-12 pb-12">
                    <div className="text-left">
                      <h1
                        className={cn(
                          "text-[24px] font-semibold leading-tight tracking-tight text-[#050505] dark:text-zinc-50",
                          forceLightPanelTone && "!text-[#050505]"
                        )}
                      >
                        Hi,{" "}
                        {greetingUserName ? (
                          <span className="text-brand-selection">{greetingUserName}</span>
                        ) : null}{" "}
                        {greetingPeriodText}
                      </h1>
                      <p
                        className={cn(
                          "mt-3 text-[15px] font-normal leading-6 text-[#6b7280] dark:text-zinc-400",
                          forceLightPanelTone && "!text-[#6b7280]"
                        )}
                      >
                        开始创作吧! 累计为你生成了{" "}
                        <span className="font-semibold text-brand-selection">
                          {Number.isFinite(totalGeneratedImages) ? totalGeneratedImages : 0}
                        </span>{" "}
                        张图。
                      </p>
                    </div>

                    {canvasSkillTags.length > 0 ? (
                      <div
                        className={cn(
                          "mt-8 rounded-[26px] border border-[#e4e7ec] bg-white px-5 py-6 text-center dark:border-white/10 dark:bg-zinc-950/70",
                          forceLightPanelTone && "!border-[#e4e7ec] !bg-white"
                        )}
                      >
                        <h3
                          className={cn(
                            "text-[16px] font-semibold leading-none text-[#1f2328] dark:text-zinc-100",
                            forceLightPanelTone && "!text-[#1f2328]"
                          )}
                        >
                          预设快捷功能
                        </h3>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                          {canvasSkillTags.slice(0, 4).map((tag) => {
                            const isActive = selectedSkillTag?.id === tag.id;
                            const TagIcon = getCanvasSkillIconComponent(tag.iconName);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSkillTagId(tag.id);
                                  const editor = textareaRef.current as HTMLDivElement | null;
                                  editor?.focus();
                                }}
                                className={cn(
                                  "inline-flex h-[34px] max-w-full items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium leading-none transition-colors",
                                  isActive
                                    ? "border-brand-accent bg-brand-accent text-brand-accent-foreground dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground"
                                    : "border-[#e5e7eb] bg-white text-[#1f2328] hover:border-[#d6dae3] hover:bg-[#fafbfc] dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20 dark:hover:bg-white/10",
                                  forceLightPanelTone &&
                                    (isActive
                                      ? "!border-brand-accent !bg-brand-accent !text-brand-accent-foreground"
                                      : "!border-[#e5e7eb] !bg-white !text-[#1f2328] hover:!border-[#d6dae3] hover:!bg-[#fafbfc]")
                                )}
                              >
                                {tag.iconUrl ? (
                                  <img
                                    src={buildPreviewImageUrl(tag.iconUrl, 40)}
                                    alt={tag.name}
                                    className="h-4 w-4 rounded-sm object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => {
                                      if (event.currentTarget.src !== tag.iconUrl) {
                                        event.currentTarget.src = tag.iconUrl || "";
                                      }
                                    }}
                                  />
                                ) : (
                                  <TagIcon className="h-4 w-4 text-current opacity-70" />
                                )}
                                <span className="truncate">{tag.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          ) : null}

          {renderableVisibleMessages.map((message, index) => {
            const assistantTextParts = message.role === "assistant"
              ? (message.parts || []).filter((part: any) => part.type === "text" && part.text)
              : [];
            const nearestUserImageKeys = getNearestUserImageUrlKeys(
              renderableVisibleMessages,
              index
            );
            const assistantModelName =
              assistantTextParts
                .map((part: any) => extractCanvasModelName(part.text || ""))
                .find((name) => Boolean(name)) || "";
            const hasAssistantImages = assistantTextParts.some((part: any) =>
              extractAssistantImageUrls(part.text || "", nearestUserImageKeys).length > 0
            );
            const hasAssistantVideos = assistantTextParts.some((part: any) =>
              extractVideoUrls(part.text || "").length > 0
            );
            const hasAssistantMedia = hasAssistantImages || hasAssistantVideos;
            const isAgentAutoMode = selectedModelId === "auto";
            const displayAssistantModelName =
              isAgentAutoMode && hasAssistantMedia ? "agent model" : assistantModelName;
            const hasAssistantText = assistantTextParts.some((part: any) =>
              stripCanvasModelRoutingLines(stripMediaMarkup(part.text || "")).length > 0
            );
            const isImageOnlyAssistant =
              message.role === "assistant" &&
              hasAssistantMedia &&
              !hasAssistantText;
            const nextMessage = renderableVisibleMessages[index + 1] as ChatMessage | undefined;
            const nextMessageUserImageKeys = getNearestUserImageUrlKeys(
              renderableVisibleMessages,
              index + 1
            );
            const nextAssistantHasMedia = messageHasAssistantMedia(
              nextMessage,
              nextMessageUserImageKeys
            );
            const isLatestAssistantDuringGeneration =
              message.role === "assistant" &&
              hasGenerationStart &&
              !hasGenerationEnd &&
              index === renderableVisibleMessages.length - 1;
            const hideVoteActions =
              message.role === "assistant" &&
              ((!hasAssistantMedia && nextAssistantHasMedia) || isLatestAssistantDuringGeneration);
            const showVoteActions = message.role === "assistant" && !hideVoteActions;
            const showModelMeta = hideVoteActions && Boolean(displayAssistantModelName);
            const mediaModelName =
              displayAssistantModelName ||
              (message.role === "assistant" && !isAgentAutoMode
                ? currentModel?.displayName || ""
                : "");
            const shouldTypeAssistantMessage =
              message.role === "assistant" &&
              isLoading &&
              !hasAssistantMedia &&
              index === renderableVisibleMessages.length - 1;

            const messageTimestamp = getMessageTimestamp(message);
            const prevMessageTimestamp =
              index > 0 ? getMessageTimestamp(renderableVisibleMessages[index - 1] as ChatMessage) : null;
            const showDateSeparator = Boolean(
              messageTimestamp &&
                (!prevMessageTimestamp ||
                  getMessageDayKey(prevMessageTimestamp) !== getMessageDayKey(messageTimestamp))
            );
            const currentVote = messageVotes?.find(
              (vote) => vote.messageId === message.id
            );
            const isVotingCurrentMessage = votingMessageId === message.id;

            if (isWorkspacePresentation) {
              if (message.role !== "assistant" || !hasAssistantMedia) {
                return null;
              }
            }

            return (
              <div key={message.id} className="space-y-3">
                {showDateSeparator && messageTimestamp ? (
                  <div className="text-[14px] font-medium text-[#a6adba]">
                    {formatMessageDateLabel(messageTimestamp)}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex w-full min-w-0",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {/* 消息区域 */}
                  <div className={cn(
                    "flex min-w-0 flex-col gap-2",
                    message.role === 'user'
                      ? "max-w-[88%] items-end"
                      : "w-full max-w-[88%] items-start"
                  )}>
                    {message.role === 'user' ? (
                      <>
                        <div
                          className={cn(
                            "rounded-2xl border px-3 py-2 shadow-sm",
                            isVideoWorkspace
                              ? "border-border/60 bg-background/80 text-foreground"
                              : "border-black/5 bg-[#f1f2f4] text-[#1f2937] dark:border-white/10 dark:bg-[#1b1f2a] dark:text-zinc-50"
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(() => {
                              const renderedUserParts: React.ReactNode[] = [];

                              message.parts?.forEach((part: any, idx: number) => {
                                const fileUrl =
                                  typeof part?.url === "string" && part.url.trim()
                                    ? part.url
                                    : typeof part?.data === "string" && part.data.trim()
                                      ? part.data
                                      : "";

                                if (part.type === 'file' && fileUrl) {
                                  renderedUserParts.push(
                                    <span
                                      key={`part-${idx}`}
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs",
                                        isVideoWorkspace
                                          ? "border border-border/60 bg-background"
                                          : "border border-black/5 bg-white/90 text-[#334155] dark:border-white/10 dark:bg-white/10 dark:text-zinc-100"
                                      )}
                                    >
                                      <img
                                        src={buildPreviewImageUrl(fileUrl, 48)}
                                        alt=""
                                        className="w-5 h-5 object-cover rounded"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => {
                                          if (event.currentTarget.src !== fileUrl) {
                                            event.currentTarget.src = fileUrl;
                                          }
                                        }}
                                      />
                                      <span className="max-w-[80px] truncate text-current">{part.name || 'Image'}</span>
                                    </span>
                                  );
                                  return;
                                }

                                if (part.type === 'text' && part.text) {
                                  const text = String(part.text)
                                    .replace(/【注意：图片中有标注（箭头、圆圈、文字等）标记的区域是需要重点关注或修改的部分，请根据标注进行处理】\n?/g, '')
                                    .trim();
                                  if (!text) return;
                                  renderedUserParts.push(
                                    <span key={`part-${idx}`} className="text-sm text-current">{text}</span>
                                  );
                                }
                              });

                              if (
                                !message.parts?.some((p: any) => p.type === 'file') &&
                                (message as any).attachments?.length > 0
                              ) {
                                (message as any).attachments.forEach((att: any, idx: number) => {
                                  if (!att?.url) return;
                                  renderedUserParts.push(
                                    <span
                                      key={`att-${idx}`}
                                      className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white/90 px-2 py-1 text-xs text-[#334155] dark:border-white/10 dark:bg-white/10 dark:text-zinc-100"
                                    >
                                      <img
                                        src={buildPreviewImageUrl(att.url, 48)}
                                        alt=""
                                        className="w-5 h-5 object-cover rounded"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => {
                                          if (event.currentTarget.src !== att.url) {
                                            event.currentTarget.src = att.url;
                                          }
                                        }}
                                      />
                                      <span className="max-w-[80px] truncate text-current">{att.name || 'Image'}</span>
                                    </span>
                                  );
                                });
                              }

                              if (renderedUserParts.length === 0) {
                                const fallbackText =
                                  extractUserTextPrompt(message as any) ||
                                  (isVideoModel ? "已发送视频生成请求" : "已发送请求");
                                renderedUserParts.push(
                                  <span key="fallback-text" className="text-sm text-current">
                                    {fallbackText}
                                  </span>
                                );
                              }

                              return renderedUserParts;
                            })()}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-[#8b93a1] transition-colors hover:bg-black/5 hover:text-[#343a46] dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                          title="复制这条消息，粘贴时会带上图片"
                          aria-label="复制这条消息"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleCopyUserMessage(message as ChatMessage);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>复制</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "min-w-0 max-w-full text-[14px] text-[#2f3640] dark:text-zinc-300",
                            isImageOnlyAssistant
                              ? "bg-transparent px-0 py-0"
                              : "bg-transparent px-0 py-0"
                          )}
                        >
                          {/* 消息内容 */}
                          <div className="w-full min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                            {message.parts?.map((part: any, i: number) => {
                              if (part.type === 'text') {
                                // 提取并显示图片/视频
                                const rawText = part.text || '';
                                const imageUrls = extractAssistantImageUrls(
                                  rawText,
                                  nearestUserImageKeys
                                );
                                const videoUrls = extractVideoUrls(rawText);
                                const textWithoutImages = stripCanvasModelRoutingLines(
                                  stripMediaMarkup(rawText)
                                );
                                const analysisSection = extractCanvasImageAnalysisSection(textWithoutImages);
                                const plainText = normalizeCanvasAgentText(textWithoutImages);
                                const analysisToggleKey = `${message.id}-${i}-analysis`;
                                const analysisOpen = analysisCollapseState[analysisToggleKey] ?? true;
                                const analysisTypingKey = `${message.id}-${i}-analysis-typing`;
                                const plainTextTypingKey = `${message.id}-${i}-plain-typing`;
                                const shouldAnimateAnalysis =
                                  shouldTypeAssistantMessage &&
                                  Boolean(analysisSection?.analysis) &&
                                  !hasCanvasRenderableMarkdown(analysisSection?.analysis || "") &&
                                  !typedAssistantSections[analysisTypingKey];
                                const shouldAnimatePlainText =
                                  shouldTypeAssistantMessage &&
                                  !analysisSection &&
                                  Boolean(plainText) &&
                                  !hasCanvasRenderableMarkdown(plainText) &&
                                  !typedAssistantSections[plainTextTypingKey];
                                const shouldShowDoneSummary =
                                  !isDetailGenerationMode &&
                                  imageUrls.length > 0 &&
                                  !plainText.includes(CANVAS_IMAGE_DONE_SUMMARY) &&
                                  !isLatestAssistantDuringGeneration;
                                const renderPlainText = (text: string, key: string) => (
                                  <Response
                                    key={key}
                                    className="break-words [overflow-wrap:anywhere]"
                                  >
                                    {text}
                                  </Response>
                                );

                                return (
                                  <div key={i}>
                                    {analysisSection ? (
                                      <div className="space-y-3">
                                        {analysisSection.before
                                          ? renderPlainText(analysisSection.before, `before-${i}`)
                                          : null}
                                        <Collapsible
                                          className="my-2 rounded-[20px] bg-[#f4f5f7] px-5 py-4 ring-1 ring-black/5 dark:bg-zinc-900/70 dark:ring-white/10"
                                          open={analysisOpen}
                                          onOpenChange={(open) =>
                                            setAnalysisCollapseState((prev) => ({
                                              ...prev,
                                              [analysisToggleKey]: open,
                                            }))
                                          }
                                        >
                                          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                                            <span className="inline-flex items-center gap-2">
                                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#9aa1ad] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.42)] dark:bg-white/10 dark:text-zinc-300 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                                                <Search className="h-4 w-4" />
                                              </span>
                                              <span className="text-[14px] font-semibold leading-5 tracking-[0] text-[#9aa1ad] dark:text-zinc-300">
                                                图片分析
                                              </span>
                                            </span>
                                            <ChevronDown
                                              className={cn(
                                                "h-4 w-4 text-[#9aa1ad] transition-transform duration-200 dark:text-zinc-400",
                                                analysisOpen ? "rotate-180" : "rotate-0"
                                              )}
                                            />
                                          </CollapsibleTrigger>
                                          <CollapsibleContent
                                            className={cn(
                                              "pt-3 text-[14px] font-medium leading-[1.72] text-[#2f3640] dark:text-zinc-200",
                                              "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1",
                                              "outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in"
                                            )}
                                          >
                                            <CanvasTypewriterText
                                              text={analysisSection.analysis}
                                              typingKey={analysisTypingKey}
                                              enabled={shouldAnimateAnalysis}
                                              className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                                              renderMarkdown
                                              onActiveChange={handleTypewriterActiveChange}
                                              onComplete={handleTypewriterComplete}
                                            />
                                          </CollapsibleContent>
                                        </Collapsible>
                                        {analysisSection.after
                                          ? renderPlainText(analysisSection.after, `after-${i}`)
                                          : null}
                                      </div>
                                    ) : plainText ? (
                                      <CanvasTypewriterText
                                        text={plainText}
                                        typingKey={plainTextTypingKey}
                                        enabled={shouldAnimatePlainText}
                                        className="break-words [overflow-wrap:anywhere]"
                                        renderMarkdown
                                        onActiveChange={handleTypewriterActiveChange}
                                        onComplete={handleTypewriterComplete}
                                      />
                                    ) : null}
                                    {imageUrls.length > 0 && (
                                      <div className={cn("space-y-2", textWithoutImages ? "mt-3" : "mt-0")}>
                                        {mediaModelName ? (
                                          <div className="flex items-center gap-1.5 text-[#a4acb8]">
                                            <Bot className="h-3.5 w-3.5" />
                                            <span className="text-[12px] font-medium">{mediaModelName}</span>
                                          </div>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2">
                                          {imageUrls.map((url, idx) => (
                                            <div
                                              key={idx}
                                              className={cn(
                                                "relative group overflow-hidden border transition-all",
                                                "rounded-2xl border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50",
                                                "shadow-[0_8px_24px_-16px_rgba(15,23,42,0.45)] hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.5)]"
                                              )}
                                            >
                                              <img
                                                src={buildPreviewImageUrl(url, 960)}
                                                alt=""
                                                className="block max-w-full h-auto cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                                                style={{ maxHeight: "260px" }}
                                                loading="lazy"
                                                decoding="async"
                                                onError={(event) => {
                                                  if (event.currentTarget.src !== url) {
                                                    event.currentTarget.src = url;
                                                  }
                                                }}
                                                onClick={() => setFullscreenPreview({ url })}
                                                onDoubleClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  setFullscreenPreview({ url });
                                                }}
                                              />
                                              <button
                                                type="button"
                                                className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  event.stopPropagation();
                                                  void handleDownloadOriginalImage(url);
                                                }}
                                                title="下载原图"
                                              >
                                                <Download className="h-3.5 w-3.5" />
                                                原图
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                        {shouldShowDoneSummary ? (
                                          <p className="text-[14px] font-medium leading-6 text-[#2f3640] dark:text-zinc-300">
                                            {CANVAS_IMAGE_DONE_SUMMARY}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                    {videoUrls.length > 0 && (
                                      <div className={cn("space-y-2", textWithoutImages || imageUrls.length > 0 ? "mt-3" : "mt-0")}>
                                        {videoUrls.map((url, idx) => (
                                          <div
                                            key={`video-${idx}`}
                                            className="overflow-hidden rounded-2xl border border-black/10 bg-black/5 p-2 dark:border-white/10 dark:bg-white/5"
                                          >
                                            <video
                                              src={url}
                                              controls
                                              className="block w-full rounded-xl bg-black"
                                              style={{ maxHeight: "320px" }}
                                            />
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="mt-2 inline-flex text-xs text-blue-600 hover:underline dark:text-blue-300"
                                            >
                                              下载视频
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[#8f96a3]">
                          {showModelMeta ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-tight text-[#a2a9b5]">
                              <Eye className="h-3.5 w-3.5 opacity-80" />
                              <span>{displayAssistantModelName}</span>
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/8"
                            title="复制回复"
                            aria-label="复制回复"
                            onClick={() => void handleCopyAssistantMessage(message as ChatMessage)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {showVoteActions ? (
                            <>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/8",
                                  currentVote?.isUpvoted &&
                                    "bg-emerald-50/80 text-[#22a06b] dark:bg-emerald-500/15 dark:text-emerald-300"
                                )}
                                title="点赞"
                                disabled={isVotingCurrentMessage}
                                onClick={() => void handleAssistantVote(message.id, "up")}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/8",
                                  currentVote &&
                                    !currentVote.isUpvoted &&
                                    "bg-rose-50/80 text-[#d94848] dark:bg-rose-500/15 dark:text-rose-300"
                                )}
                                title="点踩"
                                disabled={isVotingCurrentMessage}
                                onClick={() => void handleAssistantVote(message.id, "down")}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {shouldRenderImageLoading && (
            <ImageGenerationLoading
              imageCount={loadingImageCount}
              maxImages={9}
              providerType={loadingProviderType}
              modelName={loadingModelName}
              phase={loadingPhase}
              queuePosition={loadingQueuePosition}
              sameModelRunningCount={loadingSameModelRunningCount}
              concurrencyLimit={loadingConcurrencyLimit}
              estimatedWaitMs={loadingEstimatedWaitMs}
            />
          )}

          {isLoading && !shouldRenderImageLoading && (
            <div className="flex w-full justify-start">
              <div className="flex items-center gap-2 text-[#8e97a5]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[16px]">分析中</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
      )}

      {fullscreenPreview && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setFullscreenPreview(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setFullscreenPreview(null)}
            aria-label="关闭预览"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <button
            className="absolute top-4 right-16 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              void handleDownloadOriginalImage(fullscreenPreview.url);
            }}
            aria-label="下载原图"
            title="下载原图"
          >
            <Download className="h-4 w-4" />
            下载原图
          </button>

          <img
            src={fullscreenPreviewSrc}
            alt={fullscreenPreview.alt || "图片预览"}
            className="max-w-[95vw] max-h-[95vh] object-contain"
            decoding="async"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            点击空白处或按 Esc 关闭
          </div>
        </div>,
        document.body
      )}

      {!isWorkspacePresentation && shouldShowCanvasBanner && !useJimengCanvasComposer ? (
        <div className="px-[10px] pb-0">
          <div
            className={cn(
              "relative z-10 mb-0 flex h-[48px] items-center justify-between gap-2 rounded-[28px] bg-[#f4f4f5] px-4 py-0 text-[14px] font-medium leading-5 text-[#20242a] dark:bg-zinc-900 dark:text-zinc-100",
              siteSettings?.bannerLink && "cursor-pointer transition-colors hover:bg-[#eeeeef] dark:hover:bg-zinc-800",
              forceLightPanelTone && "!bg-[#f4f4f5] !text-[#20242a] hover:!bg-[#eeeeef]"
            )}
            onClick={() => {
              if (siteSettings?.bannerLink) {
                window.open(siteSettings.bannerLink, "_blank");
              }
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#e8ff38] text-[#111827]">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="min-w-0 truncate">{siteSettings?.bannerText || "限时特惠：升级会员最高立享 45% OFF!"}</span>
            </div>
            <button
              type="button"
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#20242a]/75 transition-colors hover:bg-black/5 hover:text-[#20242a] dark:text-zinc-100/75 dark:hover:bg-white/10 dark:hover:text-zinc-100",
                forceLightPanelTone && "!text-[#20242a] hover:!bg-black/5 hover:!text-[#20242a]"
              )}
              aria-label="关闭优惠广告"
              onClick={(event) => {
                event.stopPropagation();
                setIsCanvasBannerDismissed(true);
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* 底部输入区域 - 混合输入（图片标签+文字可自由混合） */}
      <div
        className={cn(
          isWorkspacePresentation
            ? "border-t bg-white/92 p-5 backdrop-blur-sm dark:bg-zinc-950/92"
            : isVideoWorkspace
              ? "bg-white px-[10px] pb-[10px] pt-0 dark:bg-zinc-950"
              : useJimengCanvasComposer
                ? "bg-white px-5 pb-7 pt-0 dark:bg-[#050607]"
                : "bg-white px-5 pb-5 pt-0 dark:bg-zinc-950",
          forceLightPanelTone && "!bg-white"
        )}
      >
        <div
          className={cn(
            useJimengCanvasComposer
              ? "canvas-jimeng-composer-shell relative flex min-h-[132px] flex-col overflow-hidden rounded-[18px] border border-[#e9edf2] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200 focus-within:border-[#d9dfe8] dark:border-white/[0.10] dark:bg-[#0b0d10] dark:shadow-[0_18px_46px_rgba(0,0,0,0.26)] dark:focus-within:border-white/[0.18]"
              : isWorkspacePresentation || isDetailGenerationMode || isVideoWorkspace
              ? "relative flex min-h-[184px] flex-col overflow-hidden rounded-[28px] border border-[#e2e5ea] bg-white shadow-[0_22px_42px_-30px_rgba(15,23,42,0.48)] transition-all duration-200 focus-within:border-[#d8dde5] focus-within:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.55)] dark:border-white/12 dark:bg-zinc-950 dark:focus-within:border-white/25"
              : "relative flex min-h-[176px] flex-col overflow-hidden rounded-[24px] border border-black/[0.05] bg-white/92 shadow-none transition-colors duration-200 focus-within:border-black/[0.09] dark:border-white/12 dark:bg-zinc-950",
            forceLightPanelTone && "!border-black/[0.05] !bg-white"
          )}
          data-canvas-chat-input-anchor="true"
        >
          {useJimengCanvasComposer ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex min-h-[58px] items-start gap-3">
                <button
                  type="button"
                  className="astra-upload-heartbeat canvas-jimeng-upload-card flex h-[60px] w-[44px] shrink-0 -rotate-[7deg] items-center justify-center overflow-hidden rounded-[4px] border border-[#e4e8ee] bg-[#f8fafc] text-[#9aa4b2] shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#f3f6f9] hover:text-[#697586] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white/46 dark:shadow-[0_12px_24px_rgba(0,0,0,0.28)] dark:hover:bg-white/[0.09] dark:hover:text-white/70"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  title="上传参考"
                >
                  {attachments[0]?.url ? (
                    <img
                      src={buildPreviewImageUrl(attachments[0].url, 180)}
                      alt={attachments[0].name || "参考图"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        if (event.currentTarget.src !== attachments[0]?.url) {
                          event.currentTarget.src = attachments[0]?.url || "";
                        }
                      }}
                    />
                  ) : (
                    <Plus className="h-4 w-4 stroke-[1.8]" />
                  )}
                </button>
                <div
                  ref={textareaRef as any}
                  contentEditable={!isSubmitting}
                  suppressContentEditableWarning
                  className="canvas-jimeng-placeholder-editor min-h-[54px] flex-1 overflow-y-auto whitespace-pre-wrap break-words text-[14px] leading-[1.5] text-[#1b1f27] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9aa4b2] dark:text-white dark:empty:before:text-white/42"
                  data-placeholder={jimengComposerPlaceholder}
                  onInput={handleJimengComposerInput}
                  onKeyDown={handleJimengComposerKeyDown}
                  onPaste={handleJimengComposerPaste}
                />
              </div>

              <div className="canvas-jimeng-bottom-row mt-auto flex items-end justify-between gap-3 pt-3">
                <div className="canvas-jimeng-toolbar flex min-w-0 flex-wrap items-center gap-1.5">
                  <DropdownMenu
                    open={isComposerModeMenuOpen}
                    onOpenChange={setIsComposerModeMenuOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="canvas-jimeng-tool-button canvas-jimeng-agent-button inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-[8px] border border-[#e4e8ee] bg-white px-3 text-[12px] font-semibold leading-none text-[#111827] transition-colors hover:bg-[#f8fafc] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                      >
                        <CanvasToolbarIcon
                          className="h-4 w-4 shrink-0"
                          fallback={activeModeToolbarIcon.fallback}
                          item={activeModeToolbarIcon.item}
                        />
                        <span className="canvas-jimeng-tool-label truncate">
                          {activeModeLabel}
                          {activeComposerMode === "agent" && !isPresetAgentSelection ? " 模式" : ""}
                        </span>
                        <ChevronDown className="canvas-jimeng-tool-label h-3.5 w-3.5 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      sideOffset={10}
                      className="w-[188px] rounded-[8px] border border-[#d8dce3] bg-white p-1.5 text-[#20242a] shadow-[0_18px_42px_rgba(15,23,42,0.14)] dark:border-white/[0.10] dark:bg-[#121416] dark:text-white dark:shadow-[0_20px_48px_rgba(0,0,0,0.40)]"
                    >
                      {effectiveAgentEnabled ? (
                        <DropdownMenuItem onClick={() => handleSelectGenerationMode("agent")} className="h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal dark:focus:bg-white/[0.08] [&_svg]:!size-4">
                          <CanvasToolbarIcon className="h-4 w-4" fallback={Bot} item={null} />
                          <span className="flex-1">Agent</span>
                          {activeComposerMode === "agent" ? <Check className="h-4 w-4 text-[#1f2937] dark:text-white" /> : null}
                        </DropdownMenuItem>
                      ) : null}
                      {canUseDetailGeneration ? (
                        <DropdownMenuItem onClick={() => handleSelectGenerationMode("detail")} className="h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal dark:focus:bg-white/[0.08] [&_svg]:!size-4">
                          <CanvasToolbarIcon className="h-4 w-4" fallback={LayoutGrid} item={getToolbarItem("chatModeDetailMenu")} />
                          <span className="flex-1">{getToolbarItem("chatModeDetailMenu").label}</span>
                          {activeComposerMode === "detail" ? <Check className="h-4 w-4 text-[#1f2937] dark:text-white" /> : null}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => handleSelectGenerationMode("image")} className="h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal dark:focus:bg-white/[0.08] [&_svg]:!size-4">
                        <CanvasToolbarIcon className="h-4 w-4" fallback={ImagePlus} item={getToolbarItem("chatModeImageMenu")} />
                        <span className="flex-1">图像</span>
                        {activeComposerMode === "image" ? <Check className="h-4 w-4 text-[#1f2937] dark:text-white" /> : null}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSelectGenerationMode("video")} className="h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal dark:focus:bg-white/[0.08] [&_svg]:!size-4">
                        <CanvasToolbarIcon className="h-4 w-4" fallback={Video} item={getToolbarItem("chatModeVideoMenu")} />
                        <span className="flex-1">视频</span>
                        {activeComposerMode === "video" ? <Check className="h-4 w-4 text-[#1f2937] dark:text-white" /> : null}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ImageParamsBar
                    modelId={currentModel?.modelId}
                    modelName={currentModel?.displayName}
                    initialParams={imageParams}
                    onParamsChange={handleImageParamsChange}
                    inline={true}
                    providerType={currentModel?.providerType}
                    imageGenConfig={currentModel?.imageGenConfig || undefined}
                    hideImageCount={false}
                    hideAdvancedOptions={true}
                    inlineTheme="minimal"
                    showInlineDivider={false}
                    minimalTriggerVariant="icon"
                    minimalTriggerClassName="canvas-jimeng-tool-button border-[#e4e8ee] bg-white text-[#111827] hover:bg-[#f8fafc] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                  />
                  <button
                    type="button"
                    className={cn(
                      "canvas-jimeng-tool-button inline-flex h-9 min-w-[96px] items-center justify-center gap-2 rounded-[8px] border px-3 text-[12px] font-semibold leading-none transition-colors",
                      selectedSkillTag?.name?.includes("灵感")
                        ? "border-brand-accent bg-brand-accent text-brand-accent-foreground"
                        : "border-[#e4e8ee] bg-white text-[#111827] hover:bg-[#f8fafc] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                    )}
                    onClick={() => handleApplyJimengSkill("灵感搜索")}
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="canvas-jimeng-tool-label">灵感搜索</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "canvas-jimeng-tool-button inline-flex h-9 min-w-[96px] items-center justify-center gap-2 rounded-[8px] border px-3 text-[12px] font-semibold leading-none transition-colors",
                      selectedSkillTag?.name?.includes("创意")
                        ? "border-brand-accent bg-brand-accent text-brand-accent-foreground"
                        : "border-[#e4e8ee] bg-white text-[#111827] hover:bg-[#f8fafc] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                    )}
                    onClick={() => handleApplyJimengSkill("创意设计")}
                  >
                    <Lightbulb className="h-4 w-4 shrink-0" />
                    <span className="canvas-jimeng-tool-label">创意设计</span>
                  </button>
                  <Select
                    value={modelSelectValue}
                    onValueChange={handleModelSelectionChange}
                  >
                    <SelectTrigger
                      className="canvas-jimeng-tool-button inline-flex h-9 min-w-[40px] items-center justify-center rounded-[8px] border border-[#e4e8ee] bg-white px-2 text-[#111827] transition-colors hover:bg-[#f8fafc] focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-brand-accent data-[state=open]:bg-brand-accent data-[state=open]:text-brand-accent-foreground dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10] dark:data-[state=open]:border-brand-accent dark:data-[state=open]:bg-brand-accent dark:data-[state=open]:text-brand-accent-foreground [&>svg]:hidden"
                      title={getToolbarItem("chatModelSelector").label}
                    >
                      <span className="canvas-jimeng-model-avatar flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white leading-none dark:bg-white">
                        {selectDisplayModel?.avatarUrl ? (
                          <img
                            src={buildPreviewImageUrl(selectDisplayModel.avatarUrl, 64)}
                            alt={selectDisplayModel.displayName || "模型头像"}
                            className="block h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.src !== selectDisplayModel.avatarUrl) {
                                event.currentTarget.src = selectDisplayModel.avatarUrl || "";
                              }
                            }}
                          />
                        ) : getToolbarItem("chatModelSelector").iconUrl ? (
                          <CanvasToolbarIcon
                            className="h-3.5 w-3.5"
                            fallback={Bot}
                            item={getToolbarItem("chatModelSelector")}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[12px] font-semibold leading-none text-[#4b5563]">
                            {(selectDisplayModel?.displayName || "A").slice(0, 1)}
                          </span>
                        )}
                      </span>
                    </SelectTrigger>
                    {renderModelSelectContent()}
                  </Select>
                </div>

                <div className="canvas-jimeng-send-group flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="canvas-jimeng-mic-button inline-flex h-8 w-8 items-center justify-center rounded-full text-[#84909f] transition-colors hover:bg-[#f4f6f8] hover:text-[#596474] dark:text-white/52 dark:hover:bg-white/[0.08] dark:hover:text-white/76"
                    onClick={() => toast.info("语音输入待接入")}
                    title="语音输入"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "canvas-jimeng-send-button inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                      canSend
                        ? "bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent-hover"
                        : "bg-[#e7ebf0] text-white dark:bg-white/[0.12] dark:text-white/36"
                    )}
                    onClick={handleSend}
                    disabled={isSubmitting || !canSend}
                    title={getToolbarItem("chatSend").label}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-[18px] w-[18px] stroke-[2.4]" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
          {isWorkspacePresentation && !isDetailGenerationMode ? (
            <div className="border-b px-5 py-3">
              <div className="text-sm font-semibold text-foreground">补充要求</div>
              <div className="mt-1 text-xs text-muted-foreground">
                这里填写本次生图补充要求。图片槽位和生成结果都在当前工作台内完成，不再使用聊天对话方式。
              </div>
            </div>
          ) : null}
          {isDetailGenerationMode && (
            <div
              className={cn(
                "order-3 mx-3 mb-11 overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 pr-2 dark:border-white/10 dark:bg-zinc-950/85",
                "mt-1",
                renderableVisibleMessages.length === 0 ? "max-h-[62vh]" : "max-h-[54vh]"
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 ring-1 ring-inset ring-black/5 dark:ring-white/10">
                    <Sparkles className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        AI详情生成工作台
                      </h3>
                      <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-black/60 dark:bg-white/10 dark:text-white/70">
                        PC端
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      全链路智能生成 · {DETAIL_TARGET_WIDTH}x{DETAIL_TARGET_HEIGHT}px
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                      detailProgress.status === "running"
                        ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400"
                        : detailProgress.status === "done"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : detailProgress.status === "error"
                            ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      detailProgress.status === "running" ? "animate-pulse bg-blue-600" :
                      detailProgress.status === "done" ? "bg-emerald-600" :
                      detailProgress.status === "error" ? "bg-red-600" : "bg-zinc-400"
                    )} />
                    {detailProgress.status === "running"
                      ? "生成中"
                      : detailProgress.status === "done"
                        ? "已完成"
                        : detailProgress.status === "error"
                          ? "异常"
                          : "待启动"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setIsDetailWorkbenchCollapsed((prev) => !prev)}
                  >
                    {isDetailWorkbenchCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {isDetailWorkbenchCollapsed ? (
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-between rounded-lg border border-dashed border-border/50 bg-zinc-50/50 px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                  onClick={() => setIsDetailWorkbenchCollapsed(false)}
                >
                  <span>配置面板已收起</span>
                  <span className="text-[10px] font-medium text-primary">点击展开</span>
                </button>
              ) : (
                <>
              <div className="mt-4 rounded-xl border border-border/50 bg-zinc-50/50 p-3 dark:bg-zinc-900/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">
                    {detailProgress.stage || "准备就绪"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {detailProgress.current}/{detailProgress.total || 0} 步骤
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      detailProgress.status === "error"
                        ? "bg-red-500"
                      : detailProgress.status === "done"
                          ? "bg-emerald-500"
                          : "bg-primary"
                    )}
                    style={{ width: `${detailProgressPercent}%` }}
                  />
                </div>
                {!detailProgress.stage && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    请先补齐必填信息与素材，然后点击下方发送按钮开始生成。
                  </p>
                )}
              </div>

              <DetailUiValidationPanel
                generationMode={detailGenerationMode}
                planValidation={detailUiValidation.plan}
                latestScreenValidation={detailUiValidation.latestScreen}
                surfaceId={detailSurfaceSnapshot?.surfaceId}
              />

              <DetailSurfaceInspectorPanel
                surface={detailSurfaceSnapshot}
                latestScreenValidation={detailUiValidation.latestScreen}
              />

              <div className="mt-3 rounded-xl border border-border/50 bg-zinc-50/40 p-3 dark:bg-zinc-900/40">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground">生成路线</p>
                  <span className="text-[10px] text-muted-foreground">
                    {detailGenerationMode === "classic" ? "当前：传统生图" : "当前：AGENT排版"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DETAIL_GENERATION_MODE_OPTIONS.map((option) => {
                    const selected = detailGenerationMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          if (isDetailGenerating) return;
                          setDetailGenerationMode(option.value);
                        }}
                        disabled={isDetailGenerating}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-all duration-150",
                          isDetailGenerating && "cursor-not-allowed opacity-60",
                          selected
                            ? "border-brand-selection bg-brand-accent text-brand-accent-foreground ring-1 ring-brand-selection"
                            : "border-border/60 bg-background text-muted-foreground hover:border-brand-selection/70 hover:bg-brand-accent/10 hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-brand-selection/70 dark:hover:bg-brand-accent/10 dark:hover:text-zinc-50"
                        )}
                        aria-pressed={selected}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-medium">{option.label}</div>
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </div>
                        <div className="mt-1 text-[10px] leading-snug opacity-80">
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Required Info */}
                <Collapsible
                  open={detailSections.required}
                  onOpenChange={() => toggleDetailSection("required")}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/50"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                           <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">核心参数</p>
                          <p className="text-[10px] text-muted-foreground">人群 / 场景 / 需求 (必填)</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          detailSections.required && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-3 border-t border-border/50 bg-zinc-50/30 px-4 py-4 dark:bg-zinc-900/30 xl:grid-cols-4">
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">商品SPU</label>
                        <input
                          value={detailBrief.productSpu}
                          onChange={(event) => updateDetailBriefField("productSpu", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.productSpu}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="建议填写"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">需求类型</label>
                        <input
                          value={detailBrief.demandType}
                          onChange={(event) => updateDetailBriefField("demandType", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.demandType}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="建议填写"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">主购买人群 <span className="text-red-500">*</span></label>
                        <input
                          value={detailBrief.targetAudience}
                          onChange={(event) => updateDetailBriefField("targetAudience", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.targetAudience}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="必填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">需求场景 <span className="text-red-500">*</span></label>
                        <input
                          value={detailBrief.usageScenario}
                          onChange={(event) => updateDetailBriefField("usageScenario", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.usageScenario}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="必填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">核心需求 <span className="text-red-500">*</span></label>
                        <input
                          value={detailBrief.coreNeed}
                          onChange={(event) => updateDetailBriefField("coreNeed", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.coreNeed}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="必填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">产品名称</label>
                        <input
                          value={detailBrief.productName}
                          onChange={(event) => updateDetailBriefField("productName", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.productName}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">主使用者</label>
                        <input
                          value={detailBrief.mainUser}
                          onChange={(event) => updateDetailBriefField("mainUser", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.mainUser}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">触发时刻</label>
                        <input
                          value={detailBrief.triggerMoment}
                          onChange={(event) => updateDetailBriefField("triggerMoment", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.triggerMoment}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">用户顾虑</label>
                        <input
                          value={detailBrief.riskConcern}
                          onChange={(event) => updateDetailBriefField("riskConcern", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.riskConcern}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">期望结果</label>
                        <input
                          value={detailBrief.expectedResult}
                          onChange={(event) => updateDetailBriefField("expectedResult", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.expectedResult}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">核心卖点关键词</label>
                        <input
                          value={detailBrief.coreSellingPoint}
                          onChange={(event) => updateDetailBriefField("coreSellingPoint", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.coreSellingPoint}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">一句话定位</label>
                        <input
                          value={detailBrief.positioningStatement}
                          onChange={(event) => updateDetailBriefField("positioningStatement", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.positioningStatement}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Strategy Info */}
                <Collapsible
                  open={detailSections.strategy}
                  onOpenChange={() => toggleDetailSection("strategy")}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/50"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                          <Brain className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">策略信息</p>
                          <p className="text-[10px] text-muted-foreground">品牌语气 / 竞品 / 禁用词</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          detailSections.strategy && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-3 border-t border-border/50 bg-zinc-50/30 px-4 py-4 dark:bg-zinc-900/30 xl:grid-cols-4">
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">价格带</label>
                        <input
                          value={detailBrief.priceBand}
                          onChange={(event) => updateDetailBriefField("priceBand", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.priceBand}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">品牌语气</label>
                        <input
                          value={detailBrief.brandTone}
                          onChange={(event) => updateDetailBriefField("brandTone", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.brandTone}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">竞品对标</label>
                        <input
                          value={detailBrief.competitorReference}
                          onChange={(event) => updateDetailBriefField("competitorReference", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.competitorReference}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="选填"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">禁用表达</label>
                        <input
                          value={detailBrief.bannedWords}
                          onChange={(event) => updateDetailBriefField("bannedWords", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.bannedWords}
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="逗号分隔"
                        />
                      </div>
                      <div className="col-span-2 xl:col-span-4 space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground">用户原话样本</label>
                        <textarea
                          value={detailBrief.userVoice}
                          onChange={(event) => updateDetailBriefField("userVoice", event.target.value)}
                          title={DETAIL_FIELD_EXAMPLES.userVoice}
                          className="min-h-[64px] w-full resize-y rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                          placeholder="建议3-5条"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Assets Info */}
                <Collapsible
                  open={detailSections.assets}
                  onOpenChange={() => toggleDetailSection("assets")}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/50"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                          <ImagePlus className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">素材中心</p>
                          <p className="text-[10px] text-muted-foreground">5张产品 + 1张模特 + 3张搭配</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          detailSections.assets && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/50 bg-zinc-50/30 px-4 py-4 dark:bg-zinc-900/30">
                      <div className="mb-3 flex items-start gap-2 text-[10px] text-muted-foreground">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                        <span>Agent 会自动判断是否使用模特图；若上传搭配图，将自动新增一屏“场景化产品搭配展示”用于关联销售。</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        {DETAIL_SLOT_CONFIGS.map((config, index) => {
                          const slotAttachment = detailSlots[index];
                          const isUploading = detailSlotUploading === index;
                          const isPickingFromCanvas = detailSlotPickerIndex === index;
                          return (
                            <div
                              key={config.key}
                              className={cn(
                                "group relative aspect-square overflow-hidden rounded-lg border transition-all",
                                slotAttachment
                                  ? "border-border bg-background shadow-sm"
                                  : "border-dashed border-border/60 bg-background/50 hover:border-primary/50 hover:bg-background",
                                isPickingFromCanvas && "ring-2 ring-primary ring-offset-2"
                              )}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={(element) => {
                                  detailSlotInputRefs.current[index] = element;
                                }}
                                onChange={(event) => {
                                  void handleDetailSlotFileChange(index, event);
                                }}
                              />
                              {slotAttachment ? (
                                <>
                                  <button
                                    type="button"
                                    className="h-full w-full cursor-pointer"
                                    onClick={() => detailSlotInputRefs.current[index]?.click()}
                                  >
                                    <img
                                      src={buildPreviewImageUrl(slotAttachment.url, 520)}
                                      alt={config.label}
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(event) => {
                                        if (event.currentTarget.src !== slotAttachment.url) {
                                          event.currentTarget.src = slotAttachment.url;
                                        }
                                      }}
                                    />
                                  </button>
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-1 text-center text-[10px] text-white backdrop-blur-sm">
                                    {config.label}
                                  </div>
                                  <div className="absolute left-1 top-1 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <button
                                      type="button"
                                      className={cn(
                                        "rounded px-1.5 py-0.5 text-[10px] text-white shadow-sm backdrop-blur-md",
                                        isPickingFromCanvas ? "bg-primary" : "bg-black/50 hover:bg-black/70"
                                      )}
                                      onClick={() => activateDetailSlotCanvasPicker(index)}
                                    >
                                      画布
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white shadow-sm backdrop-blur-md hover:bg-black/70"
                                      onClick={() => detailSlotInputRefs.current[index]?.click()}
                                    >
                                      更换
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute right-1 top-1 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white shadow-sm backdrop-blur-md opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100"
                                    onClick={() => updateDetailSlotAttachment(index, null)}
                                  >
                                    移除
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={cn(
                                      "absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] text-white shadow-sm transition-all",
                                      isPickingFromCanvas ? "bg-primary opacity-100" : "bg-zinc-500/50 opacity-0 hover:bg-zinc-500 group-hover:opacity-100"
                                    )}
                                    onClick={() => activateDetailSlotCanvasPicker(index)}
                                    disabled={isSubmitting || isUploading}
                                  >
                                    画布
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                                    onClick={() => detailSlotInputRefs.current[index]?.click()}
                                    disabled={isSubmitting || isUploading}
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-muted">
                                        <Plus className="h-4 w-4" />
                                      </div>
                                    )}
                                    <span className="text-[10px] font-medium">{config.label}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <div>
                           当前素材：产品图 <span className={detailProductCount === 5 ? "text-emerald-500 font-medium" : ""}>{detailProductCount}/5</span>，
                           模特图 <span className={detailModelReady ? "text-emerald-500 font-medium" : ""}>{detailModelReady ? "1/1" : "0/1"}</span>，
                           搭配图 {detailBundleCount}/3
                        </div>
                        {detailSlotPickerIndex !== null && (
                           <div className="animate-pulse font-medium text-primary">
                             请在画布中选择图片...
                           </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Archives Info */}
                <Collapsible
                  open={detailSections.archives}
                  onOpenChange={() => toggleDetailSection("archives")}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/50"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          <History className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">项目存档</p>
                          <p className="text-[10px] text-muted-foreground">历史记录与回溯</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          detailSections.archives && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/50 bg-zinc-50/30 px-4 py-4 dark:bg-zinc-900/30">
                      {detailArchives.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-6 text-center">
                          <p className="text-[11px] text-muted-foreground">暂无存档记录</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/60">生成成功后将自动保存</p>
                        </div>
                      ) : (
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                          {detailArchives.map((archive) => (
                            <div
                              key={archive.id}
                              className="group flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background px-3 py-2.5 transition-all hover:border-primary/30 hover:shadow-sm"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-medium text-foreground group-hover:text-primary">
                                  {archive.title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>{new Date(archive.createdAt).toLocaleString()}</span>
                                  <span className="h-0.5 w-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  <span>{archive.imageCount || 0}张输出</span>
                                  <span className="h-0.5 w-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  <span>{archive.generationMode === "agent_layout" ? "AGENT排版" : "传统生图"}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-md border border-border/50 bg-secondary/50 px-2.5 py-1 text-[10px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => loadDetailArchive(archive)}
                                >
                                  加载
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => void deleteDetailArchive(archive.id)}
                                  disabled={deletingDetailArchiveId === archive.id}
                                  title="删除存档"
                                  aria-label="删除存档"
                                >
                                  {deletingDetailArchiveId === archive.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div
                className={cn(
                  "mt-4 flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-xs shadow-sm transition-all",
                  detailValidationIssues.length === 0
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                )}
              >
                {detailValidationIssues.length === 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <span className="font-medium">校验通过，准备就绪</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void handleSend()}
                      disabled={isSubmitting}
                      className="h-7 bg-emerald-600 px-3 text-[10px] hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          生成中
                        </>
                      ) : (
                        <>
                          立即生成
                          <ArrowUp className="ml-1.5 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20">
                      <AlertCircle className="h-3 w-3" />
                    </div>
                    <span className="font-medium">
                      需完善：{detailValidationIssues.join("、")}
                    </span>
                  </div>
                )}
              </div>

              {hasGeneratedDetailImages ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/50 p-0 shadow-sm transition-all hover:shadow-md dark:border-violet-500/30 dark:bg-violet-500/10">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                          追加评价晒图
                        </p>
                        <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70">
                          新增2条评价 (每条3张图) · 不重跑主图
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-all",
                        isSubmitting
                          ? "cursor-not-allowed bg-violet-100 text-violet-400 dark:bg-violet-500/20"
                          : "bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent-hover dark:bg-brand-accent dark:text-brand-accent-foreground dark:hover:bg-brand-accent-hover"
                      )}
                      onClick={() => {
                        void handleGenerateMoreDetailReviews();
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          生成中
                        </>
                      ) : (
                        <>
                          立即追加
                          <ArrowUp className="ml-1.5 h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
                </>
              )}
            </div>
          )}
          {/* 混合输入区域：使用 contenteditable 实现真正的混合编辑 */}
          <div
            className={cn(
              "relative px-3 pb-0 pt-3 sm:px-4",
              isDetailGenerationMode
                ? "min-h-[112px]"
                : activeComposerMode === "image"
                  ? "min-h-[118px]"
                  : "min-h-[132px]"
            )}
          >
            {!isWorkspacePresentation && !isDetailGenerationMode && selectedSkillTag && (
              <div className="mb-2 flex">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-sm font-medium text-[#4b5563] transition-colors hover:bg-[#e9ebef] dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12"
                  onClick={() => setSelectedSkillTagId(null)}
                  title="点击移除标签"
                >
                  {selectedSkillTag.iconUrl ? (
                    <img
                      src={buildPreviewImageUrl(selectedSkillTag.iconUrl, 40)}
                      alt={selectedSkillTag.name}
                      className="h-4 w-4 rounded-sm object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <SelectedSkillTagIcon className="h-4 w-4 text-brand-selection" />
                  )}
                  <span>{selectedSkillTag.name}</span>
                  <X className="h-3.5 w-3.5 text-[#9ca3af] dark:text-zinc-400" />
                </button>
              </div>
            )}
            {!isDetailGenerationMode && hasWorkflowContext && workflowContext && (
              <div
                className={cn(
                  "mb-2 rounded-2xl px-3 py-2",
                  isVideoWorkspace
                    ? "border border-border/60 bg-background/72 shadow-sm"
                    : "border border-brand-selection/20 bg-brand-accent/10 dark:border-brand-selection/20 dark:bg-brand-accent/10"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    isVideoWorkspace ? "text-foreground" : "text-[#334155] dark:text-zinc-100"
                  )}
                >
                  <Sparkles
                    className={cn(
                      "h-4 w-4",
                      isVideoWorkspace ? "text-primary" : "text-brand-selection"
                    )}
                  />
                  <span>当前工作流设定</span>
                </div>
                <div
                  className={cn(
                    "mt-1 text-xs leading-5",
                    isVideoWorkspace ? "text-muted-foreground" : "text-[#5b6472] dark:text-zinc-300"
                  )}
                >
                  {workflowContext.summaryText}
                </div>
              </div>
            )}
            {!isDetailGenerationMode && isVideoWorkspace && (
              <div className="mb-2 rounded-2xl border border-border/60 bg-background/72 px-3 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clapperboard className="h-4 w-4 text-primary" />
                  <span>视频工作台</span>
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  直接复用现有的视频模型、首尾帧槽位、流式分镜结果和视频节点输出。先选一个起手方式，再补充镜头描述即可。
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {videoWorkspaceQuickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.mode}
                        type="button"
                        onClick={() => applyVideoWorkspacePreset(action.mode)}
                        disabled={action.disabled || isSubmitting}
                        className={cn(
                          "flex items-start gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors",
                          action.disabled || isSubmitting
                            ? "cursor-not-allowed border-border/50 bg-background/55 text-muted-foreground/50"
                            : "border-border/60 bg-background/92 text-foreground hover:border-primary/40 hover:bg-background"
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{action.title}</span>
                          <span className="block text-[11px] leading-4 text-muted-foreground">
                            {action.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!isDetailGenerationMode && activeComposerMode === "agent" && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {hasSelectedAgentPreset ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAgentEntryMode("auto")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        !isPresetAgentSelection
                          ? "bg-brand-accent/15 text-brand-selection dark:bg-brand-accent/15 dark:text-brand-selection"
                          : "bg-[#f4f5f7] text-[#5b6472] hover:bg-[#eceef2] dark:bg-white/8 dark:text-zinc-300 dark:hover:bg-white/12"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Auto Agent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentEntryMode("preset")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        isPresetAgentSelection
                          ? "bg-brand-accent/15 text-brand-selection dark:bg-brand-accent/15 dark:text-brand-selection"
                          : "bg-[#f4f5f7] text-[#5b6472] hover:bg-[#eceef2] dark:bg-white/8 dark:text-zinc-300 dark:hover:bg-white/12"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{selectedAgentPreset?.name || "预设 Agent"}</span>
                    </button>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1.5 text-sm font-medium text-[#4338ca] dark:bg-blue-500/15 dark:text-blue-200">
                    <Sparkles className="h-4 w-4" />
                    <span>Auto Agent</span>
                  </div>
                )}
                {isPresetAgentSelection && selectedAgentPreset?.type === "text" ? (
                  <div className="inline-flex items-center rounded-full bg-[#f4f5f7] px-3 py-1.5 text-xs text-[#5b6472] dark:bg-white/8 dark:text-zinc-300">
                    可上传图片做分析，也可直接输入文案需求
                  </div>
                ) : hasAgentUploadSlots ? (
                  <div className="inline-flex items-center rounded-full bg-[#f4f5f7] px-3 py-1.5 text-xs text-[#5b6472] dark:bg-white/8 dark:text-zinc-300">
                    {isWorkspacePresentation ? "请确认产品图1、产品图2、模特图槽位" : "请上传产品图1、产品图2、模特图"}
                  </div>
                ) : null}
              </div>
            )}
            {shouldShowAgentProgressCard && activeAgentProgress ? (
              <div
                className={cn(
                  "mb-2 rounded-2xl border px-3 py-3 shadow-sm",
                  activeAgentProgress.stage === "failed"
                    ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/10"
                    : activeAgentProgress.stage === "clarify"
                      ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/10"
                      : "border-sky-200 bg-sky-50/75 dark:border-sky-500/25 dark:bg-sky-500/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      activeAgentProgress.stage === "failed"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        : activeAgentProgress.stage === "clarify"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                    )}
                  >
                    {activeAgentProgress.stage === "failed" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : activeAgentProgress.stage === "clarify" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : activeAgentProgress.stage === "completed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#243041] dark:text-zinc-100">
                        {agentProgressTitle}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[#5b6472] dark:bg-white/10 dark:text-zinc-300">
                        {AGENT_PROGRESS_STEPS.find(
                          (step) => step.key === activeAgentProgress.currentStep
                        )?.label || "处理中"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#5b6472] dark:text-zinc-300">
                      {agentProgressMessage}
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {agentProgressSteps.map((step) => (
                        <div
                          key={step.key}
                          className={cn(
                            "rounded-xl border px-2 py-2 text-center",
                            step.state === "completed"
                              ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/10"
                              : step.state === "current"
                                ? "border-sky-200 bg-white/90 dark:border-sky-500/25 dark:bg-sky-500/10"
                                : step.state === "failed"
                                  ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/10"
                                  : "border-white/70 bg-white/55 dark:border-white/10 dark:bg-white/5"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            {step.state === "completed" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : step.state === "failed" ? (
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                            ) : step.state === "current" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-[#cbd5e1] dark:bg-zinc-600" />
                            )}
                          </div>
                          <div className="mt-1 text-[10px] font-medium leading-4 text-[#52606d] dark:text-zinc-300">
                            {step.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {shouldShowAgentTargetLockCard && activeAgentTargetLock ? (
              <div
                className={cn(
                  "mb-2 rounded-2xl border px-3 py-3 shadow-sm",
                  activeAgentTargetLock.stage === "clarify"
                    ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/10"
                    : "border-brand-selection/20 bg-brand-accent/10 dark:border-brand-selection/25 dark:bg-brand-accent/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      activeAgentTargetLock.stage === "clarify"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        : "bg-brand-accent/15 text-brand-selection dark:bg-brand-accent/15 dark:text-brand-selection"
                    )}
                  >
                    {activeAgentTargetLock.stage === "clarify" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : activeAgentTargetLock.stage === "locked" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#243041] dark:text-zinc-100">
                        {agentTargetLockTitle}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[#5b6472] dark:bg-white/10 dark:text-zinc-300">
                        {agentTargetResolutionLabel}
                      </span>
                      {Number(activeAgentTargetLock.confidence || 0) > 0 ? (
                        <span className="text-[11px] text-[#6b7280] dark:text-zinc-400">
                          置信度 {Math.max(0, Math.round(Number(activeAgentTargetLock.confidence || 0)))}%
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "mt-1 whitespace-pre-wrap text-xs leading-5",
                        activeAgentTargetLock.stage === "clarify"
                          ? "text-[#8a5a14] dark:text-amber-200"
                          : "text-[#5b6472] dark:text-zinc-300"
                      )}
                    >
                      {agentTargetLockPrimaryMessage}
                    </div>
                    {agentTargetLockSecondaryMessage ? (
                      <div className="mt-1 text-[11px] leading-5 text-[#6b7280] dark:text-zinc-400">
                        系统依据：{agentTargetLockSecondaryMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
                {agentTargetLockPreviewItems.length > 0 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {agentTargetLockPreviewItems.map((item, index) => (
                      <div
                        key={`${item.url}-${item.nodeId || index}`}
                        className="w-[86px] shrink-0"
                        title={
                          item.title
                            ? `${item.positionLabel || `第${index + 1}张`} ${item.title}`
                            : item.positionLabel || `第${index + 1}张`
                        }
                      >
                        <div className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                          <img
                            src={buildPreviewImageUrl(item.url, 160)}
                            alt={item.title || item.positionLabel || `目标图 ${index + 1}`}
                            className="h-[64px] w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.src !== item.url) {
                                event.currentTarget.src = item.url;
                              }
                            }}
                          />
                        </div>
                        <div className="mt-1 truncate text-[11px] font-medium text-[#334155]">
                          {item.positionLabel || `第${index + 1}张`}
                        </div>
                        <div className="truncate text-[10px] text-[#6b7280]">
                          {item.title || (item.isSelected ? "当前选中图" : "画布候选图")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {!isWorkspacePresentation && !isDetailGenerationMode && !isVideoWorkspace && activeComposerMode === "image" ? (
              <button
                type="button"
                className={cn(
                  "mx-4 mt-3 flex h-[70px] w-14 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[2px] bg-black/[0.05] text-[#8a96a3] transition-colors hover:bg-black/[0.07] hover:text-[#536471] dark:bg-white/8 dark:text-zinc-400 dark:hover:bg-white/12",
                  forceLightPanelTone && "!bg-black/[0.05] !text-[#8a96a3] hover:!bg-black/[0.07] hover:!text-[#536471]"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                title="添加参考图"
              >
                {attachments[0]?.url ? (
                  <img
                    src={buildPreviewImageUrl(attachments[0].url, 180)}
                    alt={attachments[0].name || "参考图"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      if (event.currentTarget.src !== attachments[0]?.url) {
                        event.currentTarget.src = attachments[0]?.url || "";
                      }
                    }}
                  />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[13px] font-medium leading-none">参考图</span>
                  </>
                )}
              </button>
            ) : null}
            <div
              className={cn(
                isWorkspacePresentation || isDetailGenerationMode || isVideoWorkspace
                  ? "px-1"
                  : "px-4 pt-3"
              )}
            >
              <div
                ref={textareaRef as any}
                contentEditable={!isSubmitting}
                suppressContentEditableWarning
                className={cn(
                  "max-h-[128px] overflow-y-auto outline-none empty:before:content-[attr(data-placeholder)]",
                  isWorkspacePresentation || isDetailGenerationMode || isVideoWorkspace
                    ? "min-h-[36px] text-[14px] leading-[22px]"
                    : activeComposerMode === "image"
                      ? "min-h-[40px] text-[14px] leading-[22px]"
                      : "min-h-[56px] text-[14px] leading-[22px]",
                  isVideoWorkspace
                    ? "text-foreground empty:before:text-muted-foreground/70"
                    : "text-[#1f2328] empty:before:text-[#a8abb2] dark:text-zinc-100 dark:empty:before:text-zinc-500",
                  forceLightPanelTone && "!text-[#1f2328] empty:before:!text-[#a8abb2]"
                )}
                data-placeholder={composerPlaceholder}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  const removeButton = target.closest('[data-attachment-remove]');
                  if (!removeButton) return;

                  const tagSpan = removeButton.closest(
                    '[data-attachment-url]'
                  ) as HTMLElement | null;
                  if (!tagSpan) return;

                  event.preventDefault();
                  event.stopPropagation();
                  removeAttachmentByTagElement(tagSpan);
                  tagSpan.remove();
                  setTagPreview(null);
                }}
                onInput={(e) => {
                  // 从 contenteditable 中提取纯文本（排除附件标签文本）
                  const target = e.target as HTMLDivElement;
                  const clone = target.cloneNode(true) as HTMLDivElement;
                  clone.querySelectorAll("[data-attachment-url]").forEach((el) => el.remove());
                  const textContent = (clone.textContent || "")
                    .replace(/\u200b/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                  setInput(textContent);
                  if ((!isVideoModel || videoFrameSlots.length === 0) && !hasAgentUploadSlots) {
                    syncAttachmentsWithEditor(target);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // 🆕 详情模式下，Enter 键默认不直接发送，防止误触。除非使用 Meta+Enter 或 Ctrl+Enter（这里先不处理组合键，仅禁用单键发送）
                    // 或者如果用户习惯了 Enter 发送，可以保持，但考虑到详情生成成本较高，也许需要确认？
                    // 暂且保持一致，如果用户在详情模式下按 Enter，也触发 handleSend（内部会做校验）
                    handleSend();
                  }
                  // 处理 Backspace 删除图片标签（只删除聊天框中的标签，不影响画布）
                  if (e.key === 'Backspace' && (!isVideoModel || videoFrameSlots.length === 0) && !hasAgentUploadSlots) {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      if (range.collapsed && range.startOffset === 0) {
                        // 检查前一个兄弟节点是否是图片标签
                        const prevSibling = range.startContainer.previousSibling as HTMLElement;
                        if (prevSibling && prevSibling.getAttribute?.('data-attachment-url')) {
                          e.preventDefault();
                          e.stopPropagation(); // 阻止事件冒泡，防止触发全局删除
                          // 使用 URL 来删除附件，更可靠
                          removeAttachmentByTagElement(prevSibling);
                          prevSibling.remove();
                        }
                      }
                    }
                  }
                }}
                onPaste={(e) => {
                  if (handleCopiedUserMessagePaste(e)) {
                    return;
                  }

                  const clipboardItems = Array.from(e.clipboardData?.items || []);
                  const imageFiles = clipboardItems
                    .filter((item) => item.type.startsWith("image/"))
                    .map((item) => item.getAsFile())
                    .filter((file): file is File => Boolean(file));

                  if (imageFiles.length > 0) {
                    e.preventDefault();
                    void handlePastedImages(imageFiles);
                    return;
                  }

                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                }}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              />
            </div>
          </div>

          {hasAgentUploadSlots && (
            <div className="mb-3 px-3 pb-1">
              <div className="flex flex-row gap-2 overflow-x-auto scrollbar-hide">
                {agentUploadSlots.map((slot, index) => {
                  const slotAttachment = attachments[index];
                  const isUploading = agentSlotUploading === index;
                  const isDisabled = isLoading || (index > 0 && !attachments[index - 1]);
                  return (
                    <button
                      key={`canvas-agent-slot-${slot.slotIndex}-${index}`}
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        if (fillAgentSlotFromCanvasSelection(index)) {
                          toast.success(`${slot.label}已从画布填充`);
                          return;
                        }
                        agentSlotInputRefs.current[index]?.click();
                      }}
                      className={cn(
                        "group relative flex h-24 min-w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 text-muted-foreground transition-colors",
                        !isDisabled && "cursor-pointer hover:border-primary/60 hover:bg-muted/50",
                        isDisabled && "cursor-not-allowed opacity-55"
                      )}
                    >
                      {slotAttachment ? (
                        <>
                          <img
                            src={buildPreviewImageUrl(slotAttachment.url, 256)}
                            alt={slotAttachment.name || slot.label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.src !== slotAttachment.url) {
                                event.currentTarget.src = slotAttachment.url;
                              }
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[11px] text-white">
                            {slot.label}
                          </div>
                          <div
                            className="absolute right-1 top-1 rounded-full bg-black/65 px-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateAttachmentAtAgentSlot(index, null);
                            }}
                          >
                            x
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 px-1">
                          <span className="text-xl leading-none">+</span>
                          <span className="text-center text-xs">{isUploading ? "上传中" : slot.label}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                Agent 需要上传 3 张图片：产品图1、产品图2、模特图；已选主 SKU / 搭配 SKU 的素材图会优先进入前两个产品槽位，模特图继续手动上传或替换。
              </div>
            </div>
          )}

          {isVideoModel && videoFrameSlots.length > 0 && (
            <div className="mb-3 px-3 pb-1">
              <div className="flex flex-row gap-2">
                {videoFrameSlots.map((label, index) => {
                  const slotAttachment = attachments[index];
                  const isUploading = videoSlotUploading === index;
                  const isDisabled = isLoading || (index > 0 && !attachments[index - 1]);
                  return (
                    <button
                      key={`canvas-video-slot-${label}-${index}`}
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        if (fillVideoSlotFromCanvasSelection(index)) {
                          toast.success(`${label}已从画布填充`);
                          return;
                        }
                        videoSlotInputRefs.current[index]?.click();
                      }}
                      className={cn(
                        "group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 text-muted-foreground transition-colors",
                        !isDisabled && "cursor-pointer hover:border-primary/60 hover:bg-muted/50",
                        isDisabled && "cursor-not-allowed opacity-55"
                      )}
                    >
                      {slotAttachment ? (
                        <>
                          <img
                            src={buildPreviewImageUrl(slotAttachment.url, 256)}
                            alt={slotAttachment.name || label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.src !== slotAttachment.url) {
                                event.currentTarget.src = slotAttachment.url;
                              }
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[11px] text-white">
                            {label}
                          </div>
                          <div
                            className="absolute right-1 top-1 rounded-full bg-black/65 px-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateAttachmentAtVideoSlot(index, null);
                            }}
                          >
                            x
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xl leading-none">+</span>
                          <span className="text-sm">{isUploading ? "上传中" : label}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                已选中画布图片时，点击首帧/尾帧可直接填充；未选中则打开上传。
              </div>
            </div>
          )}

          {/* Bottom Toolbar */}
          <div
            className={cn(
              "mt-auto flex min-h-[44px] items-center justify-between gap-1.5 px-3 pb-2 pt-1 dark:bg-zinc-950 sm:px-3 sm:pb-2",
              forceLightPanelTone && "!bg-white"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-1 scrollbar-hide">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              {videoFrameSlots.map((_, index) => (
                <input
                  key={`canvas-video-slot-input-${index}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(element) => {
                    videoSlotInputRefs.current[index] = element;
                  }}
                  onChange={(event) => {
                    void handleVideoSlotFileChange(index, event);
                  }}
                />
              ))}
              {agentUploadSlots.map((_, index) => (
                <input
                  key={`canvas-agent-slot-input-${index}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(element) => {
                    agentSlotInputRefs.current[index] = element;
                  }}
                  onChange={(event) => {
                    void handleAgentSlotFileChange(index, event);
                  }}
                />
              ))}
              {!isWorkspacePresentation && !isDetailGenerationMode && activeComposerMode !== "image" && (!isVideoModel || showVideoAttachmentButton) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-full border border-transparent text-[#20242a] transition-colors hover:bg-[#f3f4f6] hover:text-[#111418] dark:hover:border-zinc-500 dark:hover:bg-zinc-700/70",
                    isVideoWorkspace
                      ? "bg-background"
                      : "dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12 dark:hover:text-white",
                    forceLightPanelTone && "!bg-transparent !text-[#20242a] hover:!bg-[#f3f4f6] hover:!text-[#111418]"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  title={getToolbarItem("chatAttach").label}
                >
                  <CanvasToolbarIcon
                    className="h-4.5 w-4.5"
                    fallback={Plus}
                    item={getToolbarItem("chatAttach")}
                  />
                </Button>
              )}
              {!isWorkspacePresentation ? (
                <DropdownMenu
                  open={isComposerModeMenuOpen}
                  onOpenChange={setIsComposerModeMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "relative h-8 max-w-[122px] shrink-0 cursor-pointer rounded-[8px] px-2.5 text-[12px] font-medium outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                        isVideoWorkspace
                          ? "bg-muted/80 text-foreground hover:bg-muted dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          : "bg-[#eeeeef] text-[#20242a] hover:bg-[#e7e7e8] dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/14",
                        forceLightPanelTone && "!bg-[#eeeeef] !text-[#20242a] hover:!bg-[#e7e7e8]"
                      )}
                    >
                      <span className="flex min-w-0 items-center">
                        {activeComposerMode === "video" ? (
                          <CanvasToolbarIcon
                            className="mr-1.5 h-4 w-4 shrink-0"
                            fallback={Video}
                            item={getToolbarItem("chatModeVideoActive")}
                          />
                        ) : activeComposerMode === "detail" ? (
                          <CanvasToolbarIcon
                            className="mr-1.5 h-4 w-4 shrink-0"
                            fallback={LayoutGrid}
                            item={getToolbarItem("chatModeDetailActive")}
                          />
                        ) : activeComposerMode === "image" ? (
                          <CanvasToolbarIcon
                            className="mr-1.5 h-4 w-4 shrink-0"
                            fallback={ImagePlus}
                            item={getToolbarItem("chatModeImageActive")}
                          />
                        ) : (
                          <CanvasToolbarIcon
                            className="mr-1.5 h-4 w-4 shrink-0"
                            fallback={Bot}
                            item={null}
                          />
                        )}
                        <span className="min-w-0 truncate">{activeModeLabel}</span>
                        {isComposerModeMenuOpen ? (
                          <ChevronUp className="ml-1.5 h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0" />
                        )}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="top"
                    sideOffset={10}
                    className={cn(
                      "w-[188px] rounded-[8px] border border-[#d8dce3] bg-white p-1.5 text-[#20242a] shadow-[0_16px_36px_rgba(15,23,42,0.14)]",
                      isVideoWorkspace
                        ? "border border-border/60 bg-background/95 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                        : "dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100"
                    )}
                  >
                    {effectiveAgentEnabled ? (
                      <DropdownMenuItem
                        onClick={() => handleSelectGenerationMode("agent")}
                        className={cn(
                          "h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal [&_svg]:!size-4",
                          isVideoWorkspace
                            ? "text-foreground"
                            : "text-[#2e3238] dark:text-zinc-100",
                          activeComposerMode === "agent"
                            ? isVideoWorkspace
                              ? "bg-background"
                              : "bg-transparent dark:bg-white/10"
                            : isVideoWorkspace
                              ? "hover:bg-background/80"
                              : "hover:bg-[#f5f6f7] dark:hover:bg-white/8"
                        )}
                      >
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={Bot}
                          item={null}
                        />
                        <span className="flex-1">
                          Agent
                        </span>
                        {activeComposerMode === "agent" ? (
                          <Check className={cn("h-4 w-4", isVideoWorkspace ? "text-primary" : "text-[#1f2937]")} />
                        ) : null}
                      </DropdownMenuItem>
                    ) : null}
                    {canUseDetailGeneration ? (
                      <DropdownMenuItem
                        onClick={() => handleSelectGenerationMode("detail")}
                        className={cn(
                          "h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal [&_svg]:!size-4",
                          isVideoWorkspace
                            ? "text-foreground"
                            : "text-[#2e3238] dark:text-zinc-100",
                          activeComposerMode === "detail"
                            ? isVideoWorkspace
                              ? "bg-background"
                              : "bg-transparent dark:bg-white/10"
                            : isVideoWorkspace
                              ? "hover:bg-background/80"
                              : "hover:bg-[#f5f6f7] dark:hover:bg-white/8"
                        )}
                      >
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={LayoutGrid}
                          item={getToolbarItem("chatModeDetailMenu")}
                        />
                        <span className="flex-1">
                          {getToolbarItem("chatModeDetailMenu").label}
                        </span>
                        {activeComposerMode === "detail" ? (
                          <Check className={cn("h-4 w-4", isVideoWorkspace ? "text-primary" : "text-[#1f2937]")} />
                        ) : null}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      onClick={() => handleSelectGenerationMode("image")}
                      className={cn(
                        "h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal [&_svg]:!size-4",
                        isVideoWorkspace
                          ? "text-foreground"
                          : "text-[#2e3238] dark:text-zinc-100",
                        activeComposerMode === "image"
                          ? isVideoWorkspace
                            ? "bg-background"
                            : "bg-transparent dark:bg-white/10"
                          : isVideoWorkspace
                            ? "hover:bg-background/80"
                            : "hover:bg-[#f5f6f7] dark:hover:bg-white/8"
                      )}
                    >
                      <CanvasToolbarIcon
                        className="h-4 w-4"
                        fallback={ImagePlus}
                        item={getToolbarItem("chatModeImageMenu")}
                      />
                      <span className="flex-1">
                        图像
                      </span>
                      {activeComposerMode === "image" ? (
                        <Check className={cn("h-4 w-4", isVideoWorkspace ? "text-primary" : "text-[#1f2937]")} />
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSelectGenerationMode("video")}
                      className={cn(
                        "h-8 cursor-pointer rounded-[6px] px-2.5 text-[12px] font-normal [&_svg]:!size-4",
                        isVideoWorkspace
                          ? "text-foreground"
                          : "text-[#2e3238] dark:text-zinc-100",
                        activeComposerMode === "video"
                          ? isVideoWorkspace
                            ? "bg-background"
                            : "bg-transparent dark:bg-white/10"
                          : isVideoWorkspace
                            ? "hover:bg-background/80"
                            : "hover:bg-[#f5f6f7] dark:hover:bg-white/8"
                      )}
                    >
                      <CanvasToolbarIcon
                        className="h-4 w-4"
                        fallback={Video}
                        item={getToolbarItem("chatModeVideoMenu")}
                      />
                      <span className="flex-1">
                        视频
                      </span>
                      {activeComposerMode === "video" ? (
                        <Check className={cn("h-4 w-4", isVideoWorkspace ? "text-primary" : "text-[#1f2937]")} />
                      ) : null}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {isVideoModel ? (
                <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                  <div className="w-max pr-1 pl-1">
                    <VideoParamsBar
                      modelName={currentModel?.displayName}
                      initialParams={videoParams || undefined}
                      onParamsChange={handleVideoParamsChange}
                      inline={true}
                      providerType={currentModel?.providerType}
                      capabilities={currentModel?.videoToolCapability}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!isVideoModel && !isWorkspacePresentation && activeComposerMode === "image" ? (
                <ImageParamsBar
                  modelId={currentModel?.modelId}
                  modelName={currentModel?.displayName}
                  initialParams={imageParams}
                  onParamsChange={handleImageParamsChange}
                  inline={true}
                  providerType={currentModel?.providerType}
                  imageGenConfig={currentModel?.imageGenConfig || undefined}
                  hideImageCount={false}
                  hideAdvancedOptions={true}
                  inlineTheme="minimal"
                  showInlineDivider={false}
                />
              ) : null}
              {!isWorkspacePresentation && activeComposerMode !== "detail" ? (
                <Select
                  value={modelSelectValue}
                  onValueChange={handleModelSelectionChange}
                >
                  <SelectTrigger
                    className={cn(
                      "h-8 w-8 shrink-0 justify-center rounded-full p-0 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:hidden",
                      isVideoWorkspace
                        ? "border border-[#cfd8e6] bg-white/85 text-zinc-700 hover:bg-white dark:border-white/12 dark:bg-[#242529] dark:text-zinc-100 dark:hover:bg-[#2c2d33]"
                        : "border border-[#cfd4dc] bg-white text-[#20242a] dark:border-white/12 dark:bg-[#242529] dark:text-zinc-100 dark:hover:bg-[#2c2d33]",
                      forceLightPanelTone && "!border-[#cfd4dc] !bg-white !text-[#20242a] hover:!bg-white"
                    )}
                    title={getToolbarItem("chatModelSelector").label}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full leading-none",
                        isVideoWorkspace
                          ? "bg-background dark:bg-transparent"
                          : "bg-white dark:bg-transparent",
                        forceLightPanelTone && "!bg-white"
                      )}
                    >
                      {selectDisplayModel?.avatarUrl ? (
                        <img
                          src={buildPreviewImageUrl(selectDisplayModel.avatarUrl, 64)}
                          alt={selectDisplayModel.displayName || "模型头像"}
                          className="block h-full w-full object-contain"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            if (event.currentTarget.src !== selectDisplayModel.avatarUrl) {
                              event.currentTarget.src = selectDisplayModel.avatarUrl || "";
                            }
                          }}
                        />
                      ) : getToolbarItem("chatModelSelector").iconUrl ? (
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={Bot}
                          item={getToolbarItem("chatModelSelector")}
                        />
                      ) : (
                        <span
                          className={cn(
                            "flex h-full w-full items-center justify-center text-[10px] font-medium leading-none",
                            isVideoWorkspace ? "text-foreground/70 dark:text-zinc-100" : "text-[#4b5563] dark:text-zinc-100",
                            forceLightPanelTone && "!text-[#4b5563]"
                          )}
                        >
                          {(selectDisplayModel?.displayName || "A").slice(0, 1)}
                        </span>
                      )}
                    </span>
                  </SelectTrigger>
                  {renderModelSelectContent()}
                </Select>
              ) : null}

              {estimatedPointsCost ? (
                <div
                  className={cn(
                    "ml-0 flex h-7 max-w-[60px] shrink items-center gap-1 rounded-full px-2 text-[10px] sm:ml-1 sm:max-w-none sm:gap-1 sm:px-2 sm:text-[11px]",
                    isVideoWorkspace
                      ? "border border-border/60 bg-background text-muted-foreground"
                      : "bg-muted text-muted-foreground",
                    forceLightPanelTone && "!bg-muted !text-muted-foreground"
                  )}
                  title={estimatedPointsCost.title}
                >
                  <CanvasToolbarIcon
                    className="h-3 w-3"
                    fallback={Sparkles}
                    item={getToolbarItem("chatPoints")}
                  />
                  <span className="font-medium text-foreground">
                    {estimatedPointsCost.cost}
                  </span>
                  <span className="hidden sm:inline">{getToolbarItem("chatPoints").label}</span>
                </div>
              ) : null}

              <Button
                size={isWorkspacePresentation ? "default" : "icon"}
                className={cn(
                  isWorkspacePresentation
                    ? "h-10 rounded-full px-4 transition-all duration-200 flex-shrink-0"
                    : "h-8 w-8 rounded-full transition-all duration-200 flex-shrink-0",
                  isVideoWorkspace
                    ? canSend
                      ? "border border-primary/20 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "border border-border/60 bg-background text-muted-foreground hover:bg-background/90"
                    : isDetailGenerationMode
                      ? canSend
                        ? "bg-brand-accent text-brand-accent-foreground shadow-md hover:shadow-lg hover:bg-brand-accent-hover dark:bg-brand-accent dark:text-brand-accent-foreground dark:hover:bg-brand-accent-hover"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                      : canSend
                        ? "bg-brand-accent text-brand-accent-foreground shadow-none ring-0 hover:bg-brand-accent-hover dark:bg-brand-accent dark:text-brand-accent-foreground dark:hover:bg-brand-accent-hover"
                        : "bg-[#f1f1f2] text-[#b6bac2] hover:bg-[#ececee] dark:bg-[#242529] dark:text-[#777d88] dark:hover:bg-[#2c2d33]",
                  forceLightPanelTone &&
                    (canSend
                      ? "!bg-brand-accent !text-brand-accent-foreground hover:!bg-brand-accent-hover"
                      : "!bg-[#f1f1f2] !text-[#b6bac2] hover:!bg-[#ececee]")
                )}
                onClick={handleSend}
                disabled={isSubmitting || !canSend}
                title={
                  isWorkspacePresentation || isDetailGenerationMode
                    ? getToolbarItem("chatStartGeneration").label
                    : getToolbarItem("chatSend").label
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isWorkspacePresentation ? <span className="ml-2">生成中</span> : null}
                  </>
                ) : isDetailGenerationMode ? (
                  <>
                    <CanvasToolbarIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        canSend &&
                          (isVideoWorkspace || isDetailGenerationMode
                            ? "opacity-95"
                            : "opacity-95")
                      )}
                      fallback={Sparkles}
                      item={getToolbarItem("chatStartGeneration")}
                      active={canSend && (isVideoWorkspace || isDetailGenerationMode)}
                    />
                    {isWorkspacePresentation ? (
                      <span className="ml-2">
                        {getToolbarItem("chatStartGeneration").label}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <CanvasToolbarIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        canSend &&
                          (isVideoWorkspace || isDetailGenerationMode
                            ? "opacity-95"
                            : "opacity-95")
                      )}
                      fallback={ArrowUp}
                      item={getToolbarItem(
                        isWorkspacePresentation
                          ? "chatStartGeneration"
                          : "chatSend"
                      )}
                      active={canSend && (isVideoWorkspace || isDetailGenerationMode)}
                    />
                    {isWorkspacePresentation ? (
                      <span className="ml-2">
                        {getToolbarItem("chatStartGeneration").label}
                      </span>
                    ) : null}
                  </>
                )}
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {/* 🆕 标签悬停预览弹窗 - 固定显示在标签上方 */}
      {tagPreview && (() => {
        // 计算弹窗位置
        const previewWidth = 240;
        const previewHeight = 280;
        const padding = 16;

        // 简化：直接使用标签位置，在标签上方居中显示
        // tagPreview.x 是标签中心的x坐标
        // tagPreview.y 是标签顶部的y坐标
        let left = tagPreview.x - previewWidth / 2;
        let top = tagPreview.y - previewHeight - 12;

        // 确保不超出视口左边界
        if (left < padding) {
          left = padding;
        }
        // 确保不超出视口右边界
        if (typeof window !== 'undefined' && left + previewWidth > window.innerWidth - padding) {
          left = window.innerWidth - previewWidth - padding;
        }

        // 如果上方空间不够，显示在标签下方
        if (top < padding) {
          top = tagPreview.y + 36; // 标签下方
        }

        // 确保不超出视口底部
        if (typeof window !== 'undefined' && top + previewHeight > window.innerHeight - padding) {
          top = window.innerHeight - previewHeight - padding;
        }

        // 最终确保 top 不为负
        if (top < padding) {
          top = padding;
        }

        // 使用 Portal 渲染到 body，避免 backdrop-blur 影响 fixed 定位
        return createPortal(
          <div
            data-tag-preview="true"
            className="fixed z-[10001] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: left,
              top: top,
              width: previewWidth,
            }}
            onMouseEnter={() => {
              // 鼠标进入预览弹窗，取消隐藏
              if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
                previewTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              // 鼠标离开预览弹窗，隐藏
              setTagPreview(null);
            }}
          >
            {/* 图片全貌 - 使用 inline-block + 居中，让标注点相对于图片本身定位 */}
            <div className="flex justify-center bg-zinc-100 dark:bg-zinc-800">
              <div className="relative inline-block">
                <img
                  src={buildPreviewImageUrl(tagPreview.url, 720)}
                  alt={tagPreview.name}
                  className="block max-w-full max-h-[180px] h-auto"
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    if (event.currentTarget.src !== tagPreview.url) {
                      event.currentTarget.src = tagPreview.url;
                    }
                  }}
                />
                {/* 如果是物品标签，显示标注位置 */}
                {tagPreview.pickedObject && (
                  <>
                    {/* 标注点 */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${tagPreview.pickedObject.clickX * 100}%`,
                        top: `${tagPreview.pickedObject.clickY * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* 序号标记 */}
                      <div className="relative flex items-center justify-center">
                        {/* 脉冲动画背景 */}
                        <div className="absolute w-6 h-6 rounded-full bg-brand-accent/30 animate-ping" />
                        {/* 主标记点 */}
                        <div className="relative w-5 h-5 rounded-full bg-brand-accent text-brand-accent-foreground border-2 border-brand-selection shadow-lg flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-brand-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M12 2v20M2 12h20" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* 物品名称标签 */}
                    <div
                      className="absolute bg-brand-accent text-brand-accent-foreground text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap"
                      style={{
                        left: `${tagPreview.pickedObject.clickX * 100}%`,
                        top: `${tagPreview.pickedObject.clickY * 100}%`,
                        transform: 'translate(-50%, -140%)',
                      }}
                    >
                      {tagPreview.pickedObject.objectName}
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* 底部信息 */}
            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-border/30">
              <div className="text-xs font-medium text-foreground/80 truncate">
                {tagPreview.pickedObject ? tagPreview.pickedObject.objectName : tagPreview.name}
              </div>
              {tagPreview.pickedObject && (
                <div className="text-xs text-muted-foreground">
                  {tagPreview.pickedObject.objectPosition}
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
      <AlertDialog
        open={Boolean(insufficientPointsState)}
        onOpenChange={(open) => {
          if (!open) setInsufficientPointsState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>积分不足</AlertDialogTitle>
            <AlertDialogDescription>
              {insufficientPointsState
                ? `当前余额 ${insufficientPointsState.balance}，本次预计消耗 ${insufficientPointsState.expectedCost}（${insufficientPointsState.unitCost} x ${insufficientPointsState.imageCount} 张）。请先充值后再发送生图需求。`
                : "当前积分不足，请先充值后再发送生图需求。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>稍后再说</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setInsufficientPointsState(null);
                if (typeof window !== "undefined") {
                  window.location.href = "/recharge";
                }
              }}
            >
              去充值
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
