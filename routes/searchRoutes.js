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