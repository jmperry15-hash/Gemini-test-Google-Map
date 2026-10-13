import assert from 'node:assert/strict';
import test from 'node:test';
import {averageMiles, formatRouteResult} from './routeMath.ts';

test('formats distance and duration from the JavaScript Routes fields', () => {
  const result = formatRouteResult('San Francisco, CA', {
    distanceMeters: 1609.344,
    durationMillis: 120_000,
  });

  assert.equal(result.status, 'success');
  assert.equal(result.distance, '1.0 miles (1.6 km)');
  assert.equal(result.duration, '2 mins');
});

test('keeps a successful distance when duration was not returned', () => {
  const result = formatRouteResult('Nearby', {distanceMeters: 500, durationMillis: null});
  assert.equal(result.status, 'success');
  assert.equal(result.duration, 'N/A');
});

test('reports an error when the route has no distance', () => {
  const result = formatRouteResult('Unknown', undefined);
  assert.deepEqual(result, {
    address: 'Unknown',
    distance: 'N/A',
    duration: 'N/A',
    status: 'error',
  });
});

test('average ignores failed rows and stays finite when every row failed', () => {
  assert.equal(
    averageMiles([
      {address: 'a', distance: 'Error', duration: 'Error', status: 'error'},
      {address: 'b', distance: 'N/A', duration: 'N/A', status: 'error'},
    ]),
    '0.0',
  );

  assert.equal(
    averageMiles([
      {address: 'a', distance: '10.0 miles (16.1 km)', duration: '12 mins', status: 'success'},
      {address: 'b', distance: 'Error', duration: 'Error', status: 'error'},
      {address: 'c', distance: '30.0 miles (48.3 km)', duration: '40 mins', status: 'success'},
    ]),
    '20.0',
  );
});
