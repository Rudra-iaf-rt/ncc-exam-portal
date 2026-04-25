const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/security");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();


router.post("/login", authRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/student", authRateLimiter, asyncHandler(authController.loginStudent));
router.post("/login/staff", authRateLimiter, asyncHandler(authController.loginStaff));
router.post("/password/forgot", authRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/password/reset", authRateLimiter, asyncHandler(authController.resetPassword));
router.post("/forgot-password", authRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authRateLimiter, asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.me));
router.get("/refresh", authRateLimiter, authenticate, asyncHandler(authController.refresh));
router.post("/refresh", authRateLimiter, asyncHandler(authController.refreshWithToken));
router.post("/refresh-token", authRateLimiter, asyncHandler(authController.refreshWithToken));
router.post("/logout", authenticate, asyncHandler(authController.logout));

module.exports = router;
