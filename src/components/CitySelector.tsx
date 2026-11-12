import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/data/cities";

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
}

export const CitySelector = ({ value, onChange }: CitySelectorProps) => {
  return (
    <Card className="p-4">
      <Label htmlFor="city-select" className="text-sm font-medium mb-2 block">
        Select City
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="city-select">
          <SelectValue placeholder="Choose a city" />
        </SelectTrigger>
        <SelectContent>
          {CITIES.map(city => (
            <SelectItem key={city.id} value={city.id}>
              {city.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  );
};
