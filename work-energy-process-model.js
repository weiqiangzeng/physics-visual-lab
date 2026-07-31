(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkEnergyProcessModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEG = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  function normalize(input = {}) {
    return {
      massKg: clamp(input.massKg ?? 2, .2, 10),
      initialSpeedMs: clamp(input.initialSpeedMs ?? 3, 0, 15),
      distanceM: clamp(input.distanceM ?? 6, .2, 20),
      appliedForceN: clamp(input.appliedForceN ?? 10, 0, 50),
      forceAngleDeg: clamp(input.forceAngleDeg ?? 0, 0, 120),
      frictionForceN: clamp(input.frictionForceN ?? 3, 0, 30),
      variableStartN: clamp(input.variableStartN ?? 4, -20, 30),
      variableSlopeNpm: clamp(input.variableSlopeNpm ?? 1.5, -5, 5),
      inclineAngleDeg: clamp(input.inclineAngleDeg ?? 30, 0, 60),
      frictionCoefficient: clamp(input.frictionCoefficient ?? .2, 0, 1),
      gravityMs2: clamp(input.gravityMs2 ?? 9.8, 1, 20),
      brakeForceN: clamp(input.brakeForceN ?? 5, .1, 40),
      progress: clamp(input.progress ?? .65, 0, 1),
    };
  }
  const kinetic = (massKg, speedMs) => .5 * massKg * speedMs ** 2;

  function resolveMotion(state, requestedDistanceM, workAt) {
    const initialKineticJ = kinetic(state.massKg, state.initialSpeedMs);
    const energyAt = distanceM => initialKineticJ + workAt(distanceM).netWorkJ;
    let actualDistanceM = requestedDistanceM, reachedTarget = true;
    if (energyAt(requestedDistanceM) < 0) {
      reachedTarget = false;
      let low = 0, high = requestedDistanceM;
      for (let iteration = 0; iteration < 80; iteration += 1) {
        const middle = (low + high) / 2;
        if (energyAt(middle) > 0) low = middle; else high = middle;
      }
      actualDistanceM = (low + high) / 2;
    } else {
      const samples = 400;
      for (let index = 1; index <= samples; index += 1) {
        const x = requestedDistanceM * index / samples;
        if (energyAt(x) < 0) {
          reachedTarget = false;
          let low = requestedDistanceM * (index - 1) / samples, high = x;
          for (let iteration = 0; iteration < 70; iteration += 1) {
            const middle = (low + high) / 2;
            if (energyAt(middle) > 0) low = middle; else high = middle;
          }
          actualDistanceM = (low + high) / 2;
          break;
        }
      }
    }
    const ledger = workAt(actualDistanceM);
    const finalKineticJ = Math.max(0, initialKineticJ + ledger.netWorkJ);
    const finalSpeedMs = Math.sqrt(2 * finalKineticJ / state.massKg);
    return {
      requestedDistanceM,
      actualDistanceM,
      reachedTarget,
      stopDistanceM: reachedTarget ? Infinity : actualDistanceM,
      initialKineticJ,
      finalKineticJ,
      finalSpeedMs,
      deltaKineticJ: finalKineticJ - initialKineticJ,
      ...ledger,
      theoremResidualJ: ledger.netWorkJ - (finalKineticJ - initialKineticJ),
    };
  }

  function constantProcess(input = {}, distanceOverride) {
    const state = normalize(input), requestedDistanceM = clamp(distanceOverride ?? state.distanceM, 0, state.distanceM);
    const appliedAlongN = state.appliedForceN * Math.cos(state.forceAngleDeg * DEG);
    const netForceN = appliedAlongN - state.frictionForceN;
    const workAt = distanceM => ({
      appliedWorkJ: appliedAlongN * distanceM,
      frictionWorkJ: -state.frictionForceN * distanceM,
      netWorkJ: netForceN * distanceM,
      netForceN,
    });
    return { ...state, appliedAlongN, ...resolveMotion(state, requestedDistanceM, workAt) };
  }

  function variableForceAt(distanceM, state) { return state.variableStartN + state.variableSlopeNpm * distanceM; }
  function variableProcess(input = {}, distanceOverride) {
    const state = normalize(input), requestedDistanceM = clamp(distanceOverride ?? state.distanceM, 0, state.distanceM);
    const workAt = distanceM => {
      const appliedWorkJ = state.variableStartN * distanceM + .5 * state.variableSlopeNpm * distanceM ** 2;
      const frictionWorkJ = -state.frictionForceN * distanceM;
      return { appliedWorkJ, frictionWorkJ, netWorkJ: appliedWorkJ + frictionWorkJ, netForceN: variableForceAt(distanceM, state) - state.frictionForceN };
    };
    const result = resolveMotion(state, requestedDistanceM, workAt);
    const segments = 240, dx = result.actualDistanceM / segments;
    let trapezoidWorkJ = 0;
    for (let index = 0; index < segments; index += 1) {
      const x0 = index * dx, x1 = (index + 1) * dx;
      trapezoidWorkJ += .5 * (variableForceAt(x0, state) + variableForceAt(x1, state) - 2 * state.frictionForceN) * dx;
    }
    return { ...state, ...result, forceAtEndN: variableForceAt(result.actualDistanceM, state), trapezoidWorkJ, integrationResidualJ: trapezoidWorkJ - result.netWorkJ };
  }

  function inclineProcess(input = {}, distanceOverride) {
    const state = normalize(input), requestedDistanceM = clamp(distanceOverride ?? state.distanceM, 0, state.distanceM);
    const gravityAlongN = state.massKg * state.gravityMs2 * Math.sin(state.inclineAngleDeg * DEG);
    const normalN = state.massKg * state.gravityMs2 * Math.cos(state.inclineAngleDeg * DEG);
    const frictionN = state.frictionCoefficient * normalN;
    const netForceN = state.appliedForceN - gravityAlongN - frictionN;
    const workAt = distanceM => ({
      appliedWorkJ: state.appliedForceN * distanceM,
      gravityWorkJ: -gravityAlongN * distanceM,
      frictionWorkJ: -frictionN * distanceM,
      netWorkJ: netForceN * distanceM,
      netForceN,
    });
    return { ...state, gravityAlongN, normalN, frictionN, ...resolveMotion(state, requestedDistanceM, workAt) };
  }

  function brakingProcess(input = {}, distanceOverride) {
    const state = normalize(input), requestedDistanceM = clamp(distanceOverride ?? state.distanceM, 0, state.distanceM);
    const workAt = distanceM => ({ brakeWorkJ: -state.brakeForceN * distanceM, netWorkJ: -state.brakeForceN * distanceM, netForceN: -state.brakeForceN });
    const result = resolveMotion(state, requestedDistanceM, workAt);
    const theoreticalStopDistanceM = kinetic(state.massKg, state.initialSpeedMs) / state.brakeForceN;
    return { ...state, ...result, theoreticalStopDistanceM };
  }

  function sample(mode, input = {}, samples = 161) {
    const state = normalize(input), count = Math.max(21, Math.round(samples));
    const solver = mode === "variable" ? variableProcess : mode === "incline" ? inclineProcess : mode === "braking" ? brakingProcess : constantProcess;
    const points = Array.from({ length: count }, (_, index) => {
      const distanceM = state.distanceM * index / (count - 1), result = solver(state, distanceM);
      return { distanceM, actualDistanceM: result.actualDistanceM, netForceN: result.netForceN, netWorkJ: result.netWorkJ, kineticJ: result.finalKineticJ, speedMs: result.finalSpeedMs, reachedTarget: result.reachedTarget };
    });
    return { ...state, mode, points, final: solver(state, state.distanceM) };
  }

  return { DEG, clamp, normalize, kinetic, constantProcess, variableForceAt, variableProcess, inclineProcess, brakingProcess, sample };
});
