// Modified for standalone community distribution; see NOTICE.
import type {
  DetailGenerationMode,
  DetailUiGlobalStyle,
  DetailUiProtocol,
  DetailUiScreenInput,
  DetailUiScreenProtocol,
  DetailUiScreenReviewPatch,
} from "@/src/lib/detail-ui-protocol";
import { getDetailUiDesignTokens } from "@/src/lib/detail-ui-design-tokens";
import {
  moveFrameForSubjectAvoidance,
  resolveDetailUiTemplate,
} from "@/src/lib/detail-ui-templates";
import type {
  UiSurfaceComponent,
  UiSurfacePatch,
  UiSurfaceSnapshot,
} from "@/src/lib/ui-surface-protocol";
import {
  collectUiSurfaceDescendantIds,
  getUiSurfaceChildren,
} from "@/src/lib/ui-surface-protocol";

function createDetailSurfaceId(params: {
  generationMode: DetailGenerationMode;
  screenCount: number;
}) {
  return `detail-surface-${params.generationMode}-${params.screenCount}-790x1300`;
}

function createRootComponent(): UiSurfaceComponent {
  return {
    id: "detail-page-root",
    type: "detail_page_root",
    parentId: null,
    props: {
      role: "detail_page",
    },
  };
}

type DetailSurfaceLayoutVariant = "hero_left" | "hero_right" | "split_bottom";

function splitBodyCopyIntoHighlights(copy?: string) {
  const segments = String(copy || "")
    .split(/[。\n！!？?；;]+/g)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (segments.length === 0) return [];
  if (segments.length <= 3) return segments;

  return [
    segments.slice(0, 2).join(" · "),
    segments.slice(2, 4).join(" · "),
    segments.slice(4).join(" · "),
  ].filter(Boolean);
}

function pickScreenLayoutVariant(params: {
  screenIndex: number;
  screenType?: string;
}): DetailSurfaceLayoutVariant {
  if (params.screenIndex === 1 || params.screenType === "B") {
    return "hero_left";
  }
  if (params.screenType === "A") {
    return "hero_right";
  }
  return "split_bottom";
}

function buildScreenBadgeLabel(params: {
  screenIndex: number;
  screenType?: string;
  objective?: string;
}) {
  const normalizedObjective = String(params.objective || "").replace(/\s+/g, " ").trim();
  if (normalizedObjective) return normalizedObjective.slice(0, 18);

  if (params.screenType === "A") return "技术证明";
  if (params.screenType === "B") return "场景共鸣";
  if (params.screenType === "C") return "细节证明";
  return `第 ${params.screenIndex} 屏`;
}

function createStyledSurfaceTextComponent(params: {
  id: string;
  type:
    | "detail_card"
    | "detail_badge"
    | "detail_text_block"
    | "detail_feature_card"
    | "detail_feature_tag"
    | "detail_spec_table"
    | "detail_table_label"
    | "detail_table_value"
    | "detail_comparison_strip"
    | "detail_compare_before"
    | "detail_compare_after"
    | "detail_proof_bar"
    | "detail_cta_banner"
    | "detail_cta_button"
    | "detail_cta_support";
  parentId: string;
  frame: { x: number; y: number; width: number; height: number };
  zIndex?: number;
  content?: string;
  bindingPath?: string;
  role: string;
  style: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return {
    id: params.id,
    type: params.type,
    parentId: params.parentId,
    props: {
      role: params.role,
      content: params.content || "",
    },
    bindings: params.bindingPath
      ? {
          content: {
            kind: "text" as const,
            path: params.bindingPath,
          },
        }
      : undefined,
    layout: {
      frame: params.frame,
      zIndex: params.zIndex || 1,
    },
    style: params.style,
    metadata: params.metadata,
  } satisfies UiSurfaceComponent;
}

function buildCatalogStrings(params: {
  screenIndex: number;
  totalScreens?: number;
  screen: Pick<
    DetailUiScreenInput,
    "title" | "subtitle" | "copy" | "screenType" | "objective" | "layoutNote"
  >;
}) {
  const highlights = splitBodyCopyIntoHighlights(params.screen.copy).slice(0, 3);
  const primaryTitle = String(params.screen.title || "").replace(/\s+/g, " ").trim();
  const subtitle = String(params.screen.subtitle || "").replace(/\s+/g, " ").trim();
  const objective = String(params.screen.objective || "").replace(/\s+/g, " ").trim();
  const layoutNote = String(params.screen.layoutNote || "").replace(/\s+/g, " ").trim();
  const catalogTitle = primaryTitle || "核心卖点";

  const featureCards = (highlights.length > 0
    ? highlights
    : [subtitle || catalogTitle].filter(Boolean)
  )
    .slice(0, 3)
    .map((item, index) => ({
      tag:
        index === 0
          ? "核心升级"
          : index === 1
            ? "场景收益"
            : "舒适证明",
      title: item,
      detail:
        index === 0
          ? subtitle || objective || "围绕核心体验完成升级"
          : index === 1
            ? objective || layoutNote || "匹配真实使用场景"
            : layoutNote || subtitle || "用可感知结果证明价值",
      accent: index === 0 ? "primary" : index === 1 ? "secondary" : "neutral",
    }));

  const specRows = [
    { label: "核心卖点", value: catalogTitle || "舒适支撑" },
    ...(objective ? [{ label: "适用场景", value: objective }] : []),
    ...(subtitle ? [{ label: "结果表达", value: subtitle }] : []),
    ...(layoutNote ? [{ label: "设计要求", value: layoutNote }] : []),
  ];

  const comparison = {
    beforeTitle: "旧方式",
    beforeBody: highlights[0] || "久坐容易疲劳、支撑不足、使用场景不聚焦",
    afterTitle: "现在",
    afterBody: highlights[1] || subtitle || "围绕护腰/舒适/效率完成体验升级",
  };

  const proof = {
    label: params.screen.screenType === "A" ? "技术证明" : "结果证明",
    value: layoutNote || objective || subtitle || catalogTitle,
  };
  const shouldShowCta =
    params.screenIndex === (params.totalScreens || 0) ||
    /下单|购买|收口|转化|cta|call to action/i.test(layoutNote);
  const cta = shouldShowCta
    ? {
        buttonLabel: params.screen.screenType === "C" ? "立即对比体验" : "立即了解详情",
        supportText: subtitle || objective || "继续查看完整卖点与场景说明",
        highlightText: catalogTitle,
      }
    : null;

  return {
    featureCards,
    specRows,
    comparison,
    proof,
    cta,
  };
}

function createSectionComponent(params: {
  id: string;
  parentId: string;
  role: string;
  frame: { x: number; y: number; width: number; height: number };
  zIndex?: number;
  metadata?: Record<string, unknown>;
}) {
  return {
    id: params.id,
    type: "detail_section" as const,
    parentId: params.parentId,
    props: {
      role: params.role,
    },
    layout: {
      frame: params.frame,
      zIndex: params.zIndex || 1,
    },
    metadata: params.metadata,
  } satisfies UiSurfaceComponent;
}

function buildSectionedTextComponents(params: {
  screenId: string;
  textStackId: string;
  screenIndex: number;
  totalScreens?: number;
  screenSize: { width: number; height: number };
  screen: Pick<
    DetailUiScreenInput,
    "title" | "subtitle" | "copy" | "screenType" | "objective" | "layoutNote"
  >;
  screenProtocol?: DetailUiScreenProtocol;
}) {
  const safeArea = params.screenProtocol?.safeArea || {
    top: 64,
    bottom: 360,
    left: 56,
    right: 56,
  };
  const contentWidth = Math.max(
    260,
    Math.round(params.screenSize.width - safeArea.left - safeArea.right),
  );
  const variant = pickScreenLayoutVariant({
    screenIndex: params.screenIndex,
    screenType: params.screen.screenType,
  });
  const template = resolveDetailUiTemplate({
    screenIndex: params.screenIndex,
    totalScreens: params.totalScreens,
    screenType: params.screen.screenType,
  });
  const tokens = getDetailUiDesignTokens({
    variant,
    screenType: params.screen.screenType,
    isFirstScreen: params.screenIndex === 1,
  });
  const badgeLabel = buildScreenBadgeLabel({
    screenIndex: params.screenIndex,
    screenType: params.screen.screenType,
    objective: params.screen.objective,
  });
  const catalog = buildCatalogStrings({
    screenIndex: params.screenIndex,
    totalScreens: params.totalScreens,
    screen: params.screen,
  });

  const titleBlock =
    params.screenProtocol?.blocks.find((block) => block.type === "title") || null;
  const subtitleBlock =
    params.screenProtocol?.blocks.find((block) => block.type === "subtitle") || null;
  const bodyBlock =
    params.screenProtocol?.blocks.find((block) => block.type === "body") || null;

  const titleFrame = moveFrameForSubjectAvoidance(
    {
      ...template.titleFrame,
      height: Math.max(template.titleFrame.height, Math.round(Number(titleBlock?.frame.height || template.titleFrame.height))),
    },
    template.subjectAvoidanceBox,
    variant === "hero_right" ? "right" : "left",
  );
  const subtitleFrame = moveFrameForSubjectAvoidance(
    {
      ...template.subtitleFrame,
      height: Math.max(template.subtitleFrame.height, Math.round(Number(subtitleBlock?.frame.height || template.subtitleFrame.height))),
    },
    template.subjectAvoidanceBox,
    variant === "hero_right" ? "right" : "left",
  );

  const components: UiSurfaceComponent[] = [];

  components.push(
    createSectionComponent({
      id: `${params.screenId}-section-hero`,
      parentId: params.textStackId,
      role: "hero_section",
      frame: {
        x: Math.min(titleFrame.x, template.badgeFrame.x),
        y: template.badgeFrame.y,
        width: Math.max(titleFrame.width, subtitleFrame.width),
        height: subtitleFrame.y + subtitleFrame.height - template.badgeFrame.y,
      },
      metadata: {
        screenIndex: params.screenIndex,
        variant,
      },
    }),
  );

  components.push(
    createStyledSurfaceTextComponent({
      id: `${params.screenId}-badge`,
      type: "detail_badge",
      parentId: `${params.screenId}-section-hero`,
      frame: {
        ...template.badgeFrame,
        width: Math.min(template.badgeFrame.width, Math.max(104, badgeLabel.length * 18)),
      },
      zIndex: 3,
      content: badgeLabel,
      role: "screen_badge",
      style: {
        fontSize: tokens.typography.label.fontSize + 2,
        fontWeight: "700",
        color: tokens.badge.color,
        textAlign: "center",
        lineHeight: 1.15,
        letterSpacing: 0.4,
        backgroundColor: tokens.badge.backgroundColor,
        borderColor: tokens.badge.borderColor,
        borderWidth: 1,
        borderRadius: 999,
        padding: 8,
        boxShadow: "0 10px 28px rgba(15,23,42,0.20)",
        backdropBlur: 8,
        textTransform: "uppercase",
      },
      metadata: {
        screenIndex: params.screenIndex,
        componentRole: "badge",
      },
    }),
  );

  components.push(
    createStyledSurfaceTextComponent({
        id: `${params.screenId}-title-card`,
        type: "detail_card",
        parentId: `${params.screenId}-section-hero`,
      frame: titleFrame,
      zIndex: 2,
      bindingPath: `/screens/${params.screenIndex - 1}/title`,
      role: "title_card",
      style: {
        fontFamily: titleBlock?.style.fontFamily || undefined,
        fontSize: Math.max(34, Number(titleBlock?.style.fontSize || tokens.typography.title.fontSize)),
        fontWeight: titleBlock?.style.fontWeight || tokens.typography.title.fontWeight,
        color: tokens.typography.title.color,
        textAlign: "left",
        lineHeight: tokens.typography.title.lineHeight,
        letterSpacing: tokens.typography.title.letterSpacing,
        backgroundColor: tokens.heroCard.backgroundColor,
        borderColor: tokens.heroCard.borderColor,
        borderWidth: 1,
        borderRadius: 28,
        padding: 24,
        boxShadow: tokens.heroCard.shadow,
        backdropBlur: 14,
      },
      metadata: {
        screenIndex: params.screenIndex,
        componentRole: "title",
      },
    }),
  );

  if (params.screen.subtitle) {
    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-subtitle-card`,
        type: "detail_card",
        parentId: `${params.screenId}-section-hero`,
        frame: subtitleFrame,
        zIndex: 2,
        bindingPath: `/screens/${params.screenIndex - 1}/subtitle`,
        role: "subtitle_card",
        style: {
          fontFamily: subtitleBlock?.style.fontFamily || undefined,
          fontSize: Math.max(22, Number(subtitleBlock?.style.fontSize || tokens.typography.subtitle.fontSize)),
          fontWeight: subtitleBlock?.style.fontWeight || tokens.typography.subtitle.fontWeight,
          color: tokens.subtitleCard.color,
          textAlign: "left",
          lineHeight: tokens.typography.subtitle.lineHeight,
          backgroundColor: tokens.subtitleCard.backgroundColor,
          borderColor: tokens.subtitleCard.borderColor,
          borderWidth: 1,
          borderRadius: 22,
          padding: 18,
          boxShadow: tokens.subtitleCard.shadow,
          backdropBlur: 12,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "subtitle",
        },
      }),
    );
  }

  const supportingSectionFrame = {
    x: Math.min(...template.featureCardFrames.map((frame) => frame.x)),
    y: Math.min(
      ...template.featureCardFrames.map((frame) => frame.y),
      template.specTableSectionFrame.y,
      template.comparisonBeforeFrame.y,
      template.proofFrame.y,
    ),
    width: Math.max(
      ...template.featureCardFrames.map((frame) => frame.x + frame.width),
      template.specTableSectionFrame.x + template.specTableSectionFrame.width,
      template.comparisonAfterFrame.x + template.comparisonAfterFrame.width,
    ) - Math.min(...template.featureCardFrames.map((frame) => frame.x)),
    height:
      Math.max(
        ...template.featureCardFrames.map((frame) => frame.y + frame.height),
        template.specTableSectionFrame.y + template.specTableSectionFrame.height,
        template.comparisonAfterFrame.y + template.comparisonAfterFrame.height,
        template.ctaBannerFrame.y + template.ctaBannerFrame.height,
      ) -
      Math.min(
        ...template.featureCardFrames.map((frame) => frame.y),
        template.specTableSectionFrame.y,
        template.comparisonBeforeFrame.y,
      ),
  };

  components.push(
    createSectionComponent({
      id: `${params.screenId}-section-supporting`,
      parentId: params.textStackId,
      role: variant === "split_bottom" ? "supporting_bottom_section" : "supporting_grid",
      frame: supportingSectionFrame,
      zIndex: 1,
      metadata: {
        screenIndex: params.screenIndex,
        variant,
      },
    }),
  );

  const supportingCards =
    catalog.featureCards.length > 0
      ? catalog.featureCards
      : [
          {
            tag: "核心信息",
            title: String(params.screen.copy || "").trim() || catalog.proof.value,
            detail: catalog.proof.value,
            accent: "primary",
          },
        ];
  supportingCards.forEach((highlight, index) => {
    const tagFrame = template.featureTagFrames[index] || template.featureTagFrames[template.featureTagFrames.length - 1]!;
    const cardFrame = template.featureCardFrames[index] || template.featureCardFrames[template.featureCardFrames.length - 1]!;

    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-feature-tag-${index + 1}`,
        type: "detail_feature_tag",
        parentId: `${params.screenId}-section-supporting`,
        frame: {
          ...tagFrame,
          width: Math.min(tagFrame.width, Math.max(76, highlight.tag.length * 17)),
        },
        zIndex: 3,
        content: `✦ ${highlight.tag}`,
        role: "feature_tag",
          style: {
            fontSize: 13,
            fontWeight: "700",
            color:
              highlight.accent === "primary"
              ? tokens.featureTag.primary.color
              : highlight.accent === "secondary"
                ? tokens.featureTag.secondary.color
                : tokens.featureTag.neutral.color,
            textAlign: "center",
            lineHeight: 1.1,
            backgroundColor:
              highlight.accent === "primary"
              ? tokens.featureTag.primary.backgroundColor
              : highlight.accent === "secondary"
                ? tokens.featureTag.secondary.backgroundColor
                : tokens.featureTag.neutral.backgroundColor,
            borderColor:
              highlight.accent === "primary"
              ? tokens.featureTag.primary.borderColor
              : highlight.accent === "secondary"
                ? tokens.featureTag.secondary.borderColor
                : tokens.featureTag.neutral.borderColor,
          borderWidth: 1,
          borderRadius: 999,
          padding: 6,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "feature_tag",
        },
      }),
    );

    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-support-card-${index + 1}`,
        type: "detail_feature_card",
        parentId: `${params.screenId}-section-supporting`,
        frame: cardFrame,
        zIndex: 2,
        content: `${index + 1}. ${highlight.title}${highlight.detail ? `\n${highlight.detail}` : ""}`,
        role: "support_card",
        style: {
          fontSize: bodyBlock ? Math.max(18, Number(bodyBlock.style.fontSize || tokens.typography.body.fontSize)) : 20,
          fontWeight: "600",
          color: tokens.typography.body.color,
          textAlign: "left",
          lineHeight: tokens.typography.body.lineHeight,
          backgroundColor:
            variant === "split_bottom"
              ? tokens.featureCard.primary.backgroundColor
              : highlight.accent === "secondary"
                ? tokens.featureCard.secondary.backgroundColor
                : highlight.accent === "primary"
                  ? tokens.featureCard.primary.backgroundColor
                  : tokens.featureCard.neutral.backgroundColor,
          borderColor:
            highlight.accent === "primary"
              ? tokens.featureCard.primary.borderColor
              : highlight.accent === "secondary"
                ? tokens.featureCard.secondary.borderColor
                : tokens.featureCard.neutral.borderColor,
          borderWidth: 1,
          borderRadius: 24,
          padding: 20,
          boxShadow:
            highlight.accent === "primary"
              ? tokens.featureCard.primary.shadow
              : highlight.accent === "secondary"
                ? tokens.featureCard.secondary.shadow
                : tokens.featureCard.neutral.shadow,
          backdropBlur: 12,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "support_card",
        },
      }),
    );
  });

  if (catalog.specRows.length > 0 && params.screen.screenType === "A") {
    const tableX = template.specTableSectionFrame.x;
    const tableY = template.specTableSectionFrame.y;
    const tableWidth = template.specTableSectionFrame.width;
    const labelWidth = 106;
    const rowGap = 10;

    components.push(
      createSectionComponent({
        id: `${params.screenId}-section-spec-table`,
        parentId: `${params.screenId}-section-supporting`,
        role: "spec_table_section",
        frame: {
          ...template.specTableSectionFrame,
        },
        zIndex: 2,
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "spec_table_section",
        },
      }),
    );

    catalog.specRows.slice(0, 4).forEach((row, index) => {
      const rowY = tableY + index * (38 + rowGap);
      components.push(
        createStyledSurfaceTextComponent({
          id: `${params.screenId}-table-label-${index + 1}`,
          type: "detail_table_label",
          parentId: `${params.screenId}-section-spec-table`,
          frame: {
            x: tableX,
            y: rowY,
            width: labelWidth,
            height: 38,
          },
          zIndex: 3,
          content: row.label,
          role: "table_label",
          style: {
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.fontWeight,
            color: tokens.typography.label.color,
            textAlign: "center",
            lineHeight: tokens.typography.label.lineHeight,
            backgroundColor: tokens.table.labelBackground,
            borderColor: tokens.table.labelBorder,
            borderWidth: 1,
            borderRadius: 14,
            padding: 10,
          },
          metadata: {
            screenIndex: params.screenIndex,
            componentRole: "table_label",
          },
        }),
      );

      components.push(
        createStyledSurfaceTextComponent({
          id: `${params.screenId}-table-value-${index + 1}`,
          type: "detail_table_value",
          parentId: `${params.screenId}-section-spec-table`,
          frame: {
            x: tableX + labelWidth + 10,
            y: rowY,
            width: tableWidth - labelWidth - 10,
            height: 38,
          },
          zIndex: 3,
          content: row.value,
          role: "table_value",
          style: {
            fontSize: 15,
            fontWeight: "600",
            color: tokens.typography.title.color,
            textAlign: "left",
            lineHeight: 1.18,
            backgroundColor: tokens.table.valueBackground,
            borderColor: tokens.table.valueBorder,
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
            boxShadow: tokens.table.sectionShadow,
          },
          metadata: {
            screenIndex: params.screenIndex,
            componentRole: "table_value",
          },
        }),
      );
    });
  }

  if ((catalog.comparison.beforeBody || catalog.comparison.afterBody) && params.screen.screenType === "C") {
    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-compare-before`,
        type: "detail_compare_before",
        parentId: `${params.screenId}-section-supporting`,
        frame: template.comparisonBeforeFrame,
        zIndex: 2,
        content: `${catalog.comparison.beforeTitle}\n${catalog.comparison.beforeBody}`,
        role: "comparison_before",
        style: {
          fontSize: 17,
          fontWeight: "700",
          color: tokens.compare.beforeColor,
          textAlign: "left",
          lineHeight: 1.4,
          backgroundColor: tokens.compare.beforeBackground,
          borderColor: tokens.compare.beforeBorder,
          borderWidth: 1,
          borderRadius: 26,
          padding: 20,
          boxShadow: "0 18px 44px rgba(15,23,42,0.10)",
          backdropBlur: 10,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "comparison_before",
        },
      }),
    );

    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-compare-after`,
        type: "detail_compare_after",
        parentId: `${params.screenId}-section-supporting`,
        frame: template.comparisonAfterFrame,
        zIndex: 2,
        content: `${catalog.comparison.afterTitle}\n${catalog.comparison.afterBody}`,
        role: "comparison_after",
        style: {
          fontSize: 17,
          fontWeight: "800",
          color: tokens.compare.afterColor,
          textAlign: "left",
          lineHeight: 1.4,
          backgroundColor: tokens.compare.afterBackground,
          borderColor: tokens.compare.afterBorder,
          borderWidth: 1,
          borderRadius: 26,
          padding: 20,
          boxShadow: "0 20px 48px rgba(37,99,235,0.22)",
          backdropBlur: 12,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "comparison_after",
        },
      }),
    );
  }

  if (catalog.proof.value) {
    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-proof-bar`,
        type: "detail_proof_bar",
        parentId: `${params.screenId}-section-supporting`,
        frame: template.proofFrame,
        zIndex: 2,
        content: `${catalog.proof.label}｜${catalog.proof.value}`,
        role: "proof_bar",
        style: {
          fontSize: 16,
          fontWeight: "600",
          color: tokens.proof.color,
          textAlign: "left",
          lineHeight: 1.22,
          backgroundColor: tokens.proof.backgroundColor,
          borderColor: tokens.proof.borderColor,
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 14px 36px rgba(15,23,42,0.12)",
          backdropBlur: 10,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "proof_bar",
        },
      }),
    );
  }

  if (catalog.cta) {
    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-cta-support`,
        type: "detail_cta_support",
        parentId: params.textStackId,
        frame: template.ctaSupportFrame,
        zIndex: 2,
        content: catalog.cta.highlightText,
        role: "cta_support",
        style: {
          fontSize: 18,
          fontWeight: "800",
          color: tokens.cta.supportColor,
          textAlign: "left",
          lineHeight: 1.2,
          backgroundColor: tokens.cta.supportBackground,
          borderColor: tokens.cta.supportBorder,
          borderWidth: 1,
          borderRadius: 24,
          padding: 18,
          boxShadow: "0 14px 40px rgba(15,23,42,0.10)",
          backdropBlur: 10,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "cta_support",
        },
      }),
    );

    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-cta-button`,
        type: "detail_cta_button",
        parentId: params.textStackId,
        frame: template.ctaButtonFrame,
        zIndex: 3,
        content: `${catalog.cta.buttonLabel}  →`,
        role: "cta_button",
        style: {
          fontSize: 19,
          fontWeight: "800",
          color: tokens.cta.buttonColor,
          textAlign: "center",
          lineHeight: 1.05,
          letterSpacing: 0.2,
          backgroundColor: tokens.cta.buttonBackground,
          borderColor: tokens.cta.buttonBorder,
          borderWidth: 1,
          borderRadius: 999,
          padding: 18,
          boxShadow: "0 22px 58px rgba(37,99,235,0.28)",
          backdropBlur: 12,
          textTransform: "uppercase",
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "cta_button",
        },
      }),
    );

    components.push(
      createStyledSurfaceTextComponent({
        id: `${params.screenId}-cta-banner`,
        type: "detail_cta_banner",
        parentId: params.textStackId,
        frame: template.ctaBannerFrame,
        zIndex: 2,
        content: catalog.cta.supportText,
        role: "cta_banner",
        style: {
          fontSize: 15,
          fontWeight: "600",
          color: tokens.cta.bannerColor,
          textAlign: "left",
          lineHeight: 1.22,
          backgroundColor: tokens.cta.bannerBackground,
          borderColor: tokens.cta.bannerBorder,
          borderWidth: 1,
          borderRadius: 22,
          padding: 16,
          boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
          backdropBlur: 10,
        },
        metadata: {
          screenIndex: params.screenIndex,
          componentRole: "cta_banner",
        },
      }),
    );
  }

  return components;
}

function createScreenSubtree(params: {
  screenIndex: number;
  totalScreens?: number;
  screen: Pick<
    DetailUiScreenInput,
    "title" | "subtitle" | "copy" | "screenType" | "objective" | "layoutNote"
  >;
  screenSize: { width: number; height: number };
  screenProtocol?: DetailUiScreenProtocol;
  rootId?: string;
}) {
  const screenId = params.rootId || `detail-screen-${params.screenIndex}`;
  const backgroundId = `${screenId}-background`;
  const textStackId = `${screenId}-text-stack`;

  const components: UiSurfaceComponent[] = [
    {
      id: screenId,
      type: "detail_screen",
      parentId: "detail-page-root",
      props: {
        screenIndex: params.screenIndex,
        screenType: params.screen.screenType || "",
        objective: params.screen.objective || "",
        layoutNote: params.screen.layoutNote || "",
      },
      metadata: {
        screenIndex: params.screenIndex,
      },
    },
    {
      id: backgroundId,
      type: "detail_background_image",
      parentId: screenId,
      slot: "background",
      props: {
        screenIndex: params.screenIndex,
      },
      metadata: {
        screenIndex: params.screenIndex,
      },
    },
    {
      id: textStackId,
      type: "detail_text_stack",
      parentId: screenId,
      slot: "content",
      props: {
        screenIndex: params.screenIndex,
        safeArea: params.screenProtocol?.safeArea || null,
      },
      metadata: {
        screenIndex: params.screenIndex,
      },
    },
  ];

  components.push(
      ...buildSectionedTextComponents({
        screenId,
        textStackId,
        screenIndex: params.screenIndex,
        totalScreens: params.totalScreens,
        screenSize: params.screenSize,
        screen: params.screen,
        screenProtocol: params.screenProtocol,
    }),
  );

  return components;
}

function buildDetailSurfaceDataModel(params: {
  summary?: string;
  screens: DetailUiScreenInput[];
  globalStyle?: DetailUiGlobalStyle;
}) {
  return {
    summary: params.summary || "",
    globalStyle: params.globalStyle || {},
    screens: params.screens.map((screen) => ({
      index: screen.index,
      title: String(screen.title || "").trim(),
      subtitle: String(screen.subtitle || "").trim(),
      copy: String(screen.copy || "").trim(),
      screenType: screen.screenType || "",
      objective: screen.objective || "",
      layoutNote: screen.layoutNote || "",
    })),
  };
}

export interface DetailUiScreenOverlaySnapshot {
  version: "detail-screen-overlay/v1";
  surfaceId: string;
  surfaceType: "detail_page";
  generationMode: DetailGenerationMode;
  screenIndex: number;
  screenSize: {
    width: number;
    height: number;
  };
  rootComponentId: string;
  components: UiSurfaceComponent[];
  dataModel: {
    globalStyle?: DetailUiGlobalStyle;
    screen: {
      index: number;
      title: string;
      subtitle: string;
      copy: string;
      screenType?: string;
      objective?: string;
      layoutNote?: string;
    } | null;
  };
  validation?: UiSurfaceSnapshot["validation"];
}

export function buildDetailUiScreenOverlaySnapshot(params: {
  surface?: UiSurfaceSnapshot | null;
  screenIndex: number;
}) {
  const surface = params.surface;
  if (!surface) return null;
  const screenId = `detail-screen-${params.screenIndex}`;
  const screenComponent =
    surface.components.find((component) => component.id === screenId) || null;
  if (!screenComponent) return null;

  const descendantIds = collectUiSurfaceDescendantIds(surface, screenId);
  const keepIds = new Set<string>([screenId, ...descendantIds]);
  const components = surface.components.filter((component) => keepIds.has(component.id));
  const screenData = Array.isArray((surface.dataModel as any)?.screens)
    ? (surface.dataModel as any).screens.find(
        (item: any) => Number(item?.index || 0) === params.screenIndex,
      ) || null
    : null;

  return {
    version: "detail-screen-overlay/v1",
    surfaceId: surface.surfaceId,
    surfaceType: surface.surfaceType,
    generationMode: surface.generationMode,
    screenIndex: params.screenIndex,
    screenSize: surface.screenSize,
    rootComponentId: screenId,
    components,
    dataModel: {
      globalStyle: (surface.dataModel as any)?.globalStyle || {},
      screen: screenData,
    },
    validation: surface.validation,
  } satisfies DetailUiScreenOverlaySnapshot;
}

export function buildDetailUiSurfaceSnapshot(params: {
  surfaceId?: string;
  generationMode: DetailGenerationMode;
  screenSize: { width: number; height: number };
  summary?: string;
  globalStyle?: DetailUiGlobalStyle;
  screens: DetailUiScreenInput[];
  uiProtocol?: DetailUiProtocol;
  uiValidation?: {
    passed: boolean;
    issues: string[];
  };
}) {
  const surfaceId =
    params.surfaceId ||
    createDetailSurfaceId({
      generationMode: params.generationMode,
      screenCount: params.screens.length,
    });

  const components: UiSurfaceComponent[] = [createRootComponent()];
  params.screens.forEach((screen) => {
    const screenProtocol = params.uiProtocol?.screens.find(
      (item) => item.index === screen.index,
    );
    components.push(
      ...createScreenSubtree({
        screenIndex: screen.index,
        totalScreens: params.screens.length,
        screen,
        screenSize: params.screenSize,
        screenProtocol,
      }),
    );
  });

  return {
    version: "ui-surface/v1",
    surfaceId,
    surfaceType: "detail_page",
    generationMode: params.generationMode,
    rootComponentId: "detail-page-root",
    screenSize: params.screenSize,
    components,
    dataModel: buildDetailSurfaceDataModel({
      summary: params.summary,
      screens: params.screens,
      globalStyle: params.globalStyle,
    }),
    validation: params.uiValidation
      ? {
          passed: params.uiValidation.passed,
          issues: params.uiValidation.issues,
          source: "plan",
        }
      : undefined,
    metadata: {
      detailScreenCount: params.screens.length,
    },
  } satisfies UiSurfaceSnapshot;
}

export function buildDetailUiSurfacePatchFromReview(params: {
  surfaceId: string;
  screenIndex: number;
  screen: Pick<
    DetailUiScreenInput,
    "index" | "title" | "subtitle" | "copy" | "screenType" | "objective" | "layoutNote"
  >;
  uiPatch?: DetailUiScreenReviewPatch;
  uiValidation?: {
    passed: boolean;
    issues: string[];
  };
}) {
  if (!params.uiPatch) return null;

  const screenId = `detail-screen-${params.screenIndex}`;
  const textStackId = `${screenId}-text-stack`;
  const replacementComponents = createScreenSubtree({
    screenIndex: params.screenIndex,
    totalScreens: params.screenIndex,
    screen: params.screen,
    screenSize: {
      width: 790,
      height: 1300,
    },
    screenProtocol: params.uiPatch.recommendedScreen,
    rootId: screenId,
  }).filter(
    (component) =>
      component.id !== screenId &&
      component.id !== `${screenId}-background`,
  );

  return {
    version: "ui-surface-patch/v1",
    surfaceId: params.surfaceId,
    surfaceType: "detail_page",
    operations: [
      {
        type: "replace_component_subtree",
        componentId: textStackId,
        components: replacementComponents,
      },
      {
        type: "set_data",
        updates: [
          {
            path: `/screens/${params.screenIndex - 1}/title`,
            value: String(params.screen.title || "").trim(),
          },
          {
            path: `/screens/${params.screenIndex - 1}/subtitle`,
            value: String(params.screen.subtitle || "").trim(),
          },
          {
            path: `/screens/${params.screenIndex - 1}/copy`,
            value: String(params.screen.copy || "").trim(),
          },
          {
            path: `/screens/${params.screenIndex - 1}/layoutNote`,
            value: String(params.screen.layoutNote || "").trim(),
          },
        ],
      },
      ...(params.uiValidation
        ? [
            {
              type: "set_validation" as const,
              validation: {
                passed: params.uiValidation.passed,
                issues: params.uiValidation.issues,
                source: "review" as const,
              },
            },
          ]
        : []),
    ],
  } satisfies UiSurfacePatch;
}

export function findDetailSurfaceScreenComponent(
  snapshot: UiSurfaceSnapshot | null | undefined,
  screenIndex: number,
) {
  if (!snapshot) return null;
  return (
    snapshot.components.find(
      (component) =>
        component.type === "detail_screen" &&
        Number(component.props?.screenIndex || 0) === screenIndex,
    ) || null
  );
}
