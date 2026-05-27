import Link from "next/link";

import { StarRating } from "@/components/StarRating";
import { urlFor } from "@/sanity/lib/image";
import type { BookStatus, BookSummary } from "@/sanity/lib/types";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status?: BookStatus | null) {
  if (status === "currently-reading") return "Currently Reading";
  if (status === "up-next") return "Next";
  if (status === "completed") return "Completed";
  if (status === "paused") return "TBR";
  return null;
}

function kindLabel(kind?: BookSummary["kind"]) {
  if (kind === "fiction") return "Fiction";
  if (kind === "non-fiction") return "Non-Fiction";
  return null;
}

function dateLine(book: BookSummary) {
  if (book.status === "completed" && book.finishedAt) {
    return `Finished ${formatDate(book.finishedAt)}`;
  }
  if (book.status === "currently-reading" && book.startedAt) {
    return `Started ${formatDate(book.startedAt)}`;
  }
  if (book.status === "paused" && book.pausedAt) {
    return `TBR since ${formatDate(book.pausedAt)}`;
  }
  if (book.addedAt) {
    return `Added ${formatDate(book.addedAt)}`;
  }
  return null;
}

export function BookListItem({ book }: { book: BookSummary }) {
  const coverUrl = book.cover?.asset
    ? urlFor(book.cover).width(240).height(360).fit("crop").url()
    : null;
  const label = statusLabel(book.status);
  const meta = [
    kindLabel(book.kind),
    book.genres?.slice(0, 2).join(" / "),
    book.pageCount ? `${book.pageCount} pages` : null,
    book.publishedYear ? String(book.publishedYear) : null,
  ].filter(Boolean);
  const bookDateLine = dateLine(book);

  return (
    <Link
      href={`/library/${book.slug}`}
      className="group flex gap-4 rounded-[18px] border border-[#ebe9e3] bg-white p-4 text-inherit no-underline transition-all duration-200 hover:-translate-y-[1px] hover:border-[#d8d6cf] hover:shadow-[0_18px_38px_-24px_rgba(17,24,39,0.22)] xl:p-5"
    >
      <div
        className="relative w-[86px] flex-shrink-0 overflow-hidden rounded-[12px] border border-[#efede7] bg-[#f4f2ee] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.3)] xl:w-[100px]"
        style={{ aspectRatio: "2 / 3" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={book.cover?.alt || book.title || ""}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-[#aaa]">
            No cover
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]">
          {label && <span className="text-[#c0392b]">{label}</span>}
          {book.favorite && <span>Favorite</span>}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="m-0 truncate font-display text-[1.1rem] font-semibold leading-[1.2] text-[#171717]">
            {book.title}
          </h3>
          {book.subtitle && (
            <p className="m-0 truncate text-[13px] text-[#757575]">{book.subtitle}</p>
          )}
          {book.authors?.length ? (
            <p className="m-0 truncate text-[13px] text-[#666]">
              {book.authors.join(", ")}
            </p>
          ) : null}
        </div>

        {meta.length > 0 && (
          <p className="m-0 text-[12px] leading-[1.6] text-[#8a8a8a]">
            {meta.join(" · ")}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#999]">
          <div className="flex flex-wrap items-center gap-3">
            {book.rating != null && <StarRating value={book.rating} size={14} />}
            {bookDateLine && <span>{bookDateLine}</span>}
          </div>
          <span className="font-medium text-[#1a1a1a] transition-transform duration-200 group-hover:translate-x-0.5">
            Open book →
          </span>
        </div>
      </div>
    </Link>
  );
}
