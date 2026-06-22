// Centralized environment loader added during the structure refactor.
const path = require("path");
const dotenv = require("dotenv");

const envFileName = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

dotenv.config({
  path: path.resolve(__dirname, "..", "..", envFileName),
  quiet: true,
});

module.exports = {
  env: process.env,
};
