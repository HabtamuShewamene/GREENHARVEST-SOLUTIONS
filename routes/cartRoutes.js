const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
} = require("../controllers/cartController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCart);
router.post("/", addToCart);
router.patch("/:id", updateCartItem);
router.delete("/:id", removeCartItem);

module.exports = router;