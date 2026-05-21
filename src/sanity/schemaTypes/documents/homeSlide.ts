import { ImageIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const homeSlide = defineType({
  name: "homeSlide",
  title: "Home Slider",
  type: "document",
  icon: ImageIcon,
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          validation: (rule) =>
            rule
              .required()
              .warning("Alt text is important for accessibility & SEO"),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      description: 'e.g. "Munich, Germany"',
    }),
    defineField({
      name: "takenAt",
      title: "Taken at",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
    }),
  ],
  orderings: [
    {
      title: "Taken at, Newest",
      name: "takenAtDesc",
      by: [{ field: "takenAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "location",
      subtitle: "takenAt",
      media: "image",
    },
  },
});
