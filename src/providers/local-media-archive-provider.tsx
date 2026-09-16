// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, type ReactNode } from "react";
import { getDesktopArchiveBridge } from "@/src/client/local-media-archive";
import { startLocalMediaArchiveScheduler } from "@/src/client/local-media-archive-scheduler";
import { useSession } from "@/src/providers/auth-session-provider";

export function LocalMediaArchiveProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    if (!getDesktopArchiveBridge()?.archiveItems) {
      return;
    }

    const scheduler = startLocalMediaArchiveScheduler();
    return scheduler.stop;
  }, [status]);

  return <>{children}</>;
}
