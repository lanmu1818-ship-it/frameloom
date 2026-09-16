// Modified for standalone community distribution; see NOTICE.
import type {
  UiScreenBounds,
  UiScreenDocument,
  UiScreenLayer,
} from "@/src/lib/ui-screen/schema";

export type UiScreenValidationSeverity = "info" | "warning" | "error";

export type UiScreenValidationCode =
  | "out_of_bounds"
  | "missing_image_source"
  | "empty_text"
  | "tiny_text"
  | "dense_text"
  | "overlap"
  | "overflow_region"
  | "excessive_radius"
  | "heavy_shadow"
  | "negative_letter_spacing"
  | "overlay_too_large"
  | "nested_card"
  | "missing_design_skill_metadata";

export interface UiScreenValidationIssue {
  id: string;
  layerId?: string;
  severity: UiScreenValidationSeverity;
  code: UiScreenValidationCode;
  message: string;
  suggestion?: string;
  details?: Record<string, number | string | boolean | undefined>;
}

export interface UiScreenValidationResult {
  passed: boolean;
  score: number;
  issues: UiScreenValidationIssue[];
}

type FlatLayer = {
  layer: UiScreenLayer;
  path: string[];
  ancestorKinds: UiScreenLayer["kind"][];
  parentId?: string;
  absoluteBounds?: UiScreenBounds;
  parentBounds?: UiScreenBounds;
};

const DOCUMENT_EDGE_TOLERANCE = 2;
const MIN_READABLE_FONT_SIZE = 11;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rectArea(bounds: UiScreenBounds) {
  return Math.max(0, bounds.width) * Math.max(0, bounds.height);
}

function intersectionArea(left: UiScreenBounds, right: UiScreenBounds) {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const width = Math.min(left.x + left.width, right.x + right.width) - x;
  const height = Math.min(left.y + left.height, right.y + right.height) - y;
  return width > 0 && height > 0 ? width * height : 0;
}

function offsetBounds(bounds: UiScreenBounds, parentBounds?: UiScreenBounds): UiScreenBounds {
  return {
    x: Math.round((parentBounds?.x || 0) + bounds.x),
    y: Math.round((parentBounds?.y || 0) + bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
}

function flattenLayers(params: {
  layers: UiScreenLayer[];
  parentId?: string;
  parentBounds?: UiScreenBounds;
  path?: string[];
  ancestorKinds?: UiScreenLayer["kind"][];
}): FlatLayer[] {
  const flattened: FlatLayer[] = [];

  for (const layer of params.layers) {
    if (layer.visible === false) continue;

    const absoluteBounds = layer.bounds
      ? offsetBounds(layer.bounds, params.parentBounds)
      : undefined;
    const item: FlatLayer = {
      layer,
      path: [...(params.path || []), layer.id],
      ancestorKinds: params.ancestorKinds || [],
      parentId: params.parentId,
      parentBounds: params.parentBounds,
      absoluteBounds,
    };

    flattened.push(item);
    if (layer.children?.length) {
      flattened.push(
        ...flattenLayers({
          layers: layer.children,
          parentId: layer.id,
          parentBounds: absoluteBounds || params.parentBounds,
          path: item.path,
          ancestorKinds: [...item.ancestorKinds, layer.kind],
        })
      );
    }
  }

  return flattened;
}

function textValue(layer: UiScreenLayer) {
  if (layer.kind === "text") return layer.text || "";
  if (layer.kind === "button" || layer.kind === "badge") {
    return layer.label || layer.text || "";
  }
  return "";
}

function isTextLikeLayer(layer: UiScreenLayer) {
  return layer.kind === "text" || layer.kind === "button" || layer.kind === "badge";
}

function isOverlapCandidate(layer: UiScreenLayer) {
  return (
    layer.kind === "text" ||
    layer.kind === "button" ||
    layer.kind === "badge" ||
    layer.kind === "card"
  );
}

function textWeight(text: string) {
  let weight = 0;
  for (const char of text) {
    if (/\s/.test(char)) {
      weight += 0.25;
    } else if (/[\u3400-\u9fff]/.test(char)) {
      weight += 1;
    } else {
      weight += 0.58;
    }
  }
  return weight;
}

function hasAsset(document: UiScreenDocument, assetId: string | undefined) {
  if (!assetId) return false;
  return Boolean(document.assets?.some((asset) => asset.id === assetId && asset.src));
}

function isAncestor(left: FlatLayer, right: FlatLayer) {
  return (
    left.path.includes(right.layer.id) ||
    right.path.includes(left.layer.id)
  );
}

function issueId(layerId: string | undefined, code: UiScreenValidationCode, suffix = "") {
  return [code, layerId || "document", suffix].filter(Boolean).join(":");
}

function hasVisibleSurface(layer: UiScreenLayer) {
  return Boolean(layer.style?.background || layer.style?.borderColor || layer.style?.boxShadow);
}

function maxShadowPixelValue(boxShadow: string | undefined) {
  if (!boxShadow) return 0;
  const matches = boxShadow.match(/-?\d+(?:\.\d+)?px/g) || [];
  return matches.reduce((max, value) => Math.max(max, Math.abs(Number.parseFloat(value))), 0);
}

function isDetailAgentDocument(document: UiScreenDocument) {
  return document.metadata?.source === "detail-agent-layout";
}

export function validateUiScreenDocument(
  document: UiScreenDocument
): UiScreenValidationResult {
  const issues: UiScreenValidationIssue[] = [];
  const flattened = flattenLayers({ layers: document.layers });
  const documentArea = Math.max(1, document.width * document.height);

  if (isDetailAgentDocument(document) && !document.metadata?.detailDesignSkillVersion) {
    issues.push({
      id: issueId(undefined, "missing_design_skill_metadata"),
      severity: "info",
      code: "missing_design_skill_metadata",
      message: "当前详情 UI 文档缺少设计技能版本标记",
      suggestion: "用新版 AI详情 AGENT排版重新生成，或在 metadata 中补齐 detailDesignSkillVersion。",
    });
  }

  for (const item of flattened) {
    const { layer, absoluteBounds } = item;

    if (absoluteBounds) {
      const overflowLeft = absoluteBounds.x < -DOCUMENT_EDGE_TOLERANCE;
      const overflowTop = absoluteBounds.y < -DOCUMENT_EDGE_TOLERANCE;
      const overflowRight =
        absoluteBounds.x + absoluteBounds.width > document.width + DOCUMENT_EDGE_TOLERANCE;
      const overflowBottom =
        absoluteBounds.y + absoluteBounds.height > document.height + DOCUMENT_EDGE_TOLERANCE;

      if (overflowLeft || overflowTop || overflowRight || overflowBottom) {
        issues.push({
          id: issueId(layer.id, "out_of_bounds"),
          layerId: layer.id,
          severity: "error",
          code: "out_of_bounds",
          message: `图层「${layer.name || layer.id}」超出画布边界`,
          suggestion: "将图层 bounds 限制在 ui-screen 文档宽高范围内。",
          details: {
            x: absoluteBounds.x,
            y: absoluteBounds.y,
            width: absoluteBounds.width,
            height: absoluteBounds.height,
            documentWidth: document.width,
            documentHeight: document.height,
          },
        });
      }
    }

    if (layer.bounds && item.parentBounds) {
      const childOverflowsParent =
        layer.bounds.x < -DOCUMENT_EDGE_TOLERANCE ||
        layer.bounds.y < -DOCUMENT_EDGE_TOLERANCE ||
        layer.bounds.x + layer.bounds.width >
          item.parentBounds.width + DOCUMENT_EDGE_TOLERANCE ||
        layer.bounds.y + layer.bounds.height >
          item.parentBounds.height + DOCUMENT_EDGE_TOLERANCE;

      if (childOverflowsParent) {
        issues.push({
          id: issueId(layer.id, "overflow_region"),
          layerId: layer.id,
          severity: "warning",
          code: "overflow_region",
          message: `图层「${layer.name || layer.id}」溢出父级区域`,
          suggestion: "收窄图层 bounds，或扩大父级容器的有效排版区域。",
          details: {
            parentId: item.parentId,
            x: layer.bounds.x,
            y: layer.bounds.y,
            width: layer.bounds.width,
            height: layer.bounds.height,
            parentWidth: item.parentBounds.width,
            parentHeight: item.parentBounds.height,
          },
        });
      }
    }

    if (layer.kind === "image" && !layer.src && !hasAsset(document, layer.assetId)) {
      issues.push({
        id: issueId(layer.id, "missing_image_source"),
        layerId: layer.id,
        severity: "error",
        code: "missing_image_source",
        message: `图片图层「${layer.name || layer.id}」缺少可渲染素材`,
        suggestion: "为图层设置 src，或补齐匹配 assetId 的 assets 条目。",
      });
    }

    if (
      isDetailAgentDocument(document) &&
      absoluteBounds &&
      !item.parentId &&
      layer.kind !== "image"
    ) {
      const coverage = rectArea(absoluteBounds) / documentArea;
      if (coverage > 0.45) {
        issues.push({
          id: issueId(layer.id, "overlay_too_large"),
          layerId: layer.id,
          severity: "warning",
          code: "overlay_too_large",
          message: `可编辑 UI 区域「${layer.name || layer.id}」覆盖画面过大`,
          suggestion: "将 region 控制在画布 45% 内，让产品/素材主体成为第一视觉。",
          details: {
            coverage: Number(coverage.toFixed(2)),
            maxCoverage: 0.45,
          },
        });
      }
    }

    if (layer.kind === "card" && item.ancestorKinds.includes("card")) {
      issues.push({
        id: issueId(layer.id, "nested_card"),
        layerId: layer.id,
        severity: "warning",
        code: "nested_card",
        message: `卡片「${layer.name || layer.id}」存在卡片套卡片`,
        suggestion: "扁平化信息结构，改用 stack/grid 分组或减少外层卡片。",
      });
    }

    if (
      layer.style?.borderRadius !== undefined &&
      layer.kind !== "button" &&
      layer.kind !== "badge" &&
      hasVisibleSurface(layer) &&
      layer.style.borderRadius > 16
    ) {
      issues.push({
        id: issueId(layer.id, "excessive_radius"),
        layerId: layer.id,
        severity: "warning",
        code: "excessive_radius",
        message: `图层「${layer.name || layer.id}」圆角过大`,
        suggestion: "详情 UI 面板/卡片圆角建议控制在 8-12px，避免廉价模板感。",
        details: {
          borderRadius: layer.style.borderRadius,
          maxRadius: 16,
        },
      });
    }

    const shadowMax = maxShadowPixelValue(layer.style?.boxShadow);
    if (shadowMax > 56) {
      issues.push({
        id: issueId(layer.id, "heavy_shadow"),
        layerId: layer.id,
        severity: "warning",
        code: "heavy_shadow",
        message: `图层「${layer.name || layer.id}」阴影过重`,
        suggestion: "降低阴影模糊和扩散，使用更轻的层级表达。",
        details: {
          maxShadowPx: shadowMax,
          recommendedMaxPx: 56,
        },
      });
    }

    if (isTextLikeLayer(layer)) {
      const text = textValue(layer).trim();
      const fontSize = layer.style?.fontSize;

      if (typeof layer.style?.letterSpacing === "number" && layer.style.letterSpacing < 0) {
        issues.push({
          id: issueId(layer.id, "negative_letter_spacing"),
          layerId: layer.id,
          severity: "warning",
          code: "negative_letter_spacing",
          message: `文字图层「${layer.name || layer.id}」使用了负字距`,
          suggestion: "将 letterSpacing 调整为 0，减少跨字体渲染风险。",
          details: {
            letterSpacing: layer.style.letterSpacing,
          },
        });
      }

      if (!text) {
        issues.push({
          id: issueId(layer.id, "empty_text"),
          layerId: layer.id,
          severity: "warning",
          code: "empty_text",
          message: `文字图层「${layer.name || layer.id}」为空`,
          suggestion: "补齐真实文案，或隐藏该图层。",
        });
      }

      if (typeof fontSize === "number" && fontSize > 0 && fontSize < MIN_READABLE_FONT_SIZE) {
        issues.push({
          id: issueId(layer.id, "tiny_text"),
          layerId: layer.id,
          severity: "warning",
          code: "tiny_text",
          message: `文字图层「${layer.name || layer.id}」字号过小`,
          suggestion: `将字号提升到至少 ${MIN_READABLE_FONT_SIZE}px。`,
          details: {
            fontSize,
            minFontSize: MIN_READABLE_FONT_SIZE,
          },
        });
      }

      if (text && absoluteBounds) {
        const readableFontSize =
          typeof fontSize === "number" && fontSize > 0 ? fontSize : 16;
        const lineHeight =
          typeof layer.style?.lineHeight === "number" && layer.style.lineHeight > 0
            ? layer.style.lineHeight
            : 1.28;
        const horizontalCapacity = Math.max(1, absoluteBounds.width / (readableFontSize * 0.64));
        const verticalCapacity = Math.max(
          1,
          absoluteBounds.height / (readableFontSize * lineHeight)
        );
        const estimatedCapacity = horizontalCapacity * verticalCapacity;

        if (textWeight(text) > estimatedCapacity * 1.24) {
          issues.push({
            id: issueId(layer.id, "dense_text"),
            layerId: layer.id,
            severity: "warning",
            code: "dense_text",
            message: `文字图层「${layer.name || layer.id}」内容密度偏高`,
            suggestion: "减少文案长度、放大文本区域，或降低字号并提高行高。",
            details: {
              textWeight: Math.round(textWeight(text)),
              estimatedCapacity: Math.round(estimatedCapacity),
              width: absoluteBounds.width,
              height: absoluteBounds.height,
              fontSize: readableFontSize,
            },
          });
        }
      }
    }
  }

  const overlapCandidates = flattened.filter(
    (item) => item.absoluteBounds && isOverlapCandidate(item.layer)
  );

  for (let leftIndex = 0; leftIndex < overlapCandidates.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < overlapCandidates.length;
      rightIndex += 1
    ) {
      const left = overlapCandidates[leftIndex];
      const right = overlapCandidates[rightIndex];
      if (!left?.absoluteBounds || !right?.absoluteBounds || isAncestor(left, right)) {
        continue;
      }

      const intersection = intersectionArea(left.absoluteBounds, right.absoluteBounds);
      const smallerArea = Math.min(rectArea(left.absoluteBounds), rectArea(right.absoluteBounds));
      if (smallerArea <= 0 || intersection / smallerArea < 0.42) continue;

      issues.push({
        id: issueId(left.layer.id, "overlap", right.layer.id),
        layerId: left.layer.id,
        severity: "warning",
        code: "overlap",
        message: `图层「${left.layer.name || left.layer.id}」与「${
          right.layer.name || right.layer.id
        }」重叠过多`,
        suggestion: "拉开图层间距，或把其中一个图层移动到新的排版区域。",
        details: {
          otherLayerId: right.layer.id,
          overlapRatio: Number((intersection / smallerArea).toFixed(2)),
        },
      });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const score = clampScore(100 - errorCount * 18 - warningCount * 8 - infoCount * 3);

  return {
    passed: errorCount === 0 && score >= 82,
    score,
    issues,
  };
}
