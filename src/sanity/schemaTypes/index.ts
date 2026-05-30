import type { SchemaTypeDefinition } from "sanity";

import { book } from "./documents/book";
import { homePage } from "./documents/homePage";
import { homeSlide } from "./documents/homeSlide";
import { post } from "./documents/post";
import { siteSettings } from "./documents/siteSettings";
import { trip } from "./documents/trip";
import { tripPhoto } from "./documents/tripPhoto";
import { navLink } from "./objects/navLink";
import { siteNavigation } from "./objects/siteNavigation";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    homePage,
    siteSettings,
    post,
    book,
    trip,
    homeSlide,
    tripPhoto,
    navLink,
    siteNavigation,
  ],
};
