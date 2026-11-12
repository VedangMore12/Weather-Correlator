import "dotenv/config";
import express from "express";
import { cities } from "./cities.js";
import { trainAndPredict } from "./model.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);
const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
const WEATHER_BASE_URL = "https://api.open-meteo.com/v1";
const WEATHER_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const MAX_RANGE_DAYS = 90;
const HOUR_MS = 60 * 60 * 1000;
const hasOpenAqApiKey = () =>
  Boolean(process.env.OPENAQ_API_KEY && process.env.OPENAQ_API_KEY !== "your-api-key");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const requestJson = async (url, provider, headers = {}) => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(
      502,
      `${provider} request failed (${response.status}): ${detail.slice(0, 250)}`
    );
  }
  return response.json();
};

const parseUtc = (value) => {
  if (value instanceof Date) return value;
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
};

const toIsoHour = (value) => {
  const date = parseUtc(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
};

const asDate = (value, name) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${name} date.`);
  return date;
};

const fetchWeather = async (city, start, end) => {
  const now = new Date();
  const recentStart = new Date(now.getTime() - 5 * 24 * HOUR_MS);
  const historicalEnd = new Date(recentStart);
  historicalEnd.setUTCHours(0, 0, 0, 0);
  historicalEnd.setUTCDate(historicalEnd.getUTCDate() - 1);
  const results = new Map();
  const hourlyVariables =
    "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation";

  if (start <= historicalEnd) {
    const archiveEnd = end < historicalEnd ? end : historicalEnd;
    const url = new URL(WEATHER_ARCHIVE_URL);
    url.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      start_date: start.toISOString().slice(0, 10),
      end_date: archiveEnd.toISOString().slice(0, 10),
      hourly: hourlyVariables,
      timezone: "UTC",
    }).toString();
    const archive = await requestJson(url, "Open-Meteo archive");
    addWeatherHours(results, archive);
  }

  const recentEnd = new Date(now.getTime() + 2 * 24 * HOUR_MS);
  if (end >= recentStart && start <= recentEnd) {
    const url = new URL(`${WEATHER_BASE_URL}/forecast`);
    url.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      hourly: hourlyVariables,
      timezone: "UTC",
      past_days: "5",
      forecast_days: "2",
    }).toString();
    addWeatherHours(results, await requestJson(url, "Open-Meteo forecast"));
  }

  return [...results.values()]
    .filter((item) => {
      const time = new Date(item.timestamp);
      return time >= start && time <= end;
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

const addWeatherHours = (results, data) => {
  const hourly = data.hourly;
  if (!hourly?.time) throw new ApiError(502, "Weather provider returned no hourly data.");
  hourly.time.forEach((timestamp, index) => {
    const values = [
      hourly.temperature_2m?.[index],
      hourly.relative_humidity_2m?.[index],
      hourly.wind_speed_10m?.[index],
      hourly.surface_pressure?.[index],
      hourly.precipitation?.[index],
    ];
    if (values.some((value) => !Number.isFinite(value))) return;
    results.set(toIsoHour(timestamp), {
      timestamp: toIsoHour(timestamp),
      temperature: values[0],
      humidity: values[1],
      windSpeed: values[2] / 3.6,
      pressure: values[3],
      precipitation: values[4],
    });
  });
};

const findPm25Sensor = async (city) => {
  const url = new URL(`${OPENAQ_BASE_URL}/locations`);
  url.search = new URLSearchParams({
    coordinates: `${city.latitude},${city.longitude}`,
    radius: "25000",
    parameters_id: "2",
    limit: "100",
    page: "1",
  }).toString();
  const locations = (
    await requestJson(url, "OpenAQ location search", {
      "X-API-Key": process.env.OPENAQ_API_KEY,
    })
  ).results || [];

  const sorted = locations
    .filter((location) => location.coordinates?.latitude != null && location.coordinates?.longitude != null)
    .sort((a, b) => distanceKm(city, a.coordinates) - distanceKm(city, b.coordinates));

  for (const location of sorted.slice(0, 5)) {
    const sensorsUrl = new URL(`${OPENAQ_BASE_URL}/locations/${location.id}/sensors`);
    sensorsUrl.searchParams.set("limit", "100");
    const sensors = (
      await requestJson(sensorsUrl, "OpenAQ sensor search", {
        "X-API-Key": process.env.OPENAQ_API_KEY,
      })
    ).results || [];
    const sensor = sensors.find((candidate) => {
      const parameter = candidate.parameter?.name?.toLowerCase();
      return parameter === "pm25" || parameter === "pm2.5";
    });
    if (sensor) {
      return {
        id: sensor.id,
        locationId: location.id,
        locationName: location.name || "OpenAQ monitoring station",
        distanceKm: Number(distanceKm(city, location.coordinates).toFixed(1)),
        provider: location.provider?.name || "OpenAQ",
        unit: sensor.parameter?.units || "µg/m³",
      };
    }
  }
  throw new ApiError(404, `No PM2.5 monitoring station was found within 25 km of ${city.name}.`);
};

const distanceKm = (a, b) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const fetchPm25 = async (sensor, start, end) => {
  const readings = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`${OPENAQ_BASE_URL}/sensors/${sensor.id}/hours`);
    url.search = new URLSearchParams({
      datetime_from: start.toISOString(),
      datetime_to: end.toISOString(),
      limit: "1000",
      page: String(page),
    }).toString();
    const response = await requestJson(url, "OpenAQ hourly measurements", {
      "X-API-Key": process.env.OPENAQ_API_KEY,
    });
    const results = response.results || [];
    for (const item of results) {
      const timestamp = item.period?.datetimeFrom?.utc;
      if (!timestamp || !Number.isFinite(item.value)) continue;
      readings.push({ timestamp: toIsoHour(timestamp), pm25: item.value });
    }
    if (results.length < 1000) break;
  }
  const unique = new Map(readings.map((item) => [item.timestamp, item]));
  return [...unique.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", openAqConfigured: hasOpenAqApiKey() });
});

app.get("/api/observations", async (request, response, next) => {
  try {
    if (!hasOpenAqApiKey()) {
      throw new ApiError(503, "Set a valid OPENAQ_API_KEY in the root .env file to enable OpenAQ data.");
    }
    const city = cities[request.query.city];
    if (!city) throw new ApiError(400, "Choose a supported city.");

    const start = asDate(request.query.start, "start");
    const end = asDate(request.query.end, "end");
    if (start >= end) throw new ApiError(400, "Start date must be earlier than end date.");
    if (end > new Date(Date.now() + 2 * 24 * HOUR_MS)) {
      throw new ApiError(400, "The selected end date is outside the available weather forecast range.");
    }
    if (end.getTime() - start.getTime() > (MAX_RANGE_DAYS + 1) * 24 * HOUR_MS) {
      throw new ApiError(400, `Choose a date range no longer than ${MAX_RANGE_DAYS} days.`);
    }

    const [weather, sensor] = await Promise.all([fetchWeather(city, start, end), findPm25Sensor(city)]);
    const pollution = await fetchPm25(sensor, start, end);
    const weatherByTime = new Map(weather.map((item) => [item.timestamp, item]));
    const pollutionByTime = new Map(pollution.map((item) => [item.timestamp, item]));
    const observations = [...weatherByTime.keys()]
      .filter((timestamp) => pollutionByTime.has(timestamp))
      .sort()
      .map((timestamp) => ({
        ...weatherByTime.get(timestamp),
        pm25: pollutionByTime.get(timestamp).pm25,
      }));

    const lastPmTimestamp = pollution.at(-1)?.timestamp;
    const forecastWeather = lastPmTimestamp
      ? await fetchWeather(city, new Date(lastPmTimestamp), new Date(Date.now() + 2 * 24 * HOUR_MS))
      : [];
    const latestPm = pollution.at(-1);
    const latestPmIsRecent =
      latestPm && Date.now() - new Date(latestPm.timestamp).getTime() <= 6 * HOUR_MS;
    const latestMatchedObservation = observations.at(-1);
    const hasCurrentWeatherAndPm25 =
      latestPmIsRecent && latestMatchedObservation?.timestamp === latestPm.timestamp;
    const result = hasCurrentWeatherAndPm25
      ? trainAndPredict(observations, forecastWeather)
      : {
          forecast: null,
          persistenceForecast: null,
          message: "A recent PM2.5 reading matched with weather is unavailable, so a next-hour estimate was withheld.",
        };

    response.json({
      city: city.name,
      timezone: city.timezone,
      observations,
      matchedHours: observations.length,
      sources: {
        weather: "Open-Meteo archive/reanalysis and forecast",
        pollution: "OpenAQ hourly PM2.5",
        station: sensor,
        weatherAttribution: "Weather data by Open-Meteo; historical weather is modelled/reanalysis data.",
      },
      prediction: result.forecast,
      persistenceForecast: result.persistenceForecast,
      predictionMessage: result.message,
      evaluation: result.evaluation || null,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const status = error instanceof ApiError ? error.status : 502;
  response.status(status).json({
    error: error instanceof Error ? error.message : "Unexpected data provider error.",
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Weather Correlator API listening on http://localhost:${port}`);
});
