// src/components/SeasonalComparison.tsx
import { Card } from "@/components/ui/card";

interface SeasonalComparisonProps {
  weatherData: Array<{
    timestamp: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
  }>;
  pollutionData: Array<{ timestamp: string; pm25: number }>;
  timezone: string;
}

interface SeasonalPoint {
  month: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  pm25: number;
}

export const SeasonalComparison = ({ weatherData, pollutionData, timezone }: SeasonalComparisonProps) => {
  const pollutionByTimestamp = new Map(pollutionData.map((item) => [item.timestamp, item.pm25]));
  const data: SeasonalPoint[] = weatherData.flatMap((weather) => {
    const pm25 = pollutionByTimestamp.get(weather.timestamp);
    if (pm25 === undefined) return [];
    return [{
      month: Number(new Date(weather.timestamp).toLocaleString("en-US", { timeZone: timezone, month: "numeric" })),
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      pressure: weather.pressure,
      pm25,
    }];
  });
  if (!data.length) return null;

  const getSeason = (month: number) => {
    if ([12, 1, 2].includes(month)) return "Winter";
    if ([3, 4, 5].includes(month)) return "Summer";
    if ([6, 7, 8, 9].includes(month)) return "Monsoon";
    return "Autumn";
  };

  const grouped = data.reduce<Record<string, SeasonalPoint[]>>((acc, d) => {
    const season = getSeason(d.month);
    if (!acc[season]) acc[season] = [];
    acc[season].push(d);
    return acc;
  }, {});

  const avg = (arr: SeasonalPoint[], key: keyof SeasonalPoint) =>
    arr.length ? arr.reduce((sum, row) => sum + row[key], 0) / arr.length : 0;

  const seasonalStats = Object.entries(grouped).map(([season, arr]) => ({
    season,
    avgPM: avg(arr, "pm25").toFixed(2),
    avgTemp: avg(arr, "temperature").toFixed(2),
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Seasonal Comparison</h3>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-muted text-left">
            <th className="p-2">Season</th>
            <th className="p-2">Avg Temperature (°C)</th>
            <th className="p-2">Avg PM2.5</th>
          </tr>
        </thead>
        <tbody>
          {seasonalStats.map((s) => (
            <tr key={s.season} className="border-t">
              <td className="p-2">{s.season}</td>
              <td className="p-2">{s.avgTemp}</td>
              <td className="p-2">{s.avgPM}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};
