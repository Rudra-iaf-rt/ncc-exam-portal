const path = require("path");
const fs = require("fs");
const { prisma } = require("../lib/prisma");
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

/**
 * Validate if a Google Drive file is publicly accessible
 */
async function validateDriveAccess(fileId) {
  try {
    const url = `https://drive.google.com/file/d/${fileId}/preview`;
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual", // Detect redirects to login page
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
    console.error("Drive validation failed:", err);
    return "ERROR";
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

    const accessStatus = await validateDriveAccess(driveFileId);

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
        accessStatus,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      material: mapMaterialRow(material),
      warning: accessStatus === "RESTRICTED" ? "File appears to be private in Google Drive. Cadets won't see it until sharing is set to 'Anyone with link'." : null
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

  const rows = await prisma.material.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });
  return rows.map(mapMaterialRow);
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

  const status = await validateDriveAccess(material.driveFileId);
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
    const status = await validateDriveAccess(m.driveFileId);
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
