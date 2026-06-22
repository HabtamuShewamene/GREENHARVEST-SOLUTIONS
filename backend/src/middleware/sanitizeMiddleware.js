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

  // Express 5 defines `req.query` as a getter (no setter). Shadow it per-request
  // so downstream handlers observe the sanitized query object.
  if (req.query && typeof req.query === "object") {
    const sanitizedQuery = sanitizeValue(req.query);
    Object.defineProperty(req, "query", {
      value: sanitizedQuery,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }

  next();
};

module.exports = sanitizeMiddleware;
