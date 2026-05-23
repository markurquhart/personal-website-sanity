// 10 styling variants of the SAME book single body layout.
//
// Layout is locked across every variant:
//   [rating + date]
//   [cover left]  [meta dl + review card on the right]
//   [book summary below]
//   [reading history below]
//
// Only the visual treatment of those elements changes between v1–v10
// (card chrome, label style, cover frame, dividers, typography).

import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { StarRating } from "@/components/StarRating";
import type { Book, BookEvent } from "@/sanity/lib/types";

type Props = {
  book: Book;
  coverUrl: string | null;
  dateLine: string | null;
  events: BookEvent[];
};

// ───── small helpers ──────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

// ───── theme tokens per variant ───────────────────────────────────────

type Theme = {
  // cover frame
  cover: string;
  coverShape: "rounded-sm" | "rounded-md" | "rounded-lg" | "rounded-none";
  coverShadow: string;
  // section labels
  label: string;
  labelPrefix?: string;
  // review card chrome
  card: string;
  cardLabel?: string; // override label color/style inside card
  // meta dl row treatment
  metaWrap?: string;
  dt: string;
  dd: string;
  metaRowDivider?: string; // e.g. "border-b border-dashed border-[#eee]"
  // dividers between sections
  divider: string;
  // reading-history dot
  historyDot: string;
  // summary body text
  summaryText: string;
};

function getTheme(variant: number): Theme {
  switch (variant) {
    // V2 — Soft tinted: cream review card, no shadow
    case 2:
      return {
        cover:
          "border border-[#eee] bg-[#f3f3f3] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]",
        coverShape: "rounded-md",
        coverShadow: "",
        label:
          "text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]",
        card: "rounded-lg bg-[#fdfaf3] p-6",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t border-[#e6e6e6]",
        historyDot: "bg-[#c0392b]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V3 — Editorial accent: red top stripe on card, sharp corners
    case 3:
      return {
        cover:
          "border border-[#111] bg-[#f3f3f3] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.25)]",
        coverShape: "rounded-none",
        coverShadow: "",
        label:
          "text-[13px] font-semibold uppercase tracking-[0.05em] text-[#111]",
        card: "border-t-[3px] border-[#c0392b] border-x border-b border-[#e6e6e6] bg-white p-6",
        dt: "text-[#999] uppercase tracking-[0.05em] text-[12px]",
        dd: "m-0 text-[#111]",
        divider: "border-t-[2px] border-[#111]",
        historyDot: "bg-[#111]",
        summaryText:
          "font-display text-[16px] leading-[1.75] text-[#1a1a1a] italic",
      };

    // V4 — Layered shadow / pillowy
    case 4:
      return {
        cover: "bg-[#f3f3f3] shadow-[0_24px_56px_-24px_rgba(0,0,0,0.35)]",
        coverShape: "rounded-lg",
        coverShadow: "",
        label:
          "text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]",
        card: "rounded-2xl bg-white p-7 shadow-[0_24px_56px_-24px_rgba(0,0,0,0.18)]",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t border-[#f0f0f0]",
        historyDot: "bg-[#c0392b]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V5 — Hairline modern: 1px lines, no shadow
    case 5:
      return {
        cover: "border border-[#ddd] bg-[#f3f3f3]",
        coverShape: "rounded-sm",
        coverShadow: "",
        label:
          "text-[12px] font-semibold uppercase tracking-[0.08em] text-[#737373]",
        card: "rounded-md border border-[#ddd] bg-white p-6",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t border-[#ddd]",
        historyDot: "bg-[#737373]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V6 — Pill / chip
    case 6:
      return {
        cover:
          "border border-[#eee] bg-[#f3f3f3] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]",
        coverShape: "rounded-lg",
        coverShadow: "",
        label:
          "text-[12px] font-semibold uppercase tracking-[0.06em] text-[#c0392b]",
        card: "rounded-3xl bg-[#f9f9f9] px-7 py-6",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t border-dashed border-[#ddd]",
        historyDot: "bg-[#c0392b] ring-2 ring-[#fcd9d4]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V7 — Underlined labels (tab-like)
    case 7:
      return {
        cover:
          "border border-[#eee] bg-[#f3f3f3] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]",
        coverShape: "rounded-md",
        coverShadow: "",
        label:
          "text-[13px] font-semibold uppercase tracking-[0.05em] text-[#1a1a1a] pb-2 border-b-2 border-[#c0392b] inline-block self-start",
        card: "rounded-md border border-[#e6e6e6] bg-white p-6",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t-[3px] border-[#111]",
        historyDot: "bg-[#c0392b]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V8 — Brutalist black + monospace
    case 8:
      return {
        cover: "border-[2px] border-[#111] bg-[#f3f3f3]",
        coverShape: "rounded-none",
        coverShadow: "",
        label:
          "font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[#111]",
        labelPrefix: "▸ ",
        card: "border-[2px] border-[#111] bg-white p-6",
        dt: "font-mono uppercase tracking-[0.05em] text-[12px] text-[#111]",
        dd: "m-0 text-[#111]",
        metaRowDivider: "border-b border-dashed border-[#ccc]",
        divider: "border-t-[2px] border-[#111]",
        historyDot: "bg-[#111] rounded-none w-2.5 h-2.5",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };

    // V9 — Soft palette / glassy
    case 9:
      return {
        cover: "border border-[#eee] bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]",
        coverShape: "rounded-lg",
        coverShadow: "",
        label:
          "text-[12px] font-medium uppercase tracking-[0.08em] text-[#9a9a9a]",
        card: "rounded-xl bg-[#f5f5f7] p-7",
        dt: "text-[#9a9a9a]",
        dd: "m-0 text-[#1a1a1a]",
        divider: "border-t border-[#ececec]",
        historyDot: "bg-[#c0392b]/70",
        summaryText: "text-[15px] leading-[1.8] text-[#525252]",
      };

    // V10 — Magazine print: serif card, deeper colors
    case 10:
      return {
        cover:
          "border border-[#222] bg-[#f3f3f3] shadow-[0_14px_36px_-14px_rgba(0,0,0,0.4)]",
        coverShape: "rounded-sm",
        coverShadow: "",
        label:
          "font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-[#222]",
        card: "border-[3px] border-double border-[#222] bg-[#fffaf2] p-7",
        cardLabel:
          "font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-[#c0392b]",
        dt: "font-display text-[#737373] italic",
        dd: "m-0 text-[#222]",
        divider: "border-t-[3px] border-double border-[#222]",
        historyDot: "bg-[#222]",
        summaryText: "font-display text-[16px] leading-[1.75] text-[#1a1a1a]",
      };

    // V1 — Default: clean white card, subtle shadow
    case 1:
    default:
      return {
        cover:
          "border border-[#eee] bg-[#f3f3f3] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]",
        coverShape: "rounded-md",
        coverShadow: "",
        label:
          "text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]",
        card: "rounded-lg border border-[#e6e6e6] bg-white p-6 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.1)]",
        dt: "text-[#999]",
        dd: "m-0 text-[#111]",
        divider: "border-t border-[#e6e6e6]",
        historyDot: "bg-[#c0392b]",
        summaryText: "text-[15px] leading-[1.75] text-[#404040]",
      };
  }
}

// ───── locked layout, themed ──────────────────────────────────────────

function SectionLabel({ theme, children }: { theme: Theme; children: string }) {
  return (
    <h2 className={`m-0 ${theme.label}`}>
      {theme.labelPrefix || ""}
      {children}
    </h2>
  );
}

export function BookSingleBody({
  variant,
  book,
  coverUrl,
  dateLine,
  events,
}: Props & { variant: number }) {
  const theme = getTheme(variant);
  const meta = getMetaItems(book);
  const hasReview = !!book.review?.length;
  // Card surfaces whenever there's anything to put in it: review text,
  // a star rating, or a favorite flag. If none of those exist the card
  // is omitted entirely and the dl reclaims the full width.
  const showCard = hasReview || book.rating != null || !!book.favorite;

  return (
    <>
      {/* Date stays under the title only when there's no review card to
          host it (e.g. an Up Next or unfilled book). When the card is
          rendered it includes the date as part of its meta line. */}
      {dateLine && !showCard && (
        <div className="text-[14px] text-[#888]">{dateLine}</div>
      )}

      {/* Cover left, [meta dl | review card] right */}
      <section className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <div
          className={`relative w-[200px] flex-shrink-0 overflow-hidden md:w-[240px] ${theme.coverShape} ${theme.cover} ${theme.coverShadow}`}
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

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-6">
            {/* Left: BOOK INFO label + dl */}
            <div
              className={`flex flex-col gap-4 ${
                showCard ? "md:w-[300px] md:flex-shrink-0" : "md:flex-1"
              }`}
            >
              <SectionLabel theme={theme}>Book Info</SectionLabel>
              <dl
                className={`m-0 grid gap-x-5 gap-y-2.5 text-[14px] leading-[1.5] md:grid-cols-[88px_minmax(0,1fr)] ${theme.metaWrap || ""}`}
              >
                {meta.map((m) => (
                  <div
                    key={m.label}
                    className={`contents ${theme.metaRowDivider ? "[&>*]:" + theme.metaRowDivider : ""}`}
                  >
                    <dt className={theme.dt}>{m.label}</dt>
                    <dd
                      className={`${theme.dd} ${m.mono ? "font-mono text-[13px] text-[#525252]" : ""}`}
                    >
                      {m.value}
                    </dd>
                  </div>
                ))}
                {book.externalLinks?.length ? (
                  <div className="contents">
                    <dt className={theme.dt}>Links</dt>
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

            {/* Right: MARK'S REVIEW label + card */}
            {showCard && (
              <div className="flex min-w-0 flex-1 flex-col gap-4 md:self-stretch">
                <SectionLabel theme={theme}>Mark&apos;s Review</SectionLabel>
                <div className={`flex flex-1 flex-col gap-3 ${theme.card}`}>
                  {(book.rating != null || book.favorite) && (
                    <div className="flex items-center justify-between gap-3">
                      {book.rating != null ? (
                        <StarRating value={book.rating} size={20} />
                      ) : (
                        <span />
                      )}
                      {book.favorite && (
                        <span className="inline-flex items-center rounded-full bg-[#fdecea] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c0392b]">
                          ★ Favorite
                        </span>
                      )}
                    </div>
                  )}
                  {dateLine && (
                    <div className="text-[13px] text-[#888]">{dateLine}</div>
                  )}
                  {hasReview ? (
                    <PortableText
                      value={book.review!}
                      components={reviewBlocks}
                    />
                  ) : (
                    <p className="m-0 text-[14px] italic text-[#999]">
                      No written review yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {book.summary && (
            <div className={`flex flex-col gap-4 pt-8 ${theme.divider}`}>
              <SectionLabel theme={theme}>Book Summary</SectionLabel>
              <div
                className={`whitespace-pre-line ${theme.summaryText}`}
              >
                {book.summary}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Reading history */}
      {events.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel theme={theme}>Reading History</SectionLabel>
          <ol className="m-0 list-none border-l border-[#e5e5e5] pl-5">
            {events.map((e) => (
              <li key={e._key} className="relative mb-5 last:mb-0">
                <span
                  className={`absolute -left-[26px] top-[6px] block h-2 w-2 rounded-full ${theme.historyDot}`}
                />
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
    </>
  );
}

export const VARIANT_LABELS: Record<number, string> = {
  1: "Clean — white card, subtle shadow",
  2: "Soft tinted — cream card, no shadow",
  3: "Editorial — red top stripe, sharp corners",
  4: "Pillowy — rounded-2xl, deep soft shadow",
  5: "Hairline — 1px borders, no shadow",
  6: "Pill — large rounded card, dashed divider",
  7: "Tab — underlined section labels",
  8: "Brutalist — black borders, monospace labels",
  9: "Soft palette — pale gray card, no border",
  10: "Magazine — double border, serif labels",
};
