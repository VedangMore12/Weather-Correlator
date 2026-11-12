// File: src/components/TrendChart.tsx

import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { calculateCorrelation, correlationLabel } from "@/utils/correlation";

interface TrendChartProps {
  weatherData: Array<{
    timestamp: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
  }>;
  pollutionData: Array<{ timestamp: string; pm25: number }>;
  parameter: "temperature" | "humidity" | "pressure" | "windSpeed";
  timezone: string;
}

interface TrendPoint {
  timestamp: string;
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  pm25: number;
}

export const TrendChart = ({ weatherData, pollutionData, parameter, timezone }: TrendChartProps) => {
  const data = useMemo(() => {
    const pollutionByTimestamp = new Map(
      pollutionData.map((item) => [item.timestamp, item.pm25])
    );
    return weatherData.flatMap((weather) => {
      const pm25 = pollutionByTimestamp.get(weather.timestamp);
      if (pm25 === undefined) return [];
      return [{
        timestamp: weather.timestamp,
        date: new Date(weather.timestamp).toLocaleString(undefined, { timeZone: timezone }),
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        pressure: weather.pressure,
        pm25,
      }];
    });
  }, [weatherData, pollutionData, timezone]);
  const attrValues = useMemo(() => data.map((row) => row[parameter]), [data, parameter]);
  const pmValues = useMemo(() => data.map((row) => row.pm25), [data]);
  const [correlation, setCorrelation] = useState<number>(0);

  useEffect(() => {
    let active = true;
    if (!attrValues.length) {
      setCorrelation(0);
      return () => {
        active = false;
      };
    }
    calculateCorrelation(attrValues, pmValues).then((value) => {
      if (active) setCorrelation(value);
    });
    return () => {
      active = false;
    };
  }, [attrValues, pmValues]);

  const correlationText = useMemo(() => correlationLabel(correlation), [correlation]);

  const interpretation = useMemo(() => {
    const attr = parameter.toLowerCase();
    if (correlation > 0.5)
      return `${correlationText}: Higher ${attr} is associated with higher PM2.5 in this dataset. This does not establish causation.`;
    else if (correlation < -0.5)
      return `${correlationText}: Higher ${attr} is associated with lower PM2.5 in this dataset. This does not establish causation.`;
    else
      return `${correlationText}: ${attr} has little linear association with PM2.5 in this dataset.`;
  }, [parameter, correlation, correlationText]);

  // Seasonal averages
  const seasonalComparison = useMemo(() => {
    const seasons = {
      Winter: data.filter((d) => [12, 1, 2].includes(Number(new Date(d.timestamp).toLocaleString("en-US", { timeZone: timezone, month: "numeric" })))),
      Summer: data.filter((d) => [4, 5, 6].includes(Number(new Date(d.timestamp).toLocaleString("en-US", { timeZone: timezone, month: "numeric" })))),
      Monsoon: data.filter((d) => [7, 8, 9].includes(Number(new Date(d.timestamp).toLocaleString("en-US", { timeZone: timezone, month: "numeric" })))),
      PostMonsoon: data.filter((d) => [10, 11].includes(Number(new Date(d.timestamp).toLocaleString("en-US", { timeZone: timezone, month: "numeric" })))),
    };

    const avg = (arr: TrendPoint[], key: keyof TrendPoint) =>
      arr.length
        ? arr.reduce((sum, row) => sum + (typeof row[key] === "number" ? row[key] : 0), 0) /
          arr.length
        : 0;

    return Object.entries(seasons).map(([season, records]) => ({
      season,
      avgAttr: avg(records, parameter).toFixed(2),
      avgPM: avg(records, "pm25").toFixed(2),
    }));
  }, [data, parameter, timezone]);

  const parameterLabels: Record<string, string> = {
    temperature: "Temperature (°C)",
    humidity: "Humidity (%)",
    pressure: "Pressure (hPa)",
    windSpeed: "Wind Speed (m/s)",
  };

  if (!data.length) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">
        PM2.5 vs {parameterLabels[parameter]}
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" orientation="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={parameter}
            stroke="#3b82f6"
            strokeWidth={2}
            name={parameterLabels[parameter]}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pm25"
            stroke="#ef4444"
            strokeWidth={2}
            name="PM2.5 (µg/m³)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Interpretation</h3>
        <p className="text-muted-foreground">
          Correlation: <strong>{correlation.toFixed(3)}</strong> → {interpretation}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Seasonal Comparison</h3>
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="p-2">Season</th>
              <th className="p-2 capitalize">{parameterLabels[parameter]} Avg</th>
              <th className="p-2">PM2.5 Avg (µg/m³)</th>
            </tr>
          </thead>
          <tbody>
            {seasonalComparison.map((s) => (
              <tr key={s.season} className="border-t">
                <td className="p-2">{s.season}</td>
                <td className="p-2">{s.avgAttr}</td>
                <td className="p-2">{s.avgPM}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
