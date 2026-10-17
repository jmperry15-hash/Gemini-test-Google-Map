import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  APILoadingStatus,
  Map,
  useApiLoadingStatus,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  ArrowRight,
  Car,
  Check,
  Clock3,
  ExternalLink,
  Layers3,
  LoaderCircle,
  MapPin,
  Navigation,
  Plus,
  Route,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { AddressInput, type AddressValue } from "./AddressInput";
import { RouteLine, ROUTE_COLORS } from "./RouteLine";
import {
  calculateRoute,
  formatDuration,
  type RouteResult,
} from "../lib/routes";
const newDestination = () => ({ id: crypto.randomUUID(), text: "" });
export function DistanceCalculator({ hasKey }: { hasKey: boolean }) {
  const routes = useMapsLibrary("routes");
  const status = useApiLoadingStatus();
  const [origin, setOrigin] = useState<AddressValue>({ text: "" });
  const [destinations, setDestinations] = useState<
    (AddressValue & { id: string })[]
  >([newDestination()]);
  const [results, setResults] = useState<RouteResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const ready =
    hasKey && status === APILoadingStatus.LOADED && Boolean(routes?.Route);
  const failed =
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE;
  const valid = destinations.some((d) => d.text.trim());
  function invalidate() {
    generation.current++;
    setResults([]);
    setMessage("");
  }
  async function calculate(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !ready || !origin.text.trim() || !valid) return;
    inFlight.current = true;
    const current = ++generation.current;
    setBusy(true);
    setResults([]);
    setMessage("");
    try {
      const resolved = await Promise.all(
        destinations.flatMap((d, index) =>
          d.text.trim()
            ? [
                calculateRoute(
                  (request) => routes!.Route.computeRoutes(request),
                  origin,
                  d,
                  index,
                ),
              ]
            : [],
        ),
      );
      if (current !== generation.current) return;
      setResults(resolved);
      setMessage(
        `${resolved.filter((r) => !r.error).length} of ${resolved.length} routes calculated.`,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const successful = results.filter((r) => !r.error);
  const total = successful.reduce((sum, r) => sum + r.distanceMiles!, 0);
  const mean = successful.length ? total / successful.length : 0;
  const longest = successful.length
    ? Math.max(...successful.map((r) => r.distanceMiles!))
    : 0;
  const avgTime = successful.length
    ? successful.reduce((sum, r) => sum + r.durationMin!, 0) / successful.length
    : 0;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Distance home">
          <span className="brand-icon">
            <Navigation size={20} />
          </span>
          distance<span className="brand-period">.</span>
        </a>
        <span className="topbar-label">Distance calculator</span>
        <div className="provider-badge">
          <Layers3 size={15} /> Google Maps
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow">A LITTLE CLARITY FOR EVERY JOURNEY</div>
            <h1>Know the distance.</h1>
            <p>
              One starting point. Up to ten destinations. Every route, compared.
            </p>
          </div>
          <span className="mode-badge">
            <Car size={17} /> Driving
          </span>
        </div>
        {(!hasKey || failed) && (
          <div className="setup-alert" role="alert">
            <TriangleAlert size={22} />
            <div>
              <strong>
                {!hasKey
                  ? "Connect Google Maps to get started"
                  : "Google Maps could not connect"}
              </strong>
              <p>
                {!hasKey
                  ? "Set GOOGLE_MAPS_PLATFORM_KEY in .env.local, then restart the app."
                  : "Check your internet connection, Google Cloud billing, API access, and the key’s allowed websites. Reload after updating your settings."}{" "}
                Enable Maps JavaScript API, Routes API, and Places API (New).
              </p>
              <a
                href="https://console.cloud.google.com/google/maps-apis/overview"
                target="_blank"
                rel="noreferrer"
              >
                Open Google Cloud <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
        <div className="calculator-grid">
          <form className="panel route-form" onSubmit={calculate}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">YOUR ROUTES</span>
                <h2>Where are you headed?</h2>
              </div>
              <Route size={21} />
            </div>
            <div className="origin-section">
              <span className="point-label">A</span>
              <AddressInput
                id="origin"
                label="Starting point"
                value={origin}
                onChange={(v) => {
                  invalidate();
                  setOrigin(v);
                }}
                disabled={busy}
                placeholder="City, place, or street address"
              />
            </div>
            <div className="destination-heading">
              <h3>Destinations</h3>
              <span>{destinations.length} / 10</span>
            </div>
            <div className="destination-list">
              {destinations.map((d, index) => (
                <div className="destination-row" key={d.id}>
                  <span
                    className="point-label destination-point"
                    style={{ color: ROUTE_COLORS[index] }}
                  >
                    {index + 1}
                  </span>
                  <AddressInput
                    id={`destination-${d.id}`}
                    label={`Destination ${index + 1}`}
                    value={d}
                    onChange={(v) => {
                      invalidate();
                      setDestinations((prev) =>
                        prev.map((item) =>
                          item.id === d.id ? { ...v, id: d.id } : item,
                        ),
                      );
                    }}
                    disabled={busy}
                  />
                  {destinations.length > 1 && (
                    <button
                      className="icon-button remove-destination"
                      type="button"
                      aria-label={`Remove destination ${index + 1}`}
                      disabled={busy}
                      onClick={() => {
                        invalidate();
                        setDestinations((prev) =>
                          prev.filter((item) => item.id !== d.id),
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="add-button"
              type="button"
              disabled={busy || destinations.length >= 10}
              onClick={() => {
                invalidate();
                setDestinations((prev) => [...prev, newDestination()]);
              }}
            >
              <Plus size={17} /> Add destination
            </button>
            <div className="form-bottom">
              <div className="travel-note">
                <Car size={16} />
                <span>Driving routes · One way</span>
              </div>
              <button
                className="primary-button"
                disabled={!ready || busy || !origin.text.trim() || !valid}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={19} /> Calculating…
                  </>
                ) : (
                  <>
                    Calculate distances <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="form-hint">
                Each destination is measured from your starting point.
              </p>
              {hasKey && !failed && !ready && (
                <p className="field-note" role="status">
                  Connecting to Google Maps…
                </p>
              )}
            </div>
          </form>
          <section className="panel map-panel" aria-label="Route map">
            <div className="map-heading">
              <div className="map-title">
                <MapPin size={18} />
                <h2>Route overview</h2>
              </div>
              <span className="map-label">
                {successful.length
                  ? `${successful.length} driving route${successful.length === 1 ? "" : "s"}`
                  : "Explore the map"}
              </span>
            </div>
            <div className="map-canvas">
              {hasKey && !failed ? (
                <Map
                  defaultCenter={{ lat: 39.7392, lng: -104.9903 }}
                  defaultZoom={10}
                  mapId="DEMO_MAP_ID"
                  colorScheme="LIGHT"
                  disableDefaultUI={true}
                  zoomControl={true}
                  gestureHandling="cooperative"
                  style={{ width: "100%", height: "100%" }}
                >
                  <RouteLine results={results} />
                </Map>
              ) : (
                <div className="map-unavailable">
                  <MapPin size={36} />
                  <h3>Your routes will appear here</h3>
                  <p>Connect Google Maps to explore driving routes.</p>
                </div>
              )}
              {!results.length && hasKey && !failed && (
                <div className="map-prompt">
                  <span className="prompt-icon">
                    <Route size={20} />
                  </span>
                  <div>
                    <strong>Your next journey starts here</strong>
                    <p>Add your places and calculate to see the road ahead.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="map-footer">
              <span>
                <span className="legend-origin" /> Starting point
              </span>
              <span>
                <span className="legend-route" /> Driving route
              </span>
              <span className="map-footer-note">Powered by Google Maps</span>
            </div>
          </section>
        </div>
        <section
          className="results-section"
          aria-labelledby="results-title"
          aria-busy={busy}
        >
          <div className="results-heading">
            <div>
              <h2 id="results-title">Compare your routes</h2>
              <p>Driving distance and estimated time, side by side.</p>
            </div>
            <span className="result-count">
              {results.length
                ? `${successful.length} of ${results.length} calculated`
                : "No routes yet"}
            </span>
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {busy ? "Calculating routes." : message}
          </div>
          {!results.length ? (
            <div className="panel empty-results">
              <span className="empty-icon">
                {busy ? (
                  <LoaderCircle className="spin" size={24} />
                ) : (
                  <Route size={24} />
                )}
              </span>
              <div>
                <h3>
                  {busy
                    ? "Finding the best way there…"
                    : "A clear view of every destination"}
                </h3>
                <p>
                  {busy
                    ? "Requesting driving distances from Google Maps."
                    : "Your distances and travel times will appear here after you calculate."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="panel result-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Destination</th>
                      <th scope="col">Distance</th>
                      <th scope="col">Drive time</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="result-destination">
                            <span
                              className="result-number"
                              style={{ color: ROUTE_COLORS[r.index] }}
                            >
                              {r.index + 1}
                            </span>
                            <div>
                              <strong>{r.address}</strong>
                              {r.error && (
                                <p className="route-error">{r.error}</p>
                              )}
                              {r.warnings.map((w, i) => (
                                <p className="route-warning" key={i}>
                                  {w}
                                </p>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td>
                          {r.error ? (
                            "—"
                          ) : (
                            <>
                              <strong className="distance-value">
                                {r.distanceMiles!.toFixed(1)} <small>mi</small>
                              </strong>
                              <span className="secondary-value">
                                {r.distanceKm!.toFixed(1)} km
                              </span>
                            </>
                          )}
                        </td>
                        <td>
                          {r.error ? (
                            "—"
                          ) : (
                            <span className="duration-value">
                              <Clock3 size={15} />
                              {formatDuration(r.durationMin!)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              r.error ? "status-badge error" : "status-badge"
                            }
                          >
                            {r.error ? (
                              <TriangleAlert size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                            {r.error ? "Unavailable" : "Calculated"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {successful.length > 0 && (
                <div className="stats-grid">
                  <Metric
                    label="Average distance"
                    value={mean.toFixed(1)}
                    unit="mi"
                  />
                  <Metric
                    label="Longest route"
                    value={longest.toFixed(1)}
                    unit="mi"
                  />
                  <Metric
                    label="Combined distance"
                    value={total.toFixed(1)}
                    unit="mi"
                  />
                  <Metric
                    label="Average drive time"
                    value={formatDuration(avgTime)}
                  />
                </div>
              )}
            </>
          )}
          <p className="results-note">
            Travel times exclude live traffic. Combined distance is the sum of
            separate one-way trips.
          </p>
        </section>
        <footer className="footer">
          <span>
            distance<span className="brand-period">.</span>
          </span>
          <p>Distance data by Google Maps</p>
          <span>Made for the way ahead.</span>
        </footer>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {value} {unit && <small>{unit}</small>}
      </strong>
    </div>
  );
}
