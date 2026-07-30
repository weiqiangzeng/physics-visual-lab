(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.MatterWaveModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const H = 6.62607015e-34;
  const E_CHARGE = 1.602176634e-19;
  const C = 299792458;
  const PARTICLES = Object.freeze({
    electron: Object.freeze({ label: "电子", symbol: "e−", massKg: 9.1093837015e-31, chargeNumber: -1, defaultSpeed: 2e6 }),
    proton: Object.freeze({ label: "质子", symbol: "p+", massKg: 1.67262192595e-27, chargeNumber: 1, defaultSpeed: 2e6 }),
    neutron: Object.freeze({ label: "中子", symbol: "n", massKg: 1.67492749804e-27, chargeNumber: 0, defaultSpeed: 2e3 }),
    baseball: Object.freeze({ label: "棒球", symbol: "ball", massKg: 0.145, chargeNumber: 0, defaultSpeed: 30 })
  });
  const GRAPHITE_SPACINGS_NM = Object.freeze([0.213, 0.123]);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function particle(key) {
    return PARTICLES[key] || PARTICLES.electron;
  }

  function deBroglieState(input = {}) {
    const selected = particle(input.particle);
    const speedMs = Math.max(1e-12, Number(input.speedMs ?? selected.defaultSpeed));
    const momentum = selected.massKg * speedMs;
    const wavelengthM = H / momentum;
    const kineticEnergyJ = 0.5 * selected.massKg * speedMs * speedMs;
    return {
      particle: selected,
      speedMs,
      momentum,
      wavelengthM,
      wavelengthNm: wavelengthM * 1e9,
      kineticEnergyJ,
      kineticEnergyEv: kineticEnergyJ / E_CHARGE,
      beta: speedMs / C
    };
  }

  function acceleratedState(input = {}) {
    const selected = particle(input.particle);
    const voltage = clamp(input.voltage ?? 4000, 0, 6000);
    const chargeMagnitude = Math.abs(selected.chargeNumber) * E_CHARGE;
    const kineticEnergyJ = chargeMagnitude * voltage;
    const momentum = kineticEnergyJ > 0 ? Math.sqrt(2 * selected.massKg * kineticEnergyJ) : 0;
    const speedMs = momentum / selected.massKg;
    const wavelengthM = momentum > 0 ? H / momentum : Infinity;
    return {
      particle: selected,
      voltage,
      chargeMagnitude,
      kineticEnergyJ,
      kineticEnergyEv: kineticEnergyJ / E_CHARGE,
      momentum,
      speedMs,
      wavelengthM,
      wavelengthNm: wavelengthM * 1e9,
      beta: speedMs / C,
      nonRelativistic: speedMs < 0.2 * C,
      energyResidualJ: momentum ? kineticEnergyJ - momentum * momentum / (2 * selected.massKg) : 0
    };
  }

  function electronState(voltage = 4000) {
    return acceleratedState({ particle: "electron", voltage });
  }

  function braggRing(input = {}) {
    const beam = electronState(input.voltage ?? 4000);
    const latticeSpacingNm = clamp(input.latticeSpacingNm ?? GRAPHITE_SPACINGS_NM[0], 0.04, 0.5);
    const screenDistanceM = clamp(input.screenDistanceM ?? 0.135, 0.04, 0.5);
    const order = Math.max(1, Math.round(Number(input.order ?? 1)));
    const argument = order * beam.wavelengthM / (2 * latticeSpacingNm * 1e-9);
    const valid = argument <= 1;
    const braggAngleRad = valid ? Math.asin(argument) : NaN;
    const scatteringAngleRad = valid ? 2 * braggAngleRad : NaN;
    const radiusM = valid ? screenDistanceM * Math.tan(scatteringAngleRad) : NaN;
    return {
      ...beam,
      latticeSpacingNm,
      screenDistanceM,
      order,
      argument,
      valid,
      braggAngleRad,
      braggAngleDeg: braggAngleRad * 180 / Math.PI,
      scatteringAngleRad,
      scatteringAngleDeg: scatteringAngleRad * 180 / Math.PI,
      radiusM,
      radiusCm: radiusM * 100,
      braggResidualM: valid ? 2 * latticeSpacingNm * 1e-9 * Math.sin(braggAngleRad) - order * beam.wavelengthM : NaN
    };
  }

  function graphiteRings(input = {}) {
    return GRAPHITE_SPACINGS_NM.map((latticeSpacingNm) => braggRing({ ...input, latticeSpacingNm }));
  }

  function gaussian(value, center, sigma) {
    const z = (value - center) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  function ringIntensity(radiusM, input = {}) {
    const rings = graphiteRings(input);
    const inner = rings[0].radiusM;
    const outer = rings[1].radiusM;
    const centralSigma = Math.max(0.00035, inner * 0.12);
    const innerSigma = Math.max(0.00032, inner * 0.045);
    const outerSigma = Math.max(0.00038, outer * 0.04);
    const intensity = 0.22 * gaussian(radiusM, 0, centralSigma)
      + 0.88 * gaussian(radiusM, inner, innerSigma)
      + 0.62 * gaussian(radiusM, outer, outerSigma);
    return Math.min(1, intensity);
  }

  function intensityProfile(input = {}, count = 180) {
    const rings = graphiteRings(input);
    const maxRadius = rings[1].radiusM * 1.28;
    return Array.from({ length: count + 1 }, (_, index) => {
      const radiusM = maxRadius * index / count;
      return { radiusM, radiusCm: radiusM * 100, intensity: ringIntensity(radiusM, input) };
    });
  }

  function seededRandom(seed = 314159) {
    let value = seed >>> 0;
    return function () {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function normalSample(random) {
    const u1 = Math.max(1e-12, random());
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  function generateHits(count, input = {}, seed = 314159) {
    const total = Math.max(0, Math.min(12000, Math.round(Number(count))));
    const random = seededRandom(seed);
    const rings = graphiteRings(input);
    const inner = rings[0].radiusM;
    const outer = rings[1].radiusM;
    const hits = [];
    for (let index = 0; index < total; index += 1) {
      const selector = random();
      let radiusM;
      let family;
      if (selector < 0.16) {
        const sigma = Math.max(0.00035, inner * 0.12);
        radiusM = sigma * Math.sqrt(-2 * Math.log(Math.max(1e-12, 1 - random())));
        family = "central";
      } else if (selector < 0.68) {
        radiusM = Math.abs(inner + normalSample(random) * Math.max(0.00032, inner * 0.045));
        family = "inner";
      } else {
        radiusM = Math.abs(outer + normalSample(random) * Math.max(0.00038, outer * 0.04));
        family = "outer";
      }
      const angle = 2 * Math.PI * random();
      hits.push({ index, family, radiusM, xM: radiusM * Math.cos(angle), yM: radiusM * Math.sin(angle) });
    }
    return hits;
  }

  return {
    H,
    E_CHARGE,
    C,
    PARTICLES,
    GRAPHITE_SPACINGS_NM,
    clamp,
    particle,
    deBroglieState,
    acceleratedState,
    electronState,
    braggRing,
    graphiteRings,
    ringIntensity,
    intensityProfile,
    generateHits
  };
});
