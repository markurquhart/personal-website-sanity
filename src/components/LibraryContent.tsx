"use client";

import { useMemo, useState } from "react";

import { BookCard } from "@/components/BookCard";
import type { BookStatus, BookSummary } from "@/sanity/lib/types";

type TabKey = BookStatus | "all";

const TABS: { label: string; value: TabKey; emptyText: string }[] = [
  { label: "All", value: "all", emptyText: "Nothing in the library yet." },
  {
    label: "Currently Reading",
    value: "currently-reading",
    emptyText: "Nothing in progress.",
  },
  { label: "Up Next", value: "up-next", emptyText: "Nothing queued." },
  {
    label: "Completed",
    value: "completed",
    emptyText: "No completed books yet.",
  },
  { label: "Paused", value: "paused", emptyText: "Nothing paused." },
];

// Order of sections within the "All" view
const SECTION_ORDER: BookStatus[] = [
  "currently-reading",
  "up-next",
  "paused",
  "completed",
];

const SECTION_LABEL: Record<BookStatus, string> = {
  "currently-reading": "Currently Reading",
  "up-next": "Up Next",
  paused: "Paused",
  completed: "Completed",
};

function sortFor(status: BookStatus, books: BookSummary[]) {
  const arr = [...books];
  if (status === "completed") {
    arr.sort(
      (a, b) =>
        new Date(b.finishedAt || 0).getTime() -
        new Date(a.finishedAt || 0).getTime(),
    );
  } else if (status === "currently-reading") {
    arr.sort(
      (a, b) =>
        new Date(b.startedAt || 0).getTime() -
        new Date(a.startedAt || 0).getTime(),
    );
  } else if (status === "paused") {
    arr.sort(
      (a, b) =>
        new Date(b.pausedAt || 0).getTime() -
        new Date(a.pausedAt || 0).getTime(),
    );
  } else {
    arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }
  return arr;
}

export function LibraryContent({ books }: { books: BookSummary[] }) {
  const [active, setActive] = useState<TabKey>("all");
  const [genre, setGenre] = useState<string | "all">("all");

  // Apply genre filter once, before grouping/sorting per status
  const filteredBooks = useMemo(
    () =>
      genre === "all"
        ? books
        : books.filter((b) => (b.genres || []).includes(genre)),
    [books, genre],
  );

  // Group by status for both the "All" sections and per-tab counts
  const grouped = useMemo(() => {
    const by: Record<string, BookSummary[]> = {};
    for (const b of filteredBooks) {
      const k = b.status || "up-next";
      (by[k] ||= []).push(b);
    }
    return by;
  }, [filteredBooks]);

  const allGenres = useMemo(() => {
    const g = new Set<string>();
    for (const b of books) (b.genres || []).forEach((x) => g.add(x));
    return Array.from(g).sort();
  }, [books]);

  // Counts for the pill labels are from the unfiltered set so users can
  // see total per status at a glance.
  const totalCounts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const b of books) {
      const k = b.status || "up-next";
      by[k] = (by[k] || 0) + 1;
    }
    by.all = books.length;
    return by;
  }, [books]);

  return (
    <div className="flex min-h-screen flex-col gap-8 px-5 py-[22px] pb-[42px] xl:px-0">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-display text-[2.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-[#333]">
          Library
        </h1>
        <p className="m-0 text-[15px] leading-[1.5] text-[#888]">
          What I&apos;m reading, plan to read, finished, or set aside.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e5] pb-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setActive(t.value)}
              className={`cursor-pointer rounded-full border px-[14px] py-[6px] text-[13px] font-medium transition-all duration-200 ${
                active === t.value
                  ? "border-[#333] bg-[#333] text-white"
                  : "border-[#ddd] bg-white text-[#666] hover:border-[#333] hover:text-[#333]"
              }`}
            >
              {t.label}
              {totalCounts[t.value] > 0 ? ` (${totalCounts[t.value]})` : ""}
            </button>
          ))}
        </div>
        {allGenres.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#999]">Genre:</span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="cursor-pointer rounded-[4px] border border-[#ddd] bg-white px-2 py-1 text-[12px] text-[#333] focus:border-[#333] focus:outline-none"
            >
              <option value="all">All</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {active === "all" ? (
        <AllView grouped={grouped} totalCount={filteredBooks.length} />
      ) : (
        <SingleStatusView
          status={active}
          books={sortFor(active, grouped[active] || [])}
          emptyText={
            TABS.find((t) => t.value === active)?.emptyText ?? "Nothing here."
          }
        />
      )}
    </div>
  );
}

function AllView({
  grouped,
  totalCount,
}: {
  grouped: Record<string, BookSummary[]>;
  totalCount: number;
}) {
  if (totalCount === 0) {
    return (
      <p className="text-[14px] text-[#888]">
        Nothing in the library yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-10">
      {SECTION_ORDER.map((status) => {
        const list = sortFor(status, grouped[status] || []);
        if (list.length === 0) return null;
        return (
          <section key={status} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between border-b border-[#e5e5e5] pb-2">
              <h2 className="m-0 font-display text-[1.25rem] font-semibold text-[#333]">
                {SECTION_LABEL[status]}
              </h2>
              <span className="text-[12px] uppercase tracking-[0.05em] text-[#999]">
                {list.length} {list.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {list.map((b) => (
                <BookCard key={b._id} book={b} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SingleStatusView({
  status,
  books,
  emptyText,
}: {
  status: BookStatus;
  books: BookSummary[];
  emptyText: string;
}) {
  if (books.length === 0) {
    return <p className="text-[14px] text-[#888]">{emptyText}</p>;
  }
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between border-b border-[#e5e5e5] pb-2">
        <h2 className="m-0 font-display text-[1.25rem] font-semibold text-[#333]">
          {SECTION_LABEL[status]}
        </h2>
        <span className="text-[12px] uppercase tracking-[0.05em] text-[#999]">
          {books.length} {books.length === 1 ? "book" : "books"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {books.map((b) => (
          <BookCard key={b._id} book={b} />
        ))}
      </div>
    </section>
  );
}
