(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.PhotoelectricModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const H = 6.62607015e-34;
  const C = 299792458;
  const E = 1.602176634e-19;
  const M_E = 9.1093837015e-31;
  const HC_EV_NM = H * C / E * 1e9;
  const MATERIALS = Object.freeze({
    cesium: Object.freeze({ label: "铯", symbol: "Cs", workFunctionEv: 2.14 }),
    sodium: Object.freeze({ label: "钠", symbol: "Na", workFunctionEv: 2.28 }),
    calcium: Object.freeze({ label: "钙", symbol: "Ca", workFunctionEv: 2.90 }),
    zinc: Object.freeze({ label: "锌", symbol: "Zn", workFunctionEv: 4.31 })
  });

  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
  function solve(input = {}) {
    const wavelengthNm = clamp(input.wavelengthNm ?? 400, 180, 800);
    const intensity = clamp(input.intensity ?? 60, 0, 100);
    const voltage = clamp(input.voltage ?? 0, -6, 6);
    const material = MATERIALS[input.material] || MATERIALS.sodium;
    const frequencyHz = C / (wavelengthNm * 1e-9);
    const photonEnergyEv = HC_EV_NM / wavelengthNm;
    const excessEnergyEv = photonEnergyEv - material.workFunctionEv;
    const emits = excessEnergyEv >= -1e-12 && intensity > 0;
    const maxKineticEnergyEv = Math.max(0, excessEnergyEv);
    const stoppingVoltage = maxKineticEnergyEv;
    const maxSpeed = Math.sqrt(2 * maxKineticEnergyEv * E / M_E);
    const thresholdFrequencyHz = material.workFunctionEv * E / H;
    const thresholdWavelengthNm = HC_EV_NM / material.workFunctionEv;
    const saturationCurrentNa = emits ? intensity * 0.12 : 0;
    let collectionFraction = 0;
    if (emits) {
      if (voltage >= 0) collectionFraction = 1 - 0.18 * Math.exp(-voltage / 0.65);
      else if (stoppingVoltage > 0) collectionFraction = clamp(1 + voltage / stoppingVoltage, 0, 1) ** 1.35;
    }
    const photocurrentNa = saturationCurrentNa * collectionFraction;
    return {
      wavelengthNm, intensity, voltage, material, frequencyHz, photonEnergyEv,
      maxKineticEnergyEv, stoppingVoltage, maxSpeed, thresholdFrequencyHz,
      thresholdWavelengthNm, saturationCurrentNa, collectionFraction,
      photocurrentNa, emits, belowThreshold: photonEnergyEv < material.workFunctionEv,
      energyResidualEv: emits ? photonEnergyEv - material.workFunctionEv - maxKineticEnergyEv : 0
    };
  }
  function voltageSeries(input = {}, count = 120) { return Array.from({ length: count + 1 }, (_, index) => solve({ ...input, voltage: -6 + 12 * index / count })); }
  function wavelengthSeries(input = {}, count = 140) { return Array.from({ length: count + 1 }, (_, index) => solve({ ...input, wavelengthNm: 180 + 620 * index / count })); }
  return { H, C, E, M_E, HC_EV_NM, MATERIALS, clamp, solve, voltageSeries, wavelengthSeries };
});
