"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CauseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { nextMcId, composeCaption } from "@/lib/mcid";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export type CauseFormState = { error?: string; ok?: true };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const MONTHS = new Set([
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
  "january","february","march","april","june","july","august","september","october","november","december",
  "q1","q2","q3","q4",
]);
function deriveBeneficiaryKey(slug: string): string {
  const parts = slug.split("-");
  while (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (/^\d{2,4}$/.test(last) || MONTHS.has(last)) parts.pop();
    else break;
  }
  return parts.join("-");
}

export type UpdateFormState = { error?: string; ok?: true };

export async function addCauseUpdateAction(_prev: UpdateFormState, formData: FormData): Promise<UpdateFormState> {
  await requireAdmin();

  const slug      = String(formData.get("slug") ?? "").trim();
  const heading   = String(formData.get("heading") ?? "").trim();
  const body      = String(formData.get("body") ?? "").trim();
  const dateRaw   = String(formData.get("date") ?? "").trim();
  const generateMcId = formData.get("generateMcId") === "on";

  if (!slug) return { error: "Missing cause slug." };
  if (!body) return { error: "Update body is required." };

  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Invalid date." };

  const cause = await prisma.cause.findUnique({ where: { slug }, select: { id: true } });
  if (!cause) return { error: "Cause not found." };

  await prisma.$transaction(async (tx) => {
    const last = await tx.causeUpdate.findFirst({
      where: { causeId: cause.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (last?.sortOrder ?? -1) + 1;

    const mcId = generateMcId ? await nextMcId(tx, date) : null;
    const caption = composeCaption({ date, heading, mcId });

    await tx.causeUpdate.create({
      data: {
        causeId: cause.id,
        caption,
        body,
        sortOrder: nextOrder,
        postedAt: date,
        mcId,
      },
    });
  });

  revalidatePath(`/admin/causes/${slug}`);
  revalidatePath(`/donations/${slug}`);
  revalidatePath("/current-causes");
  revalidatePath("/success-stories");

  return { ok: true };
}

export async function deleteCauseUpdateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const slug = String(formData.get("slug"));
  await prisma.causeUpdate.delete({ where: { id } });
  revalidatePath(`/admin/causes/${slug}`);
  revalidatePath(`/donations/${slug}`);
}

export async function createCauseAction(_prev: CauseFormState, formData: FormData): Promise<CauseFormState> {
  const user = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const story = String(formData.get("story") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const goalRaw = String(formData.get("goal") ?? "").trim();
  const beneficiaryKey = String(formData.get("beneficiaryKey") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "DRAFT") as CauseStatus;
  const dateRaw = String(formData.get("date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (dateRaw && Number.isNaN(date.getTime())) return { error: "Invalid date." };

  if (!title) return { error: "Title is required." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Could not derive a URL slug from the title." };

  const goal = goalRaw ? Number(goalRaw) : 0;
  if (goalRaw && (!Number.isFinite(goal) || goal < 0)) return { error: "Goal must be a positive number." };

  const status: CauseStatus = ["DRAFT", "PUBLISHED", "CLOSED"].includes(statusRaw) ? statusRaw : "DRAFT";

  // Slug must be unique
  const clash = await prisma.cause.findUnique({ where: { slug }, select: { id: true } });
  if (clash) return { error: `A cause with slug "${slug}" already exists. Pick a different one.` };

  const finalKey = beneficiaryKey || deriveBeneficiaryKey(slug);

  const created = await prisma.$transaction(async (tx) => {
    const mcId = await nextMcId(tx, date);
    const initialCaption = composeCaption({
      date,
      heading: location || undefined,
      mcId,
    });

    return tx.cause.create({
      data: {
        slug,
        title,
        summary: summary || null,
        featuredImage: image || null,
        goalAmount: Math.round(goal),
        raisedAmount: 0,
        status,
        beneficiaryKey: finalKey || null,
        contentHtml: "",
        category: category || null,
        location: location || null,
        startDate: date,
        mcId,
        createdById: user.userId,
        // Initial timeline entry: caption uses the same MCID as the cause, body is the story (if provided).
        ...(story
          ? {
              updates: {
                create: [{
                  caption: initialCaption,
                  body: story,
                  sortOrder: 0,
                  postedAt: date,
                  mcId, // same MCID as the cause itself for the first entry
                }],
              },
            }
          : {}),
      },
    });
  });

  revalidatePath("/admin/causes");
  revalidatePath("/");
  revalidatePath("/current-causes");
  revalidatePath("/success-stories");
  revalidatePath(`/donations/${created.slug}`);

  redirect(`/admin/causes?created=${created.slug}`);
}

export async function setCauseStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as CauseStatus;
  if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
    throw new Error("Invalid status");
  }

  const cause = await prisma.cause.findUnique({ where: { id }, select: { slug: true } });
  if (!cause) throw new Error("Cause not found");

  await prisma.cause.update({ where: { id }, data: { status } });

  // Refresh both admin views and every public surface that lists causes so the change
  // is visible immediately on the next request.
  revalidatePath("/admin/causes");
  revalidatePath("/");
  revalidatePath("/current-causes");
  revalidatePath("/success-stories");
  revalidatePath(`/donations/${cause.slug}`);
}
