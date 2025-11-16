import { useState, useEffect, useMemo } from "react";
import { CitySelector } from "@/components/CitySelector";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { CorrelationChart } from "@/components/CorrelationChart";
import { TrendChart } from "@/components/TrendChart";
import { SeasonalComparison } from "@/components/SeasonalComparison";
import { StatsCard } from "@/components/StatsCard";
import { AnomalyAlert } from "@/components/AnomalyAlert";
import { useWeatherData } from "@/hooks/useWeatherData";
import { usePollutionData } from "@/hooks/usePollutionData";
import { calculateCorrelation } from "@/utils/correlation";
import { interpretCorrelation } from "@/utils/interpretations";
import { Cloud, Wind, Droplets, Gauge } from "lucide-react";

const Dashboard = () => {
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const parameters: Array<"temperature" | "humidity" | "pressure" | "windSpeed"> = [
    "temperature",
    "humidity",
    "pressure",
    "windSpeed",
  ];
  const [selectedParameter, setSelectedParameter] =
    useState<"temperature" | "humidity" | "pressure" | "windSpeed">("temperature");

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.setHours(0, 0, 0, 0)),
    end: new Date(),
  });

  const { data: weatherData, isLoading: weatherLoading } = useWeatherData(
    selectedCity,
    dateRange
  );
  const { data: pollutionData, isLoading: pollutionLoading } = usePollutionData(
    selectedCity,
    dateRange
  );

  const isLoading = weatherLoading || pollutionLoading;
  const [correlations, setCorrelations] = useState<{
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
  } | null>(null);

  useEffect(() => {
    if (weatherData && pollutionData) {
      (async () => {
        const temperature = await calculateCorrelation(
          weatherData.map((d) => d.temperature),
          pollutionData.map((d) => d.pm25)
        );
        const humidity = await calculateCorrelation(
          weatherData.map((d) => d.humidity),
          pollutionData.map((d) => d.pm25)
        );
        const windSpeed = await calculateCorrelation(
          weatherData.map((d) => d.windSpeed),
          pollutionData.map((d) => d.pm25)
        );
        const pressure = await calculateCorrelation(
          weatherData.map((d) => d.pressure),
          pollutionData.map((d) => d.pm25)
        );
        setCorrelations({ temperature, humidity, windSpeed, pressure });
      })();
    }
  }, [weatherData, pollutionData]);

  const latestWeather = useMemo(
    () => weatherData?.[weatherData.length - 1],
    [weatherData]
  );

  const getInterpretation = (
    parameter: "temperature" | "humidity" | "pressure" | "windSpeed",
    correlation: number
  ) => interpretCorrelation(parameter, correlation);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">
            Weather-Pollution Correlator
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze correlations, trends, and predictions between weather
            conditions and PM2.5 levels.
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
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Temperature"
                    value={correlations?.temperature || 0}
                    actualValue={latestWeather?.temperature}
                    unit="°C"
                    icon={<Cloud className="w-5 h-5" />}
                  />
                  <StatsCard
                    title="Wind Speed"
                    value={correlations?.windSpeed || 0}
                    actualValue={latestWeather?.windSpeed}
                    unit="m/s"
                    icon={<Wind className="w-5 h-5" />}
                  />
                  <StatsCard
                    title="Humidity"
                    value={correlations?.humidity || 0}
                    actualValue={latestWeather?.humidity}
                    unit="%"
                    icon={<Droplets className="w-5 h-5" />}
                  />
                  <StatsCard
                    title="Pressure"
                    value={correlations?.pressure || 0}
                    actualValue={latestWeather?.pressure}
                    unit="hPa"
                    icon={<Gauge className="w-5 h-5" />}
                  />
                </div>

                <div className="bg-card p-4 rounded-lg shadow-md">
                  <h2 className="text-lg font-semibold mb-3">
                    Select Weather Parameter
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {parameters.map((param) => (
                      <button
                        key={param}
                        onClick={() => setSelectedParameter(param)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedParameter === param
                            ? "bg-primary text-white shadow-md"
                            : "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {param === "temperature"
                          ? "Temperature"
                          : param === "humidity"
                          ? "Humidity"
                          : param === "pressure"
                          ? "Pressure"
                          : "Wind Speed"}
                      </button>
                    ))}
                  </div>
                </div>

                <TrendChart
                  weatherData={weatherData || []}
                  pollutionData={pollutionData || []}
                  parameter={selectedParameter}
                />
                <CorrelationChart
                  weatherData={weatherData || []}
                  pollutionData={pollutionData || []}
                  parameter={selectedParameter}
                />
                <SeasonalComparison
                  weatherData={weatherData || []}
                  pollutionData={pollutionData || []}
                />

                <div className="bg-card p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">
                    Summary & Inference
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    {(["temperature", "humidity", "windSpeed", "pressure"] as const).map(
                      (param) => (
                        <div key={param}>
                          <h3 className="font-medium text-foreground mb-1 capitalize">
                            {param}
                          </h3>
                          <p className="mb-1 text-primary font-semibold">
                            Correlation: {correlations?.[param] || 0}
                          </p>
                          <p>{getInterpretation(param, correlations?.[param] || 0)}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <AnomalyAlert data={pollutionData || []} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
