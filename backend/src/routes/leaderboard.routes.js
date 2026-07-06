const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireStaff, requireStudent } = require('../middleware/roles');
const leaderboardService = require('../services/leaderboard.service');

// Get Unit Leaderboard (Admin/Instructor)
router.get('/unit/:collegeCode', authenticate, requireStaff, async (req, res, next) => {
  try {
    const { collegeCode } = req.params;
    const leaderboard = await leaderboardService.getUnitLeaderboard(collegeCode);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

// Get Student's Own Rank
router.get('/my-rank', authenticate, requireStudent, async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { prisma } = require('../lib/prisma');
    const user = await prisma.user.findUnique({ where: { id: studentId }, select: { collegeCode: true } });
    
    if (!user || !user.collegeCode) {
      return res.status(400).json({ error: 'Student does not belong to a unit' });
    }

    const rankData = await leaderboardService.getStudentUnitRank(studentId, user.collegeCode);
    res.json(rankData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
