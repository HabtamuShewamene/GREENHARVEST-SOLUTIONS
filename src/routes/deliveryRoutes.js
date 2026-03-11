// Moved from routes/deliveryRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  assignDeliveryPartner,
  updateDeliveryStatus,
  trackDelivery,
} = require("../controllers/deliveryController");

const router = express.Router();

router.use(authMiddleware);

router.post("/assign", assignDeliveryPartner);
router.patch("/:id/status", updateDeliveryStatus);
router.get("/:order_id", trackDelivery);

module.exports = router;
