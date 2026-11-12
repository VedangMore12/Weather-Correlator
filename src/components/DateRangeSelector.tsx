import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface DateRangeSelectorProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

const toLocalDateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const parseLocalDate = (value: string, endOfDay = false) => {
  const date = new Date(`${value}T00:00:00`);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
};

const earliestSelectableDate = (end: Date) => {
  const earliest = new Date(end);
  earliest.setDate(earliest.getDate() - 90);
  return earliest;
};

export const DateRangeSelector = ({ value, onChange }: DateRangeSelectorProps) => {
  const presets = [
    { label: "Current (Today)", type: "current" },
    { label: "Last 7 Days", type: "7d", days: 7 },
    { label: "Last 30 Days", type: "30d", days: 30 },
    { label: "Last 90 Days", type: "90d", days: 90 },
  ];

  const handlePresetClick = (preset: { type: string; days?: number }) => {
    const end = new Date();
    let start = new Date();

    if (preset.type === "current") {
      // Today only
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
    } else if (preset.days) {
      // Past N days
      start = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000);
    }

    onChange({ start, end });
  };

  return (
    <Card className="p-4 space-y-3">
      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Date Range
      </Label>

      {/* Preset Buttons */}
      <div className="space-y-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={preset.type === "current" ? "default" : "outline"}
            className="w-full"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Manual Date Inputs */}
      <div className="space-y-2 mt-4">
        <label className="block text-sm font-medium">Start Date</label>
        <input
          type="date"
          min={toLocalDateInput(earliestSelectableDate(value.end))}
          max={toLocalDateInput(value.end)}
          value={toLocalDateInput(value.start)}
          onChange={(e) =>
            onChange({ ...value, start: parseLocalDate(e.target.value) })
          }
          className="w-full border rounded-md p-2 text-sm"
        />

        <label className="block text-sm font-medium">End Date</label>
        <input
          type="date"
          max={toLocalDateInput(new Date())}
          min={toLocalDateInput(value.start)}
          value={toLocalDateInput(value.end)}
          onChange={(e) =>
            onChange({ ...value, end: parseLocalDate(e.target.value, true) })
          }
          className="w-full border rounded-md p-2 text-sm"
        />
      </div>
    </Card>
  );
};
