import Link from "next/link";

import type { SocialLink } from "@/sanity/lib/types";
import { groupNavLinks } from "@/lib/navLink";

export function Header({ socials = [] }: { socials?: SocialLink[] | null }) {
  const grouped = groupNavLinks(socials ?? []);

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="font-medium hover:opacity-70">
            Home
          </Link>
          <Link href="/blog" className="hover:opacity-70">
            Blog
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
          {(["pages", "professional", "social", "lifestyle"] as const).map((g) => (
            <div key={g} className="flex gap-x-3">
              {grouped[g].map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-black dark:hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
