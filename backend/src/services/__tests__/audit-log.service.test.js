// Mock dependencies before importing the service to prevent hoisting initialization errors
jest.mock("../../lib/prisma", () => {
  const mockAuditLog = {
    create: jest.fn(),
    findMany: jest.fn(),
  };
  const mockPrisma = {
    auditLog: mockAuditLog,
  };
  return { prisma: mockPrisma };
});

const auditLogService = require("../audit-log.service");
const { prisma } = require("../../lib/prisma");

describe("Audit Log Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("recordAudit", () => {
    const mockReq = {
      user: { id: 42 },
      method: "POST",
      originalUrl: "/api/exams/1/attempt",
      ip: "192.168.1.1",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
      requestId: "req-1234",
    };

    const details = {
      action: "EXAM_START",
      entityType: "Exam",
      entityId: 1,
      statusCode: 200,
      metadata: { debug: true },
    };

    it("should synchronously copy request details and trigger Prisma create out-of-band", async () => {
      // Mock create to resolve successfully
      prisma.auditLog.create.mockReturnValue({
        catch: jest.fn().mockImplementation((cb) => {
          // Immediately call the catch block for test execution if needed, or do nothing
        }),
      });

      // recordAudit is not an async function returned by await (it runs out-of-band)
      await auditLogService.recordAudit(mockReq, details);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 42,
          action: "EXAM_START",
          entityType: "Exam",
          entityId: "1",
          method: "POST",
          path: "/api/exams/1/attempt",
          statusCode: 200,
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          requestId: "req-1234",
          metadata: { debug: true },
        },
      });
    });

    it("should handle missing request properties gracefully and set defaults", async () => {
      prisma.auditLog.create.mockReturnValue({
        catch: jest.fn(),
      });

      await auditLogService.recordAudit(null, null);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          action: "UNKNOWN_ACTION",
          entityType: null,
          entityId: null,
          method: "UNKNOWN",
          path: "",
          statusCode: 200,
          ip: null,
          userAgent: null,
          requestId: null,
          metadata: null,
        },
      });
    });

    it("should catch database errors silently without throwing on the response thread", async () => {
      let registeredCatchBlock = null;
      prisma.auditLog.create.mockReturnValue({
        catch: jest.fn().mockImplementation((cb) => {
          registeredCatchBlock = cb;
        }),
      });

      await auditLogService.recordAudit(mockReq, details);

      expect(registeredCatchBlock).toBeDefined();

      // Trigger the catch block to simulate database error
      const mockError = new Error("Database deadlock or connection pool full");
      registeredCatchBlock(mockError);

      expect(console.error).toHaveBeenCalledWith("[AUDIT LOG ERROR]", {
        action: "EXAM_START",
        userId: 42,
        requestId: "req-1234",
        error: "Database deadlock or connection pool full",
      });
    });
  });

  describe("listAuditLogs", () => {
    it("should fetch audit logs sorted descending with correct defaults", async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 2, action: "LOGIN", userId: 1 },
        { id: 1, action: "REGISTER", userId: 1 },
      ]);

      const logs = await auditLogService.listAuditLogs();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: "desc" },
        take: 50,
        include: {
          user: {
            select: { id: true, name: true, role: true, email: true, regimentalNumber: true },
          },
        },
      });
      expect(logs).toHaveLength(2);
    });

    it("should apply customized limits and filter by action if specified", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await auditLogService.listAuditLogs({ limit: "15", action: "LOGIN" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: "LOGIN" },
        orderBy: { id: "desc" },
        take: 15,
        include: {
          user: {
            select: { id: true, name: true, role: true, email: true, regimentalNumber: true },
          },
        },
      });
    });

    it("should cap the custom limit parameter at a maximum value of 200", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await auditLogService.listAuditLogs({ limit: 500 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: "desc" },
        take: 200,
        include: {
          user: {
            select: { id: true, name: true, role: true, email: true, regimentalNumber: true },
          },
        },
      });
    });
  });
});
