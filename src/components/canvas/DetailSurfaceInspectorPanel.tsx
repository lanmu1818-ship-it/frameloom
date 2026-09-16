// Modified for standalone community distribution; see NOTICE.
"use client";

import { Blocks, CheckCircle2, LayoutTemplate, Layers3 } from "lucide-react";
import {
  countUiSurfaceComponents,
  getUiSurfaceChildren,
  getUiSurfaceScreenComponents,
  resolveUiSurfaceTextBinding,
  type UiSurfaceSnapshot,
} from "@/src/lib/ui-surface-protocol";
import { cn } from "@/src/lib/utils";

type DetailSurfaceInspectorReviewState = {
  screenIndex: number;
  action?: "pass" | "protocol_patch" | "regenerate_image";
  passed?: boolean;
};

function getActionLabel(action?: DetailSurfaceInspectorReviewState["action"]) {
  if (action === "protocol_patch") return "协议修正";
  if (action === "regenerate_image") return "重生图";
  return "通过";
}

function getActionClassName(action?: DetailSurfaceInspectorReviewState["action"]) {
  if (action === "protocol_patch") {
    return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
  }
  if (action === "regenerate_image") {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }
  return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function collectRenderableScreenComponents(surface: UiSurfaceSnapshot, parentId: string) {
  const result = [] as typeof surface.components;
  const queue = [...getUiSurfaceChildren(surface, parentId)];

  while (queue.length > 0) {
    const component = queue.shift();
    if (!component) continue;

    if (
      component.type === "detail_text_block" ||
      component.type === "detail_card" ||
      component.type === "detail_badge" ||
      component.type === "detail_feature_card" ||
      component.type === "detail_feature_tag" ||
      component.type === "detail_spec_table" ||
      component.type === "detail_table_label" ||
      component.type === "detail_table_value" ||
      component.type === "detail_comparison_strip" ||
      component.type === "detail_compare_before" ||
      component.type === "detail_compare_after" ||
      component.type === "detail_proof_bar" ||
      component.type === "detail_cta_banner" ||
      component.type === "detail_cta_button" ||
      component.type === "detail_cta_support"
    ) {
      result.push(component);
      continue;
    }

    queue.push(...getUiSurfaceChildren(surface, component.id));
  }

  return result;
}

export function DetailSurfaceInspectorPanel(params: {
  surface: UiSurfaceSnapshot | null;
  latestScreenValidation?: DetailSurfaceInspectorReviewState | null;
}) {
  if (!params.surface) return null;
  const surface = params.surface;

  const screenComponents = getUiSurfaceScreenComponents(surface);
  const totalRenderableBlocks =
    countUiSurfaceComponents(surface, "detail_text_block") +
    countUiSurfaceComponents(surface, "detail_card") +
    countUiSurfaceComponents(surface, "detail_badge") +
    countUiSurfaceComponents(surface, "detail_feature_card") +
    countUiSurfaceComponents(surface, "detail_feature_tag") +
    countUiSurfaceComponents(surface, "detail_spec_table") +
    countUiSurfaceComponents(surface, "detail_table_label") +
    countUiSurfaceComponents(surface, "detail_table_value") +
    countUiSurfaceComponents(surface, "detail_comparison_strip") +
    countUiSurfaceComponents(surface, "detail_compare_before") +
    countUiSurfaceComponents(surface, "detail_compare_after") +
    countUiSurfaceComponents(surface, "detail_proof_bar") +
    countUiSurfaceComponents(surface, "detail_cta_banner") +
    countUiSurfaceComponents(surface, "detail_cta_button") +
    countUiSurfaceComponents(surface, "detail_cta_support");
  const totalSections = countUiSurfaceComponents(surface, "detail_section");
  const totalScreens = screenComponents.length;

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-zinc-50/40 p-3 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-violet-500" />
          <div>
            <p className="text-[11px] font-medium text-foreground">Detail Surface Inspector</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              <span className="font-mono">{surface.surfaceId}</span>
            </p>
          </div>
        </div>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          {surface.generationMode === "agent_layout" ? "AGENT Surface" : "Classic Surface"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5" />
            Screens
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{totalScreens}</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Blocks className="h-3.5 w-3.5" />
            Sections
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{totalSections}</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            UI Blocks
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{totalRenderableBlocks}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
        <div>
          <div className="text-[10px] text-muted-foreground">Surface Validation</div>
          <div className="mt-0.5 text-[11px] font-medium text-foreground">
            {surface.validation?.passed === false
              ? surface.validation.issues[0] || "存在待优化项"
              : "当前 surface 已通过基础校验"}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            surface.validation?.passed === false
              ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          )}
        >
          {surface.validation?.passed === false ? "待优化" : "通过"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {screenComponents.slice(0, 6).map((screenComponent) => {
          const screenIndex = Number(screenComponent.props?.screenIndex || 0);
          const textStack = getUiSurfaceChildren(surface, screenComponent.id).find(
            (component) => component.type === "detail_text_stack",
          );
          const textBlocks = textStack
            ? collectRenderableScreenComponents(surface, textStack.id)
            : [];
          const titleBlock =
            textBlocks.find(
              (component) =>
                component.metadata?.componentRole === "title" ||
                component.props?.blockType === "title",
            ) || null;
          const subtitleBlock =
            textBlocks.find(
              (component) =>
                component.metadata?.componentRole === "subtitle" ||
                component.props?.blockType === "subtitle",
            ) || null;
          const isLatestScreen = params.latestScreenValidation?.screenIndex === screenIndex;

          return (
            <div
              key={screenComponent.id}
              className={cn(
                "rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40",
                isLatestScreen && "border-brand-selection/60 ring-1 ring-inset ring-brand-selection/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-foreground">
                    第 {screenIndex} 屏
                    {screenComponent.props?.screenType
                      ? ` · ${String(screenComponent.props?.screenType)}`
                      : ""}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-foreground/85">
                    {resolveUiSurfaceTextBinding(surface, titleBlock, "content") || "未定义标题"}
                  </div>
                  {subtitleBlock ? (
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {resolveUiSurfaceTextBinding(surface, subtitleBlock, "content")}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {textBlocks.length} 块
                  </span>
                  {isLatestScreen ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        getActionClassName(params.latestScreenValidation?.action),
                      )}
                    >
                      {getActionLabel(params.latestScreenValidation?.action)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
