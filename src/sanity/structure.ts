import { ImagesIcon } from "@sanity/icons";
import type { StructureResolver } from "sanity/structure";

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
      S.documentTypeListItem("post").title("Blog Posts"),
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
