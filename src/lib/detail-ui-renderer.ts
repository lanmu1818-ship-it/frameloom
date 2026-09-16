// Modified for standalone community distribution; see NOTICE.
import type {
  DetailUiProtocol,
  DetailUiScreenInput,
  DetailUiScreenReviewPatch,
} from "@/src/lib/detail-ui-protocol";
import {
  getUiSurfaceChildren,
  resolveUiSurfaceTextBinding,
  type UiSurfaceSnapshot,
} from "@/src/lib/ui-surface-protocol";
import type { CanvasNode, TextNodeData } from "@/types/canvas/index";

export type DetailTextLayerDraft = Omit<CanvasNode, "id" | "createdAt" | "updatedAt">;

export type DetailTypographyTokens = {
  titleFontSize: number;
  titleFontWeight: string;
  subtitleFontSize: number;
  subtitleFontWeight: string;
  bodyFontSize: number;
  bodyFontWeight: string;
};

function createTextNodeDraft(params: {
  parentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight: string;
  color: string;
  lineHeight: number;
  letterSpacing?: number;
  textAlign: "left" | "center" | "right";
  transparent?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  boxShadow?: string;
  backdropBlur?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  metadata?: Record<string, unknown>;
}): DetailTextLayerDraft {
  return {
    type: "text",
    position: { x: params.x, y: params.y },
    size: { width: params.width, height: params.height },
    data: {
      content: params.content,
      fontSize: params.fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      color: params.color,
      lineHeight: params.lineHeight,
      letterSpacing: params.letterSpacing,
      textAlign: params.textAlign,
      transparent: params.transparent ?? true,
      backgroundColor: params.backgroundColor,
      borderColor: params.borderColor,
      borderWidth: params.borderWidth,
      borderRadius: params.borderRadius,
      padding: params.padding,
      boxShadow: params.boxShadow,
      backdropBlur: params.backdropBlur,
      textTransform: params.textTransform,
      metadata: params.metadata,
    } as TextNodeData & { metadata?: Record<string, unknown> },
    connections: [],
    parentId: params.parentId,
  };
}

function createManagedDetailMetadata(params: {
  screenIndex?: number;
  blockId: string;
  blockType: "title" | "subtitle" | "body";
}) {
  return {
    detailUiManaged: true,
    detailUiBlockId: params.blockId,
    detailUiBlockType: params.blockType,
    detailUiScreenIndex: params.screenIndex,
  };
}

export function buildDetailTextLayerNodesFromProtocol(params: {
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  parentSize: { width: number; height: number };
  screenSize: { width: number; height: number };
  screenProtocol?: DetailUiProtocol["screens"][number];
}) {
  const protocolBlocks = params.screenProtocol?.blocks || [];
  if (protocolBlocks.length === 0) return [] as DetailTextLayerDraft[];

  const scaleX = params.parentSize.width / Math.max(1, params.screenSize.width);
  const scaleY = params.parentSize.height / Math.max(1, params.screenSize.height);

  return protocolBlocks.map((block) =>
    createTextNodeDraft({
      parentId: params.parentNodeId,
      x: params.parentPosition.x + Math.round(block.frame.x * scaleX),
      y: params.parentPosition.y + Math.round(block.frame.y * scaleY),
      width: Math.max(120, Math.round(block.frame.width * scaleX)),
      height: Math.max(48, Math.round(block.frame.height * scaleY)),
      content: block.content,
      fontSize: Math.max(12, Math.round(block.style.fontSize * Math.min(scaleX, scaleY))),
      fontWeight: block.style.fontWeight,
      color: block.style.color,
      lineHeight: block.style.lineHeight,
      textAlign: block.style.textAlign,
      metadata: createManagedDetailMetadata({
        blockId: block.id,
        blockType: block.type,
        screenIndex: params.screenProtocol?.index,
      }),
    }),
  );
}

export function buildDetailTextLayerNodesFromReviewPatch(params: {
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  parentSize: { width: number; height: number };
  screenSize: { width: number; height: number };
  uiPatch?: DetailUiScreenReviewPatch;
}) {
  if (!params.uiPatch) return [] as DetailTextLayerDraft[];
  return buildDetailTextLayerNodesFromProtocol({
    parentNodeId: params.parentNodeId,
    parentPosition: params.parentPosition,
    parentSize: params.parentSize,
    screenSize: params.screenSize,
    screenProtocol: params.uiPatch.recommendedScreen,
  });
}

function collectRenderableSurfaceComponents(params: {
  surface: UiSurfaceSnapshot;
  parentId: string;
}) {
  const collected: UiSurfaceSnapshot["components"] = [];
  const queue = getUiSurfaceChildren(params.surface, params.parentId)
    .sort((left, right) => {
      const leftZ = Number(left.layout?.zIndex || 0);
      const rightZ = Number(right.layout?.zIndex || 0);
      return leftZ - rightZ;
    });

  while (queue.length > 0) {
    const component = queue.shift();
    if (!component) continue;

    if (
      component.type === "detail_card" ||
      component.type === "detail_badge" ||
      component.type === "detail_text_block" ||
      component.type === "detail_feature_card" ||
      component.type === "detail_feature_tag" ||
      component.type === "detail_spec_table" ||
      component.type === "detail_table_label" ||
      component.type === "detail_table_value" ||
      component.type === "detail_comparison_strip" ||
      component.type === "detail_compare_before" ||
      component.type === "detail_compare_after" ||
      component.type === "detail_proof_bar" ||
      component.type === "detail_cta_banner" ||
      component.type === "detail_cta_button" ||
      component.type === "detail_cta_support"
    ) {
      collected.push(component);
      continue;
    }

    const children = getUiSurfaceChildren(params.surface, component.id)
      .sort((left, right) => {
        const leftZ = Number(left.layout?.zIndex || 0);
        const rightZ = Number(right.layout?.zIndex || 0);
        return leftZ - rightZ;
      });
    queue.unshift(...children);
  }

  return collected;
}

export function buildDetailTextLayerNodesFromSurfaceScreen(params: {
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  parentSize: { width: number; height: number };
  surface: UiSurfaceSnapshot | null | undefined;
  screenIndex: number;
}) {
  if (!params.surface) return [] as DetailTextLayerDraft[];

  const screenComponent =
    params.surface.components.find(
      (component) =>
        component.type === "detail_screen" &&
        Number(component.props?.screenIndex || 0) === params.screenIndex,
    ) || null;
  if (!screenComponent) return [] as DetailTextLayerDraft[];

  const textStack = getUiSurfaceChildren(params.surface, screenComponent.id).find(
    (component) => component.type === "detail_text_stack",
  );
  if (!textStack) return [] as DetailTextLayerDraft[];

  const scaleX = params.parentSize.width / Math.max(1, params.surface.screenSize.width);
  const scaleY = params.parentSize.height / Math.max(1, params.surface.screenSize.height);

  return collectRenderableSurfaceComponents({
    surface: params.surface,
    parentId: textStack.id,
  })
    .map((component) => {
      const frame = (component.layout?.frame || {}) as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      };
      const style = (component.style || {}) as Record<string, unknown>;
      return createTextNodeDraft({
        parentId: params.parentNodeId,
        x: params.parentPosition.x + Math.round(Number(frame.x || 0) * scaleX),
        y: params.parentPosition.y + Math.round(Number(frame.y || 0) * scaleY),
        width: Math.max(120, Math.round(Number(frame.width || 240) * scaleX)),
        height: Math.max(48, Math.round(Number(frame.height || 60) * scaleY)),
        content:
          resolveUiSurfaceTextBinding(params.surface, component, "content") ||
          String(component.props?.content || "").trim(),
        fontSize: Math.max(
          12,
          Math.round(Number(style.fontSize || 24) * Math.min(scaleX, scaleY)),
        ),
        fontFamily: typeof style.fontFamily === "string" ? style.fontFamily : undefined,
        fontWeight: String(style.fontWeight || "500"),
        color: String(style.color || "#111827"),
        lineHeight: Number(style.lineHeight || 1.3),
        letterSpacing:
          typeof style.letterSpacing === "number" ? style.letterSpacing : undefined,
        textAlign:
          style.textAlign === "center" || style.textAlign === "right"
            ? style.textAlign
            : "left",
        transparent: component.type === "detail_text_block" ? true : false,
        backgroundColor:
          typeof style.backgroundColor === "string" ? style.backgroundColor : undefined,
        borderColor:
          typeof style.borderColor === "string" ? style.borderColor : undefined,
        borderWidth:
          typeof style.borderWidth === "number" ? style.borderWidth : undefined,
        borderRadius:
          typeof style.borderRadius === "number" ? style.borderRadius : undefined,
        padding: typeof style.padding === "number" ? style.padding : undefined,
        boxShadow: typeof style.boxShadow === "string" ? style.boxShadow : undefined,
        backdropBlur:
          typeof style.backdropBlur === "number" ? style.backdropBlur : undefined,
        textTransform:
          style.textTransform === "uppercase" ||
          style.textTransform === "lowercase" ||
          style.textTransform === "capitalize"
            ? style.textTransform
            : "none",
        metadata: {
          detailUiManaged: true,
          detailUiBlockId: String(component.metadata?.blockId || component.id),
          detailUiBlockType: String(component.metadata?.blockType || ""),
          detailUiScreenIndex: params.screenIndex,
          detailSurfaceComponentId: component.id,
        },
      });
    });
}

export function buildLegacyDetailTextLayerNodes(params: {
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  parentWidth: number;
  screenIndex: number;
  title?: string;
  subtitle?: string;
  body?: string;
  titleFontSize: number;
  titleFontWeight: string;
  subtitleFontSize: number;
  subtitleFontWeight: string;
  bodyFontSize: number;
  bodyFontWeight: string;
}) {
  const safeLeft = Math.round(params.parentWidth * 0.07);
  const textWidth = Math.max(240, Math.round(params.parentWidth - safeLeft * 2));
  const drafts: DetailTextLayerDraft[] = [];

  const titleText = String(params.title || "").trim();
  const subtitleText = String(params.subtitle || "").trim();
  const bodyText = String(params.body || "").trim();

  if (titleText) {
    drafts.push(
      createTextNodeDraft({
        parentId: params.parentNodeId,
        x: params.parentPosition.x + safeLeft,
        y: params.parentPosition.y + 72,
        width: textWidth,
        height: 140,
        content: titleText,
        fontSize:
          params.screenIndex === 0
            ? params.titleFontSize
            : Math.round(params.titleFontSize * 0.86),
        fontWeight: params.titleFontWeight,
        color: "#111827",
        lineHeight: 1.15,
        textAlign: "left",
        metadata: createManagedDetailMetadata({
          blockId: `legacy-screen-${params.screenIndex + 1}-title`,
          blockType: "title",
          screenIndex: params.screenIndex + 1,
        }),
      }),
    );
  }

  if (subtitleText) {
    drafts.push(
      createTextNodeDraft({
        parentId: params.parentNodeId,
        x: params.parentPosition.x + safeLeft,
        y: params.parentPosition.y + 214,
        width: textWidth,
        height: 120,
        content: subtitleText,
        fontSize: params.subtitleFontSize,
        fontWeight: params.subtitleFontWeight,
        color: "#374151",
        lineHeight: 1.22,
        textAlign: "left",
        metadata: createManagedDetailMetadata({
          blockId: `legacy-screen-${params.screenIndex + 1}-subtitle`,
          blockType: "subtitle",
          screenIndex: params.screenIndex + 1,
        }),
      }),
    );
  }

  if (bodyText) {
    drafts.push(
      createTextNodeDraft({
        parentId: params.parentNodeId,
        x: params.parentPosition.x + safeLeft,
        y: params.parentPosition.y + 304,
        width: textWidth,
        height: 260,
        content: bodyText,
        fontSize: params.bodyFontSize,
        fontWeight: params.bodyFontWeight,
        color: "#4b5563",
        lineHeight: 1.38,
        textAlign: "left",
        metadata: createManagedDetailMetadata({
          blockId: `legacy-screen-${params.screenIndex + 1}-body`,
          blockType: "body",
          screenIndex: params.screenIndex + 1,
        }),
      }),
    );
  }

  return drafts;
}

export function buildDetailTextLayerNodes(params: {
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  parentSize: { width: number; height: number };
  screenSize: { width: number; height: number };
  screenIndex: number;
  screen?: Pick<DetailUiScreenInput, "title" | "subtitle" | "copy">;
  screenProtocol?: DetailUiProtocol["screens"][number];
  typography: DetailTypographyTokens;
}) {
  if (params.screenProtocol) {
    return buildDetailTextLayerNodesFromProtocol({
      parentNodeId: params.parentNodeId,
      parentPosition: params.parentPosition,
      parentSize: params.parentSize,
      screenSize: params.screenSize,
      screenProtocol: params.screenProtocol,
    });
  }

  return buildLegacyDetailTextLayerNodes({
    parentNodeId: params.parentNodeId,
    parentPosition: params.parentPosition,
    parentWidth: params.parentSize.width,
    screenIndex: params.screenIndex,
    title: params.screen?.title,
    subtitle: params.screen?.subtitle,
    body: params.screen?.copy,
    titleFontSize: params.typography.titleFontSize,
    titleFontWeight: params.typography.titleFontWeight,
    subtitleFontSize: params.typography.subtitleFontSize,
    subtitleFontWeight: params.typography.subtitleFontWeight,
    bodyFontSize: params.typography.bodyFontSize,
    bodyFontWeight: params.typography.bodyFontWeight,
  });
}

export function collectManagedDetailTextLayerNodeIds(
  nodes: CanvasNode[],
  parentNodeId: string,
) {
  return nodes
    .filter(
      (node) =>
        node.parentId === parentNodeId &&
        node.type === "text" &&
        Boolean((node.data as any)?.metadata?.detailUiManaged),
    )
    .map((node) => node.id);
}
