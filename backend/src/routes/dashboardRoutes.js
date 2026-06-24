// Moved from routes/dashboardRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
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

router.get("/farmer", getFarmerDashboard);
router.get("/farmer/orders", getFarmerOrders);
router.get("/farmer/orders/export-csv", exportFarmerOrdersCSV);
router.get("/farmer/products", getFarmerProducts);
router.get("/farmer/products/export-csv", exportFarmerProductsCSV);
router.post("/farmer/products/batch", batchUpdateProductStatus);
router.patch("/farmer/orders/:orderId/return", updateReturnStatus);
router.get("/admin", getAdminDashboard);

module.exports = router;
