// Modified for standalone community distribution; see NOTICE.
import type { DetailUiScreenOverlaySnapshot } from "@/src/lib/detail-ui-surface-adapter";
import type { DetailUiSubjectAnalysis } from "@/src/lib/detail-ui-subject-analysis";
import type { DetailUiDslRegion, DetailUiDslV2Document, DetailUiDslNode } from "@/src/lib/detail-ui-dsl-v2";

type ScreenData = NonNullable<DetailUiScreenOverlaySnapshot["dataModel"]["screen"]>;

function splitCopy(text?: string) {
  const parts = String(text || "")
    .split(/[。\n！!？?；;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (parts.length === 0) return [];
  if (parts.length <= 4) return parts;
  return [
    parts.slice(0, 2).join(" · "),
    parts.slice(2, 4).join(" · "),
    parts.slice(4).join(" · "),
  ].filter(Boolean);
}

function pickLayoutVariant(params: {
  screenIndex: number;
  totalScreens?: number;
  screenType?: string;
  subject?: DetailUiSubjectAnalysis | null;
}) {
  if ((params.totalScreens || 0) > 0 && params.screenIndex === params.totalScreens) {
    return "cta-focus" as const;
  }
  if (params.subject?.dominantHorizontal === "left") {
    return "hero-right-panel" as const;
  }
  if (params.subject?.dominantHorizontal === "right") {
    return "hero-left-panel" as const;
  }
  if (params.screenType === "C") {
    return "floating-split" as const;
  }
  return "top-banner-bottom-grid" as const;
}

function normalizedRegionToPixels(region: DetailUiDslRegion, width: number, height: number) {
  return {
    x: Math.round(region.x * width),
    y: Math.round(region.y * height),
    width: Math.round(region.width * width),
    height: Math.round(region.height * height),
  };
}

function pickRegion(params: {
  variant: DetailUiDslV2Document["layoutVariant"];
  subject?: DetailUiSubjectAnalysis | null;
}) {
  if (params.variant === "hero-right-panel") {
    return params.subject?.safeZones.right || {
      x: 0.54,
      y: 0.06,
      width: 0.38,
      height: 0.84,
    };
  }
  if (params.variant === "hero-left-panel") {
    return params.subject?.safeZones.left || {
      x: 0.06,
      y: 0.06,
      width: 0.38,
      height: 0.84,
    };
  }
  if (params.variant === "cta-focus") {
    return params.subject?.safeZones.right || params.subject?.safeZones.left || {
      x: 0.52,
      y: 0.10,
      width: 0.40,
      height: 0.80,
    };
  }
  if (params.variant === "floating-split") {
    return params.subject?.safeZones.top || {
      x: 0.06,
      y: 0.05,
      width: 0.88,
      height: 0.36,
    };
  }
  return params.subject?.safeZones.top || {
    x: 0.06,
    y: 0.05,
    width: 0.88,
    height: 0.46,
  };
}

function buildFeatureNodes(params: {
  screen: ScreenData;
}) {
  const chunks = splitCopy(params.screen.copy);
  const featureSource =
    chunks.length > 0 ? chunks : [params.screen.subtitle || params.screen.title].filter(Boolean);

  return featureSource.slice(0, 3).map((item, index) => {
    const tone = index === 0 ? "primary" : index === 1 ? "secondary" : "neutral";
    return {
      kind: "feature-card",
      id: `feature-${index + 1}`,
      icon: "sparkle",
      tone,
      tag: index === 0 ? "核心升级" : index === 1 ? "场景收益" : "舒适证明",
      title: item,
      body:
        index === 0
          ? params.screen.subtitle || params.screen.objective || ""
          : index === 1
            ? params.screen.objective || params.screen.layoutNote || ""
            : params.screen.layoutNote || params.screen.subtitle || "",
    } satisfies DetailUiDslNode;
  });
}

function buildSpecRows(screen: ScreenData) {
  return [
    { label: "核心卖点", value: screen.title || "核心升级" },
    ...(screen.objective ? [{ label: "适用场景", value: screen.objective }] : []),
    ...(screen.subtitle ? [{ label: "结果表达", value: screen.subtitle }] : []),
    ...(screen.layoutNote ? [{ label: "设计要求", value: screen.layoutNote }] : []),
  ];
}

export function buildDetailUiDslV2(params: {
  overlay: DetailUiScreenOverlaySnapshot;
  subjectAnalysis?: DetailUiSubjectAnalysis | null;
}) {
  const screen = params.overlay.dataModel.screen;
  if (!screen) return null;

  const totalScreens = Number(params.overlay.surfaceId.split("-")[3] || 0) || undefined;
  const variant = pickLayoutVariant({
    screenIndex: params.overlay.screenIndex,
    totalScreens,
    screenType: screen.screenType,
    subject: params.subjectAnalysis,
  });
  const region = pickRegion({
    variant,
    subject: params.subjectAnalysis,
  });

  const nodes: DetailUiDslNode[] = [];

  const heroPanel: DetailUiDslNode = {
    kind: "panel",
    id: "hero-panel",
    variant: "glass",
    tone: variant === "hero-right-panel" ? "light" : "dark",
    direction: "column",
    gap: 18,
    children: [
      {
        kind: "badge",
        id: "screen-badge",
        icon: "sparkle",
        text:
          screen.screenType === "A"
            ? "技术证明"
            : screen.screenType === "B"
              ? "场景共鸣"
              : screen.screenType === "C"
                ? "细节证明"
                : `第${screen.index}屏`,
        tone: screen.screenType === "A" ? "neutral" : "primary",
      },
      {
        kind: "heading",
        id: "hero-title",
        text: screen.title || "",
        level: 1,
        emphasis: "hero",
      },
      ...(screen.subtitle
        ? [
            {
              kind: "body",
              id: "hero-subtitle",
              text: screen.subtitle,
              emphasis: "strong",
            } satisfies DetailUiDslNode,
          ]
        : []),
    ],
  };

  nodes.push(heroPanel);

  const featureNodes = buildFeatureNodes({ screen });
  const specRows = buildSpecRows(screen);

  if (variant === "floating-split") {
    nodes.push({
      kind: "row",
      id: "compare-row",
      columns: 2,
      gap: 16,
      children: [
        {
          kind: "compare",
          id: "compare-panel",
          before: {
            title: "旧方式",
            body: featureNodes[0]?.title || "久坐容易疲劳、支撑不足",
          },
          after: {
            title: "现在",
            body: featureNodes[1]?.title || screen.subtitle || screen.title,
          },
        },
        {
          kind: "stack",
          id: "support-stack",
          gap: 14,
          children: [
            ...(featureNodes.slice(0, 2) as DetailUiDslNode[]),
            {
              kind: "proof",
              id: "proof-bar",
              icon: "shield",
              text: screen.layoutNote || screen.objective || screen.subtitle || screen.title,
            },
          ],
        },
      ],
    });
  } else if (variant === "hero-left-panel" || variant === "hero-right-panel") {
    nodes.push({
      kind: "stack",
      id: "support-column",
      gap: 16,
      children: [
        ...featureNodes,
        ...(screen.screenType === "A"
          ? [
              {
                kind: "spec-table",
                id: "spec-table",
                rows: specRows,
              } satisfies DetailUiDslNode,
            ]
          : []),
        {
          kind: "proof",
          id: "proof-bar",
          icon: "shield",
          text: screen.layoutNote || screen.objective || screen.subtitle || screen.title,
        },
      ],
    });
  } else {
    nodes.push({
      kind: "stack",
      id: "feature-grid-stack",
      gap: 16,
      children: [
        {
          kind: "row",
          id: "feature-row",
          columns: Math.min(3, Math.max(1, featureNodes.length)),
          gap: 12,
          children: featureNodes as DetailUiDslNode[],
        },
        {
          kind: "proof",
          id: "proof-bar",
          icon: "shield",
          text: screen.layoutNote || screen.objective || screen.subtitle || screen.title,
        },
      ],
    });
  }

  if (variant === "cta-focus" || /(下单|购买|转化|cta)/i.test(screen.layoutNote || "")) {
    nodes.push({
      kind: "cta",
      id: "cta-section",
      headline: screen.title,
      buttonText: screen.screenType === "C" ? "立即对比体验" : "立即了解详情",
      supportText: screen.subtitle || screen.objective || "继续查看完整卖点与场景说明",
    });
  }

  return {
    version: "detail-ui-dsl/v2",
    surfaceId: params.overlay.surfaceId,
    screenIndex: params.overlay.screenIndex,
    generationMode: params.overlay.generationMode,
    screenSize: params.overlay.screenSize,
    designStyle: params.overlay.dataModel.globalStyle,
    region,
    layoutVariant: variant,
    nodes,
  } satisfies DetailUiDslV2Document;
}
