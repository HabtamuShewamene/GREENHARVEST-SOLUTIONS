// Moved from routes/paymentRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  processPayment,
  getPaymentHistory,
} = require("../controllers/paymentController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", processPayment);
router.get("/", getPaymentHistory);

module.exports = router;
