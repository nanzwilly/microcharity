"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function setDonorActiveAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("active") ?? "").trim() === "true";
  if (!id) return;

  await prisma.donor.update({ where: { id }, data: { active: next } });
  await audit({
    action: next ? "donor.activate" : "donor.deactivate",
    userId: me.userId,
    entityType: "Donor",
    entityId: id,
  });
  revalidatePath("/admin/donors");
}

export async function setDonorSubscribedAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  // Submitted value is the desired post-click subscription state.
  const subscribe = String(formData.get("subscribe") ?? "").trim() === "true";
  if (!id) return;

  await prisma.donor.update({ where: { id }, data: { unsubscribed: !subscribe } });
  await audit({
    action: subscribe ? "donor.subscribe" : "donor.unsubscribe",
    userId: me.userId,
    entityType: "Donor",
    entityId: id,
  });
  revalidatePath("/admin/donors");
}

export async function deleteDonorAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  // Soft delete only — donation history references this donor row, and we
  // want the donor profile (and any future audit / restore) to remain
  // recoverable from the DB. The donors list filters on `deletedAt: null`.
  await prisma.donor.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    action: "donor.softDelete",
    userId: me.userId,
    entityType: "Donor",
    entityId: id,
  });
  revalidatePath("/admin/donors");
}
