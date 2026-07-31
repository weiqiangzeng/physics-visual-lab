(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FreeFallMeasurementModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      gravityMs2: clamp(input.gravityMs2 ?? 9.8, 1.6, 12),
      heightM: clamp(input.heightM ?? 2.4, .8, 5),
      sampleCount: Math.round(clamp(input.sampleCount ?? 7, 5, 10)),
      strobeIntervalS: clamp(input.strobeIntervalS ?? .08, .03, .18),
      timeResolutionMs: clamp(input.timeResolutionMs ?? .1, .001, 10),
      positionNoiseMm: clamp(input.positionNoiseMm ?? .5, 0, 10),
      repeats: Math.round(clamp(input.repeats ?? 30, 5, 100)),
      seed: Math.max(1, Math.round(input.seed ?? 23)),
    };
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function gaussian(random) {
    const u = Math.max(1e-12, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  }

  const quantize = (value, step) => Math.round(value / step) * step;

  function linearFit(points) {
    const n = points.length;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
    const xx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const xy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    const slope = xy / xx;
    const intercept = meanY - slope * meanX;
    const residuals = points.map((point) => point.y - (intercept + slope * point.x));
    const ssResidual = residuals.reduce((sum, value) => sum + value ** 2, 0);
    const ssTotal = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    return {
      slope,
      intercept,
      residuals,
      rmsResidual: Math.sqrt(ssResidual / n),
      rSquared: ssTotal > 0 ? 1 - ssResidual / ssTotal : 1,
    };
  }

  function gateMeasurement(input = {}, replicate = 0) {
    const state = normalize(input);
    const random = seeded(state.seed + replicate * 104729);
    const timeStepS = state.timeResolutionMs / 1000;
    const positionSigmaM = state.positionNoiseMm / 1000;
    const data = Array.from({ length: state.sampleCount }, (_, index) => {
      const fraction = (index + 1) / state.sampleCount;
      const trueDistanceM = state.heightM * fraction;
      const trueTimeS = Math.sqrt(2 * trueDistanceM / state.gravityMs2);
      const measuredDistanceM = Math.max(0, trueDistanceM + gaussian(random) * positionSigmaM);
      const timerJitterS = gaussian(random) * timeStepS / Math.sqrt(12);
      const measuredTimeS = Math.max(timeStepS, quantize(trueTimeS + timerJitterS, timeStepS));
      return {
        index: index + 1,
        trueDistanceM,
        trueTimeS,
        measuredDistanceM,
        measuredTimeS,
        timeSquaredS2: measuredTimeS ** 2,
      };
    });
    const fit = linearFit(data.map((point) => ({ x: point.timeSquaredS2, y: point.measuredDistanceM })));
    const estimatedGravityMs2 = 2 * fit.slope;
    return {
      ...state,
      data,
      fit,
      estimatedGravityMs2,
      absoluteErrorMs2: estimatedGravityMs2 - state.gravityMs2,
      relativeError: (estimatedGravityMs2 - state.gravityMs2) / state.gravityMs2,
      impactTimeS: Math.sqrt(2 * state.heightM / state.gravityMs2),
    };
  }

  function strobeMeasurement(input = {}, replicate = 0) {
    const state = normalize(input);
    const random = seeded(state.seed + replicate * 130363 + 17);
    const positionSigmaM = state.positionNoiseMm / 1000;
    const impactTimeS = Math.sqrt(2 * state.heightM / state.gravityMs2);
    const requested = state.strobeIntervalS;
    const maximum = impactTimeS * .92 / (state.sampleCount - 1);
    const intervalS = Math.min(requested, maximum);
    const clippedInterval = intervalS < requested - 1e-12;
    const data = Array.from({ length: state.sampleCount }, (_, index) => {
      const timeS = index * intervalS;
      const trueDistanceM = .5 * state.gravityMs2 * timeS ** 2;
      return {
        index,
        timeS,
        trueDistanceM,
        measuredDistanceM: Math.max(0, trueDistanceM + gaussian(random) * positionSigmaM),
      };
    });
    const secondDifferences = data.slice(0, -2).map((point, index) => {
      const delta2M = data[index + 2].measuredDistanceM - 2 * data[index + 1].measuredDistanceM + point.measuredDistanceM;
      return { index: index + 1, delta2M, gravityMs2: delta2M / intervalS ** 2 };
    });
    const estimatedGravityMs2 = secondDifferences.reduce((sum, item) => sum + item.gravityMs2, 0) / secondDifferences.length;
    return {
      ...state,
      intervalS,
      clippedInterval,
      impactTimeS,
      data,
      secondDifferences,
      idealSecondDifferenceM: state.gravityMs2 * intervalS ** 2,
      estimatedGravityMs2,
      relativeError: (estimatedGravityMs2 - state.gravityMs2) / state.gravityMs2,
    };
  }

  function repeatEstimates(input = {}) {
    const state = normalize(input);
    return Array.from({ length: state.repeats }, (_, index) => gateMeasurement(state, index).estimatedGravityMs2);
  }

  function uncertaintySummary(input = {}) {
    const state = normalize(input);
    const estimates = repeatEstimates(state);
    const mean = estimates.reduce((sum, value) => sum + value, 0) / estimates.length;
    const variance = estimates.length > 1
      ? estimates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (estimates.length - 1)
      : 0;
    const standardDeviation = Math.sqrt(variance);
    return {
      ...state,
      estimates,
      mean,
      standardDeviation,
      standardError: standardDeviation / Math.sqrt(estimates.length),
      bias: mean - state.gravityMs2,
      relativeBias: (mean - state.gravityMs2) / state.gravityMs2,
    };
  }

  function solve(input = {}) {
    const state = normalize(input);
    return {
      state,
      gate: gateMeasurement(state),
      strobe: strobeMeasurement(state),
      uncertainty: uncertaintySummary(state),
    };
  }

  return {
    clamp,
    normalize,
    linearFit,
    gateMeasurement,
    strobeMeasurement,
    repeatEstimates,
    uncertaintySummary,
    solve,
  };
});
