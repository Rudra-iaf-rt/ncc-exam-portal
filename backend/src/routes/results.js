const express = require("express");
const { prisma } = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const {
  requireStudent,
  requireAdmin,
  requireInstructor,
} = require("../middleware/roles");

const router = express.Router();

function mapResultRow(r) {
  return {
    id: r.id,
    score: r.score,
    examId: r.examId,
    examTitle: r.exam?.title ?? null,
    studentId: r.studentId,
    studentName: r.student?.name ?? null,
    regimentalNumber: r.student?.regimentalNumber ?? null,
    college: r.student?.college ?? null,
  };
}

/** GET /api/results/student — own results only */
router.get("/results/student", authenticate, requireStudent, async (req, res) => {
  const rows = await prisma.result.findMany({
    where: { studentId: req.user.id },
    orderBy: { id: "desc" },
    include: {
      exam: { select: { id: true, title: true } },
      student: {
        select: {
          id: true,
          name: true,
          regimentalNumber: true,
          college: true,
        },
      },
    },
  });

  return res.json({
    results: rows.map((r) => ({
      id: r.id,
      score: r.score,
      examId: r.examId,
      examTitle: r.exam.title,
    })),
  });
});

/** GET /api/results/instructor?college= — results for students in that college (defaults to instructor's college) */
router.get(
  "/results/instructor",
  authenticate,
  requireInstructor,
  async (req, res) => {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { college: true },
    });
    if (!me) {
      return res.status(404).json({ error: "User not found" });
    }

    const collegeParam =
      typeof req.query.college === "string" ? req.query.college.trim() : "";
    const college = collegeParam || me.college;

    const rows = await prisma.result.findMany({
      where: {
        student: { college },
      },
      orderBy: { id: "desc" },
      include: {
        exam: { select: { id: true, title: true } },
        student: {
          select: {
            id: true,
            name: true,
            regimentalNumber: true,
            college: true,
          },
        },
      },
    });

    return res.json({
      college,
      results: rows.map(mapResultRow),
    });
  }
);

/** GET /api/results/admin — all results */
router.get("/results/admin", authenticate, requireAdmin, async (req, res) => {
  const rows = await prisma.result.findMany({
    orderBy: { id: "desc" },
    include: {
      exam: { select: { id: true, title: true } },
      student: {
        select: {
          id: true,
          name: true,
          regimentalNumber: true,
          college: true,
        },
      },
    },
  });

  return res.json({
    results: rows.map(mapResultRow),
  });
});

module.exports = router;
