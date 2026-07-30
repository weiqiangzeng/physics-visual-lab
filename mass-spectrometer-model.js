(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MassSpectrometerModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ELEMENTARY_CHARGE = 1.602176634e-19;
  const ATOMIC_MASS_UNIT = 1.6605390666e-27;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function particle(input = {}) {
    const massU = clamp(input.massU ?? 20, .01, 1e5);
    const chargeNumber = Math.trunc(clamp(input.chargeNumber ?? 1, -20, 20)) || 1;
    return {
      massU,
      massKg: massU * ATOMIC_MASS_UNIT,
      chargeNumber,
      chargeC: chargeNumber * ELEMENTARY_CHARGE,
    };
  }

  function selector(input = {}) {
    const p = particle(input);
    const electricFieldVm = clamp(input.electricFieldVm ?? 1e5, -1e9, 1e9);
    const magneticFieldT = clamp(input.magneticFieldT ?? .5, -100, 100);
    const speedMs = clamp(input.speedMs ?? 2e5, 1, 1e9);
    const lengthM = clamp(input.lengthM ?? .2, .001, 100);
    const apertureM = clamp(input.apertureM ?? .004, 1e-6, 10);
    const targetVelocityMs = Math.abs(magneticFieldT) > 1e-15
      ? electricFieldVm / magneticFieldT
      : Infinity;
    const electricForceY = p.chargeC * electricFieldVm;
    const magneticForceY = -p.chargeC * speedMs * magneticFieldT;
    const netForceY = electricForceY + magneticForceY;
    const omega = p.chargeC * magneticFieldT / p.massKg;
    const driftVelocityMs = Math.abs(magneticFieldT) > 1e-15
      ? electricFieldVm / magneticFieldT
      : 0;

    function at(timeS) {
      if (Math.abs(omega) < 1e-15) {
        const ay = electricForceY / p.massKg;
        return {
          timeS,
          xM: speedMs * timeS,
          yM: .5 * ay * timeS ** 2,
          vxMs: speedMs,
          vyMs: ay * timeS,
        };
      }
      const relative = speedMs - driftVelocityMs;
      const angle = omega * timeS;
      return {
        timeS,
        xM: driftVelocityMs * timeS +
          relative * Math.sin(angle) / omega,
        yM: -relative * (1 - Math.cos(angle)) / omega,
        vxMs: driftVelocityMs + relative * Math.cos(angle),
        vyMs: -relative * Math.sin(angle),
      };
    }

    let low = 0;
    let high = lengthM / Math.max(1, Math.min(speedMs, Math.abs(driftVelocityMs) || speedMs)) * 4;
    while (at(high).xM < lengthM && high < 1) high *= 2;
    for (let i = 0; i < 80; i++) {
      const mid = (low + high) / 2;
      if (at(mid).xM < lengthM) low = mid;
      else high = mid;
    }
    const exit = at((low + high) / 2);
    const transmitted = Number.isFinite(targetVelocityMs) &&
      targetVelocityMs > 0 &&
      Math.abs(exit.yM) <= apertureM / 2;
    return {
      ...p,
      electricFieldVm,
      magneticFieldT,
      speedMs,
      lengthM,
      apertureM,
      targetVelocityMs,
      electricForceY,
      magneticForceY,
      netForceY,
      omega,
      driftVelocityMs,
      exit,
      transmitted,
      forceResidualN:
        netForceY - p.chargeC * (electricFieldVm - speedMs * magneticFieldT),
      at,
    };
  }

  function analyzer(input = {}) {
    const p = particle(input);
    const speedMs = clamp(input.speedMs ?? 2e5, 1, 1e9);
    const magneticFieldT = clamp(Math.abs(input.magneticFieldT ?? .5), 1e-9, 100);
    const radiusM = p.massKg * speedMs /
      (Math.abs(p.chargeC) * magneticFieldT);
    return {
      ...p,
      speedMs,
      magneticFieldT,
      radiusM,
      detectorPositionM: 2 * radiusM,
      cyclotronAngularFrequency: Math.abs(p.chargeC) *
        magneticFieldT / p.massKg,
      halfOrbitTimeS: Math.PI * p.massKg /
        (Math.abs(p.chargeC) * magneticFieldT),
      reconstructedMassU: radiusM * Math.abs(p.chargeC) *
        magneticFieldT / speedMs / ATOMIC_MASS_UNIT,
    };
  }

  function isotopePair(input = {}) {
    const common = {
      chargeNumber: input.chargeNumber,
      speedMs: input.speedMs,
      magneticFieldT: input.magneticFieldT,
    };
    const light = analyzer({ ...common, massU: input.lightMassU ?? 20 });
    const heavy = analyzer({ ...common, massU: input.heavyMassU ?? 22 });
    return {
      light,
      heavy,
      detectorSeparationM: Math.abs(
        heavy.detectorPositionM - light.detectorPositionM,
      ),
      radiusRatio: heavy.radiusM / light.radiusM,
      massRatio: heavy.massU / light.massU,
      ratioResidual: heavy.radiusM / light.radiusM -
        heavy.massU / light.massU,
    };
  }

  function beam(input = {}) {
    const centerSpeedMs = clamp(input.centerSpeedMs ?? 2e5, 1, 1e9);
    const spreadFraction = clamp(input.spreadFraction ?? .3, 0, .95);
    const count = Math.round(clamp(input.count ?? 41, 3, 401));
    const particles = [];
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : 2 * i / (count - 1) - 1;
      const speedMs = centerSpeedMs * (1 + spreadFraction * offset);
      const result = selector({ ...input, speedMs });
      particles.push({
        speedMs,
        exitYM: result.exit.yM,
        transmitted: result.transmitted,
      });
    }
    const transmitted = particles.filter((item) => item.transmitted);
    return {
      centerSpeedMs,
      spreadFraction,
      count,
      particles,
      transmittedCount: transmitted.length,
      transmissionFraction: transmitted.length / count,
      transmittedSpeedMinMs: transmitted.length
        ? Math.min(...transmitted.map((item) => item.speedMs))
        : null,
      transmittedSpeedMaxMs: transmitted.length
        ? Math.max(...transmitted.map((item) => item.speedMs))
        : null,
    };
  }

  return {
    ELEMENTARY_CHARGE,
    ATOMIC_MASS_UNIT,
    clamp,
    particle,
    selector,
    analyzer,
    isotopePair,
    beam,
  };
});
