// Modified for standalone community distribution; see NOTICE.
"use client";

import { cn } from "@/src/lib/utils";

type AgentWorkflowParticleScatterProps = {
  className?: string;
  particleSize?: number;
  particleCount?: number;
  sceneScale?: number;
  viewportScale?: number;
};

export function AgentWorkflowParticleScatter({
  className,
  particleSize,
  particleCount,
  sceneScale,
  viewportScale = 1,
}: AgentWorkflowParticleScatterProps) {
  const searchParams = new URLSearchParams();
  if (typeof particleSize === "number" && Number.isFinite(particleSize) && particleSize > 0) {
    searchParams.set("particleSize", String(particleSize));
  }
  if (typeof particleCount === "number" && Number.isFinite(particleCount) && particleCount > 0) {
    searchParams.set("particleCount", String(Math.round(particleCount)));
  }
  if (typeof sceneScale === "number" && Number.isFinite(sceneScale) && sceneScale > 0) {
    searchParams.set("sceneScale", String(sceneScale));
  }
  const src = searchParams.size
    ? `/particle-scatter-effect.html?${searchParams.toString()}`
    : "/particle-scatter-effect.html";
  const safeViewportScale =
    typeof viewportScale === "number" && Number.isFinite(viewportScale) && viewportScale > 0
      ? viewportScale
      : 1;
  const overflowOffsetPercent = ((safeViewportScale - 1) / 2) * 100;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden",
        className
      )}
    >
      <iframe
        aria-hidden="true"
        className="pointer-events-none absolute border-0 bg-transparent"
        loading="eager"
        src={src}
        style={{
          width: `${safeViewportScale * 100}%`,
          height: `${safeViewportScale * 100}%`,
          left: `-${overflowOffsetPercent}%`,
          top: `-${overflowOffsetPercent}%`,
        }}
        tabIndex={-1}
        title="Particle Scatter Background"
      />
    </div>
  );
}
