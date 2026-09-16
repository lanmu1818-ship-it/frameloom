// Modified for standalone community distribution; see NOTICE.
import { inferOriginalImageUrl } from "@/src/lib/image-url";
import type { ImageNodeData } from "@/types/canvas/index";

export const normalizeMediaUrl = (url: string): string => {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`
      .replace(/\/+$/, "")
      .toLowerCase();
  } catch {
    return raw.split("#")[0].split("?")[0].replace(/\/+$/, "").toLowerCase();
  }
};

export const normalizeImageIdentityUrl = (url: string): string => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const canonical = inferOriginalImageUrl(raw);
  return normalizeMediaUrl(canonical || raw);
};

export const resolveOriginalImageUrl = (url?: string | null): string => {
  const raw = String(url || "").trim();
  return String(inferOriginalImageUrl(raw) || raw).trim();
};

export const normalizeImageTitle = (raw?: string) => {
  const title = (raw || "").trim();
  return title || "";
};

export const getImageNodeTitle = (data: ImageNodeData, nodeId: string) => {
  return (
    normalizeImageTitle(data.title) ||
    normalizeImageTitle(data.prompt) ||
    `图片-${nodeId.slice(0, 6)}`
  );
};

export const sanitizeFileName = (name: string) => {
  const safe = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return safe || "image";
};

export const triggerBrowserDownload = (
  url: string,
  filename?: string,
  options?: { openInNewTab?: boolean }
) => {
  const link = document.createElement("a");
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  if (options?.openInNewTab) {
    link.target = "_blank";
  }
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const GENERIC_CANVAS_PROMPTS = new Set([
  "对话生成",
  "图片生成",
  "AI生成",
  "智能生成",
  "自动生成",
]);

export const normalizePromptText = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const resolveRegeneratePromptSeed = (data: ImageNodeData): string => {
  const metadataPrompt = normalizePromptText(data.metadata?.generationPrompt);
  if (metadataPrompt) return metadataPrompt;

  const nodePrompt = normalizePromptText(data.prompt);
  if (nodePrompt && !GENERIC_CANVAS_PROMPTS.has(nodePrompt)) {
    return nodePrompt;
  }

  return nodePrompt;
};

const COMMON_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

export function guessNearestAspectRatio(width: number, height: number): string {
  if (!width || !height) return "auto";
  const target = width / height;
  let best = "auto";
  let minDiff = Number.POSITIVE_INFINITY;

  for (const ratio of COMMON_ASPECT_RATIOS) {
    const [w, h] = ratio.split(":").map(Number);
    const value = w / h;
    const diff = Math.abs(target - value);
    if (diff < minDiff) {
      minDiff = diff;
      best = ratio;
    }
  }

  return best;
}
