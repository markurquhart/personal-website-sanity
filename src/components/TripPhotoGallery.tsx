import { urlFor } from "@/sanity/lib/image";
import type { TripPhoto } from "@/sanity/lib/types";

export function TripPhotoGallery({ photos }: { photos: TripPhoto[] }) {
  if (!photos.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo) => {
        if (!photo.image?.asset) return null;
        const src = urlFor(photo.image).width(900).height(600).fit("crop").url();
        return (
          <figure
            key={photo._id}
            className="m-0 flex flex-col gap-2 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-[#f4f3ef]"
          >
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "3 / 2" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={photo.image?.alt || photo.caption || ""}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {(photo.caption || photo.location) && (
              <figcaption className="px-3 pb-3 text-[12px] leading-[1.5] text-[#666]">
                {photo.caption && <span>{photo.caption}</span>}
                {photo.caption && photo.location && (
                  <span className="text-[#bbb]"> · </span>
                )}
                {photo.location && (
                  <span className="text-[#999]">{photo.location}</span>
                )}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
