(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RailRodModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      mode: ["force", "coast", "incline", "circuit"].includes(input.mode) ? input.mode : "force",
      circuitKind: input.circuitKind === "capacitor" ? "capacitor" : "source",
      massKg: clamp(input.massKg ?? 0.5, 0.1, 5),
      lengthM: clamp(input.lengthM ?? 0.5, 0.1, 1.5),
      fieldT: clamp(input.fieldT ?? 0.8, 0, 2),
      resistanceOhm: clamp(input.resistanceOhm ?? 0.8, 0.05, 10),
      forceN: clamp(input.forceN ?? 1.2, 0, 10),
      initialSpeedMs: clamp(input.initialSpeedMs ?? 0, 0, 15),
      angleDeg: clamp(input.angleDeg ?? 20, 0, 45),
      friction: clamp(input.friction ?? 0.05, 0, 0.5),
      capacitanceF: clamp(input.capacitanceF ?? 2, 0.05, 10),
      sourceVoltageV: clamp(input.sourceVoltageV ?? 3, 0, 12),
      gravity: clamp(input.gravity ?? 9.8, 1.6, 12),
      timeS: clamp(input.timeS ?? 0, 0, 30),
    };
  }

  function resistiveState(n, driveForceN, initialSpeedMs) {
    const coupling = n.fieldT * n.lengthM;
    const damping = coupling * coupling / n.resistanceOhm;
    const tauS = damping > 1e-12 ? n.massKg / damping : Infinity;
    const terminalSpeedMs = damping > 1e-12 ? driveForceN / damping : Infinity;
    const decay = Number.isFinite(tauS) ? Math.exp(-n.timeS / tauS) : 1;
    const speedMs = Number.isFinite(terminalSpeedMs)
      ? terminalSpeedMs + (initialSpeedMs - terminalSpeedMs) * decay
      : initialSpeedMs + driveForceN * n.timeS / n.massKg;
    const accelerationMs2 = (driveForceN - damping * speedMs) / n.massKg;
    const displacementM = Number.isFinite(terminalSpeedMs)
      ? terminalSpeedMs * n.timeS + (initialSpeedMs - terminalSpeedMs) * tauS * (1 - decay)
      : initialSpeedMs * n.timeS + 0.5 * driveForceN / n.massKg * n.timeS ** 2;
    const emfV = coupling * speedMs;
    const currentA = emfV / n.resistanceOhm;
    const magneticForceN = coupling * currentA;
    const kineticChangeJ = 0.5 * n.massKg * (speedMs ** 2 - initialSpeedMs ** 2);
    const driveWorkJ = driveForceN * displacementM;
    const resistorHeatJ = Math.max(0, driveWorkJ - kineticChangeJ);
    return {
      coupling,
      damping,
      tauS,
      terminalSpeedMs,
      decay,
      speedMs,
      accelerationMs2,
      displacementM,
      emfV,
      currentA,
      magneticForceN,
      kineticChangeJ,
      driveWorkJ,
      resistorHeatJ,
      energyResidualJ: driveWorkJ - kineticChangeJ - resistorHeatJ,
      chargeTransferC: coupling * displacementM / n.resistanceOhm,
    };
  }

  function solve(input = {}) {
    const n = normalize(input);
    const weightN = n.massKg * n.gravity;
    let state;
    let driveForceN = n.forceN;
    let frictionForceN = 0;

    if (n.mode === "coast") {
      driveForceN = 0;
      state = resistiveState(n, 0, n.initialSpeedMs);
    } else if (n.mode === "incline") {
      const angle = n.angleDeg * Math.PI / 180;
      const gravityAlongN = weightN * Math.sin(angle);
      frictionForceN = n.friction * weightN * Math.cos(angle);
      driveForceN = Math.max(0, gravityAlongN - frictionForceN);
      state = resistiveState(n, driveForceN, n.initialSpeedMs);
      state.gravityAlongN = gravityAlongN;
    } else if (n.mode === "circuit" && n.circuitKind === "capacitor") {
      const coupling = n.fieldT * n.lengthM;
      const electromagneticMassKg = n.capacitanceF * coupling ** 2;
      const effectiveMassKg = n.massKg + electromagneticMassKg;
      const accelerationMs2 = n.forceN / effectiveMassKg;
      const speedMs = n.initialSpeedMs + accelerationMs2 * n.timeS;
      const displacementM = n.initialSpeedMs * n.timeS + 0.5 * accelerationMs2 * n.timeS ** 2;
      const emfV = coupling * speedMs;
      const initialEmfV = coupling * n.initialSpeedMs;
      const currentA = n.capacitanceF * coupling * accelerationMs2;
      const magneticForceN = coupling * currentA;
      const kineticChangeJ = 0.5 * n.massKg * (speedMs ** 2 - n.initialSpeedMs ** 2);
      const capacitorEnergyChangeJ = 0.5 * n.capacitanceF * (emfV ** 2 - initialEmfV ** 2);
      const driveWorkJ = n.forceN * displacementM;
      state = {
        coupling,
        damping: 0,
        tauS: Infinity,
        terminalSpeedMs: Infinity,
        decay: 1,
        speedMs,
        accelerationMs2,
        displacementM,
        emfV,
        currentA,
        magneticForceN,
        kineticChangeJ,
        driveWorkJ,
        resistorHeatJ: 0,
        capacitorEnergyChangeJ,
        electromagneticMassKg,
        effectiveMassKg,
        chargeTransferC: n.capacitanceF * (emfV - initialEmfV),
        energyResidualJ: driveWorkJ - kineticChangeJ - capacitorEnergyChangeJ,
      };
    } else if (n.mode === "circuit") {
      const coupling = n.fieldT * n.lengthM;
      driveForceN = coupling * n.sourceVoltageV / n.resistanceOhm;
      state = resistiveState(n, driveForceN, n.initialSpeedMs);
      const initialCurrentA = (n.sourceVoltageV - coupling * n.initialSpeedMs) / n.resistanceOhm;
      const currentA = initialCurrentA * state.decay;
      const magneticForceN = coupling * currentA;
      const chargeTransferC = Number.isFinite(state.tauS)
        ? initialCurrentA * state.tauS * (1 - state.decay)
        : initialCurrentA * n.timeS;
      const sourceWorkJ = n.sourceVoltageV * chargeTransferC;
      const resistorHeatJ = Number.isFinite(state.tauS)
        ? initialCurrentA ** 2 * n.resistanceOhm * state.tauS * 0.5 * (1 - state.decay ** 2)
        : initialCurrentA ** 2 * n.resistanceOhm * n.timeS;
      state = {
        ...state,
        emfV: coupling * state.speedMs,
        currentA,
        magneticForceN,
        driveWorkJ: sourceWorkJ,
        sourceWorkJ,
        resistorHeatJ,
        chargeTransferC,
        energyResidualJ: sourceWorkJ - state.kineticChangeJ - resistorHeatJ,
      };
    } else {
      state = resistiveState(n, n.forceN, n.initialSpeedMs);
    }

    const stoppedByStaticFriction = n.mode === "incline" && driveForceN <= 0 && n.initialSpeedMs === 0;
    if (stoppedByStaticFriction) {
      Object.assign(state, {
        speedMs: 0,
        accelerationMs2: 0,
        displacementM: 0,
        emfV: 0,
        currentA: 0,
        magneticForceN: 0,
        kineticChangeJ: 0,
        driveWorkJ: 0,
        resistorHeatJ: 0,
        chargeTransferC: 0,
        energyResidualJ: 0,
      });
    }

    const forceResidualN = n.mode === "circuit" && n.circuitKind === "source"
      ? state.magneticForceN - n.massKg * state.accelerationMs2
      : driveForceN - state.magneticForceN - n.massKg * state.accelerationMs2;
    return {
      ...n,
      ...state,
      weightN,
      driveForceN,
      frictionForceN,
      stoppedByStaticFriction,
      forceResidualN,
      terminalReached: Number.isFinite(state.terminalSpeedMs)
        && Math.abs(state.speedMs - state.terminalSpeedMs) < Math.max(0.01, Math.abs(state.terminalSpeedMs) * 0.02),
    };
  }

  function series(input = {}, durationS, count = 180) {
    const n = normalize(input);
    const reference = solve(n);
    const end = durationS ?? (Number.isFinite(reference.tauS) ? Math.min(30, Math.max(5, 5 * reference.tauS)) : 8);
    return Array.from({ length: count + 1 }, (_, index) => solve({ ...n, timeS: end * index / count }));
  }

  return { normalize, solve, series };
});
