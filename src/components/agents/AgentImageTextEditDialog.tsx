// Modified for standalone community distribution; see NOTICE.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Trash2, Type, X } from "lucide-react";
import { toast } from "sonner";
import { TextEditColorField } from "@/src/components/canvas/TextEditColorField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { normalizeOptionalHexColor } from "@/src/lib/canvas/text-edit-colors";
import {
  imageGenerationService,
  type CanvasTextEditPayloadItem,
  type CanvasTextSuggestionItem,
} from "@/src/services/canvas/index";

interface AgentImageTextEditDialogProps {
  open: boolean;
  imageUrl?: string | null;
  title?: string | null;
  onOpenChange: (open: boolean) => void;
  onApplySuccess?: (result: { originalUrl: string; thumbnailUrl?: string | null; model?: string | null }) => void;
  copySuggestionContext?: {
    audience?: string | null;
    usageScenario?: string | null;
    coreNeed?: string | null;
    productName?: string | null;
    workflowSummary?: string | null;
    workflowPrompt?: string | null;
    userPrompt?: string | null;
    presetName?: string | null;
  } | null;
}

interface AgentImageTextEditItem {
  id: string;
  originalText: string;
  editedText: string;
  textColor?: string;
  confidence?: number;
}

interface DeletedTextItem {
  id: string;
  originalText: string;
}

interface SuggestionStateItem {
  isLoading: boolean;
  suggestions: CanvasTextSuggestionItem[];
  error?: string | null;
  model?: string | null;
}

function buildTextEditRequestItems(
  textEditItems: AgentImageTextEditItem[],
  deletedTextItems: DeletedTextItem[]
) {
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

  return [...changedItems, ...removedItems];
}

function isHttpImageUrl(value?: string | null) {
  if (!value) return false;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getComparableImageIdentity(value?: string | null) {
  const raw = String(value || "").trim();
  if (!isHttpImageUrl(raw)) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    return raw.split("#")[0]?.split("?")[0]?.trim().toLowerCase() || "";
  }
}

function isSameImageAsset(left?: string | null, right?: string | null) {
  const leftIdentity = getComparableImageIdentity(left);
  const rightIdentity = getComparableImageIdentity(right);
  return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
}

export function AgentImageTextEditDialog({
  open,
  imageUrl,
  title,
  onOpenChange,
  onApplySuccess,
  copySuggestionContext = null,
}: AgentImageTextEditDialogProps) {
  const normalizedImageUrl = useMemo(() => String(imageUrl || "").trim(), [imageUrl]);
  const [textEditItems, setTextEditItems] = useState<AgentImageTextEditItem[]>([]);
  const [deletedTextItems, setDeletedTextItems] = useState<DeletedTextItem[]>([]);
  const [isDetectingText, setIsDetectingText] = useState(false);
  const [isApplyingTextEdit, setIsApplyingTextEdit] = useState(false);
  const [textEditError, setTextEditError] = useState<string | null>(null);
  const [detectedSourceUrl, setDetectedSourceUrl] = useState<string | null>(null);
  const [suggestionState, setSuggestionState] = useState<Record<string, SuggestionStateItem>>({});

  const copyContextSummary = useMemo(() => {
    const chips = [
      copySuggestionContext?.audience ? `人群：${copySuggestionContext.audience}` : "",
      copySuggestionContext?.usageScenario ? `场景：${copySuggestionContext.usageScenario}` : "",
      copySuggestionContext?.coreNeed ? `需求：${copySuggestionContext.coreNeed}` : "",
    ].filter(Boolean);
    return chips.join(" / ");
  }, [
    copySuggestionContext?.audience,
    copySuggestionContext?.coreNeed,
    copySuggestionContext?.usageScenario,
  ]);

  const detectTextItems = useCallback(
    async (forceRefresh = false) => {
      if (!normalizedImageUrl) {
        setTextEditItems([]);
        setDeletedTextItems([]);
        setTextEditError("当前图片地址无效");
        return;
      }

      if (!isHttpImageUrl(normalizedImageUrl)) {
        setTextEditItems([]);
        setDeletedTextItems([]);
        setTextEditError("仅支持 URL 图片，不允许 base64 传输");
        return;
      }

      if (isDetectingText) {
        return;
      }

      if (!forceRefresh && detectedSourceUrl === normalizedImageUrl && textEditItems.length > 0) {
        setDeletedTextItems([]);
        setTextEditError(null);
        return;
      }

      setIsDetectingText(true);
      setTextEditError(null);

      try {
        const result = await imageGenerationService.detectCanvasText(normalizedImageUrl);
        if (!result.success) {
          throw new Error(result.error || "文字识别失败");
        }

        const detectedItems: AgentImageTextEditItem[] = [];
        (result.data?.items || []).forEach((item, index) => {
          const text = String(item.text || "").trim();
          if (!text) {
            return;
          }
          detectedItems.push({
            id: item.id || String(index + 1),
            originalText: text,
            editedText: text,
            textColor: undefined,
            confidence: item.confidence,
          });
        });

        setTextEditItems(detectedItems);
        setDeletedTextItems([]);
        setDetectedSourceUrl(normalizedImageUrl);

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
    [detectedSourceUrl, isDetectingText, normalizedImageUrl, textEditItems.length]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setTextEditError(null);

    if (detectedSourceUrl === normalizedImageUrl && textEditItems.length > 0) {
      setDeletedTextItems([]);
      return;
    }

    setTextEditItems([]);
    setDeletedTextItems([]);
    setSuggestionState({});
    void detectTextItems(true);
  }, [detectTextItems, detectedSourceUrl, normalizedImageUrl, open, textEditItems.length]);

  const handleTextItemChange = useCallback((id: string, value: string) => {
    setTextEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, editedText: value } : item))
    );
  }, []);

  const handleTextItemColorChange = useCallback((id: string, value?: string) => {
    setTextEditItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, textColor: normalizeOptionalHexColor(value) }
          : item
      )
    );
  }, []);

  const handleRemoveTextItem = useCallback((id: string) => {
    setTextEditItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target?.originalText) {
        return prev.filter((item) => item.id !== id);
      }
      setDeletedTextItems((deletedPrev) => {
        if (deletedPrev.some((item) => item.id === id)) {
          return deletedPrev;
        }
        return [...deletedPrev, { id, originalText: target.originalText }];
      });
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const textEditRequestItems = useMemo(
    () => buildTextEditRequestItems(textEditItems, deletedTextItems),
    [deletedTextItems, textEditItems]
  );
  const hasTextEditChanges = textEditRequestItems.length > 0;

  const handleGenerateSuggestions = useCallback(
    async (item: AgentImageTextEditItem) => {
      if (!normalizedImageUrl) {
        toast.error("当前图片地址无效");
        return;
      }

      if (!isHttpImageUrl(normalizedImageUrl)) {
        toast.error("仅支持 URL 图片，不允许 base64 传输");
        return;
      }

      setSuggestionState((current) => ({
        ...current,
        [item.id]: {
          isLoading: true,
          suggestions: current[item.id]?.suggestions || [],
          error: null,
          model: current[item.id]?.model || null,
        },
      }));

      try {
        const result = await imageGenerationService.generateCanvasTextSuggestions({
          imageUrl: normalizedImageUrl,
          originalText: item.originalText,
          currentText: item.editedText,
          title: title || undefined,
          pageTexts: textEditItems.map((entry) => entry.editedText.trim() || entry.originalText.trim()),
          audience: copySuggestionContext?.audience || undefined,
          usageScenario: copySuggestionContext?.usageScenario || undefined,
          coreNeed: copySuggestionContext?.coreNeed || undefined,
          productName: copySuggestionContext?.productName || undefined,
          workflowSummary: copySuggestionContext?.workflowSummary || undefined,
          workflowPrompt: copySuggestionContext?.workflowPrompt || undefined,
          userPrompt: copySuggestionContext?.userPrompt || undefined,
          presetName: copySuggestionContext?.presetName || undefined,
        });

        const currentItem = textEditItems.find((entry) => entry.id === item.id);
        const blockedTexts = new Set(
          [item.originalText, currentItem?.editedText]
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        );
        const suggestions = (result.data?.suggestions || []).filter((suggestion) => {
          const text = String(suggestion.text || "").trim();
          return Boolean(text) && !blockedTexts.has(text);
        });

        if (!result.success || suggestions.length === 0) {
          throw new Error(result.error || "未生成可用文案建议");
        }

        setSuggestionState((current) => ({
          ...current,
          [item.id]: {
            isLoading: false,
            suggestions,
            error: null,
            model: result.data?.model || null,
          },
        }));
        toast.success("已生成 5 条 AI 文案建议");
      } catch (error) {
        const message = error instanceof Error ? error.message : "文案建议生成失败";
        setSuggestionState((current) => ({
          ...current,
          [item.id]: {
            isLoading: false,
            suggestions: current[item.id]?.suggestions || [],
            error: message,
            model: current[item.id]?.model || null,
          },
        }));
        toast.error(message);
      }
    },
    [copySuggestionContext, normalizedImageUrl, textEditItems, title]
  );

  const handleApplySuggestion = useCallback((id: string, value: string) => {
    const nextText = String(value || "").trim();
    const target = textEditItems.find((item) => item.id === id);
    if (!nextText) {
      toast.info("这条推荐文案为空，请换一条");
      return;
    }
    if (target && nextText === target.originalText.trim()) {
      toast.info("这条和原文一样，不会触发生成，请换一条推荐文案");
      return;
    }
    if (target && nextText === target.editedText.trim()) {
      toast.info("这条已经在输入框里了");
      return;
    }

    handleTextItemChange(id, nextText);
    toast.success("已套用推荐文案，可以点击确定生图");
  }, [handleTextItemChange, textEditItems]);

  const handleApplyTextEdit = useCallback(async () => {
    if (!normalizedImageUrl) {
      toast.error("当前图片地址无效");
      return;
    }

    if (!isHttpImageUrl(normalizedImageUrl)) {
      toast.error("仅支持 URL 图片，不允许 base64 传输");
      return;
    }

    if (isApplyingTextEdit) {
      return;
    }

    if (textEditRequestItems.length === 0) {
      toast.info("请先修改文字、选择文字颜色，或点击垃圾桶删除该文字");
      return;
    }

    setIsApplyingTextEdit(true);
    setTextEditError(null);

    try {
      const result = await imageGenerationService.editCanvasText({
        imageUrl: normalizedImageUrl,
        items: textEditRequestItems,
      });

      if (!result.success || !result.data?.originalUrl) {
        throw new Error(result.error || "文字替换失败");
      }

      if (isSameImageAsset(result.data.originalUrl, normalizedImageUrl)) {
        throw new Error("模型返回的仍是原图，未完成文字替换，请换一条文案或稍后重试");
      }

      toast.success("文字替换已完成");
      setDeletedTextItems([]);
      setDetectedSourceUrl(result.data.originalUrl);
      onApplySuccess?.({
        originalUrl: result.data.originalUrl,
        thumbnailUrl: result.data.thumbnailUrl,
        model: result.data.model || null,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "文字替换失败";
      setTextEditError(message);
      toast.error(message);
    } finally {
      setIsApplyingTextEdit(false);
    }
  }, [
    isApplyingTextEdit,
    normalizedImageUrl,
    onApplySuccess,
    onOpenChange,
    textEditRequestItems,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-slate-200 bg-white p-0 sm:max-w-[620px] dark:border-zinc-800 dark:bg-zinc-950">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-left text-lg">
            <Type className="h-5 w-5" />
            <span>编辑文字</span>
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-6 text-slate-500 dark:text-zinc-400">
            识别图片文字后可逐条修改或删除，应用后会在保持画面风格的前提下完成文字更新。
            {title ? ` 当前处理：${title}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="agent-dark-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {normalizedImageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900">
              <img
                src={normalizedImageUrl}
                alt={title || "待编辑结果图"}
                className="block max-h-[240px] w-full object-contain"
              />
            </div>
          ) : null}

          {copyContextSummary ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              AI 文案建议会优先参考：{copyContextSummary}
            </div>
          ) : null}

          {isDetectingText ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在识别图片文字...
            </div>
          ) : null}

          {textEditError && !isDetectingText ? (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {textEditError}
            </div>
          ) : null}

          {!isDetectingText && textEditItems.length === 0 && !textEditError ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              未识别到可编辑文字，可点击“重新识别”再试一次。
            </div>
          ) : null}

          {textEditItems.map((item, index) => (
            <div
              key={item.id}
              className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  文本 {index + 1}
                  {typeof item.confidence === "number"
                    ? ` · 置信度 ${(item.confidence * 100).toFixed(0)}%`
                    : ""}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-500 hover:text-red-500 dark:text-zinc-400"
                  onClick={() => handleRemoveTextItem(item.id)}
                  title="删除该条文字"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-slate-500 dark:text-zinc-400">原文：{item.originalText}</div>
              <Input
                value={item.editedText}
                onChange={(event) => handleTextItemChange(item.id, event.target.value)}
                placeholder="输入替换后的文字"
              />
              <TextEditColorField
                value={item.textColor}
                onChange={(value) => handleTextItemColorChange(item.id, value)}
              />
              <div className="space-y-3 rounded-xl bg-slate-50/80 p-3 dark:bg-zinc-900/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    一键 AI 文案
                    {suggestionState[item.id]?.model
                      ? ` · ${suggestionState[item.id]?.model}`
                      : ""}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={suggestionState[item.id]?.isLoading || isApplyingTextEdit}
                    onClick={() => void handleGenerateSuggestions(item)}
                  >
                    {suggestionState[item.id]?.isLoading ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                    )}
                    {suggestionState[item.id]?.suggestions?.length ? "换一批" : "生成 5 条"}
                  </Button>
                </div>

                {suggestionState[item.id]?.error ? (
                  <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
                    {suggestionState[item.id]?.error}
                  </div>
                ) : null}

                {suggestionState[item.id]?.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    正在结合图片和人群信息生成文案建议...
                  </div>
                ) : null}

                {suggestionState[item.id]?.suggestions?.length ? (
                  <div className="space-y-2">
                    {suggestionState[item.id].suggestions.map((suggestion, suggestionIndex) => (
                      <button
                        key={`${item.id}-suggestion-${suggestionIndex}`}
                        type="button"
                        onClick={() => handleApplySuggestion(item.id, suggestion.text)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                      >
                        <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">
                          {suggestion.text}
                        </div>
                        {suggestion.reason ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                            {suggestion.reason}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : !suggestionState[item.id]?.isLoading ? (
                  <div className="text-xs leading-5 text-slate-500 dark:text-zinc-400">
                    会生成 5 条字数接近、语气更生活化的候选文案，点击即可替换到当前输入框。
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {deletedTextItems.length > 0 ? (
            <div className="rounded-xl border border-orange-300 border-dashed bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
              已标记删除 {deletedTextItems.length} 条文字，应用时会明确告诉生图模型移除这些文字并修复背景。
            </div>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            disabled={isDetectingText || isApplyingTextEdit}
            onClick={() => void detectTextItems(true)}
          >
            {isDetectingText ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            重新识别
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isApplyingTextEdit}
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button
              type="button"
              disabled={
                isDetectingText ||
                isApplyingTextEdit ||
                !hasTextEditChanges
              }
              onClick={() => void handleApplyTextEdit()}
            >
              {isApplyingTextEdit ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Type className="mr-2 h-4 w-4" />
              )}
              {hasTextEditChanges ? "确定生图" : "先修改文字"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
