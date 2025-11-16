// src/utils/correlation.ts

/**
 * Parallelized Pearson correlation and trend calculations
 * using an inline Web Worker (no extra files needed)
 */
export const calculateCorrelation = async (x: number[], y: number[]): Promise<number> => {
  if (x.length !== y.length || x.length === 0) return 0;

  // Inline worker code as a string
  const workerCode = `
    self.onmessage = function(e) {
      const { x, y } = e.data;
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
      const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
      const sumY2 = y.reduce((s, yi) => s + yi * yi, 0);
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
      );
      const result = denominator === 0 ? 0 : Number((numerator / denominator).toFixed(3));
      self.postMessage(result);
    };
  `;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  return new Promise<number>((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({ x, y });
  });
};

/**
 * Parallelized linear regression slope calculation
 */
export const calculateTrendSlope = async (x: number[], y: number[]): Promise<number> => {
  if (x.length !== y.length || x.length === 0) return 0;

  const workerCode = `
    self.onmessage = function(e) {
      const { x, y } = e.data;
      const n = x.length;
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      const num = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
      const den = x.reduce((s, xi) => s + Math.pow(xi - meanX, 2), 0);
      const result = den === 0 ? 0 : Number((num / den).toFixed(3));
      self.postMessage(result);
    };
  `;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  return new Promise<number>((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({ x, y });
  });
};

/**
 * Correlation label (not parallel since it’s instant)
 */
export const correlationLabel = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 0.7) return "Strong correlation";
  if (abs >= 0.4) return "Moderate correlation";
  if (abs >= 0.2) return "Weak correlation";
  return "Negligible correlation";
};
