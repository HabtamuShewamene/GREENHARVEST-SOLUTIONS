const express = require("express");

const { pool } = require("../config/db");

const router = express.Router();

// Readiness probe that confirms both the API process and PostgreSQL are reachable.
router.get("/health", async (req, res) => {
  try {
    // A lightweight query is enough to prove the current DB connection is alive.
    const result = await pool.query("SELECT NOW() AS db_time");

    return res.status(200).json({
      status: "ok",
      backend: "running",
      database: "connected",
      dbTime: result.rows[0].db_time,
    });
  } catch (error) {
    // If PostgreSQL cannot be reached, expose a 503 so orchestrators can treat the app as not ready.
    return res.status(503).json({
      status: "fail",
      backend: "running",
      database: "disconnected",
      error: error.message,
    });
  }
});

module.exports = router;
