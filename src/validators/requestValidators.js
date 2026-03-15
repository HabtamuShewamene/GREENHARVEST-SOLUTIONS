const {
  getMissingRequiredFields,
  isNonNegativeNumber,
  isPositiveInteger,
  isRequired,
  isStrongPassword,
  isValidEmail,
  isWithinRange,
} = require("../utils/validators");

const validateRequiredFields = (payload, requiredFields) => {
  const missing = requiredFields.filter((field) => !isRequired(payload[field]));

  if (missing.length > 0) {
    const error = new Error(`${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required`);
    error.statusCode = 400;
    throw error;
  }
};

const validateEmail = (email) => {
  if (!isValidEmail(email)) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }
};

const validatePositivePrice = (price) => {
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
    const error = new Error("price must be a number greater than 0");
    error.statusCode = 400;
    throw error;
  }
};

const validatePositiveQuantity = (quantity) => {
  if (!isPositiveInteger(quantity)) {
    const error = new Error("quantity must be a positive integer");
    error.statusCode = 400;
    throw error;
  }
};

const validateRating = (rating) => {
  if (!isWithinRange(rating, 1, 5) || !Number.isInteger(Number(rating))) {
    const error = new Error("rating must be an integer between 1 and 5");
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  getMissingRequiredFields,
  isNonNegativeNumber,
  isPositiveInteger,
  isRequired,
  isStrongPassword,
  isValidEmail,
  isWithinRange,
  validateEmail,
  validatePositivePrice,
  validatePositiveQuantity,
  validateRating,
  validateRequiredFields,
};
