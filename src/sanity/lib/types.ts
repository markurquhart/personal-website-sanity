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

export type SocialLink = {
  label: string;
  url: string;
  group: "professional" | "social" | "lifestyle";
  icon: string;
};

export type SiteSettings = {
  title?: string | null;
  tagline?: string | null;
  footerText?: string | null;
  avatar?: SanityImageAsset | null;
  socials?: SocialLink[] | null;
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
