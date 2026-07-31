(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MeasurementToolsModel = api;
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const roundTo = (value, step) => Math.round(value / step) * step;

  function vernier(input = {}) {
    const divisions = [10, 20, 50].includes(Number(input.divisions)) ? Number(input.divisions) : 10;
    const leastCountMm = 1 / divisions;
    const jawMm = clamp(input.jawMm ?? 12.36, 0, 100);
    const zeroErrorMm = clamp(input.zeroErrorMm ?? 0, -0.5, 0.5);
    const rawMm = jawMm + zeroErrorMm;
    const indicatedMm = roundTo(rawMm, leastCountMm);
    let mainScaleMm = Math.floor(indicatedMm + 1e-10);
    let coincidence = Math.round((indicatedMm - mainScaleMm) / leastCountMm);
    if (coincidence >= divisions) { mainScaleMm += 1; coincidence = 0; }
    const vernierMm = coincidence * leastCountMm;
    const correctedMm = indicatedMm - zeroErrorMm;
    return {
      type: "vernier", divisions, leastCountMm, jawMm, zeroErrorMm, rawMm,
      indicatedMm, mainScaleMm, coincidence, vernierMm, correctedMm,
      quantizationErrorMm: indicatedMm - rawMm,
      reconstructionResidualMm: indicatedMm - mainScaleMm - vernierMm
    };
  }

  function micrometer(input = {}) {
    const pitchMm = 0.5;
    const divisions = 50;
    const leastCountMm = pitchMm / divisions;
    const openingMm = clamp(input.openingMm ?? 5.68, 0, 25);
    const zeroErrorMm = clamp(input.zeroErrorMm ?? 0, -0.1, 0.1);
    const rawMm = openingMm + zeroErrorMm;
    const indicatedMm = roundTo(rawMm, leastCountMm);
    let sleeveMm = Math.floor((indicatedMm + 1e-10) / pitchMm) * pitchMm;
    let thimbleDivision = Math.round((indicatedMm - sleeveMm) / leastCountMm);
    if (thimbleDivision >= divisions) { sleeveMm += pitchMm; thimbleDivision = 0; }
    const thimbleMm = thimbleDivision * leastCountMm;
    return {
      type: "micrometer", pitchMm, divisions, leastCountMm, openingMm, zeroErrorMm,
      rawMm, indicatedMm, sleeveMm, thimbleDivision, thimbleMm,
      correctedMm: indicatedMm - zeroErrorMm,
      quantizationErrorMm: indicatedMm - rawMm,
      reconstructionResidualMm: indicatedMm - sleeveMm - thimbleMm
    };
  }

  function ruler(input = {}) {
    const lengthMm = clamp(input.lengthMm ?? 36.4, 0, 150);
    const zeroOffsetMm = clamp(input.zeroOffsetMm ?? 0, -5, 5);
    const leastCountMm = 1;
    const estimatedMm = roundTo(lengthMm + zeroOffsetMm, 0.1);
    return {
      type: "ruler", lengthMm, zeroOffsetMm, leastCountMm, estimatedMm,
      correctedMm: estimatedMm - zeroOffsetMm,
      quantizationErrorMm: estimatedMm - lengthMm - zeroOffsetMm
    };
  }

  function precisionComparison(input = {}) {
    const valueMm = clamp(input.valueMm ?? 12.36, 0, 100);
    return [
      { tool: "刻度尺", leastCountMm: 1, readingMm: roundTo(valueMm, .1) },
      { tool: "10分度游标", leastCountMm: .1, readingMm: roundTo(valueMm, .1) },
      { tool: "20分度游标", leastCountMm: .05, readingMm: roundTo(valueMm, .05) },
      { tool: "50分度游标", leastCountMm: .02, readingMm: roundTo(valueMm, .02) },
      { tool: "螺旋测微器", leastCountMm: .01, readingMm: roundTo(valueMm, .01) }
    ].map((item) => ({ ...item, errorMm: item.readingMm - valueMm }));
  }

  function challenge(seed = 1, tool = "vernier") {
    const x = Math.abs(Math.sin(Number(seed) * 12.9898) * 43758.5453) % 1;
    if (tool === "micrometer") {
      const openingMm = roundTo(1 + x * 20, .01);
      const zeroErrorMm = roundTo(((Math.floor(Number(seed)) % 5) - 2) * .01, .01);
      return micrometer({ openingMm, zeroErrorMm });
    }
    const divisions = [10, 20, 50][Math.abs(Math.floor(Number(seed))) % 3];
    const leastCountMm = 1 / divisions;
    const jawMm = roundTo(5 + x * 80, leastCountMm);
    const zeroErrorMm = roundTo(((Math.floor(Number(seed)) % 5) - 2) * leastCountMm, leastCountMm);
    return vernier({ jawMm, zeroErrorMm, divisions });
  }

  return { vernier, micrometer, ruler, precisionComparison, challenge };
});
