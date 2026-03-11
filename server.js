const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { pool, connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", async (req, res) => {
  res.status(200).send("Agricultural Ecommerce API Running");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.status(200).json({
      message: "Database connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Test DB route failed:", error.message);
    res.status(500).json({
      message: "Database connection error",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();