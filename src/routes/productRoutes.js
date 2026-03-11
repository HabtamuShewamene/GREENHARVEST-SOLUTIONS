// Moved from routes/productRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
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
router.post("/", authMiddleware, createProduct);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.patch("/:id/stock", authMiddleware, updateProductStock);

module.exports = router;
