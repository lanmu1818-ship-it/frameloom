// Modified for standalone community distribution; see NOTICE.
"use client";

import { motion } from "framer-motion";
import { ArrowRight, ImageIcon } from "lucide-react";
import { AgentWorkflowParticleScatter } from "@/src/components/agents/AgentWorkflowParticleScatter";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { defaultAgentWorkflowShowcaseConfig } from "@/src/lib/agents/workflow-showcase-config";
import type { AgentWorkflowShowcaseConfig } from "@/types/agent";

interface AgentWorkflowShowcaseBannerProps {
  config?: AgentWorkflowShowcaseConfig | null;
  onActionClick?: () => void;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryActionClick?: () => void;
  className?: string;
}

export function AgentWorkflowShowcaseBanner({
  config,
  onActionClick,
  actionLabel,
  secondaryActionLabel,
  onSecondaryActionClick,
  className,
}: AgentWorkflowShowcaseBannerProps) {
  const resolved = config || defaultAgentWorkflowShowcaseConfig;
  const hasVideo = Boolean(resolved.videoUrl);
  const hasPoster = Boolean(resolved.posterUrl);
  const shouldRenderMedia = resolved.enabled !== false && (hasVideo || hasPoster);
  const resolvedActionLabel = actionLabel || resolved.actionText;

  return (
    <div className={cn("space-y-12 pt-6 md:space-y-14 md:pt-8", className)}>
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-[34px] border border-white/10 px-6 py-14 text-center",
          "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(5,8,7,0.9))]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_48px_rgba(0,0,0,0.24)]",
          "sm:px-10 sm:py-16"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <AgentWorkflowParticleScatter
          className="top-0 h-full"
          viewportScale={1.5}
        />
        <div className="pointer-events-none absolute inset-0 bg-black/70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[24%] bg-gradient-to-b from-black/84 via-black/56 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/80 via-black/24 to-transparent" />

        <div className="relative z-10">
          <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">{resolved.title}</h1>
          <p className="mb-8 text-base text-white/50 md:mb-9">{resolved.subtitle}</p>
          {resolvedActionLabel || secondaryActionLabel ? (
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {resolvedActionLabel ? (
                <Button
                  type="button"
                  onClick={onActionClick}
                  className={cn(
                    "h-12 gap-2 rounded-full px-8",
                    "bg-gradient-to-r from-emerald-500 to-teal-500",
                    "text-base font-medium text-white",
                    "hover:from-emerald-400 hover:to-teal-400",
                    "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
                    "transition-all duration-300"
                  )}
                >
                  {resolvedActionLabel}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              ) : null}
              {secondaryActionLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSecondaryActionClick}
                  className="h-12 rounded-full border-white/20 bg-transparent px-12 text-base font-medium text-white hover:border-emerald-400/50 hover:bg-white/[0.04]"
                >
                  {secondaryActionLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </motion.div>

      {shouldRenderMedia ? (
        <motion.div
          className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#101214] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="aspect-[10/3] w-full">
            {hasVideo ? (
              <video
                key={resolved.videoUrl}
                className="h-full w-full object-cover"
                src={resolved.videoUrl}
                poster={resolved.posterUrl || undefined}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : hasPoster ? (
              <img
                src={resolved.posterUrl || ""}
                alt={resolved.overlayText || resolved.title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/35" />

          {resolved.overlayText ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
              <div className="max-w-[78%] text-2xl font-semibold tracking-[0.18em] text-white/22 sm:text-3xl lg:text-5xl">
                {resolved.overlayText}
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 sm:px-7">
            <div className="rounded-full border border-white/14 bg-black/30 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md">
              视频海报
            </div>
            {hasVideo || hasPoster ? (
              <div className="rounded-full border border-white/14 bg-black/30 px-3 py-1 text-xs text-white/55 backdrop-blur-md">
                固定比例 10:3
              </div>
            ) : null}
          </div>

          {resolved.footerText ? (
            <div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/14 bg-black/35 px-3 py-1.5 text-sm text-white/75 backdrop-blur-md sm:left-7">
              <ImageIcon className="h-4 w-4" />
              <span>{resolved.footerText}</span>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
