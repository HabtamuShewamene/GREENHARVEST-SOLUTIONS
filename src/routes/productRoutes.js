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
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", authMiddleware, requireRole("field_agent", "farmer"), createProduct);
router.put("/:id", authMiddleware, requireRole("farmer", "field_agent"), updateProduct);
router.delete("/:id", authMiddleware, requireRole("farmer", "field_agent"), deleteProduct);
router.patch("/:id/stock", authMiddleware, updateProductStock);

module.exports = router;
