// Mock all external dependencies BEFORE importing the service
jest.mock("../../lib/prisma", () => ({
  prisma: {
    material: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../lib/redis", () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    scan: jest.fn().mockResolvedValue(["0", []]),
    del: jest.fn(),
  },
}));

// Mock the B2 client — we never want real network calls in unit tests
jest.mock("../../lib/b2", () => ({
  b2Client: {},
  B2_BUCKET_NAME: "test-bucket",
}));

// Mock @aws-sdk/lib-storage Upload
jest.mock("@aws-sdk/lib-storage", () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({}),
  })),
}));

// Mock @aws-sdk/client-s3 send for DeleteObjectCommand
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock pre-signed URL generator
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://b2.example.com/presigned-url?token=abc"),
}));

const materialsService = require("../materials.service");
const { prisma } = require("../../lib/prisma");
const { redis } = require("../../lib/redis");
const { Upload } = require("@aws-sdk/lib-storage");
const { HttpError } = require("../../utils/http-error");

// ─── Test factories ───────────────────────────────────────────────────────────

function makeFile(overrides = {}) {
  return {
    originalname: "manual.pdf",
    filename: "manual-stored.pdf",
    mimetype: "application/pdf",
    size: 102400,
    buffer: Buffer.from("fake-pdf-content"),
    ...overrides,
  };
}

function makeMaterialRow(overrides = {}) {
  return {
    id: 1,
    title: "Map Reading Manual",
    subject: "Navigation",
    description: null,
    category: null,
    fileType: "PDF",
    wing: null,
    accessStatus: "VERIFIED",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    uploadedBy: { id: 5, name: "ANO Singh", role: "COLLEGE_ADMIN" },
    fileUrl: "materials/uuid-1234.pdf",
    originalName: "manual.pdf",
    mimeType: "application/pdf",
    sizeBytes: 102400,
    storedName: "materials/uuid-1234.pdf",
    driveFileId: null,
    collegeId: 2,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Materials Service — Backblaze B2 Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── createMaterial ──────────────────────────────────────────────────────────

  describe("createMaterial", () => {
    const user = { role: "COLLEGE_ADMIN", collegeId: 2 };

    it("should upload to B2 then persist DB row with VERIFIED status", async () => {
      const mockRow = makeMaterialRow();
      prisma.material.create.mockResolvedValue(mockRow);

      const result = await materialsService.createMaterial(
        5,
        makeFile(),
        { title: "Map Reading Manual", subject: "Navigation", fileType: "PDF" },
        user
      );

      // B2 Upload must have been called
      expect(Upload).toHaveBeenCalledTimes(1);

      // DB row should be created with VERIFIED status (not PENDING)
      expect(prisma.material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessStatus: "VERIFIED",
            uploadedById: 5,
            collegeId: 2,
          }),
        })
      );

      expect(result.material.isB2).toBe(true);
      expect(result.material.isDrive).toBe(false);
      expect(result.material.downloadUrl).toBe("/api/materials/1/download");
    });

    it("should NOT create a DB row if B2 upload fails — no orphan records", async () => {
      // Simulate B2 being unreachable
      Upload.mockImplementationOnce(() => ({
        done: jest.fn().mockRejectedValue(new Error("B2 network timeout")),
      }));

      await expect(
        materialsService.createMaterial(5, makeFile(), {}, user)
      ).rejects.toThrow(HttpError);

      // DB must NOT have been touched
      expect(prisma.material.create).not.toHaveBeenCalled();
    });

    it("should throw 400 if no file is provided", async () => {
      await expect(
        materialsService.createMaterial(5, null, {}, user)
      ).rejects.toThrow(new HttpError(400, "A file is required to upload a material."));
    });

    it("SUPER_ADMIN can upload with explicit collegeId or null (global)", async () => {
      prisma.material.create.mockResolvedValue(
        makeMaterialRow({ collegeId: null })
      );
      const superAdmin = { role: "SUPER_ADMIN", collegeId: null };

      await materialsService.createMaterial(
        1,
        makeFile(),
        { title: "Global Manual", collegeId: "" },
        superAdmin
      );

      expect(prisma.material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ collegeId: null }),
        })
      );
    });

    it("uses file.originalname as title fallback if title is not provided", async () => {
      prisma.material.create.mockResolvedValue(makeMaterialRow({ title: "manual.pdf" }));

      await materialsService.createMaterial(5, makeFile(), {}, user);

      expect(prisma.material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "manual.pdf" }),
        })
      );
    });
  });

  // ── getMaterialForDownload ──────────────────────────────────────────────────

  describe("getMaterialForDownload", () => {
    it("should return a B2 object stream and metadata for a B2 material", async () => {
      prisma.material.findUnique.mockResolvedValue(
        makeMaterialRow({ fileUrl: "materials/uuid-1234.pdf", driveFileId: null })
      );
      
      const { b2Client } = require("../../lib/b2");
      b2Client.send = jest.fn().mockResolvedValue({
        Body: "mock-stream",
        ContentType: "application/pdf",
        ContentLength: 1024,
      });

      const result = await materialsService.getMaterialForDownload(1);

      expect(result.isB2).toBe(true);
      expect(result.stream).toBe("mock-stream");
      expect(result.contentType).toBe("application/pdf");
      expect(result.contentLength).toBe(1024);
    });

    it("should return Drive URL for legacy Drive materials", async () => {
      prisma.material.findUnique.mockResolvedValue(
        makeMaterialRow({ fileUrl: null, driveFileId: "abc12345drive" })
      );

      const result = await materialsService.getMaterialForDownload(1);

      expect(result.isDrive).toBe(true);
      expect(result.url).toContain("drive.google.com");
      expect(result.url).toContain("abc12345drive");
    });

    it("should throw 400 for non-numeric ID", async () => {
      await expect(
        materialsService.getMaterialForDownload("not-a-number")
      ).rejects.toThrow(new HttpError(400, "Invalid id"));
    });

    it("should throw 404 if material does not exist", async () => {
      prisma.material.findUnique.mockResolvedValue(null);
      await expect(
        materialsService.getMaterialForDownload(9999)
      ).rejects.toThrow(new HttpError(404, "Not found"));
    });
  });

  // ── deleteMaterialById ──────────────────────────────────────────────────────

  describe("deleteMaterialById", () => {
    it("should soft-delete in DB and fire B2 delete in background", async () => {
      const mockRow = makeMaterialRow({ fileUrl: "materials/uuid-1234.pdf", driveFileId: null });
      prisma.material.findUnique.mockResolvedValue(mockRow);
      prisma.material.update.mockResolvedValue({ ...mockRow, isActive: false });

      const result = await materialsService.deleteMaterialById(1);

      expect(result.success).toBe(true);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it("should still succeed even if the B2 delete fails (best-effort)", async () => {
      const mockRow = makeMaterialRow({ fileUrl: "materials/uuid-1234.pdf", driveFileId: null });
      prisma.material.findUnique.mockResolvedValue(mockRow);
      prisma.material.update.mockResolvedValue({ ...mockRow, isActive: false });

      // Simulate B2 delete failing — result should still be success
      const { b2Client } = require("../../lib/b2");
      b2Client.send = jest.fn().mockRejectedValue(new Error("B2 delete error"));

      const result = await materialsService.deleteMaterialById(1);
      expect(result.success).toBe(true);
    });

    it("should throw 404 if material does not exist", async () => {
      prisma.material.findUnique.mockResolvedValue(null);
      await expect(
        materialsService.deleteMaterialById(9999)
      ).rejects.toThrow(new HttpError(404, "Not found"));
    });
  });

  // ── listMaterials ───────────────────────────────────────────────────────────

  describe("listMaterials", () => {
    const cadetUser = { role: "CADET", collegeId: 2, wing: "ARMY" };

    it("should return cached list from Redis on cache hit", async () => {
      const mockCached = {
        materials: [{ id: 1, title: "Cached Material" }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      redis.get.mockResolvedValue(JSON.stringify(mockCached));

      const result = await materialsService.listMaterials({ user: cadetUser });

      expect(result).toEqual(mockCached);
      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it("should query DB with cadet visibility filters on cache miss", async () => {
      redis.get.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValue([makeMaterialRow()]);
      prisma.material.count.mockResolvedValue(1);

      await materialsService.listMaterials({ user: cadetUser, subject: "Navigation" });

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            accessStatus: "VERIFIED",
            subject: "Navigation",
          }),
        })
      );
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  // ── mapMaterialRow ──────────────────────────────────────────────────────────

  describe("mapMaterialRow", () => {
    it("maps a B2 row with isB2=true and correct downloadUrl", () => {
      const row = makeMaterialRow();
      const mapped = materialsService.mapMaterialRow(row);

      expect(mapped.isB2).toBe(true);
      expect(mapped.isDrive).toBe(false);
      expect(mapped.downloadUrl).toBe("/api/materials/1/download");
    });

    it("maps a legacy Drive row with isDrive=true and Drive URLs", () => {
      const row = makeMaterialRow({ fileUrl: null, driveFileId: "DRIVEID123" });
      const mapped = materialsService.mapMaterialRow(row);

      expect(mapped.isDrive).toBe(true);
      expect(mapped.viewUrl).toContain("DRIVEID123");
      expect(mapped.downloadUrl).toContain("DRIVEID123");
    });
  });
});
