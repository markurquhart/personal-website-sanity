import type { SchemaTypeDefinition } from "sanity";

import { homePage } from "./documents/homePage";
import { photo } from "./documents/photo";
import { post } from "./documents/post";
import { siteSettings } from "./documents/siteSettings";
import { socialLink } from "./objects/socialLink";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [homePage, siteSettings, photo, post, socialLink],
};
