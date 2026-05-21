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
import {
  useClient,
  useDocumentOperation,
  useFormValue,
  type ObjectInputProps,
} from "sanity";

// Decode the blob with the browser's Image API to confirm it's actually a
// valid image before sending it to Sanity. Catches truncated downloads,
// HTML error pages mislabeled as images, etc.
async function validateImageBlob(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dims = { w: img.naturalWidth, h: img.naturalHeight };
      URL.revokeObjectURL(url);
      if (dims.w === 0 || dims.h === 0) {
        reject(new Error("Image decoded to 0×0 — likely corrupt"));
      } else {
        resolve(dims);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to decode (not a valid image)"));
    };
    img.src = url;
  });
}

type Candidate = {
  id: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
};

export function BookCoverInput(props: ObjectInputProps) {
  const docId = useFormValue(["_id"]) as string;
  const docType = (useFormValue(["_type"]) as string) || "book";
  const publishedId = docId?.replace(/^drafts\./, "") || "";
  const docOp = useDocumentOperation(publishedId, docType);
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

      // 2) Open Library Search — multiple editions, each with its own cover
      const olParams = new URLSearchParams();
      if (isbn) {
        olParams.set("isbn", isbn);
      } else if (title) {
        olParams.set("title", title);
        const a = (authors || [])[0];
        if (a) olParams.set("author", a);
      }
      olParams.set("limit", "15");

      try {
        const url = `https://openlibrary.org/search.json?${olParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          for (const doc of data.docs || []) {
            if (!doc.cover_i) continue;
            const thumb = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`;
            const full = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
            const label =
              (doc.publisher && doc.publisher[0]) ||
              (doc.first_publish_year ? String(doc.first_publish_year) : "Open Library");
            found.push({
              id: `ol-id-${doc.cover_i}`,
              label,
              thumbUrl: thumb,
              fullUrl: full,
            });
          }
        }
      } catch (e) {
        console.warn("Open Library search failed:", e);
      }

      // 3) Google Books — all editions of this book
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;
      const keyParam = apiKey ? `&key=${apiKey}` : "";
      let gbQuery: string | null = null;
      if (isbn) {
        gbQuery = `isbn:${isbn}`;
      } else if (title) {
        const a = (authors || [])[0] || "";
        gbQuery = `intitle:${title}${a ? `+inauthor:${a}` : ""}`;
      }

      if (gbQuery) {
        try {
          const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQuery)}&maxResults=10${keyParam}`;
          const res = await fetch(gbUrl);
          if (res.ok) {
            const data = await res.json();
            for (const item of data.items || []) {
              const img = item.volumeInfo?.imageLinks?.thumbnail;
              if (!img) continue;
              const thumb = img.replace(/^http:/, "https:");
              const full = thumb
                .replace(/&edge=curl/, "")
                .replace(/&zoom=\d/, "&zoom=3");
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
        } catch (e) {
          console.warn("Google Books search failed:", e);
        }
      }

      // De-dupe by thumbUrl
      const dedup = Array.from(
        new Map(found.map((c) => [c.thumbUrl, c])).values(),
      );

      setCandidates(dedup);
      if (dedup.length === 0)
        setError(
          "No alternative covers found. Try editing the ISBN or title, or upload manually.",
        );
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
      // 1) Fetch via proxy with timeout
      const proxyUrl = `/api/cover-proxy?url=${encodeURIComponent(c.fullUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let res: Response;
      try {
        res = await fetch(proxyUrl, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) throw new Error(`Cover fetch failed: ${res.status}`);

      // 2) Get blob + sanity-check size + content type
      const blob = await res.blob();
      if (blob.size < 1000) throw new Error("Cover image looks empty");
      if (!blob.type.startsWith("image/"))
        throw new Error(`Got non-image response (${blob.type})`);

      // 3) Decode the image in the browser to confirm it's valid before
      // wasting a Sanity asset slot on a broken file.
      await validateImageBlob(blob);

      // 4) Upload to Sanity. The upload promise resolves only when the asset
      // is fully ingested.
      const asset = await client.assets.upload("image", blob, {
        filename: `cover-${c.id}.jpg`,
      });

      // 5) Patch the cover field via document operations (same path the
      // lookup import uses — proven reliable).
      docOp.patch.execute([
        {
          set: {
            cover: {
              _type: "image",
              asset: { _type: "reference", _ref: asset._id },
              alt: title || "",
            },
          },
        },
      ]);

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
