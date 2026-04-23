const fs = require("fs");
const materialsService = require("../services/materials.service");

async function upload(req, res) {
  materialsService.ensureUploadDir();
  const material = await materialsService.createMaterial(req.user.id, req.file, req.body);
  res.status(201).json({ material });
}

async function list(_req, res) {
  const materials = await materialsService.listMaterials();
  res.json({ materials });
}

async function download(req, res) {
  const { material, filePath } = await materialsService.getMaterialForDownload(
    req.params.id
  );

  res.setHeader("Content-Type", material.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(material.originalName)}"`
  );

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });
  stream.pipe(res);
}

async function getOne(req, res) {
  const material = await materialsService.getMaterialById(req.params.id);
  res.json({ material });
}

async function remove(req, res) {
  const payload = await materialsService.deleteMaterialById(req.params.id);
  res.json(payload);
}

module.exports = {
  upload,
  list,
  download,
  getOne,
  remove,
};
