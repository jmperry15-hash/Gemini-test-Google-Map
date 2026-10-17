import type { AddressValue } from "../components/AddressInput";
export interface RouteResult {
  id: string;
  address: string;
  index: number;
  distanceMiles?: number;
  distanceKm?: number;
  durationMin?: number;
  path: google.maps.LatLngLiteral[];
  warnings: string[];
  error?: string;
}
export function apiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (
    /REQUEST_DENIED|PERMISSION_DENIED|not authorized|not activated|ApiNotActivated|API_KEY|billing|403/i.test(
      raw,
    )
  )
    return "Google rejected the request. Check billing, enabled APIs, and the key’s website restrictions in Google Cloud.";
  if (/quota|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|429/i.test(raw))
    return "Google’s request limit was reached. Wait a moment and try again.";
  if (/ZERO_RESULTS|NOT_FOUND|no route/i.test(raw))
    return "No driving route found. Try a more specific address or a reachable destination.";
  return "Could not calculate this route. Check the addresses and your connection, then try again.";
}
export async function calculateRoute(
  compute: (
    request: google.maps.routes.ComputeRoutesRequest,
  ) => Promise<{
    routes: readonly Pick<
      google.maps.routes.Route,
      "distanceMeters" | "durationMillis" | "path" | "warnings"
    >[];
  }>,
  origin: AddressValue,
  destination: AddressValue & { id: string },
  index: number,
): Promise<RouteResult> {
  const base = {
    id: destination.id,
    address: destination.text.trim(),
    index,
    path: [],
    warnings: [],
  };
  try {
    const { routes } = await compute({
      origin: origin.place || origin.text.trim(),
      destination: destination.place || destination.text.trim(),
      travelMode: "DRIVING",
      routingPreference: "TRAFFIC_UNAWARE",
      fields: ["distanceMeters", "durationMillis", "path", "warnings"],
    });
    const route = routes[0];
    if (!route)
      return {
        ...base,
        error:
          "No driving route found. Try a more specific address or a reachable destination.",
      };
    if (
      !Number.isFinite(route.distanceMeters) ||
      route.distanceMeters! < 0 ||
      route.durationMillis == null ||
      !Number.isFinite(route.durationMillis) ||
      route.durationMillis < 0
    ) {
      return {
        ...base,
        error:
          "Google returned incomplete distance or time data. Please try again.",
      };
    }
    return {
      ...base,
      distanceMiles: route.distanceMeters! / 1609.344,
      distanceKm: route.distanceMeters! / 1000,
      durationMin: route.durationMillis / 60000,
      path: route.path?.map((p) => ({ lat: p.lat, lng: p.lng })) || [],
      warnings: route.warnings || [],
    };
  } catch (error) {
    return { ...base, error: apiError(error) };
  }
}
export function formatDuration(minutes: number) {
  const total = Math.round(minutes);
  if (total === 0 && minutes > 0) return "<1 min";
  return total < 60
    ? `${total} min`
    : `${Math.floor(total / 60)} hr${total % 60 ? ` ${total % 60} min` : ""}`;
}
