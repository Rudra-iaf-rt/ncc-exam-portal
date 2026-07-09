const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { authRateLimiter, refreshRateLimiter } = require("../middleware/security");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post("/register", authRateLimiter, asyncHandler(authController.register));
router.post("/login", authRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/student", authRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/staff", authRateLimiter, asyncHandler(authController.loginStaff));
router.post("/password/forgot", authRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/password/reset", authRateLimiter, asyncHandler(authController.resetPassword));
router.post("/forgot-password", authRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authRateLimiter, asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.me));

// Refresh endpoints use a per-user-ID rate limiter (decoded from JWT) instead of
// the shared IP-based authRateLimiter — otherwise all cadets on the same college
// WiFi/NAT share one bucket and collectively hit the 300/min cap.
router.get("/refresh", refreshRateLimiter, authenticate, asyncHandler(authController.refresh));
router.post("/refresh", refreshRateLimiter, asyncHandler(authController.refreshWithToken));
router.post("/refresh-token", refreshRateLimiter, asyncHandler(authController.refreshWithToken));

router.post("/logout", asyncHandler(authController.logout));
router.post("/password/change", authenticate, asyncHandler(authController.changePassword));

module.exports = router;
