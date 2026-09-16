// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@/types/session";
import { apiFetch } from "@/src/client/api";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  data: Session | null;
  status: SessionStatus;
  update: () => Promise<Session | null>;
};

type ValidateSessionResponse = {
  valid?: boolean;
  user?: {
    id?: string | null;
    email?: string | null;
    image?: string | null;
    name?: string | null;
    teamId?: string | null;
    teamRole?: "member" | "admin" | "owner" | null;
    type?: Session["user"]["type"] | null;
  } | null;
};

const AuthSessionContext = createContext<SessionContextValue | null>(null);
const SESSION_FETCH_TIMEOUT_MS = 3500;

function createSessionFetchController() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, SESSION_FETCH_TIMEOUT_MS);

  return {
    controller,
    clear: () => window.clearTimeout(timeout),
  };
}

function toClientSession(payload: ValidateSessionResponse): Session | null {
  const user = payload.user;
  if (!payload.valid || !user?.id) {
    return null;
  }

  return {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: user.id,
      email: user.email ?? null,
      image: user.image ?? null,
      name: user.name ?? null,
      teamId: user.teamId ?? null,
      teamRole: user.teamRole ?? "member",
      type: user.type ?? "regular",
    },
  };
}

async function fetchSession() {
  const { clear, controller } = createSessionFetchController();

  try {
    const response = await apiFetch("/api/auth/validate-session", {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | ValidateSessionResponse
      | null;
    return payload ? toClientSession(payload) : null;
  } catch (error) {
    if ((error as Error)?.name !== "AbortError") {
      console.warn("[AuthSession] Failed to validate session", error);
    }
    return null;
  } finally {
    clear();
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const update = useCallback(async () => {
    const session = await fetchSession().catch(() => null);
    setData(session);
    setStatus(session?.user ? "authenticated" : "unauthenticated");
    return session;
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchSession()
      .then((session) => {
        if (cancelled) return;
        setData(session);
        setStatus(session?.user ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setStatus("unauthenticated");
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void update();
      }
    };

    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [update]);

  const value = useMemo(
    () => ({
      data,
      status,
      update,
    }),
    [data, status, update]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    return {
      data: null,
      status: "unauthenticated" as SessionStatus,
      update: async () => null,
    };
  }

  return context;
}
