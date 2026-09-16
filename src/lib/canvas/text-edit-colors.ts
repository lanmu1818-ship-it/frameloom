// Modified for standalone community distribution; see NOTICE.
export const TEXT_EDIT_COLOR_SWATCHES = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
] as const;

export function normalizeOptionalHexColor(value: unknown): string | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized}`;
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) {
    if (normalized.length === 4) {
      return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
    }
    return normalized;
  }

  return undefined;
}

export function formatHexColor(value: string | undefined | null) {
  const normalized = normalizeOptionalHexColor(value);
  return normalized ? normalized.toUpperCase() : "";
}
