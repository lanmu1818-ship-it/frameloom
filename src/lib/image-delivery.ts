// Modified for standalone community distribution; see NOTICE.
import { getPublicApiRuntimeConfig } from "@/src/runtime/public-api-config";

const IMAGE_PROXY_PATH = "/api/image-proxy";
const QINIU_IMAGE_HOST_SUFFIXES = [
  "qiniu.com",
  "qiniucdn.com",
  "qiniudn.com",
  "qiniuio.com",
  "qiniup.com",
  "qiniucs.com",
  "qbox.me",
  "clouddn.com",
  "qnssl.com",
];

type ImageProxyFormat = "webp" | "avif" | "jpeg" | "png";

export type ImageProxyOptions = {
  width?: number;
  quality?: number;
  format?: ImageProxyFormat;
  delivery?: "display" | "proxy";
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeWidth(width?: number): number | undefined {
  if (!Number.isFinite(width) || !width) return undefined;
  return clamp(Math.round(width), 64, 4096);
}

function normalizeQuality(quality?: number): number | undefined {
  if (!Number.isFinite(quality) || !quality) return undefined;
  return clamp(Math.round(quality), 40, 100);
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isImageProxyUrl(url: string): boolean {
  const source = String(url || "").trim();
  if (!source) {
    return false;
  }

  if (source.startsWith(IMAGE_PROXY_PATH)) {
    return true;
  }

  try {
    return new URL(source).pathname === IMAGE_PROXY_PATH;
  } catch {
    return false;
  }
}

function createPublicApiPath(path: string) {
  const { apiBaseUrl } = getPublicApiRuntimeConfig();
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function isBypassUrl(url: string): boolean {
  return (
    !url ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    isImageProxyUrl(url) ||
    !isAbsoluteHttpUrl(url)
  );
}

function isAliyunOssImageHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized.endsWith(".aliyuncs.com") && normalized.includes(".oss-");
}

function getPublicEnvValue(key: string): string {
  if (typeof process === "undefined") return "";
  return String(process.env?.[key] || "");
}

function normalizeHostPattern(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^\*\./, "");
  if (!trimmed) return "";

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname
      .trim()
      .toLowerCase()
      .replace(/^\*\./, "");
  } catch {
    return trimmed.split("/")[0].split(":")[0].replace(/^\*\./, "");
  }
}

function getTrustedQiniuImageHosts(): string[] {
  return getPublicEnvValue("NEXT_PUBLIC_QINIU_TRUSTED_IMAGE_HOSTS")
    .split(",")
    .map(normalizeHostPattern)
    .filter(Boolean);
}

function hostMatches(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}

function isQiniuImageHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    QINIU_IMAGE_HOST_SUFFIXES.some((suffix) => hostMatches(normalized, suffix)) ||
    getTrustedQiniuImageHosts().some((host) => hostMatches(normalized, host))
  );
}

function hasQiniuImageProcessParams(url: URL): boolean {
  const search = url.search.toLowerCase();
  return (
    search.includes("imageview2/") ||
    search.includes("imagemogr2/") ||
    search.includes("imageinfo") ||
    search.includes("watermark/")
  );
}

function appendRawQuery(url: URL, rawQuery: string) {
  const separator = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${separator}${rawQuery}${url.hash}`;
}

function hasDisplayTransformOptions(options: Pick<ImageProxyOptions, "width" | "quality" | "format">) {
  return Boolean(normalizeWidth(options.width) || normalizeQuality(options.quality) || options.format);
}

function resolveQiniuDisplayUrl(
  url: string,
  options: Pick<ImageProxyOptions, "width" | "quality" | "format">
): string | null {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }

  if (!isQiniuImageHost(target.hostname)) {
    return null;
  }

  if (hasQiniuImageProcessParams(target)) {
    return target.toString();
  }

  const width = normalizeWidth(options.width);
  const quality = normalizeQuality(options.quality);
  const format = options.format;

  if (!width && !quality && !format) {
    return target.toString();
  }

  const processSteps = ["imageView2", "2"];
  if (width) {
    processSteps.push("w", String(width));
  }
  if (quality) {
    processSteps.push("q", String(quality));
  }
  if (format) {
    const qiniuFormat = format === "jpeg" ? "jpg" : format;
    if (qiniuFormat !== "webp" && qiniuFormat !== "jpg" && qiniuFormat !== "png") {
      return null;
    }
    processSteps.push("format", qiniuFormat);
  }

  return appendRawQuery(target, processSteps.join("/"));
}

function resolveAliyunOssDisplayUrl(
  url: string,
  options: Pick<ImageProxyOptions, "width" | "quality" | "format">
): string | null {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }

  if (!isAliyunOssImageHost(target.hostname)) {
    return null;
  }

  if (target.searchParams.has("x-oss-process")) {
    return target.toString();
  }

  const width = normalizeWidth(options.width);
  const quality = normalizeQuality(options.quality);
  const format = options.format;

  if (!width && !quality && !format) {
    return target.toString();
  }

  const processSteps = ["image"];
  if (width) {
    processSteps.push(`resize,w_${width}`);
  }
  if (quality) {
    processSteps.push(`quality,q_${quality}`);
  }
  if (format) {
    const ossFormat = format === "jpeg" ? "jpg" : format;
    if (ossFormat !== "webp" && ossFormat !== "jpg" && ossFormat !== "png") {
      return null;
    }
    processSteps.push(`format,${ossFormat}`);
  }

  target.searchParams.set("x-oss-process", processSteps.join("/"));
  return target.toString();
}

export function buildImageProxyUrl(url: string, options: ImageProxyOptions = {}): string {
  const source = String(url || "").trim();
  if (isBypassUrl(source)) {
    return source;
  }

  const qiniuDisplayUrl = resolveQiniuDisplayUrl(source, options);
  if (
    qiniuDisplayUrl &&
    (options.delivery !== "proxy" || hasDisplayTransformOptions(options))
  ) {
    return qiniuDisplayUrl;
  }

  if (options.delivery !== "proxy") {
    const directDisplayUrl = resolveAliyunOssDisplayUrl(source, options);
    if (directDisplayUrl) return directDisplayUrl;
    return source;
  }

  const width = normalizeWidth(options.width);
  const quality = normalizeQuality(options.quality);
  const format = options.format;

  const params = new URLSearchParams();
  params.set("url", source);
  if (options.delivery === "proxy") params.set("proxy", "1");
  if (width) params.set("w", String(width));
  if (quality) params.set("q", String(quality));
  if (format) params.set("f", format);

  return createPublicApiPath(`${IMAGE_PROXY_PATH}?${params.toString()}`);
}
