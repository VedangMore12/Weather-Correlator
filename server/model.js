const FEATURE_NAMES = [
  "temperature",
  "humidity",
  "windSpeed",
  "pressure",
  "precipitation",
  "previousPm25",
  "hourSin",
  "hourCos",
];

const featuresFor = (weather, previousPm25, timestamp) => {
  const date = new Date(timestamp);
  const hour = (date.getUTCHours() + date.getUTCMinutes() / 60) * (2 * Math.PI / 24);
  return [
    weather.temperature,
    weather.humidity,
    weather.windSpeed,
    weather.pressure,
    weather.precipitation,
    previousPm25,
    Math.sin(hour),
    Math.cos(hour),
  ];
};

const solve = (matrix, vector) => {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      throw new Error("Unable to fit the regression model because the feature matrix is singular.");
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let j = column; j <= size; j += 1) augmented[column][j] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let j = column; j <= size; j += 1) {
        augmented[row][j] -= factor * augmented[column][j];
      }
    }
  }
  return augmented.map((row) => row[size]);
};

const fitRidge = (rows, alpha = 1) => {
  if (!rows.length) throw new Error("At least one training row is required.");
  const means = FEATURE_NAMES.map((_, column) =>
    rows.reduce((sum, row) => sum + row.features[column], 0) / rows.length
  );
  const scales = FEATURE_NAMES.map((_, column) => {
    const variance = rows.reduce(
      (sum, row) => sum + (row.features[column] - means[column]) ** 2,
      0
    ) / rows.length;
    return Math.sqrt(variance) || 1;
  });
  const dimension = FEATURE_NAMES.length + 1;
  const matrix = Array.from({ length: dimension }, () => Array(dimension).fill(0));
  const vector = Array(dimension).fill(0);

  for (const row of rows) {
    const values = [1, ...row.features.map((value, i) => (value - means[i]) / scales[i])];
    for (let i = 0; i < dimension; i += 1) {
      vector[i] += values[i] * row.target;
      for (let j = 0; j < dimension; j += 1) matrix[i][j] += values[i] * values[j];
    }
  }
  for (let i = 1; i < dimension; i += 1) matrix[i][i] += alpha;

  const coefficients = solve(matrix, vector);
  return {
    predict(features) {
      const standardized = [1, ...features.map((value, i) => (value - means[i]) / scales[i])];
      return Math.max(0, standardized.reduce((sum, value, i) => sum + value * coefficients[i], 0));
    },
  };
};

const metrics = (rows, model) => {
  const errors = rows.map((row) => ({
    model: model.predict(row.features) - row.target,
    persistence: row.features[5] - row.target,
  }));
  return {
    mae: errors.reduce((sum, item) => sum + Math.abs(item.model), 0) / errors.length,
    rmse: Math.sqrt(errors.reduce((sum, item) => sum + item.model ** 2, 0) / errors.length),
    persistenceMae:
      errors.reduce((sum, item) => sum + Math.abs(item.persistence), 0) / errors.length,
  };
};

export const buildTrainingRows = (observations) => {
  const byTimestamp = new Map(observations.map((row) => [row.timestamp, row]));
  const rows = [];
  for (const row of observations) {
    const previousTimestamp = new Date(new Date(row.timestamp).getTime() - 60 * 60 * 1000).toISOString();
    const previous = byTimestamp.get(previousTimestamp);
    if (!previous) continue;
    rows.push({
      timestamp: row.timestamp,
      features: featuresFor(row, previous.pm25, row.timestamp),
      target: row.pm25,
    });
  }
  return rows;
};

export const trainAndPredict = (observations, forecastWeather) => {
  const latest = observations.at(-1);
  const persistenceForecast = latest
    ? {
        timestamp: new Date(new Date(latest.timestamp).getTime() + 60 * 60 * 1000).toISOString(),
        predictedPm25: Number(latest.pm25.toFixed(2)),
        horizon: "1 hour",
        model: "Persistence baseline",
      }
    : null;
  const rows = buildTrainingRows(observations);
  if (rows.length < 48) {
    return {
      forecast: null,
      persistenceForecast,
      message: `At least 48 consecutive hourly training examples are required; found ${rows.length}.`,
    };
  }

  const splitIndex = Math.floor(rows.length * 0.8);
  const training = rows.slice(0, splitIndex);
  const validation = rows.slice(splitIndex);
  const validationModel = fitRidge(training);
  const validationMetrics = metrics(validation, validationModel);

  if (validationMetrics.mae >= validationMetrics.persistenceMae) {
    return {
      forecast: null,
      persistenceForecast,
      message: "The model did not outperform the persistence baseline on the chronological holdout.",
      evaluation: {
        mae: Number(validationMetrics.mae.toFixed(2)),
        rmse: Number(validationMetrics.rmse.toFixed(2)),
        persistenceMae: Number(validationMetrics.persistenceMae.toFixed(2)),
        validationSamples: validation.length,
        trainingSamples: training.length,
      },
    };
  }

  const nextTimestamp = persistenceForecast.timestamp;
  const nextWeather = forecastWeather.find((item) => item.timestamp === nextTimestamp);
  if (!nextWeather) {
    return {
      forecast: null,
      persistenceForecast,
      message: "Weather forecast data is unavailable for the next hour.",
      evaluation: {
        mae: Number(validationMetrics.mae.toFixed(2)),
        rmse: Number(validationMetrics.rmse.toFixed(2)),
        persistenceMae: Number(validationMetrics.persistenceMae.toFixed(2)),
        validationSamples: validation.length,
        trainingSamples: training.length,
      },
    };
  }

  const finalModel = fitRidge(rows);
  const predictedPm25 = finalModel.predict(featuresFor(nextWeather, latest.pm25, nextTimestamp));
  return {
    forecast: {
      timestamp: nextTimestamp,
      predictedPm25: Number(predictedPm25.toFixed(2)),
      horizon: "1 hour",
      model: "Ridge regression",
      evaluation: {
        mae: Number(validationMetrics.mae.toFixed(2)),
        rmse: Number(validationMetrics.rmse.toFixed(2)),
        persistenceMae: Number(validationMetrics.persistenceMae.toFixed(2)),
        validationSamples: validation.length,
        trainingSamples: training.length,
      },
    },
    persistenceForecast,
    message: null,
  };
};

export { FEATURE_NAMES };
