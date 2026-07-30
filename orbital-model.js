(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.OrbitalModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const EARTH = Object.freeze({
    label: "地球",
    radiusM: 6_371_000,
    mu: 3.986004418e14,
    siderealPeriodS: 86_164.0905
  });
  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function circularState(altitudeKm = 400) {
    const boundedAltitudeKm = clamp(altitudeKm, 0, 80_000);
    const radiusM = EARTH.radiusM + boundedAltitudeKm * 1000;
    const speedMps = Math.sqrt(EARTH.mu / radiusM);
    const periodS = TAU * Math.sqrt(radiusM ** 3 / EARTH.mu);
    const gravityMps2 = EARTH.mu / radiusM ** 2;
    const kineticJkg = speedMps ** 2 / 2;
    const potentialJkg = -EARTH.mu / radiusM;
    const totalJkg = kineticJkg + potentialJkg;
    const escapeSpeedMps = Math.sqrt(2 * EARTH.mu / radiusM);
    return {
      altitudeKm: boundedAltitudeKm,
      radiusM,
      radiusKm: radiusM / 1000,
      speedMps,
      speedKms: speedMps / 1000,
      periodS,
      periodMinutes: periodS / 60,
      periodHours: periodS / 3600,
      gravityMps2,
      kineticJkg,
      potentialJkg,
      totalJkg,
      escapeSpeedMps,
      forceBalanceResidualMps2: gravityMps2 - speedMps ** 2 / radiusM,
      energyResidualJkg: totalJkg + EARTH.mu / (2 * radiusM)
    };
  }

  function synchronousState(rotationPeriodS = EARTH.siderealPeriodS) {
    const periodS = clamp(rotationPeriodS, 3_600, 200_000);
    const radiusM = Math.cbrt(EARTH.mu * (periodS / TAU) ** 2);
    const state = circularState((radiusM - EARTH.radiusM) / 1000);
    return {
      ...state,
      targetPeriodS: periodS,
      periodResidualS: state.periodS - periodS,
      isGeostationaryOnlyIfEquatorialPrograde: true,
      boundary: "周期等于地球自转周期只得到同步轨道；还需圆形、赤道面内且与地球同向，才是地球静止轨道。"
    };
  }

  function hohmannTransfer(startAltitudeKm = 400, targetAltitudeKm = 35_793.17) {
    const start = circularState(startAltitudeKm);
    const target = circularState(targetAltitudeKm);
    const inner = start.radiusM <= target.radiusM ? start : target;
    const outer = start.radiusM <= target.radiusM ? target : start;
    const semiMajorM = (inner.radiusM + outer.radiusM) / 2;
    const transferPerigeeSpeedMps = Math.sqrt(EARTH.mu * (2 / inner.radiusM - 1 / semiMajorM));
    const transferApogeeSpeedMps = Math.sqrt(EARTH.mu * (2 / outer.radiusM - 1 / semiMajorM));
    const deltaVInnerMps = transferPerigeeSpeedMps - inner.speedMps;
    const deltaVOuterMps = outer.speedMps - transferApogeeSpeedMps;
    const transferTimeS = Math.PI * Math.sqrt(semiMajorM ** 3 / EARTH.mu);
    const outward = start.radiusM <= target.radiusM;
    return {
      start,
      target,
      inner,
      outer,
      outward,
      semiMajorM,
      transferPerigeeSpeedMps,
      transferApogeeSpeedMps,
      firstDeltaVMps: outward ? deltaVInnerMps : -deltaVOuterMps,
      secondDeltaVMps: outward ? deltaVOuterMps : -deltaVInnerMps,
      totalDeltaVMps: Math.abs(deltaVInnerMps) + Math.abs(deltaVOuterMps),
      transferTimeS,
      transferTimeHours: transferTimeS / 3600,
      transferSpecificEnergyJkg: -EARTH.mu / (2 * semiMajorM),
      boundary: "霍曼转移假设两条共面圆轨道和两次瞬时切向变速，不包含大气阻力、有限推力、倾角变化或其他天体摄动。"
    };
  }

  function tangentialImpulseState(altitudeKm = 400, speedRatio = 1) {
    const circular = circularState(altitudeKm);
    const boundedRatio = clamp(speedRatio, 0.45, 1.65);
    const speedMps = circular.speedMps * boundedRatio;
    const specificEnergyJkg = speedMps ** 2 / 2 - EARTH.mu / circular.radiusM;
    const angularMomentumM2ps = circular.radiusM * speedMps;
    const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * specificEnergyJkg * angularMomentumM2ps ** 2 / EARTH.mu ** 2));
    const isBound = specificEnergyJkg < 0;
    const semiMajorM = isBound ? -EARTH.mu / (2 * specificEnergyJkg) : Infinity;
    let perigeeM;
    let apogeeM;
    if (isBound) {
      perigeeM = semiMajorM * (1 - eccentricity);
      apogeeM = semiMajorM * (1 + eccentricity);
    } else {
      perigeeM = circular.radiusM;
      apogeeM = Infinity;
    }
    const impactsEarth = isBound && perigeeM < EARTH.radiusM;
    const classification = !isBound
      ? "escape"
      : impactsEarth
        ? "impact"
        : Math.abs(boundedRatio - 1) < 0.005
          ? "circular"
          : "elliptic";
    return {
      circular,
      speedRatio: boundedRatio,
      speedMps,
      specificEnergyJkg,
      angularMomentumM2ps,
      eccentricity,
      isBound,
      semiMajorM,
      perigeeM,
      apogeeM,
      perigeeAltitudeKm: (perigeeM - EARTH.radiusM) / 1000,
      apogeeAltitudeKm: Number.isFinite(apogeeM) ? (apogeeM - EARTH.radiusM) / 1000 : Infinity,
      impactsEarth,
      classification,
      escapeRatio: Math.SQRT2,
      escapeSpeedMps: circular.escapeSpeedMps,
      energyResidualJkg: specificEnergyJkg - (isBound ? -EARTH.mu / (2 * semiMajorM) : specificEnergyJkg),
      boundary: "瞬时切向变速后的轨道由二体能量和角动量决定；轨道穿过地球时只标记撞地，不继续计算地球内部运动。"
    };
  }

  function radiusScan(pointCount = 120, maxAltitudeKm = 50_000) {
    const count = Math.max(20, Math.min(240, Math.round(pointCount)));
    const maximum = clamp(maxAltitudeKm, 2_000, 80_000);
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const altitudeKm = maximum * index / count;
      points.push(circularState(altitudeKm));
    }
    return points;
  }

  return {
    EARTH,
    TAU,
    clamp,
    circularState,
    synchronousState,
    hohmannTransfer,
    tangentialImpulseState,
    radiusScan
  };
});
