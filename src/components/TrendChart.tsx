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
import { correlationLabel } from "@/utils/correlation";

interface TrendChartProps {
  weatherData: any[];
  pollutionData: any[];
  parameter: "temperature" | "humidity" | "pressure" | "windSpeed";
}

export const TrendChart = ({ weatherData, pollutionData, parameter }: TrendChartProps) => {
  if (!weatherData.length || !pollutionData.length) return null;

  // Merge data
  const data = weatherData.map((w, i) => ({
    date: new Date(w.timestamp || w.date).toLocaleDateString(),
    temperature: w.temperature,
    humidity: w.humidity,
    windSpeed: w.windSpeed,
    pressure: w.pressure,
    pm25: pollutionData[i]?.pm25 || 0,
  }));

  const attrValues = data.map((d) => d[parameter]);
  const pmValues = data.map((d) => d.pm25);

  // Parallel correlation calculation using Web Worker (inline)
  const [correlation, setCorrelation] = useState<number>(0);

  useEffect(() => {
    if (!attrValues.length || !pmValues.length) return;

    // Create a small inline worker script as a Blob
    const workerCode = `
      self.onmessage = function(e) {
        const { arr1, arr2 } = e.data;
        const n = arr1.length;
        const mean1 = arr1.reduce((a,b) => a+b,0) / n;
        const mean2 = arr2.reduce((a,b) => a+b,0) / n;
        let num = 0, den1 = 0, den2 = 0;
        for (let i = 0; i < n; i++) {
          const d1 = arr1[i] - mean1;
          const d2 = arr2[i] - mean2;
          num += d1 * d2;
          den1 += d1 * d1;
          den2 += d2 * d2;
        }
        const corr = num / Math.sqrt(den1 * den2);
        postMessage(corr);
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      setCorrelation(e.data);
      worker.terminate();
    };

    worker.postMessage({ arr1: attrValues, arr2: pmValues });

    return () => worker.terminate();
  }, [attrValues, pmValues]);

  const correlationText = useMemo(() => correlationLabel(correlation), [correlation]);

  const interpretation = useMemo(() => {
    const attr = parameter.toLowerCase();
    if (correlation > 0.5)
      return `${correlationText}: Higher ${attr} tends to increase PM2.5 levels — positive influence.`;
    else if (correlation < -0.5)
      return `${correlationText}: Higher ${attr} is linked with reduced PM2.5 — dispersal or cleaning effect.`;
    else
      return `${correlationText}: Weak correlation — ${attr} doesn’t strongly affect PM2.5 levels.`;
  }, [parameter, correlation, correlationText]);

  // Seasonal averages
  const seasonalComparison = useMemo(() => {
    const seasons = {
      Winter: data.filter((d) => ["12", "1", "2"].includes(new Date(d.date).getMonth().toString())),
      Summer: data.filter((d) => ["4", "5", "6"].includes(new Date(d.date).getMonth().toString())),
      Monsoon: data.filter((d) => ["7", "8", "9"].includes(new Date(d.date).getMonth().toString())),
      PostMonsoon: data.filter((d) => ["10", "11"].includes(new Date(d.date).getMonth().toString())),
    };

    const avg = (arr: any[], key: string) =>
      arr.length ? arr.reduce((sum, x) => sum + (x[key] || 0), 0) / arr.length : 0;

    return Object.entries(seasons).map(([season, records]) => ({
      season,
      avgAttr: avg(records, parameter).toFixed(2),
      avgPM: avg(records, "pm25").toFixed(2),
    }));
  }, [data, parameter]);

  const parameterLabels: Record<string, string> = {
    temperature: "Temperature (°C)",
    humidity: "Humidity (%)",
    pressure: "Pressure (hPa)",
    windSpeed: "Wind Speed (m/s)",
  };

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
