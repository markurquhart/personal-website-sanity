import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { BookImportAction } from "@/sanity/components/BookImportAction";
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
  document: {
    actions: (prev, context) =>
      context.schemaType === "book" ? [BookImportAction, ...prev] : prev,
  },
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
