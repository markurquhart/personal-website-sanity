"use client";

import { Button, Stack, Text } from "@sanity/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useClient,
  useDocumentOperation,
  useFormValue,
  type ImageValue,
  type ObjectInputProps,
} from "sanity";

import { urlFor } from "../lib/image";

import { normalizeDocumentOperationId } from "./bookImportHelpers";

function loadPreviewImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Preview image failed to load"));
    img.src = src;
  });
}

export function BookCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: "2024-01-01" });
  const docId = useFormValue(["_id"]) as string | undefined;
  const docType = useFormValue(["_type"]) as string | undefined;
  const previewPending = useFormValue(["coverPreviewPending"]) as boolean | undefined;
  const operationId = useMemo(
    () => normalizeDocumentOperationId(docId),
    [docId],
  );
  const docOp = useDocumentOperation(operationId, docType || "book");
  const assetRef = props.value?.asset?._ref;

  const previewUrl = useMemo(() => {
    if (!props.value?.asset?._ref) return undefined;
    try {
      return urlFor(props.value).width(480).fit("max").url();
    } catch {
      return undefined;
    }
  }, [props.value]);

  const clearPreviewPending = useCallback(() => {
    if (previewPending && operationId && docType) {
      docOp.patch.execute([{ unset: ["coverPreviewPending"] }]);
    }
  }, [docOp.patch, docType, operationId, previewPending]);

  if (!assetRef || !previewUrl) {
    return props.renderDefault(props);
  }

  return (
    <StableCoverPreview
      key={`${docId || "new"}:${assetRef}`}
      assetRef={assetRef}
      client={client}
      previewPending={Boolean(previewPending)}
      previewUrl={previewUrl}
      renderNativeInput={() => props.renderDefault(props)}
      onPreviewReady={clearPreviewPending}
    />
  );
}

function StableCoverPreview(props: {
  assetRef: string;
  client: ReturnType<typeof useClient>;
  onPreviewReady: () => void;
  previewPending: boolean;
  previewUrl: string;
  renderNativeInput: () => React.ReactNode;
}) {
  const { assetRef, client, onPreviewReady, previewPending, previewUrl, renderNativeInput } =
    props;
  const [showNativeInput, setShowNativeInput] = useState(false);
  const [nativeReady, setNativeReady] = useState(!previewPending);

  useEffect(() => {
    if (!previewPending) return;

    let cancelled = false;
    const deadline = Date.now() + 15000;

    const warmAsset = async () => {
      while (!cancelled) {
        try {
          const doc = await client.fetch<{ url?: string } | null>(
            `*[_id == $id][0]{url}`,
            { id: assetRef },
          );

          if (doc?.url) {
            if (cancelled) return;
            try {
              await loadPreviewImage(previewUrl);
            } catch {
              // Keep polling until the actual preview URL is fetchable too.
              throw new Error("Preview URL not ready yet");
            }
            setNativeReady(true);
            onPreviewReady();
            return;
          }
        } catch {
          // Ignore transient propagation failures while the asset settles.
        }

        if (Date.now() >= deadline) {
          setNativeReady(true);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    warmAsset();

    return () => {
      cancelled = true;
    };
  }, [assetRef, client, onPreviewReady, previewPending, previewUrl]);

  if (showNativeInput && nativeReady) {
    return (
      <Stack space={3}>
        <Button
          text="Back to cover preview"
          mode="ghost"
          tone="primary"
          onClick={() => setShowNativeInput(false)}
        />
        {renderNativeInput()}
      </Stack>
    );
  }

  return (
    <Stack space={3}>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <Stack space={2}>
        <Button
          text={nativeReady ? "Edit cover details" : "Preparing image tools..."}
          mode="ghost"
          tone="primary"
          disabled={!nativeReady}
          onClick={() => setShowNativeInput(true)}
        />
        <Text muted size={1}>
          {previewPending && !nativeReady
            ? "Finalizing cover preview..."
            : "Stable preview shown by default. Open image tools when you want to crop, replace, or edit alt text."}
        </Text>
      </Stack>
    </Stack>
  );
}
