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

function mapMaterialRow(m) {
  return {
    id: m.id,
    title: m.title,
    originalName: m.originalName,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    createdAt: m.createdAt,
    uploadedBy: m.uploadedBy
      ? { id: m.uploadedBy.id, name: m.uploadedBy.name, role: m.uploadedBy.role }
      : undefined,
    downloadUrl: `/api/materials/${m.id}/download`,
  };
}

async function createMaterial(uploadedById, file, body) {
  ensureUploadDir();

  if (!file) {
    throw new HttpError(400, 'file is required (multipart field name: "file")');
  }

  const rawTitle = body?.title;
  const title =
    rawTitle != null && String(rawTitle).trim() !== ""
      ? String(rawTitle).trim()
      : null;

  const material = await prisma.material.create({
    data: {
      title,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      uploadedById,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return mapMaterialRow(material);
}

async function listMaterials() {
  const rows = await prisma.material.findMany({
    orderBy: { id: "desc" },
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

  const filePath = path.join(UPLOAD_ROOT, material.storedName);
  if (!fs.existsSync(filePath)) {
    throw new HttpError(404, "File missing on server");
  }

  return { material, filePath };
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
  await prisma.material.delete({ where: { id: parsed } });
  const filePath = path.join(UPLOAD_ROOT, material.storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return { id: parsed };
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
};
