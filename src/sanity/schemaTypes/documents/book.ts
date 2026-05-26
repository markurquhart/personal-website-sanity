import { BookIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

import { BookCoverInput } from "../../components/BookCoverInput";

export const BOOK_STATUSES = [
  { title: "Up Next", value: "up-next" },
  { title: "Currently Reading", value: "currently-reading" },
  { title: "Completed", value: "completed" },
  { title: "Paused", value: "paused" },
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
  groups: [
    { name: "details", title: "About", default: true },
    { name: "status", title: "Reading" },
    // Hidden until a book is finished — no point asking for a rating /
    // review before the editor has actually read it.
    {
      name: "review",
      title: "Review",
      hidden: ({ document }) => document?.status !== "completed",
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "details",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      group: "details",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "details",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "authors",
      title: "Authors",
      type: "array",
      group: "details",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "cover",
      title: "Cover Image",
      type: "image",
      group: "details",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string" }),
      ],
      components: {
        input: BookCoverInput,
      },
    }),
    defineField({
      name: "coverPreviewPending",
      title: "Cover preview pending",
      type: "boolean",
      group: "details",
      hidden: true,
    }),
    defineField({
      name: "isbn",
      title: "ISBN",
      type: "string",
      group: "details",
    }),
    defineField({
      name: "pageCount",
      title: "Page count",
      type: "number",
      group: "details",
      validation: (rule) => rule.positive().integer(),
    }),
    defineField({
      name: "kind",
      title: "Fiction or Non-Fiction",
      type: "string",
      group: "details",
      options: {
        list: BOOK_KINDS.map((k) => ({ title: k.title, value: k.value })),
        layout: "radio",
      },
    }),
    defineField({
      name: "genres",
      title: "Genres",
      description: "Sub-categories. Fiction vs Non-Fiction is set above.",
      type: "array",
      group: "details",
      of: [defineArrayMember({ type: "string" })],
      options: {
        list: GENRES.map((g) => ({ title: g, value: g })),
      },
    }),
    defineField({
      name: "publishedYear",
      title: "Published year",
      type: "number",
      group: "details",
    }),
    defineField({
      name: "summary",
      title: "Book summary",
      description:
        "Publisher / Google Books description. Auto-filled on import; edit if needed.",
      type: "text",
      rows: 6,
      group: "details",
    }),
    defineField({
      name: "externalLinks",
      title: "External Links",
      description: "Goodreads, publisher, etc.",
      type: "array",
      group: "details",
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

    // Status
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "status",
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
      group: "status",
      description: "Date you started reading this attempt.",
    }),
    defineField({
      name: "finishedAt",
      title: "Finished at",
      type: "date",
      group: "status",
      hidden: ({ parent }) => parent?.status !== "completed",
    }),
    defineField({
      name: "pausedAt",
      title: "Paused at",
      type: "date",
      group: "status",
      hidden: ({ parent }) => parent?.status !== "paused",
    }),
    defineField({
      name: "abandonedAt",
      title: "Abandoned at",
      type: "date",
      group: "status",
      hidden: ({ parent }) => parent?.status !== "paused",
      description:
        "Use this only if you've fully given up — for a temporary stop use Paused at.",
    }),
    defineField({
      name: "addedAt",
      title: "Added to library",
      type: "date",
      group: "status",
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),

    // Review
    defineField({
      name: "rating",
      title: "Rating (0–5, half-stars OK)",
      type: "number",
      group: "review",
      validation: (rule) => rule.min(0).max(5).precision(1),
      description: "Use 0.5 increments for half-stars",
    }),
    defineField({
      name: "favorite",
      title: "Favorite",
      type: "boolean",
      group: "review",
      initialValue: false,
    }),
    defineField({
      name: "review",
      title: "Review / Notes",
      type: "array",
      group: "review",
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
