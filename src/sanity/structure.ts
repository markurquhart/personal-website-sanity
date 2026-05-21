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
      S.documentTypeListItem("photo").title("Photos"),
      S.divider(),
      S.documentTypeListItem("siteSettings").title("Site Settings"),
    ]);
