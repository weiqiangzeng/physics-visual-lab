(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ElectrostaticConductorModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COULOMB_CONSTANT = 8.9875517923e9;
  const VACUUM_PERMITTIVITY = 8.8541878128e-12;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function pointField(chargeC, sourceX, sourceY, x, y) {
    const dx = x - sourceX;
    const dy = y - sourceY;
    const r2 = Math.max(1e-18, dx * dx + dy * dy);
    const scale = COULOMB_CONSTANT * chargeC / r2 ** 1.5;
    return { x: scale * dx, y: scale * dy };
  }

  function pointPotential(chargeC, sourceX, sourceY, x, y) {
    const distance = Math.max(1e-9, Math.hypot(x - sourceX, y - sourceY));
    return COULOMB_CONSTANT * chargeC / distance;
  }

  function sphereImages(input = {}) {
    const radiusM = clamp(input.radiusM ?? 1, .01, 1e4);
    const externalDistanceM = clamp(
      input.externalDistanceM ?? 2,
      radiusM * 1.001,
      radiusM * 100,
    );
    const externalChargeC = finite(input.externalChargeC, 1e-9);
    const grounded = Boolean(input.grounded);
    const imageChargeC = -externalChargeC * radiusM / externalDistanceM;
    const imageDistanceM = radiusM ** 2 / externalDistanceM;
    const centralImageChargeC = grounded ? 0 : -imageChargeC;
    return {
      radiusM,
      externalDistanceM,
      externalChargeC,
      grounded,
      imageChargeC,
      imageDistanceM,
      centralImageChargeC,
      conductorNetChargeC: grounded ? imageChargeC : 0,
      conductorPotentialV: grounded
        ? 0
        : COULOMB_CONSTANT * centralImageChargeC / radiusM,
    };
  }

  function inducedSphere(input = {}) {
    const images = sphereImages(input);
    const probeRadiusM = clamp(input.probeRadiusM ?? images.radiusM, 0, images.radiusM * 20);
    const probeAngleRad = finite(input.probeAngleRad, 0);
    const sampleRadiusM = Math.max(probeRadiusM, images.radiusM);
    const x = sampleRadiusM * Math.cos(probeAngleRad);
    const y = sampleRadiusM * Math.sin(probeAngleRad);
    const charges = [
      [images.externalChargeC, images.externalDistanceM, 0],
      [images.imageChargeC, images.imageDistanceM, 0],
      [images.centralImageChargeC, 0, 0],
    ];
    let potentialV = 0;
    let fieldXVm = 0;
    let fieldYVm = 0;
    for (const [charge, sx, sy] of charges) {
      if (charge === 0) continue;
      potentialV += pointPotential(charge, sx, sy, x, y);
      const field = pointField(charge, sx, sy, x, y);
      fieldXVm += field.x;
      fieldYVm += field.y;
    }
    const insideConductor = probeRadiusM < images.radiusM;
    if (insideConductor) {
      potentialV = images.conductorPotentialV;
      fieldXVm = 0;
      fieldYVm = 0;
    }
    const nx = Math.cos(probeAngleRad);
    const ny = Math.sin(probeAngleRad);
    const surfaceNormalFieldVm = fieldXVm * nx + fieldYVm * ny;
    const surfaceChargeDensityCm2 = VACUUM_PERMITTIVITY * surfaceNormalFieldVm;
    return {
      ...images,
      probeRadiusM,
      probeAngleRad,
      probeX: probeRadiusM * nx,
      probeY: probeRadiusM * ny,
      insideConductor,
      potentialV,
      fieldXVm,
      fieldYVm,
      fieldMagnitudeVm: Math.hypot(fieldXVm, fieldYVm),
      surfaceNormalFieldVm,
      surfaceChargeDensityCm2,
      tangentialFieldVm: -fieldXVm * ny + fieldYVm * nx,
    };
  }

  function uniformFieldSphere(input = {}) {
    const radiusM = clamp(input.radiusM ?? 1, .01, 1e4);
    const externalFieldVm = finite(input.externalFieldVm, 1000);
    const probeRadiusM = clamp(input.probeRadiusM ?? radiusM, 0, radiusM * 20);
    const probeAngleRad = finite(input.probeAngleRad, 0);
    const insideConductor = probeRadiusM < radiusM;
    let radialFieldVm = 0;
    let tangentialFieldVm = 0;
    let potentialV = 0;
    if (!insideConductor) {
      const r = Math.max(radiusM, probeRadiusM);
      const ratio = radiusM ** 3 / r ** 3;
      radialFieldVm = externalFieldVm * (1 + 2 * ratio) *
        Math.cos(probeAngleRad);
      tangentialFieldVm = -externalFieldVm * (1 - ratio) *
        Math.sin(probeAngleRad);
      potentialV = -externalFieldVm *
        (r - radiusM ** 3 / r ** 2) * Math.cos(probeAngleRad);
    }
    const cos = Math.cos(probeAngleRad);
    const sin = Math.sin(probeAngleRad);
    const fieldXVm = radialFieldVm * cos - tangentialFieldVm * sin;
    const fieldYVm = radialFieldVm * sin + tangentialFieldVm * cos;
    const surfaceChargeDensityCm2 = 3 * VACUUM_PERMITTIVITY *
      externalFieldVm * Math.cos(probeAngleRad);
    return {
      radiusM,
      externalFieldVm,
      probeRadiusM,
      probeAngleRad,
      insideConductor,
      potentialV,
      radialFieldVm,
      tangentialFieldVm,
      fieldXVm,
      fieldYVm,
      fieldMagnitudeVm: Math.hypot(fieldXVm, fieldYVm),
      surfaceChargeDensityCm2,
      surfaceTangentialResidualVm: probeRadiusM === radiusM
        ? tangentialFieldVm
        : null,
    };
  }

  function redistribution(input = {}) {
    const externalFieldVm = finite(input.externalFieldVm, 1000);
    const progress = clamp(input.progress ?? 0, 0, 1);
    const equilibriumFraction = progress >= 1
      ? 1
      : 1 - Math.exp(-6 * progress);
    const interiorFieldVm = externalFieldVm * (1 - equilibriumFraction);
    return {
      externalFieldVm,
      progress,
      equilibriumFraction,
      interiorFieldVm,
      leftSurfaceChargeDensityCm2: -3 * VACUUM_PERMITTIVITY *
        externalFieldVm * equilibriumFraction,
      rightSurfaceChargeDensityCm2: 3 * VACUUM_PERMITTIVITY *
        externalFieldVm * equilibriumFraction,
      netInducedChargeC: 0,
      teachingTimeScale: true,
    };
  }

  function concentricCavity(input = {}) {
    const cavityRadiusM = clamp(input.cavityRadiusM ?? .5, .01, 1e3);
    const outerRadiusM = clamp(
      input.outerRadiusM ?? 1,
      cavityRadiusM * 1.01,
      1e4,
    );
    const internalChargeC = finite(input.internalChargeC, 1e-9);
    const conductorNetChargeC = finite(input.conductorNetChargeC, 0);
    const probeRadiusM = clamp(input.probeRadiusM ?? .25, 1e-6, outerRadiusM * 20);
    const innerSurfaceChargeC = -internalChargeC;
    const outerSurfaceChargeC = conductorNetChargeC + internalChargeC;
    let region = "cavity";
    let radialFieldVm = COULOMB_CONSTANT * internalChargeC /
      probeRadiusM ** 2;
    let enclosedChargeC = internalChargeC;
    if (probeRadiusM >= cavityRadiusM && probeRadiusM <= outerRadiusM) {
      region = "conductor";
      radialFieldVm = 0;
      enclosedChargeC = internalChargeC + innerSurfaceChargeC;
    } else if (probeRadiusM > outerRadiusM) {
      region = "outside";
      const totalChargeC = internalChargeC + conductorNetChargeC;
      radialFieldVm = COULOMB_CONSTANT * totalChargeC / probeRadiusM ** 2;
      enclosedChargeC = totalChargeC;
    }
    const gaussianFluxVm = enclosedChargeC / VACUUM_PERMITTIVITY;
    return {
      cavityRadiusM,
      outerRadiusM,
      internalChargeC,
      conductorNetChargeC,
      probeRadiusM,
      innerSurfaceChargeC,
      outerSurfaceChargeC,
      region,
      radialFieldVm,
      fieldMagnitudeVm: Math.abs(radialFieldVm),
      enclosedChargeC,
      gaussianFluxVm,
      conductorFieldResidualVm: region === "conductor" ? radialFieldVm : null,
      chargeLedgerResidualC: conductorNetChargeC -
        (innerSurfaceChargeC + outerSurfaceChargeC),
    };
  }

  return {
    COULOMB_CONSTANT,
    VACUUM_PERMITTIVITY,
    clamp,
    pointField,
    pointPotential,
    sphereImages,
    inducedSphere,
    uniformFieldSphere,
    redistribution,
    concentricCavity,
  };
});
