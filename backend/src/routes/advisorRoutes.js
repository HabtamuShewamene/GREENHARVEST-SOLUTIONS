const express = require("express");
const router = express.Router();
const advisorController = require("../controllers/advisorController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

// All routes require authentication and farmer role
router.use(authMiddleware, requireRole("farmer"));

router.get("/", advisorController.getAdvisorDashboard);

module.exports = router;
