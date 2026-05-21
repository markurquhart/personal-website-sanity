import { NavSidebar } from "@/components/NavSidebar";
import { MobileNav } from "@/components/MobileNav";
import { MobileProfileInline } from "@/components/MobileShell";
import { sanityFetch } from "@/sanity/lib/live";
import { SITE_SETTINGS_QUERY } from "@/sanity/lib/queries";
import type { SiteSettings } from "@/sanity/lib/types";

export async function PageShell({
  children,
  hideMobileProfile,
}: {
  children: React.ReactNode;
  hideMobileProfile?: boolean;
}) {
  const { data } = await sanityFetch({ query: SITE_SETTINGS_QUERY });
  const settings = data as SiteSettings | null;

  return (
    <>
      {/* Full-viewport-height divider line at main's outer-left edge.
          left = outer-padding (42) + sidebar (280) + gap (48) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 z-10 hidden w-px bg-[#dcdcdc] xl:block"
        style={{ left: "calc(42px + 280px + 48px)" }}
      />

      <div className="flex min-h-screen w-full flex-col xl:flex-row xl:items-start xl:gap-[48px] xl:px-[42px] xl:py-[42px]">
        <MobileNav
          title={settings?.title}
          socials={settings?.socials}
          footerText={settings?.footerText}
          position="top"
        />
        <NavSidebar
          title={settings?.title}
          bio={settings?.bio}
          avatar={settings?.avatar}
          socials={settings?.socials}
          footerText={settings?.footerText}
        />
        <main className="w-full xl:w-auto xl:min-w-0 xl:flex-1 xl:pl-[42px]">
          {!hideMobileProfile && (
            <MobileProfileInline avatar={settings?.avatar} bio={settings?.bio} />
          )}
          {children}
        </main>
        <MobileNav
          title={settings?.title}
          socials={settings?.socials}
          footerText={settings?.footerText}
          position="bottom"
        />
      </div>
    </>
  );
}
