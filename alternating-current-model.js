(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AlternatingCurrentModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function generator(input = {}) {
    const magneticFieldT = clamp(input.magneticFieldT ?? .8, 0, 2);
    const turns = Math.round(clamp(input.turns ?? 200, 1, 2000));
    const areaM2 = clamp(input.areaM2 ?? .015, .0001, .1);
    const frequencyHz = clamp(input.frequencyHz ?? 50, 0, 200);
    const timeS = finite(input.timeS, 0);
    const loadResistanceOhm = clamp(input.loadResistanceOhm ?? 100, .1, 1e5);
    const angularFrequencyRadS = 2 * Math.PI * frequencyHz;
    const phaseRad = angularFrequencyRadS * timeS;
    const fluxPerTurnWb = magneticFieldT * areaM2 * Math.cos(phaseRad);
    const fluxLinkageWbTurn = turns * fluxPerTurnWb;
    const emfPeakV = turns * magneticFieldT * areaM2 * angularFrequencyRadS;
    const emfV = emfPeakV * Math.sin(phaseRad);
    const emfRmsV = emfPeakV / Math.sqrt(2);
    const currentA = emfV / loadResistanceOhm;
    const instantaneousPowerW = emfV * currentA;
    const averagePowerW = emfRmsV ** 2 / loadResistanceOhm;
    return {
      magneticFieldT,
      turns,
      areaM2,
      frequencyHz,
      timeS,
      loadResistanceOhm,
      angularFrequencyRadS,
      phaseRad,
      periodS: frequencyHz > 0 ? 1 / frequencyHz : Infinity,
      fluxPerTurnWb,
      fluxLinkageWbTurn,
      emfPeakV,
      emfV,
      emfRmsV,
      currentA,
      instantaneousPowerW,
      averagePowerW,
      faradayResidualV: emfV - emfPeakV * Math.sin(phaseRad),
    };
  }

  function sineRms(input = {}) {
    const peakVoltageV = clamp(input.peakVoltageV ?? 311.127, 0, 2000);
    const frequencyHz = clamp(input.frequencyHz ?? 50, .1, 200);
    const timeS = finite(input.timeS, 0);
    const resistanceOhm = clamp(input.resistanceOhm ?? 100, .1, 1e5);
    const phaseRad = 2 * Math.PI * frequencyHz * timeS;
    const instantaneousVoltageV = peakVoltageV * Math.sin(phaseRad);
    const rmsVoltageV = peakVoltageV / Math.sqrt(2);
    const cycleAverageVoltageV = 0;
    const meanAbsoluteVoltageV = 2 * peakVoltageV / Math.PI;
    const instantaneousPowerW = instantaneousVoltageV ** 2 / resistanceOhm;
    const averagePowerW = rmsVoltageV ** 2 / resistanceOhm;
    return {
      peakVoltageV,
      frequencyHz,
      timeS,
      resistanceOhm,
      phaseRad,
      periodS: 1 / frequencyHz,
      instantaneousVoltageV,
      rmsVoltageV,
      cycleAverageVoltageV,
      meanAbsoluteVoltageV,
      instantaneousPowerW,
      averagePowerW,
      equivalentDcVoltageV: rmsVoltageV,
      powerResidualW: averagePowerW - peakVoltageV ** 2 /
          (2 * resistanceOhm),
    };
  }

  function idealTransformer(input = {}) {
    const primaryRmsV = clamp(input.primaryRmsV ?? 220, 0, 2e4);
    const primaryTurns = Math.round(clamp(input.primaryTurns ?? 200, 1, 5000));
    const secondaryTurns = Math.round(
      clamp(input.secondaryTurns ?? 1000, 1, 2e4),
    );
    const loadResistanceOhm = clamp(input.loadResistanceOhm ?? 440, .1, 1e6);
    const frequencyHz = clamp(input.frequencyHz ?? 50, 0, 200);
    const active = frequencyHz > 0;
    const turnsRatio = secondaryTurns / primaryTurns;
    const secondaryRmsV = active ? primaryRmsV * turnsRatio : 0;
    const secondaryRmsA = active ? secondaryRmsV / loadResistanceOhm : 0;
    const outputPowerW = secondaryRmsV * secondaryRmsA;
    const primaryRmsA = primaryRmsV > 0 ? outputPowerW / primaryRmsV : 0;
    return {
      primaryRmsV,
      primaryTurns,
      secondaryTurns,
      loadResistanceOhm,
      frequencyHz,
      active,
      turnsRatio,
      secondaryRmsV,
      primaryRmsA,
      secondaryRmsA,
      inputPowerW: primaryRmsV * primaryRmsA,
      outputPowerW,
      voltageRatioResidualV: secondaryRmsV - primaryRmsV * turnsRatio,
      currentRatioResidualA: primaryRmsA - secondaryRmsA * turnsRatio,
      powerResidualW: primaryRmsV * primaryRmsA - outputPowerW,
    };
  }

  function transmission(input = {}) {
    const sentPowerW = clamp(input.sentPowerW ?? 1e6, 1e3, 1e9);
    const transmissionVoltageV = clamp(
      input.transmissionVoltageV ?? 1e4,
      1e3,
      1e6,
    );
    const lineResistanceOhm = clamp(input.lineResistanceOhm ?? 20, .01, 1e4);
    const lineCurrentA = sentPowerW / transmissionVoltageV;
    const lineLossW = lineCurrentA ** 2 * lineResistanceOhm;
    const deliveredPowerW = Math.max(0, sentPowerW - lineLossW);
    const voltageDropV = lineCurrentA * lineResistanceOhm;
    const efficiency = deliveredPowerW / sentPowerW;
    return {
      sentPowerW,
      transmissionVoltageV,
      lineResistanceOhm,
      lineCurrentA,
      lineLossW,
      deliveredPowerW,
      voltageDropV,
      receivingVoltageV: Math.max(0, transmissionVoltageV - voltageDropV),
      efficiency,
      lossFraction: lineLossW / sentPowerW,
      powerLedgerResidualW: sentPowerW - deliveredPowerW -
        Math.min(sentPowerW, lineLossW),
    };
  }

  function voltageComparison(input = {}, voltagesV = []) {
    const values = voltagesV.length
      ? voltagesV
      : [1e4, 2e4, 5e4, 1e5, 2e5, 5e5];
    return values.map((transmissionVoltageV) =>
      transmission({ ...input, transmissionVoltageV })
    );
  }

  return {
    clamp,
    generator,
    sineRms,
    idealTransformer,
    transmission,
    voltageComparison,
  };
});
