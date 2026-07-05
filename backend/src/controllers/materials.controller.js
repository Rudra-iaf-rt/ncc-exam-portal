const fs = require("fs");
const materialsService = require("../services/materials.service");

/**
 * POST /material/upload
 * Uploads the multipart file to B2, then persists metadata to DB.
 */
async function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: "Bad Request",
      message: "A file is required.",
      code: "VAL_001",
    });
  }

  const result = await materialsService.createMaterial(
    req.user.id,
    req.file,
    req.body,
    req.user
  );
  res.status(201).json(result);
}

/**
 * GET /materials
 */
async function list(req, res) {
  const data = await materialsService.listMaterials({
    ...req.query,
    user: req.user,
  });
  res.json(data);
}

/**
 * GET /materials/:id/download
 * For B2 materials: streams the file through the backend (forces download).
 * For legacy Drive materials: redirects to Drive download URL.
 * For legacy disk materials: streams the file.
 */
async function download(req, res) {
  const result = await materialsService.getMaterialForDownload(req.params.id, true);

  if (result.isDrive) {
    return res.redirect(result.url);
  }

  if (result.isB2) {
    res.setHeader("Content-Type", result.contentType || "application/octet-stream");
    res.setHeader("Content-Length", result.contentLength);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.material.originalName)}"`
    );
    result.stream.pipe(res);
    return;
  }

  // Legacy local disk path (very old records only)
  const { material, filePath } = result;
  res.setHeader("Content-Type", material.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(material.originalName)}"`
  );

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read file", code: "SRV_001" });
    }
  });
  stream.pipe(res);
}

/**
 * GET /materials/:id/view
 * For B2 materials: streams the file through the backend (inline view).
 * For legacy Drive materials: redirects to Drive preview URL.
 * For legacy disk materials: streams the file inline.
 */
async function view(req, res) {
  const result = await materialsService.getMaterialForDownload(req.params.id, false);

  if (result.isDrive) {
    return res.redirect(result.url);
  }

  if (result.isB2) {
    res.setHeader("Content-Type", result.contentType || "application/octet-stream");
    res.setHeader("Content-Length", result.contentLength);
    res.setHeader("Content-Disposition", "inline");
    result.stream.pipe(res);
    return;
  }

  // Legacy local disk path
  const { material, filePath } = result;
  res.setHeader("Content-Type", material.mimeType);
  res.setHeader("Content-Disposition", "inline");

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read file", code: "SRV_001" });
    }
  });
  stream.pipe(res);
}

/**
 * GET /materials/:id
 */
async function getOne(req, res) {
  const material = await materialsService.getMaterialById(req.params.id);
  res.json({ material });
}

/**
 * DELETE /materials/:id
 */
async function remove(req, res) {
  const payload = await materialsService.deleteMaterialById(req.params.id);
  res.json(payload);
}

/**
 * PATCH /materials/:id
 * Updates material metadata.
 */
async function update(req, res) {
  const payload = await materialsService.updateMaterial(req.params.id, req.body, req.user);
  res.json(payload);
}

module.exports = { upload, list, download, view, getOne, remove, update };
