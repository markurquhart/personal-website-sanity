import { BookIcon, DocumentsIcon, ImagesIcon } from "@sanity/icons";
import type { StructureBuilder, StructureResolver } from "sanity/structure";

import { BOOK_STATUSES } from "./schemaTypes/documents/book";

const BOOK_STATUS_ORDER = [
  "currently-reading",
  "up-next",
  "paused",
  "completed",
] as const;

function bookStatusListItems(S: StructureBuilder) {
  return BOOK_STATUS_ORDER.map((status) => {
    const label =
      BOOK_STATUSES.find((entry) => entry.value === status)?.title ?? status;
    const ordering =
      status === "completed"
        ? [{ field: "finishedAt", direction: "desc" as const }]
        : status === "currently-reading"
          ? [{ field: "startedAt", direction: "desc" as const }]
          : status === "paused"
            ? [{ field: "pausedAt", direction: "desc" as const }]
            : [{ field: "addedAt", direction: "desc" as const }];

    return S.listItem()
      .title(label)
      .child(
        S.documentList()
          .title(label)
          .filter('_type == "book" && status == $status')
          .params({ status })
          .defaultOrdering(ordering),
      );
  });
}

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Pages")
        .child(
          S.list()
            .title("Pages")
            .items([
              S.listItem()
                .title("Home")
                .id("homePage")
                .child(
                  S.document()
                    .schemaType("homePage")
                    .documentId("homePage"),
                ),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title("Entries")
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title("Entries")
            .items([
              S.documentTypeListItem("post").title("Blog Posts"),
              S.listItem()
                .title("Books")
                .icon(BookIcon)
                .child(
                  S.list()
                    .title("Books")
                    .items([
                      ...bookStatusListItems(S),
                      S.divider(),
                      S.documentTypeListItem("book").title("All Books"),
                    ]),
                ),
              // Future entry types go here, e.g.:
              // S.documentTypeListItem("place").title("Places"),
              // S.documentTypeListItem("project").title("Projects"),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title("Assets")
        .icon(ImagesIcon)
        .child(
          S.list()
            .title("Assets")
            .items([
              S.documentTypeListItem("homeSlide").title("Home Sliders"),
              // Future asset types go here, e.g.:
              // S.documentTypeListItem("headshot").title("Headshots"),
              // S.documentTypeListItem("projectPhoto").title("Project Photos"),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem("siteSettings").title("Site Settings"),
    ]);
