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
} = require("../controllers/cartController");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("buyer"));

router.get("/", getCart);
router.post("/", addToCart);
router.patch("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

module.exports = router;
