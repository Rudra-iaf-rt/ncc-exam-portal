const usersService = require("../services/users.service");
const auditLogService = require("../services/audit-log.service");
const { logger } = require("../utils/logger");

async function createUser(req, res) {
  try {
    const user = await usersService.createUser(req.body, req.user);
    await auditLogService.recordAudit(req, {
      action: "USER_CREATE",
      entityType: "User",
      entityId: user.id,
      statusCode: 201,
    });
    logger.audit('USER_MANUAL_CREATE', { userId: user.id, regNo: user.regimentalNumber }, req.user.id);
    res.status(201).json(user);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to create user" });
  }
}

async function listAll(req, res) {
  try {
    const users = await usersService.listUsers(req.query ?? {}, req.user);
    res.json(users);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch user registry" });
  }
}

async function searchUsers(req, res) {
  try {
    const users = await usersService.searchUsers(req.query, req.user);
    res.json(users);
  } catch (_error) {
    res.status(500).json({ error: "Failed to search cadets" });
  }
}

async function getFilters(req, res) {
  try {
    const filters = await usersService.getFilters(req.user);
    res.json(filters);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch filter data" });
  }
}

async function getById(req, res) {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "User not found" });
  }
}

async function updateUser(req, res) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    await auditLogService.recordAudit(req, {
      action: "USER_UPDATE",
      entityType: "User",
      entityId: user.id,
      statusCode: 200,
    });
    logger.audit('USER_UPDATE', { targetUserId: user.id }, req.user.id);
    res.json(user);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to update user" });
  }
}

async function removeById(req, res) {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own administrative account" });
    }
    const payload = await usersService.deleteUserById(req.params.id);
    await auditLogService.recordAudit(req, {
      action: "USER_DELETE",
      entityType: "User",
      entityId: payload.id,
      statusCode: 200,
    });
    logger.audit('USER_DELETE', { targetUserId: id }, req.user.id);
    res.json(payload);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to delete user" });
  }
}

async function resetPassword(req, res) {
  try {
    const payload = await usersService.adminResetUserPassword(
      req.params.id,
      req.body?.newPassword
    );
    await auditLogService.recordAudit(req, {
      action: "USER_ADMIN_RESET_PASSWORD",
      entityType: "User",
      entityId: req.params.id,
      statusCode: 200,
    });
    res.json(payload);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to reset password" });
  }
}

async function listInstructors(req, res) {
  try {
    const instructors = await usersService.listInstructors();
    res.json(instructors);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch instructor registry" });
  }
}

async function createInstructor(req, res) {
  try {
    const user = await usersService.createInstructor(req.body);
    await auditLogService.recordAudit(req, {
      action: "INSTRUCTOR_CREATE",
      entityType: "User",
      entityId: user.id,
      statusCode: 201,
    });
    res.status(201).json(user);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to create instructor" });
  }
}

async function bulkImportCadets(req, res) {
  try {
    const results = await usersService.bulkImportCadets(req.body.cadets, req.user);
    await auditLogService.recordAudit(req, {
      action: "USER_BULK_IMPORT",
      entityType: "User",
      statusCode: 200,
      metadata: { 
        successCount: results.success, 
        failCount: results.failed 
      }
    });
    res.json(results);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Bulk import failed" });
  }
}

module.exports = {
  createUser,
  listAll,
  searchUsers,
  getFilters,
  getById,
  updateUser,
  removeById,
  resetPassword,
  listInstructors,
  createInstructor,
  bulkImportCadets,
};
