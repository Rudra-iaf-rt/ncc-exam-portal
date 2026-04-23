const express = require("express");
const multer = require("multer");
const examsController = require("../controllers/exams.controller");
const { authenticate } = require("../middleware/auth");
const {
  requireStudent,
  requireExamCreator,
} = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

function handlePdfUpload(req, res, next) {
  pdfUpload.single("pdf")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "PDF too large (max 20 MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}

router.post(
  "/exams/create",
  authenticate,
  requireExamCreator,
  asyncHandler(examsController.create)
);

router.post(
  "/exams/create-from-pdf",
  authenticate,
  requireExamCreator,
  handlePdfUpload,
  asyncHandler(examsController.createFromPdf)
);

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    const name = String(file.originalname || "").toLowerCase();
    const okExt = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
    if (!okExt && !okTypes.includes(file.mimetype)) {
      return cb(new Error("Only Excel files (.xlsx, .xls, .csv) are allowed"));
    }
    cb(null, true);
  },
});

function handleExcelUpload(req, res, next) {
  excelUpload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Excel file too large (max 20 MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}

router.post(
  "/exams/create-from-excel",
  authenticate,
  requireExamCreator,
  handleExcelUpload,
  asyncHandler(examsController.createFromExcel)
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
  "/attempt/answer",
  authenticate,
  requireStudent,
  asyncHandler(examsController.saveAnswer)
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
