
# Weather-Pollution Correlator

React + TypeScript dashboard that compares hourly Open-Meteo weather data with hourly PM2.5
measurements from the nearest OpenAQ station. Observations are joined by UTC hour; missing source
values are not fabricated or replaced with zero.

## Run locally

1. Install dependencies with `npm install`.
2. Create an OpenAQ API key at [explore.openaq.org](https://explore.openaq.org).
3. Copy `.env.example` to `.env` if needed, then replace `your-api-key` in `.env`:

   ```dotenv
   OPENAQ_API_KEY=your-real-openaq-api-key
   ```

4. Run `npm run dev`. This starts both the Express API and Vite frontend; open the Vite URL shown in
   the terminal. Stop both processes with `Ctrl+C`.

The checked-out `.env` file contains a placeholder; replace it with your real key before running
the API. `.env` is gitignored, while `.env.example` is safe to commit. The key is loaded by dotenv
for the Express API and must not be placed in a `VITE_` variable. The frontend
proxies `/api` to `localhost:3001` during development. Set `API_PORT` to change the API port; update
the Vite proxy when changing it. In production, configure the frontend host or reverse proxy to
forward `/api` requests to the Express service and set `OPENAQ_API_KEY` in that service's
environment.

## Data and predictions

- Weather observations come from Open-Meteo's historical archive and recent forecast endpoint.
  Historical archive values are modelled/reanalysis data, not necessarily measurements from the
  air-quality station. Wind speed is converted from km/h to m/s.
- PM2.5 hourly averages come from the nearest discovered OpenAQ sensor within 25 km. A station or
  date range without coverage is reported instead of filled with synthetic values.
- The API limits requests to 90 days and uses exact UTC-hour joins. OpenAQ coverage, API access,
  rate limits, and the station's own data license vary.
- The next-hour model is Ridge regression using weather, precipitation, cyclical hour, and the
  previous PM2.5 reading. It uses an 80/20 chronological holdout, reports MAE/RMSE against a
  persistence baseline, and suppresses predictions when it does not beat that baseline.
- The prediction is experimental, station-specific, and not suitable for health or safety
  decisions. Pearson correlation describes association, not causation.

Provide attribution when redistributing the app or its data: weather data by
[Open-Meteo](https://open-meteo.com/) (including the applicable underlying model/reanalysis
provider) and air-quality data by [OpenAQ](https://openaq.org/). Check the providers' current terms
and data-specific licenses before production use.

## Checks

Run server model tests with `npm run test:server`; run the frontend production build with `npm run
build`.
