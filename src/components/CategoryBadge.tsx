import { TRIP_BRAND_RED, TRIP_CATEGORY_LABEL } from "@/lib/tripCategory";
import type { TripCategory } from "@/sanity/lib/types";

export function CategoryBadge({
  category,
  size = "md",
}: {
  category: TripCategory;
  size?: "sm" | "md";
}) {
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${text} font-semibold uppercase tracking-[0.08em] text-[#999]`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: TRIP_BRAND_RED }}
      />
      <span>{TRIP_CATEGORY_LABEL[category]}</span>
    </span>
  );
}
