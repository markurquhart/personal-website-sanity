export const NAV_GROUPS = [
  {
    title: "Pages",
    value: "pages",
    description: "Site sections (Blog, Library) — row list with icon + label",
  },
  {
    title: "Professional",
    value: "professional",
    description: "Icon grid under Professional",
  },
  { title: "Social", value: "social", description: "Icon grid under Social" },
  {
    title: "Lifestyle",
    value: "lifestyle",
    description: "Icon grid under Lifestyle",
  },
] as const;

export type NavGroupId = (typeof NAV_GROUPS)[number]["value"];
