// Entry point updated during the structure refactor to bootstrap src/app.js.
require("./src/config/env");

const app = require("./src/app");
const { pool, connectDB } = require("./config/db");
const PORT = Number(process.env.PORT) || 5000;

const logServerEvent = (message, meta = {}) => {
  console.log(
    `[${new Date().toISOString()}] ${message}`,
    Object.keys(meta).length > 0 ? meta : ""
  );
};

const logServerError = (message, error, meta = {}) => {
  console.error(`[${new Date().toISOString()}] ${message}`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    ...meta,
  });
};

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logServerEvent(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logServerError("Server startup failed", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (error) => {
  logServerError("Unhandled promise rejection", error instanceof Error ? error : new Error(String(error)));
});

process.on("uncaughtException", (error) => {
  logServerError("Uncaught exception", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  logServerEvent("Received SIGINT, closing PostgreSQL pool");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logServerEvent("Received SIGTERM, closing PostgreSQL pool");
  await pool.end();
  process.exit(0);
});

startServer();