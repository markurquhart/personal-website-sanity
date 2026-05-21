"use client";

import { ImagesIcon, RefreshIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useCallback, useState } from "react";
import { useClient, useFormValue, type ObjectInputProps } from "sanity";

type Candidate = {
  id: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
};

export function BookCoverInput(props: ObjectInputProps) {
  const docId = useFormValue(["_id"]) as string;
  const isbn = useFormValue(["isbn"]) as string | undefined;
  const title = useFormValue(["title"]) as string | undefined;
  const authors = useFormValue(["authors"]) as string[] | undefined;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useClient({ apiVersion: "2026-05-21" });

  const findCovers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    try {
      const found: Candidate[] = [];

      // 1) Open Library by ISBN
      if (isbn) {
        const olThumb = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-M.jpg?default=false`;
        const olFull = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
        // Check it actually returns something
        try {
          const r = await fetch(olThumb);
          if (r.ok) {
            const blob = await r.blob();
            if (blob.size > 1000) {
              found.push({
                id: "ol-isbn",
                label: "Open Library",
                thumbUrl: olThumb,
                fullUrl: olFull,
              });
            }
          }
        } catch {}
      }

      // 2) Google Books: all editions of this book
      // Search by ISBN if we have it (returns this edition + others); otherwise
      // by title+author.
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;
      const keyParam = apiKey ? `&key=${apiKey}` : "";
      let query: string | null = null;
      if (isbn) {
        query = `isbn:${isbn}`;
      } else if (title) {
        const a = (authors || [])[0] || "";
        query = `intitle:${title}${a ? `+inauthor:${a}` : ""}`;
      }

      if (query) {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${keyParam}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          for (const item of data.items || []) {
            const img = item.volumeInfo?.imageLinks?.thumbnail;
            if (!img) continue;
            const thumb = img.replace(/^http:/, "https:");
            const full = thumb.replace(/&edge=curl/, "").replace(/&zoom=\d/, "&zoom=3");
            found.push({
              id: `gb-${item.id}`,
              label:
                item.volumeInfo?.publisher ||
                item.volumeInfo?.publishedDate?.slice(0, 4) ||
                "Google Books",
              thumbUrl: thumb,
              fullUrl: full,
            });
          }
        }
      }

      // De-dupe by thumbUrl
      const dedup = Array.from(
        new Map(found.map((c) => [c.thumbUrl, c])).values(),
      );

      setCandidates(dedup);
      if (dedup.length === 0)
        setError("No alternative covers found. Try editing the ISBN or title.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover search failed");
    } finally {
      setLoading(false);
    }
  }, [isbn, title, authors]);

  const useCandidate = async (c: Candidate) => {
    setImportingId(c.id);
    setError(null);
    try {
      // Same approach as the initial book import: fetch the URL, upload the blob.
      // Works for Open Library (CORS OK). May fail for Google Books image CDN.
      const res = await fetch(c.fullUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();
      if (blob.size < 1000) throw new Error("Cover image looks empty");
      const asset = await client.assets.upload("image", blob, {
        filename: `cover-${c.id}.jpg`,
      });
      await client
        .transaction()
        .createIfNotExists({ _id: docId, _type: "book" })
        .patch(docId, (p) =>
          p.set({
            cover: {
              _type: "image",
              asset: { _type: "reference", _ref: asset._id },
              alt: title || "",
            },
          }),
        )
        .commit();
      setOpen(false);
      setCandidates([]);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? `${e.message}. Try a different cover or upload manually.`
          : "Failed to set cover",
      );
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Stack space={3}>
      <Flex justify="flex-end">
        <Button
          mode="ghost"
          icon={open ? RefreshIcon : ImagesIcon}
          text={open ? "Refresh covers" : "Find alternate covers"}
          fontSize={1}
          padding={2}
          onClick={() => {
            if (!open) {
              setOpen(true);
              findCovers();
            } else {
              findCovers();
            }
          }}
        />
      </Flex>

      {open && (
        <Card padding={3} radius={2} tone="primary" border>
          <Stack space={3}>
            <Flex align="center" justify="space-between">
              <Text size={1} weight="medium">
                {loading
                  ? "Searching…"
                  : candidates.length > 0
                    ? `Pick a cover (${candidates.length} found)`
                    : "Cover candidates"}
              </Text>
              <Button
                mode="bleed"
                fontSize={1}
                padding={1}
                text="Close"
                onClick={() => {
                  setOpen(false);
                  setCandidates([]);
                  setError(null);
                }}
              />
            </Flex>

            {error && (
              <Card tone="critical" padding={2} radius={2}>
                <Text size={1}>{error}</Text>
              </Card>
            )}

            {loading && (
              <Flex justify="center" padding={3}>
                <Spinner />
              </Flex>
            )}

            {candidates.length > 0 && (
              <Grid columns={[3, 4, 5]} gap={2}>
                {candidates.map((c) => {
                  const isImporting = importingId === c.id;
                  return (
                    <Card
                      key={c.id}
                      padding={2}
                      radius={2}
                      shadow={1}
                      onClick={() => !importingId && useCandidate(c)}
                      style={{
                        cursor: importingId ? "default" : "pointer",
                        opacity: importingId && !isImporting ? 0.4 : 1,
                      }}
                    >
                      <Stack space={2}>
                        <Box
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "2 / 3",
                            background: "#eee",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.thumbUrl}
                            alt=""
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          {isImporting && (
                            <Box
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(255,255,255,0.7)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Spinner />
                            </Box>
                          )}
                        </Box>
                        <Text size={0} muted align="center">
                          {c.label}
                        </Text>
                      </Stack>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </Stack>
        </Card>
      )}

      {props.renderDefault(props)}
    </Stack>
  );
}
