import { EarthGlobeIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

import { LocationPickerInput } from "../../components/LocationPickerInput";

export const TRIP_CATEGORIES = [
  { title: "Personal", value: "personal" },
  { title: "Family", value: "family" },
  { title: "Work", value: "work" },
] as const;

export const trip = defineType({
  name: "trip",
  title: "Trip",
  type: "document",
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: 'e.g. "Tokyo 2024"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: TRIP_CATEGORIES.map((c) => ({ title: c.title, value: c.value })),
        layout: "radio",
      },
      validation: (rule) => rule.required(),
      initialValue: "personal",
    }),
    defineField({
      name: "cover",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string" }),
      ],
    }),
    defineField({
      name: "location",
      title: "Location (pin)",
      type: "geopoint",
      description:
        "Search for a place or click the map to drop a pin. Drag the pin to refine.",
      validation: (rule) => rule.required(),
      components: {
        input: LocationPickerInput,
      },
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
    }),
    defineField({
      name: "state",
      title: "State / Region",
      description:
        "US state, Canadian province, or whatever sub-national region applies. Optional.",
      type: "string",
    }),
    defineField({
      name: "country",
      title: "Country",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "startedAt",
      title: "Start date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endedAt",
      title: "End date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      description: "Short blurb shown on cards and at the top of the detail page.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(320),
    }),
    defineField({
      name: "body",
      title: "Trip log",
      type: "array",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    validation: (rule) =>
                      rule.uri({ scheme: ["http", "https", "mailto"] }),
                  },
                ],
              },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: "relatedPosts",
      title: "Related blog posts",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "post" }],
        }),
      ],
    }),
    defineField({
      name: "photos",
      title: "Photo gallery",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "tripPhoto" }],
        }),
      ],
    }),
    defineField({
      name: "externalLinks",
      title: "External links",
      description: "Booking, maps, anything you want to link out to.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              type: "url",
              validation: (rule) =>
                rule.required().uri({ scheme: ["http", "https"] }),
            }),
          ],
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: "Start date, Newest",
      name: "startedAtDesc",
      by: [{ field: "startedAt", direction: "desc" }],
    },
    {
      title: "Title A→Z",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      country: "country",
      startedAt: "startedAt",
      media: "cover",
    },
    prepare({ title, category, country, startedAt, media }) {
      const cat = TRIP_CATEGORIES.find((c) => c.value === category)?.title;
      const year = startedAt ? new Date(startedAt).getFullYear() : null;
      const subtitle = [country, year, cat].filter(Boolean).join(" · ");
      return { title, subtitle, media };
    },
  },
});
