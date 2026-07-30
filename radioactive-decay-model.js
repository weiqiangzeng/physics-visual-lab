(function (root, factory) {
  const model = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (root) root.RadioactiveDecayModel = model;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const LN2 = Math.log(2);
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
  function decayConstant(halfLife) { return LN2 / Math.max(1e-12, Number(halfLife)); }
  function survivalProbability(time, halfLife) { return Math.exp(-decayConstant(halfLife) * Math.max(0, Number(time))); }
  function expectedState(input = {}) {
    const initialCount = Math.max(0, Math.round(Number(input.initialCount ?? 160)));
    const halfLife = Math.max(1e-12, Number(input.halfLife ?? 6));
    const time = Math.max(0, Number(input.time ?? 0));
    const lambda = decayConstant(halfLife);
    const survival = survivalProbability(time, halfLife);
    const expectedRemaining = initialCount * survival;
    const expectedDecayed = initialCount - expectedRemaining;
    const expectedActivity = lambda * expectedRemaining;
    const sigmaRemaining = Math.sqrt(initialCount * survival * (1 - survival));
    return { initialCount, halfLife, time, halfLivesElapsed: time / halfLife, lambda, survival, decayProbability: 1 - survival, expectedRemaining, expectedDecayed, expectedActivity, sigmaRemaining, relativeSigma: expectedRemaining > 0 ? sigmaRemaining / expectedRemaining : 0 };
  }
  function seededRandom(seed = 2027) { let value = seed >>> 0; return function () { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; }; }
  function generateDecayTimes(initialCount, halfLife, seed = 2027) {
    const random = seededRandom(seed); const lambda = decayConstant(halfLife);
    return Array.from({ length: Math.max(0, Math.round(initialCount)) }, () => -Math.log(Math.max(1e-12, 1 - random())) / lambda).sort((a, b) => a - b);
  }
  function realizationState(input = {}, decayTimes = null) {
    const expected = expectedState(input); const times = decayTimes || generateDecayTimes(expected.initialCount, expected.halfLife, input.seed ?? 2027);
    let low = 0; let high = times.length;
    while (low < high) { const mid = (low + high) >> 1; if (times[mid] <= expected.time) low = mid + 1; else high = mid; }
    const decayedCount = low; const remainingCount = expected.initialCount - decayedCount;
    return { ...expected, decayTimes: times, decayedCount, remainingCount, deviation: remainingCount - expected.expectedRemaining, zScore: expected.sigmaRemaining > 0 ? (remainingCount - expected.expectedRemaining) / expected.sigmaRemaining : 0 };
  }
  function expectedSeries(input = {}, count = 160, maxHalfLives = 4) { return Array.from({ length: count + 1 }, (_, index) => expectedState({ ...input, time: Number(input.halfLife ?? 6) * maxHalfLives * index / count })); }
  function intervalDecayProbability(startTime, duration, halfLife) { const start = Math.max(0, Number(startTime)); const dt = Math.max(0, Number(duration)); return survivalProbability(start, halfLife) - survivalProbability(start + dt, halfLife); }
  return { LN2, clamp, decayConstant, survivalProbability, expectedState, generateDecayTimes, realizationState, expectedSeries, intervalDecayProbability };
});
