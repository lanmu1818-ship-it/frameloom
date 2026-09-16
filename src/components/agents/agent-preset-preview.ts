// Modified for standalone community distribution; see NOTICE.
const PRESET_PREVIEW_MAX_WIDTH = 230;

const QINIU_IMAGE_PROCESS_PARAM = `imageView2/2/w/${PRESET_PREVIEW_MAX_WIDTH}/q/80/format/webp`;

function isLikelyImageUrl(url: URL) {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
}

function hasImageProcessParams(url: URL) {
  const search = url.search.toLowerCase();
  return search.includes("x-oss-process=") || search.includes("imageview2/");
}

function appendRawQuery(url: URL, rawQuery: string) {
  const separator = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${separator}${rawQuery}${url.hash}`;
}

export function getAgentPresetPreviewImageUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (!isLikelyImageUrl(url) || hasImageProcessParams(url)) {
      return trimmed;
    }

    if (host.includes("aliyuncs.com") || host.includes("oss-")) {
      const optimized = new URL(url.toString());
      optimized.searchParams.set("x-oss-process", `image/resize,w_${PRESET_PREVIEW_MAX_WIDTH}/quality,q_80/format,webp`);
      return optimized.toString();
    }

    if (host.includes("qiniu") || host.includes("clouddn") || host.includes("qiniucdn")) {
      return appendRawQuery(url, QINIU_IMAGE_PROCESS_PARAM);
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

export const AGENT_PRESET_PREVIEW_IMAGE_SIZES =
  `(max-width: 640px) 50vw, ${PRESET_PREVIEW_MAX_WIDTH}px`;
