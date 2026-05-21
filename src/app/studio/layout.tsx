import type { Metadata } from "next";

import { metadata as studioMetadata } from "next-sanity/studio";

export { viewport } from "next-sanity/studio";

export const metadata: Metadata = {
  ...studioMetadata,
  title: "Studio · Mark Urquhart",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
