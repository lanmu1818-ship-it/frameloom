// Modified for standalone community distribution; see NOTICE.
import { PacmanLoader } from "@/src/components/pacman-loader";

type CanvasLogoLoadingViewProps = {
  label?: string;
  siteName?: string | null;
  siteLogo?: string | null;
  siteLogoDark?: string | null;
};

export function CanvasLogoLoadingView({
  label = "正在加载画布...",
}: CanvasLogoLoadingViewProps) {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-[#f4f4f5] text-[#111111] dark:bg-[#08090b] dark:text-[#f4f4f5]">
      <div aria-label={label} className="flex flex-col items-center gap-6" role="status">
        <PacmanLoader />
        <div className="text-xs font-medium text-[#6b7280] dark:text-zinc-400">
          {label}
        </div>
      </div>
    </div>
  );
}
