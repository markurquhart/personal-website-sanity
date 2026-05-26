"use client";

import type { ImageValue } from "sanity";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
  };
};

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  year?: number;
  pageCount?: number;
  isbn?: string;
  categories: string[];
  description?: string;
  thumbUrl?: string;
};

export function normalizeDocumentOperationId(docId?: string) {
  if (!docId) return "";
  return docId.startsWith("drafts.") ? docId.slice("drafts.".length) : docId;
}

function pickIsbn(
  ids: { type: string; identifier: string }[] | undefined,
): string | undefined {
  if (!ids?.length) return undefined;
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ||
    ids.find((i) => i.type === "ISBN_10")?.identifier
  );
}

function yearFromDate(d?: string): number | undefined {
  if (!d) return undefined;
  const m = d.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function upgradeThumbUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^http:\/\//, "https://")
    .replace(/&edge=curl/, "")
    .replace(/zoom=\d+/, "zoom=2");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>\s*<\s*p[^>]*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeGoogleVolume(v: GoogleVolume): SearchResult {
  const info = v.volumeInfo || {};
  return {
    id: v.id,
    title: info.title || "Untitled",
    subtitle: info.subtitle,
    authors: info.authors || [],
    year: yearFromDate(info.publishedDate),
    pageCount: info.pageCount,
    isbn: pickIsbn(info.industryIdentifiers),
    categories: info.categories || [],
    description: info.description ? htmlToText(info.description) : undefined,
    thumbUrl: upgradeThumbUrl(
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
    ),
  };
}

export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  const url = new URL(GOOGLE_BOOKS_API);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("printType", "books");
  if (API_KEY) url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google Books ${res.status}`);

  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items || []).map(normalizeGoogleVolume);
}

export function buildBookImportFields(
  book: SearchResult,
  coverAssetId?: string,
): Record<string, unknown> {
  const setFields: Record<string, unknown> = {
    title: book.title,
    publishedYear: book.year,
    pageCount: book.pageCount,
    isbn: book.isbn,
    slug: { _type: "slug", current: slugify(book.title) },
  };

  if (book.description) setFields.summary = book.description;
  if (book.subtitle) setFields.subtitle = book.subtitle;
  if (book.authors.length) setFields.authors = book.authors;

  if (book.categories.length) {
    const leaf = book.categories
      .flatMap((c) => c.split(" / "))
      .map((c) => c.trim())
      .filter(Boolean);

    const lowered = leaf.map((s) => s.toLowerCase());
    const isNonFiction = lowered.some((s) => /non[\s-]?fiction/.test(s));
    const isFiction = !isNonFiction && lowered.some((s) => /\bfiction\b/.test(s));

    if (isNonFiction) setFields.kind = "non-fiction";
    else if (isFiction) setFields.kind = "fiction";

    const filtered = leaf.filter((g) => {
      const loweredGenre = g.toLowerCase();
      return loweredGenre !== "fiction" && !/non[\s-]?fiction/.test(loweredGenre);
    });

    if (filtered.length) setFields.genres = Array.from(new Set(filtered));
  }

  if (coverAssetId) {
    setFields.cover = {
      _type: "image",
      asset: { _type: "reference", _ref: coverAssetId },
      alt: book.title,
    } satisfies ImageValue & { alt?: string };
  }

  Object.keys(setFields).forEach((key) => {
    if (setFields[key] === undefined) delete setFields[key];
  });

  return setFields;
}

export function buildBookImportDefaults(): Record<string, unknown> {
  return {
    status: "up-next",
    addedAt: todayISO(),
  };
}
