"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
      // Deliberately leave busy = true — the navigation away unmounts this
      // button, and resetting busy here would re-enable the link during the
      // few hundred ms of nav, inviting accidental double-clicks.
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      aria-busy={busy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 disabled:opacity-60 disabled:cursor-wait"
    >
      {busy && (
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          className="animate-spin"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.55" />
        </svg>
      )}
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
