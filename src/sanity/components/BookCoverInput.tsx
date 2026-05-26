"use client";

import { Stack, Text } from "@sanity/ui";
import { useEffect, useMemo, useState } from "react";
import {
  useClient,
  useDocumentOperation,
  useFormValue,
  type ImageValue,
  type ObjectInputProps,
} from "sanity";

import { urlFor } from "../lib/image";

import { normalizeDocumentOperationId } from "./bookImportHelpers";

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
  const [readyAssetRef, setReadyAssetRef] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!props.value?.asset?._ref) return undefined;
    try {
      return urlFor(props.value).width(480).fit("max").url();
    } catch {
      return undefined;
    }
  }, [props.value]);

  useEffect(() => {
    if (!previewPending || !assetRef || readyAssetRef === assetRef) return;

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
            setReadyAssetRef(assetRef);
            if (operationId && docType) {
              docOp.patch.execute([{ unset: ["coverPreviewPending"] }]);
            }
            return;
          }
        } catch {
          // Ignore transient propagation failures while the asset settles.
        }

        if (Date.now() >= deadline) {
          setReadyAssetRef(assetRef);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    warmAsset();

    return () => {
      cancelled = true;
    };
  }, [assetRef, client, docOp.patch, docType, operationId, previewPending, readyAssetRef]);

  if (previewPending && assetRef && readyAssetRef !== assetRef && previewUrl) {
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
        <Text muted size={1}>
          Finalizing cover preview...
        </Text>
      </Stack>
    );
  }

  return props.renderDefault(props);
}
