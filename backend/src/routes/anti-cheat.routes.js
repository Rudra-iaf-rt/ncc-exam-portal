const express = require("express");
const antiCheatController = require("../controllers/anti-cheat.controller");
const { authenticate } = require("../middleware/auth");
const { requireStudent } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post(
  "/exam/violation",
  authenticate,
  requireStudent,
  asyncHandler(antiCheatController.violation)
);

router.post(
  "/exam/heartbeat",
  authenticate,
  requireStudent,
  asyncHandler(antiCheatController.heartbeat)
);

router.get(
  "/exam/flags/:examId",
  authenticate,
  (req, res, next) => {
    if (req.user?.role === "ADMIN" || req.user?.role === "INSTRUCTOR") {
      return next();
    }
    return res.status(403).json({ error: "Admins and instructors only" });
  },
  asyncHandler(antiCheatController.flags)
);

module.exports = router;
