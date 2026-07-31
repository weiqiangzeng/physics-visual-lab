(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SingleSlitModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const sinc = value => Math.abs(value) < 1e-10 ? 1 : Math.sin(value) / value;

  function normalize(input = {}) {
    return {
      wavelengthNm: clamp(input.wavelengthNm ?? 600, 380, 750),
      slitWidthMm: clamp(input.slitWidthMm ?? .06, .005, .3),
      screenDistanceM: clamp(input.screenDistanceM ?? 1.2, .2, 3),
      probeMm: clamp(input.probeMm ?? 0, -160, 160),
    };
  }

  function intensityAt(probeMm, input = {}) {
    const state = normalize({ ...input, probeMm });
    const lambda = state.wavelengthNm * 1e-9;
    const a = state.slitWidthMm * 1e-3;
    const y = state.probeMm * 1e-3;
    const theta = Math.atan2(y, state.screenDistanceM);
    const sinTheta = Math.sin(theta);
    const alpha = Math.PI * a * sinTheta / lambda;
    return {
      ...state,
      lambdaM: lambda,
      slitWidthM: a,
      yM: y,
      thetaRad: theta,
      thetaDeg: theta * 180 / Math.PI,
      sinTheta,
      alpha,
      intensity: sinc(alpha) ** 2,
      pathEdgeWaves: a * sinTheta / lambda,
    };
  }

  function derived(input = {}) {
    const state = normalize(input);
    const lambda = state.wavelengthNm * 1e-9;
    const a = state.slitWidthMm * 1e-3;
    const ratio = lambda / a;
    const firstAngle = ratio <= 1 ? Math.asin(ratio) : Math.PI / 2;
    const firstMinimumMm = state.screenDistanceM * Math.tan(firstAngle) * 1000;
    const approximateFirstMm = state.screenDistanceM * ratio * 1000;
    const exactWidthMm = 2 * firstMinimumMm;
    const approximateWidthMm = 2 * approximateFirstMm;
    const probe = intensityAt(state.probeMm, state);
    const nearestOrder = Math.max(1, Math.round(Math.abs(probe.pathEdgeWaves)));
    const orderResidual = Math.abs(Math.abs(probe.pathEdgeWaves) - nearestOrder);
    return {
      ...probe,
      firstMinimumAngleRad: firstAngle,
      firstMinimumAngleDeg: firstAngle * 180 / Math.PI,
      firstMinimumMm,
      approximateFirstMm,
      centralWidthMm: exactWidthMm,
      approximateCentralWidthMm: approximateWidthMm,
      approximationErrorPercent: exactWidthMm ? (approximateWidthMm / exactWidthMm - 1) * 100 : 0,
      nearestMinimumOrder: nearestOrder,
      minimumResidualWaves: orderResidual,
      isMinimum: orderResidual < .025 && Math.abs(probe.probeMm) > firstMinimumMm * .4,
    };
  }

  function minima(input = {}, maxOrder = 8) {
    const state = normalize(input);
    const lambda = state.wavelengthNm * 1e-9;
    const a = state.slitWidthMm * 1e-3;
    const result = [];
    for (let order = 1; order <= maxOrder && order * lambda < a; order += 1) {
      const theta = Math.asin(order * lambda / a);
      result.push({ order, thetaRad: theta, thetaDeg: theta * 180 / Math.PI, positionMm: state.screenDistanceM * Math.tan(theta) * 1000 });
    }
    return result;
  }

  function phasors(input = {}, count = 48) {
    const probe = intensityAt(normalize(input).probeMm, input);
    const samples = Math.max(4, Math.round(count));
    const phaseSpan = 2 * Math.PI * probe.pathEdgeWaves;
    const vectors = [];
    let x = 0;
    let y = 0;
    for (let index = 0; index < samples; index += 1) {
      const phase = -phaseSpan / 2 + phaseSpan * (index + .5) / samples;
      const dx = Math.cos(phase) / samples;
      const dy = Math.sin(phase) / samples;
      vectors.push({ x, y, dx, dy, phase });
      x += dx;
      y += dy;
    }
    return { vectors, resultant: { x, y, magnitude: Math.hypot(x, y) }, phaseSpan, intensity: probe.intensity };
  }

  function profile(input = {}, spanMm, count = 241) {
    const d = derived(input);
    const span = Math.max(.1, Number(spanMm) || d.firstMinimumMm * 4.5);
    return Array.from({ length: Math.max(3, Math.round(count)) }, (_, index) => {
      const positionMm = -span + 2 * span * index / (count - 1);
      return intensityAt(positionMm, input);
    });
  }

  function seeded(seed) {
    let value = (Math.round(seed) || 1) >>> 0;
    return () => {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function photonHits(input = {}, count = 100, seed = 1) {
    const d = derived(input);
    const span = d.firstMinimumMm * 6;
    const random = seeded(seed);
    const hits = [];
    while (hits.length < count) {
      const positionMm = (random() * 2 - 1) * span;
      if (random() <= intensityAt(positionMm, input).intensity) hits.push(positionMm);
    }
    return hits;
  }

  return { clamp, sinc, normalize, intensityAt, derived, minima, phasors, profile, photonHits };
});
