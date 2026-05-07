// Donation lifecycle helpers — used by manual entry, offline approval, and (later) Razorpay webhook.
//
// All mutations run inside a transaction so cause / donor / donation rows stay consistent.
// Approval is the only step that increments cause.raisedAmount and donor.totalDonated.

import { prisma } from "./prisma";
import type { DonationType } from "@prisma/client";

export type CreateManualInput = {
  causeId: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorAddress?: string;
  amount: number;          // INR, integer rupees
  type: DonationType;      // ONLINE | OFFLINE | MANUAL
  paymentReference?: string;
  pan?: string;
  adminNotes?: string;
  date?: Date;
};

export async function createManualDonation(input: CreateManualInput) {
  const email = input.donorEmail.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    const donor = await tx.donor.upsert({
      where: { email },
      update: {
        // Refresh contact details with whatever the admin entered.
        name: input.donorName,
        phone: input.donorPhone ?? undefined,
        address: input.donorAddress ?? undefined,
      },
      create: {
        email,
        name: input.donorName,
        phone: input.donorPhone,
        address: input.donorAddress,
      },
    });

    const donation = await tx.donation.create({
      data: {
        causeId: input.causeId,
        donorId: donor.id,
        donorNameSnapshot: input.donorName,
        donorEmailSnapshot: email,
        amount: input.amount,
        type: input.type,
        status: "PENDING",
        paymentReference: input.paymentReference,
        panEncrypted: input.pan, // TODO: encrypt at rest (SEC-007)
        addressSnapshot: input.donorAddress,
        adminNotes: input.adminNotes,
        ...(input.date ? { createdAt: input.date } : {}),
      },
    });

    return donation;
  });
}

export async function approveDonation(donationId: string, approverId: string, opts?: { editedAmount?: number }) {
  return prisma.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({ where: { id: donationId } });
    if (!d) throw new Error("Donation not found");
    if (d.status === "APPROVED") return d; // idempotent — useful when called from a webhook
    if (d.status !== "PENDING") throw new Error(`Cannot approve from ${d.status}`);

    const finalAmount = Number.isFinite(opts?.editedAmount) && (opts!.editedAmount as number) > 0
      ? (opts!.editedAmount as number)
      : d.amount;

    // Increment cause.donorCount only the first time this donor contributes to this cause.
    let isNewDonorForCause = true;
    if (d.donorId) {
      const previousApproved = await tx.donation.count({
        where: {
          donorId: d.donorId,
          causeId: d.causeId,
          status: "APPROVED",
          id: { not: d.id },
        },
      });
      isNewDonorForCause = previousApproved === 0;
    }

    const updated = await tx.donation.update({
      where: { id: donationId },
      data: {
        status: "APPROVED",
        amount: finalAmount,
        approvedAt: new Date(),
        approvedById: approverId,
      },
    });

    await tx.cause.update({
      where: { id: d.causeId },
      data: {
        raisedAmount: { increment: finalAmount },
        ...(isNewDonorForCause ? { donorCount: { increment: 1 } } : {}),
      },
    });

    if (d.donorId) {
      const donor = await tx.donor.findUnique({ where: { id: d.donorId } });
      await tx.donor.update({
        where: { id: d.donorId },
        data: {
          totalDonated: { increment: finalAmount },
          donationCount: { increment: 1 },
          firstDonationAt: donor?.firstDonationAt ?? new Date(),
          lastDonationAt: new Date(),
        },
      });
    }

    return updated;
  });
}

export async function rejectDonation(donationId: string, approverId: string, reason?: string) {
  return prisma.donation.update({
    where: { id: donationId },
    data: {
      status: "REJECTED",
      approvedAt: new Date(),
      approvedById: approverId,
      ...(reason ? { adminNotes: reason } : {}),
    },
  });
}
