import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import type { SketchMapEvent } from "./types";
import { SEASON_COLORS } from "./colors";

type Props = {
  events: SketchMapEvent[];
  onSelectEvents: (events: SketchMapEvent[]) => void;
};

function toGeoJSON(events: SketchMapEvent[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((e, i) => ({
      type: "Feature" as const,
      id: i,
      geometry: { type: "Point" as const, coordinates: [e.lng!, e.lat!] },
      properties: {
        eventId: e.id,
        title: e.title,
        season: e.season,
        color: SEASON_COLORS[e.season],
      },
    })),
  };
}

const SOURCE_ID = "sketch-events";
const UNCLUSTERED_LAYER = "event-points";
const CLUSTER_LAYER = "event-clusters";
const CLUSTER_COUNT_LAYER = "cluster-count";

export function SketchMap({ events, onSelectEvents }: Props) {
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
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJSON(events),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#94a3b8",
          "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 10, 30],
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
          "text-field": "{point_count_abbreviated}",
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
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
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
            const ids = leaves.map((f) => f.properties?.eventId).filter(Boolean);
            const matches = eventsRef.current.filter((ev) =>
              ids.includes(ev.id)
            );
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
          layers: [UNCLUSTERED_LAYER],
        });

        if (pointFeatures.length > 0) {
          const clickedIds = new Set(
            pointFeatures.map((f) => f.properties?.eventId).filter(Boolean)
          );
          const coords = (pointFeatures[0].geometry as GeoJSON.Point)
            .coordinates as [number, number];
          const EPSILON = 0.0005;
          const matches = eventsRef.current.filter(
            (ev) =>
              clickedIds.has(ev.id) ||
              (ev.lng != null &&
                ev.lat != null &&
                Math.abs(ev.lng - coords[0]) < EPSILON &&
                Math.abs(ev.lat - coords[1]) < EPSILON)
          );
          onSelectRef.current(matches.length > 0 ? matches : []);
          return;
        }

        onSelectRef.current([]);
      });

      map.on("mouseenter", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
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

  return <div ref={containerRef} className="w-full h-full" />;
}
