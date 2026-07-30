(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PowerSourceModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function operatingPoint(input = {}) {
    const emfV = clamp(input.emfV ?? 12, .01, 1e6);
    const internalResistanceOhm = clamp(
      input.internalResistanceOhm ?? 2,
      1e-6,
      1e9,
    );
    const loadResistanceOhm = clamp(
      input.loadResistanceOhm ?? 4,
      0,
      1e12,
    );
    const currentA = emfV /
      (internalResistanceOhm + loadResistanceOhm);
    const terminalVoltageV = currentA * loadResistanceOhm;
    const internalDropV = currentA * internalResistanceOhm;
    const sourcePowerW = emfV * currentA;
    const loadPowerW = currentA ** 2 * loadResistanceOhm;
    const internalLossW = currentA ** 2 * internalResistanceOhm;
    const efficiency = sourcePowerW > 0 ? loadPowerW / sourcePowerW : 0;
    const openCircuit = loadResistanceOhm >= 1e9 * internalResistanceOhm;
    const shortCircuit = loadResistanceOhm === 0;
    return {
      emfV,
      internalResistanceOhm,
      loadResistanceOhm,
      currentA,
      terminalVoltageV,
      internalDropV,
      sourcePowerW,
      loadPowerW,
      internalLossW,
      efficiency,
      openCircuit,
      shortCircuit,
      matched: Math.abs(loadResistanceOhm - internalResistanceOhm) <=
        1e-9 * Math.max(1, internalResistanceOhm),
      voltageResidualV: emfV - terminalVoltageV - internalDropV,
      powerResidualW: sourcePowerW - loadPowerW - internalLossW,
    };
  }

  function maximumPower(input = {}) {
    const emfV = clamp(input.emfV ?? 12, .01, 1e6);
    const internalResistanceOhm = clamp(
      input.internalResistanceOhm ?? 2,
      1e-6,
      1e9,
    );
    const matched = operatingPoint({
      emfV,
      internalResistanceOhm,
      loadResistanceOhm: internalResistanceOhm,
    });
    return {
      emfV,
      internalResistanceOhm,
      matchedLoadOhm: internalResistanceOhm,
      maximumLoadPowerW: emfV ** 2 / (4 * internalResistanceOhm),
      matchedCurrentA: matched.currentA,
      matchedTerminalVoltageV: matched.terminalVoltageV,
      matchedEfficiency: matched.efficiency,
    };
  }

  function characteristic(input = {}) {
    const emfV = clamp(input.emfV ?? 12, .01, 1e6);
    const internalResistanceOhm = clamp(
      input.internalResistanceOhm ?? 2,
      1e-6,
      1e9,
    );
    const currentA = clamp(
      input.currentA ?? 0,
      0,
      emfV / internalResistanceOhm,
    );
    return {
      emfV,
      internalResistanceOhm,
      currentA,
      terminalVoltageV: emfV - currentA * internalResistanceOhm,
      openCircuitVoltageV: emfV,
      shortCircuitCurrentA: emfV / internalResistanceOhm,
      slopeVoltPerAmpere: -internalResistanceOhm,
    };
  }

  function compareInternalResistance(input = {}) {
    const common = {
      emfV: input.emfV,
      loadResistanceOhm: input.loadResistanceOhm,
    };
    const healthy = operatingPoint({
      ...common,
      internalResistanceOhm: input.healthyResistanceOhm ?? .5,
    });
    const aged = operatingPoint({
      ...common,
      internalResistanceOhm: input.agedResistanceOhm ?? 2,
    });
    return {
      healthy,
      aged,
      terminalVoltageDropV:
        healthy.terminalVoltageV - aged.terminalVoltageV,
      loadPowerRatio: healthy.loadPowerW > 0
        ? aged.loadPowerW / healthy.loadPowerW
        : 0,
      lossRatio: healthy.internalLossW > 0
        ? aged.internalLossW / healthy.internalLossW
        : 0,
    };
  }

  function inferFromMeasurements(input = {}) {
    const current1A = finite(input.current1A, 1);
    const voltage1V = finite(input.voltage1V, 10);
    const current2A = finite(input.current2A, 3);
    const voltage2V = finite(input.voltage2V, 6);
    const deltaCurrentA = current2A - current1A;
    const valid = Math.abs(deltaCurrentA) > 1e-12;
    const internalResistanceOhm = valid
      ? (voltage1V - voltage2V) / deltaCurrentA
      : NaN;
    const emfV = valid
      ? voltage1V + current1A * internalResistanceOhm
      : NaN;
    return {
      current1A,
      voltage1V,
      current2A,
      voltage2V,
      valid: valid && internalResistanceOhm >= 0,
      internalResistanceOhm,
      emfV,
      voltage1ResidualV: valid
        ? voltage1V - (emfV - current1A * internalResistanceOhm)
        : NaN,
      voltage2ResidualV: valid
        ? voltage2V - (emfV - current2A * internalResistanceOhm)
        : NaN,
    };
  }

  return {
    clamp,
    operatingPoint,
    maximumPower,
    characteristic,
    compareInternalResistance,
    inferFromMeasurements,
  };
});
