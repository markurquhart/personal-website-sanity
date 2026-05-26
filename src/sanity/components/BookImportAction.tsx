"use client";

import { BookIcon } from "@sanity/icons";
import { useCallback, useState } from "react";
import type { DocumentActionComponent } from "sanity";

import { BookImportDialog } from "./BookImportDialog";

export const BookImportAction: DocumentActionComponent = (props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentDoc = (props.draft || props.published) as
    | {
        authors?: string[];
        cover?: { asset?: unknown } | null;
        isbn?: string | null;
        summary?: string | null;
      }
    | undefined;
  const hasImportedContent = Boolean(
    currentDoc?.isbn ||
      currentDoc?.summary ||
      currentDoc?.cover?.asset ||
      currentDoc?.authors?.length,
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    props.onComplete();
  }, [props]);

  if (hasImportedContent) {
    return null;
  }

  return {
    label: "Import Book",
    title: "Search Google Books and import metadata into this book.",
    icon: BookIcon,
    onHandle: () => setDialogOpen(true),
    dialog: dialogOpen
      ? {
          type: "dialog",
          header: "Import Book",
          width: "large",
          onClose: closeDialog,
          content: (
            <BookImportDialog
              documentId={props.id}
              documentType={props.type}
              onClose={closeDialog}
            />
          ),
        }
      : undefined,
  };
};
