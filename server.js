const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");   // ✅ ADD THIS LINE

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Agricultural Ecommerce API Running");
});

// ADD THIS ROUTE
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Database connection error");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});