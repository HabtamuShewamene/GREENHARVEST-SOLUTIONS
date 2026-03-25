// Moved from config/db.js during the structure refactor.
const { Pool } = require("pg");
require("./env");

const requiredDbEnvVars = ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASSWORD"];

const getMissingDbEnvVars = () => {
  return requiredDbEnvVars.filter((envVarName) => !process.env[envVarName]);
};

const missingDbEnvVars = getMissingDbEnvVars();

if (missingDbEnvVars.length > 0) {
  console.error(
    `Database configuration error: missing environment variables: ${missingDbEnvVars.join(
      ", "
    )}`
  );
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
  allowExitOnIdle:
    process.env.DB_ALLOW_EXIT_ON_IDLE === "true" || process.env.NODE_ENV === "test",
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
        }
      : false,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
});

const connectDB = async () => {
  if (missingDbEnvVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingDbEnvVars.join(", ")}`
    );
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("PostgreSQL connection failed:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  pool,
  connectDB,
};
