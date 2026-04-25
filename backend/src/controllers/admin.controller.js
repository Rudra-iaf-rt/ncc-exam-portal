const adminService = require("../services/admin.service");
const { prisma } = require("../lib/prisma");

async function getStats(req, res) {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
}

async function importUsers(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No CSV file uploaded" });
    }
    const result = await adminService.importUsers(req.file.buffer, req.file.originalname, req.user.id);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to process CSV file" });
  }
}

async function listAssignments(req, res) {
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
}

async function createAssignments(req, res) {
  try {
    const { examId, wing, college, batch, userIds } = req.body;
    const result = await adminService.bulkAssign(examId, { wing, college, batch }, userIds, req.user.id);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to create assignments" });
  }
}

async function deleteAssignment(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.examAssignment.delete({ where: { id } });
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete assignment" });
  }
}

async function overrideResult(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { score, reason } = req.body;

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ error: "Score must be a number between 0 and 100" });
    }
    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: "A valid reason (min 5 chars) is required for overrides" });
    }

    const result = await adminService.overrideResult(id, score, reason, req.user.id);
    res.json(result);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update result" });
  }
}

module.exports = {
  getStats,
  importUsers,
  listAssignments,
  createAssignments,
  deleteAssignment,
  overrideResult
};
