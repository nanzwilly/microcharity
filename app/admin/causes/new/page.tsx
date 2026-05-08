import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CauseForm from "./CauseForm";

export const metadata = { title: "New cause — Admin" };
export const dynamic = "force-dynamic";

export default async function NewCausePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const sp = await searchParams;
  const fromSlug = sp.from?.trim();

  let template:
    | {
        title: string;
        slug: string;
        summary: string;
        story: string;
        image: string;
        goal: number;
        beneficiaryKey: string;
        category: string;
        location: string;
        sourceTitle: string;
      }
    | undefined;

  if (fromSlug) {
    const src = await prisma.cause.findUnique({
      where: { slug: fromSlug },
      include: { updates: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    if (src) {
      template = {
        title: src.title,
        slug: "", // force the user to pick a new slug
        summary: src.summary ?? "",
        story: src.updates[0]?.body ?? "",
        image: src.featuredImage ?? "",
        goal: src.goalAmount,
        beneficiaryKey: src.beneficiaryKey ?? "",
        category: src.category ?? "",
        location: src.location ?? "",
        sourceTitle: src.title,
      };
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/causes" className="text-sm text-muted hover:text-ink mb-4 inline-block">← Back to causes</Link>
      <h1 className="font-display text-3xl text-ink mb-2">{template ? "Duplicate cause" : "New cause"}</h1>
      <p className="text-sm text-muted mb-6">
        {template
          ? <>Pre-filled from <strong className="text-ink">{template.sourceTitle}</strong>. Update the title, give it a fresh URL slug, set the new goal — then publish.</>
          : <>Create a new donation page. You can save it as a draft first and publish when ready.</>}
      </p>

      <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6 md:p-8">
        <CauseForm template={template} />
      </div>
    </div>
  );
}
