// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { Loader2, Plus, RotateCcw, Scissors, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { apiFetch } from "@/src/client/api";
import { cn } from "@/src/lib/utils";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import { createClientLogger } from "@/src/lib/observability/client-logger";
import {
  createUploadedDetailReferenceCard,
  uploadDetailReferenceImageFile,
} from "@/src/components/agents/detail-reference-upload";
import type { AgentDetailReplacementReferenceItem } from "@/types/agent";

const MIN_SLICE_HEIGHT = 120;
const FAST_PREVIEW_WIDTH = 720;
const ESTIMATED_REFERENCE_HEIGHT = 960;
const SEGMENT_PRELOAD_CONCURRENCY = 4;
const logger = createClientLogger("agent-detail-reference-stitch");

type StitchSourceSegment = {
  card: AgentDetailReplacementReferenceItem;
  top: number;
  height: number;
  sourceWidth?: number;
  sourceHeight?: number;
};

type MergedSnapshot = {
  width: number;
  height: number;
  previewUrl: string;
  defaultCutLines: number[];
  sourceSegments: StitchSourceSegment[];
};

type DetailStitchPrepareResponse = {
  success?: boolean;
  data?: {
    previewUrl?: string;
    width?: number;
    height?: number;
    defaultCutLines?: number[];
    sourceSegments?: StitchSourceSegment[];
    failed?: Array<{ id?: string; label?: string; error?: string }>;
  };
  error?: string;
};

type DetailStitchApplyResponse = {
  success?: boolean;
  data?: {
    cards?: AgentDetailReplacementReferenceItem[];
  };
  error?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildStitchPreviewImageUrl(url: string, width: number) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) return "";
  return buildImageProxyUrl(normalizedUrl, {
    width: Math.min(Math.max(Math.round(width || 720), 96), 1200),
    quality: 84,
    format: "jpeg",
    delivery: "proxy",
  });
}

function buildStitchSegmentDisplayImageUrl(url: string, width: number) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) return "";
  return buildImageProxyUrl(normalizedUrl, {
    width: Math.min(Math.max(Math.round(width || FAST_PREVIEW_WIDTH), 96), 960),
    quality: 78,
    format: "jpeg",
    delivery: "display",
  });
}

function getReferenceDimension(value: unknown) {
  const normalized = Math.round(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function normalizeDetailStitchErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error ? error.message : String(error || "").trim();
  if (/timeout|aborted|operation was aborted/i.test(message)) {
    return "切割图片下载超时，通常是源图过大、源站响应慢或网络抖动导致。请稍后重试，或减少本次切割图片数量后再应用。";
  }
  if (/failed to fetch|networkerror|network error/i.test(message)) {
    return "网络连接异常，部分参考图暂时无法下载，请稍后重试。";
  }
  return message || fallback;
}

function resolveReferencePreviewHeight(card: AgentDetailReplacementReferenceItem) {
  const width = getReferenceDimension(card.width);
  const height = getReferenceDimension(card.height);
  if (width && height) {
    return Math.max(MIN_SLICE_HEIGHT, Math.round((FAST_PREVIEW_WIDTH / width) * height));
  }
  return ESTIMATED_REFERENCE_HEIGHT;
}

function buildOptimisticSnapshot(
  cards: Array<AgentDetailReplacementReferenceItem & { imageUrl: string }>
): MergedSnapshot {
  let top = 0;
  const defaultCutLines: number[] = [];
  const sourceSegments = cards.map((card, index) => {
    const height = resolveReferencePreviewHeight(card);
    const currentTop = top;
    top += height;
    if (index < cards.length - 1) {
      defaultCutLines.push(top);
    }
    return {
      card,
      top: currentTop,
      height,
      sourceWidth: getReferenceDimension(card.width) || undefined,
      sourceHeight: getReferenceDimension(card.height) || undefined,
    };
  });

  return {
    previewUrl: "",
    width: FAST_PREVIEW_WIDTH,
    height: Math.max(1, top),
    defaultCutLines,
    sourceSegments,
  };
}

function areCutLinesEqual(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => Math.round(value) === Math.round(right[index] || 0));
}

function scaleCutLines(lines: number[], fromHeight: number, toHeight: number) {
  const ratio = toHeight / Math.max(1, fromHeight);
  return Array.from(
    new Set(
      lines
        .map((line) => Math.round(line * ratio))
        .filter((line) => Number.isFinite(line) && line > 0 && line < toHeight)
    )
  ).sort((left, right) => left - right);
}

function preloadBrowserImage(url: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !url) {
      resolve();
      return;
    }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

interface AgentDetailReferenceStitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: AgentDetailReplacementReferenceItem[];
  sourceLabel?: string;
  onPrepared?: (nextCards: AgentDetailReplacementReferenceItem[]) => void;
  onApply: (nextCards: AgentDetailReplacementReferenceItem[]) => void;
}

export function AgentDetailReferenceStitchDialog({
  open,
  onOpenChange,
  cards,
  sourceLabel = "详情参考图",
  onPrepared,
  onApply,
}: AgentDetailReferenceStitchDialogProps) {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<MergedSnapshot | null>(null);
  const [cutLines, setCutLines] = useState<number[]>([]);
  const [draggingLineIndex, setDraggingLineIndex] = useState<number | null>(null);
  const [isAddingCutLine, setIsAddingCutLine] = useState(false);
  const [previewCutLineY, setPreviewCutLineY] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgressText, setApplyProgressText] = useState("");
  const [loadingProgressText, setLoadingProgressText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [previewImageLoadFailed, setPreviewImageLoadFailed] = useState(false);
  const [passthroughSegmentIndexes, setPassthroughSegmentIndexes] = useState<number[]>([]);
  const [segmentReplacementCards, setSegmentReplacementCards] = useState<
    Record<number, AgentDetailReplacementReferenceItem>
  >({});
  const [uploadingSegmentIndex, setUploadingSegmentIndex] = useState<number | null>(null);
  const hasManualCutLineChangesRef = useRef(false);
  const onPreparedRef = useRef(onPrepared);

  useEffect(() => {
    onPreparedRef.current = onPrepared;
  }, [onPrepared]);

  const validCards = useMemo(
    () =>
      cards.filter(
        (card): card is AgentDetailReplacementReferenceItem & { imageUrl: string } =>
          Boolean(String(card.imageUrl || "").trim())
      ),
    [cards]
  );
  const validCardLoadKey = useMemo(
    () =>
      validCards
        .map(
          (card, index) =>
            `${card.id}::${String(card.imageUrl || "").trim()}::${card.sortOrder ?? index}`
        )
        .join("|"),
    [validCards]
  );
  const setupCardsRef = useRef(validCards);
  const setupCardsKeyRef = useRef(validCardLoadKey);
  if (setupCardsKeyRef.current !== validCardLoadKey) {
    setupCardsKeyRef.current = validCardLoadKey;
    setupCardsRef.current = validCards;
  }
  const setupCards = setupCardsRef.current;

  const normalizedCutLines = useMemo(
    () =>
      [...cutLines]
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right),
    [cutLines]
  );

  const sliceSegments = useMemo(() => {
    if (!snapshot) return [];
    const points = [0, ...normalizedCutLines, snapshot.height];
    return Array.from({ length: Math.max(points.length - 1, 0) }, (_, index) => ({
      index,
      top: points[index],
      height: Math.max(points[index + 1] - points[index], 1),
    }));
  }, [normalizedCutLines, snapshot]);
  const passthroughSegmentIndexSet = useMemo(
    () => new Set(passthroughSegmentIndexes),
    [passthroughSegmentIndexes]
  );
  const segmentReplacementCount = useMemo(
    () => Object.keys(segmentReplacementCards).length,
    [segmentReplacementCards]
  );
  const mergedPreviewDisplayUrl = useMemo(
    () =>
      snapshot
        ? buildStitchPreviewImageUrl(snapshot.previewUrl, snapshot.width)
        : "",
    [snapshot]
  );
  const useVirtualPreview = previewImageLoadFailed || !mergedPreviewDisplayUrl;

  useEffect(() => {
    if (!open) {
      setDraggingLineIndex(null);
      setIsAddingCutLine(false);
      setPreviewCutLineY(null);
      setLoadingProgressText("");
      setIsLoading(false);
      setIsPreparing(false);
      setWarningText(null);
      setPreviewImageLoadFailed(false);
      setPassthroughSegmentIndexes([]);
      setSegmentReplacementCards({});
      setUploadingSegmentIndex(null);
      hasManualCutLineChangesRef.current = false;
      return;
    }

    if (setupCards.length === 0) {
      setSnapshot(null);
      setCutLines([]);
      hasManualCutLineChangesRef.current = false;
      setIsLoading(false);
      setIsPreparing(false);
      setErrorText(`当前没有可拼合的${sourceLabel}`);
      return;
    }

    let cancelled = false;
    const optimisticSnapshot = buildOptimisticSnapshot(setupCards);

    setSnapshot(optimisticSnapshot);
    setCutLines(optimisticSnapshot.defaultCutLines);
    hasManualCutLineChangesRef.current = false;
    setPassthroughSegmentIndexes([]);
    setErrorText(null);
    setWarningText(null);
    setPreviewImageLoadFailed(true);
    setIsLoading(false);
    setIsPreparing(true);
    setSegmentReplacementCards({});
    setUploadingSegmentIndex(null);
    setLoadingProgressText(`正在后台校准 ${setupCards.length} 张参考图尺寸`);

    const setup = async () => {
      try {
        const response = await apiFetch("/api/agent-workflow/detail-stitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "prepare",
            references: setupCards.map((card, index) => ({
              ...card,
              sortOrder: card.sortOrder ?? index,
            })),
          }),
        });
        const result = (await response.json().catch(() => ({}))) as DetailStitchPrepareResponse;

        if (cancelled) return;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "拼合参考图失败");
        }

        const previewUrl = String(result.data.previewUrl || "").trim();
        const width = Math.round(Number(result.data.width));
        const height = Math.round(Number(result.data.height));
        const sourceSegments = Array.isArray(result.data.sourceSegments)
          ? result.data.sourceSegments.filter(
              (segment): segment is StitchSourceSegment =>
                Boolean(segment?.card?.imageUrl) &&
                Number.isFinite(Number(segment.top)) &&
                Number.isFinite(Number(segment.height))
            )
          : [];
        const defaultCutLines = Array.isArray(result.data.defaultCutLines)
          ? result.data.defaultCutLines
              .map((value) => Math.round(Number(value)))
              .filter((value) => Number.isFinite(value) && value > 0 && value < height)
          : [];

        if (!width || !height || sourceSegments.length === 0) {
          throw new Error("拼合结果无效，请稍后重试");
        }

        const preciseSnapshot = {
          width,
          height,
          previewUrl,
          defaultCutLines,
          sourceSegments,
        };
        setSnapshot(preciseSnapshot);
        setPreviewImageLoadFailed(!previewUrl);
        setCutLines((current) => {
          if (hasManualCutLineChangesRef.current) {
            return scaleCutLines(current, optimisticSnapshot.height, height);
          }
          return areCutLinesEqual(current, optimisticSnapshot.defaultCutLines)
            ? defaultCutLines
            : scaleCutLines(current, optimisticSnapshot.height, height);
        });
        if (onPreparedRef.current) {
          const dimensionByCardId = new Map(
            sourceSegments.map((segment) => [
              segment.card.id,
              {
                previewUrl: segment.card.previewUrl || segment.card.imageUrl || null,
                width: segment.sourceWidth || segment.card.width || null,
                height: segment.sourceHeight || segment.card.height || null,
              },
            ])
          );
          onPreparedRef.current(
            setupCards.map((card, index) => {
              const dimensions = dimensionByCardId.get(card.id);
              return {
                ...card,
                sortOrder: card.sortOrder ?? index,
                previewUrl: dimensions?.previewUrl || card.previewUrl || card.imageUrl || null,
                width: dimensions?.width || card.width || null,
                height: dimensions?.height || card.height || null,
              };
            })
          );
        }
        setWarningText(
          (result.data.failed?.length || 0) > 0
            ? `有 ${result.data.failed?.length || 0} 张参考图加载失败，已自动跳过异常图片。`
            : null
        );
      } catch (error) {
        if (cancelled) return;
        const message = normalizeDetailStitchErrorMessage(error, "拼合参考图失败");
        logger.warn("prepare_failed", {
          cardCount: setupCards.length,
          message,
        });
        setWarningText(
          `精准尺寸校准失败，已先使用快速预览：${message}`
        );
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
          setLoadingProgressText("");
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [open, setupCards, sourceLabel]);

  useEffect(() => {
    const validIndexes = new Set(sliceSegments.map((segment) => segment.index));
    setPassthroughSegmentIndexes((current) =>
      current.filter((index) => validIndexes.has(index))
    );
    setSegmentReplacementCards((current) => {
      const nextEntries = Object.entries(current).filter(([index]) =>
        validIndexes.has(Number(index))
      );
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [sliceSegments]);

  useEffect(() => {
    if (!open || !snapshot || !useVirtualPreview) return;
    const urls = Array.from(
      new Set(
        snapshot.sourceSegments
          .map((segment) => {
            const originalImageUrl = String(segment.card.imageUrl || "").trim();
            const segmentImageUrl =
              String(segment.card.previewUrl || "").trim() || originalImageUrl;
            return buildStitchSegmentDisplayImageUrl(segmentImageUrl, snapshot.width);
          })
          .filter(Boolean)
      )
    );
    if (urls.length <= 2) return;

    let cancelled = false;
    let cursor = 2;
    const timer = window.setTimeout(() => {
      const worker = async () => {
        while (!cancelled && cursor < urls.length) {
          const currentIndex = cursor;
          cursor += 1;
          await preloadBrowserImage(urls[currentIndex] || "");
        }
      };
      void Promise.all(
        Array.from(
          { length: Math.min(SEGMENT_PRELOAD_CONCURRENCY, Math.max(urls.length - 2, 0)) },
          () => worker()
        )
      );
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, snapshot, useVirtualPreview]);

  const resolveInsertCutLineY = useCallback(
    (rawY: number) => {
      if (!snapshot) return null;
      const sortedLines = [...normalizedCutLines].sort((left, right) => left - right);
      const insertIndex = sortedLines.findIndex((value) => value > rawY);
      const previousBoundary =
        insertIndex <= 0 ? 0 : sortedLines[(insertIndex === -1 ? sortedLines.length : insertIndex) - 1];
      const nextBoundary =
        insertIndex === -1 ? snapshot.height : sortedLines[insertIndex];
      const minY = previousBoundary + MIN_SLICE_HEIGHT;
      const maxY = nextBoundary - MIN_SLICE_HEIGHT;
      if (maxY < minY) {
        return null;
      }
      return clamp(rawY, minY, maxY);
    },
    [normalizedCutLines, snapshot]
  );

  const resolveCanvasYFromClient = useCallback(
    (clientY: number) => {
      const container = previewContainerRef.current;
      if (!container || !snapshot) return null;
      const rect = container.getBoundingClientRect();
      if (rect.height <= 0) return null;
      const rawY = ((clientY - rect.top) / rect.height) * snapshot.height;
      return clamp(rawY, 0, snapshot.height);
    },
    [snapshot]
  );

  useEffect(() => {
    if (draggingLineIndex === null || !snapshot) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = previewContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.height <= 0) return;

      const rawY = ((event.clientY - rect.top) / rect.height) * snapshot.height;
      setCutLines((current) => {
        const next = [...current].sort((left, right) => left - right);
        const minY =
          draggingLineIndex === 0
            ? MIN_SLICE_HEIGHT
            : next[draggingLineIndex - 1] + MIN_SLICE_HEIGHT;
        const maxY =
          draggingLineIndex === next.length - 1
            ? snapshot.height - MIN_SLICE_HEIGHT
            : next[draggingLineIndex + 1] - MIN_SLICE_HEIGHT;
        next[draggingLineIndex] = clamp(rawY, minY, maxY);
        return next;
      });
    };

    const handlePointerUp = () => {
      setDraggingLineIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingLineIndex, snapshot]);

  const handleAddCutLine = useCallback(() => {
    if (!snapshot) return;
    const points = [0, ...normalizedCutLines, snapshot.height];
    const hasSpace = points.some(
      (value, index) =>
        index < points.length - 1 && points[index + 1] - value >= MIN_SLICE_HEIGHT * 2
    );
    if (!hasSpace) {
      toast.error("当前没有足够空间继续添加切线");
      return;
    }

    setIsAddingCutLine((current) => !current);
    setPreviewCutLineY(null);
  }, [normalizedCutLines, snapshot]);

  const handleResetCutLines = useCallback(() => {
    if (!snapshot) return;
    hasManualCutLineChangesRef.current = false;
    setCutLines(snapshot.defaultCutLines);
  }, [snapshot]);

  const handleClearCutLines = useCallback(() => {
    hasManualCutLineChangesRef.current = true;
    setCutLines([]);
    setDraggingLineIndex(null);
    setIsAddingCutLine(false);
    setPreviewCutLineY(null);
  }, []);

  const handleRemoveCutLine = useCallback((index: number) => {
    hasManualCutLineChangesRef.current = true;
    setCutLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handlePreviewPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isAddingCutLine) return;
      const rawY = resolveCanvasYFromClient(event.clientY);
      if (rawY === null) {
        setPreviewCutLineY(null);
        return;
      }
      setPreviewCutLineY(resolveInsertCutLineY(rawY));
    },
    [isAddingCutLine, resolveCanvasYFromClient, resolveInsertCutLineY]
  );

  const handlePreviewPointerLeave = useCallback(() => {
    if (!isAddingCutLine) return;
    setPreviewCutLineY(null);
  }, [isAddingCutLine]);

  const handlePreviewClick = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isAddingCutLine) return;
      const rawY = resolveCanvasYFromClient(event.clientY);
      const nextY = rawY === null ? null : resolveInsertCutLineY(rawY);
      if (nextY === null) {
        toast.error("当前位置无法添加切线，请换一个位置");
        return;
      }
      hasManualCutLineChangesRef.current = true;
      setCutLines((current) => [...current, Math.round(nextY)].sort((left, right) => left - right));
      setIsAddingCutLine(false);
      setPreviewCutLineY(null);
    },
    [isAddingCutLine, resolveCanvasYFromClient, resolveInsertCutLineY]
  );

  const handleLinePointerDown = useCallback(
    (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Older browsers may not support pointer capture for this target.
      }
      hasManualCutLineChangesRef.current = true;
      setDraggingLineIndex(index);
    },
    []
  );

  const handleMergedPreviewImageError = useCallback(
    (event: SyntheticEvent<HTMLImageElement, Event>) => {
      const image = event.currentTarget;
      const fallbackUrl = String(snapshot?.previewUrl || "").trim();
      if (fallbackUrl && image.dataset.originalFallbackApplied !== "1") {
        image.dataset.originalFallbackApplied = "1";
        image.src = fallbackUrl;
        return;
      }
      setPreviewImageLoadFailed(true);
      setWarningText((current) => current || "拼合预览图加载失败，已切换为分段预览。");
    },
    [snapshot?.previewUrl]
  );

  const handleSegmentPreviewImageError = useCallback(
    (originalUrl: string) => (event: SyntheticEvent<HTMLImageElement, Event>) => {
      const image = event.currentTarget;
      const fallbackUrl = String(originalUrl || "").trim();
      if (fallbackUrl && image.dataset.originalFallbackApplied !== "1") {
        image.dataset.originalFallbackApplied = "1";
        image.src = fallbackUrl;
        return;
      }
      image.style.opacity = "0";
    },
    []
  );

  const handleReplaceSegmentImage = useCallback(
    async (segmentIndex: number, event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;

      setUploadingSegmentIndex(segmentIndex);
      try {
        const upload = await uploadDetailReferenceImageFile(file);
        const replacementCard = createUploadedDetailReferenceCard({
          upload,
          index: segmentIndex,
          labelPrefix: "更换切片",
        });
        setSegmentReplacementCards((current) => ({
          ...current,
          [segmentIndex]: {
            ...replacementCard,
            sortOrder: segmentIndex,
            passthrough: false,
          },
        }));
        toast.success(`已更换切片 ${segmentIndex + 1}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "切片图片更换失败");
      } finally {
        setUploadingSegmentIndex(null);
        input.value = "";
      }
    },
    []
  );

  const handleApply = useCallback(async () => {
    if (!snapshot) {
      toast.error("当前还没有可用的拼合图");
      return;
    }

    if (sliceSegments.length === 0) {
      toast.error("当前没有可切割的参考图");
      return;
    }
    if (uploadingSegmentIndex !== null) {
      toast.error("请等待切片图片上传完成");
      return;
    }

    setIsApplying(true);
    setApplyProgressText(`正在服务端切割 ${sliceSegments.length} 张`);

    try {
      const response = await apiFetch("/api/agent-workflow/detail-stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          previewUrl: snapshot.previewUrl,
          width: snapshot.width,
          height: snapshot.height,
          cutLines: normalizedCutLines,
          sourceSegments: snapshot.sourceSegments,
          passthroughSegmentIndexes,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as DetailStitchApplyResponse;
      if (!response.ok || !result.success || !result.data?.cards?.length) {
        throw new Error(result.error || "切割参考图失败");
      }

      const orderedCards = result.data.cards.map((card, index) => {
        const replacementCard = segmentReplacementCards[index];
        return {
          ...(replacementCard || card),
          sortOrder: index,
          passthrough: passthroughSegmentIndexSet.has(index),
        };
      });
      if (orderedCards.length !== sliceSegments.length) {
        throw new Error("部分切片处理失败，请稍后重试");
      }

      setApplyProgressText(
        normalizedCutLines.length === snapshot.defaultCutLines.length
          ? "已复用原图边界"
          : `已生成 ${orderedCards.length} 张切片`
      );

      onApply(orderedCards);
      onOpenChange(false);
      toast.success(`已生成 ${orderedCards.length} 张切片参考图`);
    } catch (error) {
      const message = normalizeDetailStitchErrorMessage(error, "切割参考图失败");
      logger.error("apply_failed", {
        cutLineCount: normalizedCutLines.length,
        sliceCount: sliceSegments.length,
        sourceSegmentCount: snapshot.sourceSegments.length,
        message,
      });
      toast.error(message);
    } finally {
      setIsApplying(false);
      setApplyProgressText("");
    }
  }, [
    normalizedCutLines,
    onApply,
    onOpenChange,
    passthroughSegmentIndexes,
    passthroughSegmentIndexSet,
    segmentReplacementCards,
    sliceSegments.length,
    snapshot,
    uploadingSegmentIndex,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[92vh] max-w-[1440px] overflow-hidden border-white/10 bg-[#060809] p-0 text-white"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        overlayClassName="bg-black/85 backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-white">
                <Scissors className="h-5 w-5 text-emerald-300" />
                拼合切割{sourceLabel}
              </DialogTitle>
              <DialogDescription className="text-white/45">
                先把当前参考图按顺序纵向拼成一张长图，再通过横向切线重新切成多屏，继续用于详情替换逐屏生成。
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                原始 {validCards.length} 张
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-100/85">
                当前将切成 {sliceSegments.length || 0} 张
              </div>
              {passthroughSegmentIndexes.length > 0 ? (
                <div className="rounded-full border border-brand-accent/20 bg-brand-accent/[0.08] px-3 py-1 text-xs text-brand-accent/85">
                  直出 {passthroughSegmentIndexes.length} 张
                </div>
              ) : null}
              {segmentReplacementCount > 0 ? (
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs text-emerald-100/85">
                  已更换 {segmentReplacementCount} 张
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 border-b border-white/10 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCutLine}
                disabled={!snapshot || isLoading || isApplying}
                className="border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isAddingCutLine ? "点击长图落线" : "添加切线"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetCutLines}
                disabled={!snapshot || isLoading || isApplying}
                className="border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                恢复原页边界
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearCutLines}
                disabled={!snapshot || isLoading || isApplying || normalizedCutLines.length === 0}
                className="border-red-400/20 bg-red-500/[0.06] text-red-100 hover:bg-red-500/[0.14] hover:text-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空切线
              </Button>
              <div className="text-xs text-white/42">
                {isPreparing
                  ? loadingProgressText || "正在后台校准参考图尺寸，完成后会自动修正切线。"
                  : "默认切线已按原始详情页边界生成，可直接拖动横线微调。"}
                {isAddingCutLine ? " 当前已进入加线模式，移动鼠标预览位置后点击长图即可落线。" : ""}
              </div>
            </div>

            <div className="agent-dark-scrollbar h-full overflow-auto px-6 py-5">
              {isLoading ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/12 bg-black/20 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                  <div className="text-sm text-white/75">
                    {loadingProgressText || "正在拼合参考图..."}
                  </div>
                  <div className="text-xs text-white/42">会按当前参考图顺序生成虚拟长图，不再上传超长拼合图</div>
                </div>
              ) : errorText ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-red-400/20 bg-red-500/[0.05] px-6 text-center">
                  <div className="text-sm font-medium text-red-100">{errorText}</div>
                  <div className="mt-2 text-xs leading-6 text-red-100/60">
                    请先确认当前已经成功加载参考详情图，再进入拼合切割。
                  </div>
                </div>
              ) : snapshot ? (
                <div className="space-y-4">
                  {warningText ? (
                    <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-xs leading-6 text-amber-100/88">
                      {warningText}
                    </div>
                  ) : null}
                  <div className="flex justify-center">
                    <div
                      ref={previewContainerRef}
                      className="relative w-full max-w-[650px] overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.22)]"
                      onPointerMove={handlePreviewPointerMove}
                      onPointerLeave={handlePreviewPointerLeave}
                      onClick={handlePreviewClick}
                    >
                      {useVirtualPreview ? (
                        <div className="w-full bg-white">
                          {snapshot.sourceSegments.map((segment, index) => {
                            const originalImageUrl = String(segment.card.imageUrl || "").trim();
                            const segmentImageUrl =
                              String(segment.card.previewUrl || "").trim() || originalImageUrl;
                            return (
                              <div
                                key={`${segment.card.id || "segment"}-${index}-${segment.top}`}
                                className="relative overflow-hidden bg-white"
                                  style={{
                                    aspectRatio: `${snapshot.width} / ${Math.max(segment.height, 1)}`,
                                    contentVisibility: index > 4 ? "auto" : undefined,
                                    containIntrinsicSize:
                                      index > 4 ? `${Math.max(segment.height, 1)}px` : undefined,
                                  }}
                                >
                                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-neutral-400">
                                  参考图 {index + 1} 加载失败
                                </div>
                                  {segmentImageUrl ? (
                                    <img
                                      src={buildStitchSegmentDisplayImageUrl(segmentImageUrl, snapshot.width)}
                                      alt={`拼合分段预览 ${index + 1}`}
                                      className="relative z-10 block h-full w-full select-none object-fill"
                                      draggable={false}
                                      decoding="async"
                                      loading={index > 2 ? "lazy" : "eager"}
                                      fetchPriority={index < 2 ? "high" : "low"}
                                      onError={handleSegmentPreviewImageError(originalImageUrl)}
                                    />
                                  ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <img
                          key={mergedPreviewDisplayUrl || snapshot.previewUrl}
                          src={mergedPreviewDisplayUrl || snapshot.previewUrl}
                          alt="拼合长图预览"
                          className="block h-auto w-full select-none"
                          width={snapshot.width}
                          height={snapshot.height}
                          draggable={false}
                          decoding="async"
                          onError={handleMergedPreviewImageError}
                        />
                      )}

                      <div className="pointer-events-none absolute inset-0 z-30">
                        {isAddingCutLine && previewCutLineY !== null ? (
                          <div
                            className="absolute inset-x-0"
                            style={{ top: `${(previewCutLineY / snapshot.height) * 100}%` }}
                          >
                            <div className="absolute inset-x-0 flex -translate-y-1/2 items-center justify-center">
                              <div className="relative w-full">
                                <div className="h-[2px] w-full border-t border-dashed border-emerald-400 bg-transparent" />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-emerald-300/35 bg-black/72 px-2 py-1 text-[11px] text-emerald-100">
                                  点击落线
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {normalizedCutLines.map((lineY, index) => {
                          const topPercent = (lineY / snapshot.height) * 100;
                          return (
                            <div
                              key={`cut-line-${index}-${lineY}`}
                              className="absolute inset-x-0"
                              style={{ top: `${topPercent}%` }}
                            >
                              <div
                                onPointerDown={handleLinePointerDown(index)}
                                className={cn(
                                  "pointer-events-auto absolute inset-x-0 z-10 flex h-10 -translate-y-1/2 cursor-row-resize touch-none select-none items-center justify-center",
                                  draggingLineIndex === index && "z-20"
                                )}
                                style={{ touchAction: "none" }}
                              >
                                <div className="relative w-full">
                                  <div className="h-[2px] w-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.42)]" />
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-emerald-300/35 bg-black/72 px-2 py-1 text-[11px] text-emerald-100">
                                    切线 {index + 1}
                                  </div>
                                  <button
                                    type="button"
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setDraggingLineIndex(null);
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleRemoveCutLine(index);
                                    }}
                                    className="absolute right-3 top-1/2 pointer-events-auto -translate-y-1/2 rounded-full border border-white/12 bg-black/72 px-2 py-1 text-[11px] text-white/78 transition-colors hover:border-white/20 hover:text-white"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/48">
                    向下拖动可浏览整张拼合长图。每条横线代表一次切割边界；右侧可把某些切片标记为“直接应用”，这些模块会跳过继续生成，直接进入结果区。
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-sm font-semibold text-white">切割结果预估</div>
              <div className="mt-1 text-xs text-white/42">
                应用切割后，下方每一段都会回到详情替换参考图区；标记为“不处理直出”的切片会跳过继续生成，未标记的切片再逐屏生成。
              </div>
            </div>

            <div className="agent-dark-scrollbar flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {sliceSegments.length > 0 ? (
                sliceSegments.map((segment) => {
                  const replacementCard = segmentReplacementCards[segment.index];
                  const replacementUrl = String(
                    replacementCard?.previewUrl || replacementCard?.imageUrl || ""
                  ).trim();
                  const isUploadingThisSegment = uploadingSegmentIndex === segment.index;
                  return (
                    <div
                      key={`slice-segment-${segment.index}`}
                      className={cn(
                        "rounded-[20px] border bg-white/[0.03] p-3",
                        replacementCard
                          ? "border-emerald-400/25"
                          : "border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">
                          切片 {segment.index + 1}
                        </div>
                        <div className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/52">
                          高度 {segment.height}px
                        </div>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-white/42">
                        从 {Math.round(segment.top)}px 到 {Math.round(segment.top + segment.height)}px
                      </div>
                      {replacementUrl ? (
                        <div className="mt-3 overflow-hidden rounded-[16px] border border-emerald-400/20 bg-white">
                          <img
                            src={buildStitchSegmentDisplayImageUrl(replacementUrl, 360)}
                            alt={`已更换切片 ${segment.index + 1}`}
                            className="block aspect-[4/3] w-full object-contain"
                            loading="lazy"
                            decoding="async"
                            onError={handleSegmentPreviewImageError(replacementCard?.imageUrl || replacementUrl)}
                          />
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-[120px] flex-1 text-[11px] text-white/45">
                          {replacementCard
                            ? "已使用手动更换图片，应用后会替代当前切片。"
                            : passthroughSegmentIndexSet.has(segment.index)
                              ? "当前切片不会参与生图，应用后会直接进入结果区。"
                              : "当前切片会继续参与详情替换生成。"}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <label
                            className={cn(
                              "inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-[11px] transition-colors",
                              isUploadingThisSegment
                                ? "border-emerald-400/35 bg-emerald-500/[0.12] text-emerald-100"
                                : "border-white/10 bg-white/[0.03] text-white/68 hover:border-white/20 hover:text-white",
                              (isApplying || uploadingSegmentIndex !== null) &&
                                !isUploadingThisSegment &&
                                "pointer-events-none opacity-50"
                            )}
                          >
                            <input
                              type="file"
                              accept="image/*,.heic,.heif"
                              className="hidden"
                              disabled={isApplying || uploadingSegmentIndex !== null}
                              onChange={(event) => {
                                void handleReplaceSegmentImage(segment.index, event);
                              }}
                            />
                            {isUploadingThisSegment ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {replacementCard ? "重新更换" : "更换图片"}
                          </label>
                          {replacementCard ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSegmentReplacementCards((current) => {
                                  const next = { ...current };
                                  delete next[segment.index];
                                  return next;
                                })
                              }
                              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/62 transition-colors hover:border-white/20 hover:text-white"
                            >
                              恢复切片
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setPassthroughSegmentIndexes((current) =>
                                current.includes(segment.index)
                                  ? current.filter((item) => item !== segment.index)
                                  : [...current, segment.index].sort((left, right) => left - right)
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-[11px] transition-colors",
                              passthroughSegmentIndexSet.has(segment.index)
                                ? "border-brand-accent/35 bg-brand-accent/[0.12] text-brand-accent"
                                : "border-white/10 bg-white/[0.03] text-white/68 hover:border-white/20 hover:text-white"
                            )}
                          >
                            {passthroughSegmentIndexSet.has(segment.index)
                              ? "取消不处理"
                              : "标记不处理"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-white/12 bg-black/20 px-5 text-center text-sm text-white/42">
                  当前还没有可切割的长图。
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
                <Button
                  type="button"
                  onClick={handleApply}
                  disabled={
                    isLoading ||
                    isPreparing ||
                    isApplying ||
                    uploadingSegmentIndex !== null ||
                    !snapshot ||
                    sliceSegments.length === 0
                  }
                  className="h-11 w-full rounded-[18px] bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {applyProgressText || "正在应用切割"}
                  </>
                ) : isPreparing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在校准尺寸
                  </>
                ) : (
                  <>
                    <Scissors className="mr-2 h-4 w-4" />
                    应用切割并替换参考图
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
