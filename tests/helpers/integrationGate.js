const testDbUrl = process.env.TEST_DB_URL || "";

const hasRealTestDb =
  Boolean(testDbUrl) &&
  !/your_database_password/i.test(testDbUrl) &&
  !/example/i.test(testDbUrl);

const isTruthyEnv = (value) => {
  if (value == null) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();

  return normalized !== "" && normalized !== "0" && normalized !== "false";
};

const isCi =
  isTruthyEnv(process.env.CI) ||
  isTruthyEnv(process.env.GITHUB_ACTIONS) ||
  isTruthyEnv(process.env.BUILD_BUILDID);

if (isCi && !hasRealTestDb) {
  throw new Error(
    "Integration tests require a valid TEST_DB_URL in CI. The suite will not run with placeholder or missing values."
  );
}

module.exports = hasRealTestDb ? describe : describe.skip;