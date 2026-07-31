(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HookeMeasurementModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      springConstantNm: clamp(input.springConstantNm ?? 40, 10, 100),
      naturalLengthCm: clamp(input.naturalLengthCm ?? 12, 5, 25),
      massStepG: clamp(input.massStepG ?? 50, 10, 100),
      gravityMs2: clamp(input.gravityMs2 ?? 9.8, 1.6, 12),
      pointCount: Math.round(clamp(input.pointCount ?? 8, 5, 10)),
      loadIndex: Math.round(clamp(input.loadIndex ?? 5, 0, 9)),
      elasticLimitN: clamp(input.elasticLimitN ?? 3.2, .5, 8),
      postYieldRatio: clamp(input.postYieldRatio ?? .3, .15, .8),
      rulerResolutionMm: clamp(input.rulerResolutionMm ?? .5, .1, 2),
      readingNoiseMm: clamp(input.readingNoiseMm ?? .3, 0, 2),
      zeroErrorMm: clamp(input.zeroErrorMm ?? .6, -3, 3),
      seed: Math.max(1, Math.round(input.seed ?? 31)),
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

  function forceForIndex(index, input = {}) {
    const state = normalize(input);
    return clamp(index, 0, state.pointCount - 1) * state.massStepG / 1000 * state.gravityMs2;
  }

  function loadingExtension(forceN, input = {}) {
    const state = normalize(input);
    const force = Math.max(0, Number(forceN));
    if (force <= state.elasticLimitN) return force / state.springConstantNm;
    const atLimit = state.elasticLimitN / state.springConstantNm;
    return atLimit + (force - state.elasticLimitN) / (state.springConstantNm * state.postYieldRatio);
  }

  function maximumState(input = {}) {
    const state = normalize(input);
    const maximumForceN = forceForIndex(state.pointCount - 1, state);
    const maximumExtensionM = loadingExtension(maximumForceN, state);
    const permanentSetM = Math.max(0, maximumExtensionM - maximumForceN / state.springConstantNm);
    return { ...state, maximumForceN, maximumExtensionM, permanentSetM, overloaded: maximumForceN > state.elasticLimitN };
  }

  function unloadingExtension(forceN, input = {}) {
    const maximum = maximumState(input);
    const force = clamp(forceN, 0, maximum.maximumForceN);
    return Math.max(0, force / maximum.springConstantNm + maximum.permanentSetM);
  }

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
    return { slope, intercept, residuals, rmsResidual: Math.sqrt(ssResidual / n), rSquared: ssTotal > 0 ? 1 - ssResidual / ssTotal : 1 };
  }

  function experiment(input = {}) {
    const state = normalize(input);
    state.loadIndex = Math.min(state.loadIndex, state.pointCount - 1);
    const random = seeded(state.seed);
    const naturalTrueMm = state.naturalLengthCm * 10;
    const naturalReadingMm = quantize(
      naturalTrueMm + state.zeroErrorMm + gaussian(random) * state.readingNoiseMm,
      state.rulerResolutionMm,
    );
    const data = Array.from({ length: state.pointCount }, (_, index) => {
      const forceN = forceForIndex(index, state);
      const trueExtensionM = loadingExtension(forceN, state);
      const trueLengthMm = naturalTrueMm + trueExtensionM * 1000;
      const readingMm = quantize(
        trueLengthMm + state.zeroErrorMm + gaussian(random) * state.readingNoiseMm,
        state.rulerResolutionMm,
      );
      const measuredExtensionM = (readingMm - naturalReadingMm) / 1000;
      return {
        index,
        massG: index * state.massStepG,
        forceN,
        trueExtensionM,
        trueLengthMm,
        readingMm,
        measuredExtensionM,
        withinElasticLimit: forceN <= state.elasticLimitN + 1e-12,
      };
    });
    const validData = data.filter((point) => point.withinElasticLimit);
    const fit = linearFit(validData.map((point) => ({ x: point.measuredExtensionM, y: point.forceN })));
    const allFit = linearFit(data.map((point) => ({ x: point.measuredExtensionM, y: point.forceN })));
    const current = data[state.loadIndex];
    const maximum = maximumState(state);
    return {
      ...state,
      naturalTrueMm,
      naturalReadingMm,
      data,
      validData,
      fit,
      allFit,
      estimatedSpringConstantNm: fit.slope,
      relativeError: (fit.slope - state.springConstantNm) / state.springConstantNm,
      current,
      maximum,
      zeroErrorCancellationResidualMm: (current.readingMm - naturalReadingMm) - current.measuredExtensionM * 1000,
    };
  }

  function hysteresis(input = {}, count = 100) {
    const maximum = maximumState(input);
    const loading = Array.from({ length: count }, (_, index) => {
      const forceN = maximum.maximumForceN * index / (count - 1);
      return { forceN, extensionM: loadingExtension(forceN, maximum) };
    });
    const unloading = Array.from({ length: count }, (_, index) => {
      const forceN = maximum.maximumForceN * (1 - index / (count - 1));
      return { forceN, extensionM: unloadingExtension(forceN, maximum) };
    });
    let loopAreaJ = 0;
    for (let index = 1; index < loading.length; index += 1) {
      const left = loading[index - 1];
      const right = loading[index];
      loopAreaJ += .5 * (left.forceN + right.forceN) * (right.extensionM - left.extensionM);
    }
    for (let index = 1; index < unloading.length; index += 1) {
      const left = unloading[index - 1];
      const right = unloading[index];
      loopAreaJ += .5 * (left.forceN + right.forceN) * (right.extensionM - left.extensionM);
    }
    return { ...maximum, loading, unloading, loopAreaJ: Math.max(0, loopAreaJ) };
  }

  function solve(input = {}) {
    const state = normalize(input);
    return { state, experiment: experiment(state), hysteresis: hysteresis(state) };
  }

  return { clamp, normalize, forceForIndex, loadingExtension, unloadingExtension, maximumState, linearFit, experiment, hysteresis, solve };
});
