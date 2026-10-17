# Distance

A React + TypeScript distance calculator using Google Maps. Compare one starting point with up to ten destinations, including driving distance, estimated travel time, and the actual road paths on a map.

## Run locally

1. Install Node.js and run `npm install` from this folder.
2. Copy `.env.example` to `.env.local` and fill in `GOOGLE_MAPS_PLATFORM_KEY`. An existing `.env` key also works; `.env.local` overrides it.
3. In the same Google Cloud project, enable **Maps JavaScript API**, **Routes API**, and **Places API (New)**, with billing configured.
4. Restrict the browser key to those APIs and the websites you use, including `http://127.0.0.1:3000/*` and/or `http://localhost:3000/*` for development.
5. Run `npm run dev` and open the Local URL printed in the terminal. Keep the terminal running.

Do not double-click `index.html`. Vite compiles the TypeScript/React code and serves it over HTTP. Restart Vite after changing an environment file. Browser Maps keys are included in the delivered JavaScript by design; Google Cloud website and API restrictions protect their use. Do not use a server-only secret here.

For a production build, run `npm run build`, then `npm run preview` and open its printed URL. Allow that URL on your key if testing the preview. The `dist/` folder must also be served over HTTP. Hosted deployments need their own allowed website URL; environment values are embedded at build time.

## How the API flow works

- Address suggestions use `AutocompleteSuggestion.fetchAutocompleteSuggestions` from Places API (New), debounced while typing and grouped with a session token. Selecting a suggestion fetches place details and retains the Place object for precise routing. A full typed address also works when suggestions are unavailable.
- The Calculate button calls `Route.computeRoutes` once per nonempty destination, always from the same origin. Its field mask requests only distance, duration, path, and warnings.
- Google returns meters and milliseconds. The app converts them into miles, kilometers, and minutes; the returned path draws the actual road route.
- A failed destination gets its own error. Successful routes still appear. Editing an address clears old results, and superseded responses are discarded.
- Travel times use `TRAFFIC_UNAWARE`, so they exclude live traffic. Combined distance sums independent one-way trips; it is not a trip visiting every destination in sequence.

No Gemini or other AI API key is required. This project practices API integration without using a language model. Geocoding API and legacy Directions/Places APIs are not required by this implementation.

## Checks

- `npm run lint` — TypeScript checking.
- `npm test` — route conversion, request construction, missing data, and API failure regression tests with a mocked Google response. These do not make billable requests.
- `npm run build` — production build.

A passing build does not verify your Google Cloud billing, API configuration, key validity, or live route responses. Test with two recognizable places after setup.

## Google documentation

- [Get a route](https://developers.google.com/maps/documentation/javascript/routes/get-a-route)
- [Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [API security practices](https://developers.google.com/maps/api-security-best-practices)
