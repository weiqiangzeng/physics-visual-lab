(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ThinFilmModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const radians = degrees => degrees * Math.PI / 180;

  function normalize(input = {}) {
    return {
      wavelengthNm: clamp(input.wavelengthNm ?? 550, 380, 750),
      thicknessNm: clamp(input.thicknessNm ?? 120, 0, 2000),
      incidentIndex: clamp(input.incidentIndex ?? 1, 1, 2.6),
      filmIndex: clamp(input.filmIndex ?? 1.33, 1, 2.4),
      substrateIndex: clamp(input.substrateIndex ?? 1, 1, 2.6),
      incidenceDeg: clamp(input.incidenceDeg ?? 0, 0, 75),
      polarization: ["s", "p", "unpolarized"].includes(input.polarization) ? input.polarization : "unpolarized",
      wedgeSlopeUrad: clamp(input.wedgeSlopeUrad ?? 120, 10, 1000),
      positionMm: clamp(input.positionMm ?? 4, 0, 20),
    };
  }

  function angleIn(index, state) {
    return Math.asin(clamp(state.incidentIndex * Math.sin(radians(state.incidenceDeg)) / index, -1, 1));
  }

  function fresnel(ni, nj, thetaI, thetaJ, polarization) {
    if (polarization === "s") return (ni * Math.cos(thetaI) - nj * Math.cos(thetaJ)) / (ni * Math.cos(thetaI) + nj * Math.cos(thetaJ));
    return (ni * Math.cos(thetaJ) - nj * Math.cos(thetaI)) / (ni * Math.cos(thetaJ) + nj * Math.cos(thetaI));
  }

  function complexReflectance(input = {}, wavelengthNm, polarization = "s") {
    const state = normalize(input);
    const lambda = clamp(wavelengthNm ?? state.wavelengthNm, 300, 900) * 1e-9;
    const n0 = state.incidentIndex;
    const n1 = state.filmIndex;
    const n2 = state.substrateIndex;
    const theta0 = radians(state.incidenceDeg);
    const theta1 = angleIn(n1, state);
    const theta2 = angleIn(n2, state);
    const r01 = fresnel(n0, n1, theta0, theta1, polarization);
    const r12 = fresnel(n1, n2, theta1, theta2, polarization);
    const phase = 4 * Math.PI * n1 * state.thicknessNm * 1e-9 * Math.cos(theta1) / lambda;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const nr = r01 + r12 * c;
    const ni = r12 * s;
    const dr = 1 + r01 * r12 * c;
    const di = r01 * r12 * s;
    const denominator = dr * dr + di * di;
    const real = (nr * dr + ni * di) / denominator;
    const imaginary = (ni * dr - nr * di) / denominator;
    return { real, imaginary, reflectance: real * real + imaginary * imaginary, r01, r12, phaseRad: phase, theta0, theta1, theta2 };
  }

  function reflectance(input = {}, wavelengthNm) {
    const state = normalize(input);
    const s = complexReflectance(state, wavelengthNm, "s");
    const p = complexReflectance(state, wavelengthNm, "p");
    if (state.polarization === "s") return s;
    if (state.polarization === "p") return p;
    return { ...s, reflectance: (s.reflectance + p.reflectance) / 2, sReflectance: s.reflectance, pReflectance: p.reflectance };
  }

  function derived(input = {}) {
    const state = normalize(input);
    const opticalPathNm = 2 * state.filmIndex * state.thicknessNm * Math.cos(angleIn(state.filmIndex, state));
    const result = reflectance(state);
    const topPhaseFlip = result.r01 < 0;
    const bottomPhaseFlip = result.r12 < 0;
    const reflectionOffsetRad = topPhaseFlip === bottomPhaseFlip ? 0 : Math.PI;
    const relativePhaseRad = result.phaseRad + (bottomPhaseFlip ? Math.PI : 0) - (topPhaseFlip ? Math.PI : 0);
    const wrappedPhaseRad = ((relativePhaseRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const wedgeSpacingMm = state.wavelengthNm * 1e-9 / (2 * state.filmIndex * state.wedgeSlopeUrad * 1e-6 * Math.cos(result.theta1)) * 1000;
    const localThicknessNm = state.positionMm * 1e-3 * state.wedgeSlopeUrad * 1e-6 * 1e9;
    const local = reflectance({ ...state, thicknessNm: localThicknessNm });
    return { ...state, ...result, opticalPathNm, topPhaseFlip, bottomPhaseFlip, reflectionOffsetRad, relativePhaseRad, wrappedPhaseRad, wedgeSpacingMm, localThicknessNm, localReflectance: local.reflectance };
  }

  function spectrum(input = {}, count = 161) {
    const state = normalize(input);
    return Array.from({ length: count }, (_, index) => {
      const wavelengthNm = 380 + 370 * index / (count - 1);
      return { wavelengthNm, ...reflectance(state, wavelengthNm) };
    });
  }

  function thicknessSweep(input = {}, count = 201, maxNm = 1200) {
    const state = normalize(input);
    return Array.from({ length: count }, (_, index) => {
      const thicknessNm = maxNm * index / (count - 1);
      return { thicknessNm, ...reflectance({ ...state, thicknessNm }) };
    });
  }

  function idealQuarterWave(wavelengthNm = 550, substrateIndex = 1.5) {
    const filmIndex = Math.sqrt(substrateIndex);
    return { filmIndex, thicknessNm: wavelengthNm / (4 * filmIndex) };
  }

  return { clamp, normalize, fresnel, complexReflectance, reflectance, derived, spectrum, thicknessSweep, idealQuarterWave };
});
