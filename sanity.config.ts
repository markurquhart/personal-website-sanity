import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { bookLookupAction } from "@/sanity/actions/bookLookup";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { schema } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";

export default defineConfig({
  name: "default",
  title: "markurquhart.com",
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
  document: {
    actions: (prev, context) => {
      if (context.schemaType === "book") {
        // Append so Publish stays primary; Lookup appears in the document
        // actions menu (kebab/chevron next to Publish).
        return [...prev, bookLookupAction];
      }
      return prev;
    },
  },
});
