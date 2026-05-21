"use client";

import { SearchIcon } from "@sanity/icons";
import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

import { BookSearchDialog } from "../components/BookSearchDialog";

export const bookLookupAction: DocumentActionComponent = (props) => {
  const [open, setOpen] = useState(false);

  return {
    label: "Lookup",
    icon: SearchIcon,
    onHandle: () => setOpen(true),
    dialog: open && {
      type: "dialog",
      header: "Find book on Google Books",
      content: (
        <BookSearchDialog
          documentId={props.id}
          onComplete={() => setOpen(false)}
        />
      ),
      onClose: () => setOpen(false),
    },
  };
};
