// Modified for standalone community distribution; see NOTICE.
import type { Attachment, ChatMessage } from "@/src/lib/types";

export const SESSION_TITLE_MAX_LEN = 18;
export const MAX_CHAT_TEXT_PART_LENGTH = 2000;
export const MAX_CHAT_HIDDEN_PROMPT_LENGTH = 4000;
export const MAX_CHAT_AUTO_CONTEXT_LENGTH = 4000;
export const MAX_CHAT_ATTACHMENT_NAME_LENGTH = 100;

const CHAT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_CHAT_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
  "image/bmp",
  "image/svg+xml",
]);

const GENERIC_CANVAS_PROMPT_SET = new Set([
  "对话生成",
  "图片生成",
  "AI生成",
  "智能生成",
  "自动生成",
]);

export interface PickedObjectAttachment extends Attachment {
  width?: number;
  height?: number;
  pickedObject?: {
    objectName: string;
    objectPosition: string;
    clickX: number;
    clickY: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  };
}

export function toRawCanvasChatId(value: string): string {
  return value.startsWith("canvas-") ? value.replace("canvas-", "") : value;
}

export function isValidChatUuid(value?: string | null): value is string {
  return Boolean(value && CHAT_UUID_REGEX.test(String(value).trim()));
}

export function isValidChatHttpUrl(value?: string | null): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function clampChatRequestText(
  value?: string | null,
  maxLength = MAX_CHAT_TEXT_PART_LENGTH
): string {
  return String(value || "").slice(0, maxLength);
}

export function normalizeChatAttachmentName(value?: string | null): string {
  const normalized = String(value || "").trim() || "参考图";
  return normalized.slice(0, MAX_CHAT_ATTACHMENT_NAME_LENGTH);
}

export function normalizeChatMediaType(value?: string | null): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "image/pjpeg") return "image/jpeg";
  if (normalized === "image/x-png") return "image/png";
  if (ALLOWED_CHAT_MEDIA_TYPES.has(normalized)) {
    return normalized;
  }
  return "image/jpeg";
}

export function sanitizeChatAttachment(
  attachment?: PickedObjectAttachment | null
): PickedObjectAttachment | null {
  if (!attachment || !isValidChatHttpUrl(attachment.url)) {
    return null;
  }

  return {
    ...attachment,
    url: attachment.url,
    name: normalizeChatAttachmentName(attachment.name),
    contentType: normalizeChatMediaType(attachment.contentType),
    assetId: isValidChatUuid(attachment.assetId) ? attachment.assetId : undefined,
    width:
      Number.isFinite(attachment.width) && Number(attachment.width) > 0
        ? Math.round(Number(attachment.width))
        : undefined,
    height:
      Number.isFinite(attachment.height) && Number(attachment.height) > 0
        ? Math.round(Number(attachment.height))
        : undefined,
  };
}

export function getSessionStorageKey(canvasId: string, scope: "canvas" | "agent"): string {
  return `canvas-chat-sessions:${scope}:${canvasId}`;
}

export function getSessionRootStorageKey(canvasId: string, scope: "canvas" | "agent"): string {
  return `canvas-chat-root:${scope}:${canvasId}`;
}

export function extractUserTextPrompt(message: ChatMessage): string {
  const parts = (message as any)?.parts || [];
  const textFromParts = parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) =>
      part.text
        .replace(
          /【注意：图片中有标注（箭头、圆圈、文字等）标记的区域是需要重点关注或修改的部分，请根据标注进行处理】\n?/g,
          ""
        )
        .trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();

  if (textFromParts) return textFromParts;

  const content = (message as any)?.content;
  return typeof content === "string" ? content.trim() : "";
}

export function findNearestUserPrompt(messages: ChatMessage[], assistantIndex: number): string {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (candidate?.role !== "user") continue;
    const prompt = extractUserTextPrompt(candidate);
    if (prompt) return prompt;
  }
  return "";
}

export function isGenericCanvasPrompt(prompt: unknown): boolean {
  if (typeof prompt !== "string") return true;
  const normalized = prompt.trim();
  if (!normalized) return true;
  return GENERIC_CANVAS_PROMPT_SET.has(normalized);
}

export function deriveSessionTitleFromMessages(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "";

  const prompt = extractUserTextPrompt(firstUserMessage).replace(/\s+/g, " ").trim();
  if (!prompt) return "";
  return prompt.length > SESSION_TITLE_MAX_LEN
    ? `${prompt.slice(0, SESSION_TITLE_MAX_LEN)}...`
    : prompt;
}
