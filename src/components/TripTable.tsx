"use client";

import Link from "next/link";

import { CategoryBadge } from "@/components/CategoryBadge";
import { urlFor } from "@/sanity/lib/image";
import type { TripSummary } from "@/sanity/lib/types";

export type SortField =
  | "title"
  | "category"
  | "startedAt"
  | "city"
  | "state"
  | "country";
export type SortDir = "asc" | "desc";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortHeader({
  label,
  field,
  active,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  active: boolean;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  return (
    <th
      scope="col"
      className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737373]"
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-[#171717] ${active ? "text-[#171717]" : ""}`}
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={`inline-block text-[10px] leading-none transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
        >
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function TripTable({
  trips,
  sortField,
  sortDir,
  onSort,
}: {
  trips: TripSummary[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#ebe9e3] bg-white shadow-[0_2px_8px_-4px_rgba(15,23,42,0.06)]">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-[#ebe9e3] bg-[#fafaf7]">
          <tr>
            <th
              scope="col"
              className="w-[64px] py-3 pl-4"
              aria-label="Cover"
            />
            <SortHeader
              label="Trip"
              field="title"
              active={sortField === "title"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="City"
              field="city"
              active={sortField === "city"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="State"
              field="state"
              active={sortField === "state"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Country"
              field="country"
              active={sortField === "country"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Category"
              field="category"
              active={sortField === "category"}
              dir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Dates"
              field="startedAt"
              active={sortField === "startedAt"}
              dir={sortDir}
              onSort={onSort}
            />
            <th
              scope="col"
              className="w-[40px] px-3 py-3"
              aria-label="Open trip"
            />
          </tr>
        </thead>
        <tbody>
          {trips.map((trip, i) => {
            const coverUrl = trip.cover?.asset
              ? urlFor(trip.cover).width(160).height(120).fit("crop").url()
              : null;
            const category = trip.category ?? "personal";
            const dates =
              trip.startedAt && trip.endedAt
                ? `${formatDate(trip.startedAt)} – ${formatDate(trip.endedAt)}`
                : formatDate(trip.startedAt) ||
                  formatDate(trip.endedAt) ||
                  "—";

            return (
              <tr
                key={trip._id}
                className={`group cursor-pointer transition-colors hover:bg-[#fafaf7] ${i > 0 ? "border-t border-[#f1efe9]" : ""}`}
              >
                <td className="py-3 pl-4 align-middle">
                  <Link
                    href={`/travel/${trip.slug}`}
                    aria-label={`Open ${trip.title ?? "trip"}`}
                    className="block"
                  >
                    <div
                      className="relative w-[48px] overflow-hidden rounded-[6px] border border-[#efede7] bg-[#f4f2ee]"
                      style={{ aspectRatio: "4 / 3" }}
                    >
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-[0.06em] text-[#bbb]">
                          —
                        </div>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3 align-middle">
                  <Link
                    href={`/travel/${trip.slug}`}
                    className="block text-inherit no-underline"
                  >
                    <div className="m-0 font-display text-[14px] font-semibold leading-[1.25] text-[#171717]">
                      {trip.title}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3 align-middle text-[13px] text-[#525252]">
                  {trip.city || "—"}
                </td>
                <td className="px-3 py-3 align-middle text-[13px] text-[#525252]">
                  {trip.state || "—"}
                </td>
                <td className="px-3 py-3 align-middle text-[13px] text-[#525252]">
                  {trip.country || "—"}
                </td>
                <td className="px-3 py-3 align-middle">
                  <CategoryBadge category={category} size="sm" />
                </td>
                <td className="px-3 py-3 align-middle text-[13px] text-[#525252] tabular-nums">
                  {dates}
                </td>
                <td className="px-3 py-3 text-right align-middle">
                  <Link
                    href={`/travel/${trip.slug}`}
                    aria-label={`Open ${trip.title ?? "trip"}`}
                    className="inline-flex items-center text-[14px] text-[#999] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#171717]"
                  >
                    →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
