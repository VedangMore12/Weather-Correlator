import { useQuery } from "@tanstack/react-query";

interface PollutionData {
  timestamp: string;
  pm25: number;
}

export const usePollutionData = (city: string, dateRange: { start: Date; end: Date }) => {
  return useQuery({
    queryKey: ['pollution', city, dateRange],
    queryFn: async (): Promise<PollutionData[]> => {
      // Generate mock data for demonstration
      // In production, replace with actual API calls to OpenAQ
      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
        const baseValue = 50 + Math.random() * 100;
        // Add correlation with temperature (inverse for demo)
        const tempEffect = -Math.sin(i / 7) * 30;
        // Random spikes (anomalies)
        const spike = Math.random() > 0.9 ? Math.random() * 100 : 0;
        
        return {
          timestamp: date.toISOString(),
          pm25: Math.max(0, baseValue + tempEffect + spike),
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
