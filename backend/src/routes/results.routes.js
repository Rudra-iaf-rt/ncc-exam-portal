const express = require("express");
const resultsController = require("../controllers/results.controller");
const { authenticate } = require("../middleware/auth");
const {
  requireStudent,
  requireAdmin,
  requireInstructor,
} = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.get(
  "/results/student",
  authenticate,
  requireStudent,
  asyncHandler(resultsController.listStudent)
);

router.get(
  "/results/instructor",
  authenticate,
  requireInstructor,
  asyncHandler(resultsController.listInstructor)
);

router.get(
  "/results/admin",
  authenticate,
  requireAdmin,
  asyncHandler(resultsController.listAdmin)
);

module.exports = router;
