// Modified for standalone community distribution; see NOTICE.
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/src/providers/theme-provider";
import { AuthSessionProvider } from "@/src/providers/auth-session-provider";
import { LocalMediaArchiveProvider } from "@/src/providers/local-media-archive-provider";
import { ClientErrorBoundary } from "@/src/components/ui/client-error-boundary";
import { ProviderApiKeyPromptProvider } from "@/src/providers/provider-api-key-prompt-provider";
import { UploadProgressProvider } from "@/src/providers/upload-progress-provider";
import { DesignHome } from "@/src/components/home/design-home";
import { VideoCanvasRedirectClient } from "@/src/app-routes/app/(chat)/video-canvas/video-canvas-redirect-client";
import { CanvasRedirectClient } from "@/src/app-routes/app/canvas/canvas-redirect-client";
import { CanvasPageClientRouter } from "@/src/app-routes/app/canvas/[id]/CanvasPageClientRouter";
import { TeamAdminOverviewPage } from "@/src/components/team-admin/team-admin-overview-page";
import { DesktopNavigationProvider, usePathname } from "@/src/desktop/next-navigation-shim";
import type { SessionUser } from "@/src/desktop/desktop-app";

type DesktopFrontendAppProps = {
  updateBanner?: ReactNode;
  user: SessionUser | null;
};

export function DesktopFrontendApp({ updateBanner, user }: DesktopFrontendAppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem
    >
      <AuthSessionProvider>
        <LocalMediaArchiveProvider>
          <ProviderApiKeyPromptProvider>
            <UploadProgressProvider>
              <DesktopNavigationProvider>
                {updateBanner}
                <ClientErrorBoundary
                  fallback={<DesktopRouteErrorFallback />}
                  resetKeys={[user?.id || "guest"]}
                >
                  <DesktopFrontendRoutes user={user} />
                </ClientErrorBoundary>
              </DesktopNavigationProvider>
            </UploadProgressProvider>
            <Toaster position="top-center" richColors />
          </ProviderApiKeyPromptProvider>
        </LocalMediaArchiveProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}

function DesktopRouteErrorFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050607] px-6 text-white">
      <section className="w-full max-w-[460px] rounded-[24px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <h1 className="m-0 text-[18px] font-semibold">页面加载异常</h1>
        <p className="mt-3 text-[13px] leading-6 text-white/58">
          当前页面暂时无法继续渲染，重新加载后会回到最近的项目状态。
        </p>
        <button
          className="mt-5 inline-flex h-10 items-center justify-center rounded-[12px] bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90"
          onClick={() => window.location.reload()}
          type="button"
        >
          重新加载
        </button>
      </section>
    </main>
  );
}

function DesktopFrontendRoutes({ user }: DesktopFrontendAppProps) {
  const pathname = usePathname();
  const canvasId = getCanvasIdFromPathname(pathname);

  if (canvasId) {
    return (
      <CanvasPageClientRouter
        initialId={canvasId}
        initialSiteName="FrameLoom"
      />
    );
  }

  if (pathname === "/video-canvas" || pathname === "/video-canvas/") {
    return <VideoCanvasRedirectClient />;
  }

  if (pathname === "/canvas" || pathname === "/canvas/") {
    return <CanvasRedirectClient />;
  }

  if (pathname === "/team-admin" || pathname === "/team-admin/") {
    return <TeamAdminOverviewPage />;
  }

  return (
    <DesignHome
      isAuthenticated={Boolean(user?.id)}
      user={user}
    />
  );
}

function getCanvasIdFromPathname(pathname: string) {
  const match = pathname.match(/^\/canvas\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}
