(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.IdealGasModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const R = 8.314462618;
  const K_B = 1.380649e-23;
  const N_A = 6.02214076e23;
  const SPECIES = Object.freeze({
    helium: Object.freeze({ label: "He", molarMass: 0.0040026, degrees: 3 }),
    nitrogen: Object.freeze({ label: "N₂", molarMass: 0.0280134, degrees: 5 }),
    oxygen: Object.freeze({ label: "O₂", molarMass: 0.031998, degrees: 5 })
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function processState(input, progress = 0) {
    const mode = input.mode || "microscopic";
    const amount = Math.max(0, Number(input.amount));
    const baseVolumeLiters = Math.max(1e-9, Number(input.baseVolume));
    const baseTemperature = Math.max(1e-9, Number(input.baseTemperature));
    const fraction = clamp(progress, 0, 1);
    let volumeLiters = baseVolumeLiters;
    let temperature = baseTemperature;
    if (mode === "isothermal") volumeLiters = baseVolumeLiters * (1 - 0.5 * fraction);
    if (mode === "isochoric") temperature = baseTemperature * (1 + fraction);
    if (mode === "isobaric") {
      temperature = baseTemperature * (1 + fraction);
      volumeLiters = baseVolumeLiters * (1 + fraction);
    }
    const volumeM3 = volumeLiters / 1000;
    const pressurePa = amount * R * temperature / volumeM3;
    const species = SPECIES[input.species] || SPECIES.nitrogen;
    const rmsSpeed = Math.sqrt(3 * R * temperature / species.molarMass);
    const meanSpeed = Math.sqrt(8 * R * temperature / (Math.PI * species.molarMass));
    const mostProbableSpeed = Math.sqrt(2 * R * temperature / species.molarMass);
    const meanKineticEnergyJ = 1.5 * K_B * temperature;
    const startPressurePa = amount * R * baseTemperature / (baseVolumeLiters / 1000);
    const invariant = mode === "isothermal"
      ? pressurePa * volumeM3
      : mode === "isochoric"
        ? pressurePa / temperature
        : mode === "isobaric"
          ? volumeM3 / temperature
          : pressurePa * volumeM3 / (amount * temperature || 1);
    const startInvariant = mode === "isothermal"
      ? startPressurePa * (baseVolumeLiters / 1000)
      : mode === "isochoric"
        ? startPressurePa / baseTemperature
        : mode === "isobaric"
          ? (baseVolumeLiters / 1000) / baseTemperature
          : R;
    return {
      mode,
      progress: fraction,
      amount,
      baseVolumeLiters,
      baseTemperature,
      volumeLiters,
      volumeM3,
      temperature,
      pressurePa,
      pressureKPa: pressurePa / 1000,
      startPressurePa,
      startPressureKPa: startPressurePa / 1000,
      species,
      rmsSpeed,
      meanSpeed,
      mostProbableSpeed,
      meanKineticEnergyJ,
      meanKineticEnergyZJ: meanKineticEnergyJ / 1e-21,
      numberDensity: volumeM3 > 0 ? amount * N_A / volumeM3 : 0,
      pVJ: pressurePa * volumeM3,
      invariant,
      startInvariant,
      invariantResidual: invariant - startInvariant,
      pressureRatio: startPressurePa > 0 ? pressurePa / startPressurePa : 0,
      volumeRatio: volumeLiters / baseVolumeLiters,
      temperatureRatio: temperature / baseTemperature
    };
  }

  function maxwellPdf(speed, temperature, speciesName) {
    const species = SPECIES[speciesName] || SPECIES.nitrogen;
    const v = Math.max(0, Number(speed));
    const t = Math.max(1e-9, Number(temperature));
    const factor = species.molarMass / (2 * Math.PI * R * t);
    return 4 * Math.PI * Math.pow(factor, 1.5) * v * v * Math.exp(-species.molarMass * v * v / (2 * R * t));
  }

  function processSeries(input, count = 120) {
    return Array.from({ length: count + 1 }, (_, index) => processState(input, index / count));
  }

  return { R, K_B, N_A, SPECIES, clamp, processState, maxwellPdf, processSeries };
});
