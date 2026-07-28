(function () {
  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = "physics-visual-lab-learning-records-v1";
  let memoryRecords = [];

  function storage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    if (typeof record.experimentId !== "string" || !record.experimentId.trim()) return null;
    return {
      schemaVersion: SCHEMA_VERSION,
      experimentId: record.experimentId,
      stateSnapshot: record.stateSnapshot && typeof record.stateSnapshot === "object"
        ? { ...record.stateSnapshot }
        : {},
      prediction: typeof record.prediction === "string" ? record.prediction : "",
      observations: typeof record.observations === "string" ? record.observations : "",
      explanation: typeof record.explanation === "string" ? record.explanation : "",
      conclusion: typeof record.conclusion === "string" ? record.conclusion : "",
      checkedTasks: Array.isArray(record.checkedTasks) ? record.checkedTasks.map(Boolean) : [],
      createdAt: typeof record.createdAt === "string" && record.createdAt
        ? record.createdAt
        : new Date().toISOString()
    };
  }

  function readAll() {
    const store = storage();
    if (!store) return memoryRecords.slice();
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeRecord).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function writeAll(records) {
    const store = storage();
    memoryRecords = records.slice();
    if (!store) return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Learning records are optional and must not block experiments.
    }
  }

  function save(record) {
    const normalized = normalizeRecord(record);
    if (!normalized) return null;
    const records = readAll();
    records.push(normalized);
    writeAll(records);
    return normalized;
  }

  function read(experimentId) {
    return readAll().filter((record) => !experimentId || record.experimentId === experimentId);
  }

  function exportJSON(records) {
    const payload = Array.isArray(records) ? records : [records];
    return JSON.stringify(payload.map(normalizeRecord).filter(Boolean), null, 2);
  }

  window.physicsLearningRecords = {
    SCHEMA_VERSION,
    STORAGE_KEY,
    normalizeRecord,
    save,
    read,
    readAll,
    exportJSON
  };
})();
