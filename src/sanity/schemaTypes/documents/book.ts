import { BookIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

import { BookCoverInput } from "../../components/BookCoverInput";

export const BOOK_STATUSES = [
  { title: "Next", value: "up-next" },
  { title: "Currently Reading", value: "currently-reading" },
  { title: "Completed", value: "completed" },
  { title: "TBR", value: "paused" },
] as const;

// Fiction vs. Non-Fiction lives on its own `kind` field — every book is
// one or the other. Genres are sub-categories below that distinction.
export const BOOK_KINDS = [
  { title: "Fiction", value: "fiction" },
  { title: "Non-Fiction", value: "non-fiction" },
] as const;

export const GENRES = [
  "Art",
  "Biography",
  "Business",
  "Children's",
  "Cooking",
  "Drama",
  "Economics",
  "Education",
  "Fantasy",
  "Health",
  "History",
  "Horror",
  "Memoir",
  "Mystery",
  "Philosophy",
  "Poetry",
  "Politics",
  "Psychology",
  "Religion",
  "Romance",
  "Sci-Fi",
  "Science",
  "Self-Help",
  "Sociology",
  "Spirituality",
  "Sports",
  "Technology",
  "Thriller",
  "Travel",
  "Young Adult",
];

export const book = defineType({
  name: "book",
  title: "Book",
  type: "document",
  icon: BookIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "authors",
      title: "Authors",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
    }),
    defineField({
      name: "cover",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string" }),
      ],
      components: {
        input: BookCoverInput,
      },
    }),
    defineField({
      name: "summary",
      title: "Book summary",
      description:
        "Publisher / Google Books description. Auto-filled on import; edit if needed.",
      type: "text",
      rows: 6,
    }),

    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: BOOK_STATUSES.map((s) => ({ title: s.title, value: s.value })),
        layout: "radio",
      },
      validation: (rule) => rule.required(),
      initialValue: "up-next",
    }),
    defineField({
      name: "startedAt",
      title: "Started at",
      type: "date",
      description: "Date you started reading this attempt.",
      hidden: ({ document }) => !document?.status || document.status === "up-next",
    }),
    defineField({
      name: "finishedAt",
      title: "Finished at",
      type: "date",
      hidden: ({ document }) => document?.status !== "completed",
    }),
    defineField({
      name: "pausedAt",
      title: "Paused at",
      type: "date",
      hidden: ({ document }) => document?.status !== "paused",
    }),
    defineField({
      name: "addedAt",
      title: "Added to library",
      type: "date",
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({
      name: "rating",
      title: "Rating (0–5, half-stars OK)",
      type: "number",
      validation: (rule) => rule.min(0).max(5).precision(1),
      description: "Use 0.5 increments for half-stars",
      hidden: ({ document }) => document?.status !== "completed",
    }),
    defineField({
      name: "favorite",
      title: "Favorite",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.status !== "completed",
    }),
    defineField({
      name: "review",
      title: "Review / Notes",
      type: "array",
      hidden: ({ document }) => document?.status !== "completed",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: "genres",
      title: "Genres",
      description: "Sub-categories. Fiction vs Non-Fiction is set above.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: {
        list: GENRES.map((g) => ({ title: g, value: g })),
      },
    }),
    defineField({
      name: "kind",
      title: "Fiction or Non-Fiction",
      type: "string",
      options: {
        list: BOOK_KINDS.map((k) => ({ title: k.title, value: k.value })),
        layout: "radio",
      },
    }),
    defineField({
      name: "publishedYear",
      title: "Published year",
      type: "number",
    }),
    defineField({
      name: "pageCount",
      title: "Page count",
      type: "number",
      validation: (rule) => rule.positive().integer(),
    }),
    defineField({
      name: "isbn",
      title: "ISBN",
      type: "string",
    }),
    defineField({
      name: "externalLinks",
      title: "External Links",
      description: "Goodreads, publisher, etc.",
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
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Status, then started date",
      name: "statusStartedDesc",
      by: [
        { field: "status", direction: "asc" },
        { field: "startedAt", direction: "desc" },
      ],
    },
    {
      title: "Finished, newest first",
      name: "finishedDesc",
      by: [{ field: "finishedAt", direction: "desc" }],
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
      subtitle: "status",
      author0: "authors.0",
      media: "cover",
    },
    prepare({ title, subtitle, author0, media }) {
      const status = BOOK_STATUSES.find((s) => s.value === subtitle)?.title || subtitle;
      return {
        title,
        subtitle: [author0, status].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});
