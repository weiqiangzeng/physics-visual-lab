const assert = require("node:assert/strict");
const model = require("./ideal-gas-model.js");

const base = { amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen" };
const isothermalStart = model.processState({ ...base, mode: "isothermal" }, 0);
const isothermalEnd = model.processState({ ...base, mode: "isothermal" }, 1);
const isochoricStart = model.processState({ ...base, mode: "isochoric" }, 0);
const isochoricEnd = model.processState({ ...base, mode: "isochoric" }, 1);
const isobaricStart = model.processState({ ...base, mode: "isobaric" }, 0);
const isobaricEnd = model.processState({ ...base, mode: "isobaric" }, 1);
const helium = model.processState({ ...base, species: "helium" }, 0);
const oxygen = model.processState({ ...base, species: "oxygen" }, 0);
const minimumVolume = model.processState({ ...base, mode: "microscopic", baseVolume: 4 }, 0);
const maximumVolume = model.processState({ ...base, mode: "microscopic", baseVolume: 30 }, 0);

assert(Math.abs(isothermalStart.temperature - isothermalEnd.temperature) < 1e-12, "isothermal temperature must remain constant");
assert(isothermalEnd.volumeLiters < isothermalStart.volumeLiters, "isothermal process must compress volume");
assert(isothermalEnd.pressurePa > isothermalStart.pressurePa, "isothermal compression must increase pressure");
assert(Math.abs(isothermalEnd.pVJ - isothermalStart.pVJ) < 1e-9, "isothermal pV must remain constant");

assert(Math.abs(isochoricStart.volumeLiters - isochoricEnd.volumeLiters) < 1e-12, "isochoric volume must remain constant");
assert(isochoricEnd.temperature > isochoricStart.temperature, "isochoric process must heat the gas");
assert(isochoricEnd.pressurePa > isochoricStart.pressurePa, "isochoric heating must increase pressure");
assert(Math.abs(isochoricEnd.pressurePa / isochoricEnd.temperature - isochoricStart.pressurePa / isochoricStart.temperature) < 1e-9, "isochoric p/T must remain constant");

assert(Math.abs(isobaricStart.pressurePa - isobaricEnd.pressurePa) < 1e-9, "isobaric pressure must remain constant");
assert(isobaricEnd.volumeLiters > isobaricStart.volumeLiters, "isobaric process must expand volume");
assert(isobaricEnd.temperature > isobaricStart.temperature, "isobaric process must heat the gas");
assert(Math.abs(isobaricEnd.volumeLiters / isobaricEnd.temperature - isobaricStart.volumeLiters / isobaricStart.temperature) < 1e-12, "isobaric V/T must remain constant");

assert(Math.abs(helium.pressurePa - oxygen.pressurePa) < 1e-9, "same n,V,T must give same pressure for different gases");
assert(helium.rmsSpeed > oxygen.rmsSpeed, "lighter helium must have higher rms speed");
assert(minimumVolume.volumeLiters >= 4 && maximumVolume.volumeLiters <= 30, "volume boundaries must be respected");

console.log("ideal-gas-model.test.js: all assertions passed");
