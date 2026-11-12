export interface Observation {
  timestamp: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  precipitation: number;
  pm25: number;
}

export interface PredictionEvaluation {
  mae: number;
  rmse: number;
  persistenceMae: number;
  validationSamples: number;
  trainingSamples: number;
}

export interface NextHourForecast {
  timestamp: string;
  predictedPm25: number;
  horizon: string;
  model: string;
}

export interface ObservationsResponse {
  city: string;
  timezone: string;
  observations: Observation[];
  matchedHours: number;
  sources: {
    weather: string;
    pollution: string;
    station: {
      locationName: string;
      distanceKm: number;
      provider: string;
      unit: string;
    };
    weatherAttribution: string;
  };
  prediction: (NextHourForecast & {
    evaluation: PredictionEvaluation;
  }) | null;
  persistenceForecast: NextHourForecast | null;
  predictionMessage: string | null;
  evaluation: PredictionEvaluation | null;
}
