// Modified for standalone community distribution; see NOTICE.
"use client";

import { getPublicApiRuntimeConfig } from "@/src/runtime/public-api-config";
import { apiFetch } from "@/src/client/api";

const DEFAULT_API_SYSTEM_URL =
  "https://api.example.com/api/v1/auth/oauth/oidc/start";

declare global {
  interface Window {
    __YEDIR_DESKTOP_RENDERER__?: {
      name: string;
      version: string;
    };
  }
}

function isDesktopRenderer() {
  return (
    typeof window !== "undefined" &&
    window.__YEDIR_DESKTOP_RENDERER__?.name ===
      "astra-canvas-desktop-renderer"
  );
}

function normalizeApiSystemUrl(value?: string | null) {
  try {
    const url = new URL(String(value || DEFAULT_API_SYSTEM_URL));
    if (
      url.protocol === "https:" &&
      url.hostname === "api.example.com" &&
      url.pathname === "/api/v1/auth/oauth/oidc/start"
    ) {
      return url.toString();
    }
  } catch {
    // Use the exact production OIDC entry below.
  }
  return DEFAULT_API_SYSTEM_URL;
}

export async function openApiSystemFromCurrentSession(
  fallbackUrl?: string | null
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isDesktopRenderer()) {
    window.open(
      normalizeApiSystemUrl(fallbackUrl),
      "_blank",
      "noopener,noreferrer"
    );
    return;
  }

  const response = await apiFetch("/api/desktop-auth/api-system-launch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    launchUrl?: string;
    error?: string;
  } | null;

  if (!response.ok || payload?.success !== true || !payload.launchUrl) {
    throw new Error(
      payload?.error === "desktop_session_required"
        ? "桌面登录已失效，请重新登录后再试"
        : "暂时无法进入 API 官网，请稍后重试"
    );
  }

  const launchUrl = new URL(payload.launchUrl);
  if (
    launchUrl.protocol !== "https:" ||
    launchUrl.origin !== new URL(getPublicApiRuntimeConfig().apiBaseUrl || "https://backend.example.com").origin ||
    launchUrl.pathname !== "/api/sso/oidc/desktop-launch"
  ) {
    throw new Error("API 官网入口校验失败");
  }

  // Electron intercepts this exact path and opens it in the external browser.
  // Assigning the URL avoids browser popup blocking after the async code issue.
  window.location.assign(launchUrl.toString());
}
