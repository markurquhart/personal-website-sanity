/** Maps legacy short icon keys (pre-Iconify) to Iconify IDs. */
export const LEGACY_NAV_ICON_MAP: Record<string, string> = {
  linkedin: "simple-icons:linkedin",
  github: "simple-icons:github",
  webflow: "simple-icons:webflow",
  instagram: "simple-icons:instagram",
  threads: "simple-icons:threads",
  email: "lucide:mail",
  goodreads: "simple-icons:goodreads",
  strava: "simple-icons:strava",
  lastfm: "simple-icons:lastdotfm",
  blog: "lucide:newspaper",
  book: "lucide:book-open",
};

export type NavIconValue =
  | string
  | {
      _type?: "icon";
      name?: string | null;
    }
  | null
  | undefined;

/** Normalize Sanity icon field → Iconify id (`collection:icon-name`). */
export function resolveNavIconId(icon: NavIconValue): string | null {
  if (!icon) return null;
  if (typeof icon === "string") {
    if (icon.includes(":")) return icon;
    return LEGACY_NAV_ICON_MAP[icon] ?? null;
  }
  const name = icon.name?.trim();
  if (!name) return null;
  if (name.includes(":")) return name;
  return LEGACY_NAV_ICON_MAP[name] ?? null;
}
