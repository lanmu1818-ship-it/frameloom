// Modified for standalone community distribution; see NOTICE.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DesktopRouteSnapshot = {
  hash: string;
  pathname: string;
  search: string;
};

type DesktopRouter = {
  back: () => void;
  forward: () => void;
  prefetch: () => Promise<void>;
  push: (href: string) => void;
  refresh: () => void;
  replace: (href: string) => void;
};

const ROUTE_CHANGE_EVENT = "astra-desktop-route-change";

const DesktopRouteContext = createContext<DesktopRouteSnapshot>({
  hash: "",
  pathname: "/",
  search: "",
});

function readRouteSnapshot(): DesktopRouteSnapshot {
  if (typeof window === "undefined") {
    return {
      hash: "",
      pathname: "/",
      search: "",
    };
  }

  return {
    hash: window.location.hash,
    pathname: window.location.pathname || "/",
    search: window.location.search,
  };
}

function emitRouteChange() {
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

function toUrl(href: string) {
  return new URL(href, window.location.origin);
}

function navigate(href: string, mode: "push" | "replace") {
  if (typeof window === "undefined") {
    return;
  }

  const url = toUrl(href);
  if (url.origin !== window.location.origin) {
    window.location.href = url.toString();
    return;
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) {
    emitRouteChange();
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }
  emitRouteChange();
}

export function DesktopNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(readRouteSnapshot);

  useEffect(() => {
    const update = () => setSnapshot(readRouteSnapshot());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    window.addEventListener(ROUTE_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
      window.removeEventListener(ROUTE_CHANGE_EVENT, update);
    };
  }, []);

  return (
    <DesktopRouteContext.Provider value={snapshot}>
      {children}
    </DesktopRouteContext.Provider>
  );
}

export function usePathname() {
  return useContext(DesktopRouteContext).pathname;
}

export function useSearchParams() {
  const { search } = useContext(DesktopRouteContext);
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams() {
  const { pathname } = useContext(DesktopRouteContext);
  return useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "canvas" && parts[1]) {
      return { id: decodeURIComponent(parts[1]) };
    }
    return {};
  }, [pathname]);
}

export function useRouter(): DesktopRouter {
  return useMemo(
    () => ({
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      prefetch: async () => {},
      push: (href: string) => navigate(href, "push"),
      refresh: () => emitRouteChange(),
      replace: (href: string) => navigate(href, "replace"),
    }),
    []
  );
}

export function redirect(href: string) {
  navigate(href, "replace");
}

export function notFound(): never {
  throw new Error("not_found");
}
