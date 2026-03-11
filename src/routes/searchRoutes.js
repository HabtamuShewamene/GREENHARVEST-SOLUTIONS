// Moved from routes/searchRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  searchProducts,
  getRecommendations,
} = require("../controllers/searchController");

const router = express.Router();

router.get("/products", searchProducts);
router.get("/recommendations", authMiddleware, getRecommendations);

module.exports = router;
