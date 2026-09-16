// Modified for standalone community distribution; see NOTICE.
import { Clerk } from "@clerk/clerk-js";
import { apiFetch, createApiHref } from "@/src/client/api";

export type DesktopSocialProvider = "google" | "apple";
export type DesktopRegisterMode = "personal" | "create_team" | "join_team";

export type DesktopClerkAuthConfig = {
  isConfigured?: boolean;
  publishableKey?: string;
};

export type DesktopSocialOAuthContext = {
  provider: DesktopSocialProvider;
};

export type DesktopSocialRegistrationInput = {
  email?: string;
  inviteCode: string;
  registrationMode: DesktopRegisterMode;
  teamName: string;
};

export type DesktopSocialBridgeResult =
  | {
      ok: true;
      status: "authenticated" | "verification_pending";
    }
  | {
      ok: false;
      status:
        | "auth_settings_unavailable"
        | "captcha_invalid"
        | "captcha_required"
        | "captcha_unavailable"
        | "clerk_not_configured"
        | "email_address_exists"
        | "email_not_verified"
        | "form_identifier_exists"
        | "invalid_clerk_token"
        | "invalid_data"
        | "invite_code_invalid"
        | "invite_code_required"
        | "missing_bearer_token"
        | "missing_clerk_session_token"
        | "missing_clerk_user"
        | "missing_primary_email"
        | "oauth_callback_failed"
        | "oauth_start_failed"
        | "password_policy_failed"
        | "password_too_short"
        | "rate_limited"
        | "session_bridge_failed"
        | "team_key_invalid"
        | "team_key_required"
        | "team_name_required"
        | "user_exists"
        | "user_not_allowed"
        | "verification_code_invalid"
        | "unknown";
      clerkToken?: string;
      provider?: DesktopSocialProvider;
    };

type DesktopSocialBridgeFailureStatus = Extract<
  DesktopSocialBridgeResult,
  { ok: false }
>["status"];

const DESKTOP_OAUTH_CONTEXT_KEY = "astra.desktop.clerkOAuthContext";
const DESKTOP_OAUTH_COMPLETE_PARAM = "desktop_oauth_complete";
const DESKTOP_LOGIN_TOKEN_PARAM = "desktop_login_token";
const DESKTOP_AUTH_ERROR_PARAM = "desktop_auth_error";
const DESKTOP_OAUTH_DEEP_LINK_SCHEME = "astra-canvas";
const DESKTOP_OAUTH_CALLBACK_PATH = "oauth-callback";
const DESKTOP_OAUTH_COMPLETE_PATH = "oauth-complete";
const DESKTOP_OAUTH_CALLBACK_PARAMS = new Set([
  "__clerk_status",
  "__clerk_created_session",
  "__clerk_invitation_token",
  "__clerk_ticket",
  "__clerk_modal_state",
  "__clerk_handshake",
  "__clerk_handshake_nonce",
  "__clerk_help",
  "__clerk_synced",
  "__clerk_satellite_url",
  "__clerk_db_jwt",
  "__clerk_transfer",
  "__clerk_netlify_cache_bust",
]);

let clerkClientPromise: Promise<Clerk> | null = null;
let clerkClientKey = "";

export function hasPendingDesktopClerkRedirect() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return (
    params.get(DESKTOP_OAUTH_COMPLETE_PARAM) === "1" ||
    params.has(DESKTOP_LOGIN_TOKEN_PARAM) ||
    params.has(DESKTOP_AUTH_ERROR_PARAM) ||
    Array.from(DESKTOP_OAUTH_CALLBACK_PARAMS).some((key) => params.has(key))
  );
}

export async function startDesktopClerkOAuth(params: {
  clerk: DesktopClerkAuthConfig | null | undefined;
  provider: DesktopSocialProvider;
}): Promise<DesktopSocialBridgeResult> {
  if (!isClerkConfigUsable(params.clerk)) {
    return { ok: false, status: "clerk_not_configured" };
  }

  try {
    writeSocialOAuthContext({ provider: params.provider });
    window.open(buildDesktopBrowserOAuthUrl(params.provider), "_blank", "noopener");
    return { ok: true, status: "authenticated" };
  } catch (error) {
    console.error("[Desktop Clerk OAuth] Failed to open browser OAuth:", error);
  }

  try {
    const clerk = await getDesktopClerkClient(params.clerk.publishableKey);
    writeSocialOAuthContext({ provider: params.provider });

    const redirectCallbackUrl = buildDesktopOAuthDeepLink(
      DESKTOP_OAUTH_CALLBACK_PATH
    );
    const redirectUrl = buildDesktopOAuthDeepLink(DESKTOP_OAUTH_COMPLETE_PATH, {
      [DESKTOP_OAUTH_COMPLETE_PARAM]: "1",
    });
    const strategy = getClerkOAuthStrategy(params.provider);

    clerk.client?.resetSignIn?.();
    clerk.client?.resetSignUp?.();
    const signIn = clerk.client?.signIn;
    if (!signIn) {
      return { ok: false, status: "clerk_not_configured" };
    }

    const futureSignIn = (signIn as any).__internal_future;
    if (typeof futureSignIn?.sso === "function") {
      const result = await futureSignIn.sso({
        redirectCallbackUrl,
        redirectUrl,
        strategy,
      });
      if (result?.error) {
        console.error(
          "[Desktop Clerk OAuth] Failed to prepare OAuth:",
          result.error
        );
        return { ok: false, status: "oauth_start_failed" };
      }
    } else {
      await signIn.authenticateWithRedirect({
        redirectUrl: redirectCallbackUrl,
        redirectUrlComplete: redirectUrl,
        strategy,
      } as any);
    }

    return { ok: true, status: "authenticated" };
  } catch (error) {
    console.error("[Desktop Clerk OAuth] Failed to start OAuth:", error);
    return { ok: false, status: "oauth_start_failed" };
  }
}

export function startDesktopBrowserRegistration(params: {
  email: string;
  inviteCode: string;
  registrationMode: DesktopRegisterMode;
  teamName: string;
}): DesktopSocialBridgeResult {
  try {
    window.open(buildDesktopBrowserRegistrationUrl(params), "_blank", "noopener");
    return { ok: true, status: "verification_pending" };
  } catch (error) {
    console.error(
      "[Desktop Clerk Register] Failed to open browser registration:",
      error
    );
    return { ok: false, status: "oauth_start_failed" };
  }
}

export async function completeDesktopClerkOAuth(params: {
  clerk: DesktopClerkAuthConfig | null | undefined;
}): Promise<DesktopSocialBridgeResult> {
  if (!isClerkConfigUsable(params.clerk)) {
    return { ok: false, status: "clerk_not_configured" };
  }

  try {
    const clerk = await getDesktopClerkClient(params.clerk.publishableKey);
    const desktopAuthError = getDesktopAuthError();
    if (desktopAuthError) {
      clearDesktopOAuthUrl();
      return { ok: false, status: normalizeSocialBridgeStatus(desktopAuthError) };
    }

    const desktopLoginToken = getDesktopLoginToken();
    if (desktopLoginToken) {
      const loginTokenBridge = await bridgeDesktopLoginToken(desktopLoginToken);
      clearDesktopOAuthUrl();
      clearSocialOAuthContext();
      return loginTokenBridge;
    }

    const isOAuthCallback = hasDesktopClerkCallbackParams();

    if (isOAuthCallback) {
      const redirectUrlComplete = buildDesktopOAuthDeepLink(DESKTOP_OAUTH_COMPLETE_PATH, {
        [DESKTOP_OAUTH_COMPLETE_PARAM]: "1",
      });
      await clerk.handleRedirectCallback(
        {
          signInFallbackRedirectUrl: redirectUrlComplete,
          signInForceRedirectUrl: redirectUrlComplete,
          signUpFallbackRedirectUrl: redirectUrlComplete,
          signUpForceRedirectUrl: redirectUrlComplete,
        } as any,
        async (to) => {
          window.location.replace(normalizeDesktopOAuthNavigationTarget(to));
        }
      );
      return { ok: true, status: "authenticated" };
    }

    const token = await clerk.session?.getToken().catch(() => null);
    if (!token) {
      return { ok: false, status: "missing_clerk_session_token" };
    }

    const sessionBridge = await bridgeDesktopClerkSession(token);
    if (sessionBridge.ok) {
      clearDesktopOAuthUrl();
      clearSocialOAuthContext();
      return sessionBridge;
    }

    if (sessionBridge.status !== "missing_clerk_user") {
      return sessionBridge;
    }

    const context = readSocialOAuthContext();
    clearDesktopOAuthUrl();
    return {
      ...sessionBridge,
      clerkToken: token,
      provider: context.provider,
    };
  } catch (error) {
    console.error("[Desktop Clerk OAuth] Failed to complete OAuth:", error);
    return { ok: false, status: "oauth_callback_failed" };
  }
}

export async function sendDesktopClerkEmailVerification(params: {
  clerk: DesktopClerkAuthConfig | null | undefined;
  email: string;
  password: string;
}): Promise<DesktopSocialBridgeResult> {
  if (!isClerkConfigUsable(params.clerk)) {
    return { ok: false, status: "clerk_not_configured" };
  }

  try {
    const clerk = await getDesktopClerkClient(params.clerk.publishableKey);
    clerk.client?.resetSignIn?.();
    clerk.client?.resetSignUp?.();

    const signUp = clerk.client?.signUp;
    if (!signUp) {
      return { ok: false, status: "clerk_not_configured" };
    }

    await signUp.create({
      emailAddress: params.email,
      password: params.password,
    });
    await signUp.prepareEmailAddressVerification({
      strategy: "email_code",
    });

    return { ok: true, status: "verification_pending" };
  } catch (error) {
    console.error("[Desktop Clerk Email] Failed to send verification:", error);
    return {
      ok: false,
      status: normalizeClerkAuthErrorStatus(error),
    };
  }
}

export async function completeDesktopClerkEmailRegistration(params: {
  clerk: DesktopClerkAuthConfig | null | undefined;
  email: string;
  inviteCode: string;
  registrationMode: DesktopRegisterMode;
  teamName: string;
  verificationCode: string;
}): Promise<DesktopSocialBridgeResult> {
  if (!isClerkConfigUsable(params.clerk)) {
    return { ok: false, status: "clerk_not_configured" };
  }

  try {
    const clerk = await getDesktopClerkClient(params.clerk.publishableKey);
    const signUp = clerk.client?.signUp;
    if (!signUp) {
      return { ok: false, status: "clerk_not_configured" };
    }

    const verificationResult = await signUp.attemptEmailAddressVerification({
      code: params.verificationCode,
    });
    const sessionId =
      typeof verificationResult?.createdSessionId === "string"
        ? verificationResult.createdSessionId
        : typeof signUp.createdSessionId === "string"
          ? signUp.createdSessionId
          : "";

    if (verificationResult?.status !== "complete" || !sessionId) {
      return { ok: false, status: "verification_code_invalid" };
    }

    await clerk.setActive({ session: sessionId });
    const token = await clerk.session?.getToken().catch(() => null);
    if (!token) {
      return { ok: false, status: "missing_clerk_session_token" };
    }

    return registerDesktopClerkSession(token, {
      email: params.email,
      inviteCode: params.inviteCode,
      registrationMode: params.registrationMode,
      teamName: params.teamName,
    });
  } catch (error) {
    console.error("[Desktop Clerk Email] Failed to complete registration:", error);
    return {
      ok: false,
      status: normalizeClerkAuthErrorStatus(error),
    };
  }
}

export async function completeDesktopClerkRegistration(params: {
  clerkToken: string;
  inviteCode: string;
  registrationMode: DesktopRegisterMode;
  teamName: string;
}): Promise<DesktopSocialBridgeResult> {
  if (!params.clerkToken) {
    return { ok: false, status: "missing_clerk_session_token" };
  }

  try {
    const registerBridge = await registerDesktopClerkSession(params.clerkToken, {
      inviteCode: params.inviteCode,
      registrationMode: params.registrationMode,
      teamName: params.teamName,
    });

    if (registerBridge.ok) {
      clearDesktopOAuthUrl();
      clearSocialOAuthContext();
    }

    return registerBridge;
  } catch (error) {
    console.error(
      "[Desktop Clerk OAuth] Failed to complete registration:",
      error
    );
    return { ok: false, status: "session_bridge_failed" };
  }
}

async function bridgeDesktopClerkSession(
  token: string
): Promise<DesktopSocialBridgeResult> {
  const response = await apiFetch("/api/auth/clerk/session", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    success?: boolean;
  };

  if (response.ok && payload?.success === true) {
    return { ok: true, status: "authenticated" };
  }

  return {
    ok: false,
    status: normalizeSocialBridgeStatus(payload?.error),
  };
}

async function registerDesktopClerkSession(
  token: string,
  context: DesktopSocialRegistrationInput
): Promise<DesktopSocialBridgeResult> {
  const response = await apiFetch("/api/auth/clerk/register", {
    body: JSON.stringify({
      email: context.email || undefined,
      inviteCode:
        context.registrationMode === "join_team"
          ? context.inviteCode
          : undefined,
      registrationMode: context.registrationMode,
      teamName:
        context.registrationMode === "create_team"
          ? context.teamName
          : undefined,
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    success?: boolean;
  };

  if (response.ok && payload?.success === true) {
    return { ok: true, status: "authenticated" };
  }

  return {
    ok: false,
    status: normalizeSocialBridgeStatus(payload?.status),
  };
}

async function bridgeDesktopLoginToken(
  token: string
): Promise<DesktopSocialBridgeResult> {
  const response = await apiFetch("/api/desktop-auth/login-token", {
    body: JSON.stringify({ token }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    success?: boolean;
  };

  if (response.ok && payload?.success === true) {
    return { ok: true, status: "authenticated" };
  }

  return {
    ok: false,
    status: normalizeSocialBridgeStatus(payload?.status),
  };
}

function isClerkConfigUsable(
  clerk: DesktopClerkAuthConfig | null | undefined
): clerk is Required<DesktopClerkAuthConfig> {
  return Boolean(clerk?.isConfigured && clerk.publishableKey);
}

function getDesktopClerkClient(publishableKey: string) {
  if (!clerkClientPromise || clerkClientKey !== publishableKey) {
    clerkClientKey = publishableKey;
    clerkClientPromise = loadDesktopClerkClient(publishableKey);
  }

  return clerkClientPromise;
}

async function loadDesktopClerkClient(publishableKey: string) {
  const clerk = new Clerk(publishableKey);
  await clerk.load({
    allowedRedirectOrigins: [window.location.origin],
    allowedRedirectProtocols: [`${DESKTOP_OAUTH_DEEP_LINK_SCHEME}:`],
  } as any);
  return clerk;
}

function getClerkOAuthStrategy(provider: DesktopSocialProvider) {
  return provider === "apple" ? "oauth_apple" : "oauth_google";
}

function buildDesktopOAuthUrl(extraParams: Record<string, string> = {}) {
  const url = new URL("/index.html", window.location.origin);
  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildDesktopBrowserOAuthUrl(provider: DesktopSocialProvider) {
  return createApiHref(
    `/desktop-oauth?provider=${encodeURIComponent(provider)}&desktop=1&nonce=${Date.now()}`
  );
}

function buildDesktopBrowserRegistrationUrl(params: {
  email: string;
  inviteCode: string;
  registrationMode: DesktopRegisterMode;
  teamName: string;
}) {
  const href = createApiHref("/register");
  const url = new URL(href);
  url.searchParams.set("desktop", "1");
  url.searchParams.set("email", params.email);
  url.searchParams.set("registrationMode", params.registrationMode);
  if (params.registrationMode === "create_team" && params.teamName) {
    url.searchParams.set("teamName", params.teamName);
  }
  if (params.registrationMode === "join_team" && params.inviteCode) {
    url.searchParams.set("inviteCode", params.inviteCode);
  }
  return url.toString();
}

function buildDesktopOAuthDeepLink(
  path: string,
  extraParams: Record<string, string> = {}
) {
  const url = new URL(`${DESKTOP_OAUTH_DEEP_LINK_SCHEME}://${path}`);
  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function normalizeDesktopOAuthNavigationTarget(target: URL | string) {
  try {
    const url = new URL(String(target));
    if (url.protocol === `${DESKTOP_OAUTH_DEEP_LINK_SCHEME}:`) {
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return buildDesktopOAuthUrl(params);
    }
  } catch {
    // Fall through to Clerk's original target.
  }

  return String(target);
}

function hasDesktopClerkCallbackParams() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return Array.from(DESKTOP_OAUTH_CALLBACK_PARAMS).some((key) =>
    params.has(key)
  );
}

function getDesktopLoginToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search)
    .get(DESKTOP_LOGIN_TOKEN_PARAM)
    ?.trim() || "";
}

function getDesktopAuthError() {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search)
    .get(DESKTOP_AUTH_ERROR_PARAM)
    ?.trim() || "";
}

function clearDesktopOAuthUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;
  for (const key of DESKTOP_OAUTH_CALLBACK_PARAMS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.searchParams.has(DESKTOP_OAUTH_COMPLETE_PARAM)) {
    url.searchParams.delete(DESKTOP_OAUTH_COMPLETE_PARAM);
    changed = true;
  }
  if (url.searchParams.has(DESKTOP_LOGIN_TOKEN_PARAM)) {
    url.searchParams.delete(DESKTOP_LOGIN_TOKEN_PARAM);
    changed = true;
  }
  if (url.searchParams.has(DESKTOP_AUTH_ERROR_PARAM)) {
    url.searchParams.delete(DESKTOP_AUTH_ERROR_PARAM);
    changed = true;
  }
  if (changed) {
    window.history.replaceState(window.history.state, "", url.toString());
  }
}

function writeSocialOAuthContext(context: DesktopSocialOAuthContext) {
  try {
    window.sessionStorage.setItem(
      DESKTOP_OAUTH_CONTEXT_KEY,
      JSON.stringify(context)
    );
  } catch {
    // OAuth still works; missing context falls back to Google provider labels.
  }
}

function readSocialOAuthContext(): DesktopSocialOAuthContext {
  try {
    const raw = window.sessionStorage.getItem(DESKTOP_OAUTH_CONTEXT_KEY);
    const payload = raw ? JSON.parse(raw) : {};
    return {
      provider: payload?.provider === "apple" ? "apple" : "google",
    };
  } catch {
    return {
      provider: "google",
    };
  }
}

function clearSocialOAuthContext() {
  try {
    window.sessionStorage.removeItem(DESKTOP_OAUTH_CONTEXT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function normalizeSocialBridgeStatus(
  input: unknown
): DesktopSocialBridgeFailureStatus {
  const value = typeof input === "string" ? input : "";
  if (
    value === "auth_settings_unavailable" ||
    value === "captcha_invalid" ||
    value === "captcha_required" ||
    value === "captcha_unavailable" ||
    value === "clerk_not_configured" ||
    value === "email_address_exists" ||
    value === "email_not_verified" ||
    value === "form_identifier_exists" ||
    value === "invalid_clerk_token" ||
    value === "invalid_data" ||
    value === "invite_code_invalid" ||
    value === "invite_code_required" ||
    value === "missing_bearer_token" ||
    value === "missing_clerk_session_token" ||
    value === "missing_clerk_user" ||
    value === "missing_primary_email" ||
    value === "oauth_callback_failed" ||
    value === "oauth_start_failed" ||
    value === "password_policy_failed" ||
    value === "password_too_short" ||
    value === "rate_limited" ||
    value === "session_bridge_failed" ||
    value === "team_key_invalid" ||
    value === "team_key_required" ||
    value === "team_name_required" ||
    value === "user_exists" ||
    value === "user_not_allowed" ||
    value === "verification_code_invalid"
  ) {
    return value;
  }

  return "unknown";
}

function normalizeClerkAuthErrorStatus(
  error: unknown
): DesktopSocialBridgeFailureStatus {
  const code = extractClerkAuthErrorCode(error);

  if (
    code.includes("identifier") &&
    (code.includes("exist") || code.includes("taken"))
  ) {
    return "email_address_exists";
  }

  if (code.includes("rate") || code.includes("too many")) {
    return "rate_limited";
  }

  if (code.includes("captcha") || code.includes("bot")) {
    return code.includes("invalid") || code.includes("failed")
      ? "captcha_invalid"
      : "captcha_required";
  }

  if (code.includes("verification") || code.includes("code")) {
    return "verification_code_invalid";
  }

  if (code.includes("password")) {
    return code.includes("short") || code.includes("length")
      ? "password_too_short"
      : "password_policy_failed";
  }

  if (code.includes("email") && code.includes("verified")) {
    return "email_not_verified";
  }

  return normalizeSocialBridgeStatus(code);
}

function extractClerkAuthErrorCode(error: unknown) {
  const maybeError = error as
    | {
        code?: unknown;
        errors?: Array<{
          code?: unknown;
          longMessage?: unknown;
          message?: unknown;
        }>;
        message?: unknown;
      }
    | undefined;
  const firstError = Array.isArray(maybeError?.errors)
    ? maybeError?.errors[0]
    : null;
  return String(
    firstError?.code ||
      firstError?.longMessage ||
      firstError?.message ||
      maybeError?.code ||
      maybeError?.message ||
      ""
  )
    .trim()
    .toLowerCase();
}
