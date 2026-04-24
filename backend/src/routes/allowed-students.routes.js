const express = require("express");
const multer = require("multer");
const allowedStudentsController = require("../controllers/allowed-students.controller");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    const ok =
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      mime.includes("csv") ||
      mime.includes("json");
    if (!ok) {
      return cb(new Error("Only CSV or JSON files are allowed"));
    }
    cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large (max 10 MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}

router.post(
  "/add",
  authenticate,
  requireAdmin,
  asyncHandler(allowedStudentsController.addSingle)
);

router.post(
  "/bulk-upload",
  authenticate,
  requireAdmin,
  handleUpload,
  asyncHandler(allowedStudentsController.bulkUpload)
);

router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(allowedStudentsController.listAll)
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(allowedStudentsController.remove)
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(allowedStudentsController.update)
);

module.exports = router;

