import type {
  NavGroup,
  NavLinkItem,
  SiteNavigation,
  SocialLink,
} from "@/sanity/lib/types";

/** True for absolute http(s)/mailto links; false for on-site paths like /blog. */
export function isExternalNavUrl(url: string) {
  return !url.startsWith("/");
}

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const NAV_SIDEBAR_GROUPS: NavGroup[] = [
  "pages",
  "professional",
  "social",
  "lifestyle",
];

const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  pages: "Pages",
  professional: "Professional",
  social: "Social",
  lifestyle: "Lifestyle",
};

export function navGroupLabel(group: NavGroup) {
  return NAV_GROUP_LABELS[group];
}

export function flattenNavigation(
  navigation?: SiteNavigation | null,
): SocialLink[] {
  if (!navigation) return [];
  return NAV_SIDEBAR_GROUPS.flatMap((group) =>
    (navigation[group] ?? []).map((link) => ({ ...link, group })),
  );
}

export function groupNavLinks(links: SocialLink[]) {
  const byGroup = (group: NavGroup) =>
    links.filter((link) => link.group === group);
  return {
    pages: byGroup("pages"),
    professional: byGroup("professional"),
    social: byGroup("social"),
    lifestyle: byGroup("lifestyle"),
  };
}

export function groupNavigation(navigation?: SiteNavigation | null) {
  return {
    pages: navigation?.pages ?? [],
    professional: navigation?.professional ?? [],
    social: navigation?.social ?? [],
    lifestyle: navigation?.lifestyle ?? [],
  };
}

export function navigationLinkCount(navigation?: SiteNavigation | null) {
  return NAV_SIDEBAR_GROUPS.reduce(
    (sum, group) => sum + (navigation?.[group]?.length ?? 0),
    0,
  );
}

export type { NavLinkItem, SiteNavigation, SocialLink };
