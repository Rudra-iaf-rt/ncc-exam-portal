const fs = require("fs");
const materialsService = require("../services/materials.service");

async function upload(req, res) {
  const result = await materialsService.createMaterial(req.user.id, req.file, req.body, req.user);
  res.status(201).json(result);
}

async function list(req, res) {
  const { subject, fileType, wing } = req.query;
  const materials = await materialsService.listMaterials({ 
    user: req.user,
    subject,
    fileType,
    wing
  });
  res.json({ materials });
}

async function download(req, res) {
  const result = await materialsService.getMaterialForDownload(req.params.id);

  if (result.isDrive) {
    return res.redirect(result.url);
  }

  const { material, filePath } = result;
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

async function revalidate(req, res) {
  const material = await materialsService.revalidateMaterial(req.params.id);
  res.json({ material });
}

module.exports = {
  upload,
  list,
  download,
  getOne,
  remove,
  revalidate,
};
