// src/utils/regression.ts

// Simple linear regression (least squares)
export function computeLinearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  return { slope, intercept };
}
