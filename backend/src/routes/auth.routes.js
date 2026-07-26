const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { loginRateLimiter, passwordResetRateLimiter, refreshRateLimiter } = require("../middleware/security");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post("/register", loginRateLimiter, asyncHandler(authController.register));
router.post("/login", loginRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/student", loginRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/staff", loginRateLimiter, asyncHandler(authController.loginStaff));
router.post("/password/forgot", passwordResetRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/password/reset", passwordResetRateLimiter, asyncHandler(authController.resetPassword));
router.post("/password/verify-token", passwordResetRateLimiter, asyncHandler(authController.verifyResetToken));
router.post("/forgot-password", passwordResetRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", passwordResetRateLimiter, asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.me));

router.get("/refresh", refreshRateLimiter, authenticate, asyncHandler(authController.refresh));
router.post("/refresh", refreshRateLimiter, asyncHandler(authController.refreshWithToken));
router.post("/refresh-token", refreshRateLimiter, asyncHandler(authController.refreshWithToken));

router.post("/logout", asyncHandler(authController.logout));
router.post("/password/change", authenticate, asyncHandler(authController.changePassword));

module.exports = router;