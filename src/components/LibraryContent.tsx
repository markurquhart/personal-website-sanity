"use client";

import { LibraryIndex } from "@/components/LibraryIndex";
import type { BookSummary } from "@/sanity/lib/types";

export function LibraryContent({ books }: { books: BookSummary[] }) {
  return <LibraryIndex books={books} />;
}
