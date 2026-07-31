(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MotionCompositionModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEG = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const vector = (magnitude, directionDeg) => ({
    x: magnitude * Math.cos(directionDeg * DEG),
    y: magnitude * Math.sin(directionDeg * DEG),
  });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const magnitude = (value) => Math.hypot(value.x, value.y);

  function normalize(input = {}) {
    return {
      carrierSpeedMs: clamp(input.carrierSpeedMs ?? 1.2, -5, 5),
      relativeSpeedMs: clamp(input.relativeSpeedMs ?? .8, .05, 5),
      tubeHeightM: clamp(input.tubeHeightM ?? 1.2, .2, 3),
      riverCurrentMs: clamp(input.riverCurrentMs ?? 2, 0, 8),
      boatSpeedMs: clamp(input.boatSpeedMs ?? 3, .2, 8),
      headingDeg: clamp(input.headingDeg ?? 0, -80, 80),
      riverWidthM: clamp(input.riverWidthM ?? 120, 20, 500),
      progress: clamp(input.progress ?? .65, 0, 1),
    };
  }

  function composeVelocity(carrier = { x: 0, y: 0 }, relative = { x: 0, y: 0 }) {
    const ground = add(carrier, relative);
    return {
      carrier: { ...carrier },
      relative: { ...relative },
      ground,
      speedMs: magnitude(ground),
      directionDeg: Math.atan2(ground.y, ground.x) / DEG,
      closureResidualMs: magnitude(subtract(ground, add(carrier, relative))),
    };
  }

  function wax(input = {}, progressOverride) {
    const state = normalize(input);
    const progress = clamp(progressOverride ?? state.progress, 0, 1);
    const carrier = { x: state.carrierSpeedMs, y: 0 };
    const relative = { x: 0, y: state.relativeSpeedMs };
    const composition = composeVelocity(carrier, relative);
    const topTimeS = state.tubeHeightM / state.relativeSpeedMs;
    const timeS = progress * topTimeS;
    const tubeOriginGround = { x: carrier.x * timeS, y: 0 };
    const waxInTube = { x: 0, y: relative.y * timeS };
    const waxGround = add(tubeOriginGround, waxInTube);
    const transformedToTube = subtract(waxGround, tubeOriginGround);
    return {
      ...state,
      progress,
      timeS,
      topTimeS,
      composition,
      tubeOriginGround,
      waxInTube,
      waxGround,
      transformedToTube,
      frameResidualM: magnitude(subtract(transformedToTube, waxInTube)),
      horizontalAtTopM: state.carrierSpeedMs * topTimeS,
    };
  }

  function boatRelativeVelocity(boatSpeedMs, headingDeg) {
    return {
      x: -boatSpeedMs * Math.sin(headingDeg * DEG),
      y: boatSpeedMs * Math.cos(headingDeg * DEG),
    };
  }

  function river(input = {}, progressOverride) {
    const state = normalize(input);
    const progress = clamp(progressOverride ?? state.progress, 0, 1);
    const current = { x: state.riverCurrentMs, y: 0 };
    const boatRelative = boatRelativeVelocity(state.boatSpeedMs, state.headingDeg);
    const composition = composeVelocity(current, boatRelative);
    const canCross = composition.ground.y > 1e-9;
    const crossingTimeS = canCross ? state.riverWidthM / composition.ground.y : Infinity;
    const timeS = canCross ? progress * crossingTimeS : 0;
    const boatGround = { x: composition.ground.x * timeS, y: composition.ground.y * timeS };
    const waterOriginGround = { x: current.x * timeS, y: 0 };
    const boatInWaterFrame = subtract(boatGround, waterOriginGround);
    const driftM = canCross ? composition.ground.x * crossingTimeS : Infinity;
    const pathLengthM = canCross ? composition.speedMs * crossingTimeS : Infinity;
    return {
      ...state,
      progress,
      current,
      boatRelative,
      composition,
      canCross,
      crossingTimeS,
      timeS,
      boatGround,
      waterOriginGround,
      boatInWaterFrame,
      driftM,
      pathLengthM,
      courseFromAcrossDeg: Math.atan2(composition.ground.x, composition.ground.y) / DEG,
      frameResidualM: magnitude(subtract(boatInWaterFrame, { x: boatRelative.x * timeS, y: boatRelative.y * timeS })),
    };
  }

  function strategies(input = {}) {
    const state = normalize(input);
    const fastest = river({ ...state, headingDeg: 0 }, 1);
    const canCancelDrift = state.boatSpeedMs > state.riverCurrentMs + 1e-12;
    let shortestHeadingDeg;
    if (canCancelDrift) shortestHeadingDeg = Math.asin(state.riverCurrentMs / state.boatSpeedMs) / DEG;
    else if (state.riverCurrentMs > 1e-12) shortestHeadingDeg = Math.asin(Math.min(1, state.boatSpeedMs / state.riverCurrentMs)) / DEG;
    else shortestHeadingDeg = 0;
    const shortest = river({ ...state, headingDeg: Math.min(89.999999, shortestHeadingDeg) }, 1);
    return {
      ...state,
      fastest,
      shortest,
      canCancelDrift,
      shortestHeadingDeg,
      zeroDriftHeadingDeg: canCancelDrift ? shortestHeadingDeg : NaN,
      timePenaltyS: shortest.crossingTimeS - fastest.crossingTimeS,
      driftReductionM: Math.abs(fastest.driftM) - Math.abs(shortest.driftM),
    };
  }

  function frameComparison(input = {}, timeS = 20) {
    const state = normalize(input);
    const q = river(state, 1);
    const time = clamp(timeS, 0, Number.isFinite(q.crossingTimeS) ? q.crossingTimeS : 0);
    const boatGround = { x: q.composition.ground.x * time, y: q.composition.ground.y * time };
    const waterGround = { x: q.current.x * time, y: 0 };
    const boatWater = subtract(boatGround, waterGround);
    const farBankGround = { y: state.riverWidthM };
    const farBankWater = { xVelocity: -q.current.x, y: state.riverWidthM };
    return {
      ...state,
      timeS: time,
      boatGround,
      waterGround,
      boatWater,
      farBankGround,
      farBankWater,
      reconstructedGround: add(boatWater, waterGround),
      positionResidualM: magnitude(subtract(boatGround, add(boatWater, waterGround))),
      crossingEventTimeGroundS: q.crossingTimeS,
      crossingEventTimeWaterS: q.crossingTimeS,
    };
  }

  function currentSweep(input = {}, samples = 161) {
    const state = normalize(input);
    const count = Math.max(21, Math.round(samples));
    const maximumCurrent = Math.max(8, state.boatSpeedMs * 2);
    const points = Array.from({ length: count }, (_, index) => {
      const riverCurrentMs = maximumCurrent * index / (count - 1);
      const result = strategies({ ...state, riverCurrentMs });
      return {
        riverCurrentMs,
        canCancelDrift: result.canCancelDrift,
        shortestHeadingDeg: result.shortestHeadingDeg,
        shortestTimeS: result.shortest.crossingTimeS,
        shortestDriftM: result.shortest.driftM,
        fastestTimeS: result.fastest.crossingTimeS,
      };
    });
    return { ...state, maximumCurrent, points };
  }

  return {
    DEG, clamp, vector, add, subtract, magnitude, normalize, composeVelocity,
    wax, boatRelativeVelocity, river, strategies, frameComparison, currentSweep,
  };
});
