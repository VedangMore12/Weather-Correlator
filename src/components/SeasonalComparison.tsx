// src/components/SeasonalComparison.tsx
import { Card } from "@/components/ui/card";

interface SeasonalComparisonProps {
  weatherData: any[];
  pollutionData: any[];
}

export const SeasonalComparison = ({ weatherData, pollutionData }: SeasonalComparisonProps) => {
  if (!weatherData.length || !pollutionData.length) return null;

  const data = weatherData.map((w, i) => ({
    month: new Date(w.timestamp || w.date).getMonth() + 1,
    temperature: w.temperature,
    humidity: w.humidity,
    windSpeed: w.windSpeed,
    pressure: w.pressure,
    pm25: pollutionData[i]?.pm25 || 0,
  }));

  const getSeason = (month: number) => {
    if ([12, 1, 2].includes(month)) return "Winter";
    if ([3, 4, 5].includes(month)) return "Summer";
    if ([6, 7, 8, 9].includes(month)) return "Monsoon";
    return "Autumn";
  };

  const grouped = data.reduce((acc: any, d) => {
    const season = getSeason(d.month);
    if (!acc[season]) acc[season] = [];
    acc[season].push(d);
    return acc;
  }, {});

  const avg = (arr: any[], key: string) =>
    arr.length ? arr.reduce((sum, x) => sum + (x[key] || 0), 0) / arr.length : 0;

  const seasonalStats = Object.entries(grouped).map(([season, arr]: any) => ({
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
