// Modified for standalone community distribution; see NOTICE.
const BRAND_BASE_PATH = String(process.env.NEXT_PUBLIC_BASE_PATH || "")
  .trim()
  .replace(/\/+$/, "");

export const DEFAULT_SITE_NAME = "FrameLoom";
export const DEFAULT_SITE_LOGO = `${BRAND_BASE_PATH}/brand/lanbi-mark.svg`;
export const DEFAULT_SITE_FAVICON = `${BRAND_BASE_PATH}/brand/lanbi-mark.svg`;
export const LEGACY_DEFAULT_SITE_LOGO = "/brand/astra-mark.svg";

function normalizeBrandPath(value?: string | null) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  try {
    return new URL(input, "https://local.invalid").pathname;
  } catch {
    return input;
  }
}

export function isDefaultSiteLogo(value?: string | null) {
  const path = normalizeBrandPath(value);
  return path === DEFAULT_SITE_LOGO || path === LEGACY_DEFAULT_SITE_LOGO;
}

export function shouldInvertDefaultLogoForTheme(
  value?: string | null,
  theme?: string | null
) {
  // The existing white canvas mark can still be returned by site settings
  // after the default brand changes. Keep its theme treatment independent
  // of default-logo replacement so it retains its original shape.
  const path = normalizeBrandPath(value);
  const isWhiteCanvasMark =
    path === "/brand/yedier-mark.svg" ||
    path === `${BRAND_BASE_PATH}/brand/yedier-mark.svg`;
  return (isWhiteCanvasMark || isDefaultSiteLogo(value)) && theme !== "dark";
}

export function resolveDefaultSiteName(value?: string | null) {
  const name = String(value || "").trim();
  return name && !["FrameLoom", "Astra Canvas", "蓝笔AI画布", "Yedir"].includes(name) ? name : DEFAULT_SITE_NAME;
}

export function resolveDefaultSiteLogo(value?: string | null) {
  const logo = String(value || "").trim();
  return !logo || isDefaultSiteLogo(logo) ? DEFAULT_SITE_LOGO : logo;
}
