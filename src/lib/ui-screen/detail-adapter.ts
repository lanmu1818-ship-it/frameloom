// Modified for standalone community distribution; see NOTICE.
import { normalizeDetailUiDslV2Document, type DetailUiDslNode, type DetailUiDslV2Document } from "@/src/lib/detail-ui-dsl-v2";
import type { UiScreenDocument, UiScreenLayer } from "@/src/lib/ui-screen/schema";

type DetailUiScreenBackground = {
  src: string;
  thumbnailUrl?: string;
  alt?: string;
};

function normalizedRegionToBounds(
  region: DetailUiDslV2Document["region"],
  width: number,
  height: number
) {
  return {
    x: Math.round(region.x * width),
    y: Math.round(region.y * height),
    width: Math.round(region.width * width),
    height: Math.round(region.height * height),
  };
}

function typographySize(node: DetailUiDslNode) {
  if (node.kind === "heading") {
    return node.emphasis === "hero" ? 54 : 34;
  }
  if (node.kind === "body") {
    return node.emphasis === "strong" ? 22 : node.emphasis === "muted" ? 17 : 19;
  }
  return 18;
}

function panelStyle(node: Extract<DetailUiDslNode, { kind: "panel" }>) {
  if (node.variant === "glass" && node.tone === "dark") {
    return {
      background: "rgba(15, 23, 42, 0.76)",
      color: "#ffffff",
      borderColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderRadius: 12,
      padding: 24,
      gap: node.gap || 18,
      blur: 14,
      boxShadow: "0 18px 48px rgba(15, 23, 42, 0.24)",
    };
  }

  if (node.variant === "glass" && node.tone === "accent") {
    return {
      background: "rgba(37, 99, 235, 0.88)",
      color: "#ffffff",
      borderColor: "rgba(147,197,253,0.34)",
      borderWidth: 1,
      borderRadius: 12,
      padding: 24,
      gap: node.gap || 18,
      blur: 12,
      boxShadow: "0 18px 44px rgba(37, 99, 235, 0.20)",
    };
  }

  return {
    background: node.variant === "ghost" ? "transparent" : "rgba(255, 255, 255, 0.88)",
    color: "#0f172a",
    borderColor: node.variant === "ghost" ? "transparent" : "rgba(255,255,255,0.6)",
    borderWidth: node.variant === "ghost" ? 0 : 1,
    borderRadius: node.variant === "ghost" ? 0 : 12,
    padding: node.variant === "ghost" ? 0 : 24,
    gap: node.gap || 18,
    blur: node.variant === "ghost" ? 0 : 12,
    boxShadow: node.variant === "ghost" ? undefined : "0 18px 48px rgba(15, 23, 42, 0.12)",
  };
}

function convertDetailNode(node: DetailUiDslNode, path: string): UiScreenLayer {
  const id = `${path}-${node.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  if (node.kind === "panel") {
    return {
      id,
      kind: "stack",
      name: node.id,
      direction: node.direction || "column",
      align: "stretch",
      justify: "start",
      style: panelStyle(node),
      children: node.children.map((child) => convertDetailNode(child, id)),
    };
  }

  if (node.kind === "stack") {
    return {
      id,
      kind: "stack",
      name: node.id,
      direction: "column",
      align: "stretch",
      justify: "start",
      style: {
        gap: node.gap || 14,
      },
      children: node.children.map((child) => convertDetailNode(child, id)),
    };
  }

  if (node.kind === "row") {
    return {
      id,
      kind: "grid",
      name: node.id,
      columns: Math.max(1, node.columns || node.children.length || 1),
      style: {
        gap: node.gap || 14,
      },
      children: node.children.map((child) => convertDetailNode(child, id)),
    };
  }

  if (node.kind === "badge") {
    return {
      id,
      kind: "badge",
      name: node.id,
      label: node.text,
      tone: node.tone || "primary",
      style: {
        fontSize: 15,
        fontWeight: 700,
      },
    };
  }

  if (node.kind === "heading") {
    return {
      id,
      kind: "text",
      name: node.id,
      text: node.text,
      style: {
        fontSize: typographySize(node),
        fontWeight: 700,
        lineHeight: 1.06,
        letterSpacing: 0,
      },
    };
  }

  if (node.kind === "body") {
    return {
      id,
      kind: "text",
      name: node.id,
      text: node.text,
      style: {
        fontSize: typographySize(node),
        fontWeight: node.emphasis === "muted" ? 500 : 650,
        lineHeight: 1.35,
        color: node.emphasis === "muted" ? "rgba(71,85,105,0.82)" : undefined,
      },
    };
  }

  if (node.kind === "feature-card") {
    return {
      id,
      kind: "card",
      name: node.id,
      style: {
        background: "#ffffff",
        color: "#0f172a",
        borderColor:
          node.tone === "secondary"
            ? "rgba(196,181,253,0.72)"
            : node.tone === "neutral"
              ? "rgba(226,232,240,0.9)"
              : "rgba(191,219,254,0.86)",
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
      },
      children: [
        ...(node.tag
          ? [
              {
                id: `${id}-tag`,
                kind: "badge" as const,
                label: node.tag,
                tone: node.tone || "primary",
                style: {
                  fontSize: 13,
                  fontWeight: 700,
                },
              },
            ]
          : []),
        {
          id: `${id}-title`,
          kind: "text",
          text: node.title,
          style: {
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1.18,
            color: "#0f172a",
          },
        },
        ...(node.body
          ? [
              {
                id: `${id}-body`,
                kind: "text" as const,
                text: node.body,
                style: {
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: "#64748b",
                },
              },
            ]
          : []),
      ],
    };
  }

  if (node.kind === "spec-table") {
    return {
      id,
      kind: "stack",
      name: node.id,
      direction: "column",
      style: {
        background: "rgba(255,255,255,0.96)",
        borderColor: "rgba(191,219,254,0.72)",
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        gap: 8,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
      },
      children: node.rows.map((row, index) => ({
        id: `${id}-row-${index + 1}`,
        kind: "grid",
        columns: 2,
        style: { gap: 8 },
        children: [
          {
            id: `${id}-row-${index + 1}-label`,
            kind: "text",
            text: row.label,
            style: {
              background: "#f1f5f9",
              borderRadius: 12,
              paddingX: 12,
              paddingY: 9,
              fontSize: 14,
              fontWeight: 700,
              textAlign: "center",
              color: "#475569",
            },
          },
          {
            id: `${id}-row-${index + 1}-value`,
            kind: "text",
            text: row.value,
            style: {
              background: "#ffffff",
              borderRadius: 12,
              paddingX: 12,
              paddingY: 9,
              fontSize: 14,
              fontWeight: 500,
              color: "#0f172a",
            },
          },
        ],
      })),
    };
  }

  if (node.kind === "compare") {
    return {
      id,
      kind: "grid",
      name: node.id,
      columns: 2,
      style: { gap: 14 },
      children: [
        {
          id: `${id}-before`,
          kind: "card",
          style: {
            background: "rgba(255,255,255,0.95)",
            borderColor: "rgba(226,232,240,0.9)",
            borderWidth: 1,
            borderRadius: 10,
            padding: 16,
            boxShadow: "0 10px 26px rgba(15,23,42,0.07)",
          },
          children: [
            {
              id: `${id}-before-title`,
              kind: "text",
              text: node.before.title,
              style: { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase" },
            },
            {
              id: `${id}-before-body`,
              kind: "text",
              text: node.before.body,
              style: { fontSize: 16, fontWeight: 500, lineHeight: 1.35, color: "#475569" },
            },
          ],
        },
        {
          id: `${id}-after`,
          kind: "card",
          style: {
            background: "rgba(37,99,235,0.94)",
            color: "#ffffff",
            borderColor: "rgba(147,197,253,0.8)",
            borderWidth: 1,
            borderRadius: 10,
            padding: 16,
            boxShadow: "0 14px 34px rgba(37,99,235,0.18)",
          },
          children: [
            {
              id: `${id}-after-title`,
              kind: "text",
              text: node.after.title,
              style: { fontSize: 13, fontWeight: 700, color: "#dbeafe", textTransform: "uppercase" },
            },
            {
              id: `${id}-after-body`,
              kind: "text",
              text: node.after.body,
              style: { fontSize: 16, fontWeight: 650, lineHeight: 1.35, color: "#ffffff" },
            },
          ],
        },
      ],
    };
  }

  if (node.kind === "proof") {
    return {
      id,
      kind: "badge",
      name: node.id,
      label: node.text,
      tone: "neutral",
      style: {
        background: "rgba(255,255,255,0.94)",
        color: "#334155",
        borderColor: "rgba(226,232,240,0.9)",
        borderWidth: 1,
        borderRadius: 999,
        paddingX: 16,
        paddingY: 11,
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 8px 22px rgba(15,23,42,0.07)",
      },
    };
  }

  return {
    id,
    kind: "card",
    name: node.id,
    style: {
      background: "rgba(15,23,42,0.82)",
      color: "#ffffff",
      borderColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 16px 38px rgba(15,23,42,0.20)",
    },
    children: [
      ...(node.headline
        ? [
            {
              id: `${id}-headline`,
              kind: "text" as const,
              text: node.headline,
              style: {
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.1,
              },
            },
          ]
        : []),
      {
        id: `${id}-button`,
        kind: "button",
        label: node.buttonText,
        tone: "primary",
        style: {
          fontSize: 15,
          fontWeight: 700,
          paddingX: 20,
          paddingY: 14,
        },
      },
      ...(node.supportText
        ? [
            {
              id: `${id}-support`,
              kind: "text" as const,
              text: node.supportText,
              style: {
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.3,
                color: "#cbd5e1",
              },
            },
          ]
        : []),
    ],
  };
}

export function buildUiScreenDocumentFromDetailUiDsl(params: {
  dsl: unknown;
  background: DetailUiScreenBackground;
  title?: string;
  metadata?: Record<string, unknown>;
}): UiScreenDocument | null {
  const dsl = normalizeDetailUiDslV2Document(params.dsl);
  const backgroundSrc = String(params.background.src || "").trim();
  if (!dsl || !backgroundSrc) return null;

  const width = dsl.screenSize.width;
  const height = dsl.screenSize.height;
  const regionBounds = normalizedRegionToBounds(dsl.region, width, height);

  const contentLayer: UiScreenLayer = {
    id: `detail-screen-${dsl.screenIndex}-content`,
    kind: "stack",
    name: "可编辑详情排版",
    bounds: regionBounds,
    direction: "column",
    align: "stretch",
    justify:
      dsl.layoutVariant === "floating-split" || dsl.layoutVariant === "cta-focus"
        ? "between"
        : "start",
    style: {
      gap: 18,
      fontFamily: dsl.designStyle?.typography?.fontFamily || "Inter, Arial, sans-serif",
    },
    children: dsl.nodes.map((node) => convertDetailNode(node, `detail-${dsl.screenIndex}`)),
  };

  return {
    version: "ui-screen/v1",
    id: `detail-ui-screen-${dsl.surfaceId}-${dsl.screenIndex}`,
    title: params.title || `详情图-${dsl.screenIndex}`,
    width,
    height,
    tokens: {
      colors: {
        primary: "#0071e3",
        text: "#0f172a",
        muted: "#64748b",
        surface: "#ffffff",
      },
      shadows: {
        soft: "0 12px 30px rgba(15,23,42,0.10)",
        strong: "0 18px 48px rgba(15,23,42,0.18)",
      },
    },
    assets: [
      {
        id: "background",
        type: "image",
        src: backgroundSrc,
        alt: params.background.alt || params.title || `详情图-${dsl.screenIndex}`,
      },
    ],
    layers: [
      {
        id: `detail-screen-${dsl.screenIndex}-background`,
        kind: "image",
        name: "AI画面层",
        assetId: "background",
        fit: "cover",
        bounds: {
          x: 0,
          y: 0,
          width,
          height,
        },
      },
      contentLayer,
    ],
    metadata: {
      ...(params.metadata || {}),
      source: "detail-agent-layout",
      detailDesignSkillVersion:
        (params.metadata?.detailDesignSkill as { version?: unknown } | undefined)?.version ||
        "detail-ui-design-skill/v1",
      detailDslVersion: dsl.version,
      detailSurfaceId: dsl.surfaceId,
      detailScreenIndex: dsl.screenIndex,
      detailLayoutVariant: dsl.layoutVariant,
      backgroundThumbnailUrl: params.background.thumbnailUrl,
    },
  };
}
