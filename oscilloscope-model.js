(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OscilloscopeModel = api;
})(typeof self !== "undefined" ? self : this, function() {
  const E_CHARGE = 1.602176634e-19;
  const ELECTRON_MASS = 9.1093837e-31;
  const C = 0.0002;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v)));
  function normalize(input = {}) {
    const n = {
      acceleratingVoltage: clamp(input.acceleratingVoltage ?? 500, 50, 2000),
      horizontalVoltage: clamp(input.horizontalVoltage ?? 0, -100, 100),
      verticalVoltage: clamp(input.verticalVoltage ?? 40, -100, 100),
      frequency: clamp(input.frequency ?? 2, .2, 10),
      phaseDeg: clamp(input.phaseDeg ?? 90, -180, 180),
      time: clamp(input.time ?? 0, 0, 2),
      mode: ["dc", "sweep", "xy", "dual"].includes(input.mode) ? input.mode : "dc"
    };
    return n;
  }
  function electronSpeed(acceleratingVoltage) {
    return Math.sqrt(2 * E_CHARGE * acceleratingVoltage / ELECTRON_MASS);
  }
  function signal(t, n) {
    const w = 2 * Math.PI * n.frequency;
    const phase = n.phaseDeg * Math.PI / 180;
    const y = n.mode === "dc" ? n.verticalVoltage : n.verticalVoltage * Math.sin(w * t + phase);
    const x = n.mode === "xy" ? n.horizontalVoltage * Math.sin(w * t) : n.horizontalVoltage;
    return { x, y };
  }
  function stateAt(time, input = {}) {
    const n = normalize({ ...input, time });
    const speed = electronSpeed(n.acceleratingVoltage);
    const s = signal(n.time, n);
    const sx = C * s.x;
    const sy = C * s.y;
    return {
      ...n, speed, speedKms: speed / 1e6, signalX: s.x, signalY: s.y,
      screenX: sx, screenY: sy,
      deflectionRatio: Math.hypot(sx, sy) / .9,
      kineticEnergyEv: n.acceleratingVoltage,
      voltageResidual: 0
    };
  }
  function series(input = {}, count = 180) {
    const n = normalize(input);
    return Array.from({ length: count + 1 }, (_, i) => stateAt(2 * i / count, n));
  }
  return { constants: { E_CHARGE, ELECTRON_MASS, deflectionCoefficient: C }, normalize, electronSpeed, signal, stateAt, series };
});
