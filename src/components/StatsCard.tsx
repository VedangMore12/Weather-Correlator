import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: number; // correlation value
  actualValue?: number; // actual temperature/humidity etc.
  unit?: string; // e.g. °C, %, hPa
  icon: ReactNode;
}

export const StatsCard = ({ title, value, actualValue, unit, icon }: StatsCardProps) => {
  const getCorrelationStrength = (val: number) => {
    const abs = Math.abs(val);
    if (abs > 0.7) return "Strong";
    if (abs > 0.4) return "Moderate";
    return "Weak";
  };

  const getCorrelationColor = (val: number) => {
    const abs = Math.abs(val);
    if (abs > 0.7) return "text-red-500";
    if (abs > 0.4) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>

      {/* Correlation Value */}
      <div className="space-y-1">
        <p className={`text-2xl font-bold ${getCorrelationColor(value)}`}>
          {value.toFixed(3)}
        </p>
        <p className="text-xs text-muted-foreground">
          {getCorrelationStrength(value)} correlation
        </p>
      </div>

      {/* Actual current value */}
      {actualValue !== undefined && (
        <div className="mt-2 text-sm text-foreground">
          Current: <span className="font-semibold">{actualValue.toFixed(1)} {unit}</span>
        </div>
      )}
    </Card>
  );
};
