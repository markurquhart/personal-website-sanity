"use client";

// BookLookupInput
//
// Single-card UI at the top of the Book schema. The editor types a title /
// author / ISBN, picks a search result, and one click populates every field
// on the document including the cover image asset.
//
// Architecture notes worth not re-discovering:
//
// • Cover bytes flow through /api/cover-proxy because Google's image CDN
//   doesn't set CORS headers — a direct `fetch()` is blocked even though
//   `<img src=…>` would render fine. We use the proxy for the upload bytes
//   and use direct `<img>` for the inline search-result thumbnails.
//
// • The document is updated through `useDocumentOperation(id, type).patch
//   .execute([...])` rather than `client.patch(...)`. The former is form-
//   aware: Studio's draft state stays consistent and Publish activates
//   afterwards. The latter bypasses form state and leaves Studio out of
//   sync.
//
// • All field updates land in a SINGLE patch (metadata + cover + clearing
//   `lookup`). One round trip, one form re-mount.
//
// • BookCoverInput intentionally replaces Sanity's default image preview
//   with a plain `<img>` built via `urlFor()`. That sidesteps the long-
//   standing Studio image-preview bug where freshly uploaded assets render
//   "Loading…" forever. Anything we patch into `cover` here appears
//   immediately via that custom preview.

import { BookIcon, CheckmarkCircleIcon, SearchIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Spinner,
  Stack,
  Text,
  TextInput,
  useToast,
} from "@sanity/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  set,
  useClient,
  useDocumentOperation,
  useFormValue,
  type StringInputProps,
} from "sanity";

import { fetchGoogleCover, uploadCoverBlob } from "./bookCoverHelpers";

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
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
  };
};

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  year?: number;
  pageCount?: number;
  isbn?: string;
  categories: string[];
  thumbUrl?: string;
};

type Phase =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; items: SearchResult[] }
  | { kind: "importing"; book: SearchResult; step: string }
  | { kind: "imported"; book: SearchResult; coverImported: boolean }
  | { kind: "error"; message: string };

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

// Turn Google's smallThumbnail/thumbnail URL into a slightly larger preview
// for the inline result row. zoom=2 produces ~256px-wide images.
function upgradeThumbUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^http:\/\//, "https://")
    .replace(/&edge=curl/, "")
    .replace(/zoom=\d+/, "zoom=2");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalize(v: GoogleVolume): SearchResult {
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
    thumbUrl: upgradeThumbUrl(
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
    ),
  };
}

export function BookLookupInput(props: StringInputProps) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const toast = useToast();

  const docId = useFormValue(["_id"]) as string | undefined;
  const docType = useFormValue(["_type"]) as string | undefined;
  // useDocumentOperation expects the PUBLISHED id and handles draft routing
  // internally. Passing a `drafts.` id throws "editOpsOf does not expect a
  // draft id". Strip the prefix if it's present.
  const operationId = useMemo(() => {
    if (!docId) return "";
    return docId.startsWith("drafts.") ? docId.slice("drafts.".length) : docId;
  }, [docId]);

  const docOp = useDocumentOperation(operationId, docType || "book");

  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "searching" });

    const url = new URL(GOOGLE_BOOKS_API);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("printType", "books");
    if (API_KEY) url.searchParams.set("key", API_KEY);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error(`Google Books ${res.status}`);
      const data = (await res.json()) as { items?: GoogleVolume[] };
      const items = (data.items || []).map(normalize);
      setPhase({ kind: "results", items });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Search failed";
      setPhase({ kind: "error", message });
    }
  }, []);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch(query);
    }
  };

  const reset = () => {
    setQuery("");
    setPhase({ kind: "idle" });
    props.onChange(set(""));
  };

  const importBook = useCallback(
    async (book: SearchResult) => {
      if (!operationId || !docType) {
        toast.push({
          status: "error",
          title: "Can't import",
          description: "Document is not initialized yet.",
        });
        return;
      }

      setPhase({ kind: "importing", book, step: "Preparing fields" });

      // Try to fetch + upload the cover. If Google has no cover or the
      // download fails, we still import the rest of the metadata so the
      // editor isn't blocked.
      let coverAssetId: string | undefined;
      let coverError: string | undefined;
      if (!book.thumbUrl) {
        // Search response carried no imageLinks at all — Google has no
        // cover for this volume. Skip the fetch and let the editor add one
        // manually via the cover field's picker.
        coverError = "Google has no cover for this volume";
      } else {
        try {
          setPhase({ kind: "importing", book, step: "Downloading cover" });
          const blob = await fetchGoogleCover(book.id, 3);
          setPhase({ kind: "importing", book, step: "Uploading to Sanity" });
          const safeName = book.title
            .replace(/[^a-z0-9]+/gi, "-")
            .slice(0, 60);
          coverAssetId = await uploadCoverBlob(
            client,
            blob,
            `${safeName || "cover"}.jpg`,
          );
        } catch (err) {
          coverError =
            err instanceof Error ? err.message : "Cover unavailable";
        }
      }

      setPhase({ kind: "importing", book, step: "Applying to book" });

      // Fields we always overwrite from the lookup. Slug is derived from
      // the imported title, matching what Sanity's "Generate" button would
      // produce — so the editor isn't left with a missing-slug warning.
      const setFields: Record<string, unknown> = {
        title: book.title,
        publishedYear: book.year,
        pageCount: book.pageCount,
        isbn: book.isbn,
        slug: { _type: "slug", current: slugify(book.title) },
      };
      if (book.subtitle) setFields.subtitle = book.subtitle;
      if (book.authors.length) setFields.authors = book.authors;
      if (book.categories.length) {
        // Google categories look like "Computers / Programming / Software".
        // Flatten on " / " and dedupe so the genre array stays readable.
        const leaf = book.categories
          .flatMap((c) => c.split(" / "))
          .map((c) => c.trim())
          .filter(Boolean);
        if (leaf.length) setFields.genres = Array.from(new Set(leaf));
      }
      if (coverAssetId) {
        setFields.cover = {
          _type: "image",
          asset: { _type: "reference", _ref: coverAssetId },
          alt: book.title,
        };
      }
      Object.keys(setFields).forEach((k) => {
        if (setFields[k] === undefined) delete setFields[k];
      });

      // Fields we only set if the editor hasn't already picked a value —
      // status defaults to "up-next" and addedAt to today so a freshly
      // imported doc is valid the moment it lands.
      const defaults: Record<string, unknown> = {
        status: "up-next",
        addedAt: todayISO(),
      };

      try {
        docOp.patch.execute([
          { set: setFields },
          { setIfMissing: defaults },
          { unset: ["lookup"] },
        ]);
        setPhase({
          kind: "imported",
          book,
          coverImported: Boolean(coverAssetId),
        });
        if (coverError) {
          toast.push({
            status: "warning",
            title: "Imported without cover",
            description: coverError,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Patch failed";
        setPhase({ kind: "error", message });
        toast.push({
          status: "error",
          title: "Couldn't apply changes",
          description: message,
        });
      }
    },
    [client, docOp.patch, docType, operationId, toast],
  );

  return (
    <Card padding={4} radius={3} shadow={1} tone="default">
      <Stack space={4}>
        <Flex align="flex-start" gap={3}>
          <Card
            padding={3}
            radius={2}
            tone="primary"
            style={{ flex: "0 0 auto" }}
          >
            <Text size={3}>
              <BookIcon />
            </Text>
          </Card>
          <Stack space={2} flex={1}>
            <Text weight="semibold" size={2}>
              Find a book
            </Text>
            <Text size={1} muted>
              Search Google Books to autofill title, author, ISBN, page count,
              year, genres, and cover.
            </Text>
          </Stack>
        </Flex>

        <Flex gap={2}>
          <Box flex={1}>
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={onSearchKey}
              placeholder="Search by title, author, or ISBN…"
              icon={SearchIcon}
              fontSize={2}
              padding={3}
              radius={2}
              disabled={phase.kind === "importing"}
            />
          </Box>
          <Button
            text="Search"
            tone="primary"
            mode="default"
            onClick={() => runSearch(query)}
            disabled={!query.trim() || phase.kind === "importing"}
            padding={3}
            fontSize={2}
          />
        </Flex>

        <PhaseView phase={phase} onImport={importBook} onReset={reset} />
      </Stack>
    </Card>
  );
}

function PhaseView(props: {
  phase: Phase;
  onImport: (book: SearchResult) => void;
  onReset: () => void;
}) {
  const { phase, onImport, onReset } = props;

  if (phase.kind === "idle") return null;

  if (phase.kind === "searching") {
    return (
      <Card padding={4} radius={2} tone="transparent">
        <Flex align="center" justify="center" gap={3}>
          <Spinner muted />
          <Text muted size={1}>
            Searching Google Books…
          </Text>
        </Flex>
      </Card>
    );
  }

  if (phase.kind === "error") {
    return (
      <Card padding={3} radius={2} tone="critical">
        <Flex align="center" justify="space-between" gap={3}>
          <Text size={1}>{phase.message}</Text>
          <Button
            text="Dismiss"
            mode="bleed"
            tone="critical"
            onClick={onReset}
          />
        </Flex>
      </Card>
    );
  }

  if (phase.kind === "importing") {
    return (
      <Card padding={3} radius={2} tone="primary">
        <Flex align="center" gap={3}>
          <Spinner />
          <Stack space={2} flex={1}>
            <Text size={1} weight="semibold">
              Adding “{phase.book.title}”…
            </Text>
            <Text size={1} muted>
              {phase.step}
            </Text>
          </Stack>
        </Flex>
      </Card>
    );
  }

  if (phase.kind === "imported") {
    return (
      <Card padding={3} radius={2} tone="positive">
        <Flex align="center" gap={3}>
          <Text size={3}>
            <CheckmarkCircleIcon />
          </Text>
          <Stack space={2} flex={1}>
            <Text size={1} weight="semibold">
              Added “{phase.book.title}”
            </Text>
            <Text size={1} muted>
              {phase.coverImported
                ? "All fields populated, cover uploaded."
                : "Metadata populated. Cover not found — add it manually below."}
            </Text>
          </Stack>
          <Button text="Find another" mode="ghost" onClick={onReset} />
        </Flex>
      </Card>
    );
  }

  if (phase.kind === "results") {
    if (!phase.items.length) {
      return (
        <Card padding={3} radius={2} tone="transparent">
          <Text size={1} muted>
            No results. Try a different title, author, or ISBN.
          </Text>
        </Card>
      );
    }
    return (
      <Stack space={2}>
        <Text size={1} muted>
          {phase.items.length} {phase.items.length === 1 ? "result" : "results"}
        </Text>
        <Stack space={2}>
          {phase.items.map((item) => (
            <ResultRow key={item.id} book={item} onImport={onImport} />
          ))}
        </Stack>
      </Stack>
    );
  }

  return null;
}

function ResultRow(props: {
  book: SearchResult;
  onImport: (book: SearchResult) => void;
}) {
  const { book, onImport } = props;
  const meta = [
    book.year?.toString(),
    book.pageCount ? `${book.pageCount} pages` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card padding={2} radius={2} tone="transparent" border>
      <Flex align="center" gap={3}>
        <div
          style={{
            width: 44,
            height: 64,
            flex: "0 0 auto",
            background: "var(--card-muted-bg-color, rgba(0,0,0,0.04))",
            borderRadius: 4,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {book.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.thumbUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Text muted size={3}>
              <BookIcon />
            </Text>
          )}
        </div>

        <Stack space={2} flex={1}>
          <div
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--card-fg-color)",
            }}
          >
            {book.title}
            {book.subtitle ? (
              <span
                style={{
                  fontWeight: 400,
                  color: "var(--card-muted-fg-color)",
                }}
              >
                {" — "}
                {book.subtitle}
              </span>
            ) : null}
          </div>
          <div
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--card-muted-fg-color)",
              lineHeight: 1.4,
            }}
          >
            {book.authors.length
              ? book.authors.join(", ")
              : "Unknown author"}
            {meta ? ` · ${meta}` : ""}
          </div>
        </Stack>

        <Button
          text="Add"
          tone="primary"
          mode="default"
          padding={3}
          onClick={() => onImport(book)}
        />
      </Flex>
    </Card>
  );
}
