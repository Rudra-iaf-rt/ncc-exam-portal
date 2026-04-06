const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const materialsController = require("../controllers/materials.controller");
const { authenticate } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");
const { UPLOAD_ROOT, ensureUploadDir } = require("../services/materials.service");

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = express.Router();

function handleMulterUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large (max 25 MB)" });
      }
      return res.status(400).json({
        error: err.message || "Upload failed",
      });
    }
    next();
  });
}

router.post(
  "/material/upload",
  authenticate,
  requireStaff,
  handleMulterUpload,
  asyncHandler(materialsController.upload)
);

router.get("/materials", authenticate, asyncHandler(materialsController.list));

router.get(
  "/materials/:id/download",
  authenticate,
  asyncHandler(materialsController.download)
);

module.exports = router;
