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
  "/results",
  authenticate,
  asyncHandler(resultsController.listAll)
);

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

// Review endpoint: returns per-question correctness data for a submitted attempt
// MUST be declared before /results/summary/:examId to avoid route shadowing
router.get(
  "/results/review/:examId",
  authenticate,
  requireStudent,
  asyncHandler(resultsController.getReview)
);

router.get(
  "/results/admin/review/:examId/:studentId",
  authenticate,
  requireAdmin,
  asyncHandler(resultsController.getAdminReview)
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

router.get(
  "/results/export-bulk",
  authenticate,
  requireStaff,
  asyncHandler(resultsController.exportBulkCsv)
);

module.exports = router;
