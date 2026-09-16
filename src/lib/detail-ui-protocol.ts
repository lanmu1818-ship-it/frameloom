// Modified for standalone community distribution; see NOTICE.
export type DetailGenerationMode = "classic" | "agent_layout";

export type DetailUiTextBlockType = "title" | "subtitle" | "body";

export type DetailUiTextAlign = "left" | "center" | "right";

export interface DetailUiGlobalStyle {
  designLanguage?: string;
  typography?: {
    fontFamily?: string;
    title?: string;
    subtitle?: string;
    body?: string;
  };
  layout?: {
    grid?: string;
    safeArea?: string;
    rhythm?: string;
  };
  palette?: string;
}

export interface DetailUiScreenInput {
  index: number;
  title?: string;
  subtitle?: string;
  copy?: string;
  screenType?: "A" | "B" | "C";
  objective?: string;
  layoutNote?: string;
}

export interface DetailUiFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetailUiTextStyle {
  fontFamily?: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  color: string;
  textAlign: DetailUiTextAlign;
}

export interface DetailUiTextBlock {
  id: string;
  type: DetailUiTextBlockType;
  content: string;
  frame: DetailUiFrame;
  style: DetailUiTextStyle;
}

export interface DetailUiScreenProtocol {
  index: number;
  screenType?: "A" | "B" | "C";
  objective?: string;
  layoutNote?: string;
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  blocks: DetailUiTextBlock[];
}

export interface DetailUiProtocol {
  version: "detail-ui-protocol/v1";
  mode: DetailGenerationMode;
  screenSize: {
    width: number;
    height: number;
  };
  globalStyle?: DetailUiGlobalStyle;
  screens: DetailUiScreenProtocol[];
}

export interface DetailUiPatchNote {
  type: "layout" | "typography" | "conversion";
  message: string;
}

export interface DetailUiScreenReviewPatch {
  version: "detail-ui-review-patch/v1";
  mode: DetailGenerationMode;
  screenIndex: number;
  recommendedScreen: DetailUiScreenProtocol;
  notes: DetailUiPatchNote[];
}

function extractFirstNumber(value: string, fallback: number): number {
  const matched = String(value || "").match(/(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : fallback;
}

function extractFontWeight(value: string, fallback = "600"): string {
  const matched = String(value || "").match(/\b(100|200|300|400|500|600|700|800|900)\b/);
  return matched?.[1] || fallback;
}

function parseSafeArea(input?: string, width = 790, height = 1300) {
  const raw = String(input || "");
  const yMatch = raw.match(/y\s*=\s*(\d+)\s*[-~～]\s*(\d+)/i);
  const leftMatch = raw.match(/(?:左右边距|左边距|左侧边距)\s*(\d+)\s*px/i);
  const rightMatch = raw.match(/(?:左右边距|右边距|右侧边距)\s*(\d+)\s*px/i);

  const top = yMatch ? Number(yMatch[1]) : 64;
  const bottom = yMatch ? Number(yMatch[2]) : Math.min(height - 120, 360);
  const left = leftMatch ? Number(leftMatch[1]) : 56;
  const right = rightMatch ? Number(rightMatch[1]) : left;

  return {
    top,
    bottom,
    left: Math.max(24, Math.min(width / 3, left)),
    right: Math.max(24, Math.min(width / 3, right)),
  };
}

function buildTextBlockStyle(
  type: DetailUiTextBlockType,
  globalStyle?: DetailUiGlobalStyle,
  screenIndex = 0,
): DetailUiTextStyle {
  const typography = globalStyle?.typography;
  const titleBase = extractFirstNumber(typography?.title || "", 64);
  const subtitleBase = extractFirstNumber(typography?.subtitle || "", 34);
  const bodyBase = extractFirstNumber(typography?.body || "", 24);

  if (type === "title") {
    const fontSize = Math.max(36, Math.min(80, screenIndex === 0 ? titleBase : Math.round(titleBase * 0.86)));
    return {
      fontFamily: typography?.fontFamily,
      fontSize,
      fontWeight: extractFontWeight(typography?.title || "", "700"),
      lineHeight: 1.15,
      color: "#111827",
      textAlign: "left",
    };
  }

  if (type === "subtitle") {
    return {
      fontFamily: typography?.fontFamily,
      fontSize: Math.max(24, Math.min(50, subtitleBase)),
      fontWeight: extractFontWeight(typography?.subtitle || "", "600"),
      lineHeight: 1.22,
      color: "#374151",
      textAlign: "left",
    };
  }

  return {
    fontFamily: typography?.fontFamily,
    fontSize: Math.max(18, Math.min(36, bodyBase)),
    fontWeight: extractFontWeight(typography?.body || "", "500"),
    lineHeight: 1.38,
    color: "#4b5563",
    textAlign: "left",
  };
}

function estimateBlockHeight(
  content: string,
  style: DetailUiTextStyle,
  width: number,
  maxLines: number,
) {
  const safeWidth = Math.max(120, width);
  const charsPerLine = Math.max(8, Math.floor(safeWidth / Math.max(10, style.fontSize * 0.9)));
  const estimatedLines = Math.min(
    maxLines,
    Math.max(1, Math.ceil(Array.from(String(content || "")).length / charsPerLine)),
  );
  return Math.ceil(style.fontSize * style.lineHeight * estimatedLines + 16);
}

export function buildDetailUiProtocol(params: {
  generationMode: DetailGenerationMode;
  screenSize: { width: number; height: number };
  globalStyle?: DetailUiGlobalStyle;
  screens: DetailUiScreenInput[];
}): DetailUiProtocol {
  const { generationMode, screenSize, globalStyle } = params;

  const screens = params.screens.map((screen, index) => {
    const safeArea = parseSafeArea(globalStyle?.layout?.safeArea, screenSize.width, screenSize.height);
    const textWidth = Math.max(240, Math.round(screenSize.width - safeArea.left - safeArea.right));
    const blocks: DetailUiTextBlock[] = [];

    const titleText = String(screen.title || "").trim();
    const subtitleText = String(screen.subtitle || "").trim();
    const bodyText = String(screen.copy || "").trim();

    let cursorY = safeArea.top;

    if (titleText) {
      const style = buildTextBlockStyle("title", globalStyle, index);
      const height = estimateBlockHeight(titleText, style, textWidth, 2);
      blocks.push({
        id: `screen-${screen.index}-title`,
        type: "title",
        content: titleText,
        frame: {
          x: safeArea.left,
          y: cursorY,
          width: textWidth,
          height,
        },
        style,
      });
      cursorY += height + 16;
    }

    if (subtitleText) {
      const style = buildTextBlockStyle("subtitle", globalStyle, index);
      const height = estimateBlockHeight(subtitleText, style, textWidth, 3);
      blocks.push({
        id: `screen-${screen.index}-subtitle`,
        type: "subtitle",
        content: subtitleText,
        frame: {
          x: safeArea.left,
          y: cursorY,
          width: textWidth,
          height,
        },
        style,
      });
      cursorY += height + 14;
    }

    if (bodyText) {
      const style = buildTextBlockStyle("body", globalStyle, index);
      const remainingHeight = Math.max(96, safeArea.bottom - cursorY);
      const estimatedHeight = estimateBlockHeight(bodyText, style, textWidth, 5);
      blocks.push({
        id: `screen-${screen.index}-body`,
        type: "body",
        content: bodyText,
        frame: {
          x: safeArea.left,
          y: cursorY,
          width: textWidth,
          height: Math.min(remainingHeight, estimatedHeight),
        },
        style,
      });
    }

    return {
      index: screen.index,
      screenType: screen.screenType,
      objective: screen.objective,
      layoutNote: screen.layoutNote,
      safeArea,
      blocks,
    } satisfies DetailUiScreenProtocol;
  });

  return {
    version: "detail-ui-protocol/v1",
    mode: generationMode,
    screenSize,
    globalStyle,
    screens,
  };
}

function applyReviewHeuristicsToScreen(params: {
  screen: DetailUiScreenProtocol;
  screenSize: { width: number; height: number };
  notes: DetailUiPatchNote[];
}) {
  const noteText = params.notes.map((note) => note.message).join(" | ").toLowerCase();
  if (!noteText.trim()) {
    return params.screen;
  }

  const emphasizeTitle =
    /标题层级|headline|title hierarchy|主标题|标题不够突出|主副标题/.test(noteText);
  const addBreathingRoom =
    /留白|spacing|rhythm|拥挤|挤|crowd|breathing|间距/.test(noteText);
  const protectHeadlineZone =
    /顶部|headline zone|safe area|安全区|避免重叠|不要遮挡|hero/.test(noteText);
  const softenBodyDensity =
    /正文|文案过密|copy too dense|copy density|太多文字|可读性/.test(noteText);

  const safeArea = {
    ...params.screen.safeArea,
    top: protectHeadlineZone
      ? Math.min(params.screen.safeArea.top + 12, params.screen.safeArea.bottom - 120)
      : params.screen.safeArea.top,
  };
  const gapTitleToSubtitle = addBreathingRoom ? 24 : 16;
  const gapSubtitleToBody = addBreathingRoom ? 20 : 14;

  let cursorY = safeArea.top;
  const blocks = params.screen.blocks.map((block) => {
    const nextBlock = {
      ...block,
      frame: { ...block.frame },
      style: { ...block.style },
    };

    if (nextBlock.type === "title" && emphasizeTitle) {
      nextBlock.style.fontSize = Math.min(84, nextBlock.style.fontSize + 4);
      nextBlock.style.lineHeight = 1.12;
    }

    if (nextBlock.type === "subtitle" && emphasizeTitle) {
      nextBlock.style.fontSize = Math.max(22, nextBlock.style.fontSize - 1);
    }

    if (nextBlock.type === "body" && softenBodyDensity) {
      nextBlock.style.fontSize = Math.max(18, nextBlock.style.fontSize - 2);
      nextBlock.style.lineHeight = 1.42;
    }

    const width = Math.max(
      220,
      Math.round(params.screenSize.width - safeArea.left - safeArea.right),
    );
    nextBlock.frame.x = safeArea.left;
    nextBlock.frame.width = width;
    nextBlock.frame.y = cursorY;
    nextBlock.frame.height = estimateBlockHeight(
      nextBlock.content,
      nextBlock.style,
      nextBlock.frame.width,
      nextBlock.type === "title" ? 2 : nextBlock.type === "subtitle" ? 3 : 5,
    );

    if (nextBlock.type === "body") {
      const maxBodyBottom = Math.max(cursorY + 80, safeArea.bottom);
      nextBlock.frame.height = Math.min(nextBlock.frame.height, maxBodyBottom - cursorY);
    }

    cursorY +=
      nextBlock.frame.height +
      (nextBlock.type === "title"
        ? gapTitleToSubtitle
        : nextBlock.type === "subtitle"
          ? gapSubtitleToBody
          : 0);

    return nextBlock;
  });

  return {
    ...params.screen,
    safeArea,
    blocks,
  } satisfies DetailUiScreenProtocol;
}

export function buildDetailUiReviewPatch(params: {
  generationMode: DetailGenerationMode;
  screenSize: { width: number; height: number };
  globalStyle?: DetailUiGlobalStyle;
  screen: DetailUiScreenInput;
  layoutFixes?: string[];
  typographyFixes?: string[];
  conversionFixes?: string[];
}): DetailUiScreenReviewPatch {
  const notes = [
    ...(params.layoutFixes || []).map((message) => ({ type: "layout" as const, message })),
    ...(params.typographyFixes || []).map((message) => ({ type: "typography" as const, message })),
    ...(params.conversionFixes || []).map((message) => ({ type: "conversion" as const, message })),
  ];
  const protocol = buildDetailUiProtocol({
    generationMode: params.generationMode,
    screenSize: params.screenSize,
    globalStyle: params.globalStyle,
    screens: [params.screen],
  });

  return {
    version: "detail-ui-review-patch/v1",
    mode: params.generationMode,
    screenIndex: params.screen.index,
    recommendedScreen: applyReviewHeuristicsToScreen({
      screen: protocol.screens[0]!,
      screenSize: params.screenSize,
      notes,
    }),
    notes,
  };
}
