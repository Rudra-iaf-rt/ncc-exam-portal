const path = require("path");
const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { withTimeout } = require("../lib/cache");
const { b2Client, B2_BUCKET_NAME } = require("../lib/b2");
const { Upload } = require("@aws-sdk/lib-storage");
const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { HttpError } = require("../utils/http-error");
const crypto = require("crypto");

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Build a deterministic Redis cache key for a materials list query.
 */
function buildCacheKey(filters, page, limit) {
  const { user, subject, fileType, wing } = filters;
  return `materials:list:${user?.role || "anon"}:${user?.collegeId || "global"}:${subject || "all"}:${fileType || "all"}:${wing || "all"}:p${page}:l${limit}`;
}

/**
 * Invalidate ALL materials list cache keys for a given user context.
 * Called on every create or delete so the next list request fetches fresh data.
 */
async function invalidateMaterialsCache() {
  try {
    // Use SCAN to find matching keys — safe at 3k users with a short pattern
    let cursor = "0";
    do {
      const [nextCursor, keys] = await withTimeout(
        redis.scan(
          cursor,
          "MATCH",
          "materials:list:*",
          "COUNT",
          100
        ),
        ["0", []]
      );
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        await withTimeout(redis.del(...keys), null);
      }
    } while (cursor !== "0");
  } catch (err) {
    // Cache invalidation failure must never block the primary response
    console.error("[Redis] Cache invalidation failed in materials:", err.message);
  }
}

// ─── B2 Storage helpers ───────────────────────────────────────────────────────

/**
 * Upload a multer file buffer to Backblaze B2.
 * Uses @aws-sdk/lib-storage Upload which handles multipart automatically for
 * files > 5MB, so this works for both small PDFs and large video lectures.
 *
 * @param {Express.Multer.File} file  - The multer file object (memoryStorage)
 * @returns {{ b2Key: string }}
 * @throws {HttpError} 502 EXT_001 if B2 is unreachable or rejects the upload
 */
async function uploadToB2(file) {
  const ext = path.extname(file.originalname) || "";
  const b2Key = `materials/${crypto.randomUUID()}${ext}`;

  try {
    const upload = new Upload({
      client: b2Client,
      params: {
        Bucket: B2_BUCKET_NAME,
        Key: b2Key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        ContentLength: file.size,
      },
    });

    await upload.done();
    return { b2Key };
  } catch (err) {
    console.error("[B2] Upload failed:", {
      action: "b2_upload",
      error_code: "EXT_001",
      message: err.message,
      originalname: file.originalname,
    });
    throw new HttpError(502, "File storage service is currently unavailable. Please try again.");
  }
}

/**
 * Delete a file from B2 by its key. Best-effort — does not throw.
 * Called after a soft-delete so we clean up orphaned files in the background.
 *
 * @param {string} b2Key
 */
async function deleteFromB2(b2Key) {
  if (!b2Key) return;
  try {
    await b2Client.send(
      new DeleteObjectCommand({ Bucket: B2_BUCKET_NAME, Key: b2Key })
    );
    console.log(`[B2] Deleted object: ${b2Key}`);
  } catch (err) {
    // Non-fatal — the DB soft-delete is the source of truth. B2 may have
    // already been cleaned, or the key never existed (legacy Drive row).
    console.error("[B2] Non-fatal delete failed:", {
      action: "b2_delete",
      error_code: "EXT_001",
      b2Key,
      message: err.message,
    });
  }
}

/**
 * Get the readable stream and metadata for a B2 object so we can proxy it
 * through the backend, hiding the B2 URL from the client.
 *
 * @param {string} b2Key
 * @returns {Promise<{ stream: import('stream').Readable, contentType: string, contentLength: number }>}
 */
async function getB2ObjectStream(b2Key) {
  try {
    const command = new GetObjectCommand({ Bucket: B2_BUCKET_NAME, Key: b2Key });
    const response = await b2Client.send(command);
    return {
      stream: response.Body,
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  } catch (err) {
    console.error("[B2] Get object stream failed:", {
      action: "b2_get_stream",
      error_code: "EXT_001",
      b2Key,
      message: err.message,
    });
    throw new HttpError(502, "Could not fetch file from storage. Please try again.");
  }
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

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
    // ── Legacy Google Drive material ─────────────────────────────────────────
    result.driveFileId = m.driveFileId;
    result.previewUrl = `https://drive.google.com/file/d/${m.driveFileId}/preview`;
    result.viewUrl = `https://drive.google.com/file/d/${m.driveFileId}/view`;
    result.downloadUrl = `https://drive.google.com/uc?export=download&id=${m.driveFileId}`;
    result.isDrive = true;
  } else if (m.fileUrl) {
    // ── Backblaze B2 material ────────────────────────────────────────────────
    result.b2Key = m.fileUrl; // fileUrl column stores the B2 object key
    result.downloadUrl = `/api/materials/${m.id}/download`; // proxied via backend
    result.originalName = m.originalName;
    result.mimeType = m.mimeType;
    result.sizeBytes = m.sizeBytes;
    result.isDrive = false;
    result.isB2 = true;
  } else {
    // ── Legacy local disk material (fallback) ────────────────────────────────
    result.originalName = m.originalName;
    result.mimeType = m.mimeType;
    result.sizeBytes = m.sizeBytes;
    result.downloadUrl = `/api/materials/${m.id}/download`;
    result.isDrive = false;
    result.isB2 = false;
  }

  return result;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Create a new material — upload to B2 first, then persist to DB.
 * The DB row is never written if the B2 upload fails, preventing orphan records.
 */
async function createMaterial(uploadedById, file, body, user) {
  const { title, subject, description, fileType, wing, collegeId } = body;

  if (!file) {
    throw new HttpError(400, "A file is required to upload a material.");
  }

  // 1. Upload to B2 first — fail fast before touching the DB
  const { b2Key } = await uploadToB2(file);

  // 2. Persist metadata to DB. accessStatus is always VERIFIED for B2 uploads
  //    since WE control the file — no third-party access check needed.
  const material = await prisma.material.create({
    data: {
      title: title || file.originalname,
      subject,
      description,
      fileUrl: b2Key,           // stored in the existing fileUrl column
      originalName: file.originalname,
      storedName: b2Key,        // also stored here for legacy compat
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      fileType: fileType || "PDF",
      wing: wing || null,
      collegeId:
        user.role === "SUPER_ADMIN"
          ? (collegeId ? parseInt(collegeId, 10) : null)
          : user.collegeId,
      uploadedById,
      accessStatus: "VERIFIED", // B2 files are always directly accessible
    },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  // 3. Invalidate list cache so the new material appears immediately
  await invalidateMaterialsCache();

  return { material: mapMaterialRow(material) };
}

/**
 * List materials with role-based visibility filters, Redis caching,
 * and server-side pagination.
 */
async function listMaterials(filters = {}) {
  const { user, subject, fileType, wing } = filters;

  const page = Math.max(1, parseInt(filters.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const cacheKey = buildCacheKey(filters, page, limit);

  try {
    const cached = await withTimeout(redis.get(cacheKey), null);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[Redis] GET error in listMaterials", err.message);
  }

  const where = { isActive: true };

  if (user && user.role === "CADET") {
    where.accessStatus = "VERIFIED";
    where.AND = [
      { OR: [{ collegeId: null }, { collegeId: user.collegeId }] },
      { OR: [{ wing: null }, { wing: user.wing }] },
    ];
  } else if (user && user.role === "COLLEGE_ADMIN") {
    where.OR = [{ collegeId: null }, { collegeId: user.collegeId }];
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

  const response = {
    materials: rows.map(mapMaterialRow),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  try {
    await withTimeout(redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response)), null);
  } catch (err) {
    console.error("[Redis] SET error in listMaterials", err.message);
  }

  return response;
}

/**
 * Get a single material's metadata by ID.
 */
async function getMaterialById(id) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Invalid id");

  const row = await prisma.material.findUnique({
    where: { id: parsed },
    include: { uploadedBy: { select: { id: true, name: true, role: true } } },
  });
  if (!row) throw new HttpError(404, "Not found");

  return mapMaterialRow(row);
}

/**
 * Resolve the download/view for a material:
 * - B2 material   → returns the stream and metadata for proxying
 * - Drive material → return the Drive URL for redirect
 * - Legacy disk   → return the file path for streaming (fallback only)
 */
async function getMaterialForDownload(id, forceDownload = true) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Invalid id");

  const material = await prisma.material.findUnique({ where: { id: parsed } });
  if (!material) throw new HttpError(404, "Not found");

  if (material.fileUrl && !material.driveFileId) {
    // B2 material — fetch the stream to proxy it through the backend
    const b2Data = await getB2ObjectStream(material.fileUrl);
    return { isB2: true, material, ...b2Data };
  }

  if (material.driveFileId) {
    // Legacy Drive material
    return {
      isDrive: true,
      url: forceDownload 
        ? `https://drive.google.com/uc?export=download&id=${material.driveFileId}`
        : `https://drive.google.com/file/d/${material.driveFileId}/preview`,
    };
  }

  // Legacy local disk material (fallback for very old records)
  const fs = require("fs");
  const path = require("path");
  const { backendRoot } = require("./load-env");
  const UPLOAD_ROOT = path.join(backendRoot, "uploads", "materials");
  const filePath = path.join(UPLOAD_ROOT, material.storedName);

  if (!fs.existsSync(filePath)) throw new HttpError(404, "File missing on server");
  return { isDrive: false, isB2: false, material, filePath };
}

/**
 * Soft-delete a material in DB, then best-effort delete from B2.
 */
async function deleteMaterialById(id) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Invalid id");

  const material = await prisma.material.findUnique({ where: { id: parsed } });
  if (!material) throw new HttpError(404, "Not found");

  // DB soft-delete is the primary operation — always completes
  await prisma.material.update({
    where: { id: parsed },
    data: { isActive: false },
  });

  // Fire-and-forget B2 cleanup. Never awaited so it never blocks the response.
  // B2 object will be orphaned at worst — storage is cheap and we can purge later.
  if (material.fileUrl && !material.driveFileId) {
    deleteFromB2(material.fileUrl).catch(() => {}); // error already logged inside
  }

  // Invalidate cache so deleted item disappears from list immediately
  await invalidateMaterialsCache();

  return { id: parsed, success: true };
}

/**
 * Update material metadata (title, subject, wing, etc).
 * File updating (swapping) is not supported here.
 */
async function updateMaterial(id, body, user) {
  const parsed = parseInt(String(id), 10);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Invalid id");

  const material = await prisma.material.findUnique({ where: { id: parsed } });
  if (!material || !material.isActive) throw new HttpError(404, "Not found");

  const { title, subject, description, fileType, wing, collegeId, accessStatus } = body;

  const data = {};
  if (title !== undefined) data.title = title;
  if (subject !== undefined) data.subject = subject;
  if (description !== undefined) data.description = description;
  if (fileType !== undefined) data.fileType = fileType;
  if (wing !== undefined) data.wing = wing || null;
  if (accessStatus !== undefined) data.accessStatus = accessStatus;
  
  if (user.role === "SUPER_ADMIN" && collegeId !== undefined) {
    data.collegeId = collegeId ? parseInt(collegeId, 10) : null;
  }

  const updated = await prisma.material.update({
    where: { id: parsed },
    data,
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await invalidateMaterialsCache();

  return { material: mapMaterialRow(updated) };
}

module.exports = {
  createMaterial,
  listMaterials,
  getMaterialById,
  getMaterialForDownload,
  deleteMaterialById,
  updateMaterial,
  // Exported for tests
  uploadToB2,
  deleteFromB2,
  mapMaterialRow,
};
