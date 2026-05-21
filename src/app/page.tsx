import { PageShell } from "@/components/PageShell";
import { PhotoSlider } from "@/components/PhotoSlider";
import { sanityFetch } from "@/sanity/lib/live";
import { HOME_QUERY } from "@/sanity/lib/queries";
import type { HomePage } from "@/sanity/lib/types";

export const revalidate = 60;

export default async function Home() {
  const { data } = await sanityFetch({ query: HOME_QUERY });
  const home = data as HomePage | null;
  const photos = home?.heroPhotos ?? [];

  return (
    <PageShell>
      <PhotoSlider photos={photos} />
    </PageShell>
  );
}
