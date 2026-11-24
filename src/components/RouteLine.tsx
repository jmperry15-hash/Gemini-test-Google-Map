import { useEffect } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import type { RouteResult } from "../lib/routes";
export const ROUTE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#d97706",
  "#db2777",
  "#059669",
  "#4f46e5",
  "#c2410c",
  "#0e7490",
  "#9333ea",
];
export function RouteLine({ results }: { results: RouteResult[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    const lines = results
      .filter((r) => r.path.length)
      .map((r) => {
        r.path.forEach((p) => bounds.extend(p));
        return new google.maps.Polyline({
          map,
          path: r.path,
          strokeColor: ROUTE_COLORS[r.index],
          strokeWeight: 5,
          strokeOpacity: 0.8,
        });
      });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
    return () => lines.forEach((line) => line.setMap(null));
  }, [map, results]);
  const first = results.find((r) => r.path.length);
  return (
    <>
      {first && (
        <AdvancedMarker position={first.path[0]} title="Starting point">
          <span className="map-marker origin-marker">A</span>
        </AdvancedMarker>
      )}
      {results
        .filter((r) => r.path.length)
        .map((r) => (
          <AdvancedMarker
            key={r.id}
            position={r.path[r.path.length - 1]}
            title={r.address}
          >
            <span
              className="map-marker"
              style={{ background: ROUTE_COLORS[r.index] }}
            >
              {r.index + 1}
            </span>
          </AdvancedMarker>
        ))}
    </>
  );
}
