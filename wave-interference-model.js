(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WaveInterferenceModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const sinc = value => Math.abs(value) < 1e-10 ? 1 : Math.sin(value) / value;

  function normalize(input = {}) {
    return {
      amplitude: clamp(input.amplitude ?? 1, .1, 2),
      wavelengthM: clamp(input.wavelengthM ?? 2, .3, 6),
      frequency1Hz: clamp(input.frequency1Hz ?? 1, .1, 5),
      frequency2Hz: clamp(input.frequency2Hz ?? input.frequency1Hz ?? 1, .1, 5),
      separationM: clamp(input.separationM ?? 4, .5, 10),
      sourcePhaseDeg: clamp(input.sourcePhaseDeg ?? 0, -180, 180),
      probeXM: clamp(input.probeXM ?? 0, -10, 10),
      probeYM: clamp(input.probeYM ?? 4, -8, 10),
      timeS: clamp(input.timeS ?? 0, 0, 20),
      averagingTimeS: clamp(input.averagingTimeS ?? 1, .05, 10),
      attenuation: input.attenuation !== false,
    };
  }

  function sources(input = {}) {
    const state = normalize(input);
    return [{ x: -state.separationM / 2, y: 0 }, { x: state.separationM / 2, y: 0 }];
  }

  function sourceState(index, x, y, timeS, input = {}) {
    const state = normalize(input);
    const source = sources(state)[index];
    const radiusM = Math.max(.05, Math.hypot(x - source.x, y - source.y));
    const frequencyHz = index ? state.frequency2Hz : state.frequency1Hz;
    const phaseOffset = index ? state.sourcePhaseDeg * Math.PI / 180 : 0;
    const phaseRad = 2 * Math.PI * radiusM / state.wavelengthM - 2 * Math.PI * frequencyHz * timeS + phaseOffset;
    const geometric = state.attenuation ? 1 / Math.sqrt(radiusM) : 1;
    const localAmplitude = state.amplitude * geometric;
    return { source, radiusM, frequencyHz, phaseRad, localAmplitude, displacement: localAmplitude * Math.cos(phaseRad) };
  }

  function fieldAt(x, y, timeS, input = {}) {
    const one = sourceState(0, x, y, timeS, input);
    const two = sourceState(1, x, y, timeS, input);
    return { x, y, timeS, one, two, displacement: one.displacement + two.displacement };
  }

  function probe(input = {}) {
    const state = normalize(input);
    const value = fieldAt(state.probeXM, state.probeYM, state.timeS, state);
    const pathDifferenceM = value.two.radiusM - value.one.radiusM;
    const pathPhaseRad = 2 * Math.PI * pathDifferenceM / state.wavelengthM;
    const sourcePhaseRad = state.sourcePhaseDeg * Math.PI / 180;
    const phaseDifferenceNowRad = pathPhaseRad + sourcePhaseRad - 2 * Math.PI * (state.frequency2Hz - state.frequency1Hz) * state.timeS;
    const coherence = sinc(Math.PI * (state.frequency2Hz - state.frequency1Hz) * state.averagingTimeS);
    const intensity1 = value.one.localAmplitude ** 2;
    const intensity2 = value.two.localAmplitude ** 2;
    const averagedIntensity = intensity1 + intensity2 + 2 * Math.sqrt(intensity1 * intensity2) * coherence * Math.cos(pathPhaseRad + sourcePhaseRad - Math.PI * (state.frequency2Hz - state.frequency1Hz) * state.averagingTimeS);
    const coherentIntensity = intensity1 + intensity2 + 2 * Math.sqrt(intensity1 * intensity2) * Math.cos(pathPhaseRad + sourcePhaseRad);
    return { ...state, ...value, pathDifferenceM, pathDifferenceWaves: pathDifferenceM / state.wavelengthM, pathPhaseRad, sourcePhaseRad, phaseDifferenceNowRad, coherence, intensity1, intensity2, coherentIntensity, averagedIntensity: Math.max(0, averagedIntensity) };
  }

  function timeSeries(input = {}, durationS = 4, count = 241) {
    const state = normalize(input);
    return Array.from({ length: count }, (_, index) => {
      const timeS = durationS * index / (count - 1);
      return fieldAt(state.probeXM, state.probeYM, timeS, state);
    });
  }

  function profile(input = {}, yM = 4, spanM = 8, count = 201) {
    const state = normalize(input);
    return Array.from({ length: count }, (_, index) => {
      const probeXM = -spanM + 2 * spanM * index / (count - 1);
      return probe({ ...state, probeXM, probeYM: yM });
    });
  }

  return { clamp, sinc, normalize, sources, sourceState, fieldAt, probe, timeSeries, profile };
});
