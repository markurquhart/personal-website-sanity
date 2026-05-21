import type { SocialLink } from "@/sanity/lib/types";

import { ArrowIcon, SocialIcon } from "./SocialIcon";

export function MobileSocialList({
  socials,
}: {
  socials?: SocialLink[] | null;
}) {
  const links = socials ?? [];
  return (
    <div className="xl:hidden">
      <div className="flex flex-col">
        {links.map((s, i) => (
          <a
            key={s.url}
            href={s.url}
            target={s.url.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer noopener"
            className={`group flex items-center gap-[17px] border-b border-[#e0e0e0] py-[13px] pl-[5px] text-[#333] no-underline transition-all duration-200 ${
              i === links.length - 1 ? "border-b-0" : ""
            }`}
          >
            <SocialIcon
              name={s.icon}
              className="h-[20px] w-[20px] flex-shrink-0 text-[#333]"
            />
            <div className="w-[85%] text-[16px] font-normal leading-[1.5em] text-[#525252] transition-colors duration-200 group-hover:text-[#8f0000]">
              {s.label}
            </div>
            <ArrowIcon className="h-[20px] w-[20px] flex-shrink-0 -translate-x-2.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </div>
  );
}
