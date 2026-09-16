// Modified for standalone community distribution; see NOTICE.
import {
  extractImageUrlsFromText,
  extractOriginalImageUrlFromAlt,
  inferOriginalImageUrl,
} from "@/src/lib/image-url";
import type { ChatMessage } from "@/src/lib/types";

export function extractImageUrls(text: string): string[] {
  if (!text) return [];
  return extractImageUrlsFromText(text);
}

function extractPlainImageUrls(text: string): string[] {
  if (!text) return [];
  const urls = new Set<string>();
  const pattern = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif|bmp|svg)(?:\?[^\s"'<>]+)?)/gi;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1]) urls.add(match[1]);
  }
  return Array.from(urls);
}

export function normalizeMediaUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return raw
      .split("#")[0]
      .split("?")[0]
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

export function normalizeImageIdentityUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const canonical = inferOriginalImageUrl(raw);
  return normalizeMediaUrl(canonical || raw);
}

export function buildDownloadFilename(url: string): string {
  const fallback = `canvas-image-${Date.now()}.png`;
  const raw = String(url || "").trim();
  if (!raw) return fallback;

  try {
    const pathname = new URL(raw).pathname || "";
    const candidate = pathname.split("/").pop() || "";
    if (candidate) return candidate;
  } catch {
    const candidate = raw.split("/").pop()?.split("?")[0] || "";
    if (candidate) return candidate;
  }

  return fallback;
}

export function triggerBrowserDownload(
  url: string,
  filename?: string,
  options?: { openInNewTab?: boolean }
) {
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
}

export function getAssistantImageNodeIdentityKey(node: any): string {
  if (!node || node.type !== "image") return "";
  const data = ((node.data as any) || {}) as Record<string, any>;
  const metadata = ((data.metadata as any) || {}) as Record<string, any>;
  const sourceMessageId = String(metadata.sourceMessageId || "").trim();
  if (!sourceMessageId) return "";
  const sourceImageKey = normalizeImageIdentityUrl(
    String(metadata.sourceImageKey || data.src || "").trim()
  );
  if (!sourceImageKey) return "";
  return `${sourceMessageId}::${sourceImageKey}`;
}

export function collectMessageImageUrlKeys(message: ChatMessage | undefined): Set<string> {
  const urlKeys = new Set<string>();
  if (!message) return urlKeys;

  const pushUrl = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return;
    const normalized = normalizeMediaUrl(raw);
    if (!normalized) return;
    urlKeys.add(normalized);
  };

  const parts = (message as any).parts || [];
  for (const part of parts) {
    if (!part) continue;
    if (
      (part.type === "file" || part.type === "image" || part.type === "input_image") &&
      (typeof part.url === "string" || typeof part.data === "string")
    ) {
      pushUrl(typeof part.url === "string" ? part.url : part.data);
    }

    if (part.type === "text" && typeof part.text === "string") {
      extractImageUrls(part.text).forEach((url) => pushUrl(url));
      extractPlainImageUrls(part.text).forEach((url) => pushUrl(url));
    }
  }

  const attachments = (message as any).attachments || [];
  for (const attachment of attachments) {
    pushUrl(attachment?.url);
  }

  return urlKeys;
}

export function collectMessageImageUrls(message: ChatMessage | undefined): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  if (!message) return urls;

  const pushUrl = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return;
    const normalized = normalizeMediaUrl(raw);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(raw);
  };

  const parts = (message as any).parts || [];
  for (const part of parts) {
    if (!part) continue;
    if (
      (part.type === "file" || part.type === "image" || part.type === "input_image") &&
      (typeof part.url === "string" || typeof part.data === "string")
    ) {
      const direct = typeof part.url === "string" ? part.url : part.data;
      pushUrl(inferOriginalImageUrl(String(direct || "").trim()));
    }

    if (part.type === "text" && typeof part.text === "string") {
      extractImageUrls(part.text).forEach((url) => pushUrl(url));
      extractPlainImageUrls(part.text).forEach((url) => pushUrl(url));
    }
  }

  const attachments = (message as any).attachments || [];
  for (const attachment of attachments) {
    pushUrl(inferOriginalImageUrl(String(attachment?.url || "").trim()));
  }

  const legacyContent =
    typeof (message as any).content === "string" ? (message as any).content : "";
  if (legacyContent) {
    extractImageUrls(legacyContent).forEach((url) => pushUrl(url));
    extractPlainImageUrls(legacyContent).forEach((url) => pushUrl(url));
  }

  return urls;
}

export function getNearestUserImageUrlKeys(
  messages: ChatMessage[],
  assistantIndex: number
): Set<string> {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return collectMessageImageUrlKeys(message);
  }
  return new Set<string>();
}

export function getNearestUserImageUrls(
  messages: ChatMessage[],
  assistantIndex: number
): string[] {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    return collectMessageImageUrls(message);
  }
  return [];
}

export function extractAssistantImageUrls(
  text: string,
  referenceUrlKeys?: Set<string>
): string[] {
  const markdownPattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gim;
  const markdownUrls: string[] = [];
  const seenMarkdownUrls = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = markdownPattern.exec(text)) !== null) {
    const altText = String(match[1] || "");
    const markdownSrc = String(match[2] || "").trim();
    if (!markdownSrc) continue;

    const originalFromAlt = extractOriginalImageUrlFromAlt(altText, markdownSrc);
    const candidates = [originalFromAlt, inferOriginalImageUrl(markdownSrc), markdownSrc];
    let selected = "";

    for (const candidate of candidates) {
      const normalized = normalizeMediaUrl(candidate);
      if (!normalized) continue;
      if (referenceUrlKeys?.size && referenceUrlKeys.has(normalized)) continue;
      selected = candidate;
      break;
    }

    if (!selected && !referenceUrlKeys?.size) {
      selected = candidates.find((candidate) => normalizeMediaUrl(candidate)) || "";
    }
    if (!selected) continue;

    const dedupeKey = normalizeMediaUrl(selected);
    if (!dedupeKey || seenMarkdownUrls.has(dedupeKey)) continue;
    seenMarkdownUrls.add(dedupeKey);
    markdownUrls.push(selected);
  }

  if (markdownUrls.length > 0) {
    return markdownUrls;
  }

  const urls = extractImageUrls(text);
  if (!referenceUrlKeys || referenceUrlKeys.size === 0) return urls;

  return urls.filter((url) => {
    const normalized = normalizeMediaUrl(url);
    if (!normalized) return false;
    return !referenceUrlKeys.has(normalized);
  });
}

export function extractVideoUrls(text: string): string[] {
  if (!text) return [];
  const urls = new Set<string>();

  const videoTagPattern = /<video[^>]+src="([^"]+)"/gi;
  let match: RegExpExecArray | null = null;
  while ((match = videoTagPattern.exec(text)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  const markdownVideoPattern = /\[[^\]]*]\((https?:\/\/[^)\s]+\.mp4(?:\?[^)\s]*)?)\)/gi;
  while ((match = markdownVideoPattern.exec(text)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  const plainVideoPattern = /(https?:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]+)?)/gi;
  while ((match = plainVideoPattern.exec(text)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  return Array.from(urls);
}

export function stripMediaMarkup(text: string): string {
  return String(text || "")
    .replace(/!\[(?:thumb)?\|\|\|[^|]+\|\|\|[^\]]*\]\([^)]+\)/g, "")
    .replace(/<video[\s\S]*?<\/video>/gi, "")
    .replace(/<a[\s\S]*?<\/a>/gi, "")
    .replace(/\[[^\]]*]\((https?:\/\/[^)\s]+\.mp4(?:\?[^)\s]*)?)\)/gi, "")
    .replace(/https?:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]+)?/gi, "")
    .trim();
}

export function extractCanvasModelName(text: string): string {
  const source = String(text || "");
  if (!source) return "";

  const badgeMatch = source.match(/^\s*[◈◇◆🔹⬡✦•·]\s*([^\n]+?)\s*$/im);
  if (badgeMatch?.[1]) {
    return badgeMatch[1].trim();
  }

  const routedMatch = source.match(
    /^\s*(?:Routed to|Using model)\s*[:：]\s*([^\n(]+).*$/im
  );
  if (routedMatch?.[1]) {
    return routedMatch[1].trim();
  }

  return "";
}

export function stripCanvasModelRoutingLines(text: string): string {
  return String(text || "")
    .replace(/^\s*(?:Routed to|Using model)\s*[:：].*$/gim, "")
    .replace(/^\s*[◈◇◆🔹⬡✦•·]\s*[^\n]+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function messageHasAssistantMedia(
  message: ChatMessage | undefined,
  referenceUrlKeys?: Set<string>
): boolean {
  if (!message || message.role !== "assistant") return false;
  const textParts = (message.parts || []).filter(
    (part: any) => part.type === "text" && part.text
  );
  return textParts.some((part: any) => {
    const text = String(part.text || "");
    return (
      extractAssistantImageUrls(text, referenceUrlKeys).length > 0 ||
      extractVideoUrls(text).length > 0
    );
  });
}

export function getMessageTimestamp(message: ChatMessage): number | null {
  const metadata =
    (message as any).metadata && typeof (message as any).metadata === "object"
      ? ((message as any).metadata as Record<string, unknown>)
      : null;
  const rawValue =
    (message as any).createdAt ??
    (message as any).created_at ??
    (message as any).timestamp ??
    metadata?.createdAt ??
    metadata?.created_at ??
    metadata?.timestamp ??
    null;

  if (rawValue instanceof Date) {
    return rawValue.getTime();
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const parsed = Date.parse(rawValue);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function getMessageDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMessageDateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function sortCanvasMessagesByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const messageA = a.message;
      const messageB = b.message;
      const timeA = getMessageTimestamp(messageA);
      const timeB = getMessageTimestamp(messageB);
      const hasTimeA = timeA !== null;
      const hasTimeB = timeB !== null;

      if (hasTimeA && hasTimeB && timeA !== timeB) return timeA - timeB;
      if (hasTimeA !== hasTimeB) return hasTimeA ? -1 : 1;

      if (hasTimeA && hasTimeB && messageA.role !== messageB.role) {
        if (messageA.role === "user") return -1;
        if (messageB.role === "user") return 1;
      }

      return a.index - b.index;
    })
    .map((item) => item.message);
}

export function buildCanvasMessageFingerprint(message: ChatMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const partFingerprint = parts
    .slice(0, 8)
    .map((part: any) => {
      if (!part) return "part:null";
      if (part.type === "text") {
        const text = String(part.text || "").trim();
        return `text:${text.length}:${text.slice(0, 80)}`;
      }

      const url =
        typeof part.url === "string" && part.url.trim()
          ? part.url.trim()
          : typeof part.data === "string" && part.data.trim()
            ? part.data.trim()
            : "";
      return `${String(part.type || "part")}:${String(
        part.mediaType || part.mimeType || part.contentType || ""
      )}:${url.slice(0, 120)}`;
    })
    .join("|");
  const attachmentFingerprint = (((message as any).attachments || []) as any[])
    .slice(0, 6)
    .map((attachment) => {
      const url = String(attachment?.url || "").trim();
      return `${String(attachment?.contentType || "")}:${url.slice(0, 120)}`;
    })
    .join("|");

  return [
    message.id,
    message.role,
    String(getMessageTimestamp(message) ?? 0),
    partFingerprint,
    attachmentFingerprint,
  ].join("::");
}

export function buildCanvasHistoryMessagesSignature(
  rawChatId: string,
  messages: ChatMessage[]
): string {
  const recentFingerprint = messages
    .slice(-12)
    .map((message) => buildCanvasMessageFingerprint(message))
    .join("||");
  return `${rawChatId}:${messages.length}:${recentFingerprint}`;
}

export function hasCanvasImageMarkdown(parts?: Array<any>) {
  if (!parts || parts.length === 0) return false;
  return parts.some((part) => {
    if (!part) return false;

    if (
      part?.type === "text" &&
      typeof part.text === "string" &&
      (part.text.includes("![thumb|") ||
        part.text.includes("![thumb|||") ||
        part.text.includes("![Generated Image"))
    ) {
      return true;
    }

    if (part?.type === "image" && typeof part.url === "string" && part.url.length > 0) {
      return true;
    }

    if (
      part?.type === "file" &&
      typeof part.url === "string" &&
      ((typeof part.mediaType === "string" && part.mediaType.startsWith("image/")) ||
        /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(part.url))
    ) {
      return true;
    }

    return false;
  });
}

export function hasCanvasLikelyGenerationErrorMessage(message?: ChatMessage | null) {
  if (!message?.parts || message.parts.length === 0) return false;
  const text = message.parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
  if (!text) return false;
  return /失败|超时|重试|error|failed/i.test(text);
}

export function getCanvasAssistantMessagesAfterTargetUser(
  dbMessages: ChatMessage[],
  targetUserMessageId?: string | null
) {
  if (!Array.isArray(dbMessages) || dbMessages.length === 0) {
    return [] as ChatMessage[];
  }

  let targetUserIndex = -1;
  if (targetUserMessageId) {
    targetUserIndex = dbMessages.findIndex(
      (message) => message.role === "user" && message.id === targetUserMessageId
    );
    if (targetUserIndex < 0) {
      return [] as ChatMessage[];
    }
  }

  if (targetUserIndex < 0) {
    targetUserIndex = dbMessages.findLastIndex((message) => message.role === "user");
  }

  if (targetUserIndex < 0) {
    return dbMessages.filter((message) => message.role === "assistant");
  }

  return dbMessages
    .slice(targetUserIndex + 1)
    .filter((message) => message.role === "assistant");
}

function hasMessageMediaParts(message: ChatMessage) {
  return Array.isArray(message.parts)
    ? message.parts.some((part: any) =>
        ["file", "image", "image_url"].includes(String(part?.type || ""))
      )
    : false;
}

function recoverMessageMedia(
  persistedMessage: ChatMessage,
  visibleMessage?: ChatMessage
) {
  if (!visibleMessage || persistedMessage.role !== "user") {
    return persistedMessage;
  }

  const persistedAttachments = Array.isArray(
    (persistedMessage as any).attachments
  )
    ? (persistedMessage as any).attachments
    : [];
  const visibleAttachments = Array.isArray((visibleMessage as any).attachments)
    ? (visibleMessage as any).attachments
    : [];
  const shouldRecoverParts =
    !hasMessageMediaParts(persistedMessage) &&
    hasMessageMediaParts(visibleMessage);

  if (persistedAttachments.length > 0 && !shouldRecoverParts) {
    return persistedMessage;
  }

  return {
    ...persistedMessage,
    parts: shouldRecoverParts
      ? visibleMessage.parts
      : persistedMessage.parts,
    attachments:
      persistedAttachments.length > 0
        ? persistedAttachments
        : visibleAttachments,
  } as ChatMessage;
}

export function reconcileCanvasMessagesWithHistory({
  visibleMessages,
  historyMessages,
  preserveMessageIds,
}: {
  visibleMessages: ChatMessage[];
  historyMessages: ChatMessage[];
  preserveMessageIds?: ReadonlySet<string>;
}) {
  const visibleById = new Map(
    visibleMessages.map((message) => [message.id, message])
  );
  const historyIds = new Set(historyMessages.map((message) => message.id));
  const reconciled = historyMessages.map((message) =>
    recoverMessageMedia(message, visibleById.get(message.id))
  );

  if (preserveMessageIds?.size) {
    for (const message of visibleMessages) {
      if (
        preserveMessageIds.has(message.id) &&
        !historyIds.has(message.id)
      ) {
        reconciled.push(message);
      }
    }
  }

  return sortCanvasMessagesByCreatedAt(reconciled);
}
