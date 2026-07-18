const express = require("express");
const { Prisma } = require('@prisma/client');
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
router.get("/users/:id/stats", authenticate, requireStaff, adminController.getUserStats);
router.post("/users/import", authenticate, requireAdmin, upload.single("file"), adminController.importUsers);
router.patch("/users/:id", authenticate, requireStaff, usersController.updateUser);
router.delete("/users/:id", authenticate, requireStaff, usersController.removeById);

// --- Batch Management ---
router.get("/batches", authenticate, requireStaff, adminController.listBatches);
router.post("/batches", authenticate, requireAdmin, adminController.createBatch);
router.patch("/batches/:id", authenticate, requireAdmin, adminController.updateBatch);
router.delete("/batches/:id", authenticate, requireAdmin, adminController.deleteBatch);

// --- Exam Assignments & Live Monitor & Analytics ---
router.get("/assignments", authenticate, requireStaff, adminController.listAssignments);
router.post("/assignments", authenticate, requireStaff, adminController.createAssignments);
router.delete("/assignments/:id", authenticate, requireStaff, adminController.deleteAssignment);

router.get("/exams/:id/live-monitor", authenticate, requireStaff, adminController.liveMonitor);
router.get("/exams/:id/analytics", authenticate, requireStaff, adminController.examAnalytics);

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
    let exams = [];
    try {
      let where = {};
      if (req.user.role === 'INSTRUCTOR') {
        const { ROLES } = require("../middleware/roles");
        const instructor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { collegeCode: true } });
        if (instructor?.collegeCode) {
          where.OR = [
            { creator: { collegeCode: instructor.collegeCode } },
            { assignments: { some: { user: { collegeCode: instructor.collegeCode } } } }
          ];
        } else {
          where.id = -1; // Force no results
        }
      }

      exams = await prisma.exam.findMany({
        where,
        orderBy: { id: 'desc' },
        include: {
          _count: { select: { questions: true } },
          creator: { select: { collegeCode: true, college: { select: { name: true } } } }
        }
      });
    } catch (err) {
      const message = String(err?.message || "");
      const missingNewColumns = message.includes("Exam.startAt") || message.includes("Exam.endAt");
      if (!missingNewColumns) throw err;

      let queryCondition = Prisma.sql``;
      if (req.user.role === 'INSTRUCTOR') {
        const { ROLES } = require("../middleware/roles");
        const instructor = await prisma.user.findUnique({ where: { id: req.user.id }, select: { collegeCode: true } });
        if (instructor?.collegeCode) {
          queryCondition = Prisma.sql`WHERE u."collegeCode" = ${instructor.collegeCode} OR e.id IN (SELECT "examId" FROM "ExamAssignment" ea JOIN "User" u2 ON ea."userId" = u2.id WHERE u2."collegeCode" = ${instructor.collegeCode})`;
        } else {
          queryCondition = Prisma.sql`WHERE 1=0`;
        }
      }

      const legacyExams = await prisma.$queryRaw`
        SELECT e.id, e.title, e.status, e.duration, e."createdAt", e."createdBy",
               u."collegeCode" as "creatorCollegeCode", c.name as "creatorCollegeName"
        FROM "Exam" e
        LEFT JOIN "User" u ON u.id = e."createdBy"
        LEFT JOIN "College" c ON c.code = u."collegeCode"
        ${queryCondition}
        ORDER BY e.id DESC
      `;
      const questionCounts = await prisma.question.groupBy({
        by: ["examId"],
        _count: { _all: true },
      });
      const countMap = new Map(questionCounts.map((x) => [x.examId, x._count._all]));
      exams = legacyExams.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        duration: row.duration,
        createdAt: row.createdAt,
        _count: { questions: countMap.get(row.id) || 0 },
        creator: {
          collegeCode: row.creatorCollegeCode || null,
          college: row.creatorCollegeName ? { name: row.creatorCollegeName } : null,
        },
      }));
    }

    res.json({
      exams: exams.map(e => ({
        id: e.id,
        title: e.title,
        status: e.status,
        duration: e.duration,
        questionCount: e._count.questions,
        college: e.creator?.college?.name || e.creator?.collegeCode || 'N/A',
        createdAt: e.createdAt,
      }))
    });
  } catch (error) {
    console.error("[Admin Exams Error]", error);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

module.exports = router;
