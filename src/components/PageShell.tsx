import { NavSidebar } from "@/components/NavSidebar";
import { MobileNav } from "@/components/MobileNav";
import { MobileProfileInline } from "@/components/MobileShell";
import { sanityFetch } from "@/sanity/lib/live";
import { SHELL_QUERY } from "@/sanity/lib/queries";
import { flattenNavigation } from "@/lib/navLink";
import type { HomePage, SiteSettings } from "@/sanity/lib/types";

export async function PageShell({
  children,
  hideMobileProfile,
}: {
  children: React.ReactNode;
  hideMobileProfile?: boolean;
}) {
  const { data } = await sanityFetch({ query: SHELL_QUERY });
  const settings = (data as { settings?: SiteSettings | null })?.settings ?? null;
  const home = (data as { home?: HomePage | null })?.home ?? null;
  const intro = home?.intro ?? null;
  const navLinks = flattenNavigation(settings?.navigation);

  return (
    <>
      {/* Full-viewport-height divider at main's outer-left edge */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 z-10 hidden w-px bg-[#dcdcdc] xl:block"
        style={{ left: "calc(42px + 280px + 48px)" }}
      />

      <div className="flex min-h-screen w-full flex-col xl:flex-row xl:items-start xl:gap-[48px] xl:px-[42px] xl:py-[42px]">
        <MobileNav
          title={settings?.title}
          socials={navLinks}
          footerText={settings?.footerText}
          position="top"
        />
        <NavSidebar
          title={settings?.title}
          bio={intro}
          avatar={settings?.avatar}
          socials={navLinks}
          footerText={settings?.footerText}
        />
        <main className="w-full xl:w-auto xl:min-w-0 xl:flex-1 xl:pl-[42px]">
          {!hideMobileProfile && (
            <MobileProfileInline avatar={settings?.avatar} bio={intro} />
          )}
          {children}
        </main>
        <MobileNav
          title={settings?.title}
          socials={navLinks}
          footerText={settings?.footerText}
          position="bottom"
        />
      </div>
    </>
  );
}
