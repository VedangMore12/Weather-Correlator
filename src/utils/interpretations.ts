// src/utils/interpretation.ts

/**
 * Describe the direction and strength of an observed association.
 */
export const interpretCorrelation = (attribute: string, value: number): string => {
  const abs = Math.abs(value);
  const direction = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

  let strength = "";
  if (abs >= 0.7) strength = "strong";
  else if (abs >= 0.4) strength = "moderate";
  else if (abs >= 0.2) strength = "weak";
  else strength = "very weak";

  return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation between ${attribute} and PM2.5 in this sample; correlation does not establish causation.`;
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
