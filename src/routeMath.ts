export interface CalculationResult {
  address: string;
  distance: string;
  duration: string;
  status: 'success' | 'error';
}

/** Fields returned by the Maps JavaScript `Route.computeRoutes` client. */
export interface RouteSummary {
  distanceMeters?: number;
  durationMillis?: number | null;
}

const METERS_PER_MILE = 1609.344;

export function formatRouteResult(address: string, route: RouteSummary | undefined): CalculationResult {
  const distanceMeters = route?.distanceMeters;
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) {
    return {address, distance: 'N/A', duration: 'N/A', status: 'error'};
  }

  const distanceKm = distanceMeters / 1000;
  const distanceMiles = distanceMeters / METERS_PER_MILE;
  const durationMillis = route?.durationMillis;
  const duration =
    durationMillis == null || !Number.isFinite(durationMillis)
      ? 'N/A'
      : `${Math.round(durationMillis / 60000)} mins`;

  return {
    address,
    distance: `${distanceMiles.toFixed(1)} miles (${distanceKm.toFixed(1)} km)`,
    duration,
    status: 'success',
  };
}

export function averageMiles(results: CalculationResult[]): string {
  const successes = results.filter((result) => result.status === 'success');
  if (successes.length === 0) return '0.0';

  const total = successes.reduce((sum, result) => {
    const miles = parseFloat(result.distance);
    return sum + (Number.isFinite(miles) ? miles : 0);
  }, 0);

  return (total / successes.length).toFixed(1);
}
