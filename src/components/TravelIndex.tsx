"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { FilterPill } from "@/components/FilterPill";
import { TripCard } from "@/components/TripCard";
import {
  TripTable,
  type SortDir,
  type SortField,
} from "@/components/TripTable";
import type { MapBounds } from "@/components/TravelMap";
import type { TripCategory, TripSummary } from "@/sanity/lib/types";

const TravelMap = dynamic(
  () => import("@/components/TravelMap").then((m) => m.TravelMap),
  { ssr: false, loading: () => <MapPlaceholder /> },
);

function isInBounds(trip: TripSummary, bounds: MapBounds): boolean {
  const loc = trip.location;
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return false;
  }
  if (loc.lat < bounds.south || loc.lat > bounds.north) return false;
  // Longitude can wrap across the antimeridian when the view crosses it.
  if (bounds.west <= bounds.east) {
    return loc.lng >= bounds.west && loc.lng <= bounds.east;
  }
  return loc.lng >= bounds.west || loc.lng <= bounds.east;
}

function MapPlaceholder() {
  return (
    <div className="flex h-[360px] w-full items-center justify-center rounded-[12px] border border-[#ebebeb] bg-[#fafafa] text-[12px] text-[#999] xl:h-[460px]">
      Loading map…
    </div>
  );
}

type CategoryKey = TripCategory | "all";

const CATEGORY_OPTIONS: { label: string; value: CategoryKey }[] = [
  { label: "All", value: "all" },
  { label: "Personal", value: "personal" },
  { label: "Family", value: "family" },
  { label: "Work", value: "work" },
];

const CATEGORY_RANK: Record<TripCategory, number> = {
  personal: 0,
  family: 1,
  work: 2,
};

function compareTrips(
  a: TripSummary,
  b: TripSummary,
  field: SortField,
): number {
  switch (field) {
    case "title":
      return (a.title || "").localeCompare(b.title || "");
    case "city":
      return (a.city || "").localeCompare(b.city || "");
    case "state":
      return (a.state || "").localeCompare(b.state || "");
    case "country":
      return (a.country || "").localeCompare(b.country || "");
    case "category": {
      const ar = CATEGORY_RANK[(a.category as TripCategory) ?? "personal"];
      const br = CATEGORY_RANK[(b.category as TripCategory) ?? "personal"];
      return ar - br;
    }
    case "startedAt":
    default: {
      const ad = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bd = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return ad - bd;
    }
  }
}

function TravelHeader() {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="m-0 font-display text-[2.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-[#333]">
        Travel
      </h1>
      <p className="m-0 max-w-[44rem] text-[15px] leading-[1.5] text-[#888]">
        A log of trips — work, family, and just-because. Click a pin or a row
        for the full story.
      </p>
    </header>
  );
}

export function TravelIndex({ trips }: { trips: TripSummary[] }) {
  const [category, setCategory] = useState<CategoryKey>("all");
  const [year, setYear] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("startedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const trip of trips) {
      if (trip.startedAt) years.add(new Date(trip.startedAt).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [trips]);

  const filtered = useMemo(() => {
    return trips.filter((trip) => {
      if (category !== "all" && trip.category !== category) return false;
      if (year !== "all") {
        const tripYear = trip.startedAt
          ? new Date(trip.startedAt).getFullYear()
          : null;
        if (String(tripYear) !== year) return false;
      }
      return true;
    });
  }, [trips, category, year]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = compareTrips(a, b, sortField);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  // Trips whose coordinates fall inside the current map viewport.
  // Until the map has reported bounds, show everything in `sorted`.
  const inView = useMemo(() => {
    if (!bounds) return sorted;
    return sorted.filter((trip) => isInBounds(trip, bounds));
  }, [sorted, bounds]);

  const counts: Record<CategoryKey, number> = useMemo(() => {
    const yearFiltered =
      year === "all"
        ? trips
        : trips.filter(
            (t) =>
              t.startedAt &&
              String(new Date(t.startedAt).getFullYear()) === year,
          );
    return {
      all: yearFiltered.length,
      personal: yearFiltered.filter((t) => t.category === "personal").length,
      family: yearFiltered.filter((t) => t.category === "family").length,
      work: yearFiltered.filter((t) => t.category === "work").length,
    };
  }, [trips, year]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      const alpha =
        field === "title" ||
        field === "city" ||
        field === "state" ||
        field === "country";
      setSortDir(alpha ? "asc" : "desc");
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 px-5 py-[22px] pb-[60px] xl:px-0">
      <TravelHeader />

      <TravelMap trips={sorted} onBoundsChange={setBounds} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e5] pb-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <FilterPill
              key={option.value}
              active={category === option.value}
              onClick={() => setCategory(option.value)}
              label={option.label}
              count={counts[option.value] || 0}
            />
          ))}
        </div>

        {allYears.length > 0 && (
          <label className="block w-full xl:w-auto">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Filter trips by year"
              className="w-full cursor-pointer rounded-full border border-[#ddd] bg-white px-4 py-[7px] text-[13px] text-[#333] focus:border-[#333] focus:outline-none xl:w-[160px]"
            >
              <option value="all">All years</option>
              {allYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-[14px] text-[#888]">No trips match these filters.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-[12px] text-[#888]">
            <span>
              Showing <span className="font-medium text-[#333]">{inView.length}</span>{" "}
              of {sorted.length} trips
              {inView.length < sorted.length && (
                <span className="text-[#888]"> in the current map view</span>
              )}
            </span>
            {inView.length < sorted.length && (
              <span className="text-[11px] uppercase tracking-[0.06em] text-[#aaa]">
                Pan or zoom the map to update
              </span>
            )}
          </div>

          {inView.length === 0 ? (
            <p className="text-[14px] text-[#888]">
              No trips are inside the current map view. Pan or zoom out to see
              more.
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="grid grid-cols-1 gap-5 xl:hidden">
                {inView.map((trip) => (
                  <TripCard key={trip._id} trip={trip} />
                ))}
              </div>

              {/* Desktop: sortable table */}
              <div className="hidden xl:block">
                <TripTable
                  trips={inView}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
