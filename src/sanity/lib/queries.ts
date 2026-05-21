import { defineQuery } from "next-sanity";

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_type == "siteSettings"][0]{
    title,
    tagline,
    bio,
    footerText,
    avatar{
      asset->{ _id, url, metadata { lqip, dimensions } },
      alt
    },
    socials[]{ label, url, group, icon }
  }
`);

export const PHOTOS_QUERY = defineQuery(`
  *[_type == "photo"] | order(takenAt asc){
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
