(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DoubleRailModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      mode: ["equal", "unequal", "force", "fixed"].includes(input.mode) ? input.mode : "equal",
      mass1Kg: clamp(input.mass1Kg ?? 0.5, 0.1, 5),
      mass2Kg: clamp(input.mass2Kg ?? 0.5, 0.1, 5),
      lengthM: clamp(input.lengthM ?? 0.5, 0.1, 1.5),
      fieldT: clamp(input.fieldT ?? 0.8, 0, 2),
      resistanceOhm: clamp(input.resistanceOhm ?? 0.8, 0.05, 10),
      initialV1Ms: clamp(input.initialV1Ms ?? 4, -10, 10),
      initialV2Ms: clamp(input.initialV2Ms ?? 0, -10, 10),
      force1N: clamp(input.force1N ?? 0, -10, 10),
      force2N: clamp(input.force2N ?? 0, -10, 10),
      initialGapM: clamp(input.initialGapM ?? 4, 0.3, 12),
      timeS: clamp(input.timeS ?? 0, 0, 20),
    };
  }

  function solveFree(n) {
    const m1 = n.mass1Kg, m2 = n.mass2Kg, totalMassKg = m1 + m2;
    const coupling = n.fieldT * n.lengthM;
    const damping = coupling ** 2 / n.resistanceOhm;
    const reducedMassKg = m1 * m2 / totalMassKg;
    const lambda = damping / reducedMassKg;
    const tauS = lambda > 1e-12 ? 1 / lambda : Infinity;
    const relativeV0Ms = n.initialV1Ms - n.initialV2Ms;
    const relativeAccelerationDrive = n.force1N / m1 - n.force2N / m2;
    const relativeTerminalMs = lambda > 1e-12 ? relativeAccelerationDrive / lambda : Infinity;
    const decay = Number.isFinite(tauS) ? Math.exp(-n.timeS / tauS) : 1;
    const relativeVelocityMs = Number.isFinite(relativeTerminalMs)
      ? relativeTerminalMs + (relativeV0Ms - relativeTerminalMs) * decay
      : relativeV0Ms + relativeAccelerationDrive * n.timeS;
    const relativeIntegralM = Number.isFinite(relativeTerminalMs)
      ? relativeTerminalMs * n.timeS + (relativeV0Ms - relativeTerminalMs) * tauS * (1 - decay)
      : relativeV0Ms * n.timeS + 0.5 * relativeAccelerationDrive * n.timeS ** 2;
    const initialComVelocityMs = (m1 * n.initialV1Ms + m2 * n.initialV2Ms) / totalMassKg;
    const comAccelerationMs2 = (n.force1N + n.force2N) / totalMassKg;
    const comVelocityMs = initialComVelocityMs + comAccelerationMs2 * n.timeS;
    const comDisplacementM = initialComVelocityMs * n.timeS + 0.5 * comAccelerationMs2 * n.timeS ** 2;
    const velocity1Ms = comVelocityMs + m2 / totalMassKg * relativeVelocityMs;
    const velocity2Ms = comVelocityMs - m1 / totalMassKg * relativeVelocityMs;
    const displacement1M = comDisplacementM + m2 / totalMassKg * relativeIntegralM;
    const displacement2M = comDisplacementM - m1 / totalMassKg * relativeIntegralM;
    const separationM = n.initialGapM + displacement2M - displacement1M;
    const relativeDerivativeMs2 = relativeAccelerationDrive - lambda * relativeVelocityMs;
    const acceleration1Ms2 = comAccelerationMs2 + m2 / totalMassKg * relativeDerivativeMs2;
    const acceleration2Ms2 = comAccelerationMs2 - m1 / totalMassKg * relativeDerivativeMs2;
    const currentA = coupling * relativeVelocityMs / n.resistanceOhm;
    const magneticForceN = damping * relativeVelocityMs;
    const momentum0KgmS = m1 * n.initialV1Ms + m2 * n.initialV2Ms;
    const momentumKgmS = m1 * velocity1Ms + m2 * velocity2Ms;
    const kinetic0J = 0.5 * m1 * n.initialV1Ms ** 2 + 0.5 * m2 * n.initialV2Ms ** 2;
    const kineticJ = 0.5 * m1 * velocity1Ms ** 2 + 0.5 * m2 * velocity2Ms ** 2;
    const externalWorkJ = n.force1N * displacement1M + n.force2N * displacement2M;
    const resistorHeatJ = Math.max(0, externalWorkJ - (kineticJ - kinetic0J));
    return {
      coupling, damping, reducedMassKg, tauS, decay, totalMassKg,
      relativeV0Ms, relativeVelocityMs, relativeTerminalMs, relativeIntegralM,
      initialComVelocityMs, comVelocityMs, comAccelerationMs2,
      velocity1Ms, velocity2Ms, acceleration1Ms2, acceleration2Ms2,
      displacement1M, displacement2M, separationM, currentA, magneticForceN,
      momentum0KgmS, momentumKgmS, momentumResidualKgmS: momentumKgmS - momentum0KgmS - (n.force1N + n.force2N) * n.timeS,
      kinetic0J, kineticJ, kineticChangeJ: kineticJ - kinetic0J,
      externalWorkJ, resistorHeatJ, energyResidualJ: externalWorkJ - (kineticJ - kinetic0J) - resistorHeatJ,
      forceResidual1N: n.force1N - magneticForceN - m1 * acceleration1Ms2,
      forceResidual2N: n.force2N + magneticForceN - m2 * acceleration2Ms2,
      commonVelocityMs: momentum0KgmS / totalMassKg,
      contact: separationM <= 0.16,
    };
  }

  function solveFixed(n) {
    const coupling = n.fieldT * n.lengthM;
    const damping = coupling ** 2 / n.resistanceOhm;
    const tauS = damping > 1e-12 ? n.mass1Kg / damping : Infinity;
    const terminal = damping > 1e-12 ? n.force1N / damping : Infinity;
    const decay = Number.isFinite(tauS) ? Math.exp(-n.timeS / tauS) : 1;
    const velocity1Ms = Number.isFinite(terminal) ? terminal + (n.initialV1Ms - terminal) * decay : n.initialV1Ms + n.force1N * n.timeS / n.mass1Kg;
    const displacement1M = Number.isFinite(terminal) ? terminal * n.timeS + (n.initialV1Ms - terminal) * tauS * (1 - decay) : n.initialV1Ms * n.timeS + 0.5 * n.force1N / n.mass1Kg * n.timeS ** 2;
    const acceleration1Ms2 = (n.force1N - damping * velocity1Ms) / n.mass1Kg;
    const currentA = coupling * velocity1Ms / n.resistanceOhm;
    const magneticForceN = damping * velocity1Ms;
    const kinetic0J = 0.5 * n.mass1Kg * n.initialV1Ms ** 2;
    const kineticJ = 0.5 * n.mass1Kg * velocity1Ms ** 2;
    const externalWorkJ = n.force1N * displacement1M;
    const resistorHeatJ = Math.max(0, externalWorkJ - (kineticJ - kinetic0J));
    return {
      coupling, damping, reducedMassKg: n.mass1Kg, tauS, decay,
      relativeV0Ms: n.initialV1Ms, relativeVelocityMs: velocity1Ms, relativeTerminalMs: terminal,
      initialComVelocityMs: 0, comVelocityMs: 0, comAccelerationMs2: 0,
      velocity1Ms, velocity2Ms: 0, acceleration1Ms2, acceleration2Ms2: 0,
      displacement1M, displacement2M: 0, separationM: n.initialGapM - displacement1M,
      currentA, magneticForceN, constraintForceN: -magneticForceN,
      momentum0KgmS: n.mass1Kg * n.initialV1Ms, momentumKgmS: n.mass1Kg * velocity1Ms,
      momentumResidualKgmS: 0,
      kinetic0J, kineticJ, kineticChangeJ: kineticJ - kinetic0J,
      externalWorkJ, resistorHeatJ, energyResidualJ: externalWorkJ - (kineticJ - kinetic0J) - resistorHeatJ,
      forceResidual1N: n.force1N - magneticForceN - n.mass1Kg * acceleration1Ms2,
      forceResidual2N: 0, commonVelocityMs: 0, contact: n.initialGapM - displacement1M <= 0.16,
    };
  }

  function solve(input = {}) {
    const n = normalize(input);
    const raw = n.mode === "fixed" ? solveFixed : solveFree;
    let state = raw(n);
    let contactTimeS = null;
    if (state.contact && n.timeS > 0) {
      let low = 0, high = n.timeS;
      for (let index = 0; index < 60; index += 1) {
        const mid = (low + high) / 2;
        if (raw({ ...n, timeS: mid }).separationM <= 0.16) high = mid;
        else low = mid;
      }
      contactTimeS = high;
      state = { ...raw({ ...n, timeS: high }), contact: true };
    }
    return { ...n, ...state, requestedTimeS: n.timeS, timeS: contactTimeS ?? n.timeS, contactTimeS };
  }

  function series(input = {}, durationS = 10, count = 180) {
    const n = normalize(input);
    return Array.from({ length: count + 1 }, (_, index) => solve({ ...n, timeS: durationS * index / count }));
  }

  return { normalize, solve, series };
});
