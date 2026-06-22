// Moved from routes/authRoutes.js during the structure refactor.
// Import paths updated to use src/controllers and src/middleware.
const express = require("express");

const {
  disableMfa,
  enableMfa,
  forgotPassword,
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
  refreshSession,
  resetPassword,
  verifyEmail,
  verifyOtp,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
} = require("../middleware/authRateLimitMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginRateLimiter, loginUser);
router.post("/refresh", refreshRateLimiter, refreshSession);
router.post("/logout", authMiddleware, logoutUser);
router.post("/forgot-password", forgotPasswordRateLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/verify-otp", loginRateLimiter, verifyOtp);
router.get("/profile", authMiddleware, getUserProfile);
router.get("/me", authMiddleware, getUserProfile);
router.post("/mfa/enable", authMiddleware, enableMfa);
router.post("/mfa/disable", authMiddleware, disableMfa);

module.exports = router;
