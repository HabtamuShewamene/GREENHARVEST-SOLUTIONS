// Moved from routes/reviewRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/product/:product_id", getProductReviews);
router.post("/", authMiddleware, requireRole("buyer"), addReview);
router.patch("/:id", authMiddleware, updateReview);
router.delete("/:id", authMiddleware, deleteReview);

module.exports = router;
