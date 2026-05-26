// Remove legacy book history events from published and draft book documents.
// Run: SANITY_TOKEN=<token> NEXT_PUBLIC_SANITY_PROJECT_ID=<id> NEXT_PUBLIC_SANITY_DATASET=<dataset> node scripts/remove-book-history.mjs

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
if (!projectId || !dataset) {
  console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET env vars");
  process.exit(1);
}

const token = process.env.SANITY_TOKEN || process.env.SANITY_AUTH_TOKEN;
if (!token) {
  console.error("Set SANITY_TOKEN env var or run via `sanity exec --with-user-token`");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-05-20",
  token,
  useCdn: false,
  perspective: "raw",
});

async function main() {
  console.log("→ Looking for books with legacy history events…");

  const books = await client.fetch(
    `*[_type == "book" && defined(events)]{_id, title, "eventCount": count(events)}`,
  );

  console.log(`  found ${books.length}`);

  if (books.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  for (const book of books) {
    try {
      await client.patch(book._id).unset(["events"]).commit();
      console.log(`  ✓ ${book._id} (${book.title || "Untitled"}) removed ${book.eventCount} event(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ${book._id}: ${message.slice(0, 160)}`);
    }
  }

  console.log("\n✓ Done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
