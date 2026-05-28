/** GROQ fragment: navigation with fallback from legacy flat `socials` array. */
const NAV_LINK_ICON = `"icon": coalesce(icon.name, icon)`;

export const SITE_NAVIGATION_GROQ = `coalesce(
  navigation {
    pages[]{ label, url, ${NAV_LINK_ICON} },
    professional[]{ label, url, ${NAV_LINK_ICON} },
    social[]{ label, url, ${NAV_LINK_ICON} },
    lifestyle[]{ label, url, ${NAV_LINK_ICON} }
  },
  {
    "pages": socials[group == "pages"]{ label, url, ${NAV_LINK_ICON} },
    "professional": socials[group == "professional"]{ label, url, ${NAV_LINK_ICON} },
    "social": socials[group == "social"]{ label, url, ${NAV_LINK_ICON} },
    "lifestyle": socials[group == "lifestyle"]{ label, url, ${NAV_LINK_ICON} }
  }
)`;
