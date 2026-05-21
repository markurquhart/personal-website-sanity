"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { urlFor } from "@/sanity/lib/image";
import type { PostSummary } from "@/sanity/lib/types";

const CATEGORIES = [
  "Technology",
  "Marketing",
  "Sports",
  "Integrations",
  "Software",
] as const;

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-[14px] py-[6px] text-[13px] font-medium transition-all duration-200 ${
        active
          ? "border-[#333] bg-[#333] text-white"
          : "border-[#ddd] bg-white text-[#666] hover:border-[#333] hover:text-[#333]"
      }`}
    >
      {children}
    </button>
  );
}

function SortBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-[4px] px-2 py-1 text-[12px] transition-colors ${
        active ? "font-semibold text-[#333]" : "text-[#888] hover:text-[#333]"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function FeaturedCard({ post }: { post: PostSummary }) {
  const coverUrl = post.coverImage?.asset
    ? urlFor(post.coverImage).width(1200).height(900).fit("crop").url()
    : null;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[12px] border border-[#eee] text-inherit no-underline transition-all hover:border-[#ccc] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] md:flex-row md:gap-[2rem]"
    >
      <div
        className="h-[220px] w-full flex-shrink-0 bg-cover bg-center md:h-auto md:min-h-[280px] md:w-[45%]"
        style={
          coverUrl
            ? { backgroundImage: `url("${coverUrl}")` }
            : {
                backgroundImage:
                  "linear-gradient(135deg, #f0f0f0, #e0e0e0)",
              }
        }
      />
      <div className="flex flex-col justify-center gap-3 p-6 md:p-[2rem] md:pl-0">
        {post.category && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c0392b]">
            {post.category}
          </div>
        )}
        <h2 className="m-0 font-display text-[1.5rem] font-bold leading-[1.3] text-[#1a1a1a]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="m-0 text-[14px] leading-[1.7] text-[#666]">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-4 text-[12px] text-[#999]">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readTime ? <span>{post.readTime} min read</span> : null}
        </div>
      </div>
    </Link>
  );
}

function Card({ post }: { post: PostSummary }) {
  const coverUrl = post.coverImage?.asset
    ? urlFor(post.coverImage).width(800).height(500).fit("crop").url()
    : null;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[10px] border border-[#eee] text-inherit no-underline transition-all hover:border-[#ccc] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
    >
      <div
        className="h-[250px] w-full bg-cover bg-center"
        style={
          coverUrl
            ? { backgroundImage: `url("${coverUrl}")` }
            : {
                backgroundImage:
                  "linear-gradient(135deg, #f5f5f5, #e8e8e8)",
              }
        }
      />
      <div className="flex flex-col gap-2 p-5">
        {post.category && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c0392b]">
            {post.category}
          </div>
        )}
        <div className="m-0 font-display text-[1rem] font-semibold leading-[1.35] text-[#1a1a1a]">
          {post.title}
        </div>
        {post.excerpt && (
          <div className="m-0 text-[13px] leading-[1.6] text-[#666]">
            {post.excerpt}
          </div>
        )}
        <div className="mt-1 flex items-center gap-4 text-[12px] text-[#999]">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readTime ? <span>{post.readTime} min read</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function BlogContent({ posts }: { posts: PostSummary[] }) {
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const featured = useMemo(() => posts.find((p) => p.featured), [posts]);
  const rest = useMemo(() => posts.filter((p) => !p.featured), [posts]);

  const filtered = useMemo(() => {
    const arr =
      category === "all" ? [...rest] : rest.filter((p) => p.category === category);
    arr.sort((a, b) => {
      const ad = new Date(a.publishedAt || 0).getTime();
      const bd = new Date(b.publishedAt || 0).getTime();
      return sort === "newest" ? bd - ad : ad - bd;
    });
    return arr;
  }, [rest, category, sort]);

  return (
    <div className="flex min-h-screen flex-col gap-8 px-5 py-[22px] pb-[42px] xl:px-0">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-display text-[2.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-[#333]">
          Blog
        </h1>
        <p className="m-0 text-[15px] leading-[1.5] text-[#888]">
          Thoughts on technology, marketing, sports, and more.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e5] pb-3">
        <div className="flex flex-wrap gap-2">
          <Pill active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Pill>
          {CATEGORIES.map((c) => (
            <Pill
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </Pill>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#999]">Sort:</span>
          <SortBtn
            active={sort === "newest"}
            onClick={() => setSort("newest")}
          >
            Newest
          </SortBtn>
          <SortBtn
            active={sort === "oldest"}
            onClick={() => setSort("oldest")}
          >
            Oldest
          </SortBtn>
        </div>
      </div>

      {featured && category === "all" && (
        <section className="flex flex-col gap-4">
          <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]">
            Featured
          </h3>
          <FeaturedCard post={featured} />
        </section>
      )}

      <section className="flex flex-col gap-5">
        <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#999]">
          {category === "all" ? "Recent Posts" : `${category} Posts`}
        </h3>
        {filtered.length === 0 ? (
          <p className="text-[14px] text-[#888]">
            No posts in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filtered.map((p) => (
              <Card key={p._id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
