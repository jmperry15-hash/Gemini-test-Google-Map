import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateRoute, formatDuration, apiError } from "../src/lib/routes.ts";
const origin = { text: " Denver, CO " };
const destination = { id: "boulder", text: " Boulder, CO " };
const route = {
  distanceMeters: 1609.344,
  durationMillis: 3_600_000,
  path: [{ lat: 39.7, lng: -105, altitude: 0 }],
  warnings: ["Use caution."],
};

test("requests current driving API fields and converts units without losing the road path", async () => {
  let request;
  const result = await calculateRoute(
    async (r) => {
      request = r;
      return { routes: [route] as any };
    },
    origin,
    destination,
    0,
  );
  assert.equal(request.origin, "Denver, CO");
  assert.equal(request.destination, "Boulder, CO");
  assert.equal(request.travelMode, "DRIVING");
  assert.equal(request.routingPreference, "TRAFFIC_UNAWARE");
  assert.deepEqual(request.fields, [
    "distanceMeters",
    "durationMillis",
    "path",
    "warnings",
  ]);
  assert.equal(result.distanceMiles, 1);
  assert.equal(result.distanceKm, 1.609344);
  assert.equal(result.durationMin, 60);
  assert.deepEqual(result.path, [{ lat: 39.7, lng: -105 }]);
  assert.deepEqual(result.warnings, ["Use caution."]);
});
test("retains selected Places rather than substituting ambiguous text", async () => {
  const place = { id: "unique-place" } as google.maps.places.Place;
  await calculateRoute(
    async (request) => {
      assert.equal(request.origin, place);
      assert.equal(request.destination, place);
      return { routes: [route] as any };
    },
    { ...origin, place },
    { ...destination, place },
    0,
  );
});
test("valid zero distance and duration are kept", async () => {
  const result = await calculateRoute(
    async () => ({
      routes: [{ ...route, distanceMeters: 0, durationMillis: 0 }] as any,
    }),
    origin,
    destination,
    0,
  );
  assert.equal(result.error, undefined);
  assert.equal(result.distanceMiles, 0);
  assert.equal(result.durationMin, 0);
});
test("missing and invalid route measurements never become successful zeroes", async () => {
  for (const values of [
    { distanceMeters: undefined },
    { distanceMeters: NaN },
    { distanceMeters: -1 },
    { durationMillis: null },
    { durationMillis: Infinity },
  ]) {
    const result = await calculateRoute(
      async () => ({ routes: [{ ...route, ...values }] as any }),
      origin,
      destination,
      0,
    );
    assert.match(result.error!, /incomplete/);
    assert.equal(result.distanceMiles, undefined);
  }
});
test("empty route list gives a useful per-destination error", async () => {
  const result = await calculateRoute(
    async () => ({ routes: [] }),
    origin,
    destination,
    2,
  );
  assert.match(result.error!, /No driving route/);
  assert.equal(result.index, 2);
  assert.equal(result.id, "boulder");
});
test("a rejected destination does not discard another successful result", async () => {
  const results = await Promise.all([
    calculateRoute(
      async () => {
        throw new Error("PERMISSION_DENIED");
      },
      origin,
      destination,
      0,
    ),
    calculateRoute(
      async () => ({ routes: [route] as any }),
      origin,
      { id: "second", text: "Another place" },
      1,
    ),
  ]);
  assert.match(results[0].error!, /billing/);
  assert.equal(results[1].distanceMiles, 1);
});
test("error text is actionable and does not expose raw request data", () => {
  assert.match(apiError(new Error("429 quota")), /request limit/);
  assert.match(apiError(new Error("ZERO_RESULTS")), /No driving route/);
  assert.equal(
    apiError(new Error("URL containing private-key")),
    "Could not calculate this route. Check the addresses and your connection, then try again.",
  );
});
test("duration formatting handles hour rounding and sub-minute trips", () => {
  assert.equal(formatDuration(59.9), "1 hr");
  assert.equal(formatDuration(61), "1 hr 1 min");
  assert.equal(formatDuration(0), "0 min");
  assert.equal(formatDuration(0.2), "<1 min");
});
