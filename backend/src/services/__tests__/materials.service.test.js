// Mock dependencies before importing the service to prevent hoisting initialization errors
jest.mock("../../lib/prisma", () => {
  const mockMaterial = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const mockPrisma = {
    material: mockMaterial,
  };
  return { prisma: mockPrisma };
});

jest.mock("../../lib/redis", () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

const materialsService = require("../materials.service");
const { prisma } = require("../../lib/prisma");
const { redis } = require("../../lib/redis");
const { HttpError } = require("../../utils/http-error");

describe("Materials Service Unit Tests", () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("extractDriveId", () => {
    // Tests for extractDriveId indirectly via createMaterial driveUrl formats
    it("should accept valid drive file sharing urls", async () => {
      prisma.material.create.mockResolvedValue({
        id: 1,
        title: "Test",
        driveFileId: "1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O",
        uploadedById: 10,
        accessStatus: "PENDING",
      });

      const user = { role: "CADET", collegeId: 1 };
      const body = {
        title: "Test",
        driveUrl: "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O/view?usp=sharing",
        subject: "Military History",
      };

      global.fetch.mockResolvedValue({
        status: 200,
        headers: { get: () => null },
      });

      const res = await materialsService.createMaterial(10, null, body, user);
      expect(res.material.driveFileId).toBe("1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O");
      expect(res.material.isDrive).toBe(true);
      expect(prisma.material.create).toHaveBeenCalled();
    });

    it("should throw HttpError 400 if drive url is malformed", async () => {
      const user = { role: "CADET", collegeId: 1 };
      const body = {
        title: "Test",
        driveUrl: "https://invalidurl.com/somefile",
      };

      await expect(
        materialsService.createMaterial(10, null, body, user)
      ).rejects.toThrow(new HttpError(400, "Invalid Google Drive URL"));
    });
  });

  describe("createMaterial (Drive)", () => {
    const user = { role: "COLLEGE_ADMIN", collegeId: 2 };
    const body = {
      title: "Map Reading Manual",
      subject: "Map Reading",
      driveUrl: "https://drive.google.com/file/d/1234567890abcdefghijklmnopqrstuvw/view",
    };

    it("should instantly save material as PENDING and schedule drive verification out-of-band", async () => {
      prisma.material.create.mockResolvedValue({
        id: 100,
        title: "Map Reading Manual",
        subject: "Map Reading",
        driveFileId: "1234567890abcdefghijklmnopqrstuvw",
        uploadedById: 5,
        accessStatus: "PENDING",
      });

      // Mock fetch return values to represent restricted google domain redirect
      global.fetch.mockResolvedValue({
        status: 302,
        headers: {
          get: (key) => (key === "location" ? "https://accounts.google.com/signin" : null),
        },
      });

      prisma.material.update.mockResolvedValue({
        id: 100,
        accessStatus: "RESTRICTED",
      });

      const res = await materialsService.createMaterial(5, null, body, user);

      // Asserts background verify scheduling happened without pausing execution
      expect(res.material.accessStatus).toBe("PENDING");
      expect(prisma.material.create).toHaveBeenCalled();

      // Flush event queue to let driveValidationBreaker run its background update promise
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { accessStatus: "RESTRICTED" },
      });
    });
  });

  describe("createMaterial (Local file)", () => {
    const user = { role: "COLLEGE_ADMIN", collegeId: 2 };
    const body = { title: "Custom PDF", subject: "Military History" };
    const mockFile = {
      originalname: "history.pdf",
      filename: "history-stored.pdf",
      mimetype: "application/pdf",
      size: 102400,
    };

    it("should upload file locally and persist details in Database", async () => {
      prisma.material.create.mockResolvedValue({
        id: 101,
        title: "Custom PDF",
        originalName: "history.pdf",
        storedName: "history-stored.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400,
        uploadedById: 5,
        accessStatus: "VERIFIED",
      });

      const res = await materialsService.createMaterial(5, mockFile, body, user);

      expect(res.material.isDrive).toBe(false);
      expect(res.material.downloadUrl).toBe("/api/materials/101/download");
      expect(prisma.material.create).toHaveBeenCalled();
    });

    it("should throw HttpError 400 if neither file nor driveUrl is supplied", async () => {
      await expect(
        materialsService.createMaterial(5, null, {}, user)
      ).rejects.toThrow(new HttpError(400, "File or Drive URL is required"));
    });
  });

  describe("listMaterials", () => {
    const cadetUser = { role: "CADET", collegeId: 2, wing: "ARMY" };

    it("should return cached list from Redis if hit", async () => {
      const mockCachedResponse = {
        materials: [{ id: 1, title: "Cached File" }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      redis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const res = await materialsService.listMaterials({ user: cadetUser });

      expect(redis.get).toHaveBeenCalledWith(
        "materials:list:CADET:2:all:all:all:p1:l20"
      );
      expect(res).toEqual(mockCachedResponse);
      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it("should query DB, apply visibility filters, cache results and return data on cache miss", async () => {
      redis.get.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 5,
          title: "Syllabus Part 1",
          driveFileId: "abcdef",
          uploadedById: 3,
          accessStatus: "VERIFIED",
        },
      ]);
      prisma.material.count.mockResolvedValue(1);

      const res = await materialsService.listMaterials({
        user: cadetUser,
        subject: "Infantry Tactics",
      });

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            accessStatus: "VERIFIED",
            subject: "Infantry Tactics",
          }),
        })
      );
      expect(redis.setex).toHaveBeenCalled();
      expect(res.materials).toHaveLength(1);
    });
  });

  describe("getMaterialForDownload", () => {
    it("should return drive view and download path if it is a Drive material", async () => {
      prisma.material.findUnique.mockResolvedValue({
        id: 10,
        driveFileId: "abc12345",
      });

      const res = await materialsService.getMaterialForDownload(10);
      expect(res.isDrive).toBe(true);
      expect(res.url).toBe("https://drive.google.com/uc?export=download&id=abc12345");
    });

    it("should throw HttpError 400 for invalid ID parameter", async () => {
      await expect(
        materialsService.getMaterialForDownload("invalid-id")
      ).rejects.toThrow(new HttpError(400, "Invalid id"));
    });

    it("should throw HttpError 404 if material does not exist in DB", async () => {
      prisma.material.findUnique.mockResolvedValue(null);
      await expect(
        materialsService.getMaterialForDownload(999)
      ).rejects.toThrow(new HttpError(404, "Not found"));
    });
  });

  describe("deleteMaterialById", () => {
    it("should execute soft-delete setting isActive to false", async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 10, isActive: true });
      prisma.material.update.mockResolvedValue({ id: 10, isActive: false });

      const res = await materialsService.deleteMaterialById(10);
      expect(res.success).toBe(true);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { isActive: false },
      });
    });
  });
});
