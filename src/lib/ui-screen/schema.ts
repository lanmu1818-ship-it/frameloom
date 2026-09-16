// Modified for standalone community distribution; see NOTICE.
export type UiScreenLayerKind =
  | "frame"
  | "stack"
  | "grid"
  | "card"
  | "image"
  | "text"
  | "button"
  | "badge"
  | "divider";

export type UiScreenFit = "cover" | "contain" | "fill";
export type UiScreenDirection = "row" | "column";
export type UiScreenAlign = "start" | "center" | "end" | "stretch";
export type UiScreenJustify = "start" | "center" | "end" | "between";

export interface UiScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UiScreenAsset {
  id: string;
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface UiScreenLayerStyle {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  blur?: number;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface UiScreenLayer {
  id: string;
  kind: UiScreenLayerKind;
  name?: string;
  visible?: boolean;
  opacity?: number;
  bounds?: UiScreenBounds;
  style?: UiScreenLayerStyle;
  children?: UiScreenLayer[];
  text?: string;
  label?: string;
  assetId?: string;
  src?: string;
  alt?: string;
  fit?: UiScreenFit;
  direction?: UiScreenDirection;
  align?: UiScreenAlign;
  justify?: UiScreenJustify;
  columns?: number;
  tone?: "primary" | "secondary" | "neutral" | "success" | "danger";
}

export interface UiScreenTokens {
  colors?: Record<string, string>;
  typography?: Record<
    string,
    {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number | string;
      lineHeight?: number;
    }
  >;
  spacing?: Record<string, number>;
  radii?: Record<string, number>;
  shadows?: Record<string, string>;
}

export interface UiScreenDocument {
  version: "ui-screen/v1";
  id: string;
  title?: string;
  width: number;
  height: number;
  tokens?: UiScreenTokens;
  assets?: UiScreenAsset[];
  layers: UiScreenLayer[];
  metadata?: Record<string, unknown>;
}

function normalizeString(value: unknown, fallback = "") {
  return String(value || "").trim() || fallback;
}

function normalizeNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeBounds(value: unknown): UiScreenBounds | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const bounds = {
    x: normalizeNumber(raw.x, 0),
    y: normalizeNumber(raw.y, 0),
    width: normalizeNumber(raw.width, 0, 0),
    height: normalizeNumber(raw.height, 0, 0),
  };
  return bounds.width > 0 && bounds.height > 0 ? bounds : undefined;
}

function normalizeStyle(value: unknown): UiScreenLayerStyle | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const style: UiScreenLayerStyle = {};

  const stringKeys = [
    "background",
    "color",
    "borderColor",
    "boxShadow",
    "fontFamily",
    "fontWeight",
    "textAlign",
    "textTransform",
  ] as const;

  stringKeys.forEach((key) => {
    const normalized = normalizeString(raw[key]);
    if (normalized) {
      (style as Record<string, unknown>)[key] = normalized;
    }
  });

  const numberKeys = [
    "borderWidth",
    "borderRadius",
    "blur",
    "padding",
    "paddingX",
    "paddingY",
    "gap",
    "fontSize",
    "lineHeight",
    "letterSpacing",
  ] as const;

  numberKeys.forEach((key) => {
    if (raw[key] === undefined || raw[key] === null) return;
    (style as Record<string, unknown>)[key] = normalizeNumber(raw[key], 0);
  });

  if (
    style.textAlign !== undefined &&
    style.textAlign !== "left" &&
    style.textAlign !== "center" &&
    style.textAlign !== "right"
  ) {
    delete style.textAlign;
  }

  if (
    style.textTransform !== undefined &&
    style.textTransform !== "none" &&
    style.textTransform !== "uppercase" &&
    style.textTransform !== "lowercase" &&
    style.textTransform !== "capitalize"
  ) {
    delete style.textTransform;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function normalizeLayer(value: unknown): UiScreenLayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = normalizeString(raw.id);
  const kind = normalizeString(raw.kind) as UiScreenLayerKind;

  if (!id) return null;
  if (
    kind !== "frame" &&
    kind !== "stack" &&
    kind !== "grid" &&
    kind !== "card" &&
    kind !== "image" &&
    kind !== "text" &&
    kind !== "button" &&
    kind !== "badge" &&
    kind !== "divider"
  ) {
    return null;
  }

  const children = Array.isArray(raw.children)
    ? raw.children.map(normalizeLayer).filter(Boolean)
    : undefined;

  const layer: UiScreenLayer = {
    id,
    kind,
    name: normalizeString(raw.name) || undefined,
    visible: raw.visible === false ? false : undefined,
    opacity:
      raw.opacity === undefined || raw.opacity === null
        ? undefined
        : normalizeNumber(raw.opacity, 1, 0, 1),
    bounds: normalizeBounds(raw.bounds),
    style: normalizeStyle(raw.style),
    children: children && children.length > 0 ? (children as UiScreenLayer[]) : undefined,
    text: normalizeString(raw.text) || undefined,
    label: normalizeString(raw.label) || undefined,
    assetId: normalizeString(raw.assetId) || undefined,
    src: normalizeString(raw.src) || undefined,
    alt: normalizeString(raw.alt) || undefined,
    fit:
      raw.fit === "contain" || raw.fit === "fill" || raw.fit === "cover"
        ? raw.fit
        : undefined,
    direction: raw.direction === "row" ? "row" : raw.direction === "column" ? "column" : undefined,
    align:
      raw.align === "center" || raw.align === "end" || raw.align === "stretch"
        ? raw.align
        : raw.align === "start"
          ? "start"
          : undefined,
    justify:
      raw.justify === "center" ||
      raw.justify === "end" ||
      raw.justify === "between" ||
      raw.justify === "start"
        ? raw.justify
        : undefined,
    columns: raw.columns === undefined ? undefined : Math.max(1, Math.round(normalizeNumber(raw.columns, 1))),
    tone:
      raw.tone === "secondary" ||
      raw.tone === "neutral" ||
      raw.tone === "success" ||
      raw.tone === "danger"
        ? raw.tone
        : raw.tone === "primary"
          ? "primary"
          : undefined,
  };

  return layer;
}

export function normalizeUiScreenDocument(value: unknown): UiScreenDocument | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const layers = Array.isArray(raw.layers)
    ? raw.layers.map(normalizeLayer).filter(Boolean)
    : [];

  if (layers.length === 0) return null;

  return {
    version: "ui-screen/v1",
    id: normalizeString(raw.id, "ui-screen"),
    title: normalizeString(raw.title) || undefined,
    width: normalizeNumber(raw.width, 790, 240, 4096),
    height: normalizeNumber(raw.height, 1300, 240, 4096),
    tokens:
      raw.tokens && typeof raw.tokens === "object" && !Array.isArray(raw.tokens)
        ? (raw.tokens as UiScreenTokens)
        : undefined,
    assets: Array.isArray(raw.assets)
      ? raw.assets
          .map((asset) => {
            if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
            const next = asset as Record<string, unknown>;
            const id = normalizeString(next.id);
            const src = normalizeString(next.src);
            if (!id || !src) return null;
            return {
              id,
              type: "image" as const,
              src,
              alt: normalizeString(next.alt) || undefined,
              width: next.width === undefined ? undefined : normalizeNumber(next.width, 0, 0),
              height: next.height === undefined ? undefined : normalizeNumber(next.height, 0, 0),
            };
          })
          .filter(Boolean) as UiScreenAsset[]
      : undefined,
    layers: layers as UiScreenLayer[],
    metadata:
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
  };
}
