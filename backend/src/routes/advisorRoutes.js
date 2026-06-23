const express = require("express");
const router = express.Router();
const advisorController = require("../controllers/advisorController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication and farmer role
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isFarmer);

router.get("/", advisorController.getAdvisorDashboard);

module.exports = router;
