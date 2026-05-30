import { PageShell } from "@/components/PageShell";
import { TravelIndex } from "@/components/TravelIndex";
import { sanityFetch } from "@/sanity/lib/live";
import { TRIPS_QUERY } from "@/sanity/lib/queries";
import type { TripSummary } from "@/sanity/lib/types";

export const revalidate = 60;
export const metadata = { title: "Travel · Mark Urquhart" };

export default async function TravelPage() {
  const { data } = await sanityFetch({ query: TRIPS_QUERY });
  const trips = (data as TripSummary[] | null) ?? [];

  return (
    <PageShell hideMobileProfile>
      <TravelIndex trips={trips} />
    </PageShell>
  );
}
