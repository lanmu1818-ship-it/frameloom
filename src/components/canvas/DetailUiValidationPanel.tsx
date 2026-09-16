// Modified for standalone community distribution; see NOTICE.
"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

type DetailUiValidationSnapshot = {
  passed?: boolean;
  issues?: string[];
};

type DetailUiReviewSnapshot = {
  screenIndex: number;
  action?: "pass" | "protocol_patch" | "regenerate_image";
  passed?: boolean;
  issues?: string[];
};

export function DetailUiValidationPanel(params: {
  generationMode: "classic" | "agent_layout";
  planValidation?: DetailUiValidationSnapshot | null;
  latestScreenValidation?: DetailUiReviewSnapshot | null;
  surfaceId?: string | null;
}) {
  const planIssues = Array.isArray(params.planValidation?.issues)
    ? params.planValidation?.issues.filter(Boolean)
    : [];
  const latestIssues = Array.isArray(params.latestScreenValidation?.issues)
    ? params.latestScreenValidation.issues.filter(Boolean)
    : [];

  if (!params.planValidation && !params.latestScreenValidation) {
    return null;
  }

  const title =
    params.generationMode === "agent_layout" ? "协议排版质检" : "排版与复审状态";
  const hasPlanValidation = Boolean(params.planValidation);
  const latestActionLabel =
    params.latestScreenValidation?.action === "protocol_patch"
      ? "已走协议修正"
      : params.latestScreenValidation?.action === "regenerate_image"
        ? "已要求重生图"
        : "通过";

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-zinc-50/40 p-3 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {params.planValidation?.passed === false || latestIssues.length > 0 ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <p className="text-[11px] font-medium text-foreground">{title}</p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {params.surfaceId
            ? params.generationMode === "agent_layout"
              ? "结构化 surface 已建立"
              : "当前结果可继续复审"
            : params.generationMode === "agent_layout"
              ? "文字层可直接修正"
              : "问题会触发二次修图"}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
          <div>
            <div className="text-[11px] font-medium text-foreground">规划阶段</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {params.planValidation?.passed === false
                ? `发现 ${planIssues.length} 条协议/排版提示`
                : hasPlanValidation
                  ? "协议结构已通过基础校验"
                  : "等待本轮规划结果"}
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              !hasPlanValidation
                ? "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-300"
                : params.planValidation?.passed === false
                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
            )}
          >
            {!hasPlanValidation
              ? "待开始"
              : params.planValidation?.passed === false
                ? "待优化"
                : "通过"}
          </span>
        </div>

        {params.latestScreenValidation ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background/80 px-3 py-2 dark:bg-zinc-950/40">
            <div>
              <div className="text-[11px] font-medium text-foreground">
                最近一屏：第 {params.latestScreenValidation.screenIndex} 屏
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {params.latestScreenValidation.passed === false
                  ? latestIssues[0] || "存在可优化项"
                  : "最近一屏已通过当前质检"}
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                params.latestScreenValidation.action === "regenerate_image"
                  ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                  : params.latestScreenValidation.action === "protocol_patch"
                    ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
              )}
            >
              {latestActionLabel}
            </span>
          </div>
        ) : null}

        {(planIssues.length > 0 || latestIssues.length > 0) && (
          <div className="rounded-lg border border-dashed border-border/40 bg-background/60 px-3 py-2 dark:bg-zinc-950/30">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              当前关注点
            </div>
            <div className="mt-1 space-y-1">
              {[...planIssues, ...latestIssues]
                .filter((item, index, array) => array.indexOf(item) === index)
                .slice(0, 3)
                .map((issue) => (
                  <div key={issue} className="text-[11px] leading-5 text-foreground/85">
                    · {issue}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
