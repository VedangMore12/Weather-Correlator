import { useQuery } from "@tanstack/react-query";
import type { ObservationsResponse } from "@/types/observations";

export const useObservations = (
  city: string,
  dateRange: { start: Date; end: Date }
) => {
  return useQuery({
    queryKey: ["observations", city, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<ObservationsResponse> => {
      const params = new URLSearchParams({
        city,
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });
      const response = await fetch(`/api/observations?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || `Could not load observations (${response.status}).`);
      }
      return body as ObservationsResponse;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
