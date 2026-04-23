const express = require("express");
const resultsController = require("../controllers/results.controller");
const { authenticate } = require("../middleware/auth");
const {
  requireStudent,
  requireAdmin,
  requireInstructor,
  requireStaff,
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

router.get(
  "/results/summary/:examId",
  authenticate,
  requireStaff,
  asyncHandler(resultsController.summary)
);

router.get(
  "/results/export/:examId",
  authenticate,
  requireStaff,
  asyncHandler(resultsController.exportCsv)
);

module.exports = router;
