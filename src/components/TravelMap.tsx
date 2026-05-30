"use client";

import maplibregl, {
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { TRIP_BRAND_RED, TRIP_CATEGORY_LABEL } from "@/lib/tripCategory";
import { urlFor } from "@/sanity/lib/image";
import type { TripCategory, TripSummary } from "@/sanity/lib/types";

const POSITRON_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    positron: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: "positron", type: "raster", source: "positron" }],
};

// ---------- pin markers ----------

function buildPinElement(_category: TripCategory): HTMLElement {
  const color = TRIP_BRAND_RED;

  const wrapper = document.createElement("div");
  wrapper.className = "trip-pin";
  wrapper.setAttribute("data-track", "travel-map-pin");

  const inner = document.createElement("div");
  inner.className = "trip-pin-inner";
  inner.style.cssText = `
    width: 18px;
    height: 23px;
    cursor: pointer;
    transform-origin: 50% 100%;
    transition: transform 180ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
    will-change: transform;
  `;
  inner.innerHTML = `
    <svg width="18" height="23" viewBox="0 0 18 23" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 2px 3px rgba(15,23,42,0.28));">
      <path
        d="M9 0C4.03 0 0 4.03 0 9c0 6 9 14 9 14s9-8 9-14C18 4.03 13.97 0 9 0z"
        fill="${color}"
        stroke="#fff"
        stroke-width="1.5"
      />
      <circle cx="9" cy="9" r="3" fill="#fff" />
    </svg>
  `;
  wrapper.appendChild(inner);

  return wrapper;
}

function buildClusterElement(count: number): HTMLElement {
  const size = count >= 10 ? 40 : count >= 5 ? 34 : 30;
  const fontSize = count >= 100 ? 12 : count >= 10 ? 13 : 14;

  const wrapper = document.createElement("div");
  wrapper.className = "trip-cluster";
  wrapper.setAttribute("data-track", "travel-map-cluster");

  const inner = document.createElement("div");
  inner.className = "trip-cluster-inner";
  inner.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${TRIP_BRAND_RED};
    border: 3px solid #fff;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: ${fontSize}px;
    line-height: 1;
    cursor: pointer;
    transform-origin: 50% 50%;
    transition: transform 180ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
    will-change: transform;
    font-family: var(--font-inter), Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
  `;
  inner.textContent = String(count);
  wrapper.appendChild(inner);

  return wrapper;
}

// ---------- popup ----------

function formatRange(start?: string | null, end?: string | null) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  const s = start ? fmt(start) : "";
  const e = end ? fmt(end) : "";
  if (s && e && s === e) return s;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPopupContent(
  trip: TripSummary,
  onView: () => void,
): HTMLElement {
  const category = trip.category ?? "personal";
  const color = TRIP_BRAND_RED;
  const categoryLabel = TRIP_CATEGORY_LABEL[category];
  const where = [trip.city, trip.state, trip.country].filter(Boolean).join(", ");
  const range = formatRange(trip.startedAt, trip.endedAt);
  const coverUrl = trip.cover?.asset
    ? urlFor(trip.cover).width(160).height(160).fit("crop").url()
    : null;

  const root = document.createElement("div");
  root.className = "trip-popup";
  root.style.cssText = "width: 240px;";

  root.innerHTML = `
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div style="
        position: relative;
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        border-radius: 8px;
        overflow: hidden;
        background: #f4f2ee;
        border: 1px solid #efede7;
      ">
        ${
          coverUrl
            ? `<img src="${escapeHtml(coverUrl)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"/>`
            : `<div style="
                position:absolute; inset:0;
                display:flex; align-items:center; justify-content:center;
                font-size: 9px; color: #aaa;
                letter-spacing: 0.04em; text-align: center;
              ">No cover</div>`
        }
      </div>

      <div style="min-width:0; flex:1;">
        <div style="
          display:inline-flex; align-items:center; gap:5px;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #999;
          margin-bottom: 3px;
        ">
          <span aria-hidden="true" style="
            display:inline-block; width:6px; height:6px; border-radius:50%;
            background:${color};
          "></span>
          <span>${escapeHtml(categoryLabel)}</span>
        </div>
        <div style="
          font-family: inherit;
          font-size: 14px; font-weight: 600;
          color: #171717; line-height: 1.25;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${escapeHtml(trip.title ?? "")}</div>
        ${
          where
            ? `<div style="font-size:12px;color:#666;line-height:1.4;">${escapeHtml(where)}</div>`
            : ""
        }
        ${
          range
            ? `<div style="font-size:11px;color:#999;line-height:1.4;">${escapeHtml(range)}</div>`
            : ""
        }
      </div>
    </div>

    ${
      trip.summary
        ? `<div style="
            font-size: 12px; line-height: 1.55; color: #666;
            margin-top: 10px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          ">${escapeHtml(trip.summary)}</div>`
        : ""
    }

    <a href="#" data-popup-cta data-track="travel-popup-view" style="
      display: inline-block;
      margin-top: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      text-decoration: none;
      letter-spacing: 0.01em;
      transition: transform 180ms ease;
      transform-origin: left center;
    ">Open trip →</a>
  `;

  const cta = root.querySelector<HTMLAnchorElement>("[data-popup-cta]");
  if (cta) {
    cta.addEventListener("mouseenter", () => {
      cta.style.transform = "translateX(2px)";
    });
    cta.addEventListener("mouseleave", () => {
      cta.style.transform = "";
    });
    cta.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onView();
    });
  }

  return root;
}

// ---------- map component ----------

const SOURCE_ID = "trips";
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 8;

type TripFeatureProps = {
  tripId: string;
  slug?: string;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function TravelMap({
  trips,
  onBoundsChange,
}: {
  trips: TripSummary[];
  onBoundsChange?: (bounds: MapBounds | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const router = useRouter();

  const pins = trips.filter(
    (t) =>
      t.location &&
      typeof t.location.lat === "number" &&
      typeof t.location.lng === "number" &&
      t.slug,
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: POSITRON_STYLE,
      center: [0, 20],
      zoom: 1.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const tripsById = new Map<string, TripSummary>();
    for (const trip of pins) tripsById.set(trip._id, trip);

    // Shared popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      closeOnMove: false,
      offset: {
        top: [0, 6],
        bottom: [0, -26],
        left: [12, -12],
        right: [-12, -12],
        "top-left": [10, 6],
        "top-right": [-10, 6],
        "bottom-left": [10, -22],
        "bottom-right": [-10, -22],
        center: [0, 0],
      },
      maxWidth: "268px",
      className: "trip-popup-wrapper",
    });

    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelClose = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    };
    const scheduleClose = () => {
      cancelClose();
      closeTimer = setTimeout(() => popup.remove(), 240);
    };

    popup.on("open", () => {
      const popupEl = popup.getElement();
      if (!popupEl) return;
      popupEl.addEventListener("mouseenter", cancelClose);
      popupEl.addEventListener("mouseleave", scheduleClose);
    });

    // Marker registry (keyed by cluster_id or trip _id) so we can diff
    // on each map move instead of remounting every marker every frame.
    const markers = new Map<string, maplibregl.Marker>();

    function updateMarkers() {
      if (!map.isSourceLoaded(SOURCE_ID)) return;
      const features = map.querySourceFeatures(SOURCE_ID);
      const seen = new Set<string>();

      for (const feature of features) {
        if (feature.geometry.type !== "Point") continue;
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};

        if (props.cluster) {
          const id = `cluster-${props.cluster_id}`;
          seen.add(id);
          if (!markers.has(id)) {
            const el = buildClusterElement(props.point_count);
            const inner = el.querySelector<HTMLElement>(".trip-cluster-inner");
            el.addEventListener("mouseenter", () => {
              if (inner) inner.style.transform = "scale(1.1)";
            });
            el.addEventListener("mouseleave", () => {
              if (inner) inner.style.transform = "";
            });
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
              if (!src) return;
              src
                .getClusterExpansionZoom(props.cluster_id)
                .then((zoom: number) => {
                  map.easeTo({
                    center: [lng, lat],
                    zoom: Math.max(zoom, map.getZoom() + 0.5),
                    duration: 600,
                  });
                })
                .catch(() => {
                  // Fall back to a small zoom-in if expansion lookup fails
                  map.easeTo({
                    center: [lng, lat],
                    zoom: map.getZoom() + 2,
                    duration: 500,
                  });
                });
            });
            const marker = new maplibregl.Marker({
              element: el,
              anchor: "center",
            })
              .setLngLat([lng, lat])
              .addTo(map);
            markers.set(id, marker);
          } else {
            markers.get(id)!.setLngLat([lng, lat]);
          }
        } else {
          const tripId: string | undefined = props.tripId;
          if (!tripId) continue;
          const id = `pin-${tripId}`;
          seen.add(id);
          if (!markers.has(id)) {
            const trip = tripsById.get(tripId);
            if (!trip) continue;
            const category = trip.category ?? "personal";
            const el = buildPinElement(category);
            const inner = el.querySelector<HTMLElement>(".trip-pin-inner");

            const setHover = (on: boolean) => {
              if (inner) inner.style.transform = on ? "scale(1.2)" : "";
            };
            const openPopup = () => {
              cancelClose();
              const content = buildPopupContent(trip, () => {
                popup.remove();
                router.push(`/travel/${trip.slug}`);
              });
              popup.setLngLat([lng, lat]).setDOMContent(content).addTo(map);
            };

            el.addEventListener("mouseenter", () => {
              setHover(true);
              openPopup();
            });
            el.addEventListener("mouseleave", () => {
              setHover(false);
              scheduleClose();
            });
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              openPopup();
            });

            const marker = new maplibregl.Marker({
              element: el,
              anchor: "bottom",
            })
              .setLngLat([lng, lat])
              .addTo(map);
            markers.set(id, marker);
          } else {
            markers.get(id)!.setLngLat([lng, lat]);
          }
        }
      }

      // Remove markers that are no longer in view / no longer match
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    }

    map.on("load", () => {
      if (pins.length === 0) return;

      const featureCollection = {
        type: "FeatureCollection" as const,
        features: pins.map((trip) => ({
          type: "Feature" as const,
          properties: {
            tripId: trip._id,
            slug: trip.slug ?? "",
          } satisfies TripFeatureProps,
          geometry: {
            type: "Point" as const,
            coordinates: [trip.location!.lng, trip.location!.lat],
          },
        })),
      };

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: featureCollection,
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: CLUSTER_RADIUS,
      });

      // Invisible layer that the cluster algorithm needs to exist for
      // querySourceFeatures to return cluster aggregates. We render the
      // actual visuals with HTML markers, not this layer.
      map.addLayer({
        id: `${SOURCE_ID}-hidden`,
        type: "circle",
        source: SOURCE_ID,
        paint: { "circle-opacity": 0, "circle-radius": 1 },
      });

      // Bounds fit
      const bounds = new maplibregl.LngLatBounds();
      pins.forEach((trip) => {
        const { lng, lat } = trip.location!;
        bounds.extend([lng, lat]);
      });
      if (pins.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(4);
      } else {
        map.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 0 });
      }

      // Marker render lifecycle
      const reportBounds = () => {
        if (!onBoundsChangeRef.current) return;
        const b = map.getBounds();
        onBoundsChangeRef.current({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };
      map.on("moveend", () => {
        updateMarkers();
        reportBounds();
      });
      map.on("sourcedata", (e) => {
        if (e.sourceId === SOURCE_ID && map.isSourceLoaded(SOURCE_ID)) {
          updateMarkers();
        }
      });
      updateMarkers();
      reportBounds();
    });

    return () => {
      cancelClose();
      popup.remove();
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  return (
    <div
      ref={containerRef}
      data-track="travel-map"
      className="h-[360px] w-full overflow-hidden rounded-[12px] border border-[#ebebeb] bg-[#fafafa] xl:h-[460px]"
    />
  );
}
