// Modified for standalone community distribution; see NOTICE.
import { apiFetch } from "@/src/client/api";

type ClientSignOutOptions = {
  callbackUrl?: string;
  redirect?: boolean;
};

export async function clientSignOut(options: ClientSignOutOptions = {}) {
  const callbackUrl = options.callbackUrl || "/login";

  await apiFetch("/api/auth/logout", {
    method: "POST",
    cache: "no-store",
  });

  if (options.redirect !== false && typeof window !== "undefined") {
    window.location.replace(callbackUrl);
  }

  return { url: callbackUrl };
}
