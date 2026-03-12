// Moved from routes/deliveryRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  assignDeliveryPartner,
  updateDeliveryStatus,
  trackDelivery,
} = require("../controllers/deliveryController");

const router = express.Router();

router.use(authMiddleware);

router.post("/assign", roleMiddleware("admin"), assignDeliveryPartner);
router.put("/update-status", roleMiddleware("admin", "deliveryPartner"), updateDeliveryStatus);
router.get("/track/:orderId", trackDelivery);

router.patch("/:id/status", roleMiddleware("admin", "deliveryPartner"), updateDeliveryStatus);
router.get("/:order_id", trackDelivery);

module.exports = router;
