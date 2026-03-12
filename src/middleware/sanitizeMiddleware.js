const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === "object") {
    const sanitizedObject = {};

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return;
      }

      sanitizedObject[key] = sanitizeValue(nestedValue);
    });

    return sanitizedObject;
  }

  return value;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }

  next();
};

module.exports = sanitizeMiddleware;
