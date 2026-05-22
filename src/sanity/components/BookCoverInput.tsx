"use client";

// BookCoverInput
//
// Custom input for the book schema's `cover` field. Two jobs:
//
// 1. Render a reliable preview of the current cover. We intentionally
//    bypass Sanity's default image-preview component (props.renderDefault)
//    and render a plain `<img>` built via `urlFor()` against the asset
//    reference. Studio's stock preview can hang on "Loading…" forever after
//    a programmatic upload (a long-standing issue), so the plain element
//    sidesteps that entirely.
//
// 2. Offer three ways to set the cover: a Google Books picker (when we know
//    the title or ISBN), a native file upload, and a remove button. The
//    picker is what makes "find a different cover than the one Google gave
//    us during lookup" trivial.

import {
  CloseIcon,
  ImagesIcon,
  TrashIcon,
  UploadIcon,
} from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
  TextInput,
  useToast,
} from "@sanity/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  set,
  unset,
  useClient,
  useFormValue,
  type ImageValue,
  type ObjectInputProps,
} from "sanity";

import { urlFor } from "../lib/image";
import { fetchGoogleCover, uploadCoverBlob } from "./bookCoverHelpers";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;

type CoverCandidate = {
  id: string;
  title: string;
  authors: string[];
  thumbUrl: string;
};

export function BookCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const toast = useToast();
  const value = props.value;
  const hasAsset = Boolean(value?.asset?._ref);

  const title = useFormValue(["title"]) as string | undefined;
  const authors = useFormValue(["authors"]) as string[] | undefined;
  const isbn = useFormValue(["isbn"]) as string | undefined;
  const alt = (value as ImageValue & { alt?: string } | undefined)?.alt || "";

  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!value?.asset?._ref) return undefined;
    try {
      return urlFor(value).width(480).fit("max").url();
    } catch {
      return undefined;
    }
  }, [value]);

  const setCoverAsset = useCallback(
    (assetId: string, altText?: string) => {
      const next: ImageValue & { alt?: string } = {
        ...(value || {}),
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      };
      if (altText) next.alt = altText;
      props.onChange(set(next));
    },
    [props, value],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const assetId = await uploadCoverBlob(client, file, file.name);
        setCoverAsset(assetId, title);
        toast.push({ status: "success", title: "Cover uploaded" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.push({ status: "error", title: "Couldn't upload", description: msg });
      } finally {
        setUploading(false);
      }
    },
    [client, setCoverAsset, title, toast],
  );

  const handleAltChange = (next: string) => {
    if (!value) return;
    const updated: ImageValue & { alt?: string } = {
      ...value,
      alt: next || undefined,
    };
    props.onChange(set(updated));
  };

  const handleRemove = () => {
    props.onChange(unset());
  };

  return (
    <>
      <Card padding={3} radius={3} shadow={1} tone="default">
        <Stack space={4}>
          <Flex gap={4} align="flex-start">
            <CoverPreview previewUrl={previewUrl} alt={alt || title} />

            <Stack space={3} flex={1}>
              <Stack space={2}>
                <Text weight="semibold" size={2}>
                  Cover image
                </Text>
                <Text size={1} muted>
                  {hasAsset
                    ? "This image is uploaded to Sanity and served from your project."
                    : "No cover yet. Pick one from Google Books or upload a file."}
                </Text>
              </Stack>

              <Flex gap={2} wrap="wrap">
                <Button
                  text={hasAsset ? "Replace from Google" : "Find on Google"}
                  icon={ImagesIcon}
                  tone="primary"
                  mode="default"
                  onClick={() => setPickerOpen(true)}
                  disabled={uploading}
                />
                <Button
                  text="Upload file"
                  icon={UploadIcon}
                  mode="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                />
                {hasAsset ? (
                  <Button
                    text="Remove"
                    icon={TrashIcon}
                    mode="bleed"
                    tone="critical"
                    onClick={handleRemove}
                    disabled={uploading}
                  />
                ) : null}
                {uploading ? (
                  <Flex align="center" gap={2}>
                    <Spinner muted />
                    <Text muted size={1}>
                      Uploading…
                    </Text>
                  </Flex>
                ) : null}
              </Flex>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) handleFileUpload(f);
                  e.currentTarget.value = "";
                }}
              />
            </Stack>
          </Flex>

          {hasAsset ? (
            <Stack space={2}>
              <Text size={1} weight="medium">
                Alt text
              </Text>
              <TextInput
                value={alt}
                onChange={(e) => handleAltChange(e.currentTarget.value)}
                placeholder={title || "Describe the cover for accessibility"}
                fontSize={1}
                padding={3}
              />
            </Stack>
          ) : null}
        </Stack>
      </Card>

      {pickerOpen ? (
        <CoverPickerDialog
          title={title}
          authors={authors}
          isbn={isbn}
          onClose={() => setPickerOpen(false)}
          onPick={async (candidate) => {
            setPickerOpen(false);
            setUploading(true);
            try {
              const blob = await fetchGoogleCover(candidate.id, 3);
              const safeName =
                (title || candidate.title || "cover")
                  .replace(/[^a-z0-9]+/gi, "-")
                  .slice(0, 60) || "cover";
              const assetId = await uploadCoverBlob(
                client,
                blob,
                `${safeName}.jpg`,
              );
              setCoverAsset(assetId, title || candidate.title);
              toast.push({ status: "success", title: "Cover updated" });
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Upload failed";
              toast.push({
                status: "error",
                title: "Couldn't update cover",
                description: msg,
              });
            } finally {
              setUploading(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

function CoverPreview(props: { previewUrl?: string; alt?: string }) {
  const { previewUrl, alt } = props;
  return (
    <div
      style={{
        width: 140,
        aspectRatio: "2 / 3",
        flex: "0 0 auto",
        background: "var(--card-muted-bg-color, rgba(0,0,0,0.04))",
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--card-border-color, rgba(0,0,0,0.08))",
      }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={alt || ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Text muted size={4}>
          <ImagesIcon />
        </Text>
      )}
    </div>
  );
}

function CoverPickerDialog(props: {
  title?: string;
  authors?: string[];
  isbn?: string;
  onClose: () => void;
  onPick: (candidate: CoverCandidate) => void;
}) {
  const { title, authors, isbn, onClose, onPick } = props;
  const [query, setQuery] = useState(() => {
    if (isbn) return `isbn:${isbn}`;
    if (title && authors?.length)
      return `intitle:${title} inauthor:${authors[0]}`;
    if (title) return `intitle:${title}`;
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL(GOOGLE_BOOKS_API);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("maxResults", "12");
      url.searchParams.set("printType", "books");
      if (API_KEY) url.searchParams.set("key", API_KEY);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Google Books ${res.status}`);
      const data = (await res.json()) as {
        items?: {
          id: string;
          volumeInfo?: {
            title?: string;
            authors?: string[];
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          };
        }[];
      };
      const items = (data.items || [])
        .map<CoverCandidate | null>((it) => {
          const thumb =
            it.volumeInfo?.imageLinks?.thumbnail ||
            it.volumeInfo?.imageLinks?.smallThumbnail;
          if (!thumb) return null;
          return {
            id: it.id,
            title: it.volumeInfo?.title || "Untitled",
            authors: it.volumeInfo?.authors || [],
            thumbUrl: thumb
              .replace(/^http:\/\//, "https://")
              .replace(/&edge=curl/, "")
              .replace(/zoom=\d+/, "zoom=2"),
          };
        })
        .filter((c): c is CoverCandidate => Boolean(c));
      setCandidates(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run the initial search when the dialog opens with a seeded query.
  // The state updates here are intentional — we want the dialog to land
  // with results pre-loaded based on what we already know about the book.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    if (query.trim()) runSearch(query);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  return (
    <Dialog
      id="book-cover-picker"
      header="Find a cover"
      onClose={onClose}
      width={2}
      footer={
        <Flex padding={3} justify="flex-end">
          <Button text="Close" mode="ghost" icon={CloseIcon} onClick={onClose} />
        </Flex>
      }
    >
      <Box padding={4}>
        <Stack space={4}>
          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch(query);
                  }
                }}
                placeholder="Search Google Books for a cover…"
                fontSize={2}
                padding={3}
              />
            </Box>
            <Button
              text="Search"
              tone="primary"
              onClick={() => runSearch(query)}
              disabled={!query.trim() || loading}
              padding={3}
            />
          </Flex>

          {loading ? (
            <Flex align="center" justify="center" gap={3} padding={5}>
              <Spinner muted />
              <Text muted size={1}>
                Searching…
              </Text>
            </Flex>
          ) : error ? (
            <Card padding={3} radius={2} tone="critical">
              <Text size={1}>{error}</Text>
            </Card>
          ) : candidates.length === 0 ? (
            <Card padding={4} radius={2} tone="transparent">
              <Text muted size={1}>
                {query.trim()
                  ? "No covers found. Try a different query."
                  : "Type a title, author, or ISBN to search."}
              </Text>
            </Card>
          ) : (
            <Grid columns={[3, 4, 5]} gap={3}>
              {candidates.map((c) => (
                <CandidateTile key={c.id} candidate={c} onPick={onPick} />
              ))}
            </Grid>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}

function CandidateTile(props: {
  candidate: CoverCandidate;
  onPick: (c: CoverCandidate) => void;
}) {
  const { candidate, onPick } = props;
  return (
    <button
      type="button"
      onClick={() => onPick(candidate)}
      style={{
        appearance: "none",
        background: "transparent",
        border: "1px solid var(--card-border-color, rgba(0,0,0,0.08))",
        borderRadius: 6,
        padding: 6,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      title={`${candidate.title}${candidate.authors.length ? " — " + candidate.authors.join(", ") : ""}`}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "2 / 3",
          background: "var(--card-muted-bg-color, rgba(0,0,0,0.04))",
          borderRadius: 4,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={candidate.thumbUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--card-muted-fg-color)",
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {candidate.title}
      </div>
    </button>
  );
}
