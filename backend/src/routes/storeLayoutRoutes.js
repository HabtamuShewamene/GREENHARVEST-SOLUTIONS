const express = require("express");
const router = express.Router();
const storeLayoutController = require("../controllers/storeLayoutController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication and farmer role
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isFarmer);

router.get("/", storeLayoutController.getStoreLayout);
router.put("/", storeLayoutController.updateStoreLayout);

module.exports = router;
