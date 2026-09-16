// Modified for standalone community distribution; see NOTICE.
import type { UiSurfaceSnapshot } from "@/src/lib/ui-surface-protocol";
import {
  type DetailArchive,
  type DetailBriefForm,
  type DetailGenerationMode,
  DETAIL_SLOT_CONFIGS,
  normalizeDetailGenerationMode,
} from "@/src/components/canvas/chat-panel/canvas-detail-config";
import type { PickedObjectAttachment } from "@/src/components/canvas/chat-panel/canvas-chat-session";

const DETAIL_ARCHIVE_LIST_LIMIT = 30;

function toTimestamp(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value || ""));
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function toDetailBriefForm(value: Partial<DetailBriefForm> | null | undefined): DetailBriefForm {
  return {
    productSpu: String(value?.productSpu || ""),
    demandType: String(value?.demandType || ""),
    productName: String(value?.productName || ""),
    targetAudience: String(value?.targetAudience || ""),
    mainUser: String(value?.mainUser || ""),
    usageScenario: String(value?.usageScenario || ""),
    triggerMoment: String(value?.triggerMoment || ""),
    coreNeed: String(value?.coreNeed || ""),
    riskConcern: String(value?.riskConcern || ""),
    expectedResult: String(value?.expectedResult || ""),
    coreSellingPoint: String(value?.coreSellingPoint || ""),
    positioningStatement: String(value?.positioningStatement || ""),
    userVoice: String(value?.userVoice || ""),
    competitorReference: String(value?.competitorReference || ""),
    priceBand: String(value?.priceBand || ""),
    brandTone: String(value?.brandTone || ""),
    bannedWords: String(value?.bannedWords || ""),
  };
}

export function sanitizeDetailArchiveList(value: unknown): DetailArchive[] {
  const parsed = Array.isArray(value) ? (value as DetailArchive[]) : [];
  return parsed
    .filter((item) => item?.id && item?.createdAt)
    .map((item) => {
      const createdAt = toTimestamp(item.createdAt, Date.now()) || Date.now();
      return {
        id: String(item.id),
        title: String(item.title || "未命名详情项目"),
        prompt: String(item.prompt || ""),
        generationMode: normalizeDetailGenerationMode((item as any).generationMode),
        brief: toDetailBriefForm(item.brief),
        slots: DETAIL_SLOT_CONFIGS.map((_, index) => {
          const slot = item.slots?.[index];
          if (!slot?.url) return null;
          return {
            url: String(slot.url),
            name: String(slot.name || DETAIL_SLOT_CONFIGS[index]?.label || `素材${index + 1}`),
            contentType: String(slot.contentType || "image/jpeg"),
          } as PickedObjectAttachment;
        }),
        createdAt,
        updatedAt: toTimestamp((item as any).updatedAt),
        summary: item.summary ? String(item.summary) : undefined,
        imageCount: Number(item.imageCount || 0) || undefined,
        coverUrl: item.coverUrl ? String(item.coverUrl) : undefined,
        uiSurfaceSnapshot:
          item.uiSurfaceSnapshot &&
          typeof item.uiSurfaceSnapshot === "object" &&
          !Array.isArray(item.uiSurfaceSnapshot)
            ? (item.uiSurfaceSnapshot as UiSurfaceSnapshot)
            : null,
        uiSurfaceLatestReview:
          item.uiSurfaceLatestReview &&
          typeof item.uiSurfaceLatestReview === "object" &&
          !Array.isArray(item.uiSurfaceLatestReview)
            ? {
                screenIndex:
                  Number((item.uiSurfaceLatestReview as any).screenIndex || 0) || undefined,
                action:
                  (item.uiSurfaceLatestReview as any).action === "protocol_patch" ||
                  (item.uiSurfaceLatestReview as any).action === "regenerate_image" ||
                  (item.uiSurfaceLatestReview as any).action === "pass"
                    ? (item.uiSurfaceLatestReview as any).action
                    : undefined,
                passed:
                  typeof (item.uiSurfaceLatestReview as any).passed === "boolean"
                    ? (item.uiSurfaceLatestReview as any).passed
                    : undefined,
                issues: Array.isArray((item.uiSurfaceLatestReview as any).issues)
                  ? (item.uiSurfaceLatestReview as any).issues
                      .map((issue: unknown) => String(issue || "").trim())
                      .filter(Boolean)
                      .slice(0, 10)
                  : [],
              }
            : null,
      };
    })
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, DETAIL_ARCHIVE_LIST_LIMIT);
}

export function patchDetailArchiveList(
  archives: DetailArchive[],
  archiveId: string,
  patch: Partial<DetailArchive>,
  now = Date.now()
): DetailArchive[] {
  return archives.map((item) =>
    item.id === archiveId ? { ...item, ...patch, updatedAt: patch.updatedAt || now } : item
  );
}

export function replaceSavedDetailArchive(
  archives: DetailArchive[],
  draftArchiveId: string,
  savedArchive: DetailArchive
): DetailArchive[] {
  return [
    savedArchive,
    ...archives.filter((item) => item.id !== draftArchiveId && item.id !== savedArchive.id),
  ].slice(0, DETAIL_ARCHIVE_LIST_LIMIT);
}

export function prependDetailArchive(
  archives: DetailArchive[],
  archive: DetailArchive
): DetailArchive[] {
  return [archive, ...archives].slice(0, DETAIL_ARCHIVE_LIST_LIMIT);
}

export function createDetailArchiveSnapshot(params: {
  archiveId: string;
  createdAt: number;
  summary?: string;
  imageCount?: number;
  coverUrl?: string;
  prompt: string;
  generationMode: DetailGenerationMode;
  brief: DetailBriefForm;
  slots: Array<PickedObjectAttachment | null>;
  uiSurfaceSnapshot?: UiSurfaceSnapshot | null;
  uiSurfaceLatestReview?: DetailArchive["uiSurfaceLatestReview"];
}): DetailArchive {
  const promptText = params.prompt.replace(/\s+/g, " ").trim();
  const spuSeed = String(params.brief.productSpu || "").replace(/\s+/g, "").trim();
  const demandSeed = String(
    params.brief.demandType || params.brief.coreNeed || params.brief.usageScenario || ""
  )
    .replace(/\s+/g, " ")
    .trim();
  const archiveTitle =
    spuSeed && demandSeed
      ? `${spuSeed}+${demandSeed}`
      : spuSeed || demandSeed || params.brief.productName || "AI详情项目";

  return {
    id: params.archiveId,
    title: archiveTitle,
    prompt: promptText,
    generationMode: params.generationMode,
    brief: { ...params.brief },
    slots: DETAIL_SLOT_CONFIGS.map((_, index) => {
      const slot = params.slots[index];
      return slot
        ? {
            url: slot.url,
            name: slot.name,
            contentType: slot.contentType,
          }
        : null;
    }),
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    summary: params.summary,
    imageCount: params.imageCount,
    coverUrl: params.coverUrl,
    uiSurfaceSnapshot: params.uiSurfaceSnapshot || null,
    uiSurfaceLatestReview: params.uiSurfaceLatestReview || null,
  };
}
