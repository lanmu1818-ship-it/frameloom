// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Layers3,
  Loader2,
  MonitorSmartphone,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { UiScreenRenderer } from "@/src/components/canvas/ui/UiScreenRenderer";
import {
  getCanvasToolbarItem,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import { apiFetch } from "@/src/client/api";
import { normalizeUiScreenDocument, type UiScreenLayer } from "@/src/lib/ui-screen/schema";
import type { UiScreenPatch } from "@/src/lib/ui-screen/patch";
import type { UiScreenValidationResult } from "@/src/lib/ui-screen/validation";
import { cn } from "@/src/lib/utils";
import { useCanvasStore } from "@/src/store/canvas/index";
import type { CanvasNode, UiScreenNodeData } from "@/types/canvas/index";

interface UiScreenNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  canvasToolbarConfig?: CanvasToolbarConfig;
}

const STATUS_LABELS = {
  pending: "待生成",
  generating: "渲染中",
  completed: "可编辑 UI",
  failed: "失败",
} as const;

const STATUS_CLASS_MAP = {
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  generating: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

type ValidationSummary = {
  score: number;
  issueCount: number;
  patchedCount: number;
};

type UiScreenReviewResponse = {
  success?: boolean;
  error?: string;
  data?: {
    validation?: UiScreenValidationResult;
    patch?: UiScreenPatch;
    patchedDocument?: unknown;
  };
};

function findLayerById(layers: UiScreenLayer[], id: string | null): UiScreenLayer | null {
  if (!id) return null;
  for (const layer of layers) {
    if (layer.id === id) return layer;
    const child = layer.children ? findLayerById(layer.children, id) : null;
    if (child) return child;
  }
  return null;
}

function getEditableLayerText(layer: UiScreenLayer | null) {
  if (!layer) return null;
  if (layer.kind === "text") return layer.text || "";
  if (layer.kind === "button" || layer.kind === "badge") return layer.label || layer.text || "";
  return null;
}

function updateLayerText(
  layers: UiScreenLayer[],
  targetLayerId: string,
  nextText: string
): UiScreenLayer[] {
  return layers.map((layer) => {
    const children = layer.children
      ? updateLayerText(layer.children, targetLayerId, nextText)
      : undefined;

    if (layer.id !== targetLayerId) {
      return children ? { ...layer, children } : layer;
    }

    if (layer.kind === "text") {
      return { ...layer, children, text: nextText };
    }
    if (layer.kind === "button" || layer.kind === "badge") {
      return { ...layer, children, label: nextText };
    }

    return children ? { ...layer, children } : layer;
  });
}

export function UiScreenNode({
  node,
  isSelected,
  canvasToolbarConfig,
}: UiScreenNodeProps) {
  const data = node.data as UiScreenNodeData;
  const uiScreenReviewItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "uiScreenReview"
  );
  const uiScreenDeleteItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "uiScreenDelete"
  );
  const uiScreenSaveTextItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "uiScreenSaveText"
  );
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);

  const document = useMemo(
    () => normalizeUiScreenDocument(data.document),
    [data.document]
  );

  const selectedLayer = useMemo(
    () => (document ? findLayerById(document.layers, selectedLayerId) : null),
    [document, selectedLayerId]
  );
  const editableText = getEditableLayerText(selectedLayer);

  useEffect(() => {
    setDraftText(editableText ?? "");
  }, [editableText, selectedLayerId]);

  const status = data.status || "completed";
  const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.completed;
  const statusClassName = STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP.completed;
  const currentScore = validationSummary?.score ?? data.evaluation?.score;
  const currentIssueCount =
    validationSummary?.issueCount ?? data.evaluation?.issues?.length ?? null;
  const scoreClassName =
    typeof currentScore === "number" && currentScore >= 82
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  const handleSaveLayerText = () => {
    if (!selectedLayer || editableText === null) return;
    const nextDocument = {
      ...data.document,
      layers: updateLayerText(data.document.layers, selectedLayer.id, draftText),
    };
    updateNode(node.id, {
      data: {
        ...data,
        document: nextDocument,
      },
    });
  };

  const handleReviewAndPatch = async () => {
    if (!document || isReviewing) return;
    setIsReviewing(true);

    try {
      const response = await apiFetch("/api/canvas/ui-screen/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document,
          applyAutoPatch: true,
        }),
      });
      const payload = (await response.json()) as UiScreenReviewResponse;
      if (!response.ok || !payload.success || !payload.data?.validation) {
        throw new Error(payload.error || "UI Screen 质检失败");
      }

      const validation = payload.data.validation;
      const patch = payload.data.patch;
      const patchedDocument =
        normalizeUiScreenDocument(payload.data.patchedDocument) || document;
      const patchedCount =
        patch?.operations.filter((operation) => operation.op !== "set_validation").length || 0;

      updateNode(node.id, {
        data: {
          ...data,
          document: patchedDocument,
          evaluation: {
            score: validation.score,
            issues: validation.issues.map((issue) => issue.message).slice(0, 12),
            reviewedAt: new Date().toISOString(),
          },
          metadata: {
            ...(data.metadata || {}),
            uiScreenValidation: validation,
            uiScreenPatch: patch,
          },
        },
      });

      setValidationSummary({
        score: validation.score,
        issueCount: validation.issues.length,
        patchedCount,
      });

      if (patchedCount > 0) {
        toast.success(`已自动修复 ${patchedCount} 项 UI 问题`);
      } else if (validation.passed) {
        toast.success("UI Screen 质检通过");
      } else {
        toast.message(`发现 ${validation.issues.length} 项需要人工确认的问题`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "UI Screen 质检失败");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-visible rounded-[14px] border bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]",
        isSelected ? "border-brand-selection ring-2 ring-brand-selection/20" : "border-slate-200"
      )}
    >
      {document ? (
        <UiScreenRenderer
          document={document}
          interactive={isSelected}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          className="rounded-[13px]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[13px] bg-slate-50 p-6 text-center text-slate-500">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div>
            <div className="text-sm font-semibold text-slate-700">UI 文档不可渲染</div>
            <div className="mt-1 text-xs">缺少有效的 ui-screen/v1 layers</div>
          </div>
        </div>
      )}

      {isSelected ? (
        <>
          <div
            className="absolute left-3 top-3 z-30 flex items-center gap-2"
            data-canvas-no-drag="true"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Badge className={cn("gap-1.5 border px-2 py-1 text-[11px]", statusClassName)}>
              <MonitorSmartphone className="h-3 w-3" />
              {statusLabel}
            </Badge>
            {document?.title ? (
              <Badge variant="secondary" className="max-w-[220px] truncate px-2 py-1 text-[11px]">
                {document.title}
              </Badge>
            ) : null}
            {typeof currentScore === "number" ? (
              <Badge className={cn("gap-1.5 border px-2 py-1 text-[11px]", scoreClassName)}>
                {currentScore >= 82 ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                UI {currentScore}
                {currentIssueCount ? ` · ${currentIssueCount}` : ""}
              </Badge>
            ) : null}
          </div>

          <div
            className="absolute right-3 top-3 z-30 flex items-center gap-2"
            data-canvas-no-drag="true"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={uiScreenReviewItem.label}
              className="h-8 w-8 rounded-full border-slate-200 bg-white text-slate-600 shadow-sm hover:border-brand-selection hover:bg-brand-accent/10 hover:text-brand-selection"
              disabled={!document || isReviewing}
              onClick={(event) => {
                event.stopPropagation();
                void handleReviewAndPatch();
              }}
              size="icon"
              title={uiScreenReviewItem.label}
              type="button"
              variant="outline"
            >
              {isReviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CanvasToolbarIcon
                  className="h-4 w-4"
                  fallback={Wand2}
                  item={uiScreenReviewItem}
                />
              )}
            </Button>
            <Button
              aria-label={uiScreenDeleteItem.label}
              className="h-8 w-8 rounded-full border-slate-200 bg-white text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={(event) => {
                event.stopPropagation();
                deleteNode(node.id);
              }}
              size="icon"
              title={uiScreenDeleteItem.label}
              type="button"
              variant="outline"
            >
              <CanvasToolbarIcon
                className="h-4 w-4"
                fallback={Trash2}
                item={uiScreenDeleteItem}
              />
            </Button>
          </div>

          {selectedLayer ? (
            <div
              className="absolute bottom-3 left-3 z-30 max-w-[70%] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur"
              data-canvas-no-drag="true"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Layers3 className="h-3.5 w-3.5 text-brand-selection" />
                <span className="truncate">{selectedLayer.name || selectedLayer.id}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {selectedLayer.kind}
                {selectedLayer.bounds
                  ? ` · ${Math.round(selectedLayer.bounds.width)}x${Math.round(selectedLayer.bounds.height)}`
                  : ""}
              </div>
              {editableText !== null ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-800 outline-none transition focus:border-brand-selection focus:ring-2 focus:ring-brand-selection/20"
                    data-canvas-no-drag="true"
                    onChange={(event) => setDraftText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSaveLayerText();
                      }
                    }}
                    value={draftText}
                  />
                  <Button
                    className="h-8 rounded-lg px-2 text-[12px]"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSaveLayerText();
                    }}
                    size="sm"
                    title={uiScreenSaveTextItem.label}
                    type="button"
                  >
                    <CanvasToolbarIcon
                      className="mr-1 h-3.5 w-3.5"
                      fallback={Check}
                      item={uiScreenSaveTextItem}
                    />
                    {uiScreenSaveTextItem.label}
                  </Button>
                </div>
              ) : null}
              {validationSummary ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
                  质检 {validationSummary.score} · 问题 {validationSummary.issueCount} · 自动修复{" "}
                  {validationSummary.patchedCount}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className="absolute bottom-3 left-3 z-30 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur"
              data-canvas-no-drag="true"
              onPointerDown={(event) => event.stopPropagation()}
            >
              点击内部图层可选中
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
