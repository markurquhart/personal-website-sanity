"use client";

import { BookIcon, SearchIcon } from "@sanity/icons";
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
import { useClient, useDocumentOperation } from "sanity";

import { fetchGoogleCover, uploadCoverBlob } from "./bookCoverHelpers";
import {
  buildBookImportDefaults,
  buildBookImportFields,
  normalizeDocumentOperationId,
  searchGoogleBooks,
  type SearchResult,
} from "./bookImportHelpers";

type Phase =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; items: SearchResult[] }
  | { kind: "importing"; book: SearchResult; step: string }
  | { kind: "error"; message: string };

export function BookImportDialog(props: {
  documentId?: string;
  documentType?: string;
  onClose: () => void;
}) {
  const { documentId, documentType, onClose } = props;
  const client = useClient({ apiVersion: "2024-01-01" });
  const toast = useToast();
  const operationId = useMemo(
    () => normalizeDocumentOperationId(documentId),
    [documentId],
  );
  const docOp = useDocumentOperation(operationId, documentType || "book");
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runSearch = useCallback(async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "searching" });

    try {
      const items = await searchGoogleBooks(trimmed);
      if (controller.signal.aborted) return;
      setPhase({ kind: "results", items });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Search failed";
      setPhase({ kind: "error", message });
    }
  }, []);

  const importBook = useCallback(
    async (book: SearchResult) => {
      if (!operationId || !documentType) {
        toast.push({
          status: "error",
          title: "Can't import",
          description: "Document is not initialized yet.",
        });
        return;
      }

      setPhase({ kind: "importing", book, step: "Preparing fields" });

      let coverAssetId: string | undefined;
      let coverError: string | undefined;

      if (!book.thumbUrl) {
        coverError = "Google has no cover for this volume";
      } else {
        try {
          setPhase({ kind: "importing", book, step: "Downloading cover" });
          const blob = await fetchGoogleCover(book.id, 3);
          setPhase({ kind: "importing", book, step: "Uploading to Sanity" });
          const safeName = book.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
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

      try {
        docOp.patch.execute([
          { set: buildBookImportFields(book, coverAssetId) },
          { setIfMissing: buildBookImportDefaults() },
        ]);

        toast.push({
          status: coverError ? "warning" : "success",
          title: coverError ? "Imported without cover" : "Book imported",
          description: coverError || `Added “${book.title}” to this document.`,
        });
        onClose();
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
    [client, docOp.patch, documentType, onClose, operationId, toast],
  );

  return (
    <Stack space={4} padding={1}>
      <Text size={1} muted>
        Search Google Books to autofill title, author, ISBN, page count, year,
        genres, summary, and cover.
      </Text>

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

      <PhaseView phase={phase} onImport={importBook} />

      <Flex justify="flex-end">
        <Button text="Close" mode="ghost" onClick={onClose} />
      </Flex>
    </Stack>
  );
}

function PhaseView(props: {
  phase: Phase;
  onImport: (book: SearchResult) => void;
}) {
  const { phase, onImport } = props;

  if (phase.kind === "idle") {
    return (
      <Card padding={4} radius={2} tone="transparent">
        <Text size={1} muted>
          Search for a book to import metadata into this document.
        </Text>
      </Card>
    );
  }

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
        <Text size={1}>{phase.message}</Text>
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

function ResultRow(props: {
  book: SearchResult;
  onImport: (book: SearchResult) => void;
}) {
  const { book, onImport } = props;
  const meta = [book.year?.toString(), book.pageCount ? `${book.pageCount} pages` : undefined]
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
            {book.authors.length ? book.authors.join(", ") : "Unknown author"}
            {meta ? ` · ${meta}` : ""}
          </div>
        </Stack>

        <Button
          text="Import"
          tone="primary"
          mode="default"
          padding={3}
          onClick={() => onImport(book)}
        />
      </Flex>
    </Card>
  );
}
