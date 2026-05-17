const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");

async function recordAudit(req, details) {
  const payload = details ?? {};

  // Extract request context synchronously to protect against lifecycle hazard cleanup
  const userId = req?.user?.id ?? null;
  const method = req?.method ? String(req.method) : "UNKNOWN";
  const path = req ? String(req.originalUrl || req.path || "") : "";
  const ip = req?.ip ? String(req.ip) : null;
  const userAgent = req?.headers?.["user-agent"] ? String(req.headers["user-agent"]) : null;
  const requestId = req?.requestId ? String(req.requestId) : null;

  // Execute database insert out-of-band (asynchronously) without awaiting it
  prisma.auditLog.create({
    data: {
      userId,
      action: String(payload.action || "UNKNOWN_ACTION"),
      entityType: payload.entityType ? String(payload.entityType) : null,
      entityId: payload.entityId == null ? null : String(payload.entityId),
      method,
      path,
      statusCode: Number.isFinite(Number(payload.statusCode)) ? Number(payload.statusCode) : 200,
      ip,
      userAgent,
      requestId,
      metadata: payload.metadata ?? null,
    },
  }).catch((err) => {
    console.error("[AUDIT LOG ERROR]", {
      action: payload.action,
      userId,
      requestId,
      error: err.message
    });
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
