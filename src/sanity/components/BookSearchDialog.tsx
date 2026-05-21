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
import { useClient } from "sanity";

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
    categories?: string[];
  };
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function BookSearchDialog({
  documentId,
  onComplete,
}: {
  documentId: string;
  onComplete: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useClient({ apiVersion: "2026-05-21" });

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`;
      const res = await fetch(url);
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

      // Map Google categories to schema genres if possible (best-effort)
      // We just keep this manual — Google's categories don't always match our list.

      // Cover image — try to fetch + upload to Sanity assets
      if (info.imageLinks?.thumbnail) {
        try {
          const coverUrl = info.imageLinks.thumbnail
            .replace(/^http:/, "https:")
            .replace(/&edge=curl/, "")
            .replace(/&zoom=\d/, "&zoom=3"); // larger
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
          console.warn("Cover upload failed (continuing without cover):", e);
        }
      }

      await client.patch(documentId).set(patches).commit();
      onComplete();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Import failed");
      setImportingId(null);
    }
  };

  return (
    <Stack space={4} padding={4}>
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
            autoFocus
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
        <Card tone="critical" padding={3} radius={2}>
          <Text size={1}>{error}</Text>
        </Card>
      )}

      {results.length === 0 && !loading && !error && (
        <Text muted size={1}>
          Search Google Books by title, author, or ISBN. Click a result to
          autofill this book&apos;s fields and upload its cover.
        </Text>
      )}

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
                  <img
                    src={info.imageLinks.thumbnail.replace(/^http:/, "https:")}
                    alt=""
                    style={{
                      width: 50,
                      height: 75,
                      objectFit: "cover",
                      flexShrink: 0,
                      borderRadius: 3,
                    }}
                  />
                ) : (
                  <Box
                    style={{
                      width: 50,
                      height: 75,
                      background: "#eee",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box flex={1}>
                  <Text weight="semibold" size={2}>
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
                    <Spinner />
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
    </Stack>
  );
}
