import { LinkIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const socialLink = defineType({
  name: "socialLink",
  title: "Social Link",
  type: "object",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      validation: (rule) =>
        rule.required().uri({ scheme: ["http", "https", "mailto"] }),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      options: {
        list: [
          { title: "LinkedIn", value: "linkedin" },
          { title: "GitHub", value: "github" },
          { title: "Webflow", value: "webflow" },
          { title: "Instagram", value: "instagram" },
          { title: "Threads", value: "threads" },
          { title: "Email", value: "email" },
          { title: "Goodreads", value: "goodreads" },
          { title: "Strava", value: "strava" },
          { title: "Last.fm", value: "lastfm" },
          { title: "Blog", value: "blog" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "group",
      title: "Group",
      type: "string",
      options: {
        list: [
          { title: "Professional", value: "professional" },
          { title: "Social", value: "social" },
          { title: "Lifestyle", value: "lifestyle" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "url" },
  },
});
