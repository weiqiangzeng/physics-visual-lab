(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.ElectricFieldModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const K = 8.988e9;
  const MIN_DISTANCE = 0.24;
  const PATH_START = Object.freeze({ x: -3, y: -1.5 });
  const PATH_END = Object.freeze({ x: 2.5, y: 1.2 });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function pointSources(input) {
    const separation = Math.max(0.8, Number(input.separation));
    if (input.mode === "single") return [{ x: 0, y: 0, qNanoC: Number(input.q1) }];
    return [
      { x: -separation / 2, y: 0, qNanoC: Number(input.q1) },
      { x: separation / 2, y: 0, qNanoC: Number(input.q2) }
    ];
  }

  function fieldFromSources(sources, x, y) {
    let ex = 0;
    let ey = 0;
    let potential = 0;
    let nearest = Infinity;
    for (const source of sources) {
      if (Math.abs(source.qNanoC) < 1e-15) continue;
      const dx = x - source.x;
      const dy = y - source.y;
      const radius = Math.hypot(dx, dy);
      nearest = Math.min(nearest, radius);
      if (radius < 1e-9) return { ex: NaN, ey: NaN, potential: NaN, magnitude: Infinity, nearest: 0, singular: true };
      const qC = source.qNanoC * 1e-9;
      const scale = K * qC / (radius * radius * radius);
      ex += scale * dx;
      ey += scale * dy;
      potential += K * qC / radius;
    }
    if (nearest === Infinity) nearest = null;
    return { ex, ey, potential, magnitude: Math.hypot(ex, ey), nearest, singular: nearest !== null && nearest < MIN_DISTANCE };
  }

  function pointState(input) {
    const sources = pointSources(input);
    const x = Number(input.x);
    const y = Number(input.y);
    const qNanoC = Number(input.testCharge);
    const field = fieldFromSources(sources, x, y);
    return {
      ...field,
      x,
      y,
      qNanoC,
      sources,
      forceXNanoN: qNanoC * field.ex,
      forceYNanoN: qNanoC * field.ey,
      forceNanoN: Math.abs(qNanoC) * field.magnitude,
      energyNanoJ: qNanoC * field.potential
    };
  }

  function uniformState(input, point) {
    const field = Number(input.uniformField);
    const qNanoC = Number(input.testCharge);
    const x = Number(point.x);
    const y = Number(point.y);
    const potential = -field * x;
    return {
      x,
      y,
      ex: field,
      ey: 0,
      magnitude: Math.abs(field),
      potential,
      qNanoC,
      forceXNanoN: qNanoC * field,
      forceYNanoN: 0,
      forceNanoN: Math.abs(qNanoC * field),
      energyNanoJ: qNanoC * potential,
      singular: false,
      nearest: null,
      sources: []
    };
  }

  function pathPoint(path, progress) {
    const t = clamp(progress, 0, 1);
    const a = PATH_START;
    const b = PATH_END;
    if (path === "curve") {
      const c1 = { x: -2.7, y: 2.3 };
      const c2 = { x: 1.6, y: 2.4 };
      const u = 1 - t;
      return {
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y
      };
    }
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function workState(input, progress) {
    const point = pathPoint(input.path, progress);
    const state = uniformState(input, point);
    const start = uniformState(input, PATH_START);
    const end = uniformState(input, PATH_END);
    const workNanoJ = Number(input.testCharge) * Number(input.uniformField) * (point.x - PATH_START.x);
    const deltaEnergyNanoJ = state.energyNanoJ - start.energyNanoJ;
    return {
      ...state,
      progress: clamp(progress, 0, 1),
      path: input.path,
      start,
      end,
      workNanoJ,
      deltaEnergyNanoJ,
      residualNanoJ: workNanoJ + deltaEnergyNanoJ,
      finalWorkNanoJ: Number(input.testCharge) * Number(input.uniformField) * (PATH_END.x - PATH_START.x)
    };
  }

  return {
    K,
    MIN_DISTANCE,
    PATH_START,
    PATH_END,
    clamp,
    pointSources,
    fieldFromSources,
    pointState,
    uniformState,
    pathPoint,
    workState
  };
});
