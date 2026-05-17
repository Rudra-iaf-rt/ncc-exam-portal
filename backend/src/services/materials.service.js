const path = require("path");
const fs = require("fs");
const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { backendRoot } = require("../lib/load-env");
const { HttpError } = require("../utils/http-error");

const UPLOAD_ROOT = path.join(backendRoot, "uploads", "materials");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
}

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractDriveId(url) {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{25,})/,
    /[?&]id=([a-zA-Z0-9_-]{25,})/,
    /\/d\/([a-zA-Z0-9_-]{25,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // 5 failures
    this.cooldownPeriod = options.cooldownPeriod || 30000; // 30 seconds
    this.state = "CLOSED"; // CLOSED, OPEN, HALF-OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn, fallbackValue) {
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime > this.cooldownPeriod) {
        this.state = "HALF-OPEN";
        this.successCount = 0;
        console.warn("[CircuitBreaker] Transitioned to HALF-OPEN. Probing Google Drive API...");
      } else {
        console.warn("[CircuitBreaker] Circuit is OPEN. Returning cached/fallback drive validation status immediately.");
        return fallbackValue;
      }
    }

    try {
      const result = await fn();
      
      if (this.state === "HALF-OPEN") {
        this.successCount++;
        if (this.successCount >= 2) {
          this.state = "CLOSED";
          this.failureCount = 0;
          console.log("[CircuitBreaker] Transitioned to CLOSED. Google Drive connection fully restored.");
        }
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
        console.error(`[CircuitBreaker] Transitioned to OPEN after ${this.failureCount} consecutive failures.`);
      } else if (this.state === "HALF-OPEN") {
        this.state = "OPEN";
        console.error("[CircuitBreaker] Half-open probe failed. Returning to OPEN state.");
      }
      
      return fallbackValue;
    }
  }
}

const driveValidationBreaker = new CircuitBreaker();

/**
 * Validate if a Google Drive file is publicly accessible with a strict timeout
 */
async function validateDriveAccess(fileId, timeoutMs = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://drive.google.com/file/d/${fileId}/preview`;
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual", // Detect redirects to login page
      signal: controller.signal,
    });

    const location = response.headers.get("location");
    if (location && location.includes("accounts.google.com")) {
      return "RESTRICTED";
    }

    if (response.status === 200) return "VERIFIED";
    
    // Some regions/IPs might get a 302 to a localized domain
    if (response.status === 302 || response.status === 301) {
      return location && location.includes("accounts.google.com") ? "RESTRICTED" : "VERIFIED";
    }

    return "ERROR";
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`[Drive Validation] Timeout of ${timeoutMs}ms exceeded for file: ${fileId}`);
      throw new Error(`Google Drive validation timeout of ${timeoutMs}ms exceeded`);
    }
    console.error("Drive validation failed:", err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapMaterialRow(m) {
  const result = {
    id: m.id,
    title: m.title,
    subject: m.subject,
    description: m.description,
    category: m.category,
    fileType: m.fileType,
    wing: m.wing,
    accessStatus: m.accessStatus,
    isActive: m.isActive,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    uploadedBy: m.uploadedBy
      ? { id: m.uploadedBy.id, name: m.uploadedBy.name, role: m.uploadedBy.role }
      : undefined,
  };

  if (m.driveFileId) {
    result.driveFileId = m.driveFileId;
    result.previewUrl = `https://drive.google.com/file/d/${m.driveFileId}/preview`;
    result.viewUrl = `https://drive.google.com/file/d/${m.driveFileId}/view`;
    result.downloadUrl = `https://drive.google.com/uc?export=download&id=${m.driveFileId}`;
    result.isDrive = true;
  } else {
    result.originalName = m.originalName;
    result.mimeType = m.mimeType;
    result.sizeBytes = m.sizeBytes;
    result.downloadUrl = `/api/materials/${m.id}/download`;
    result.isDrive = false;
  }

  return result;
}

async function createMaterial(uploadedById, file, body, user) {
  const { title, subject, description, driveUrl, fileType, wing, collegeId } = body;

  // Handle Drive Material
  if (driveUrl) {
    const driveFileId = extractDriveId(driveUrl);
    if (!driveFileId) {
      throw new HttpError(400, "Invalid Google Drive URL");
    }

    // Instantly save as PENDING to avoid slowing down HTTP response cycle
    const material = await prisma.material.create({
      data: {
        title: title || "Untitled Material",
        subject,
        description,
        driveFileId,
        fileType: fileType || "PDF",
        wing: wing || null,
        collegeId: user.role === "SUPER_ADMIN" ? (collegeId ? parseInt(collegeId, 10) : null) : user.collegeId,
        uploadedById,
        accessStatus: "PENDING",
      },
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    });

    // Fire off out-of-band background task to validate Drive accessibility via circuit breaker
    driveValidationBreaker.execute(
      () => validateDriveAccess(driveFileId, 1000),
      "ERROR"
    ).then(async (accessStatus) => {
      try {
        await prisma.material.update({
          where: { id: material.id },
          data: { accessStatus },
        });
        console.log(`[Drive Background Task] Material ${material.id} set to ${accessStatus}`);
      } catch (dbErr) {
        console.error(`[Drive Background Task] DB write failed for material ${material.id}:`, dbErr);
      }
    });

    return {
      material: mapMaterialRow(material),
      warning: null
    };
  }

  // Handle Local File Material (Legacy)
  ensureUploadDir();
  if (!file) {
    throw new HttpError(400, "File or Drive URL is required");
  }

  const material = await prisma.material.create({
    data: {
      title: title || file.originalname,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      uploadedById,
      collegeId: user.collegeId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return { material: mapMaterialRow(material) };
}

async function listMaterials(filters = {}) {
  const { user, subject, fileType, wing } = filters;
  
  // Construct a cache key based on user role, context and filters
  const page = Math.max(1, parseInt(filters.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit || "20", 10)));
  const skip = (page - 1) * limit;

  // Construct a cache key based on user role, context, filters and pagination
  const cacheKey = `materials:list:${user?.role || 'anon'}:${user?.collegeId || 'global'}:${subject || 'all'}:${fileType || 'all'}:${wing || 'all'}:p${page}:l${limit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[Redis] GET error in listMaterials", err);
  }

  const where = {
    isActive: true,
  };

  // Scoped visibility for Cadets
  if (user && user.role === "CADET") {
    where.accessStatus = "VERIFIED";
    
    // Visibility: (College matched OR global) AND (Wing matched OR global)
    where.AND = [
      {
        OR: [
          { collegeId: null },
          { collegeId: user.collegeId }
        ]
      },
      {
        OR: [
          { wing: null },
          { wing: user.wing }
        ]
      }
    ];
  } else if (user && user.role === "COLLEGE_ADMIN") {
    // ANOs only see their college's materials or global ones
    where.OR = [
      { collegeId: null },
      { collegeId: user.collegeId }
    ];
  }

  if (subject) where.subject = subject;
  if (fileType) where.fileType = fileType;
  if (wing) where.wing = wing;

  const [rows, total] = await Promise.all([
    prisma.material.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        college: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
      skip,
      take: limit,
    }),
    prisma.material.count({ where }),
  ]);

  const finalMaterials = rows.map(mapMaterialRow);
  const response = {
    materials: finalMaterials,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };


  try {
    // Cache for 5 minutes (300 seconds) as materials don't change very frequently
    await redis.setex(cacheKey, 300, JSON.stringify(response));
  } catch (err) {
    console.error("[Redis] SET error in listMaterials", err);
  }

  return response;
}

async function getMaterialForDownload(id) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, "Invalid id");
  }

  const material = await prisma.material.findUnique({ where: { id: parsed } });
  if (!material) {
    throw new HttpError(404, "Not found");
  }

  if (material.driveFileId) {
    return { isDrive: true, url: `https://drive.google.com/uc?export=download&id=${material.driveFileId}` };
  }

  const filePath = path.join(UPLOAD_ROOT, material.storedName);
  if (!fs.existsSync(filePath)) {
    throw new HttpError(404, "File missing on server");
  }

  return { isDrive: false, material, filePath };
}

async function getMaterialById(id) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, "Invalid id");
  }
  const row = await prisma.material.findUnique({
    where: { id: parsed },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!row) {
    throw new HttpError(404, "Not found");
  }
  return mapMaterialRow(row);
}

async function deleteMaterialById(id) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, "Invalid id");
  }
  const material = await prisma.material.findUnique({ where: { id: parsed } });
  if (!material) {
    throw new HttpError(404, "Not found");
  }

  // Soft delete for Syllabus materials
  await prisma.material.update({
    where: { id: parsed },
    data: { isActive: false }
  });

  // If it was a local file, we could delete it, but soft-delete is safer for history
  return { id: parsed, success: true };
}

async function revalidateMaterial(id) {
  const material = await prisma.material.findUnique({ where: { id: parseInt(id, 10) } });
  if (!material || !material.driveFileId) return null;

  const status = await driveValidationBreaker.execute(
    () => validateDriveAccess(material.driveFileId, 1000),
    "ERROR"
  );
  const updated = await prisma.material.update({
    where: { id: material.id },
    data: { accessStatus: status },
    include: { uploadedBy: { select: { id: true, name: true, role: true } } }
  });

  return mapMaterialRow(updated);
}

async function revalidateAllMaterials() {
  const materials = await prisma.material.findMany({
    where: { driveFileId: { not: null }, isActive: true },
    select: { id: true, driveFileId: true }
  });

  console.log(`[Cron] Starting revalidation for ${materials.length} Drive materials...`);
  
  for (const m of materials) {
    const status = await driveValidationBreaker.execute(
      () => validateDriveAccess(m.driveFileId, 1000),
      "ERROR"
    );
    await prisma.material.update({
      where: { id: m.id },
      data: { accessStatus: status }
    });
  }

  console.log(`[Cron] Revalidation complete.`);
}

module.exports = {
  UPLOAD_ROOT,
  ensureUploadDir,
  mapMaterialRow,
  createMaterial,
  listMaterials,
  getMaterialForDownload,
  getMaterialById,
  deleteMaterialById,
  revalidateMaterial,
  revalidateAllMaterials,
};
