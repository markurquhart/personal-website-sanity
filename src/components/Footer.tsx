type SocialLink = {
  label: string;
  url: string;
  group: "professional" | "social" | "lifestyle";
};

export function Footer({
  socials = [],
  footerText,
}: {
  socials?: SocialLink[] | null;
  footerText?: string | null;
}) {
  const links = socials ?? [];
  return (
    <footer className="mt-24 border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-8 text-xs text-black/60 dark:text-white/60 sm:flex-row sm:items-center sm:justify-between">
        <p>{footerText || `© ${new Date().getFullYear()} Mark Urquhart`}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map((s) => (
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
      </div>
    </footer>
  );
}
