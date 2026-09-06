"use strict";

const assert = require("node:assert/strict");
const model = require("./wave-interference-model.js");

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
};

const base = {
  amplitude: 1,
  wavelengthM: 2,
  frequency1Hz: 1,
  frequency2Hz: 1,
  separationM: 4,
  sourcePhaseDeg: 0,
  probeXM: 0,
  probeYM: 4,
  timeS: 0.37,
  averagingTimeS: 1,
  attenuation: false,
};

{
  const probe = model.probe(base);
  const sample = model.intensityAt(base.probeXM, base.probeYM, base);
  closeTo(probe.pathDifferenceM, 0);
  closeTo(probe.coherentIntensity, 4);
  closeTo(probe.averagedIntensity, 4);
  closeTo(probe.averagedIntensity, sample.averagedIntensity);
  closeTo(probe.pathPhaseRad, sample.pathPhaseRad);
  closeTo(probe.sourcePhaseRad, sample.sourcePhaseRad);
}

{
  const probe = model.probe({ ...base, sourcePhaseDeg: 180 });
  closeTo(probe.coherentIntensity, 0);
  closeTo(probe.averagedIntensity, 0);
  closeTo(probe.displacement, 0);
}

{
  const probe = model.probe({ ...base, frequency2Hz: 2, averagingTimeS: 1 });
  closeTo(probe.coherence, 0, 1e-12);
  closeTo(probe.averagedIntensity, 2, 1e-12);
}

{
  const nearSource = { ...base, probeXM: -2, probeYM: 0.01, attenuation: true };
  const probe = model.probe(nearSource);
  const sample = model.intensityAt(nearSource.probeXM, nearSource.probeYM, nearSource);
  closeTo(sample.radius1M, 0.05);
  closeTo(probe.one.radiusM, sample.radius1M);
  closeTo(probe.two.radiusM, sample.radius2M);
  closeTo(probe.averagedIntensity, sample.averagedIntensity);
  closeTo(probe.intensity1, sample.intensity1);
  closeTo(probe.intensity2, sample.intensity2);
}

{
  const instantA = model.probe({ ...base, timeS: 0 });
  const instantB = model.probe({ ...base, timeS: 7.13 });
  closeTo(instantA.averagedIntensity, instantB.averagedIntensity);
  assert.notEqual(instantA.displacement, instantB.displacement);
  const detunedA = model.probe({ ...base, frequency2Hz: 1.4, timeS: 0 });
  const detunedB = model.probe({ ...base, frequency2Hz: 1.4, timeS: 0.37 });
  assert.notEqual(detunedA.phaseDifferenceNowRad, detunedB.phaseDifferenceNowRad);
}

{
  const point = { ...base, probeXM: 1.3, probeYM: 2.7, sourcePhaseDeg: 45, frequency2Hz: 1.4, averagingTimeS: 0.8 };
  const probe = model.probe(point);
  const sample = model.intensityAt(point.probeXM, point.probeYM, point);
  closeTo(probe.pathDifferenceM, sample.pathDifferenceM);
  closeTo(probe.phaseDifferenceAtWindowStartRad, probe.pathPhaseRad + probe.sourcePhaseRad);
  closeTo(probe.phaseDifferenceNowRad, probe.phaseDifferenceAtWindowStartRad - 2 * Math.PI * (point.frequency2Hz - point.frequency1Hz) * point.timeS);
  closeTo(probe.averagedIntensity, sample.averagedIntensity);
}

{
  const attenuated = model.intensityAt(1, 3, { ...base, attenuation: true });
  const unattenuated = model.intensityAt(1, 3, { ...base, attenuation: false });
  closeTo(attenuated.pathDifferenceM, unattenuated.pathDifferenceM);
  closeTo(attenuated.pathPhaseRad, unattenuated.pathPhaseRad);
  assert.notEqual(attenuated.averagedIntensity, unattenuated.averagedIntensity);
}

console.log("wave-interference-model tests passed");
