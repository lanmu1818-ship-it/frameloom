// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  Bot,
  Clapperboard,
  FileOutput,
  Film,
  LayoutPanelTop,
  ScanSearch,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { useCanvasStore } from "@/src/store/canvas/index";
import {
  getCanvasToolbarItem,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import { cn } from "@/src/lib/utils";
import {
  getNodeContentScale,
  getScaledNodeContentStyle,
} from "@/src/lib/canvas/node-content-scale";
import {
  getVideoWorkflowNodeDefinition,
  getVideoWorkflowQuickConnectOutputs,
} from "@/src/lib/video-workflow/catalog";
import type { CanvasNode, WorkflowNodeData } from "@/types/canvas/index";

interface WorkflowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  canvasToolbarConfig?: CanvasToolbarConfig;
}

function toAlphaColor(color: string | undefined, alpha: number) {
  const normalized = String(color || "").trim();
  if (!normalized.startsWith("#")) return undefined;

  const hex = normalized.slice(1);
  if (hex.length !== 3 && hex.length !== 6) return undefined;

  const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return undefined;

  const red = (int >> 16) & 255;
  const green = (int >> 8) & 255;
  const blue = int & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const GROUP_META = {
  input: {
    label: "输入",
    icon: LayoutPanelTop,
  },
  analysis: {
    label: "分析",
    icon: ScanSearch,
  },
  storyboard: {
    label: "分镜",
    icon: Film,
  },
  generation: {
    label: "生成",
    icon: Sparkles,
  },
  character: {
    label: "角色场景",
    icon: Clapperboard,
  },
  tool: {
    label: "工具",
    icon: Bot,
  },
  output: {
    label: "输出",
    icon: FileOutput,
  },
} as const;

const GROUP_STYLE_MAP = {
  input: {
    surface: "#f4f7ff",
    border: "#dfe6ff",
    icon: "#e5ebff",
  },
  analysis: {
    surface: "#eefbf6",
    border: "#d6f1e6",
    icon: "#def6eb",
  },
  storyboard: {
    surface: "#fff7e1",
    border: "#f7e6b3",
    icon: "#ffefbf",
  },
  generation: {
    surface: "#fff1f4",
    border: "#f5d5dd",
    icon: "#ffe2e9",
  },
  character: {
    surface: "#f4efff",
    border: "#e4dbff",
    icon: "#ece5ff",
  },
  tool: {
    surface: "#f5f7fb",
    border: "#e4e8f0",
    icon: "#edf1f7",
  },
  output: {
    surface: "#eef6ff",
    border: "#d8e8ff",
    icon: "#deecff",
  },
} as const;

const STATUS_LABELS = {
  pending: "待配置",
  generating: "处理中",
  completed: "已完成",
  failed: "异常",
} as const;

const STATUS_CLASS_MAP = {
  pending: "border-slate-200 bg-white text-foreground/70 dark:border-zinc-800 dark:bg-zinc-950",
  generating:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  failed:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200",
} as const;

export function WorkflowNode({
  node,
  isSelected,
  canvasToolbarConfig,
}: WorkflowNodeProps) {
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const data = node.data as WorkflowNodeData;
  const workflowDeleteItem = getCanvasToolbarItem(
    canvasToolbarConfig,
    "workflowDelete"
  );
  const definition = getVideoWorkflowNodeDefinition(data.templateType);
  const contentScale = getNodeContentScale(
    node.size,
    definition?.size || {
      width: 300,
      height: 180,
    }
  );
  const scaledContentStyle = getScaledNodeContentStyle(contentScale);
  const metadata = (data.metadata || {}) as Record<string, any>;
  const quickConnectOutputs =
    data.templateType && definition
      ? getVideoWorkflowQuickConnectOutputs(definition.type)
      : [];
  const resolvedGroup = (data.group || definition?.group || "tool") as keyof typeof GROUP_META;
  const groupMeta = GROUP_META[resolvedGroup] || GROUP_META.tool;
  const GroupIcon = groupMeta.icon;
  const groupStyle = GROUP_STYLE_MAP[resolvedGroup] || GROUP_STYLE_MAP.tool;
  const accentColor = data.accentColor || definition?.accentColor || "#e2e8f0";
  const accentBarColor = toAlphaColor(accentColor, 0.92) || accentColor;
  const title = data.title || definition?.label || "工作流节点";
  const statusLabel = STATUS_LABELS[data.status] || STATUS_LABELS.pending;
  const statusClassName =
    STATUS_CLASS_MAP[data.status] || STATUS_CLASS_MAP.pending;

  const previewUrl = String(metadata.previewMediaUrl || metadata.resultMediaUrl || "").trim();
  const previewKind =
    String(metadata.previewMediaKind || metadata.resultMediaKind || "").trim() === "video"
      ? "video"
      : "image";
  const compareItems = Array.isArray(metadata.compareItems)
    ? metadata.compareItems.slice(0, 4)
    : [];
  const storyboardShots = Array.isArray(metadata.storyboardShots)
    ? metadata.storyboardShots.slice(0, 4)
    : [];
  const analysisHighlights = Array.isArray(metadata.analysisHighlights)
    ? metadata.analysisHighlights.slice(0, 4)
    : [];
  const tableRows = Array.isArray(metadata.tableRows) ? metadata.tableRows.slice(0, 4) : [];
  const characters = Array.isArray(metadata.characters) ? metadata.characters.slice(0, 4) : [];
  const scenes = Array.isArray(metadata.scenes) ? metadata.scenes.slice(0, 4) : [];
  const characterAssets = Array.isArray(metadata.characterAssets)
    ? metadata.characterAssets.slice(0, 4)
    : [];
  const sceneAssets = Array.isArray(metadata.sceneAssets)
    ? metadata.sceneAssets.slice(0, 4)
    : [];
  const agentPlan = Array.isArray(metadata.agentPlan) ? metadata.agentPlan.slice(0, 4) : [];
  const deliverables = Array.isArray(metadata.deliverables)
    ? metadata.deliverables.slice(0, 4)
    : [];
  const linkedAgentProjectId = String(metadata.linkedAgentProjectId || "").trim();
  const linkedAgentProjectTitle = String(metadata.linkedAgentProjectTitle || "").trim();
  const importedAgentResultCount = Math.max(Number(metadata.importedAgentResultCount || 0), 0);
  const pendingAgentResultCount = Math.max(Number(metadata.pendingAgentResultCount || 0), 0);
  const batchShotCount = Math.max(
    Number(metadata.batchShotCount || 0),
    storyboardShots.length
  );
  const batchResultCount = Math.max(Number(metadata.batchResultCount || 0), 0);
  const batchFailedCount = Math.max(Number(metadata.batchFailedCount || 0), 0);

  const comparePreviewItems = compareItems
    .map((item, index) => {
      const compareItem = (item || {}) as Record<string, any>;
      const url = String(compareItem.url || "").trim();
      if (!url) return null;
      return {
        id: `${data.templateType}-compare-${index}`,
        url,
        kind: String(compareItem.kind || "").trim() === "video" ? "video" : "image",
        label: String(compareItem.label || compareItem.title || `对比 ${index + 1}`).trim(),
      };
    })
    .filter(Boolean) as Array<{ id: string; url: string; kind: "image" | "video"; label: string }>;

  const compactMetrics: string[] = [];
  if (batchShotCount > 0) compactMetrics.push(`镜头 ${batchShotCount}`);
  if (batchResultCount > 0) compactMetrics.push(`结果 ${batchResultCount}`);
  if (analysisHighlights.length > 0) compactMetrics.push(`分析 ${analysisHighlights.length}`);
  if (tableRows.length > 0) compactMetrics.push(`表格 ${tableRows.length}`);
  if (characters.length > 0) compactMetrics.push(`角色 ${characters.length}`);
  if (scenes.length > 0) compactMetrics.push(`场景 ${scenes.length}`);
  if (characterAssets.length > 0) compactMetrics.push(`角色资产 ${characterAssets.length}`);
  if (sceneAssets.length > 0) compactMetrics.push(`场景资产 ${sceneAssets.length}`);
  if (linkedAgentProjectId) compactMetrics.push("Agent");
  if (importedAgentResultCount > 0) compactMetrics.push(`已回流 ${importedAgentResultCount}`);
  if (pendingAgentResultCount > 0) compactMetrics.push(`待回流 ${pendingAgentResultCount}`);
  if (batchFailedCount > 0) compactMetrics.push(`失败 ${batchFailedCount}`);

  const primaryTextCandidates = [
    String(data.summary || "").trim(),
    String(analysisHighlights[0] || "").trim(),
    String((storyboardShots[0] as Record<string, any>)?.title || "").trim(),
    String((storyboardShots[0] as Record<string, any>)?.description || "").trim(),
    String((characters[0] as Record<string, any>)?.description || "").trim(),
    String((scenes[0] as Record<string, any>)?.description || "").trim(),
    String(agentPlan[0] || "").trim(),
    String(deliverables[0] || "").trim(),
    quickConnectOutputs.length > 0 ? `可接 ${quickConnectOutputs.map((item) => item.label).join(" / ")}` : "",
    String(definition?.description || data.description || "").trim(),
  ].filter(Boolean);
  const primaryText = primaryTextCandidates[0] || "";

  const compactDetailLines = [
    storyboardShots[0]
      ? `分镜：${String((storyboardShots[0] as Record<string, any>)?.title || "镜头草案").trim()}`
      : "",
    characters[0]
      ? `角色：${String((characters[0] as Record<string, any>)?.name || (characters[0] as Record<string, any>)?.title || "角色线索").trim()}`
      : "",
    scenes[0]
      ? `场景：${String((scenes[0] as Record<string, any>)?.name || (scenes[0] as Record<string, any>)?.title || "场景线索").trim()}`
      : "",
    tableRows[0] ? "已整理结构化表格" : "",
    linkedAgentProjectId ? `Agent：${linkedAgentProjectTitle || linkedAgentProjectId}` : "",
    deliverables[0] ? `交付：${String(deliverables[0]).trim()}` : "",
  ]
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[24px] border border-[#e0e2e8] bg-white shadow-[0_0_0_1px_rgba(224,226,232,0.32),0_16px_36px_rgba(28,28,30,0.08)] transition-all dark:border-zinc-800 dark:bg-zinc-950",
        isSelected &&
          "border-brand-selection/60 ring-2 ring-brand-selection/18 shadow-[0_0_0_1px_rgb(var(--brand-accent-rgb)/0.18),0_20px_40px_rgb(var(--brand-accent-rgb)/0.14)]"
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accentBarColor }}
      />

      <div className="h-full w-full" style={scaledContentStyle}>
        <div className="flex h-full flex-col gap-3 p-3">
        <div
          className="rounded-[20px] border px-3 py-3"
          style={{
            backgroundColor: groupStyle.surface,
            borderColor: groupStyle.border,
          }}
        >
          <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/70 shadow-sm"
            style={{ color: accentColor, backgroundColor: groupStyle.icon }}
          >
            <GroupIcon className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#555a6a]">
                    {groupMeta.label}
                  </span>
                  <Badge variant="outline" className={cn("h-6 rounded-full px-2 text-[11px]", statusClassName)}>
                    {statusLabel}
                  </Badge>
                </div>
                <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
                {primaryText ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#555a6a]">
                    {primaryText}
                  </p>
                ) : null}
              </div>

              {isSelected ? (
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/75 bg-white/92 text-[#555a6a] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-destructive dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-destructive/40 dark:hover:bg-red-950/30"
                  aria-label={workflowDeleteItem.label}
                  title={workflowDeleteItem.label}
                >
                  <CanvasToolbarIcon
                    className="h-4 w-4"
                    fallback={Trash2}
                    item={workflowDeleteItem}
                  />
                </button>
              ) : null}
            </div>
          </div>
        </div>
        </div>

        {previewUrl ? (
          <div className="overflow-hidden rounded-[20px] border border-[#dfe3ea] bg-[#1c1c1e] shadow-[0_0_0_1px_rgba(224,226,232,0.25)] dark:border-zinc-800">
            {previewKind === "video" ? (
              <video
                src={previewUrl}
                className="h-28 w-full object-cover"
                controls
                muted
                playsInline
              />
            ) : (
              <img src={previewUrl} alt={title} className="h-28 w-full object-cover" />
            )}
          </div>
        ) : comparePreviewItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {comparePreviewItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[18px] border border-[#dfe3ea] bg-white shadow-[0_0_0_1px_rgba(224,226,232,0.25)] dark:border-zinc-800 dark:bg-zinc-950"
              >
                {item.kind === "video" ? (
                  <video
                    src={item.url}
                    className="h-20 w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img src={item.url} alt={item.label} className="h-20 w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {compactMetrics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {compactMetrics.slice(0, 6).map((metric) => (
              <span
                key={`${data.templateType}-${metric}`}
                className="rounded-full border border-[#d8def0] bg-[#f7f8fc] px-2.5 py-1 text-[11px] font-medium text-[#555a6a] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {metric}
              </span>
            ))}
          </div>
        ) : null}

        {compactDetailLines.length > 0 ? (
          <div className="grid gap-1.5">
            {compactDetailLines.map((line) => (
              <div
                key={`${data.templateType}-${line}`}
                className="rounded-[18px] border border-[#e3e7ef] bg-white px-3 py-2 text-xs leading-5 text-[#555a6a] shadow-[0_0_0_1px_rgba(224,226,232,0.2)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-1.5">
          {quickConnectOutputs.length > 0 ? (
            quickConnectOutputs.slice(0, 4).map((item) => (
              <span
                key={`${data.templateType}-${item.type}`}
                className="rounded-full border border-dashed border-[#d8def0] px-2.5 py-1 text-[11px] text-[#6f7483] dark:border-zinc-800"
              >
                {item.label}
              </span>
            ))
        ) : (
            <span className="rounded-full border border-dashed border-[#d8def0] px-2.5 py-1 text-[11px] text-[#6f7483] dark:border-zinc-800">
              结束节点
            </span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
