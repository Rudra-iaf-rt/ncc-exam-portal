const express = require("express");
const examsController = require("../controllers/exams.controller");
const { authenticate } = require("../middleware/auth");
const {
  requireStudent,
  requireExamCreator,
} = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post(
  "/exams/create",
  authenticate,
  requireExamCreator,
  asyncHandler(examsController.create)
);

router.get("/exams", authenticate, asyncHandler(examsController.listCatalog));

router.get(
  "/exams/:id",
  authenticate,
  requireStudent,
  asyncHandler(examsController.getOne)
);

router.post(
  "/attempt/start",
  authenticate,
  requireStudent,
  asyncHandler(examsController.startAttempt)
);

router.post(
  "/attempt/submit",
  authenticate,
  requireStudent,
  asyncHandler(examsController.submit)
);

router.post(
  "/exams/submit",
  authenticate,
  requireStudent,
  asyncHandler(examsController.submit)
);

module.exports = router;
