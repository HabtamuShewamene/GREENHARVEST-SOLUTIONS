// Centralized environment loader added during the structure refactor.
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  env: process.env,
};
