import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { iconify } from "sanity-plugin-iconify";
import { structureTool } from "sanity/structure";

import { BookImportAction } from "./src/sanity/components/BookImportAction";
import { schema } from "./src/sanity/schemaTypes";
import {
  studioApiVersion,
  studioDataset,
  studioProjectId,
} from "./src/sanity/studioEnv";
import { structure } from "./src/sanity/structure";

export default defineConfig({
  name: "default",
  title: "markurquhart.com",
  projectId: studioProjectId,
  dataset: studioDataset,
  schema,
  document: {
    actions: (prev, context) =>
      context.schemaType === "book" ? [BookImportAction, ...prev] : prev,
  },
  plugins: [
    structureTool({ structure }),
    iconify({
      showName: true,
      // Empty = full Iconify catalog (Simple Icons, Lucide, MDI, etc.)
    }),
    visionTool({ defaultApiVersion: studioApiVersion }),
  ],
});
