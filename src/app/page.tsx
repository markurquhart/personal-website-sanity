import { PageShell } from "@/components/PageShell";
import { PhotoSlider } from "@/components/PhotoSlider";
import { sanityFetch } from "@/sanity/lib/live";
import { PHOTOS_QUERY } from "@/sanity/lib/queries";
import type { Photo } from "@/sanity/lib/types";

export const revalidate = 60;

export default async function Home() {
  const { data } = await sanityFetch({ query: PHOTOS_QUERY });
  const photos = (data as Photo[] | null) ?? [];

  return (
    <PageShell>
      <PhotoSlider photos={photos} />
    </PageShell>
  );
}
