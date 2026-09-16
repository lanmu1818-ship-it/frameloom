// Modified for standalone community distribution; see NOTICE.
export const VIDEO_CANVAS_MARKER_METADATA_KEY = "videoCanvasMarkers";

export type VideoCanvasMarkerColorId =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export type VideoCanvasTaskMarkerId =
  | "todo"
  | "quarter"
  | "half"
  | "mostly"
  | "blocked"
  | "done";

export type VideoCanvasSymbolMarkerId =
  | "idea"
  | "question"
  | "warning"
  | "pin"
  | "heart"
  | "bolt";

export type VideoCanvasMarkerKey =
  | "tagColor"
  | "priority"
  | "task"
  | "flagColor"
  | "starColor"
  | "avatarColor"
  | "symbol";

export type VideoCanvasMarkerValue =
  | VideoCanvasMarkerColorId
  | VideoCanvasTaskMarkerId
  | VideoCanvasSymbolMarkerId
  | number;

export interface VideoCanvasMarkerState {
  tagColor?: VideoCanvasMarkerColorId;
  priority?: number;
  task?: VideoCanvasTaskMarkerId;
  flagColor?: VideoCanvasMarkerColorId;
  starColor?: VideoCanvasMarkerColorId;
  avatarColor?: VideoCanvasMarkerColorId;
  symbol?: VideoCanvasSymbolMarkerId;
}

export const VIDEO_CANVAS_MARKER_COLORS: Array<{
  id: VideoCanvasMarkerColorId;
  label: string;
  color: string;
  soft: string;
}> = [
  { id: "red", label: "红色", color: "#ef4444", soft: "#fee2e2" },
  { id: "orange", label: "橙色", color: "#f97316", soft: "#ffedd5" },
  { id: "yellow", label: "黄色", color: "#eab308", soft: "#fef9c3" },
  { id: "green", label: "绿色", color: "#10b981", soft: "#d1fae5" },
  { id: "blue", label: "蓝色", color: "#5b76fe", soft: "#e0e7ff" },
  { id: "purple", label: "紫色", color: "#7c3aed", soft: "#ede9fe" },
  { id: "gray", label: "灰色", color: "#9ca3af", soft: "#f3f4f6" },
];

export const VIDEO_CANVAS_PRIORITY_MARKERS = VIDEO_CANVAS_MARKER_COLORS.map(
  (entry, index) => ({
    ...entry,
    value: index + 1,
  })
);

export const VIDEO_CANVAS_TASK_MARKERS: Array<{
  id: VideoCanvasTaskMarkerId;
  label: string;
  progress: number;
}> = [
  { id: "todo", label: "未开始", progress: 0 },
  { id: "quarter", label: "25%", progress: 25 },
  { id: "half", label: "50%", progress: 50 },
  { id: "mostly", label: "75%", progress: 75 },
  { id: "blocked", label: "暂停", progress: 88 },
  { id: "done", label: "完成", progress: 100 },
];

export const VIDEO_CANVAS_SYMBOL_MARKERS: Array<{
  id: VideoCanvasSymbolMarkerId;
  label: string;
  color: string;
  soft: string;
}> = [
  { id: "idea", label: "想法", color: "#f59e0b", soft: "#fef3c7" },
  { id: "question", label: "疑问", color: "#3b82f6", soft: "#dbeafe" },
  { id: "warning", label: "注意", color: "#ef4444", soft: "#fee2e2" },
  { id: "pin", label: "固定", color: "#64748b", soft: "#f1f5f9" },
  { id: "heart", label: "喜欢", color: "#ec4899", soft: "#fce7f3" },
  { id: "bolt", label: "灵感", color: "#8b5cf6", soft: "#ede9fe" },
];

const MARKER_COLOR_IDS = new Set(
  VIDEO_CANVAS_MARKER_COLORS.map((entry) => entry.id)
);
const TASK_MARKER_IDS = new Set(
  VIDEO_CANVAS_TASK_MARKERS.map((entry) => entry.id)
);
const SYMBOL_MARKER_IDS = new Set(
  VIDEO_CANVAS_SYMBOL_MARKERS.map((entry) => entry.id)
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMarkerColorId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return MARKER_COLOR_IDS.has(id as VideoCanvasMarkerColorId)
    ? (id as VideoCanvasMarkerColorId)
    : undefined;
}

function normalizeTaskMarkerId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return TASK_MARKER_IDS.has(id as VideoCanvasTaskMarkerId)
    ? (id as VideoCanvasTaskMarkerId)
    : undefined;
}

function normalizeSymbolMarkerId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return SYMBOL_MARKER_IDS.has(id as VideoCanvasSymbolMarkerId)
    ? (id as VideoCanvasSymbolMarkerId)
    : undefined;
}

export function normalizeVideoCanvasMarkers(
  value: unknown
): VideoCanvasMarkerState {
  if (!isRecord(value)) {
    return {};
  }

  const priority = Number(value.priority);
  return {
    tagColor: normalizeMarkerColorId(value.tagColor),
    priority:
      Number.isInteger(priority) && priority >= 1 && priority <= 7
        ? priority
        : undefined,
    task: normalizeTaskMarkerId(value.task),
    flagColor: normalizeMarkerColorId(value.flagColor),
    starColor: normalizeMarkerColorId(value.starColor),
    avatarColor: normalizeMarkerColorId(value.avatarColor),
    symbol: normalizeSymbolMarkerId(value.symbol),
  };
}

export function compactVideoCanvasMarkers(
  markers: VideoCanvasMarkerState
): VideoCanvasMarkerState {
  return Object.fromEntries(
    Object.entries(markers).filter(([, value]) => value !== undefined)
  ) as VideoCanvasMarkerState;
}

export function getVideoCanvasMarkerColor(id?: VideoCanvasMarkerColorId) {
  return VIDEO_CANVAS_MARKER_COLORS.find((entry) => entry.id === id) || null;
}

export function getVideoCanvasTaskMarker(id?: VideoCanvasTaskMarkerId) {
  return VIDEO_CANVAS_TASK_MARKERS.find((entry) => entry.id === id) || null;
}

export function getVideoCanvasSymbolMarker(id?: VideoCanvasSymbolMarkerId) {
  return VIDEO_CANVAS_SYMBOL_MARKERS.find((entry) => entry.id === id) || null;
}
