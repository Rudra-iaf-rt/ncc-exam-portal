const pdfParse = require("pdf-parse");
const { HttpError } = require("../utils/http-error");

/**
 * Extract plain text from a PDF buffer (text-based PDFs; scanned pages may be empty).
 */
async function extractPdfText(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new HttpError(400, "Invalid PDF buffer");
  }
  const data = await pdfParse(buffer);
  return typeof data.text === "string" ? data.text : "";
}

/**
 * Heuristic MCQ parser when no AI key: expects lines like
 *   1. Question?
 *   A) ...
 *   B) ...
 *   Answer: A   (or full option text)
 */
function parseQuestionsHeuristic(text) {
  const normalized = String(text).replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n(?=\s*\d+(?:\.|\))\s+)/);
  const out = [];

  for (const chunk of chunks) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const head = lines[0].match(/^\d+(?:\.|\))\s*(.+)$/);
    if (!head) continue;
    const question = head[1].trim();

    const options = [];
    let answerLine = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const opt = line.match(/^([A-D])[\).]\s*(.+)$/i);
      if (opt) {
        options.push(opt[2].trim());
        continue;
      }
      if (/^answer\s*[:.)]/i.test(line)) {
        answerLine = line;
        break;
      }
    }

    if (options.length < 2 || !answerLine) continue;

    let answer = null;
    const letterM = answerLine.match(/answer\s*[:.)]?\s*([A-D])/i);
    if (letterM) {
      const idx = letterM[1].toUpperCase().charCodeAt(0) - 65;
      answer = options[idx] ?? null;
    } else {
      const rest = answerLine.replace(/^answer\s*[:.)]?\s*/i, "").trim();
      const hit = options.find(
        (o) => o.toLowerCase() === rest.toLowerCase() || rest.includes(o) || o.includes(rest)
      );
      answer = hit || null;
    }

    if (!answer) continue;

    while (options.length < 4) {
      options.push(`(Option ${options.length + 1})`);
    }

    out.push({
      question,
      options: options.slice(0, 4),
      answer,
    });
  }

  return out;
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i];
    if (!q?.question || typeof q.question !== "string") continue;
    let opts = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (opts.length < 2) continue;
    while (opts.length < 4) {
      opts.push(`(Option ${opts.length + 1})`);
    }
    opts = opts.slice(0, 4);
    let ans = String(q.answer ?? "").trim();
    const matchOpt = opts.find((o) => o === ans);
    if (!matchOpt) {
      const byLetter = ans.match(/^([A-D])$/i);
      if (byLetter) {
        const idx = byLetter[1].toUpperCase().charCodeAt(0) - 65;
        ans = opts[idx] ?? "";
      } else {
        const loose = opts.find(
          (o) => o.toLowerCase() === ans.toLowerCase() || ans.includes(o) || o.includes(ans)
        );
        ans = loose || "";
      }
    } else {
      ans = matchOpt;
    }
    if (!ans) continue;
    out.push({ question: q.question.trim(), options: opts, answer: ans });
  }
  return out;
}

async function parseQuestionsWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const trimmed = text.length > 120000 ? `${text.slice(0, 120000)}\n\n[...truncated]` : text;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an exam importer. From the user's exam text, extract multiple-choice questions.
Return ONLY valid JSON: {"questions":[{"question":"string","options":["four strings"],"answer":"string"}]}.
Rules:
- Each question must have exactly 4 options (pad with "(N/A)" only if the source truly has fewer than 4).
- "answer" must be exactly equal to one of the four option strings (the correct one).
- Skip titles, headers, and instructions that are not questions.
- Preserve option wording from the document when possible.`,
        },
        {
          role: "user",
          content: trimmed,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new HttpError(502, `OpenAI error: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new HttpError(502, "Invalid response from OpenAI");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, "OpenAI returned non-JSON");
  }

  return normalizeQuestions(parsed.questions);
}

/**
 * @returns {Promise<Array<{ question: string, options: string[], answer: string }>>}
 */
async function buildQuestionsFromPdfText(text) {
  const t = String(text || "").trim();
  if (t.length < 30) {
    throw new HttpError(
      400,
      "Could not read enough text from this PDF. Use a text-based PDF (not a scanned image), or add OCR first."
    );
  }

  let questions = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      questions = (await parseQuestionsWithOpenAI(t)) || [];
    } catch (e) {
      console.error("[exam-pdf] OpenAI import failed:", e?.message || e);
      questions = [];
    }
  }
  if (!questions.length) {
    questions = normalizeQuestions(parseQuestionsHeuristic(t));
  }

  if (!questions.length) {
    throw new HttpError(
      400,
      "Could not extract multiple-choice questions. Set OPENAI_API_KEY for AI parsing, or format the PDF with numbered questions, A) B) C) D) options, and an Answer: line per question."
    );
  }

  return questions;
}

module.exports = {
  extractPdfText,
  buildQuestionsFromPdfText,
  parseQuestionsHeuristic,
};
