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

// Empty-state copy for the Notes card varies by status so an Up Next
// book reads "Haven't started yet" instead of "No notes yet".
function getNotesEmptyMessage(status: string | null | undefined): string {
  switch (status) {
    case "currently-reading":
      return "No notes yet — still reading.";
    case "paused":
      return "Paused mid-read. No notes captured.";
    case "up-next":
      return "Haven't started this one yet.";
    case "completed":
    default:
      return "No written review yet.";
  }
}

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

const reviewBlocks: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-4 text-[15px] leading-[1.65] text-[#404040] last:mb-0">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-[#c0392b] pl-4 italic text-[#525252] last:mb-0">
        {children}
      </blockquote>
    ),
  },
};

// Small caps section label used for BOOK INFO, MY RATING, MY NOTES,
// BOOK SUMMARY, READING HISTORY. Black so the label reads as a clear
// section header.
const LABEL_CLASS =
  "m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#111]";

type MetaItem = { label: string; value: string; mono?: boolean };

function getMetaItems(book: Book): MetaItem[] {
  const items: (MetaItem | false)[] = [
    book.authors?.length
      ? { label: "Author", value: book.authors.join(", ") }
      : false,
    book.subtitle ? { label: "Subtitle", value: book.subtitle } : false,
    book.kind
      ? {
          label: "Type",
          value: book.kind === "fiction" ? "Fiction" : "Non-Fiction",
        }
      : false,
    book.publishedYear
      ? { label: "Published", value: String(book.publishedYear) }
      : false,
    book.pageCount ? { label: "Pages", value: String(book.pageCount) } : false,
    book.genres?.length
      ? { label: "Genres", value: book.genres.join(", ") }
      : false,
    book.isbn ? { label: "ISBN", value: book.isbn, mono: true } : false,
    book.addedAt ? { label: "Added", value: formatDate(book.addedAt) } : false,
  ];
  return items.filter(Boolean) as MetaItem[];
}

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
  const meta = getMetaItems(book);
  const hasReview = !!book.review?.length;
  const notesEmpty = getNotesEmptyMessage(book.status);

  // Every status gets a contextual date for the card. Falls back to
  // `addedAt` for books that don't have a status-specific date yet.
  const dateLine = (() => {
    if (book.status === "completed" && book.finishedAt)
      return `Finished ${formatDate(book.finishedAt)}`;
    if (book.status === "currently-reading" && book.startedAt)
      return `Started ${formatDate(book.startedAt)}`;
    if (book.status === "paused" && book.pausedAt)
      return `Paused ${formatDate(book.pausedAt)}`;
    if (book.addedAt) return `Added ${formatDate(book.addedAt)}`;
    return null;
  })();

  return (
    <PageShell hideMobileProfile>
      <article className="flex flex-col gap-8 px-5 pt-[22px] pb-[60px] xl:px-0">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Library
        </Link>

        <header className="flex flex-col gap-4">
          {book.status && (
            <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#c0392b]">
              {STATUS_LABELS[book.status]}
            </div>
          )}
          <h1 className="m-0 font-display text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#111] md:text-[2.75rem]">
            {book.title}
          </h1>
          {dateLine && (
            <div className="text-[14px] text-[#888]">{dateLine}</div>
          )}
        </header>

        {/* Cover left, [Book Info dl | morphing card] right. The card
            always renders; its label + empty-state copy changes by
            status so the layout stays consistent for every book. */}
        <section className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
          <div
            className="relative w-[200px] flex-shrink-0 overflow-hidden rounded-lg border border-[#eee] bg-[#f3f3f3] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] md:w-[240px]"
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

          <div className="flex min-w-0 flex-1 flex-col gap-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
              {/* BOOK INFO column */}
              <div className="flex flex-col gap-4 lg:w-[300px] lg:flex-shrink-0">
                <h2 className={LABEL_CLASS}>Book Info</h2>
                <dl className="m-0 grid gap-x-5 gap-y-2.5 text-[14px] leading-[1.5] md:grid-cols-[88px_minmax(0,1fr)]">
                  {meta.map((m) => (
                    <div key={m.label} className="contents">
                      <dt className="text-[#999]">{m.label}</dt>
                      <dd
                        className={`m-0 text-[#111] ${m.mono ? "font-mono text-[13px] text-[#525252]" : ""}`}
                      >
                        {m.value}
                      </dd>
                    </div>
                  ))}
                  {book.externalLinks?.length ? (
                    <div className="contents">
                      <dt className="text-[#999]">Links</dt>
                      <dd className="m-0 flex flex-wrap gap-x-3 gap-y-1">
                        {book.externalLinks.map((l) => (
                          <a
                            key={l.url}
                            href={l.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[#111] underline decoration-[#ddd] underline-offset-4 transition-colors hover:decoration-[#c0392b]"
                          >
                            {l.label}
                          </a>
                        ))}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {/* Right side: My Rating section, then My Notes card. */}
              <div className="flex min-w-0 flex-1 flex-col gap-10 lg:self-stretch">
                <div className="flex flex-col gap-4">
                  <h2 className={LABEL_CLASS}>My Rating</h2>
                  <div className="flex items-center gap-4">
                    <StarRating value={book.rating ?? 0} size={22} />
                    {book.favorite && (
                      <span className="inline-flex items-center rounded-full bg-[#fdecea] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c0392b]">
                        ★ Favorite
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className={LABEL_CLASS}>My Notes</h2>
                  <div className="rounded-3xl bg-[#f9f9f9] px-7 py-6">
                    {hasReview ? (
                      <PortableText
                        value={book.review!}
                        components={reviewBlocks}
                      />
                    ) : (
                      <p className="m-0 text-[14px] italic text-[#999]">
                        {notesEmpty}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {book.summary && (
              <div className="flex flex-col gap-4 border-t border-dashed border-[#ddd] pt-8">
                <h2 className={LABEL_CLASS}>Book Summary</h2>
                <div className="whitespace-pre-line text-[15px] leading-[1.75] text-[#404040]">
                  {book.summary}
                </div>
              </div>
            )}
          </div>
        </section>

        {events.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className={LABEL_CLASS}>Reading History</h2>
            <ol className="m-0 list-none border-l border-[#e5e5e5] pl-5">
              {events.map((e) => (
                <li key={e._key} className="relative mb-5 last:mb-0">
                  <span className="absolute -left-[26px] top-[6px] block h-2 w-2 rounded-full bg-[#c0392b] ring-2 ring-[#fcd9d4]" />
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
