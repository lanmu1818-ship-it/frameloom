// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Crop,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  GitCompareArrows,
  ImagePlus,
  ImageOff,
  Layers,
  Loader2,
  Link2,
  MessageCirclePlus,
  MoreHorizontal,
  MoreVertical,
  MoveDiagonal,
  Palette,
  PanelTopOpen,
  Pencil,
  RefreshCw,
  RotateCcw,
  RotateCwSquare,
  Save,
  ScanSearch,
  SplitSquareHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  StickyNote,
  Trash2,
  Type,
  TextCursorInput,
  Unlink2,
  Wand2,
  WandSparkles,
  X,
  Zap,
  ZoomIn,
} from "lucide-react";
import type React from "react";
import { useParams, useRouter } from "@/src/desktop/next-navigation-shim";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import useSWR from "swr";
import { AgentExecutionSnapshotDialog } from "@/src/components/agents/AgentExecutionSnapshotDialog";
import { TextEditColorField } from "@/src/components/canvas/TextEditColorField";
import { DetailSurfaceOverlayRenderer } from "@/src/components/canvas/DetailSurfaceOverlayRenderer";
import { DetailUiDomRenderer } from "@/src/components/canvas/DetailUiDomRenderer";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { resolveLocalArchiveDisplayUrlForImageData } from "@/src/client/local-media-archive";
import {
  areImageAdjustmentsEqual,
  buildImageAdjustmentFilterStyle,
  DEFAULT_IMAGE_ADJUSTMENTS,
  ImageAdjustFloatingPanel,
  type ImageAdjustmentState,
  type ImageAdjustPanelTab,
  isDefaultImageAdjustments,
  normalizeImageAdjustments,
} from "@/src/components/canvas/nodes/image-node/image-node-adjustments";
import { ImageNodeAdjustOverlays } from "@/src/components/canvas/nodes/image-node/image-node-adjust-overlays";
import {
  ImageNodeDeferredLoadState,
  ImageNodeEmptyState,
  ImageNodeProcessingOverlay,
} from "@/src/components/canvas/nodes/image-node/image-node-empty-state";
import {
  BoxCutoutPoint,
  createCenteredCropRectForAspect,
  createCenteredCropRectFromSize,
  createNormalizedRect,
  CROP_PRESET_GROUPS,
  type CropInteractionHandle,
  type CropPanelGroupKey,
  DEFAULT_CROP_PRESET_ID,
  getCropPresetById,
  getNormalizedMinCropSize,
  updateCropRectWithPointer,
} from "@/src/components/canvas/nodes/image-node/image-node-crop";
import {
  getImageNodeTitle,
  guessNearestAspectRatio,
  normalizeImageIdentityUrl,
  normalizeImageTitle,
  normalizeMediaUrl,
  resolveRegeneratePromptSeed,
  resolveOriginalImageUrl,
  sanitizeFileName,
  triggerBrowserDownload,
} from "@/src/components/canvas/nodes/image-node/image-node-utils";
import {
  createLocalEditPromptDraftMap,
  createLocalEditReferenceImageId,
  createLocalEditRegionId,
  getLocalEditRegionsFromMetadata,
  getNormalizedRectOverlayStyle,
  isHttpImageUrl,
  LOCAL_EDIT_COLORS,
  LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION,
  LOCAL_EDIT_MAX_REGIONS,
  LOCAL_EDIT_MAX_POLL_ATTEMPTS,
  LOCAL_EDIT_METADATA_KEY,
  LOCAL_EDIT_MIN_EDGE_PX,
  LOCAL_EDIT_POLL_INTERVAL_MS,
  reindexLocalEditRegions,
  type LocalEditReferenceImage,
  type LocalEditRegion,
} from "@/src/components/canvas/nodes/image-node/image-node-local-edit";
import { PromptRegenerateDialog } from "@/src/components/canvas/nodes/image-node/image-node-dialogs";
import { ImageNodeSelectedTitle } from "@/src/components/canvas/nodes/image-node/image-node-title";
import { ImageAnnotator } from "@/src/components/image-annotator";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Slider } from "@/src/components/ui/slider";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import { apiFetch } from "@/src/client/api";
import type { DetailUiDslV2Document } from "@/src/lib/detail-ui-dsl-v2";
import { buildDetailUiDslV2 } from "@/src/lib/detail-ui-dsl-v2-builder";
import {
  type DetailUiSubjectAnalysis,
  normalizeDetailUiSubjectAnalysis,
} from "@/src/lib/detail-ui-subject-analysis";
import type { DetailUiScreenOverlaySnapshot } from "@/src/lib/detail-ui-surface-adapter";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import {
  calculateImageEnhancePointsEstimate,
  defaultPointsSystemConfig,
  getImageToolCreditCost,
  normalizePointsSystemConfig,
  type ImageToolCreditFeature,
  type PointsSystemConfig,
} from "@/src/lib/points/config";
import {
  getNodeContentScale,
  getScaledNodeContentStyle,
} from "@/src/lib/canvas/node-content-scale";
import {
  getSelectedImageInlineActionCount,
  getCanvasToolbarItem,
  isCanvasToolbarItemEnabled,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import { normalizeOptionalHexColor } from "@/src/lib/canvas/text-edit-colors";
import { isCanvasImageUploadPending } from "@/src/lib/canvas/local-upload-state";
import { cn, fetcher } from "@/src/lib/utils";
import type {
  CanvasTextEditPayloadItem,
  NormalizedCropRect,
} from "@/src/services/canvas/index";
import {
  canvasService,
  imageGenerationService,
} from "@/src/services/canvas/index";
import type { PickedObject } from "@/src/store/canvas/index";
import { useCanvasStore } from "@/src/store/canvas/index";
import type {
  CanvasNode,
  ImageNodeData,
  ImageTextEditItem,
} from "@/types/canvas/index";

// 已标注的物品标记（本地状态）
interface PickedMarker {
  clickX: number;
  clickY: number;
  objectName: string;
  index: number;
}

interface ImageDisplayMetrics {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface ImageOverlayRectStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LayerSplitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  coverage: number;
}

function normalizeImageArchiveId(value: unknown) {
  const id = String(value || "").trim();
  if (!id || id.length > 128) {
    return undefined;
  }
  return id;
}

function getImageArchiveIdentityPatch(
  value: unknown
): {
  assetId?: string;
  metadata: Record<string, unknown>;
} {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const mediaAssetId = normalizeImageArchiveId(
    record.mediaAssetId || record.media_asset_id || record.assetId || record.asset_id
  );
  const generatedImageId = normalizeImageArchiveId(
    record.generatedImageId || record.generated_image_id
  );
  const thumbnailUrl =
    typeof record.thumbnailUrl === "string" && record.thumbnailUrl.trim()
      ? record.thumbnailUrl.trim()
      : typeof record.thumbnail_url === "string" && record.thumbnail_url.trim()
        ? record.thumbnail_url.trim()
        : undefined;

  return {
    ...(mediaAssetId ? { assetId: mediaAssetId } : {}),
    metadata: {
      ...(mediaAssetId ? { mediaAssetId } : {}),
      ...(generatedImageId
        ? {
            generatedImageId,
            sourceTable: "GeneratedImage",
            sourceRowId: generatedImageId,
          }
        : {}),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    },
  };
}

const AI_CLOUD_IMAGE_ACTIONS = new Set([
  "rmbg",
  "watermark",
  "enhance",
  "extend",
  "layer-split",
  "box-cutout",
  "local-edit",
  "text-edit",
  "prompt-regenerate",
]);

type MembershipSummaryResponse = {
  isHighVip?: boolean;
  pointsSystemConfig?: PointsSystemConfig;
};

type ImageActionCreditBadgeProps = {
  label?: string | null;
  compact?: boolean;
  className?: string;
};

function formatPointAmount(value: number) {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return normalized.toLocaleString("en-US");
}

function formatImageNodeFeatureCostLabel({
  cost,
  isHighVip,
  pointsEnabled,
}: {
  cost: number;
  isHighVip?: boolean;
  pointsEnabled: boolean;
}) {
  if (!pointsEnabled) return "不扣积分";
  if (isHighVip) return "VIP免费";
  if (cost <= 0) return "免费";
  return `${formatPointAmount(cost)} 积分`;
}

function formatImageNodeFeatureCostShortLabel({
  cost,
  isHighVip,
  pointsEnabled,
}: {
  cost: number;
  isHighVip?: boolean;
  pointsEnabled: boolean;
}) {
  if (!pointsEnabled) return null;
  if (isHighVip) return "VIP";
  if (cost <= 0) return "0";
  return formatPointAmount(cost);
}

function ImageActionCreditBadge({
  className,
  compact = false,
  label,
}: ImageActionCreditBadgeProps) {
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white shadow-sm dark:bg-white dark:text-slate-950",
        compact
          ? "pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          : "ml-auto",
        className
      )}
      title={label}
    >
      <Zap className="h-3 w-3 fill-current" />
      {label}
    </span>
  );
}

type AngleEditPanelMode = "subject" | "camera";
type FlipRotateEditAction = "horizontal" | "vertical" | "reset";
type CropInteractionState = {
  handle: CropInteractionHandle;
  pointerId: number;
  startPoint: BoxCutoutPoint;
  startRect: NormalizedCropRect;
};

type LocalEditRegionInteractionState = {
  handle: CropInteractionHandle;
  pointerId: number;
  regionId: string;
  startPoint: BoxCutoutPoint;
  startRect: NormalizedCropRect;
};

type AnglePreviewDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startHorizontalAngle: number;
  startVerticalAngle: number;
};

const BOX_CUTOUT_DEFAULT_PADDING_RATIO = 0.08;
const BOX_CUTOUT_MIN_EDGE_PX = 24;
// 98K does not currently provide the point-based object recognition API this UI needs.
const PICK_OBJECT_FEATURE_ENABLED = false;
const isLocalEditControlTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('[data-local-edit-control="true"]'));
const FLOATING_TOOLBAR_SCALE = 0.8;
const IMAGE_EDIT_PANEL_SCALE = 0.5;
const ANGLE_PANEL_SCALE = 0.65;
const ANGLE_PREVIEW_HORIZONTAL_DRAG_MULTIPLIER = 0.72;
const ANGLE_PREVIEW_VERTICAL_DRAG_MULTIPLIER = 0.46;
const ANGLE_PANEL_SOURCE_WIDTH = 520;
const ANGLE_PANEL_SOURCE_HEIGHT = 700;
const parseAttachmentFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) return "";
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch (_error) {
      return encodedMatch[1];
    }
  }
  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || "";
};
const ANGLE_PANEL_PREVIEW_SIZE = 392;
const ANGLE_PANEL_CAMERA_SCENE_SIZE = 384;
const ANGLE_PANEL_WIREFRAME_RADIUS = 132;
const ANGLE_PANEL_WIREFRAME_DIAMETER = ANGLE_PANEL_WIREFRAME_RADIUS * 2;
const ANGLE_PREVIEW_VERTICAL_RING_ROTATIONS = [
  0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165,
];
const ANGLE_PREVIEW_HORIZONTAL_RING_ROTATIONS = [
  -78, -56, -34, -14, 0, 14, 34, 56, 78,
];
const ANGLE_PREVIEW_DIAGONAL_RING_ROTATIONS = [-62, -40, -18, 8, 34, 58];
const normalizeAnglePanelHorizontalAngle = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 360 + value : value;
};

const mapAnglePanelZoomToApi = (value: number) => {
  const safeValue = Math.max(
    0,
    Math.min(100, Number.isFinite(value) ? value : 50)
  );
  return Number((1 + (safeValue / 100) * 8).toFixed(1));
};

const formatAnglePanelZoomLabel = (value: number) => {
  if (value <= 32) return "远景";
  if (value >= 68) return "近景";
  return "中等";
};

function AngleEditPanelSlider({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[17px] font-semibold tracking-[0] text-[#26272b]">
          {label}
        </span>
        <span className="text-[16px] font-medium tabular-nums text-[#7d7f86]">
          {valueLabel}
        </span>
      </div>
      <Slider
        className="w-full"
        max={max}
        min={min}
        onValueChange={([nextValue]) => onChange(nextValue ?? value)}
        rangeClassName="bg-[#2d3035]"
        step={step}
        thumbClassName="h-5 w-5 border-[4px] border-[#2d3035] bg-white shadow-[0_2px_10px_rgba(24,24,27,0.14)]"
        trackClassName="h-[4px] bg-[#e7e8ec]"
        value={[value]}
      />
    </div>
  );
}

function AngleCameraModelGlyph() {
  return (
    <div className="absolute left-1/2 top-1/2 h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]">
      <div className="absolute left-[3px] top-[8px] h-[13px] w-[18px] rounded-[5px] border border-[#6a707a] bg-[linear-gradient(180deg,#f9fafc,#dce2ea)] shadow-[0_2px_6px_rgba(15,23,42,0.12)]" />
      <div className="absolute left-[6px] top-[5px] h-[5px] w-[8px] rounded-[3px] border border-[#6f7680] bg-[linear-gradient(180deg,#ffffff,#e1e6ee)]" />
      <div className="absolute left-[11px] top-[11px] h-[7px] w-[7px] rounded-full border border-[#5d636d] bg-[radial-gradient(circle_at_35%_35%,#fefefe_0%,#d7dde6_38%,#8c95a1_65%,#5c6470_100%)]" />
      <div className="absolute left-[18px] top-[11px] h-[2px] w-[2px] rounded-full bg-[#69707b]" />
      <div className="absolute left-[6px] top-[10px] h-[9px] w-[2px] rounded-full bg-[#c4ccd7]" />
    </div>
  );
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const fitSizeWithinBox = ({
  maxHeight,
  maxWidth,
  minHeight = 72,
  minWidth = 72,
  sourceHeight,
  sourceWidth,
}: {
  maxHeight: number;
  maxWidth: number;
  minHeight?: number;
  minWidth?: number;
  sourceHeight: number;
  sourceWidth: number;
}) => {
  const safeSourceWidth = sourceWidth > 0 ? sourceWidth : maxWidth;
  const safeSourceHeight = sourceHeight > 0 ? sourceHeight : maxHeight;
  let scale = Math.min(maxWidth / safeSourceWidth, maxHeight / safeSourceHeight);
  let fittedWidth = safeSourceWidth * scale;
  let fittedHeight = safeSourceHeight * scale;

  if (fittedWidth < minWidth) {
    scale = minWidth / safeSourceWidth;
    fittedWidth = safeSourceWidth * scale;
    fittedHeight = safeSourceHeight * scale;
  }

  if (fittedHeight < minHeight) {
    scale = minHeight / safeSourceHeight;
    fittedWidth = safeSourceWidth * scale;
    fittedHeight = safeSourceHeight * scale;
  }

  if (fittedWidth > maxWidth || fittedHeight > maxHeight) {
    scale = Math.min(maxWidth / fittedWidth, maxHeight / fittedHeight);
    fittedWidth *= scale;
    fittedHeight *= scale;
  }

  return {
    width: Math.round(fittedWidth),
    height: Math.round(fittedHeight),
  };
};

const normalizeTextEditItems = (
  items: ImageTextEditItem[] | undefined
): ImageTextEditItem[] => {
  if (!items || items.length === 0) return [];

  return items
    .map((item, index) => {
      const originalText = (item.originalText || "").trim();
      if (!originalText) return null;

      return {
        id: item.id || String(index + 1),
        originalText,
        editedText: (item.editedText || item.originalText || "").trim(),
        textColor: normalizeOptionalHexColor(item.textColor),
        confidence: item.confidence,
      } as ImageTextEditItem;
    })
    .filter((item): item is ImageTextEditItem => !!item);
};

const CHAT_ATTACHMENT_MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const CHAT_ATTACHMENT_MAX_DATA_URL_LENGTH = 42 * 1024 * 1024;

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

function getChatAttachmentExtension(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("svg")) return "svg";
  return "jpg";
}

function normalizeChatAttachmentFileName(name: string, mimeType: string) {
  const baseName =
    String(name || "canvas-image")
      .trim()
      .replace(/\.[^.]+$/, "")
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "canvas-image";
  return `${baseName}-${Date.now()}.${getChatAttachmentExtension(mimeType)}`;
}

async function uploadChatAttachmentBlob(blob: Blob, displayName: string) {
  const uploadBlob = blob.type ? blob : new Blob([blob], { type: "image/jpeg" });

  if (!uploadBlob.type.startsWith("image/")) {
    throw new Error("只能添加图片到对话");
  }

  if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(uploadBlob.type)) {
    throw new Error("暂只支持 JPG、PNG、WebP 图片添加到对话");
  }

  if (uploadBlob.size > CHAT_ATTACHMENT_MAX_UPLOAD_BYTES) {
    throw new Error("图片过大，请先压缩后再添加到对话");
  }

  const formData = new FormData();
  const contentType = uploadBlob.type || "image/jpeg";
  formData.append("file", uploadBlob, normalizeChatAttachmentFileName(displayName, contentType));
  formData.append("purpose", "canvas-upload");

  const response = await fetchUploadWithRetry(formData);
  if (!response.ok) {
    throw await createUploadErrorFromResponse(
      response,
      "图片上传失败，请稍后重试"
    );
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const uploadedUrl = String(payload?.url || "").trim();
  if (!isHttpImageUrl(uploadedUrl)) {
    throw new Error("图片上传后未返回可用地址");
  }

  return {
    url: uploadedUrl,
    contentType,
  };
}

async function resolveChatAttachmentFromImageSrc(src: string, displayName: string) {
  const trimmedSrc = String(src || "").trim();
  if (!trimmedSrc) {
    throw new Error("当前图片地址不可用");
  }

  if (isHttpImageUrl(trimmedSrc)) {
    return {
      url: trimmedSrc,
      contentType: "image/jpeg",
    };
  }

  if (trimmedSrc.startsWith("data:image/")) {
    if (trimmedSrc.length > CHAT_ATTACHMENT_MAX_DATA_URL_LENGTH) {
      throw new Error("图片数据过大，请先下载压缩后再添加到对话");
    }
    const blob = await fetch(trimmedSrc).then((response) => response.blob());
    return uploadChatAttachmentBlob(blob, displayName);
  }

  if (trimmedSrc.startsWith("blob:")) {
    const blob = await fetch(trimmedSrc).then((response) => response.blob());
    return uploadChatAttachmentBlob(blob, displayName);
  }

  throw new Error("当前图片地址不可直接加入对话，请重新上传图片");
}

async function renderAndUploadFlippedImage(
  imageSrc: string,
  action: Exclude<FlipRotateEditAction, "reset">,
  displayName: string
) {
  const sourceUrl = buildImageProxyUrl(String(imageSrc || "").trim(), {
    delivery: "proxy",
  });
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error("读取原图失败，请稍后重试");
  }

  const sourceBlob = await response.blob();
  const objectUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = objectUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      throw new Error("图片尺寸无效，无法执行翻转");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建画布上下文");
    }

    ctx.save();
    if (action === "horizontal") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();

    const outputType = ["image/png", "image/jpeg", "image/webp"].includes(
      sourceBlob.type
    )
      ? sourceBlob.type
      : "image/png";

    const transformedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("导出翻转图片失败"));
        },
        outputType,
        outputType === "image/jpeg" || outputType === "image/webp"
          ? 0.96
          : undefined
      );
    });

    const uploadResult = await uploadChatAttachmentBlob(
      transformedBlob,
      displayName
    );
    return uploadResult.url;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderAndUploadCroppedImage(
  imageSrc: string,
  cropRect: NormalizedCropRect,
  displayName: string
) {
  const sourceUrl = buildImageProxyUrl(String(imageSrc || "").trim(), {
    delivery: "proxy",
  });
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error("读取原图失败，请稍后重试");
  }

  const sourceBlob = await response.blob();
  const objectUrl = URL.createObjectURL(sourceBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = objectUrl;
    });

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) {
      throw new Error("图片尺寸无效，无法执行裁剪");
    }

    const left = Math.round(clampNumber(cropRect.x, 0, 1) * naturalWidth);
    const top = Math.round(clampNumber(cropRect.y, 0, 1) * naturalHeight);
    const width = Math.max(
      BOX_CUTOUT_MIN_EDGE_PX,
      Math.round(clampNumber(cropRect.width, 0, 1) * naturalWidth)
    );
    const height = Math.max(
      BOX_CUTOUT_MIN_EDGE_PX,
      Math.round(clampNumber(cropRect.height, 0, 1) * naturalHeight)
    );

    const safeWidth = Math.min(width, naturalWidth - left);
    const safeHeight = Math.min(height, naturalHeight - top);
    if (safeWidth <= 0 || safeHeight <= 0) {
      throw new Error("裁剪区域无效，请重新调整");
    }

    const canvas = document.createElement("canvas");
    canvas.width = safeWidth;
    canvas.height = safeHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建画布上下文");
    }

    ctx.drawImage(
      image,
      left,
      top,
      safeWidth,
      safeHeight,
      0,
      0,
      safeWidth,
      safeHeight
    );

    const outputType = ["image/png", "image/jpeg", "image/webp"].includes(
      sourceBlob.type
    )
      ? sourceBlob.type
      : "image/png";

    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("导出裁剪图片失败"));
        },
        outputType,
        outputType === "image/jpeg" || outputType === "image/webp"
          ? 0.96
          : undefined
      );
    });

    const uploadResult = await uploadChatAttachmentBlob(croppedBlob, displayName);
    return {
      url: uploadResult.url,
      width: safeWidth,
      height: safeHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 在图片上绘制标记点，返回带标记的图片 base64
 */
async function drawMarkerOnImage(
  imageUrl: string,
  clickX: number,
  clickY: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loadUrl = buildImageProxyUrl(imageUrl, { delivery: "proxy" });

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      // 压缩图片尺寸（最大 800px）
      const maxSize = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 计算标记位置
      const markerX = clickX * width;
      const markerY = clickY * height;
      const markerRadius = Math.max(12, Math.min(width, height) * 0.025);

      // 绘制红色标记
      ctx.beginPath();
      ctx.arc(markerX, markerY, markerRadius + 3, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#FF0000";
      ctx.fill();

      // 绘制十字线
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(markerX - markerRadius * 2, markerY);
      ctx.lineTo(markerX - markerRadius - 2, markerY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(markerX + markerRadius + 2, markerY);
      ctx.lineTo(markerX + markerRadius * 2, markerY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(markerX, markerY - markerRadius * 2);
      ctx.lineTo(markerX, markerY - markerRadius - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(markerX, markerY + markerRadius + 2);
      ctx.lineTo(markerX, markerY + markerRadius * 2);
      ctx.stroke();

      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };

    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = loadUrl;
  });
}

interface ImageNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isLayerSplitEnabled?: boolean;
  canvasToolbarConfig?: CanvasToolbarConfig;
  angleEditEnabled?: boolean;
}

export function ImageNode({
  node,
  isSelected,
  isLayerSplitEnabled = false,
  canvasToolbarConfig,
  angleEditEnabled = false,
}: ImageNodeProps) {
  const router = useRouter();
  const routeParams = useParams();
  const canvasId = Array.isArray(routeParams?.id)
    ? routeParams.id[0] || ""
    : typeof routeParams?.id === "string"
      ? routeParams.id
      : "";
  const data = node.data as ImageNodeData;
  const { data: membershipSummary } = useSWR<MembershipSummaryResponse>(
    "/api/user/membership-summary",
    fetcher
  );
  const imageNodeMoreItem = getCanvasToolbarItem(canvasToolbarConfig, "imageNodeMore");
  const imageAddToChatItem = getCanvasToolbarItem(canvasToolbarConfig, "imageAddToChat");
  const imagePickObjectItem = getCanvasToolbarItem(canvasToolbarConfig, "imagePickObject");
  const imageEnhanceItem = getCanvasToolbarItem(canvasToolbarConfig, "imageEnhance");
  const imageRemoveBackgroundItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageRemoveBackground"
  );
  const imageBoxCutoutItem = getCanvasToolbarItem(canvasToolbarConfig, "imageBoxCutout");
  const imageLocalEditItem = getCanvasToolbarItem(canvasToolbarConfig, "imageLocalEdit");
  const imageRemoveWatermarkItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageRemoveWatermark"
  );
  const imageResizeItem = getCanvasToolbarItem(canvasToolbarConfig, "imageResize");
  const imageCropItem = getCanvasToolbarItem(canvasToolbarConfig, "imageCrop");
  const imageTextEditItem = getCanvasToolbarItem(canvasToolbarConfig, "imageTextEdit");
  const imageMultiAngleItem = getCanvasToolbarItem(canvasToolbarConfig, "imageMultiAngle");
  const imageLayerSplitItem = getCanvasToolbarItem(canvasToolbarConfig, "imageLayerSplit");
  const imageExtendItem = getCanvasToolbarItem(canvasToolbarConfig, "imageExtend");
  const imageAdjustItem = getCanvasToolbarItem(canvasToolbarConfig, "imageAdjust");
  const imageFlipRotateItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageFlipRotate"
  );
  const imagePromptRegenerateItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imagePromptRegenerate"
  );
  const imageNoteItem = getCanvasToolbarItem(canvasToolbarConfig, "imageNote");
  const imageRenameItem = getCanvasToolbarItem(canvasToolbarConfig, "imageRename");
  const imageDownloadItem = getCanvasToolbarItem(canvasToolbarConfig, "imageDownload");
  const imageDeleteItem = getCanvasToolbarItem(canvasToolbarConfig, "imageDelete");
  const imageCompareItem = getCanvasToolbarItem(canvasToolbarConfig, "imageCompare");
  const imageConfirmCutoutItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageConfirmCutout"
  );
  const imageCancelCutoutItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageCancelCutout"
  );
  const imageNodeMoreEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageNodeMore"
  );
  const imageAddToChatEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageAddToChat"
  );
  const imagePickObjectEnabled =
    PICK_OBJECT_FEATURE_ENABLED &&
    isCanvasToolbarItemEnabled(canvasToolbarConfig, "imagePickObject");
  const imageRemoveBackgroundEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageRemoveBackground"
  );
  const imageRemoveWatermarkEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageRemoveWatermark"
  );
  const imageEnhanceEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageEnhance"
  );
  const imageNoteEnabled = isCanvasToolbarItemEnabled(canvasToolbarConfig, "imageNote");
  const imageBoxCutoutEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageBoxCutout"
  );
  // 局部编辑是无限画布图片的核心入口：即使旧后台工具栏配置里还没有该 key，
  // 也必须默认展示，避免历史配置把新功能吞掉。
  const imageLocalEditEnabled = true;
  const imageLayerSplitEnabledByToolbar = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageLayerSplit"
  );
  const imageResizeEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageResize"
  );
  const imageMultiAngleEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageMultiAngle"
  ) && angleEditEnabled;
  const imagePromptRegenerateEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imagePromptRegenerate"
  );
  const imageTextEditEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageTextEdit"
  );
  const imageExtendEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageExtend"
  );
  const imageCropEnabled = isCanvasToolbarItemEnabled(canvasToolbarConfig, "imageCrop");
  const imageAdjustEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageAdjust"
  );
  const imageFlipRotateEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageFlipRotate"
  );
  const imageRenameEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageRename"
  );
  const imageDownloadEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageDownload"
  );
  const imageDeleteEnabled = isCanvasToolbarItemEnabled(
    canvasToolbarConfig,
    "imageDelete"
  );
  const imageLayerSplitEnabled =
    isLayerSplitEnabled && imageLayerSplitEnabledByToolbar;
  const selectedImageInlineActionCount =
    getSelectedImageInlineActionCount(canvasToolbarConfig);
  const selectedImageToolbarActionCandidates = [
    { key: "pickObject", enabled: imagePickObjectEnabled },
    { key: "enhance", enabled: imageEnhanceEnabled },
    { key: "removeBackground", enabled: imageRemoveBackgroundEnabled },
    { key: "textEdit", enabled: imageTextEditEnabled },
    { key: "boxCutout", enabled: imageBoxCutoutEnabled },
    { key: "localEdit", enabled: imageLocalEditEnabled },
    { key: "removeWatermark", enabled: imageRemoveWatermarkEnabled },
    { key: "resize", enabled: imageResizeEnabled },
    { key: "multiAngle", enabled: imageMultiAngleEnabled },
    { key: "layerSplit", enabled: imageLayerSplitEnabled },
    { key: "extend", enabled: imageExtendEnabled },
    { key: "crop", enabled: imageCropEnabled },
    { key: "adjust", enabled: imageAdjustEnabled },
    { key: "flipRotate", enabled: imageFlipRotateEnabled },
    { key: "promptRegenerate", enabled: imagePromptRegenerateEnabled },
    { key: "note", enabled: imageNoteEnabled },
  ] as const;
  type SelectedImageToolbarActionKey =
    (typeof selectedImageToolbarActionCandidates)[number]["key"];
  const enabledSelectedImageToolbarActions =
    selectedImageToolbarActionCandidates.filter((action) => action.enabled);
  const selectedImageInlineActionKeys = new Set<SelectedImageToolbarActionKey>(
    enabledSelectedImageToolbarActions
      .slice(0, selectedImageInlineActionCount)
      .map((action) => action.key)
  );
  const selectedImageMoreActionKeys = new Set<SelectedImageToolbarActionKey>(
    enabledSelectedImageToolbarActions
      .slice(selectedImageInlineActionCount)
      .map((action) => action.key)
  );
  const isSelectedImageActionInline = (key: SelectedImageToolbarActionKey) =>
    selectedImageInlineActionKeys.has(key);
  const isSelectedImageActionInMore = (key: SelectedImageToolbarActionKey) =>
    selectedImageMoreActionKeys.has(key);
  const hasHoverImageMorePrimaryActions =
    imageRemoveBackgroundEnabled ||
    imageRemoveWatermarkEnabled ||
    imageEnhanceEnabled ||
    imageNoteEnabled ||
    (isLayerSplitEnabled && imageLayerSplitEnabledByToolbar) ||
    imageResizeEnabled ||
    imageMultiAngleEnabled ||
    imagePromptRegenerateEnabled ||
    imageTextEditEnabled ||
    imageExtendEnabled ||
    imageCropEnabled ||
    imageAdjustEnabled ||
    imageFlipRotateEnabled ||
    imageRenameEnabled;
  const hasHoverImageMoreSecondaryActions =
    imageDownloadEnabled || imageDeleteEnabled;
  const hasHoverImageMoreMenu =
    imageNodeMoreEnabled &&
    (hasHoverImageMorePrimaryActions || hasHoverImageMoreSecondaryActions);
  const hasSelectedImageMorePrimaryActions =
    selectedImageMoreActionKeys.size > 0;
  const hasSelectedImageMoreMenu =
    hasSelectedImageMorePrimaryActions ||
    (imageNodeMoreEnabled && imageDeleteEnabled);
  const hasSelectedImagePrimaryToolbarActions =
    selectedImageInlineActionKeys.size > 0;
  const hasSelectedImageSecondaryToolbarActions =
    hasSelectedImageMoreMenu || imageDownloadEnabled;
  const contentScale = useMemo(
    () =>
      getNodeContentScale(node.size, {
        width: 220,
        height: 220,
      }),
    [node.size.height, node.size.width]
  );
  const viewportZoom = useCanvasStore((state) => state.viewport.zoom);
  const nodeContentScale = contentScale * viewportZoom;
  const scaledContentStyle = useMemo(
    () => getScaledNodeContentStyle(nodeContentScale, { allowUpscale: true }),
    [nodeContentScale]
  );
  const selectedTitleStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: 12,
      lineHeight: "16px",
      top: -28,
    }),
    []
  );
  const detailProgressLabel =
    typeof data.metadata?.detailProgressLabel === "string"
      ? data.metadata.detailProgressLabel.trim()
      : "";
  const generationProgress =
    typeof data.metadata?.generationProgress === "number" &&
    Number.isFinite(data.metadata.generationProgress)
      ? Math.max(0, Math.min(100, Math.round(data.metadata.generationProgress)))
      : null;
  const recentlyGeneratedAt =
    typeof data.metadata?.recentlyGeneratedAt === "number" &&
    Number.isFinite(data.metadata.recentlyGeneratedAt)
      ? data.metadata.recentlyGeneratedAt
      : 0;
  const isRecentlyGenerated =
    Boolean(data.src) &&
    recentlyGeneratedAt > 0 &&
    Date.now() - recentlyGeneratedAt < 20_000;
  const flipRotateOriginalSrc =
    data.metadata && typeof data.metadata === "object"
      ? String((data.metadata as Record<string, unknown>).flipRotateOriginalSrc || "").trim()
      : "";
  const hasFlipRotateReset =
    flipRotateOriginalSrc.length > 0 && flipRotateOriginalSrc !== data.src;
  const storedImageAdjustments = useMemo(
    () =>
      normalizeImageAdjustments(
        data.metadata && typeof data.metadata === "object"
          ? (data.metadata as Record<string, unknown>).imageAdjustments
          : undefined
      ),
    [data.metadata]
  );
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageAdjustPanelOpen, setImageAdjustPanelOpen] = useState(false);
  const [imageAdjustTab, setImageAdjustTab] =
    useState<ImageAdjustPanelTab>("light");
  const [imageAdjustmentsDraft, setImageAdjustmentsDraft] =
    useState<ImageAdjustmentState>(storedImageAdjustments);
  const [cropPanelOpen, setCropPanelOpen] = useState(false);
  const [cropRect, setCropRect] = useState<NormalizedCropRect | null>(null);
  const [cropPresetId, setCropPresetId] = useState(DEFAULT_CROP_PRESET_ID);
  const [cropLockAspectRatio, setCropLockAspectRatio] = useState(true);
  const [cropExpandedGroups, setCropExpandedGroups] = useState<
    Record<CropPanelGroupKey, boolean>
  >({
    common: true,
    instagram: false,
    facebook: false,
    tiktok: false,
    youtube: false,
  });
  const [cropInteraction, setCropInteraction] =
    useState<CropInteractionState | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [flipRotatePanelOpen, setFlipRotatePanelOpen] = useState(false);
  const [isApplyingFlipRotate, setIsApplyingFlipRotate] = useState(false);
  const [anglePanelOpen, setAnglePanelOpen] = useState(false);
  const [anglePanelMode, setAnglePanelMode] =
    useState<AngleEditPanelMode>("camera");
  const [angleHorizontalAngle, setAngleHorizontalAngle] = useState(-50);
  const [angleVerticalAngle, setAngleVerticalAngle] = useState(-30);
  const [angleZoom, setAngleZoom] = useState(50);
  const [isApplyingAngleEdit, setIsApplyingAngleEdit] = useState(false);
  const [isAnglePreviewDragging, setIsAnglePreviewDragging] = useState(false);
  const [anglePanelOpening, setAnglePanelOpening] = useState(false);
  const [resizeAnnotatorOpen, setResizeAnnotatorOpen] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const [textEditPanelOpen, setTextEditPanelOpen] = useState(false);
  const [notePanelOpen, setNotePanelOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [textEditItems, setTextEditItems] = useState<ImageTextEditItem[]>(() =>
    normalizeTextEditItems(data.textEditItems)
  );
  const [textEditError, setTextEditError] = useState<string | null>(null);
  const [isDetectingText, setIsDetectingText] = useState(false);
  const [isApplyingTextEdit, setIsApplyingTextEdit] = useState(false);
  const [deletedTextItems, setDeletedTextItems] = useState<
    Array<{ id: string; originalText: string }>
  >([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [isAddingToChat, setIsAddingToChat] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSplitPercent, setCompareSplitPercent] = useState(50);
  const [toolbarSize, setToolbarSize] = useState({ width: 0, height: 0 });
  const [boxCutoutToolbarSize, setBoxCutoutToolbarSize] = useState({
    width: 0,
    height: 0,
  });
  const [boxCutoutMode, setBoxCutoutMode] = useState(false);
  const [isBoxCutoutDrawing, setIsBoxCutoutDrawing] = useState(false);
  const [boxCutoutSelection, setBoxCutoutSelection] =
    useState<NormalizedCropRect | null>(null);
  const [boxCutoutDragStart, setBoxCutoutDragStart] =
    useState<BoxCutoutPoint | null>(null);
  const [boxCutoutDragEnd, setBoxCutoutDragEnd] =
    useState<BoxCutoutPoint | null>(null);
  const [localEditMode, setLocalEditMode] = useState(false);
  const [localEditRegions, setLocalEditRegions] = useState<LocalEditRegion[]>(
    () => getLocalEditRegionsFromMetadata(data.metadata)
  );
  const [localEditPromptDrafts, setLocalEditPromptDrafts] = useState<
    Record<string, string>
  >({});
  const [isLocalEditDrawing, setIsLocalEditDrawing] = useState(false);
  const [localEditDragStart, setLocalEditDragStart] =
    useState<BoxCutoutPoint | null>(null);
  const [localEditDragEnd, setLocalEditDragEnd] =
    useState<BoxCutoutPoint | null>(null);
  const [localEditRegionInteraction, setLocalEditRegionInteraction] =
    useState<LocalEditRegionInteractionState | null>(null);
  const [editingLocalEditRegionId, setEditingLocalEditRegionId] =
    useState<string | null>(null);
  const [isSubmittingLocalEdit, setIsSubmittingLocalEdit] = useState(false);
  const [
    uploadingLocalEditReferenceRegionId,
    setUploadingLocalEditReferenceRegionId,
  ] = useState<string | null>(null);
  const anglePreviewDragRef = useRef<AnglePreviewDragState | null>(null);
  const activeImageAdjustments = imageAdjustPanelOpen
    ? imageAdjustmentsDraft
    : storedImageAdjustments;
  const activeImageAdjustmentsStyle = useMemo(
    () => buildImageAdjustmentFilterStyle(activeImageAdjustments),
    [activeImageAdjustments]
  );
  const hasActiveImageAdjustments = !isDefaultImageAdjustments(
    activeImageAdjustments
  );
  useEffect(() => {
    if (!imageAdjustPanelOpen) return;
    setImageAdjustmentsDraft(storedImageAdjustments);
  }, [imageAdjustPanelOpen, storedImageAdjustments, data.src]);
  useEffect(() => {
    if (!cropPanelOpen) return;
    if (cropRect) return;
    const centerX = 0.5;
    const centerY = 0.5;
    const preset = getCropPresetById(cropPresetId);
    if (preset) {
      setCropRect(createCenteredCropRectForAspect(preset.ratio, centerX, centerY));
      return;
    }
    setCropRect({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  }, [cropPanelOpen, cropPresetId, cropRect]);
  useEffect(() => {
    if (!imageAdjustPanelOpen || typeof window === "undefined") return;
    if (areImageAdjustmentsEqual(imageAdjustmentsDraft, storedImageAdjustments)) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextMetadata =
        data.metadata && typeof data.metadata === "object"
          ? { ...(data.metadata as Record<string, unknown>) }
          : {};

      if (isDefaultImageAdjustments(imageAdjustmentsDraft)) {
        delete nextMetadata.imageAdjustments;
        delete nextMetadata.imageAdjustmentsUpdatedAt;
      } else {
        nextMetadata.imageAdjustments = imageAdjustmentsDraft;
        nextMetadata.imageAdjustmentsUpdatedAt = new Date().toISOString();
      }

      useCanvasStore.getState().updateNode(node.id, {
        data: {
          ...data,
          metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined,
        },
      });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [
    data,
    imageAdjustPanelOpen,
    imageAdjustmentsDraft,
    node.id,
    storedImageAdjustments,
  ]);
  useEffect(() => {
    if (!anglePanelOpen) return;

    const savedSettings =
      data.metadata &&
      typeof data.metadata === "object" &&
      !Array.isArray(data.metadata)
        ? (data.metadata as {
            angleEditSettings?: {
              mode?: AngleEditPanelMode;
              horizontalAngle?: number;
              verticalAngle?: number;
              zoom?: number;
            };
          }).angleEditSettings
        : undefined;

    if (!savedSettings) return;

    if (savedSettings.mode === "subject" || savedSettings.mode === "camera") {
      setAnglePanelMode(savedSettings.mode);
    }
    if (typeof savedSettings.horizontalAngle === "number") {
      setAngleHorizontalAngle(clampNumber(savedSettings.horizontalAngle, -180, 180));
    }
    if (typeof savedSettings.verticalAngle === "number") {
      setAngleVerticalAngle(clampNumber(savedSettings.verticalAngle, -30, 60));
    }
    if (typeof savedSettings.zoom === "number") {
      setAngleZoom(clampNumber(savedSettings.zoom, 0, 100));
    }
  }, [anglePanelOpen, data.metadata]);
  useEffect(() => {
    if (!anglePanelOpen || typeof window === "undefined") {
      setAnglePanelOpening(false);
      return;
    }

    setAnglePanelOpening(true);
    const timer = window.setTimeout(() => {
      setAnglePanelOpening(false);
    }, 560);

    return () => window.clearTimeout(timer);
  }, [anglePanelOpen]);
  const [boxCutoutMetrics, setBoxCutoutMetrics] =
    useState<ImageDisplayMetrics | null>(null);
  const [localArchiveDisplaySrc, setLocalArchiveDisplaySrc] = useState("");

  // 文件输入的 ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localEditPromptPortalFrame, setLocalEditPromptPortalFrame] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const displayImageRef = useRef<HTMLImageElement>(null);
  const compareFrameRef = useRef<HTMLDivElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const boxCutoutToolbarRef = useRef<HTMLDivElement>(null);
  const localEditPromptInputRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});
  const localEditPromptDraftRefs = useRef<Record<string, string>>({});
  const localEditPromptComposingRefs = useRef<
    Record<string, boolean>
  >({});
  const localEditRegionsRef = useRef<LocalEditRegion[]>(localEditRegions);

  const updateNode = useCanvasStore((state) => state.updateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addNode = useCanvasStore((state) => state.addNode);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const projectId = useCanvasStore((state) => state.projectId);
  const getCanvasState = useCanvasStore((state) => state.getCanvasState);
  const addPendingChatAttachment = useCanvasStore(
    (state) => state.addPendingChatAttachment
  );
  const setPickerMode = useCanvasStore((state) => state.setPickerMode);
  const imageNodeActionRequest = useCanvasStore(
    (state) => state.imageNodeActionRequest
  );
  const clearImageNodeActionRequest = useCanvasStore(
    (state) => state.clearImageNodeActionRequest
  );
  const allNodes = useCanvasStore((state) => state.nodes);
  const pointsSystemConfig = useMemo(
    () =>
      normalizePointsSystemConfig(
        membershipSummary?.pointsSystemConfig || defaultPointsSystemConfig
      ),
    [membershipSummary?.pointsSystemConfig]
  );
  const pointsEnabled = pointsSystemConfig.enabled === true;
  const isHighVip = membershipSummary?.isHighVip === true;
  const getImageToolCostShortLabel = useCallback(
    (feature: ImageToolCreditFeature) =>
      formatImageNodeFeatureCostShortLabel({
        cost: getImageToolCreditCost(pointsSystemConfig, feature),
        isHighVip,
        pointsEnabled,
      }),
    [isHighVip, pointsEnabled, pointsSystemConfig]
  );
  const removeBackgroundCostShortLabel =
    getImageToolCostShortLabel("remove-background");
  const boxCutoutCostShortLabel = getImageToolCostShortLabel("box-cutout");
  const removeWatermarkCostShortLabel =
    getImageToolCostShortLabel("watermark-remove");
  const extendCostShortLabel = getImageToolCostShortLabel("extend");
  const promptRegenerateCostShortLabel = getImageToolCostShortLabel("repaint");
  const localEditCostShortLabel = promptRegenerateCostShortLabel;
  const angleEditCostShortLabel = getImageToolCostShortLabel("angle-edit");
  const enhanceCostShortLabel = formatImageNodeFeatureCostShortLabel({
    cost: calculateImageEnhancePointsEstimate(pointsSystemConfig, {
      width: Math.max(1, Math.round(node.size.width || 1)),
      height: Math.max(1, Math.round(node.size.height || 1)),
      upscalingActivated: true,
      scaleFactor: 2,
    }).cost,
    isHighVip,
    pointsEnabled:
      pointsEnabled && pointsSystemConfig.imageEnhancePricing.enabled === true,
  });
  // 🆕 物品拾取相关状态
  const isPickerMode = useCanvasStore((state) => state.isPickerMode);
  const pickerTargetNodeId = useCanvasStore(
    (state) => state.pickerTargetNodeId
  );
  const isPickerLoading = useCanvasStore((state) => state.isPickerLoading);
  const setPickerLoading = useCanvasStore((state) => state.setPickerLoading);
  const addPendingPickedObject = useCanvasStore(
    (state) => state.addPendingPickedObject
  );
  // 当前节点是否处于拾取模式
  const isThisNodePicking = isPickerMode && pickerTargetNodeId === node.id;

  // 当前正在识别的点击位置
  const [currentClick, setCurrentClick] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const displayTitle = getImageNodeTitle(data, node.id);
  const agentExecutionSnapshotId =
    typeof data.metadata?.agentExecutionSnapshotId === "string"
      ? data.metadata.agentExecutionSnapshotId.trim()
      : "";
  const detailUiScreenOverlay = useMemo(() => {
    const raw = data.metadata?.detailUiScreenOverlay;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as DetailUiScreenOverlaySnapshot;
  }, [data.metadata]);
  const detailSubjectAnalysis = useMemo(() => {
    return normalizeDetailUiSubjectAnalysis(
      data.metadata?.detailSubjectAnalysis
    );
  }, [data.metadata]);
  const detailUiDslDocumentFromMetadata = useMemo(() => {
    const raw = data.metadata?.detailUiDslDocument;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as DetailUiDslV2Document;
  }, [data.metadata]);
  const detailUiDslDocument = useMemo(() => {
    if (detailUiDslDocumentFromMetadata) return detailUiDslDocumentFromMetadata;
    if (!detailUiScreenOverlay) return null;
    return buildDetailUiDslV2({
      overlay: detailUiScreenOverlay,
      subjectAnalysis: detailSubjectAnalysis,
    });
  }, [
    detailSubjectAnalysis,
    detailUiDslDocumentFromMetadata,
    detailUiScreenOverlay,
  ]);
  const shouldRenderDetailOverlay =
    data.metadata?.detailGenerationMode === "agent_layout" &&
    Boolean(detailUiScreenOverlay);
  const shortAgentExecutionSnapshotId = agentExecutionSnapshotId
    ? agentExecutionSnapshotId.slice(0, 8)
    : "";
  const isMultiSelected = isSelected && selectedNodeIds.length > 1;
  const compareSource = useMemo(() => {
    const targetIdentity = normalizeImageIdentityUrl(data.src || "");
    if (!targetIdentity) return "";

    const candidates: string[] = [];
    const pushCandidate = (value: unknown) => {
      const raw = String(value || "").trim();
      if (!raw) return;
      candidates.push(raw);
    };

    const visited = new Set<string>([node.id]);
    const queue = Array.isArray(node.connections) ? [...node.connections] : [];
    let safety = 0;

    while (queue.length > 0 && safety < 120) {
      safety += 1;
      const sourceNodeId = queue.shift();
      if (!sourceNodeId || visited.has(sourceNodeId)) continue;
      visited.add(sourceNodeId);

      const sourceNode = allNodes.find((item) => item.id === sourceNodeId);
      if (!sourceNode || sourceNode.type !== "image") continue;
      const sourceData = (sourceNode.data as any) || {};
      pushCandidate(sourceData.src);
      pushCandidate(sourceData.originalSrc);
      pushCandidate(sourceData.metadata?.compareSourceUrl);

      if (
        Array.isArray(sourceNode.connections) &&
        sourceNode.connections.length > 0
      ) {
        queue.push(...sourceNode.connections);
      }
    }

    pushCandidate(data.originalSrc);
    pushCandidate(data.metadata?.compareSourceUrl);

    for (const candidate of candidates) {
      const identity = normalizeImageIdentityUrl(candidate);
      if (!identity) continue;
      if (identity !== targetIdentity) {
        return candidate;
      }
    }

    return "";
  }, [
    allNodes,
    data.metadata,
    data.originalSrc,
    data.src,
    node.connections,
    node.id,
  ]);

  const hasCompareSource = Boolean(data.src) && Boolean(compareSource);
  const compareButtonVisualSize = useMemo(() => {
    const minSide = Math.max(
      1,
      Math.min(node.size.width || 0, node.size.height || 0)
    );
    return Math.round(Math.max(24, Math.min(32, minSide * 0.09)));
  }, [node.size.height, node.size.width]);
  const compareButtonHitSize = useMemo(
    () => Math.max(34, compareButtonVisualSize + 8),
    [compareButtonVisualSize]
  );
  const compareButtonIconSize = useMemo(
    () => Math.round(Math.max(12, Math.min(16, compareButtonVisualSize * 0.5))),
    [compareButtonVisualSize]
  );
  const compareButtonInset = useMemo(
    () => Math.max(6, Math.min(10, Math.round(compareButtonVisualSize * 0.22))),
    [compareButtonVisualSize]
  );
  const displayImageWidth = useMemo(
    () =>
      Math.max(640, Math.min(2200, Math.round((node.size.width || 320) * 2))),
    [node.size.width]
  );
  useEffect(() => {
    let cancelled = false;
    if (!data.src) {
      setLocalArchiveDisplaySrc("");
      return;
    }

    void resolveLocalArchiveDisplayUrlForImageData({
      data,
      fallbackUrl: "",
    }).then((localUrl) => {
      if (cancelled) {
        return;
      }
      setLocalArchiveDisplaySrc(localUrl && localUrl !== data.src ? localUrl : "");
    });

    return () => {
      cancelled = true;
    };
  }, [data, data.src]);
  const displayImageSource = localArchiveDisplaySrc || data.src;
  const displayImageSrc = useMemo(
    () =>
      buildImageProxyUrl(displayImageSource, {
        width: displayImageWidth,
        quality: 86,
        format: "webp",
      }),
    [displayImageSource, displayImageWidth]
  );
  const fullscreenPreviewSrc = useMemo(() => {
    const originalUrl = resolveOriginalImageUrl(displayImageSource || "");
    return buildImageProxyUrl(originalUrl || displayImageSource || "", {
      delivery: "proxy",
      width: 2400,
      quality: 90,
      format: "webp",
    });
  }, [displayImageSource]);
  const displayCompareSrc = useMemo(
    () =>
      buildImageProxyUrl(compareSource, {
        width: displayImageWidth,
        quality: 86,
        format: "webp",
      }),
    [compareSource, displayImageWidth]
  );
  const shouldRequestDisplayImage =
    hasEnteredViewport ||
    isSelected ||
    isCompareMode ||
    boxCutoutMode ||
    localEditMode ||
    cropPanelOpen ||
    isThisNodePicking ||
    fullscreenPreviewOpen ||
    annotatorOpen ||
    resizeAnnotatorOpen ||
    textEditPanelOpen ||
    imageAdjustPanelOpen ||
    flipRotatePanelOpen ||
    anglePanelOpen;
  const [loadedResolution, setLoadedResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const metadataResolution = useMemo(() => {
    const rawWidth = Number((data.metadata as any)?.originalWidth ?? 0);
    const rawHeight = Number((data.metadata as any)?.originalHeight ?? 0);
    const width = Number.isFinite(rawWidth) ? Math.round(rawWidth) : 0;
    const height = Number.isFinite(rawHeight) ? Math.round(rawHeight) : 0;
    if (width > 0 && height > 0) {
      return { width, height };
    }
    return null;
  }, [data.metadata]);
  const resolutionLabel = useMemo(() => {
    const source = metadataResolution || loadedResolution;
    if (!source) return "";
    return `${source.width} x ${source.height}`;
  }, [loadedResolution, metadataResolution]);
  const angleSourceResolution = useMemo(() => {
    const source = metadataResolution || loadedResolution;
    if (source?.width && source?.height) {
      return source;
    }
    return {
      width: Math.max(1, Math.round(node.size.width || 1)),
      height: Math.max(1, Math.round(node.size.height || 1)),
    };
  }, [loadedResolution, metadataResolution, node.size.height, node.size.width]);
  const anglePreviewFrameSize = useMemo(
    () =>
      fitSizeWithinBox({
        sourceWidth: angleSourceResolution.width,
        sourceHeight: angleSourceResolution.height,
        maxWidth: anglePanelMode === "subject" ? 236 : 188,
        maxHeight: anglePanelMode === "subject" ? 196 : 150,
        minWidth: 96,
        minHeight: 80,
      }),
    [anglePanelMode, angleSourceResolution.height, angleSourceResolution.width]
  );
  const anglePreviewDepth = useMemo(
    () =>
      Math.round(
        clampNumber(
          anglePanelMode === "subject"
            ? anglePreviewFrameSize.width * 0.18
            : anglePreviewFrameSize.width * 0.22,
          16,
          36
        )
      ),
    [anglePanelMode, anglePreviewFrameSize.width]
  );
  const anglePreviewScale = useMemo(
    () =>
      Number(
        (
          (anglePanelMode === "subject" ? 0.9 : 0.92) +
          (angleZoom / 100) * (anglePanelMode === "subject" ? 0.46 : 0.34)
        ).toFixed(3)
      ),
    [anglePanelMode, angleZoom]
  );
  const anglePreviewImageSrc = displayImageSrc || data.src;
  const angleCameraOrbitPosition = useMemo(() => {
    const horizontalRadians = (angleHorizontalAngle * Math.PI) / 180;
    const normalizedVertical = (angleVerticalAngle + 30) / 90;
    const x = Math.sin(horizontalRadians) * 110;
    const y = -normalizedVertical * 72 + 26;
    const z = Math.cos(horizontalRadians) * 38;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
    };
  }, [angleHorizontalAngle, angleVerticalAngle]);
  const angleCameraConnection = useMemo(() => {
    const length = Math.sqrt(
      angleCameraOrbitPosition.x * angleCameraOrbitPosition.x +
        angleCameraOrbitPosition.y * angleCameraOrbitPosition.y
    );
    const angle =
      (Math.atan2(angleCameraOrbitPosition.y, angleCameraOrbitPosition.x) *
        180) /
      Math.PI;

    return {
      angle: Number(angle.toFixed(2)),
      length: Number(length.toFixed(2)),
    };
  }, [angleCameraOrbitPosition]);
  const angleOrbitWireframeStyle = useMemo<React.CSSProperties>(
    () => ({
      transform: `rotateX(${(-angleVerticalAngle * 0.24) + (anglePanelOpening ? 14 : 0)}deg) rotateY(${(angleHorizontalAngle * 0.34) + (anglePanelOpening ? -34 : 0)}deg) rotateZ(${(angleHorizontalAngle * 0.05) + (anglePanelOpening ? 7 : 0)}deg)`,
      transformStyle: "preserve-3d",
      transition: isAnglePreviewDragging
        ? "none"
        : `transform ${anglePanelOpening ? 560 : 180}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    }),
    [
      angleHorizontalAngle,
      anglePanelOpening,
      angleVerticalAngle,
      isAnglePreviewDragging,
    ]
  );
  const angleCameraSceneScale = useMemo(
    () => Number((0.94 + (angleZoom / 100) * 0.22).toFixed(3)),
    [angleZoom]
  );
  const cropImageMetrics = useMemo(() => {
    if (boxCutoutMetrics) {
      return {
        naturalWidth: boxCutoutMetrics.naturalWidth,
        naturalHeight: boxCutoutMetrics.naturalHeight,
      };
    }
    const fallback = metadataResolution || loadedResolution;
    if (!fallback) return null;
    return {
      naturalWidth: fallback.width,
      naturalHeight: fallback.height,
    };
  }, [boxCutoutMetrics, loadedResolution, metadataResolution]);
  const boxCutoutDraftRect = useMemo(() => {
    if (!boxCutoutMode || !boxCutoutDragStart || !boxCutoutDragEnd) {
      return null;
    }
    return createNormalizedRect(boxCutoutDragStart, boxCutoutDragEnd);
  }, [boxCutoutDragEnd, boxCutoutDragStart, boxCutoutMode]);
  const activeBoxCutoutRect = boxCutoutSelection || boxCutoutDraftRect;
  const activeBoxCutoutRectStyle = useMemo(() => {
    if (!boxCutoutMetrics || !activeBoxCutoutRect) return null;

    return getNormalizedRectOverlayStyle(activeBoxCutoutRect, boxCutoutMetrics);
  }, [activeBoxCutoutRect, boxCutoutMetrics]);
  const localEditDraftRect = useMemo(() => {
    if (!localEditMode || !localEditDragStart || !localEditDragEnd) {
      return null;
    }
    return createNormalizedRect(localEditDragStart, localEditDragEnd);
  }, [localEditDragEnd, localEditDragStart, localEditMode]);
  const localEditDraftRectStyle = useMemo(() => {
    if (!boxCutoutMetrics || !localEditDraftRect) return null;
    return getNormalizedRectOverlayStyle(localEditDraftRect, boxCutoutMetrics);
  }, [boxCutoutMetrics, localEditDraftRect]);
  const localEditRegionOverlays = useMemo(() => {
    if (!boxCutoutMetrics) return [];
    return localEditRegions.map((region) => ({
      region,
      style: getNormalizedRectOverlayStyle(region.rect, boxCutoutMetrics),
    }));
  }, [boxCutoutMetrics, localEditRegions]);
  const localEditPromptInlineOverlays = useMemo(() => {
    if (!localEditMode || !boxCutoutMetrics) {
      return [];
    }

    return localEditRegionOverlays.map(({ region, style }) => {
      const left = Number(style.left || 0);
      const top = Number(style.top || 0);
      const width = Number(style.width || 0);
      const height = Number(style.height || 0);
      const imageBottom = boxCutoutMetrics.offsetY + boxCutoutMetrics.renderedHeight;
      const referenceCount = region.referenceImages?.length || 0;
      const promptStackHeight = referenceCount > 0 ? 82 : 42;
      const placeAbove = top + height + promptStackHeight + 14 > imageBottom;
      const promptTop = placeAbove
        ? top - promptStackHeight - 8
        : top + height + 8;
      const promptWidth = Math.min(Math.max(width, 236), 360);
      const isEditing =
        editingLocalEditRegionId === region.id || !region.prompt.trim();

      return {
        region,
        isEditing,
        style: {
          left,
          top: Math.max(4, promptTop),
          width: promptWidth,
          zIndex: isEditing ? 190 : 170,
        } satisfies React.CSSProperties,
      };
    });
  }, [
    boxCutoutMetrics,
    editingLocalEditRegionId,
    localEditMode,
    localEditRegionOverlays,
  ]);
  const localEditPromptViewportOverlays = useMemo(
    () =>
      localEditPromptInlineOverlays.map(({ region, isEditing, style }) => ({
        region,
        isEditing,
        style: {
          ...style,
          left: Number(style.left || 0) * nodeContentScale,
          top: Number(style.top || 0) * nodeContentScale,
          width: Number(style.width || 0) * nodeContentScale,
        } satisfies React.CSSProperties,
      })),
    [localEditPromptInlineOverlays, nodeContentScale]
  );
  useEffect(() => {
    if (
      !localEditMode ||
      !data.src ||
      localEditPromptViewportOverlays.length === 0 ||
      typeof window === "undefined"
    ) {
      setLocalEditPromptPortalFrame(null);
      return;
    }

    let animationFrame = 0;
    const updatePortalFrame = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const nextFrame = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      setLocalEditPromptPortalFrame((currentFrame) => {
        if (
          currentFrame &&
          Math.abs(currentFrame.left - nextFrame.left) < 0.5 &&
          Math.abs(currentFrame.top - nextFrame.top) < 0.5 &&
          Math.abs(currentFrame.width - nextFrame.width) < 0.5 &&
          Math.abs(currentFrame.height - nextFrame.height) < 0.5
        ) {
          return currentFrame;
        }
        return nextFrame;
      });
    };
    const schedulePortalFrameUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePortalFrame);
    };

    updatePortalFrame();
    const intervalId = window.setInterval(updatePortalFrame, 250);
    window.addEventListener("resize", schedulePortalFrameUpdate);
    window.addEventListener("scroll", schedulePortalFrameUpdate, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(intervalId);
      window.removeEventListener("resize", schedulePortalFrameUpdate);
      window.removeEventListener("scroll", schedulePortalFrameUpdate, true);
    };
  }, [data.src, localEditMode, localEditPromptViewportOverlays.length]);
  const currentPickerClickStyle = useMemo(() => {
    if (!boxCutoutMetrics || !currentClick) return null;

    return {
      left:
        boxCutoutMetrics.offsetX +
        currentClick.x * boxCutoutMetrics.renderedWidth,
      top:
        boxCutoutMetrics.offsetY +
        currentClick.y * boxCutoutMetrics.renderedHeight,
    };
  }, [boxCutoutMetrics, currentClick]);
  const cropRectStyle = useMemo(() => {
    if (!boxCutoutMetrics || !cropRect) return null;

    return {
      left: boxCutoutMetrics.offsetX + cropRect.x * boxCutoutMetrics.renderedWidth,
      top: boxCutoutMetrics.offsetY + cropRect.y * boxCutoutMetrics.renderedHeight,
      width: cropRect.width * boxCutoutMetrics.renderedWidth,
      height: cropRect.height * boxCutoutMetrics.renderedHeight,
    };
  }, [boxCutoutMetrics, cropRect]);
  const cropPixelSize = useMemo(() => {
    if (!cropRect || !cropImageMetrics) {
      return { width: 0, height: 0 };
    }
    return {
      width: Math.max(
        0,
        Math.round(cropRect.width * cropImageMetrics.naturalWidth)
      ),
      height: Math.max(
        0,
        Math.round(cropRect.height * cropImageMetrics.naturalHeight)
      ),
    };
  }, [cropImageMetrics, cropRect]);
  const currentCropAspectRatio =
    cropRect && cropRect.height > 0 ? cropRect.width / cropRect.height : null;
  const selectedCropPreset = getCropPresetById(cropPresetId);
  const effectiveCropAspectRatio =
    cropLockAspectRatio
      ? selectedCropPreset?.ratio || currentCropAspectRatio
      : null;

  const resetBoxCutoutState = useCallback(() => {
    setBoxCutoutMode(false);
    setIsBoxCutoutDrawing(false);
    setBoxCutoutSelection(null);
    setBoxCutoutDragStart(null);
    setBoxCutoutDragEnd(null);
  }, []);

  const resetLocalEditState = useCallback(() => {
    setLocalEditMode(false);
    setIsLocalEditDrawing(false);
    setLocalEditDragStart(null);
    setLocalEditDragEnd(null);
    setLocalEditRegionInteraction(null);
    setEditingLocalEditRegionId(null);
    setUploadingLocalEditReferenceRegionId(null);
  }, []);

  const focusLocalEditPromptInput = useCallback((regionId: string) => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const input = localEditPromptInputRefs.current[regionId];
      if (!input) return;
      input.focus({ preventScroll: true });
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }, []);

  useEffect(() => {
    if (!localEditMode || !editingLocalEditRegionId) return;
    focusLocalEditPromptInput(editingLocalEditRegionId);
  }, [editingLocalEditRegionId, focusLocalEditPromptInput, localEditMode]);

  useEffect(() => {
    localEditRegionsRef.current = localEditRegions;
  }, [localEditRegions]);

  const commitLocalEditRegions = useCallback(
    (regions: LocalEditRegion[]) => {
      const nextRegions = reindexLocalEditRegions(
        regions.slice(0, LOCAL_EDIT_MAX_REGIONS)
      );
      const nextDrafts = createLocalEditPromptDraftMap(
        nextRegions,
        localEditPromptDraftRefs.current
      );
      localEditRegionsRef.current = nextRegions;
      setLocalEditRegions(nextRegions);
      localEditPromptDraftRefs.current = nextDrafts;
      setLocalEditPromptDrafts(nextDrafts);

      const nextMetadata =
        data.metadata && typeof data.metadata === "object"
          ? { ...(data.metadata as Record<string, unknown>) }
          : {};

      if (nextRegions.length > 0) {
        nextMetadata[LOCAL_EDIT_METADATA_KEY] = nextRegions;
      } else {
        delete nextMetadata[LOCAL_EDIT_METADATA_KEY];
      }

      updateNode(node.id, {
        data: {
          ...data,
          metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined,
        },
      });
    },
    [data, node.id, updateNode]
  );

  const updateLocalEditPromptDraft = useCallback(
    (regionId: string, prompt: string) => {
      localEditPromptDraftRefs.current[regionId] = prompt;
      setLocalEditPromptDrafts((current) =>
        current[regionId] === prompt
          ? current
          : {
              ...current,
              [regionId]: prompt,
            }
      );
    },
    []
  );
  const updateLocalEditPromptDraftRef = useCallback(
    (regionId: string, prompt: string) => {
      localEditPromptDraftRefs.current[regionId] = prompt;
    },
    []
  );

  const refreshBoxCutoutMetrics = useCallback(() => {
    const imageElement = displayImageRef.current;
    if (!imageElement) {
      setBoxCutoutMetrics(null);
      return;
    }

    const naturalWidth =
      imageElement.naturalWidth ||
      metadataResolution?.width ||
      loadedResolution?.width ||
      0;
    const naturalHeight =
      imageElement.naturalHeight ||
      metadataResolution?.height ||
      loadedResolution?.height ||
      0;
    const boxWidth = imageElement.clientWidth;
    const boxHeight = imageElement.clientHeight;

    if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
      setBoxCutoutMetrics(null);
      return;
    }

    const displayScale = Math.min(
      boxWidth / naturalWidth,
      boxHeight / naturalHeight
    );
    const renderedWidth = naturalWidth * displayScale;
    const renderedHeight = naturalHeight * displayScale;

    setBoxCutoutMetrics({
      offsetX: (boxWidth - renderedWidth) / 2,
      offsetY: (boxHeight - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
      naturalWidth,
      naturalHeight,
    });
  }, [loadedResolution, metadataResolution]);

  const getBoxCutoutPointerPoint = useCallback(
    (clientX: number, clientY: number) => {
      const imageElement = displayImageRef.current;
      if (!imageElement) return null;

      const currentMetrics = (() => {
        if (
          boxCutoutMetrics &&
          boxCutoutMetrics.renderedWidth > 0 &&
          boxCutoutMetrics.renderedHeight > 0
        ) {
          return boxCutoutMetrics;
        }

        const naturalWidth =
          imageElement.naturalWidth ||
          metadataResolution?.width ||
          loadedResolution?.width ||
          0;
        const naturalHeight =
          imageElement.naturalHeight ||
          metadataResolution?.height ||
          loadedResolution?.height ||
          0;
        const boxWidth = imageElement.clientWidth;
        const boxHeight = imageElement.clientHeight;

        if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
          return null;
        }

        const displayScale = Math.min(
          boxWidth / naturalWidth,
          boxHeight / naturalHeight
        );
        return {
          offsetX: (boxWidth - naturalWidth * displayScale) / 2,
          offsetY: (boxHeight - naturalHeight * displayScale) / 2,
          renderedWidth: naturalWidth * displayScale,
          renderedHeight: naturalHeight * displayScale,
          naturalWidth,
          naturalHeight,
        } satisfies ImageDisplayMetrics;
      })();

      if (!currentMetrics) return null;

      const rect = imageElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      // The image node content may be counter-scaled with CSS transforms.
      // getBoundingClientRect() returns the transformed size, while
      // object-contain offsets are calculated in the element's local box.
      // Convert the pointer back into that local coordinate space first.
      const localX =
        ((clientX - rect.left) / rect.width) * imageElement.clientWidth;
      const localY =
        ((clientY - rect.top) / rect.height) * imageElement.clientHeight;
      const rawX = localX - currentMetrics.offsetX;
      const rawY = localY - currentMetrics.offsetY;
      const clampedX = clampNumber(rawX, 0, currentMetrics.renderedWidth);
      const clampedY = clampNumber(rawY, 0, currentMetrics.renderedHeight);

      return {
        point: {
          x:
            currentMetrics.renderedWidth > 0
              ? clampedX / currentMetrics.renderedWidth
              : 0,
          y:
            currentMetrics.renderedHeight > 0
              ? clampedY / currentMetrics.renderedHeight
              : 0,
        } satisfies BoxCutoutPoint,
        insideImage:
          rawX >= 0 &&
          rawX <= currentMetrics.renderedWidth &&
          rawY >= 0 &&
          rawY <= currentMetrics.renderedHeight,
        metrics: currentMetrics,
      };
    },
    [boxCutoutMetrics, loadedResolution, metadataResolution]
  );

  // 退出拾取模式时清空状态
  useEffect(() => {
    if (!isThisNodePicking) {
      setCurrentClick(null);
    }
  }, [isThisNodePicking]);

  useEffect(() => {
    if (!textEditPanelOpen) {
      setTextEditItems(normalizeTextEditItems(data.textEditItems));
      setDeletedTextItems([]);
      setTextEditError(null);
    }
  }, [data.textEditItems, textEditPanelOpen]);

  useEffect(() => {
    if (localEditMode) return;
    const nextRegions = getLocalEditRegionsFromMetadata(data.metadata);
    const nextDrafts = createLocalEditPromptDraftMap(nextRegions);
    localEditPromptDraftRefs.current = nextDrafts;
    setLocalEditPromptDrafts(nextDrafts);
    setLocalEditRegions(nextRegions);
  }, [data.metadata, data.src, localEditMode]);

  useEffect(() => {
    if (!isSelected) {
      setCropPanelOpen(false);
      setCropRect(null);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setAnglePanelOpen(false);
      setTextEditPanelOpen(false);
      setIsEditingTitle(false);
      setPromptDialogOpen(false);
      resetBoxCutoutState();
      // 局部编辑有独立的“退出”按钮，避免用户点到浮层或画布边缘时丢失框选与底部操作条。
      if (!localEditMode) {
        resetLocalEditState();
      }
    }
  }, [isSelected, localEditMode, resetBoxCutoutState, resetLocalEditState]);

  useEffect(() => {
    if (anglePanelOpen) return;
    anglePreviewDragRef.current = null;
    setIsAnglePreviewDragging(false);
  }, [anglePanelOpen]);

  useEffect(() => {
    if (!hasCompareSource || isThisNodePicking) {
      setIsCompareMode(false);
    }
  }, [hasCompareSource, isThisNodePicking]);

  useEffect(() => {
    if (
      (isThisNodePicking ||
        isCompareMode ||
        promptDialogOpen ||
        notePanelOpen) &&
      (boxCutoutMode || cropPanelOpen || localEditMode)
    ) {
      resetBoxCutoutState();
      resetLocalEditState();
      setCropPanelOpen(false);
      setCropInteraction(null);
    }
  }, [
    boxCutoutMode,
    cropPanelOpen,
    isCompareMode,
    isThisNodePicking,
    localEditMode,
    notePanelOpen,
    promptDialogOpen,
    resetBoxCutoutState,
    resetLocalEditState,
  ]);

  useEffect(() => {
    if (!boxCutoutMode || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        resetBoxCutoutState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [boxCutoutMode, resetBoxCutoutState]);

  useEffect(() => {
    if (!localEditMode || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLocalEditControlTarget(event.target)) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        resetLocalEditState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [localEditMode, resetLocalEditState]);

  useEffect(() => {
    if (!cropPanelOpen || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCropPanelOpen(false);
        setCropInteraction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cropPanelOpen]);

  useEffect(() => {
    setLoadedResolution(null);
  }, [data.src]);

  useEffect(() => {
    setHasEnteredViewport(false);
  }, [data.src]);

  useEffect(() => {
    if (!data.src || hasEnteredViewport || typeof window === "undefined") {
      return;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        // 轻微提前加载，保证拖动画布时体验顺滑，但不请求远离视口的图片。
        rootMargin: "320px",
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [data.src, hasEnteredViewport]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    const scheduleRefresh = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        refreshBoxCutoutMetrics();
      });
    };

    scheduleRefresh();
    window.addEventListener("resize", scheduleRefresh);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleRefresh)
        : null;

    if (containerRef.current) {
      resizeObserver?.observe(containerRef.current);
    }
    if (displayImageRef.current) {
      resizeObserver?.observe(displayImageRef.current);
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", scheduleRefresh);
      resizeObserver?.disconnect();
    };
  }, [data.src, refreshBoxCutoutMetrics]);

  const updateCompareSplitByClientX = useCallback((clientX: number) => {
    const frame = compareFrameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;

    const rawPercent = ((clientX - rect.left) / rect.width) * 100;
    setCompareSplitPercent(Math.max(0, Math.min(100, rawPercent)));
  }, []);

  useEffect(() => {
    if (!isCompareMode) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const container = containerRef.current;
      if (container && container.contains(target)) return;
      setIsCompareMode(false);
    };

    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDownOutside,
        true
      );
    };
  }, [isCompareMode]);

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(getImageNodeTitle(data, node.id));
    }
  }, [data, isEditingTitle, node.id]);

  useEffect(() => {
    if (promptDialogOpen) {
      setRegeneratePrompt(resolveRegeneratePromptSeed(data));
    }
  }, [data, promptDialogOpen]);

  useEffect(() => {
    if (notePanelOpen) {
      setDraftNote(data.note || "");
    }
  }, [data.note, notePanelOpen]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !isSelected ||
      isMultiSelected ||
      !data.src ||
      isEditingTitle ||
      promptDialogOpen ||
      notePanelOpen ||
      boxCutoutMode ||
      localEditMode
    ) {
      return;
    }

    const toolbarEl = toolbarRef.current;
    if (!toolbarEl) return;

    let rafId: number | null = null;
    const measure = () => {
      const next = {
        width: toolbarEl.offsetWidth,
        height: toolbarEl.offsetHeight,
      };
      setToolbarSize((prev) =>
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next
      );
    };

    const scheduleMeasure = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;
    resizeObserver?.observe(toolbarEl);

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [
    boxCutoutMode,
    data.src,
    isEditingTitle,
    isMultiSelected,
    isSelected,
    localEditMode,
    notePanelOpen,
    promptDialogOpen,
  ]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !isSelected ||
      isMultiSelected ||
      !data.src ||
      (!boxCutoutMode && !localEditMode)
    ) {
      return;
    }

    const toolbarEl = boxCutoutToolbarRef.current;
    if (!toolbarEl) return;

    let rafId: number | null = null;
    const measure = () => {
      const next = {
        width: toolbarEl.offsetWidth,
        height: toolbarEl.offsetHeight,
      };
      setBoxCutoutToolbarSize((prev) =>
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next
      );
    };

    const scheduleMeasure = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;
    resizeObserver?.observe(toolbarEl);

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [boxCutoutMode, data.src, isMultiSelected, isSelected, localEditMode]);

  // 🆕 处理图片点击标注
  const handlePickerClick = useCallback(
    async (e: React.MouseEvent<HTMLImageElement>) => {
      if (!isThisNodePicking || isPickerLoading || !data.src) return;

      e.stopPropagation();
      e.preventDefault();

      const pointerResult = getBoxCutoutPointerPoint(e.clientX, e.clientY);
      if (!pointerResult?.insideImage) {
        toast.info("请点击图片内容区域");
        return;
      }

      const clickX = pointerResult.point.x;
      const clickY = pointerResult.point.y;

      setCurrentClick({ x: clickX, y: clickY });
      setPickerLoading(true);

      try {
        // 在图片上绘制红色标记点
        const markedImageBase64 = await drawMarkerOnImage(
          data.src,
          clickX,
          clickY
        );

        const response = await apiFetch("/api/pick-object", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData: markedImageBase64,
            clickX,
            clickY,
          }),
        });

        if (!response.ok) throw new Error("识别失败");

        const result = await response.json();

        if (result.success && result.object) {
          const picked: PickedObject = {
            imageUrl: data.src,
            imageNodeId: node.id,
            clickX,
            clickY,
            objectName: result.object.name,
            objectPosition: result.object.position,
            confidence: result.object.confidence,
            boundingBox: result.object.boundingBox,
          };

          addPendingPickedObject(picked);

          // 标注成功后自动关闭拾取模式，直接生成标签
          setPickerMode(false);
          setCurrentClick(null);
          toast.success(`已添加: ${result.object.name}`);
        } else {
          toast.error(result.error || "未能识别物品");
          setCurrentClick(null);
        }
      } catch (error) {
        console.error("物品拾取失败:", error);
        toast.error("识别失败，请重试");
        setCurrentClick(null);
      } finally {
        setPickerLoading(false);
      }
    },
    [
      isThisNodePicking,
      isPickerLoading,
      data.src,
      getBoxCutoutPointerPoint,
      node.id,
      setPickerLoading,
      addPendingPickedObject,
      setPickerMode,
    ]
  );

  // 🆕 取消标注
  const handleCancelPicking = useCallback(() => {
    setPickerMode(false);
  }, [setPickerMode]);

  const handleStartPicking = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (!data.src) {
        toast.error("请先上传图片");
        return;
      }
      if (isProcessing) {
        toast.info("正在处理中，请稍候...");
        return;
      }

      resetLocalEditState();
      setPickerMode(true, node.id);
      toast.info("点击图片中的物品进行拾取");
    },
    [data.src, isProcessing, node.id, resetLocalEditState, setPickerMode]
  );

  const handleEnterBoxCutoutMode = useCallback(
    (event?: React.MouseEvent | React.PointerEvent) => {
      event?.stopPropagation();
      if (!data.src) {
        toast.error("请先上传图片");
        return;
      }
      if (isProcessing) {
        toast.info("正在处理中，请稍候...");
        return;
      }

      if (isThisNodePicking) {
        setPickerMode(false);
      }
      setIsCompareMode(false);
      resetLocalEditState();
      setBoxCutoutSelection(null);
      setBoxCutoutDragStart(null);
      setBoxCutoutDragEnd(null);
      setIsBoxCutoutDrawing(false);
      setBoxCutoutMode(true);
      window.requestAnimationFrame(() => {
        refreshBoxCutoutMetrics();
      });
    },
    [
      data.src,
      isProcessing,
      isThisNodePicking,
      refreshBoxCutoutMetrics,
      resetLocalEditState,
      setPickerMode,
    ]
  );

  const handleBoxCutoutPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!boxCutoutMode || isProcessing) return;

      event.preventDefault();
      event.stopPropagation();

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult?.insideImage) {
        return;
      }

      setBoxCutoutSelection(null);
      setBoxCutoutDragStart(pointerResult.point);
      setBoxCutoutDragEnd(pointerResult.point);
      setIsBoxCutoutDrawing(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [boxCutoutMode, getBoxCutoutPointerPoint, isProcessing]
  );

  const handleBoxCutoutPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!boxCutoutMode || !isBoxCutoutDrawing) return;

      event.preventDefault();
      event.stopPropagation();

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult) return;

      setBoxCutoutDragEnd(pointerResult.point);
    },
    [boxCutoutMode, getBoxCutoutPointerPoint, isBoxCutoutDrawing]
  );

  const finalizeBoxCutoutSelection = useCallback(
    (clientX: number, clientY: number) => {
      if (!boxCutoutMode || !boxCutoutDragStart) {
        setIsBoxCutoutDrawing(false);
        return;
      }

      const pointerResult = getBoxCutoutPointerPoint(clientX, clientY);
      if (!pointerResult) {
        setIsBoxCutoutDrawing(false);
        setBoxCutoutDragStart(null);
        setBoxCutoutDragEnd(null);
        return;
      }

      const nextRect = createNormalizedRect(
        boxCutoutDragStart,
        pointerResult.point
      );
      const nextWidthPx = nextRect.width * pointerResult.metrics.naturalWidth;
      const nextHeightPx =
        nextRect.height * pointerResult.metrics.naturalHeight;

      if (
        nextWidthPx >= BOX_CUTOUT_MIN_EDGE_PX &&
        nextHeightPx >= BOX_CUTOUT_MIN_EDGE_PX
      ) {
        setBoxCutoutSelection(nextRect);
      } else {
        setBoxCutoutSelection(null);
      }

      setBoxCutoutDragStart(null);
      setBoxCutoutDragEnd(null);
      setIsBoxCutoutDrawing(false);
    },
    [boxCutoutDragStart, boxCutoutMode, getBoxCutoutPointerPoint]
  );

  const handleBoxCutoutPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!boxCutoutMode) return;

      event.preventDefault();
      event.stopPropagation();
      finalizeBoxCutoutSelection(event.clientX, event.clientY);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [boxCutoutMode, finalizeBoxCutoutSelection]
  );

  const handleBoxCutoutPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!boxCutoutMode) return;

      event.preventDefault();
      event.stopPropagation();
      setIsBoxCutoutDrawing(false);
      setBoxCutoutDragStart(null);
      setBoxCutoutDragEnd(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [boxCutoutMode]
  );

  const handleEnterLocalEditMode = useCallback(
    (event?: React.MouseEvent | React.PointerEvent) => {
      event?.stopPropagation();
      if (!data.src) {
        toast.error("请先上传图片");
        return;
      }
      if (!isHttpImageUrl(data.src)) {
        toast.error("局部重绘需要使用已上传到云端的图片");
        return;
      }
      if (isProcessing || isSubmittingLocalEdit) {
        toast.info("正在处理中，请稍候...");
        return;
      }

      if (isThisNodePicking) {
        setPickerMode(false);
      }
      setIsCompareMode(false);
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setAnglePanelOpen(false);
      setTextEditPanelOpen(false);
      setNotePanelOpen(false);
      resetBoxCutoutState();
      setLocalEditRegions(getLocalEditRegionsFromMetadata(data.metadata));
      setLocalEditDragStart(null);
      setLocalEditDragEnd(null);
      setIsLocalEditDrawing(false);
      setLocalEditMode(true);
      window.requestAnimationFrame(() => {
        refreshBoxCutoutMetrics();
      });
      toast.info("拖拽框选要局部重绘的位置，并在框下方填写提示词");
    },
    [
      data.metadata,
      data.src,
      isProcessing,
      isSubmittingLocalEdit,
      isThisNodePicking,
      refreshBoxCutoutMetrics,
      resetBoxCutoutState,
      setPickerMode,
    ]
  );

  const handleLocalEditPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!localEditMode || isProcessing || isSubmittingLocalEdit) return;

      event.preventDefault();
      event.stopPropagation();

      if (localEditRegions.length >= LOCAL_EDIT_MAX_REGIONS) {
        toast.info(`局部重绘最多支持 ${LOCAL_EDIT_MAX_REGIONS} 个区域`);
        return;
      }

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult?.insideImage) return;

      setEditingLocalEditRegionId(null);
      setLocalEditDragStart(pointerResult.point);
      setLocalEditDragEnd(pointerResult.point);
      setIsLocalEditDrawing(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [
      getBoxCutoutPointerPoint,
      isProcessing,
      isSubmittingLocalEdit,
      localEditMode,
      localEditRegions.length,
    ]
  );

  const handleLocalEditPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!localEditMode || !isLocalEditDrawing) return;

      event.preventDefault();
      event.stopPropagation();

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult) return;

      setLocalEditDragEnd(pointerResult.point);
    },
    [getBoxCutoutPointerPoint, isLocalEditDrawing, localEditMode]
  );

  const finalizeLocalEditRegion = useCallback(
    (clientX: number, clientY: number) => {
      if (!localEditMode || !localEditDragStart) {
        setIsLocalEditDrawing(false);
        return;
      }

      const pointerResult = getBoxCutoutPointerPoint(clientX, clientY);
      if (!pointerResult) {
        setIsLocalEditDrawing(false);
        setLocalEditDragStart(null);
        setLocalEditDragEnd(null);
        return;
      }

      const nextRect = createNormalizedRect(
        localEditDragStart,
        pointerResult.point
      );
      const nextWidthPx = nextRect.width * pointerResult.metrics.naturalWidth;
      const nextHeightPx =
        nextRect.height * pointerResult.metrics.naturalHeight;

      if (
        nextWidthPx >= LOCAL_EDIT_MIN_EDGE_PX &&
        nextHeightPx >= LOCAL_EDIT_MIN_EDGE_PX
      ) {
        const nextRegion: LocalEditRegion = {
          id: createLocalEditRegionId(),
          index: localEditRegions.length + 1,
          color:
            LOCAL_EDIT_COLORS[localEditRegions.length % LOCAL_EDIT_COLORS.length],
          prompt: "",
          rect: nextRect,
          referenceImages: [],
          createdAt: Date.now(),
        };
        commitLocalEditRegions([...localEditRegions, nextRegion]);
        setEditingLocalEditRegionId(nextRegion.id);
      } else {
        toast.info("框选区域太小，请至少拖出 24px 以上的区域");
      }

      setLocalEditDragStart(null);
      setLocalEditDragEnd(null);
      setIsLocalEditDrawing(false);
    },
    [
      commitLocalEditRegions,
      getBoxCutoutPointerPoint,
      localEditDragStart,
      localEditMode,
      localEditRegions,
    ]
  );

  const handleLocalEditPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!localEditMode) return;

      event.preventDefault();
      event.stopPropagation();
      finalizeLocalEditRegion(event.clientX, event.clientY);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finalizeLocalEditRegion, localEditMode]
  );

  const handleLocalEditPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!localEditMode) return;

      event.preventDefault();
      event.stopPropagation();
      setIsLocalEditDrawing(false);
      setLocalEditDragStart(null);
      setLocalEditDragEnd(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [localEditMode]
  );

  const updateLocalEditRegionRect = useCallback(
    (regionId: string, rect: NormalizedCropRect, shouldCommit = false) => {
      const nextRegions = reindexLocalEditRegions(
        localEditRegionsRef.current.map((region) =>
          region.id === regionId ? { ...region, rect } : region
        )
      );
      localEditRegionsRef.current = nextRegions;
      setLocalEditRegions(nextRegions);
      if (shouldCommit) {
        commitLocalEditRegions(nextRegions);
      }
    },
    [commitLocalEditRegions]
  );

  const handleLocalEditRegionPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, region: LocalEditRegion) => {
      if (!localEditMode || isProcessing || isSubmittingLocalEdit) return;

      event.preventDefault();
      event.stopPropagation();

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult?.insideImage) return;

      const handleElement = (event.target as HTMLElement | null)?.closest(
        "[data-local-edit-region-handle]"
      ) as HTMLElement | null;
      const handle =
        (handleElement?.dataset.localEditRegionHandle as
          | CropInteractionHandle
          | undefined) || "move";

      setIsLocalEditDrawing(false);
      setLocalEditDragStart(null);
      setLocalEditDragEnd(null);
      setEditingLocalEditRegionId(null);
      setLocalEditRegionInteraction({
        handle,
        pointerId: event.pointerId,
        regionId: region.id,
        startPoint: pointerResult.point,
        startRect: region.rect,
      });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [
      getBoxCutoutPointerPoint,
      isProcessing,
      isSubmittingLocalEdit,
      localEditMode,
    ]
  );

  const handleLocalEditRegionPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, regionId: string) => {
      if (
        !localEditMode ||
        !localEditRegionInteraction ||
        localEditRegionInteraction.regionId !== regionId ||
        localEditRegionInteraction.pointerId !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult) return;

      const minWidth = Math.min(
        LOCAL_EDIT_MIN_EDGE_PX / Math.max(pointerResult.metrics.naturalWidth, 1),
        1
      );
      const minHeight = Math.min(
        LOCAL_EDIT_MIN_EDGE_PX / Math.max(pointerResult.metrics.naturalHeight, 1),
        1
      );
      const nextRect = updateCropRectWithPointer({
        aspectRatio: null,
        handle: localEditRegionInteraction.handle,
        minHeight,
        minWidth,
        pointer: pointerResult.point,
        startPoint: localEditRegionInteraction.startPoint,
        startRect: localEditRegionInteraction.startRect,
      });

      updateLocalEditRegionRect(regionId, nextRect);
    },
    [
      getBoxCutoutPointerPoint,
      localEditMode,
      localEditRegionInteraction,
      updateLocalEditRegionRect,
    ]
  );

  const handleLocalEditRegionPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, regionId: string) => {
      if (
        !localEditRegionInteraction ||
        localEditRegionInteraction.regionId !== regionId ||
        localEditRegionInteraction.pointerId !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setLocalEditRegionInteraction(null);
      commitLocalEditRegions(localEditRegionsRef.current);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [commitLocalEditRegions, localEditRegionInteraction]
  );

  const handleLocalEditRegionPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, regionId: string) => {
      if (
        !localEditRegionInteraction ||
        localEditRegionInteraction.regionId !== regionId ||
        localEditRegionInteraction.pointerId !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setLocalEditRegionInteraction(null);
      commitLocalEditRegions(localEditRegionsRef.current);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [commitLocalEditRegions, localEditRegionInteraction]
  );

  const persistLocalEditRegionPrompt = useCallback(
    (regionId: string, prompt: string) => {
      updateLocalEditPromptDraft(regionId, prompt);
      commitLocalEditRegions(
        localEditRegionsRef.current.map((region) =>
          region.id === regionId ? { ...region, prompt } : region
        )
      );
    },
    [commitLocalEditRegions, updateLocalEditPromptDraft]
  );

  const deleteLocalEditRegion = useCallback(
    (regionId: string) => {
      delete localEditPromptDraftRefs.current[regionId];
      delete localEditPromptComposingRefs.current[regionId];
      setLocalEditPromptDrafts((current) => {
        if (!(regionId in current)) return current;
        const next = { ...current };
        delete next[regionId];
        return next;
      });
      commitLocalEditRegions(
        localEditRegionsRef.current.filter((region) => region.id !== regionId)
      );
      if (editingLocalEditRegionId === regionId) {
        setEditingLocalEditRegionId(null);
      }
    },
    [commitLocalEditRegions, editingLocalEditRegionId]
  );

  const handleLocalEditReferenceUpload = useCallback(
    async (regionId: string, fileList: FileList | null) => {
      const files = Array.from(fileList || []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const currentRegion = localEditRegionsRef.current.find(
        (region) => region.id === regionId
      );
      if (!currentRegion) return;

      const currentReferences = currentRegion.referenceImages || [];
      const remainingSlots =
        LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION - currentReferences.length;
      if (remainingSlots <= 0) {
        toast.info(
          `每个局部重绘区域最多添加 ${LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION} 张参考图`
        );
        return;
      }

      const selectedFiles = files.slice(0, remainingSlots);
      if (files.length > selectedFiles.length) {
        toast.info(
          `已自动保留前 ${LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION} 张参考图`
        );
      }

      setUploadingLocalEditReferenceRegionId(regionId);
      try {
        const uploadedReferences = await Promise.all(
          selectedFiles.map(async (file) => {
            const uploaded = await uploadChatAttachmentBlob(file, file.name);
            return {
              id: createLocalEditReferenceImageId(),
              url: uploaded.url,
              name: file.name,
              source: "upload" as const,
              createdAt: Date.now(),
            } satisfies LocalEditReferenceImage;
          })
        );

        commitLocalEditRegions(
          localEditRegionsRef.current.map((region) =>
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
        );
        toast.success(
          uploadedReferences.length > 1
            ? `已添加 ${uploadedReferences.length} 张区域参考图`
            : "已添加区域参考图"
        );
      } catch (error) {
        const message = getUploadErrorMessage(error, "参考图上传失败");
        if (message) {
          toast.error(message);
        }
      } finally {
        setUploadingLocalEditReferenceRegionId(null);
      }
    },
    [commitLocalEditRegions]
  );

  const removeLocalEditReferenceImage = useCallback(
    (regionId: string, referenceId: string) => {
      commitLocalEditRegions(
        localEditRegionsRef.current.map((region) =>
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
    },
    [commitLocalEditRegions]
  );

  const clearLocalEditRegions = useCallback(() => {
    localEditPromptDraftRefs.current = {};
    localEditPromptComposingRefs.current = {};
    setLocalEditPromptDrafts({});
    commitLocalEditRegions([]);
    setEditingLocalEditRegionId(null);
  }, [commitLocalEditRegions]);

  const handleSubmitLocalEdit = useCallback(async () => {
    if (!data.src) {
      toast.error("请先上传图片");
      return;
    }
    if (!isHttpImageUrl(data.src)) {
      toast.error("局部重绘需要使用已上传到云端的图片");
      return;
    }
    if (isSubmittingLocalEdit || isProcessing) {
      toast.info("正在处理中，请稍候...");
      return;
    }

    const validRegions = reindexLocalEditRegions(
      localEditRegions.map((region) => ({
        ...region,
        prompt: (
          localEditPromptDraftRefs.current[region.id] ?? region.prompt
        ).trim(),
      }))
    );

    if (validRegions.length === 0) {
      toast.error("请先框选至少一个局部重绘区域");
      return;
    }
    const emptyRegion = validRegions.find((region) => !region.prompt);
    if (emptyRegion) {
      setEditingLocalEditRegionId(emptyRegion.id);
      toast.error(`请填写区域 ${emptyRegion.index} 的提示词`);
      return;
    }

    setIsSubmittingLocalEdit(true);
    setIsProcessing(true);
    commitLocalEditRegions(validRegions);

    const actionName = "局部重绘";
    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "",
        status: "generating",
        prompt: `${actionName}处理中...`,
        title: `${displayTitle}-${actionName}`,
        originalSrc: data.src,
        metadata: {
          editMode: "local-edit",
          sourceNodeId: node.id,
          localEditMode: false,
          sourceLocalEditRegions: validRegions,
        },
      },
      connections: [node.id],
    });
    selectNode(newNodeId);

    try {
      const submitResult = await imageGenerationService.localEdit({
        sourceImageUrl: data.src,
        sourceNodeId: node.id,
        regions: validRegions.map((region) => ({
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
        throw new Error(submitResult.error || "局部重绘提交失败");
      }

      const taskId = submitResult.data.taskId;
      const localEditDisplayPrompt =
        submitResult.data.displayPrompt || submitResult.data.prompt || `${actionName}处理中...`;
      const localEditSourceWidth = Number(submitResult.data.sourceWidth || 0);
      const localEditSourceHeight = Number(submitResult.data.sourceHeight || 0);
      const localEditSourceRatio =
        localEditSourceWidth > 0 && localEditSourceHeight > 0
          ? localEditSourceWidth / localEditSourceHeight
          : 0;
      const localEditResultSize =
        localEditSourceRatio > 0
          ? {
              width: node.size.width,
              height: Math.max(80, Math.round(node.size.width / localEditSourceRatio)),
            }
          : node.size;
      updateNode(newNodeId, {
        size: localEditResultSize,
        data: {
          src: "",
          status: "generating",
          prompt: localEditDisplayPrompt,
          title: `${displayTitle}-${actionName}`,
          originalSrc: data.src,
          metadata: {
            editMode: "local-edit",
            sourceNodeId: node.id,
            aspectRatio: submitResult.data.aspectRatio,
            taskId,
            annotatedReferenceUrl: submitResult.data.annotatedReferenceUrl,
            localEditMode: false,
            sourceHeight: submitResult.data.sourceHeight,
            sourceLocalEditRegions: validRegions,
            sourceWidth: submitResult.data.sourceWidth,
          },
        },
      });

      for (let attempt = 0; attempt < LOCAL_EDIT_MAX_POLL_ATTEMPTS; attempt += 1) {
        await sleep(LOCAL_EDIT_POLL_INTERVAL_MS);
        const taskResult = await imageGenerationService.getImageTask(taskId);
        const task = taskResult.data?.task;
        const status = String(task?.status || "").toLowerCase();

        if (!taskResult.success || !task) {
          continue;
        }

        if (status === "succeeded" || status === "completed") {
          const generatedImage = task.result?.images?.[0];
          const generatedUrl =
            generatedImage?.originalUrl || generatedImage?.thumbnailUrl || "";
          if (!generatedUrl) {
            throw new Error("局部重绘已完成但未返回图片");
          }
          updateNode(newNodeId, {
            data: {
              src: generatedUrl,
              status: "completed",
              prompt:
                task.result?.prompt ||
                submitResult.data.displayPrompt ||
                submitResult.data.prompt ||
                `${actionName}结果`,
              title: `${displayTitle}-${actionName}`,
              originalSrc: data.src,
              model: task.result?.model || task.result?.modelRef || undefined,
              metadata: {
                editMode: "local-edit",
                sourceNodeId: node.id,
                aspectRatio: submitResult.data.aspectRatio,
                taskId,
                annotatedReferenceUrl: submitResult.data.annotatedReferenceUrl,
                localEditMode: false,
                localEditRegions: [],
                sourceHeight: submitResult.data.sourceHeight,
                sourceLocalEditRegions: validRegions,
                sourceWidth: submitResult.data.sourceWidth,
              },
            },
          });
          resetLocalEditState();
          toast.success("局部重绘结果已生成");
          return;
        }

        if (["failed", "cancelled", "expired", "banned"].includes(status)) {
          throw new Error(task.error || "局部重绘生成失败");
        }
      }

      throw new Error("局部重绘任务等待超时，请稍后重试");
    } catch (error) {
      const message = error instanceof Error ? error.message : "局部重绘失败";
      console.error("[Canvas Local Edit] failed:", error);
      updateNode(newNodeId, {
        data: {
          src: "",
          status: "failed",
          prompt: `${actionName}失败`,
          title: `${displayTitle}-${actionName}-失败`,
          originalSrc: data.src,
          metadata: {
            editMode: "local-edit",
            sourceNodeId: node.id,
            error: message,
            localEditMode: false,
            sourceLocalEditRegions: validRegions,
          },
        },
      });
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setIsSubmittingLocalEdit(false);
    }
  }, [
    addNode,
    commitLocalEditRegions,
    data.src,
    displayTitle,
    isProcessing,
    isSubmittingLocalEdit,
    localEditRegions,
    node.id,
    node.position.x,
    node.position.y,
    node.size.height,
    node.size.width,
    resetLocalEditState,
    selectNode,
    updateNode,
  ]);

  const handleConfirmBoxCutout = useCallback(async () => {
    if (!data.src) {
      toast.error("请先上传图片");
      return;
    }
    if (!boxCutoutSelection) {
      toast.info("请先框选要抠出的元素");
      return;
    }
    if (isProcessing) {
      toast.info("正在处理中，请稍候...");
      return;
    }

    setIsProcessing(true);
    const actionName = "区域抠图";
    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "",
        status: "generating",
        prompt: `${actionName}处理中...`,
        title: `${displayTitle}-${actionName}`,
        originalSrc: data.src,
        metadata: {
          cropRect: boxCutoutSelection,
          paddingRatio: BOX_CUTOUT_DEFAULT_PADDING_RATIO,
        },
      },
      connections: [node.id],
    });

    try {
      const result = await imageGenerationService.boxCutout({
        imageUrl: data.src,
        cropRect: boxCutoutSelection,
        paddingRatio: BOX_CUTOUT_DEFAULT_PADDING_RATIO,
        sourceNodeId: node.id,
      });

      if (result.success && result.data?.url) {
        const archivePatch = getImageArchiveIdentityPatch(result.data);
        updateNode(newNodeId, {
          data: {
            src: result.data.url,
            ...(archivePatch.assetId ? { assetId: archivePatch.assetId } : {}),
            status: "completed",
            prompt: `${actionName}结果`,
            title: `${displayTitle}-${actionName}`,
            originalSrc: data.src,
            metadata: {
              ...archivePatch.metadata,
              cropRect: boxCutoutSelection,
              cropRectApplied: result.data.cropRectApplied,
              paddedCropRectApplied: result.data.paddedCropRectApplied,
              paddingRatio: BOX_CUTOUT_DEFAULT_PADDING_RATIO,
              editMode: "box-cutout",
            },
          },
        });
        toast.success(`${actionName}完成`);
      } else {
        updateNode(newNodeId, {
          data: {
            src: "",
            status: "failed",
            prompt: `${actionName}失败`,
            title: `${displayTitle}-${actionName}-失败`,
            originalSrc: data.src,
            metadata: {
              cropRect: boxCutoutSelection,
              paddingRatio: BOX_CUTOUT_DEFAULT_PADDING_RATIO,
            },
          },
        });
        toast.error(result.error || `${actionName}失败`);
      }
    } catch (error) {
      console.error("区域抠图失败:", error);
      updateNode(newNodeId, {
        data: {
          src: "",
          status: "failed",
          prompt: `${actionName}失败`,
          title: `${displayTitle}-${actionName}-失败`,
          originalSrc: data.src,
          metadata: {
            cropRect: boxCutoutSelection,
            paddingRatio: BOX_CUTOUT_DEFAULT_PADDING_RATIO,
          },
        },
      });
      toast.error(`${actionName}失败，请重试`);
    } finally {
      setIsProcessing(false);
      resetBoxCutoutState();
    }
  }, [
    addNode,
    boxCutoutSelection,
    data.src,
    displayTitle,
    isProcessing,
    node.id,
    node.position.x,
    node.position.y,
    node.size.height,
    node.size.width,
    resetBoxCutoutState,
    updateNode,
  ]);

  const animateAddToChat = useCallback(async (previewUrl?: string) => {
    if (!containerRef.current || typeof window === "undefined") {
      return false;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }

    const target = document.querySelector(
      '[data-canvas-chat-input-anchor="true"]'
    ) as HTMLElement | null;
    if (!target) return false;

    const animationImageSrc = isHttpImageUrl(previewUrl)
      ? buildImageProxyUrl(previewUrl || "", {
          width: 360,
          quality: 76,
          format: "webp",
        })
      : isHttpImageUrl(data.src)
        ? buildImageProxyUrl(data.src, {
            width: 360,
            quality: 76,
            format: "webp",
          })
        : "";

    const sourceImage =
      (containerRef.current.querySelector("img") as HTMLImageElement | null) ||
      containerRef.current;
    const sourceRect = sourceImage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    if (
      sourceRect.width <= 0 ||
      sourceRect.height <= 0 ||
      targetRect.width <= 0 ||
      targetRect.height <= 0
    ) {
      return false;
    }

    const waitForAnimation = (
      animation: Animation | null,
      fallbackMs: number
    ) =>
      new Promise<void>((resolve) => {
        if (!animation) {
          resolve();
          return;
        }
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        const timeout = window.setTimeout(done, fallbackMs);
        animation.addEventListener(
          "finish",
          () => {
            window.clearTimeout(timeout);
            done();
          },
          { once: true }
        );
        animation.addEventListener(
          "cancel",
          () => {
            window.clearTimeout(timeout);
            done();
          },
          { once: true }
        );
      });

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;

    const labelText =
      displayTitle.length > 12
        ? `${displayTitle.slice(0, 10)}...`
        : displayTitle;
    const tagWidth = Math.min(172, Math.max(112, 58 + labelText.length * 8));
    const tagHeight = 34;
    const tagLeft = Math.min(
      Math.max(sourceCenterX - tagWidth / 2, 8),
      window.innerWidth - tagWidth - 8
    );
    const defaultTagTop = sourceRect.top - 46;
    const tagTop =
      defaultTagTop < 10
        ? Math.min(sourceRect.bottom + 10, window.innerHeight - tagHeight - 10)
        : defaultTagTop;

    const flightTag = document.createElement("div");
    flightTag.style.position = "fixed";
    flightTag.style.left = `${sourceRect.left}px`;
    flightTag.style.top = `${sourceRect.top}px`;
    flightTag.style.width = `${sourceRect.width}px`;
    flightTag.style.height = `${sourceRect.height}px`;
    flightTag.style.borderRadius = "14px";
    flightTag.style.overflow = "hidden";
    flightTag.style.pointerEvents = "none";
    flightTag.style.zIndex = "99999";
    flightTag.style.background = "#ffffff";
    flightTag.style.border = "1px solid rgba(148, 163, 184, 0.24)";
    flightTag.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.28)";
    flightTag.style.transformOrigin = "center center";
    flightTag.style.willChange = "transform, opacity, filter";

    if (animationImageSrc) {
      const previewImage = document.createElement("img");
      previewImage.src = animationImageSrc;
      previewImage.alt = "";
      previewImage.style.width = "100%";
      previewImage.style.height = "100%";
      previewImage.style.objectFit = "cover";
      flightTag.appendChild(previewImage);
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.width = "100%";
      placeholder.style.height = "100%";
      placeholder.style.background =
        "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(59,130,246,0.14))";
      flightTag.appendChild(placeholder);
    }
    document.body.appendChild(flightTag);

    const compressDx = tagLeft + tagWidth / 2 - sourceCenterX;
    const compressDy = tagTop + tagHeight / 2 - sourceCenterY;
    const compressScaleX = tagWidth / sourceRect.width;
    const compressScaleY = tagHeight / sourceRect.height;

    const compressAnimation = flightTag.animate(
      [
        {
          transform: "translate(0px, 0px) scale(1, 1)",
          borderRadius: "14px",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.28)",
        },
        {
          offset: 0.72,
          transform: `translate(${compressDx * 1.03}px, ${compressDy * 1.03}px) scale(${compressScaleX * 1.05}, ${compressScaleY * 1.08})`,
          borderRadius: "999px",
          boxShadow: "0 10px 24px rgba(59, 130, 246, 0.24)",
        },
        {
          transform: `translate(${compressDx}px, ${compressDy}px) scale(${compressScaleX}, ${compressScaleY})`,
          borderRadius: "999px",
          boxShadow: "0 8px 20px rgba(59, 130, 246, 0.2)",
        },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.2, 0.9, 0.2, 1.2)",
        fill: "forwards",
      }
    );
    await waitForAnimation(compressAnimation, 420);

    flightTag.style.left = `${tagLeft}px`;
    flightTag.style.top = `${tagTop}px`;
    flightTag.style.width = `${tagWidth}px`;
    flightTag.style.height = `${tagHeight}px`;
    flightTag.style.transform = "none";
    flightTag.style.borderRadius = "999px";
    flightTag.style.boxShadow = "0 8px 20px rgba(59, 130, 246, 0.2)";
    flightTag.style.display = "flex";
    flightTag.style.alignItems = "center";
    flightTag.style.gap = "6px";
    flightTag.style.padding = "4px 10px 4px 4px";
    flightTag.style.background = "rgba(255,255,255,0.96)";
    flightTag.style.backdropFilter = "blur(6px)";
    flightTag.innerHTML = "";

    const chipImage = document.createElement(animationImageSrc ? "img" : "span");
    if (animationImageSrc && chipImage instanceof HTMLImageElement) {
      chipImage.src = animationImageSrc;
      chipImage.alt = "";
    }
    chipImage.style.width = "24px";
    chipImage.style.height = "24px";
    chipImage.style.objectFit = "cover";
    chipImage.style.borderRadius = "999px";
    chipImage.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    chipImage.style.background = "rgba(59, 130, 246, 0.12)";

    const chipLabel = document.createElement("span");
    chipLabel.textContent = labelText || "图片";
    chipLabel.style.fontSize = "12px";
    chipLabel.style.fontWeight = "500";
    chipLabel.style.color = "rgb(51, 65, 85)";
    chipLabel.style.whiteSpace = "nowrap";
    chipLabel.style.overflow = "hidden";
    chipLabel.style.textOverflow = "ellipsis";

    flightTag.appendChild(chipImage);
    flightTag.appendChild(chipLabel);

    const tagCenterX = tagLeft + tagWidth / 2;
    const tagCenterY = tagTop + tagHeight / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height * 0.55;
    const flyDx = targetCenterX - tagCenterX;
    const flyDy = targetCenterY - tagCenterY;

    const flyAnimation = flightTag.animate(
      [
        {
          transform: "translate(0px, 0px) scale(1)",
          opacity: 1,
          filter: "blur(0px)",
        },
        {
          offset: 0.55,
          transform: `translate(${flyDx * 0.64}px, ${flyDy * 0.62 - 46}px) scale(0.94)`,
          opacity: 0.98,
          filter: "blur(0px)",
        },
        {
          offset: 0.84,
          transform: `translate(${flyDx + 9}px, ${flyDy - 7}px) scale(0.74)`,
          opacity: 0.82,
          filter: "blur(0.4px)",
        },
        {
          transform: `translate(${flyDx}px, ${flyDy}px) scale(0.64)`,
          opacity: 0.15,
          filter: "blur(1.2px)",
        },
      ],
      {
        duration: 760,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    target.animate(
      [
        { boxShadow: "0 0 0 0 rgba(59,130,246,0)", transform: "scale(1)" },
        {
          offset: 0.58,
          boxShadow: "0 0 0 8px rgba(59,130,246,0.14)",
          transform: "scale(1.02)",
        },
        { boxShadow: "0 0 0 0 rgba(59,130,246,0)", transform: "scale(1)" },
      ],
      { duration: 720, easing: "cubic-bezier(0.2, 0.9, 0.2, 1.2)" }
    );

    await waitForAnimation(flyAnimation, 860);
    flightTag.remove();

    return true;
  }, [data.src, displayTitle]);

  const handleAddToChat = useCallback(async () => {
    if (!data.src || isProcessing || isAddingToChat) return;
    setIsAddingToChat(true);

    try {
      const attachment = await resolveChatAttachmentFromImageSrc(
        data.src,
        displayTitle
      );
      await animateAddToChat(attachment.url);
      addPendingChatAttachment({
        url: attachment.url,
        name: displayTitle,
        contentType: attachment.contentType,
      });
      toast.success("已添加到对话框");
    } catch (error) {
      console.error("[CanvasImageNode] add to chat failed:", error);
      const message = getUploadErrorMessage(error, "添加到对话失败");
      if (message) {
        toast.error(message);
      }
    } finally {
      setIsAddingToChat(false);
    }
  }, [
    addPendingChatAttachment,
    animateAddToChat,
    data.src,
    displayTitle,
    isAddingToChat,
    isProcessing,
  ]);

  const getFloatingViewportBounds = (toolbarHeight: number) => {
    const viewportPadding = 12;

    let unsafeBottomTop = window.innerHeight;
    const bottomOverlaySelectors = ['[data-canvas-floating-toolbar="true"]'];

    for (const selector of bottomOverlaySelectors) {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(selector)
      );
      for (const element of elements) {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const overlayRect = element.getBoundingClientRect();
        if (overlayRect.width <= 0 || overlayRect.height <= 0) continue;
        if (overlayRect.bottom <= 0 || overlayRect.top >= window.innerHeight)
          continue;
        if (overlayRect.top < window.innerHeight * 0.55) continue;

        unsafeBottomTop = Math.min(unsafeBottomTop, overlayRect.top);
      }
    }

    const safeBottom = Math.max(
      viewportPadding,
      Math.min(
        window.innerHeight - viewportPadding,
        unsafeBottomTop - viewportPadding
      )
    );

    const stageElement = document.querySelector(
      '[data-canvas-stage="true"]'
    ) as HTMLElement | null;
    const panelElement = document.querySelector(
      '[data-canvas-right-panel="true"]'
    ) as HTMLElement | null;

    let safeLeft = viewportPadding;
    let safeRight = window.innerWidth - viewportPadding;
    if (stageElement) {
      const stageRect = stageElement.getBoundingClientRect();
      if (stageRect.width > 0) {
        safeLeft = Math.max(safeLeft, stageRect.left + viewportPadding);
        safeRight = Math.min(safeRight, stageRect.right - viewportPadding);
      }
    }
    if (panelElement) {
      const panelRect = panelElement.getBoundingClientRect();
      if (panelRect.width > 0 && panelRect.left < window.innerWidth) {
        safeRight = Math.min(safeRight, panelRect.left - viewportPadding);
      }
    }
    if (safeRight <= safeLeft + 8) {
      safeLeft = viewportPadding;
      safeRight = window.innerWidth - viewportPadding;
    }

    return {
      viewportPadding,
      safeBottom,
      safeLeft,
      safeRight,
      maxTop: Math.max(viewportPadding, safeBottom - toolbarHeight),
    };
  };

  // 获取工具栏位置 - 在渲染时直接计算
  const getToolbarPosition = () => {
    if (containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      const toolbarWidth = Math.max(
        280,
        (toolbarSize.width || 640) * FLOATING_TOOLBAR_SCALE
      );
      const toolbarHeight = Math.max(
        42,
        (toolbarSize.height || 60) * FLOATING_TOOLBAR_SCALE
      );
      const titleSafeHeight = 34;
      const gap = 12;
      const { viewportPadding, maxTop, safeBottom, safeLeft, safeRight } =
        getFloatingViewportBounds(toolbarHeight);

      let top = rect.bottom + gap;
      if (top + toolbarHeight > safeBottom) {
        top = rect.top - toolbarHeight - titleSafeHeight - gap;
      }
      top = Math.min(Math.max(top, viewportPadding), maxTop);

      const maxToolbarWidth = Math.max(180, safeRight - safeLeft);
      const effectiveToolbarWidth = Math.min(toolbarWidth, maxToolbarWidth);
      let left = rect.left + rect.width / 2 - effectiveToolbarWidth / 2;
      if (effectiveToolbarWidth >= maxToolbarWidth - 1) {
        left = safeLeft;
      } else {
        left = Math.min(
          Math.max(left, safeLeft),
          safeRight - effectiveToolbarWidth
        );
      }

      return {
        top,
        left,
        maxWidth: maxToolbarWidth,
      };
    }
    return { top: 0, left: 0, maxWidth: 480 };
  };

  const getBoxCutoutToolbarPosition = () => {
    if (containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      const toolbarWidth = Math.max(
        240,
        (boxCutoutToolbarSize.width || 460) * FLOATING_TOOLBAR_SCALE
      );
      const toolbarHeight = Math.max(
        42,
        (boxCutoutToolbarSize.height || 60) * FLOATING_TOOLBAR_SCALE
      );
      const gap = 14;
      const { viewportPadding, safeBottom, safeLeft, safeRight, maxTop } =
        getFloatingViewportBounds(toolbarHeight);

      let top = rect.bottom + gap;
      if (top + toolbarHeight > safeBottom) {
        top = rect.top - toolbarHeight - gap;
      }
      top = Math.min(Math.max(top, viewportPadding), maxTop);

      const maxToolbarWidth = Math.max(180, safeRight - safeLeft);
      const effectiveToolbarWidth = Math.min(toolbarWidth, maxToolbarWidth);
      let left = rect.left + rect.width / 2 - effectiveToolbarWidth / 2;
      if (effectiveToolbarWidth >= maxToolbarWidth - 1) {
        left = safeLeft;
      } else {
        left = Math.min(
          Math.max(left, safeLeft),
          safeRight - effectiveToolbarWidth
        );
      }

      return {
        top,
        left,
        maxWidth: maxToolbarWidth,
      };
    }
    return { top: 0, left: 0, maxWidth: 460 };
  };

  const getImageAdjustPanelPosition = () => {
    if (!containerRef.current || typeof window === "undefined") {
      return { top: 0, left: 0 };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = 520 * IMAGE_EDIT_PANEL_SCALE;
    const panelHeight = 760 * IMAGE_EDIT_PANEL_SCALE;
    const spacing = 18;
    const maxTop = Math.max(12, window.innerHeight - panelHeight);

    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - spacing);
    }

    const top = Math.min(Math.max(12, rect.top + 10), maxTop);
    return { top, left };
  };

  const getCropPanelPosition = () => {
    if (!containerRef.current || typeof window === "undefined") {
      return { top: 0, left: 0 };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = 474 * IMAGE_EDIT_PANEL_SCALE;
    const panelHeight = 980 * IMAGE_EDIT_PANEL_SCALE;
    const spacing = 16;
    const maxTop = Math.max(12, window.innerHeight - panelHeight);

    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - spacing);
    }

    const top = Math.min(Math.max(12, rect.top - 4), maxTop);
    return { top, left };
  };

  const getFlipRotatePanelPosition = () => {
    if (!containerRef.current || typeof window === "undefined") {
      return { top: 0, left: 0, maxWidth: 660 * IMAGE_EDIT_PANEL_SCALE };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = 640 * IMAGE_EDIT_PANEL_SCALE;
    const panelHeight = 84 * IMAGE_EDIT_PANEL_SCALE;
    const gap = 18;
    const titleSafeHeight = 34;
    const { viewportPadding, safeLeft, safeRight, maxTop } =
      getFloatingViewportBounds(panelHeight);

    let top = rect.top - panelHeight - titleSafeHeight - gap;
    if (top < viewportPadding) {
      top = rect.bottom + gap;
    }
    top = Math.min(Math.max(top, viewportPadding), maxTop);

    const maxPanelWidth = Math.max(220, safeRight - safeLeft);
    const effectivePanelWidth = Math.min(panelWidth, maxPanelWidth);
    let left = rect.left + rect.width / 2 - effectivePanelWidth / 2;
    if (effectivePanelWidth >= maxPanelWidth - 1) {
      left = safeLeft;
    } else {
      left = Math.min(Math.max(left, safeLeft), safeRight - effectivePanelWidth);
    }

    return {
      top,
      left,
      maxWidth: maxPanelWidth,
    };
  };

  const getTextPanelPosition = () => {
    if (!containerRef.current || typeof window === "undefined") {
      return { top: 0, left: 0 };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = 360;
    const spacing = 12;
    const maxTop = Math.max(12, window.innerHeight - 460);

    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - spacing);
    }

    const top = Math.min(Math.max(12, rect.top), maxTop);
    return { top, left };
  };

  const getAnglePanelPosition = () => {
    if (!containerRef.current || typeof window === "undefined") {
      return { top: 0, left: 0 };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const panelWidth = ANGLE_PANEL_SOURCE_WIDTH * ANGLE_PANEL_SCALE;
    const panelHeight = ANGLE_PANEL_SOURCE_HEIGHT * ANGLE_PANEL_SCALE;
    const spacing = 16;
    const maxTop = Math.max(12, window.innerHeight - panelHeight);

    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - spacing);
    }

    const top = Math.min(Math.max(12, rect.top - 8), maxTop);
    return { top, left };
  };

  const handleResetAnglePanel = useCallback(() => {
    setAnglePanelMode("camera");
    setAngleHorizontalAngle(-50);
    setAngleVerticalAngle(-30);
    setAngleZoom(50);
  }, []);

  const handleAnglePreviewPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isApplyingAngleEdit) return;
      anglePreviewDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startHorizontalAngle: angleHorizontalAngle,
        startVerticalAngle: angleVerticalAngle,
      };
      setIsAnglePreviewDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [angleHorizontalAngle, angleVerticalAngle, isApplyingAngleEdit]
  );

  const handleAnglePreviewPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = anglePreviewDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      setAngleHorizontalAngle(
        clampNumber(
          dragState.startHorizontalAngle +
            deltaX * ANGLE_PREVIEW_HORIZONTAL_DRAG_MULTIPLIER,
          -180,
          180
        )
      );
      setAngleVerticalAngle(
        clampNumber(
          dragState.startVerticalAngle -
            deltaY * ANGLE_PREVIEW_VERTICAL_DRAG_MULTIPLIER,
          -30,
          60
        )
      );
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleAnglePreviewPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (anglePreviewDragRef.current?.pointerId !== event.pointerId) return;
      anglePreviewDragRef.current = null;
      setIsAnglePreviewDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleApplyFlipRotate = useCallback(
    async (action: FlipRotateEditAction) => {
      if (!data.src) {
        toast.error("请先上传图片");
        return;
      }

      if (isApplyingFlipRotate) {
        return;
      }

      if (action === "reset") {
        if (!hasFlipRotateReset) {
          toast.info("当前图片没有可恢复的翻转记录");
          return;
        }

        const nextMetadata =
          data.metadata && typeof data.metadata === "object"
            ? { ...(data.metadata as Record<string, unknown>) }
            : {};
        delete nextMetadata.flipRotateOriginalSrc;
        delete nextMetadata.flipRotateLastAction;
        delete nextMetadata.flipRotateUpdatedAt;

        updateNode(node.id, {
          data: {
            ...data,
            src: flipRotateOriginalSrc,
            status: "completed",
            metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined,
          },
        });
        toast.success("已恢复翻转前图片");
        return;
      }

      setIsApplyingFlipRotate(true);
      setIsProcessing(true);

      try {
        const nextUrl = await renderAndUploadFlippedImage(
          data.src,
          action,
          `${displayTitle}-${action === "horizontal" ? "水平翻转" : "垂直翻转"}`
        );

        updateNode(node.id, {
          data: {
            ...data,
            src: nextUrl,
            status: "completed",
            originalSrc: data.originalSrc || data.src,
            metadata: {
              ...(data.metadata || {}),
              flipRotateOriginalSrc: flipRotateOriginalSrc || data.src,
              flipRotateLastAction: action,
              flipRotateUpdatedAt: new Date().toISOString(),
            },
          },
        });

        toast.success(action === "horizontal" ? "已完成水平翻转" : "已完成垂直翻转");
      } catch (error) {
        const message = error instanceof Error ? error.message : "翻转失败";
        toast.error(message);
      } finally {
        setIsApplyingFlipRotate(false);
        setIsProcessing(false);
      }
    },
    [
      data,
      displayTitle,
      flipRotateOriginalSrc,
      hasFlipRotateReset,
      isApplyingFlipRotate,
      node.id,
      updateNode,
    ]
  );

  const handleApplyAngleEdit = useCallback(async () => {
    if (!data.src) {
      toast.error("请先上传图片");
      return;
    }

    if (!isHttpImageUrl(data.src)) {
      toast.error("仅支持 URL 图片，不允许 base64 传输");
      return;
    }

    if (isApplyingAngleEdit) {
      return;
    }

    setIsApplyingAngleEdit(true);
    setIsProcessing(true);

    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "",
        status: "generating",
        prompt: "多视角处理中...",
        title: `${displayTitle}-多视角`,
        originalSrc: data.src,
        metadata: {
          angleEditSettings: {
            mode: anglePanelMode,
            horizontalAngle: Math.round(angleHorizontalAngle),
            verticalAngle: Math.round(angleVerticalAngle),
            zoom: Math.round(angleZoom),
          },
        },
      },
      connections: [node.id],
    });

    try {
      const result = await imageGenerationService.editAngle({
        imageUrl: data.src,
        horizontalAngle: normalizeAnglePanelHorizontalAngle(
          Math.round(angleHorizontalAngle)
        ),
        verticalAngle: Math.round(angleVerticalAngle),
        zoom: mapAnglePanelZoomToApi(angleZoom),
      });

      if (!result.success || !result.data?.url) {
        throw new Error(result.error || "多视角生成失败");
      }

      updateNode(newNodeId, {
        data: {
          src: result.data.url,
          status: "completed",
          prompt: result.data.prompt || "多视角结果",
          title: `${displayTitle}-多视角`,
          originalSrc: data.src,
          metadata: {
            angleEditSettings: {
              mode: anglePanelMode,
              horizontalAngle: Math.round(angleHorizontalAngle),
              verticalAngle: Math.round(angleVerticalAngle),
              zoom: Math.round(angleZoom),
            },
            angles: result.data.angles || null,
          },
        },
      });

      updateNode(node.id, {
        data: {
          ...data,
          metadata: {
            ...(data.metadata || {}),
            angleEditSettings: {
              mode: anglePanelMode,
              horizontalAngle: Math.round(angleHorizontalAngle),
              verticalAngle: Math.round(angleVerticalAngle),
              zoom: Math.round(angleZoom),
            },
          },
        },
      });

      selectNode(newNodeId);
      setAnglePanelOpen(false);
      toast.success("多视角结果已生成");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "多视角生成失败";
      updateNode(newNodeId, {
        data: {
          src: "",
          status: "failed",
          prompt: "多视角生成失败",
          title: `${displayTitle}-多视角失败`,
          originalSrc: data.src,
        },
      });
      toast.error(message);
    } finally {
      setIsApplyingAngleEdit(false);
      setIsProcessing(false);
    }
  }, [
    addNode,
    angleHorizontalAngle,
    anglePanelMode,
    angleVerticalAngle,
    angleZoom,
    data,
    displayTitle,
    isApplyingAngleEdit,
    node.id,
    node.position.x,
    node.position.y,
    node.size.height,
    node.size.width,
    selectNode,
    updateNode,
  ]);

  const handleSaveTitle = useCallback(() => {
    const nextTitle = normalizeImageTitle(draftTitle) || displayTitle;
    updateNode(node.id, {
      data: {
        ...data,
        title: nextTitle,
      },
    });
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
    toast.success("图片名称已更新");
  }, [data, displayTitle, draftTitle, node.id, updateNode]);

  const handleOpenImageAdjustPanel = useCallback(() => {
    setCropPanelOpen(false);
    setCropInteraction(null);
    setFlipRotatePanelOpen(false);
    setAnglePanelOpen(false);
    setTextEditPanelOpen(false);
    setNotePanelOpen(false);
    resetBoxCutoutState();
    setImageAdjustTab("light");
    setImageAdjustmentsDraft(storedImageAdjustments);
    setImageAdjustPanelOpen(true);
  }, [resetBoxCutoutState, storedImageAdjustments]);

  const handleResetImageAdjustments = useCallback(() => {
    setImageAdjustmentsDraft(DEFAULT_IMAGE_ADJUSTMENTS);
  }, []);

  const handleOpenCropPanel = useCallback(() => {
    setImageAdjustPanelOpen(false);
    setFlipRotatePanelOpen(false);
    setAnglePanelOpen(false);
    setTextEditPanelOpen(false);
    setNotePanelOpen(false);
    resetBoxCutoutState();
    setCropInteraction(null);
    setCropPanelOpen(true);
    window.requestAnimationFrame(() => {
      refreshBoxCutoutMetrics();
    });
  }, [refreshBoxCutoutMetrics, resetBoxCutoutState]);

  const handleToggleCropGroup = useCallback((groupKey: CropPanelGroupKey) => {
    setCropExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  const handleSelectCropPreset = useCallback((presetId: string) => {
    const preset = getCropPresetById(presetId);
    if (!preset) return;

    const centerX = cropRect ? cropRect.x + cropRect.width / 2 : 0.5;
    const centerY = cropRect ? cropRect.y + cropRect.height / 2 : 0.5;
    setCropPresetId(preset.id);
    setCropLockAspectRatio(true);
    setCropRect(createCenteredCropRectForAspect(preset.ratio, centerX, centerY));
  }, [cropRect]);

  const handleChangeCropDimension = useCallback(
    (dimension: "width" | "height", rawValue: string) => {
      if (!cropRect || !cropImageMetrics) return;

      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < BOX_CUTOUT_MIN_EDGE_PX) {
        return;
      }

      const naturalWidth = cropImageMetrics.naturalWidth;
      const naturalHeight = cropImageMetrics.naturalHeight;
      if (!naturalWidth || !naturalHeight) return;

      let nextWidth = dimension === "width" ? parsed : cropPixelSize.width;
      let nextHeight = dimension === "height" ? parsed : cropPixelSize.height;

      const lockedAspect =
        cropLockAspectRatio &&
        (selectedCropPreset?.ratio ||
          (currentCropAspectRatio && Number.isFinite(currentCropAspectRatio)
            ? currentCropAspectRatio
            : null));

      if (lockedAspect) {
        if (dimension === "width") {
          nextHeight = Math.round(nextWidth / lockedAspect);
        } else {
          nextWidth = Math.round(nextHeight * lockedAspect);
        }
      }

      nextWidth = clampNumber(nextWidth, BOX_CUTOUT_MIN_EDGE_PX, naturalWidth);
      nextHeight = clampNumber(nextHeight, BOX_CUTOUT_MIN_EDGE_PX, naturalHeight);

      const centerX = cropRect.x + cropRect.width / 2;
      const centerY = cropRect.y + cropRect.height / 2;
      let normalizedWidth = nextWidth / naturalWidth;
      let normalizedHeight = nextHeight / naturalHeight;

      if (lockedAspect) {
        const fitted = createCenteredCropRectForAspect(lockedAspect, centerX, centerY);
        const maxWidth = fitted.width * naturalWidth;
        const maxHeight = fitted.height * naturalHeight;
        if (nextWidth > maxWidth || nextHeight > maxHeight) {
          normalizedWidth = fitted.width;
          normalizedHeight = fitted.height;
        }
      }

      setCropRect(
        createCenteredCropRectFromSize(
          centerX,
          centerY,
          normalizedWidth,
          normalizedHeight
        )
      );
    },
    [
      cropImageMetrics,
      cropLockAspectRatio,
      cropPixelSize.height,
      cropPixelSize.width,
      cropRect,
      currentCropAspectRatio,
      selectedCropPreset,
    ]
  );

  const handleCropPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropRect || !cropPanelOpen || isApplyingCrop) return;

      const target = event.target as HTMLElement | null;
      const interactive = target?.closest<HTMLElement>("[data-crop-handle]");
      const handle =
        (interactive?.dataset.cropHandle as CropInteractionHandle | undefined) ||
        null;
      if (!handle) return;

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult?.insideImage) return;

      event.preventDefault();
      event.stopPropagation();

      setCropInteraction({
        handle,
        pointerId: event.pointerId,
        startPoint: pointerResult.point,
        startRect: cropRect,
      });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [cropPanelOpen, cropRect, getBoxCutoutPointerPoint, isApplyingCrop]
  );

  const handleCropPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropInteraction || !cropImageMetrics) return;

      const pointerResult = getBoxCutoutPointerPoint(
        event.clientX,
        event.clientY
      );
      if (!pointerResult) return;

      event.preventDefault();
      event.stopPropagation();

      const minSize = getNormalizedMinCropSize(
        cropImageMetrics.naturalWidth,
        cropImageMetrics.naturalHeight
      );

      setCropRect(
        updateCropRectWithPointer({
          aspectRatio: effectiveCropAspectRatio,
          handle: cropInteraction.handle,
          minHeight: minSize.height,
          minWidth: minSize.width,
          pointer: pointerResult.point,
          startPoint: cropInteraction.startPoint,
          startRect: cropInteraction.startRect,
        })
      );
    },
    [cropImageMetrics, cropInteraction, effectiveCropAspectRatio, getBoxCutoutPointerPoint]
  );

  const handleCropPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropInteraction) return;
      event.preventDefault();
      event.stopPropagation();
      setCropInteraction(null);
      event.currentTarget.releasePointerCapture?.(cropInteraction.pointerId);
    },
    [cropInteraction]
  );

  const handleCropPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!cropInteraction) return;
      event.preventDefault();
      event.stopPropagation();
      setCropInteraction(null);
      event.currentTarget.releasePointerCapture?.(cropInteraction.pointerId);
    },
    [cropInteraction]
  );

  const handleApplyCrop = useCallback(async () => {
    if (!data.src || !cropRect) {
      toast.error("当前没有可用的裁剪区域");
      return;
    }

    if (isApplyingCrop) {
      return;
    }

    setIsApplyingCrop(true);
    setIsProcessing(true);

    try {
      const result = await renderAndUploadCroppedImage(
        data.src,
        cropRect,
        `${displayTitle}-裁剪`
      );

      updateNode(node.id, {
        data: {
          ...data,
          src: result.url,
          status: "completed",
          originalSrc: data.originalSrc || data.src,
          metadata: {
            ...(data.metadata || {}),
            compareSourceUrl: data.src,
            cropPresetId,
            cropLockAspectRatio,
            cropUpdatedAt: new Date().toISOString(),
            originalWidth: result.width,
            originalHeight: result.height,
          },
        },
      });

      setCropPanelOpen(false);
      setCropInteraction(null);
      setCropRect(null);
      toast.success("裁剪已完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "裁剪失败";
      toast.error(message);
    } finally {
      setIsApplyingCrop(false);
      setIsProcessing(false);
    }
  }, [
    cropLockAspectRatio,
    cropPresetId,
    cropRect,
    data,
    displayTitle,
    isApplyingCrop,
    node.id,
    updateNode,
  ]);

  const handleOpenNotePanel = useCallback(() => {
    setCropPanelOpen(false);
    setCropInteraction(null);
    setImageAdjustPanelOpen(false);
    setFlipRotatePanelOpen(false);
    setAnglePanelOpen(false);
    setTextEditPanelOpen(false);
    setDraftNote(data.note || "");
    setNotePanelOpen(true);
  }, [data.note]);

  const handleSaveNote = useCallback(() => {
    const nextNote = draftNote.trim();
    updateNode(node.id, {
      data: {
        ...data,
        note: nextNote || undefined,
      },
    });
    setDraftNote(nextNote);
    setNotePanelOpen(false);
    toast.success(nextNote ? "备注已保存" : "备注已清除");
  }, [data, draftNote, node.id, updateNode]);

  const detectTextItems = useCallback(
    async (forceRefresh = false) => {
      if (!data.src) {
        toast.error("请先上传图片");
        return;
      }

      if (!isHttpImageUrl(data.src)) {
        toast.error("仅支持 URL 图片，不允许 base64 传输");
        return;
      }

      if (isDetectingText) {
        return;
      }

      if (!forceRefresh && data.textEditSource === data.src) {
        const cached = normalizeTextEditItems(data.textEditItems);
        if (cached.length > 0) {
          setTextEditItems(cached);
          setDeletedTextItems([]);
          setTextEditError(null);
          return;
        }
      }

      setIsDetectingText(true);
      setTextEditError(null);

      try {
        const result = await imageGenerationService.detectCanvasText(data.src);

        if (!result.success) {
          throw new Error(result.error || "文字识别失败");
        }

        const detectedItems: ImageTextEditItem[] = (result.data?.items || [])
          .map((item, index) => {
            const text = (item.text || "").trim();
            if (!text) return null;
            return {
              id: item.id || String(index + 1),
              originalText: text,
              editedText: text,
              textColor: undefined,
              confidence: item.confidence,
            } as ImageTextEditItem;
          })
          .filter((item): item is ImageTextEditItem => !!item);

        setTextEditItems(detectedItems);
        setDeletedTextItems([]);

        updateNode(node.id, {
          data: {
            ...data,
            textEditItems: detectedItems,
            textEditSource: data.src,
            textEditUpdatedAt: new Date().toISOString(),
          },
        });

        if (detectedItems.length === 0) {
          toast.info("未识别到可编辑文字");
        } else {
          toast.success(`已识别 ${detectedItems.length} 段文字`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "文字识别失败";
        setTextEditError(message);
        toast.error(message);
      } finally {
        setIsDetectingText(false);
      }
    },
    [data, isDetectingText, node.id, updateNode]
  );

  const handleOpenTextEdit = useCallback(async () => {
    setCropPanelOpen(false);
    setCropInteraction(null);
    setImageAdjustPanelOpen(false);
    setFlipRotatePanelOpen(false);
    setAnglePanelOpen(false);
    setNotePanelOpen(false);
    setTextEditPanelOpen(true);
    setTextEditError(null);

    const cached = normalizeTextEditItems(data.textEditItems);
    if (cached.length > 0 && data.textEditSource === data.src) {
      setTextEditItems(cached);
      setDeletedTextItems([]);
      return;
    }

    await detectTextItems(true);
  }, [data.src, data.textEditItems, data.textEditSource, detectTextItems]);

  useEffect(() => {
    if (!imageNodeActionRequest || imageNodeActionRequest.nodeId !== node.id) {
      return;
    }

    clearImageNodeActionRequest();

    if (imageNodeActionRequest.action === "box-cutout") {
      handleEnterBoxCutoutMode();
      return;
    }

    if (imageNodeActionRequest.action === "text-edit") {
      void handleOpenTextEdit();
      return;
    }

    if (imageNodeActionRequest.action === "local-edit") {
      handleEnterLocalEditMode();
    }
  }, [
    clearImageNodeActionRequest,
    handleEnterBoxCutoutMode,
    handleEnterLocalEditMode,
    handleOpenTextEdit,
    imageNodeActionRequest,
    node.id,
  ]);

  const handleTextItemChange = (id: string, value: string) => {
    setTextEditItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, editedText: value } : item
      )
    );
  };

  const handleTextItemColorChange = (id: string, value?: string) => {
    setTextEditItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, textColor: normalizeOptionalHexColor(value) }
          : item
      )
    );
  };

  const handleRemoveTextItem = (id: string) => {
    setTextEditItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.originalText) {
        setDeletedTextItems((deletedPrev) => {
          if (deletedPrev.some((item) => item.id === id)) return deletedPrev;
          return [...deletedPrev, { id, originalText: target.originalText }];
        });
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const hasTextEditChanges = useMemo(
    () =>
      textEditItems.some((item) => {
        const originalText = item.originalText.trim();
        const editedText = item.editedText.trim();
        return (
          originalText.length > 0 &&
          (editedText.length === 0 ||
            editedText !== originalText ||
            Boolean(normalizeOptionalHexColor(item.textColor)))
        );
      }) ||
      deletedTextItems.some((item) => item.originalText.trim().length > 0),
    [deletedTextItems, textEditItems]
  );

  const handleApplyTextEdit = useCallback(async () => {
    if (!data.src) {
      toast.error("请先上传图片");
      return;
    }

    if (!isHttpImageUrl(data.src)) {
      toast.error("仅支持 URL 图片，不允许 base64 传输");
      return;
    }

    const changedItems: CanvasTextEditPayloadItem[] = textEditItems
      .map((item) => {
        const editedText = item.editedText.trim();
        const action: "replace" | "delete" =
          editedText.length === 0 ? "delete" : "replace";
        return {
          id: item.id,
          originalText: item.originalText.trim(),
          editedText,
          textColor: normalizeOptionalHexColor(item.textColor),
          action,
        };
      })
      .filter(
        (item) =>
          item.originalText.length > 0 &&
          (item.action === "delete" ||
            (item.editedText &&
              item.editedText.length > 0 &&
              (item.originalText !== item.editedText ||
                Boolean(item.textColor))))
      );

    const removedItems: CanvasTextEditPayloadItem[] = deletedTextItems
      .map((item) => ({
        id: item.id,
        originalText: item.originalText.trim(),
        action: "delete" as const,
      }))
      .filter((item) => item.originalText.length > 0);

    const requestItems = [...changedItems, ...removedItems];

    if (requestItems.length === 0) {
      toast.info("请先修改文字内容、选择文字颜色，或点击垃圾桶删除该文字");
      return;
    }

    if (isApplyingTextEdit) {
      return;
    }

    setIsApplyingTextEdit(true);
    setIsProcessing(true);
    setTextEditError(null);

    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "",
        status: "generating",
        prompt: "文字替换处理中...",
        title: `${displayTitle}-文字替换`,
        originalSrc: data.src,
      },
      connections: [node.id],
    });

    try {
      const result = await imageGenerationService.editCanvasText({
        imageUrl: data.src,
        items: requestItems,
      });

      if (!result.success || !result.data?.originalUrl) {
        throw new Error(result.error || "文字替换失败");
      }

      updateNode(newNodeId, {
        data: {
          src: result.data.originalUrl,
          status: "completed",
          prompt: "文字替换结果",
          title: `${displayTitle}-文字替换`,
          originalSrc: data.src,
          model: result.data.model,
        },
      });

      updateNode(node.id, {
        data: {
          ...data,
          textEditItems,
          textEditSource: data.src,
          textEditUpdatedAt: new Date().toISOString(),
        },
      });

      setTextEditPanelOpen(false);
      setDeletedTextItems([]);
      toast.success("文字替换已完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "文字替换失败";
      setTextEditError(message);
      updateNode(newNodeId, {
        data: {
          src: "",
          status: "failed",
          prompt: "文字替换失败",
          title: `${displayTitle}-文字替换失败`,
          originalSrc: data.src,
          metadata: { editMode: "text-edit", error: message },
        },
      });
      toast.error(message);
    } finally {
      setIsApplyingTextEdit(false);
      setIsProcessing(false);
    }
  }, [
    addNode,
    data,
    deletedTextItems,
    isApplyingTextEdit,
    node.id,
    node.position.x,
    node.position.y,
    node.size.height,
    node.size.width,
    textEditItems,
    updateNode,
  ]);

  // 触发文件选择
  const handleSelectFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // 处理图片上传 - 上传到存储桶，不使用 Base64
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }

    // 验证文件大小 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("图片大小不能超过 50MB");
      return;
    }

    setIsUploading(true);
    // 先显示上传中状态
    updateNode(node.id, {
      data: { ...data, status: "generating" },
    });

    try {
      const fileBaseName = file.name.replace(/\.[^.]+$/, "");
      // 上传到存储桶
      const result = await imageGenerationService.uploadImage(file);

      if (result.success && result.data?.url) {
        updateNode(node.id, {
          data: {
            ...data,
            src: result.data.url,
            assetId: result.data.assetId,
            status: "completed",
            title: normalizeImageTitle(data.title) || fileBaseName,
          },
        });
        toast.success("图片上传成功");
      } else if (result.providerApiKeyPrompted) {
        updateNode(node.id, {
          data: { ...data },
        });
      } else {
        updateNode(node.id, {
          data: { ...data, status: "failed" },
        });
        toast.error(result.error || "图片上传失败");
      }
    } catch (error) {
      console.error("图片上传失败:", error);
      updateNode(node.id, {
        data: { ...data, status: "failed" },
      });
      toast.error("图片上传失败，请重试");
    } finally {
      setIsUploading(false);
    }

    // 重置 input
    e.target.value = "";
  };

  // 获取操作的中文名称
  const getActionName = (action: string): string => {
    const names: Record<string, string> = {
      rmbg: "去背景",
      watermark: "去水印",
      enhance: "超清",
      extend: "扩画布",
      crop: "裁图",
      adjust: "调色",
      "flip-rotate": "翻转",
      resize: "改尺寸",
      angle: "换视角",
      "layer-split": "拆图层",
      annotate: "标注",
      "text-edit": "改文字",
      note: "加备注",
      "prompt-regenerate": "重绘",
      "box-cutout": "区域抠图",
      "local-edit": "局部重绘",
    };
    return names[action] || action;
  };

  useEffect(() => {
    if (!angleEditEnabled && anglePanelOpen) {
      setAnglePanelOpen(false);
    }
  }, [angleEditEnabled, anglePanelOpen]);

  // 处理图片编辑操作 - 集成我们现有的 API
  const handleAction = async (action: string) => {
    if (!data.src) {
      toast.error("请先上传图片");
      return;
    }
    if (
      AI_CLOUD_IMAGE_ACTIONS.has(action) &&
      (isCanvasImageUploadPending(node) || !isHttpImageUrl(data.src))
    ) {
      toast.error("图片仍在本地，上传完成后再进行 AI 处理");
      return;
    }
    if (isProcessing) {
      toast.info("正在处理中，请稍候...");
      return;
    }
    if (action !== "local-edit") {
      resetLocalEditState();
    }

    // 对话框类型的操作
    if (action === "crop") {
      handleOpenCropPanel();
      return;
    }
    if (action === "adjust") {
      handleOpenImageAdjustPanel();
      return;
    }
    if (action === "flip-rotate") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setAnglePanelOpen(false);
      setTextEditPanelOpen(false);
      setNotePanelOpen(false);
      resetBoxCutoutState();
      setFlipRotatePanelOpen(true);
      return;
    }
    if (action === "angle") {
      if (!angleEditEnabled) {
        toast.info("多视角功能未开启");
        return;
      }
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setTextEditPanelOpen(false);
      setNotePanelOpen(false);
      resetBoxCutoutState();
      setAnglePanelOpening(true);
      setAnglePanelOpen(true);
      return;
    }
    if (action === "resize") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setResizeAnnotatorOpen(true);
      return;
    }
    if (action === "layer-split") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      if (!isLayerSplitEnabled) {
        toast.info("图层拆分功能未开启");
        return;
      }
      setIsProcessing(true);
      try {
        const result = await imageGenerationService.splitImageLayers(data.src);
        const layers = result.data?.layers || [];

        if (!result.success || layers.length === 0) {
          toast.error(result.error || "图层拆分失败");
          return;
        }

        const addedLayerCount = handleLayerSplitComplete(
          layers.map((layer) => ({
            originalUrl: layer.originalUrl,
            assetId: layer.assetId || layer.mediaAssetId || undefined,
            mediaAssetId: layer.mediaAssetId || layer.assetId || undefined,
            generatedImageId: layer.generatedImageId || undefined,
            title: layer.title,
            layerIndex: layer.layerIndex,
            totalLayers: layer.totalLayers,
            bounds: layer.bounds ?? null,
          }))
        );
        toast.success(`图层拆分完成，已新增 ${addedLayerCount} 个图层结果`);
      } catch (error) {
        console.error("图层拆分失败:", error);
        toast.error("图层拆分失败");
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    if (action === "box-cutout") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      handleEnterBoxCutoutMode();
      return;
    }
    if (action === "local-edit") {
      handleEnterLocalEditMode();
      return;
    }
    if (action === "annotate") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setAnnotatorOpen(true);
      return;
    }
    if (action === "text-edit") {
      await handleOpenTextEdit();
      return;
    }
    if (action === "note") {
      handleOpenNotePanel();
      return;
    }
    if (action === "prompt-regenerate") {
      setCropPanelOpen(false);
      setCropInteraction(null);
      setImageAdjustPanelOpen(false);
      setFlipRotatePanelOpen(false);
      setAnglePanelOpen(false);
      setRegeneratePrompt(resolveRegeneratePromptSeed(data));
      setPromptDialogOpen(true);
      return;
    }
    const actionName = getActionName(action);

    setImageAdjustPanelOpen(false);
    setCropPanelOpen(false);
    setCropInteraction(null);
    setFlipRotatePanelOpen(false);
    setAnglePanelOpen(false);
    setIsProcessing(true);
    // 先创建一个"处理中"状态的节点，显示在原图右侧
    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "", // 暂时没有图片
        status: "generating",
        prompt: `${actionName}处理中...`,
        title: `${displayTitle}-${actionName}`,
        originalSrc: data.src,
      },
      connections: [node.id],
    });

    let result;

    try {
      switch (action) {
        case "rmbg":
          result = await imageGenerationService.removeBackground(data.src);
          break;
        case "watermark":
          result = await imageGenerationService.removeWatermark(data.src);
          break;
        case "enhance":
          result = await imageGenerationService.enhanceImage(data.src);
          break;
        case "extend":
          result = await imageGenerationService.extendImage(data.src);
          break;
        default:
          // 删除创建的节点
          if (newNodeId) deleteNode(newNodeId);
          return;
      }

      if (result?.success && result.data?.url) {
        const archivePatch = getImageArchiveIdentityPatch(result.data);
        // 更新节点为完成状态
        if (newNodeId) {
          updateNode(newNodeId, {
            data: {
              src: result.data.url,
              ...(archivePatch.assetId ? { assetId: archivePatch.assetId } : {}),
              status: "completed",
              prompt: `${actionName}结果`,
              title: `${displayTitle}-${actionName}`,
              originalSrc: data.src,
              ...(Object.keys(archivePatch.metadata).length > 0
                ? { metadata: archivePatch.metadata }
                : {}),
            },
          });
        }
        toast.success(`${actionName}处理完成`);
      } else {
        // 更新节点为失败状态
        if (newNodeId) {
          updateNode(newNodeId, {
            data: {
              src: "",
              status: "failed",
              prompt: `${actionName}失败`,
              title: `${displayTitle}-${actionName}-失败`,
              originalSrc: data.src,
            },
          });
        }
        toast.error(result?.error || "处理失败");
      }
    } catch (error) {
      console.error(`${action} 处理失败:`, error);
      // 更新节点为失败状态
      if (newNodeId) {
        updateNode(newNodeId, {
          data: {
            src: "",
            status: "failed",
            prompt: `${actionName}失败`,
            title: `${displayTitle}-${actionName}-失败`,
            originalSrc: data.src,
          },
        });
      }
      toast.error("处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onExternalAction = (event: Event) => {
      const customEvent = event as CustomEvent<{
        nodeId?: string;
        action?: string;
      }>;
      const targetNodeId = customEvent.detail?.nodeId;
      const action = customEvent.detail?.action;

      if (!targetNodeId || !action || targetNodeId !== node.id) return;
      void handleAction(action);
    };

    window.addEventListener(
      "canvas:image-action",
      onExternalAction as EventListener
    );
    return () => {
      window.removeEventListener(
        "canvas:image-action",
        onExternalAction as EventListener
      );
    };
  }, [handleAction, node.id]);

  const handleLayerSplitComplete = useCallback(
    (
      layers: Array<{
        originalUrl: string;
        assetId?: string | null;
        mediaAssetId?: string | null;
        generatedImageId?: string | null;
        title?: string;
        layerIndex: number;
        totalLayers: number;
        bounds?: {
          x: number;
          y: number;
          width: number;
          height: number;
          originalWidth: number;
          originalHeight: number;
          coverage: number;
        } | null;
      }>
    ) => {
      const validLayers = layers.filter(
        (item) =>
          typeof item?.originalUrl === "string" &&
          item.originalUrl.trim().length > 0
      );

      if (validLayers.length === 0) {
        throw new Error("没有可添加到画布的图层结果");
      }

      const isFullFrameLayer = (bounds?: LayerSplitBounds | null) => {
        if (!bounds) return false;
        return (
          bounds.coverage >= 0.92 &&
          bounds.width >= bounds.originalWidth - 2 &&
          bounds.height >= bounds.originalHeight - 2
        );
      };

      const backgroundLayers = validLayers
        .filter((layer) => isFullFrameLayer(layer.bounds))
        .sort(
          (left, right) => (left.layerIndex || 0) - (right.layerIndex || 0)
        );
      const subjectLayers = validLayers
        .filter((layer) => !isFullFrameLayer(layer.bounds))
        .sort(
          (left, right) => (left.layerIndex || 0) - (right.layerIndex || 0)
        );
      const orderedLayers = [...backgroundLayers, ...subjectLayers];
      const groupGap = 28;
      const groupOffsetX = node.size.width + groupGap;
      const groupOffsetY = 0;

      orderedLayers.forEach((layer, index) => {
        const layerTitle = `${displayTitle}-${layer.title || `图层${layer.layerIndex || index + 1}`}`;
        const bounds = layer.bounds;
        const fullFrameLayer = isFullFrameLayer(bounds);
        const targetPosition = {
          x: node.position.x + groupOffsetX,
          y: node.position.y + groupOffsetY,
        };
        const targetSize = { width: node.size.width, height: node.size.height };
        const archivePatch = getImageArchiveIdentityPatch(layer);

        addNode({
          type: "image",
          position: targetPosition,
          size: targetSize,
          data: {
            src: layer.originalUrl,
            ...(archivePatch.assetId ? { assetId: archivePatch.assetId } : {}),
            status: "completed",
            prompt: `图层拆分结果 ${layer.layerIndex}/${layer.totalLayers}`,
            title: layerTitle,
            originalSrc: data.src,
            metadata: {
              ...archivePatch.metadata,
              layerIndex: layer.layerIndex,
              totalLayers: layer.totalLayers,
              bounds: layer.bounds,
              allowOverlap: true,
              placementMode: "overlay",
              layerSplitRole: fullFrameLayer ? "background" : "subject",
            },
          },
          connections: [node.id],
        });
      });

      return orderedLayers.length;
    },
    [
      addNode,
      data.src,
      displayTitle,
      node.id,
      node.position.x,
      node.position.y,
      node.size.height,
      node.size.width,
    ]
  );

  // 图片标注完成回调
  const handleAnnotateComplete = async (annotatedImageUrl: string) => {
    setAnnotatorOpen(false);

    // 如果仍然是 base64 格式，先上传到服务器（ImageAnnotator 应该已经处理了，这里作为保护）
    let finalUrl = annotatedImageUrl;
    if (annotatedImageUrl.startsWith("data:")) {
      try {
        toast.info("正在上传图片...");
        const response = await fetch(annotatedImageUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, `annotated-${Date.now()}.png`);
        formData.append("purpose", "canvas-upload");
        const uploadResponse = await fetchUploadWithRetry(formData);
        if (!uploadResponse.ok) {
          throw await createUploadErrorFromResponse(uploadResponse, "上传失败");
        }
        const result = await uploadResponse.json();
        finalUrl = result.url;
      } catch (error) {
        console.error("上传标注图片失败:", error);
        const message = getUploadErrorMessage(error, "上传失败");
        if (message) {
          toast.error(message);
        }
        return;
      }
    }

    // 更新当前节点，标记为已标注图片
    // 标注后的图片会带有视觉标记（箭头、圆圈、文字等）
    // 这些标记指示了用户希望 AI 重点关注/修改的区域
    updateNode(node.id, {
      data: {
        ...data,
        src: finalUrl,
        hasAnnotations: true, // 🆕 标记为已标注
        originalSrc: data.originalSrc || data.src, // 保留原始图片
        prompt: data.prompt ? `${data.prompt} (已标注)` : "已标注图片",
      },
    });

    toast.success("标注已保存！发送对话时将重点处理标注区域");
  };

  const uploadBase64ToStorage = useCallback(async (base64Url: string) => {
    const response = await fetch(base64Url);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("file", blob, `canvas-resize-${Date.now()}.png`);
    formData.append("purpose", "canvas-upload");

    const uploadResponse = await fetchUploadWithRetry(formData);

    if (!uploadResponse.ok) {
      throw await createUploadErrorFromResponse(uploadResponse, "上传失败");
    }

    const result = await uploadResponse.json();
    return {
      url: result.url as string,
      assetId: normalizeImageArchiveId(result.assetId),
    };
  }, []);

  const handleResizeEditorComplete = useCallback(
    async (resizedImageUrl: string) => {
      let finalUrl = resizedImageUrl;

      if (resizedImageUrl.startsWith("data:")) {
        try {
          toast.info("正在上传尺寸调整结果...");
          const uploaded = await uploadBase64ToStorage(resizedImageUrl);
          finalUrl = uploaded.url;
          const archivePatch = getImageArchiveIdentityPatch(uploaded);
          addNode({
            type: "image",
            position: {
              x: node.position.x + node.size.width + 20,
              y: node.position.y,
            },
            size: { width: node.size.width, height: node.size.height },
            data: {
              src: finalUrl,
              ...(archivePatch.assetId ? { assetId: archivePatch.assetId } : {}),
              status: "completed",
              prompt: "尺寸调整结果",
              title: `${displayTitle}-尺寸调整`,
              originalSrc: data.src,
              ...(Object.keys(archivePatch.metadata).length > 0
                ? { metadata: archivePatch.metadata }
                : {}),
            },
            connections: [node.id],
          });
          setResizeAnnotatorOpen(false);
          toast.success("尺寸调整结果已发送到画布");
          return;
        } catch (error) {
          console.error("上传尺寸调整图片失败:", error);
          const message = getUploadErrorMessage(
            error,
            "尺寸调整结果上传失败"
          );
          if (message) {
            toast.error(message);
          }
          return;
        }
      }

      const title = `${displayTitle}-尺寸调整`;
      addNode({
        type: "image",
        position: {
          x: node.position.x + node.size.width + 20,
          y: node.position.y,
        },
        size: { width: node.size.width, height: node.size.height },
        data: {
          src: finalUrl,
          status: "completed",
          prompt: "尺寸调整结果",
          title,
          originalSrc: data.src,
        },
        connections: [node.id],
      });

      setResizeAnnotatorOpen(false);
      toast.success("尺寸调整结果已发送到画布");
    },
    [
      addNode,
      data.src,
      displayTitle,
      node.id,
      node.position.x,
      node.position.y,
      node.size.height,
      node.size.width,
      uploadBase64ToStorage,
    ]
  );

  const persistCanvasStateSnapshot = useCallback(() => {
    if (!projectId || typeof window === "undefined") return;
    window.setTimeout(() => {
      void canvasService.saveCanvasState(projectId, getCanvasState());
    }, 0);
  }, [getCanvasState, projectId]);

  // 基于当前图片+新提示词重绘
  const handlePromptRegenerate = async () => {
    if (!data.src) return;
    if (!isHttpImageUrl(data.src)) {
      toast.error("仅支持 URL 图片，不允许 base64 传输");
      return;
    }
    const promptText = regeneratePrompt.trim();
    if (!promptText) {
      toast.error("请输入提示词");
      return;
    }
    if (isProcessing) {
      toast.info("正在处理中，请稍候...");
      return;
    }

    setPromptDialogOpen(false);
    setIsProcessing(true);

    const newNodeId = addNode({
      type: "image",
      position: {
        x: node.position.x + node.size.width + 20,
        y: node.position.y,
      },
      size: { width: node.size.width, height: node.size.height },
      data: {
        src: "",
        status: "generating",
        prompt: promptText,
        title: `${displayTitle}-重绘`,
        originalSrc: data.src,
      },
      connections: [node.id],
    });

    try {
      const aspectRatio = guessNearestAspectRatio(
        node.size.width,
        node.size.height
      );
      const result = await imageGenerationService.generateImage({
        prompt: promptText,
        referenceImage: data.src,
        aspectRatio,
        imageCount: 1,
        billingFeature: "repaint",
      });

      const image = result.data?.images?.[0];
      if (result.success && image?.originalUrl) {
        const archivePatch = getImageArchiveIdentityPatch(image);
        updateNode(newNodeId, {
          data: {
            src: image.originalUrl,
            ...(archivePatch.assetId ? { assetId: archivePatch.assetId } : {}),
            status: "completed",
            prompt: promptText,
            title: `${promptText.slice(0, 24) || displayTitle}-重绘`,
            originalSrc: data.src,
            ...(Object.keys(archivePatch.metadata).length > 0
              ? { metadata: archivePatch.metadata }
              : {}),
          },
        });
        toast.success("已根据新提示词生成图片");
      } else {
        updateNode(newNodeId, {
          data: {
            src: "",
            status: "failed",
            prompt: "提示词重绘失败",
            title: `${displayTitle}-重绘失败`,
            originalSrc: data.src,
          },
        });
        toast.error(result.error || "重绘失败");
      }
    } catch (error) {
      updateNode(newNodeId, {
        data: {
          src: "",
          status: "failed",
          prompt: "提示词重绘失败",
          title: `${displayTitle}-重绘失败`,
          originalSrc: data.src,
        },
      });
      toast.error("重绘失败");
    } finally {
      setIsProcessing(false);
    }
  };

  // 下载图片 - 服务端统一转为 Photoshop 兼容 PNG，避免后缀和真实格式错配。
  const handleDownload = async () => {
    if (!data.src) return;
    const originalUrl = String(resolveOriginalImageUrl(data.src) || data.src || "").trim();
    const downloadCandidates = Array.from(
      new Set(
        [
          originalUrl,
          data.src,
          displayImageSrc,
          fullscreenPreviewSrc,
          buildImageProxyUrl(originalUrl || data.src || "", {
            delivery: "proxy",
          }),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
    if (!originalUrl) {
      toast.error("下载失败，请重试");
      return;
    }

    try {
      toast.info("正在生成 PS 兼容 PNG...");

      const response = await apiFetch("/api/canvas/download-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: downloadCandidates[0],
          urls: downloadCandidates,
          name: displayTitle,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || `下载失败（${response.status}）`);
      }
      const blob = await response.blob();
      if (!blob.type.toLowerCase().includes("image/png")) {
        throw new Error("下载结果不是标准 PNG");
      }
      const filename =
        parseAttachmentFilename(response.headers.get("content-disposition")) ||
        `${sanitizeFileName(displayTitle)}.png`;

      // 创建 Blob URL
      const blobUrl = URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放 Blob URL
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast.success("下载成功");
    } catch (error) {
      console.error("下载失败:", error);
      toast.error(
        error instanceof Error
          ? `${error.message}，源图可能已失效，请稍后重试或重新生成图片`
          : "图片源文件暂时不可访问，请稍后重试或重新生成图片"
      );
    }
  };

  const imageAdjustOverlayStyle = useMemo<React.CSSProperties>(() => {
    if (boxCutoutMetrics) {
      return {
        left: boxCutoutMetrics.offsetX,
        top: boxCutoutMetrics.offsetY,
        width: boxCutoutMetrics.renderedWidth,
        height: boxCutoutMetrics.renderedHeight,
      };
    }
    return { inset: 0 };
  }, [boxCutoutMetrics]);

  const renderImageAdjustmentOverlays = useCallback(() => {
    return (
      <ImageNodeAdjustOverlays
        adjustments={activeImageAdjustments}
        hasActiveAdjustments={hasActiveImageAdjustments}
        style={imageAdjustOverlayStyle}
      />
    );
  }, [
    activeImageAdjustments,
    hasActiveImageAdjustments,
    imageAdjustOverlayStyle,
  ]);

  const cropPanelPosition = getCropPanelPosition();
  const imageAdjustPanelPosition = getImageAdjustPanelPosition();
  const toolbarPosition = getToolbarPosition();
  const boxCutoutToolbarPosition = getBoxCutoutToolbarPosition();
  const flipRotatePanelPosition = getFlipRotatePanelPosition();
  const anglePanelPosition = getAnglePanelPosition();
  const boxCutoutHintText = boxCutoutSelection
    ? "确认后将仅抠出框选区域"
    : isBoxCutoutDrawing
      ? "松开完成框选"
      : "在图片中拖拽矩形框";

  return (
    <>
      {/* 选中时在图片上方显示标题 */}
      {isSelected &&
      !isMultiSelected &&
      data.src ? (
        <ImageNodeSelectedTitle
          displayTitle={displayTitle}
          draftTitle={draftTitle}
          isEditingTitle={isEditingTitle}
          onCancelEditing={() => setIsEditingTitle(false)}
          onDraftTitleChange={setDraftTitle}
          onSaveTitle={handleSaveTitle}
          onStartEditing={() => setIsEditingTitle(true)}
          resolutionLabel={resolutionLabel}
          style={selectedTitleStyle}
        />
      ) : null}

      <div
        className={cn(
	          "relative h-full w-full rounded-none border border-[#dbe2ee] bg-white shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_16px_34px_rgba(22,24,29,0.08)] transition-all dark:border-zinc-800 dark:bg-zinc-950",
	          localEditMode ? "overflow-visible" : "overflow-hidden",
	          isRecentlyGenerated &&
	            "border-brand-selection shadow-[0_0_0_1px_rgb(var(--brand-accent-rgb)/0.42),0_0_0_8px_rgb(var(--brand-accent-rgb)/0.12),0_18px_42px_rgb(var(--brand-accent-rgb)/0.22)]",
	          isSelected
	            ? "border-brand-selection ring-2 ring-brand-selection/14 shadow-[0_0_0_1px_rgb(var(--brand-accent-rgb)/0.14),0_20px_38px_rgb(var(--brand-accent-rgb)/0.12)]"
	            : "hover:border-[#cfd9ea]"
	        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        ref={containerRef}
	      >
	        {isRecentlyGenerated ? (
	          <div
	            className="pointer-events-none absolute -inset-2 z-[3] rounded-[inherit] border border-brand-selection/55"
	            style={{ animation: "canvas-generated-pulse 1.35s ease-out 0s 4" }}
	          />
	        ) : null}
	        <div className="relative h-full w-full" style={scaledContentStyle}>
        {/* 图片内容 - 使用 object-contain 保持原始比例 */}
        {data.src ? (
          <div className="relative h-full w-full">
            {!shouldRequestDisplayImage ? (
              <ImageNodeDeferredLoadState />
            ) : isCompareMode && hasCompareSource ? (
              <div
                className="relative h-full w-full cursor-col-resize select-none overflow-hidden bg-slate-50 dark:bg-zinc-900"
                data-canvas-no-drag="true"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  updateCompareSplitByClientX(event.clientX);
                }}
                onPointerMove={(event) => {
                  updateCompareSplitByClientX(event.clientX);
                }}
                ref={compareFrameRef}
                style={{ touchAction: "none" }}
              >
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - compareSplitPercent}% 0 0)`,
                  }}
                >
                  <div className="absolute inset-0 bg-slate-50 dark:bg-zinc-900" />
                  <img
                    alt={displayTitle}
                    className="absolute inset-0 h-full w-full object-contain"
                    decoding="async"
                    draggable={false}
                    loading="lazy"
                  onError={(event) => {
                    if (event.currentTarget.src !== data.src) {
                      setLocalArchiveDisplaySrc("");
                      event.currentTarget.src = data.src;
                    }
                  }}
                  style={activeImageAdjustmentsStyle}
                  src={displayImageSrc}
                />
                {renderImageAdjustmentOverlays()}
                </div>
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 0 0 ${compareSplitPercent}%)`,
                  }}
                >
                  <div className="absolute inset-0 bg-slate-50 dark:bg-zinc-900" />
                  <img
                    alt={`${displayTitle}-原图`}
                    className="absolute inset-0 h-full w-full object-contain"
                    decoding="async"
                    draggable={false}
                    loading="lazy"
                    onError={(event) => {
                      if (event.currentTarget.src !== compareSource) {
                        event.currentTarget.src = compareSource;
                      }
                    }}
                    src={displayCompareSrc}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 z-30 w-px bg-white/95 shadow-[0_0_0_1px_rgba(15,23,42,0.18),0_0_6px_rgba(255,255,255,0.28)]"
                  style={{
                    left: `${compareSplitPercent}%`,
                    transform: "translateX(-50%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.26)]"
                  style={{ left: `${compareSplitPercent}%` }}
                >
                  &lt;&gt;
                </div>
                <div className="pointer-events-none absolute top-2 left-2 rounded-full border border-[#dbe2ee] bg-white px-2 py-0.5 text-[10px] text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.22)]">
                  新图
                </div>
                <div className="pointer-events-none absolute top-2 right-2 rounded-full border border-[#dbe2ee] bg-white px-2 py-0.5 text-[10px] text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.22)]">
                  原图
                </div>
              </div>
            ) : (
              <>
                <img
                  alt={displayTitle}
                  className={cn(
                    "h-full w-full bg-slate-50 object-contain dark:bg-zinc-900",
                    boxCutoutMode || localEditMode
                      ? "cursor-crosshair"
                      : isThisNodePicking
                        ? "cursor-crosshair"
                        : "cursor-pointer"
                  )}
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  onClick={
                    isThisNodePicking && !boxCutoutMode
                      ? handlePickerClick
                      : undefined
                  }
                  onDoubleClick={(e) => {
                    if (!isThisNodePicking && !boxCutoutMode && !localEditMode) {
                      e.stopPropagation();
                      setFullscreenPreviewOpen(true);
                    }
                  }}
                  onError={(event) => {
                    if (event.currentTarget.src !== data.src) {
                      setLocalArchiveDisplaySrc("");
                      event.currentTarget.src = data.src;
                    }
                  }}
                  onLoad={refreshBoxCutoutMetrics}
                  ref={displayImageRef}
                  src={displayImageSrc}
                  style={activeImageAdjustmentsStyle}
                />
                {renderImageAdjustmentOverlays()}
                {shouldRenderDetailOverlay ? (
                  detailUiDslDocument ? (
                    <DetailUiDomRenderer
                      document={detailUiDslDocument}
                      imageMetrics={boxCutoutMetrics}
                    />
                  ) : (
                    <DetailSurfaceOverlayRenderer
                      imageMetrics={boxCutoutMetrics}
                      overlay={detailUiScreenOverlay}
                      subjectAnalysis={detailSubjectAnalysis}
                    />
                  )
                ) : null}
              </>
            )}

            {cropPanelOpen &&
              !isThisNodePicking &&
              !isCompareMode &&
              boxCutoutMetrics &&
              cropRectStyle &&
              cropRect && (
                <div
                  className="absolute z-[148]"
                  data-canvas-no-drag="true"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerCancel={handleCropPointerCancel}
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  ref={cropOverlayRef}
                  style={{
                    left: boxCutoutMetrics.offsetX,
                    top: boxCutoutMetrics.offsetY,
                    width: boxCutoutMetrics.renderedWidth,
                    height: boxCutoutMetrics.renderedHeight,
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 bg-[rgba(26,28,31,0.48)]"
                    style={{ height: Math.max(cropRectStyle.top - boxCutoutMetrics.offsetY, 0) }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-[rgba(26,28,31,0.48)]"
                    style={{
                      height: Math.max(
                        boxCutoutMetrics.offsetY +
                          boxCutoutMetrics.renderedHeight -
                          (cropRectStyle.top + cropRectStyle.height),
                        0
                      ),
                    }}
                  />
                  <div
                    className="pointer-events-none absolute left-0 bg-[rgba(26,28,31,0.48)]"
                    style={{
                      top: cropRectStyle.top - boxCutoutMetrics.offsetY,
                      width: Math.max(cropRectStyle.left - boxCutoutMetrics.offsetX, 0),
                      height: cropRectStyle.height,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute right-0 bg-[rgba(26,28,31,0.48)]"
                    style={{
                      top: cropRectStyle.top - boxCutoutMetrics.offsetY,
                      width: Math.max(
                        boxCutoutMetrics.offsetX +
                          boxCutoutMetrics.renderedWidth -
                          (cropRectStyle.left + cropRectStyle.width),
                        0
                      ),
                      height: cropRectStyle.height,
                    }}
                  />

                  <div
                    className="absolute border-2 border-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                    data-crop-handle="move"
                    style={{
                      left: cropRectStyle.left - boxCutoutMetrics.offsetX,
                      top: cropRectStyle.top - boxCutoutMetrics.offsetY,
                      width: cropRectStyle.width,
                      height: cropRectStyle.height,
                      cursor: cropInteraction ? "grabbing" : "grab",
                    }}
                  >
                    <div className="pointer-events-none absolute top-1/3 left-0 h-px w-full bg-white/45" />
                    <div className="pointer-events-none absolute top-2/3 left-0 h-px w-full bg-white/45" />
                    <div className="pointer-events-none absolute top-0 left-1/3 h-full w-px bg-white/45" />
                    <div className="pointer-events-none absolute top-0 left-2/3 h-full w-px bg-white/45" />

                    {(
                      [
                        { handle: "nw", className: "-left-3 -top-3 cursor-nwse-resize" },
                        { handle: "ne", className: "-right-3 -top-3 cursor-nesw-resize" },
                        { handle: "sw", className: "-left-3 -bottom-3 cursor-nesw-resize" },
                        { handle: "se", className: "-right-3 -bottom-3 cursor-nwse-resize" },
                        { handle: "n", className: "left-1/2 -top-3 -translate-x-1/2 cursor-ns-resize" },
                        { handle: "s", className: "left-1/2 -bottom-3 -translate-x-1/2 cursor-ns-resize" },
                        { handle: "w", className: "-left-3 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                        { handle: "e", className: "-right-3 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                      ] as const
                    ).map((handleItem) => (
                      <button
                        className={cn(
                          "absolute h-6 w-6 rounded-full border border-[#d9d9d9] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12)]",
                          handleItem.className
                        )}
                        data-crop-handle={handleItem.handle}
                        key={handleItem.handle}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              )}

            {boxCutoutMode && !isThisNodePicking && !isCompareMode && (
              <>
                <div
                  className="absolute inset-0 z-[140] cursor-crosshair"
                  data-canvas-no-drag="true"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerCancel={handleBoxCutoutPointerCancel}
                  onPointerDown={handleBoxCutoutPointerDown}
                  onPointerMove={handleBoxCutoutPointerMove}
                  onPointerUp={handleBoxCutoutPointerUp}
                />
                {activeBoxCutoutRectStyle ? (
                  <div
                    className="pointer-events-none absolute z-[145] border-2 border-brand-selection bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
                    style={{
                      left: activeBoxCutoutRectStyle.left,
                      top: activeBoxCutoutRectStyle.top,
                      width: Math.max(activeBoxCutoutRectStyle.width, 1),
                      height: Math.max(activeBoxCutoutRectStyle.height, 1),
                    }}
                  />
                ) : (
                  <div className="pointer-events-none absolute inset-0 z-[141] bg-slate-950/18" />
                )}
              </>
            )}

            {localEditMode && !isThisNodePicking && !isCompareMode && (
              <>
                <div
                  className="absolute inset-0 z-[150] cursor-crosshair"
                  data-canvas-no-drag="true"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerCancel={handleLocalEditPointerCancel}
                  onPointerDown={handleLocalEditPointerDown}
                  onPointerMove={handleLocalEditPointerMove}
                  onPointerUp={handleLocalEditPointerUp}
                />
                {boxCutoutMetrics ? (
                  <div
                    className="pointer-events-none absolute z-[151] rounded-[2px] border border-dashed border-emerald-300/36 bg-emerald-300/5"
                    style={{
                      left: boxCutoutMetrics.offsetX,
                      top: boxCutoutMetrics.offsetY,
                      width: boxCutoutMetrics.renderedWidth,
                      height: boxCutoutMetrics.renderedHeight,
                    }}
                  />
                ) : null}
                {localEditRegionOverlays.map(({ region, style }) => {
                  const left = Number(style.left || 0);
                  const top = Number(style.top || 0);
                  const width = Number(style.width || 0);
                  const height = Number(style.height || 0);

                  return (
                    <div
                      className={cn(
                        "nodrag nopan nowheel pointer-events-auto absolute z-[160] rounded-none border-[1.5px] bg-transparent shadow-none",
                        localEditRegionInteraction?.regionId === region.id
                          ? "cursor-grabbing"
                          : "cursor-grab"
                      )}
                      data-canvas-no-drag="true"
                      data-local-edit-control="true"
                      key={region.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onPointerCancel={(event) =>
                        handleLocalEditRegionPointerCancel(event, region.id)
                      }
                      onPointerDown={(event) =>
                        handleLocalEditRegionPointerDown(event, region)
                      }
                      onPointerMove={(event) =>
                        handleLocalEditRegionPointerMove(event, region.id)
                      }
                      onPointerUp={(event) =>
                        handleLocalEditRegionPointerUp(event, region.id)
                      }
                      style={{
                        left,
                        top,
                        width: Math.max(width, 1),
                        height: Math.max(height, 1),
                        borderColor: region.color,
                      }}
                    >
                      {(
                        [
                          {
                            handle: "nw",
                            className: "-left-[5px] -top-[5px] cursor-nwse-resize",
                          },
                          {
                            handle: "ne",
                            className: "-right-[5px] -top-[5px] cursor-nesw-resize",
                          },
                          {
                            handle: "sw",
                            className: "-left-[5px] -bottom-[5px] cursor-nesw-resize",
                          },
                          {
                            handle: "se",
                            className: "-right-[5px] -bottom-[5px] cursor-nwse-resize",
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          aria-label={`调整区域 ${region.index}`}
                          className={cn(
                            "nodrag nopan nowheel absolute h-[10px] w-[10px] rounded-none border-[1.5px] bg-white shadow-none",
                            item.className
                          )}
                          data-canvas-no-drag="true"
                          data-local-edit-control="true"
                          data-local-edit-region-handle={item.handle}
                          key={item.handle}
                          style={{ borderColor: region.color }}
                          type="button"
                        />
                      ))}
                    </div>
                  );
                })}
                {typeof document !== "undefined" && localEditPromptPortalFrame
                  ? createPortal(
                      <div
                        className="pointer-events-none fixed z-[9998] overflow-visible"
                        data-local-edit-control="true"
                        style={{
                          left: localEditPromptPortalFrame.left,
                          top: localEditPromptPortalFrame.top,
                          width: localEditPromptPortalFrame.width,
                          height: localEditPromptPortalFrame.height,
                        }}
                      >
                        {localEditPromptViewportOverlays.map(
                          ({ region, isEditing, style }) => (
                  <div
                    className="nodrag nopan nowheel pointer-events-auto absolute z-[170] flex flex-col items-stretch gap-1.5"
                    data-canvas-no-drag="true"
                    data-local-edit-control="true"
                    key={`local-edit-prompt-${region.id}`}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={style}
                  >
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <input
                          autoFocus={editingLocalEditRegionId === region.id}
                          className="nodrag nopan nowheel h-9 min-w-0 flex-1 rounded-full border border-slate-300 bg-white/95 px-3 text-[12px] font-medium leading-5 text-slate-950 caret-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.14)] outline-none ring-2 ring-transparent transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-slate-950/15 dark:border-white/20 dark:bg-slate-950/88 dark:text-white dark:caret-white dark:placeholder:text-white/42 dark:focus:border-white/40 dark:focus:ring-white/18"
                          data-canvas-no-drag="true"
                          data-local-edit-control="true"
                          autoComplete="off"
                          enterKeyHint="done"
                          inputMode="text"
                          lang="zh-CN"
                          defaultValue={
                            localEditPromptDrafts[region.id] ??
                            localEditPromptDraftRefs.current[region.id] ??
                            region.prompt
                          }
                          onBlur={(event) => {
                            const nextPrompt = event.currentTarget.value;
                            persistLocalEditRegionPrompt(region.id, nextPrompt);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onCompositionStart={() => {
                            localEditPromptComposingRefs.current[region.id] = true;
                          }}
                          onCompositionEnd={(event) => {
                            delete localEditPromptComposingRefs.current[region.id];
                            updateLocalEditPromptDraftRef(region.id, event.currentTarget.value);
                          }}
                          onFocus={(event) => {
                            event.stopPropagation();
                            setEditingLocalEditRegionId((current) =>
                              current === region.id ? current : region.id
                            );
                          }}
                          onChange={(event) => {
                            updateLocalEditPromptDraftRef(
                              region.id,
                              event.currentTarget.value
                            );
                          }}
                          onKeyDown={(event) => {
                            // Let the browser/IME own text insertion, deletion and selection.
                            event.stopPropagation();
                            if (
                              localEditPromptComposingRefs.current[region.id] ||
                              event.nativeEvent.isComposing ||
                              event.keyCode === 229 ||
                              event.key === "Process"
                            ) return;
                            if (
                              event.key === "Enter" &&
                              (event.metaKey || event.ctrlKey)
                            ) {
                              event.preventDefault();
                              event.stopPropagation();
                              persistLocalEditRegionPrompt(
                                region.id,
                                event.currentTarget.value
                              );
                              setEditingLocalEditRegionId(null);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              event.stopPropagation();
                              persistLocalEditRegionPrompt(
                                region.id,
                                event.currentTarget.value
                              );
                              setEditingLocalEditRegionId(null);
                            }
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          placeholder={`区域 ${region.index} 提示词`}
                          ref={(input) => {
                            localEditPromptInputRefs.current[region.id] = input;
                          }}
                          spellCheck={false}
                          type="text"
                        />
                      ) : (
                        <button
                          className="nodrag nopan nowheel h-9 min-w-0 flex-1 truncate rounded-full border border-slate-200 bg-white/95 px-3 text-left text-[12px] font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:bg-slate-50 dark:border-white/18 dark:bg-slate-950/82 dark:text-white dark:shadow-[0_10px_24px_rgba(0,0,0,0.24)] dark:hover:bg-slate-900"
                          data-canvas-no-drag="true"
                          data-local-edit-control="true"
                          onClick={(event) => {
                            event.preventDefault();
                            event.nativeEvent.stopImmediatePropagation?.();
                            event.stopPropagation();
                            setEditingLocalEditRegionId(region.id);
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.nativeEvent.stopImmediatePropagation?.();
                            event.stopPropagation();
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.nativeEvent.stopImmediatePropagation?.();
                            event.stopPropagation();
                            setEditingLocalEditRegionId(region.id);
                          }}
                          title={region.prompt}
                          type="button"
                        >
                          {region.index}. {region.prompt}
                        </button>
                      )}
                      <input
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                        className="hidden"
                        data-canvas-no-drag="true"
                        data-local-edit-control="true"
                        id={`local-edit-reference-upload-${region.id}`}
                        multiple
                        onChange={(event) => {
                          void handleLocalEditReferenceUpload(
                            region.id,
                            event.currentTarget.files
                          );
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                      <button
                        className="nodrag nopan nowheel flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/18 dark:bg-slate-950/82 dark:text-white/72 dark:shadow-[0_10px_24px_rgba(0,0,0,0.24)] dark:hover:bg-white dark:hover:text-slate-950"
                        data-canvas-no-drag="true"
                        data-local-edit-control="true"
                        disabled={
                          uploadingLocalEditReferenceRegionId === region.id ||
                          (region.referenceImages?.length || 0) >=
                            LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                          document
                            .getElementById(
                              `local-edit-reference-upload-${region.id}`
                            )
                            ?.click();
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                        }}
                        title="添加区域参考图"
                        type="button"
                      >
                        {uploadingLocalEditReferenceRegionId === region.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        className="nodrag nopan nowheel flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-red-500 hover:text-white dark:border-white/18 dark:bg-slate-950/82 dark:text-white/72 dark:shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
                        data-canvas-no-drag="true"
                        data-local-edit-control="true"
                        onClick={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                          deleteLocalEditRegion(region.id);
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.nativeEvent.stopImmediatePropagation?.();
                          event.stopPropagation();
                          deleteLocalEditRegion(region.id);
                        }}
                        title="删除区域"
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {region.referenceImages?.length ? (
                      <div className="flex max-w-full items-center gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white/92 px-1.5 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.1)] dark:border-white/12 dark:bg-slate-950/80">
                        <span className="shrink-0 px-1 text-[10px] font-semibold text-slate-500 dark:text-white/52">
                          参考
                        </span>
                        {region.referenceImages.map((reference) => (
                          <div
                            className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/12 dark:bg-slate-800"
                            key={reference.id}
                            title={reference.name || "区域参考图"}
                          >
                            <img
                              alt={reference.name || "区域参考图"}
                              className="h-full w-full object-cover"
                              draggable={false}
                              src={reference.url}
                            />
                            <button
                              className="absolute inset-0 hidden items-center justify-center bg-black/52 text-white group-hover:flex"
                              data-canvas-no-drag="true"
                              data-local-edit-control="true"
                              onClick={(event) => {
                                event.preventDefault();
                                event.nativeEvent.stopImmediatePropagation?.();
                                event.stopPropagation();
                                removeLocalEditReferenceImage(
                                  region.id,
                                  reference.id
                                );
                              }}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.nativeEvent.stopImmediatePropagation?.();
                                event.stopPropagation();
                                removeLocalEditReferenceImage(
                                  region.id,
                                  reference.id
                                );
                              }}
                              title="移除参考图"
                              type="button"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                          )
                        )}
                      </div>,
                      document.body
                    )
                  : null}
                {localEditDraftRectStyle ? (
                  <div
                    className="pointer-events-none absolute z-[162] rounded-none border-[1.5px] border-brand-selection bg-transparent shadow-none"
                    style={{
                      left: localEditDraftRectStyle.left,
                      top: localEditDraftRectStyle.top,
                      width: Math.max(Number(localEditDraftRectStyle.width || 0), 1),
                      height: Math.max(Number(localEditDraftRectStyle.height || 0), 1),
                    }}
                  />
                ) : null}
              </>
            )}

            {/* 🆕 拾取模式：当前点击位置（正在识别） */}
            {isThisNodePicking && currentPickerClickStyle && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: currentPickerClickStyle.left,
                  top: currentPickerClickStyle.top,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-dashed" />
              </div>
            )}

            {/* 🆕 拾取模式：状态栏 */}
            {isThisNodePicking && (
              <div className="-translate-x-1/2 absolute bottom-2 left-1/2 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-lg">
                <Crosshair className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-xs">
                  {isPickerLoading ? "正在识别..." : "点击标注物品"}
                </span>
                <Button
                  className="h-6 w-6 rounded-full hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelPicking();
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {hasCompareSource &&
              !isThisNodePicking &&
              !isCompareMode &&
              !boxCutoutMode &&
              !localEditMode &&
              !cropPanelOpen &&
              isSelected &&
              !isMultiSelected && (
	                <button
	                  aria-label={imageCompareItem.label}
                  className="-translate-y-1/2 pointer-events-auto absolute top-1/2 z-[220] inline-flex items-center justify-center rounded-full text-white shadow-[0_8px_16px_rgba(0,0,0,0.22)] transition-all"
                  data-canvas-no-drag="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCompareMode((prev) => !prev);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{
                    width: `${compareButtonHitSize}px`,
                    height: `${compareButtonHitSize}px`,
                    right: `${compareButtonInset}px`,
                  }}
	                  title={imageCompareItem.label}
	                  type="button"
	                >
                  <span
                    className="inline-flex items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.26)] transition-colors hover:bg-[#f7f9ff] hover:text-[#16181d]"
                    style={{
                      width: `${compareButtonVisualSize}px`,
                      height: `${compareButtonVisualSize}px`,
                    }}
                  >
	                    <CanvasToolbarIcon
	                      fallback={GitCompareArrows}
	                      item={imageCompareItem}
	                      style={{
	                        width: `${compareButtonIconSize}px`,
	                        height: `${compareButtonIconSize}px`,
	                      }}
	                    />
	                  </span>
	                </button>
              )}
          </div>
        ) : (
          <ImageNodeEmptyState
            detailProgressLabel={detailProgressLabel}
            fileInputRef={fileInputRef}
            generationProgress={generationProgress}
            onImageUpload={handleImageUpload}
            onSelectFile={handleSelectFile}
            status={data.status}
          />
        )}

        {/* 处理中遮罩 */}
        {isProcessing && (
          <ImageNodeProcessingOverlay
            detailProgressLabel={detailProgressLabel || undefined}
            generationProgress={generationProgress}
          />
        )}

        {/* 工具栏使用 Portal 渲染到 body，避免被裁剪 */}

        {/* 悬浮时的更多操作按钮 (右上角) */}
        {isHovered &&
        data.src &&
        !isProcessing &&
        !isSelected &&
        hasHoverImageMoreMenu ? (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
	                <Button
	                  className="h-8 w-8 rounded-full border border-[#dbe2ee] bg-white text-[#5d687b] shadow-[0_0_0_1px_rgba(219,226,238,0.3)] hover:bg-[#f7f9ff] hover:text-[#16181d]"
	                  size="icon"
	                  title={imageNodeMoreItem.label}
	                  variant="secondary"
	                >
	                  <CanvasToolbarIcon
	                    className="h-4 w-4"
	                    fallback={MoreVertical}
	                    item={imageNodeMoreItem}
	                  />
	                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
	                {imageRemoveBackgroundEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("rmbg")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={ImageOff}
	                    item={imageRemoveBackgroundItem}
	                  />
	                  <span>{imageRemoveBackgroundItem.label}</span>
                    <ImageActionCreditBadge
                      label={removeBackgroundCostShortLabel}
                    />
	                </DropdownMenuItem>
	                ) : null}
	                {imageRemoveWatermarkEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("watermark")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={Eraser}
	                    item={imageRemoveWatermarkItem}
	                  />
	                  <span>{imageRemoveWatermarkItem.label}</span>
                    <ImageActionCreditBadge
                      label={removeWatermarkCostShortLabel}
                    />
	                </DropdownMenuItem>
	                ) : null}
	                {imageEnhanceEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("enhance")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={ZoomIn}
	                    item={imageEnhanceItem}
	                  />
	                  {imageEnhanceItem.label}
                    <ImageActionCreditBadge label={enhanceCostShortLabel} />
	                </DropdownMenuItem>
	                ) : null}
	                {imageNoteEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("note")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={StickyNote}
	                    item={imageNoteItem}
	                  />
	                  {imageNoteItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {isLayerSplitEnabled && imageLayerSplitEnabledByToolbar ? (
	                  <DropdownMenuItem onClick={() => handleAction("layer-split")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={SplitSquareHorizontal}
	                      item={imageLayerSplitItem}
	                    />
	                    {imageLayerSplitItem.label}
	                  </DropdownMenuItem>
	                ) : null}
	                {imageResizeEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("resize")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={MoveDiagonal}
	                    item={imageResizeItem}
	                  />
	                  {imageResizeItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageMultiAngleEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("angle")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={RotateCwSquare}
	                      item={imageMultiAngleItem}
	                    />
	                    <span>{imageMultiAngleItem.label}</span>
                      <ImageActionCreditBadge
                        label={angleEditCostShortLabel}
                      />
	                </DropdownMenuItem>
	                ) : null}
	                {imagePromptRegenerateEnabled ? (
	                <DropdownMenuItem
	                  onClick={() => handleAction("prompt-regenerate")}
	                >
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={RefreshCw}
	                    item={imagePromptRegenerateItem}
	                  />
	                  <span>{imagePromptRegenerateItem.label}</span>
                    <ImageActionCreditBadge
                      label={promptRegenerateCostShortLabel}
                    />
	                </DropdownMenuItem>
	                ) : null}
	                {imageTextEditEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("text-edit")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={TextCursorInput}
	                    item={imageTextEditItem}
	                  />
	                  {imageTextEditItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageExtendEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("extend")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={PanelTopOpen}
	                    item={imageExtendItem}
	                  />
	                  <span>{imageExtendItem.label}</span>
                    <ImageActionCreditBadge label={extendCostShortLabel} />
	                </DropdownMenuItem>
	                ) : null}
	                {imageCropEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("crop")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={Crop}
	                    item={imageCropItem}
	                  />
	                  {imageCropItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageAdjustEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("adjust")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={Palette}
	                    item={imageAdjustItem}
	                  />
	                  {imageAdjustItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageFlipRotateEnabled ? (
	                <DropdownMenuItem onClick={() => handleAction("flip-rotate")}>
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={RotateCwSquare}
	                    item={imageFlipRotateItem}
	                  />
	                  {imageFlipRotateItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageRenameEnabled ? (
                <DropdownMenuItem
                  onClick={() => {
                    setDraftTitle(displayTitle);
                    setIsEditingTitle(true);
                  }}
	                >
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={Pencil}
	                    item={imageRenameItem}
	                  />
	                  {imageRenameItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {hasHoverImageMorePrimaryActions &&
	                hasHoverImageMoreSecondaryActions ? (
	                <DropdownMenuSeparator />
	                ) : null}
	                {imageDownloadEnabled ? (
	                <DropdownMenuItem onClick={handleDownload}>
		                  <CanvasToolbarIcon
		                    className="mr-2 h-4 w-4"
		                    fallback={Save}
		                    item={imageDownloadItem}
		                  />
	                  {imageDownloadItem.label}
	                </DropdownMenuItem>
	                ) : null}
	                {imageDeleteEnabled ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteNode(node.id)}
	                >
	                  <CanvasToolbarIcon
	                    className="mr-2 h-4 w-4"
	                    fallback={Trash2}
	                    item={imageDeleteItem}
	                  />
	                  {imageDeleteItem.label}
	                </DropdownMenuItem>
	                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        {data.note && !isSelected && (
	          <div
	            className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border border-[#f5e0a7] bg-white px-2 py-1 text-[11px] text-[#c48917] shadow-[0_0_0_1px_rgba(245,224,167,0.22)]"
	            title={imageNoteItem.label}
	          >
	            <CanvasToolbarIcon
	              className="h-3 w-3"
	              fallback={StickyNote}
	              item={imageNoteItem}
	            />
	            {imageNoteItem.label}
	          </div>
	        )}
	        {shortAgentExecutionSnapshotId ? (
	          <button
	            className={cn(
              "absolute left-2 inline-flex items-center gap-1 rounded-full border border-[#dbe2ee] bg-white px-2.5 py-1 text-[11px] text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.3)] transition-colors hover:bg-[#f7f9ff] hover:text-[#16181d]",
              data.note && !isSelected ? "top-10" : "top-2"
            )}
            onClick={() => setSnapshotDialogOpen(true)}
            title={`执行快照：${agentExecutionSnapshotId}`}
            type="button"
          >
            快照 {shortAgentExecutionSnapshotId}
	          </button>
	        ) : null}
	        </div>
	      </div>
	      <AgentExecutionSnapshotDialog
        onOpenChange={setSnapshotDialogOpen}
        open={snapshotDialogOpen}
        snapshotId={agentExecutionSnapshotId || null}
      />

      {/* 提示词重绘对话框 */}
      <PromptRegenerateDialog
        isProcessing={isProcessing}
        nodeId={node.id}
        onConfirm={handlePromptRegenerate}
        onOpenChange={setPromptDialogOpen}
        onPromptChange={setRegeneratePrompt}
        open={promptDialogOpen}
        prompt={regeneratePrompt}
      />

      {localEditMode &&
        !isMultiSelected &&
        data.src &&
        !isThisNodePicking &&
        !isCompareMode &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] flex items-center gap-2 rounded-[24px] border border-slate-200 bg-white px-2 py-2 text-gray-800 shadow-[0_14px_38px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-[0_18px_46px_rgba(0,0,0,0.52)]"
            data-local-edit-control="true"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            ref={boxCutoutToolbarRef}
            style={{
              top: boxCutoutToolbarPosition.top,
              left: boxCutoutToolbarPosition.left,
              transform: `scale(${FLOATING_TOOLBAR_SCALE})`,
              transformOrigin: "top left",
              pointerEvents: "auto",
              maxWidth: `${Math.max(
                180,
                Math.floor(boxCutoutToolbarPosition.maxWidth / FLOATING_TOOLBAR_SCALE)
              )}px`,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            <div className="mr-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 font-medium text-[13px] text-slate-700 dark:bg-neutral-800 dark:text-neutral-100">
              <WandSparkles className="h-4 w-4 text-slate-950 dark:text-white" />
              <span className="whitespace-nowrap">局部重绘</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-neutral-300">
                {localEditRegions.length}/{LOCAL_EDIT_MAX_REGIONS}
              </span>
            </div>

            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/12" />

            <Button
              className="mr-1 inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-950 px-3 font-semibold text-[13px] text-white hover:bg-slate-800 hover:text-white disabled:bg-slate-300 disabled:text-slate-500 dark:border dark:border-white/14 dark:bg-black dark:text-white dark:disabled:border-transparent dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 dark:hover:bg-neutral-900"
              disabled={
                isSubmittingLocalEdit ||
                localEditRegions.length === 0
              }
              onClick={() => void handleSubmitLocalEdit()}
              title="生成局部重绘结果"
              type="button"
              variant="ghost"
            >
              {isSubmittingLocalEdit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              <span className="whitespace-nowrap">生成</span>
            </Button>

            <Button
              className="h-10 shrink-0 rounded-xl px-3 text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              disabled={isSubmittingLocalEdit || localEditRegions.length === 0}
              onClick={clearLocalEditRegions}
              title="清空区域"
              type="button"
              variant="ghost"
            >
              清空
            </Button>

            <Button
              className="h-10 shrink-0 rounded-xl px-3 text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              disabled={isSubmittingLocalEdit}
              onClick={resetLocalEditState}
              title="退出局部重绘"
              type="button"
              variant="ghost"
            >
              退出
            </Button>
          </div>,
          document.body
        )}

      {isSelected &&
        !isMultiSelected &&
        data.src &&
        !isEditingTitle &&
        !promptDialogOpen &&
        !notePanelOpen &&
        !boxCutoutMode &&
        !localEditMode &&
        !cropPanelOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <TooltipProvider delayDuration={200}>
            <div
                className="fixed z-[9999] flex items-center gap-0.5 rounded-[24px] border border-slate-200 bg-white px-2 py-1.5 text-gray-800 shadow-[0_14px_38px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-[0_18px_46px_rgba(0,0,0,0.52)]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              ref={toolbarRef}
              style={{
                top: toolbarPosition.top,
                left: toolbarPosition.left,
                transform: `scale(${FLOATING_TOOLBAR_SCALE})`,
                transformOrigin: "top left",
                pointerEvents: "auto",
                maxWidth: `${Math.max(
                  180,
                  Math.floor(toolbarPosition.maxWidth / FLOATING_TOOLBAR_SCALE)
                )}px`,
                overflowX: "visible",
                scrollbarWidth: "none",
              }}
            >
	              {imageAddToChatEnabled ? (
	              <Button
	                className="mr-1 inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3 font-semibold text-[13px] text-white hover:bg-slate-800 hover:text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
	                disabled={isProcessing || isAddingToChat}
	                onClick={handleAddToChat}
	                title={imageAddToChatItem.label}
	                variant="ghost"
	              >
	                {isAddingToChat ? (
	                  <Loader2 className="h-4 w-4 animate-spin" />
	                ) : (
		                  <CanvasToolbarIcon
		                    active
		                    className="h-4 w-4 dark:invert-0"
		                    fallback={MessageCirclePlus}
		                    item={imageAddToChatItem}
		                  />
	                )}
	                <span className="whitespace-nowrap">{imageAddToChatItem.label}</span>
	              </Button>
              ) : null}

              {imageAddToChatEnabled &&
              (hasSelectedImagePrimaryToolbarActions ||
                hasSelectedImageSecondaryToolbarActions) ? (
              <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/12" />
              ) : null}

              {isSelectedImageActionInline("pickObject") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing || isPickerLoading || isThisNodePicking}
	                onClick={handleStartPicking}
	                title={imagePickObjectItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={ScanSearch}
		                  item={imagePickObjectItem}
		                />
	                {imagePickObjectItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("enhance") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("enhance")}
	                title={imageEnhanceItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={ZoomIn}
		                  item={imageEnhanceItem}
		                />
	                {imageEnhanceItem.label}
                  <ImageActionCreditBadge compact label={enhanceCostShortLabel} />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("removeBackground") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("rmbg")}
	                title={imageRemoveBackgroundItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={ImageOff}
		                  item={imageRemoveBackgroundItem}
		                />
	                {imageRemoveBackgroundItem.label}
                  <ImageActionCreditBadge
                    compact
                    label={removeBackgroundCostShortLabel}
                  />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("textEdit") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing || isDetectingText || isApplyingTextEdit}
	                onClick={() => handleAction("text-edit")}
	                title={imageTextEditItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={TextCursorInput}
		                  item={imageTextEditItem}
		                />
	                {imageTextEditItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("boxCutout") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("box-cutout")}
	                title={imageBoxCutoutItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={SquareDashedMousePointer}
		                  item={imageBoxCutoutItem}
		                />
	                {imageBoxCutoutItem.label}
                  <ImageActionCreditBadge compact label={boxCutoutCostShortLabel} />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("localEdit") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing || isSubmittingLocalEdit}
	                onClick={() => handleAction("local-edit")}
	                title={imageLocalEditItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={WandSparkles}
		                  item={imageLocalEditItem}
		                />
	                {imageLocalEditItem.label}
                  <ImageActionCreditBadge
                    compact
                    label={localEditCostShortLabel}
                  />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("removeWatermark") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("watermark")}
	                title={imageRemoveWatermarkItem.label}
	                variant="ghost"
	              >
	                <CanvasToolbarIcon
	                  className="mr-1.5 h-4 w-4"
	                  fallback={Eraser}
	                  item={imageRemoveWatermarkItem}
	                />
	                {imageRemoveWatermarkItem.label}
                  <ImageActionCreditBadge
                    compact
                    label={removeWatermarkCostShortLabel}
                  />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("resize") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("resize")}
	                title={imageResizeItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={MoveDiagonal}
		                  item={imageResizeItem}
		                />
	                {imageResizeItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("multiAngle") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("angle")}
	                title={imageMultiAngleItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={RotateCwSquare}
		                  item={imageMultiAngleItem}
		                />
	                {imageMultiAngleItem.label}
                  <ImageActionCreditBadge
                    compact
                    label={angleEditCostShortLabel}
                  />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("layerSplit") ? (
                <Button
                  className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                  disabled={isProcessing}
	                  onClick={() => handleAction("layer-split")}
	                  title={imageLayerSplitItem.label}
	                  variant="ghost"
	                >
		                  <CanvasToolbarIcon
		                    className="mr-1.5 h-4 w-4"
		                    fallback={SplitSquareHorizontal}
		                    item={imageLayerSplitItem}
		                  />
	                  {imageLayerSplitItem.label}
	                </Button>
              ) : null}

              {isSelectedImageActionInline("extend") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("extend")}
	                title={imageExtendItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={PanelTopOpen}
		                  item={imageExtendItem}
		                />
	                {imageExtendItem.label}
                  <ImageActionCreditBadge compact label={extendCostShortLabel} />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("crop") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("crop")}
	                title={imageCropItem.label}
	                variant="ghost"
	              >
	                <CanvasToolbarIcon
	                  className="mr-1.5 h-4 w-4"
	                  fallback={Crop}
	                  item={imageCropItem}
	                />
	                {imageCropItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("adjust") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("adjust")}
	                title={imageAdjustItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={Palette}
		                  item={imageAdjustItem}
		                />
	                {imageAdjustItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("flipRotate") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("flip-rotate")}
	                title={imageFlipRotateItem.label}
	                variant="ghost"
	              >
		                <CanvasToolbarIcon
		                  className="mr-1.5 h-4 w-4"
		                  fallback={RotateCwSquare}
		                  item={imageFlipRotateItem}
		                />
	                {imageFlipRotateItem.label}
	              </Button>
              ) : null}

              {isSelectedImageActionInline("promptRegenerate") ? (
              <Button
                className="group relative h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("prompt-regenerate")}
	                title={imagePromptRegenerateItem.label}
	                variant="ghost"
	              >
	                <CanvasToolbarIcon
	                  className="mr-1.5 h-4 w-4"
	                  fallback={RefreshCw}
	                  item={imagePromptRegenerateItem}
	                />
	                {imagePromptRegenerateItem.label}
                  <ImageActionCreditBadge
                    compact
                    label={promptRegenerateCostShortLabel}
                  />
	              </Button>
              ) : null}

              {isSelectedImageActionInline("note") ? (
              <Button
                className="h-10 rounded-xl px-3 font-medium text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={() => handleAction("note")}
	                title={imageNoteItem.label}
	                variant="ghost"
	              >
	                <CanvasToolbarIcon
	                  className="mr-1.5 h-4 w-4"
	                  fallback={StickyNote}
	                  item={imageNoteItem}
	                />
	                {imageNoteItem.label}
	              </Button>
              ) : null}

              {hasSelectedImagePrimaryToolbarActions &&
              hasSelectedImageSecondaryToolbarActions ? (
              <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/12" />
              ) : null}

              {hasSelectedImageMoreMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
	                  <Button
	                    className="h-10 w-10 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                    disabled={isProcessing}
	                    size="icon"
	                    title={imageNodeMoreItem.label}
	                    variant="ghost"
	                  >
	                    <CanvasToolbarIcon
	                      className="h-4 w-4"
	                      fallback={MoreHorizontal}
	                      item={imageNodeMoreItem}
	                    />
	                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="bg-white opacity-100 backdrop-blur-none dark:bg-neutral-900 dark:text-neutral-100"
                  side="bottom"
                >
	                  {isSelectedImageActionInMore("boxCutout") ? (
	                  <DropdownMenuItem onClick={() => handleAction("box-cutout")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={SquareDashedMousePointer}
	                      item={imageBoxCutoutItem}
	                    />
	                    <span>{imageBoxCutoutItem.label}</span>
                      <ImageActionCreditBadge label={boxCutoutCostShortLabel} />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("localEdit") ? (
	                  <DropdownMenuItem onClick={() => handleAction("local-edit")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={WandSparkles}
	                      item={imageLocalEditItem}
	                    />
	                    <span>{imageLocalEditItem.label}</span>
                      <ImageActionCreditBadge label={localEditCostShortLabel} />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("removeWatermark") ? (
	                  <DropdownMenuItem onClick={() => handleAction("watermark")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={Eraser}
	                      item={imageRemoveWatermarkItem}
	                    />
	                    <span>{imageRemoveWatermarkItem.label}</span>
                      <ImageActionCreditBadge
                        label={removeWatermarkCostShortLabel}
                      />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("resize") ? (
	                  <DropdownMenuItem onClick={() => handleAction("resize")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={MoveDiagonal}
	                      item={imageResizeItem}
	                    />
	                    {imageResizeItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("multiAngle") ? (
	                  <DropdownMenuItem onClick={() => handleAction("angle")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={RotateCwSquare}
	                      item={imageMultiAngleItem}
	                    />
	                    <span>{imageMultiAngleItem.label}</span>
                      <ImageActionCreditBadge
                        label={angleEditCostShortLabel}
                      />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("layerSplit") ? (
	                  <DropdownMenuItem onClick={() => handleAction("layer-split")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={SplitSquareHorizontal}
	                      item={imageLayerSplitItem}
	                    />
	                    {imageLayerSplitItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("extend") ? (
	                  <DropdownMenuItem onClick={() => handleAction("extend")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={PanelTopOpen}
	                      item={imageExtendItem}
	                    />
	                    <span>{imageExtendItem.label}</span>
                      <ImageActionCreditBadge label={extendCostShortLabel} />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("crop") ? (
	                  <DropdownMenuItem onClick={() => handleAction("crop")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={Crop}
	                      item={imageCropItem}
	                    />
	                    {imageCropItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("adjust") ? (
	                  <DropdownMenuItem onClick={() => handleAction("adjust")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={Palette}
	                      item={imageAdjustItem}
	                    />
	                    {imageAdjustItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("flipRotate") ? (
	                  <DropdownMenuItem onClick={() => handleAction("flip-rotate")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={RotateCwSquare}
	                      item={imageFlipRotateItem}
	                    />
	                    {imageFlipRotateItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("promptRegenerate") ? (
                  <DropdownMenuItem
                    onClick={() => handleAction("prompt-regenerate")}
	                  >
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={RefreshCw}
	                      item={imagePromptRegenerateItem}
	                    />
	                    <span>{imagePromptRegenerateItem.label}</span>
                      <ImageActionCreditBadge
                        label={promptRegenerateCostShortLabel}
                      />
	                  </DropdownMenuItem>
	                  ) : null}
	                  {isSelectedImageActionInMore("note") ? (
	                  <DropdownMenuItem onClick={() => handleAction("note")}>
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={StickyNote}
	                      item={imageNoteItem}
	                    />
	                    {imageNoteItem.label}
	                  </DropdownMenuItem>
	                  ) : null}
                  {hasSelectedImageMorePrimaryActions && imageDeleteEnabled ? (
                  <DropdownMenuSeparator />
                  ) : null}
                  {imageDeleteEnabled ? (
                  <DropdownMenuItem
	                    className="text-red-600 focus:text-red-700"
	                    onClick={() => deleteNode(node.id)}
	                  >
	                    <CanvasToolbarIcon
	                      className="mr-2 h-4 w-4"
	                      fallback={Trash2}
	                      item={imageDeleteItem}
	                    />
	                    {imageDeleteItem.label}
	                  </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              ) : null}

              {imageDownloadEnabled ? (
              <Button
                className="h-10 w-10 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	                disabled={isProcessing}
	                onClick={handleDownload}
	                size="icon"
	                title={imageDownloadItem.label}
	                variant="ghost"
	              >
	                <CanvasToolbarIcon
	                  className="h-4 w-4"
	                  fallback={Save}
	                  item={imageDownloadItem}
	                />
	              </Button>
              ) : null}
            </div>
          </TooltipProvider>,
          document.body
        )}

      {isSelected &&
        !isMultiSelected &&
        data.src &&
        boxCutoutMode &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] flex items-center rounded-[24px] border border-slate-200 bg-white px-2 py-2 text-gray-800 shadow-[0_14px_38px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-[0_18px_46px_rgba(0,0,0,0.52)]"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            ref={boxCutoutToolbarRef}
            style={{
              top: boxCutoutToolbarPosition.top,
              left: boxCutoutToolbarPosition.left,
              transform: `scale(${FLOATING_TOOLBAR_SCALE})`,
              transformOrigin: "top left",
              pointerEvents: "auto",
              maxWidth: `${Math.max(
                180,
                Math.floor(boxCutoutToolbarPosition.maxWidth / FLOATING_TOOLBAR_SCALE)
              )}px`,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
	          >
	            <div className="mr-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 font-medium text-[13px] text-slate-700 dark:bg-neutral-800 dark:text-neutral-100">
		              <CanvasToolbarIcon
		                className="h-4 w-4 text-neutral-950 dark:text-white"
		                fallback={SquareDashedMousePointer}
		                item={imageBoxCutoutItem}
		              />
	              <span className="whitespace-nowrap">{boxCutoutHintText}</span>
	            </div>

            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/12" />

            <Button
	              className="mr-1 inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3 font-semibold text-[13px] text-white hover:bg-slate-800 hover:text-white disabled:bg-slate-300 disabled:text-slate-500 dark:bg-white dark:text-neutral-950 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 dark:hover:bg-neutral-200"
	              disabled={isProcessing || !boxCutoutSelection}
	              onClick={() => void handleConfirmBoxCutout()}
	              title={imageConfirmCutoutItem.label}
	              variant="ghost"
	            >
	              {isProcessing ? (
	                <Loader2 className="h-4 w-4 animate-spin" />
	              ) : (
	                <CanvasToolbarIcon
	                  active
	                  className="h-4 w-4"
	                  fallback={Check}
	                  item={imageConfirmCutoutItem}
	                />
	              )}
	              <span className="whitespace-nowrap">
	                {imageConfirmCutoutItem.label}
	              </span>
	            </Button>

            <Button
	              className="h-10 w-10 shrink-0 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
	              onClick={() => resetBoxCutoutState()}
	              size="icon"
	              title={imageCancelCutoutItem.label}
	              variant="ghost"
	            >
	              <CanvasToolbarIcon
	                className="h-4 w-4"
	                fallback={X}
	                item={imageCancelCutoutItem}
	              />
	            </Button>
          </div>,
          document.body
        )}

      {/* 图片备注对话框 */}
      <Dialog onOpenChange={setNotePanelOpen} open={notePanelOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto border-slate-200 bg-white opacity-100 shadow-2xl backdrop-blur-none sm:max-w-[560px] dark:border-slate-700 dark:bg-slate-950"
          overlayClassName="bg-black"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              图片备注
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Textarea
              className="min-h-[180px] resize-y border-slate-300 bg-white opacity-100 dark:border-slate-700 dark:bg-slate-950"
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="记录这张图的想法、待办或交付要求..."
              rows={8}
              value={draftNote}
            />
            <p className="text-muted-foreground text-xs">
              备注仅在你点开时显示，不会直接覆盖在画面上。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setNotePanelOpen(false)} variant="outline">
              取消
            </Button>
            <Button onClick={handleSaveNote}>保存备注</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSelected &&
        cropPanelOpen &&
        data.src &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-[474px] overflow-hidden rounded-[30px] border border-[#ebe7df] bg-white shadow-[0_24px_64px_rgba(17,24,39,0.12)]"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              top: cropPanelPosition.top,
              left: cropPanelPosition.left,
              transform: `scale(${IMAGE_EDIT_PANEL_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <div className="px-8 pt-8 pb-6">
              <h3 className="text-[20px] font-semibold tracking-[0] text-[#18181b]">
                {imageCropItem.label}
              </h3>

              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-[18px] bg-[#f5f4f1] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] font-medium text-[#666a72]">W</span>
                    <Input
                      className="h-auto border-0 bg-transparent p-0 text-[20px] font-medium text-[#2a2d33] shadow-none focus-visible:ring-0"
                      inputMode="numeric"
                      onChange={(event) =>
                        handleChangeCropDimension("width", event.target.value)
                      }
                      value={cropPixelSize.width ? String(cropPixelSize.width) : ""}
                    />
                  </div>
                </div>

                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#4f84ff] transition-colors hover:bg-[#eef4ff] hover:text-[#3368f1]"
                  onClick={() => setCropLockAspectRatio((prev) => !prev)}
                  title={cropLockAspectRatio ? "解锁比例" : "锁定比例"}
                  type="button"
                >
                  {cropLockAspectRatio ? (
                    <Link2 className="h-5 w-5" />
                  ) : (
                    <Unlink2 className="h-5 w-5" />
                  )}
                </button>

                <div className="rounded-[18px] bg-[#f5f4f1] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] font-medium text-[#666a72]">H</span>
                    <Input
                      className="h-auto border-0 bg-transparent p-0 text-[20px] font-medium text-[#2a2d33] shadow-none focus-visible:ring-0"
                      inputMode="numeric"
                      onChange={(event) =>
                        handleChangeCropDimension("height", event.target.value)
                      }
                      value={cropPixelSize.height ? String(cropPixelSize.height) : ""}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-[16px] font-medium text-[#6d7077]">预设</div>
                <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {CROP_PRESET_GROUPS.map((group) => {
                    const expanded = cropExpandedGroups[group.key];
                    return (
                      <div key={group.key}>
                        <button
                          className="flex w-full items-center gap-3 py-2 text-left"
                          onClick={() => handleToggleCropGroup(group.key)}
                          type="button"
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-[#65676d]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#65676d]" />
                          )}
                          <span className="text-[17px] font-medium text-[#2b2f36]">
                            {group.label}
                          </span>
                        </button>

                        {expanded ? (
                          <div className="mt-2 space-y-2">
                            {group.options.map((option) => {
                              const selected = cropPresetId === option.id;
                              return (
                                <button
                                  className={cn(
                                    "flex w-full items-center gap-4 rounded-[18px] px-5 py-3 text-left transition-colors",
                                    selected
                                      ? "bg-[#f0efec] text-[#1f2228]"
                                      : "hover:bg-[#f7f6f3] text-[#2b2f36]"
                                  )}
                                  key={option.id}
                                  onClick={() => handleSelectCropPreset(option.id)}
                                  type="button"
                                >
                                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d6d3cd] bg-white text-[#272a31]">
                                    {selected ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <span className="h-4 w-4 rounded-[4px] border border-[#76797f]" />
                                    )}
                                  </span>
                                  <span className="text-[18px] font-medium tracking-[0]">
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-[#f0ede7] border-t px-7 py-6">
              <button
                className="inline-flex h-14 items-center justify-center rounded-[18px] border border-[#e3ddd3] bg-white text-[18px] font-medium text-[#26262a] transition-colors hover:bg-[#faf7f1]"
                disabled={isApplyingCrop}
                onClick={() => {
                  setCropPanelOpen(false);
                  setCropInteraction(null);
                }}
                type="button"
              >
                取消
              </button>
              <button
                className="inline-flex h-14 items-center justify-center rounded-[18px] bg-[#2c2c2f] text-[18px] font-semibold text-white transition-colors hover:bg-[#202023] disabled:cursor-not-allowed disabled:bg-[#c9c6bf] disabled:text-white/80"
                disabled={isApplyingCrop || !cropRect}
                onClick={() => void handleApplyCrop()}
                type="button"
              >
                {isApplyingCrop ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    裁剪中
                  </span>
                ) : (
                  "完成"
                )}
              </button>
            </div>
          </div>,
          document.body
        )}

      <ImageAdjustFloatingPanel
        draft={imageAdjustmentsDraft}
        hasImageSource={Boolean(data.src)}
        isSelected={isSelected}
        label={imageAdjustItem.label}
        onClose={() => setImageAdjustPanelOpen(false)}
        onDraftChange={setImageAdjustmentsDraft}
        onReset={handleResetImageAdjustments}
        onTabChange={setImageAdjustTab}
        open={imageAdjustPanelOpen}
        position={imageAdjustPanelPosition}
        scale={IMAGE_EDIT_PANEL_SCALE}
        tab={imageAdjustTab}
      />

      {isSelected &&
        flipRotatePanelOpen &&
        data.src &&
        typeof document !== "undefined" &&
        createPortal(
          <TooltipProvider delayDuration={120}>
            <div
              className="fixed z-[9999] flex max-w-[calc(100vw-24px)] items-center overflow-hidden rounded-[26px] border border-[#ece8e1] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                top: flipRotatePanelPosition.top,
                left: flipRotatePanelPosition.left,
                maxWidth: `${Math.floor(
                  flipRotatePanelPosition.maxWidth / IMAGE_EDIT_PANEL_SCALE
                )}px`,
                transform: `scale(${IMAGE_EDIT_PANEL_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <div className="flex h-[82px] shrink-0 items-center gap-3 px-7">
                <FlipHorizontal2 className="h-5 w-5 text-[#2d3136]" />
                <span className="whitespace-nowrap text-[18px] font-semibold tracking-[0] text-[#22252b]">
                  {imageFlipRotateItem.label}
                </span>
              </div>

              <div className="h-[82px] w-px shrink-0 bg-[#ece8e1]" />

              <div className="flex h-[82px] min-w-[138px] shrink-0 items-center gap-3 px-7">
                <RotateCcw className="h-5 w-5 text-[#4f5561]" />
                <span className="text-[18px] font-medium tabular-nums tracking-[0] text-[#23262d]">
                  0°
                </span>
              </div>

              <div className="h-[82px] w-px shrink-0 bg-[#ece8e1]" />

              <div className="flex items-center gap-2 px-3 py-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] text-[#2b2f36] transition-colors hover:bg-[#f3f1ec] disabled:cursor-not-allowed disabled:text-[#b9b5ae]"
                      disabled={isApplyingFlipRotate || !hasFlipRotateReset}
                      onClick={() => void handleApplyFlipRotate("reset")}
                      type="button"
                    >
                      {isApplyingFlipRotate ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>恢复原图</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] text-[#2b2f36] transition-colors hover:bg-[#f3f1ec] disabled:cursor-not-allowed disabled:text-[#b9b5ae]"
                      disabled={isApplyingFlipRotate}
                      onClick={() => void handleApplyFlipRotate("horizontal")}
                      type="button"
                    >
                      {isApplyingFlipRotate ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <FlipHorizontal2 className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>水平翻转</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] text-[#2b2f36] transition-colors hover:bg-[#f3f1ec] disabled:cursor-not-allowed disabled:text-[#b9b5ae]"
                      disabled={isApplyingFlipRotate}
                      onClick={() => void handleApplyFlipRotate("vertical")}
                      type="button"
                    >
                      {isApplyingFlipRotate ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <FlipVertical2 className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>垂直翻转</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] text-[#2b2f36] transition-colors hover:bg-[#f3f1ec] disabled:cursor-not-allowed disabled:text-[#b9b5ae]"
                      disabled={isApplyingFlipRotate}
                      onClick={() => setFlipRotatePanelOpen(false)}
                      type="button"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>关闭</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>,
          document.body
        )}

      {isSelected &&
        anglePanelOpen &&
        data.src &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-[520px] rounded-[28px] border border-[#ececef] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              top: anglePanelPosition.top,
              left: anglePanelPosition.left,
              transform: `scale(${ANGLE_PANEL_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[20px] font-semibold tracking-[0] text-[#17181c]">
                多角度
              </h3>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1f2024] transition-colors hover:bg-[#f5f6f8]"
                disabled={isApplyingAngleEdit}
                onClick={handleResetAnglePanel}
                type="button"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-[18px] border border-[#ededf0] bg-[#f5f5f6] p-1">
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    { id: "subject", label: "主体" },
                    { id: "camera", label: "摄像头" },
                  ] as const
                ).map((item) => {
                  const active = anglePanelMode === item.id;
                  return (
                    <button
                      className={cn(
                        "h-[52px] rounded-[16px] text-[16px] font-semibold tracking-[0] transition-all",
                        active
                          ? "bg-white text-[#1f2023] shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                          : "text-[#767982] hover:text-[#2d3036]"
                      )}
                      disabled={isApplyingAngleEdit}
                      key={item.id}
                      onClick={() => setAnglePanelMode(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[26px] border border-[#efeff2] bg-[#fcfcfd] px-4 py-4">
              <div
                className={cn(
                  "relative flex h-[332px] items-center justify-center overflow-hidden rounded-[22px] [perspective:1200px]",
                  isApplyingAngleEdit
                    ? "cursor-default"
                    : isAnglePreviewDragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                )}
                onLostPointerCapture={handleAnglePreviewPointerEnd}
                onPointerCancel={handleAnglePreviewPointerEnd}
                onPointerDown={handleAnglePreviewPointerDown}
                onPointerMove={handleAnglePreviewPointerMove}
                onPointerUp={handleAnglePreviewPointerEnd}
                style={{ touchAction: "none" }}
              >
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  style={angleOrbitWireframeStyle}
                >
                  <div
                    className="relative shrink-0 [transform-style:preserve-3d]"
                    style={{
                      width: `${ANGLE_PANEL_WIREFRAME_DIAMETER}px`,
                      height: `${ANGLE_PANEL_WIREFRAME_DIAMETER}px`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-full border border-[#e4e8ef]/90" />

                    {ANGLE_PREVIEW_VERTICAL_RING_ROTATIONS.map((rotation, index) => (
                      <div
                        className="absolute inset-0 rounded-full border border-[#e7ebf2]"
                        key={`angle-vertical-ring-${rotation}`}
                        style={{
                          backfaceVisibility: "hidden",
                          opacity: 0.9 - index * 0.026,
                          transform: `rotateY(${rotation}deg)`,
                          transformStyle: "preserve-3d",
                        }}
                      />
                    ))}

                    {ANGLE_PREVIEW_HORIZONTAL_RING_ROTATIONS.map((rotation, index) => (
                      <div
                        className="absolute inset-0 rounded-full border border-[#e6eaf1]"
                        key={`angle-horizontal-ring-${rotation}`}
                        style={{
                          backfaceVisibility: "hidden",
                          opacity: rotation === 0 ? 0.94 : 0.82 - index * 0.045,
                          transform: `rotateX(${rotation}deg)`,
                          transformStyle: "preserve-3d",
                        }}
                      />
                    ))}

                    {ANGLE_PREVIEW_DIAGONAL_RING_ROTATIONS.map((rotation, index) => (
                      <Fragment key={`angle-diagonal-ring-${rotation}`}>
                        <div
                          className="absolute inset-0 rounded-full border border-[#edf0f5]"
                          style={{
                            backfaceVisibility: "hidden",
                            opacity: 0.54 - index * 0.035,
                            transform: `rotateX(67deg) rotateY(${rotation}deg)`,
                            transformStyle: "preserve-3d",
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-full border border-[#edf0f5]"
                          style={{
                            backfaceVisibility: "hidden",
                            opacity: 0.5 - index * 0.032,
                            transform: `rotateX(-67deg) rotateY(${rotation + 12}deg)`,
                            transformStyle: "preserve-3d",
                          }}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>

                <button
                  className="absolute top-[24px] left-1/2 z-[3] inline-flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-[#a0a3ab] transition-colors hover:bg-white hover:text-[#30333a]"
                  disabled={isApplyingAngleEdit}
                  onClick={() =>
                    setAngleVerticalAngle((prev) => clampNumber(prev + 5, -30, 60))
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  className="absolute bottom-[24px] left-1/2 z-[3] inline-flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-[#a0a3ab] transition-colors hover:bg-white hover:text-[#30333a]"
                  disabled={isApplyingAngleEdit}
                  onClick={() =>
                    setAngleVerticalAngle((prev) => clampNumber(prev - 5, -30, 60))
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  className="absolute top-1/2 left-[18px] z-[3] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#a0a3ab] transition-colors hover:bg-white hover:text-[#30333a]"
                  disabled={isApplyingAngleEdit}
                  onClick={() =>
                    setAngleHorizontalAngle((prev) =>
                      clampNumber(prev - 10, -180, 180)
                    )
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="absolute top-1/2 right-[18px] z-[3] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#a0a3ab] transition-colors hover:bg-white hover:text-[#30333a]"
                  disabled={isApplyingAngleEdit}
                  onClick={() =>
                    setAngleHorizontalAngle((prev) =>
                      clampNumber(prev + 10, -180, 180)
                    )
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {anglePanelMode === "subject" ? (
                  <div
                    className="relative z-[2]"
                    style={{
                      width: `${anglePreviewFrameSize.width}px`,
                      height: `${anglePreviewFrameSize.height}px`,
                      transform: `rotateX(${-angleVerticalAngle * 0.5}deg) rotateY(${angleHorizontalAngle * 0.68}deg) scale(${anglePreviewScale})`,
                      transformStyle: "preserve-3d",
                      transition: isAnglePreviewDragging
                        ? "none"
                        : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <div
                      className="absolute inset-[10%] rounded-full bg-black/12 blur-[20px]"
                      style={{
                        transform: `translate3d(0, ${anglePreviewFrameSize.height * 0.31}px, -18px) scale(${0.96 + angleZoom / 240})`,
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-[26px] border border-[#eef0f4] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
                      style={{
                        transform: `translateZ(${anglePreviewDepth / 2}px)`,
                      }}
                    >
                      <div className="absolute inset-[6px] overflow-hidden rounded-[20px] bg-[#f9fafc]">
                        <img
                          alt={displayTitle}
                          className="h-full w-full object-contain"
                          draggable={false}
                          src={anglePreviewImageSrc}
                        />
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 rounded-[26px] border border-[#e5e8ef] bg-[linear-gradient(180deg,#f7f8fb,#e6e9f0)]"
                      style={{
                        transform: `translateZ(-${anglePreviewDepth / 2}px)`,
                      }}
                    />
                    <div
                      className="absolute left-0 top-[10px] bottom-[10px] rounded-l-[18px] border border-[#dde1e9] bg-[linear-gradient(180deg,#eff2f7,#dde2ea)]"
                      style={{
                        width: `${anglePreviewDepth}px`,
                        transform: `translateX(-${anglePreviewDepth / 2}px) rotateY(-90deg)`,
                        transformOrigin: "center",
                      }}
                    />
                    <div
                      className="absolute right-0 top-[10px] bottom-[10px] rounded-r-[18px] border border-[#dde1e9] bg-[linear-gradient(180deg,#eef1f6,#dde2ea)]"
                      style={{
                        width: `${anglePreviewDepth}px`,
                        transform: `translateX(${anglePreviewDepth / 2}px) rotateY(90deg)`,
                        transformOrigin: "center",
                      }}
                    />
                    <div
                      className="absolute left-[10px] right-[10px] top-0 rounded-t-[16px] border border-[#eef0f4] bg-[linear-gradient(180deg,#ffffff,#edf0f5)]"
                      style={{
                        height: `${anglePreviewDepth}px`,
                        transform: `translateY(-${anglePreviewDepth / 2}px) rotateX(90deg)`,
                        transformOrigin: "center",
                      }}
                    />
                    <div
                      className="absolute left-[10px] right-[10px] bottom-0 rounded-b-[16px] border border-[#dde1ea] bg-[linear-gradient(180deg,#e4e8ef,#d5dbe5)]"
                      style={{
                        height: `${anglePreviewDepth}px`,
                        transform: `translateY(${anglePreviewDepth / 2}px) rotateX(-90deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="relative z-[2]"
                    style={{
                      height: `${ANGLE_PANEL_CAMERA_SCENE_SIZE}px`,
                      transform: `scale(${angleCameraSceneScale})`,
                      transition: isAnglePreviewDragging
                        ? "none"
                        : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                      width: `${ANGLE_PANEL_CAMERA_SCENE_SIZE}px`,
                    }}
                  >
                    <div
                      className="absolute left-1/2 top-1/2 z-[2] h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-[#eceff4] bg-white/96 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                      style={{
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div
                        className="absolute inset-[10px] rounded-[17px] border border-[#eef1f5]"
                        style={{
                          backgroundImage:
                            "linear-gradient(180deg,#fcfcfd,#f5f6f8), linear-gradient(90deg,rgba(227,230,236,0.55) 1px,transparent 1px), linear-gradient(rgba(227,230,236,0.55) 1px,transparent 1px)",
                          backgroundPosition: "0 0, 0 0, 0 0",
                          backgroundSize: "100% 100%, 14px 14px, 14px 14px",
                          backgroundBlendMode: "normal",
                        }}
                      >
                        <img
                          alt={displayTitle}
                          className="absolute left-1/2 top-1/2 max-h-[76px] max-w-[76px] -translate-x-1/2 -translate-y-1/2 object-contain"
                          draggable={false}
                          src={anglePreviewImageSrc}
                        />
                      </div>
                    </div>

                    <div
                      className="absolute left-1/2 top-1/2 z-[1] h-px bg-[#dfe4ec]"
                      style={{
                        width: `${Math.max(40, angleCameraConnection.length - 12)}px`,
                        transform: `translateY(-0.5px) rotate(${angleCameraConnection.angle}deg)`,
                        transformOrigin: "0 50%",
                      }}
                    />

                    <div
                      className="absolute left-1/2 top-1/2 z-[3]"
                      style={{
                        transform: `translate3d(${angleCameraOrbitPosition.x}px, ${angleCameraOrbitPosition.y}px, ${angleCameraOrbitPosition.z}px)`,
                        transformStyle: "preserve-3d",
                        transition: isAnglePreviewDragging
                          ? "none"
                          : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      <div
                        className="relative"
                        style={{
                            width: "60px",
                            height: "60px",
                          transform:
                            "translate(-50%, -50%) rotateX(-18deg) rotateY(28deg)",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-[15px] border border-[#e5e9f0] bg-[linear-gradient(180deg,#ffffff,#edf1f5)] shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
                          style={{ transform: "translateZ(10px)" }}
                        >
                          <div className="absolute inset-[10px] rounded-[10px] border border-[#edf1f6] bg-[linear-gradient(180deg,#f9fafc,#eef1f5)]">
                            <AngleCameraModelGlyph />
                          </div>
                        </div>
                        <div
                          className="absolute inset-y-[5px] -right-[11px] rounded-r-[12px] border border-[#dde2ea] bg-[linear-gradient(180deg,#eef2f7,#dfe4ec)]"
                          style={{
                            width: "22px",
                            transform: "rotateY(90deg)",
                            transformOrigin: "left center",
                          }}
                        />
                        <div
                          className="absolute inset-x-[5px] -top-[11px] rounded-t-[12px] border border-[#e8ecf2] bg-[linear-gradient(180deg,#ffffff,#edf1f6)]"
                          style={{
                            height: "22px",
                            transform: "rotateX(90deg)",
                            transformOrigin: "center bottom",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {anglePanelMode === "subject" ? (
                  <div className="pointer-events-none absolute bottom-[36px] left-[34px] z-[3] flex h-[50px] w-[50px] items-center justify-center rounded-[16px] border border-[#eceef3] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
                    <Box className="h-5 w-5 text-[#8a8f98]" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <AngleEditPanelSlider
                label="旋转"
                max={180}
                min={-180}
                onChange={setAngleHorizontalAngle}
                value={angleHorizontalAngle}
                valueLabel={String(Math.round(angleHorizontalAngle))}
              />
              <AngleEditPanelSlider
                label="倾斜"
                max={60}
                min={-30}
                onChange={setAngleVerticalAngle}
                value={angleVerticalAngle}
                valueLabel={String(Math.round(angleVerticalAngle))}
              />
              <AngleEditPanelSlider
                label="缩放"
                max={100}
                min={0}
                onChange={setAngleZoom}
                value={angleZoom}
                valueLabel={formatAnglePanelZoomLabel(angleZoom)}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="inline-flex h-[50px] items-center justify-center rounded-[18px] border border-[#dfe2e8] bg-white text-[17px] font-medium text-[#27292f] transition-colors hover:bg-[#f7f8fa]"
                disabled={isApplyingAngleEdit}
                onClick={() => setAnglePanelOpen(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="group relative inline-flex h-[50px] items-center justify-center gap-2 rounded-[18px] bg-[#2d2f34] text-[17px] font-semibold text-white transition-colors hover:bg-[#23252a] disabled:cursor-not-allowed disabled:bg-[#cfd2d8] disabled:text-white/80"
                disabled={isApplyingAngleEdit}
                onClick={() => void handleApplyAngleEdit()}
                type="button"
              >
                {isApplyingAngleEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    立即使用
                    <ImageActionCreditBadge
                      className="ml-0 bg-white/18 text-white"
                      compact
                      label={angleEditCostShortLabel}
                    />
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 文字编辑面板（显示在图片节点旁边） */}
      {isSelected &&
        textEditPanelOpen &&
        data.src &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-[360px] rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              top: getTextPanelPosition().top,
              left: getTextPanelPosition().left,
            }}
          >
            <div className="flex items-center justify-between border-border/70 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">编辑文字</span>
              </div>
              <Button
                className="h-7 w-7"
                onClick={() => setTextEditPanelOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-3">
              <p className="text-muted-foreground text-xs">
                识别图片文字后可逐条修改或删除，应用后会在保持画面风格的前提下完成文字更新。
              </p>

              {isDetectingText && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在识别图片文字...
                </div>
              )}

              {textEditError && !isDetectingText && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
                  {textEditError}
                </div>
              )}

              {!isDetectingText &&
                textEditItems.length === 0 &&
                !textEditError && (
                  <div className="rounded-md bg-slate-50 px-3 py-3 text-muted-foreground text-xs dark:bg-zinc-900">
                    未识别到可编辑文字，可点击“重新识别”再试一次。
                  </div>
                )}

              {textEditItems.map((item, index) => (
                <div
                  className="space-y-2 rounded-lg border border-border/70 p-3"
                  key={item.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      文本 {index + 1}
                      {typeof item.confidence === "number" &&
                        ` · 置信度 ${(item.confidence * 100).toFixed(0)}%`}
                    </div>
                    <Button
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTextItem(item.id)}
                      size="icon"
                      title="删除该条文字"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="line-clamp-2 text-muted-foreground text-xs">
                    原文：{item.originalText}
                  </div>
                  <Input
                    onChange={(e) =>
                      handleTextItemChange(item.id, e.target.value)
                    }
                    placeholder="输入替换后的文字"
                    value={item.editedText}
                  />
                  <TextEditColorField
                    value={item.textColor}
                    onChange={(value) =>
                      handleTextItemColorChange(item.id, value)
                    }
                  />
                </div>
              ))}

              {deletedTextItems.length > 0 && (
                <div className="rounded-md border border-orange-300 border-dashed bg-orange-50 px-3 py-2 text-orange-700 text-xs dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                  已标记删除 {deletedTextItems.length}{" "}
                  条文字，应用时会明确告诉生图模型移除这些文字并修复背景。
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-border/70 border-t px-4 py-3">
              <Button
                disabled={isDetectingText || isApplyingTextEdit}
                onClick={() => detectTextItems(true)}
                size="sm"
                variant="outline"
              >
                {isDetectingText ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                重新识别
              </Button>
              <Button
                disabled={
                  isDetectingText ||
                  isApplyingTextEdit ||
                  !hasTextEditChanges
                }
                onClick={handleApplyTextEdit}
                size="sm"
              >
                {isApplyingTextEdit ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                {hasTextEditChanges ? "确认替换" : "先修改文字"}
              </Button>
            </div>
          </div>,
          document.body
        )}

      {/* 图片标注器 */}
      {annotatorOpen && data.src && (
        <ImageAnnotator
          imageUrl={data.src}
          onCancel={() => setAnnotatorOpen(false)}
          onConfirm={handleAnnotateComplete}
          onOpenChange={setAnnotatorOpen}
          open={annotatorOpen}
        />
      )}

      {resizeAnnotatorOpen && data.src && (
        <ImageAnnotator
          confirmButtonText="保存处理结果"
          imageUrl={data.src}
          initialResizeMode
          key={`resize-${node.id}-${data.src}`}
          onCancel={() => setResizeAnnotatorOpen(false)}
          onConfirm={handleResizeEditorComplete}
          onOpenChange={setResizeAnnotatorOpen}
          open={resizeAnnotatorOpen}
        />
      )}

      {/* 双击放大预览弹窗 */}
      {fullscreenPreviewOpen &&
        data.src &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/90"
            onClick={() => setFullscreenPreviewOpen(false)}
          >
            {/* 关闭按钮 */}
            <button
              className="absolute top-4 right-4 rounded-full bg-slate-950 p-2 transition-colors hover:bg-black"
              onClick={() => setFullscreenPreviewOpen(false)}
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>

            {/* 图片 */}
            <img
              alt={data.prompt || "图片预览"}
              className="max-h-[95vh] max-w-[95vw] object-contain"
              decoding="async"
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onError={(event) => {
                if (event.currentTarget.src !== data.src) {
                  setLocalArchiveDisplaySrc("");
                  event.currentTarget.src = data.src;
                }
              }}
              src={fullscreenPreviewSrc}
              style={activeImageAdjustmentsStyle}
            />

            {/* 底部提示 */}
            <div className="-translate-x-1/2 absolute bottom-4 left-1/2 text-sm text-white/60">
              点击任意位置关闭
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
