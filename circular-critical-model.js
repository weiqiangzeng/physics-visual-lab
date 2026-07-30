(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.CircularCriticalModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const G = 9.8;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function flatTurn(input = {}) {
    const massKg = clamp(input.massKg ?? 1200, 100, 3000);
    const radiusM = clamp(input.radiusM ?? 40, 8, 120);
    const speedMps = clamp(input.speedMps ?? 14, 0, 45);
    const frictionCoefficient = clamp(input.frictionCoefficient ?? 0.55, 0, 1.2);
    const requiredForceN = massKg * speedMps ** 2 / radiusM;
    const normalForceN = massKg * G;
    const maxFrictionN = frictionCoefficient * normalForceN;
    const maxSpeedMps = Math.sqrt(frictionCoefficient * G * radiusM);
    const marginN = maxFrictionN - requiredForceN;
    return {
      massKg,
      radiusM,
      speedMps,
      frictionCoefficient,
      requiredForceN,
      normalForceN,
      maxFrictionN,
      maxSpeedMps,
      marginN,
      utilization: maxFrictionN > 0 ? requiredForceN / maxFrictionN : Infinity,
      safe: requiredForceN <= maxFrictionN + 1e-9,
      radialResidualN: Math.min(requiredForceN, maxFrictionN) - Math.min(requiredForceN, maxFrictionN)
    };
  }

  function bankedTurn(input = {}) {
    const massKg = clamp(input.massKg ?? 1200, 100, 3000);
    const radiusM = clamp(input.radiusM ?? 80, 10, 200);
    const speedMps = clamp(input.speedMps ?? 22, 0, 55);
    const bankAngleDeg = clamp(input.bankAngleDeg ?? 20, 0, 40);
    const frictionCoefficient = clamp(input.frictionCoefficient ?? 0.25, 0, 1);
    const theta = bankAngleDeg * Math.PI / 180;
    const radialAccelerationMps2 = speedMps ** 2 / radiusM;
    const normalForceN = massKg * (G * Math.cos(theta) + radialAccelerationMps2 * Math.sin(theta));
    const requiredFrictionN = massKg * (radialAccelerationMps2 * Math.cos(theta) - G * Math.sin(theta));
    const maxFrictionN = frictionCoefficient * normalForceN;
    const idealSpeedMps = Math.sqrt(radiusM * G * Math.tan(theta));
    const maximumRatioDenominator = Math.cos(theta) - frictionCoefficient * Math.sin(theta);
    const minimumRatioNumerator = Math.sin(theta) - frictionCoefficient * Math.cos(theta);
    const maximumSpeedMps = maximumRatioDenominator <= 0
      ? Infinity
      : Math.sqrt(radiusM * G * (Math.sin(theta) + frictionCoefficient * Math.cos(theta)) / maximumRatioDenominator);
    const minimumSpeedMps = minimumRatioNumerator <= 0
      ? 0
      : Math.sqrt(radiusM * G * minimumRatioNumerator / (Math.cos(theta) + frictionCoefficient * Math.sin(theta)));
    const radialResidualN = normalForceN * Math.sin(theta) + requiredFrictionN * Math.cos(theta) - massKg * radialAccelerationMps2;
    const verticalResidualN = normalForceN * Math.cos(theta) - requiredFrictionN * Math.sin(theta) - massKg * G;
    const tolerance = 1e-7;
    return {
      massKg,
      radiusM,
      speedMps,
      bankAngleDeg,
      theta,
      frictionCoefficient,
      radialAccelerationMps2,
      normalForceN,
      requiredFrictionN,
      maxFrictionN,
      idealSpeedMps,
      minimumSpeedMps,
      maximumSpeedMps,
      safe: Math.abs(requiredFrictionN) <= maxFrictionN + tolerance,
      frictionDirection: Math.abs(requiredFrictionN) < tolerance ? "none" : requiredFrictionN > 0 ? "down-slope" : "up-slope",
      radialResidualN,
      verticalResidualN
    };
  }

  function verticalLoop(input = {}) {
    const massKg = clamp(input.massKg ?? 60, 20, 200);
    const radiusM = clamp(input.radiusM ?? 12, 3, 30);
    const bottomSpeedMps = clamp(input.bottomSpeedMps ?? 26, 0, 45);
    const angleDeg = clamp(input.angleDeg ?? 180, 0, 360);
    const theta = angleDeg * Math.PI / 180;
    const speedSquared = bottomSpeedMps ** 2 - 2 * G * radiusM * (1 - Math.cos(theta));
    const reachesAngle = speedSquared >= 0;
    const speedMps = Math.sqrt(Math.max(0, speedSquared));
    const normalForceN = reachesAngle ? massKg * (speedSquared / radiusM + G * Math.cos(theta)) : NaN;
    const minimumBottomSpeedMps = Math.sqrt(5 * G * radiusM);
    const completesWithContact = bottomSpeedMps >= minimumBottomSpeedMps - 1e-9;
    const lossCosine = (2 * G * radiusM - bottomSpeedMps ** 2) / (3 * G * radiusM);
    const firstLossAngleDeg = completesWithContact || lossCosine < -1 || lossCosine > 1
      ? null
      : Math.acos(lossCosine) * 180 / Math.PI;
    const contactAtAngle = reachesAngle && normalForceN >= -1e-7
      && (firstLossAngleDeg === null || angleDeg <= firstLossAngleDeg + 1e-7);
    return {
      massKg,
      radiusM,
      bottomSpeedMps,
      angleDeg,
      theta,
      speedMps,
      speedSquared,
      reachesAngle,
      normalForceN,
      minimumBottomSpeedMps,
      completesWithContact,
      firstLossAngleDeg,
      contactAtAngle,
      topSpeedMps: Math.sqrt(Math.max(0, bottomSpeedMps ** 2 - 4 * G * radiusM)),
      topNormalForceN: massKg * (bottomSpeedMps ** 2 / radiusM - 5 * G),
      energyResidualJ: reachesAngle
        ? massKg * speedSquared / 2 + massKg * G * radiusM * (1 - Math.cos(theta)) - massKg * bottomSpeedMps ** 2 / 2
        : null,
      radialResidualN: reachesAngle
        ? normalForceN - massKg * G * Math.cos(theta) - massKg * speedSquared / radiusM
        : null
    };
  }

  function hillCrest(input = {}) {
    const massKg = clamp(input.massKg ?? 1000, 100, 3000);
    const radiusM = clamp(input.radiusM ?? 35, 8, 100);
    const speedMps = clamp(input.speedMps ?? 15, 0, 40);
    const requiredCentripetalN = massKg * speedMps ** 2 / radiusM;
    const normalForceN = massKg * G - requiredCentripetalN;
    const criticalSpeedMps = Math.sqrt(G * radiusM);
    return {
      massKg,
      radiusM,
      speedMps,
      requiredCentripetalN,
      normalForceN: Math.max(0, normalForceN),
      unconstrainedNormalForceN: normalForceN,
      criticalSpeedMps,
      contact: normalForceN >= -1e-9,
      apparentWeightRatio: Math.max(0, normalForceN) / (massKg * G),
      radialResidualN: massKg * G - normalForceN - requiredCentripetalN
    };
  }

  function speedScan(kind, pointCount = 100, input = {}) {
    const count = Math.max(20, Math.min(200, Math.round(pointCount)));
    const maxSpeedMps = kind === "banked" ? 55 : kind === "hill" ? 40 : 45;
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const speedMps = maxSpeedMps * index / count;
      const sample = kind === "banked"
        ? bankedTurn({ ...input, speedMps })
        : kind === "hill"
          ? hillCrest({ ...input, speedMps })
          : flatTurn({ ...input, speedMps });
      points.push(sample);
    }
    return points;
  }

  return { G, clamp, flatTurn, bankedTurn, verticalLoop, hillCrest, speedScan };
});
