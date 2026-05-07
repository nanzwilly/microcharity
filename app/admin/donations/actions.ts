"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DonationType } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import { createManualDonation, approveDonation, rejectDonation } from "@/lib/donations";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export type FormState = { error?: string; ok?: true };

const TYPES: DonationType[] = ["ONLINE", "OFFLINE", "MANUAL"];

export async function createManualDonationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const causeId    = String(formData.get("causeId") ?? "").trim();
  const donorName  = String(formData.get("donorName") ?? "").trim();
  const donorEmail = String(formData.get("donorEmail") ?? "").trim();
  const amountRaw  = String(formData.get("amount") ?? "").trim();
  const typeRaw    = String(formData.get("type") ?? "MANUAL").trim();
  const dateRaw    = String(formData.get("date") ?? "").trim();

  if (!causeId)    return { error: "Pick a cause." };
  if (!donorName)  return { error: "Donor name is required." };
  if (!donorEmail) return { error: "Donor email is required." };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 1) return { error: "Amount must be at least ₹1." };
  if (!TYPES.includes(typeRaw as DonationType)) return { error: "Invalid donation type." };

  const date = dateRaw ? new Date(dateRaw) : undefined;
  if (date && Number.isNaN(date.getTime())) return { error: "Invalid date." };

  const d = await createManualDonation({
    causeId,
    donorName,
    donorEmail,
    donorPhone:       toStr(formData.get("donorPhone")),
    donorAddress:     toStr(formData.get("donorAddress")),
    amount,
    type:             typeRaw as DonationType,
    paymentReference: toStr(formData.get("paymentReference")),
    pan:              toStr(formData.get("pan")),
    adminNotes:       toStr(formData.get("adminNotes")),
    date,
  });

  revalidatePath("/admin/donations");
  redirect(`/admin/donations?created=${d.id}`);
}

export async function approveDonationAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const editedAmount = amountRaw ? Number(amountRaw) : undefined;
  await approveDonation(id, user.userId, { editedAmount });
  revalidatePath("/admin/donations");
}

export async function rejectDonationAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const reason = toStr(formData.get("reason"));
  await rejectDonation(id, user.userId, reason);
  revalidatePath("/admin/donations");
}

function toStr(v: FormDataEntryValue | null): string | undefined {
  const s = (v == null ? "" : String(v)).trim();
  return s.length ? s : undefined;
}
