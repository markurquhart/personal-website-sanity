import Image from "next/image";
import type { SanityImageSource } from "@sanity/image-url";

import { urlFor } from "@/sanity/lib/image";

type Props = {
  value: {
    asset?: { _id?: string; url?: string; metadata?: { lqip?: string } };
    alt?: string | null;
  } & SanityImageSource;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function SanityImage({
  value,
  width = 1200,
  height,
  className,
  priority,
  sizes,
}: Props) {
  if (!value?.asset) return null;
  const h = height ?? Math.round(width * 1.25);
  const url = urlFor(value).width(width).height(h).fit("crop").url();
  const lqip = value.asset.metadata?.lqip;

  return (
    <Image
      src={url}
      alt={value.alt || ""}
      width={width}
      height={h}
      className={className}
      priority={priority}
      sizes={sizes}
      placeholder={lqip ? "blur" : "empty"}
      blurDataURL={lqip}
    />
  );
}
