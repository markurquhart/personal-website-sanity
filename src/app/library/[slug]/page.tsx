import Link from "next/link";
import { notFound } from "next/navigation";

import { BookSingleBody, VARIANT_LABELS } from "@/components/BookSingleVariants";
import { PageShell } from "@/components/PageShell";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { BOOK_QUERY, BOOK_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { Book } from "@/sanity/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs: { slug: string | null }[] = await client
    .withConfig({ useCdn: false, stega: false })
    .fetch(BOOK_SLUGS_QUERY);
  return (slugs ?? [])
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await sanityFetch({
    query: BOOK_QUERY,
    params: { slug },
    stega: false,
  });
  const book = res.data as Book | null;
  if (!book) return {};
  return {
    title: `${book.title} · Library · Mark Urquhart`,
    description: book.authors?.length
      ? `${book.title} by ${book.authors.join(", ")}`
      : book.title || undefined,
  };
}

const STATUS_LABELS: Record<string, string> = {
  "up-next": "Up Next",
  "currently-reading": "Currently Reading",
  completed: "Completed",
  paused: "Paused",
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const { v } = await searchParams;
  const parsed = Number(v);
  const variant =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 1;

  const { data } = await sanityFetch({ query: BOOK_QUERY, params: { slug } });
  const book = data as Book | null;
  if (!book) notFound();

  const coverUrl = book.cover?.asset
    ? urlFor(book.cover).width(640).height(960).fit("crop").url()
    : null;

  const events = book.events || [];

  const dateLine =
    book.status === "completed" && book.finishedAt
      ? `Finished ${formatDate(book.finishedAt)}`
      : book.status === "currently-reading" && book.startedAt
        ? `Started ${formatDate(book.startedAt)}`
        : book.status === "paused" && book.pausedAt
          ? `Paused ${formatDate(book.pausedAt)}`
          : null;

  return (
    <PageShell hideMobileProfile>
      <article className="flex flex-col gap-8 px-5 pt-[22px] pb-[60px] xl:px-0">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Library
        </Link>

        {/* Header — locked across all variants. */}
        <header className="flex flex-col gap-4">
          {book.status && (
            <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#c0392b]">
              {STATUS_LABELS[book.status]}
            </div>
          )}
          <h1 className="m-0 font-display text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#111] md:text-[2.75rem]">
            {book.title}
          </h1>
        </header>

        <BookSingleBody
          variant={variant}
          book={book}
          coverUrl={coverUrl}
          dateLine={dateLine}
          events={events}
        />

        {/* Variant switcher — temporary while we pick a layout. */}
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-dashed border-[#ddd] bg-[#fafafa] px-4 py-3 text-[12px] text-[#666]">
          <div className="font-semibold uppercase tracking-[0.05em] text-[#999]">
            Layout preview · v{variant} · {VARIANT_LABELS[variant]}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/library/${slug}?v=${n}`}
                className={`rounded-md border px-2.5 py-1 text-[12px] no-underline transition-colors ${
                  n === variant
                    ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                    : "border-[#ddd] text-[#525252] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                }`}
                title={VARIANT_LABELS[n]}
              >
                v{n}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </PageShell>
  );
}
