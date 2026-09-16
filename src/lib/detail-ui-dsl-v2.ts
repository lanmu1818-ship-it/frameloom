// Modified for standalone community distribution; see NOTICE.
import type { DetailUiGlobalStyle } from "@/src/lib/detail-ui-protocol";

export type DetailUiDslRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetailUiDslNode =
  | {
      kind: "panel";
      id: string;
      variant?: "glass" | "solid" | "ghost";
      tone?: "light" | "dark" | "accent";
      region?: DetailUiDslRegion;
      direction?: "column" | "row";
      gap?: number;
      children: DetailUiDslNode[];
    }
  | {
      kind: "stack";
      id: string;
      gap?: number;
      children: DetailUiDslNode[];
    }
  | {
      kind: "row";
      id: string;
      gap?: number;
      columns?: number;
      children: DetailUiDslNode[];
    }
  | {
      kind: "badge";
      id: string;
      icon?: "sparkle" | "shield" | "arrow" | "check";
      text: string;
      tone?: "primary" | "secondary" | "neutral";
    }
  | {
      kind: "heading";
      id: string;
      text: string;
      level?: 1 | 2 | 3;
      emphasis?: "hero" | "section";
    }
  | {
      kind: "body";
      id: string;
      text: string;
      emphasis?: "normal" | "muted" | "strong";
    }
  | {
      kind: "feature-card";
      id: string;
      icon?: "sparkle" | "shield" | "arrow" | "check";
      tone?: "primary" | "secondary" | "neutral";
      tag?: string;
      title: string;
      body?: string;
    }
  | {
      kind: "spec-table";
      id: string;
      rows: Array<{ label: string; value: string }>;
    }
  | {
      kind: "compare";
      id: string;
      before: { title: string; body: string };
      after: { title: string; body: string };
    }
  | {
      kind: "proof";
      id: string;
      icon?: "shield" | "check" | "sparkle" | "arrow";
      text: string;
    }
  | {
      kind: "cta";
      id: string;
      headline?: string;
      buttonText: string;
      supportText?: string;
    };

export interface DetailUiDslV2Document {
  version: "detail-ui-dsl/v2";
  surfaceId: string;
  screenIndex: number;
  generationMode: "classic" | "agent_layout";
  screenSize: {
    width: number;
    height: number;
  };
  designStyle?: DetailUiGlobalStyle;
  region: DetailUiDslRegion;
  layoutVariant:
    | "hero-left-panel"
    | "hero-right-panel"
    | "top-banner-bottom-grid"
    | "floating-split"
    | "cta-focus";
  nodes: DetailUiDslNode[];
}

function clamp01(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeString(value: unknown, fallback = "") {
  return String(value || "").replace(/\s+/g, " ").trim() || fallback;
}

function normalizeRegion(value: unknown): DetailUiDslRegion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const region = {
    x: clamp01(raw.x, 0),
    y: clamp01(raw.y, 0),
    width: clamp01(raw.width, 0),
    height: clamp01(raw.height, 0),
  } satisfies DetailUiDslRegion;
  if (region.width <= 0 || region.height <= 0) return null;
  return region;
}

function normalizeNode(value: unknown): DetailUiDslNode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const kind = normalizeString(raw.kind);
  const id = normalizeString(raw.id);
  if (!kind || !id) return null;

  if (kind === "panel") {
    const children = Array.isArray(raw.children)
      ? raw.children.map(normalizeNode).filter(Boolean) as DetailUiDslNode[]
      : [];
    if (children.length === 0) return null;
    return {
      kind: "panel",
      id,
      variant:
        raw.variant === "glass" || raw.variant === "solid" || raw.variant === "ghost"
          ? raw.variant
          : undefined,
      tone:
        raw.tone === "light" || raw.tone === "dark" || raw.tone === "accent"
          ? raw.tone
          : undefined,
      region: normalizeRegion(raw.region) || undefined,
      direction: raw.direction === "row" ? "row" : "column",
      gap: Number.isFinite(Number(raw.gap)) ? Math.max(0, Number(raw.gap)) : undefined,
      children,
    };
  }

  if (kind === "stack") {
    const children = Array.isArray(raw.children)
      ? raw.children.map(normalizeNode).filter(Boolean) as DetailUiDslNode[]
      : [];
    if (children.length === 0) return null;
    return {
      kind: "stack",
      id,
      gap: Number.isFinite(Number(raw.gap)) ? Math.max(0, Number(raw.gap)) : undefined,
      children,
    };
  }

  if (kind === "row") {
    const children = Array.isArray(raw.children)
      ? raw.children.map(normalizeNode).filter(Boolean) as DetailUiDslNode[]
      : [];
    if (children.length === 0) return null;
    return {
      kind: "row",
      id,
      gap: Number.isFinite(Number(raw.gap)) ? Math.max(0, Number(raw.gap)) : undefined,
      columns: Number.isFinite(Number(raw.columns)) ? Math.max(1, Number(raw.columns)) : undefined,
      children,
    };
  }

  if (kind === "badge") {
    const text = normalizeString(raw.text);
    if (!text) return null;
    return {
      kind: "badge",
      id,
      icon:
        raw.icon === "sparkle" || raw.icon === "shield" || raw.icon === "arrow" || raw.icon === "check"
          ? raw.icon
          : undefined,
      text,
      tone:
        raw.tone === "primary" || raw.tone === "secondary" || raw.tone === "neutral"
          ? raw.tone
          : undefined,
    };
  }

  if (kind === "heading") {
    const text = normalizeString(raw.text);
    if (!text) return null;
    return {
      kind: "heading",
      id,
      text,
      level: raw.level === 2 || raw.level === 3 ? raw.level : 1,
      emphasis: raw.emphasis === "section" ? "section" : "hero",
    };
  }

  if (kind === "body") {
    const text = normalizeString(raw.text);
    if (!text) return null;
    return {
      kind: "body",
      id,
      text,
      emphasis:
        raw.emphasis === "muted" || raw.emphasis === "strong"
          ? raw.emphasis
          : "normal",
    };
  }

  if (kind === "feature-card") {
    const title = normalizeString(raw.title);
    if (!title) return null;
    return {
      kind: "feature-card",
      id,
      icon:
        raw.icon === "sparkle" || raw.icon === "shield" || raw.icon === "arrow" || raw.icon === "check"
          ? raw.icon
          : undefined,
      tone:
        raw.tone === "primary" || raw.tone === "secondary" || raw.tone === "neutral"
          ? raw.tone
          : undefined,
      tag: normalizeString(raw.tag) || undefined,
      title,
      body: normalizeString(raw.body) || undefined,
    };
  }

  if (kind === "spec-table") {
    const rows = Array.isArray(raw.rows)
      ? raw.rows
          .map((row) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return null;
            const rowRaw = row as Record<string, unknown>;
            const label = normalizeString(rowRaw.label);
            const valueText = normalizeString(rowRaw.value);
            if (!label || !valueText) return null;
            return { label, value: valueText };
          })
          .filter(Boolean) as Array<{ label: string; value: string }>
      : [];
    if (rows.length === 0) return null;
    return { kind: "spec-table", id, rows };
  }

  if (kind === "compare") {
    const beforeRaw =
      raw.before && typeof raw.before === "object" && !Array.isArray(raw.before)
        ? (raw.before as Record<string, unknown>)
        : null;
    const afterRaw =
      raw.after && typeof raw.after === "object" && !Array.isArray(raw.after)
        ? (raw.after as Record<string, unknown>)
        : null;
    if (!beforeRaw || !afterRaw) return null;
    const beforeTitle = normalizeString(beforeRaw.title);
    const beforeBody = normalizeString(beforeRaw.body);
    const afterTitle = normalizeString(afterRaw.title);
    const afterBody = normalizeString(afterRaw.body);
    if (!beforeTitle || !beforeBody || !afterTitle || !afterBody) return null;
    return {
      kind: "compare",
      id,
      before: { title: beforeTitle, body: beforeBody },
      after: { title: afterTitle, body: afterBody },
    };
  }

  if (kind === "proof") {
    const text = normalizeString(raw.text);
    if (!text) return null;
    return {
      kind: "proof",
      id,
      icon:
        raw.icon === "sparkle" || raw.icon === "shield" || raw.icon === "arrow" || raw.icon === "check"
          ? raw.icon
          : undefined,
      text,
    };
  }

  if (kind === "cta") {
    const buttonText = normalizeString(raw.buttonText);
    if (!buttonText) return null;
    return {
      kind: "cta",
      id,
      headline: normalizeString(raw.headline) || undefined,
      buttonText,
      supportText: normalizeString(raw.supportText) || undefined,
    };
  }

  return null;
}

export function normalizeDetailUiDslV2Document(
  value: unknown,
): DetailUiDslV2Document | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const region = normalizeRegion(raw.region);
  if (!region) return null;

  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map(normalizeNode).filter(Boolean) as DetailUiDslNode[]
    : [];
  if (nodes.length === 0) return null;

  const layoutVariant =
    raw.layoutVariant === "hero-right-panel" ||
    raw.layoutVariant === "top-banner-bottom-grid" ||
    raw.layoutVariant === "floating-split" ||
    raw.layoutVariant === "cta-focus"
      ? raw.layoutVariant
      : "hero-left-panel";

  const screenSizeRaw =
    raw.screenSize && typeof raw.screenSize === "object" && !Array.isArray(raw.screenSize)
      ? (raw.screenSize as Record<string, unknown>)
      : {};

  return {
    version: "detail-ui-dsl/v2",
    surfaceId: normalizeString(raw.surfaceId, "detail-ui-dsl-v2"),
    screenIndex: Math.max(1, Number(raw.screenIndex || 1)),
    generationMode: raw.generationMode === "classic" ? "classic" : "agent_layout",
    screenSize: {
      width: Math.max(1, Number(screenSizeRaw.width || 790)),
      height: Math.max(1, Number(screenSizeRaw.height || 1300)),
    },
    designStyle:
      raw.designStyle && typeof raw.designStyle === "object" && !Array.isArray(raw.designStyle)
        ? (raw.designStyle as DetailUiGlobalStyle)
        : undefined,
    region,
    layoutVariant,
    nodes,
  };
}
