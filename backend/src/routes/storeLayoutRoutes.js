const express = require("express");
const router = express.Router();
const storeLayoutController = require("../controllers/storeLayoutController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

// Public route to view a farmer's store
router.get("/:farmerId", storeLayoutController.getStoreLayoutByFarmerId);

// Protected farmer routes
router.use(authMiddleware, requireRole("farmer"));

router.get("/", storeLayoutController.getStoreLayout);
router.put("/", storeLayoutController.updateStoreLayout);

module.exports = router;
