import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { CategoryBadge } from "@/components/CategoryBadge";
import { PageShell } from "@/components/PageShell";
import { TripPhotoGallery } from "@/components/TripPhotoGallery";
import { TravelMap } from "@/components/TravelMap";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { TRIP_QUERY, TRIP_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { Trip } from "@/sanity/lib/types";

export const revalidate = 60;

const LABEL_CLASS =
  "m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#111]";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRange(start?: string | null, end?: string | null) {
  const s = start ? formatDate(start) : "";
  const e = end ? formatDate(end) : "";
  if (s && e && s === e) return s;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

const bodyBlocks: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-4 max-w-[42rem] text-[16px] leading-[1.8] text-[#2f2f2f] last:mb-0">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="mt-8 mb-3 font-display text-[1.4rem] font-semibold text-[#171717]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 mb-2 font-display text-[1.15rem] font-semibold text-[#171717]">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-[#c0392b] pl-4 italic text-[#4d4d4d] last:mb-0">
        {children}
      </blockquote>
    ),
  },
};

export async function generateStaticParams() {
  const slugs: { slug: string | null }[] = await client
    .withConfig({ useCdn: false, stega: false })
    .fetch(TRIP_SLUGS_QUERY);
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
    query: TRIP_QUERY,
    params: { slug },
    stega: false,
  });
  const trip = res.data as Trip | null;
  if (!trip) return {};
  return {
    title: `${trip.title} · Travel · Mark Urquhart`,
    description: trip.summary || undefined,
  };
}

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await sanityFetch({ query: TRIP_QUERY, params: { slug } });
  const trip = data as Trip | null;
  if (!trip) notFound();

  const coverUrl = trip.cover?.asset
    ? urlFor(trip.cover).width(1600).height(900).fit("crop").url()
    : null;
  const category = trip.category ?? "personal";
  const where = [trip.city, trip.state, trip.country].filter(Boolean).join(", ");
  const range = formatRange(trip.startedAt, trip.endedAt);

  return (
    <PageShell hideMobileProfile>
      <article className="flex flex-col gap-8 px-5 pt-[22px] pb-[60px] xl:px-0">
        <Link
          href="/travel"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[#737373] no-underline transition-colors hover:text-[#1a1a1a]"
        >
          ← Back to Travel
        </Link>

        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CategoryBadge category={category} />
            {where && (
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#999]">
                {where}
              </span>
            )}
          </div>
          <h1 className="m-0 font-display text-[2rem] font-bold leading-[1.2] tracking-[-0.02em] text-[#111] md:text-[2.75rem]">
            {trip.title}
          </h1>
          {range && <div className="text-[14px] text-[#888]">{range}</div>}
        </header>

        {coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt={trip.cover?.alt || trip.title || ""}
            className="h-[280px] w-full rounded-lg object-cover md:h-[400px]"
          />
        )}

        {trip.summary && (
          <section>
            <p className="m-0 max-w-[44rem] text-[17px] leading-[1.7] text-[#404040]">
              {trip.summary}
            </p>
          </section>
        )}

        {trip.body?.length ? (
          <section className="flex flex-col gap-4">
            <h2 className={LABEL_CLASS}>Trip log</h2>
            <div className="max-w-[44rem]">
              <PortableText value={trip.body} components={bodyBlocks} />
            </div>
          </section>
        ) : null}

        {trip.location && (
          <section className="flex flex-col gap-4">
            <h2 className={LABEL_CLASS}>On the map</h2>
            <TravelMap trips={[trip]} />
          </section>
        )}

        {trip.photos?.length ? (
          <section className="flex flex-col gap-4">
            <h2 className={LABEL_CLASS}>Photos</h2>
            <TripPhotoGallery photos={trip.photos} />
          </section>
        ) : null}

        {trip.relatedPosts?.length ? (
          <section className="flex flex-col gap-4">
            <h2 className={LABEL_CLASS}>Related writing</h2>
            <ul className="m-0 flex flex-col gap-3 p-0">
              {trip.relatedPosts.map((post) => (
                <li key={post._id} className="list-none">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col gap-1 rounded-[12px] border border-[#ebe9e3] bg-white p-4 text-inherit no-underline transition-colors hover:border-[#d8d6cf]"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                      {post.category}
                    </span>
                    <span className="text-[15px] font-semibold text-[#171717] transition-transform duration-200 group-hover:translate-x-0.5">
                      {post.title} →
                    </span>
                    {post.excerpt && (
                      <span className="text-[13px] leading-[1.6] text-[#666]">
                        {post.excerpt}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {trip.externalLinks?.length ? (
          <section className="flex flex-col gap-3">
            <h2 className={LABEL_CLASS}>Links</h2>
            <ul className="m-0 flex flex-wrap gap-x-4 gap-y-2 p-0">
              {trip.externalLinks.map((l) => (
                <li key={l.url} className="list-none">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[14px] text-[#111] underline decoration-[#ddd] underline-offset-4 transition-colors hover:decoration-[#c0392b]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </PageShell>
  );
}
