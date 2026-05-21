import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { PageShell } from "@/components/PageShell";
import { SanityImage } from "@/components/SanityImage";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { POST_QUERY, POST_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { Post } from "@/sanity/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs: { slug: string | null }[] = await client
    .withConfig({ useCdn: false, stega: false })
    .fetch(POST_SLUGS_QUERY);
  return (slugs ?? [])
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await sanityFetch({
    query: POST_QUERY,
    params: { slug },
    stega: false,
  });
  const post = res.data as Post | null;
  if (!post) return {};
  return {
    title: post.seoTitle || `${post.title} · Mark Urquhart`,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-5 text-[17px] leading-[1.8] text-[#404040]">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 font-display text-[1.75rem] font-bold leading-[1.3] text-[#1a1a1a]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 font-display text-[1.25rem] font-semibold leading-[1.4] text-[#1a1a1a]">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-[#c0392b] pl-5 text-[16px] italic text-[#525252]">
        {children}
      </blockquote>
    ),
  },
  types: {
    image: ({ value }) => (
      <figure className="my-8">
        <SanityImage
          value={value}
          width={1200}
          height={800}
          className="h-auto w-full rounded-md"
        />
        {value?.caption && (
          <figcaption className="mt-2 text-center text-[13px] text-[#888]">
            {value.caption}
          </figcaption>
        )}
      </figure>
    ),
  },
  marks: {
    link: ({ value, children }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[#c0392b] underline underline-offset-2 hover:opacity-70"
      >
        {children}
      </a>
    ),
  },
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await sanityFetch({
    query: POST_QUERY,
    params: { slug },
  });
  const post = data as Post | null;
  if (!post) notFound();

  const hero = post.coverImage?.asset
    ? urlFor(post.coverImage).width(1800).height(800).fit("crop").url()
    : null;

  return (
    <PageShell hideMobileProfile>
      <article className="flex flex-col gap-8 px-5 pt-[22px] pb-[60px] xl:px-0">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Blog
        </Link>

        <header className="flex flex-col gap-4">
          {post.category && (
            <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#c0392b]">
              {post.category}
            </div>
          )}
          <h1 className="m-0 font-display text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#333] md:text-[2.75rem]">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-[14px] text-[#888]">
            {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
            {post.readTime ? <span>{post.readTime} min read</span> : null}
          </div>
        </header>

        {hero && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hero}
            alt={post.coverImage?.alt || post.title || ""}
            className="h-[280px] w-full rounded-lg object-cover md:h-[400px]"
          />
        )}

        <div className="h-px w-full bg-[#e6e6e6]" />

        <div className="max-w-none">
          {post.body && (
            <PortableText value={post.body} components={components} />
          )}
        </div>

        <div className="h-px w-full bg-[#e6e6e6]" />

        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Blog
        </Link>
      </article>
    </PageShell>
  );
}
