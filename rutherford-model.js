(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RutherfordModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const COULOMB_MEV_FM = 1.43996448;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      projectileCharge: clamp(input.projectileCharge ?? 2, 1, 4),
      targetZ: clamp(input.targetZ ?? 79, 1, 92),
      energyMeV: clamp(input.energyMeV ?? 5, .5, 20),
      impactFm: clamp(input.impactFm ?? 50, .05, 500),
      maxImpactFm: clamp(input.maxImpactFm ?? 200, 5, 1000),
      atomRadiusFm: clamp(input.atomRadiusFm ?? 50000, 1000, 100000),
      seed: Math.max(1, Math.round(input.seed ?? 17)),
    };
  }

  function coupling(state) {
    return COULOMB_MEV_FM * state.projectileCharge * state.targetZ;
  }

  function scatter(input = {}) {
    const state = normalize(input);
    const kMevFm = coupling(state);
    const ratio = kMevFm / (2 * state.energyMeV * state.impactFm);
    const angleRad = 2 * Math.atan(ratio);
    const headOnClosestFm = kMevFm / state.energyMeV;
    const closestFm = .5 * (headOnClosestFm + Math.sqrt(headOnClosestFm ** 2 + 4 * state.impactFm ** 2));
    const b90Fm = kMevFm / (2 * state.energyMeV);
    return { ...state, kMevFm, ratio, angleRad, angleDeg: angleRad * 180 / Math.PI, closestFm, headOnClosestFm, b90Fm, backscattered: angleRad > Math.PI / 2 };
  }

  function impactForAngle(angleDeg, input = {}) {
    const state = normalize(input);
    const angleRad = clamp(angleDeg, .001, 179.999) * Math.PI / 180;
    return coupling(state) / (2 * state.energyMeV * Math.tan(angleRad / 2));
  }

  function differentialCrossSection(angleDeg, input = {}) {
    const state = normalize(input);
    const angleRad = clamp(angleDeg, .001, 179.999) * Math.PI / 180;
    const scaleFm2 = (coupling(state) / (4 * state.energyMeV)) ** 2;
    return { angleDeg, fm2PerSr: scaleFm2 / Math.sin(angleRad / 2) ** 4, scaleFm2 };
  }

  function thomsonAngle(input = {}) {
    const state = normalize(input);
    const b = Math.min(state.impactFm, state.atomRadiusFm);
    const chordHalf = Math.sqrt(Math.max(0, state.atomRadiusFm ** 2 - b ** 2));
    const smallAngleRad = coupling(state) * b * chordHalf / (state.energyMeV * state.atomRadiusFm ** 3);
    return { angleRad: smallAngleRad, angleDeg: smallAngleRad * 180 / Math.PI, model: "uniform-positive-sphere impulse approximation" };
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function eventAngles(input = {}, count = 1000) {
    const state = normalize(input);
    const random = seeded(state.seed);
    return Array.from({ length: Math.max(1, Math.round(count)) }, () => {
      const impactFm = state.maxImpactFm * Math.sqrt(random());
      const azimuthRad = 2 * Math.PI * random();
      const result = scatter({ ...state, impactFm });
      return { impactFm, azimuthRad, angleRad: result.angleRad, angleDeg: result.angleDeg, backscattered: result.backscattered };
    });
  }

  function expectedFractionAbove(angleDeg, input = {}) {
    const state = normalize(input);
    const thresholdImpact = Math.min(state.maxImpactFm, impactForAngle(angleDeg, state));
    return (thresholdImpact / state.maxImpactFm) ** 2;
  }

  function trajectory(input = {}, count = 600) {
    const state = normalize(input);
    const k = coupling(state);
    const p = 2 * state.energyMeV * state.impactFm ** 2 / k;
    const eccentricity = Math.sqrt(1 + (2 * state.energyMeV * state.impactFm / k) ** 2);
    const psiInfinity = Math.acos(1 / eccentricity);
    const span = Math.max(1000, state.impactFm * 20, scatter(state).headOnClosestFm * 20);
    const epsilon = clamp(state.impactFm / span, 1e-5, .08);
    const psiStart = psiInfinity - epsilon;
    const psiEnd = -psiInfinity + epsilon;
    const phiOffset = Math.PI - psiInfinity;
    return Array.from({ length: Math.max(20, Math.round(count)) }, (_, index) => {
      const psi = psiStart + (psiEnd - psiStart) * index / (count - 1);
      const phi = psi + phiOffset;
      const radiusFm = p / (eccentricity * Math.cos(psi) - 1);
      return { xFm: radiusFm * Math.cos(phi), yFm: radiusFm * Math.sin(phi), radiusFm, phiRad: phi, psiRad: psi, eccentricity };
    });
  }

  return { COULOMB_MEV_FM, clamp, normalize, scatter, impactForAngle, differentialCrossSection, thomsonAngle, eventAngles, expectedFractionAbove, trajectory };
});
