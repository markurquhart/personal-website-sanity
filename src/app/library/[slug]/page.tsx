import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { PageShell } from "@/components/PageShell";
import { StarRating } from "@/components/StarRating";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { BOOK_QUERY, BOOK_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { Book, BookEvent } from "@/sanity/lib/types";

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

const EVENT_LABELS: Record<BookEvent["type"], string> = {
  added: "Added to library",
  started: "Started reading",
  paused: "Paused",
  resumed: "Resumed",
  finished: "Finished",
  abandoned: "Abandoned",
  rated: "Rated",
  note: "Note",
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const reviewComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-4 text-[16px] leading-[1.7] text-[#404040]">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-5 border-l-2 border-[#c0392b] pl-4 italic text-[#525252]">
        {children}
      </blockquote>
    ),
  },
};

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await sanityFetch({ query: BOOK_QUERY, params: { slug } });
  const book = data as Book | null;
  if (!book) notFound();

  const coverUrl = book.cover?.asset
    ? urlFor(book.cover).width(640).height(960).fit("crop").url()
    : null;

  const events = book.events || [];

  return (
    <PageShell hideMobileProfile>
      <article className="flex flex-col gap-8 px-5 pt-[22px] pb-[60px] xl:px-0">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Library
        </Link>

        <header className="flex flex-col gap-6 md:flex-row md:gap-10">
          <div
            className="w-[200px] flex-shrink-0 overflow-hidden rounded-md border border-[#eee] bg-[#f3f3f3] md:w-[260px]"
            style={{ aspectRatio: "2 / 3" }}
          >
            {coverUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverUrl}
                alt={book.cover?.alt || book.title || ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-[#aaa]">
                No cover
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {book.status && (
              <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#c0392b]">
                {STATUS_LABELS[book.status]}
              </div>
            )}
            <h1 className="m-0 font-display text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#333] md:text-[2.5rem]">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="m-0 text-[16px] text-[#666]">{book.subtitle}</p>
            )}
            {book.authors?.length && (
              <p className="m-0 text-[15px] text-[#525252]">
                by {book.authors.join(", ")}
              </p>
            )}
            {book.rating != null && (
              <div className="mt-1">
                <StarRating value={book.rating} size={20} />
              </div>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {book.startedAt && (
                <>
                  <dt className="text-[#999]">Started</dt>
                  <dd className="m-0 text-[#333]">{formatDate(book.startedAt)}</dd>
                </>
              )}
              {book.finishedAt && (
                <>
                  <dt className="text-[#999]">Finished</dt>
                  <dd className="m-0 text-[#333]">{formatDate(book.finishedAt)}</dd>
                </>
              )}
              {book.pausedAt && (
                <>
                  <dt className="text-[#999]">Paused</dt>
                  <dd className="m-0 text-[#333]">{formatDate(book.pausedAt)}</dd>
                </>
              )}
              {book.pageCount && (
                <>
                  <dt className="text-[#999]">Pages</dt>
                  <dd className="m-0 text-[#333]">{book.pageCount}</dd>
                </>
              )}
              {book.publishedYear && (
                <>
                  <dt className="text-[#999]">Published</dt>
                  <dd className="m-0 text-[#333]">{book.publishedYear}</dd>
                </>
              )}
              {book.genres?.length && (
                <>
                  <dt className="text-[#999]">Genres</dt>
                  <dd className="m-0 text-[#333]">{book.genres.join(", ")}</dd>
                </>
              )}
            </dl>

            {book.externalLinks?.length && (
              <div className="mt-3 flex flex-wrap gap-3">
                {book.externalLinks.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border border-[#ddd] px-3 py-1.5 text-[13px] text-[#525252] no-underline transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                  >
                    {l.label} →
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        {book.review && book.review.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]">
              Review
            </h2>
            <div className="max-w-prose">
              <PortableText
                value={book.review}
                components={reviewComponents}
              />
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]">
              Reading History
            </h2>
            <ol className="m-0 list-none border-l border-[#e5e5e5] pl-5">
              {events.map((e) => (
                <li key={e._key} className="relative mb-5 last:mb-0">
                  <span className="absolute -left-[26px] top-[6px] block h-2 w-2 rounded-full bg-[#c0392b]" />
                  <div className="flex flex-col">
                    <div className="text-[14px] font-semibold text-[#333]">
                      {EVENT_LABELS[e.type] || e.type}
                      {e.type === "rated" && e.ratingValue != null && (
                        <span className="ml-2 inline-flex items-center align-middle">
                          <StarRating value={e.ratingValue} size={14} />
                        </span>
                      )}
                    </div>
                    {e.date && (
                      <time className="text-[12px] text-[#999]">
                        {formatDate(e.date)}
                      </time>
                    )}
                    {e.note && (
                      <p className="m-0 mt-1 text-[14px] text-[#525252]">
                        {e.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </PageShell>
  );
}
