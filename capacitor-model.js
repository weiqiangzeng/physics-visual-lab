(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CapacitorModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VACUUM_PERMITTIVITY = 8.8541878128e-12;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function geometry(input = {}) {
    const areaM2 = clamp(input.areaM2 ?? .02, 1e-8, 1e4);
    const separationM = clamp(input.separationM ?? .002, 1e-7, 1e3);
    const relativePermittivity = clamp(
      input.relativePermittivity ?? 1,
      1,
      1e4,
    );
    const dielectricFraction = clamp(input.dielectricFraction ?? 0, 0, 1);
    const effectiveRelativePermittivity = 1 +
      (relativePermittivity - 1) * dielectricFraction;
    const capacitanceF = VACUUM_PERMITTIVITY * areaM2 *
      effectiveRelativePermittivity / separationM;
    return {
      areaM2,
      separationM,
      relativePermittivity,
      dielectricFraction,
      effectiveRelativePermittivity,
      capacitanceF,
    };
  }

  function state(input = {}) {
    const shape = geometry(input);
    const constraint = input.constraint === "isolated"
      ? "isolated"
      : "battery";
    const voltageV = constraint === "battery"
      ? finite(input.voltageV, 120)
      : finite(input.chargeC, 1e-9) / shape.capacitanceF;
    const chargeC = constraint === "battery"
      ? shape.capacitanceF * voltageV
      : finite(input.chargeC, 1e-9);
    const fieldVm = voltageV / shape.separationM;
    const energyJ = .5 * chargeC * voltageV;
    const electricPressurePa = .5 * VACUUM_PERMITTIVITY *
      shape.effectiveRelativePermittivity * fieldVm ** 2;
    const attractionForceN = electricPressurePa * shape.areaM2;
    return {
      ...shape,
      constraint,
      voltageV,
      chargeC,
      fieldVm,
      energyJ,
      electricPressurePa,
      attractionForceN,
      constitutiveResidualC: chargeC - shape.capacitanceF * voltageV,
    };
  }

  function transition(input = {}) {
    const constraint = input.constraint === "isolated"
      ? "isolated"
      : "battery";
    const initialGeometry = geometry({
      areaM2: input.initialAreaM2,
      separationM: input.initialSeparationM,
      relativePermittivity: input.initialRelativePermittivity,
      dielectricFraction: input.initialDielectricFraction,
    });
    const initialVoltageV = finite(input.initialVoltageV, 120);
    const initialChargeC = initialGeometry.capacitanceF * initialVoltageV;
    const initial = state({
      ...initialGeometry,
      constraint: "battery",
      voltageV: initialVoltageV,
    });
    const final = state({
      areaM2: input.finalAreaM2 ?? initialGeometry.areaM2,
      separationM: input.finalSeparationM ?? initialGeometry.separationM,
      relativePermittivity:
        input.finalRelativePermittivity ?? initialGeometry.relativePermittivity,
      dielectricFraction:
        input.finalDielectricFraction ?? initialGeometry.dielectricFraction,
      constraint,
      voltageV: initialVoltageV,
      chargeC: initialChargeC,
    });
    const capacitorEnergyChangeJ = final.energyJ - initial.energyJ;
    const batteryWorkJ = constraint === "battery"
      ? initialVoltageV * (final.chargeC - initial.chargeC)
      : 0;
    const externalWorkJ = capacitorEnergyChangeJ - batteryWorkJ;
    return {
      constraint,
      initial,
      final,
      chargeChangeC: final.chargeC - initial.chargeC,
      voltageChangeV: final.voltageV - initial.voltageV,
      capacitorEnergyChangeJ,
      batteryWorkJ,
      externalWorkJ,
      energyResidualJ:
        capacitorEnergyChangeJ - batteryWorkJ - externalWorkJ,
    };
  }

  function dielectricInsertion(input = {}) {
    const areaM2 = clamp(input.areaM2 ?? .02, 1e-8, 1e4);
    const plateWidthM = Math.sqrt(areaM2);
    const fraction = clamp(input.fraction ?? .5, 0, 1);
    const shape = geometry({
      areaM2,
      separationM: input.separationM,
      relativePermittivity: input.relativePermittivity,
      dielectricFraction: fraction,
    });
    const constraint = input.constraint === "isolated"
      ? "isolated"
      : "battery";
    const voltageV = finite(input.voltageV, 120);
    const referenceChargeC = finite(
      input.chargeC,
      geometry({
        areaM2,
        separationM: shape.separationM,
        relativePermittivity: shape.relativePermittivity,
        dielectricFraction: 0,
      }).capacitanceF * voltageV,
    );
    const current = state({
      ...shape,
      constraint,
      voltageV,
      chargeC: referenceChargeC,
    });
    const capacitanceGradientFm = VACUUM_PERMITTIVITY *
      (shape.relativePermittivity - 1) * plateWidthM / shape.separationM;
    const insertionForceN = constraint === "battery"
      ? .5 * current.voltageV ** 2 * capacitanceGradientFm
      : .5 * current.chargeC ** 2 / current.capacitanceF ** 2 *
        capacitanceGradientFm;
    return {
      ...current,
      plateWidthM,
      insertedLengthM: fraction * plateWidthM,
      capacitanceGradientFm,
      insertionForceN,
      forceDirection: shape.relativePermittivity > 1 && fraction < 1
        ? "inward"
        : "none",
    };
  }

  function breakdown(input = {}) {
    const current = state(input);
    const breakdownFieldVm = clamp(
      input.breakdownFieldVm ?? 3e6,
      1,
      1e12,
    );
    const ratio = Math.abs(current.fieldVm) / breakdownFieldVm;
    return {
      ...current,
      breakdownFieldVm,
      breakdownRatio: ratio,
      breakdown: ratio >= 1,
      voltageLimitV: breakdownFieldVm * current.separationM,
      energyDensityJm3: .5 * VACUUM_PERMITTIVITY *
        current.effectiveRelativePermittivity * current.fieldVm ** 2,
    };
  }

  return {
    VACUUM_PERMITTIVITY,
    clamp,
    geometry,
    state,
    transition,
    dielectricInsertion,
    breakdown,
  };
});
