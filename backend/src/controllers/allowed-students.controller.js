const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");

function normalizeRegimentalNumber(value) {
  const reg = String(value || "").trim();
  return reg;
}

async function addSingle(req, res) {
  const regimentalNumber = normalizeRegimentalNumber(req.body?.regimentalNumber);
  if (!regimentalNumber) {
    throw new HttpError(400, "regimentalNumber is required");
  }

  const name = req.body?.name ? String(req.body.name).trim() : null;
  const college = req.body?.college ? String(req.body.college).trim() : null;
  const batch = req.body?.batch ? String(req.body.batch).trim() : null;

  try {
    const row = await prisma.allowedStudent.create({
      data: {
        regimentalNumber,
        name,
        college,
        batch,
      },
    });
    res.status(201).json({ allowedStudent: row });
  } catch (e) {
    if (e && typeof e === "object" && e.code === "P2002") {
      throw new HttpError(409, "Regimental number already exists in allowed list");
    }
    throw e;
  }
}

async function listAll(_req, res) {
  const rows = await prisma.allowedStudent.findMany({
    orderBy: { id: "desc" },
  });
  res.json({ allowedStudents: rows });
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    throw new HttpError(400, "Invalid id");
  }
  await prisma.allowedStudent.delete({ where: { id } });
  res.json({ id });
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    throw new HttpError(400, "Invalid id");
  }
  const payload = {};
  if (req.body?.regimentalNumber != null) {
    const reg = normalizeRegimentalNumber(req.body.regimentalNumber);
    if (!reg) throw new HttpError(400, "regimentalNumber cannot be empty");
    payload.regimentalNumber = reg;
  }
  if (req.body?.name !== undefined) payload.name = req.body.name ? String(req.body.name).trim() : null;
  if (req.body?.college !== undefined) payload.college = req.body.college ? String(req.body.college).trim() : null;
  if (req.body?.batch !== undefined) payload.batch = req.body.batch ? String(req.body.batch).trim() : null;
  if (req.body?.isRegistered !== undefined) payload.isRegistered = Boolean(req.body.isRegistered);

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nothing to update");
  }

  try {
    const row = await prisma.allowedStudent.update({
      where: { id },
      data: payload,
    });
    res.json({ allowedStudent: row });
  } catch (e) {
    if (e && typeof e === "object" && e.code === "P2002") {
      throw new HttpError(409, "Regimental number already exists in allowed list");
    }
    throw e;
  }
}

function parseBulkRowsFromJson(buffer) {
  let parsed;
  try {
    parsed = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON file");
  }
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.allowedStudents) ? parsed.allowedStudents : null;
  if (!rows) {
    throw new HttpError(400, "JSON must be an array or { allowedStudents: [] }");
  }
  return rows;
}

async function bulkUpload(req, res) {
  const file = req.file;
  if (!file?.buffer) {
    throw new HttpError(400, 'File is required (multipart field name: "file")');
  }

  const originalName = String(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const isJson = mime.includes("json") || originalName.endsWith(".json");
  const isCsv = mime.includes("csv") || originalName.endsWith(".csv");

  let incoming = [];

  if (isJson) {
    incoming = parseBulkRowsFromJson(file.buffer);
  } else if (isCsv) {
    try {
      const { parse } = require("csv-parse/sync");
      const text = file.buffer.toString("utf8");
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      incoming = records;
    } catch {
      throw new HttpError(400, "Invalid CSV file");
    }
  } else {
    throw new HttpError(400, "Only CSV or JSON files are allowed");
  }

  const MAX_ROWS = 50000;
  if (incoming.length > MAX_ROWS) {
    throw new HttpError(400, `Too many rows (max ${MAX_ROWS})`);
  }

  const seen = new Set();
  const validRows = [];
  let invalidCount = 0;
  let duplicateInFile = 0;

  for (const r of incoming) {
    const reg = normalizeRegimentalNumber(r?.regimentalNumber ?? r?.regimental_number ?? r?.regimentalNo ?? r?.regimental_no);
    if (!reg) {
      invalidCount++;
      continue;
    }
    const key = reg.toLowerCase();
    if (seen.has(key)) {
      duplicateInFile++;
      continue;
    }
    seen.add(key);

    validRows.push({
      regimentalNumber: reg,
      name: r?.name ? String(r.name).trim() : null,
      college: r?.college ? String(r.college).trim() : null,
      batch: r?.batch ? String(r.batch).trim() : null,
    });
  }

  const result = await prisma.allowedStudent.createMany({
    data: validRows,
    skipDuplicates: true,
  });

  res.status(201).json({
    inserted: result.count,
    received: incoming.length,
    valid: validRows.length,
    invalid: invalidCount,
    duplicateInFile,
    skippedDuplicatesInDb: Math.max(0, validRows.length - result.count),
  });
}

module.exports = {
  addSingle,
  bulkUpload,
  listAll,
  remove,
  update,
};

