import { useQuery } from "@tanstack/react-query";

interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
}

export const useWeatherData = (city: string, dateRange: { start: Date; end: Date }) => {
  return useQuery({
    queryKey: ['weather', city, dateRange],
    queryFn: async (): Promise<WeatherData[]> => {
      // Generate mock data for demonstration
      // In production, replace with actual API calls to OpenWeatherMap
      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
        return {
          timestamp: date.toISOString(),
          temperature: 15 + Math.random() * 20 + Math.sin(i / 7) * 10,
          humidity: 40 + Math.random() * 40,
          windSpeed: 2 + Math.random() * 8,
          pressure: 1010 + Math.random() * 20,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
