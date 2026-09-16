// Modified for standalone community distribution; see NOTICE.
"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import dynamic from "@/src/desktop/next-dynamic-shim";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import { useCanvasStore, canvasSelectors } from "@/src/store/canvas/index";
import type {
  CanvasEdge,
  CanvasNode,
  ImageFolderNodeData,
  Position,
  Size,
} from "@/types/canvas/index";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { toast } from "sonner";
import { imageGenerationService } from "@/src/services/canvas/index";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  Flag,
  FolderPlus,
  GitBranch,
  Heart,
  HelpCircle,
  Lightbulb,
  Loader2,
  Minus,
  Pin,
  Plus,
  Star,
  Tag,
  type LucideIcon,
  UserRound,
  Wand2,
  XCircle,
  Zap,
} from "lucide-react";
import {
  getVideoCanvasMarkerColor,
  getVideoCanvasSymbolMarker,
  getVideoCanvasTaskMarker,
  normalizeVideoCanvasMarkers,
  VIDEO_CANVAS_MARKER_METADATA_KEY,
  VIDEO_CANVAS_PRIORITY_MARKERS,
} from "@/src/lib/canvas/video-canvas-markers";
import {
  getCanvasToolbarItem,
  normalizeCanvasToolbarConfig,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import {
  isCanvasImageReadyForAi,
  isCanvasImageUploadPending,
  LOCAL_UPLOAD_PENDING_METADATA_KEY,
  LOCAL_UPLOAD_PREVIEW_METADATA_KEY,
} from "@/src/lib/canvas/local-upload-state";
import { apiFetch } from "@/src/client/api";
import { inferOriginalImageUrl } from "@/src/lib/image-url";

const CANVAS_NO_DRAG_SELECTOR =
  '[data-canvas-no-drag="true"], [data-canvas-no-drag="true"] *';
const CANVAS_DRAG_CANCEL_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a",
  '[contenteditable="true"]',
  '[role="textbox"]',
  CANVAS_NO_DRAG_SELECTOR,
].join(", ");

const CanvasNodeFallback = () => (
  <div className="h-full w-full rounded-[12px] border border-black/5 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5" />
);

const ImageFolderNode = dynamic(
  () =>
    import("@/src/components/canvas/nodes/ImageFolderNode").then((module) => module.ImageFolderNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const ImageNode = dynamic(
  () => import("@/src/components/canvas/nodes/ImageNode").then((module) => module.ImageNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const TextNode = dynamic(
  () => import("@/src/components/canvas/nodes/TextNode").then((module) => module.TextNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const UiScreenNode = dynamic(
  () => import("@/src/components/canvas/nodes/UiScreenNode").then((module) => module.UiScreenNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const VideoNode = dynamic(
  () => import("@/src/components/canvas/nodes/VideoNode").then((module) => module.VideoNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const WorkflowNode = dynamic(
  () => import("@/src/components/canvas/nodes/WorkflowNode").then((module) => module.WorkflowNode),
  {
    loading: CanvasNodeFallback,
    ssr: false,
  }
);

const VIDEO_CANVAS_SYMBOL_ICON_MAP: Record<string, LucideIcon> = {
  idea: Lightbulb,
  question: HelpCircle,
  warning: AlertTriangle,
  pin: Pin,
  heart: Heart,
  bolt: Zap,
};

const IMAGE_FOLDER_PADDING = 20;
const IMAGE_FOLDER_HEADER_HEIGHT = 40;
const IMAGE_FOLDER_GAP = 8;
const IMAGE_FOLDER_DEFAULT_CELL = 176;
const IMAGE_FOLDER_MIN_CELL = 92;

type CanvasZipTaskStatus =
  | "starting"
  | "pending"
  | "running"
  | "completed"
  | "failed";

type CanvasZipTaskSnapshot = {
  id: string;
  folderName: string;
  status: Exclude<CanvasZipTaskStatus, "starting">;
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

type CanvasZipDownloadDialogState = {
  zipName: string;
  status: CanvasZipTaskStatus;
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

function normalizeCanvasZipTaskSnapshot(value: unknown): CanvasZipTaskSnapshot | null {
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

function triggerCanvasZipDownload(downloadUrl: string, zipName: string) {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `${zipName || "canvas-images"}.zip`;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getImageFolderImageNodeIds(node: CanvasNode) {
  if (node.type !== "image-folder") return [];
  const data = node.data as ImageFolderNodeData;
  return Array.isArray(data.imageNodeIds)
    ? data.imageNodeIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
}

function sortNodesForFolderGrid(nodes: CanvasNode[]) {
  return [...nodes].sort((a, b) => {
    const rowDelta = a.position.y - b.position.y;
    if (Math.abs(rowDelta) > 24) return rowDelta;
    return a.position.x - b.position.x;
  });
}

function getInitialImageFolderFrame(imageNodes: CanvasNode[]): {
  position: Position;
  size: Size;
  columns: number;
} {
  const sorted = sortNodesForFolderGrid(imageNodes);
  const count = Math.max(sorted.length, 1);
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / columns);
  const cell = count <= 1 ? 220 : count <= 4 ? 190 : IMAGE_FOLDER_DEFAULT_CELL;
  const minX = Math.min(...sorted.map((node) => node.position.x));
  const minY = Math.min(...sorted.map((node) => node.position.y));

  return {
    position: {
      x: minX - IMAGE_FOLDER_PADDING,
      y: minY - IMAGE_FOLDER_HEADER_HEIGHT - IMAGE_FOLDER_PADDING,
    },
    size: {
      width:
        IMAGE_FOLDER_PADDING * 2 +
        columns * cell +
        Math.max(0, columns - 1) * IMAGE_FOLDER_GAP,
      height:
        IMAGE_FOLDER_HEADER_HEIGHT +
        IMAGE_FOLDER_PADDING * 2 +
        rows * cell +
        Math.max(0, rows - 1) * IMAGE_FOLDER_GAP,
    },
    columns,
  };
}

function getImageFolderPlacements(
  imageNodes: CanvasNode[],
  folderPosition: Position,
  folderSize: Size
) {
  const sorted = sortNodesForFolderGrid(imageNodes);
  const count = sorted.length;
  if (count === 0) return [];

  const innerWidth = Math.max(
    IMAGE_FOLDER_MIN_CELL,
    folderSize.width - IMAGE_FOLDER_PADDING * 2
  );
  const maxColumns = Math.max(
    1,
    Math.floor(
      (innerWidth + IMAGE_FOLDER_GAP) /
        (IMAGE_FOLDER_MIN_CELL + IMAGE_FOLDER_GAP)
    )
  );
  const columns = Math.max(1, Math.min(count, maxColumns));
  const rows = Math.ceil(count / columns);
  const cellWidth =
    (innerWidth - Math.max(0, columns - 1) * IMAGE_FOLDER_GAP) / columns;
  const innerHeight = Math.max(
    IMAGE_FOLDER_MIN_CELL,
    folderSize.height -
      IMAGE_FOLDER_HEADER_HEIGHT -
      IMAGE_FOLDER_PADDING * 2 -
      Math.max(0, rows - 1) * IMAGE_FOLDER_GAP
  );
  const cellHeight = innerHeight / rows;

  return sorted.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const availableWidth = Math.max(IMAGE_FOLDER_MIN_CELL, cellWidth);
    const availableHeight = Math.max(IMAGE_FOLDER_MIN_CELL, cellHeight);
    const scale = Math.min(
      availableWidth / Math.max(1, node.size.width),
      availableHeight / Math.max(1, node.size.height)
    );
    const width = Math.max(64, Math.round(node.size.width * scale));
    const height = Math.max(64, Math.round(node.size.height * scale));
    const cellX =
      folderPosition.x +
      IMAGE_FOLDER_PADDING +
      column * (cellWidth + IMAGE_FOLDER_GAP);
    const cellY =
      folderPosition.y +
      IMAGE_FOLDER_HEADER_HEIGHT +
      IMAGE_FOLDER_PADDING +
      row * (cellHeight + IMAGE_FOLDER_GAP);

    return {
      node,
      index,
      position: {
        x: Math.round(cellX + (cellWidth - width) / 2),
        y: Math.round(cellY + (cellHeight - height) / 2),
      },
      size: { width, height },
    };
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function extractImageFilesFromDataTransfer(dataTransfer?: DataTransfer | null) {
  if (!dataTransfer) return [];

  const seen = new Set<string>();
  const files: File[] = [];
  const pushFile = (file: File | null) => {
    if (!file || !isImageFile(file)) return;
    const key = `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  };

  Array.from(dataTransfer.files || []).forEach(pushFile);
  Array.from(dataTransfer.items || []).forEach((item) => {
    if (item.kind === "file") {
      pushFile(item.getAsFile());
    }
  });

  return files;
}

function isEditablePasteTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest(CANVAS_DRAG_CANCEL_SELECTOR));
}

function getNodeVideoCanvasMarkers(node: CanvasNode) {
  const metadata = (node.data as { metadata?: unknown } | undefined)?.metadata;
  return normalizeVideoCanvasMarkers(
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)[VIDEO_CANVAS_MARKER_METADATA_KEY]
      : undefined
  );
}

function VideoCanvasNodeMarkers({ node }: { node: CanvasNode }) {
  const markers = getNodeVideoCanvasMarkers(node);
  const tagColor = getVideoCanvasMarkerColor(markers.tagColor);
  const flagColor = getVideoCanvasMarkerColor(markers.flagColor);
  const starColor = getVideoCanvasMarkerColor(markers.starColor);
  const avatarColor = getVideoCanvasMarkerColor(markers.avatarColor);
  const task = getVideoCanvasTaskMarker(markers.task);
  const priority = VIDEO_CANVAS_PRIORITY_MARKERS.find(
    (entry) => entry.value === markers.priority
  );
  const symbol = getVideoCanvasSymbolMarker(markers.symbol);
  const SymbolIcon = markers.symbol
    ? VIDEO_CANVAS_SYMBOL_ICON_MAP[markers.symbol]
    : null;
  const hasMarkers = Boolean(
    tagColor || flagColor || starColor || avatarColor || task || priority || symbol
  );

  if (!hasMarkers) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute -top-4 left-4 z-30 flex items-center gap-1.5">
      {tagColor ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: tagColor.color, color: "#ffffff" }}
          title={`标签：${tagColor.label}`}
        >
          <Tag className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {priority ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white font-semibold text-[12px] text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: priority.color }}
          title={`优先级：${priority.value}`}
        >
          {priority.value}
        </span>
      ) : null}
      {task ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white p-[2px] shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{
            background: `conic-gradient(#10b981 ${task.progress * 3.6}deg, #dfe6f3 0deg)`,
          }}
          title={`任务：${task.label}`}
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#10b981]">
            {task.progress >= 100 ? <Check className="h-3 w-3" /> : null}
          </span>
        </span>
      ) : null}
      {flagColor ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: flagColor.color, color: "#ffffff" }}
          title={`旗帜：${flagColor.label}`}
        >
          <Flag className="h-3.5 w-3.5" fill="currentColor" />
        </span>
      ) : null}
      {starColor ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: starColor.color, color: "#ffffff" }}
          title={`星标：${starColor.label}`}
        >
          <Star className="h-3.5 w-3.5" fill="currentColor" />
        </span>
      ) : null}
      {avatarColor ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: avatarColor.color, color: "#ffffff" }}
          title={`人像：${avatarColor.label}`}
        >
          <UserRound className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {symbol && SymbolIcon ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
          style={{ backgroundColor: symbol.soft, color: symbol.color }}
          title={`符号：${symbol.label}`}
        >
          <SymbolIcon className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
}

// 性能优化：判断节点是否在视口内
function isNodeInViewport(
  node: CanvasNode,
  viewport: { x: number; y: number; zoom: number },
  containerSize: { width: number; height: number }
): boolean {
  const nodeScreenX = node.position.x * viewport.zoom + viewport.x;
  const nodeScreenY = node.position.y * viewport.zoom + viewport.y;
  const nodeScreenWidth = node.size.width * viewport.zoom;
  const nodeScreenHeight = node.size.height * viewport.zoom;

  // 拖动画布时会先走 GPU 位移预览，保留更大的热区避免快速平移时露白。
  const buffer = 800;

  return (
    nodeScreenX + nodeScreenWidth > -buffer &&
    nodeScreenX < containerSize.width + buffer &&
    nodeScreenY + nodeScreenHeight > -buffer &&
    nodeScreenY < containerSize.height + buffer
  );
}

interface CanvasWorkspaceProps {
  occlusionRight?: number;
  workspaceLabel?: string;
  emptyStateDescription?: string;
  workspaceVariant?: "canvas" | "video";
  canvasToolbarConfig?: CanvasToolbarConfig;
  layerSplitEnabled?: boolean;
  angleEditEnabled?: boolean;
  showEmptyState?: boolean;
  showZoomControls?: boolean;
  onBlankCanvasDoubleClick?: (payload: {
    screenPosition: Position;
    canvasPosition: Position;
  }) => void;
}

export function CanvasWorkspace({
  occlusionRight = 0,
  workspaceLabel = "画布",
  emptyStateDescription = '点击顶部"添加"按钮开始创作',
  workspaceVariant = "canvas",
  canvasToolbarConfig: rawCanvasToolbarConfig,
  layerSplitEnabled = false,
  angleEditEnabled = false,
  showEmptyState = true,
  showZoomControls = true,
  onBlankCanvasDoubleClick,
}: CanvasWorkspaceProps) {
  const canvasToolbarConfig = useMemo(
    () => normalizeCanvasToolbarConfig(rawCanvasToolbarConfig),
    [rawCanvasToolbarConfig]
  );
  const SNAP_THRESHOLD = 10;
  const SNAP_GAP = 12;
  const SELECTION_COLOR = "var(--brand-selection)";
  const SELECTION_STROKE_WIDTH = 2;
  const IMAGE_HANDLE_SIZE = 9.6;
  const IMAGE_HANDLE_OFFSET = IMAGE_HANDLE_SIZE / 2;
  const SNAP_GUIDE_COLOR = "#ff8a3d";
  const WORKFLOW_EDGE_COLOR = "#8fa3ff";
  const WORKFLOW_EDGE_ACTIVE_COLOR = "var(--brand-selection)";
  const WORKFLOW_HANDLE_SIZE = 16;
  const isWorkflowCanvas = workspaceVariant === "video";
  const overlayPanelClassName = isWorkflowCanvas
    ? "rounded-full border border-[#dbe2ee] bg-white px-3.5 py-1.5 text-xs font-medium text-[#627089] shadow-[0_0_0_1px_rgba(219,226,238,0.32),0_12px_28px_rgba(22,24,29,0.06)] dark:border-zinc-800 dark:bg-zinc-950"
    : "rounded-[8px] border border-black/[0.05] bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#536471] shadow-none backdrop-blur-[8px] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:text-white/62";
  const zoomOverlayClassName = isWorkflowCanvas
    ? "absolute bottom-4 right-4 rounded-full border border-[#dbe2ee] bg-white shadow-[0_0_0_1px_rgba(219,226,238,0.32),0_12px_28px_rgba(22,24,29,0.06)] dark:border-zinc-800 dark:bg-zinc-950"
    : "absolute bottom-4 right-4 rounded-[14px] border border-white/9 bg-[#202020]/95 text-white/72 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-[10px]";

  type SnapGuideLines = {
    vertical?: { x: number; top: number; bottom: number };
    horizontal?: { y: number; left: number; right: number };
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const contentLayerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Position | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Position | null>(null);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const [isDownloadSubmitting, setIsDownloadSubmitting] = useState(false);
  const [zipDownloadDialog, setZipDownloadDialog] =
    useState<CanvasZipDownloadDialogState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuideLines | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<{
    sourceId: string;
    current: Position;
  } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });
  const dragCounterRef = useRef(0);
  const dragPointerRef = useRef<Position>({ x: 0, y: 0 });
  const downloadedZipTaskIdsRef = useRef<Set<string>>(new Set());
  const suppressCanvasClickRef = useRef(false);
  const lastBlankCanvasClickAtRef = useRef(0);
  const groupDragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    originPositions: Record<string, Position>;
  } | null>(null);

  // Store state
  const nodes = useCanvasStore(canvasSelectors.nodes);
  const edges = useCanvasStore(canvasSelectors.edges);
  const selectedNodeIds = useCanvasStore(canvasSelectors.selectedNodeIds);
  const viewport = useCanvasStore(canvasSelectors.viewport);
  const tool = useCanvasStore(canvasSelectors.tool);
  const lastAddedNodeId = useCanvasStore((state) => state.lastAddedNodeId);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const viewportRef = useRef(viewport);
  const pendingViewportRef = useRef<typeof viewport | null>(null);
  const pendingViewportRafRef = useRef<number | null>(null);
  const panPreviewRef = useRef<{
    startClientX: number;
    startClientY: number;
    startViewport: typeof viewport;
    currentViewport: typeof viewport;
    offsetX: number;
    offsetY: number;
    rafId: number | null;
  } | null>(null);

  // 性能优化：监听容器大小变化
  React.useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  React.useEffect(() => {
    return () => {
      if (pendingViewportRafRef.current !== null) {
        window.cancelAnimationFrame(pendingViewportRafRef.current);
      }
      const panPreview = panPreviewRef.current;
      if (panPreview && panPreview.rafId !== null) {
        window.cancelAnimationFrame(panPreview.rafId);
      }
    };
  }, []);

  const resetContentLayerTransform = useCallback(() => {
    const layer = contentLayerRef.current;
    if (!layer) return;
    layer.style.transform = "translate3d(0px, 0px, 0px)";
    layer.style.willChange = "";
  }, []);

  const schedulePanPreviewTransform = useCallback((offsetX: number, offsetY: number) => {
    const session = panPreviewRef.current;
    if (!session) return;

    session.offsetX = offsetX;
    session.offsetY = offsetY;
    if (session.rafId !== null) return;

    session.rafId = window.requestAnimationFrame(() => {
      const activeSession = panPreviewRef.current;
      if (!activeSession) return;
      activeSession.rafId = null;
      const layer = contentLayerRef.current;
      if (!layer) return;
      layer.style.transform = `translate3d(${activeSession.offsetX}px, ${activeSession.offsetY}px, 0px)`;
      layer.style.willChange = "transform";
    });
  }, []);

  const finishPanPreview = useCallback(() => {
    const session = panPreviewRef.current;
    if (!session) return null;
    if (session.rafId !== null) {
      window.cancelAnimationFrame(session.rafId);
    }
    const finalViewport = session.currentViewport;
    panPreviewRef.current = null;
    return finalViewport;
  }, []);

  const cancelPanPreview = useCallback(() => {
    const session = panPreviewRef.current;
    if (session && session.rafId !== null) {
      window.cancelAnimationFrame(session.rafId);
    }
    panPreviewRef.current = null;
    resetContentLayerTransform();
  }, [resetContentLayerTransform]);

  const scheduleViewport = useCallback(
    (nextViewport: typeof viewport) => {
      pendingViewportRef.current = nextViewport;
      viewportRef.current = nextViewport;

      if (pendingViewportRafRef.current !== null) return;
      pendingViewportRafRef.current = window.requestAnimationFrame(() => {
        pendingViewportRafRef.current = null;
        const queuedViewport = pendingViewportRef.current;
        pendingViewportRef.current = null;
        if (queuedViewport) {
          setViewport(queuedViewport);
        }
      });
    },
    [setViewport]
  );

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Browser zoom/history gestures can fire before React handlers if nested viewers stop propagation.
  // Capture-phase non-passive handling keeps wheel gestures scoped to the canvas.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventTrackpadHistorySwipe = (event: WheelEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const wheelListenerOptions: AddEventListenerOptions = {
      capture: true,
      passive: false,
    };

    container.addEventListener("wheel", preventTrackpadHistorySwipe, wheelListenerOptions);
    return () => {
      container.removeEventListener("wheel", preventTrackpadHistorySwipe, wheelListenerOptions);
    };
  }, []);

  const isFileDrag = useCallback((dataTransfer?: DataTransfer | null) => {
    if (!dataTransfer) return false;
    const types = Array.from(dataTransfer.types || []);
    if (
      types.includes("Files") ||
      types.includes("application/x-moz-file") ||
      types.includes("public.file-url")
    ) {
      return true;
    }
    const items = dataTransfer.items;
    if (items && Array.from(items).some((item) => item.kind === "file")) {
      return true;
    }
    return false;
  }, []);

  // 防止浏览器默认打开文件
  React.useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (isFileDrag(e.dataTransfer)) {
        e.preventDefault();
      }
    };
    const handleWindowDrop = (e: DragEvent) => {
      if (isFileDrag(e.dataTransfer)) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [isFileDrag]);

  // 性能优化：始终只渲染视口附近节点，避免打开大画布时一次性拉取所有云端图片。
  const visibleNodes = useMemo(() => {
    return nodes.filter(node =>
      isNodeInViewport(node, viewport, containerSize) ||
      selectedNodeIds.includes(node.id) // 选中的节点总是渲染
    );
  }, [nodes, viewport, containerSize, selectedNodeIds]);

  const selectedImageNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          selectedNodeIds.includes(node.id) &&
          node.type === "image" &&
          isCanvasImageReadyForAi(node)
      ),
    [nodes, selectedNodeIds]
  );
  const selectedPendingImageUploadCount = useMemo(
    () =>
      nodes.filter(
        (node) =>
          selectedNodeIds.includes(node.id) &&
          node.type === "image" &&
          isCanvasImageUploadPending(node)
      ).length,
    [nodes, selectedNodeIds]
  );
  const selectedImageLocalEditItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "imageLocalEdit"
  );
  // 局部编辑属于主无限画布图片的固定能力，旧配置缺少该 key 时也保持可见。
  const selectedImageLocalEditEnabled = true;

  // Store actions
  const selectNode = useCanvasStore((state) => state.selectNode);
  const selectNodes = useCanvasStore((state) => state.selectNodes);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const addNode = useCanvasStore((state) => state.addNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const deleteEdge = useCanvasStore((state) => state.deleteEdge);
  const moveNode = useCanvasStore((state) => state.moveNode);
  const resizeNode = useCanvasStore((state) => state.resizeNode);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const requestImageNodeAction = useCanvasStore(
    (state) => state.requestImageNodeAction
  );
  const clearLastAddedNodeId = useCanvasStore((state) => state.clearLastAddedNodeId);
  const centerTimeoutRef = useRef<number | null>(null);
  const isMacPlatform = React.useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }, []);

  const hasBlockingDialogOpen = useCallback(() => {
    if (typeof document === "undefined") return false;
    return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
  }, []);

  const getSnapPreview = useCallback(
    (
      node: CanvasNode,
      target: Position,
      ignoreNodeIds: Set<string> = new Set(),
    ): { position: Position; guides: SnapGuideLines | null } => {
      if (node.type !== "image") {
        return { position: target, guides: null };
      }

      const candidates = nodes.filter(
        (item) =>
          item.type === "image" &&
          item.id !== node.id &&
          !ignoreNodeIds.has(item.id),
      );

      if (candidates.length === 0) {
        return { position: target, guides: null };
      }

      let bestMatchX: {
        offset: number;
        delta: number;
        guide?: SnapGuideLines["vertical"];
      } = {
        offset: 0,
        delta: Number.POSITIVE_INFINITY,
      };
      let bestMatchY: {
        offset: number;
        delta: number;
        guide?: SnapGuideLines["horizontal"];
      } = {
        offset: 0,
        delta: Number.POSITIVE_INFINITY,
      };

      const selfLeft = target.x;
      const selfCenterX = target.x + node.size.width / 2;
      const selfRight = target.x + node.size.width;
      const selfTop = target.y;
      const selfCenterY = target.y + node.size.height / 2;
      const selfBottom = target.y + node.size.height;

      const pickBestX = (delta: number, guide?: SnapGuideLines["vertical"]) => {
        const abs = Math.abs(delta);
        if (abs <= SNAP_THRESHOLD && abs < bestMatchX.delta) {
          bestMatchX = {
            offset: delta,
            delta: abs,
            guide,
          };
        }
      };

      const pickBestY = (delta: number, guide?: SnapGuideLines["horizontal"]) => {
        const abs = Math.abs(delta);
        if (abs <= SNAP_THRESHOLD && abs < bestMatchY.delta) {
          bestMatchY = {
            offset: delta,
            delta: abs,
            guide,
          };
        }
      };

      for (const candidate of candidates) {
        const targetLeft = candidate.position.x;
        const targetCenterX = candidate.position.x + candidate.size.width / 2;
        const targetRight = candidate.position.x + candidate.size.width;
        const targetTop = candidate.position.y;
        const targetCenterY = candidate.position.y + candidate.size.height / 2;
        const targetBottom = candidate.position.y + candidate.size.height;

        pickBestX(targetLeft - selfLeft, {
          x: targetLeft,
          top: Math.min(selfTop, targetTop),
          bottom: Math.max(selfBottom, targetBottom),
        });
        pickBestX(targetCenterX - selfCenterX, {
          x: targetCenterX,
          top: Math.min(selfTop, targetTop),
          bottom: Math.max(selfBottom, targetBottom),
        });
        pickBestX(targetRight - selfRight, {
          x: targetRight,
          top: Math.min(selfTop, targetTop),
          bottom: Math.max(selfBottom, targetBottom),
        });
        pickBestX(targetRight + SNAP_GAP - selfLeft);
        pickBestX(targetLeft - SNAP_GAP - selfRight);

        pickBestY(targetTop - selfTop, {
          y: targetTop,
          left: Math.min(selfLeft, targetLeft),
          right: Math.max(selfRight, targetRight),
        });
        pickBestY(targetCenterY - selfCenterY, {
          y: targetCenterY,
          left: Math.min(selfLeft, targetLeft),
          right: Math.max(selfRight, targetRight),
        });
        pickBestY(targetBottom - selfBottom, {
          y: targetBottom,
          left: Math.min(selfLeft, targetLeft),
          right: Math.max(selfRight, targetRight),
        });
        pickBestY(targetBottom + SNAP_GAP - selfTop);
        pickBestY(targetTop - SNAP_GAP - selfBottom);
      }

      const snappedPosition = {
        x: target.x + (Number.isFinite(bestMatchX.delta) ? bestMatchX.offset : 0),
        y: target.y + (Number.isFinite(bestMatchY.delta) ? bestMatchY.offset : 0),
      };

      return {
        position: snappedPosition,
        guides: {
          vertical: bestMatchX.guide,
          horizontal: bestMatchY.guide,
        },
      };
    },
    [nodes, SNAP_GAP],
  );

  const getSnappedCanvasPosition = useCallback(
    (
      node: CanvasNode,
      target: Position,
      ignoreNodeIds: Set<string> = new Set(),
    ): Position => {
      return getSnapPreview(node, target, ignoreNodeIds).position;
    },
    [getSnapPreview],
  );

  const toCanvasPosition = useCallback((clientX: number, clientY: number): Position => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const isPointOnNodeElement = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest("[data-canvas-node-id], [data-canvas-overlay]");
  }, []);

  const isEventFromCanvasContainer = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node) || !containerRef.current) return false;
    return containerRef.current.contains(target);
  }, []);

  const clearBrowserTextSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    selection.removeAllRanges();
  }, []);

  const handleBlankCanvasDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isWorkflowCanvas || !onBlankCanvasDoubleClick) return;
      if (hasBlockingDialogOpen()) return;
      if (isPointOnNodeElement(event.target)) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      event.preventDefault();
      event.stopPropagation();
      clearBrowserTextSelection();

      const viewportPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      onBlankCanvasDoubleClick({
        screenPosition: {
          x: event.clientX,
          y: event.clientY,
        },
        canvasPosition: {
          x: (viewportPosition.x - viewport.x) / viewport.zoom,
          y: (viewportPosition.y - viewport.y) / viewport.zoom,
        },
      });
    },
    [
      clearBrowserTextSelection,
      hasBlockingDialogOpen,
      isPointOnNodeElement,
      isWorkflowCanvas,
      onBlankCanvasDoubleClick,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ]
  );

  const fitAllImageNodesIntoViewport = useCallback(() => {
    const imageNodes = nodes.filter(
      (node) => node.type === "image" && Boolean((node.data as any)?.src)
    );
    if (imageNodes.length === 0) return;
    if (containerSize.width <= 0 || containerSize.height <= 0) return;

    const padding = 80;
    const minX = Math.min(...imageNodes.map((node) => node.position.x));
    const minY = Math.min(...imageNodes.map((node) => node.position.y));
    const maxX = Math.max(
      ...imageNodes.map((node) => node.position.x + node.size.width)
    );
    const maxY = Math.max(
      ...imageNodes.map((node) => node.position.y + node.size.height)
    );

    const contentWidth = Math.max(1, maxX - minX + padding * 2);
    const contentHeight = Math.max(1, maxY - minY + padding * 2);

    const visibleWidth = Math.max(240, containerSize.width - Math.max(0, occlusionRight));
    const fitZoomX = visibleWidth / contentWidth;
    const fitZoomY = containerSize.height / contentHeight;
    const targetZoom = Math.max(0.05, Math.min(4, Math.min(fitZoomX, fitZoomY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const visibleCenterX = visibleWidth / 2;
    const nextViewportX = visibleCenterX - centerX * targetZoom;
    const nextViewportY = containerSize.height / 2 - centerY * targetZoom;

    setViewport({
      x: nextViewportX,
      y: nextViewportY,
      zoom: targetZoom,
    });
  }, [containerSize.height, containerSize.width, nodes, occlusionRight, setViewport]);

  const getNodeInputAnchor = useCallback(
    (node: CanvasNode): Position => ({
      x: node.position.x,
      y: node.position.y + node.size.height / 2,
    }),
    []
  );

  const getNodeOutputAnchor = useCallback(
    (node: CanvasNode): Position => ({
      x: node.position.x + node.size.width,
      y: node.position.y + node.size.height / 2,
    }),
    []
  );

  const toScreenPosition = useCallback(
    (point: Position): Position => ({
      x: point.x * viewport.zoom + viewport.x,
      y: point.y * viewport.zoom + viewport.y,
    }),
    [viewport.x, viewport.y, viewport.zoom]
  );

  const buildWorkflowPath = useCallback((source: Position, target: Position) => {
    const deltaX = Math.abs(target.x - source.x);
    const controlOffset = Math.max(48, Math.min(180, deltaX * 0.5));
    return `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
  }, []);

  const { renderedEdges, renderedMergeTrunks } = useMemo(() => {
    type RenderedWorkflowEdgeBase = {
      edge: CanvasEdge;
      sourcePoint: Position;
      targetPoint: Position;
    };

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const baseEdges = edges
      .map((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        if (!sourceNode || !targetNode) return null;
        return {
          edge,
          sourcePoint: toScreenPosition(getNodeOutputAnchor(sourceNode)),
          targetPoint: toScreenPosition(getNodeInputAnchor(targetNode)),
        };
      })
      .filter((item): item is RenderedWorkflowEdgeBase => Boolean(item));

    const incomingEdges = new Map<string, RenderedWorkflowEdgeBase[]>();
    baseEdges.forEach((item) => {
      const group = incomingEdges.get(item.edge.target) ?? [];
      group.push(item);
      incomingEdges.set(item.edge.target, group);
    });

    const mergePointByTarget = new Map<string, Position>();
    const renderedMergeTrunks: {
      targetNodeId: string;
      targetPoint: Position;
      mergePoint: Position;
      path: string;
      edgeIds: string[];
    }[] = [];

    incomingEdges.forEach((items, targetNodeId) => {
      if (items.length <= 1) return;

      const targetPoint = items[0].targetPoint;
      const averageSourceX =
        items.reduce((total, item) => total + item.sourcePoint.x, 0) / items.length;
      const averageDeltaX =
        items.reduce((total, item) => total + Math.abs(targetPoint.x - item.sourcePoint.x), 0) /
        items.length;
      const mergeDistance = Math.max(56, Math.min(180, averageDeltaX * 0.32));
      const direction = averageSourceX <= targetPoint.x ? -1 : 1;
      const mergePoint = {
        x: targetPoint.x + direction * mergeDistance,
        y: targetPoint.y,
      };

      mergePointByTarget.set(targetNodeId, mergePoint);
      renderedMergeTrunks.push({
        targetNodeId,
        targetPoint,
        mergePoint,
        path: buildWorkflowPath(mergePoint, targetPoint),
        edgeIds: items.map((item) => item.edge.id),
      });
    });

    const renderedEdges = baseEdges.map((item) => {
      const mergePoint = mergePointByTarget.get(item.edge.target);
      const visualTargetPoint = mergePoint ?? item.targetPoint;
      return {
        ...item,
        mergePoint,
        path: buildWorkflowPath(item.sourcePoint, visualTargetPoint),
        midPoint: {
          x: (item.sourcePoint.x + visualTargetPoint.x) / 2,
          y: (item.sourcePoint.y + visualTargetPoint.y) / 2,
        },
      };
    });

    return { renderedEdges, renderedMergeTrunks };
  }, [buildWorkflowPath, edges, getNodeInputAnchor, getNodeOutputAnchor, nodes, toScreenPosition]);

  // 处理画布点击（取消选择）
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (hasBlockingDialogOpen()) return;
    if (!isEventFromCanvasContainer(e.target)) return;
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false;
      return;
    }
    setSelectedEdgeId(null);
    if (!isPointOnNodeElement(e.target) && !isMarqueeSelecting) {
      const now = Date.now();
      const isDoubleBlankClick = now - lastBlankCanvasClickAtRef.current <= 320;
      lastBlankCanvasClickAtRef.current = now;
      clearSelection();
      if (isDoubleBlankClick) {
        fitAllImageNodesIntoViewport();
      }
    }
  }, [clearSelection, fitAllImageNodesIntoViewport, hasBlockingDialogOpen, isEventFromCanvasContainer, isMarqueeSelecting, isPointOnNodeElement]);

  // 处理画布平移开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (hasBlockingDialogOpen()) return;
    if (!isEventFromCanvasContainer(e.target)) return;
    if (connectionDraft) {
      return;
    }
    const shouldPanBlankWorkflowCanvas =
      isWorkflowCanvas &&
      tool === "select" &&
      e.button === 0 &&
      !e.altKey &&
      !e.shiftKey &&
      !isPointOnNodeElement(e.target);

    if (
      tool === 'pan' ||
      e.button === 1 ||
      (e.button === 0 && e.altKey) ||
      shouldPanBlankWorkflowCanvas
    ) {
      cancelPanPreview();
      const startViewport = viewportRef.current;
      setIsPanning(true);
      setPanStart({ x: e.clientX - startViewport.x, y: e.clientY - startViewport.y });
      panPreviewRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewport,
        currentViewport: startViewport,
        offsetX: 0,
        offsetY: 0,
        rafId: null,
      };
      e.preventDefault();
      return;
    }

    if (tool === "select" && e.button === 0 && !isPointOnNodeElement(e.target)) {
      e.preventDefault();
      clearBrowserTextSelection();
      const start = toCanvasPosition(e.clientX, e.clientY);
      setIsMarqueeSelecting(true);
      setMarqueeStart(start);
      setMarqueeEnd(start);
    }
  }, [cancelPanPreview, clearBrowserTextSelection, connectionDraft, hasBlockingDialogOpen, isEventFromCanvasContainer, isPointOnNodeElement, isWorkflowCanvas, toCanvasPosition, tool]);

  // 处理画布平移
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (hasBlockingDialogOpen()) {
      if (isPanning) {
        setIsPanning(false);
        cancelPanPreview();
      }
      return;
    }
    if (!isEventFromCanvasContainer(e.target)) return;
    dragPointerRef.current = toCanvasPosition(e.clientX, e.clientY);
    if (connectionDraft) {
      e.preventDefault();
      setConnectionDraft((current) =>
        current
          ? {
              ...current,
              current: {
                x: (e.clientX - viewport.x - (containerRef.current?.getBoundingClientRect().left || 0)) /
                  viewport.zoom,
                y: (e.clientY - viewport.y - (containerRef.current?.getBoundingClientRect().top || 0)) /
                  viewport.zoom,
              },
            }
          : null
      );
      return;
    }
    if (isPanning) {
      e.preventDefault();
      const session = panPreviewRef.current;
      const currentViewport = viewportRef.current;
      const nextViewport = session
        ? {
            ...session.startViewport,
            x: session.startViewport.x + e.clientX - session.startClientX,
            y: session.startViewport.y + e.clientY - session.startClientY,
          }
        : {
            ...currentViewport,
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
          };
      if (session) {
        session.currentViewport = nextViewport;
        viewportRef.current = nextViewport;
        schedulePanPreviewTransform(
          nextViewport.x - session.startViewport.x,
          nextViewport.y - session.startViewport.y,
        );
      } else {
        scheduleViewport(nextViewport);
      }
      return;
    }

    if (isMarqueeSelecting) {
      e.preventDefault();
      setMarqueeEnd(toCanvasPosition(e.clientX, e.clientY));
    }
  }, [cancelPanPreview, connectionDraft, hasBlockingDialogOpen, isEventFromCanvasContainer, isMarqueeSelecting, isPanning, panStart.x, panStart.y, schedulePanPreviewTransform, scheduleViewport, toCanvasPosition, viewport.x, viewport.y, viewport.zoom]);

  // 处理画布平移结束
  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (e && !isEventFromCanvasContainer(e.target) && !isPanning) return;
    if (connectionDraft) {
      if (e) {
        const releaseTarget = document.elementFromPoint(e.clientX, e.clientY);
        const handleEl =
          releaseTarget instanceof HTMLElement
            ? releaseTarget.closest("[data-canvas-input-handle]")
            : null;
        const targetNodeId =
          handleEl instanceof HTMLElement ? handleEl.dataset.nodeId || null : null;
        if (targetNodeId && targetNodeId !== connectionDraft.sourceId) {
          addEdge({
            source: connectionDraft.sourceId,
            target: targetNodeId,
            type: "default",
          });
          setSelectedEdgeId(null);
        }
      }
      setConnectionDraft(null);
      return;
    }
    const finalPanViewport = isPanning ? finishPanPreview() : null;
    if (finalPanViewport) {
      setViewport(finalPanViewport);
      resetContentLayerTransform();
    }
    setIsPanning(false);
    setSnapGuides(null);
    clearBrowserTextSelection();

    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const left = Math.min(marqueeStart.x, marqueeEnd.x);
      const top = Math.min(marqueeStart.y, marqueeEnd.y);
      const right = Math.max(marqueeStart.x, marqueeEnd.x);
      const bottom = Math.max(marqueeStart.y, marqueeEnd.y);

      const minSize = 4;
      if (right - left < minSize && bottom - top < minSize) {
        clearSelection();
      } else {
        const selectedIds = nodes
          .filter((node) => {
            const x = node.position.x * viewport.zoom + viewport.x;
            const y = node.position.y * viewport.zoom + viewport.y;
            const width = node.size.width * viewport.zoom;
            const height = node.size.height * viewport.zoom;
            const nodeRight = x + width;
            const nodeBottom = y + height;
            return !(nodeRight < left || x > right || nodeBottom < top || y > bottom);
          })
          .map((node) => node.id);
        if (selectedIds.length > 0) {
          selectNodes(selectedIds);
          suppressCanvasClickRef.current = true;
        } else {
          clearSelection();
        }
      }
    }

    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeEnd(null);
  }, [addEdge, clearBrowserTextSelection, clearSelection, connectionDraft, finishPanPreview, isEventFromCanvasContainer, isMarqueeSelecting, isPanning, marqueeEnd, marqueeStart, nodes, resetContentLayerTransform, selectNodes, setViewport, viewport.x, viewport.y, viewport.zoom]);

  // 新增图片后自动居中展示
  const centerNodeInView = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const width = containerSize.width || 0;
    const height = containerSize.height || 0;
    if (width === 0 || height === 0) return;
    const zoom = viewport.zoom;
    const centerX = node.position.x + node.size.width / 2;
    const centerY = node.position.y + node.size.height / 2;
    const newX = width / 2 - centerX * zoom;
    const newY = height / 2 - centerY * zoom;
    setViewport({ x: newX, y: newY });
  }, [containerSize.width, containerSize.height, nodes, setViewport, viewport.zoom]);

  React.useEffect(() => {
    if (!lastAddedNodeId) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;
    if (centerTimeoutRef.current) {
      window.clearTimeout(centerTimeoutRef.current);
    }
    centerTimeoutRef.current = window.setTimeout(() => {
      centerNodeInView(lastAddedNodeId);
      clearLastAddedNodeId();
    }, 80);
    return () => {
      if (centerTimeoutRef.current) {
        window.clearTimeout(centerTimeoutRef.current);
        centerTimeoutRef.current = null;
      }
    };
  }, [lastAddedNodeId, centerNodeInView, clearLastAddedNodeId, containerSize.width, containerSize.height]);

  // 处理滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (hasBlockingDialogOpen()) return;
    if (!isEventFromCanvasContainer(e.target)) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();

    // mac: 双指滚动默认平移，Cmd/Ctrl+滚轮才缩放（保留触控板体验）
    // windows/linux: 鼠标滚轮默认缩放画布，不触发整页缩放
    const shouldZoom = isMacPlatform ? (e.ctrlKey || e.metaKey) : !e.shiftKey;
    const currentViewport = viewportRef.current;
    if (!shouldZoom) {
      scheduleViewport({
        ...currentViewport,
        x: currentViewport.x - e.deltaX,
        y: currentViewport.y - e.deltaY,
      });
      return;
    }

    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.1, Math.min(4, currentViewport.zoom * zoomFactor));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleChange = newZoom / currentViewport.zoom;
    const newX = mouseX - (mouseX - currentViewport.x) * scaleChange;
    const newY = mouseY - (mouseY - currentViewport.y) * scaleChange;
    scheduleViewport({ ...currentViewport, x: newX, y: newY, zoom: newZoom });
  }, [hasBlockingDialogOpen, isEventFromCanvasContainer, isMacPlatform, scheduleViewport]);

  const getImageDimensionsFromFile = useCallback((file: File): Promise<{
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
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
        URL.revokeObjectURL(url);
        resolve({ width, height, originalWidth, originalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 300, height: 300, originalWidth: 0, originalHeight: 0 });
      };
      img.src = url;
    });
  }, []);

  const processDroppedFiles = useCallback(async (files: File[], dropClientX: number, dropClientY: number) => {
    if (files.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const baseX = rect ? (dropClientX - rect.left - viewport.x) / viewport.zoom : 100;
    const baseY = rect ? (dropClientY - rect.top - viewport.y) / viewport.zoom : 100;
    const spacing = 20;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!isImageFile(file)) continue;
      if (file.size > 50 * 1024 * 1024) {
        toast.error("图片大小不能超过 50MB");
        continue;
      }

      const dimensions = await getImageDimensionsFromFile(file);
      const cleanName = file.name.replace(/\.[^.]+$/, "");
      const previewUrl = URL.createObjectURL(file);
      const placeholderId = addNode({
        type: "image",
        position: { x: baseX + index * spacing, y: baseY + index * spacing },
        size: { width: dimensions.width, height: dimensions.height },
        data: {
          src: previewUrl,
          status: "generating",
          prompt: cleanName || "拖拽上传",
          title: cleanName || "拖拽上传",
          metadata: {
            originalWidth: dimensions.originalWidth,
            originalHeight: dimensions.originalHeight,
            [LOCAL_UPLOAD_PREVIEW_METADATA_KEY]: previewUrl,
            [LOCAL_UPLOAD_PENDING_METADATA_KEY]: true,
          },
        },
        connections: [],
      });

      void imageGenerationService.uploadImage(file).then((result) => {
        if (result.success && result.data?.url) {
          updateNode(placeholderId, {
            data: {
              src: result.data.url,
              assetId: result.data.assetId,
              status: "completed",
              prompt: cleanName || "拖拽上传",
              title: cleanName || "拖拽上传",
              metadata: {
                originalWidth: dimensions.originalWidth,
                originalHeight: dimensions.originalHeight,
              },
            },
          });
          URL.revokeObjectURL(previewUrl);
          toast.success("图片已添加到画布");
          return;
        }

        if (result.providerApiKeyPrompted) {
          deleteNode(placeholderId);
          URL.revokeObjectURL(previewUrl);
          return;
        }

        updateNode(placeholderId, {
          data: {
            src: previewUrl,
            status: "failed",
            prompt: cleanName || "拖拽上传",
            title: cleanName || "拖拽上传",
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
              uploadError: result.error || "图片上传失败",
              [LOCAL_UPLOAD_PREVIEW_METADATA_KEY]: previewUrl,
              [LOCAL_UPLOAD_PENDING_METADATA_KEY]: false,
            },
          },
        });
        toast.error(result.error || "图片上传失败");
      }).catch(() => {
        updateNode(placeholderId, {
          data: {
            src: previewUrl,
            status: "failed",
            prompt: cleanName || "拖拽上传",
            title: cleanName || "拖拽上传",
            metadata: {
              originalWidth: dimensions.originalWidth,
              originalHeight: dimensions.originalHeight,
              uploadError: "图片上传失败",
              [LOCAL_UPLOAD_PREVIEW_METADATA_KEY]: previewUrl,
              [LOCAL_UPLOAD_PENDING_METADATA_KEY]: false,
            },
          },
        });
        toast.error("图片上传失败");
      });
    }
  }, [addNode, deleteNode, getImageDimensionsFromFile, updateNode, viewport.x, viewport.y, viewport.zoom]);

  React.useEffect(() => {
    const handleWindowDrop = async (e: DragEvent) => {
      if (!isFileDrag(e.dataTransfer)) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX || dragPointerRef.current.x + rect.left;
      const y = e.clientY || dragPointerRef.current.y + rect.top;
      const inContainer = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      if (!inContainer) return;

      const files = extractImageFilesFromDataTransfer(e.dataTransfer);
      if (files.length === 0) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsFileDragActive(false);
      await processDroppedFiles(files, x, y);
    };

    window.addEventListener("drop", handleWindowDrop);
    return () => window.removeEventListener("drop", handleWindowDrop);
  }, [isFileDrag, processDroppedFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsFileDragActive(true);
    dragPointerRef.current = toCanvasPosition(e.clientX, e.clientY);
  }, [isFileDrag, toCanvasPosition]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsFileDragActive(false);
    }
  }, [isFileDrag]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    dragPointerRef.current = toCanvasPosition(e.clientX, e.clientY);
  }, [isFileDrag, toCanvasPosition]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsFileDragActive(false);

    const files = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      await processDroppedFiles(files, e.clientX, e.clientY);
    }
  }, [isFileDrag, processDroppedFiles]);

  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (hasBlockingDialogOpen() || isEditablePasteTarget(e.target)) return;

      const container = containerRef.current;
      if (!container) return;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        !container.contains(activeElement)
      ) {
        return;
      }

      const files = extractImageFilesFromDataTransfer(e.clipboardData);
      if (files.length === 0) return;

      e.preventDefault();
      const rect = container.getBoundingClientRect();
      await processDroppedFiles(
        files,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [hasBlockingDialogOpen, processDroppedFiles]);

  const handleDownloadSelectedImages = useCallback(async () => {
    if (selectedImageNodes.length === 0) {
      toast.error("请先框选要下载的图片");
      return;
    }
    if (isDownloadSubmitting) {
      return;
    }
    if (selectedImageNodes.length > 50) {
      toast.warning("当前选择图片较多，正在打包，请稍候");
    }

    const now = new Date();
    const folderName = `canvas-images-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const files = selectedImageNodes
      .map((node, index) => {
        const nodeData = node.data as any;
        const rawImageUrl = String(nodeData?.src || "").trim();
        if (!rawImageUrl) return null;
        let imageUrl = inferOriginalImageUrl(rawImageUrl) || rawImageUrl;
        if (browserOrigin && rawImageUrl.startsWith("/")) {
          imageUrl = `${browserOrigin}${rawImageUrl}`;
        } else if (browserOrigin && rawImageUrl.startsWith("//")) {
          imageUrl = `${window.location.protocol}${rawImageUrl}`;
        }
        const name =
          String(nodeData?.title || "").trim() ||
          String(nodeData?.prompt || "").trim() ||
          `canvas-image-${index + 1}`;
        return { url: imageUrl, name };
      })
      .filter((item): item is { url: string; name: string } => Boolean(item));

    if (files.length === 0) {
      toast.error("当前没有可下载的图片");
      return;
    }

    setIsDownloadSubmitting(true);
    try {
      setZipDownloadDialog({
        zipName: folderName,
        status: "starting",
        taskId: "",
        totalCount: files.length,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        progress: 4,
        stage: "正在提交打包任务",
        error: "",
        downloadUrl: "",
        expiresAt: 0,
      });

      const response = await apiFetch("/api/canvas/download-zip-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          folderName,
          files,
          convertToPng: false,
          timeoutMs: 15_000,
          retryCount: 1,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; task?: unknown; error?: string }
        | null;
      const task = normalizeCanvasZipTaskSnapshot(payload?.task);
      if (!response.ok || payload?.success !== true || !task) {
        throw new Error(payload?.error || "创建打包任务失败");
      }

      setZipDownloadDialog((current) => ({
        zipName: current?.zipName || folderName,
        status: task.status,
        taskId: task.id,
        totalCount: task.totalCount,
        processedCount: task.processedCount,
        successCount: task.successCount,
        failedCount: task.failedCount,
        progress: task.progress,
        stage: task.stage || "正在服务端打包",
        error: task.error,
        downloadUrl: task.downloadUrl,
        expiresAt: task.expiresAt,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "下载失败，请稍后重试";
      setZipDownloadDialog((current) => ({
        zipName: current?.zipName || folderName,
        status: "failed",
        taskId: current?.taskId || "",
        totalCount: current?.totalCount || files.length,
        processedCount: current?.processedCount || 0,
        successCount: current?.successCount || 0,
        failedCount: current?.failedCount || 0,
        progress: current?.progress || 0,
        stage: "打包任务创建失败",
        error: message,
        downloadUrl: "",
        expiresAt: 0,
      }));
      setIsDownloadSubmitting(false);
      toast.error(message);
    }
  }, [isDownloadSubmitting, selectedImageNodes]);

  React.useEffect(() => {
    const taskId = zipDownloadDialog?.taskId;
    const status = zipDownloadDialog?.status;
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
        const task = normalizeCanvasZipTaskSnapshot(payload?.task);
        if (!response.ok || payload?.success !== true || !task) {
          throw new Error(payload?.error || "查询打包进度失败");
        }
        if (cancelled) return;

        setZipDownloadDialog((current) => {
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

        if (task.status === "completed" || task.status === "failed") {
          setIsDownloadSubmitting(false);
          if (task.status === "failed") {
            toast.error(task.error || "打包下载失败");
          }
          return;
        }

        timeoutId = window.setTimeout(pollTask, 800);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "查询打包进度失败";
        setIsDownloadSubmitting(false);
        setZipDownloadDialog((current) =>
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

    timeoutId = window.setTimeout(pollTask, 400);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [zipDownloadDialog?.status, zipDownloadDialog?.taskId]);

  React.useEffect(() => {
    if (
      !zipDownloadDialog ||
      zipDownloadDialog.status !== "completed" ||
      !zipDownloadDialog.downloadUrl ||
      !zipDownloadDialog.taskId
    ) {
      return;
    }
    if (downloadedZipTaskIdsRef.current.has(zipDownloadDialog.taskId)) {
      return;
    }
    downloadedZipTaskIdsRef.current.add(zipDownloadDialog.taskId);
    setIsDownloadSubmitting(false);
    triggerCanvasZipDownload(zipDownloadDialog.downloadUrl, zipDownloadDialog.zipName);
    toast.success("打包完成，已开始下载");
  }, [zipDownloadDialog]);

  const handleCreateImageFolderFromSelection = useCallback(() => {
    if (selectedImageNodes.length === 0) {
      toast.error("请先选择要收纳的图片");
      return;
    }

    const sortedImages = sortNodesForFolderGrid(selectedImageNodes);
    const frame = getInitialImageFolderFrame(sortedImages);
    const folderId = addNode({
      type: "image-folder",
      position: frame.position,
      size: frame.size,
      data: {
        title: "图片收纳板",
        status: "completed",
        imageNodeIds: sortedImages.map((node) => node.id),
        layout: {
          columns: frame.columns,
          gap: IMAGE_FOLDER_GAP,
          padding: IMAGE_FOLDER_PADDING,
          headerHeight: IMAGE_FOLDER_HEADER_HEIGHT,
        },
        metadata: {
          createdFromSelection: true,
        },
      },
      connections: [],
    });

    getImageFolderPlacements(sortedImages, frame.position, frame.size).forEach(
      ({ node, index, position, size }) => {
        const data = node.data as Record<string, any>;
        updateNode(node.id, {
          position,
          size,
          data: {
            ...data,
            metadata: {
              ...(data.metadata || {}),
              imageFolderId: folderId,
              imageFolderIndex: index,
            },
          } as CanvasNode["data"],
        });
      }
    );

    selectNode(folderId);
    pushHistory();
    toast.success(`已收纳 ${sortedImages.length} 张图片`);
  }, [addNode, pushHistory, selectNode, selectedImageNodes, updateNode]);

  React.useEffect(() => {
    if (!selectedEdgeId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteEdge(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteEdge, selectedEdgeId]);

  // 渲染节点
  const renderNode = (node: CanvasNode) => {
    const isSelected = selectedNodeIds.includes(node.id);
    const showWorkflowHandles = isWorkflowCanvas && (tool === "draw" || isSelected);
    const isImageNode = node.type === "image";
    const isImageFolderNode = node.type === "image-folder";
    const enableImageResizeHandles =
      isSelected && tool === "select" && isImageNode
        ? {
            top: false,
            right: false,
            bottom: false,
            left: false,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }
        : isSelected && tool === "select";

    const imageHandleSize = IMAGE_HANDLE_SIZE * viewport.zoom;
    const imageHandleOffset = imageHandleSize / 2;
    const imageSelectionStrokeWidth = SELECTION_STROKE_WIDTH * viewport.zoom;
    const imageResizeHandleStyles = isImageNode
      ? {
          topRight: {
            width: imageHandleSize,
            height: imageHandleSize,
            right: -imageHandleOffset,
            top: -imageHandleOffset,
            borderRadius: 0,
            border: `${imageSelectionStrokeWidth}px solid ${SELECTION_COLOR}`,
            backgroundColor: "#ffffff",
          },
          bottomRight: {
            width: imageHandleSize,
            height: imageHandleSize,
            right: -imageHandleOffset,
            bottom: -imageHandleOffset,
            borderRadius: 0,
            border: `${imageSelectionStrokeWidth}px solid ${SELECTION_COLOR}`,
            backgroundColor: "#ffffff",
          },
          bottomLeft: {
            width: imageHandleSize,
            height: imageHandleSize,
            left: -imageHandleOffset,
            bottom: -imageHandleOffset,
            borderRadius: 0,
            border: `${imageSelectionStrokeWidth}px solid ${SELECTION_COLOR}`,
            backgroundColor: "#ffffff",
          },
          topLeft: {
            width: imageHandleSize,
            height: imageHandleSize,
            left: -imageHandleOffset,
            top: -imageHandleOffset,
            borderRadius: 0,
            border: `${imageSelectionStrokeWidth}px solid ${SELECTION_COLOR}`,
            backgroundColor: "#ffffff",
          },
        }
      : undefined;

    return (
      <Rnd
        key={node.id}
        position={{
          x: node.position.x * viewport.zoom + viewport.x,
          y: node.position.y * viewport.zoom + viewport.y,
        }}
        size={{
          width: node.size.width * viewport.zoom,
          height: node.size.height * viewport.zoom,
        }}
        scale={1}
        onDragStart={() => {
          setSnapGuides(null);
          if (isImageFolderNode) {
            const childIds = new Set(getImageFolderImageNodeIds(node));
            const originPositions: Record<string, Position> = {};
            nodes.forEach((item) => {
              if (item.id === node.id || childIds.has(item.id)) {
                originPositions[item.id] = { ...item.position };
              }
            });
            groupDragRef.current = {
              nodeId: node.id,
              startX: node.position.x * viewport.zoom + viewport.x,
              startY: node.position.y * viewport.zoom + viewport.y,
              originPositions,
            };
            if (!isSelected) {
              selectNode(node.id);
            }
            return;
          }

          if (!isSelected) {
            selectNode(node.id);
            groupDragRef.current = null;
            return;
          }

          if (selectedNodeIds.length > 1) {
            const originPositions: Record<string, Position> = {};
            nodes.forEach((item) => {
              if (selectedNodeIds.includes(item.id)) {
                originPositions[item.id] = { ...item.position };
              }
            });
            groupDragRef.current = {
              nodeId: node.id,
              startX: node.position.x * viewport.zoom + viewport.x,
              startY: node.position.y * viewport.zoom + viewport.y,
              originPositions,
            };
          } else {
            groupDragRef.current = null;
          }
        }}
        onDrag={(e, d) => {
          const group = groupDragRef.current;
          const shouldMoveLinkedGroup =
            group &&
            group.nodeId === node.id &&
            (selectedNodeIds.length > 1 || isImageFolderNode);
          if (shouldMoveLinkedGroup) {
            const deltaCanvasX = (d.x - group.startX) / viewport.zoom;
            const deltaCanvasY = (d.y - group.startY) / viewport.zoom;
            const origin = group.originPositions[node.id];
            const rawAnchor = origin
              ? {
                  x: origin.x + deltaCanvasX,
                  y: origin.y + deltaCanvasY,
                }
              : {
                  x: node.position.x + deltaCanvasX,
                  y: node.position.y + deltaCanvasY,
                };
            const preview = getSnapPreview(
              node,
              rawAnchor,
              new Set(selectedNodeIds),
            );
            setSnapGuides(preview.guides);
            Object.keys(group.originPositions).forEach((id) => {
              const itemOrigin = group.originPositions[id];
              if (!itemOrigin) return;
              moveNode(id, {
                x: itemOrigin.x + deltaCanvasX,
                y: itemOrigin.y + deltaCanvasY,
              });
            });
            return;
          }

          if (selectedNodeIds.length > 1) return;

          const rawPosition = {
            x: (d.x - viewport.x) / viewport.zoom,
            y: (d.y - viewport.y) / viewport.zoom,
          };
          const preview = getSnapPreview(node, rawPosition);
          setSnapGuides(preview.guides);
        }}
        onDragStop={(e, d) => {
          setSnapGuides(null);
          const group = groupDragRef.current;
          const shouldStopLinkedGroup =
            group &&
            group.nodeId === node.id &&
            (selectedNodeIds.length > 1 || isImageFolderNode);
          if (shouldStopLinkedGroup) {
            const deltaCanvasX = (d.x - group.startX) / viewport.zoom;
            const deltaCanvasY = (d.y - group.startY) / viewport.zoom;
            const origin = group.originPositions[node.id];
            const rawAnchor = origin
              ? {
                  x: origin.x + deltaCanvasX,
                  y: origin.y + deltaCanvasY,
                }
              : {
                  x: node.position.x + deltaCanvasX,
                  y: node.position.y + deltaCanvasY,
                };
            const snappedAnchor = getSnappedCanvasPosition(
              node,
              rawAnchor,
              new Set(selectedNodeIds),
            );
            const offsetX = origin ? snappedAnchor.x - origin.x : deltaCanvasX;
            const offsetY = origin ? snappedAnchor.y - origin.y : deltaCanvasY;
            Object.keys(group.originPositions).forEach((id) => {
              const itemOrigin = group.originPositions[id];
              if (!itemOrigin) return;
              moveNode(id, {
                x: itemOrigin.x + offsetX,
                y: itemOrigin.y + offsetY,
              });
            });
            groupDragRef.current = null;
            pushHistory();
            return;
          }

          const newX = (d.x - viewport.x) / viewport.zoom;
          const newY = (d.y - viewport.y) / viewport.zoom;
          const snapped = getSnappedCanvasPosition(node, { x: newX, y: newY });
          moveNode(node.id, snapped);
          groupDragRef.current = null;
          pushHistory();
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          const newWidth = parseInt(ref.style.width) / viewport.zoom;
          const newHeight = parseInt(ref.style.height) / viewport.zoom;
          const newX = (position.x - viewport.x) / viewport.zoom;
          const newY = (position.y - viewport.y) / viewport.zoom;

          if (isImageFolderNode) {
            const nextPosition = { x: newX, y: newY };
            const nextSize = { width: newWidth, height: newHeight };
            const childIds = new Set(getImageFolderImageNodeIds(node));
            const childNodes = nodes.filter(
              (item) => childIds.has(item.id) && item.type === "image"
            );

            resizeNode(node.id, nextSize);
            moveNode(node.id, nextPosition);
            getImageFolderPlacements(childNodes, nextPosition, nextSize).forEach(
              ({ node: childNode, index, position: childPosition, size }) => {
                const data = childNode.data as Record<string, any>;
                updateNode(childNode.id, {
                  position: childPosition,
                  size,
                  data: {
                    ...data,
                    metadata: {
                      ...(data.metadata || {}),
                      imageFolderId: node.id,
                      imageFolderIndex: index,
                    },
                  } as CanvasNode["data"],
                });
              }
            );
            pushHistory();
            return;
          }

          resizeNode(node.id, { width: newWidth, height: newHeight });
          moveNode(node.id, { x: newX, y: newY });
          pushHistory();
        }}
        bounds="parent"
        enableResizing={enableImageResizeHandles}
        resizeHandleStyles={imageResizeHandleStyles}
        disableDragging={tool !== 'select'}
        cancel={CANVAS_DRAG_CANCEL_SELECTOR}
        className={cn(
          "absolute",
          tool === "select" && "cursor-pointer"
        )}
        data-canvas-node-id={node.id}
        style={{
          overflow: "visible",
          zIndex: isImageFolderNode ? 0 : isSelected ? 6 : 2,
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setSelectedEdgeId(null);
          selectNode(node.id, e.shiftKey);
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="group relative w-full h-full"
          style={{ overflow: 'visible' }} // 允许工具栏显示在节点外部
        >
          {showWorkflowHandles ? (
            <>
              <button
                type="button"
                data-canvas-no-drag="true"
                data-canvas-input-handle="true"
                data-node-id={node.id}
                className={cn(
                  "absolute top-1/2 z-20 rounded-full border border-[#d7dff1] bg-white text-brand-selection shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_12px_22px_rgba(22,24,29,0.1)] transition-all",
                  tool === "draw"
                    ? "scale-100 opacity-100 ring-4 ring-brand-selection/20"
                    : "scale-95 opacity-90"
                )}
                style={{
                  left: -(WORKFLOW_HANDLE_SIZE / 2),
                  marginTop: -(WORKFLOW_HANDLE_SIZE / 2),
                  width: WORKFLOW_HANDLE_SIZE,
                  height: WORKFLOW_HANDLE_SIZE,
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                aria-label="输入连接点"
              />
              <button
                type="button"
                data-canvas-no-drag="true"
                className={cn(
                  "absolute top-1/2 z-20 rounded-full border border-[#d7dff1] bg-white text-brand-selection shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_12px_22px_rgba(22,24,29,0.1)] transition-all",
                  tool === "draw"
                    ? "scale-100 opacity-100 ring-4 ring-brand-selection/20"
                    : "scale-95 opacity-90"
                )}
                style={{
                  right: -(WORKFLOW_HANDLE_SIZE / 2),
                  marginTop: -(WORKFLOW_HANDLE_SIZE / 2),
                  width: WORKFLOW_HANDLE_SIZE,
                  height: WORKFLOW_HANDLE_SIZE,
                }}
                onMouseDown={(event) => {
                  if (!isWorkflowCanvas) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const outputAnchor = getNodeOutputAnchor(node);
                  setConnectionDraft({
                    sourceId: node.id,
                    current: outputAnchor,
                  });
                }}
                aria-label="输出连接点"
              />
            </>
          ) : null}
          {isWorkflowCanvas ? <VideoCanvasNodeMarkers node={node} /> : null}
          {isImageFolderNode && (
            <ImageFolderNode
              isSelected={isSelected}
              node={node}
            />
          )}
          {node.type === 'image' && (
            <ImageNode
              canvasToolbarConfig={canvasToolbarConfig}
              angleEditEnabled={angleEditEnabled}
              isLayerSplitEnabled={layerSplitEnabled}
              isSelected={isSelected}
              node={node}
            />
          )}
          {node.type === 'text' && (
            <TextNode
              canvasToolbarConfig={canvasToolbarConfig}
              node={node}
              isSelected={isSelected}
            />
          )}
          {node.type === 'ui-screen' && (
            <UiScreenNode
              canvasToolbarConfig={canvasToolbarConfig}
              node={node}
              isSelected={isSelected}
            />
          )}
          {node.type === 'video' && (
            <VideoNode
              canvasToolbarConfig={canvasToolbarConfig}
              node={node}
              isSelected={isSelected}
            />
          )}
          {node.type === 'workflow' && (
            <WorkflowNode
              canvasToolbarConfig={canvasToolbarConfig}
              node={node}
              isSelected={isSelected}
            />
          )}
          {node.type === 'message' && (
            <div className="w-full h-full bg-card rounded-lg p-4 shadow-sm border">
              <span className="text-sm">{(node.data as any).content}</span>
            </div>
          )}
        </motion.div>
      </Rnd>
    );
  };

  const zipDownloadProgress = Math.max(
    0,
    Math.min(100, Math.round(zipDownloadDialog?.progress || 0))
  );
  const isZipDownloadRunning =
    zipDownloadDialog?.status === "starting" ||
    zipDownloadDialog?.status === "pending" ||
    zipDownloadDialog?.status === "running";
  const isZipDownloadCompleted = zipDownloadDialog?.status === "completed";
  const isZipDownloadFailed = zipDownloadDialog?.status === "failed";
  const selectedImageActionButtonClassName = cn(
    "!h-[18px] !min-h-[18px] !gap-1 border border-border/60 !px-1.5 !py-0 !text-[9px] !leading-none shadow-[0_2px_7px_rgba(15,20,25,0.08)] [&_svg]:!size-2.5",
    isWorkflowCanvas
      ? "rounded-full border-[#dbe2ee] bg-white text-[#3b4860] shadow-[0_0_0_1px_rgba(219,226,238,0.22),0_8px_18px_rgba(22,24,29,0.05)] hover:bg-[#f7f9ff]"
      : "rounded-[6px] border-black/[0.06] bg-white text-[#0f1419] hover:bg-[#f7f8f9] dark:border-white/[0.10] dark:bg-[#121416] dark:text-white dark:hover:bg-white/[0.08]"
  );
  const selectedImageActionButtonStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: isWorkflowCanvas ? 9999 : 6,
      fontSize: 9,
      height: 18,
      lineHeight: 1,
      minHeight: 18,
      padding: "0 6px",
    }),
    [isWorkflowCanvas]
  );
  const selectedImageActionLabelStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: 9,
      lineHeight: 1,
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      data-canvas-workspace-root="true"
      className={cn(
        "relative w-full h-full overflow-hidden overscroll-none touch-none",
        isWorkflowCanvas
          ? "bg-[#050607] text-white"
          : "bg-[#f1f2f3] text-[#0f1419] dark:bg-[#050607] dark:text-white",
        tool === 'pan' && "cursor-grab",
        tool === 'draw' && "cursor-crosshair",
        isPanning && "cursor-grabbing"
      )}
      style={
        isWorkflowCanvas
          ? undefined
          : { backgroundColor: "var(--canvas-surface-background, #f4f4f5)" }
      }
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleBlankCanvasDoubleClick}
      onWheel={handleWheel}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isWorkflowCanvas ? (
        <>
          <div className="pointer-events-none absolute inset-0 pattern-grid-lg text-white opacity-[0.065]" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(91,118,254,0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(164,176,220,0.05), transparent 28%)",
            }}
          />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(15,20,25,0.08)_1px,transparent_1px)] bg-[length:18px_18px] bg-[position:1px_1px] opacity-[0.16]" />
        </>
      )}

      {isFileDragActive && (
        <div
          className={cn(
            "absolute inset-0 z-30 flex items-center justify-center pointer-events-none border-2 border-dashed",
            isWorkflowCanvas
              ? "rounded-[32px] border-primary/30 bg-primary/5"
              : "rounded-lg border-primary/40 bg-primary/5"
          )}
        >
          <div
            className={cn(
              "px-4 py-2 text-sm text-primary shadow-sm",
              isWorkflowCanvas
                ? "rounded-full border border-primary/20 bg-white dark:bg-zinc-950"
                : "rounded-md bg-background/90"
            )}
          >
            松开鼠标即可添加图片到画布
          </div>
        </div>
      )}

      {isMarqueeSelecting && marqueeStart && marqueeEnd && (
        <div
          className="absolute z-20 pointer-events-none border border-primary/50 bg-primary/10"
          style={{
            left: Math.min(marqueeStart.x, marqueeEnd.x),
            top: Math.min(marqueeStart.y, marqueeEnd.y),
            width: Math.abs(marqueeEnd.x - marqueeStart.x),
            height: Math.abs(marqueeEnd.y - marqueeStart.y),
          }}
        />
      )}

      {snapGuides?.vertical && (
        <>
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.vertical.x * viewport.zoom + viewport.x,
              top: snapGuides.vertical.top * viewport.zoom + viewport.y,
              width: 1,
              height: Math.max(
                1,
                (snapGuides.vertical.bottom - snapGuides.vertical.top) * viewport.zoom,
              ),
              backgroundColor: SNAP_GUIDE_COLOR,
            }}
          />
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.vertical.x * viewport.zoom + viewport.x - 4,
              top: snapGuides.vertical.top * viewport.zoom + viewport.y - 4,
              color: SNAP_GUIDE_COLOR,
              fontSize: 11,
              lineHeight: "11px",
            }}
          >
            x
          </div>
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.vertical.x * viewport.zoom + viewport.x - 4,
              top:
                snapGuides.vertical.bottom * viewport.zoom + viewport.y - 4,
              color: SNAP_GUIDE_COLOR,
              fontSize: 11,
              lineHeight: "11px",
            }}
          >
            x
          </div>
        </>
      )}

      {snapGuides?.horizontal && (
        <>
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.horizontal.left * viewport.zoom + viewport.x,
              top: snapGuides.horizontal.y * viewport.zoom + viewport.y,
              width: Math.max(
                1,
                (snapGuides.horizontal.right - snapGuides.horizontal.left) * viewport.zoom,
              ),
              height: 1,
              backgroundColor: SNAP_GUIDE_COLOR,
            }}
          />
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.horizontal.left * viewport.zoom + viewport.x - 4,
              top: snapGuides.horizontal.y * viewport.zoom + viewport.y - 4,
              color: SNAP_GUIDE_COLOR,
              fontSize: 11,
              lineHeight: "11px",
            }}
          >
            x
          </div>
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: snapGuides.horizontal.right * viewport.zoom + viewport.x - 4,
              top: snapGuides.horizontal.y * viewport.zoom + viewport.y - 4,
              color: SNAP_GUIDE_COLOR,
              fontSize: 11,
              lineHeight: "11px",
            }}
          >
            x
          </div>
        </>
      )}

      <div
        ref={contentLayerRef}
        className="absolute inset-0 z-[2]"
        style={{
          contain: "layout paint style",
          overflow: "visible",
          transform: "translate3d(0px, 0px, 0px)",
          transformOrigin: "0 0",
        }}
      >
        {isWorkflowCanvas ? (
          <svg className="absolute inset-0 z-[1] h-full w-full overflow-visible">
            {renderedMergeTrunks.map(({ targetNodeId, path, edgeIds }) => {
              const isSelected = Boolean(selectedEdgeId && edgeIds.includes(selectedEdgeId));
              return (
                <g key={`merge-trunk-${targetNodeId}`} style={{ pointerEvents: "none" }}>
                  {isSelected ? (
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(59, 130, 246, 0.18)"
                      strokeLinecap="round"
                      strokeWidth={10}
                    />
                  ) : null}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? WORKFLOW_EDGE_ACTIVE_COLOR : WORKFLOW_EDGE_COLOR}
                    strokeLinecap="round"
                    strokeWidth={isSelected ? 4 : 3}
                  />
                </g>
              );
            })}
            {renderedEdges.map(({ edge, path }) => {
              const isSelected = selectedEdgeId === edge.id;
              return (
                <g key={edge.id}>
                  {isSelected ? (
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(59, 130, 246, 0.18)"
                      strokeLinecap="round"
                      strokeWidth={10}
                      style={{ pointerEvents: "none" }}
                    />
                  ) : null}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? WORKFLOW_EDGE_ACTIVE_COLOR : WORKFLOW_EDGE_COLOR}
                    strokeDasharray={edge.type === "reference" ? "6 6" : undefined}
                    strokeLinecap="round"
                    strokeWidth={isSelected ? 4 : 3}
                    className="cursor-pointer transition-all"
                    style={{ pointerEvents: "stroke" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      clearSelection();
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      deleteEdge(edge.id);
                      setSelectedEdgeId(null);
                    }}
                  />
                </g>
              );
            })}
            {connectionDraft ? (() => {
              const sourceNode = nodes.find((node) => node.id === connectionDraft.sourceId);
              if (!sourceNode) return null;
              const sourcePoint = toScreenPosition(getNodeOutputAnchor(sourceNode));
              const targetPoint = toScreenPosition(connectionDraft.current);
              return (
                <g>
                  <path
                    d={buildWorkflowPath(sourcePoint, targetPoint)}
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.14)"
                    strokeLinecap="round"
                    strokeWidth={8}
                    style={{ pointerEvents: "none" }}
                  />
                  <path
                    d={buildWorkflowPath(sourcePoint, targetPoint)}
                    fill="none"
                    stroke={WORKFLOW_EDGE_COLOR}
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    strokeWidth={3}
                    style={{ pointerEvents: "none" }}
                  />
                  <circle
                    cx={targetPoint.x}
                    cy={targetPoint.y}
                    r={5}
                    fill="white"
                    stroke={WORKFLOW_EDGE_ACTIVE_COLOR}
                    strokeWidth={2}
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })() : null}
          </svg>
        ) : null}

        {/* 节点层 - 使用虚拟化渲染，允许工具栏溢出 */}
        <div className="absolute inset-0 z-[2]" style={{ overflow: 'visible' }}>
          {visibleNodes.map(renderNode)}
        </div>
      </div>

      {/* 性能指示器（节点数量大于 50 时显示） */}
      {nodes.length >= 50 && (
        <div className={cn("absolute top-4 right-4", overlayPanelClassName)}>
          渲染: {visibleNodes.length}/{nodes.length}
        </div>
      )}

      {/* 空状态提示 */}
      {showEmptyState && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isWorkflowCanvas ? (
            <div className="rounded-[26px] border border-[#dbe2ee] bg-white px-7 py-5 text-center shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_24px_52px_rgba(22,24,29,0.08)] dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#dde5f4] bg-[#f6f8ff] text-brand-selection shadow-[0_0_0_1px_rgba(219,226,238,0.22)] dark:border-zinc-800 dark:bg-zinc-950">
                <GitBranch className="h-5 w-5" />
              </div>
              <p className="text-lg font-semibold text-[#16181d]">{workspaceLabel}还是空的</p>
              <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#647086]">
                {emptyStateDescription}
              </p>
            </div>
          ) : (
            <div className="rounded-[16px] border border-black/[0.06] bg-white/95 px-7 py-5 text-center text-[#536471] shadow-none backdrop-blur-[10px] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:text-white/58">
              <p className="mb-2 text-[16px] font-semibold text-[#0f1419] dark:text-white">{workspaceLabel}还是空的</p>
              <p className="text-[13px] text-[#8a96a3] dark:text-white/44">{emptyStateDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* 选中图片快捷操作 */}
      {selectedPendingImageUploadCount > 0 && selectedImageNodes.length === 0 && (
        <div
          className="absolute bottom-16 left-4 z-30 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-sm"
          data-canvas-overlay
        >
          图片仍在本地，上传完成后可进行 AI 处理
        </div>
      )}
      {selectedImageNodes.length > 0 && (
        <div
          className="absolute bottom-16 left-4 z-30 flex items-center gap-1.5"
          data-canvas-overlay
        >
          <Button
            variant={isWorkflowCanvas ? "outline" : "secondary"}
            size="sm"
            className={selectedImageActionButtonClassName}
            style={selectedImageActionButtonStyle}
            onClick={handleCreateImageFolderFromSelection}
            title="收纳到画板"
          >
            <FolderPlus className="!h-2.5 !w-2.5" />
            <span style={selectedImageActionLabelStyle}>收纳到画板</span>
          </Button>
          {selectedImageLocalEditEnabled && selectedImageNodes.length === 1 ? (
            <Button
              variant={isWorkflowCanvas ? "outline" : "secondary"}
              size="sm"
              className={selectedImageActionButtonClassName}
              style={selectedImageActionButtonStyle}
              onClick={() =>
                requestImageNodeAction(selectedImageNodes[0].id, "local-edit")
              }
              title={selectedImageLocalEditItem.label}
            >
              <CanvasToolbarIcon
                className="!h-2.5 !w-2.5"
                fallback={Wand2}
                item={selectedImageLocalEditItem}
              />
              <span style={selectedImageActionLabelStyle}>
                {selectedImageLocalEditItem.label}
              </span>
            </Button>
          ) : null}
          <Button
            variant={isWorkflowCanvas ? "outline" : "secondary"}
            size="sm"
            className={selectedImageActionButtonClassName}
            style={selectedImageActionButtonStyle}
            onClick={handleDownloadSelectedImages}
            disabled={isDownloadSubmitting}
            title={getCanvasToolbarItem(canvasToolbarConfig, "downloadFolder").label}
          >
            <CanvasToolbarIcon
              className="!h-2.5 !w-2.5"
              fallback={Download}
              item={getCanvasToolbarItem(canvasToolbarConfig, "downloadFolder")}
            />
            <span style={selectedImageActionLabelStyle}>
              {isDownloadSubmitting
                ? "打包中..."
                : `${getCanvasToolbarItem(canvasToolbarConfig, "downloadFolder").label}(${selectedImageNodes.length})`}
            </span>
          </Button>
        </div>
      )}

      {showZoomControls ? (
        <div
          className={cn(
            zoomOverlayClassName,
            isWorkflowCanvas
              ? "flex items-center gap-1.5 px-1.5 py-1.5"
              : "flex items-center gap-1 px-1 py-1 border border-border/50"
          )}
          data-canvas-overlay
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", isWorkflowCanvas && "rounded-full")}
            onClick={() => {
              const newZoom = Math.max(0.1, viewport.zoom - 0.1);
              setViewport({ zoom: newZoom });
            }}
            title={getCanvasToolbarItem(canvasToolbarConfig, "zoomOut").label}
          >
            <CanvasToolbarIcon
              className="h-3.5 w-3.5"
              fallback={Minus}
              item={getCanvasToolbarItem(canvasToolbarConfig, "zoomOut")}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 min-w-[50px] text-xs font-medium",
              isWorkflowCanvas && "rounded-full px-3"
            )}
            onClick={() => setViewport({ zoom: 1, x: 0, y: 0 })}
            title={getCanvasToolbarItem(canvasToolbarConfig, "resetZoom").label}
          >
            {Math.round(viewport.zoom * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", isWorkflowCanvas && "rounded-full")}
            onClick={() => {
              const newZoom = Math.min(4, viewport.zoom + 0.1);
              setViewport({ zoom: newZoom });
            }}
            title={getCanvasToolbarItem(canvasToolbarConfig, "zoomIn").label}
          >
            <CanvasToolbarIcon
              className="h-3.5 w-3.5"
              fallback={Plus}
              item={getCanvasToolbarItem(canvasToolbarConfig, "zoomIn")}
            />
          </Button>
        </div>
      ) : null}

      <Dialog
        open={Boolean(zipDownloadDialog)}
        onOpenChange={(open) => {
          if (!open && !isZipDownloadRunning) {
            setZipDownloadDialog(null);
          }
        }}
      >
        <DialogContent
          className="w-[min(360px,calc(100vw-32px))] gap-3 rounded-[18px] border-black/10 bg-white p-4 text-[#0f1419] shadow-[0_18px_70px_rgba(15,20,25,0.20)] dark:border-white/10 dark:bg-[#141516] dark:text-white"
          hideCloseButton={isZipDownloadRunning}
        >
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-[15px] leading-none">
              {isZipDownloadCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : isZipDownloadFailed ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-[#dfff24]" />
              )}
              选中图片打包
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-5 text-[#6b7280] dark:text-white/48">
              {isZipDownloadCompleted
                ? "ZIP 已准备好，已自动开始下载。"
                : isZipDownloadFailed
                  ? "本次打包没有完成，可稍后重试。"
                  : "正在压缩选中的图片，完成后会自动下载。"}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[14px] border border-black/[0.06] bg-[#f7f8f9] p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">
                  {zipDownloadDialog?.zipName || "canvas-images"}
                </div>
                <div className="mt-1 text-[11px] text-[#7b8492] dark:text-white/42">
                  {zipDownloadDialog?.stage || "准备打包"}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] leading-4",
                  isZipDownloadCompleted
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200"
                    : isZipDownloadFailed
                      ? "border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-200"
                      : "border-[#dfff24]/35 bg-[#dfff24]/12 text-[#6b7410] dark:text-[#e8ff62]"
                )}
              >
                {isZipDownloadCompleted
                  ? "已完成"
                  : isZipDownloadFailed
                    ? "失败"
                    : "处理中"}
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-[#7b8492] dark:text-white/42">
                  已处理 {zipDownloadDialog?.processedCount || 0}/
                  {zipDownloadDialog?.totalCount || 0}
                </span>
                <span className="font-medium text-[#0f1419] dark:text-white/72">
                  {zipDownloadProgress}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isZipDownloadFailed
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-[#dfff24] via-[#aaf77a] to-[#73d5ff]"
                  )}
                  style={{ width: `${zipDownloadProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="rounded-[10px] border border-black/[0.06] bg-white px-2 py-1.5 dark:border-white/[0.08] dark:bg-black/[0.18]">
                <div className="text-[#8a96a3] dark:text-white/38">总数</div>
                <div className="mt-0.5 font-semibold">
                  {zipDownloadDialog?.totalCount || 0}
                </div>
              </div>
              <div className="rounded-[10px] border border-emerald-400/20 bg-emerald-500/[0.08] px-2 py-1.5">
                <div className="text-emerald-700/70 dark:text-emerald-100/55">成功</div>
                <div className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-100">
                  {zipDownloadDialog?.successCount || 0}
                </div>
              </div>
              <div className="rounded-[10px] border border-red-400/20 bg-red-500/[0.08] px-2 py-1.5">
                <div className="text-red-700/70 dark:text-red-100/55">失败</div>
                <div className="mt-0.5 font-semibold text-red-700 dark:text-red-100">
                  {zipDownloadDialog?.failedCount || 0}
                </div>
              </div>
            </div>
          </div>

          {isZipDownloadFailed ? (
            <div className="rounded-[12px] border border-red-400/20 bg-red-500/10 px-3 py-2 text-[11px] leading-5 text-red-700 dark:text-red-100/80">
              {zipDownloadDialog?.error || "打包下载失败，请稍后重试。"}
            </div>
          ) : null}

          {isZipDownloadCompleted && (zipDownloadDialog?.failedCount || 0) > 0 ? (
            <div className="rounded-[12px] border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:text-amber-100/80">
              有 {zipDownloadDialog?.failedCount || 0} 张图片暂时无法下载，ZIP
              内已附带 _download-failures.txt。
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-xs"
              disabled={isZipDownloadRunning}
              onClick={() => setZipDownloadDialog(null)}
            >
              {isZipDownloadRunning ? "处理中" : "关闭"}
            </Button>
            <Button
              type="button"
              disabled={!isZipDownloadCompleted || !zipDownloadDialog?.downloadUrl}
              className="h-8 rounded-[10px] bg-[#0f1419] px-3 text-xs text-white hover:bg-[#20262d] disabled:opacity-45 dark:bg-white dark:text-[#0f1419] dark:hover:bg-white/90"
              onClick={() => {
                if (zipDownloadDialog?.downloadUrl) {
                  triggerCanvasZipDownload(
                    zipDownloadDialog.downloadUrl,
                    zipDownloadDialog.zipName
                  );
                }
              }}
            >
              <Download className="mr-1.5 !h-3.5 !w-3.5" />
              重新下载
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
