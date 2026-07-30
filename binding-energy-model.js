(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.BindingEnergyModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const U_TO_MEV = 931.49410242;
  const HYDROGEN_ATOM_MASS_U = 1.00782503223;
  const NEUTRON_MASS_U = 1.00866491595;

  const ISOTOPES = Object.freeze({
    deuterium: Object.freeze({ symbol: "²H", label: "氘", Z: 1, A: 2, atomicMassU: 2.01410177812 }),
    helium4: Object.freeze({ symbol: "⁴He", label: "氦-4", Z: 2, A: 4, atomicMassU: 4.00260325413 }),
    carbon12: Object.freeze({ symbol: "¹²C", label: "碳-12", Z: 6, A: 12, atomicMassU: 12 }),
    oxygen16: Object.freeze({ symbol: "¹⁶O", label: "氧-16", Z: 8, A: 16, atomicMassU: 15.99491461957 }),
    iron56: Object.freeze({ symbol: "⁵⁶Fe", label: "铁-56", Z: 26, A: 56, atomicMassU: 55.93493633 }),
    nickel62: Object.freeze({ symbol: "⁶²Ni", label: "镍-62", Z: 28, A: 62, atomicMassU: 61.92834537 }),
    uranium235: Object.freeze({ symbol: "²³⁵U", label: "铀-235", Z: 92, A: 235, atomicMassU: 235.0439301 })
  });

  const REACTIONS = Object.freeze({
    fusion: Object.freeze({
      label: "氘氚聚变",
      equation: "²H + ³H → ⁴He + n",
      reactants: Object.freeze([
        Object.freeze({ symbol: "²H", A: 2, Z: 1, count: 1, massU: 2.01410177812 }),
        Object.freeze({ symbol: "³H", A: 3, Z: 1, count: 1, massU: 3.0160492779 })
      ]),
      products: Object.freeze([
        Object.freeze({ symbol: "⁴He", A: 4, Z: 2, count: 1, massU: 4.00260325413 }),
        Object.freeze({ symbol: "n", A: 1, Z: 0, count: 1, massU: NEUTRON_MASS_U })
      ]),
      boundary: "Q 值来自反应前后静质量差；本页不模拟克服库仑势垒的条件。"
    }),
    fission: Object.freeze({
      label: "铀-235 代表性裂变道",
      equation: "²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n",
      reactants: Object.freeze([
        Object.freeze({ symbol: "²³⁵U", A: 235, Z: 92, count: 1, massU: 235.0439301 }),
        Object.freeze({ symbol: "n", A: 1, Z: 0, count: 1, massU: NEUTRON_MASS_U })
      ]),
      products: Object.freeze([
        Object.freeze({ symbol: "¹⁴¹Ba", A: 141, Z: 56, count: 1, massU: 140.9144033 }),
        Object.freeze({ symbol: "⁹²Kr", A: 92, Z: 36, count: 1, massU: 91.9261562 }),
        Object.freeze({ symbol: "n", A: 1, Z: 0, count: 3, massU: NEUTRON_MASS_U })
      ]),
      boundary: "这是一个代表性产物道，不代表所有裂变事件都产生同一组核素或相同 Q 值。"
    })
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function isotope(key) {
    return ISOTOPES[key] || ISOTOPES.helium4;
  }

  function isotopeState(key) {
    const item = isotope(key);
    const N = item.A - item.Z;
    const separatedMassU = item.Z * HYDROGEN_ATOM_MASS_U + N * NEUTRON_MASS_U;
    const massDefectU = separatedMassU - item.atomicMassU;
    const bindingEnergyMeV = massDefectU * U_TO_MEV;
    return {
      ...item,
      N,
      separatedMassU,
      massDefectU,
      bindingEnergyMeV,
      bindingEnergyPerNucleonMeV: bindingEnergyMeV / item.A,
      massFraction: massDefectU / separatedMassU,
      identityResidualU: separatedMassU - item.atomicMassU - massDefectU
    };
  }

  function assemblyState(key, progress = 1) {
    const state = isotopeState(key);
    const boundedProgress = clamp(progress, 0, 1);
    const releasedEnergyMeV = state.bindingEnergyMeV * boundedProgress;
    return {
      ...state,
      progress: boundedProgress,
      releasedEnergyMeV,
      remainingReleaseMeV: state.bindingEnergyMeV - releasedEnergyMeV,
      ledgerMassU: state.separatedMassU - releasedEnergyMeV / U_TO_MEV,
      finalMassResidualU: boundedProgress === 1
        ? state.separatedMassU - releasedEnergyMeV / U_TO_MEV - state.atomicMassU
        : null
    };
  }

  function sumReactionSide(side) {
    return side.reduce((sum, particle) => sum + particle.massU * particle.count, 0);
  }

  function sumQuantumNumber(side, key) {
    return side.reduce((sum, particle) => sum + particle[key] * particle.count, 0);
  }

  function reactionState(key = "fusion") {
    const reaction = REACTIONS[key] || REACTIONS.fusion;
    const reactantMassU = sumReactionSide(reaction.reactants);
    const productMassU = sumReactionSide(reaction.products);
    const massDefectU = reactantMassU - productMassU;
    const qValueMeV = massDefectU * U_TO_MEV;
    const reactantA = sumQuantumNumber(reaction.reactants, "A");
    const productA = sumQuantumNumber(reaction.products, "A");
    const reactantZ = sumQuantumNumber(reaction.reactants, "Z");
    const productZ = sumQuantumNumber(reaction.products, "Z");
    return {
      ...reaction,
      key,
      reactantMassU,
      productMassU,
      massDefectU,
      qValueMeV,
      reactantA,
      productA,
      reactantZ,
      productZ,
      nucleonConserved: reactantA === productA,
      chargeConserved: reactantZ === productZ,
      massEnergyResidualMeV: (reactantMassU - productMassU) * U_TO_MEV - qValueMeV
    };
  }

  function stableProtonNumber(A) {
    return Math.max(1, Math.min(A - 1, Math.round(A / (2 + 0.015 * Math.pow(A, 2 / 3)))));
  }

  function liquidDropState(A, Z = stableProtonNumber(A)) {
    const massNumber = Math.max(2, Math.round(Number(A)));
    const protonNumber = Math.max(1, Math.min(massNumber - 1, Math.round(Number(Z))));
    const volume = 15.75 * massNumber;
    const surface = 17.8 * Math.pow(massNumber, 2 / 3);
    const coulomb = 0.711 * protonNumber * (protonNumber - 1) / Math.pow(massNumber, 1 / 3);
    const asymmetry = 23.7 * Math.pow(massNumber - 2 * protonNumber, 2) / massNumber;
    const bindingEnergyMeV = Math.max(0, volume - surface - coulomb - asymmetry);
    return {
      A: massNumber,
      Z: protonNumber,
      N: massNumber - protonNumber,
      bindingEnergyMeV,
      bindingEnergyPerNucleonMeV: bindingEnergyMeV / massNumber
    };
  }

  function trendCurve(step = 2) {
    const points = [];
    for (let A = 4; A <= 240; A += Math.max(1, Math.round(step))) {
      points.push(liquidDropState(A));
    }
    return points;
  }

  function measuredPoints() {
    return Object.entries(ISOTOPES).map(([key]) => ({ key, ...isotopeState(key) }));
  }

  return {
    U_TO_MEV,
    HYDROGEN_ATOM_MASS_U,
    NEUTRON_MASS_U,
    ISOTOPES,
    REACTIONS,
    clamp,
    isotope,
    isotopeState,
    assemblyState,
    reactionState,
    stableProtonNumber,
    liquidDropState,
    trendCurve,
    measuredPoints
  };
});
