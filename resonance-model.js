(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ResonanceModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TAU = Math.PI * 2;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function system(input = {}) {
    const massKg = clamp(input.massKg ?? 1, .01, 1e4);
    const springNm = clamp(input.springNm ?? TAU ** 2, .01, 1e8);
    const dampingRatio = clamp(input.dampingRatio ?? .1, .001, .999);
    const naturalAngularFrequency = Math.sqrt(springNm / massKg);
    const naturalFrequencyHz = naturalAngularFrequency / TAU;
    const dampingCoefficientNsM = 2 * dampingRatio * massKg *
      naturalAngularFrequency;
    const decayRatePerS = dampingRatio * naturalAngularFrequency;
    const dampedAngularFrequency = naturalAngularFrequency *
      Math.sqrt(1 - dampingRatio ** 2);
    return {
      massKg,
      springNm,
      dampingRatio,
      dampingCoefficientNsM,
      naturalAngularFrequency,
      naturalFrequencyHz,
      dampedAngularFrequency,
      dampedFrequencyHz: dampedAngularFrequency / TAU,
      decayRatePerS,
      qualityFactor: 1 / (2 * dampingRatio),
      approximateSettlingTimeS: 4 / decayRatePerS,
    };
  }

  function steadyState(input = {}) {
    const base = system(input);
    const driveFrequencyHz = clamp(input.driveFrequencyHz ?? 1, 0, 1e6);
    const driveAngularFrequency = TAU * driveFrequencyHz;
    const forceAmplitudeN = clamp(input.forceAmplitudeN ?? 1, 0, 1e8);
    const stiffnessTerm = base.springNm -
      base.massKg * driveAngularFrequency ** 2;
    const dampingTerm = base.dampingCoefficientNsM *
      driveAngularFrequency;
    const denominator = Math.max(
      1e-30,
      Math.hypot(stiffnessTerm, dampingTerm),
    );
    const amplitudeM = forceAmplitudeN / denominator;
    const phaseLagRad = Math.atan2(dampingTerm, stiffnessTerm);
    const velocityAmplitudeMs = driveAngularFrequency * amplitudeM;
    const averageInputPowerW = .5 * base.dampingCoefficientNsM *
      velocityAmplitudeMs ** 2;
    const forceVelocityPowerW = .5 * forceAmplitudeN *
      velocityAmplitudeMs * Math.sin(phaseLagRad);
    return {
      ...base,
      driveFrequencyHz,
      driveAngularFrequency,
      forceAmplitudeN,
      frequencyRatio: driveFrequencyHz / base.naturalFrequencyHz,
      stiffnessTerm,
      dampingTerm,
      amplitudeM,
      staticDeflectionM: forceAmplitudeN / base.springNm,
      normalizedAmplitude: amplitudeM /
        Math.max(1e-30, forceAmplitudeN / base.springNm),
      phaseLagRad,
      phaseLagDeg: phaseLagRad * 180 / Math.PI,
      velocityAmplitudeMs,
      averageInputPowerW,
      forceVelocityPowerW,
      powerResidualW: averageInputPowerW - forceVelocityPowerW,
    };
  }

  function resonance(input = {}) {
    const base = system(input);
    const displacementPeakExists = base.dampingRatio < 1 / Math.sqrt(2);
    const displacementPeakAngularFrequency = displacementPeakExists
      ? base.naturalAngularFrequency *
        Math.sqrt(1 - 2 * base.dampingRatio ** 2)
      : 0;
    const halfPowerLowAngularFrequency =
      Math.sqrt(
        base.naturalAngularFrequency ** 2 +
        (base.dampingCoefficientNsM / (2 * base.massKg)) ** 2,
      ) - base.dampingCoefficientNsM / (2 * base.massKg);
    const halfPowerHighAngularFrequency =
      Math.sqrt(
        base.naturalAngularFrequency ** 2 +
        (base.dampingCoefficientNsM / (2 * base.massKg)) ** 2,
      ) + base.dampingCoefficientNsM / (2 * base.massKg);
    return {
      ...base,
      displacementPeakExists,
      displacementPeakFrequencyHz:
        displacementPeakAngularFrequency / TAU,
      powerPeakFrequencyHz: base.naturalFrequencyHz,
      halfPowerLowFrequencyHz: halfPowerLowAngularFrequency / TAU,
      halfPowerHighFrequencyHz: halfPowerHighAngularFrequency / TAU,
      halfPowerBandwidthHz:
        (halfPowerHighAngularFrequency - halfPowerLowAngularFrequency) /
        TAU,
    };
  }

  function transient(input = {}) {
    const steady = steadyState(input);
    const timeS = Math.max(0, finite(input.timeS, 0));
    const omega = steady.driveAngularFrequency;
    const omegaD = steady.dampedAngularFrequency;
    const gamma = steady.decayRatePerS;
    const amplitude = steady.amplitudeM;
    const phase = steady.phaseLagRad;
    const c = -amplitude * Math.cos(phase);
    const d = omegaD > 1e-12
      ? (gamma * c - amplitude * omega * Math.sin(phase)) / omegaD
      : 0;
    const cosD = Math.cos(omegaD * timeS);
    const sinD = Math.sin(omegaD * timeS);
    const decay = Math.exp(-gamma * timeS);
    const particularDisplacementM = amplitude *
      Math.cos(omega * timeS - phase);
    const particularVelocityMs = -amplitude * omega *
      Math.sin(omega * timeS - phase);
    const homogeneousCore = c * cosD + d * sinD;
    const homogeneousDisplacementM = decay * homogeneousCore;
    const homogeneousVelocityMs = decay * (
      -gamma * homogeneousCore -
      c * omegaD * sinD +
      d * omegaD * cosD
    );
    const displacementM =
      particularDisplacementM + homogeneousDisplacementM;
    const velocityMs = particularVelocityMs + homogeneousVelocityMs;
    const driveForceN = steady.forceAmplitudeN * Math.cos(omega * timeS);
    const springEnergyJ = .5 * steady.springNm * displacementM ** 2;
    const kineticEnergyJ = .5 * steady.massKg * velocityMs ** 2;
    return {
      ...steady,
      timeS,
      displacementM,
      velocityMs,
      driveForceN,
      particularDisplacementM,
      homogeneousDisplacementM,
      transientEnvelopeM: Math.exp(-gamma * timeS) *
        Math.hypot(c, d),
      springEnergyJ,
      kineticEnergyJ,
      mechanicalEnergyJ: springEnergyJ + kineticEnergyJ,
      instantaneousInputPowerW: driveForceN * velocityMs,
      instantaneousDissipationW:
        steady.dampingCoefficientNsM * velocityMs ** 2,
    };
  }

  return {
    TAU,
    clamp,
    system,
    steadyState,
    resonance,
    transient,
  };
});
