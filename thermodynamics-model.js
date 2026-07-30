(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ThermodynamicsModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GAS_CONSTANT = 8.31446261815324;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function gasState(input = {}) {
    const amountMol = clamp(input.amountMol ?? 1, 1e-6, 1e6);
    const temperatureK = clamp(input.temperatureK ?? 300, 1, 1e7);
    const volumeM3 = clamp(input.volumeM3 ?? .024943, 1e-9, 1e6);
    const pressurePa = amountMol * GAS_CONSTANT * temperatureK / volumeM3;
    return { amountMol, temperatureK, volumeM3, pressurePa };
  }

  function idealGasProcess(input = {}) {
    const process = ["isochoric", "isobaric", "isothermal", "adiabatic"].includes(input.process)
      ? input.process
      : "isobaric";
    const amountMol = clamp(input.amountMol ?? 1, 1e-6, 1e6);
    const initialTemperatureK = clamp(input.initialTemperatureK ?? 300, 1, 1e7);
    const initialPressurePa = clamp(input.initialPressurePa ?? 1e5, 1, 1e10);
    const volumeRatio = clamp(input.volumeRatio ?? 1.5, .1, 10);
    const gamma = clamp(input.gamma ?? 5 / 3, 1.01, 2);
    const cvMolarJK = GAS_CONSTANT / (gamma - 1);
    const initialVolumeM3 = amountMol * GAS_CONSTANT * initialTemperatureK /
      initialPressurePa;
    let finalVolumeM3 = initialVolumeM3 * volumeRatio;
    let finalPressurePa = initialPressurePa;
    let finalTemperatureK = initialTemperatureK;
    let workByGasJ = 0;

    if (process === "isochoric") {
      finalVolumeM3 = initialVolumeM3;
      finalTemperatureK = initialTemperatureK * volumeRatio;
      finalPressurePa = initialPressurePa * volumeRatio;
    } else if (process === "isobaric") {
      finalTemperatureK = initialTemperatureK * volumeRatio;
      workByGasJ = initialPressurePa * (finalVolumeM3 - initialVolumeM3);
    } else if (process === "isothermal") {
      finalPressurePa = initialPressurePa / volumeRatio;
      workByGasJ = amountMol * GAS_CONSTANT * initialTemperatureK *
        Math.log(volumeRatio);
    } else {
      finalPressurePa = initialPressurePa / volumeRatio ** gamma;
      finalTemperatureK = initialTemperatureK /
        volumeRatio ** (gamma - 1);
      workByGasJ = (initialPressurePa * initialVolumeM3 -
        finalPressurePa * finalVolumeM3) / (gamma - 1);
    }

    const internalEnergyChangeJ = amountMol * cvMolarJK *
      (finalTemperatureK - initialTemperatureK);
    const heatIntoGasJ = process === "adiabatic"
      ? 0
      : internalEnergyChangeJ + workByGasJ;
    return {
      process,
      amountMol,
      gamma,
      cvMolarJK,
      initialTemperatureK,
      initialPressurePa,
      initialVolumeM3,
      finalTemperatureK,
      finalPressurePa,
      finalVolumeM3,
      volumeRatio,
      heatIntoGasJ,
      workByGasJ,
      internalEnergyChangeJ,
      firstLawResidualJ: internalEnergyChangeJ -
        (heatIntoGasJ - workByGasJ),
      initialIdealGasResidualJ: initialPressurePa * initialVolumeM3 -
        amountMol * GAS_CONSTANT * initialTemperatureK,
      finalIdealGasResidualJ: finalPressurePa * finalVolumeM3 -
        amountMol * GAS_CONSTANT * finalTemperatureK,
    };
  }

  function rectangularCycle(input = {}) {
    const pressureLowPa = clamp(input.pressureLowPa ?? 1e5, 1, 1e10);
    const pressureHighPa = clamp(input.pressureHighPa ?? 3e5, pressureLowPa, 1e10);
    const volumeLowM3 = clamp(input.volumeLowM3 ?? .01, 1e-9, 1e5);
    const volumeHighM3 = clamp(input.volumeHighM3 ?? .03, volumeLowM3, 1e6);
    const gamma = clamp(input.gamma ?? 5 / 3, 1.01, 2);
    const cvOverR = 1 / (gamma - 1);
    const states = [
      { name: "A", pressurePa: pressureLowPa, volumeM3: volumeLowM3 },
      { name: "B", pressurePa: pressureHighPa, volumeM3: volumeLowM3 },
      { name: "C", pressurePa: pressureHighPa, volumeM3: volumeHighM3 },
      { name: "D", pressurePa: pressureLowPa, volumeM3: volumeHighM3 },
    ];
    const legs = states.map((start, index) => {
      const end = states[(index + 1) % states.length];
      const workByGasJ = Math.abs(end.pressurePa - start.pressurePa) < 1e-9
        ? start.pressurePa * (end.volumeM3 - start.volumeM3)
        : 0;
      const internalEnergyChangeJ = cvOverR *
        (end.pressurePa * end.volumeM3 -
          start.pressurePa * start.volumeM3);
      const heatIntoGasJ = internalEnergyChangeJ + workByGasJ;
      return {
        from: start.name,
        to: end.name,
        workByGasJ,
        internalEnergyChangeJ,
        heatIntoGasJ,
      };
    });
    const netWorkJ = legs.reduce((sum, leg) => sum + leg.workByGasJ, 0);
    const netHeatJ = legs.reduce((sum, leg) => sum + leg.heatIntoGasJ, 0);
    const heatInputJ = legs.reduce(
      (sum, leg) => sum + Math.max(0, leg.heatIntoGasJ),
      0,
    );
    const heatRejectedJ = -legs.reduce(
      (sum, leg) => sum + Math.min(0, leg.heatIntoGasJ),
      0,
    );
    return {
      pressureLowPa,
      pressureHighPa,
      volumeLowM3,
      volumeHighM3,
      gamma,
      states,
      legs,
      netWorkJ,
      netHeatJ,
      heatInputJ,
      heatRejectedJ,
      efficiency: heatInputJ > 0 ? netWorkJ / heatInputJ : 0,
      geometricAreaJ: (pressureHighPa - pressureLowPa) *
        (volumeHighM3 - volumeLowM3),
      cycleInternalEnergyChangeJ: legs.reduce(
        (sum, leg) => sum + leg.internalEnergyChangeJ,
        0,
      ),
      cycleFirstLawResidualJ: netHeatJ - netWorkJ,
    };
  }

  function carnotEngine(input = {}) {
    const hotTemperatureK = clamp(input.hotTemperatureK ?? 600, 1, 1e7);
    const coldTemperatureK = clamp(
      input.coldTemperatureK ?? 300,
      1,
      hotTemperatureK,
    );
    const heatInputJ = clamp(input.heatInputJ ?? 1000, 0, 1e12);
    const efficiency = 1 - coldTemperatureK / hotTemperatureK;
    const workOutputJ = heatInputJ * efficiency;
    const heatRejectedJ = heatInputJ - workOutputJ;
    const hotReservoirEntropyChangeJK = hotTemperatureK > 0
      ? -heatInputJ / hotTemperatureK
      : 0;
    const coldReservoirEntropyChangeJK = coldTemperatureK > 0
      ? heatRejectedJ / coldTemperatureK
      : 0;
    return {
      hotTemperatureK,
      coldTemperatureK,
      heatInputJ,
      heatRejectedJ,
      workOutputJ,
      efficiency,
      hotReservoirEntropyChangeJK,
      coldReservoirEntropyChangeJK,
      totalEntropyChangeJK: hotReservoirEntropyChangeJK +
        coldReservoirEntropyChangeJK,
      energyResidualJ: heatInputJ - heatRejectedJ - workOutputJ,
    };
  }

  function actualEngine(input = {}) {
    const carnot = carnotEngine(input);
    const requestedEfficiency = clamp(input.efficiency ?? .3, 0, 1);
    const physicallyAllowed = requestedEfficiency <= carnot.efficiency + 1e-12;
    const efficiency = Math.min(requestedEfficiency, carnot.efficiency);
    const workOutputJ = carnot.heatInputJ * efficiency;
    const heatRejectedJ = carnot.heatInputJ - workOutputJ;
    const totalEntropyChangeJK = heatRejectedJ / carnot.coldTemperatureK -
      carnot.heatInputJ / carnot.hotTemperatureK;
    return {
      ...carnot,
      requestedEfficiency,
      physicallyAllowed,
      efficiency,
      workOutputJ,
      heatRejectedJ,
      totalEntropyChangeJK,
      energyResidualJ: carnot.heatInputJ - heatRejectedJ - workOutputJ,
      carnotFraction: carnot.efficiency > 0
        ? efficiency / carnot.efficiency
        : 0,
    };
  }

  return {
    GAS_CONSTANT,
    clamp,
    gasState,
    idealGasProcess,
    rectangularCycle,
    carnotEngine,
    actualEngine,
  };
});
