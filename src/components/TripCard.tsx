import Link from "next/link";

import { CategoryBadge } from "@/components/CategoryBadge";
import { urlFor } from "@/sanity/lib/image";
import type { TripSummary } from "@/sanity/lib/types";

function formatRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  const s = start ? fmt(start) : "";
  const e = end ? fmt(end) : "";
  if (s && e && s === e) return s;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const coverUrl = trip.cover?.asset
    ? urlFor(trip.cover).width(720).height(420).fit("crop").url()
    : null;
  const category = trip.category ?? "personal";
  const where = [trip.city, trip.state, trip.country].filter(Boolean).join(", ");
  const range = formatRange(trip.startedAt, trip.endedAt);

  return (
    <Link
      href={`/travel/${trip.slug}`}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-[#ebe9e3] bg-white text-inherit no-underline transition-all duration-200 hover:-translate-y-[1px] hover:border-[#d8d6cf] hover:shadow-[0_18px_38px_-24px_rgba(17,24,39,0.22)]"
    >
      <div
        className="relative w-full overflow-hidden border-b border-[#efede7] bg-[#f4f2ee]"
        style={{ aspectRatio: "16 / 9" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={trip.cover?.alt || trip.title || ""}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-[#aaa]">
            No cover
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={category} size="sm" />
          {range && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]">
              {range}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="m-0 truncate font-display text-[1.1rem] font-semibold leading-[1.2] text-[#171717]">
            {trip.title}
          </h3>
          {where && (
            <p className="m-0 truncate text-[13px] text-[#666]">{where}</p>
          )}
        </div>

        {trip.summary && (
          <p className="m-0 line-clamp-2 text-[13px] leading-[1.6] text-[#8a8a8a]">
            {trip.summary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-end text-[12px] text-[#999]">
          <span className="font-medium text-[#1a1a1a] transition-transform duration-200 group-hover:translate-x-0.5">
            Open trip →
          </span>
        </div>
      </div>
    </Link>
  );
}
