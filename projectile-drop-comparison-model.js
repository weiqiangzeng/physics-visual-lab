(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectileDropComparisonModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  function normalize(input = {}) {
    return {
      heightM: clamp(input.heightM ?? 20, 1, 80),
      launchSpeedMs: clamp(input.launchSpeedMs ?? 12, 0, 30),
      gravityMs2: clamp(input.gravityMs2 ?? 9.8, 1, 20),
      releaseDelayMs: clamp(input.releaseDelayMs ?? 0, -300, 300),
      dragPerM: clamp(input.dragPerM ?? .03, 0, .12),
      strobeIntervalS: clamp(input.strobeIntervalS ?? .2, .05, .5),
      timerResolutionMs: clamp(input.timerResolutionMs ?? 1, .1, 50),
      progress: clamp(input.progress ?? .62, 0, 1),
    };
  }

  function idealLandingTime(input = {}) {
    const state = normalize(input);
    return Math.sqrt(2 * state.heightM / state.gravityMs2);
  }

  function idealAt(timeS, input = {}) {
    const state = normalize(input);
    const landingTimeS = idealLandingTime(state);
    const time = clamp(timeS, 0, Math.max(landingTimeS, landingTimeS + state.releaseDelayMs / 1000));
    const dropStartS = state.releaseDelayMs / 1000;
    const projectileElapsedS = Math.min(time, landingTimeS);
    const dropElapsedS = clamp(time - dropStartS, 0, landingTimeS);
    const projectile = {
      xM: state.launchSpeedMs * projectileElapsedS,
      yM: Math.max(0, state.heightM - .5 * state.gravityMs2 * projectileElapsedS ** 2),
      vxMs: state.launchSpeedMs,
      vyMs: -state.gravityMs2 * projectileElapsedS,
    };
    const dropped = {
      xM: 0,
      yM: Math.max(0, state.heightM - .5 * state.gravityMs2 * dropElapsedS ** 2),
      vxMs: 0,
      vyMs: -state.gravityMs2 * dropElapsedS,
    };
    return { ...state, timeS: time, landingTimeS, dropStartS, projectileElapsedS, dropElapsedS, projectile, dropped, verticalSeparationM: projectile.yM - dropped.yM };
  }

  function idealComparison(input = {}) {
    const state = normalize(input);
    const landingTimeS = idealLandingTime(state);
    const dropLandingTimeS = landingTimeS + state.releaseDelayMs / 1000;
    return {
      ...state,
      landingTimeS,
      projectileLandingTimeS: landingTimeS,
      dropLandingTimeS,
      impactTimeDifferenceS: dropLandingTimeS - landingTimeS,
      horizontalRangeM: state.launchSpeedMs * landingTimeS,
      projectileImpactSpeedMs: Math.hypot(state.launchSpeedMs, state.gravityMs2 * landingTimeS),
      dropImpactSpeedMs: state.gravityMs2 * landingTimeS,
      simultaneous: Math.abs(state.releaseDelayMs) < state.timerResolutionMs,
      verticalEquationResidualM: 0,
    };
  }

  function strobe(input = {}) {
    const state = normalize(input);
    const landingTimeS = idealLandingTime(state);
    const count = Math.floor(landingTimeS / state.strobeIntervalS) + 1;
    const points = Array.from({ length: count }, (_, index) => {
      const timeS = index * state.strobeIntervalS;
      const q = idealAt(timeS, { ...state, releaseDelayMs: 0 });
      return { timeS, projectile: q.projectile, dropped: q.dropped, verticalResidualM: q.projectile.yM - q.dropped.yM };
    });
    if (points.at(-1)?.timeS < landingTimeS - 1e-10) {
      const q = idealAt(landingTimeS, { ...state, releaseDelayMs: 0 });
      points.push({ timeS: landingTimeS, projectile: q.projectile, dropped: q.dropped, verticalResidualM: q.projectile.yM - q.dropped.yM });
    }
    return { ...state, landingTimeS, points, maximumVerticalResidualM: Math.max(...points.map(point => Math.abs(point.verticalResidualM))) };
  }

  function derivative(body, gravityMs2, dragPerM) {
    const speed = Math.hypot(body.vxMs, body.vyMs);
    return { xM: body.vxMs, yM: body.vyMs, vxMs: -dragPerM * speed * body.vxMs, vyMs: -gravityMs2 - dragPerM * speed * body.vyMs };
  }
  function rk4(body, dt, gravityMs2, dragPerM) {
    const add = (base, slope, factor) => ({ xM: base.xM + slope.xM * factor, yM: base.yM + slope.yM * factor, vxMs: base.vxMs + slope.vxMs * factor, vyMs: base.vyMs + slope.vyMs * factor });
    const k1 = derivative(body, gravityMs2, dragPerM);
    const k2 = derivative(add(body, k1, dt / 2), gravityMs2, dragPerM);
    const k3 = derivative(add(body, k2, dt / 2), gravityMs2, dragPerM);
    const k4 = derivative(add(body, k3, dt), gravityMs2, dragPerM);
    return {
      xM: body.xM + dt * (k1.xM + 2 * k2.xM + 2 * k3.xM + k4.xM) / 6,
      yM: body.yM + dt * (k1.yM + 2 * k2.yM + 2 * k3.yM + k4.yM) / 6,
      vxMs: body.vxMs + dt * (k1.vxMs + 2 * k2.vxMs + 2 * k3.vxMs + k4.vxMs) / 6,
      vyMs: body.vyMs + dt * (k1.vyMs + 2 * k2.vyMs + 2 * k3.vyMs + k4.vyMs) / 6,
    };
  }

  function integrate(initial, state, dt = .002) {
    let body = { ...initial }, timeS = 0, step = 0;
    const points = [{ timeS, ...body }];
    const maxTimeS = Math.max(5, idealLandingTime(state) * 6);
    while (body.yM > 0 && timeS < maxTimeS) {
      const previous = body;
      const next = rk4(body, dt, state.gravityMs2, state.dragPerM);
      timeS += dt;
      step += 1;
      if (next.yM <= 0) {
        const fraction = previous.yM / (previous.yM - next.yM);
        body = {
          xM: previous.xM + (next.xM - previous.xM) * fraction,
          yM: 0,
          vxMs: previous.vxMs + (next.vxMs - previous.vxMs) * fraction,
          vyMs: previous.vyMs + (next.vyMs - previous.vyMs) * fraction,
        };
        timeS -= dt * (1 - fraction);
      } else body = next;
      if (step % 10 === 0 || body.yM === 0) points.push({ timeS, ...body });
    }
    return { landingTimeS: timeS, impact: body, points };
  }

  function dragComparison(input = {}) {
    const state = normalize(input);
    const projectile = integrate({ xM: 0, yM: state.heightM, vxMs: state.launchSpeedMs, vyMs: 0 }, state);
    const dropped = integrate({ xM: 0, yM: state.heightM, vxMs: 0, vyMs: 0 }, state);
    return {
      ...state,
      projectile,
      dropped,
      impactTimeDifferenceS: projectile.landingTimeS - dropped.landingTimeS,
      projectileRangeM: projectile.impact.xM,
      ideal: idealComparison({ ...state, releaseDelayMs: 0 }),
      idealModelValid: state.dragPerM < 1e-12,
    };
  }

  function speedSweep(input = {}, samples = 121) {
    const state = normalize(input);
    const count = Math.max(21, Math.round(samples));
    const landingTimeS = idealLandingTime(state);
    const points = Array.from({ length: count }, (_, index) => {
      const launchSpeedMs = 30 * index / (count - 1);
      return { launchSpeedMs, landingTimeS, rangeM: launchSpeedMs * landingTimeS };
    });
    return { ...state, landingTimeS, points, timeVariationS: 0 };
  }

  return { clamp, normalize, idealLandingTime, idealAt, idealComparison, strobe, derivative, rk4, integrate, dragComparison, speedSweep };
});
