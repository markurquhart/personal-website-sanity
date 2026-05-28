import { MenuIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

import { NAV_GROUPS } from "../constants/navGroups";

export const siteNavigation = defineType({
  name: "siteNavigation",
  title: "Sidebar navigation",
  type: "object",
  icon: MenuIcon,
  fieldsets: NAV_GROUPS.map(({ title, value }) => ({
    name: value,
    title,
    options: {
      collapsible: true,
      collapsed: value !== "pages",
    },
  })),
  fields: NAV_GROUPS.map(({ value, description }) =>
    defineField({
      name: value,
      title: "Links",
      description,
      type: "array",
      fieldset: value,
      of: [{ type: "navLink" }],
    }),
  ),
});
