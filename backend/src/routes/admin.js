const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const { requireAdmin, requireStaff } = require("../middleware/roles");
const adminController = require("../controllers/admin.controller");
const usersController = require("../controllers/users.controller");
const { prisma } = require("../lib/prisma");
const auditLogService = require("../services/audit-log.service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Dashboard & Stats ---
router.get("/stats", authenticate, requireStaff, adminController.getStats);
router.get("/dashboard", authenticate, requireStaff, adminController.getStats); // Alias for backward compatibility

// --- User Management ---
router.get("/users", authenticate, requireStaff, usersController.listAll);
router.post("/users", authenticate, requireStaff, usersController.createUser);
router.get("/users/search", authenticate, requireStaff, usersController.searchUsers);
router.get("/users/filters", authenticate, requireStaff, usersController.getFilters);
router.post("/users/import", authenticate, requireAdmin, upload.single("file"), adminController.importUsers);
router.patch("/users/:id", authenticate, requireStaff, usersController.updateUser);
router.delete("/users/:id", authenticate, requireStaff, usersController.removeById);

// --- Batch Management ---
router.get("/batches", authenticate, requireStaff, adminController.listBatches);
router.post("/batches", authenticate, requireAdmin, adminController.createBatch);
router.patch("/batches/:id", authenticate, requireAdmin, adminController.updateBatch);
router.delete("/batches/:id", authenticate, requireAdmin, adminController.deleteBatch);

// --- Exam Assignments ---
router.get("/assignments", authenticate, requireStaff, adminController.listAssignments);
router.post("/assignments", authenticate, requireStaff, adminController.createAssignments);
router.delete("/assignments/:id", authenticate, requireStaff, adminController.deleteAssignment);

// --- Results & Overrides ---
router.patch("/results/:id", authenticate, requireAdmin, adminController.overrideResult);

// --- Audit Logs ---
router.get("/logs", authenticate, requireAdmin, async (req, res) => {
  // Merged: auditLogService for DB logs, and filesystem log check for raw app logs
  try {
    const dbLogs = await auditLogService.listAuditLogs(req.query ?? {});
    
    // Also check for app.log if requested specifically or as fallback
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'logs', 'app.log');

    let appLogs = [];
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      appLogs = content.split('\n')
        .filter(l => l.trim() !== '')
        .map(line => {
          try { return JSON.parse(line); } 
          catch { return { error: "Parse error", raw: line }; }
        })
        .reverse()
        .slice(0, 100);
    }

    res.json({ logs: dbLogs, appLogs });
  } catch (error) {
    console.error("Audit Log Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// --- System Health ---
router.get("/health", authenticate, requireAdmin, (req, res) => {
  res.json({ ok: true, service: "admin" });
});

// --- Generic Exam Dropdowns ---
router.get("/exams", authenticate, requireStaff, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { id: 'desc' },
      include: { 
        _count: { select: { questions: true } },
        creator: { select: { college: true } }
      }
    });
    res.json({
      exams: exams.map(e => ({
        id: e.id,
        title: e.title,
        status: e.status,
        duration: e.duration,
        questionCount: e._count.questions,
        college: e.creator?.college,
        createdAt: e.createdAt,
      }))
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

module.exports = router;
