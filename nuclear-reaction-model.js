(function (root, factory) {
  const bindingModel = root && root.BindingEnergyModel
    ? root.BindingEnergyModel
    : (typeof module !== "undefined" && module.exports ? require("./binding-energy-model.js") : null);
  const model = factory(bindingModel);
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.NuclearReactionModel = model;
})(typeof window !== "undefined" ? window : globalThis, function (bindingModel) {
  if (!bindingModel) throw new Error("BindingEnergyModel is required");

  const ALPHA = 7.2973525693e-3;
  const U_TO_MEV = bindingModel.U_TO_MEV;
  const D_MASS_U = 2.01410177812;
  const T_MASS_U = 3.0160492779;
  const NUCLEAR_CONTACT_FM = 4;
  const COULOMB_MEV_FM = 1.43996448;
  const DT_REACTION = bindingModel.reactionState("fusion");
  const FISSION_REACTION = bindingModel.reactionState("fission");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function fissionEvent(progress = 1) {
    const boundedProgress = clamp(progress, 0, 1);
    return {
      ...FISSION_REACTION,
      progress: boundedProgress,
      releasedEnergyMeV: FISSION_REACTION.qValueMeV * boundedProgress,
      emittedNeutrons: 3,
      description: "²³⁵U+n→¹⁴¹Ba+⁹²Kr+3n"
    };
  }

  function criticalControlAbsorption(input = {}) {
    const neutronYield = clamp(input.neutronYield ?? 2.5, 1, 4);
    const fissionProbability = clamp(input.fissionProbability ?? 0.65, 0, 1);
    const escapeFraction = clamp(input.escapeFraction ?? 0.15, 0, 0.95);
    const uncontrolledK = neutronYield * fissionProbability * (1 - escapeFraction);
    return uncontrolledK <= 1 ? 0 : clamp(1 - 1 / uncontrolledK, 0, 0.95);
  }

  function chainState(input = {}) {
    const neutronYield = clamp(input.neutronYield ?? 2.5, 1, 4);
    const fissionProbability = clamp(input.fissionProbability ?? 0.65, 0, 1);
    const escapeFraction = clamp(input.escapeFraction ?? 0.15, 0, 0.95);
    const controlAbsorption = clamp(input.controlAbsorption ?? 0.276, 0, 0.95);
    const initialNeutrons = clamp(input.initialNeutrons ?? 1, 0.1, 20);
    const generationCount = Math.max(1, Math.min(12, Math.round(input.generationCount ?? 7)));
    const retentionProbability = (1 - escapeFraction) * (1 - controlAbsorption);
    const productiveProbability = fissionProbability * retentionProbability;
    const kEffective = neutronYield * productiveProbability;
    const status = kEffective < 0.98 ? "subcritical" : kEffective > 1.02 ? "supercritical" : "critical";
    const generations = [];
    let incomingNeutrons = initialNeutrons;
    let cumulativeFissions = 0;
    for (let generation = 0; generation < generationCount; generation += 1) {
      const expectedFissions = incomingNeutrons * productiveProbability;
      const producedNeutrons = expectedFissions * neutronYield;
      cumulativeFissions += expectedFissions;
      generations.push({
        generation,
        incomingNeutrons,
        expectedFissions,
        producedNeutrons,
        cumulativeFissions,
        cumulativeEnergyMeV: cumulativeFissions * FISSION_REACTION.qValueMeV
      });
      incomingNeutrons = producedNeutrons;
    }
    return {
      neutronYield,
      fissionProbability,
      escapeFraction,
      controlAbsorption,
      retentionProbability,
      productiveProbability,
      kEffective,
      status,
      initialNeutrons,
      generationCount,
      generations,
      criticalControlAbsorption: criticalControlAbsorption({ neutronYield, fissionProbability, escapeFraction }),
      balanceResidual: kEffective - neutronYield * fissionProbability * (1 - escapeFraction) * (1 - controlAbsorption),
      qValueMeV: FISSION_REACTION.qValueMeV
    };
  }

  function fusionState(input = {}) {
    const temperatureKeV = clamp(input.temperatureKeV ?? 15, 1, 40);
    const densityRatio = clamp(input.densityRatio ?? 1, 0.2, 3);
    const confinementS = clamp(input.confinementS ?? 1, 0.05, 4);
    const reducedMassU = D_MASS_U * T_MASS_U / (D_MASS_U + T_MASS_U);
    const reducedMassEnergyKeV = reducedMassU * U_TO_MEV * 1000;
    const gamowEnergyKeV = 2 * reducedMassEnergyKeV * Math.pow(Math.PI * ALPHA, 2);
    const tunnelingFactor = Math.exp(-Math.sqrt(gamowEnergyKeV / temperatureKeV));
    const closestApproachFm = COULOMB_MEV_FM * 1000 / temperatureKeV;
    const temperatureK = temperatureKeV * 1.160451812e7;
    const reactivityProxy = Math.sqrt(temperatureKeV) * tunnelingFactor;
    const referenceTunnel = Math.exp(-Math.sqrt(gamowEnergyKeV / 15));
    const referenceReactivity = Math.sqrt(15) * referenceTunnel;
    const normalizedReactivity = reactivityProxy / referenceReactivity;
    const opportunityIndex = densityRatio * densityRatio * confinementS * normalizedReactivity;
    const condition = opportunityIndex < 0.65 ? "insufficient" : opportunityIndex > 1.35 ? "enhanced" : "reference";
    return {
      temperatureKeV,
      temperatureK,
      densityRatio,
      confinementS,
      reducedMassU,
      gamowEnergyKeV,
      tunnelingFactor,
      closestApproachFm,
      nuclearContactFm: NUCLEAR_CONTACT_FM,
      classicalContact: closestApproachFm <= NUCLEAR_CONTACT_FM,
      reactivityProxy,
      normalizedReactivity,
      opportunityIndex,
      condition,
      qValueMeV: DT_REACTION.qValueMeV,
      massDefectU: DT_REACTION.massDefectU,
      equation: DT_REACTION.equation,
      modelBoundary: "机会指数是相对教学量，不是 Lawson 判据、装置增益 Q 或实测反应率。"
    };
  }

  function coulombProfile(pointCount = 120) {
    const count = Math.max(20, Math.min(240, Math.round(pointCount)));
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const radiusFm = 2 + index / count * 198;
      points.push({ radiusFm, potentialKeV: COULOMB_MEV_FM * 1000 / radiusFm });
    }
    return points;
  }

  function fusionTemperatureScan(pointCount = 100, input = {}) {
    const count = Math.max(20, Math.min(200, Math.round(pointCount)));
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const temperatureKeV = 1 + index / count * 39;
      points.push(fusionState({ ...input, temperatureKeV }));
    }
    return points;
  }

  return {
    ALPHA,
    U_TO_MEV,
    D_MASS_U,
    T_MASS_U,
    NUCLEAR_CONTACT_FM,
    COULOMB_MEV_FM,
    DT_REACTION,
    FISSION_REACTION,
    clamp,
    fissionEvent,
    criticalControlAbsorption,
    chainState,
    fusionState,
    coulombProfile,
    fusionTemperatureScan
  };
});
