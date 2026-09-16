// Modified for standalone community distribution; see NOTICE.
import type { NormalizedCropRect } from "@/src/services/canvas/index";

export type LocalEditReferenceImage = {
  id: string;
  url: string;
  name?: string;
  source?: "upload" | "canvas";
  createdAt: number;
};

export type LocalEditRegion = {
  id: string;
  index: number;
  color: string;
  prompt: string;
  rect: NormalizedCropRect;
  referenceImages?: LocalEditReferenceImage[];
  createdAt: number;
};

export type LocalEditOverlayMetrics = {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
};

export type LocalEditOverlayRectStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const LOCAL_EDIT_METADATA_KEY = "localEditRegions";
export const LOCAL_EDIT_MAX_REGIONS = 8;
export const LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION = 3;
export const LOCAL_EDIT_MIN_EDGE_PX = 24;
export const LOCAL_EDIT_POLL_INTERVAL_MS = 2500;
export const LOCAL_EDIT_MAX_POLL_ATTEMPTS = 192;
export const LOCAL_EDIT_COLORS = [
  "#ef4444",
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

const clampLocalEditNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const isHttpImageUrl = (url?: string) => !!url && /^https?:\/\//i.test(url);

export const createLocalEditRegionId = () =>
  `local-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createLocalEditReferenceImageId = () =>
  `local-edit-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeLocalEditRect = (value: unknown): NormalizedCropRect | null => {
  if (!value || typeof value !== "object") return null;
  const rect = value as Partial<NormalizedCropRect>;
  const x = clampLocalEditNumber(Number(rect.x), 0, 1);
  const y = clampLocalEditNumber(Number(rect.y), 0, 1);
  const width = clampLocalEditNumber(Number(rect.width), 0, 1 - x);
  const height = clampLocalEditNumber(Number(rect.height), 0, 1 - y);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { x, y, width, height };
};

export const normalizeLocalEditReferenceImages = (
  value: unknown
): LocalEditReferenceImage[] => {
  if (!Array.isArray(value)) return [];
  const references: LocalEditReferenceImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!isHttpImageUrl(url)) continue;
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim().slice(0, 80)
        : "";
    references.push({
      id:
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : createLocalEditReferenceImageId(),
      url,
      ...(name ? { name } : {}),
      source: record.source === "canvas" ? "canvas" : "upload",
      createdAt:
        typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
          ? record.createdAt
          : Date.now(),
    });
    if (references.length >= LOCAL_EDIT_MAX_REFERENCE_IMAGES_PER_REGION) {
      break;
    }
  }
  return references;
};

export const reindexLocalEditRegions = (
  regions: LocalEditRegion[]
): LocalEditRegion[] =>
  regions.map((region, index) => ({
    ...region,
    index: index + 1,
    color: region.color || LOCAL_EDIT_COLORS[index % LOCAL_EDIT_COLORS.length],
  }));

export const normalizeLocalEditRegions = (value: unknown): LocalEditRegion[] => {
  if (!Array.isArray(value)) return [];
  const regions: LocalEditRegion[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const rect = normalizeLocalEditRect(record.rect);
    if (!rect) return;
    regions.push({
      id:
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : createLocalEditRegionId(),
      index:
        typeof record.index === "number" && Number.isFinite(record.index)
          ? record.index
          : index + 1,
      color:
        typeof record.color === "string" && record.color.trim()
          ? record.color.trim()
          : LOCAL_EDIT_COLORS[index % LOCAL_EDIT_COLORS.length],
      prompt: typeof record.prompt === "string" ? record.prompt.trim() : "",
      rect,
      referenceImages: normalizeLocalEditReferenceImages(record.referenceImages),
      createdAt:
        typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
          ? record.createdAt
          : Date.now(),
    });
  });
  return reindexLocalEditRegions(regions.slice(0, LOCAL_EDIT_MAX_REGIONS));
};

export const getLocalEditRegionsFromMetadata = (
  metadata: Record<string, any> | undefined
) => normalizeLocalEditRegions(metadata?.[LOCAL_EDIT_METADATA_KEY]);

export const createLocalEditPromptDraftMap = (
  regions: LocalEditRegion[],
  draftSource?: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    regions.map((region) => [
      region.id,
      draftSource?.[region.id] ?? region.prompt,
    ])
  );

export const getNormalizedRectOverlayStyle = (
  rect: NormalizedCropRect,
  metrics: LocalEditOverlayMetrics
): LocalEditOverlayRectStyle => ({
  left: metrics.offsetX + rect.x * metrics.renderedWidth,
  top: metrics.offsetY + rect.y * metrics.renderedHeight,
  width: rect.width * metrics.renderedWidth,
  height: rect.height * metrics.renderedHeight,
});
