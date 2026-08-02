// Moved from routes/paymentRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  processPayment,
  getPaymentHistory,
  initializeChapaPayment,
  verifyChapaPayment
} = require("../controllers/paymentController");

const router = express.Router();

router.use(authMiddleware);

router.post("/process", processPayment);
router.get("/history", getPaymentHistory);
router.post("/chapa/initialize", initializeChapaPayment);
router.post("/chapa/verify", verifyChapaPayment);

router.post("/", processPayment);
router.get("/", getPaymentHistory);

module.exports = router;
