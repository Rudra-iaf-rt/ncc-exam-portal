const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.loginStudent));
router.post("/login/student", asyncHandler(authController.loginStudent));
router.post("/login/staff", asyncHandler(authController.loginStaff));
router.get("/me", authenticate, asyncHandler(authController.me));

module.exports = router;
