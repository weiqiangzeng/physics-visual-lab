(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MagneticFieldModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MU0 = 4 * Math.PI * 1e-7;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function wireFieldAt(input = {}) {
    const currentA = clamp(input.currentA ?? 10, -30, 30);
    const wireX = finite(input.wireX, 0);
    const wireY = finite(input.wireY, 0);
    const probeX = finite(input.probeX, .08);
    const probeY = finite(input.probeY, 0);
    const dx = probeX - wireX;
    const dy = probeY - wireY;
    const radiusM = Math.max(1e-4, Math.hypot(dx, dy));
    const coefficient = MU0 * currentA / (2 * Math.PI * radiusM ** 2);
    const bxT = -coefficient * dy;
    const byT = coefficient * dx;
    return {
      currentA,
      radiusM,
      bxT,
      byT,
      magnitudeT: Math.hypot(bxT, byT),
      angleRad: Math.atan2(byT, bxT),
      circulation: currentA > 0
        ? "counterclockwise"
        : currentA < 0
        ? "clockwise"
        : "none",
      radialDotT: bxT * dx / radiusM + byT * dy / radiusM,
    };
  }

  function twoWireField(input = {}) {
    const spacingM = clamp(input.spacingM ?? .12, .02, .4);
    const current1A = clamp(input.current1A ?? 10, -30, 30);
    const current2A = clamp(input.current2A ?? 10, -30, 30);
    const probeX = finite(input.probeX, 0);
    const probeY = finite(input.probeY, 0);
    const first = wireFieldAt({
      currentA: current1A,
      wireX: -spacingM / 2,
      probeX,
      probeY,
    });
    const second = wireFieldAt({
      currentA: current2A,
      wireX: spacingM / 2,
      probeX,
      probeY,
    });
    const bxT = first.bxT + second.bxT;
    const byT = first.byT + second.byT;
    return {
      spacingM,
      current1A,
      current2A,
      probeX,
      probeY,
      first,
      second,
      bxT,
      byT,
      magnitudeT: Math.hypot(bxT, byT),
      angleRad: Math.atan2(byT, bxT),
      componentResidualT: Math.hypot(
        bxT - first.bxT - second.bxT,
        byT - first.byT - second.byT,
      ),
    };
  }

  function circularLoopOnAxis(input = {}) {
    const currentA = clamp(input.currentA ?? 4, -30, 30);
    const turns = Math.round(clamp(input.turns ?? 80, 1, 300));
    const radiusM = clamp(input.radiusM ?? .1, .01, .3);
    const axisM = clamp(input.axisM ?? 0, -.8, .8);
    const fieldT = MU0 * turns * currentA * radiusM ** 2 /
      (2 * (radiusM ** 2 + axisM ** 2) ** 1.5);
    const centerFieldT = MU0 * turns * currentA / (2 * radiusM);
    return {
      currentA,
      turns,
      radiusM,
      axisM,
      fieldT,
      magnitudeT: Math.abs(fieldT),
      centerFieldT,
      relativeToCenter: centerFieldT === 0 ? 0 : fieldT / centerFieldT,
      direction: fieldT > 0
        ? "positive-axis"
        : fieldT < 0
        ? "negative-axis"
        : "none",
    };
  }

  function finiteSolenoidOnAxis(input = {}) {
    const currentA = clamp(input.currentA ?? 3, -30, 30);
    const turns = Math.round(clamp(input.turns ?? 400, 1, 1200));
    const radiusM = clamp(input.radiusM ?? .05, .01, .3);
    const lengthM = clamp(input.lengthM ?? .4, .03, 1.2);
    const axisM = clamp(input.axisM ?? 0, -1.5, 1.5);
    const turnDensityPerM = turns / lengthM;
    const near = axisM + lengthM / 2;
    const far = axisM - lengthM / 2;
    const geometry = near / Math.sqrt(radiusM ** 2 + near ** 2) -
      far / Math.sqrt(radiusM ** 2 + far ** 2);
    const fieldT = MU0 * turnDensityPerM * currentA * geometry / 2;
    const idealInfiniteFieldT = MU0 * turnDensityPerM * currentA;
    return {
      currentA,
      turns,
      radiusM,
      lengthM,
      axisM,
      turnDensityPerM,
      fieldT,
      magnitudeT: Math.abs(fieldT),
      idealInfiniteFieldT,
      finiteToIdealRatio: idealInfiniteFieldT === 0
        ? 0
        : fieldT / idealInfiniteFieldT,
      direction: fieldT > 0
        ? "positive-axis"
        : fieldT < 0
        ? "negative-axis"
        : "none",
    };
  }

  function axisScan(kind, pointCount = 120, input = {}) {
    const count = Math.round(clamp(pointCount, 20, 240));
    const spanM = kind === "solenoid"
      ? Math.max(.2, finite(input.lengthM, .4) * 1.5)
      : Math.max(.15, finite(input.radiusM, .1) * 4);
    return Array.from({ length: count + 1 }, (_, index) => {
      const axisM = -spanM + 2 * spanM * index / count;
      return kind === "solenoid"
        ? finiteSolenoidOnAxis({ ...input, axisM })
        : circularLoopOnAxis({ ...input, axisM });
    });
  }

  return {
    MU0,
    clamp,
    wireFieldAt,
    twoWireField,
    circularLoopOnAxis,
    finiteSolenoidOnAxis,
    axisScan,
  };
});
