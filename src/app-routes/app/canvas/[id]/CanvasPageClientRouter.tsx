// Modified for standalone community distribution; see NOTICE.
"use client";

import dynamic from "@/src/desktop/next-dynamic-shim";
import { useParams, useSearchParams } from "@/src/desktop/next-navigation-shim";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CanvasLogoLoadingView } from "@/src/components/canvas/canvas-logo-loading";
import { preloadCanvasProject } from "@/src/client/canvas-project-preload";

const loadCanvasEditorLegacyPage = () => import("@/src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient");
const loadLiblibVideoCanvasReplica = () =>
  import("@/src/components/canvas/LiblibVideoCanvasReplica").then(
    (module) => module.LiblibVideoCanvasReplica
  );

let legacyCanvasRuntimeReady = false;
let legacyCanvasRuntimePromise: Promise<void> | null = null;
let videoCanvasRuntimeReady = false;
let videoCanvasRuntimePromise: Promise<void> | null = null;

function preloadLegacyCanvasRuntime() {
  if (legacyCanvasRuntimeReady) {
    return Promise.resolve();
  }
  if (!legacyCanvasRuntimePromise) {
    legacyCanvasRuntimePromise = Promise.all([
      loadCanvasEditorLegacyPage(),
      import("@/src/components/canvas/CanvasWorkspace"),
      import("@/src/components/canvas/CanvasChatPanel"),
      import("@/src/components/canvas/CanvasFileListPanel"),
    ])
      .then(() => {
        legacyCanvasRuntimeReady = true;
      })
      .catch((error) => {
        legacyCanvasRuntimePromise = null;
        throw error;
      });
  }
  return legacyCanvasRuntimePromise;
}

function preloadVideoCanvasRuntime() {
  if (videoCanvasRuntimeReady) {
    return Promise.resolve();
  }
  if (!videoCanvasRuntimePromise) {
    videoCanvasRuntimePromise = loadLiblibVideoCanvasReplica()
      .then(() => {
        videoCanvasRuntimeReady = true;
      })
      .catch((error) => {
        videoCanvasRuntimePromise = null;
        throw error;
      });
  }
  return videoCanvasRuntimePromise;
}

const CanvasEditorLegacyPage = dynamic(loadCanvasEditorLegacyPage, {
  loading: () => <CanvasRouteLoader label="正在加载画布..." />,
  ssr: false,
});

const LiblibVideoCanvasReplica = dynamic(loadLiblibVideoCanvasReplica, {
  loading: () => <CanvasRouteLoader label="正在加载视频画布..." />,
  ssr: false,
});

export function CanvasPageClientRouter({
  initialId,
  initialMode = "",
  initialSiteLogo = null,
  initialSiteLogoDark = null,
  initialSiteName = "FrameLoom",
  initialWorkspaceType = "",
}: {
  initialId: string;
  initialMode?: string;
  initialSiteLogo?: string | null;
  initialSiteLogoDark?: string | null;
  initialSiteName?: string | null;
  initialWorkspaceType?: string;
}) {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const routeId = routeParams?.id;
  const id = Array.isArray(routeId) ? routeId[0] || initialId : typeof routeId === "string" ? routeId : initialId;
  const mode = searchParams.get("mode") === "agent" ? "" : searchParams.get("mode") || initialMode;
  const requestedWorkspaceType =
    searchParams.get("workspaceType") || initialWorkspaceType;
  const isVideoMode = mode === "video" || requestedWorkspaceType === "video";
  const legacyParams = useMemo(() => Promise.resolve({ id }), [id]);
  const [isRuntimeReady, setIsRuntimeReady] = useState(() =>
    isVideoMode ? videoCanvasRuntimeReady : legacyCanvasRuntimeReady
  );
  const loadingBrand = useMemo(
    () => ({
      siteLogo: initialSiteLogo,
      siteLogoDark: initialSiteLogoDark,
      siteName: initialSiteName,
    }),
    [initialSiteLogo, initialSiteLogoDark, initialSiteName]
  );

  useEffect(() => {
    if (!id) {
      return;
    }

    if (!isVideoMode) {
      void preloadCanvasProject(id);
    }

    const alreadyReady = isVideoMode
      ? videoCanvasRuntimeReady
      : legacyCanvasRuntimeReady;
    setIsRuntimeReady(alreadyReady);
    if (alreadyReady) {
      return;
    }

    let cancelled = false;
    const preload = isVideoMode
      ? preloadVideoCanvasRuntime
      : preloadLegacyCanvasRuntime;

    preload()
      .catch((error) => {
        console.warn("[Canvas] runtime preload failed:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsRuntimeReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, isVideoMode]);

  if (!id) {
    return (
      <CanvasLoadingBrandProvider value={loadingBrand}>
        <CanvasRouteLoader label="正在加载画布..." />
      </CanvasLoadingBrandProvider>
    );
  }

  if (!isRuntimeReady) {
    return (
      <CanvasLoadingBrandProvider value={loadingBrand}>
        <CanvasRouteLoader
          label={isVideoMode ? "正在加载视频画布..." : "正在加载画布..."}
        />
      </CanvasLoadingBrandProvider>
    );
  }

  if (isVideoMode) {
    return (
      <CanvasLoadingBrandProvider value={loadingBrand}>
        <LiblibVideoCanvasReplica key={id} canvasId={id} />
      </CanvasLoadingBrandProvider>
    );
  }

  return (
    <CanvasLoadingBrandProvider value={loadingBrand}>
      <CanvasEditorLegacyPage params={legacyParams} />
    </CanvasLoadingBrandProvider>
  );
}

type CanvasLoadingBrand = {
  siteLogo?: string | null;
  siteLogoDark?: string | null;
  siteName?: string | null;
};

const CanvasLoadingBrandContext = createContext<CanvasLoadingBrand>({});

function CanvasLoadingBrandProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CanvasLoadingBrand;
}) {
  return (
    <CanvasLoadingBrandContext.Provider value={value}>
      {children}
    </CanvasLoadingBrandContext.Provider>
  );
}

function CanvasRouteLoader({ label }: { label: string }) {
  const brand = useContext(CanvasLoadingBrandContext);

  return (
    <CanvasLogoLoadingView
      label={label}
      siteLogo={brand.siteLogo}
      siteLogoDark={brand.siteLogoDark}
      siteName={brand.siteName}
    />
  );
}
