"use client";

import { useMemo, useState } from "react";

import { BookCard } from "@/components/BookCard";
import type { BookStatus, BookSummary } from "@/sanity/lib/types";

const TABS: { label: string; value: BookStatus | "all"; emptyText: string }[] = [
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

function sortFor(status: BookStatus | "all", books: BookSummary[]) {
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
  const [active, setActive] = useState<BookStatus | "all">("currently-reading");
  const [genre, setGenre] = useState<string | "all">("all");

  const grouped = useMemo(() => {
    const by: Record<string, BookSummary[]> = {};
    for (const b of books) {
      const k = b.status || "up-next";
      (by[k] ||= []).push(b);
    }
    return by;
  }, [books]);

  const allGenres = useMemo(() => {
    const g = new Set<string>();
    for (const b of books) (b.genres || []).forEach((x) => g.add(x));
    return Array.from(g).sort();
  }, [books]);

  const visible = useMemo(() => {
    const list = grouped[active] || [];
    const filtered =
      genre === "all" ? list : list.filter((b) => (b.genres || []).includes(genre));
    return sortFor(active, filtered);
  }, [grouped, active, genre]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.value, (grouped[t.value] || []).length]),
      ) as Record<string, number>,
    [grouped],
  );

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
              {counts[t.value] > 0 ? ` (${counts[t.value]})` : ""}
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

      {visible.length === 0 ? (
        <p className="text-[14px] text-[#888]">
          {TABS.find((t) => t.value === active)?.emptyText}
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {visible.map((b) => (
            <BookCard key={b._id} book={b} />
          ))}
        </section>
      )}
    </div>
  );
}
