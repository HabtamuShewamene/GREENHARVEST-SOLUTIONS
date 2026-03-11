// Added during the structure refactor as a shared validation utility.
const isPositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

const isNonNegativeNumber = (value) => {
  return !Number.isNaN(Number(value)) && Number(value) >= 0;
};

module.exports = {
  isPositiveInteger,
  isNonNegativeNumber,
};
