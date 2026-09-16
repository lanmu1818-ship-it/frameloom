// Modified for standalone community distribution; see NOTICE.
"use client";

import type { CSSProperties } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { DetailUiScreenOverlaySnapshot } from "@/src/lib/detail-ui-surface-adapter";
import type {
  DetailUiSafeZone,
  DetailUiSubjectAnalysis,
} from "@/src/lib/detail-ui-subject-analysis";

type RenderableOverlayComponent =
  DetailUiScreenOverlaySnapshot["components"][number];

const OVERLAY_RENDERABLE_TYPES = new Set([
  "detail_text_block",
  "detail_card",
  "detail_badge",
  "detail_feature_card",
  "detail_feature_tag",
  "detail_spec_table",
  "detail_table_label",
  "detail_table_value",
  "detail_comparison_strip",
  "detail_compare_before",
  "detail_compare_after",
  "detail_proof_bar",
  "detail_cta_banner",
  "detail_cta_button",
  "detail_cta_support",
]);

function collectRenderableComponents(snapshot: DetailUiScreenOverlaySnapshot) {
  return snapshot.components
    .filter((component) => OVERLAY_RENDERABLE_TYPES.has(component.type))
    .sort((left, right) => {
      const leftZ = Number(left.layout?.zIndex || 0);
      const rightZ = Number(right.layout?.zIndex || 0);
      return leftZ - rightZ;
    });
}

function resolveOverlayText(
  snapshot: DetailUiScreenOverlaySnapshot,
  component: RenderableOverlayComponent,
) {
  const binding = component.bindings?.content;
  if (!binding || binding.kind !== "text") {
    return String(component.props?.content || "");
  }

  const path = String(binding.path || "").trim();
  const screen = snapshot.dataModel.screen;
  if (!path || !screen) {
    return String(component.props?.content || "");
  }

  if (path.endsWith("/title")) return String(screen.title || "");
  if (path.endsWith("/subtitle")) return String(screen.subtitle || "");
  if (path.endsWith("/copy")) return String(screen.copy || "");
  if (path.endsWith("/layoutNote")) return String(screen.layoutNote || "");

  return String(component.props?.content || "");
}

function renderOverlayComponentContent(
  snapshot: DetailUiScreenOverlaySnapshot,
  component: RenderableOverlayComponent,
  scale: number,
) {
  const content = resolveOverlayText(snapshot, component);
  const lines = content.split("\n").filter(Boolean);
  const iconSize = Math.max(12, Math.round(16 * scale));
  const smallIconSize = Math.max(10, Math.round(14 * scale));

  if (component.type === "detail_feature_card") {
    const headline = lines[0] || content;
    const detail = lines.slice(1).join("\n");
    return (
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-white/70 p-2 text-blue-600">
            <Sparkles style={{ width: iconSize, height: iconSize }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.95em] font-extrabold leading-[1.2]">{headline}</div>
            {detail ? (
              <div className="mt-2 text-[0.72em] font-medium leading-[1.35] opacity-85">
                {detail}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (component.type === "detail_feature_tag") {
    return (
      <div className="flex h-full w-full items-center justify-center gap-1 whitespace-nowrap">
        <Sparkles style={{ width: smallIconSize, height: smallIconSize }} />
        <span>{content}</span>
      </div>
    );
  }

  if (component.type === "detail_compare_before" || component.type === "detail_compare_after") {
    const title = lines[0] || "";
    const body = lines.slice(1).join("\n");
    return (
      <div className="flex h-full w-full flex-col">
        <div className="text-[0.78em] font-extrabold uppercase tracking-[0.08em] opacity-80">
          {title}
        </div>
        <div className="mt-3 h-px w-full bg-current/15" />
        <div className="mt-3 text-[0.82em] font-semibold leading-[1.42]">
          {body}
        </div>
      </div>
    );
  }

  if (component.type === "detail_proof_bar") {
    return (
      <div className="flex h-full w-full items-center gap-3">
        <ShieldCheck style={{ width: iconSize, height: iconSize }} className="shrink-0" />
        <div className="min-w-0 text-[0.86em] font-semibold leading-[1.2]">{content}</div>
      </div>
    );
  }

  if (component.type === "detail_cta_button") {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 whitespace-nowrap">
        <span>{content}</span>
        <ArrowRight style={{ width: iconSize, height: iconSize }} />
      </div>
    );
  }

  if (component.type === "detail_cta_support" || component.type === "detail_cta_banner") {
    return (
      <div className="flex h-full w-full items-center justify-between gap-3">
        <div className="min-w-0 text-[0.82em] font-semibold leading-[1.25]">{content}</div>
        {component.type === "detail_cta_banner" ? (
          <CheckCircle2 style={{ width: iconSize, height: iconSize }} className="shrink-0" />
        ) : null}
      </div>
    );
  }

  return content;
}

function getOverlayComponentStyle(params: {
  component: RenderableOverlayComponent;
  snapshot: DetailUiScreenOverlaySnapshot;
  content: string;
  scale: number;
  frameOverride?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}) {
  const frame = (params.frameOverride || params.component.layout?.frame || {}) as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  const style = (params.component.style || {}) as Record<string, unknown>;
  const widthScale = 100 / Math.max(1, params.snapshot.screenSize.width);
  const heightScale = 100 / Math.max(1, params.snapshot.screenSize.height);
  const scale = Math.max(0.55, Math.min(2.4, params.scale));

  const overlayStyle: CSSProperties = {
    position: "absolute",
    left: `${Number(frame.x || 0) * widthScale}%`,
    top: `${Number(frame.y || 0) * heightScale}%`,
    width: `${Number(frame.width || 0) * widthScale}%`,
    height: `${Number(frame.height || 0) * heightScale}%`,
    zIndex: Number(params.component.layout?.zIndex || 1),
    fontSize:
      typeof style.fontSize === "number" ? `${style.fontSize * scale}px` : undefined,
    fontFamily: typeof style.fontFamily === "string" ? style.fontFamily : undefined,
    fontWeight: typeof style.fontWeight === "string" ? style.fontWeight : undefined,
    lineHeight: typeof style.lineHeight === "number" ? style.lineHeight : undefined,
    letterSpacing:
      typeof style.letterSpacing === "number"
        ? `${style.letterSpacing * scale}px`
        : undefined,
    color: typeof style.color === "string" ? style.color : undefined,
    textAlign:
      style.textAlign === "center" || style.textAlign === "right"
        ? style.textAlign
        : "left",
    textTransform:
      style.textTransform === "uppercase" ||
      style.textTransform === "lowercase" ||
      style.textTransform === "capitalize"
        ? style.textTransform
        : undefined,
    background: typeof style.backgroundColor === "string" ? style.backgroundColor : undefined,
    borderColor: typeof style.borderColor === "string" ? style.borderColor : undefined,
    borderWidth:
      typeof style.borderWidth === "number"
        ? `${Math.max(1, style.borderWidth * scale)}px`
        : undefined,
    borderStyle:
      typeof style.borderWidth === "number" && style.borderWidth > 0 ? "solid" : undefined,
    borderRadius:
      typeof style.borderRadius === "number"
        ? `${style.borderRadius * scale}px`
        : undefined,
    padding:
      typeof style.padding === "number" ? `${style.padding * scale}px` : undefined,
    boxShadow: typeof style.boxShadow === "string" ? style.boxShadow : undefined,
    backdropFilter:
      typeof style.backdropBlur === "number"
        ? `blur(${style.backdropBlur * scale}px)`
        : undefined,
    WebkitBackdropFilter:
      typeof style.backdropBlur === "number"
        ? `blur(${style.backdropBlur * scale}px)`
        : undefined,
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    display: "flex",
    alignItems: "center",
    justifyContent:
      style.textAlign === "center"
        ? "center"
        : style.textAlign === "right"
          ? "flex-end"
          : "flex-start",
  };

  if (
    params.component.type === "detail_feature_card" ||
    params.component.type === "detail_spec_table" ||
    params.component.type === "detail_compare_before" ||
    params.component.type === "detail_compare_after" ||
    params.component.type === "detail_proof_bar" ||
    params.component.type === "detail_cta_banner" ||
    params.component.type === "detail_cta_support"
  ) {
    overlayStyle.alignItems = "flex-start";
  }

  if (params.component.type === "detail_cta_button") {
    overlayStyle.justifyContent = "center";
    overlayStyle.cursor = "pointer";
  }

  if (params.component.type === "detail_table_label") {
    overlayStyle.justifyContent = "center";
  }

  return overlayStyle;
}

function normalizeZoneToPixels(params: {
  zone: DetailUiSafeZone;
  width: number;
  height: number;
}) {
  return {
    x: params.zone.x * params.width,
    y: params.zone.y * params.height,
    width: params.zone.width * params.width,
    height: params.zone.height * params.height,
  };
}

function chooseGroupZone(params: {
  subjectAnalysis: DetailUiSubjectAnalysis;
  imageWidth: number;
  imageHeight: number;
  preferred: Array<"left" | "right" | "top" | "bottom">;
  minimumWidth: number;
  minimumHeight: number;
}) {
  for (const key of params.preferred) {
    const zone = params.subjectAnalysis.safeZones[key];
    if (!zone) continue;
    const pixelZone = normalizeZoneToPixels({
      zone,
      width: params.imageWidth,
      height: params.imageHeight,
    });
    if (
      pixelZone.width >= params.minimumWidth + 12 &&
      pixelZone.height >= params.minimumHeight + 12
    ) {
      return { key, zone: pixelZone };
    }
  }
  return null;
}

function moveGroupToZone(params: {
  frames: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  zone: { x: number; y: number; width: number; height: number };
  align: "start" | "end" | "center";
}) {
  const minX = Math.min(...params.frames.map((frame) => frame.x));
  const minY = Math.min(...params.frames.map((frame) => frame.y));
  const maxX = Math.max(...params.frames.map((frame) => frame.x + frame.width));
  const maxY = Math.max(...params.frames.map((frame) => frame.y + frame.height));
  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;

  let targetX = params.zone.x + 8;
  if (params.align === "end") {
    targetX = params.zone.x + Math.max(8, params.zone.width - groupWidth - 8);
  } else if (params.align === "center") {
    targetX = params.zone.x + Math.max(0, (params.zone.width - groupWidth) / 2);
  }

  const targetY = params.zone.y + 8;
  const dx = targetX - minX;
  const dy = targetY - minY;

  return new Map(
    params.frames.map((frame) => [
      frame.id,
      {
        x: frame.x + dx,
        y: frame.y + dy,
        width: frame.width,
        height: frame.height,
      },
    ]),
  );
}

function buildFrameOverrides(params: {
  overlay: DetailUiScreenOverlaySnapshot;
  components: RenderableOverlayComponent[];
  subjectAnalysis?: DetailUiSubjectAnalysis | null;
  imageWidth: number;
  imageHeight: number;
}) {
  if (!params.subjectAnalysis) return new Map<string, { x: number; y: number; width: number; height: number }>();

  const pixelFrames = params.components.map((component) => {
    const frame = (component.layout?.frame || {}) as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
    return {
      id: component.id,
      role: String(component.metadata?.componentRole || ""),
      type: component.type,
      x: (Number(frame.x || 0) / params.overlay.screenSize.width) * params.imageWidth,
      y: (Number(frame.y || 0) / params.overlay.screenSize.height) * params.imageHeight,
      width: (Number(frame.width || 0) / params.overlay.screenSize.width) * params.imageWidth,
      height: (Number(frame.height || 0) / params.overlay.screenSize.height) * params.imageHeight,
    };
  });

  const heroFrames = pixelFrames.filter((frame) =>
    ["badge", "title", "subtitle"].includes(frame.role),
  );
  const supportFrames = pixelFrames.filter((frame) =>
    [
      "feature_tag",
      "support_card",
      "spec_table_section",
      "table_label",
      "table_value",
      "comparison_before",
      "comparison_after",
      "proof_bar",
    ].includes(frame.role),
  );
  const ctaFrames = pixelFrames.filter((frame) =>
    ["cta_support", "cta_button", "cta_banner"].includes(frame.role),
  );

  const overrides = new Map<string, { x: number; y: number; width: number; height: number }>();

  const heroPreferred =
    params.subjectAnalysis.dominantHorizontal === "left"
      ? ["right", "top", "bottom", "left"]
      : params.subjectAnalysis.dominantHorizontal === "right"
        ? ["left", "top", "bottom", "right"]
        : ["top", "left", "right", "bottom"];
  const supportPreferred =
    params.subjectAnalysis.dominantVertical === "bottom"
      ? ["top", "left", "right", "bottom"]
      : ["bottom", "right", "left", "top"];
  const ctaPreferred = ["bottom", "right", "left", "top"] as const;

  if (heroFrames.length > 0) {
    const groupWidth = Math.max(...heroFrames.map((frame) => frame.x + frame.width)) - Math.min(...heroFrames.map((frame) => frame.x));
    const groupHeight = Math.max(...heroFrames.map((frame) => frame.y + frame.height)) - Math.min(...heroFrames.map((frame) => frame.y));
    const zone = chooseGroupZone({
      subjectAnalysis: params.subjectAnalysis,
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
      preferred: heroPreferred as any,
      minimumWidth: groupWidth,
      minimumHeight: groupHeight,
    });
    if (zone) {
      const moved = moveGroupToZone({
        frames: heroFrames,
        zone: zone.zone,
        align: zone.key === "right" ? "end" : zone.key === "top" ? "center" : "start",
      });
      moved.forEach((frame, id) => overrides.set(id, frame));
    }
  }

  if (supportFrames.length > 0) {
    const groupWidth = Math.max(...supportFrames.map((frame) => frame.x + frame.width)) - Math.min(...supportFrames.map((frame) => frame.x));
    const groupHeight = Math.max(...supportFrames.map((frame) => frame.y + frame.height)) - Math.min(...supportFrames.map((frame) => frame.y));
    const zone = chooseGroupZone({
      subjectAnalysis: params.subjectAnalysis,
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
      preferred: supportPreferred as any,
      minimumWidth: groupWidth,
      minimumHeight: groupHeight,
    });
    if (zone) {
      const moved = moveGroupToZone({
        frames: supportFrames,
        zone: zone.zone,
        align: zone.key === "right" ? "end" : "start",
      });
      moved.forEach((frame, id) => overrides.set(id, frame));
    }
  }

  if (ctaFrames.length > 0) {
    const groupWidth = Math.max(...ctaFrames.map((frame) => frame.x + frame.width)) - Math.min(...ctaFrames.map((frame) => frame.x));
    const groupHeight = Math.max(...ctaFrames.map((frame) => frame.y + frame.height)) - Math.min(...ctaFrames.map((frame) => frame.y));
    const zone = chooseGroupZone({
      subjectAnalysis: params.subjectAnalysis,
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
      preferred: [...ctaPreferred] as any,
      minimumWidth: groupWidth,
      minimumHeight: groupHeight,
    });
    if (zone) {
      const moved = moveGroupToZone({
        frames: ctaFrames,
        zone: zone.zone,
        align: zone.key === "right" ? "end" : zone.key === "top" ? "center" : "start",
      });
      moved.forEach((frame, id) => overrides.set(id, frame));
    }
  }

  return overrides;
}

export function DetailSurfaceOverlayRenderer(params: {
  overlay: DetailUiScreenOverlaySnapshot | null;
  imageMetrics?: {
    offsetX: number;
    offsetY: number;
    renderedWidth: number;
    renderedHeight: number;
  } | null;
  subjectAnalysis?: DetailUiSubjectAnalysis | null;
  className?: string;
}) {
  if (!params.overlay) return null;

  const components = collectRenderableComponents(params.overlay);
  if (components.length === 0) return null;
  const overlayWidth =
    params.imageMetrics && params.imageMetrics.renderedWidth > 0
      ? params.imageMetrics.renderedWidth
      : params.overlay.screenSize.width;
  const overlayHeight =
    params.imageMetrics && params.imageMetrics.renderedHeight > 0
      ? params.imageMetrics.renderedHeight
      : params.overlay.screenSize.height;
  const overlayScale = Math.min(
    overlayWidth / Math.max(1, params.overlay.screenSize.width),
    overlayHeight / Math.max(1, params.overlay.screenSize.height),
  );
  const frameOverrides = buildFrameOverrides({
    overlay: params.overlay,
    components,
    subjectAnalysis: params.subjectAnalysis,
    imageWidth: overlayWidth,
    imageHeight: overlayHeight,
  });

  const containerStyle =
    params.imageMetrics && params.imageMetrics.renderedWidth > 0 && params.imageMetrics.renderedHeight > 0
      ? {
          position: "absolute" as const,
          left: `${params.imageMetrics.offsetX}px`,
          top: `${params.imageMetrics.offsetY}px`,
          width: `${params.imageMetrics.renderedWidth}px`,
          height: `${params.imageMetrics.renderedHeight}px`,
        }
      : {
          position: "absolute" as const,
          inset: "0px",
        };

  return (
    <div
      className={cn("pointer-events-none z-[120]", params.className)}
      data-canvas-no-drag="true"
      style={containerStyle}
    >
      {components.map((component) => {
        const content = resolveOverlayText(params.overlay!, component);
        return (
          <div
            key={component.id}
            className={cn(
              "select-none",
              component.type === "detail_cta_button" && "pointer-events-auto",
            )}
            style={getOverlayComponentStyle({
              component,
              snapshot: params.overlay!,
              content,
              scale: overlayScale,
              frameOverride: (() => {
                const frame = frameOverrides.get(component.id);
                if (!frame) return undefined;
                return {
                  x: (frame.x / overlayWidth) * params.overlay!.screenSize.width,
                  y: (frame.y / overlayHeight) * params.overlay!.screenSize.height,
                  width: (frame.width / overlayWidth) * params.overlay!.screenSize.width,
                  height: (frame.height / overlayHeight) * params.overlay!.screenSize.height,
                };
              })(),
            })}
          >
            {renderOverlayComponentContent(params.overlay!, component, overlayScale)}
          </div>
        );
      })}
    </div>
  );
}
