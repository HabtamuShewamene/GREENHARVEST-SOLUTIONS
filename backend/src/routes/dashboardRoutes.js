// Moved from routes/dashboardRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  getFarmerDashboard,
  getFarmerOrders,
  getFarmerProducts,
  getAdminDashboard,
} = require("../controllers/dashboardController");

const router = express.Router();

router.use(authMiddleware);

router.get("/farmer", getFarmerDashboard);
router.get("/farmer/orders", getFarmerOrders);
router.get("/farmer/products", getFarmerProducts);
router.get("/admin", getAdminDashboard);

module.exports = router;
