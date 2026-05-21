import { BlogContent } from "@/components/BlogContent";
import { PageShell } from "@/components/PageShell";
import { sanityFetch } from "@/sanity/lib/live";
import { POSTS_QUERY } from "@/sanity/lib/queries";
import type { PostSummary } from "@/sanity/lib/types";

export const revalidate = 60;
export const metadata = { title: "Blog · Mark Urquhart" };

export default async function BlogIndex() {
  const { data } = await sanityFetch({ query: POSTS_QUERY });
  const posts = (data as PostSummary[] | null) ?? [];

  return (
    <PageShell hideMobileProfile>
      <BlogContent posts={posts} />
    </PageShell>
  );
}
