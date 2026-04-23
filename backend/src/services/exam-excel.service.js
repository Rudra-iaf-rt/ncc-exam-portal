const XLSX = require("xlsx");
const { HttpError } = require("../utils/http-error");

function normalizeCell(v) {
  return String(v ?? "").trim();
}

function pick(row, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  return null;
}

function parseAnswer(answerRaw, options) {
  const ans = normalizeCell(answerRaw);
  if (!ans) return "";

  const letter = ans.match(/^([A-D])$/i);
  if (letter) {
    const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
    return options[idx] ?? "";
  }

  const direct = options.find((o) => o === ans);
  if (direct) return direct;

  const loose = options.find(
    (o) => o.toLowerCase() === ans.toLowerCase() || ans.includes(o) || o.includes(ans)
  );
  return loose || "";
}

/**
 * Expected columns (any case variants accepted):
 * question, optionA, optionB, optionC, optionD, answer
 *
 * `answer` may be A/B/C/D or the exact option text.
 */
function parseQuestionsFromRows(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const questionRaw = pick(row, ["question", "Question", "QUESTION", "q", "Q"]);
    if (!questionRaw) continue;

    const options = [
      normalizeCell(pick(row, ["optionA", "OptionA", "A", "a", "option_a", "Option A"])),
      normalizeCell(pick(row, ["optionB", "OptionB", "B", "b", "option_b", "Option B"])),
      normalizeCell(pick(row, ["optionC", "OptionC", "C", "c", "option_c", "Option C"])),
      normalizeCell(pick(row, ["optionD", "OptionD", "D", "d", "option_d", "Option D"])),
    ].filter(Boolean);

    if (options.length < 2) {
      throw new HttpError(400, `Row ${i + 2}: at least two options are required`);
    }
    while (options.length < 4) {
      options.push(`(Option ${options.length + 1})`);
    }

    const answerRaw = pick(row, ["answer", "Answer", "ANSWER", "correct", "Correct", "correctAnswer"]);
    const answer = parseAnswer(answerRaw, options);
    if (!answer) {
      throw new HttpError(
        400,
        `Row ${i + 2}: answer is required and must match A/B/C/D or one option text`
      );
    }

    out.push({
      question: normalizeCell(questionRaw),
      options: options.slice(0, 4),
      answer,
    });
  }
  return out;
}

async function extractQuestionsFromExcelBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new HttpError(400, "Invalid Excel buffer");
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new HttpError(400, "Could not read Excel file. Use .xlsx, .xls, or .csv");
  }

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new HttpError(400, "Excel file has no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const questions = parseQuestionsFromRows(rows);

  if (!questions.length) {
    throw new HttpError(
      400,
      "No valid questions found. Include columns: question, optionA, optionB, optionC, optionD, answer"
    );
  }

  return questions;
}

module.exports = {
  extractQuestionsFromExcelBuffer,
};

