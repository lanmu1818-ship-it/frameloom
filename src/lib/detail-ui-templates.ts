// Modified for standalone community distribution; see NOTICE.
export type DetailUiTemplateId =
  | "hero_poster_left"
  | "hero_poster_right"
  | "compare_dual_column"
  | "feature_grid_bottom"
  | "cta_focus";

export interface DetailUiTemplateFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetailUiTemplateSpec {
  id: DetailUiTemplateId;
  subjectAvoidanceBox: DetailUiTemplateFrame;
  badgeFrame: DetailUiTemplateFrame;
  titleFrame: DetailUiTemplateFrame;
  subtitleFrame: DetailUiTemplateFrame;
  featureTagFrames: DetailUiTemplateFrame[];
  featureCardFrames: DetailUiTemplateFrame[];
  specTableSectionFrame: DetailUiTemplateFrame;
  comparisonBeforeFrame: DetailUiTemplateFrame;
  comparisonAfterFrame: DetailUiTemplateFrame;
  proofFrame: DetailUiTemplateFrame;
  ctaSupportFrame: DetailUiTemplateFrame;
  ctaButtonFrame: DetailUiTemplateFrame;
  ctaBannerFrame: DetailUiTemplateFrame;
}

const CANVAS_WIDTH = 790;
const CANVAS_HEIGHT = 1300;
const SUBJECT_BOX_CENTER: DetailUiTemplateFrame = {
  x: 170,
  y: 360,
  width: 460,
  height: 800,
};

const TEMPLATE_REGISTRY: Record<DetailUiTemplateId, DetailUiTemplateSpec> = {
  hero_poster_left: {
    id: "hero_poster_left",
    subjectAvoidanceBox: SUBJECT_BOX_CENTER,
    badgeFrame: { x: 56, y: 56, width: 120, height: 36 },
    titleFrame: { x: 56, y: 110, width: 390, height: 136 },
    subtitleFrame: { x: 56, y: 264, width: 338, height: 88 },
    featureTagFrames: [
      { x: 56, y: 384, width: 96, height: 28 },
      { x: 56, y: 510, width: 96, height: 28 },
      { x: 56, y: 636, width: 96, height: 28 },
    ],
    featureCardFrames: [
      { x: 56, y: 404, width: 310, height: 114 },
      { x: 56, y: 530, width: 310, height: 114 },
      { x: 56, y: 656, width: 310, height: 114 },
    ],
    specTableSectionFrame: { x: 56, y: 794, width: 330, height: 210 },
    comparisonBeforeFrame: { x: 56, y: 794, width: 156, height: 164 },
    comparisonAfterFrame: { x: 228, y: 794, width: 158, height: 164 },
    proofFrame: { x: 56, y: 1022, width: 330, height: 64 },
    ctaSupportFrame: { x: 56, y: 1104, width: 330, height: 68 },
    ctaButtonFrame: { x: 56, y: 1186, width: 206, height: 56 },
    ctaBannerFrame: { x: 274, y: 1186, width: 188, height: 56 },
  },
  hero_poster_right: {
    id: "hero_poster_right",
    subjectAvoidanceBox: SUBJECT_BOX_CENTER,
    badgeFrame: { x: 618, y: 56, width: 116, height: 36 },
    titleFrame: { x: 366, y: 110, width: 368, height: 136 },
    subtitleFrame: { x: 410, y: 264, width: 324, height: 88 },
    featureTagFrames: [
      { x: 422, y: 384, width: 92, height: 28 },
      { x: 422, y: 510, width: 92, height: 28 },
      { x: 422, y: 636, width: 92, height: 28 },
    ],
    featureCardFrames: [
      { x: 422, y: 404, width: 312, height: 114 },
      { x: 422, y: 530, width: 312, height: 114 },
      { x: 422, y: 656, width: 312, height: 114 },
    ],
    specTableSectionFrame: { x: 404, y: 794, width: 330, height: 210 },
    comparisonBeforeFrame: { x: 404, y: 794, width: 156, height: 164 },
    comparisonAfterFrame: { x: 576, y: 794, width: 158, height: 164 },
    proofFrame: { x: 404, y: 1022, width: 330, height: 64 },
    ctaSupportFrame: { x: 348, y: 1104, width: 386, height: 68 },
    ctaButtonFrame: { x: 528, y: 1186, width: 206, height: 56 },
    ctaBannerFrame: { x: 348, y: 1186, width: 168, height: 56 },
  },
  compare_dual_column: {
    id: "compare_dual_column",
    subjectAvoidanceBox: SUBJECT_BOX_CENTER,
    badgeFrame: { x: 56, y: 56, width: 120, height: 36 },
    titleFrame: { x: 56, y: 108, width: 340, height: 122 },
    subtitleFrame: { x: 56, y: 246, width: 340, height: 78 },
    featureTagFrames: [
      { x: 56, y: 350, width: 92, height: 28 },
      { x: 56, y: 722, width: 92, height: 28 },
      { x: 56, y: 1096, width: 92, height: 28 },
    ],
    featureCardFrames: [
      { x: 56, y: 376, width: 330, height: 110 },
      { x: 56, y: 748, width: 330, height: 110 },
      { x: 56, y: 1122, width: 330, height: 94 },
    ],
    specTableSectionFrame: { x: 404, y: 350, width: 330, height: 208 },
    comparisonBeforeFrame: { x: 404, y: 350, width: 156, height: 178 },
    comparisonAfterFrame: { x: 576, y: 350, width: 158, height: 178 },
    proofFrame: { x: 404, y: 560, width: 330, height: 64 },
    ctaSupportFrame: { x: 404, y: 640, width: 330, height: 68 },
    ctaButtonFrame: { x: 404, y: 726, width: 194, height: 56 },
    ctaBannerFrame: { x: 610, y: 726, width: 124, height: 56 },
  },
  feature_grid_bottom: {
    id: "feature_grid_bottom",
    subjectAvoidanceBox: SUBJECT_BOX_CENTER,
    badgeFrame: { x: 56, y: 56, width: 120, height: 36 },
    titleFrame: { x: 56, y: 104, width: 420, height: 126 },
    subtitleFrame: { x: 56, y: 248, width: 360, height: 84 },
    featureTagFrames: [
      { x: 56, y: 884, width: 92, height: 28 },
      { x: 314, y: 884, width: 92, height: 28 },
      { x: 572, y: 884, width: 92, height: 28 },
    ],
    featureCardFrames: [
      { x: 56, y: 906, width: 220, height: 124 },
      { x: 286, y: 906, width: 220, height: 124 },
      { x: 516, y: 906, width: 218, height: 124 },
    ],
    specTableSectionFrame: { x: 56, y: 1048, width: 398, height: 196 },
    comparisonBeforeFrame: { x: 470, y: 1048, width: 128, height: 176 },
    comparisonAfterFrame: { x: 606, y: 1048, width: 128, height: 176 },
    proofFrame: { x: 56, y: 1254, width: 330, height: 40 },
    ctaSupportFrame: { x: 398, y: 1234, width: 336, height: 52 },
    ctaButtonFrame: { x: 536, y: 1168, width: 198, height: 50 },
    ctaBannerFrame: { x: 398, y: 1168, width: 126, height: 50 },
  },
  cta_focus: {
    id: "cta_focus",
    subjectAvoidanceBox: SUBJECT_BOX_CENTER,
    badgeFrame: { x: 56, y: 56, width: 120, height: 36 },
    titleFrame: { x: 56, y: 108, width: 420, height: 126 },
    subtitleFrame: { x: 56, y: 248, width: 360, height: 84 },
    featureTagFrames: [
      { x: 56, y: 860, width: 92, height: 28 },
      { x: 56, y: 982, width: 92, height: 28 },
      { x: 56, y: 1104, width: 92, height: 28 },
    ],
    featureCardFrames: [
      { x: 56, y: 882, width: 338, height: 110 },
      { x: 56, y: 1004, width: 338, height: 110 },
      { x: 56, y: 1126, width: 338, height: 110 },
    ],
    specTableSectionFrame: { x: 414, y: 870, width: 320, height: 180 },
    comparisonBeforeFrame: { x: 414, y: 1062, width: 152, height: 154 },
    comparisonAfterFrame: { x: 582, y: 1062, width: 152, height: 154 },
    proofFrame: { x: 414, y: 882, width: 320, height: 60 },
    ctaSupportFrame: { x: 414, y: 954, width: 320, height: 68 },
    ctaButtonFrame: { x: 414, y: 1140, width: 320, height: 56 },
    ctaBannerFrame: { x: 414, y: 1206, width: 320, height: 48 },
  },
};

function rectsIntersect(a: DetailUiTemplateFrame, b: DetailUiTemplateFrame) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clampFrame(frame: DetailUiTemplateFrame) {
  return {
    x: Math.max(20, Math.min(CANVAS_WIDTH - frame.width - 20, frame.x)),
    y: Math.max(20, Math.min(CANVAS_HEIGHT - frame.height - 20, frame.y)),
    width: frame.width,
    height: frame.height,
  };
}

export function moveFrameForSubjectAvoidance(
  frame: DetailUiTemplateFrame,
  avoid: DetailUiTemplateFrame,
  preference: "top" | "left" | "right" | "bottom",
) {
  if (!rectsIntersect(frame, avoid)) return clampFrame(frame);

  const gap = 18;
  if (preference === "top") {
    return clampFrame({ ...frame, y: avoid.y - frame.height - gap });
  }
  if (preference === "left") {
    return clampFrame({ ...frame, x: avoid.x - frame.width - gap });
  }
  if (preference === "right") {
    return clampFrame({ ...frame, x: avoid.x + avoid.width + gap });
  }
  return clampFrame({ ...frame, y: avoid.y + avoid.height + gap });
}

export function resolveDetailUiTemplate(params: {
  screenIndex: number;
  totalScreens?: number;
  screenType?: string;
}): DetailUiTemplateSpec {
  if ((params.totalScreens || 0) > 0 && params.screenIndex === params.totalScreens) {
    return TEMPLATE_REGISTRY.cta_focus;
  }
  if (params.screenType === "A") return TEMPLATE_REGISTRY.hero_poster_right;
  if (params.screenType === "C") return TEMPLATE_REGISTRY.compare_dual_column;
  if (params.screenIndex <= 2) return TEMPLATE_REGISTRY.hero_poster_left;
  return TEMPLATE_REGISTRY.feature_grid_bottom;
}
