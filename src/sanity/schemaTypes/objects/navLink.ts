import { LinkIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

import { NavIconifyInput } from "../../components/NavIconifyInput";

export const navLink = defineType({
  name: "navLink",
  title: "Link",
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
      type: "string",
      description:
        "Site path (e.g. /blog, /library) or full URL (https://…, mailto:…).",
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!value || typeof value !== "string") return "Required";
          if (value.startsWith("/")) return true;
          try {
            const parsed = new URL(value);
            if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
              return true;
            }
          } catch {
            // fall through
          }
          return "Use a path starting with / or a full http(s)/mailto URL";
        }),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "icon",
      description:
        "Search Iconify’s full library (Simple Icons, Lucide, Material Design, etc.).",
      // @ts-expect-error sanity-plugin-iconify types omit components.input override
      components: {
        input: NavIconifyInput,
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "url", iconName: "icon.name" },
    prepare({ title, subtitle, iconName }) {
      return {
        title: title || "Link",
        subtitle: [iconName, subtitle].filter(Boolean).join(" · "),
      };
    },
  },
});
