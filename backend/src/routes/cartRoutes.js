// Moved from routes/cartRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
} = require("../controllers/cartController");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("buyer"));

router.get("/", getCart);
router.post("/", addToCart);
router.delete("/clear", clearCart);
router.patch("/:id", updateCartItem);
router.put("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

module.exports = router;
