(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ForceCompositionModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEG = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const vector = (magnitude, angleDeg) => ({
    x: magnitude * Math.cos(angleDeg * DEG),
    y: magnitude * Math.sin(angleDeg * DEG),
  });

  function normalize(input = {}) {
    return {
      force1N: clamp(input.force1N ?? 6, 0, 30),
      force2N: clamp(input.force2N ?? 8, 0, 30),
      direction1Deg: clamp(input.direction1Deg ?? 0, -170, 170),
      direction2Deg: clamp(input.direction2Deg ?? 90, -170, 170),
      targetForceN: clamp(input.targetForceN ?? 10, .5, 30),
      targetDirectionDeg: clamp(input.targetDirectionDeg ?? 53.13010235415598, -170, 170),
      forceResolutionN: clamp(input.forceResolutionN ?? .1, .01, 1),
      angleResolutionDeg: clamp(input.angleResolutionDeg ?? .5, .05, 5),
      readingNoise: clamp(input.readingNoise ?? .25, 0, 1),
      seed: Math.max(1, Math.round(input.seed ?? 41)),
    };
  }

  function compose(input = {}) {
    const state = normalize(input);
    const force1 = vector(state.force1N, state.direction1Deg);
    const force2 = vector(state.force2N, state.direction2Deg);
    const resultant = { x: force1.x + force2.x, y: force1.y + force2.y };
    const resultantN = Math.hypot(resultant.x, resultant.y);
    const resultantDirectionDeg = Math.atan2(resultant.y, resultant.x) / DEG;
    return {
      ...state,
      force1,
      force2,
      resultant,
      resultantN,
      resultantDirectionDeg,
      componentResidualX: resultant.x - force1.x - force2.x,
      componentResidualY: resultant.y - force1.y - force2.y,
      cosineLawResidual: resultantN ** 2 - state.force1N ** 2 - state.force2N ** 2
        - 2 * state.force1N * state.force2N * Math.cos((state.direction2Deg - state.direction1Deg) * DEG),
    };
  }

  function directionSeparation(direction1Deg, direction2Deg) {
    let delta = (direction2Deg - direction1Deg) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }

  function decompose(input = {}) {
    const state = normalize(input);
    const deltaDeg = directionSeparation(state.direction1Deg, state.direction2Deg);
    const determinant = Math.sin(deltaDeg * DEG);
    const singular = Math.abs(determinant) < 1e-6;
    if (singular) {
      return { ...state, deltaDeg, determinant, singular, force1N: NaN, force2N: NaN, validTensions: false, conditionNumber: Infinity, closureResidualN: Infinity };
    }
    const force1N = state.targetForceN
      * Math.sin((state.direction2Deg - state.targetDirectionDeg) * DEG) / determinant;
    const force2N = state.targetForceN
      * Math.sin((state.targetDirectionDeg - state.direction1Deg) * DEG) / determinant;
    const force1 = vector(force1N, state.direction1Deg);
    const force2 = vector(force2N, state.direction2Deg);
    const target = vector(state.targetForceN, state.targetDirectionDeg);
    const closure = { x: force1.x + force2.x - target.x, y: force1.y + force2.y - target.y };
    const cosine = Math.abs(Math.cos(deltaDeg * DEG));
    const conditionNumber = (1 + cosine) / Math.max(1e-12, Math.abs(determinant));
    return {
      ...state,
      deltaDeg,
      determinant,
      singular,
      force1N,
      force2N,
      force1,
      force2,
      target,
      closure,
      closureResidualN: Math.hypot(closure.x, closure.y),
      validTensions: force1N >= -1e-10 && force2N >= -1e-10,
      conditionNumber,
    };
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  const quantize = (value, step) => Math.round(value / step) * step;

  function apparatus(input = {}) {
    const state = normalize(input);
    const exact = compose(state);
    const random = seeded(state.seed);
    const perturb = () => (random() * 2 - 1) * state.readingNoise;
    const measuredForce1N = Math.max(0, quantize(state.force1N + perturb() * state.forceResolutionN, state.forceResolutionN));
    const measuredForce2N = Math.max(0, quantize(state.force2N + perturb() * state.forceResolutionN, state.forceResolutionN));
    const measuredDirection1Deg = quantize(state.direction1Deg + perturb() * state.angleResolutionDeg, state.angleResolutionDeg);
    const measuredDirection2Deg = quantize(state.direction2Deg + perturb() * state.angleResolutionDeg, state.angleResolutionDeg);
    const measuredResultantN = Math.max(0, quantize(exact.resultantN + perturb() * state.forceResolutionN, state.forceResolutionN));
    const measuredResultantDirectionDeg = quantize(exact.resultantDirectionDeg + perturb() * state.angleResolutionDeg, state.angleResolutionDeg);
    const measured = compose({
      ...state,
      force1N: measuredForce1N,
      force2N: measuredForce2N,
      direction1Deg: measuredDirection1Deg,
      direction2Deg: measuredDirection2Deg,
    });
    const balancing = vector(measuredResultantN, measuredResultantDirectionDeg + 180);
    const closure = { x: measured.resultant.x + balancing.x, y: measured.resultant.y + balancing.y };
    return {
      ...state,
      exact,
      measuredForce1N,
      measuredForce2N,
      measuredDirection1Deg,
      measuredDirection2Deg,
      measuredResultantN,
      measuredResultantDirectionDeg,
      measured,
      balancing,
      closure,
      closureResidualN: Math.hypot(closure.x, closure.y),
    };
  }

  function sensitivity(input = {}, samples = 181) {
    const state = normalize(input);
    const halfWidth = state.angleResolutionDeg;
    const count = Math.max(11, Math.round(samples));
    const points = Array.from({ length: count }, (_, index) => {
      const targetDirectionDeg = state.targetDirectionDeg - halfWidth + 2 * halfWidth * index / (count - 1);
      const result = decompose({ ...state, targetDirectionDeg });
      return { targetDirectionDeg, force1N: result.force1N, force2N: result.force2N, validTensions: result.validTensions };
    });
    const finiteForces = points.flatMap((point) => [point.force1N, point.force2N]).filter(Number.isFinite);
    return {
      ...state,
      points,
      minimumForceN: Math.min(...finiteForces),
      maximumForceN: Math.max(...finiteForces),
      spreadN: Math.max(...finiteForces) - Math.min(...finiteForces),
      center: decompose(state),
    };
  }

  function workEquivalence(input = {}, displacementM = 2, displacementDirectionDeg = 20) {
    const result = compose(input);
    const displacement = vector(displacementM, displacementDirectionDeg);
    const dot = (a, b) => a.x * b.x + a.y * b.y;
    const componentWorkJ = dot(result.force1, displacement) + dot(result.force2, displacement);
    const resultantWorkJ = dot(result.resultant, displacement);
    return { ...result, displacement, componentWorkJ, resultantWorkJ, residualJ: resultantWorkJ - componentWorkJ };
  }

  return { DEG, clamp, normalize, vector, compose, decompose, apparatus, sensitivity, workEquivalence, directionSeparation };
});
