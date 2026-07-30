(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VerticalMotionModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function landingTime(input = {}) {
    const initialHeightM = clamp(input.initialHeightM ?? 20, 0, 1e6);
    const initialVelocityMs = finite(input.initialVelocityMs, 0);
    const gravityMs2 = clamp(input.gravityMs2 ?? 9.8, 1e-6, 1e4);
    const discriminant = initialVelocityMs ** 2 +
      2 * gravityMs2 * initialHeightM;
    return (initialVelocityMs + Math.sqrt(discriminant)) / gravityMs2;
  }

  function verticalMotion(input = {}) {
    const initialHeightM = clamp(input.initialHeightM ?? 20, 0, 1e6);
    const initialVelocityMs = finite(input.initialVelocityMs, 0);
    const gravityMs2 = clamp(input.gravityMs2 ?? 9.8, 1e-6, 1e4);
    const requestedTimeS = Math.max(0, finite(input.timeS, 0));
    const impactTimeS = landingTime({
      initialHeightM,
      initialVelocityMs,
      gravityMs2,
    });
    const timeS = Math.min(requestedTimeS, impactTimeS);
    const rawHeightM = initialHeightM + initialVelocityMs * timeS -
      .5 * gravityMs2 * timeS ** 2;
    const landed = requestedTimeS >= impactTimeS;
    const heightM = landed ? 0 : Math.max(0, rawHeightM);
    const velocityMs = initialVelocityMs - gravityMs2 * timeS;
    const apexTimeS = Math.max(0, initialVelocityMs / gravityMs2);
    const apexHeightM = initialHeightM + Math.max(0, initialVelocityMs) ** 2 /
      (2 * gravityMs2);
    return {
      initialHeightM,
      initialVelocityMs,
      gravityMs2,
      requestedTimeS,
      timeS,
      impactTimeS,
      landed,
      heightM,
      velocityMs,
      accelerationMs2: -gravityMs2,
      apexTimeS,
      apexHeightM,
      displacementM: heightM - initialHeightM,
      positionResidualM: rawHeightM -
        (initialHeightM + initialVelocityMs * timeS -
          .5 * gravityMs2 * timeS ** 2),
      velocityResidualMs: velocityMs -
        (initialVelocityMs - gravityMs2 * timeS),
    };
  }

  function freeFall(input = {}) {
    return verticalMotion({ ...input, initialVelocityMs: 0 });
  }

  function verticalThrow(input = {}) {
    const initialSpeedMs = clamp(input.initialSpeedMs ?? 20, 0, 1e4);
    const initialHeightM = clamp(input.initialHeightM ?? 0, 0, 1e6);
    const gravityMs2 = clamp(input.gravityMs2 ?? 9.8, 1e-6, 1e4);
    const motion = verticalMotion({
      initialHeightM,
      initialVelocityMs: initialSpeedMs,
      gravityMs2,
      timeS: input.timeS,
    });
    return {
      ...motion,
      initialSpeedMs,
      riseHeightM: initialSpeedMs ** 2 / (2 * gravityMs2),
      returnToLaunchTimeS: initialSpeedMs > 0
        ? 2 * initialSpeedMs / gravityMs2
        : 0,
      speedAtLaunchHeightOnReturnMs: -initialSpeedMs,
    };
  }

  function strobe(input = {}, count = 9) {
    const impactTimeS = landingTime(input);
    const endTimeS = Math.min(
      Math.max(0, finite(input.endTimeS, impactTimeS)),
      impactTimeS,
    );
    const samples = Math.max(2, Math.round(clamp(count, 2, 101)));
    return Array.from({ length: samples }, (_, index) => {
      const timeS = endTimeS * index / (samples - 1);
      return verticalMotion({ ...input, timeS });
    });
  }

  function quadraticDragDrop(input = {}) {
    const heightM = clamp(input.heightM ?? 100, 0, 1e6);
    const massKg = clamp(input.massKg ?? 1, 1e-6, 1e7);
    const areaM2 = clamp(input.areaM2 ?? .01, 1e-8, 1e4);
    const dragCoefficient = clamp(input.dragCoefficient ?? .47, 0, 10);
    const airDensityKgM3 = clamp(input.airDensityKgM3 ?? 1.225, 0, 100);
    const gravityMs2 = clamp(input.gravityMs2 ?? 9.8, 1e-6, 1e4);
    const requestedTimeS = Math.max(0, finite(input.timeS, 0));
    const dragFactorKgM = .5 * airDensityKgM3 * dragCoefficient * areaM2;
    if (dragFactorKgM <= 1e-20) {
      const vacuum = freeFall({
        initialHeightM: heightM,
        gravityMs2,
        timeS: requestedTimeS,
      });
      return {
        ...vacuum,
        heightM: vacuum.heightM,
        downwardSpeedMs: Math.max(0, -vacuum.velocityMs),
        terminalSpeedMs: Infinity,
        dragForceN: 0,
        weightN: massKg * gravityMs2,
        dragFactorKgM,
        massKg,
        areaM2,
        dragCoefficient,
        airDensityKgM3,
      };
    }
    const terminalSpeedMs = Math.sqrt(massKg * gravityMs2 / dragFactorKgM);
    const impactTimeS = terminalSpeedMs / gravityMs2 * Math.acosh(
      Math.exp(gravityMs2 * heightM / terminalSpeedMs ** 2),
    );
    const timeS = Math.min(requestedTimeS, impactTimeS);
    const downwardSpeedMs = terminalSpeedMs * Math.tanh(
      gravityMs2 * timeS / terminalSpeedMs,
    );
    const fallenDistanceM = terminalSpeedMs ** 2 / gravityMs2 * Math.log(
      Math.cosh(gravityMs2 * timeS / terminalSpeedMs),
    );
    const heightNowM = Math.max(0, heightM - fallenDistanceM);
    const dragForceN = dragFactorKgM * downwardSpeedMs ** 2;
    const accelerationDownMs2 = gravityMs2 - dragForceN / massKg;
    return {
      heightM: heightNowM,
      initialHeightM: heightM,
      massKg,
      areaM2,
      dragCoefficient,
      airDensityKgM3,
      gravityMs2,
      requestedTimeS,
      timeS,
      impactTimeS,
      landed: requestedTimeS >= impactTimeS,
      downwardSpeedMs,
      velocityMs: -downwardSpeedMs,
      terminalSpeedMs,
      fallenDistanceM: Math.min(heightM, fallenDistanceM),
      dragForceN,
      weightN: massKg * gravityMs2,
      accelerationDownMs2,
      dragFactorKgM,
      forceResidualN: massKg * accelerationDownMs2 -
        (massKg * gravityMs2 - dragForceN),
    };
  }

  function inertialFrame(input = {}) {
    const motion = verticalMotion(input);
    const frameVelocityMs = finite(input.frameVelocityMs, 0);
    const frameOriginM = finite(input.frameOriginM, 0);
    return {
      ...motion,
      frameVelocityMs,
      frameOriginM,
      relativeHeightM: motion.heightM - frameOriginM -
        frameVelocityMs * motion.timeS,
      relativeVelocityMs: motion.velocityMs - frameVelocityMs,
      relativeAccelerationMs2: motion.accelerationMs2,
      accelerationInvariantResidualMs2: motion.accelerationMs2 +
        motion.gravityMs2,
    };
  }

  return {
    clamp,
    landingTime,
    verticalMotion,
    freeFall,
    verticalThrow,
    strobe,
    quadraticDragDrop,
    inertialFrame,
  };
});
