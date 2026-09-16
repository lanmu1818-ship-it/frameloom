// Modified for standalone community distribution; see NOTICE.
import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/src/providers/auth-session-provider";
import { CanvasLogoLoadingView } from "@/src/components/canvas/canvas-logo-loading";
import { ClientErrorBoundary } from "@/src/components/ui/client-error-boundary";
import { LocalMediaArchiveProvider } from "@/src/providers/local-media-archive-provider";
import { ThemeProvider } from "@/src/providers/theme-provider";
import { CanvasRedirectClient } from "@/src/app-routes/app/canvas/canvas-redirect-client";
import { CanvasPageClientRouter } from "@/src/app-routes/app/canvas/[id]/CanvasPageClientRouter";
import { UploadProgressProvider } from "@/src/providers/upload-progress-provider";
import { DesktopNavigationProvider, usePathname, useRouter } from "@/src/desktop/next-navigation-shim";

const LANBI_MARK = "/brand/lanbi-mark.svg";

export function CanvasDesktopApp() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem
    >
      <AuthSessionProvider>
        <LocalMediaArchiveProvider>
          <UploadProgressProvider>
            <DesktopNavigationProvider>
              <ClientErrorBoundary
                fallback={<CanvasErrorFallback />}
                resetKeys={[window.location.pathname]}
              >
                <CanvasDesktopRoutes />
              </ClientErrorBoundary>
            </DesktopNavigationProvider>
          </UploadProgressProvider>
          <Toaster position="top-center" richColors />
        </LocalMediaArchiveProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}

function CanvasDesktopRoutes() {
  const pathname = usePathname();
  const router = useRouter();
  const canvasId = getCanvasIdFromPathname(pathname);

  if (canvasId) {
    return (
      <CanvasPageClientRouter
        initialId={canvasId}
        initialSiteLogo={LANBI_MARK}
        initialSiteLogoDark={LANBI_MARK}
        initialSiteName="FrameLoom"
      />
    );
  }

  if (pathname === "/canvas" || pathname === "/canvas/") {
    return <CanvasRedirectClient />;
  }

  queueMicrotask(() => router.replace("/canvas"));
  return (
    <CanvasLogoLoadingView
      label="正在打开FrameLoom..."
      siteLogo={LANBI_MARK}
      siteLogoDark={LANBI_MARK}
      siteName="FrameLoom"
    />
  );
}

function CanvasErrorFallback(): ReactNode {
  return (
    <main className="flex h-svh w-full items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-[420px] text-center">
        <h1 className="m-0 text-lg font-semibold">画布加载异常</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          请重新加载画布；未保存的修改可能需要重新编辑。
        </p>
        <button
          className="mt-5 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={() => window.location.reload()}
          type="button"
        >
          重新加载
        </button>
      </section>
    </main>
  );
}

function getCanvasIdFromPathname(pathname: string) {
  const match = pathname.match(/^\/canvas\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}
