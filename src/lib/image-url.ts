// Modified for standalone community distribution; see NOTICE.
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gim;
const PLAIN_IMAGE_URL_REGEX =
  /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s"'<>]*)?/gi;
const IMAGE_PROXY_PATH = "/api/image-proxy";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function extractImageProxySourceUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, "https://image-proxy.local");
    if (parsed.pathname !== IMAGE_PROXY_PATH) return "";
    const source = parsed.searchParams.get("url") || "";
    return isHttpUrl(source) ? source : "";
  } catch {
    return "";
  }
}

function stripAliyunImageProcess(url: string): string {
  if (!isHttpUrl(url)) return url;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname.endsWith(".aliyuncs.com") &&
      hostname.includes(".oss-") &&
      parsed.searchParams.has("x-oss-process")
    ) {
      parsed.searchParams.delete("x-oss-process");
      return parsed.toString();
    }
  } catch {
    // keep the original URL
  }

  return url;
}

export function isLikelyThumbnailUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes("/thumb/") ||
    lowerUrl.includes("thumbnail") ||
    lowerUrl.includes("gemini-thumb-") ||
    lowerUrl.includes("openai-thumb-") ||
    lowerUrl.includes("volcano-thumb-") ||
    lowerUrl.includes("alibaba-image-thumb-") ||
    lowerUrl.includes("ruxa-image-thumb-") ||
    lowerUrl.includes("stepfun-image-thumb-") ||
    lowerUrl.includes("fal-image-thumb-")
  ) {
    return true;
  }

  return /(?:^|[-_/])thumb(?:[-_.\\/]|$)/i.test(url);
}

export function inferOriginalImageUrl(url: string): string {
  if (!isHttpUrl(url)) return url;

  const proxySourceUrl = extractImageProxySourceUrl(url);
  if (proxySourceUrl) {
    return inferOriginalImageUrl(proxySourceUrl);
  }

  const unprocessedUrl = stripAliyunImageProcess(url);
  if (unprocessedUrl !== url) return unprocessedUrl;

  if (url.includes("gemini-thumb-")) {
    return url.replace("gemini-thumb-", "gemini-orig-");
  }
  if (url.includes("openai-thumb-")) {
    return url.replace("openai-thumb-", "openai-orig-");
  }
  if (url.includes("volcano-thumb-")) {
    return url.replace("volcano-thumb-", "volcano-orig-");
  }
  if (url.includes("alibaba-image-thumb-")) {
    return url.replace("alibaba-image-thumb-", "alibaba-image-orig-");
  }
  if (url.includes("ruxa-image-thumb-")) {
    return url.replace("ruxa-image-thumb-", "ruxa-image-orig-");
  }
  if (url.includes("stepfun-image-thumb-")) {
    return url.replace("stepfun-image-thumb-", "stepfun-image-orig-");
  }
  if (url.includes("fal-image-thumb-")) {
    return url.replace("fal-image-thumb-", "fal-image-orig-");
  }

  if (url.includes("/thumb/")) {
    return url.replace("/thumb/", "/");
  }

  if (url.includes("-thumb.")) {
    return url.replace("-thumb.", ".");
  }

  return url;
}

export function extractOriginalImageUrlFromAlt(altText: string, fallbackUrl: string): string {
  let originalUrl = fallbackUrl;

  if (altText.includes("thumb|||")) {
    const content = altText.substring(altText.indexOf("thumb|||") + 8);
    const parts = content.split("|||");
    if (parts[0] && isHttpUrl(parts[0])) {
      originalUrl = parts[0];
    }
  } else if (altText.includes("thumb$$")) {
    const content = altText.substring(altText.indexOf("thumb$$") + 7);
    const parts = content.split("$$");
    if (parts[0] && isHttpUrl(parts[0])) {
      originalUrl = parts[0];
    }
  } else if (altText.includes("thumb|")) {
    const content = altText.substring(altText.indexOf("thumb|") + 6);
    const parts = content.split("|");
    if (parts[0] && isHttpUrl(parts[0])) {
      originalUrl = parts[0];
    }
  }

  if (originalUrl === fallbackUrl || !isHttpUrl(originalUrl)) {
    originalUrl = inferOriginalImageUrl(fallbackUrl);
  }

  return originalUrl;
}

export function extractImageUrlsFromText(text: string): string[] {
  if (!text) return [];

  const urls: string[] = [];
  const added = new Set<string>();

  const addUrl = (url: string) => {
    if (!url || !isHttpUrl(url) || added.has(url)) return;
    added.add(url);
    urls.push(url);
  };

  let hasMarkdownImages = false;
  let markdownMatch: RegExpExecArray | null;
  MARKDOWN_IMAGE_REGEX.lastIndex = 0;

  while ((markdownMatch = MARKDOWN_IMAGE_REGEX.exec(text)) !== null) {
    hasMarkdownImages = true;
    const altText = markdownMatch[1] || "";
    const thumbnailUrl = markdownMatch[2] || "";
    const originalUrl = extractOriginalImageUrlFromAlt(altText, thumbnailUrl);
    addUrl(originalUrl || thumbnailUrl);
  }

  if (hasMarkdownImages) return urls;

  const rawUrls = text.match(PLAIN_IMAGE_URL_REGEX) || [];
  if (!rawUrls.length) return urls;

  const nonThumbnailUrls = rawUrls.filter((url) => !isLikelyThumbnailUrl(url));
  const candidates = nonThumbnailUrls.length
    ? nonThumbnailUrls
    : rawUrls.map((url) => inferOriginalImageUrl(url));

  for (const url of candidates) {
    addUrl(url);
  }

  return urls;
}
