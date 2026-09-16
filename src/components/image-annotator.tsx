// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  Check,
  ChevronDown,
  Download,
  Droplet,
  Expand,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  MousePointer2,
  Move,
  Redo,
  Scissors,
  Sparkles,
  Trash2,
  Undo,
  Upload as UploadIcon,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "@/src/desktop/next-link-shim";
import { useRouter } from "@/src/desktop/next-navigation-shim";
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  type CanvasLaunchAttachment,
  getCanvasLaunchStorageKey,
} from "@/src/lib/canvas-launch";
import { apiFetch } from "@/src/client/api";
import { requestLongTaskResult } from "@/src/client/long-task";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import { createClientLogger } from "@/src/lib/observability/client-logger";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Slider } from "@/src/components/ui/slider";

type Tool = "pen" | "arrow" | "circle" | "text";

const logger = createClientLogger("image-annotator");

type DrawingAction = {
  type: Tool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
};

interface ImageAnnotatorProps {
  imageUrl?: string;
  onConfirm: (annotatedImageUrl: string) => void | Promise<void>;
  onCancel: () => void;
  onHomeClick?: () => void;
  initialResizeMode?: boolean; // 是否直接进入尺寸调整模式
  confirmButtonText?: string;
  submitMode?: "confirm" | "publish-new-canvas";
  appearance?: "theme" | "dark";
  open?: boolean; // 兼容 Dialog 模式
  onOpenChange?: (open: boolean) => void;
}

export function ImageAnnotator({
  imageUrl,
  onConfirm,
  onCancel,
  onHomeClick,
  initialResizeMode = false,
  confirmButtonText,
  submitMode = "confirm",
  appearance = "theme",
  open = true,
  onOpenChange,
}: ImageAnnotatorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool] = useState<Tool>("pen");
  const color = "#FF0000";
  const lineWidth = 4;
  const [actions, setActions] = useState<DrawingAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawingAction | null>(
    null
  );
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(!!imageUrl); // 如果有 imageUrl 则加载中
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isRemovingWatermark, setIsRemovingWatermark] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>(
    imageUrl
  );
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    null
  );
  const [processedImageBase64, setProcessedImageBase64] = useState<
    string | null
  >(null);
  const [processType, setProcessType] = useState<
    "rmbg" | "enhance" | "extend" | "resize" | "watermark" | null
  >(null);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const resolvedConfirmButtonText =
    confirmButtonText ||
    (submitMode === "publish-new-canvas" ? "发布到新的画布" : "发送到新对话");
  const forceDarkAppearance = appearance === "dark";
  const toCanvasLoadUrl = useCallback((url: string) => {
    return buildImageProxyUrl(url, { delivery: "proxy" });
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const createImageElement = useCallback(
    (src: string, useCrossOrigin = true) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        if (useCrossOrigin) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`图片加载失败: ${src}`));
        img.src = src;
      });
    },
    []
  );

  const loadImageFromSource = useCallback(
    async (sourceUrl: string) => {
      const normalizedSource = String(sourceUrl || "").trim();
      if (!normalizedSource) {
        throw new Error("图片地址为空");
      }

      const directUrl = normalizedSource;
      const proxiedUrl = toCanvasLoadUrl(normalizedSource);
      const candidateUrls = Array.from(
        new Set(
          [proxiedUrl, directUrl].filter((item): item is string =>
            Boolean(item)
          )
        )
      );

      for (const candidateUrl of candidateUrls) {
        try {
          const shouldUseCrossOrigin =
            !candidateUrl.startsWith("data:") &&
            !candidateUrl.startsWith("blob:");
          const imageElement = await createImageElement(
            candidateUrl,
            shouldUseCrossOrigin
          );
          revokeObjectUrl();
          return imageElement;
        } catch {}
      }

      for (const candidateUrl of candidateUrls) {
        try {
          const response = await fetch(candidateUrl, { cache: "force-cache" });
          if (!response.ok) {
            continue;
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const imageElement = await createImageElement(objectUrl, false);
          revokeObjectUrl();
          objectUrlRef.current = objectUrl;
          return imageElement;
        } catch {}
      }

      throw new Error("图片加载失败");
    },
    [createImageElement, revokeObjectUrl, toCanvasLoadUrl]
  );

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  // Handle open change
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange?.(newOpen);
    if (!newOpen) {
      onCancel();
    }
  };

  const resetEditorStateForNewImage = useCallback(() => {
    setProcessedImageUrl(null);
    setProcessedImageBase64(null);
    setProcessType(null);
    setActions([]);
    setCurrentAction(null);
    setTextInput("");
    setTextPosition(null);
    setIsResizeMode(false);
  }, []);

  const loadImageFromFile = useCallback(
    async (file: File) => {
      revokeObjectUrl();
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      return await createImageElement(objectUrl, false);
    },
    [createImageElement, revokeObjectUrl]
  );

  // 上传图片到服务器获取 URL 的辅助函数
  const uploadImageFile = async (
    file: File
  ): Promise<{ url: string; assetId?: string | null }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchUploadWithRetry(formData);
    if (!response.ok) {
      throw await createUploadErrorFromResponse(response, "上传失败，请重试");
    }
    const result = await response.json();
    if (!result?.url) {
      throw new Error("上传成功，但未返回可用图片地址");
    }
    return result;
  };

  const applyUploadedFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("请上传图片文件");
      }
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("图片大小不能超过 50MB");
      }

      setIsLoading(true);
      toast.info("正在上传图片...");

      try {
        const localPreviewPromise = loadImageFromFile(file);
        const uploadResult = await uploadImageFile(file);

        resetEditorStateForNewImage();
        setOriginalImageUrl(uploadResult.url);

        try {
          const localImage = await localPreviewPromise;
          setImage(localImage);
        } catch (previewError) {
          logger.warn("local_preview_failed", previewError);
          const uploadedImage = await loadImageFromSource(uploadResult.url);
          setImage(uploadedImage);
        }

        toast.success("图片上传成功");
      } catch (error) {
        logger.error("upload_failed", error);
        const message = getUploadErrorMessage(error, "上传失败，请重试");
        if (message) {
          toast.error(message);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadImageFromFile, loadImageFromSource, resetEditorStateForNewImage]
  );

  // 处理拖拽上传 - 先上传到服务器获取URL
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        try {
          await applyUploadedFile(files[0]);
        } catch {}
      }
    },
    [applyUploadedFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理粘贴上传 - 先上传到服务器获取URL
  useEffect(() => {
    if (!mounted || originalImageUrl) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          try {
            await applyUploadedFile(file);
          } catch {}
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [applyUploadedFile, mounted, originalImageUrl]);

  // 尺寸调整相关状态
  const [isResizeMode, setIsResizeMode] = useState(initialResizeMode);
  const [resizeCanvasWidth, setResizeCanvasWidth] = useState<number>(1920);
  const [resizeCanvasHeight, setResizeCanvasHeight] = useState<number>(1080);
  const [resizeBackgroundColor, setResizeBackgroundColor] =
    useState<string>("#FFFFFF");
  const [resizeBackgroundTransparent, setResizeBackgroundTransparent] =
    useState<boolean>(false);
  const [resizeImageScale, setResizeImageScale] = useState<number>(1);
  const [resizeImagePosition, setResizeImagePosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string | null>(
    null
  ); // 选中的比例，null表示自定义
  const [isResizing, setIsResizing] = useState(false); // 尺寸调整处理中状态
  const [resizeRatioPickerOpen, setResizeRatioPickerOpen] = useState(false);
  const resizeCanvasRef = useRef<HTMLCanvasElement>(null);
  const resizeContainerRef = useRef<HTMLDivElement>(null);

  // 网站设置相关状态
  const [siteName, setSiteName] = useState<string>("FrameLoom");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [siteLogoDark, setSiteLogoDark] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  // 比例选项定义
  const aspectRatios = [
    { label: "智能", value: "smart", ratio: null }, // 智能：根据原图比例
    { label: "1:1", value: "1:1", ratio: 1 / 1 },
    { label: "16:9", value: "16:9", ratio: 16 / 9 },
    { label: "9:16", value: "9:16", ratio: 9 / 16 },
    { label: "4:3", value: "4:3", ratio: 4 / 3 },
    { label: "3:4", value: "3:4", ratio: 3 / 4 },
    { label: "3:2", value: "3:2", ratio: 3 / 2 },
    { label: "2:3", value: "2:3", ratio: 2 / 3 },
    { label: "5:4", value: "5:4", ratio: 5 / 4 },
    { label: "4:5", value: "4:5", ratio: 4 / 5 },
    { label: "21:9", value: "21:9", ratio: 21 / 9 },
  ];
  const resizeQuickPresets = [
    {
      label: "主图 1440×1440",
      width: 1440,
      height: 1440,
      aspectRatioValue: "1:1",
    },
    {
      label: "主图 1440×1920",
      width: 1440,
      height: 1920,
      aspectRatioValue: "3:4",
    },
  ] as const;

  // 根据比例和宽度计算高度
  const calculateHeightFromWidth = (width: number, ratio: number | null) => {
    if (ratio === null) {
      // 智能模式：使用原图比例
      if (image) {
        return Math.round(width * (image.height / image.width));
      }
      return resizeCanvasHeight; // 如果没有原图，保持当前高度
    }
    return Math.round(width / ratio);
  };

  // 处理宽度变化
  const handleWidthChange = (newWidth: number) => {
    setResizeCanvasWidth(newWidth);
    if (selectedAspectRatio) {
      const ratioConfig = aspectRatios.find(
        (r) => r.value === selectedAspectRatio
      );
      if (ratioConfig) {
        const newHeight = calculateHeightFromWidth(newWidth, ratioConfig.ratio);
        setResizeCanvasHeight(newHeight);
      }
    }
  };

  // 处理高度变化（如果用户手动修改高度，取消比例锁定）
  const handleHeightChange = (newHeight: number) => {
    setResizeCanvasHeight(newHeight);
    // 如果用户手动修改高度，取消比例锁定
    if (selectedAspectRatio) {
      setSelectedAspectRatio(null);
    }
  };

  // 处理比例选择
  const handleAspectRatioSelect = (value: string | null) => {
    setSelectedAspectRatio(value);
    if (value) {
      const ratioConfig = aspectRatios.find((r) => r.value === value);
      if (ratioConfig) {
        const newHeight = calculateHeightFromWidth(
          resizeCanvasWidth,
          ratioConfig.ratio
        );
        setResizeCanvasHeight(newHeight);
      }
    }
  };

  const currentAspectRatioLabel =
    aspectRatios.find((ratio) => ratio.value === selectedAspectRatio)?.label ||
    (selectedAspectRatio ? selectedAspectRatio : "自定义");

  const handleResizeQuickPresetSelect = (
    preset: (typeof resizeQuickPresets)[number]
  ) => {
    setResizeCanvasWidth(preset.width);
    setResizeCanvasHeight(preset.height);
    setSelectedAspectRatio(preset.aspectRatioValue);
  };

  // 确保在客户端渲染
  useEffect(() => {
    setMounted(true);

    // 获取网站设置
    apiFetch(`/api/site-settings?scope=branding&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.siteName) setSiteName(data.siteName);
        if (data.siteLogo) setSiteLogo(data.siteLogo);
        if (data.siteLogoDark) setSiteLogoDark(data.siteLogoDark);
      })
      .catch((err) => {
        logger.warn("site_settings_fetch_failed", err);
      });
  }, []);

  // 处理本地图片上传 - 先上传到服务器获取URL
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await applyUploadedFile(file);
      } catch {}
    }
    // 重置 input
    e.target.value = "";
  };

  // 加载图片
  useEffect(() => {
    if (!imageUrl) return; // 如果没有初始图片，不执行加载逻辑

    let cancelled = false;

    const initializeImage = async () => {
      try {
        setIsLoading(true);
        setIsResizeMode(initialResizeMode);
        setOriginalImageUrl(imageUrl);
        setProcessedImageUrl(null);
        setProcessedImageBase64(null);
        setProcessType(null);

        const img = await loadImageFromSource(imageUrl);
        if (cancelled) return;

        setImage(img);
        setIsLoading(false);
        setIsResizeMode(initialResizeMode);
        setResizeCanvasWidth(img.width);
        setResizeCanvasHeight(img.height);
        setSelectedAspectRatio(null);
      } catch (error) {
        if (cancelled) return;
        logger.error("initial_image_load_failed", error);
        setImage(null);
        setIsLoading(false);
        toast.error("当前图片加载失败，请重试");
      }
    };

    initializeImage();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, initialResizeMode, loadImageFromSource]);

  // 初始化 canvas - 适配弹窗大小，固定编辑器大小，图片缩小显示
  useEffect(() => {
    if (!canvasRef.current || !image || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // 固定弹窗内画布区域大小（减去工具栏和边距，考虑并排显示）
    // 弹窗固定为 1200px x 550px，画布区域约为 1100px x 350px（单图）或 550px x 350px（双图）
    const containerWidth = processedImageBase64 ? 550 : 1100; // 如果有处理后图片，每个区域550px；否则1100px
    const containerHeight = 350; // 550 - 工具栏高度（约200px）
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const newScale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小以适应固定容器

    setScale(newScale);

    canvas.width = image.width * newScale;
    canvas.height = image.height * newScale;

    // 计算居中偏移
    const offsetX = (containerWidth - canvas.width) / 2;
    const offsetY = (containerHeight - canvas.height) / 2;
    setOffset({ x: Math.max(0, offsetX), y: Math.max(0, offsetY) });

    setCtx(context);
    redrawCanvas(context, image, newScale, []);
  }, [image]);

  // 重绘画布
  const redrawCanvas = useCallback(
    (
      context: CanvasRenderingContext2D,
      img: HTMLImageElement,
      currentScale: number,
      drawActions: DrawingAction[]
    ) => {
      const canvas = context.canvas;
      context.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制图片
      context.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 绘制所有动作
      for (const action of drawActions) {
        drawAction(context, action, currentScale);
      }
    },
    []
  );

  // 当 actions 变化时重绘
  useEffect(() => {
    if (ctx && image) {
      redrawCanvas(ctx, image, scale, actions);
    }
  }, [actions, ctx, image, scale, redrawCanvas]);

  // 绘制单个动作
  const drawAction = (
    context: CanvasRenderingContext2D,
    action: DrawingAction,
    currentScale: number
  ) => {
    context.strokeStyle = action.color;
    context.fillStyle = action.color;
    context.lineWidth = action.lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";

    switch (action.type) {
      case "pen":
        if (action.points && action.points.length > 0) {
          context.beginPath();
          context.moveTo(
            action.points[0].x * currentScale,
            action.points[0].y * currentScale
          );
          for (let i = 1; i < action.points.length; i++) {
            context.lineTo(
              action.points[i].x * currentScale,
              action.points[i].y * currentScale
            );
          }
          context.stroke();
        }
        break;

      case "arrow":
        if (
          action.startX !== undefined &&
          action.startY !== undefined &&
          action.endX !== undefined &&
          action.endY !== undefined
        ) {
          const sx = action.startX * currentScale;
          const sy = action.startY * currentScale;
          const ex = action.endX * currentScale;
          const ey = action.endY * currentScale;

          // 绘制线条
          context.beginPath();
          context.moveTo(sx, sy);
          context.lineTo(ex, ey);
          context.stroke();

          // 绘制箭头
          const angle = Math.atan2(ey - sy, ex - sx);
          const arrowLength = 15 + action.lineWidth * 2;
          context.beginPath();
          context.moveTo(ex, ey);
          context.lineTo(
            ex - arrowLength * Math.cos(angle - Math.PI / 6),
            ey - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          context.lineTo(
            ex - arrowLength * Math.cos(angle + Math.PI / 6),
            ey - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          context.closePath();
          context.fill();
        }
        break;

      case "circle":
        if (
          action.startX !== undefined &&
          action.startY !== undefined &&
          action.radius !== undefined
        ) {
          context.beginPath();
          context.arc(
            action.startX * currentScale,
            action.startY * currentScale,
            action.radius * currentScale,
            0,
            2 * Math.PI
          );
          context.stroke();
        }
        break;

      case "text":
        if (
          action.startX !== undefined &&
          action.startY !== undefined &&
          action.text
        ) {
          const fontSize = (action.fontSize || 20) * currentScale;
          context.font = `bold ${fontSize}px sans-serif`;
          context.fillText(
            action.text,
            action.startX * currentScale,
            action.startY * currentScale
          );
        }
        break;
    }
  };

  // 获取鼠标/触摸位置（转换为原始图片坐标）
  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 转换为原始图片坐标
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  // 开始绘制
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "text") {
      const pos = getPosition(e);
      setTextPosition(pos);
      return;
    }

    setIsDrawing(true);
    const pos = getPosition(e);

    const newAction: DrawingAction = {
      type: tool,
      color,
      lineWidth,
    };

    if (tool === "pen") {
      newAction.points = [pos];
    } else {
      newAction.startX = pos.x;
      newAction.startY = pos.y;
      newAction.endX = pos.x;
      newAction.endY = pos.y;
      if (tool === "circle") {
        newAction.radius = 0;
      }
    }

    setCurrentAction(newAction);
  };

  // 绘制中
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAction || !ctx || !image) return;

    const pos = getPosition(e);

    const updatedAction = { ...currentAction };

    if (tool === "pen" && updatedAction.points) {
      updatedAction.points = [...updatedAction.points, pos];
    } else if (tool === "arrow") {
      updatedAction.endX = pos.x;
      updatedAction.endY = pos.y;
    } else if (
      tool === "circle" &&
      updatedAction.startX !== undefined &&
      updatedAction.startY !== undefined
    ) {
      const dx = pos.x - updatedAction.startX;
      const dy = pos.y - updatedAction.startY;
      updatedAction.radius = Math.sqrt(dx * dx + dy * dy);
    }

    setCurrentAction(updatedAction);

    // 实时重绘
    redrawCanvas(ctx, image, scale, [...actions, updatedAction]);
  };

  // 结束绘制
  const handleEnd = () => {
    if (!isDrawing || !currentAction) return;

    setIsDrawing(false);
    setActions((prev) => [...prev, currentAction]);
    setCurrentAction(null);
  };

  // 添加文字
  const handleAddText = () => {
    if (!textInput.trim() || !textPosition) return;

    const textAction: DrawingAction = {
      type: "text",
      color,
      lineWidth,
      startX: textPosition.x,
      startY: textPosition.y,
      text: textInput,
      fontSize: 20 + lineWidth * 2,
    };

    setActions((prev) => [...prev, textAction]);
    setTextInput("");
    setTextPosition(null);
  };

  // 撤销
  const handleUndo = () => {
    setActions((prev) => prev.slice(0, -1));
  };

  // 清空
  const handleClear = () => {
    setActions([]);
  };

  // 将图片URL转换为Base64（获取原图数据）
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    // 如果已经是data URL，直接返回
    if (url.startsWith("data:")) {
      return url.split(",")[1];
    }

    // 如果是HTTP URL，需要先fetch获取
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `获取原图失败: ${response.status} ${response.statusText}`
      );
    }
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 抠图功能
  const handleRemoveBackground = async () => {
    if (!image || !originalImageUrl) return;

    setIsRemovingBg(true);
    try {
      // 使用原图URL获取原图数据，而不是canvas的预览图
      const base64Data = await imageUrlToBase64(originalImageUrl);
      logger.debug("rmbg_source_prepared", { base64Length: base64Data.length });

      // 调用抠图API
      const response = await apiFetch("/api/rmbg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: base64Data,
          prompt: "画图标注-抠图处理", // 可选：添加提示词
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "抠图失败");
      }

      const result = await response.json();

      if (result.success && result.image_base64) {
        // 保存处理后的图片URL和Base64（优先使用original_url，确保下载的是原图）
        logger.info("rmbg_completed", {
          hasOriginalUrl: !!result.original_url,
          hasThumbnailUrl: !!result.thumbnail_url,
          base64Length: String(result.image_base64 || "").length,
        });
        if (result.original_url) {
          setProcessedImageUrl(result.original_url);
        } else if (result.thumbnail_url) {
          logger.warn("rmbg_original_url_missing", { hasThumbnailUrl: true });
          setProcessedImageUrl(result.thumbnail_url);
        } else {
          logger.warn("rmbg_image_url_missing");
          setProcessedImageUrl(null);
        }
        setProcessedImageBase64(result.image_base64);
        setProcessType("rmbg");

        toast.success(
          `抠图完成！图片已保存到相册。处理时间: ${result.processing_time?.toFixed(2) || "未知"}秒`
        );
      } else {
        throw new Error(result.error || result.detail || "抠图处理失败");
      }
    } catch (error) {
      logger.error("rmbg_failed", error);
      toast.error(
        error instanceof Error ? error.message : "抠图失败，请稍后重试"
      );
    } finally {
      setIsRemovingBg(false);
    }
  };

  // 去水印功能
  const handleWatermarkRemove = async () => {
    if (!image || !originalImageUrl) return;

    setIsRemovingWatermark(true);
    try {
      const result = await requestLongTaskResult({
        endpoint: "/api/watermark-remove",
        payload: {
          image_url: originalImageUrl,
        },
      });

      if (result.success && result.original_url) {
        logger.info("watermark_remove_completed", {
          hasOriginalUrl: !!result.original_url,
          hasThumbnailUrl: !!result.thumbnail_url,
        });

        setProcessedImageUrl(result.original_url);
        // 下载图片获取base64用于显示
        try {
          const imgResponse = await fetch(result.original_url);
          const blob = await imgResponse.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            setProcessedImageBase64(base64);
          };
          reader.readAsDataURL(blob);
        } catch {
          logger.warn("watermark_remove_base64_fetch_failed");
        }
        setProcessType("watermark");

        toast.success(
          `去水印完成！图片已保存到相册。处理时间: ${result.processing_time?.toFixed(2) || "未知"}秒`
        );
      } else {
        throw new Error(result.error || "去水印处理失败");
      }
    } catch (error) {
      logger.error("watermark_remove_failed", error);
      toast.error(
        error instanceof Error ? error.message : "去水印失败，请稍后重试"
      );
    } finally {
      setIsRemovingWatermark(false);
    }
  };

  // 变清晰处理
  const handleEnhance = async () => {
    if (!image || !originalImageUrl) return;

    setIsEnhancing(true);
    try {
      // 使用原图URL获取原图数据，而不是canvas的预览图
      const base64Data = await imageUrlToBase64(originalImageUrl);
      logger.debug("enhance_source_prepared", { base64Length: base64Data.length });

      const result = await requestLongTaskResult({
        endpoint: "/api/enhance",
        payload: {
          image_base64: base64Data,
          prompt: "画图标注-变清晰处理",
        },
        pollingParams: {
          prompt: "画图标注-变清晰处理",
        },
      });

      if (result.success && result.image_base64) {
        // 保存处理后的图片URL和Base64（优先使用original_url，确保下载的是处理后的原图）
        logger.info("enhance_completed", {
          hasOriginalUrl: !!result.original_url,
          hasThumbnailUrl: !!result.thumbnail_url,
          base64Length: result.image_base64?.length || 0,
        });

        // ✅ 验证：检查返回的URL是否是处理后的图片
        if (result.original_url) {
          // 验证URL格式（应该包含enhance-orig）
          if (
            !result.original_url.includes("enhance-orig") &&
            !result.original_url.includes("enhance-orig")
          ) {
            logger.warn("enhance_result_marker_missing");
          }

          setProcessedImageUrl(result.original_url);
        } else if (result.thumbnail_url) {
          logger.warn("enhance_original_url_missing", { hasThumbnailUrl: true });
          setProcessedImageUrl(result.thumbnail_url);
        } else {
          logger.warn("enhance_image_url_missing");
          setProcessedImageUrl(null);
        }
        setProcessedImageBase64(result.image_base64);
        setProcessType("enhance");

        toast.success(
          `变清晰完成！图片已保存到相册。处理时间: ${result.processing_time?.toFixed(2) || "未知"}秒`
        );
      } else {
        throw new Error(result.error || result.detail || "变清晰处理失败");
      }
    } catch (error) {
      logger.error("enhance_failed", error);
      toast.error(
        error instanceof Error ? error.message : "变清晰失败，请稍后重试"
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  // 尺寸调整功能
  const handleResize = () => {
    if (!image) return;
    setIsResizeMode(true);
    // 初始化尺寸为原图尺寸
    setResizeCanvasWidth(image.width);
    setResizeCanvasHeight(image.height);
    setSelectedAspectRatio(null); // 重置比例选择
    // 初始化图片位置为画布中心
    setResizeImagePosition({ x: 0, y: 0 });
    setResizeImageScale(1);
  };

  // 尺寸调整：处理图片拖拽
  const handleResizeImageDragStart = (
    e: React.MouseEvent | React.TouchEvent
  ) => {
    if (!isResizeMode || !resizeCanvasRef.current) return;
    e.stopPropagation();
    setIsDraggingResize(true);
    const canvas = resizeCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // 计算相对于画布的坐标
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    // 计算画布中心到图片中心的偏移（考虑显示缩放）
    const containerWidth =
      resizeContainerRef.current?.clientWidth || canvas.width;
    const containerHeight =
      resizeContainerRef.current?.clientHeight || canvas.height;
    const canvasAspect = resizeCanvasWidth / resizeCanvasHeight;
    const containerAspect = containerWidth / containerHeight;
    const displayScale =
      canvasAspect > containerAspect
        ? containerWidth / resizeCanvasWidth
        : containerHeight / resizeCanvasHeight;

    // 保存拖拽起始点（相对于画布中心）
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = (canvasX - centerX) / displayScale - resizeImagePosition.x;
    const offsetY = (canvasY - centerY) / displayScale - resizeImagePosition.y;
    setDragStart({ x: offsetX, y: offsetY });
  };

  const handleResizeImageDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingResize || !dragStart || !resizeCanvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = resizeCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // 计算相对于画布的坐标
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    // 计算显示缩放
    const containerWidth =
      resizeContainerRef.current?.clientWidth || canvas.width;
    const containerHeight =
      resizeContainerRef.current?.clientHeight || canvas.height;
    const canvasAspect = resizeCanvasWidth / resizeCanvasHeight;
    const containerAspect = containerWidth / containerHeight;
    const displayScale =
      canvasAspect > containerAspect
        ? containerWidth / resizeCanvasWidth
        : containerHeight / resizeCanvasHeight;

    // 计算新的图片位置（相对于画布中心）
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const newX = (canvasX - centerX) / displayScale - dragStart.x;
    const newY = (canvasY - centerY) / displayScale - dragStart.y;

    setResizeImagePosition({ x: newX, y: newY });
  };

  const handleResizeImageDragEnd = () => {
    setIsDraggingResize(false);
    setDragStart(null);
  };

  // 尺寸调整：放大图片（每次2%）
  const handleResizeZoomIn = () => {
    if (!isResizeMode) return;
    setResizeImageScale((prev) => Math.min(prev * 1.02, 5)); // 最大5倍，每次放大2%
  };

  // 尺寸调整：缩小图片（每次2%）
  const handleResizeZoomOut = () => {
    if (!isResizeMode) return;
    setResizeImageScale((prev) => Math.max(prev / 1.02, 0.1)); // 最小0.1倍，每次缩小2%
  };

  // 尺寸调整：处理图片缩放（鼠标滚轮，每次2%）
  const handleResizeImageWheel = (e: React.WheelEvent) => {
    if (!isResizeMode || !image) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02; // 滚轮每次2%
    const newScale = Math.max(0.1, Math.min(5, resizeImageScale + delta));
    setResizeImageScale(newScale);
  };

  const handleResizeScaleSliderChange = (value: number[]) => {
    const nextScale = value[0];
    if (
      !isResizeMode ||
      typeof nextScale !== "number" ||
      Number.isNaN(nextScale)
    ) {
      return;
    }
    setResizeImageScale(Math.max(0.1, Math.min(5, nextScale)));
  };

  // 尺寸调整：渲染预览
  useEffect(() => {
    if (
      !isResizeMode ||
      !resizeCanvasRef.current ||
      !image ||
      !resizeContainerRef.current
    )
      return;

    const canvas = resizeCanvasRef.current;
    const container = resizeContainerRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 计算画布显示尺寸（适应容器）
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const canvasAspect = resizeCanvasWidth / resizeCanvasHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth: number;
    let displayHeight: number;
    let displayScale: number;

    if (canvasAspect > containerAspect) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / canvasAspect;
      displayScale = displayWidth / resizeCanvasWidth;
    } else {
      displayHeight = containerHeight;
      displayWidth = containerHeight * canvasAspect;
      displayScale = displayHeight / resizeCanvasHeight;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景（如果设置了背景颜色且不是透明）
    if (!resizeBackgroundTransparent) {
      ctx.fillStyle = resizeBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制图片（考虑缩放和位置）
    const imageDisplayWidth = image.width * resizeImageScale * displayScale;
    const imageDisplayHeight = image.height * resizeImageScale * displayScale;
    const imageX = canvas.width / 2 + resizeImagePosition.x * displayScale;
    const imageY = canvas.height / 2 + resizeImagePosition.y * displayScale;

    // 绘制图片（不设置透明度，保持原图清晰度）
    ctx.drawImage(
      image,
      imageX - imageDisplayWidth / 2,
      imageY - imageDisplayHeight / 2,
      imageDisplayWidth,
      imageDisplayHeight
    );
  }, [
    isResizeMode,
    resizeCanvasWidth,
    resizeCanvasHeight,
    resizeBackgroundColor,
    resizeBackgroundTransparent,
    resizeImageScale,
    resizeImagePosition,
    image,
  ]);

  // 尺寸调整：导出为指定尺寸的图片并上传到存储桶
  const handleResizeConfirm = async () => {
    if (!image || !isResizeMode || isResizing) return;

    setIsResizing(true);
    try {
      // 创建指定尺寸的画布
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = resizeCanvasWidth;
      exportCanvas.height = resizeCanvasHeight;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) return;

      // 绘制背景
      if (!resizeBackgroundTransparent) {
        exportCtx.fillStyle = resizeBackgroundColor;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

      // 计算图片在画布上的实际尺寸和位置
      const imageWidth = image.width * resizeImageScale;
      const imageHeight = image.height * resizeImageScale;
      const imageX = exportCanvas.width / 2 + resizeImagePosition.x;
      const imageY = exportCanvas.height / 2 + resizeImagePosition.y;

      // 绘制图片
      exportCtx.drawImage(
        image,
        imageX - imageWidth / 2,
        imageY - imageHeight / 2,
        imageWidth,
        imageHeight
      );

      // 导出为图片
      const mimeType = resizeBackgroundTransparent ? "image/png" : "image/jpeg";
      const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
      const base64Data = dataUrl.split(",")[1];

      // 调用API上传到存储桶并保存到数据库
      const response = await apiFetch("/api/resize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: base64Data,
          prompt: `尺寸调整处理 - ${resizeCanvasWidth}x${resizeCanvasHeight}`,
          canvasWidth: resizeCanvasWidth,
          canvasHeight: resizeCanvasHeight,
          mimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "上传失败");
      }

      const result = await response.json();

      if (result.success) {
        const finalResultUrl = result.original_url || dataUrl;

        if (result.original_url) {
          logger.info("resize_completed", { hasOriginalUrl: true });
          setProcessedImageUrl(result.original_url);
        } else {
          setProcessedImageUrl(null);
        }
        setProcessedImageBase64(base64Data);
        setProcessType("resize");

        await Promise.resolve(onConfirm(finalResultUrl));
      } else {
        throw new Error(result.error || "尺寸调整处理失败");
      }
    } catch (error) {
      logger.error("resize_failed", error);
      toast.error(
        error instanceof Error ? error.message : "尺寸调整失败，请稍后重试"
      );
    } finally {
      setIsResizing(false);
    }
  };

  // 图像拓展处理
  const handleExtend = async () => {
    if (!image) return;

    setIsExtending(true);
    try {
      // 直接使用原图URL，而不是转换为base64
      // 调用图像拓展API（直接发送URL）
      const response = await apiFetch("/api/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: originalImageUrl, // 直接发送图片URL
          prompt: "画图标注-图像拓展处理", // 可选：添加提示词
          includeBase64: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "图像拓展处理失败");
      }

      const result = await response.json();

      if (result.success) {
        // 保存处理后的图片URL和Base64（优先使用original_url，确保下载的是原图）
        if (result.original_url) {
          logger.info("extend_completed", {
            hasOriginalUrl: true,
            hasThumbnailUrl: !!result.thumbnail_url,
            hasBase64: !!result.base64,
          });
          setProcessedImageUrl(result.original_url);
        } else if (result.thumbnail_url) {
          logger.warn("extend_original_url_missing", { hasThumbnailUrl: true });
          setProcessedImageUrl(result.thumbnail_url);
        } else {
          logger.warn("extend_image_url_missing");
          setProcessedImageUrl(null);
        }
        // 优先使用返回的base64，如果没有则使用thumbnail_url或original_url
        setProcessedImageBase64(result.base64 || null);
        setProcessType("extend");

        toast.success(
          `图像拓展完成！图片已保存到相册。处理时间: ${result.processing_time?.toFixed(2) || "未知"}秒`
        );
      } else {
        throw new Error(result.error || result.detail || "图像拓展处理失败");
      }
    } catch (error) {
      logger.error("extend_failed", error);
      toast.error(
        error instanceof Error ? error.message : "图像拓展失败，请稍后重试"
      );
    } finally {
      setIsExtending(false);
    }
  };

  // 下载处理后的图片（必须使用原图URL或Base64）
  const handleDownloadProcessed = async () => {
    try {
      // 确定文件类型和MIME类型
      const isPng = processType === "rmbg" || processType === "resize";
      const fileExtension = isPng ? "png" : "jpg";
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const fileName =
        processType === "rmbg"
          ? `抠图-${Date.now()}.${fileExtension}`
          : processType === "enhance"
            ? `变清晰-${Date.now()}.${fileExtension}`
            : processType === "resize"
              ? `尺寸调整-${resizeCanvasWidth}x${resizeCanvasHeight}-${Date.now()}.${fileExtension}`
              : processType === "watermark"
                ? `去水印-${Date.now()}.${fileExtension}`
                : `图像拓展-${Date.now()}.${fileExtension}`;

      // 如果尺寸调整使用Base64，直接下载（优先使用URL，如果没有URL则使用Base64）
      if (processType === "resize") {
        if (processedImageUrl) {
          // 如果有URL，使用URL下载
          const response = await fetch(processedImageUrl);
          if (!response.ok) {
            throw new Error(
              `下载失败: ${response.status} ${response.statusText}`
            );
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success("图片下载成功");
          return;
        }
        if (processedImageBase64) {
          // 如果没有URL，使用Base64下载
          const dataUrl = `data:${mimeType};base64,${processedImageBase64}`;
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("图片下载成功");
          return;
        }
        toast.error("图片数据不可用，无法下载");
        return;
      }

      // 其他情况使用URL下载
      if (!processedImageUrl) {
        toast.error("原图地址不可用，无法下载");
        return;
      }

      // ✅ 验证：确认下载的是处理后的图片URL
      logger.debug("download_started", { processType });

      // 确保使用的是处理后的原图URL（检查URL中是否包含thumb标识）
      let downloadUrl = processedImageUrl;

      // 更完善的缩略图URL转换逻辑
      if (
        downloadUrl.includes("-thumb") ||
        downloadUrl.includes("/thumb/") ||
        downloadUrl.includes("thumbnail")
      ) {
        // 如果URL包含thumb标识，尝试转换为原图URL
        downloadUrl = downloadUrl
          .replace(/-thumb-/g, "-orig-")
          .replace(/-thumb\./g, "-orig.")
          .replace(/\/thumb\//g, "/orig/")
          .replace(/thumbnail/g, "original");
        logger.warn("download_thumbnail_url_rewritten", { processType });
      }

      // 如果转换后的URL仍然包含thumb标识，尝试更激进的转换
      if (downloadUrl.includes("thumb")) {
        try {
          // 尝试直接替换文件名中的thumb为orig
          const urlObj = new URL(downloadUrl);
          const pathname = urlObj.pathname;
          if (pathname.includes("thumb")) {
            const newPathname = pathname.replace(/thumb/g, "orig");
            downloadUrl = downloadUrl.replace(pathname, newPathname);
            logger.warn("download_thumbnail_url_rewritten_again", { processType });
          }
        } catch (urlError) {
          // 如果URL解析失败，尝试简单的字符串替换
          downloadUrl = downloadUrl.replace(/thumb/g, "orig");
          logger.warn("download_thumbnail_url_string_rewrite", {
            processType,
            reason: urlError instanceof Error ? urlError.message : "unknown",
          });
        }
      }

      // ✅ 验证：确认下载URL是正确的
      logger.debug("download_url_resolved", { processType });

      // 如果是变清晰，验证URL应该包含enhance相关标识
      if (
        processType === "enhance" &&
        !downloadUrl.includes("enhance") &&
        !downloadUrl.includes("1767358346590")
      ) {
        logger.warn("download_enhance_marker_missing");
      }

      // 从原图URL下载（原图已上传到S3）
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(
          `下载原图失败: ${response.status} ${response.statusText}`
        );
      }
      const blob = await response.blob();
      logger.info("download_blob_ready", { bytes: blob.size, processType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("原图下载成功");
    } catch (error) {
      logger.error("download_failed", error);
      toast.error(
        `下载失败: ${error instanceof Error ? error.message : "请稍后重试"}`
      );
    }
  };

  // 上传图片到服务器获取URL的辅助函数
  const uploadImageToServer = async (
    dataUrl: string,
    filename: string
  ): Promise<string> => {
    try {
      // 将 data URL 转换为 Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // 创建 FormData 上传
      const formData = new FormData();
      formData.append("file", blob, filename);

      const uploadResponse = await fetchUploadWithRetry(formData);

      if (!uploadResponse.ok) {
        throw await createUploadErrorFromResponse(
          uploadResponse,
          "上传失败，请重试"
        );
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult?.url) {
        throw new Error("上传成功，但未返回可用图片地址");
      }
      return uploadResult.url;
    } catch (error) {
      logger.error("server_upload_failed", error);
      throw error;
    }
  };

  const inferImageContentType = useCallback((url: string) => {
    const normalized =
      String(url || "")
        .split("?")[0]
        ?.toLowerCase() || "";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg"))
      return "image/jpeg";
    if (normalized.endsWith(".webp")) return "image/webp";
    if (normalized.endsWith(".gif")) return "image/gif";
    return "image/png";
  }, []);

  const resolveConfirmedImageUrl = useCallback(async (): Promise<
    string | null
  > => {
    if (processedImageUrl) {
      return processedImageUrl;
    }

    if (processedImageBase64) {
      const mimeType =
        processType === "rmbg" || processType === "resize"
          ? "image/png"
          : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${processedImageBase64}`;
      const ext =
        processType === "rmbg" || processType === "resize" ? "png" : "jpg";
      const filename = `processed-${Date.now()}.${ext}`;
      toast.info("正在上传图片...");
      return await uploadImageToServer(dataUrl, filename);
    }

    const canvas = canvasRef.current;
    if (!canvas || !image) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.width;
    exportCanvas.height = image.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return null;

    exportCtx.drawImage(image, 0, 0);

    for (const action of actions) {
      drawAction(exportCtx, action, 1);
    }

    const dataUrl = exportCanvas.toDataURL("image/png");
    const filename = `annotated-${Date.now()}.png`;
    toast.info("正在上传图片...");
    return await uploadImageToServer(dataUrl, filename);
  }, [actions, image, processType, processedImageBase64, processedImageUrl]);

  const publishToNewCanvas = useCallback(
    async (resultUrl: string) => {
      const normalizedOriginalUrl = String(originalImageUrl || "").trim();
      const normalizedResultUrl = String(resultUrl || "").trim();
      const resultLabelMap: Record<
        NonNullable<typeof processType> | "annotate",
        string
      > = {
        annotate: "编辑结果",
        rmbg: "抠图结果",
        enhance: "变清晰结果",
        extend: "拓展结果",
        resize: "尺寸调整结果",
        watermark: "去水印结果",
      };
      const resultLabel =
        resultLabelMap[processType || "annotate"] || "编辑结果";

      const attachments: CanvasLaunchAttachment[] = [];
      if (normalizedOriginalUrl) {
        attachments.push({
          url: normalizedOriginalUrl,
          name: "原图",
          contentType: inferImageContentType(normalizedOriginalUrl),
        });
      }
      if (normalizedResultUrl) {
        const hasSameAsOriginal =
          normalizedOriginalUrl &&
          normalizedOriginalUrl === normalizedResultUrl;
        if (!hasSameAsOriginal || attachments.length === 0) {
          attachments.push({
            url: normalizedResultUrl,
            name: resultLabel,
            contentType: inferImageContentType(normalizedResultUrl),
          });
        }
      }

      if (attachments.length === 0) {
        throw new Error("没有可发布到画布的图片");
      }

      const titleLabel = processType
        ? resultLabel.replace("结果", "")
        : "图片编辑";
      const createResponse = await apiFetch("/api/canvas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `${titleLabel}-${new Date().toLocaleDateString("zh-CN")}`,
        }),
      });

      const createResult = await createResponse.json();
      if (!createResponse.ok || !createResult?.data?.id) {
        throw new Error(createResult?.error || "创建新画布失败");
      }

      const canvasId = String(createResult.data.id);
      sessionStorage.setItem(
        getCanvasLaunchStorageKey(canvasId),
        JSON.stringify({
          prompt: "",
          attachments,
          autoSend: false,
          createdAt: Date.now(),
        })
      );

      toast.success("已发布到新的画布");
      router.push(`/canvas/${canvasId}`);
    },
    [inferImageContentType, originalImageUrl, processType, router]
  );

  // 确认
  const handleConfirm = async () => {
    try {
      const finalUrl = await resolveConfirmedImageUrl();
      if (!finalUrl) {
        toast.error("没有可发布的图片");
        return;
      }

      if (submitMode === "publish-new-canvas") {
        await publishToNewCanvas(finalUrl);
        return;
      }

      await onConfirm(finalUrl);
    } catch (error) {
      const message = getUploadErrorMessage(error, "处理失败，请重试");
      if (message) {
        toast.error(message);
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className={cn(
          "h-[95vh] w-[98vw] max-w-[1800px] overflow-hidden rounded-[20px] border-0 p-0 shadow-2xl sm:rounded-[20px] md:rounded-[24px]",
          forceDarkAppearance ? "bg-[#09090b] text-zinc-100" : "bg-background"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>图片编辑器</DialogTitle>
          <DialogDescription>编辑、标注或处理图片。</DialogDescription>
        </DialogHeader>
        <div className={cn("h-full w-full", forceDarkAppearance && "dark")}>
          {/* Top Header - Minimal */}
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-50 flex h-14 items-center justify-start bg-gradient-to-b from-black/20 to-transparent px-6">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/50 bg-background/95 px-4 py-1.5 shadow-sm backdrop-blur-md">
              <span className="font-semibold text-sm">图片编辑</span>
              <div className="h-4 w-[1px] bg-border" />
              <span className="text-muted-foreground text-xs">
                {isResizeMode ? "调整尺寸" : "图片标注与处理"}
              </span>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="relative flex h-full w-full bg-[#f4f4f5] dark:bg-[#09090b]">
            <div
              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden p-0"
              ref={containerRef}
            >
                <div className="pattern-grid-lg pointer-events-none absolute inset-0 opacity-[0.03]" />

                {/* Main Canvas / Image Area */}
                <div
                  className={cn(
                    "relative z-10 flex h-full w-full items-center justify-center p-8",
                    isResizeMode ? "pb-36" : "pb-32"
                  )}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-primary"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-primary"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-primary"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm">
                        正在加载图片...
                      </span>
                    </div>
                  ) : image ? (
                    isResizeMode ? (
                      /* Resize Mode View */
                      <div className="flex h-full w-full items-center justify-center gap-5">
                        {/* Source Image */}
                        <div className="flex h-full max-h-[80vh] flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-white/50 p-2 shadow-sm dark:bg-zinc-900/50">
                          <div className="mb-2 rounded bg-black/5 py-1 text-center font-medium text-muted-foreground text-xs dark:bg-white/5">
                            原图
                          </div>
                          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
                            {image && (
                              <img
                                alt="原图"
                                className="rounded-lg shadow-sm"
                                src={image.src}
                                style={{
                                  objectFit: "contain",
                                  maxHeight: "100%",
                                  maxWidth: "100%",
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Preview Canvas */}
                        <div className="flex h-full max-h-[80vh] flex-1 flex-col overflow-hidden rounded-xl border border-primary/20 bg-white/50 p-2 shadow-sm dark:bg-zinc-900/50">
                          <div className="mb-2 flex items-center justify-between rounded bg-black/5 px-2 py-1 dark:bg-white/5">
                            <span className="font-medium text-muted-foreground text-xs">
                              调整预览
                            </span>
                            {(processedImageUrl || processedImageBase64) &&
                              processType === "resize" && (
                                <Button
                                  className="h-6 px-2 text-xs hover:bg-background"
                                  onClick={handleDownloadProcessed}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  下载
                                </Button>
                              )}
                          </div>
                          <div
                            className="relative flex flex-1 items-center justify-center overflow-hidden"
                            onWheel={handleResizeImageWheel}
                            ref={resizeContainerRef}
                          >
                            <div className="relative inline-block">
                              <canvas
                                className="cursor-move rounded-lg shadow-lg"
                                onMouseDown={handleResizeImageDragStart}
                                onMouseLeave={handleResizeImageDragEnd}
                                onMouseMove={handleResizeImageDrag}
                                onMouseUp={handleResizeImageDragEnd}
                                onTouchEnd={handleResizeImageDragEnd}
                                onTouchMove={handleResizeImageDrag}
                                onTouchStart={handleResizeImageDragStart}
                                ref={resizeCanvasRef}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal Mode View */
                      <div className="flex h-full w-full items-center justify-center gap-4">
                        <div className="relative flex max-h-full max-w-full items-center justify-center">
                          <canvas
                            className={cn(
                              "block touch-none rounded-lg bg-white shadow-2xl dark:bg-[#18181b]",
                              tool === "pen" ||
                                tool === "arrow" ||
                                tool === "circle" ||
                                tool === "text"
                                ? "cursor-crosshair"
                                : "cursor-default"
                            )}
                            onMouseDown={handleStart}
                            onMouseLeave={handleEnd}
                            onMouseMove={handleMove}
                            onMouseUp={handleEnd}
                            onTouchEnd={handleEnd}
                            onTouchMove={handleMove}
                            onTouchStart={handleStart}
                            ref={canvasRef}
                          />

                          {/* Processed Result Overlay/Side-by-side could go here if we want splitscreen, but ImageAnnotator usually replaces or shows result in place?
                           Currently it shows result in a separate box if processed.
                           Let's keep the logic: if processedImage exists, show it side-by-side or replace?
                           Original code showed side-by-side.
                       */}
                        </div>

                        {/* Processed Result (Side by Side) */}
                        {(processedImageUrl || processedImageBase64) && (
                          <div className="relative ml-4 flex max-h-full max-w-full flex-col items-center justify-center border-border/20 border-l pl-4">
                            <div className="mb-2 rounded bg-black/5 px-2 py-1 font-medium text-muted-foreground text-xs dark:bg-white/5">
                              {processType === "rmbg"
                                ? "抠图结果"
                                : processType === "enhance"
                                  ? "清晰结果"
                                  : processType === "resize"
                                    ? "尺寸调整结果"
                                    : processType === "watermark"
                                      ? "去水印结果"
                                      : "拓展结果"}
                            </div>
                            <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-[#18181b]">
                              {processedImageUrl ? (
                                <img
                                  alt="Result"
                                  className="max-h-[70vh] max-w-[40vw] object-contain"
                                  src={processedImageUrl}
                                />
                              ) : processedImageBase64 ? (
                                <img
                                  alt="Result"
                                  className="max-h-[70vh] max-w-[40vw] object-contain"
                                  src={`data:image/${processType === "rmbg" || processType === "resize" ? "png" : "jpeg"};base64,${processedImageBase64}`}
                                />
                              ) : null}

                              <Button
                                className="absolute right-4 bottom-4 shadow-lg"
                                onClick={handleDownloadProcessed}
                                size="icon"
                                variant="secondary"
                              >
                                <Download className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div
                        className="group w-full max-w-lg cursor-pointer rounded-xl border-2 border-muted-foreground/25 border-dashed p-12 text-center transition-all hover:border-primary/50 hover:bg-muted/20"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-background p-4 shadow-sm transition-transform group-hover:scale-105">
                          <UploadIcon className="h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                        <h3 className="mb-2 font-medium text-xl">
                          上传图片以开始编辑
                        </h3>
                        <p className="mb-2 text-muted-foreground">
                          拖拽图片到此处、点击选择或 Ctrl+V 粘贴
                        </p>
                        <p className="mb-6 text-muted-foreground/60 text-sm">
                          支持 JPG, PNG, WebP 格式，最大 50MB
                        </p>
                        <Button variant="default">选择图片</Button>
                        <input
                          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
                          className="hidden"
                          onChange={handleImageUpload}
                          ref={fileInputRef}
                          type="file"
                        />
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>

          {isResizeMode && (
            <div className="-translate-x-1/2 pointer-events-none absolute bottom-8 left-1/2 z-20 w-[min(92vw,1120px)]">
              <div className="scrollbar-hide pointer-events-auto flex items-center justify-between gap-3 overflow-x-auto rounded-[28px] border border-border/50 bg-background/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
                <div className="flex min-w-max items-center gap-2">
                  <Popover
                    onOpenChange={setResizeRatioPickerOpen}
                    open={resizeRatioPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        className="h-10 shrink-0 rounded-[20px] bg-muted/35 px-4 font-medium text-foreground text-xs hover:bg-muted/45"
                        variant="ghost"
                      >
                        比例
                        <span className="ml-2 text-foreground/80">
                          {currentAspectRatioLabel}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[10020] w-[320px] rounded-[22px] border-border/60 bg-background/96 p-3 backdrop-blur-xl"
                      side="top"
                    >
                      <div className="mb-2 font-medium text-muted-foreground text-xs">
                        选择画布比例
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {aspectRatios.map((ratio) => (
                          <Button
                            className={cn(
                              "h-9 rounded-[16px] px-3 font-medium text-xs",
                              selectedAspectRatio === ratio.value && "shadow-sm"
                            )}
                            key={ratio.value}
                            onClick={() => {
                              handleAspectRatioSelect(
                                ratio.value === selectedAspectRatio
                                  ? null
                                  : ratio.value
                              );
                              setResizeRatioPickerOpen(false);
                            }}
                            size="sm"
                            variant={
                              selectedAspectRatio === ratio.value
                                ? "secondary"
                                : "ghost"
                            }
                          >
                            {ratio.label}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="h-7 w-px shrink-0 bg-border/60" />
                  <div className="flex items-center gap-2 rounded-[20px] bg-muted/30 px-2 py-1">
                    <Input
                      className="h-8 w-24 border-0 bg-transparent px-2 text-center text-sm shadow-none focus-visible:ring-0"
                      onChange={(e) =>
                        handleWidthChange(Number.parseInt(e.target.value) || 1)
                      }
                      type="number"
                      value={resizeCanvasWidth}
                    />
                    <span className="text-muted-foreground text-sm">×</span>
                    <Input
                      className="h-8 w-24 border-0 bg-transparent px-2 text-center text-sm shadow-none focus-visible:ring-0"
                      onChange={(e) =>
                        handleHeightChange(Number.parseInt(e.target.value) || 1)
                      }
                      type="number"
                      value={resizeCanvasHeight}
                    />
                  </div>
                  <div className="h-7 w-px shrink-0 bg-border/60" />
                  <div className="flex items-center gap-1 rounded-[22px] bg-muted/35 px-1 py-1">
                    {resizeQuickPresets.map((preset) => {
                      const isActive =
                        resizeCanvasWidth === preset.width &&
                        resizeCanvasHeight === preset.height;
                      return (
                        <Button
                          className={cn(
                            "h-8 whitespace-nowrap rounded-[18px] px-3 font-medium text-xs",
                            isActive && "shadow-sm"
                          )}
                          key={`${preset.width}x${preset.height}`}
                          onClick={() => handleResizeQuickPresetSelect(preset)}
                          size="sm"
                          variant={isActive ? "secondary" : "ghost"}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="h-7 w-px shrink-0 bg-border/60" />
                  <div className="flex min-w-[280px] items-center gap-3 rounded-[22px] bg-muted/35 px-3 py-2">
                    <span className="shrink-0 font-medium text-muted-foreground text-xs">
                      缩放
                    </span>
                    <Slider
                      className="w-[160px] shrink-0"
                      max={5}
                      min={0.1}
                      onValueChange={handleResizeScaleSliderChange}
                      rangeClassName="bg-emerald-400 dark:bg-emerald-400"
                      step={0.01}
                      thumbClassName="h-4 w-4 border border-emerald-300 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.18)] dark:bg-emerald-50"
                      trackClassName="h-1.5 bg-white/12 dark:bg-white/12"
                      value={[resizeImageScale]}
                    />
                    <span className="min-w-[48px] shrink-0 text-right font-medium text-foreground text-xs">
                      {(resizeImageScale * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-7 w-px shrink-0 bg-border/60" />
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-9 w-9 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={handleResizeZoomOut}
                          size="icon"
                          variant="ghost"
                        >
                          <ZoomOut className="h-4.5 w-4.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>缩小</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-9 w-9 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={handleResizeZoomIn}
                          size="icon"
                          variant="ghost"
                        >
                          <ZoomIn className="h-4.5 w-4.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>放大</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    className="rounded-[18px] px-4 text-muted-foreground hover:text-foreground"
                    onClick={onCancel}
                    variant="ghost"
                  >
                    取消
                  </Button>
                  <Button
                    className="rounded-[18px] bg-primary px-5 text-primary-foreground hover:bg-primary/90"
                    disabled={isResizing}
                    onClick={handleResizeConfirm}
                  >
                    {isResizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {resolvedConfirmButtonText}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isResizeMode && (
            <div className="-translate-x-1/2 pointer-events-none absolute bottom-8 left-1/2 z-20 w-[min(94vw,1120px)]">
              <div className="scrollbar-hide pointer-events-auto flex items-center justify-between gap-3 overflow-x-auto rounded-[28px] border border-border/60 bg-background px-3 py-2 shadow-2xl">
                <TooltipProvider delayDuration={0}>
                  <div className="flex min-w-max items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={isRemovingBg}
                          onClick={handleRemoveBackground}
                          size="icon"
                          variant="ghost"
                        >
                          <Scissors
                            className={cn(
                              "h-5 w-5",
                              isRemovingBg && "animate-spin"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>移除背景</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={isEnhancing}
                          onClick={handleEnhance}
                          size="icon"
                          variant="ghost"
                        >
                          <Sparkles
                            className={cn(
                              "h-5 w-5",
                              isEnhancing && "animate-spin"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>变清晰</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={isExtending}
                          onClick={handleExtend}
                          size="icon"
                          variant="ghost"
                        >
                          <Expand
                            className={cn(
                              "h-5 w-5",
                              isExtending && "animate-spin"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>图像拓展</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={isRemovingWatermark}
                          onClick={handleWatermarkRemove}
                          size="icon"
                          variant="ghost"
                        >
                          <Droplet
                            className={cn(
                              "h-5 w-5",
                              isRemovingWatermark && "animate-spin"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>去水印</TooltipContent>
                    </Tooltip>

                    <div className="mx-1 h-7 w-px shrink-0 bg-border/60" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={handleResize}
                          size="icon"
                          variant="ghost"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>尺寸调整</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={actions.length === 0}
                          onClick={handleUndo}
                          size="icon"
                          variant="ghost"
                        >
                          <Undo className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>撤销</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-10 w-10 rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={actions.length === 0}
                          onClick={handleClear}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>清空</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    className="rounded-[18px] px-4 text-muted-foreground hover:text-foreground"
                    onClick={onCancel}
                    variant="ghost"
                  >
                    取消
                  </Button>
                  <Button
                    className="rounded-[18px] bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                    onClick={handleConfirm}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {resolvedConfirmButtonText}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Text Input Modal */}
          {textPosition && (
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setTextPosition(null)}
            >
              <div
                className="rounded-lg border bg-background p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 font-medium text-sm">输入标注文字</div>
                <input
                  autoFocus
                  className="mb-3 w-64 rounded-md border bg-muted px-3 py-2 text-foreground outline-none focus:border-primary"
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddText();
                  }}
                  placeholder="输入文字..."
                  type="text"
                  value={textInput}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setTextPosition(null)}
                    size="sm"
                    variant="ghost"
                  >
                    取消
                  </Button>
                  <Button
                    disabled={!textInput.trim()}
                    onClick={handleAddText}
                    size="sm"
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
