// Moved from routes/productRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductStock,
  batchUpdateProductStatus,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", authMiddleware, requireRole("farmer"), createProduct);
router.put("/:id", authMiddleware, requireRole("farmer"), updateProduct);
router.delete("/:id", authMiddleware, requireRole("farmer"), deleteProduct);
router.patch("/batch", authMiddleware, requireRole("farmer"), batchUpdateProductStatus);
router.patch("/:id/stock", authMiddleware, requireRole("farmer"), updateProductStock);

module.exports = router;
