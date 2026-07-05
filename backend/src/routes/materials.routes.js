const express = require("express");
const multer = require("multer");
const materialsController = require("../controllers/materials.controller");
const { authenticate } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "video/mp4",
  "video/webm",
  "video/mpeg",
  "video/quicktime",
  "image/jpeg",
  "image/png",
]);

// ─── Multer — memory storage (buffer goes straight to B2, no local disk) ──────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB — B2 handles large files fine
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error(`File type '${file.mimetype}' is not allowed.`), {
          status: 400,
        }),
        false
      );
    }
  },
});

/**
 * Inline multer error handler so we return a clean JSON 400 instead of
 * Express's default HTML error page for LIMIT_FILE_SIZE and filter rejections.
 */
function handleMulterUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large",
          message: "Maximum file size is 100 MB.",
          code: "VAL_001",
        });
      }
      return res.status(400).json({
        error: "Upload error",
        message: err.message,
        code: "VAL_001",
      });
    }

    // fileFilter rejection comes through as a plain Error with status 400
    const status = err.status || 400;
    return res.status(status).json({
      error: "Upload rejected",
      message: err.message || "Upload failed",
      code: "VAL_001",
    });
  });
}

const router = express.Router();

// POST /material/upload  — staff only, file required
router.post(
  "/material/upload",
  authenticate,
  requireStaff,
  handleMulterUpload,
  asyncHandler(materialsController.upload)
);

// GET /materials  — all authenticated users
router.get("/materials", authenticate, asyncHandler(materialsController.list));

// GET /materials/:id
router.get(
  "/materials/:id",
  authenticate,
  asyncHandler(materialsController.getOne)
);

// GET /materials/:id/download  — redirects to B2 pre-signed URL or Drive URL
router.get(
  "/materials/:id/download",
  authenticate,
  asyncHandler(materialsController.download)
);

// GET /materials/:id/view
router.get(
  "/materials/:id/view",
  authenticate,
  asyncHandler(materialsController.view)
);

// DELETE /materials/:id  — staff only, soft-delete
router.delete(
  "/materials/:id",
  authenticate,
  requireStaff,
  asyncHandler(materialsController.remove)
);

// PATCH /materials/:id — staff only, edit metadata
router.patch(
  "/materials/:id",
  authenticate,
  requireStaff,
  asyncHandler(materialsController.update)
);

module.exports = router;
