// Mock dependencies before importing colleges.service
jest.mock("../../lib/prisma", () => {
  const mockCollege = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockUser = {
    groupBy: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  };
  const mockPrisma = {
    college: mockCollege,
    user: mockUser,
  };
  mockPrisma.$transaction = jest.fn((cb) => {
    if (typeof cb === "function") {
      return cb(mockPrisma);
    }
    return Promise.resolve(cb);
  });
  return { prisma: mockPrisma };
});

jest.mock("../users.service", () => ({
  createInstructor: jest.fn(),
  updateUser: jest.fn(),
}));

const collegesService = require("../colleges.service");
const { prisma } = require("../../lib/prisma");
const userService = require("../users.service");
const { HttpError } = require("../../utils/http-error");

describe("Colleges Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("listColleges & listCollegesAll", () => {
    const mockCollegesData = [
      { id: 1, name: "Maharaja Institute of Technology", code: "MIT", isActive: true },
      { id: 2, name: "Vidya Vardhaka College", code: "VVC", isActive: true },
    ];

    it("should list colleges and attach officer and cadet counts using a single groupBy query", async () => {
      prisma.college.findMany.mockResolvedValue(mockCollegesData);
      prisma.user.groupBy.mockResolvedValue([
        { collegeCode: "MIT", role: "INSTRUCTOR", _count: { _all: 3 } },
        { collegeCode: "MIT", role: "STUDENT", _count: { _all: 120 } },
        { collegeCode: "VVC", role: "STUDENT", _count: { _all: 85 } },
      ]);

      const result = await collegesService.listColleges();

      expect(prisma.college.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      expect(prisma.user.groupBy).toHaveBeenCalledWith({
        by: ["collegeCode", "role"],
        where: {
          role: { in: ["INSTRUCTOR", "STUDENT"] },
          collegeCode: { not: null },
        },
        _count: { _all: true },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: "Maharaja Institute of Technology",
        code: "MIT",
        isActive: true,
        officerCount: 3,
        cadetCount: 120,
      });
      expect(result[1]).toEqual({
        id: 2,
        name: "Vidya Vardhaka College",
        code: "VVC",
        isActive: true,
        officerCount: 0,
        cadetCount: 85,
      });
    });

    it("should list all colleges (including inactive) for admin", async () => {
      prisma.college.findMany.mockResolvedValue([
        ...mockCollegesData,
        { id: 3, name: "Old College", code: "OLD", isActive: false },
      ]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await collegesService.listCollegesAll();

      expect(prisma.college.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(3);
      expect(result[2].isActive).toBe(false);
    });
  });

  describe("createCollege", () => {
    const validBody = {
      name: "Maharaja Institute of Technology",
      code: "MIT",
      address: "Mysore Road",
      city: "Mysore",
      state: "Karnataka",
      pincode: "570003",
    };

    it("should throw HttpError 400 if name is missing or empty", async () => {
      await expect(collegesService.createCollege({ ...validBody, name: "   " })).rejects.toThrow(
        new HttpError(400, "College name is required")
      );
    });

    it("should throw HttpError 409 if name is already taken", async () => {
      prisma.college.findUnique.mockResolvedValue({ id: 1, name: "Maharaja Institute of Technology" });
      await expect(collegesService.createCollege(validBody)).rejects.toThrow(
        new HttpError(409, "A college with this name already exists")
      );
    });

    it("should throw HttpError 409 if provided code is already taken", async () => {
      prisma.college.findUnique
        .mockResolvedValueOnce(null) // Name check
        .mockResolvedValueOnce({ id: 2, code: "MIT" }); // Code check

      await expect(collegesService.createCollege(validBody)).rejects.toThrow(
        new HttpError(409, 'College code "MIT" is already in use')
      );
    });

    it("should successfully auto-generate a college code prefix and suffix when code is not supplied", async () => {
      prisma.college.findUnique.mockResolvedValue(null);
      prisma.college.count.mockResolvedValue(0);
      prisma.college.create.mockImplementation(({ data }) => Promise.resolve({ id: 10, ...data }));

      const res = await collegesService.createCollege({
        name: "Maharaja Institute of Technology",
      });

      expect(res.code).toBe("MIOT-001");
      expect(prisma.college.create).toHaveBeenCalled();
    });

    it("should link OIC instructor user if newOic is supplied", async () => {
      prisma.college.findUnique.mockResolvedValue(null);
      prisma.college.create.mockResolvedValue({ id: 5, code: "MIT", name: "Maharaja Institute of Technology" });

      await collegesService.createCollege({
        ...validBody,
        newOic: { name: "OIC Instructor", email: "oic@mit.edu" },
      });

      expect(userService.createInstructor).toHaveBeenCalledWith(
        {
          name: "OIC Instructor",
          email: "oic@mit.edu",
          college: "MIT",
          mobile: undefined,
        },
        expect.anything()
      );
    });
  });

  describe("updateCollege", () => {
    it("should throw HttpError 400 for invalid college ID", async () => {
      await expect(collegesService.updateCollege("abc", {})).rejects.toThrow(
        new HttpError(400, "Invalid college ID")
      );
    });

    it("should throw HttpError 404 if college does not exist", async () => {
      prisma.college.findUnique.mockResolvedValue(null);
      await expect(collegesService.updateCollege(99, {})).rejects.toThrow(
        new HttpError(404, "College not found")
      );
    });

    it("should throw HttpError 409 if changing code while users are currently assigned to old code", async () => {
      prisma.college.findUnique.mockResolvedValue({ id: 1, code: "MIT" });
      prisma.user.count.mockResolvedValue(5); // 5 active users

      await expect(collegesService.updateCollege(1, { code: "NEWCODE" })).rejects.toThrow(
        new HttpError(409, 'Cannot change college code: 5 user(s) are assigned to code "MIT"')
      );
    });
  });

  describe("deactivateCollege", () => {
    it("should deactivate college by setting isActive to false", async () => {
      prisma.college.findUnique.mockResolvedValue({ id: 1, name: "MIT", isActive: true });
      prisma.college.update.mockResolvedValue({ id: 1, name: "MIT", isActive: false });

      const res = await collegesService.deactivateCollege(1);
      expect(res.isActive).toBe(false);
      expect(prisma.college.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });
  });
});
