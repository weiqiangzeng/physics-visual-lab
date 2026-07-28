(function () {
  const CURRENT_SCHEMA_VERSION = 1;
  const ARRAY_FIELDS = ["parameters", "formulas", "assumptions", "boundaries", "studentTasks", "teacherTasks"];

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function cloneArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function findVolumeId(books, chapterId) {
    const book = books.find((entry) => Array.isArray(entry.chapters)
      && entry.chapters.some((chapter) => chapter && chapter.id === chapterId));
    return book ? book.id : "";
  }

  function normalizeModel(model, books) {
    const source = isObject(model) ? model : {};
    const normalized = { ...source };
    normalized.schemaVersion = Number.isInteger(source.schemaVersion)
      ? source.schemaVersion
      : CURRENT_SCHEMA_VERSION;
    normalized.volumeId = source.volumeId || findVolumeId(books, source.chapterId);

    ARRAY_FIELDS.forEach((field) => {
      normalized[field] = cloneArray(source[field]);
    });

    return normalized;
  }

  function normalizeBook(book) {
    const source = isObject(book) ? book : {};
    return {
      ...source,
      chapters: Array.isArray(source.chapters)
        ? source.chapters.filter(isObject).map((chapter) => ({ ...chapter }))
        : []
    };
  }

  function normalizeCurriculum(input) {
    const source = isObject(input) ? input : {};
    const books = Array.isArray(source.books) ? source.books.map(normalizeBook) : [];
    const models = Array.isArray(source.models)
      ? source.models.map((model) => normalizeModel(model, books))
      : [];
    const modelById = new Map(models.map((model) => [model.id, model]));
    const directoryModels = Array.isArray(source.directoryModels)
      ? source.directoryModels.map((model) => modelById.get(model.id) || normalizeModel(model, books))
      : models.filter((model) => model.featured);

    return {
      ...source,
      schemaVersion: Number.isInteger(source.schemaVersion)
        ? source.schemaVersion
        : CURRENT_SCHEMA_VERSION,
      books,
      models,
      directoryModels,
      categories: cloneArray(source.categories),
      statusLabels: isObject(source.statusLabels) ? { ...source.statusLabels } : {}
    };
  }

  function validateCurriculum(input) {
    const errors = [];
    const source = isObject(input) ? input : {};

    if (!Array.isArray(source.books)) errors.push("books must be an array");
    if (!Array.isArray(source.models)) errors.push("models must be an array");

    if (Array.isArray(source.models)) {
      source.models.forEach((model, index) => {
        if (!isObject(model)) {
          errors.push(`models[${index}] must be an object`);
          return;
        }
        ARRAY_FIELDS.slice(0, 4).forEach((field) => {
          if (model[field] !== undefined && !Array.isArray(model[field])) {
            errors.push(`models[${index}].${field} must be an array`);
          }
        });
        if (Array.isArray(model.parameters)) {
          model.parameters.forEach((parameter, parameterIndex) => {
            if (!isObject(parameter)) {
              errors.push(`models[${index}].parameters[${parameterIndex}] must be an object`);
              return;
            }
            if (parameter.min !== undefined && typeof parameter.min !== "number") {
              errors.push(`models[${index}].parameters[${parameterIndex}].min must be a number`);
            }
            if (parameter.max !== undefined && typeof parameter.max !== "number") {
              errors.push(`models[${index}].parameters[${parameterIndex}].max must be a number`);
            }
            if (typeof parameter.min === "number" && typeof parameter.max === "number"
              && parameter.min > parameter.max) {
              errors.push(`models[${index}].parameters[${parameterIndex}] min exceeds max`);
            }
          });
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  function getModel(input, modelId) {
    const curriculum = normalizeCurriculum(input);
    return curriculum.models.find((model) => model.id === modelId) || null;
  }

  window.physicsPlatformProtocol = {
    CURRENT_SCHEMA_VERSION,
    normalizeCurriculum,
    normalizeModel,
    validateCurriculum,
    getModel
  };
})();
