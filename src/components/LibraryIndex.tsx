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

function FocusButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-[14px] py-[6px] text-[13px] font-medium transition-all duration-200 ${
        active
          ? "border-[#333] bg-[#333] text-white"
          : "border-[#ddd] bg-white text-[#666] hover:border-[#333] hover:text-[#333]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span>{label}</span>
        <span
          className={`rounded-full px-2 py-[2px] text-[11px] leading-none ${
            active ? "bg-white/18 text-white" : "bg-[#f4f3ef] text-[#888]"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}

function LibraryHeader() {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="m-0 font-display text-[2.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-[#333]">
        Library
      </h1>
      <p className="m-0 max-w-[44rem] text-[15px] leading-[1.5] text-[#888]">
        A running shelf of what I&apos;m reading, what&apos;s next, and what I&apos;ve
        finished.
      </p>
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
  filteredCounts,
}: {
  focus: FocusKey;
  onFocusChange: (value: FocusKey) => void;
  genre: string | "all";
  onGenreChange: (value: string | "all") => void;
  allGenres: string[];
  search: string;
  onSearchChange: (value: string) => void;
  filteredCounts: Record<FocusKey, number>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e5] pb-3">
      <div className="flex flex-wrap gap-2">
        {FOCUS_OPTIONS.map((option) => (
          <FocusButton
            key={option.value}
            active={focus === option.value}
            onClick={() => onFocusChange(option.value)}
            label={option.label}
            count={filteredCounts[option.value] || 0}
          />
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
        <label className="block w-full xl:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library"
            aria-label="Search library"
            className="w-full rounded-full border border-[#ddd] bg-white px-4 py-[7px] text-[13px] text-[#333] outline-none transition-colors focus:border-[#333] xl:w-[220px]"
          />
        </label>

        {allGenres.length > 0 ? (
          <label className="block w-full xl:w-auto">
            <select
              value={genre}
              onChange={(e) => onGenreChange(e.target.value)}
              aria-label="Filter library by genre"
              className="w-full cursor-pointer rounded-full border border-[#ddd] bg-white px-4 py-[7px] text-[13px] text-[#333] focus:border-[#333] focus:outline-none xl:w-[170px]"
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
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="m-0 font-display text-[1.45rem] font-semibold text-[#222]">
        {title}
      </h2>
      <p className="m-0 max-w-[40rem] text-[14px] leading-[1.7] text-[#8a8a8a]">
        {description}
      </p>
    </div>
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
    <section className="flex flex-col gap-6">
      <SectionHeader
        title={SECTION_LABEL[status]}
        description={SECTION_DESCRIPTION[status]}
      />
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
    <div className="flex flex-col gap-14">
      {SECTION_ORDER.map((status) => {
        const sectionBooks = sortFor(status, grouped[status] || []);
        if (sectionBooks.length === 0) return null;

        return (
          <section key={status} className="flex flex-col gap-6">
            <SectionHeader
              title={SECTION_LABEL[status]}
              description={SECTION_DESCRIPTION[status]}
            />
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

  const emptyText =
    FOCUS_OPTIONS.find((option) => option.value === focus)?.emptyText ||
    "Nothing here.";
  const focusBooks =
    focus === "all" ? searchedBooks : sortFor(focus, grouped[focus] || []);
  const filteredCounts: Record<FocusKey, number> = {
    all: searchedBooks.length,
    "currently-reading": grouped["currently-reading"]?.length || 0,
    "up-next": grouped["up-next"]?.length || 0,
    completed: grouped.completed?.length || 0,
    paused: grouped.paused?.length || 0,
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 px-5 py-[22px] pb-[60px] xl:px-0">
      <LibraryHeader />

      <FilterPanel
        focus={focus}
        onFocusChange={setFocus}
        genre={genre}
        onGenreChange={setGenre}
        allGenres={allGenres}
        search={search}
        onSearchChange={setSearch}
        filteredCounts={filteredCounts}
      />

      {focus === "all" ? (
        <CatalogAllView grouped={grouped} totalCount={searchedBooks.length} />
      ) : (
        <CatalogView books={focusBooks} status={focus} emptyText={emptyText} />
      )}
    </div>
  );
}
