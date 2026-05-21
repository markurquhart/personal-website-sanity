import { LibraryContent } from "@/components/LibraryContent";
import { PageShell } from "@/components/PageShell";
import { sanityFetch } from "@/sanity/lib/live";
import { BOOKS_QUERY } from "@/sanity/lib/queries";
import type { BookSummary } from "@/sanity/lib/types";

export const revalidate = 60;
export const metadata = { title: "Library · Mark Urquhart" };

export default async function LibraryPage() {
  const { data } = await sanityFetch({ query: BOOKS_QUERY });
  const books = (data as BookSummary[] | null) ?? [];

  return (
    <PageShell hideMobileProfile>
      <LibraryContent books={books} />
    </PageShell>
  );
}
