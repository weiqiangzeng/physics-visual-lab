(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  if (root) root.ConveyorModel = model;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const G = 9.8;
  const EPS = 1e-9;
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value, min)));

  function normalize(source = {}) {
    const muS = clamp(finite(source.muS, .5), 0, 1.2);
    return {
      mass: clamp(finite(source.mass, 2), .2, 10),
      muS,
      muK: clamp(finite(source.muK, .3), 0, muS),
      angleDeg: clamp(finite(source.angleDeg, 0), 0, 35),
      beltSpeed: clamp(finite(source.beltSpeed, 4), -8, 8),
      objectSpeed: clamp(finite(source.objectSpeed, 0), -10, 10),
      time: clamp(finite(source.time, 0), 0, 16)
    };
  }

  function constants(source = {}) {
    const input = normalize(source);
    const angle = input.angleDeg * Math.PI / 180;
    const normal = input.mass * G * Math.cos(angle);
    const gravityParallel = -input.mass * G * Math.sin(angle);
    const staticRequired = -gravityParallel;
    const staticLimit = input.muS * normal;
    return { ...input, angle, normal, gravityParallel, staticRequired, staticLimit };
  }

  function stateAt(time, source = {}) {
    const c = constants(source);
    const t = clamp(time, 0, 16);
    const relative0 = c.objectSpeed - c.beltSpeed;
    const canStick = Math.abs(c.staticRequired) <= c.staticLimit + EPS;
    let direction = Math.sign(relative0);
    if (!direction && !canStick) direction = -Math.sign(c.staticRequired || 1);
    const friction1 = direction ? -direction * c.muK * c.normal : c.staticRequired;
    const acceleration1 = (c.gravityParallel + friction1) / c.mass;
    const crossing = Math.abs(relative0) > EPS && relative0 * acceleration1 < 0
      ? -relative0 / acceleration1
      : Infinity;
    const syncTime = Number.isFinite(crossing) && crossing >= 0 ? crossing : (Math.abs(relative0) <= EPS && canStick ? 0 : Infinity);
    const phaseTime = Math.min(t, syncTime);
    let velocity = c.objectSpeed + acceleration1 * phaseTime;
    let position = c.objectSpeed * phaseTime + .5 * acceleration1 * phaseTime * phaseTime;
    let slipDistance = Math.abs(relative0 * phaseTime + .5 * acceleration1 * phaseTime * phaseTime);
    let acceleration = acceleration1;
    let friction = friction1;
    let regime = direction ? "sliding" : "sticking";

    if (t >= syncTime && Number.isFinite(syncTime)) {
      const remaining = t - syncTime;
      if (canStick) {
        velocity = c.beltSpeed;
        position += c.beltSpeed * remaining;
        acceleration = 0;
        friction = c.staticRequired;
        regime = "sticking";
      } else {
        const postDirection = -Math.sign(c.staticRequired || 1);
        friction = -postDirection * c.muK * c.normal;
        acceleration = (c.gravityParallel + friction) / c.mass;
        velocity = c.beltSpeed + acceleration * remaining;
        position += c.beltSpeed * remaining + .5 * acceleration * remaining * remaining;
        slipDistance += Math.abs(.5 * acceleration * remaining * remaining);
        regime = "sliding-after-sync";
      }
    }

    const beltPosition = c.beltSpeed * t;
    const relativeVelocity = velocity - c.beltSpeed;
    const kineticChange = .5 * c.mass * (velocity * velocity - c.objectSpeed * c.objectSpeed);
    const gravityWork = c.gravityParallel * position;
    const frictionWork = kineticChange - gravityWork;
    const heat = c.muK * c.normal * slipDistance;
    return {
      time: t,
      velocity,
      acceleration,
      position,
      beltPosition,
      relativeVelocity,
      normal: c.normal,
      gravityParallel: c.gravityParallel,
      friction,
      staticLimit: c.staticLimit,
      staticRequired: c.staticRequired,
      canStick,
      syncTime,
      regime,
      slipDistance,
      kineticChange,
      gravityWork,
      frictionWork,
      heat,
      beltEnergyTransfer: frictionWork + heat,
      energyResidual: kineticChange - gravityWork - frictionWork
    };
  }

  function series(source = {}, duration = 10, count = 160) {
    const end = clamp(duration, .1, 16);
    const n = Math.max(2, Math.round(count));
    return Array.from({ length: n + 1 }, (_, index) => stateAt(end * index / n, source));
  }

  return { G, normalize, constants, stateAt, series };
});
