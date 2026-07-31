(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Collision2DModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const scale = (a, factor) => ({ x: a.x * factor, y: a.y * factor });

  function normalize(input = {}) {
    return {
      mass1Kg: clamp(input.mass1Kg ?? 1, 0.1, 10),
      mass2Kg: clamp(input.mass2Kg ?? 1, 0.1, 10),
      speed1Ms: clamp(input.speed1Ms ?? 4, 0, 15),
      angle1Deg: clamp(input.angle1Deg ?? 0, -180, 180),
      speed2Ms: clamp(input.speed2Ms ?? 0, 0, 15),
      angle2Deg: clamp(input.angle2Deg ?? 0, -180, 180),
      normalDeg: clamp(input.normalDeg ?? 45, -90, 90),
      restitution: clamp(input.restitution ?? 1, 0, 1),
    };
  }

  function solve(input = {}) {
    const n = normalize(input);
    const a1 = n.angle1Deg * Math.PI / 180, a2 = n.angle2Deg * Math.PI / 180, phi = n.normalDeg * Math.PI / 180;
    const u1 = { x: n.speed1Ms * Math.cos(a1), y: n.speed1Ms * Math.sin(a1) };
    const u2 = { x: n.speed2Ms * Math.cos(a2), y: n.speed2Ms * Math.sin(a2) };
    const normal = { x: Math.cos(phi), y: Math.sin(phi) };
    const tangent = { x: -normal.y, y: normal.x };
    const relative = { x: u1.x - u2.x, y: u1.y - u2.y };
    const approachSpeedMs = dot(relative, normal);
    const collided = approachSpeedMs > 1e-12;
    const impulseNs = collided ? (1 + n.restitution) * approachSpeedMs / (1 / n.mass1Kg + 1 / n.mass2Kg) : 0;
    const v1 = collided ? add(u1, scale(normal, -impulseNs / n.mass1Kg)) : { ...u1 };
    const v2 = collided ? add(u2, scale(normal, impulseNs / n.mass2Kg)) : { ...u2 };
    const momentumBefore = add(scale(u1, n.mass1Kg), scale(u2, n.mass2Kg));
    const momentumAfter = add(scale(v1, n.mass1Kg), scale(v2, n.mass2Kg));
    const kineticBeforeJ = 0.5 * n.mass1Kg * dot(u1, u1) + 0.5 * n.mass2Kg * dot(u2, u2);
    const kineticAfterJ = 0.5 * n.mass1Kg * dot(v1, v1) + 0.5 * n.mass2Kg * dot(v2, v2);
    const reducedMassKg = n.mass1Kg * n.mass2Kg / (n.mass1Kg + n.mass2Kg);
    const expectedLossJ = collided ? 0.5 * reducedMassKg * (1 - n.restitution ** 2) * approachSpeedMs ** 2 : 0;
    const separationNormalMs = dot({ x: v2.x - v1.x, y: v2.y - v1.y }, normal);
    return {
      ...n, u1, u2, v1, v2, normal, tangent, approachSpeedMs, separationNormalMs, collided, impulseNs,
      momentumBefore, momentumAfter,
      momentumResidual: { x: momentumAfter.x - momentumBefore.x, y: momentumAfter.y - momentumBefore.y },
      kineticBeforeJ, kineticAfterJ, kineticLossJ: kineticBeforeJ - kineticAfterJ,
      expectedLossJ, energyLossResidualJ: kineticBeforeJ - kineticAfterJ - expectedLossJ,
      restitutionResidual: collided ? separationNormalMs - n.restitution * approachSpeedMs : 0,
      tangentResidual1Ms: dot(v1, tangent) - dot(u1, tangent),
      tangentResidual2Ms: dot(v2, tangent) - dot(u2, tangent),
      centerOfMassVelocity: scale(momentumBefore, 1 / (n.mass1Kg + n.mass2Kg)),
    };
  }

  return { normalize, solve };
});
