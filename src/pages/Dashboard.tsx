import { useEffect, useMemo, useState } from "react";
import { CitySelector } from "@/components/CitySelector";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { CorrelationChart } from "@/components/CorrelationChart";
import { TrendChart } from "@/components/TrendChart";
import { SeasonalComparison } from "@/components/SeasonalComparison";
import { StatsCard } from "@/components/StatsCard";
import { AnomalyAlert } from "@/components/AnomalyAlert";
import { useObservations } from "@/hooks/useObservations";
import { calculateCorrelation } from "@/utils/correlation";
import { interpretCorrelation } from "@/utils/interpretations";
import { Cloud, Wind, Droplets, Gauge } from "lucide-react";
import type { PredictionEvaluation } from "@/types/observations";

type WeatherParameter = "temperature" | "humidity" | "pressure" | "windSpeed";

const Dashboard = () => {
  const [selectedCity, setSelectedCity] = useState("delhi");
  const parameters: WeatherParameter[] = ["temperature", "humidity", "pressure", "windSpeed"];
  const [selectedParameter, setSelectedParameter] = useState<WeatherParameter>("temperature");
  const [correlations, setCorrelations] = useState<Record<WeatherParameter, number> | null>(null);

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    return { start: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000), end };
  });
  const observationsQuery = useObservations(selectedCity, dateRange);
  const observations = useMemo(
    () => observationsQuery.data?.observations ?? [],
    [observationsQuery.data?.observations]
  );
  const weatherData = useMemo(
    () => observations.map(({ pm25: _pm25, ...weather }) => weather),
    [observations]
  );
  const pollutionData = useMemo(
    () => observations.map(({ timestamp, pm25 }) => ({ timestamp, pm25 })),
    [observations]
  );
  const latestWeather = weatherData.at(-1);
  const cityTimezone = observationsQuery.data?.timezone ?? "UTC";
  const prediction = observationsQuery.data?.prediction;
  const persistenceForecast = observationsQuery.data?.persistenceForecast;
  const evaluation: PredictionEvaluation | null =
    prediction?.evaluation ?? observationsQuery.data?.evaluation ?? null;

  useEffect(() => {
    if (!observations.length) {
      setCorrelations(null);
      return;
    }
    let active = true;
    const pollution = observations.map((row) => row.pm25);
    Promise.all([
      calculateCorrelation(observations.map((row) => row.temperature), pollution),
      calculateCorrelation(observations.map((row) => row.humidity), pollution),
      calculateCorrelation(observations.map((row) => row.pressure), pollution),
      calculateCorrelation(observations.map((row) => row.windSpeed), pollution),
    ]).then(([temperature, humidity, pressure, windSpeed]) => {
      if (active) setCorrelations({ temperature, humidity, pressure, windSpeed });
    });
    return () => {
      active = false;
    };
  }, [observations]);

  const getInterpretation = (parameter: WeatherParameter, correlation: number) =>
    interpretCorrelation(parameter, correlation);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">Weather-Pollution Correlator</h1>
          <p className="text-muted-foreground mt-2">
            Explore observed PM2.5 and weather relationships, seasonal patterns, and validated
            one-hour estimates.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <CitySelector value={selectedCity} onChange={setSelectedCity} />
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {observationsQuery.isLoading ? (
              <div className="flex items-center justify-center h-64" role="status">
                <span className="text-muted-foreground">Loading weather and air-quality observations…</span>
              </div>
            ) : observationsQuery.isError ? (
              <div className="rounded-lg border border-destructive p-6 text-destructive" role="alert">
                <h2 className="font-semibold">Could not load observations</h2>
                <p className="mt-2 text-sm">{observationsQuery.error.message}</p>
              </div>
            ) : observations.length === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-muted-foreground">
                No matching hourly weather and PM2.5 observations were found for this city and date
                range. Try another range or city; the selected area may not have a nearby PM2.5
                station.
              </div>
            ) : (
              <>
                <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  <p>
                    {observationsQuery.data?.sources.weatherAttribution} PM2.5 is from{" "}
                    {observationsQuery.data?.sources.station.provider}, station{" "}
                    <strong>{observationsQuery.data?.sources.station.locationName}</strong>
                    {" "}({observationsQuery.data?.sources.station.distanceKm} km from the city
                    center). Charts use {observations.length} exact UTC-hour matches; missing
                    readings are excluded, not replaced with zero.
                  </p>
                  <p className="mt-1">
                    Weather source: {observationsQuery.data?.sources.weather}. Air-quality source:{" "}
                    {observationsQuery.data?.sources.pollution}.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard title="Temperature" value={correlations?.temperature || 0} actualValue={latestWeather?.temperature} unit="°C" icon={<Cloud className="w-5 h-5" />} />
                  <StatsCard title="Wind Speed" value={correlations?.windSpeed || 0} actualValue={latestWeather?.windSpeed} unit="m/s" icon={<Wind className="w-5 h-5" />} />
                  <StatsCard title="Humidity" value={correlations?.humidity || 0} actualValue={latestWeather?.humidity} unit="%" icon={<Droplets className="w-5 h-5" />} />
                  <StatsCard title="Pressure" value={correlations?.pressure || 0} actualValue={latestWeather?.pressure} unit="hPa" icon={<Gauge className="w-5 h-5" />} />
                </div>

                <section className="rounded-lg border bg-card p-6">
                  <h2 className="text-xl font-semibold">Next-hour PM2.5 estimates</h2>
                  {persistenceForecast && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Target{" "}
                      {new Date(persistenceForecast.timestamp).toLocaleString(undefined, {
                        timeZone: cityTimezone,
                      })} ({cityTimezone})
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium">Persistence baseline</h3>
                      {persistenceForecast ? (
                        <>
                          <p className="mt-2 text-2xl font-bold text-primary">
                            {persistenceForecast.predictedPm25} µg/m³
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Assumes PM2.5 stays at its latest reading.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          A current matched PM2.5 reading is unavailable.
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium">Ridge regression</h3>
                      {prediction ? (
                        <>
                          <p className="mt-2 text-2xl font-bold text-primary">
                            {prediction.predictedPm25} µg/m³
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Uses weather and recent PM2.5 data.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {observationsQuery.data?.predictionMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  {evaluation && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Chronological holdout ({evaluation.validationSamples} samples): MAE{" "}
                      {evaluation.mae} µg/m³, RMSE {evaluation.rmse} µg/m³; persistence baseline
                      MAE {evaluation.persistenceMae} µg/m³.{" "}
                      {prediction
                        ? "Ridge regression beat the baseline on the holdout."
                        : "The persistence baseline performed at least as well on the holdout."}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estimates are experimental, station-specific, and should not be used for health
                    or safety decisions.
                  </p>
                </section>

                <div className="rounded-lg bg-card p-4 shadow-md">
                  <h2 className="mb-3 text-lg font-semibold">Select Weather Parameter</h2>
                  <div className="flex flex-wrap gap-3">
                    {parameters.map((param) => (
                      <button
                        key={param}
                        onClick={() => setSelectedParameter(param)}
                        className={`rounded-lg px-4 py-2 font-medium transition-all ${
                          selectedParameter === param
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {param === "windSpeed" ? "Wind Speed" : param[0].toUpperCase() + param.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <TrendChart weatherData={weatherData} pollutionData={pollutionData} parameter={selectedParameter} timezone={cityTimezone} />
                <CorrelationChart weatherData={weatherData} pollutionData={pollutionData} parameter={selectedParameter} />
                <SeasonalComparison weatherData={weatherData} pollutionData={pollutionData} timezone={cityTimezone} />

                <section className="rounded-lg bg-card p-6 shadow-md">
                  <h2 className="mb-4 text-xl font-semibold">Summary & Inference</h2>
                  <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground md:grid-cols-2">
                    {parameters.map((param) => (
                      <div key={param}>
                        <h3 className="mb-1 font-medium capitalize text-foreground">
                          {param === "windSpeed" ? "Wind speed" : param}
                        </h3>
                        <p className="mb-1 font-semibold text-primary">
                          Pearson correlation: {correlations?.[param]?.toFixed(3) ?? "Calculating…"}
                        </p>
                        {correlations && <p>{getInterpretation(param, correlations[param])}</p>}
                      </div>
                    ))}
                  </div>
                </section>

                <AnomalyAlert data={pollutionData} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
