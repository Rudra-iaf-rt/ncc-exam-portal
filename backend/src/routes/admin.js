const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { logger } = require("../utils/logger");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const userSchema = z.object({
  name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters"),
  regimentalNumber: z.string({ required_error: "Regimental Number is required" }).min(5, "Regimental Number must be at least 5 characters"),
  college: z.string({ required_error: "College name is required" }).min(2, "College name is too short"),
  password: z.string().optional().default("cadet123"),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  role: z.enum(["STUDENT", "ADMIN", "INSTRUCTOR"]).optional().default("STUDENT"),
  wing: z.enum(["ARMY", "NAVY", "AIR"], { error_map: () => ({ message: "Wing must be ARMY, NAVY, or AIR" }) }).optional().nullable(),
  batch: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const updateUserSchema = userSchema.partial();

router.get("/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const totalStudents = await prisma.user.count({
      where: { role: "STUDENT" }
    });

    const totalExams = await prisma.exam.count();

    const activeAttempts = await prisma.attempt.count({
      where: { status: "IN_PROGRESS" }
    });

    const resultAgg = await prisma.result.aggregate({
      _avg: {
        score: true
      }
    });

    const recentActivity = await prisma.result.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        student: {
          select: { name: true }
        },
        exam: {
          select: { title: true }
        }
      }
    });

    const formattedActivity = recentActivity.map(r => ({
      studentName: r.student.name,
      examTitle: r.exam.title,
      score: r.score,
      date: r.createdAt.toISOString()
    }));

    res.json({
      totalStudents,
      totalExams,
      activeExams: activeAttempts,
      averageScore: resultAgg._avg.score ? `${resultAgg._avg.score.toFixed(1)}%` : "0%",
      recentActivity: formattedActivity
    });
  } catch (error) {
    logger.error('FETCH_ADMIN_STATS_FAILED', { error: error.message, stack: error.stack }, req.user.id);
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
});


router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        regimentalNumber: true,
        role: true,
        college: true,
        wing: true,
        batch: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    logger.error('FETCH_USER_REGISTRY_FAILED', { error: error.message, stack: error.stack }, req.user.id);
    res.status(500).json({ error: "Failed to fetch user registry" });
  }
});

/**
 * POST /api/admin/users
 * Create a single student user manually
 */
router.post("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.format() });
    }

    const { name, regimentalNumber, college, password, wing, batch, isActive } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { 
        OR: [
          { regimentalNumber: regimentalNumber },
          { email: req.body.email || undefined }
        ].filter(Boolean)
      }
    });

    if (existing) {
      return res.status(409).json({ error: "User with this Regimental Number or Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password || "cadet123", 10);

    const user = await prisma.user.create({
      data: {
        name,
        regimentalNumber,
        college,
        password: hashedPassword,
        role: parsed.data.role || "STUDENT",
        email: req.body.email || null,
        wing,
        batch,
        isActive: isActive ?? true
      }
    });

    logger.audit('USER_MANUAL_CREATE', { userId: user.id, regNo: user.regimentalNumber }, req.user.id);

    res.status(201).json(user);
  } catch (error) {
    logger.error("USER_CREATE_ERROR", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * GET /api/admin/users/search
 * Search cadets based on filters for targeted assignment preview
 */
router.get("/users/search", authenticate, requireAdmin, async (req, res) => {
  try {
    const { wing, college, batch, query } = req.query;
    
    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        AND: [
          wing ? { wing } : {},
          college ? { college: { contains: college, mode: 'insensitive' } } : {},
          batch ? { batch: { contains: batch, mode: 'insensitive' } } : {},
          query ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { regimentalNumber: { contains: query, mode: 'insensitive' } }
            ]
          } : {}
        ]
      },
      select: {
        id: true,
        name: true,
        regimentalNumber: true,
        wing: true,
        college: true,
        batch: true
      },
      take: 50 // Limit results for performance
    });

    res.json(users);
  } catch (error) {
    logger.error("USER_SEARCH_ERROR", { error: error.message });
    res.status(500).json({ error: "Failed to search cadets" });
  }
});

/**
 * GET /api/admin/users/filters
 * Returns unique Wings, Colleges, and Batches for dropdown menus
 */
router.get("/users/filters", authenticate, requireAdmin, async (req, res) => {
  try {
    const [wings, colleges, batches] = await Promise.all([
      prisma.user.findMany({ where: { role: "STUDENT" }, select: { wing: true }, distinct: ['wing'] }),
      prisma.user.findMany({ where: { role: "STUDENT" }, select: { college: true }, distinct: ['college'] }),
      prisma.user.findMany({ where: { role: "STUDENT" }, select: { batch: true }, distinct: ['batch'] }),
    ]);

    res.json({
      wings: wings.map(w => w.wing).filter(Boolean),
      colleges: colleges.map(c => c.college).filter(Boolean).sort(),
      batches: batches.map(b => b.batch).filter(Boolean).sort((a, b) => b.localeCompare(a))
    });
  } catch (error) {
    logger.error("FETCH_FILTERS_ERROR", { error: error.message });
    res.status(500).json({ error: "Failed to fetch filter data" });
  }
});

/**
 * POST /api/admin/users/import
 * Expects a CSV file with: name, regimentalNumber, college, password (optional)
 */
router.post("/users/import", authenticate, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  const results = [];
  const errors = [];
  const stream = Readable.from(req.file.buffer);

  try {
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) => value.trim()
        }))
        .on("data", (data) => results.push(data))
        .on("error", reject)
        .on("end", resolve);
    });

    if (results.length === 0) {
      logger.warn('IMPORT_EMPTY_FILE', { fileName: req.file.originalname }, req.user.id);
      return res.status(400).json({ error: "CSV file is empty or headers mismatch" });
    }

    const validUsers = [];
    const existingRegNos = new Set(
      (await prisma.user.findMany({
        where: { regimentalNumber: { not: null } },
        select: { regimentalNumber: true }
      })).map(u => u.regimentalNumber)
    );

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      
      // Map and clean row data before validation
      const rawData = {
        name: row.name || row.Name || row.NAME,
        regimentalNumber: row.regimentalNumber || row.RegimentalNumber || row.regNo || row.RegNo,
        college: row.college || row.College || row.COLLEGE,
        wing: (row.wing || row.Wing || row.WING)?.toUpperCase() || null,
        batch: row.batch || row.Batch || row.BATCH || null,
        email: row.email || row.Email || row.EMAIL || null,
        password: "cadet123" // Enforce mandatory default password
      };

      const parsed = userSchema.safeParse(rawData);

      if (!parsed.success) {
        // Create a more readable error summary
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const summary = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${msgs.join(', ')}`)
          .join(" | ");

        errors.push({ 
          row: i + 1, 
          error: summary,
          details: parsed.error.format() 
        });
        continue;
      }

      if (existingRegNos.has(parsed.data.regimentalNumber)) {
        errors.push({ row: i + 1, regNo: parsed.data.regimentalNumber, error: "Regimental Number already exists" });
        continue;
      }

      // Check for duplicates within the CSV itself
      if (validUsers.some(u => u.regimentalNumber === parsed.data.regimentalNumber)) {
        errors.push({ row: i + 1, regNo: parsed.data.regimentalNumber, error: "Duplicate Regimental Number in file" });
        continue;
      }

      validUsers.push(parsed.data);
    }

    // Return success even if 0 valid users were found, so the frontend can show the error list
    if (validUsers.length === 0) {
      return res.json({
        success: true,
        count: 0,
        totalProcessed: results.length,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // Hash passwords in parallel
    const hashedUsers = await Promise.all(validUsers.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, 10),
      role: "STUDENT"
    })));

    const created = await prisma.user.createMany({
      data: hashedUsers,
      skipDuplicates: true,
    });

    logger.audit('USERS_BULK_IMPORT', { 
      count: created.count, 
      errors: errors.length,
      totalProcessed: results.length 
    }, req.user.id);

    res.json({
      success: true,
      count: created.count,
      totalProcessed: results.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    logger.error("IMPORT_PROCESS_CRASH", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Failed to process CSV file" });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update an existing user
 */
router.patch("/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid user ID" });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.format() });
    }

    const { name, regimentalNumber, college, password, email, role, wing, batch, isActive } = parsed.data;

    // Check for conflicts if regimentalNumber or email is changing
    if (regimentalNumber || email) {
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            regimentalNumber ? { regimentalNumber } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean),
        },
      });
      if (existing) {
        return res.status(409).json({ error: "Regimental Number or Email already in use" });
      }
    }

    const updateData = {
      name,
      regimentalNumber,
      college,
      email,
      role,
      wing,
      batch,
      isActive
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    logger.audit('USER_UPDATE', { targetUserId: id, updates: Object.keys(parsed.data) }, req.user.id);
    res.json(user);
  } catch (error) {
    logger.error("USER_UPDATE_ERROR", { error: error.message, id: req.params.id });
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Remove a user and all related data
 */
router.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid user ID" });

    if (id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own administrative account" });
    }

    // Use transaction to ensure    // Atomic deletion of all user data
    await prisma.$transaction(async (tx) => {
      // 1. Purge dependent records (Results, Attempts, Assignments)
      await tx.result.deleteMany({ where: { studentId: id } });
      await tx.attempt.deleteMany({ where: { studentId: id } });
      await tx.examAssignment.deleteMany({ where: { userId: id } });
      
      // 2. Finally delete the user record
      await tx.user.delete({ where: { id } });
    });

    logger.audit('USER_DELETE', { targetUserId: id }, req.user.id);
    res.json({ success: true, message: "User and related records purged successfully" });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    logger.error("USER_DELETE_ERROR", { error: error.message, id: req.params.id });
    res.status(500).json({ error: "Failed to delete user record" });
  }
});

/**
 * GET /api/admin/assignments
 */
router.get("/assignments", authenticate, requireAdmin, async (req, res) => {
  try {
    const assignments = await prisma.examAssignment.findMany({
      include: {
        user: {
          select: { name: true, regimentalNumber: true, college: true, wing: true, batch: true }
        },
        exam: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

/**
 * POST /api/admin/assignments
 * Bulk assign cadets to an exam based on filters (Wing, College, Batch)
 */
router.post("/assignments", authenticate, requireAdmin, async (req, res) => {
  try {
    const { examId, wing, college, batch, userIds } = req.body;
    
    if (!examId) return res.status(400).json({ error: "Exam ID is required" });

    let targetUserIds = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Use explicitly provided IDs
      targetUserIds = userIds.map(id => parseInt(id));
    } else {
      // Fallback to bulk filters
      const users = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          isActive: true,
          wing: wing || undefined,
          college: college || undefined,
          batch: batch || undefined,
        },
        select: { id: true }
      });
      targetUserIds = users.map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      return res.status(404).json({ error: "No eligible cadets found for these parameters" });
    }

    const assignmentsData = targetUserIds.map(uid => ({
      userId: uid,
      examId: parseInt(examId)
    }));

    const created = await prisma.examAssignment.createMany({
      data: assignmentsData,
      skipDuplicates: true
    });

    logger.audit('EXAM_BULK_ASSIGN', { examId, count: created.count, filters: { wing, college, batch } }, req.user.id);
    
    res.json({ success: true, count: created.count });
  } catch (error) {
    logger.error("ASSIGNMENT_ERROR", { error: error.message });
    res.status(500).json({ error: "Failed to create assignments" });
  }
});

/**
 * DELETE /api/admin/assignments/:id
 */
router.delete("/assignments/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.examAssignment.delete({ where: { id } });
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

/**
 * GET /api/admin/logs
 * Read and return system audit logs
 */
router.get("/logs", authenticate, requireAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'logs', 'app.log');

    if (!fs.existsSync(logFile)) {
      return res.json([]);
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    
    const logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (_e) {
        return { error: "Failed to parse line", raw: line };
      }
    });

    // Return latest first
    res.json(logs.reverse().slice(0, 500));
  } catch (_error) {
    res.status(500).json({ error: "Failed to retrieve logs" });
  }
});

/**
 * GET /api/admin/exams
 * Returns all exams for use in admin dropdowns (Assignments modal, etc.)
 */
router.get("/exams", authenticate, requireAdmin, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { id: 'desc' },
      include: { _count: { select: { questions: true } } }
    });
    res.json({
      exams: exams.map(e => ({
        id: e.id,
        title: e.title,
        status: e.status,
        duration: e.duration,
        questionCount: e._count.questions,
        createdAt: e.createdAt,
      }))
    });
  } catch (error) {
    logger.error('FETCH_ADMIN_EXAMS_FAILED', { error: error.message }, req.user.id);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

/**
 * PATCH /api/admin/results/:id
 * Manually override a cadet's score. Requires reason for audit.
 */
router.patch("/results/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { score, reason } = req.body;

  if (typeof score !== 'number' || score < 0 || score > 100) {
    return res.status(400).json({ error: "Score must be a number between 0 and 100" });
  }
  if (!reason || reason.length < 5) {
    return res.status(400).json({ error: "A valid reason (min 5 chars) is required for overrides" });
  }

  try {
    const result = await prisma.result.update({
      where: { id },
      data: { score },
      include: {
        student: { select: { name: true, regimentalNumber: true } },
        exam: { select: { title: true } }
      }
    });

    logger.audit('RESULT_OVERRIDE', { 
      resultId: id, 
      newScore: score, 
      reason, 
      student: result.student.regimentalNumber,
      exam: result.exam.title 
    }, req.user.id);

    res.json(result);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update result" });
  }
});

module.exports = router;
