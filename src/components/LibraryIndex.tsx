"use client";

import { useMemo, useState } from "react";

import { BookListItem } from "@/components/BookListItem";
import type { BookStatus, BookSummary } from "@/sanity/lib/types";

type FocusKey = BookStatus | "all";

const FOCUS_OPTIONS: { label: string; value: FocusKey; emptyText: string }[] = [
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

const SECTION_LABEL: Record<BookStatus, string> = {
  "currently-reading": "Currently Reading",
  "up-next": "Up Next",
  paused: "Paused",
  completed: "Completed",
};

const SECTION_DESCRIPTION: Record<BookStatus, string> = {
  "currently-reading": "The books I am actively spending time with right now.",
  "up-next": "The next stack on deck once I finish the current read.",
  paused: "Books I set aside for now, but plan to revisit.",
  completed: "The finished shelf, with ratings and finish dates for quick browsing.",
};

const SECTION_ORDER: BookStatus[] = [
  "currently-reading",
  "up-next",
  "paused",
  "completed",
];

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
    arr.sort((a, b) => {
      const ad = new Date(a.addedAt || 0).getTime();
      const bd = new Date(b.addedAt || 0).getTime();
      if (ad !== bd) return bd - ad;
      return (a.title || "").localeCompare(b.title || "");
    });
  }
  return arr;
}

function matchesSearch(book: BookSummary, query: string) {
  const haystack = [
    book.title,
    book.subtitle,
    ...(book.authors || []),
    ...(book.genres || []),
    book.kind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function SnapshotCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-[#ececec] bg-white px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]">
        {label}
      </div>
      <div className="mt-2 font-display text-[1.6rem] font-semibold leading-none text-[#1f1f1f]">
        {value}
      </div>
    </div>
  );
}

function FocusButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-[12px] py-[5px] text-[12px] font-medium transition-colors ${
        active
          ? "bg-[#333] text-white"
          : "bg-white text-[#666] hover:bg-[#f1f1f1] hover:text-[#111]"
      }`}
    >
      {children}
    </button>
  );
}

function LibraryHeader({
  visibleCount,
  totalCounts,
}: {
  visibleCount: number;
  totalCounts: Record<string, number>;
}) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-display text-[2.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-[#333]">
            Library
          </h1>
          <p className="m-0 max-w-[42rem] text-[15px] leading-[1.65] text-[#888]">
            A denser browsing surface focused on scanability, quick comparisons,
            and still keeping the reading-status sections visible when browsing all.
          </p>
        </div>
        <div className="text-[13px] text-[#8a8a8a]">
          {visibleCount} {visibleCount === 1 ? "result" : "results"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SnapshotCard
          label="Currently Reading"
          value={totalCounts["currently-reading"] || 0}
        />
        <SnapshotCard label="Up Next" value={totalCounts["up-next"] || 0} />
        <SnapshotCard label="Completed" value={totalCounts.completed || 0} />
        <SnapshotCard label="Paused" value={totalCounts.paused || 0} />
      </div>
    </header>
  );
}

function FilterPanel({
  focus,
  onFocusChange,
  genre,
  onGenreChange,
  allGenres,
  search,
  onSearchChange,
}: {
  focus: FocusKey;
  onFocusChange: (value: FocusKey) => void;
  genre: string | "all";
  onGenreChange: (value: string | "all") => void;
  allGenres: string[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-[18px] border border-[#ececec] bg-[#fafafa] p-5 xl:flex-row xl:items-end xl:justify-between xl:p-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]">
            Focus
          </span>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((option) => (
              <FocusButton
                key={option.value}
                active={focus === option.value}
                onClick={() => onFocusChange(option.value)}
              >
                {option.label}
              </FocusButton>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]">
            Search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Title, author, genre..."
            className="w-full rounded-[10px] border border-[#ddd] bg-white px-3 py-2.5 text-[14px] text-[#333] outline-none transition-colors focus:border-[#333]"
          />
        </label>
      </div>
      {allGenres.length > 0 ? (
        <label className="flex flex-col gap-2 text-[12px] text-[#999]">
          <span className="font-semibold uppercase tracking-[0.08em]">Genre</span>
          <select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="cursor-pointer rounded-[8px] border border-[#ddd] bg-white px-3 py-2 text-[13px] text-[#333] focus:border-[#333] focus:outline-none"
          >
            <option value="all">All genres</option>
            {allGenres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}

function CatalogGrid({ books }: { books: BookSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start">
      {books.map((book) => (
        <BookListItem key={book._id} book={book} />
      ))}
    </div>
  );
}

function CatalogView({
  books,
  status,
  emptyText,
}: {
  books: BookSummary[];
  status: BookStatus;
  emptyText: string;
}) {
  if (books.length === 0) {
    return <p className="text-[14px] text-[#888]">{emptyText}</p>;
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[1.4rem] font-semibold text-[#222]">
            {SECTION_LABEL[status]}
          </h2>
          <p className="m-0 text-[14px] leading-[1.6] text-[#8a8a8a]">
            {SECTION_DESCRIPTION[status]}
          </p>
        </div>
        <span className="text-[12px] uppercase tracking-[0.06em] text-[#999]">
          {books.length} {books.length === 1 ? "book" : "books"}
        </span>
      </div>

      <CatalogGrid books={books} />
    </section>
  );
}

function CatalogAllView({
  grouped,
  totalCount,
}: {
  grouped: Record<string, BookSummary[]>;
  totalCount: number;
}) {
  if (totalCount === 0) {
    return <p className="text-[14px] text-[#888]">Nothing in the library yet.</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      {SECTION_ORDER.map((status) => {
        const sectionBooks = sortFor(status, grouped[status] || []);
        if (sectionBooks.length === 0) return null;

        return (
          <section key={status} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 font-display text-[1.4rem] font-semibold text-[#222]">
                  {SECTION_LABEL[status]}
                </h2>
                <p className="m-0 text-[14px] leading-[1.6] text-[#8a8a8a]">
                  {SECTION_DESCRIPTION[status]}
                </p>
              </div>
              <span className="text-[12px] uppercase tracking-[0.06em] text-[#999]">
                {sectionBooks.length} {sectionBooks.length === 1 ? "book" : "books"}
              </span>
            </div>

            <CatalogGrid books={sectionBooks} />
          </section>
        );
      })}
    </div>
  );
}

export function LibraryIndex({ books }: { books: BookSummary[] }) {
  const [focus, setFocus] = useState<FocusKey>("all");
  const [genre, setGenre] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const genreFiltered = useMemo(
    () =>
      genre === "all"
        ? books
        : books.filter((book) => (book.genres || []).includes(genre)),
    [books, genre],
  );

  const searchedBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return genreFiltered;
    return genreFiltered.filter((book) => matchesSearch(book, query));
  }, [genreFiltered, search]);

  const grouped = useMemo(() => {
    const by: Record<string, BookSummary[]> = {};
    for (const book of searchedBooks) {
      const key = book.status || "up-next";
      (by[key] ||= []).push(book);
    }
    return by;
  }, [searchedBooks]);

  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    for (const book of books) {
      (book.genres || []).forEach((item) => genreSet.add(item));
    }
    return Array.from(genreSet).sort();
  }, [books]);

  const totalCounts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const book of books) {
      const key = book.status || "up-next";
      by[key] = (by[key] || 0) + 1;
    }
    return by;
  }, [books]);

  const emptyText =
    FOCUS_OPTIONS.find((option) => option.value === focus)?.emptyText ||
    "Nothing here.";
  const focusBooks =
    focus === "all" ? searchedBooks : sortFor(focus, grouped[focus] || []);

  return (
    <div className="flex min-h-screen flex-col gap-10 px-5 py-[22px] pb-[60px] xl:px-0">
      <LibraryHeader
        visibleCount={searchedBooks.length}
        totalCounts={totalCounts}
      />

      <FilterPanel
        focus={focus}
        onFocusChange={setFocus}
        genre={genre}
        onGenreChange={setGenre}
        allGenres={allGenres}
        search={search}
        onSearchChange={setSearch}
      />

      {focus === "all" ? (
        <CatalogAllView grouped={grouped} totalCount={searchedBooks.length} />
      ) : (
        <CatalogView books={focusBooks} status={focus} emptyText={emptyText} />
      )}
    </div>
  );
}
