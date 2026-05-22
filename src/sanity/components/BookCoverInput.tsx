"use client";

import { ImagesIcon, RefreshIcon, UploadIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import { useCallback, useRef, useState } from "react";
import {
  set,
  unset,
  useClient,
  useFormValue,
  type ObjectInputProps,
} from "sanity";

import { fetchCoverFromUrl, uploadAndVerify } from "./bookCoverHelpers";

type Candidate = {
  id: string;
  label: string;
  thumbUrl: string;
  fullUrl: string;
};

type ImageValue = {
  asset?: { _ref?: string };
  alt?: string;
};

// Build a CDN URL for a Sanity asset ref. Asset refs look like:
//   image-{hash}-{width}x{height}-{format}
// e.g. "image-abc123def456-800x1200-jpg"
function sanityImageUrl(
  ref: string | undefined,
  projectId: string,
  dataset: string,
  query?: string,
): string | null {
  if (!ref) return null;
  const m = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z]+)$/i);
  if (!m) return null;
  const [, hash, dims, format] = m;
  const base = `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${dims}.${format}`;
  return query ? `${base}?${query}` : base;
}

export function BookCoverInput(props: ObjectInputProps) {
  const isbn = useFormValue(["isbn"]) as string | undefined;
  const title = useFormValue(["title"]) as string | undefined;
  const authors = useFormValue(["authors"]) as string[] | undefined;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const client = useClient({ apiVersion: "2026-05-21" });

  const config = client.config();
  const projectId = config.projectId || "";
  const dataset = config.dataset || "";

  const value = props.value as ImageValue | undefined;
  const currentRef = value?.asset?._ref;
  const previewUrl = sanityImageUrl(currentRef, projectId, dataset, "w=480");

  const findCovers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    try {
      const found: Candidate[] = [];

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
              (doc.first_publish_year
                ? String(doc.first_publish_year)
                : "Open Library");
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

      const dedup = Array.from(
        new Map(found.map((c) => [c.thumbUrl, c])).values(),
      );

      // HEAD-validate each candidate so broken ones don't show up
      const validations = await Promise.allSettled(
        dedup.map(async (c) => {
          const r = await fetch(
            `/api/cover-proxy?url=${encodeURIComponent(c.fullUrl)}`,
            { method: "HEAD" },
          );
          return r.ok ? c : null;
        }),
      );
      const validated = validations
        .map((r) => (r.status === "fulfilled" && r.value ? r.value : null))
        .filter((c): c is Candidate => c !== null);

      setCandidates(validated);
      if (validated.length === 0)
        setError(
          "No working cover candidates found. Try editing the ISBN or title, or upload manually.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover search failed");
    } finally {
      setLoading(false);
    }
  }, [isbn, title, authors]);

  const applyCover = useCallback(
    (assetId: string) => {
      props.onChange(
        set({
          _type: "image",
          asset: { _type: "reference", _ref: assetId },
          alt: title || "",
        }),
      );
    },
    [props, title],
  );

  const useCandidate = async (c: Candidate) => {
    setImportingId(c.id);
    setError(null);
    setStage(null);
    try {
      setStage("Downloading cover…");
      const blob = await fetchCoverFromUrl(c.fullUrl);

      setStage("Uploading to Sanity…");
      const assetId = await uploadAndVerify(client, blob, `cover-${c.id}.jpg`);

      setStage("Saving…");
      applyCover(assetId);

      setStage(null);
      setOpen(false);
      setCandidates([]);
    } catch (e) {
      console.error(e);
      setStage(null);
      setCandidates((prev) => prev.filter((x) => x.id !== c.id));
      setError("That cover didn't work — try another.");
    } finally {
      setImportingId(null);
    }
  };

  const uploadCustomFile = async (file: File) => {
    setImportingId("custom-upload");
    setError(null);
    setStage("Uploading to Sanity…");
    try {
      const assetId = await uploadAndVerify(
        client,
        file,
        file.name || "cover.jpg",
      );
      setStage("Saving…");
      applyCover(assetId);
      setStage(null);
    } catch (e) {
      console.error(e);
      setStage(null);
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImportingId(null);
    }
  };

  const clearCover = () => {
    props.onChange(unset());
  };

  const pickerButtonText = open
    ? "Refresh covers"
    : currentRef
      ? "Find more covers"
      : "Search for covers";

  return (
    <Stack space={3}>
      {/* Custom preview — bypasses Sanity's native image input entirely
          to avoid the stuck-on-loading bug after programmatic uploads. */}
      <Card
        radius={3}
        shadow={1}
        style={{
          overflow: "hidden",
          background: "#fafafa",
        }}
      >
        <Box
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "3 / 4",
            maxHeight: 360,
            overflow: "hidden",
          }}
        >
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={previewUrl}
              src={previewUrl}
              alt={value?.alt || title || ""}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "#f0f0f0",
              }}
              loading="eager"
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{
                width: "100%",
                height: "100%",
                background: "#f0f0f0",
                color: "#999",
              }}
            >
              <Stack space={2}>
                <ImagesIcon style={{ fontSize: 32, opacity: 0.5 }} />
                <Text size={1} muted>
                  No cover yet
                </Text>
              </Stack>
            </Flex>
          )}

          {importingId && stage && (
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255, 255, 255, 0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Stack space={3}>
                <Spinner muted />
                <Text size={1}>{stage}</Text>
              </Stack>
            </Box>
          )}
        </Box>
      </Card>

      {/* Action row */}
      <Flex gap={2} justify="flex-end" wrap="wrap">
        <Button
          mode="ghost"
          icon={UploadIcon}
          text="Upload file"
          fontSize={1}
          padding={2}
          disabled={Boolean(importingId)}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCustomFile(f);
            e.target.value = "";
          }}
        />
        {currentRef && (
          <Button
            mode="ghost"
            tone="critical"
            text="Remove"
            fontSize={1}
            padding={2}
            disabled={Boolean(importingId)}
            onClick={clearCover}
          />
        )}
        <Button
          mode="ghost"
          icon={open ? RefreshIcon : ImagesIcon}
          text={pickerButtonText}
          fontSize={1}
          padding={2}
          disabled={Boolean(importingId)}
          onClick={() => {
            setOpen(true);
            findCovers();
          }}
        />
      </Flex>

      {/* Alt text field — Sanity normally renders this via members; since we
          replaced the default render, surface it ourselves. */}
      <Stack space={2}>
        <Text size={1} weight="medium">
          Alt text
        </Text>
        <TextInput
          value={value?.alt || ""}
          placeholder="Describe the image for accessibility"
          onChange={(e) => {
            const next: ImageValue = { ...(value || {}), alt: e.currentTarget.value };
            if (!next.asset) delete next.alt;
            props.onChange(set(next));
          }}
        />
      </Stack>

      {/* Picker */}
      {open && (
        <Card padding={3} radius={2} shadow={1}>
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
    </Stack>
  );
}
