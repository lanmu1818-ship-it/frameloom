// Modified for standalone community distribution; see NOTICE.
"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Edit, Target, Paintbrush, Sparkles, Scissors, Expand, Maximize2, Droplet } from "lucide-react";
import { toast } from "sonner";
import { ImageAnnotator } from "@/src/components/image-annotator";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import { apiFetch } from "@/src/client/api";

function triggerBrowserDownload(
  url: string,
  filename?: string,
  options?: { openInNewTab?: boolean }
) {
  const link = document.createElement("a");
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  if (options?.openInNewTab) {
    link.target = "_blank";
  }
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ImagePreview({
  src,
  alt,
  onImageEdit,
  onAnnotate,
  onDrawingComplete,
  onImageEnhance,
  onImageRmbg,
  onImageExtend,
  onImageWatermarkRemove,
  isProcessingEnhance,
  isProcessingRmbg,
  isProcessingExtend,
  isProcessingAngleEdit,
  isProcessingWatermarkRemove,
  imageIndex,
  compactGrid = false
}: {
  src: string;
  alt?: string;
  onImageEdit?: (imageUrl: string) => void;
  onAnnotate?: (annotation: {
    imageIndex: number;
    description: string;
    formattedText: string;
  }) => void;
  onDrawingComplete?: (annotatedImageUrl: string) => void;
  onImageEnhance?: (imageUrl: string) => void;
  onImageRmbg?: (imageUrl: string) => void;
  onImageExtend?: (imageUrl: string) => void;
  onImageAngleEdit?: (imageUrl: string) => void;
  onImageWatermarkRemove?: (imageUrl: string) => void;
  isProcessingEnhance?: boolean;
  isProcessingRmbg?: boolean;
  isProcessingExtend?: boolean;
  isProcessingAngleEdit?: boolean;
  isProcessingWatermarkRemove?: boolean;
  imageIndex?: number;
  compactGrid?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [showResizeEditor, setShowResizeEditor] = useState(false);

  // 调试日志：监控按钮状态变化
  useEffect(() => {
    console.log("[ImagePreview] 按钮状态更新:", {
      isProcessingEnhance,
      isProcessingRmbg,
      isProcessingExtend,
      isProcessingAngleEdit,
      isProcessingWatermarkRemove,
      src: src?.substring(0, 50)
    });
  }, [isProcessingEnhance, isProcessingRmbg, isProcessingExtend, isProcessingAngleEdit, isProcessingWatermarkRemove, src]);

  // 解析 alt 文本，提取原图 URL 和宽度
  // 格式优先级：
  // 1. thumb|||原图URL|||imageSize (最新格式，推荐，不会与 LaTeX/Markdown 冲突)
  // 2. thumb$$原图URL$$imageSize (旧格式，会被 LaTeX 解析器干扰)
  // 3. thumb|原图URL|imageSize (最旧格式)
  const parseImageUrls = () => {
    // 调试日志：查看接收到的 alt 和 src
    console.log("[ImagePreview] Parsing alt:", alt, "src:", src?.substring(0, 80));

    let originalUrl = src;
    let maxWidth = 500;
    let is4K = false;
    let parsed = false;

    const applySizeInfo = (rawSize?: string) => {
      if (!rawSize) return;
      const normalized = rawSize.trim().toLowerCase();

      if (normalized === "4k") {
        is4K = true;
        maxWidth = 500;
        return;
      }
      if (normalized === "2k") {
        is4K = false;
        maxWidth = 400;
        return;
      }
      if (normalized === "1k") {
        is4K = false;
        maxWidth = 300;
        return;
      }

      // 仅纯数字时才按像素宽度解析，避免 "2k" 被 parseInt 误解析成 2
      if (/^\d+$/.test(normalized)) {
        maxWidth = parseInt(normalized, 10);
      }
    };

    // 最新格式：使用 ||| 分隔 (不会与 LaTeX 数学公式或 Markdown 表格冲突)
    if (alt && alt.includes("thumb|||")) {
      const content = alt.substring(alt.indexOf("thumb|||") + 8);
      const parts = content.split("|||");
      originalUrl = parts[0];
      applySizeInfo(parts[1]);
      parsed = true;
      console.log("[ImagePreview] Parsed with ||| format:", { originalUrl: originalUrl?.substring(0, 80), is4K });
    }
    // 旧格式：使用 $$ 分隔 (可能被 LaTeX 干扰，保持向后兼容)
    else if (alt && alt.includes("thumb$$")) {
      const content = alt.substring(alt.indexOf("thumb$$") + 7);
      const parts = content.split("$$");
      originalUrl = parts[0];
      applySizeInfo(parts[1]);
      parsed = true;
      console.log("[ImagePreview] Parsed with $$ format:", { originalUrl: originalUrl?.substring(0, 80), is4K });
    }
    // 最旧格式：使用 | 分隔
    else if (alt && alt.includes("thumb|")) {
      const content = alt.substring(alt.indexOf("thumb|") + 6);
      const parts = content.split("|");
      originalUrl = parts[0];
      applySizeInfo(parts[1]);
      parsed = true;
      console.log("[ImagePreview] Parsed with | format:", { originalUrl: originalUrl?.substring(0, 80), is4K });
    }

    // 🛡️ 兜底策略：如果解析失败，或者解析出的 originalUrl 与 src 相同（意味着没提取到），
    // 尝试利用文件命名规律推导原图 URL
    if (!parsed || originalUrl === src) {
      if (src.includes("gemini-thumb-")) {
        originalUrl = src.replace("gemini-thumb-", "gemini-orig-");
        console.log("[ImagePreview] Inferred original URL from gemini-thumb filename");
      } else if (src.includes("openai-thumb-")) {
        originalUrl = src.replace("openai-thumb-", "openai-orig-");
        console.log("[ImagePreview] Inferred original URL from openai-thumb filename");
      } else if (src.includes("fal-image-thumb-")) {
        originalUrl = src.replace("fal-image-thumb-", "fal-image-orig-");
        console.log("[ImagePreview] Inferred original URL from fal-image-thumb filename");
      } else if (src.includes("/thumb/") || src.includes("-thumb")) {
        // 尝试从S3 URL中推断原图URL（常见格式：xxx-thumb.jpg -> xxx.jpg 或 xxx/thumb/xxx -> xxx/xxx）
        originalUrl = src.replace(/-thumb\./g, ".").replace(/\/thumb\//g, "/");
        console.log("[ImagePreview] Inferred original URL from S3 path pattern");
      } else {
        // 如果无法推断，且src看起来已经是完整的URL（不是缩略图），直接使用src作为原图
        // 否则记录警告
        if (src.startsWith("http://") || src.startsWith("https://")) {
          // 如果src已经是完整URL且不包含thumb标识，可能是原图
          if (!src.includes("thumb") && !src.includes("thumbnail")) {
            originalUrl = src;
            console.log("[ImagePreview] Using src as original URL (no thumb identifier found)");
          } else {
            console.log("[ImagePreview] ⚠️ Could not parse original URL, using thumbnail as fallback");
          }
        } else {
          console.log("[ImagePreview] ⚠️ Could not parse original URL, using thumbnail as fallback");
        }
      }
    }

    return {
      thumbnail: src,
      original: originalUrl,
      maxWidth,
      is4K,
    };
  };

  const { thumbnail, original, maxWidth, is4K } = parseImageUrls();
  const previewWidth = Math.min(2200, Math.max(640, Math.round(maxWidth * 2)));
  const previewSrc = buildImageProxyUrl(thumbnail || original, {
    width: previewWidth,
    quality: 86,
    format: "webp",
  });

  // 下载图片函数（下载原图）
  const handleDownload = async () => {
    const safeOriginalUrl = String(original || "").trim();
    if (!safeOriginalUrl) {
      toast.error("下载失败，请重试");
      return;
    }
    const filename = `generated-image-${Date.now()}.jpg`;
    try {
      const response = await fetch(
        buildImageProxyUrl(safeOriginalUrl, { delivery: "proxy" })
      );
      if (!response.ok) {
        throw new Error(`下载失败（${response.status}）`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      triggerBrowserDownload(url, filename);
      window.URL.revokeObjectURL(url);
      toast.success("下载成功");
    } catch (error) {
      console.error("下载失败:", error);
      try {
        triggerBrowserDownload(safeOriginalUrl, filename);
        toast.message("代理下载失败，已切换为原图直链下载");
      } catch (fallbackError) {
        console.error("原图直链下载失败:", fallbackError);
        try {
          triggerBrowserDownload(safeOriginalUrl, undefined, { openInNewTab: true });
          toast.message("已打开原图，可直接另存为");
        } catch (openError) {
          console.error("打开原图失败:", openError);
          toast.error("下载失败，请重试");
        }
      }
    }
  };

  // 处理图片点击（标注模式）
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAnnotationMode || isDetecting || !onAnnotate) return;

    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const clickX = Math.round(e.clientX - rect.left);
    const clickY = Math.round(e.clientY - rect.top);

    setIsDetecting(true);
    toast.info("正在识别物体...");

    try {
      const response = await apiFetch("/api/detect-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: original,
          clickX,
          clickY,
          imageIndex: imageIndex || 1,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        toast.success(`识别成功：${result.data.description}`);
        onAnnotate({
          imageIndex: result.data.imageIndex,
          description: result.data.description,
          formattedText: result.data.formattedText,
        });
        setIsOpen(false);
        setIsAnnotationMode(false);
      } else {
        toast.error(result.error || "识别失败，请重试");
      }
    } catch (error) {
      console.error("物体检测失败:", error);
      toast.error("识别失败，请检查网络连接");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <>
      {/* 缩略图（显示压缩后的缩略图）*/}
      <div
        className={
          compactGrid
            ? "group relative block aspect-[3/4] w-full overflow-hidden rounded-lg"
            : "group relative inline-block max-w-full mr-3 mb-3"
        }
      >
        <img
          src={previewSrc}
          alt="Generated Image"
          className={
            compactGrid
              ? "h-full w-full cursor-pointer rounded-lg object-cover transition-opacity hover:opacity-90"
              : "cursor-pointer rounded-lg transition-opacity hover:opacity-90"
          }
          style={{
            maxWidth: compactGrid ? "none" : `${maxWidth}px`,
            height: compactGrid ? "100%" : "auto",
            width: "100%",
            objectFit: compactGrid ? "cover" : "contain"
          }}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (event.currentTarget.src !== (thumbnail || original)) {
              event.currentTarget.src = thumbnail || original;
            }
          }}
          onClick={() => setIsOpen(true)}
        />

        {/* 左上角：变清晰、抠图和图像拓展按钮 - 始终显示 */}
        {(onImageEnhance || onImageRmbg || onImageExtend) && (
          <div className="absolute top-2 left-2 flex gap-1 z-10 flex-wrap">
            {onImageEnhance && (
              <button
                className="flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/80 px-2 py-1 text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessingEnhance && !isProcessingRmbg && !isProcessingExtend) {
                    onImageEnhance(original);
                  }
                }}
                disabled={isProcessingEnhance || isProcessingRmbg || isProcessingExtend}
                type="button"
                aria-label="变清晰"
                title="变清晰"
              >
                <Sparkles size={12} />
                <span className="text-[10px] font-medium">变清晰</span>
              </button>
            )}
            {onImageRmbg && (
              <button
                className="flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/80 px-2 py-1 text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessingEnhance && !isProcessingRmbg && !isProcessingExtend) {
                    onImageRmbg(original);
                  }
                }}
                disabled={isProcessingEnhance || isProcessingRmbg || isProcessingExtend}
                type="button"
                aria-label="抠图"
                title="抠图"
              >
                <Scissors size={12} />
                <span className="text-[10px] font-medium">抠图</span>
              </button>
            )}
            {onImageExtend && (
              <button
                className="flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/80 px-2 py-1 text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessingEnhance && !isProcessingRmbg && !isProcessingExtend && !isProcessingAngleEdit) {
                    onImageExtend(original);
                  }
                }}
                disabled={isProcessingEnhance || isProcessingRmbg || isProcessingExtend || isProcessingAngleEdit}
                type="button"
                aria-label="图像拓展"
                title="图像拓展"
              >
                <Expand size={12} />
                <span className="text-[10px] font-medium">图像拓展</span>
              </button>
            )}
            {onImageWatermarkRemove && (
              <button
                className="flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/80 px-2 py-1 text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessingEnhance && !isProcessingRmbg && !isProcessingExtend && !isProcessingAngleEdit && !isProcessingWatermarkRemove) {
                    onImageWatermarkRemove(original);
                  }
                }}
                disabled={isProcessingEnhance || isProcessingRmbg || isProcessingExtend || isProcessingAngleEdit || isProcessingWatermarkRemove}
                type="button"
                aria-label="去水印"
                title="去水印"
              >
                <Droplet size={12} />
                <span className="text-[10px] font-medium">去水印</span>
              </button>
            )}
            <button
              className="flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/80 px-2 py-1 text-white transition-colors shadow-lg whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                setShowResizeEditor(true);
              }}
              type="button"
              aria-label="尺寸调整"
              title="尺寸调整"
            >
              <Maximize2 size={12} />
              <span className="text-[10px] font-medium">尺寸调整</span>
            </button>
          </div>
        )}

        {/* 悬停时显示的操作按钮 */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {/* 画图按钮 */}
          {onDrawingComplete && (
            <button
              className="rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnnotator(true);
              }}
              type="button"
              aria-label="画图标注"
              title="画图标注"
            >
              <Paintbrush size={16} />
            </button>
          )}

          {/* 编辑按钮 */}
          {onImageEdit && (
            <button
              className="rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
              onClick={(e) => {
                e.stopPropagation();
                onImageEdit(original);
              }}
              type="button"
              aria-label="编辑图片"
            >
              <Edit size={16} />
            </button>
          )}

          {/* 下载按钮 */}
          <button
            className="rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90 flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            type="button"
            aria-label="下载图片"
            title={original !== thumbnail ? (is4K ? "下载4K原图" : "下载原图") : "下载图片"}
          >
            <Download size={16} />
            {original !== thumbnail && <span className="text-xs font-medium pr-1">{is4K ? "4K" : "原图"}</span>}
          </button>
        </div>
      </div>

      {/* 弹窗 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* 按钮组 */}
          <div className="absolute right-4 top-4 flex gap-2">
            {/* 下载按钮 (新增) */}
            <button
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              type="button"
              aria-label="下载图片"
              title={original !== thumbnail ? (is4K ? "下载4K原图" : "下载原图") : "下载图片"}
            >
              <Download size={24} />
              {original !== thumbnail && <span className="text-sm font-medium pr-1">{is4K ? "下载4K原图" : "下载原图"}</span>}
            </button>

            {/* 定位标注按钮 */}
            {onAnnotate && (
              <button
                className={`rounded-full p-2 text-white transition-colors ${
                  isAnnotationMode
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAnnotationMode(!isAnnotationMode);
                  if (!isAnnotationMode) {
                    toast.info("标注模式：点击图片中的物体进行识别");
                  }
                }}
                disabled={isDetecting}
                type="button"
                aria-label="定位标注"
                title="定位标注"
              >
                <Target size={24} />
              </button>
            )}

            {/* 画图标注按钮 */}
            {onDrawingComplete && (
              <button
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnnotator(true);
                  setIsOpen(false);
                }}
                type="button"
                aria-label="画图标注"
                title="画图标注"
              >
                <Paintbrush size={24} />
              </button>
            )}

            {/* 编辑按钮 */}
            {onImageEdit && (
              <button
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageEdit(original);
                  setIsOpen(false);
                }}
                type="button"
                aria-label="编辑图片"
                title="编辑图片"
              >
                <Edit size={24} />
              </button>
            )}

            {/* 下载按钮 */}
            <button
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              type="button"
              aria-label="下载图片"
              title="下载图片"
            >
              <Download size={24} />
            </button>

            {/* 关闭按钮 */}
            <button
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={() => {
                setIsOpen(false);
                setIsAnnotationMode(false);
              }}
              type="button"
              aria-label="关闭"
              title="关闭"
            >
              <X size={24} />
            </button>
          </div>

          {/* 标注模式提示 */}
          {isAnnotationMode && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 transform">
              <div className="rounded-full bg-blue-500 px-4 py-2 text-sm text-white shadow-lg">
                点击图片中的物体进行标注
              </div>
            </div>
          )}

          {/* 大图（显示原图）*/}
          <div
            className={`relative max-h-[90vh] max-w-[90vw] ${
              isDetecting ? "opacity-50" : ""
            }`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <img
              src={original}
              alt="Generated Image - Original"
              className={`max-h-[90vh] max-w-full rounded-lg object-contain ${
                isAnnotationMode ? "cursor-crosshair" : ""
              }`}
              style={{ maxWidth: "90vw" }}
              onClick={handleImageClick}
            />

            {/* 加载状态 */}
            {isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-3 rounded-lg bg-black/70 px-6 py-3 text-white">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>正在识别...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 图片编辑器 */}
      {showAnnotator && onDrawingComplete && (
        <ImageAnnotator
          imageUrl={original}
          onConfirm={(annotatedImageUrl) => {
            onDrawingComplete(annotatedImageUrl);
            setShowAnnotator(false);
            toast.success("编辑图片已添加到聊天");
          }}
          submitMode="publish-new-canvas"
          onCancel={() => setShowAnnotator(false)}
        />
      )}

      {/* 尺寸调整编辑器 */}
      {showResizeEditor && (
        <ImageAnnotator
          imageUrl={original}
          initialResizeMode={true}
          onConfirm={(resizedImageUrl) => {
            // 尺寸调整完成后，将图片添加到聊天
            if (onDrawingComplete) {
              onDrawingComplete(resizedImageUrl);
              toast.success("尺寸调整图片已添加到聊天");
            }
            setShowResizeEditor(false);
          }}
          onCancel={() => setShowResizeEditor(false)}
        />
      )}

    </>
  );
}
