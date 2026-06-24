const express = require("express");
const router = express.Router();
const storeLayoutController = require("../controllers/storeLayoutController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

// All routes require authentication and farmer role
router.use(authMiddleware, requireRole("farmer"));

router.get("/", storeLayoutController.getStoreLayout);
router.put("/", storeLayoutController.updateStoreLayout);

module.exports = router;
