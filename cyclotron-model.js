(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CyclotronModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const E = 1.602176634e-19;
  const U = 1.6605390666e-27;
  const C = 299792458;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      fieldT: clamp(input.fieldT ?? 1.2, 0.1, 3),
      gapVoltageKv: clamp(input.gapVoltageKv ?? 30, 1, 200),
      deeRadiusM: clamp(input.deeRadiusM ?? 0.5, 0.05, 1.5),
      massU: clamp(input.massU ?? 1.007276, 0.1, 20),
      chargeE: clamp(input.chargeE ?? 1, 1, 5),
      initialEnergyKev: clamp(input.initialEnergyKev ?? 1, 0, 100),
      crossing: Math.round(clamp(input.crossing ?? 0, 0, 3000)),
      rfRatio: clamp(input.rfRatio ?? 1, 0.9, 1.1),
    };
  }

  function solve(input = {}) {
    const n = normalize(input);
    const chargeC = n.chargeE * E;
    const massKg = n.massU * U;
    const cyclotronFrequencyHz = chargeC * n.fieldT / (2 * Math.PI * massKg);
    const periodS = 1 / cyclotronFrequencyHz;
    const gainPerCrossingJ = chargeC * n.gapVoltageKv * 1000;
    const initialEnergyJ = n.initialEnergyKev * 1000 * E;
    const kineticJ = initialEnergyJ + n.crossing * gainPerCrossingJ;
    const speedMs = Math.sqrt(2 * kineticJ / massKg);
    const orbitRadiusM = massKg * speedMs / (chargeC * n.fieldT);
    const maxEnergyJ = chargeC ** 2 * n.fieldT ** 2 * n.deeRadiusM ** 2 / (2 * massKg);
    const crossingsToEdge = Math.max(0, Math.ceil((maxEnergyJ - initialEnergyJ) / gainPerCrossingJ));
    const timeToEdgeS = crossingsToEdge * periodS / 2;
    const gamma = 1 + kineticJ / (massKg * C ** 2);
    const relativisticFrequencyHz = cyclotronFrequencyHz / gamma;
    return {
      ...n, chargeC, massKg, cyclotronFrequencyHz, relativisticFrequencyHz, periodS,
      gainPerCrossingJ, gainPerCrossingKev: n.chargeE * n.gapVoltageKv,
      initialEnergyJ, kineticJ, kineticMev: kineticJ / E / 1e6,
      speedMs, orbitRadiusM, maxEnergyJ, maxEnergyMev: maxEnergyJ / E / 1e6,
      crossingsToEdge, timeToEdgeS, gamma,
      nonRelativisticValid: speedMs < 0.1 * C,
      radiusResidualM: orbitRadiusM - Math.sqrt(2 * massKg * kineticJ) / (chargeC * n.fieldT),
    };
  }

  function crossingSequence(input = {}, maxCrossings) {
    const n = normalize(input);
    const base = solve({ ...n, crossing: 0 });
    const limit = Math.min(maxCrossings ?? base.crossingsToEdge, 3000);
    const rfHz = base.cyclotronFrequencyHz * n.rfRatio;
    let kineticJ = base.initialEnergyJ;
    let phaseErrorRad = 0;
    let timeS = 0;
    const rows = [];
    for (let crossing = 0; crossing <= limit; crossing += 1) {
      const gamma = 1 + kineticJ / (base.massKg * C ** 2);
      const frequencyHz = base.cyclotronFrequencyHz / gamma;
      const speedMs = C * Math.sqrt(1 - 1 / gamma ** 2);
      const nonRelSpeedMs = Math.sqrt(2 * kineticJ / base.massKg);
      const momentum = gamma * base.massKg * speedMs;
      const radiusM = momentum / (base.chargeC * n.fieldT);
      rows.push({ crossing, timeS, kineticJ, kineticMev: kineticJ / E / 1e6, phaseErrorRad, gainFactor: Math.cos(phaseErrorRad), frequencyHz, speedMs: crossing ? speedMs : nonRelSpeedMs, radiusM });
      if (crossing === limit || radiusM >= n.deeRadiusM) break;
      const halfPeriodS = 1 / (2 * frequencyHz);
      phaseErrorRad += 2 * Math.PI * rfHz * halfPeriodS - Math.PI;
      timeS += halfPeriodS;
      kineticJ = Math.max(0, kineticJ + base.gainPerCrossingJ * Math.cos(phaseErrorRad));
    }
    return rows;
  }

  function orbitArcs(input = {}, crossing) {
    const n = normalize(input);
    const count = Math.min(Math.round(crossing ?? n.crossing), solve(n).crossingsToEdge, 1200);
    return Array.from({ length: count + 1 }, (_, index) => {
      const state = solve({ ...n, crossing: index });
      return { crossing: index, radiusM: state.orbitRadiusM, side: index % 2 ? 1 : -1, kineticMev: state.kineticMev };
    });
  }

  return { constants: { E, U, C }, normalize, solve, crossingSequence, orbitArcs };
});
