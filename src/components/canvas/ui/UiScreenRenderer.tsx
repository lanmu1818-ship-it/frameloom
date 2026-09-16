// Modified for standalone community distribution; see NOTICE.
"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type {
  UiScreenAsset,
  UiScreenDocument,
  UiScreenLayer,
  UiScreenLayerStyle,
  UiScreenTokens,
} from "@/src/lib/ui-screen/schema";

interface UiScreenRendererProps {
  document: UiScreenDocument;
  className?: string;
  interactive?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
}

const TONE_CLASS_MAP = {
  primary: "border-blue-200 bg-blue-50 text-blue-700",
  secondary: "border-violet-200 bg-violet-50 text-violet-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

function resolveTokenValue(
  value: string | undefined,
  tokenGroup: Record<string, string | number> | undefined
) {
  if (!value) return undefined;
  if (!tokenGroup) return value;
  const tokenName = value.startsWith("token:") ? value.slice("token:".length) : value;
  const tokenValue = tokenGroup[tokenName];
  return tokenValue === undefined ? value : tokenValue;
}

function toFlexAlign(value: string | undefined) {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "stretch") return "stretch";
  return "flex-start";
}

function toFlexJustify(value: string | undefined) {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "between") return "space-between";
  return "flex-start";
}

function iconFor(name: string | undefined, size = 14) {
  const style = { width: size, height: size };
  if (name === "shield") return <ShieldCheck style={style} />;
  if (name === "arrow") return <ArrowRight style={style} />;
  if (name === "check") return <CheckCircle2 style={style} />;
  return <Sparkles style={style} />;
}

function getStyle(
  layer: UiScreenLayer,
  tokens: UiScreenTokens | undefined,
  assetMap: Map<string, UiScreenAsset>
): CSSProperties {
  const layerStyle = layer.style || {};
  const style: CSSProperties = {
    opacity: layer.opacity,
  };

  if (layer.bounds) {
    style.position = "absolute";
    style.left = layer.bounds.x;
    style.top = layer.bounds.y;
    style.width = layer.bounds.width;
    style.height = layer.bounds.height;
  } else {
    style.position = "relative";
  }

  const background = resolveTokenValue(layerStyle.background, tokens?.colors);
  const color = resolveTokenValue(layerStyle.color, tokens?.colors);
  const borderColor = resolveTokenValue(layerStyle.borderColor, tokens?.colors);
  const boxShadow = resolveTokenValue(layerStyle.boxShadow, tokens?.shadows);

  if (background) style.background = String(background);
  if (color) style.color = String(color);
  if (borderColor) style.borderColor = String(borderColor);
  if (boxShadow) style.boxShadow = String(boxShadow);

  if (typeof layerStyle.borderWidth === "number" && layerStyle.borderWidth > 0) {
    style.borderWidth = layerStyle.borderWidth;
    style.borderStyle = "solid";
  }
  if (typeof layerStyle.borderRadius === "number") style.borderRadius = layerStyle.borderRadius;
  if (typeof layerStyle.padding === "number") style.padding = layerStyle.padding;
  if (typeof layerStyle.paddingX === "number") {
    style.paddingLeft = layerStyle.paddingX;
    style.paddingRight = layerStyle.paddingX;
  }
  if (typeof layerStyle.paddingY === "number") {
    style.paddingTop = layerStyle.paddingY;
    style.paddingBottom = layerStyle.paddingY;
  }
  if (typeof layerStyle.blur === "number" && layerStyle.blur > 0) {
    style.backdropFilter = `blur(${layerStyle.blur}px)`;
    style.WebkitBackdropFilter = `blur(${layerStyle.blur}px)`;
  }

  applyTextStyle(style, layerStyle);

  if (layer.kind === "stack") {
    style.display = "flex";
    style.flexDirection = layer.direction || "column";
    style.alignItems = toFlexAlign(layer.align);
    style.justifyContent = toFlexJustify(layer.justify);
    style.gap = layerStyle.gap ?? 14;
  }

  if (layer.kind === "grid") {
    style.display = "grid";
    style.gridTemplateColumns = `repeat(${Math.max(1, layer.columns || 2)}, minmax(0, 1fr))`;
    style.gap = layerStyle.gap ?? 14;
  }

  if (layer.kind === "card" || layer.kind === "frame") {
    style.display = "flex";
    style.flexDirection = layer.direction || "column";
    style.alignItems = toFlexAlign(layer.align);
    style.justifyContent = toFlexJustify(layer.justify);
    style.gap = layerStyle.gap ?? 12;
  }

  if (layer.kind === "image") {
    const asset = layer.assetId ? assetMap.get(layer.assetId) : null;
    const src = layer.src || asset?.src;
    if (!src) {
      style.background =
        style.background || "linear-gradient(135deg, rgba(226,232,240,0.72), rgba(248,250,252,0.95))";
    }
  }

  return style;
}

function applyTextStyle(style: CSSProperties, layerStyle: UiScreenLayerStyle) {
  if (layerStyle.fontFamily) style.fontFamily = layerStyle.fontFamily;
  if (typeof layerStyle.fontSize === "number") style.fontSize = layerStyle.fontSize;
  if (layerStyle.fontWeight !== undefined) style.fontWeight = layerStyle.fontWeight;
  if (typeof layerStyle.lineHeight === "number") style.lineHeight = layerStyle.lineHeight;
  if (typeof layerStyle.letterSpacing === "number") style.letterSpacing = layerStyle.letterSpacing;
  if (layerStyle.textAlign) style.textAlign = layerStyle.textAlign;
  if (layerStyle.textTransform) style.textTransform = layerStyle.textTransform;
}

function renderLayer(params: {
  layer: UiScreenLayer;
  tokens?: UiScreenTokens;
  assetMap: Map<string, UiScreenAsset>;
  interactive: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
}) {
  const { layer, tokens, assetMap, interactive, selectedLayerId, onSelectLayer } = params;
  if (layer.visible === false) return null;

  const isSelected = selectedLayerId === layer.id;
  const baseStyle = getStyle(layer, tokens, assetMap);
  const children = layer.children?.map((child) =>
    renderLayer({
      layer: child,
      tokens,
      assetMap,
      interactive,
      selectedLayerId,
      onSelectLayer,
    })
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer?.(layer.id);
  };

  const commonProps = {
    key: layer.id,
    "data-ui-layer-id": layer.id,
    "data-canvas-no-drag": interactive ? "true" : undefined,
    onPointerDown: handlePointerDown,
  };

  if (layer.kind === "image") {
    const asset = layer.assetId ? assetMap.get(layer.assetId) : null;
    const src = layer.src || asset?.src;
    return (
      <div
        {...commonProps}
        className={cn("overflow-hidden", isSelected && "ring-2 ring-brand-selection ring-offset-2")}
        style={baseStyle}
      >
        {src ? (
          <img
            alt={layer.alt || asset?.alt || layer.name || ""}
            className="h-full w-full"
            draggable={false}
            src={src}
            style={{
              objectFit:
                layer.fit === "contain" ? "contain" : layer.fit === "fill" ? "fill" : "cover",
            }}
          />
        ) : null}
      </div>
    );
  }

  if (layer.kind === "text") {
    return (
      <div
        {...commonProps}
        className={cn(
          "whitespace-pre-wrap break-words",
          isSelected && "rounded-[6px] ring-2 ring-brand-selection ring-offset-2"
        )}
        style={baseStyle}
      >
        {layer.text}
      </div>
    );
  }

  if (layer.kind === "button") {
    return (
      <div
        {...commonProps}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border font-bold",
          TONE_CLASS_MAP[layer.tone || "primary"],
          isSelected && "ring-2 ring-brand-selection ring-offset-2"
        )}
        style={baseStyle}
      >
        <span>{layer.label || layer.text}</span>
        {iconFor("arrow", 16)}
      </div>
    );
  }

  if (layer.kind === "badge") {
    return (
      <div
        {...commonProps}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold",
          TONE_CLASS_MAP[layer.tone || "neutral"],
          isSelected && "ring-2 ring-brand-selection ring-offset-2"
        )}
        style={baseStyle}
      >
        {iconFor("sparkle", 13)}
        <span>{layer.label || layer.text}</span>
      </div>
    );
  }

  if (layer.kind === "divider") {
    return (
      <div
        {...commonProps}
        className={cn("bg-slate-200", isSelected && "ring-2 ring-brand-selection ring-offset-2")}
        style={baseStyle}
      />
    );
  }

  return (
    <div
      {...commonProps}
      className={cn(
        "overflow-hidden",
        layer.kind === "card" && "rounded-2xl border border-slate-200 bg-white shadow-sm",
        isSelected && "ring-2 ring-brand-selection ring-offset-2"
      )}
      style={baseStyle}
    >
      {children}
    </div>
  );
}

export function UiScreenRenderer({
  document,
  className,
  interactive = false,
  selectedLayerId,
  onSelectLayer,
}: UiScreenRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: document.width, height: document.height });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const assetMap = useMemo(() => {
    const map = new Map<string, UiScreenAsset>();
    for (const asset of document.assets || []) {
      map.set(asset.id, asset);
    }
    return map;
  }, [document.assets]);

  const scale = Math.min(size.width / document.width, size.height / document.height);
  const offsetX = (size.width - document.width * scale) / 2;
  const offsetY = (size.height - document.height * scale) / 2;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-white text-slate-950", className)}
      ref={containerRef}
    >
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{
          width: document.width,
          height: document.height,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {document.layers.map((layer) =>
          renderLayer({
            layer,
            tokens: document.tokens,
            assetMap,
            interactive,
            selectedLayerId,
            onSelectLayer,
          })
        )}
      </div>
    </div>
  );
}
