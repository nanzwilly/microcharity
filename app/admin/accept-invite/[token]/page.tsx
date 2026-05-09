import Link from "next/link";
import { findInvite } from "@/lib/users";
import AcceptInviteForm from "./AcceptInviteForm";

export const metadata = { title: "Accept invite — MicroCharity" };
export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl text-ink mb-2">Set your password</h1>

      {!invite.ok ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          {invite.reason === "expired" && "This invite link has expired. Ask an admin to resend it."}
          {invite.reason === "unknown" && "This invite link is invalid. Double-check the URL or ask an admin to resend."}
          {invite.reason === "inactive" && "This account has been deactivated. Ask an admin to reactivate it."}
          <p className="mt-3">
            <Link href="/admin/login" className="font-semibold text-amber-900 hover:underline">Go to login →</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-6">
            Welcome, <strong className="text-ink">{invite.name}</strong>. Choose a password to finish setting up your <code className="text-xs">{invite.email}</code> account.
          </p>
          <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
            <AcceptInviteForm token={token} />
          </div>
        </>
      )}
    </div>
  );
}
