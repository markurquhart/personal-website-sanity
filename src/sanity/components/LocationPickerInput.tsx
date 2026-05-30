"use client";

import { SearchIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Code,
  Flex,
  Spinner,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { set, unset, type ObjectInputProps } from "sanity";

type GeopointValue = {
  _type: "geopoint";
  lat: number;
  lng: number;
  alt?: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

const POSITRON_STYLE = {
  version: 8 as const,
  sources: {
    positron: {
      type: "raster" as const,
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
  layers: [{ id: "positron", type: "raster" as const, source: "positron" }],
};

function buildPinElement(): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "28px";
  el.style.cursor = "grab";
  el.innerHTML = `
    <svg width="22" height="28" viewBox="0 0 18 23" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 2px 3px rgba(15,23,42,0.32));">
      <path
        d="M9 0C4.03 0 0 4.03 0 9c0 6 9 14 9 14s9-8 9-14C18 4.03 13.97 0 9 0z"
        fill="#c0392b"
        stroke="#fff"
        stroke-width="1.5"
      />
      <circle cx="9" cy="9" r="3" fill="#fff" />
    </svg>
  `;
  return el;
}

export function LocationPickerInput(props: ObjectInputProps<GeopointValue>) {
  const { value, onChange } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  // Latest value, for click/drag handlers registered once in the init
  // effect so they always see the current value/setter.
  const valueRef = useRef<GeopointValue | undefined>(value);
  valueRef.current = value;
  // Marker sync function — populated once the lazy-loaded maplibre module
  // is ready inside the init effect. The value-sync effect calls this.
  const syncMarkerRef = useRef<(v: GeopointValue | undefined) => void>(
    () => {},
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback(
    (lng: number, lat: number) => {
      onChange(
        set({
          _type: "geopoint",
          lat,
          lng,
        }),
      );
    },
    [onChange],
  );

  // Init map once. maplibre-gl + its CSS are loaded lazily so they never
  // appear in any Node-side bundle (schema deploy, type generation).
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let cleanupResize: (() => void) | null = null;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) return;

      const start = valueRef.current;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: POSITRON_STYLE,
        center: start ? [start.lng, start.lat] : [0, 20],
        zoom: start ? 6 : 1.4,
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      map.on("click", (e) => {
        setLocation(e.lngLat.lng, e.lngLat.lat);
      });

      // Closure has the maplibregl module — wire the marker syncer.
      syncMarkerRef.current = (val) => {
        if (!val) {
          markerRef.current?.remove();
          markerRef.current = null;
          return;
        }
        const lngLat: [number, number] = [val.lng, val.lat];
        if (markerRef.current) {
          markerRef.current.setLngLat(lngLat);
        } else {
          const el = buildPinElement();
          const marker = new maplibregl.Marker({
            element: el,
            anchor: "bottom",
            draggable: true,
          })
            .setLngLat(lngLat)
            .addTo(map);
          marker.on("dragend", () => {
            const ll = marker.getLngLat();
            setLocation(ll.lng, ll.lat);
          });
          markerRef.current = marker;
        }
      };

      // Drop the marker for any existing value (set before map was ready).
      syncMarkerRef.current(valueRef.current);

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
      cleanupResize = () => ro.disconnect();
    })();

    return () => {
      cancelled = true;
      cleanupResize?.();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      syncMarkerRef.current = () => {};
    };
  }, [setLocation]);

  // Sync marker whenever the value changes (search-pick or external edit).
  useEffect(() => {
    syncMarkerRef.current(value);
  }, [value]);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
      if (data.length === 0) setError("No results.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSearch();
    }
  };

  const handleSelectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    setLocation(lng, lat);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 10, duration: 700 });
    setResults([]);
    setQuery("");
  };

  const handleClear = () => {
    onChange(unset());
    setResults([]);
    setQuery("");
  };

  return (
    <Stack space={3}>
      <Flex gap={2} align="center">
        <Box flex={1}>
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a place (e.g. Tokyo, Japan)"
            icon={SearchIcon}
          />
        </Box>
        <Button
          mode="ghost"
          text={searching ? "Searching…" : "Search"}
          onClick={handleSearch}
          disabled={searching || !query.trim()}
        />
      </Flex>

      {error && (
        <Text size={1} muted>
          {error}
        </Text>
      )}

      {results.length > 0 && (
        <Card padding={1} radius={2} shadow={1} tone="transparent">
          <Stack space={1}>
            {results.map((r) => (
              <Card
                as="button"
                key={r.place_id}
                onClick={() => handleSelectResult(r)}
                padding={2}
                radius={2}
                tone="default"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                }}
              >
                <Text size={1}>{r.display_name}</Text>
              </Card>
            ))}
          </Stack>
        </Card>
      )}

      <Card radius={3} overflow="hidden" border tone="transparent">
        <Box
          ref={containerRef}
          style={{ width: "100%", height: 340, position: "relative" }}
        />
        {searching && (
          <Box
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(255,255,255,0.92)",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            <Flex align="center" gap={2}>
              <Spinner muted />
              <Text size={1}>Searching…</Text>
            </Flex>
          </Box>
        )}
      </Card>

      <Flex justify="space-between" align="center">
        {value ? (
          <Code size={1}>
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </Code>
        ) : (
          <Text size={1} muted>
            Click the map or use the search to set a location.
          </Text>
        )}
        {value && (
          <Button
            mode="bleed"
            tone="critical"
            text="Clear"
            onClick={handleClear}
          />
        )}
      </Flex>
    </Stack>
  );
}
