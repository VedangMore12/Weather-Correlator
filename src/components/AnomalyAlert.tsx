import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface PollutionData {
  timestamp: string;
  pm25: number;
}

interface AnomalyAlertProps {
  data: PollutionData[];
}

export const AnomalyAlert = ({ data }: AnomalyAlertProps) => {
  if (!data || data.length === 0) return null;

  const mean = data.reduce((sum, d) => sum + d.pm25, 0) / data.length;
  const stdDev = Math.sqrt(
    data.reduce((sum, d) => sum + Math.pow(d.pm25 - mean, 2), 0) / data.length
  );

  const anomalies = data.filter(d => Math.abs(d.pm25 - mean) > 2 * stdDev);

  if (anomalies.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Anomalies Detected</AlertTitle>
      <AlertDescription>
        Found {anomalies.length} unusual PM2.5 spike(s) that deviate significantly from the mean.
        These points are highlighted in red on the charts.
      </AlertDescription>
    </Alert>
  );
};
