const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  getFarmerDashboard,
  getAdminDashboard,
} = require("../controllers/dashboardController");

const router = express.Router();

router.use(authMiddleware);

router.get("/farmer", getFarmerDashboard);
router.get("/admin", getAdminDashboard);

module.exports = router;