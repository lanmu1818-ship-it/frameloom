// Modified for standalone community distribution; see NOTICE.
export type UiSurfaceType = "detail_page";

export type UiSurfaceGenerationMode = "classic" | "agent_layout";

export type UiSurfaceComponentType =
  | "detail_page_root"
  | "detail_screen"
  | "detail_background_image"
  | "detail_text_stack"
  | "detail_text_block"
  | "detail_section"
  | "detail_card"
  | "detail_badge"
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

export type UiSurfaceTextBindingKey = "title" | "subtitle" | "copy";

export interface UiSurfaceFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UiSurfaceBinding {
  kind: "text";
  path: string;
}

export interface UiSurfaceComponent {
  id: string;
  type: UiSurfaceComponentType;
  parentId: string | null;
  slot?: string;
  props?: Record<string, unknown>;
  bindings?: Record<string, UiSurfaceBinding | undefined>;
  layout?: {
    frame?: UiSurfaceFrame;
    zIndex?: number;
  };
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UiSurfaceValidation {
  passed: boolean;
  issues: string[];
  source?: "plan" | "review";
}

export interface UiSurfaceSnapshot {
  version: "ui-surface/v1";
  surfaceId: string;
  surfaceType: UiSurfaceType;
  generationMode: UiSurfaceGenerationMode;
  rootComponentId: string;
  screenSize: {
    width: number;
    height: number;
  };
  components: UiSurfaceComponent[];
  dataModel: Record<string, unknown>;
  validation?: UiSurfaceValidation;
  metadata?: Record<string, unknown>;
}

export interface UiSurfaceDataUpdate {
  path: string;
  value: unknown;
}

export type UiSurfacePatchOperation =
  | {
      type: "replace_component_subtree";
      componentId: string;
      components: UiSurfaceComponent[];
    }
  | {
      type: "set_data";
      updates: UiSurfaceDataUpdate[];
    }
  | {
      type: "set_validation";
      validation: UiSurfaceValidation;
    };

export interface UiSurfacePatch {
  version: "ui-surface-patch/v1";
  surfaceId: string;
  surfaceType: UiSurfaceType;
  operations: UiSurfacePatchOperation[];
}

function normalizePathSegments(path: string) {
  return String(path || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = normalizePathSegments(path);
  if (segments.length === 0) return target;

  let pointer: unknown = target;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsIndex = nextSegment ? /^\d+$/.test(nextSegment) : false;

    if (Array.isArray(pointer)) {
      const arrayIndex = Number(segment);
      if (!Number.isFinite(arrayIndex) || arrayIndex < 0) return target;

      if (isLast) {
        pointer[arrayIndex] = value;
        return target;
      }

      if (
        pointer[arrayIndex] === undefined ||
        pointer[arrayIndex] === null ||
        (typeof pointer[arrayIndex] !== "object" && !Array.isArray(pointer[arrayIndex]))
      ) {
        pointer[arrayIndex] = nextIsIndex ? [] : {};
      }
      pointer = pointer[arrayIndex] as unknown;
      continue;
    }

    if (!pointer || typeof pointer !== "object") return target;
    const objectPointer = pointer as Record<string, unknown>;

    if (isLast) {
      objectPointer[segment] = value;
      return target;
    }

    const currentValue = objectPointer[segment];
    if (
      currentValue === undefined ||
      currentValue === null ||
      (typeof currentValue !== "object" && !Array.isArray(currentValue))
    ) {
      objectPointer[segment] = nextIsIndex ? [] : {};
    }
    pointer = objectPointer[segment] as unknown;
  }

  return target;
}

export function getUiSurfaceComponent(
  snapshot: UiSurfaceSnapshot | null | undefined,
  componentId: string,
) {
  if (!snapshot) return null;
  return snapshot.components.find((component) => component.id === componentId) || null;
}

export function getUiSurfaceChildren(
  snapshot: UiSurfaceSnapshot | null | undefined,
  parentId: string,
) {
  if (!snapshot) return [];
  return snapshot.components.filter((component) => component.parentId === parentId);
}

export function collectUiSurfaceDescendantIds(
  snapshot: UiSurfaceSnapshot | null | undefined,
  parentId: string,
) {
  if (!snapshot) return [];
  const collected = new Set<string>();
  const queue = [parentId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const children = snapshot.components.filter((component) => component.parentId === current);
    children.forEach((child) => {
      if (collected.has(child.id)) return;
      collected.add(child.id);
      queue.push(child.id);
    });
  }

  return [...collected];
}

export function resolveUiSurfaceTextBinding(
  snapshot: UiSurfaceSnapshot | null | undefined,
  component: UiSurfaceComponent | null | undefined,
  bindingKey: string,
) {
  if (!snapshot || !component) return "";
  const binding = component.bindings?.[bindingKey];
  if (!binding || binding.kind !== "text") {
    return String(component.props?.[bindingKey] || "");
  }

  const segments = normalizePathSegments(binding.path);
  let pointer: unknown = snapshot.dataModel;
  for (const segment of segments) {
    if (Array.isArray(pointer)) {
      const arrayIndex = Number(segment);
      if (!Number.isFinite(arrayIndex)) return "";
      pointer = pointer[arrayIndex];
      continue;
    }
    if (!pointer || typeof pointer !== "object") return "";
    pointer = (pointer as Record<string, unknown>)[segment];
  }

  return typeof pointer === "string" ? pointer : String(pointer || "");
}

export function applyUiSurfacePatch(
  snapshot: UiSurfaceSnapshot | null | undefined,
  patch: UiSurfacePatch | null | undefined,
) {
  if (!snapshot || !patch) return snapshot || null;
  if (
    patch.version !== "ui-surface-patch/v1" ||
    patch.surfaceType !== snapshot.surfaceType ||
    patch.surfaceId !== snapshot.surfaceId
  ) {
    return snapshot;
  }

  const nextSnapshot = cloneValue(snapshot);

  patch.operations.forEach((operation) => {
    if (operation.type === "replace_component_subtree") {
      const descendantIds = collectUiSurfaceDescendantIds(nextSnapshot, operation.componentId);
      const removeIdSet = new Set(descendantIds);
      nextSnapshot.components = nextSnapshot.components.filter(
        (component) => !removeIdSet.has(component.id),
      );

      const replacementComponentIds = new Set(operation.components.map((component) => component.id));
      nextSnapshot.components = nextSnapshot.components.filter(
        (component) => !replacementComponentIds.has(component.id),
      );
      nextSnapshot.components.push(...cloneValue(operation.components));
      return;
    }

    if (operation.type === "set_data") {
      operation.updates.forEach((update) => {
        setValueAtPath(nextSnapshot.dataModel, update.path, update.value);
      });
      return;
    }

    if (operation.type === "set_validation") {
      nextSnapshot.validation = cloneValue(operation.validation);
    }
  });

  return nextSnapshot;
}

export function countUiSurfaceComponents(
  snapshot: UiSurfaceSnapshot | null | undefined,
  type?: UiSurfaceComponentType,
) {
  if (!snapshot) return 0;
  return type
    ? snapshot.components.filter((component) => component.type === type).length
    : snapshot.components.length;
}

export function getUiSurfaceScreenComponents(
  snapshot: UiSurfaceSnapshot | null | undefined,
) {
  if (!snapshot) return [] as UiSurfaceComponent[];
  return snapshot.components
    .filter((component) => component.type === "detail_screen")
    .sort(
      (left, right) =>
        Number(left.props?.screenIndex || 0) - Number(right.props?.screenIndex || 0),
    );
}
