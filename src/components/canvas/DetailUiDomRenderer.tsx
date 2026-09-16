// Modified for standalone community distribution; see NOTICE.
"use client";

import type { CSSProperties } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type {
  DetailUiDslNode,
  DetailUiDslRegion,
  DetailUiDslV2Document,
} from "@/src/lib/detail-ui-dsl-v2";

function normalizedRegionToPixels(params: {
  region: DetailUiDslRegion;
  width: number;
  height: number;
}) {
  return {
    x: params.region.x * params.width,
    y: params.region.y * params.height,
    width: params.region.width * params.width,
    height: params.region.height * params.height,
  };
}

function iconFor(name?: string, size = 16) {
  const style = { width: size, height: size };
  if (name === "shield") return <ShieldCheck style={style} />;
  if (name === "arrow") return <ArrowRight style={style} />;
  if (name === "check") return <CheckCircle2 style={style} />;
  return <Sparkles style={style} />;
}

function panelClass(variant?: string, tone?: string) {
  if (variant === "glass") {
    if (tone === "dark") {
      return "bg-slate-900/72 border border-white/10 text-white shadow-[0_18px_50px_rgba(15,23,42,0.26)] backdrop-blur-xl";
    }
    if (tone === "accent") {
      return "bg-blue-600/88 border border-blue-300/30 text-white shadow-[0_20px_56px_rgba(37,99,235,0.28)] backdrop-blur-xl";
    }
    return "bg-white/84 border border-white/50 text-slate-950 shadow-[0_20px_56px_rgba(15,23,42,0.18)] backdrop-blur-xl";
  }

  if (variant === "ghost") {
    return "bg-transparent text-slate-900";
  }

  return tone === "dark"
    ? "bg-slate-900 text-white"
    : tone === "accent"
      ? "bg-blue-600 text-white"
      : "bg-white text-slate-950";
}

function renderNode(node: DetailUiDslNode): JSX.Element {
  if (node.kind === "panel") {
    return (
      <div
        key={node.id}
        className={cn(
          "rounded-[2em] p-[1.15em]",
          panelClass(node.variant, node.tone),
          node.direction === "row" ? "flex flex-row" : "flex flex-col",
        )}
        style={{
          gap: `${node.gap || 16}px`,
        }}
      >
        {node.children.map(renderNode)}
      </div>
    );
  }

  if (node.kind === "stack") {
    return (
      <div
        key={node.id}
        className="flex flex-col"
        style={{ gap: `${node.gap || 12}px` }}
      >
        {node.children.map(renderNode)}
      </div>
    );
  }

  if (node.kind === "row") {
    const columns = Math.max(1, node.columns || node.children.length || 1);
    return (
      <div
        key={node.id}
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${node.gap || 12}px`,
        }}
      >
        {node.children.map(renderNode)}
      </div>
    );
  }

  if (node.kind === "badge") {
    return (
      <div
        key={node.id}
        className={cn(
          "inline-flex w-fit items-center gap-[0.55em] rounded-full border px-[0.9em] py-[0.45em] text-[0.8em] font-extrabold tracking-[0.02em]",
          node.tone === "secondary"
            ? "border-violet-200/70 bg-violet-100/90 text-violet-700"
            : node.tone === "neutral"
              ? "border-slate-200/70 bg-slate-100/95 text-slate-700"
              : "border-blue-200/70 bg-blue-100/95 text-blue-700",
        )}
      >
        {iconFor(node.icon, 14)}
        <span>{node.text}</span>
      </div>
    );
  }

  if (node.kind === "heading") {
    return (
      <div
        key={node.id}
        className={cn(
          "font-black leading-[0.98] tracking-[-0.04em]",
          node.emphasis === "hero" ? "text-[3.5em]" : "text-[2em]",
        )}
      >
        {node.text}
      </div>
    );
  }

  if (node.kind === "body") {
    return (
      <div
        key={node.id}
        className={cn(
          "leading-[1.35]",
          node.emphasis === "strong"
            ? "text-[1.15em] font-bold opacity-95"
            : node.emphasis === "muted"
              ? "text-[0.95em] opacity-75"
              : "text-[1em] font-semibold opacity-90",
        )}
      >
        {node.text}
      </div>
    );
  }

  if (node.kind === "feature-card") {
    return (
      <div
        key={node.id}
        className={cn(
          "flex h-full min-h-[7.2em] flex-col rounded-[1.45em] border px-[1.15em] py-[1.05em] shadow-[0_14px_36px_rgba(15,23,42,0.10)]",
          node.tone === "secondary"
            ? "border-violet-200/70 bg-violet-50/95 text-slate-900"
            : node.tone === "neutral"
              ? "border-slate-200/70 bg-slate-50/95 text-slate-900"
              : "border-blue-200/70 bg-white/96 text-slate-900",
        )}
      >
        {node.tag ? (
          <div
            className={cn(
              "mb-[0.85em] inline-flex w-fit items-center gap-[0.45em] rounded-full px-[0.75em] py-[0.3em] text-[0.72em] font-extrabold",
              node.tone === "secondary"
                ? "bg-violet-100 text-violet-700"
                : node.tone === "neutral"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-blue-100 text-blue-700",
            )}
          >
            {iconFor(node.icon, 12)}
            <span>{node.tag}</span>
          </div>
        ) : null}
        <div className="text-[1.02em] font-extrabold leading-[1.15]">{node.title}</div>
        {node.body ? (
          <div className="mt-[0.7em] text-[0.8em] font-semibold leading-[1.32] text-slate-600">
            {node.body}
          </div>
        ) : null}
      </div>
    );
  }

  if (node.kind === "spec-table") {
    return (
      <div
        key={node.id}
        className="overflow-hidden rounded-[1.4em] border border-blue-100/70 bg-white/96 shadow-[0_14px_38px_rgba(15,23,42,0.10)]"
      >
        {node.rows.map((row, index) => (
          <div
            key={`${node.id}-${index}`}
            className={cn(
              "grid grid-cols-[7.5em_1fr] gap-[0.55em] px-[1em] py-[0.8em]",
              index > 0 && "border-t border-slate-100/90",
            )}
          >
            <div className="rounded-[0.8em] bg-slate-100 px-[0.8em] py-[0.55em] text-center text-[0.76em] font-extrabold text-slate-700">
              {row.label}
            </div>
            <div className="rounded-[0.8em] bg-white px-[0.8em] py-[0.55em] text-[0.82em] font-semibold text-slate-900">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (node.kind === "compare") {
    return (
      <div key={node.id} className="grid grid-cols-2 gap-[0.85em]">
        <div className="rounded-[1.45em] border border-slate-200/80 bg-white/95 px-[1.05em] py-[1em] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <div className="text-[0.72em] font-black uppercase tracking-[0.08em] text-slate-500">
            {node.before.title}
          </div>
          <div className="mt-[0.9em] text-[0.86em] font-semibold leading-[1.35] text-slate-700">
            {node.before.body}
          </div>
        </div>
        <div className="rounded-[1.45em] border border-blue-200/80 bg-blue-600/94 px-[1.05em] py-[1em] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]">
          <div className="text-[0.72em] font-black uppercase tracking-[0.08em] text-blue-100">
            {node.after.title}
          </div>
          <div className="mt-[0.9em] text-[0.86em] font-semibold leading-[1.35]">
            {node.after.body}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === "proof") {
    return (
      <div
        key={node.id}
        className="inline-flex w-fit items-center gap-[0.7em] rounded-[1.1em] border border-slate-200/80 bg-white/92 px-[1em] py-[0.72em] text-[0.8em] font-bold text-slate-800 shadow-[0_12px_26px_rgba(15,23,42,0.08)]"
      >
        {iconFor(node.icon, 15)}
        <span>{node.text}</span>
      </div>
    );
  }

  if (node.kind === "cta") {
    return (
      <div
        key={node.id}
        className="rounded-[1.7em] border border-white/16 bg-slate-900/78 p-[1.05em] text-white shadow-[0_20px_46px_rgba(15,23,42,0.24)] backdrop-blur-xl"
      >
        {node.headline ? (
          <div className="mb-[0.75em] text-[1em] font-black leading-[1.1]">{node.headline}</div>
        ) : null}
        <div className="flex items-center gap-[0.8em]">
          <div className="inline-flex min-w-[10.2em] items-center justify-center gap-[0.5em] rounded-full border border-white/20 bg-blue-600 px-[1.2em] py-[0.9em] text-[0.82em] font-black text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)]">
            <span>{node.buttonText}</span>
            <ArrowRight style={{ width: 16, height: 16 }} />
          </div>
          {node.supportText ? (
            <div className="text-[0.78em] font-semibold leading-[1.28] text-slate-200">
              {node.supportText}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return <div />;
}

export function DetailUiDomRenderer(params: {
  document: DetailUiDslV2Document | null;
  imageMetrics?: {
    offsetX: number;
    offsetY: number;
    renderedWidth: number;
    renderedHeight: number;
  } | null;
  className?: string;
}) {
  if (!params.document) return null;

  const renderWidth =
    params.imageMetrics?.renderedWidth && params.imageMetrics.renderedWidth > 0
      ? params.imageMetrics.renderedWidth
      : params.document.screenSize.width;
  const renderHeight =
    params.imageMetrics?.renderedHeight && params.imageMetrics.renderedHeight > 0
      ? params.imageMetrics.renderedHeight
      : params.document.screenSize.height;
  const scale = Math.max(
    0.55,
    Math.min(
      2.4,
      Math.min(
        renderWidth / Math.max(1, params.document.screenSize.width),
        renderHeight / Math.max(1, params.document.screenSize.height),
      ),
    ),
  );

  const containerStyle: CSSProperties =
    params.imageMetrics && params.imageMetrics.renderedWidth > 0 && params.imageMetrics.renderedHeight > 0
      ? {
          position: "absolute",
          left: `${params.imageMetrics.offsetX}px`,
          top: `${params.imageMetrics.offsetY}px`,
          width: `${params.imageMetrics.renderedWidth}px`,
          height: `${params.imageMetrics.renderedHeight}px`,
        }
      : {
          position: "absolute",
          inset: "0px",
        };

  const region = normalizedRegionToPixels({
    region: params.document.region,
    width: renderWidth,
    height: renderHeight,
  });

  return (
    <div
      className={cn("pointer-events-none z-[122]", params.className)}
      data-canvas-no-drag="true"
      style={containerStyle}
    >
      <div
        className="absolute"
        style={{
          left: `${region.x}px`,
          top: `${region.y}px`,
          width: `${region.width}px`,
          height: `${region.height}px`,
          fontSize: `${16 * scale}px`,
        }}
      >
        <div
          className={cn(
            "flex h-full w-full flex-col",
            params.document.layoutVariant === "floating-split" ||
              params.document.layoutVariant === "cta-focus"
              ? "justify-between"
              : "gap-[1em]",
          )}
        >
          {params.document.nodes.map((node) => renderNode(node))}
        </div>
      </div>
    </div>
  );
}
