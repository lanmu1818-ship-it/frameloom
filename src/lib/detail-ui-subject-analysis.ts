// Modified for standalone community distribution; see NOTICE.
export interface DetailUiSubjectBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface DetailUiSafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetailUiSubjectAnalysis {
  subjectBox: DetailUiSubjectBox;
  safeZones: {
    left?: DetailUiSafeZone | null;
    right?: DetailUiSafeZone | null;
    top?: DetailUiSafeZone | null;
    bottom?: DetailUiSafeZone | null;
  };
  dominantHorizontal: "left" | "right" | "center";
  dominantVertical: "top" | "bottom" | "center";
}

export function clampNormalized(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeSafeZone(zone?: Partial<DetailUiSafeZone> | null) {
  if (!zone) return null;
  const width = clampNormalized(Number(zone.width || 0));
  const height = clampNormalized(Number(zone.height || 0));
  if (width <= 0 || height <= 0) return null;

  return {
    x: clampNormalized(Number(zone.x || 0)),
    y: clampNormalized(Number(zone.y || 0)),
    width,
    height,
  } satisfies DetailUiSafeZone;
}

export function normalizeDetailUiSubjectAnalysis(
  value: unknown,
): DetailUiSubjectAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const subjectRaw =
    raw.subjectBox && typeof raw.subjectBox === "object" && !Array.isArray(raw.subjectBox)
      ? (raw.subjectBox as Record<string, unknown>)
      : null;
  if (!subjectRaw) return null;

  const subjectBox = {
    x: clampNormalized(Number(subjectRaw.x || 0)),
    y: clampNormalized(Number(subjectRaw.y || 0)),
    width: clampNormalized(Number(subjectRaw.width || 0)),
    height: clampNormalized(Number(subjectRaw.height || 0)),
    confidence: Number.isFinite(Number(subjectRaw.confidence))
      ? Math.max(0, Math.min(1, Number(subjectRaw.confidence)))
      : undefined,
  } satisfies DetailUiSubjectBox;

  if (subjectBox.width <= 0 || subjectBox.height <= 0) return null;

  const zonesRaw =
    raw.safeZones && typeof raw.safeZones === "object" && !Array.isArray(raw.safeZones)
      ? (raw.safeZones as Record<string, unknown>)
      : {};

  const centerX = subjectBox.x + subjectBox.width / 2;
  const centerY = subjectBox.y + subjectBox.height / 2;

  return {
    subjectBox,
    safeZones: {
      left: normalizeSafeZone(zonesRaw.left as any),
      right: normalizeSafeZone(zonesRaw.right as any),
      top: normalizeSafeZone(zonesRaw.top as any),
      bottom: normalizeSafeZone(zonesRaw.bottom as any),
    },
    dominantHorizontal:
      centerX < 0.42 ? "left" : centerX > 0.58 ? "right" : "center",
    dominantVertical:
      centerY < 0.42 ? "top" : centerY > 0.58 ? "bottom" : "center",
  } satisfies DetailUiSubjectAnalysis;
}
