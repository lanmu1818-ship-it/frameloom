// Modified for standalone community distribution; see NOTICE.
import type {
  UiScreenBounds,
  UiScreenDocument,
  UiScreenLayer,
  UiScreenLayerStyle,
} from "@/src/lib/ui-screen/schema";
import type {
  UiScreenValidationIssue,
  UiScreenValidationResult,
} from "@/src/lib/ui-screen/validation";

export type UiScreenPatchOperation =
  | { op: "set_text"; layerId: string; text: string }
  | { op: "set_style"; layerId: string; style: Partial<UiScreenLayerStyle> }
  | { op: "set_bounds"; layerId: string; bounds: Partial<UiScreenBounds> }
  | { op: "set_validation"; validation: UiScreenValidationResult };

export interface UiScreenPatch {
  version: "ui-screen-patch/v1";
  documentId?: string;
  summary?: string;
  operations: UiScreenPatchOperation[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampBoundsToDocument(
  bounds: UiScreenBounds,
  document: UiScreenDocument
): UiScreenBounds {
  const width = clamp(Math.round(bounds.width), 1, document.width);
  const height = clamp(Math.round(bounds.height), 1, document.height);
  return {
    x: clamp(Math.round(bounds.x), 0, Math.max(0, document.width - width)),
    y: clamp(Math.round(bounds.y), 0, Math.max(0, document.height - height)),
    width,
    height,
  };
}

function clampBoundsToParent(
  bounds: UiScreenBounds,
  parentWidth: number,
  parentHeight: number
): UiScreenBounds {
  const width = clamp(Math.round(bounds.width), 1, Math.max(1, parentWidth));
  const height = clamp(Math.round(bounds.height), 1, Math.max(1, parentHeight));
  return {
    x: clamp(Math.round(bounds.x), 0, Math.max(0, parentWidth - width)),
    y: clamp(Math.round(bounds.y), 0, Math.max(0, parentHeight - height)),
    width,
    height,
  };
}

function buildBoundsFix(params: {
  issue: UiScreenValidationIssue;
  layer: UiScreenLayer;
  document: UiScreenDocument;
}): UiScreenBounds | null {
  if (!params.layer.bounds) return null;

  if (params.issue.code === "overflow_region") {
    const parentWidth = Number(params.issue.details?.parentWidth);
    const parentHeight = Number(params.issue.details?.parentHeight);
    if (Number.isFinite(parentWidth) && Number.isFinite(parentHeight)) {
      return clampBoundsToParent(params.layer.bounds, parentWidth, parentHeight);
    }
  }

  const absoluteBounds = {
    x: Number(params.issue.details?.x),
    y: Number(params.issue.details?.y),
    width: Number(params.issue.details?.width),
    height: Number(params.issue.details?.height),
  };

  if (
    Number.isFinite(absoluteBounds.x) &&
    Number.isFinite(absoluteBounds.y) &&
    Number.isFinite(absoluteBounds.width) &&
    Number.isFinite(absoluteBounds.height)
  ) {
    const clampedAbsolute = clampBoundsToDocument(absoluteBounds, params.document);
    return {
      x: Math.round(params.layer.bounds.x + clampedAbsolute.x - absoluteBounds.x),
      y: Math.round(params.layer.bounds.y + clampedAbsolute.y - absoluteBounds.y),
      width: clampedAbsolute.width,
      height: clampedAbsolute.height,
    };
  }

  return clampBoundsToDocument(params.layer.bounds, params.document);
}

function mapLayers(
  layers: UiScreenLayer[],
  layerId: string,
  updater: (layer: UiScreenLayer) => UiScreenLayer
): UiScreenLayer[] {
  return layers.map((layer) => {
    const children = layer.children
      ? mapLayers(layer.children, layerId, updater)
      : undefined;
    const nextLayer = children ? { ...layer, children } : layer;
    return nextLayer.id === layerId ? updater(nextLayer) : nextLayer;
  });
}

function findLayer(layers: UiScreenLayer[], layerId: string): UiScreenLayer | null {
  for (const layer of layers) {
    if (layer.id === layerId) return layer;
    const child = layer.children ? findLayer(layer.children, layerId) : null;
    if (child) return child;
  }
  return null;
}

function shouldAutoFixBounds(issue: UiScreenValidationIssue) {
  return issue.code === "out_of_bounds" || issue.code === "overflow_region";
}

export function applyUiScreenPatch(
  document: UiScreenDocument,
  patch: UiScreenPatch
): UiScreenDocument {
  let nextDocument: UiScreenDocument = {
    ...document,
    layers: document.layers,
    metadata: {
      ...(document.metadata || {}),
    },
  };

  for (const operation of patch.operations) {
    if (operation.op === "set_text") {
      nextDocument = {
        ...nextDocument,
        layers: mapLayers(nextDocument.layers, operation.layerId, (layer) => {
          if (layer.kind === "text") {
            return { ...layer, text: operation.text };
          }
          if (layer.kind === "button" || layer.kind === "badge") {
            return { ...layer, label: operation.text };
          }
          return layer;
        }),
      };
      continue;
    }

    if (operation.op === "set_style") {
      nextDocument = {
        ...nextDocument,
        layers: mapLayers(nextDocument.layers, operation.layerId, (layer) => ({
          ...layer,
          style: {
            ...(layer.style || {}),
            ...operation.style,
          },
        })),
      };
      continue;
    }

    if (operation.op === "set_bounds") {
      nextDocument = {
        ...nextDocument,
        layers: mapLayers(nextDocument.layers, operation.layerId, (layer) => ({
          ...layer,
          bounds: {
            ...(layer.bounds || { x: 0, y: 0, width: 1, height: 1 }),
            ...operation.bounds,
          },
        })),
      };
      continue;
    }

    if (operation.op === "set_validation") {
      nextDocument = {
        ...nextDocument,
        metadata: {
          ...(nextDocument.metadata || {}),
          uiScreenValidation: operation.validation,
        },
      };
    }
  }

  return nextDocument;
}

export function buildAutoUiScreenPatch(params: {
  document: UiScreenDocument;
  validation: UiScreenValidationResult;
}): UiScreenPatch {
  const styleUpdates = new Map<string, Partial<UiScreenLayerStyle>>();
  const boundsUpdates = new Map<string, UiScreenBounds>();
  const operations: UiScreenPatchOperation[] = [
    { op: "set_validation", validation: params.validation },
  ];

  for (const issue of params.validation.issues) {
    if (!issue.layerId) continue;
    const layer = findLayer(params.document.layers, issue.layerId);
    if (!layer) continue;

    if (shouldAutoFixBounds(issue) && layer.bounds) {
      const boundsFix = buildBoundsFix({ issue, layer, document: params.document });
      if (boundsFix) {
        boundsUpdates.set(layer.id, boundsFix);
      }
    }

    if (issue.code === "tiny_text") {
      styleUpdates.set(layer.id, {
        ...(styleUpdates.get(layer.id) || {}),
        fontSize: Math.max(12, layer.style?.fontSize || 12),
        lineHeight: Math.max(1.22, layer.style?.lineHeight || 1.22),
      });
    }

    if (issue.code === "dense_text") {
      const currentSize = layer.style?.fontSize || 16;
      styleUpdates.set(layer.id, {
        ...(styleUpdates.get(layer.id) || {}),
        fontSize: Math.max(12, Math.round(currentSize * 0.94)),
        lineHeight: Math.max(1.32, layer.style?.lineHeight || 1.32),
      });
    }

    if (issue.code === "negative_letter_spacing") {
      styleUpdates.set(layer.id, {
        ...(styleUpdates.get(layer.id) || {}),
        letterSpacing: 0,
      });
    }

    if (issue.code === "excessive_radius") {
      styleUpdates.set(layer.id, {
        ...(styleUpdates.get(layer.id) || {}),
        borderRadius: Math.min(12, layer.style?.borderRadius || 12),
      });
    }

    if (issue.code === "heavy_shadow") {
      styleUpdates.set(layer.id, {
        ...(styleUpdates.get(layer.id) || {}),
        boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
      });
    }
  }

  for (const [layerId, bounds] of boundsUpdates) {
    operations.push({ op: "set_bounds", layerId, bounds });
  }

  for (const [layerId, style] of styleUpdates) {
    operations.push({ op: "set_style", layerId, style });
  }

  return {
    version: "ui-screen-patch/v1",
    documentId: params.document.id,
    summary:
      operations.length > 1
        ? `自动修复 ${operations.length - 1} 项 ui-screen 布局问题`
        : "记录 ui-screen 质检结果",
    operations,
  };
}
