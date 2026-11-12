import test from "node:test";
import assert from "node:assert/strict";
import { buildTrainingRows, trainAndPredict } from "./model.js";

const createObservations = (count) =>
  Array.from({ length: count }, (_, index) => {
    const timestamp = new Date(Date.UTC(2025, 0, 1, index)).toISOString();
    const temperature = 10 + ((index * 17) % 31);
    const humidity = 30 + ((index * 13) % 61);
    const windSpeed = 1 + ((index * 7) % 15);
    const pressure = 990 + ((index * 11) % 41);
    const precipitation = (index % 5) * 0.2;
    const pm25 = 20 + temperature * 1.7 + humidity * 0.1 + windSpeed * 0.4 + (index % 3);
    return { timestamp, temperature, humidity, windSpeed, pressure, precipitation, pm25 };
  });

test("training rows require the exact previous UTC hour", () => {
  const observations = createObservations(4);
  assert.equal(buildTrainingRows(observations).length, 3);
  assert.equal(buildTrainingRows([observations[0], observations[2]]).length, 0);
});

test("model evaluates chronologically and only predicts when it beats persistence", () => {
  const observations = createObservations(240);
  const nextTimestamp = new Date(
    new Date(observations.at(-1).timestamp).getTime() + 60 * 60 * 1000
  ).toISOString();
  const result = trainAndPredict(observations, [
    { ...observations.at(-1), timestamp: nextTimestamp },
  ]);

  assert.ok(result.forecast);
  assert.ok(result.forecast.evaluation.validationSamples > 0);
  assert.ok(result.forecast.evaluation.mae < result.forecast.evaluation.persistenceMae);
  assert.ok(Number.isFinite(result.forecast.predictedPm25));
  assert.equal(result.persistenceForecast.predictedPm25, observations.at(-1).pm25);
  assert.equal(result.persistenceForecast.timestamp, nextTimestamp);
});

test("model declines to predict when there are too few hourly examples", () => {
  const result = trainAndPredict(createObservations(24), []);
  assert.equal(result.forecast, null);
  assert.equal(result.persistenceForecast.predictedPm25, createObservations(24).at(-1).pm25);
  assert.match(result.message, /At least 48/);
});

test("model does not publish a forecast when it fails to beat persistence", () => {
  const observations = createObservations(100).map((row) => ({
    ...row,
    temperature: 20,
    humidity: 50,
    windSpeed: 2,
    pressure: 1013,
    precipitation: 0,
    pm25: 35,
  }));
  const result = trainAndPredict(observations, []);

  assert.equal(result.forecast, null);
  assert.equal(result.persistenceForecast.predictedPm25, 35);
  assert.match(result.message, /did not outperform/);
  assert.equal(result.evaluation.mae, 0);
  assert.equal(result.evaluation.persistenceMae, 0);
});
