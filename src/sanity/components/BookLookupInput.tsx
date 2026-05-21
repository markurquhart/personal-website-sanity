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
import { useClient, useFormValue, type StringInputProps } from "sanity";

type Volume = {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function BookLookupInput(_props: StringInputProps) {
  const docId = useFormValue(["_id"]) as string;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
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
          "Google Books rate-limited the request. Wait ~60 seconds, or add a NEXT_PUBLIC_GOOGLE_BOOKS_API env var to lift the quota.",
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
    try {
      const info = v.volumeInfo;
      const patches: Record<string, unknown> = {};

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
      if (isbn13 || isbn10) patches.isbn = isbn13 || isbn10;

      if (info.imageLinks?.thumbnail) {
        try {
          const coverUrl = info.imageLinks.thumbnail
            .replace(/^http:/, "https:")
            .replace(/&edge=curl/, "")
            .replace(/&zoom=\d/, "&zoom=3");
          const imgRes = await fetch(coverUrl);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const asset = await client.assets.upload(
              "image",
              new Blob([buf], { type: "image/jpeg" }),
              { filename: `cover-${v.id}.jpg` },
            );
            patches.cover = {
              _type: "image",
              asset: { _type: "reference", _ref: asset._id },
              alt: info.title || "",
            };
          }
        } catch (e) {
          console.warn("Cover upload failed (continuing without):", e);
        }
      }

      await client.patch(docId).set(patches).commit();
      setImportedTitle(info.title || v.id);
      setResults([]);
      setQuery("");
    } catch (e) {
      console.error(e);
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
            count, and published year. Save the document first if you haven&apos;t.
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

          {error && (
            <Card tone="critical" padding={2} radius={2}>
              <Text size={1}>{error}</Text>
            </Card>
          )}

          {importedTitle && (
            <Card tone="positive" padding={2} radius={2}>
              <Text size={1}>
                ✓ Imported <strong>{importedTitle}</strong>. Scroll down to
                review fields.
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
