const express = require("express");
const { prisma } = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");

const router = express.Router();

/** 
 * GET /api/admin/stats 
 * Aggregated statistics for the admin dashboard
 */
router.get("/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const totalStudents = await prisma.user.count({
      where: { role: "STUDENT" }
    });

    const totalExams = await prisma.exam.count();

    const activeAttempts = await prisma.attempt.count({
      where: { status: "IN_PROGRESS" }
    });

    // Calculate Average Score
    const resultAgg = await prisma.result.aggregate({
      _avg: {
        score: true
      }
    });

    // Fetch 5 most recent activities
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
    console.error("Admin Stats Error:", error);
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
});

/**
 * GET /api/admin/users
 * List of all users in the system
 */
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        regimentalNumber: true,
        role: true,
        college: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ error: "Failed to fetch user registry" });
  }
});

module.exports = router;
