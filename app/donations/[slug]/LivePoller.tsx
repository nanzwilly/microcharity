"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Quietly re-fetches the RSC payload at a fixed cadence while the tab is
// visible, so admin approvals of offline / UPI donations show up on the
// public cause page without anyone having to reload. The cause page itself
// is a server component sourcing campaign.raised from the database, so a
// router.refresh() is sufficient — no client state to reconcile.
//
// Polling pauses when the tab is hidden (no point burning RSC requests
// while nobody's looking) and resumes immediately on visibility / focus.

export default function LivePoller({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Refresh once immediately on becoming visible so a tab the donor
        // switched back to catches up without waiting a full interval.
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
