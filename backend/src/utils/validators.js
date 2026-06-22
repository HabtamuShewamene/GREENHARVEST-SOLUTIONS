// Shared validation helpers for controllers and services.
const isPositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

const isNonNegativeNumber = (value) => {
  return !Number.isNaN(Number(value)) && Number(value) >= 0;
};

const isValidEmail = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
};

const isStrongPassword = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
};

const isRequired = (value) => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
};

const getMissingRequiredFields = (payload = {}, fieldNames = []) => {
  return fieldNames.filter((fieldName) => !isRequired(payload[fieldName]));
};

const isWithinRange = (value, min, max) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return false;
  }

  return numericValue >= min && numericValue <= max;
};

module.exports = {
  getMissingRequiredFields,
  isNonNegativeNumber,
  isPositiveInteger,
  isRequired,
  isStrongPassword,
  isValidEmail,
  isWithinRange,
};
