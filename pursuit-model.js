(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  if (root) root.PursuitModel = model;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, finite(value, min))); }

  function normalize(input = {}) {
    return {
      xA0: finite(input.xA0, 40),
      xB0: finite(input.xB0, 0),
      vA: finite(input.vA, 6),
      vB: finite(input.vB, 10),
      aB: finite(input.aB, 0),
      delayB: clamp(input.delayB ?? 0, 0, 20),
      frameVelocity: finite(input.frameVelocity, 0)
    };
  }

  function bodyBAt(time, source = {}) {
    const input = normalize(source);
    const t = Math.max(0, finite(time, 0));
    const movingTime = Math.max(0, t - input.delayB);
    return {
      x: input.xB0 + input.vB * movingTime + .5 * input.aB * movingTime * movingTime,
      v: movingTime > 0 || input.delayB === 0 ? input.vB + input.aB * movingTime : 0,
      a: movingTime > 0 || input.delayB === 0 ? input.aB : 0,
      movingTime
    };
  }

  function stateAt(time, source = {}) {
    const input = normalize(source);
    const t = Math.max(0, finite(time, 0));
    const b = bodyBAt(t, input);
    const groundA = input.xA0 + input.vA * t;
    const groundB = b.x;
    return {
      time: t,
      xA: groundA - input.frameVelocity * t,
      xB: groundB - input.frameVelocity * t,
      groundXA: groundA,
      groundXB: groundB,
      vA: input.vA - input.frameVelocity,
      vB: b.v - input.frameVelocity,
      aA: 0,
      aB: b.a,
      separation: groundA - groundB,
      distance: Math.abs(groundA - groundB),
      relativeVelocity: input.vA - b.v,
      met: Math.abs(groundA - groundB) < .08
    };
  }

  function positiveRoots(a, b, c) {
    if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b].filter((root) => root >= 0);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];
    const root = Math.sqrt(discriminant);
    return [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((value) => value >= 0).sort((x, y) => x - y);
  }

  function encounter(source = {}) {
    const input = normalize(source);
    if (input.delayB > 0 && Math.abs(input.vA) > 1e-12) {
      const pre = (input.xB0 - input.xA0) / input.vA;
      if (pre >= 0 && pre <= input.delayB) return { exists: true, time: pre, position: input.xA0 + input.vA * pre, phase: "before-start" };
    }
    const d = input.delayB;
    const c = input.xB0 - input.xA0 - input.vA * d;
    const roots = positiveRoots(.5 * input.aB, input.vB - input.vA, c);
    const movingTime = roots.find((value) => value >= 0);
    if (!Number.isFinite(movingTime)) return { exists: false, time: Infinity, position: NaN, phase: "none" };
    const time = d + movingTime;
    return { exists: true, time, position: input.xA0 + input.vA * time, phase: d > 0 ? "after-delay" : "moving" };
  }

  function series(source = {}, duration = 20, count = 160) {
    const end = Math.max(.1, finite(duration, 20));
    return Array.from({ length: Math.max(2, Math.round(count)) + 1 }, (_, index) => stateAt(end * index / Math.max(2, Math.round(count)), source));
  }

  return { normalize, bodyBAt, stateAt, encounter, series };
});
