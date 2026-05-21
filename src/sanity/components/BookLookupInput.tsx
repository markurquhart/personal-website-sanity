"use client";

import { SearchIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Spinner,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import { useCallback, useState } from "react";
import {
  useClient,
  useDocumentOperation,
  useFormValue,
  type StringInputProps,
} from "sanity";

type Volume = {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    categories?: string[];
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

// Maps Google Books category strings to our predefined GENRES list.
const GENRE_ALIASES: Record<string, string> = {
  fiction: "Fiction",
  "non-fiction": "Non-Fiction",
  "biography & autobiography": "Biography",
  biography: "Biography",
  history: "History",
  philosophy: "Philosophy",
  science: "Science",
  "technology & engineering": "Technology",
  computers: "Technology",
  "business & economics": "Business",
  "self-help": "Self-Help",
  psychology: "Psychology",
  "social science": "Sociology",
  "political science": "Politics",
  politics: "Politics",
  economics: "Economics",
  "health & fitness": "Health",
  travel: "Travel",
  cooking: "Cooking",
  art: "Art",
  poetry: "Poetry",
  drama: "Drama",
  "performing arts": "Drama",
  "juvenile fiction": "Young Adult",
  "young adult fiction": "Young Adult",
  "young adult": "Young Adult",
  "juvenile nonfiction": "Children's",
  religion: "Religion",
  "body, mind & spirit": "Spirituality",
  spirituality: "Spirituality",
  education: "Education",
  "sports & recreation": "Sports",
  sports: "Sports",
  fantasy: "Fantasy",
  "science fiction": "Sci-Fi",
  "sci-fi": "Sci-Fi",
  mystery: "Mystery",
  thriller: "Thriller",
  thrillers: "Thriller",
  horror: "Horror",
  romance: "Romance",
  memoir: "Memoir",
};

function mapGenres(googleCategories: string[] = []): string[] {
  const matched = new Set<string>();
  for (const cat of googleCategories) {
    // e.g. "Fiction / Thrillers / Suspense" or "Computers"
    const segments = cat.split(/[\/&]/).map((s) => s.trim().toLowerCase());
    for (const segment of segments) {
      const alias = GENRE_ALIASES[segment];
      if (alias) matched.add(alias);
    }
    // Also try the full string
    const lower = cat.toLowerCase();
    const aliasFull = GENRE_ALIASES[lower];
    if (aliasFull) matched.add(aliasFull);
  }
  return Array.from(matched);
}

async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Fetch a cover image via the same-origin proxy. Times out per source so
// a slow Open Library / Google response never blocks the whole import.
async function fetchCoverBlob(
  isbn: string | undefined,
  googleThumb: string | undefined,
): Promise<{ blob: Blob; filename: string } | null> {
  const proxy = (u: string) => `/api/cover-proxy?url=${encodeURIComponent(u)}`;

  if (isbn) {
    try {
      const url = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
      const res = await fetchWithTimeout(proxy(url));
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 1000) {
          return {
            blob: new Blob([buf], { type: "image/jpeg" }),
            filename: `cover-${isbn}.jpg`,
          };
        }
      }
    } catch (e) {
      console.warn("Open Library cover lookup failed/timed out:", e);
    }
  }
  if (googleThumb) {
    try {
      const url = googleThumb
        .replace(/^http:/, "https:")
        .replace(/&edge=curl/, "")
        .replace(/&zoom=\d/, "&zoom=3");
      const res = await fetchWithTimeout(proxy(url));
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 1000) {
          return {
            blob: new Blob([buf], { type: "image/jpeg" }),
            filename: `cover-google-${Date.now()}.jpg`,
          };
        }
      }
    } catch (e) {
      console.warn("Google Books cover fetch failed/timed out:", e);
    }
  }
  return null;
}

export function BookLookupInput(_props: StringInputProps) {
  const docId = useFormValue(["_id"]) as string;
  const docType = (useFormValue(["_type"]) as string) || "book";
  // useDocumentOperation expects the published ID (no drafts. prefix)
  const publishedId = docId?.replace(/^drafts\./, "") || "";
  const docOp = useDocumentOperation(publishedId, docType);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [importedTitle, setImportedTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useClient({ apiVersion: "2026-05-21" });

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setImportedTitle(null);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;
      const keyParam = apiKey ? `&key=${apiKey}` : "";
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8${keyParam}`;
      const res = await fetch(url);
      if (res.status === 429) {
        throw new Error(
          "Google Books rate-limited the request. Wait ~60 seconds and try again.",
        );
      }
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setResults(data.items || []);
      if (!data.items?.length) setError("No results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const importVolume = async (v: Volume) => {
    if (!docId) {
      setError("Save the document once before importing.");
      return;
    }
    setImportingId(v.id);
    setError(null);
    setStage(null);
    try {
      const info = v.volumeInfo;
      const patches: Record<string, unknown> = {};
      setStage("Preparing book details…");

      if (info.title) {
        patches.title = info.title;
        patches.slug = { _type: "slug", current: slugify(info.title) };
      }
      if (info.subtitle) patches.subtitle = info.subtitle;
      if (info.authors?.length) patches.authors = info.authors;
      if (info.pageCount) patches.pageCount = info.pageCount;
      if (info.publishedDate) {
        const y = parseInt(info.publishedDate.slice(0, 4));
        if (!isNaN(y)) patches.publishedYear = y;
      }
      const isbn13 = info.industryIdentifiers?.find(
        (i) => i.type === "ISBN_13",
      )?.identifier;
      const isbn10 = info.industryIdentifiers?.find(
        (i) => i.type === "ISBN_10",
      )?.identifier;
      const isbn = isbn13 || isbn10;
      if (isbn) patches.isbn = isbn;

      // Genres from Google categories → our predefined list
      const mappedGenres = mapGenres(info.categories);
      if (mappedGenres.length > 0) patches.genres = mappedGenres;

      // Cover image — blocking. If fetch/upload fails the entire import
      // fails (atomic) so the user is never left with a half-saved book.
      if (isbn || info.imageLinks?.thumbnail) {
        setStage("Fetching cover image…");
        const cover = await fetchCoverBlob(isbn, info.imageLinks?.thumbnail);
        if (!cover) {
          throw new Error(
            "Couldn't fetch a cover from Open Library or Google Books. Try a different result.",
          );
        }
        setStage("Uploading cover to Sanity…");
        const asset = await client.assets.upload("image", cover.blob, {
          filename: cover.filename,
        });
        patches.cover = {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
          alt: info.title || "",
        };
      }

      // External link to Google Books — only set if not already populated
      const infoLink = info.infoLink || info.canonicalVolumeLink;
      if (infoLink) {
        patches.externalLinks = [
          {
            _type: "object",
            _key: `gb-${v.id}`,
            label: "Google Books",
            url: infoLink,
          },
        ];
      }

      setStage("Saving to Sanity…");
      // Apply patches through the form's operation API so Studio tracks
      // the changes as pending edits (Publish button activates).
      docOp.patch.execute([{ set: patches }]);
      setStage(null);
      setImportedTitle(info.title || v.id);
      setResults([]);
      setQuery("");
    } catch (e) {
      console.error(e);
      setStage(null);
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Stack space={3}>
      <Card
        padding={3}
        radius={2}
        tone="primary"
        border
        style={{ borderColor: "var(--card-border-color)" }}
      >
        <Stack space={3}>
          <Text size={1} muted>
            Search Google Books to autofill title, authors, cover, ISBN, page
            count, genres, and published year.
          </Text>
          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    search();
                  }
                }}
                placeholder="Title, author, or ISBN…"
                icon={SearchIcon}
                disabled={loading}
              />
            </Box>
            <Button
              text={loading ? "Searching…" : "Search"}
              onClick={search}
              disabled={loading || !query.trim()}
              tone="primary"
            />
          </Flex>

          {importingId && stage && (
            <Card tone="primary" padding={2} radius={2}>
              <Flex gap={2} align="center">
                <Spinner muted />
                <Text size={1}>{stage}</Text>
              </Flex>
            </Card>
          )}

          {error && (
            <Card tone="critical" padding={2} radius={2}>
              <Text size={1}>{error}</Text>
            </Card>
          )}

          {importedTitle && (
            <Card tone="positive" padding={2} radius={2}>
              <Text size={1}>
                ✓ Import complete: <strong>{importedTitle}</strong>. Review
                fields below and hit Publish when ready.
              </Text>
            </Card>
          )}

          {results.length > 0 && (
            <Stack space={2}>
              {results.map((v) => {
                const info = v.volumeInfo;
                const isImporting = importingId === v.id;
                return (
                  <Card
                    key={v.id}
                    padding={3}
                    radius={2}
                    shadow={1}
                    tone={isImporting ? "primary" : "default"}
                    onClick={() => !importingId && importVolume(v)}
                    style={{
                      cursor: importingId ? "default" : "pointer",
                      opacity: importingId && !isImporting ? 0.4 : 1,
                    }}
                  >
                    <Flex gap={3} align="flex-start">
                      {info.imageLinks?.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={info.imageLinks.thumbnail.replace(
                            /^http:/,
                            "https:",
                          )}
                          alt=""
                          style={{
                            width: 44,
                            height: 66,
                            objectFit: "cover",
                            flexShrink: 0,
                            borderRadius: 3,
                          }}
                        />
                      ) : (
                        <Box
                          style={{
                            width: 44,
                            height: 66,
                            background: "#eee",
                            borderRadius: 3,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box flex={1}>
                        <Text weight="semibold" size={1}>
                          {info.title}
                        </Text>
                        {info.subtitle && (
                          <Box marginTop={1}>
                            <Text muted size={1}>
                              {info.subtitle}
                            </Text>
                          </Box>
                        )}
                        <Box marginTop={2}>
                          <Text muted size={1}>
                            {(info.authors || []).join(", ")}
                            {info.publishedDate &&
                              ` · ${info.publishedDate.slice(0, 4)}`}
                            {info.pageCount && ` · ${info.pageCount} pages`}
                          </Text>
                        </Box>
                      </Box>
                      <Box>
                        {isImporting ? (
                          <Spinner muted />
                        ) : (
                          <Text size={1} weight="medium">
                            Import →
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
