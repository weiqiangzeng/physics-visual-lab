(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InteractionModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function vectorResultant(input = {}) {
    const force1N = clamp(input.force1N ?? 6, 0, 1e8);
    const force2N = clamp(input.force2N ?? 8, 0, 1e8);
    const angle1Rad = finite(input.angle1Rad, 0);
    const angle2Rad = finite(input.angle2Rad, Math.PI / 2);
    const force1 = {
      x: force1N * Math.cos(angle1Rad),
      y: force1N * Math.sin(angle1Rad),
    };
    const force2 = {
      x: force2N * Math.cos(angle2Rad),
      y: force2N * Math.sin(angle2Rad),
    };
    const resultant = {
      x: force1.x + force2.x,
      y: force1.y + force2.y,
    };
    const resultantN = Math.hypot(resultant.x, resultant.y);
    return {
      force1N,
      force2N,
      angle1Rad,
      angle2Rad,
      force1,
      force2,
      resultant,
      resultantN,
      resultantAngleRad: Math.atan2(resultant.y, resultant.x),
      componentResidualX: resultant.x - force1.x - force2.x,
      componentResidualY: resultant.y - force1.y - force2.y,
    };
  }

  function spring(input = {}) {
    const springConstantNm = clamp(input.springConstantNm ?? 40, .01, 1e8);
    const deformationM = finite(input.deformationM, .15);
    const elasticLimitM = clamp(input.elasticLimitM ?? .25, 1e-6, 1e4);
    const withinElasticLimit = Math.abs(deformationM) <= elasticLimitM;
    const hookeForceN = -springConstantNm * deformationM;
    const elasticEnergyJ = .5 * springConstantNm * deformationM ** 2;
    return {
      springConstantNm,
      deformationM,
      elasticLimitM,
      withinElasticLimit,
      hookeForceN,
      elasticEnergyJ,
      modelStatement: withinElasticLimit
        ? "hooke-valid"
        : "beyond-elastic-limit",
    };
  }

  function thirdLaw(input = {}) {
    const interactionForceN = finite(input.interactionForceN, 12);
    const mass1Kg = clamp(input.mass1Kg ?? 2, .01, 1e8);
    const mass2Kg = clamp(input.mass2Kg ?? 5, .01, 1e8);
    const forceOn1N = interactionForceN;
    const forceOn2N = -interactionForceN;
    return {
      interactionForceN,
      mass1Kg,
      mass2Kg,
      forceOn1N,
      forceOn2N,
      acceleration1Ms2: forceOn1N / mass1Kg,
      acceleration2Ms2: forceOn2N / mass2Kg,
      pairResidualN: forceOn1N + forceOn2N,
      sameInteraction: true,
      differentBodies: true,
    };
  }

  function connectedBodies(input = {}) {
    const mass1Kg = clamp(input.mass1Kg ?? 2, .01, 1e8);
    const mass2Kg = clamp(input.mass2Kg ?? 3, .01, 1e8);
    const externalForceN = finite(input.externalForceN, 20);
    const totalMassKg = mass1Kg + mass2Kg;
    const accelerationMs2 = externalForceN / totalMassKg;
    const tensionN = mass1Kg * accelerationMs2;
    return {
      mass1Kg,
      mass2Kg,
      externalForceN,
      totalMassKg,
      accelerationMs2,
      tensionN,
      wholeSystemResidualN:
        externalForceN - totalMassKg * accelerationMs2,
      body1ResidualN: tensionN - mass1Kg * accelerationMs2,
      body2ResidualN:
        externalForceN - tensionN - mass2Kg * accelerationMs2,
      idealConnector: true,
      frictionless: true,
    };
  }

  return {
    clamp,
    vectorResultant,
    spring,
    thirdLaw,
    connectedBodies,
  };
});
