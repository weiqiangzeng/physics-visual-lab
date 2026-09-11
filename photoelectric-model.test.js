const assert = require("node:assert/strict");
const model = require("./photoelectric-model.js");

const sodium = { material: "sodium", intensity: 60, voltage: 0 };
const below = model.solve({ ...sodium, wavelengthNm: 550 });
const near = model.solve({ ...sodium, wavelengthNm: 540 });
const higherFrequency = model.solve({ ...sodium, wavelengthNm: 500 });
const stronger = model.solve({ ...higherFrequency, intensity: 100 });
const stopping = model.solve({ ...higherFrequency, voltage: -higherFrequency.stoppingVoltage });

assert.equal(below.emits, false, "below cutoff must not emit electrons");
assert.equal(below.photocurrentNa, 0, "below cutoff current must be zero");
assert.equal(below.maxKineticEnergyEv, 0, "below cutoff kinetic energy must be clamped to zero");
assert.equal(below.stoppingVoltage, 0, "below cutoff stopping voltage must be zero");

assert.equal(near.emits, true, "just above sodium cutoff must emit electrons");
assert(near.maxKineticEnergyEv < 0.03, "near-cutoff kinetic energy should be close to zero");
assert(near.stoppingVoltage < 0.03, "near-cutoff stopping voltage should be close to zero");

assert(higherFrequency.photonEnergyEv > near.photonEnergyEv, "shorter wavelength must increase photon energy");
assert(higherFrequency.maxKineticEnergyEv > near.maxKineticEnergyEv, "higher frequency must increase maximum kinetic energy");
assert(higherFrequency.stoppingVoltage > near.stoppingVoltage, "higher frequency must increase stopping voltage");

assert(stronger.photocurrentNa > higherFrequency.photocurrentNa, "higher intensity must increase current");
assert.equal(stronger.maxKineticEnergyEv, higherFrequency.maxKineticEnergyEv, "intensity must not change maximum kinetic energy");
assert.equal(stronger.stoppingVoltage, higherFrequency.stoppingVoltage, "intensity must not change stopping voltage");

assert(Math.abs(stopping.photocurrentNa) < 1e-9, "reverse voltage at stopping voltage must make current zero");
assert.equal(stopping.stoppingVoltage, higherFrequency.stoppingVoltage, "stopping voltage remains an energy property");

console.log("photoelectric-model.test.js: all assertions passed");
