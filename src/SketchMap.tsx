import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import type { SketchMapEvent } from "./types";
import { SEASON_COLORS } from "./colors";

type Props = {
  events: SketchMapEvent[];
  onSelectEvents: (events: SketchMapEvent[]) => void;
  flyTo?: { lng: number; lat: number } | null;
};

function toGeoJSON(events: SketchMapEvent[]): GeoJSON.FeatureCollection {
  const grouped = new Map<string, { events: SketchMapEvent[]; lat: number; lng: number }>();
  for (const e of events) {
    if (e.lat == null || e.lng == null) continue;
    const key = `${e.lat},${e.lng}`;
    const group = grouped.get(key);
    if (group) {
      group.events.push(e);
    } else {
      grouped.set(key, { events: [e], lat: e.lat, lng: e.lng });
    }
  }

  return {
    type: "FeatureCollection",
    features: [...grouped.values()].map((g, i) => ({
      type: "Feature" as const,
      id: i,
      geometry: { type: "Point" as const, coordinates: [g.lng, g.lat] },
      properties: {
        eventIds: g.events.map((e) => e.id).join(","),
        season: g.events[0].season,
        color: SEASON_COLORS[g.events[0].season],
        count: g.events.length,
      },
    })),
  };
}

const SOURCE_ID = "sketch-events";
const UNCLUSTERED_LAYER = "event-points";
const UNCLUSTERED_COUNT_LAYER = "event-point-count";
const CLUSTER_LAYER = "event-clusters";
const CLUSTER_COUNT_LAYER = "cluster-count";

export function SketchMap({ events, onSelectEvents, flyTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const onSelectRef = useRef(onSelectEvents);
  onSelectRef.current = onSelectEvents;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-73.98, 40.74],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJSON(events),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
        clusterProperties: {
          totalCount: ["+", ["get", "count"]],
        },
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#94a3b8",
          "circle-radius": ["step", ["get", "totalCount"], 18, 5, 24, 10, 30],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "totalCount"]],
          "text-size": 13,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["step", ["get", "count"], 8, 2, 12],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: UNCLUSTERED_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
        layout: {
          "text-field": ["get", "count"],
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      map.on("click", (e) => {
        const tolerance = 12;
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [e.point.x - tolerance, e.point.y - tolerance],
          [e.point.x + tolerance, e.point.y + tolerance],
        ];

        const clusterFeatures = map.queryRenderedFeatures(bbox, {
          layers: [CLUSTER_LAYER],
        });

        if (clusterFeatures.length > 0) {
          const feature = clusterFeatures[0];
          const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
          const clusterId = feature.properties?.cluster_id;
          source.getClusterLeaves(clusterId, Infinity, 0).then((leaves) => {
            const ids = new Set<string>();
            for (const f of leaves) {
              const eids = f.properties?.eventIds;
              if (eids) for (const id of eids.split(",")) ids.add(id);
            }
            const matches = eventsRef.current.filter((ev) => ids.has(ev.id));
            if (matches.length > 0) {
              onSelectRef.current(matches);
            }
          });
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const coords = (feature.geometry as GeoJSON.Point).coordinates;
            map.easeTo({ center: [coords[0], coords[1]], zoom: zoom + 1 });
          });
          return;
        }

        const pointFeatures = map.queryRenderedFeatures(bbox, {
          layers: [UNCLUSTERED_LAYER, UNCLUSTERED_COUNT_LAYER],
        });

        if (pointFeatures.length > 0) {
          const clickedIds = new Set<string>();
          for (const f of pointFeatures) {
            const ids = f.properties?.eventIds;
            if (ids) for (const id of ids.split(",")) clickedIds.add(id);
          }
          const matches = eventsRef.current.filter((ev) => clickedIds.has(ev.id));
          onSelectRef.current(matches.length > 0 ? matches : []);
          return;
        }

        onSelectRef.current([]);
      });

      for (const layer of [UNCLUSTERED_LAYER, UNCLUSTERED_COUNT_LAYER]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
      map.on("mouseenter", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(toGeoJSON(events));
    }
  }, [events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 15 });
  }, [flyTo]);

  return <div ref={containerRef} className="w-full h-full" />;
}
