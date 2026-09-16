// Modified for standalone community distribution; see NOTICE.
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { useCanvasStore } from "@/src/store/canvas/index";
import {
  getCanvasToolbarItem,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import type { CanvasNode, TextNodeData } from "@/types/canvas/index";
import { cn } from "@/src/lib/utils";
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from "@/src/client/upload-with-retry";
import { toast } from "sonner";

interface TextNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  canvasToolbarConfig?: CanvasToolbarConfig;
}

const DEFAULT_TEXT_NODE_COLOR = "#111827";
const PASTED_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const PASTED_IMAGE_MAX_SIZE = 360;
const PASTED_IMAGE_MIN_SIZE = 140;

function getPastedImageDimensions(file: File): Promise<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ width: 300, height: 240, originalWidth: 0, originalHeight: 0 });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const originalWidth = img.naturalWidth || 300;
      const originalHeight = img.naturalHeight || 240;
      let width = originalWidth;
      let height = originalHeight;

      if (width > PASTED_IMAGE_MAX_SIZE || height > PASTED_IMAGE_MAX_SIZE) {
        const scale = Math.min(PASTED_IMAGE_MAX_SIZE / width, PASTED_IMAGE_MAX_SIZE / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      if (width < PASTED_IMAGE_MIN_SIZE && height < PASTED_IMAGE_MIN_SIZE) {
        const scale = PASTED_IMAGE_MIN_SIZE / Math.max(1, Math.min(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      URL.revokeObjectURL(url);
      resolve({ width, height, originalWidth, originalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 300, height: 240, originalWidth: 0, originalHeight: 0 });
    };
    img.src = url;
  });
}

export function TextNode({
  node,
  isSelected,
  canvasToolbarConfig,
}: TextNodeProps) {
  const data = node.data as TextNodeData;
  const textDeleteItem = getCanvasToolbarItem(canvasToolbarConfig, "textDelete");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content);
  const [isUploadingPastedImage, setIsUploadingPastedImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateNode = useCanvasStore((state) => state.updateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addNode = useCanvasStore((state) => state.addNode);
  const selectNode = useCanvasStore((state) => state.selectNode);

  // 进入编辑模式时聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // 保存编辑
  const handleSave = () => {
    updateNode(node.id, {
      data: {
        ...data,
        color: data.color || DEFAULT_TEXT_NODE_COLOR,
        content: editContent,
      },
    });
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditContent(data.content);
    setIsEditing(false);
  };

  // 双击进入编辑
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handlePasteImages = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploadingPastedImage(true);
    let addedCount = 0;

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file.type.startsWith("image/")) continue;
        if (file.size > PASTED_IMAGE_MAX_BYTES) {
          toast.error("图片大小不能超过 50MB");
          continue;
        }

        const ext = file.type.split("/")[1] || "png";
        const fileName =
          (file.name || "").trim() || `粘贴图片-${Date.now()}-${index + 1}.${ext}`;
        const title = fileName.replace(/\.[^.]+$/, "") || "粘贴图片";
        const dimensions = await getPastedImageDimensions(file);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "canvas-upload");

        try {
          const response = await fetchUploadWithRetry(formData);
          if (!response.ok) {
            throw await createUploadErrorFromResponse(response, "图片上传失败");
          }

          const payload = await response.json();
          const imageUrl = typeof payload?.url === "string" ? payload.url : "";
          if (!imageUrl) {
            throw new Error("上传结果缺少图片地址");
          }

          const assetId =
            typeof payload?.assetId === "string" && payload.assetId.trim()
              ? payload.assetId.trim()
              : undefined;
          const newNodeId = addNode({
            type: "image",
            position: {
              x: node.position.x + node.size.width + 32 + index * 24,
              y: node.position.y + index * 24,
            },
            size: { width: dimensions.width, height: dimensions.height },
            data: {
              src: imageUrl,
              assetId,
              status: "completed",
              title,
              prompt: title,
              metadata: {
                source: "text-node-paste",
                sourceTextNodeId: node.id,
                originalWidth: dimensions.originalWidth,
                originalHeight: dimensions.originalHeight,
              },
            },
            connections: [],
          });

          selectNode(newNodeId);
          addedCount += 1;
        } catch (error) {
          const message = getUploadErrorMessage(error, "图片上传失败");
          if (message) {
            toast.error(message);
          }
        }
      }

      if (addedCount > 0) {
        toast.success(addedCount === 1 ? "已粘贴图片到画布" : `已粘贴 ${addedCount} 张图片到画布`);
      }
    } finally {
      setIsUploadingPastedImage(false);
    }
  }, [addNode, node.id, node.position.x, node.position.y, node.size.width, selectNode]);

  const containerStyle = data.transparent
    ? undefined
    : {
        backgroundColor: data.backgroundColor || undefined,
        borderColor: data.borderColor || undefined,
        borderWidth:
          typeof data.borderWidth === "number" ? `${data.borderWidth}px` : undefined,
        borderStyle:
          typeof data.borderWidth === "number" && data.borderWidth > 0 ? "solid" : undefined,
        borderRadius:
          typeof data.borderRadius === "number" ? `${data.borderRadius}px` : undefined,
        padding: typeof data.padding === "number" ? `${data.padding}px` : undefined,
        boxShadow: data.boxShadow || undefined,
        backdropFilter:
          typeof data.backdropBlur === "number" && data.backdropBlur > 0
            ? `blur(${data.backdropBlur}px)`
            : undefined,
        WebkitBackdropFilter:
          typeof data.backdropBlur === "number" && data.backdropBlur > 0
            ? `blur(${data.backdropBlur}px)`
            : undefined,
      };

  const textStyle = {
    fontSize: data.fontSize || 14,
    fontFamily: data.fontFamily || undefined,
    color: data.color || DEFAULT_TEXT_NODE_COLOR,
    fontWeight: data.fontWeight || "normal",
    lineHeight: data.lineHeight || 1.35,
    letterSpacing:
      typeof data.letterSpacing === "number" ? `${data.letterSpacing}px` : undefined,
    textAlign: data.textAlign || "left",
    textTransform: data.textTransform || "none",
  } as const;

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden p-3",
        data.transparent
          ? "rounded-none border-0 bg-transparent p-0 shadow-none"
          : "rounded-lg border bg-card shadow-sm",
        isSelected && (data.transparent ? "ring-1 ring-primary/50" : "border-primary")
      )}
      onDoubleClick={handleDoubleClick}
      style={containerStyle}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onPaste={(e) => {
            const imageFiles = Array.from(e.clipboardData?.items || [])
              .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file));

            if (imageFiles.length === 0) return;

            e.preventDefault();
            void handlePasteImages(imageFiles);
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleSave();
            }
            if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          className="w-full h-full resize-none bg-transparent outline-none text-sm"
          style={textStyle}
        />
      ) : (
        <div
          className="w-full h-full overflow-auto text-sm whitespace-pre-wrap"
          style={textStyle}
        >
          {data.content || '双击编辑文本'}
        </div>
      )}

      {isEditing && isUploadingPastedImage ? (
        <div className="absolute bottom-2 left-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
          正在粘贴图片...
        </div>
      ) : null}

      {!isEditing && isSelected ? (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
            className={cn(
              "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-destructive",
              data.transparent
                ? "border-slate-200 bg-white/95 shadow-sm hover:border-destructive/30 hover:bg-red-50"
                : "border-slate-200 bg-white hover:border-destructive/30 hover:bg-red-50"
            )}
            aria-label={textDeleteItem.label}
            title={textDeleteItem.label}
          >
            <CanvasToolbarIcon
              className="h-4 w-4"
              fallback={Trash2}
              item={textDeleteItem}
            />
          </button>

          <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
            双击编辑
          </div>
        </>
      ) : null}
    </div>
  );
}
