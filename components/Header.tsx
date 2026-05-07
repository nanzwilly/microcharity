"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/data/site";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-line)]">
      <div className="container-page flex items-center justify-between h-20 md:h-24">
        <Link href="/" className="flex items-center" aria-label={`${site.name} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt={`${site.name} — ${site.tagline}`} className="h-12 md:h-14 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center justify-end gap-7 text-sm font-medium ml-auto">
          {site.nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition hover:text-accent-600 ${active ? "text-accent-600" : "text-ink"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="lg:hidden p-2 -mr-2"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--color-line)] bg-white">
          <nav className="container-page py-4 flex flex-col gap-1 text-sm font-medium">
            {site.nav.map((item) => (
              <Link key={item.href} href={item.href} className="py-2 text-ink hover:text-accent-600" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
