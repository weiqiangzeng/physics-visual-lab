(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  if (root) root.LocomotiveModel = model;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EPS = 1e-10;
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value, min)));

  function normalize(source = {}) {
    return {
      mass: clamp(finite(source.mass, 1000), 200, 5000),
      resistance: clamp(finite(source.resistance, 2000), 0, 10000),
      maxTraction: clamp(finite(source.maxTraction, 6000), 500, 20000),
      power: clamp(finite(source.power, 120000), 10000, 500000),
      initialSpeed: clamp(finite(source.initialSpeed, 0), 0, 50),
      time: clamp(finite(source.time, 0), 0, 120)
    };
  }

  function forceStateAt(time, source = {}) {
    const input = normalize(source);
    const t = clamp(time, 0, 120);
    const acceleration = (input.maxTraction - input.resistance) / input.mass;
    const stopTime = acceleration < 0 ? input.initialSpeed / -acceleration : Infinity;
    const movingTime = Math.min(t, stopTime);
    const velocity = Math.max(0, input.initialSpeed + acceleration * movingTime);
    const position = input.initialSpeed * movingTime + .5 * acceleration * movingTime * movingTime;
    const kineticChange = .5 * input.mass * (velocity * velocity - input.initialSpeed * input.initialSpeed);
    const tractionWork = input.maxTraction * position;
    const resistanceWork = -input.resistance * position;
    return {
      mode: "force",
      time: t,
      velocity,
      position,
      acceleration: velocity <= EPS && acceleration < 0 ? 0 : acceleration,
      traction: velocity <= EPS && acceleration < 0 ? input.resistance : input.maxTraction,
      instantaneousPower: input.maxTraction * velocity,
      terminalSpeed: Infinity,
      switchTime: 0,
      switchSpeed: input.initialSpeed,
      kineticChange,
      tractionWork,
      resistanceWork,
      energyResidual: kineticChange - tractionWork - resistanceWork
    };
  }

  function powerPhaseTime(v0, v, mass, resistance, power) {
    if (resistance <= EPS) return mass * (v * v - v0 * v0) / (2 * power);
    const top = Math.max(EPS, Math.abs(power - resistance * v0));
    const bottom = Math.max(EPS, Math.abs(power - resistance * v));
    return mass / (resistance * resistance) * (power * Math.log(top / bottom) - resistance * (v - v0));
  }

  function powerVelocityAfter(dt, v0, input) {
    if (dt <= 0) return v0;
    if (input.resistance <= EPS) return Math.sqrt(v0 * v0 + 2 * input.power * dt / input.mass);
    const terminal = input.power / input.resistance;
    if (Math.abs(v0 - terminal) <= EPS) return terminal;
    let low = v0 < terminal ? v0 : terminal * (1 + 1e-12);
    let high = v0 < terminal ? terminal * (1 - 1e-12) : v0;
    for (let index = 0; index < 90; index += 1) {
      const mid = (low + high) / 2;
      const elapsed = powerPhaseTime(v0, mid, input.mass, input.resistance, input.power);
      if (v0 < terminal) {
        if (elapsed < dt) low = mid;
        else high = mid;
      } else if (elapsed < dt) high = mid;
      else low = mid;
    }
    return (low + high) / 2;
  }

  function powerStateAt(time, source = {}) {
    const input = normalize(source);
    const t = clamp(time, 0, 120);
    const terminalSpeed = input.resistance > EPS ? input.power / input.resistance : Infinity;
    const switchSpeed = input.power / input.maxTraction;
    const launchAcceleration = (input.maxTraction - input.resistance) / input.mass;
    const needsLaunch = input.initialSpeed < switchSpeed - EPS && launchAcceleration > EPS;
    if (input.initialSpeed < switchSpeed - EPS && launchAcceleration <= EPS) {
      const limited = forceStateAt(t, input);
      return { ...limited, mode: "power", terminalSpeed, switchTime: Infinity, switchSpeed, instantaneousPower: limited.traction * limited.velocity };
    }
    const switchTime = needsLaunch ? (switchSpeed - input.initialSpeed) / launchAcceleration : 0;
    const launchTime = Math.min(t, switchTime);
    const launchVelocity = input.initialSpeed + launchAcceleration * launchTime;
    const launchPosition = input.initialSpeed * launchTime + .5 * launchAcceleration * launchTime * launchTime;
    let velocity = launchVelocity;
    let position = launchPosition;
    let traction = input.maxTraction;
    let instantaneousPower = input.maxTraction * velocity;
    let acceleration = launchAcceleration;
    let tractionWork = input.maxTraction * launchPosition;

    if (t > switchTime || !needsLaunch) {
      const phaseStartSpeed = needsLaunch ? switchSpeed : Math.max(input.initialSpeed, EPS);
      const phaseTime = t - switchTime;
      velocity = powerVelocityAfter(phaseTime, phaseStartSpeed, input);
      traction = velocity > EPS ? input.power / velocity : input.maxTraction;
      traction = Math.min(input.maxTraction, traction);
      instantaneousPower = traction * velocity;
      acceleration = (traction - input.resistance) / input.mass;
      const deltaK = .5 * input.mass * (velocity * velocity - phaseStartSpeed * phaseStartSpeed);
      const phasePosition = input.resistance > EPS
        ? (input.power * phaseTime - deltaK) / input.resistance
        : input.mass * (velocity * velocity * velocity - phaseStartSpeed * phaseStartSpeed * phaseStartSpeed) / (3 * input.power);
      position += Math.max(0, phasePosition);
      tractionWork += input.power * Math.max(0, phaseTime);
    }

    const kineticChange = .5 * input.mass * (velocity * velocity - input.initialSpeed * input.initialSpeed);
    const resistanceWork = -input.resistance * position;
    return {
      mode: "power",
      time: t,
      velocity,
      position,
      acceleration,
      traction,
      instantaneousPower,
      terminalSpeed,
      switchTime,
      switchSpeed,
      kineticChange,
      tractionWork,
      resistanceWork,
      energyResidual: kineticChange - tractionWork - resistanceWork
    };
  }

  function compareAt(time, source = {}) {
    return { force: forceStateAt(time, source), power: powerStateAt(time, source) };
  }

  function series(source = {}, duration = 30, count = 180) {
    const end = clamp(duration, .1, 120);
    const n = Math.max(2, Math.round(count));
    return Array.from({ length: n + 1 }, (_, index) => {
      const time = end * index / n;
      return { time, ...compareAt(time, source) };
    });
  }

  return { normalize, forceStateAt, powerStateAt, compareAt, series, powerPhaseTime };
});
