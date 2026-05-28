"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

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

function Hamburger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open menu"
      className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-[#1a1a1a] transition-colors hover:bg-black/5"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="17" x2="21" y2="17" />
      </svg>
    </button>
  );
}

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close menu"
      className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-[#1a1a1a] transition-colors hover:bg-black/5"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="6" y1="18" x2="18" y2="6" />
      </svg>
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
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
}

export function MobileHeader({
  title,
  onOpen,
}: {
  title?: string | null;
  onOpen: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-white/95 px-5 py-3 backdrop-blur xl:hidden">
      <Link
        href="/"
        className="text-[1.75rem] font-bold leading-none tracking-tight text-[#1a1a1a] no-underline"
        style={{ fontFamily: "var(--font-inter-tight)" }}
      >
        {(title || "Mark").replace(/\.$/, "")}
        <span style={{ color: RED }}>.</span>
      </Link>
      <Hamburger onClick={onOpen} />
    </header>
  );
}

export function MobileFooter({ text }: { text?: string | null }) {
  return (
    <footer className="block w-full px-5 py-8 text-center text-[12px] leading-[1.5] text-[#999] xl:hidden">
      <p className="m-0">
        {text || `© ${new Date().getFullYear()} Mark Urquhart. All rights reserved.`}
      </p>
    </footer>
  );
}

export function MobileProfileInline({
  avatar,
  bio,
}: {
  avatar?: SanityImageAsset | null;
  bio?: string | null;
}) {
  return (
    <section className="flex w-full items-start gap-5 px-5 pb-6 pt-4 xl:hidden">
      {avatar?.asset ? (
        <Image
          src={urlFor(avatar).width(140).height(140).fit("crop").url()}
          alt={avatar.alt || "Mark Urquhart"}
          width={64}
          height={64}
          className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
        />
      ) : null}
      {bio && (
        <p className="m-0 max-w-prose text-[15px] leading-[1.6] text-[#525252]">
          {bio}
        </p>
      )}
    </section>
  );
}

// Slide-in sidebar overlay for mobile (triggered by hamburger)
export function MobileSidebar({
  open,
  onClose,
  socials,
  footerText,
}: {
  open: boolean;
  onClose: () => void;
  socials?: SocialLink[] | null;
  footerText?: string | null;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const grouped = useMemo(() => groupNavLinks(socials ?? []), [socials]);

  const [openGroup, setOpenGroup] = useState<NavGroup | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden
        className={`fixed inset-0 z-[99] bg-black/40 transition-opacity xl:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-[100] flex h-screen w-[88%] max-w-[340px] flex-col overflow-y-auto bg-white p-6 transition-transform duration-300 ease-out xl:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="text-[1.75rem] font-bold leading-none text-[#1a1a1a] no-underline"
            style={{ fontFamily: "var(--font-inter-tight)" }}
          >
            Mark<span style={{ color: RED }}>.</span>
          </Link>
          <CloseX onClick={onClose} />
        </div>

        <div className="mt-8 flex flex-grow flex-col">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center justify-between border-b border-[#ececec] py-[14px] text-[13px] uppercase tracking-[0.06em] no-underline transition-colors"
            style={{
              color: isHome ? RED : "#737373",
              fontWeight: isHome ? 700 : 600,
            }}
          >
            <span>Home</span>
          </Link>

          {NAV_SIDEBAR_GROUPS.map((g) => {
            const items = grouped[g];
            if (items.length === 0) return null;

            const isOpen = openGroup === g;
            const isPages = g === "pages";
            const groupActive = items.some((s) =>
              isNavLinkActive(pathname, s.url),
            );

            return (
              <div key={g}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : g)}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-[#ececec] py-[14px] text-left text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors hover:text-[#404040]"
                  style={{
                    color: groupActive ? RED : "#737373",
                  }}
                >
                  <span>{navGroupLabel(g)}</span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen &&
                  (isPages ? (
                    items.map((s) => {
                      const active = isNavLinkActive(pathname, s.url);
                      const external = isExternalNavUrl(s.url);
                      const rowClass =
                        "group flex items-center gap-[17px] border-b border-[#ececec] py-[14px] pl-[5px] no-underline transition-colors";
                      const inner = (
                        <>
                          <SocialIcon
                            name={s.icon}
                            size={18}
                            className="text-[#4d4d4d]"
                          />
                          <span
                            className="flex-1 text-[14px] font-normal leading-[1.5em]"
                            style={{ color: active ? RED : "#737373" }}
                          >
                            {s.label}
                          </span>
                          <ArrowIcon className="h-4 w-4 flex-shrink-0 text-[#4d4d4d]" />
                        </>
                      );
                      return external ? (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={onClose}
                          className={rowClass}
                          data-track="nav-link"
                          data-track-label={s.label}
                        >
                          {inner}
                        </a>
                      ) : (
                        <Link
                          key={s.url}
                          href={s.url}
                          onClick={onClose}
                          className={rowClass}
                          data-track="nav-link"
                          data-track-label={s.label}
                        >
                          {inner}
                        </Link>
                      );
                    })
                  ) : (
                    <div className="flex flex-row flex-wrap items-center gap-3 py-4">
                      {items.map((s) => {
                        const external = isExternalNavUrl(s.url);
                        const icon = (
                          <SocialIcon
                            name={s.icon}
                            size={20}
                          />
                        );
                        const className =
                          "flex h-11 w-11 items-center justify-center rounded-md border border-[#dbdbdb] text-[#737373] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]";
                        return external ? (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={onClose}
                            aria-label={s.label}
                            title={s.label}
                            data-track="nav-link"
                            data-track-label={s.label}
                            className={className}
                          >
                            {icon}
                          </a>
                        ) : (
                          <Link
                            key={s.url}
                            href={s.url}
                            onClick={onClose}
                            aria-label={s.label}
                            title={s.label}
                            data-track="nav-link"
                            data-track-label={s.label}
                            className={className}
                          >
                            {icon}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-6">
          <p className="m-0 text-[11px] font-normal leading-[1.5] text-[#999]">
            {footerText || `© ${new Date().getFullYear()} Mark Urquhart. All rights reserved.`}
          </p>
        </div>
      </aside>
    </>
  );
}
