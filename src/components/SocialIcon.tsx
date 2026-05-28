"use client";

import { Icon } from "@iconify/react";

import { resolveNavIconId, type NavIconValue } from "@/lib/navIcon";

/**
 * Legacy nav SVGs were 18px and filled the viewBox. Iconify sets (e.g. Simple Icons)
 * pad the artwork, so we render slightly larger to match that visual weight.
 */
/** ~22px render for 18px layout slots (tuned down from 4/3). */
const ICONIFY_VISUAL_SCALE = 22 / 18;

export function SocialIcon({
  name,
  className,
  size = 18,
}: {
  name: NavIconValue;
  className?: string;
  /** Target visual size (matches pre-Iconify nav icons). */
  size?: number;
}) {
  const iconId = resolveNavIconId(name);
  if (!iconId) return null;

  const renderPx = Math.round(size * ICONIFY_VISUAL_SCALE);

  return (
    <Icon
      icon={iconId}
      width={renderPx}
      height={renderPx}
      className={className}
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M13.7045 4.28377C13.3111 3.89615 12.678 3.90084 12.2904 4.29424C11.9027 4.68765 11.9074 5.3208 12.3008 5.70842L17.6712 10.9998H4C3.44771 10.9998 3 11.4475 3 11.9998C3 12.5521 3.44772 12.9998 4 12.9998H17.6646L12.3008 18.2847C11.9074 18.6723 11.9027 19.3055 12.2904 19.6989C12.678 20.0923 13.3111 20.097 13.7045 19.7094L20.6287 12.887C21.1256 12.3974 21.1256 11.5958 20.6287 11.1062L13.7045 4.28377Z"
        fill="currentColor"
      />
    </svg>
  );
}
