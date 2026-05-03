const adminService = require("../services/admin.service");
const { prisma } = require("../lib/prisma");

async function getStats(req, res) {
  try {
    const stats = await adminService.getStats(req.user);
    res.json(stats);
  } catch (error) {
    console.error("[Stats Error]", error);
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
}

async function importUsers(req, res) {
  try {
    const { ROLES } = require("../middleware/roles");
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: "Access denied. Admin privileges required for bulk imports." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const result = await adminService.importUsers(req.file.buffer, req.file.originalname, req.user.id);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to process import" });
  }
}

async function listAssignments(req, res) {
  try {
    const { ROLES } = require("../middleware/roles");
    let whereClause = {};

    if (req.user.role === ROLES.INSTRUCTOR) {
      const instructorRecord = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (instructorRecord?.collegeCode) {
        whereClause = {
          user: { collegeCode: instructorRecord.collegeCode }
        };
      }
    }

    const assignments = await prisma.examAssignment.findMany({
      where: whereClause,
      include: {
        user: {
          select: { 
            name: true, 
            regimentalNumber: true, 
            collegeCode: true,
            college: { select: { name: true } }, 
            wing: true, 
            batch: true 
          }
        },
        exam: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten college name for frontend
    const flattened = assignments.map(a => ({
      ...a,
      user: {
        ...a.user,
        college: a.user.college?.name || a.user.collegeCode || 'N/A'
      }
    }));

    res.json(flattened);
  } catch (error) {
    console.error("[Assignments List Error]", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
}

async function createAssignments(req, res) {
  try {
    const { ROLES } = require("../middleware/roles");
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: "Access denied. Admin privileges required for eligibility management." });
    }
    const { examId, wing, collegeCode, batch, userIds } = req.body;
    const result = await adminService.bulkAssign(examId, { wing, collegeCode, batch }, userIds, req.user);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to create assignments" });
  }
}

async function deleteAssignment(req, res) {
  try {
    const { ROLES } = require("../middleware/roles");
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: "Access denied. Admin privileges required to remove eligibility." });
    }
    const id = parseInt(req.params.id);
    await prisma.examAssignment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("[Assignment Delete Error]", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
}

async function overrideResult(req, res) {
  try {
    const { ROLES } = require("../middleware/roles");
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: "Access denied. Admin privileges required for result overrides." });
    }
    const id = parseInt(req.params.id);
    const { score, reason } = req.body;

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ error: "Score must be a number between 0 and 100" });
    }
    const result = await adminService.overrideResult(id, score, reason, req.user.id);
    res.json(result);
  } catch (error) {
    console.error("[Result Override Error]", error);
    res.status(500).json({ error: "Failed to update result" });
  }
}

async function listBatches(req, res) {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { name: 'desc' }
    });
    res.json(batches);
  } catch (error) {
    console.error("[List Batches Error]", error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
}

async function createBatch(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Batch name is required" });
    
    const batch = await prisma.batch.create({
      data: { name: name.trim() }
    });
    res.json(batch);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "A batch with this name already exists" });
    }
    res.status(500).json({ error: "Failed to create batch" });
  }
}

async function updateBatch(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { name, isActive } = req.body;
    
    const batch = await prisma.$transaction(async (tx) => {
      // 1. Get old name if we are renaming
      let oldName = null;
      if (name) {
        const oldBatch = await tx.batch.findUnique({ where: { id } });
        oldName = oldBatch?.name;
      }

      // 2. Update the batch record
      const updated = await tx.batch.update({
        where: { id },
        data: { 
          ...(name && { name: name.trim() }),
          ...(isActive !== undefined && { isActive })
        }
      });

      // 3. Propagate name change to users if name was changed
      if (name && oldName && oldName !== name.trim()) {
        await tx.user.updateMany({
          where: { batch: oldName },
          data: { batch: name.trim() }
        });
      }

      return updated;
    });
    
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: "Failed to update batch" });
  }
}

async function deleteBatch(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.batch.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("[Delete Batch Error]", error);
    res.status(500).json({ error: "Failed to delete batch" });
  }
}

module.exports = {
  getStats,
  importUsers,
  listAssignments,
  createAssignments,
  deleteAssignment,
  overrideResult,
  listBatches,
  createBatch,
  updateBatch,
  deleteBatch
};
