import Image from "next/image";

import { urlFor } from "@/sanity/lib/image";
import type { SanityImageAsset } from "@/sanity/lib/types";

export function MobileProfile({
  avatar,
  bio,
}: {
  avatar?: SanityImageAsset | null;
  bio?: string | null;
}) {
  return (
    <div className="flex w-full items-center gap-4 pb-2 xl:hidden">
      {avatar?.asset ? (
        <Image
          src={urlFor(avatar).width(120).height(120).fit("crop").url()}
          alt={avatar.alt || "Mark Urquhart"}
          width={55}
          height={55}
          className="h-[55px] w-[55px] flex-shrink-0 rounded-full object-cover"
        />
      ) : null}
      {bio && (
        <p className="m-0 font-[var(--font-inter)] text-[13px] leading-[1.5] text-[#525252]">
          {bio}
        </p>
      )}
    </div>
  );
}
