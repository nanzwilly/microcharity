import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--color-soft)]">
      <header className="bg-white border-b border-[var(--color-line)]">
        <div className="container-page flex items-center justify-between h-16">
          <Link href="/admin" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MicroCharity" className="h-8 w-auto" />
            <span className="font-display text-base text-ink">Admin</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin/causes" className="text-ink hover:text-accent-600">Causes</Link>
            <Link href="/admin/donations" className="text-ink hover:text-accent-600">Donations</Link>
            <Link href="/admin/donors" className="text-ink hover:text-accent-600">Donors</Link>
            <Link href="/admin/reports" className="text-ink hover:text-accent-600">Reports</Link>
            <Link href="/" className="text-muted hover:text-ink">View site</Link>
            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-[var(--color-line)]">
                <span className="text-xs text-muted">{user.name} · {user.role === "ADMIN" ? "Admin" : "Manager"}</span>
                <LogoutButton />
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
