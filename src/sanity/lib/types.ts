export type SanityImageAsset = {
  asset?: {
    _id?: string;
    url?: string;
    metadata?: {
      lqip?: string;
      dimensions?: { width: number; height: number };
    };
  };
  alt?: string | null;
  hotspot?: unknown;
  crop?: unknown;
};

export type NavGroup = "pages" | "professional" | "social" | "lifestyle";

export type NavLinkItem = {
  label: string;
  url: string;
  icon: string;
};

/** Flat link with group — used by nav UI components. */
export type SocialLink = NavLinkItem & {
  group: NavGroup;
};

export type SiteNavigation = {
  pages?: NavLinkItem[] | null;
  professional?: NavLinkItem[] | null;
  social?: NavLinkItem[] | null;
  lifestyle?: NavLinkItem[] | null;
};

export type SiteSettings = {
  title?: string | null;
  tagline?: string | null;
  footerText?: string | null;
  avatar?: SanityImageAsset | null;
  navigation?: SiteNavigation | null;
};

export type HomePage = {
  intro?: string | null;
  heroPhotos?: HomeSlide[] | null;
  sections?: unknown[] | null;
};

export type HomeSlide = {
  _id: string;
  location?: string | null;
  takenAt?: string | null;
  caption?: string | null;
  image?: SanityImageAsset | null;
};

// Back-compat alias while components still reference the older name
export type Photo = HomeSlide;

export type PostSummary = {
  _id: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  category?: string | null;
  readTime?: number | null;
  featured?: boolean | null;
  coverImage?: SanityImageAsset | null;
};

export type PortableTextBlock = {
  _type: string;
  _key: string;
  [k: string]: unknown;
};

export type Post = PostSummary & {
  seoTitle?: string | null;
  seoDescription?: string | null;
  body?: PortableTextBlock[] | null;
  category?: string | null;
  readTime?: number | null;
};

export type BookStatus =
  | "up-next"
  | "currently-reading"
  | "completed"
  | "paused";

export type BookSummary = {
  _id: string;
  title?: string | null;
  subtitle?: string | null;
  slug?: string | null;
  authors?: string[] | null;
  cover?: SanityImageAsset | null;
  kind?: "fiction" | "non-fiction" | null;
  genres?: string[] | null;
  status?: BookStatus | null;
  addedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  pausedAt?: string | null;
  rating?: number | null;
  favorite?: boolean | null;
  pageCount?: number | null;
  publishedYear?: number | null;
};

export type Book = BookSummary & {
  isbn?: string | null;
  addedAt?: string | null;
  summary?: string | null;
  review?: PortableTextBlock[] | null;
  externalLinks?: { label: string; url: string }[] | null;
};
