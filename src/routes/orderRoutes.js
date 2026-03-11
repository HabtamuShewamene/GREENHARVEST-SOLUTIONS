// Moved from routes/orderRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createOrder);
router.get("/", getUserOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
