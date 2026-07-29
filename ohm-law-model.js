(function (root) {
  const BASE_VOLTAGE = 3;
  const BASE_RESISTANCE = 3;

  function circuit(voltage, resistance) {
    return { voltage, resistance, current: voltage / resistance };
  }

  function calculate(mode, commonValue, compareValue) {
    if (mode === "resistance") {
      const a = circuit(commonValue, BASE_RESISTANCE);
      const b = circuit(commonValue, compareValue);
      return {
        mode,
        a,
        b,
        changedRatio: b.resistance / a.resistance,
        currentRatio: b.current / a.current
      };
    }

    const a = circuit(BASE_VOLTAGE, commonValue);
    const b = circuit(compareValue, commonValue);
    return {
      mode: "voltage",
      a,
      b,
      changedRatio: b.voltage / a.voltage,
      currentRatio: b.current / a.current
    };
  }

  const api = { BASE_VOLTAGE, BASE_RESISTANCE, calculate };
  root.OhmLawModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
