import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import InviteUserForm from "./InviteUserForm";
import UserRow from "./UserRow";

export const metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl text-ink mb-2">Users</h1>
        <p className="text-sm text-muted">User management is restricted to admins. Contact an admin to add or modify users.</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      passwordHash: true,
      inviteExpiresAt: true,
      createdAt: true,
    },
  });

  // Don't ship password hashes to the client.
  const safe = users.map(({ passwordHash, ...rest }) => ({
    ...rest,
    activated: passwordHash != null,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink mb-2">Users</h1>
        <p className="text-sm text-muted">
          Invite teammates to the admin panel. Invitees receive a one-time link (valid 24 hours) to set their own password.
          Admins manage users; Editors edit causes/donations/donors but can&apos;t open this page.
        </p>
      </div>

      <section className="rounded-2xl bg-white border border-[var(--color-line)] p-6 md:p-8">
        <h2 className="font-display text-xl text-ink mb-4">Invite a new user</h2>
        <InviteUserForm />
      </section>

      <section className="rounded-2xl bg-white border border-[var(--color-line)] overflow-hidden">
        <h2 className="font-display text-xl text-ink px-6 pt-6">Existing users ({users.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-soft)] border-y border-[var(--color-line)]">
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-6 py-3 font-semibold">User</th>
              <th className="px-6 py-3 font-semibold">Role</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Last login</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {safe.map((u) => (
              <UserRow key={u.id} user={u} currentUserId={me.userId} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
