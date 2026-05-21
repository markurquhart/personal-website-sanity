import { HomeIcon } from "@sanity/icons";
import { defineField, defineType, defineArrayMember } from "sanity";

export const homePage = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  icon: HomeIcon,
  fields: [
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      rows: 3,
      description:
        "The short bio paragraph shown in the sidebar / mobile profile.",
    }),
    defineField({
      name: "heroPhotos",
      title: "Hero Photos",
      description:
        "Photos shown in the slider on the home page, in the order they appear.",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "homeSlide" }],
        }),
      ],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "sections",
      title: "Additional Sections",
      description:
        "Optional content blocks shown below the hero on the home page.",
      type: "array",
      of: [
        defineArrayMember({
          name: "textSection",
          type: "object",
          title: "Text Section",
          fields: [
            defineField({
              name: "heading",
              type: "string",
              title: "Heading",
            }),
            defineField({
              name: "body",
              type: "array",
              title: "Body",
              of: [{ type: "block" }],
            }),
          ],
        }),
        defineArrayMember({
          name: "imageSection",
          type: "object",
          title: "Image",
          fields: [
            defineField({
              name: "image",
              type: "image",
              options: { hotspot: true },
              fields: [
                defineField({ name: "alt", type: "string", title: "Alt text" }),
                defineField({
                  name: "caption",
                  type: "string",
                  title: "Caption",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Home" }),
  },
});
