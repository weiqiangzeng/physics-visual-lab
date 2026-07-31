(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ElectricGravityModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const G = 9.8;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      mode: ["balance", "trajectory", "measure", "compare"].includes(input.mode) ? input.mode : "balance",
      massNg: clamp(input.massNg ?? 1, 0.1, 10),
      chargeFc: clamp(input.chargeFc ?? 0.5, -2, 2),
      fieldKvM: clamp(input.fieldKvM ?? 19.6, -50, 50),
      startHeight: clamp(input.startHeight ?? 1.5, 0.2, 5),
      initialVx: clamp(input.initialVx ?? 2, 0, 10),
      initialVy: clamp(input.initialVy ?? 0, -8, 8),
      gravity: clamp(input.gravity ?? G, 1.6, 12),
      time: clamp(input.time ?? 0, 0, 8)
    };
  }

  function parameters(input = {}) {
    const n = normalize(input);
    const massKg = n.massNg * 1e-12;
    const chargeC = n.chargeFc * 1e-15;
    const fieldVm = n.fieldKvM * 1e3;
    const electricForceN = chargeC * fieldVm;
    const weightN = massKg * n.gravity;
    const netForceYN = electricForceN - weightN;
    return {
      ...n,
      massKg,
      chargeC,
      fieldVm,
      electricForceN,
      weightN,
      netForceYN,
      accelerationY: netForceYN / massKg,
      balanceChargeFc: fieldVm === 0 ? Infinity : weightN / fieldVm * 1e15,
      balanceFieldKvM: chargeC === 0 ? Infinity : weightN / chargeC / 1e3,
      forceResidualN: netForceYN - (electricForceN - weightN)
    };
  }

  function impactTime(input = {}) {
    const p = parameters(input);
    const a = 0.5 * p.accelerationY;
    const b = p.initialVy;
    const c = p.startHeight;
    if (Math.abs(a) < 1e-12) return b < 0 ? -c / b : Infinity;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Infinity;
    const roots = [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)]
      .filter((value) => value >= 0);
    return roots.length ? Math.min(...roots) : Infinity;
  }

  function freeStateAt(time, input = {}) {
    const p = parameters({ ...input, time });
    const t = clamp(time, 0, 8);
    const x = p.initialVx * t;
    const y = p.startHeight + p.initialVy * t + 0.5 * p.accelerationY * t * t;
    const velocityY = p.initialVy + p.accelerationY * t;
    const initialKineticJ = 0.5 * p.massKg * (p.initialVx ** 2 + p.initialVy ** 2);
    const kineticJ = 0.5 * p.massKg * (p.initialVx ** 2 + velocityY ** 2);
    const displacementY = y - p.startHeight;
    const gravityWorkJ = -p.weightN * displacementY;
    const electricWorkJ = p.electricForceN * displacementY;
    const kineticChangeJ = kineticJ - initialKineticJ;
    return {
      ...p,
      time: t,
      x,
      y,
      velocityX: p.initialVx,
      velocityY,
      speed: Math.hypot(p.initialVx, velocityY),
      initialKineticJ,
      kineticJ,
      gravityWorkJ,
      electricWorkJ,
      kineticChangeJ,
      energyResidualJ: kineticChangeJ - gravityWorkJ - electricWorkJ
    };
  }

  function stateAt(time, input = {}) {
    const hit = impactTime(input);
    if (!Number.isFinite(hit) || time <= hit) return { ...freeStateAt(time, input), impactTime: hit, landed: false };
    const impact = freeStateAt(hit, input);
    return {
      ...impact,
      time: clamp(time, 0, 8),
      y: 0,
      velocityX: 0,
      velocityY: 0,
      speed: 0,
      impactTime: hit,
      landed: true
    };
  }

  function inferCharge(input = {}) {
    const p = parameters(input);
    return {
      chargeFc: p.balanceChargeFc,
      fieldKvM: p.fieldKvM,
      massNg: p.massNg,
      residualN: Number.isFinite(p.balanceChargeFc)
        ? p.balanceChargeFc * 1e-15 * p.fieldVm - p.weightN
        : Infinity
    };
  }

  function series(input = {}, duration = 4, count = 160) {
    return Array.from({ length: count + 1 }, (_, index) => {
      const time = duration * index / count;
      return { time, charged: stateAt(time, input), fieldOff: stateAt(time, { ...input, fieldKvM: 0 }) };
    });
  }

  return { G, normalize, parameters, impactTime, freeStateAt, stateAt, inferCharge, series };
});
