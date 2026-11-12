import { Card } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";
import { computeLinearRegression } from "@/utils/regression";

interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
}

interface PollutionData {
  timestamp: string;
  pm25: number;
}

interface CorrelationChartProps {
  weatherData: WeatherData[];
  pollutionData: PollutionData[];
  parameter: "temperature" | "humidity" | "pressure" | "windSpeed";
}

export const CorrelationChart = ({
  weatherData,
  pollutionData,
  parameter,
}: CorrelationChartProps) => {
  const pollutionByTimestamp = new Map(pollutionData.map((item) => [item.timestamp, item.pm25]));
  const mergedData = weatherData.flatMap((weather) => {
    const pm25 = pollutionByTimestamp.get(weather.timestamp);
    return pm25 === undefined ? [] : [{ x: weather[parameter], y: pm25 }];
  });
  if (!mergedData.length) return null;

  // Readable labels for axes and legend
  const parameterLabels: Record<string, string> = {
    temperature: "Temperature (°C)",
    humidity: "Humidity (%)",
    pressure: "Pressure (hPa)",
    windSpeed: "Wind Speed (m/s)",
  };

  // Compute regression line
  const xValues = mergedData.map((d) => d.x);
  const yValues = mergedData.map((d) => d.y);
  const { slope, intercept } = computeLinearRegression(xValues, yValues);

  // Generate regression line
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const regressionLine = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {parameterLabels[parameter]} vs PM2.5 (matched observations)
      </h3>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
  <ScatterChart>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis type="number" dataKey="x" name={parameterLabels[parameter]} />
    <YAxis type="number" dataKey="y" name="PM2.5 (μg/m³)" />
    <Tooltip />
    <Legend />

    {/* Actual data points */}
    <Scatter name="Actual Data" data={mergedData} fill="#3b82f6" />

    {/* In-sample regression line; it is not a future forecast. */}
    <Line
      type="monotone"
      data={regressionLine}
      dataKey="y"
      stroke="#ef4444"
      strokeWidth={2}
      dot={false}
      name="Prediction Line"
    />
  </ScatterChart>
</ResponsiveContainer>


      <p className="text-sm text-muted-foreground mt-3">
        The fitted line summarizes these historical observations; it is not a future PM2.5
        forecast.
      </p>
    </Card>
  );
};
