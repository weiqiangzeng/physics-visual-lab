(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  if (root) root.ElevatorModel = model;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value, min)));

  function normalize(source = {}) {
    return {
      mass: clamp(finite(source.mass, 60), 20, 120),
      gravity: clamp(finite(source.gravity, 9.8), 1.6, 12),
      acceleration: clamp(finite(source.acceleration, 0), -12, 12),
      frameAcceleration: clamp(finite(source.frameAcceleration, 0), -12, 12),
      time: clamp(finite(source.time, 0), 0, 12)
    };
  }

  function stateAt(time, source = {}) {
    const input = normalize(source);
    const t = clamp(time, 0, 12);
    const elevatorAcceleration = input.acceleration;
    const contact = elevatorAcceleration >= -input.gravity;
    const personAcceleration = contact ? elevatorAcceleration : -input.gravity;
    const apparentWeight = contact ? input.mass * (input.gravity + personAcceleration) : 0;
    const apparentAcceleration = personAcceleration - input.frameAcceleration;
    return {
      time: t,
      mass: input.mass,
      gravity: input.gravity,
      acceleration: personAcceleration,
      elevatorAcceleration,
      contact,
      position: .5 * personAcceleration * t * t,
      velocity: personAcceleration * t,
      normal: apparentWeight,
      weight: input.mass * input.gravity,
      netForce: input.mass * personAcceleration,
      frameAcceleration: input.frameAcceleration,
      apparentAcceleration,
      pseudoForce: -input.mass * input.frameAcceleration,
      residual: apparentWeight - input.mass * (input.gravity + personAcceleration)
    };
  }

  function reading(source = {}) {
    const input = normalize(source);
    return stateAt(input.time, input);
  }

  function series(source = {}, duration = 8, count = 120) {
    const end = clamp(duration, .1, 12);
    const n = Math.max(2, Math.round(count));
    return Array.from({ length: n + 1 }, (_, i) => stateAt(end * i / n, source));
  }

  return { normalize, stateAt, reading, series };
});
