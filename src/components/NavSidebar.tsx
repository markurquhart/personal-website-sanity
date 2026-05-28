"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import {
  groupNavLinks,
  isExternalNavUrl,
  isNavLinkActive,
  navGroupLabel,
  NAV_SIDEBAR_GROUPS,
} from "@/lib/navLink";
import { urlFor } from "@/sanity/lib/image";
import type { NavGroup, SanityImageAsset, SocialLink } from "@/sanity/lib/types";

import { ArrowIcon, SocialIcon } from "./SocialIcon";

const RED = "#c0392b";
const DARK = "hsla(0,0%,25%,1)";

type GroupKey = NavGroup;

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className="h-2.5 w-2.5 transition-transform duration-200"
    style={{ transform: open ? "rotate(180deg)" : "none" }}
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden
  >
    <path
      d="M2.5 3.75L5 6.25L7.5 3.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function GroupHeader({
  title,
  open,
  active,
  onToggle,
  hidden,
}: {
  title: string;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center justify-between border-b border-[#dcdcdc] py-[13px] pl-[5px] text-left text-[14px] uppercase tracking-[0.05em] transition-colors duration-200"
      style={{
        color: active ? DARK : "#737373",
        fontWeight: active ? 700 : 600,
      }}
    >
      <span>{title}</span>
      <Chevron open={open} />
    </button>
  );
}

function RowItem({
  href,
  label,
  icon,
  external,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
  active?: boolean;
}) {
  const inner = (
    <>
      <SocialIcon
        name={icon}
        size={18}
        className="text-[#4d4d4d] transition-[filter] duration-200 group-hover:[filter:brightness(0.4)]"
      />
      <span
        className="w-[85%] text-[14px] font-normal leading-[1.5em]"
        style={{ color: active ? RED : "inherit" }}
      >
        {label}
      </span>
      <ArrowIcon className="h-[17px] w-[17px] flex-shrink-0 text-[#4d4d4d] transition-[filter] duration-200 group-hover:[filter:brightness(0.4)]" />
    </>
  );
  const className =
    "group flex items-center justify-between gap-[17px] border-b border-[#dcdcdc] py-[13px] pl-[5px] no-underline transition-colors duration-300 hover:text-[#404040]";
  const style = { color: active ? RED : "#737373" } as React.CSSProperties;
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
        style={style}
        data-track="nav-link"
        data-track-label={label}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      style={style}
      data-track="nav-link"
      data-track-label={label}
    >
      {inner}
    </Link>
  );
}

function IconItem({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}) {
  const inner = (
    <SocialIcon
      name={icon}
      size={18}
      className="text-[#4d4d4d] transition-colors"
    />
  );
  const className =
    "flex h-[38px] w-[38px] items-center justify-center rounded-md border border-[#dbdbdb] text-[#737373] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
        aria-label={label}
        title={label}
        data-track="nav-link"
        data-track-label={label}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      title={label}
      data-track="nav-link"
      data-track-label={label}
    >
      {inner}
    </Link>
  );
}

export function NavSidebar({
  title,
  bio,
  avatar,
  socials,
  footerText,
}: {
  title?: string | null;
  bio?: string | null;
  avatar?: SanityImageAsset | null;
  socials?: SocialLink[] | null;
  footerText?: string | null;
}) {
  const pathname = usePathname();
  const grouped = useMemo(() => groupNavLinks(socials ?? []), [socials]);

  const isHome = pathname === "/";

  // All groups start collapsed. User opens them manually.
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  const toggle = (k: GroupKey) =>
    setOpenGroup((cur) => (cur === k ? null : k));

  return (
    <nav className="sticky top-[42px] hidden h-[calc(100vh-84px)] w-[280px] flex-shrink-0 flex-col overflow-y-auto xl:flex">
      <div className="flex flex-col gap-[23px]">
        <div className="flex items-center gap-[21px]">
          {avatar?.asset ? (
            <Image
              src={urlFor(avatar).width(180).height(180).fit("crop").url()}
              alt={avatar.alt || title || "Mark Urquhart"}
              width={90}
              height={90}
              className="h-[90px] w-[90px] rounded-full border border-[#26326430] object-cover"
              priority
            />
          ) : null}
          <Link
            href="/"
            className="font-display text-[51px] font-bold leading-[1.1em] tracking-normal text-[#333] no-underline"
          >
            {(title || "Mark").replace(/\.$/, "")}
            <span className="text-[#c0392b]">.</span>
          </Link>
        </div>
        {bio && (
          <p className="m-0 text-[15px] font-normal leading-[1.7em] tracking-[-0.5px] text-[#525252]">
            {bio}
          </p>
        )}
      </div>

      <div className="flex flex-grow flex-col pt-[max(1rem,calc(50vh-340px))]">
        <Link
          href="/"
          className="flex cursor-pointer items-center justify-between border-b border-[#dcdcdc] py-[13px] pl-[5px] text-[14px] uppercase tracking-[0.05em] no-underline transition-colors duration-200"
          style={{
            color: isHome ? RED : "#737373",
            fontWeight: isHome ? 700 : 600,
          }}
        >
          <span className="w-[85%] leading-[1.5em]">Home</span>
        </Link>

        {NAV_SIDEBAR_GROUPS.map((groupKey) => {
          const items = grouped[groupKey];
          if (items.length === 0) return null;

          const isPages = groupKey === "pages";
          const groupActive = items.some((s) =>
            isNavLinkActive(pathname, s.url),
          );

          return (
            <div key={groupKey}>
              <GroupHeader
                title={navGroupLabel(groupKey)}
                open={openGroup === groupKey}
                active={groupActive}
                onToggle={() => toggle(groupKey)}
              />
              {openGroup === groupKey &&
                (isPages ? (
                  items.map((s) => (
                    <RowItem
                      key={s.url}
                      href={s.url}
                      label={s.label}
                      icon={s.icon}
                      external={isExternalNavUrl(s.url)}
                      active={isNavLinkActive(pathname, s.url)}
                    />
                  ))
                ) : (
                  <div className="flex flex-row items-center gap-3 px-[5px] py-3">
                    {items.map((s) => (
                      <IconItem
                        key={s.url}
                        href={s.url}
                        label={s.label}
                        icon={s.icon}
                        external={isExternalNavUrl(s.url)}
                      />
                    ))}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <p className="m-0 text-[11px] font-normal leading-[1.4] text-[#999]">
          {footerText || `© ${new Date().getFullYear()} Mark Urquhart`}
        </p>
      </div>
    </nav>
  );
}
