// src/utils/interpretation.ts

/**
 * Generate a human-readable interpretation for correlation values
 * between PM2.5 and each weather factor.
 */
export const interpretCorrelation = (attribute: string, value: number): string => {
  const abs = Math.abs(value);
  const direction = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

  let strength = "";
  if (abs >= 0.7) strength = "strong";
  else if (abs >= 0.4) strength = "moderate";
  else if (abs >= 0.2) strength = "weak";
  else strength = "very weak";

  let explanation = "";

  switch (attribute.toLowerCase()) {
    case "temperature":
      explanation =
        direction === "positive"
          ? "Higher temperatures tend to increase PM2.5 levels, possibly due to stagnant air or photochemical smog formation."
          : "Higher temperatures tend to reduce PM2.5 levels, likely due to better air circulation and pollutant dispersion.";
      break;

    case "humidity":
      explanation =
        direction === "positive"
          ? "Increased humidity correlates with higher PM2.5, as moisture can cause particles to clump and remain suspended."
          : "Higher humidity seems to reduce PM2.5, possibly because of rain or condensation removing particles from the air.";
      break;

    case "windspeed":
    case "wind speed":
      explanation =
        direction === "positive"
          ? "Higher wind speeds correlate with higher PM2.5, possibly due to dust resuspension."
          : "Higher wind speeds help disperse pollutants, lowering PM2.5 concentrations.";
      break;

    case "pressure":
      explanation =
        direction === "positive"
          ? "High pressure systems may trap pollutants near the ground, leading to higher PM2.5."
          : "Low pressure tends to promote air mixing and pollutant dispersion, lowering PM2.5 levels.";
      break;

    default:
      explanation = "Correlation direction indicates how this factor may influence PM2.5 concentration.";
  }

  return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation — ${explanation}`;
};

/**
 * Seasonal comparison generator
 * You can use this for showing how correlations shift across seasons
 */
export const seasonalComparison = (season: string): string => {
  switch (season.toLowerCase()) {
    case "winter":
      return "During winter, PM2.5 levels are often higher due to temperature inversion and limited dispersion.";
    case "summer":
      return "In summer, stronger winds and higher temperatures generally lower PM2.5 concentrations.";
    case "monsoon":
      return "Monsoon rains help reduce PM2.5 levels by washing out airborne particles.";
    case "autumn":
      return "Autumn may show moderate pollution spikes due to calm weather and post-monsoon dust.";
    default:
      return "Seasonal variations depend on local climatic and anthropogenic factors.";
  }
};
