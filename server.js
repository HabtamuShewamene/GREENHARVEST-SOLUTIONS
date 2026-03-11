const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { pool, connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const searchRoutes = require("./routes/searchRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

dotenv.config();

const app = express();
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);

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
    logServerError("Test DB route failed", error, {
      path: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      message: "Database connection error",
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    console.error("Invalid JSON payload received:", {
      message: error.message,
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(400).json({
      message: "Invalid JSON payload",
    });
  }

  logServerError("Unhandled application error", error, {
    path: req.originalUrl,
    method: req.method,
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    message: error.statusCode && error.statusCode < 500 ? error.message : "Internal server error",
  });
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