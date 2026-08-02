const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getMe, updateMe, listUsers, getFarmerProfile } = require("../controllers/userController");

const router = express.Router();

// Public routes
router.get("/farmer/:id", getFarmerProfile);

// Protected routes
router.use(authMiddleware);

router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/", roleMiddleware("admin"), listUsers);

module.exports = router;
