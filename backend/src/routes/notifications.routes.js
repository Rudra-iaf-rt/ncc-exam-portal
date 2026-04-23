const express = require("express");
const notificationsController = require("../controllers/notifications.controller");
const { authenticate } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post(
  "/notifications/send",
  authenticate,
  requireStaff,
  asyncHandler(notificationsController.send)
);

router.get(
  "/notifications",
  authenticate,
  asyncHandler(notificationsController.list)
);

module.exports = router;
