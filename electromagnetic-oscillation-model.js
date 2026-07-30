(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ElectromagneticOscillationModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const LIGHT_SPEED = 299792458;
  const PLANCK_CONSTANT = 6.62607015e-34;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function lcOscillation(input = {}) {
    const inductanceH = clamp(input.inductanceH ?? .02, 1e-6, 100);
    const capacitanceF = clamp(input.capacitanceF ?? 5e-6, 1e-12, 1);
    const initialVoltageV = clamp(input.initialVoltageV ?? 12, 0, 1e5);
    const phaseRad = finite(input.phaseRad, 0);
    const angularFrequencyRadS = 1 / Math.sqrt(inductanceH * capacitanceF);
    const frequencyHz = angularFrequencyRadS / (2 * Math.PI);
    const periodS = 1 / frequencyHz;
    const chargeAmplitudeC = capacitanceF * initialVoltageV;
    const currentAmplitudeA = angularFrequencyRadS * chargeAmplitudeC;
    const chargeC = chargeAmplitudeC * Math.cos(phaseRad);
    const voltageV = initialVoltageV * Math.cos(phaseRad);
    const currentA = -currentAmplitudeA * Math.sin(phaseRad);
    const electricEnergyJ = chargeC ** 2 / (2 * capacitanceF);
    const magneticEnergyJ = .5 * inductanceH * currentA ** 2;
    const totalEnergyJ = .5 * capacitanceF * initialVoltageV ** 2;
    return {
      inductanceH,
      capacitanceF,
      initialVoltageV,
      phaseRad,
      angularFrequencyRadS,
      frequencyHz,
      periodS,
      chargeAmplitudeC,
      currentAmplitudeA,
      chargeC,
      voltageV,
      currentA,
      electricEnergyJ,
      magneticEnergyJ,
      totalEnergyJ,
      energyResidualJ: electricEnergyJ + magneticEnergyJ - totalEnergyJ,
      phaseRelationResidualA: currentA + angularFrequencyRadS *
        chargeAmplitudeC * Math.sin(phaseRad),
    };
  }

  function dampedOscillation(input = {}) {
    const inductanceH = clamp(input.inductanceH ?? .02, 1e-6, 100);
    const capacitanceF = clamp(input.capacitanceF ?? 5e-6, 1e-12, 1);
    const resistanceOhm = clamp(input.resistanceOhm ?? 2, 0, 1e5);
    const initialVoltageV = clamp(input.initialVoltageV ?? 12, 0, 1e5);
    const timeS = Math.max(0, finite(input.timeS, 0));
    const naturalAngularFrequencyRadS = 1 /
      Math.sqrt(inductanceH * capacitanceF);
    const dampingRateS = resistanceOhm / (2 * inductanceH);
    const underdamped = dampingRateS < naturalAngularFrequencyRadS;
    const dampedAngularFrequencyRadS = underdamped
      ? Math.sqrt(naturalAngularFrequencyRadS ** 2 - dampingRateS ** 2)
      : 0;
    const envelope = Math.exp(-dampingRateS * timeS);
    const voltageV = underdamped
      ? initialVoltageV * envelope * Math.cos(dampedAngularFrequencyRadS * timeS)
      : initialVoltageV * envelope;
    const storedEnergyEnvelopeJ = .5 * capacitanceF * initialVoltageV ** 2 *
      envelope ** 2;
    return {
      inductanceH,
      capacitanceF,
      resistanceOhm,
      initialVoltageV,
      timeS,
      naturalAngularFrequencyRadS,
      dampingRateS,
      underdamped,
      dampedAngularFrequencyRadS,
      dampedFrequencyHz: dampedAngularFrequencyRadS / (2 * Math.PI),
      envelope,
      voltageV,
      storedEnergyEnvelopeJ,
    };
  }

  function tuning(input = {}) {
    const oscillator = lcOscillation(input);
    const driveFrequencyHz = clamp(
      input.driveFrequencyHz ?? oscillator.frequencyHz,
      .001,
      1e12,
    );
    const qualityFactor = clamp(input.qualityFactor ?? 8, .2, 1e4);
    const frequencyRatio = driveFrequencyHz / oscillator.frequencyHz;
    const responseRatio = 1 / Math.sqrt(
      (1 - frequencyRatio ** 2) ** 2 +
        (frequencyRatio / qualityFactor) ** 2,
    );
    const normalizedResponse = responseRatio / qualityFactor;
    const bandwidthHz = oscillator.frequencyHz / qualityFactor;
    return {
      ...oscillator,
      driveFrequencyHz,
      qualityFactor,
      frequencyRatio,
      responseRatio,
      normalizedResponse,
      bandwidthHz,
      lowerHalfPowerHz: oscillator.frequencyHz - bandwidthHz / 2,
      upperHalfPowerHz: oscillator.frequencyHz + bandwidthHz / 2,
      detuningHz: driveFrequencyHz - oscillator.frequencyHz,
    };
  }

  function electromagneticWave(input = {}) {
    const frequencyHz = clamp(input.frequencyHz ?? 1e8, 1, 1e22);
    const electricAmplitudeVm = clamp(input.electricAmplitudeVm ?? 30, 0, 1e9);
    const positionM = finite(input.positionM, 0);
    const timeS = finite(input.timeS, 0);
    const direction = finite(input.direction, 1) < 0 ? -1 : 1;
    const wavelengthM = LIGHT_SPEED / frequencyHz;
    const angularFrequencyRadS = 2 * Math.PI * frequencyHz;
    const waveNumberRadM = 2 * Math.PI / wavelengthM;
    const phaseRad = waveNumberRadM * positionM -
      direction * angularFrequencyRadS * timeS;
    const electricFieldVm = electricAmplitudeVm * Math.sin(phaseRad);
    const magneticAmplitudeT = electricAmplitudeVm / LIGHT_SPEED;
    const magneticFieldT = direction * magneticAmplitudeT * Math.sin(phaseRad);
    const intensityWm2 = electricAmplitudeVm ** 2 /
      (2 * 376.730313668);
    return {
      frequencyHz,
      electricAmplitudeVm,
      positionM,
      timeS,
      direction,
      wavelengthM,
      angularFrequencyRadS,
      waveNumberRadM,
      phaseRad,
      electricFieldVm,
      magneticAmplitudeT,
      magneticFieldT,
      photonEnergyJ: PLANCK_CONSTANT * frequencyHz,
      intensityWm2,
      speedResidualMs: frequencyHz * wavelengthM - LIGHT_SPEED,
      fieldRatioResidualVm: electricAmplitudeVm -
        LIGHT_SPEED * magneticAmplitudeT,
    };
  }

  function spectrumBand(frequencyHz) {
    const f = clamp(frequencyHz, 1, 1e22);
    if (f < 3e8) return "radio";
    if (f < 3e11) return "microwave";
    if (f < 4e14) return "infrared";
    if (f < 7.5e14) return "visible";
    if (f < 3e16) return "ultraviolet";
    if (f < 3e19) return "xray";
    return "gamma";
  }

  return {
    LIGHT_SPEED,
    PLANCK_CONSTANT,
    clamp,
    lcOscillation,
    dampedOscillation,
    tuning,
    electromagneticWave,
    spectrumBand,
  };
});
