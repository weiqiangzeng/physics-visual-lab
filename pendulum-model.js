(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PendulumModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

  function normalize(input = {}) {
    return {
      lengthM: clamp(input.lengthM ?? 1, 0.1, 5),
      gravity: clamp(input.gravity ?? 9.8, 1.6, 25),
      amplitudeDeg: clamp(input.amplitudeDeg ?? 10, 1, 170),
      massKg: clamp(input.massKg ?? 1, 0.1, 10),
      dampingS: clamp(input.dampingS ?? 0, 0, 1),
      timeS: clamp(input.timeS ?? 0, 0, 40),
    };
  }

  function ellipticK(modulus) {
    let a = 1;
    let b = Math.sqrt(Math.max(0, 1 - modulus * modulus));
    for (let index = 0; index < 30 && Math.abs(a - b) > 1e-15; index += 1) {
      const nextA = (a + b) / 2;
      b = Math.sqrt(a * b);
      a = nextA;
    }
    return Math.PI / (2 * a);
  }

  function periods(input = {}) {
    const n = normalize(input);
    const amplitudeRad = n.amplitudeDeg * Math.PI / 180;
    const smallAnglePeriodS = 2 * Math.PI * Math.sqrt(n.lengthM / n.gravity);
    const exactPeriodS = 4 * Math.sqrt(n.lengthM / n.gravity) * ellipticK(Math.sin(amplitudeRad / 2));
    return { ...n, amplitudeRad, smallAnglePeriodS, exactPeriodS, periodErrorPercent: (exactPeriodS / smallAnglePeriodS - 1) * 100 };
  }

  function derivative(n, state) {
    const [theta, omega] = state;
    return [omega, -n.gravity / n.lengthM * Math.sin(theta) - 2 * n.dampingS * omega, 2 * n.massKg * n.lengthM ** 2 * n.dampingS * omega ** 2];
  }

  function stateAt(timeS, input = {}) {
    const n = normalize({ ...input, timeS });
    const p = periods(n);
    const steps = Math.max(1, Math.min(6000, Math.ceil(n.timeS / 0.005)));
    const dt = n.timeS / steps;
    let y = [p.amplitudeRad, 0, 0];
    for (let step = 0; step < steps; step += 1) {
      const k1 = derivative(n, y);
      const y2 = y.map((v, i) => v + k1[i] * dt / 2);
      const k2 = derivative(n, y2);
      const y3 = y.map((v, i) => v + k2[i] * dt / 2);
      const k3 = derivative(n, y3);
      const y4 = y.map((v, i) => v + k3[i] * dt);
      const k4 = derivative(n, y4);
      y = y.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
    }
    const [thetaRad, angularVelocityRadS, dissipatedJ] = y;
    const speedMs = n.lengthM * angularVelocityRadS;
    const potentialJ = n.massKg * n.gravity * n.lengthM * (1 - Math.cos(thetaRad));
    const kineticJ = 0.5 * n.massKg * speedMs ** 2;
    const initialEnergyJ = n.massKg * n.gravity * n.lengthM * (1 - Math.cos(p.amplitudeRad));
    const totalMechanicalJ = potentialJ + kineticJ;
    return {
      ...p, thetaRad, thetaDeg: thetaRad * 180 / Math.PI, angularVelocityRadS, speedMs,
      tangentialAccelerationMs2: -n.gravity * Math.sin(thetaRad) - 2 * n.dampingS * speedMs,
      radialAccelerationMs2: speedMs ** 2 / n.lengthM,
      tensionN: n.massKg * n.gravity * Math.cos(thetaRad) + n.massKg * speedMs ** 2 / n.lengthM,
      potentialJ, kineticJ, totalMechanicalJ, initialEnergyJ, dissipatedJ,
      energyResidualJ: initialEnergyJ - totalMechanicalJ - dissipatedJ,
      smallAngleThetaRad: p.amplitudeRad * Math.cos(Math.sqrt(n.gravity / n.lengthM) * n.timeS),
    };
  }

  function series(input = {}, durationS, count = 240) {
    const n = normalize(input);
    const end = durationS ?? Math.min(40, 3 * periods(n).exactPeriodS);
    return Array.from({ length: count + 1 }, (_, index) => stateAt(end * index / count, n));
  }

  function periodSweep(input = {}, count = 85) {
    return Array.from({ length: count }, (_, index) => periods({ ...input, amplitudeDeg: 1 + index * 168 / (count - 1) }));
  }

  return { normalize, ellipticK, periods, stateAt, series, periodSweep };
});
