(function () {
  const BOOLEAN_TRUE = new Set(["1", "true", "yes"]);

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function inStep(value, step, min) {
    if (!Number.isFinite(step) || step <= 0) return true;
    const ratio = (value - (Number.isFinite(min) ? min : 0)) / step;
    return Math.abs(ratio - Math.round(ratio)) < 1e-8;
  }

  function parseValue(raw, definition) {
    const type = definition?.type || "string";
    if (type === "number") {
      const value = toNumber(raw);
      if (value === null) return { valid: false };
      if (Number.isFinite(definition.min) && value < definition.min) return { valid: false };
      if (Number.isFinite(definition.max) && value > definition.max) return { valid: false };
      if (!inStep(value, definition.step, definition.min)) return { valid: false };
      return { valid: true, value };
    }
    if (type === "boolean") {
      return { valid: BOOLEAN_TRUE.has(String(raw).toLowerCase()) || raw === "0" || raw === "false", value: BOOLEAN_TRUE.has(String(raw).toLowerCase()) };
    }
    if (type === "enum") {
      const values = Array.isArray(definition.values) ? definition.values : [];
      return values.includes(raw) ? { valid: true, value: raw } : { valid: false };
    }
    return { valid: true, value: String(raw) };
  }

  function defaultsFor(schema) {
    const fields = schema?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, definition]) => [key, definition.default]));
  }

  function read(schema, search = window.location.search) {
    const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || "");
    const state = defaultsFor(schema);
    const invalid = [];
    const unknown = [];
    const fields = schema?.fields || {};

    params.forEach((raw, key) => {
      if (key === "reset" || key === "teacher" || key === "student") return;
      if (!Object.prototype.hasOwnProperty.call(fields, key)) {
        unknown.push(key);
        return;
      }
      const parsed = parseValue(raw, fields[key]);
      if (parsed.valid) state[key] = parsed.value;
      else invalid.push(key);
    });

    return {
      state,
      reset: params.get("reset") === "1",
      audience: params.has("teacher") ? "teacher" : params.has("student") ? "student" : null,
      invalid,
      unknown
    };
  }

  function serialize(schema, state = {}, flags = {}) {
    const params = new URLSearchParams();
    const fields = schema?.fields || {};
    Object.entries(fields).forEach(([key, definition]) => {
      const value = state[key];
      if (value === undefined || value === null) return;
      const parsed = parseValue(String(value), definition);
      if (parsed.valid) params.set(key, String(value));
    });
    if (flags.reset) params.set("reset", "1");
    if (flags.audience === "teacher") params.set("teacher", "1");
    if (flags.audience === "student") params.set("student", "1");
    return params;
  }

  window.physicsUrlState = { read, serialize, defaultsFor };
})();
