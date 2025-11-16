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
  if (!weatherData.length || !pollutionData.length) return null;

  // Merge datasets by index
  const mergedData = weatherData.map((w, i) => ({
    x: w[parameter],
    y: pollutionData[i]?.pm25 || 0,
  }));

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

  // Predicted PM2.5 at latest weather value
  const latestX = xValues[xValues.length - 1];
  const predictedY = slope * latestX + intercept;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {parameterLabels[parameter]} vs PM2.5 Correlation
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

    {/* Regression (Prediction) line */}
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


      {/* Predicted Value Display */}
      <p className="text-sm text-muted-foreground mt-3">
        Predicted PM2.5 at current {parameterLabels[parameter].toLowerCase()}:{" "}
        <span className="font-semibold text-primary">
          {predictedY.toFixed(2)} μg/m³
        </span>
      </p>
    </Card>
  );
};
