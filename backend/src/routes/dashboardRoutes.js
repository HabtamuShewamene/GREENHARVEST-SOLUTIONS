// Moved from routes/dashboardRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const {
  getFarmerDashboard,
  getFarmerOrders,
  getFarmerProducts,
  getAdminDashboard,
  exportFarmerOrdersCSV,
  exportFarmerProductsCSV,
  batchUpdateProductStatus,
  updateReturnStatus,
} = require("../controllers/dashboardController");

const router = express.Router();

router.use(authMiddleware);

router.get("/farmer", requireRole("farmer"), getFarmerDashboard);
router.get("/farmer/orders", requireRole("farmer"), getFarmerOrders);
router.get("/farmer/orders/export-csv", requireRole("farmer"), exportFarmerOrdersCSV);
router.get("/farmer/products", requireRole("farmer"), getFarmerProducts);
router.get("/farmer/products/export-csv", requireRole("farmer"), exportFarmerProductsCSV);
router.post("/farmer/products/batch", requireRole("farmer"), batchUpdateProductStatus);
router.patch("/farmer/orders/:orderId/return", requireRole("farmer"), updateReturnStatus);
router.get("/admin", requireRole("admin"), getAdminDashboard);

module.exports = router;
