(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ThreeFieldModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      massPg: clamp(input.massPg ?? 1, 0.1, 10),
      chargeFc: clamp(input.chargeFc ?? 1, -5, 5),
      electricVm: clamp(input.electricVm ?? 19.6, -50, 50),
      magneticT: clamp(input.magneticT ?? 1, -3, 3),
      initialVxMs: clamp(input.initialVxMs ?? 0, -20, 20),
      initialVyMs: clamp(input.initialVyMs ?? 0, -20, 20),
      initialXM: clamp(input.initialXM ?? 0, -20, 20),
      initialYM: clamp(input.initialYM ?? 0, -20, 20),
      gravity: clamp(input.gravity ?? 9.8, 1.6, 12),
      timeS: clamp(input.timeS ?? 0, 0, 30),
    };
  }

  function stateAt(timeS, input = {}) {
    const n = normalize({ ...input, timeS });
    const massKg = n.massPg * 1e-15;
    const chargeC = n.chargeFc * 1e-15;
    const omega = chargeC * n.magneticT / massKg;
    const electricAcceleration = chargeC * n.electricVm / massKg;
    const verticalAcceleration0 = electricAcceleration - n.gravity;
    let xM, yM, vxMs, vyMs, axMs2, ayMs2, driftVxMs = 0, driftVyMs = 0;
    if (Math.abs(omega) < 1e-10) {
      xM = n.initialXM + n.initialVxMs * n.timeS;
      yM = n.initialYM + n.initialVyMs * n.timeS + 0.5 * verticalAcceleration0 * n.timeS ** 2;
      vxMs = n.initialVxMs;
      vyMs = n.initialVyMs + verticalAcceleration0 * n.timeS;
      axMs2 = 0;
      ayMs2 = verticalAcceleration0;
    } else {
      driftVxMs = verticalAcceleration0 / omega;
      const ux0 = n.initialVxMs - driftVxMs;
      const uy0 = n.initialVyMs;
      const phase = omega * n.timeS;
      const c = Math.cos(phase), s = Math.sin(phase);
      vxMs = driftVxMs + ux0 * c + uy0 * s;
      vyMs = -ux0 * s + uy0 * c;
      xM = n.initialXM + driftVxMs * n.timeS + ux0 * s / omega + uy0 * (1 - c) / omega;
      yM = n.initialYM + ux0 * (c - 1) / omega + uy0 * s / omega;
      axMs2 = omega * vyMs;
      ayMs2 = verticalAcceleration0 - omega * vxMs;
    }
    const electricForceN = chargeC * n.electricVm;
    const gravityForceN = massKg * n.gravity;
    const magneticForceXN = chargeC * vyMs * n.magneticT;
    const magneticForceYN = -chargeC * vxMs * n.magneticT;
    const kinetic0J = 0.5 * massKg * (n.initialVxMs ** 2 + n.initialVyMs ** 2);
    const kineticJ = 0.5 * massKg * (vxMs ** 2 + vyMs ** 2);
    const electricWorkJ = electricForceN * (yM - n.initialYM);
    const gravityWorkJ = -gravityForceN * (yM - n.initialYM);
    const magneticPowerW = magneticForceXN * vxMs + magneticForceYN * vyMs;
    return {
      ...n, massKg, chargeC, omega, periodS: Math.abs(omega) > 1e-10 ? 2 * Math.PI / Math.abs(omega) : Infinity,
      electricAcceleration, verticalAcceleration0, driftVxMs, driftVyMs,
      xM, yM, vxMs, vyMs, speedMs: Math.hypot(vxMs, vyMs), axMs2, ayMs2,
      electricForceN, gravityForceN, magneticForceXN, magneticForceYN,
      netForceXN: magneticForceXN, netForceYN: electricForceN - gravityForceN + magneticForceYN,
      kinetic0J, kineticJ, kineticChangeJ: kineticJ - kinetic0J,
      electricWorkJ, gravityWorkJ, magneticPowerW,
      energyResidualJ: kineticJ - kinetic0J - electricWorkJ - gravityWorkJ,
      forceResidualXN: magneticForceXN - massKg * axMs2,
      forceResidualYN: electricForceN - gravityForceN + magneticForceYN - massKg * ayMs2,
      straightBalanceSpeedMs: Math.abs(chargeC * n.magneticT) > 1e-30 ? (electricForceN - gravityForceN) / (chargeC * n.magneticT) : Infinity,
    };
  }

  function trajectory(input = {}, durationS = 12, count = 240) {
    const n = normalize(input);
    return Array.from({ length: count + 1 }, (_, index) => stateAt(durationS * index / count, n));
  }

  return { normalize, stateAt, trajectory };
});
