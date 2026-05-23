import { defineQuery } from "next-sanity";

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings"][0]{
    title,
    tagline,
    footerText,
    avatar{
      asset->{ _id, url, metadata { lqip, dimensions } },
      alt
    },
    socials[]{ label, url, group, icon }
  }
`);

// Single combined query used by every page (sidebar + intro)
export const SHELL_QUERY = defineQuery(`{
  "settings": *[_type == "siteSettings"][0]{
    title,
    tagline,
    footerText,
    avatar{
      asset->{ _id, url, metadata { lqip, dimensions } },
      alt
    },
    socials[]{ label, url, group, icon }
  },
  "home": *[_type == "homePage"][0]{
    intro
  }
}`);

export const HOME_QUERY = defineQuery(`
  *[_type == "homePage"][0]{
    intro,
    "heroPhotos": heroPhotos[]->{
      _id,
      location,
      takenAt,
      caption,
      image{
        asset->{ _id, url, metadata { lqip, dimensions } },
        alt,
        hotspot,
        crop
      }
    },
    sections
  }
`);

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    category,
    readTime,
    featured,
    coverImage{
      asset->{ _id, url, metadata { lqip } },
      alt
    }
  }
`);

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    category,
    readTime,
    seoTitle,
    seoDescription,
    coverImage{
      asset->{ _id, url, metadata { lqip, dimensions } },
      alt
    },
    body[]{
      ...,
      _type == "image" => {
        asset->{ _id, url, metadata { lqip, dimensions } },
        alt,
        caption
      }
    }
  }
`);

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)]{ "slug": slug.current }
`);

export const BOOKS_QUERY = defineQuery(`
  *[_type == "book" && defined(slug.current)]{
    _id,
    title,
    subtitle,
    "slug": slug.current,
    authors,
    cover{
      asset->{ _id, url, metadata { lqip } },
      alt
    },
    kind,
    genres,
    status,
    startedAt,
    finishedAt,
    pausedAt,
    rating,
    favorite,
    pageCount,
    publishedYear
  }
`);

export const BOOK_QUERY = defineQuery(`
  *[_type == "book" && slug.current == $slug][0]{
    _id,
    title,
    subtitle,
    "slug": slug.current,
    authors,
    isbn,
    pageCount,
    publishedYear,
    kind,
    genres,
    cover{
      asset->{ _id, url, metadata { lqip, dimensions } },
      alt
    },
    status,
    addedAt,
    startedAt,
    finishedAt,
    pausedAt,
    abandonedAt,
    rating,
    favorite,
    review,
    events[] | order(date asc){
      _key,
      type,
      date,
      ratingValue,
      note
    },
    externalLinks[]{ label, url }
  }
`);

export const BOOK_SLUGS_QUERY = defineQuery(`
  *[_type == "book" && defined(slug.current)]{ "slug": slug.current }
`);
