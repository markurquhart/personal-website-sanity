"use client";

import { BookIcon } from "@sanity/icons";
import { useCallback, useState } from "react";
import type { DocumentActionComponent } from "sanity";

import { BookImportDialog } from "./BookImportDialog";

export const BookImportAction: DocumentActionComponent = (props) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    props.onComplete();
  }, [props]);

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
