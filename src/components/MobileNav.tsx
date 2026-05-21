"use client";

import { useState } from "react";

import type { SocialLink } from "@/sanity/lib/types";

import {
  MobileFooter,
  MobileHeader,
  MobileSidebar,
} from "./MobileShell";

export function MobileNav({
  title,
  socials,
  footerText,
  position,
}: {
  title?: string | null;
  socials?: SocialLink[] | null;
  footerText?: string | null;
  position: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  if (position === "top") {
    return (
      <>
        <MobileHeader title={title} onOpen={() => setOpen(true)} />
        <MobileSidebar
          open={open}
          onClose={() => setOpen(false)}
          socials={socials}
          footerText={footerText}
        />
      </>
    );
  }
  return <MobileFooter text={footerText} />;
}
