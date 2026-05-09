import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = { title: "Profile — Admin" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink mb-2">Profile</h1>
        <p className="text-sm text-muted">Signed in as <strong className="text-ink">{me.name}</strong> ({me.email}) · {me.role === "ADMIN" ? "Admin" : "Editor"}</p>
      </div>

      <section className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
        <h2 className="font-display text-xl text-ink mb-4">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
