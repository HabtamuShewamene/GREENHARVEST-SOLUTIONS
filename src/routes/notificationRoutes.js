// Moved from routes/notificationRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createNotification);
router.get("/", getUserNotifications);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;
