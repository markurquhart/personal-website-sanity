import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "general", title: "General", default: true },
    { name: "navigation", title: "Navigation" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Site Title",
      type: "string",
      group: "general",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      group: "general",
      description: "Used in browser tab, social previews, and meta tags.",
    }),
    defineField({
      name: "avatar",
      title: "Avatar / Profile photo",
      type: "image",
      group: "general",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
        }),
      ],
    }),
    defineField({
      name: "navigation",
      title: "Sidebar navigation",
      type: "siteNavigation",
      group: "navigation",
      description:
        "Each section matches a collapsible group in the sidebar (Pages, Professional, Social, Lifestyle). Add links and pick an icon under the section they belong to.",
    }),
    defineField({
      name: "footerText",
      title: "Footer Text",
      type: "string",
      group: "general",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
