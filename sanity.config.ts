import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { BookImportAction } from "./src/sanity/components/BookImportAction";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schema } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";

export default defineConfig({
  name: "default",
  title: "markurquhart.com",
  projectId,
  dataset,
  schema,
  document: {
    actions: (prev, context) =>
      context.schemaType === "book" ? [BookImportAction, ...prev] : prev,
  },
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
