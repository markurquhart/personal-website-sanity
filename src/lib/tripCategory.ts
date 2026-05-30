import type { TripCategory } from "@/sanity/lib/types";

export const TRIP_CATEGORY_LABEL: Record<TripCategory, string> = {
  personal: "Personal",
  family: "Family",
  work: "Work",
};

// Single brand accent used for every category dot. Categories are
// distinguished by their text label, not by hue.
export const TRIP_BRAND_RED = "#c0392b";

export const ALL_TRIP_CATEGORIES: TripCategory[] = [
  "personal",
  "family",
  "work",
];
