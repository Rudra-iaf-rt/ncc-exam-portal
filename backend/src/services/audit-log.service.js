const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");

async function recordAudit(req, details) {
  const payload = details ?? {};
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id ?? null,
      action: String(payload.action || "UNKNOWN_ACTION"),
      entityType: payload.entityType ? String(payload.entityType) : null,
      entityId:
        payload.entityId == null ? null : String(payload.entityId),
      method: String(req.method || "UNKNOWN"),
      path: String(req.originalUrl || req.path || ""),
      statusCode:
        Number.isFinite(Number(payload.statusCode)) ? Number(payload.statusCode) : 200,
      ip: req.ip ? String(req.ip) : null,
      userAgent: req.headers?.["user-agent"] ? String(req.headers["user-agent"]) : null,
      requestId: req.requestId ? String(req.requestId) : null,
      metadata: payload.metadata ?? null,
    },
  });
}

async function listAuditLogs(query = {}) {
  const limitRaw = Number(query.limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 50;
  const action = typeof query.action === "string" && query.action.trim() !== ""
    ? query.action.trim()
    : null;

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, role: true, email: true, regimentalNumber: true },
      },
    },
  });
  return rows;
}

module.exports = {
  recordAudit,
  listAuditLogs,
};
