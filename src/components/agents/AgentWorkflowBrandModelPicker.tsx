// Modified for standalone community distribution; see NOTICE.
"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Check, ImageIcon, Loader2, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn, fetcher } from "@/src/lib/utils";
import { normalizeAgentWorkflowBrandModelConfig } from "@/src/lib/agents/workflow-brand-model-config";
import type {
  AgentWorkflowBrandModelConfig,
  AgentWorkflowSelectedBrandModel,
} from "@/types/agent";

interface AgentWorkflowBrandModelPickerProps {
  brand: string;
  selectedBrandModel?: AgentWorkflowSelectedBrandModel | null;
  onSelectBrandModel: (value: AgentWorkflowSelectedBrandModel | null) => void;
  theme?: "light" | "dark";
}

export function AgentWorkflowBrandModelPicker({
  brand,
  selectedBrandModel = null,
  onSelectBrandModel,
  theme = "light",
}: AgentWorkflowBrandModelPickerProps) {
  const normalizedBrand = brand.trim();
  const brandModelSettingsKey = normalizedBrand
    ? `/api/site-settings?scope=agent-brand-model&brand=${encodeURIComponent(
        normalizedBrand
      )}`
    : null;
  const { data, error } = useSWR<{
    agentWorkflowBrandModelConfig?: AgentWorkflowBrandModelConfig;
  }>(brandModelSettingsKey, fetcher, {
    errorRetryCount: 1,
    revalidateOnFocus: false,
  });
  const config = useMemo(
    () => normalizeAgentWorkflowBrandModelConfig(data?.agentWorkflowBrandModelConfig),
    [data?.agentWorkflowBrandModelConfig]
  );
  const matchedEntry = useMemo(
    () =>
      config.entries.find(
        (entry) => entry.brandName.toLowerCase() === normalizedBrand.toLowerCase()
      ) || null,
    [config.entries, normalizedBrand]
  );
  const images = matchedEntry?.images || [];
  const isDark = theme === "dark";
  const isLoading = Boolean(normalizedBrand) && !data && !error;

  const renderPlaceholderGrid = (message: string, iconMode: "loading" | "empty" = "empty") => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`brand-model-placeholder-${index}`}
            className={cn(
              "overflow-hidden rounded-[24px] border bg-background",
              isDark ? "border-white/12 bg-white/[0.02]" : "border-border bg-muted/20"
            )}
          >
            <div
              className={cn(
                "relative aspect-square overflow-hidden",
                isDark
                  ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                  : "bg-muted/40"
              )}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                {iconMode === "loading" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white/55" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-white/28" />
                )}
                <div className="h-2 w-20 rounded-full bg-white/10" />
                <div className="h-2 w-14 rounded-full bg-white/10" />
              </div>
              <div className="absolute inset-x-0 top-0 px-2 py-2">
                <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
                  {iconMode === "loading" ? "加载中" : "模特预览"}
                </span>
              </div>
            </div>
            <div className="space-y-1 px-3 py-2">
              <div className="h-3 w-3/4 rounded-full bg-white/10" />
              <div className="h-2.5 w-1/2 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-[20px] border border-dashed px-4 py-3 text-center text-sm",
          isDark ? "border-white/12 bg-black/20 text-white/55" : "bg-background/60 text-muted-foreground"
        )}
      >
        {message}
      </div>
    </div>
  );

  return (
    <section
      className={cn(
        "space-y-3 rounded-[28px] border p-4",
        isDark ? "border-white/12 bg-white/[0.04]" : "border-[#dbe3ff] bg-[#f8faff]"
      )}
    >
      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            isDark ? "text-white/88" : "text-[#334155]"
          )}
        >
          <UserRound className={cn("h-4 w-4", isDark ? "text-emerald-300" : "text-[#4f46e5]")} />
          <span>品牌模特选择</span>
        </div>
        <div
          className={cn(
            "text-xs leading-5",
            isDark ? "text-white/55" : "text-[#5b6472]"
          )}
        >
          根据第一步选择的品牌，展示管理员预先上传的模特图。选中后会自动带入右侧“模特图”槽位；如果当前模式只是开启了模特槽位，这里也可以不选，后续直接继续生成。
        </div>
      </div>

      {isLoading ? (
        renderPlaceholderGrid("正在加载品牌模特图库，请稍候...", "loading")
      ) : error ? (
        renderPlaceholderGrid("品牌模特图库暂时加载失败，不影响继续生成；稍后可刷新重试。")
      ) : !normalizedBrand ? (
        renderPlaceholderGrid("先回到第一步选择品牌，第二步才会按品牌展示可选模特图。")
      ) : images.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={cn("flex flex-wrap gap-2 text-xs", isDark ? "text-white/55" : "text-muted-foreground")}>
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/70" : "bg-background"
                )}
              >
                品牌：{normalizedBrand}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/70" : "bg-background"
                )}
              >
                共 {images.length} 张模特图
              </span>
              {selectedBrandModel ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    isDark ? "bg-white/8 text-white/70" : "bg-background"
                  )}
                >
                  已选 1 张
                </span>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  isDark ? "bg-white/8 text-white/58" : "bg-background text-muted-foreground"
                )}
              >
                可不选
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                isDark
                  ? "border-white/14 bg-white/[0.03] text-white/82 hover:border-white/22 hover:bg-white/[0.08] hover:text-white disabled:border-white/8 disabled:bg-white/[0.02] disabled:text-white/28"
                  : ""
              )}
              onClick={() => onSelectBrandModel(null)}
              disabled={!selectedBrandModel}
            >
              清空选择
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => {
              const selected =
                selectedBrandModel?.brandName === normalizedBrand &&
                selectedBrandModel?.id === image.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() =>
                    onSelectBrandModel(
                      selected
                        ? null
                        : {
                            ...image,
                            brandName: normalizedBrand,
                          }
                    )
                  }
                  className={cn(
                    "group overflow-hidden rounded-[24px] border bg-background text-left transition-all",
                    selected
                      ? isDark
                        ? "border-emerald-400/70 bg-white/[0.03] shadow-[0_0_0_1px_rgba(52,211,153,0.2)]"
                        : "border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.18)]"
                      : isDark
                        ? "border-white/12 bg-white/[0.02] hover:border-white/25 hover:shadow-sm"
                        : "border-border hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden",
                      isDark ? "bg-white/[0.04]" : "bg-muted/40"
                    )}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.displayName || `${normalizedBrand} 模特图`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2">
                      <span className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
                        品牌模特
                      </span>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-white transition-colors",
                          selected
                            ? isDark
                              ? "border-emerald-400 bg-emerald-400 text-black"
                              : "border-primary bg-primary"
                            : "border-white/60 bg-black/35 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-2 text-[11px] text-white">
                      {image.displayName || `${normalizedBrand} 模特图`}
                    </div>
                  </div>
                  <div className="space-y-1 px-3 py-2">
                    <div className={cn("truncate text-xs font-medium", isDark ? "text-white/85" : "")}>
                      {image.displayName || `${normalizedBrand} 模特图`}
                    </div>
                    <div className={cn("text-[11px]", isDark ? "text-white/45" : "text-muted-foreground")}>
                      点击{selected ? "取消" : "选择"}，自动进入模特图槽位
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : renderPlaceholderGrid(`品牌“${normalizedBrand}”暂未配置模特图库，请到系统设置上传对应模特图。`)}
    </section>
  );
}
