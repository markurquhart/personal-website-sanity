"use client";

// BookCoverInput
//
// Custom input for the book `cover` field. Adds three editor shortcuts on
// top of Sanity's native image input (search Google Books, search Open
// Library, upload a file). Delegates preview + crop + hotspot + alt to
// `props.renderDefault(props)`.
//
// Why this works now where it didn't before:
//   1. `uploadCoverBlob` polls until the new asset doc is queryable
//      before returning, so when we set the `_ref` Studio's listener
//      cache already has the asset and the preview can resolve it
//      immediately instead of hanging in "Loading…".
//   2. We render `renderDefault` under a React `key` tied to the asset
//      `_ref`. When the cover changes, the previous native input fully
//      unmounts and a fresh one mounts — so even if the old preview ever
//      got stuck in a loading state, the new one starts clean.

import { CloseIcon, SearchIcon, UploadIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Inline,
  Spinner,
  Stack,
  Text,
  TextInput,
  useToast,
} from "@sanity/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  set,
  useClient,
  useFormValue,
  type ImageValue,
  type ObjectInputProps,
} from "sanity";

import {
  fetchGoogleCover,
  fetchOpenLibraryCover,
  uploadCoverBlob,
} from "./bookCoverHelpers";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API;
const OPEN_LIBRARY_API = "https://openlibrary.org/search.json";

type CoverSource = "google" | "openlibrary";

type CoverCandidate = {
  id: string;
  source: CoverSource;
  title: string;
  authors: string[];
  thumbUrl: string;
};

export function BookCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const toast = useToast();
  const value = props.value;

  const title = useFormValue(["title"]) as string | undefined;
  const authors = useFormValue(["authors"]) as string[] | undefined;
  const isbn = useFormValue(["isbn"]) as string | undefined;

  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState<CoverSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setCoverAsset = useCallback(
    (assetId: string, altText?: string) => {
      const next: ImageValue & { alt?: string } = {
        ...(value || {}),
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      };
      if (altText && !next.alt) next.alt = altText;
      props.onChange(set(next));
    },
    [props, value],
  );

  const handlePick = useCallback(
    async (candidate: CoverCandidate) => {
      setPicker(null);
      setUploading(true);
      try {
        const blob =
          candidate.source === "google"
            ? await fetchGoogleCover(candidate.id, 3)
            : await fetchOpenLibraryCover(candidate.id);
        const safeName =
          (title || candidate.title || "cover")
            .replace(/[^a-z0-9]+/gi, "-")
            .slice(0, 60) || "cover";
        const assetId = await uploadCoverBlob(client, blob, `${safeName}.jpg`);
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
    },
    [client, setCoverAsset, title, toast],
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
        toast.push({
          status: "error",
          title: "Couldn't upload",
          description: msg,
        });
      } finally {
        setUploading(false);
      }
    },
    [client, setCoverAsset, title, toast],
  );

  return (
    <Stack space={2}>
      <Inline space={1}>
        <Button
          text="Google Books"
          icon={SearchIcon}
          mode="bleed"
          padding={2}
          fontSize={1}
          onClick={() => setPicker("google")}
          disabled={uploading}
        />
        <Button
          text="Open Library"
          icon={SearchIcon}
          mode="bleed"
          padding={2}
          fontSize={1}
          onClick={() => setPicker("openlibrary")}
          disabled={uploading}
        />
        <Button
          text="Upload"
          icon={UploadIcon}
          mode="bleed"
          padding={2}
          fontSize={1}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        />
        {uploading ? (
          <Inline space={2}>
            <Spinner muted />
            <Text muted size={1}>
              Uploading…
            </Text>
          </Inline>
        ) : null}
      </Inline>

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

      {/* Sanity's default image input — preview, crop, hotspot, native
          upload/remove menu, and alt sub-field. The `key` forces a clean
          remount whenever the asset reference changes so the preview
          starts fresh and can't be stuck in a stale "Loading…" state. */}
      <div key={value?.asset?._ref || "empty"}>
        {props.renderDefault(props)}
      </div>

      {picker ? (
        <CoverPickerDialog
          source={picker}
          title={title}
          authors={authors}
          isbn={isbn}
          onClose={() => setPicker(null)}
          onPick={handlePick}
        />
      ) : null}
    </Stack>
  );
}

function CoverPickerDialog(props: {
  source: CoverSource;
  title?: string;
  authors?: string[];
  isbn?: string;
  onClose: () => void;
  onPick: (candidate: CoverCandidate) => void;
}) {
  const { source, title, authors, isbn, onClose, onPick } = props;

  // Seed the query with the most specific signal we have. ISBN gives an
  // exact match on both APIs; title+author is the next-best fallback. Both
  // Google Books and Open Library support `isbn:NNN…` and `intitle:` /
  // `inauthor:` filters via their search endpoints.
  const seedQuery = useCallback(() => {
    if (isbn) return `isbn:${isbn}`;
    if (source === "google") {
      if (title && authors?.length)
        return `intitle:${title} inauthor:${authors[0]}`;
      return title || "";
    }
    if (title && authors?.length) return `${title} ${authors[0]}`;
    return title || "";
  }, [source, title, authors, isbn]);

  const [query, setQuery] = useState(seedQuery);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        const items =
          source === "google"
            ? await searchGoogle(trimmed)
            : await searchOpenLibrary(trimmed);
        setCandidates(items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [source],
  );

  // Auto-run the initial search when the dialog opens with a seeded query.
  // The state updates here are intentional — we want the dialog to land
  // with results pre-loaded based on what we already know about the book.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    if (query.trim()) runSearch(query);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const header =
    source === "google" ? "Find a cover on Google Books" : "Find a cover on Open Library";
  const placeholder =
    source === "google"
      ? "Search Google Books (try `intitle:` or `isbn:`)…"
      : "Search Open Library…";

  return (
    <Dialog
      id={`book-cover-picker-${source}`}
      header={header}
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
                placeholder={placeholder}
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
                <CandidateTile
                  key={`${c.source}-${c.id}`}
                  candidate={c}
                  onPick={onPick}
                />
              ))}
            </Grid>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}

async function searchGoogle(query: string): Promise<CoverCandidate[]> {
  const url = new URL(GOOGLE_BOOKS_API);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("printType", "books");
  if (GOOGLE_API_KEY) url.searchParams.set("key", GOOGLE_API_KEY);
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
  return (data.items || [])
    .map<CoverCandidate | null>((it) => {
      const thumb =
        it.volumeInfo?.imageLinks?.thumbnail ||
        it.volumeInfo?.imageLinks?.smallThumbnail;
      if (!thumb) return null;
      return {
        id: it.id,
        source: "google",
        title: it.volumeInfo?.title || "Untitled",
        authors: it.volumeInfo?.authors || [],
        thumbUrl: thumb
          .replace(/^http:\/\//, "https://")
          .replace(/&edge=curl/, "")
          .replace(/zoom=\d+/, "zoom=2"),
      };
    })
    .filter((c): c is CoverCandidate => Boolean(c));
}

async function searchOpenLibrary(query: string): Promise<CoverCandidate[]> {
  const url = new URL(OPEN_LIBRARY_API);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("fields", "key,title,author_name,cover_i");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as {
    docs?: {
      key?: string;
      title?: string;
      author_name?: string[];
      cover_i?: number;
    }[];
  };
  return (data.docs || [])
    .map<CoverCandidate | null>((doc) => {
      if (!doc.cover_i) return null;
      return {
        id: String(doc.cover_i),
        source: "openlibrary",
        title: doc.title || "Untitled",
        authors: doc.author_name || [],
        thumbUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`,
      };
    })
    .filter((c): c is CoverCandidate => Boolean(c));
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
