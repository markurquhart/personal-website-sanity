"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/navigation";

import { urlFor } from "@/sanity/lib/image";
import type { Photo } from "@/sanity/lib/types";

function formatDate(iso: string) {
  // Parse YYYY-MM-DD as local date to avoid UTC timezone shift
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const ord =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${month} ${day}${ord}, ${year}`;
}

export function PhotoSlider({ photos }: { photos: Photo[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach stable data-track hooks to Swiper's auto-generated nav buttons so
  // GTM triggers don't have to depend on Swiper's class names.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const prev = root.querySelector(".swiper-button-prev");
    const next = root.querySelector(".swiper-button-next");
    prev?.setAttribute("data-track", "slider-prev");
    next?.setAttribute("data-track", "slider-next");
  }, []);

  if (!photos.length) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center bg-[#f3f3f3] text-sm text-[#888] xl:h-[calc(100vh_-_84px)]">
        No photos yet — upload in Sanity Studio
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      data-track="slider"
      className="relative h-[60vh] w-full overflow-hidden bg-[#111] xl:h-[calc(100vh_-_84px)]"
    >
      <Swiper
        modules={[Autoplay, Pagination, EffectFade, Navigation]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          renderBullet: (_index, className) =>
            `<span class="${className}" data-track="slider-dot"></span>`,
        }}
        navigation
        loop
        className="h-full w-full"
      >
        {photos.map((p) => (
          <SwiperSlide
            key={p._id}
            data-track="slider-slide"
            data-track-location={p.location || ""}
            className="relative h-full w-full"
          >
            {p.image?.asset ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlFor(p.image).width(2400).quality(85).url()}
                alt={p.image.alt || p.location || ""}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[40%] bg-gradient-to-b from-transparent to-black/90" />
            <div className="absolute inset-x-0 bottom-[40px] z-[3] text-center text-[14px] font-light leading-[25px] text-white xl:bottom-0 xl:mb-[25px] xl:pl-[30px] xl:text-left">
              {p.location}
              {p.takenAt && (
                <>
                  {"  "}
                  <span className="text-[#857676]">|</span>
                  {"  "}
                  {formatDate(p.takenAt)}
                </>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
