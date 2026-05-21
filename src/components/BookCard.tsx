import Link from "next/link";

import { StarRating } from "@/components/StarRating";
import { urlFor } from "@/sanity/lib/image";
import type { BookSummary } from "@/sanity/lib/types";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function BookCard({
  book,
  size = "default",
}: {
  book: BookSummary;
  size?: "default" | "large";
}) {
  const isLarge = size === "large";
  const coverWidth = isLarge ? 240 : 160;
  const coverUrl = book.cover?.asset
    ? urlFor(book.cover)
        .width(coverWidth * 2)
        .height(coverWidth * 3)
        .fit("crop")
        .url()
    : null;
  const dateLine =
    book.status === "completed" && book.finishedAt
      ? `Finished ${formatDate(book.finishedAt)}`
      : book.status === "currently-reading" && book.startedAt
        ? `Started ${formatDate(book.startedAt)}`
        : book.status === "paused" && book.pausedAt
          ? `Paused ${formatDate(book.pausedAt)}`
          : null;

  return (
    <Link
      href={`/library/${book.slug}`}
      className="group flex flex-col gap-3 text-inherit no-underline"
    >
      <div
        className={`relative w-full overflow-hidden rounded-md border border-[#eee] bg-[#f3f3f3] transition-shadow group-hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]`}
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
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[12px] text-[#aaa]">
            No cover
          </div>
        )}
        {book.favorite && (
          <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c0392b]">
            ★ Favorite
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className={`m-0 font-display font-semibold leading-[1.25] text-[#1a1a1a] ${isLarge ? "text-[18px]" : "text-[15px]"}`}
        >
          {book.title}
        </h3>
        {book.authors && book.authors.length > 0 && (
          <p className="m-0 text-[13px] text-[#666]">{book.authors.join(", ")}</p>
        )}
        <div className="mt-1 flex items-center gap-3">
          {book.rating != null && <StarRating value={book.rating} size={14} />}
          {dateLine && (
            <span className="text-[12px] text-[#999]">{dateLine}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
