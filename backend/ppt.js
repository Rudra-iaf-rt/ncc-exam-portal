const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

// ── DESIGN SYSTEM ─────────────────────────────────────────────────────────────
// Exact palette from reference presentation (Agentic_RAG_Blueprint.pptx)
const GOLDEN   = 'F2BE45';   // #F2BE45 – primary amber/gold
const DARK_BG  = '232323';   // slide center for dark/title slides
const WHITE_BG = 'FEFEFE';   // slide center for content slides
const CREAM_BG = 'F5F3E6';   // notebook-paper cream
const NEAR_BLK = '1A1A1A';   // near-black text
const MED_GRAY = '4A4A4A';   // secondary text
const LIGHT_GRAY = 'AAAAAA'; // captions / tertiary
const BLUE_HL  = 'BDD7EE';   // light-blue highlight (seen in reference)
const WHITE    = 'FFFFFF';
const GOLDEN_DK = 'C9980A';  // darker gold for emphasis

// Fonts (Calibri is safe + matches theme1.xml from reference)
const FONT_TITLE = 'Calibri';
const FONT_BODY  = 'Calibri';

// Slide canvas – match reference: 16256000 x 9144000 EMU = 17.78" × 10"
// pptxgenjs custom layout in inches
const SLIDE_W = 17.78;
const SLIDE_H = 10.0;

// Content zone (inside golden border, as fractions of slide)
// Border: left ~8.5%, right ~5.5%, top ~9.5%, bottom ~10%
const CZ = {
  left:  SLIDE_W * 0.09,   // 1.60"
  right: SLIDE_W * 0.945,  // 16.80"
  top:   SLIDE_H * 0.10,   // 1.00"
  bot:   SLIDE_H * 0.90,   // 9.00"
  width: SLIDE_W * 0.855,  // 15.20"
  height: SLIDE_H * 0.80,  // 8.00"
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

function bgImage(slide, imgFile, isFullBleed = true) {
  slide.addImage({
    path: path.join(__dirname, imgFile),
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
  });
}

// Golden separator line
function addGoldLine(slide, x, y, w, h_px = 0.04) {
  slide.addShape(slide.ShapeType ? slide.ShapeType.RECTANGLE : 'rect', {
    x, y, w, h: h_px,
    fill: { color: GOLDEN },
    line: { color: GOLDEN, width: 0 },
  });
}

// Section label pill
function addLabel(slide, text, x, y) {
  slide.addText(text, {
    x, y, w: 3.5, h: 0.40,
    fontSize: 13,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_BODY,
    fill: { color: BLUE_HL },
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

// Icon circle with letter/symbol
function addIconCircle(slide, letter, x, y, size = 0.55, fillColor = GOLDEN) {
  slide.addShape('ellipse', {
    x, y, w: size, h: size,
    fill: { color: fillColor },
    line: { color: NEAR_BLK, width: 1.5 },
  });
  slide.addText(letter, {
    x: x - 0.01, y: y + size * 0.1,
    w: size + 0.02, h: size * 0.8,
    fontSize: size > 0.5 ? 18 : 14,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

// Card / content box
function addCard(slide, x, y, w, h, fillColor = WHITE, strokeColor = NEAR_BLK, strokeW = 1.5) {
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: strokeColor, width: strokeW },
    rectRadius: 0.12,
  });
}

// ── PPTX SETUP ────────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.defineLayout({ name: 'WIDE1778', width: SLIDE_W, height: SLIDE_H });
pres.layout = 'WIDE1778';
pres.author  = 'C. Usman Gani et al.';
pres.subject = 'Multimodal Multi-Agent RAG for Clinical Oncology';

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 – TITLE SLIDE
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_dark_title.png');

  // Big decorative chapter number
  slide.addText('✦', {
    x: 0.4, y: 0.25, w: 2.2, h: 2.8,
    fontSize: 160,
    bold: true,
    color: GOLDEN,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'top',
    margin: 0,
  });

  // Main content card
  const cx = 2.5, cy = 0.90, cw = 13.8, ch = 5.8;
  addCard(slide, cx, cy, cw, ch, WHITE_BG, NEAR_BLK, 2.5);

  // Blue highlight band behind title text
  slide.addShape('rect', {
    x: cx + 0.3, y: cy + 0.38, w: cw - 0.6, h: 0.72,
    fill: { color: BLUE_HL },
    line: { color: BLUE_HL, width: 0 },
  });

  // Title
  slide.addText('Multimodal Multi-Agent RAG', {
    x: cx + 0.30, y: cy + 0.22, w: cw - 0.6, h: 0.60,
    fontSize: 42,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  slide.addText('for Clinical Oncology', {
    x: cx + 0.30, y: cy + 0.85, w: cw - 0.6, h: 0.55,
    fontSize: 38,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  // Gold separator
  addGoldLine(slide, cx + 0.30, cy + 1.55, cw - 0.6, 0.045);

  // Subtitle
  slide.addText('Overcoming Information Loss and Hallucination in Clinical AI', {
    x: cx + 0.30, y: cy + 1.68, w: cw - 0.6, h: 0.55,
    fontSize: 20,
    color: MED_GRAY,
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  // Presenter names
  const names = [
    'C. Usman Gani',
    'Y. Vikash',
    'P.V. Rahul Naidu',
    'P.V. Tejesh Reddy',
  ];
  let nx = cx + 0.30;
  const nw = (cw - 0.6) / names.length;
  names.forEach(name => {
    slide.addText(name, {
      x: nx, y: cy + 2.55, w: nw - 0.1, h: 0.45,
      fontSize: 16,
      color: MED_GRAY,
      fontFace: FONT_BODY,
      align: 'center',
      valign: 'middle',
      bold: false,
      margin: 0,
    });
    nx += nw;
  });

  // Bottom label
  slide.addText('INTERNSHIP PROJECT PRESENTATION', {
    x: cx + 0.30, y: cy + 3.20, w: cw - 0.6, h: 0.35,
    fontSize: 12,
    color: LIGHT_GRAY,
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    bold: false,
    margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 – The Clinical Challenge & Motivation
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  // Section label
  addLabel(slide, 'MOTIVATION', CZ.left, CZ.top - 0.05);

  // Title
  slide.addText('The Clinical Challenge', {
    x: CZ.left, y: CZ.top + 0.45, w: CZ.width, h: 0.70,
    fontSize: 36,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  // Gold separator
  addGoldLine(slide, CZ.left, CZ.top + 1.22, CZ.width, 0.045);

  // 4 challenge cards in 2x2 grid
  const challenges = [
    { icon: '📈', title: 'Information Deluge', body: 'Clinical oncology produces overwhelming heterogeneous literature — treatment guidelines, trial reports, and genomic protocols.' },
    { icon: '🖼', title: 'The Modality Problem', body: 'Crucial evidence is locked in complex layouts: survival curves, hazard ratio tables, and pathology figures.' },
    { icon: '⏱', title: 'Latency of Knowledge', body: 'Existing systems are static and cannot incorporate real-time post-market safety data or active trial statuses.' },
    { icon: '⚠', title: 'LLM Vulnerabilities', body: 'Direct LLM deployment introduces unacceptable medical hallucination risks and lacks necessary source attribution.' },
  ];

  const cardW = (CZ.width - 0.35) / 2;
  const cardH = 2.70;
  const startY = CZ.top + 1.38;
  const gap = 0.18;

  challenges.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = CZ.left + col * (cardW + gap);
    const cy = startY + row * (cardH + gap * 0.5);

    addCard(slide, cx, cy, cardW, cardH, 'FAFAF8', GOLDEN, 2.0);

    // Icon circle
    addIconCircle(slide, c.icon, cx + 0.20, cy + 0.22, 0.58, GOLDEN);

    // Title
    slide.addText(c.title, {
      x: cx + 0.90, y: cy + 0.18, w: cardW - 1.05, h: 0.55,
      fontSize: 17,
      bold: true,
      color: NEAR_BLK,
      fontFace: FONT_TITLE,
      align: 'left',
      valign: 'middle',
      margin: 0,
    });

    // Body
    slide.addText(c.body, {
      x: cx + 0.20, y: cy + 0.88, w: cardW - 0.40, h: cardH - 1.10,
      fontSize: 14,
      color: MED_GRAY,
      fontFace: FONT_BODY,
      align: 'left',
      valign: 'top',
      wrap: true,
      margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 – The Failure of Standard RAG Pipelines
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'PROBLEM STATEMENT', CZ.left, CZ.top - 0.05);

  slide.addText('The Failure of Standard RAG Pipelines', {
    x: CZ.left, y: CZ.top + 0.45, w: CZ.width, h: 0.65,
    fontSize: 34,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  addGoldLine(slide, CZ.left, CZ.top + 1.18, CZ.width, 0.045);

  slide.addText('Standard RAG architectures fail in clinical oncology due to three systematic limitations:', {
    x: CZ.left, y: CZ.top + 1.32, w: CZ.width, h: 0.48,
    fontSize: 16,
    color: MED_GRAY,
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  const failures = [
    {
      num: '1',
      title: 'Multimodal Information Loss',
      body: 'Traditional PDF parsers (PyMuPDF, Tesseract) extract text linearly — destroying the relational grid of dosage tables and completely ignoring embedded visual figures such as Kaplan-Meier curves.',
    },
    {
      num: '2',
      title: 'Lexical-Semantic Mismatch',
      body: 'Dense embeddings capture broad concepts but fail on exact alphanumeric terms crucial in medicine — e.g., distinguishing BRCA1 vs. BRCA2 or imatinib vs. ibrutinib.',
    },
    {
      num: '3',
      title: 'Static Knowledge Boundaries',
      body: 'Monolithic vector stores contain only pre-ingested documents, making them blind to temporal queries requiring current external data such as live trial statuses or post-market safety signals.',
    },
  ];

  const startY = CZ.top + 1.90;
  const cardH = 2.10;
  const cardW = (CZ.width - 0.30) / 3;
  const gap = 0.15;

  failures.forEach((f, i) => {
    const cx = CZ.left + i * (cardW + gap);
    const cy = startY;

    // Red-tinted card
    addCard(slide, cx, cy, cardW, cardH, 'FFF8F8', 'E05C5C', 2.0);

    // Number badge
    slide.addShape('ellipse', {
      x: cx + 0.22, y: cy + 0.18, w: 0.60, h: 0.60,
      fill: { color: 'E05C5C' },
      line: { color: 'E05C5C', width: 0 },
    });
    slide.addText(f.num, {
      x: cx + 0.22, y: cy + 0.18, w: 0.60, h: 0.60,
      fontSize: 22,
      bold: true,
      color: WHITE,
      fontFace: FONT_TITLE,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    slide.addText(f.title, {
      x: cx + 0.95, y: cy + 0.18, w: cardW - 1.10, h: 0.60,
      fontSize: 15,
      bold: true,
      color: NEAR_BLK,
      fontFace: FONT_TITLE,
      align: 'left',
      valign: 'middle',
      margin: 0,
    });

    slide.addText(f.body, {
      x: cx + 0.22, y: cy + 0.88, w: cardW - 0.44, h: cardH - 1.05,
      fontSize: 13,
      color: MED_GRAY,
      fontFace: FONT_BODY,
      align: 'left',
      valign: 'top',
      wrap: true,
      margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 – Our Proposed Multi-Agent Solution (Section divider)
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_dark_title.png');

  // Big decorative "4" 
  slide.addText('4', {
    x: 0.30, y: 0.60, w: 2.80, h: 4.50,
    fontSize: 260,
    bold: true,
    color: GOLDEN,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'top',
    margin: 0,
  });

  const cx = 2.90, cy = 1.00, cw = 13.5, ch = 5.50;
  addCard(slide, cx, cy, cw, ch, WHITE_BG, NEAR_BLK, 2.5);

  // Blue highlight behind main title
  slide.addShape('rect', {
    x: cx + 0.30, y: cy + 0.30, w: cw - 0.6, h: 0.68,
    fill: { color: BLUE_HL },
    line: { color: BLUE_HL, width: 0 },
  });

  slide.addText('Our Proposed Multi-Agent Solution', {
    x: cx + 0.30, y: cy + 0.18, w: cw - 0.6, h: 0.75,
    fontSize: 36,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  addGoldLine(slide, cx + 0.30, cy + 1.06, cw - 0.60, 0.045);

  const pillars = [
    { icon: '📄', label: 'Layout-Aware Ingestion', desc: 'Docling Markdown table extraction + PyMuPDF & Qwen2.5-VL for generative figure captioning.' },
    { icon: '🔍', label: 'LAQA', desc: 'Dynamic query complexity classification, non-English translation, and acronym expansion.' },
    { icon: '⚡', label: 'Hybrid Retrieval', desc: 'Dense (BGE-M3) + Sparse (BM25) search unified via Reciprocal Rank Fusion (RRF).' },
    { icon: '🤖', label: 'Multi-Agent Routing', desc: 'Dynamic routing to RAG Agent and external MCP Agents — PubMed, ClinicalTrials.gov, OpenFDA.' },
    { icon: '🎯', label: 'S.C.O.P.E. Evaluation', desc: 'Custom constrained LLM-as-a-judge framework for clinical safety and accuracy.' },
  ];

  const pw = (cw - 0.60) / pillars.length;
  pillars.forEach((p, i) => {
    const px = cx + 0.30 + i * pw;
    const py = cy + 1.22;

    slide.addText(p.icon, {
      x: px + pw * 0.15, y: py, w: pw * 0.70, h: 0.55,
      fontSize: 28,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(p.label, {
      x: px + 0.06, y: py + 0.60, w: pw - 0.12, h: 0.60,
      fontSize: 13,
      bold: true,
      color: NEAR_BLK,
      fontFace: FONT_TITLE,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(p.desc, {
      x: px + 0.08, y: py + 1.28, w: pw - 0.16, h: 2.60,
      fontSize: 12,
      color: MED_GRAY,
      fontFace: FONT_BODY,
      align: 'center',
      valign: 'top',
      wrap: true,
      margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 – Global Architecture Overview
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_cream.png');

  slide.addText('Global Architectural Overview', {
    x: CZ.left, y: 0.25, w: CZ.width, h: 0.65,
    fontSize: 34,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left + 1.0, 0.97, CZ.width - 2.0, 0.045);

  // Two main pipeline sections
  // INGESTION PIPELINE (left half)
  const ingX = CZ.left, ingY = 1.12, ingW = 7.60, ingH = 7.55;
  addCard(slide, ingX, ingY, ingW, ingH, 'FFF9EE', GOLDEN, 2.0);
  slide.addText('⚙  INGESTION PIPELINE', {
    x: ingX + 0.20, y: ingY + 0.15, w: ingW - 0.40, h: 0.42,
    fontSize: 15,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, ingX + 0.20, ingY + 0.60, ingW - 0.40, 0.03);

  const ingSteps = [
    ['Medical PDFs', 'INPUT'],
    ['Docling — Layout-Aware Parser', 'PARSE'],
    ['Structured Text & Tables', 'TEXT'],
    ['PyMuPDF — Figure Crops', 'CROPS'],
    ['Qwen2.5-VL — Figure Captioning', 'VLM'],
    ['Semantic Chunker (1024 tok/150 overlap)', 'CHUNK'],
    ['BGE-M3 Embedder + BM25 Tokenizer', 'EMBED'],
  ];
  const arrowY = ingY + 0.70;
  const stepH = 0.72;
  const stepW = ingW - 0.60;
  ingSteps.forEach((step, i) => {
    const sy = arrowY + i * (stepH + 0.06);
    const fillC = i === 0 ? GOLDEN : (i % 2 === 0 ? 'EDF5FF' : 'F8F8F8');
    addCard(slide, ingX + 0.30, sy, stepW, stepH * 0.88, fillC, '888888', 1.0);
    slide.addText(step[0], {
      x: ingX + 0.42, y: sy + 0.04, w: stepW - 0.80, h: stepH * 0.80,
      fontSize: 13,
      bold: i === 0,
      color: i === 0 ? NEAR_BLK : MED_GRAY,
      fontFace: FONT_BODY,
      align: 'left',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(step[1], {
      x: ingX + stepW - 0.35, y: sy + 0.04, w: 0.80, h: stepH * 0.80,
      fontSize: 10,
      color: LIGHT_GRAY,
      fontFace: FONT_BODY,
      align: 'right',
      valign: 'middle',
      margin: 0,
    });
    if (i < ingSteps.length - 1) {
      slide.addText('▼', {
        x: ingX + 0.30 + stepW / 2 - 0.25, y: sy + stepH * 0.88,
        w: 0.50, h: 0.10,
        fontSize: 9,
        color: GOLDEN_DK,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    }
  });

  // GENERATION PIPELINE (right half)
  const genX = CZ.left + ingW + 0.25, genY = 1.12, genW = CZ.width - ingW - 0.25, genH = 7.55;
  addCard(slide, genX, genY, genW, genH, 'F0FFF4', '4CAF50', 2.0);
  slide.addText('🔁  GENERATION PIPELINE', {
    x: genX + 0.20, y: genY + 0.15, w: genW - 0.40, h: 0.42,
    fontSize: 15,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, genX + 0.20, genY + 0.60, genW - 0.40, 0.03);

  const genSteps = [
    ['User Question', 'INPUT', GOLDEN],
    ['LAQA & Query Router', 'ANALYZE', 'BDD7EE'],
    ['Agent Orchestrator', 'ROUTE', 'FFE0A0'],
    ['RAG Agent + PubMed/ClinicalTrials/FDA', 'AGENTS', 'D0E8D0'],
    ['Hybrid Fusion & Cross-Encoder Reranker', 'FUSE', 'E8D0E8'],
    ['Top-K Context Assembly', 'CONTEXT', 'D0E8FF'],
    ['Med42-8B LLM → Grounded Answer', 'GENERATE', GOLDEN],
  ];

  genSteps.forEach((step, i) => {
    const sy = genY + 0.70 + i * (stepH + 0.06);
    addCard(slide, genX + 0.20, sy, genW - 0.40, stepH * 0.88, step[2], '888888', 1.0);
    slide.addText(step[0], {
      x: genX + 0.32, y: sy + 0.04, w: genW - 1.00, h: stepH * 0.80,
      fontSize: 13,
      bold: i === 0 || i === genSteps.length - 1,
      color: NEAR_BLK,
      fontFace: FONT_BODY,
      align: 'left',
      valign: 'middle',
      margin: 0,
    });
    if (i < genSteps.length - 1) {
      slide.addText('▼', {
        x: genX + 0.20 + (genW - 0.40) / 2 - 0.25, y: sy + stepH * 0.88,
        w: 0.50, h: 0.10,
        fontSize: 9,
        color: '4CAF50',
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 – Layout-Aware Ingestion & Vision Processing
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'INGESTION PIPELINE', CZ.left, CZ.top - 0.05);

  slide.addText('Layout-Aware Ingestion & Vision Processing', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  const blocks = [
    {
      icon: '📐',
      title: 'Docling Integration',
      points: [
        'Uses Vision Transformers (ViTs) for PDF segmentation',
        'Tables parsed directly into Markdown — preserving row/column grids',
        'Prevents context bleeding across different medical concepts',
      ],
    },
    {
      icon: '🖼',
      title: 'Multimodal Vision Pipeline',
      points: [
        'PyMuPDF crops figures from bounding boxes',
        'SHA-256 cryptographic deduplication — avoids redundant VLM inference',
        'Qwen2.5-VL transforms visual charts into dense textual descriptions',
      ],
    },
    {
      icon: '✂',
      title: 'Section-Aware Chunking',
      points: [
        '1024-token limit with 150-token overlap',
        'Strictly respects Markdown headers to preserve context integrity',
        'Prevents cross-contamination between medical concept boundaries',
      ],
    },
  ];

  const bw = (CZ.width - 0.30) / 3;
  const bh = 5.50;
  const startY = CZ.top + 1.30;

  blocks.forEach((b, i) => {
    const bx = CZ.left + i * (bw + 0.15);
    addCard(slide, bx, startY, bw, bh, 'FAFAF8', GOLDEN, 2.0);

    // Icon
    slide.addText(b.icon, {
      x: bx + 0.20, y: startY + 0.20, w: 0.70, h: 0.70,
      fontSize: 36,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    slide.addText(b.title, {
      x: bx + 0.20, y: startY + 0.98, w: bw - 0.40, h: 0.65,
      fontSize: 17,
      bold: true,
      color: NEAR_BLK,
      fontFace: FONT_TITLE,
      align: 'left',
      valign: 'middle',
      margin: 0,
    });
    addGoldLine(slide, bx + 0.20, startY + 1.68, bw - 0.40, 0.03);

    b.points.forEach((pt, pi) => {
      slide.addText('•  ' + pt, {
        x: bx + 0.20, y: startY + 1.82 + pi * 1.10, w: bw - 0.40, h: 1.00,
        fontSize: 13,
        color: MED_GRAY,
        fontFace: FONT_BODY,
        align: 'left',
        valign: 'top',
        wrap: true,
        margin: 0,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 – Query Lifecycle & Context Normalization
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'QUERY PROCESSING', CZ.left, CZ.top - 0.05);

  slide.addText('Query Lifecycle & Context Normalization', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Flow diagram
  const steps = [
    { label: 'User Input', icon: '💬', color: GOLDEN },
    { label: 'Chat Memory\nContextualization', icon: '🧠', color: 'BDD7EE' },
    { label: 'Standalone\nQuery', icon: '📝', color: 'D0E8D0' },
    { label: 'Rule Filter\nGate', icon: '🚦', color: 'FFE0A0' },
    { label: 'LAQA LLM\nAnalysis', icon: '🔬', color: 'E8D0E8' },
    { label: 'Agent Router\n& Retrieval', icon: '⚡', color: 'BDD7EE' },
    { label: 'Grounded\nAnswer', icon: '✅', color: GOLDEN },
  ];

  const stepW = 1.90;
  const stepH = 1.80;
  const startX = CZ.left;
  const stepY = CZ.top + 1.35;
  const totalW = CZ.width;
  const gap = (totalW - steps.length * stepW) / (steps.length - 1);

  steps.forEach((step, i) => {
    const sx = startX + i * (stepW + gap);
    addCard(slide, sx, stepY, stepW, stepH, step.color, NEAR_BLK, 1.5);
    slide.addText(step.icon, {
      x: sx, y: stepY + 0.18, w: stepW, h: 0.60,
      fontSize: 32,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(step.label, {
      x: sx + 0.08, y: stepY + 0.88, w: stepW - 0.16, h: 0.80,
      fontSize: 13,
      bold: true,
      color: NEAR_BLK,
      fontFace: FONT_TITLE,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    if (i < steps.length - 1) {
      slide.addText('→', {
        x: sx + stepW + 0.04, y: stepY + stepH / 2 - 0.20,
        w: gap - 0.08, h: 0.40,
        fontSize: 22,
        bold: true,
        color: GOLDEN_DK,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    }
  });

  // Reject branch note
  slide.addText('⛔  "Blocked: Out of Scope" if rule filter fails at Gate', {
    x: CZ.left, y: stepY + stepH + 0.30, w: CZ.width * 0.55, h: 0.45,
    fontSize: 14,
    color: 'E05C5C',
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  // Relevance loop note
  slide.addText('🔄  If Agentic Relevancy < 0.6 → auto-rewrite query and retry', {
    x: CZ.left + CZ.width * 0.50, y: stepY + stepH + 0.30, w: CZ.width * 0.50, h: 0.45,
    fontSize: 14,
    color: '1565C0',
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  // Key insight box
  addCard(slide, CZ.left, stepY + stepH + 0.90, CZ.width, 1.70, 'FFFDE7', GOLDEN_DK, 1.5);
  slide.addText('The Pronoun Dilution Problem:', {
    x: CZ.left + 0.25, y: stepY + stepH + 1.00, w: 3.50, h: 0.50,
    fontSize: 15,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  slide.addText('In multi-turn chat, queries like "Does it cause hepatotoxicity?" lose connection to prior context. An LLM first rewrites conversational memory into a standalone, self-contained query before retrieval begins.', {
    x: CZ.left + 3.90, y: stepY + stepH + 0.95, w: CZ.width - 4.15, h: 1.40,
    fontSize: 13,
    color: MED_GRAY,
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    wrap: true,
    margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 – Language-Aware Query Analysis (LAQA)
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_dark_title.png');

  slide.addText('8', {
    x: 0.30, y: 0.50, w: 2.60, h: 4.20,
    fontSize: 240,
    bold: true,
    color: GOLDEN,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'top',
    margin: 0,
  });

  const cx = 2.80, cy = 0.90, cw = 13.60, ch = 5.70;
  addCard(slide, cx, cy, cw, ch, WHITE_BG, NEAR_BLK, 2.5);

  slide.addShape('rect', {
    x: cx + 0.30, y: cy + 0.28, w: cw - 0.60, h: 0.65,
    fill: { color: BLUE_HL }, line: { color: BLUE_HL, width: 0 },
  });

  slide.addText('Language-Aware Query Analysis (LAQA)', {
    x: cx + 0.30, y: cy + 0.15, w: cw - 0.60, h: 0.78,
    fontSize: 32,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, cx + 0.30, cy + 1.02, cw - 0.60, 0.04);

  slide.addText('Before hitting the database, every query is pre-processed by LAQA to maximize retrieval recall:', {
    x: cx + 0.30, y: cy + 1.12, w: cw - 0.60, h: 0.48,
    fontSize: 14,
    color: MED_GRAY,
    fontFace: FONT_BODY,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });

  const laqaItems = [
    { num: '1', title: 'Acronym Expansion', body: 'Maps "NSCLC" → "Non-Small Cell Lung Cancer", dramatically improving BM25 lexical overlap.' },
    { num: '2', title: 'Translation Matrixing', body: 'Translates non-English queries into English, ensuring high cosine similarity with the English clinical corpus.' },
    { num: '3', title: 'Hypothetical Document Embeddings (HyDE)', body: 'Generates plausible clinical answers and uses them as search vectors, bridging the structural mismatch between questions and assertions.' },
  ];

  const lw = (cw - 0.60) / laqaItems.length;
  laqaItems.forEach((item, i) => {
    const lx = cx + 0.30 + i * lw;
    const ly = cy + 1.68;
    addCard(slide, lx + 0.06, ly, lw - 0.12, 3.70, 'F8F9FF', GOLDEN, 1.5);
    slide.addShape('ellipse', {
      x: lx + 0.30, y: ly + 0.22, w: 0.62, h: 0.62,
      fill: { color: GOLDEN }, line: { color: NEAR_BLK, width: 1 },
    });
    slide.addText(item.num, {
      x: lx + 0.30, y: ly + 0.22, w: 0.62, h: 0.62,
      fontSize: 22, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(item.title, {
      x: lx + 1.05, y: ly + 0.22, w: lw - 1.24, h: 0.60,
      fontSize: 15, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
    });
    slide.addText(item.body, {
      x: lx + 0.30, y: ly + 1.00, w: lw - 0.60, h: 2.50,
      fontSize: 13, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });

  slide.addText('📊  Ablation: LAQA improves routing accuracy from 50.0% → 70.0%', {
    x: cx + 0.30, y: cy + 5.50, w: cw - 0.60, h: 0.42,
    fontSize: 14, bold: true,
    color: GOLDEN_DK, fontFace: FONT_BODY, align: 'left', valign: 'middle', margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 – Adaptive Hybrid Retrieval
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'HYBRID RETRIEVAL', CZ.left, CZ.top - 0.05);

  slide.addText('Adaptive Hybrid Retrieval', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 34,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Left: 3 phase cards
  const phaseW = 5.20;
  const phases = [
    { ph: 'Phase 1', title: 'Primary Category Search', body: 'Executes concurrent BGE-M3 Dense Search and BM25 Sparse Search on both the base and expanded queries simultaneously.', color: 'EDF5FF' },
    { ph: 'Phase 2', title: 'Fallback: Expanded Radius', body: 'If the reranker relevance score fails the Tier-1 threshold (0.85), the system autonomously expands the search radius.', color: 'FFF3E0' },
    { ph: 'Phase 3', title: 'Full Unconstrained Scan', body: 'Last-resort fallback: an unconstrained full-corpus scan to ensure no relevant document is missed.', color: 'FCE4EC' },
  ];

  phases.forEach((p, i) => {
    const py = CZ.top + 1.30 + i * 2.22;
    addCard(slide, CZ.left, py, phaseW, 2.05, p.color, NEAR_BLK, 1.2);
    slide.addText(p.ph, {
      x: CZ.left + 0.20, y: py + 0.14, w: 1.10, h: 0.38,
      fontSize: 12, bold: true, color: WHITE,
      fontFace: FONT_BODY, align: 'center', valign: 'middle', margin: 0,
      fill: { color: NEAR_BLK },
    });
    slide.addText(p.title, {
      x: CZ.left + 1.45, y: py + 0.10, w: phaseW - 1.65, h: 0.45,
      fontSize: 16, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
    });
    slide.addText(p.body, {
      x: CZ.left + 0.20, y: py + 0.65, w: phaseW - 0.40, h: 1.25,
      fontSize: 13, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
    });
    if (i < phases.length - 1) {
      slide.addText('▼', {
        x: CZ.left + phaseW / 2 - 0.25, y: py + 2.08, w: 0.50, h: 0.15,
        fontSize: 10, color: GOLDEN_DK,
        align: 'center', valign: 'middle', margin: 0,
      });
    }
  });

  // Right: RRF & Reranking explanation
  const rX = CZ.left + phaseW + 0.30;
  const rW = CZ.width - phaseW - 0.30;

  // RRF box
  addCard(slide, rX, CZ.top + 1.30, rW, 3.15, 'F0FFF4', '4CAF50', 1.8);
  slide.addText('⚡  Reciprocal Rank Fusion (RRF)', {
    x: rX + 0.22, y: CZ.top + 1.45, w: rW - 0.44, h: 0.50,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText('Unifies incompatible dense (−1 to +1) and sparse (0 to ∞) scores into a single ranked list:', {
    x: rX + 0.22, y: CZ.top + 2.02, w: rW - 0.44, h: 0.55,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'middle', wrap: true, margin: 0,
  });

  // Formula box
  addCard(slide, rX + 0.22, CZ.top + 2.65, rW - 0.44, 0.75, 'FFFFFF', '888888', 1.0);
  slide.addText('RRF(d) = Σ  1 / (60 + r)', {
    x: rX + 0.32, y: CZ.top + 2.68, w: rW - 0.64, h: 0.68,
    fontSize: 18, bold: true,
    color: NEAR_BLK, fontFace: 'Courier New',
    align: 'center', valign: 'middle', margin: 0,
  });

  // Cross-Encoder box
  addCard(slide, rX, CZ.top + 4.62, rW, 2.30, 'EDF5FF', '1565C0', 1.8);
  slide.addText('🔍  Cross-Encoder Reranking', {
    x: rX + 0.22, y: CZ.top + 4.77, w: rW - 0.44, h: 0.50,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText('A BERT-based cross-encoder evaluates the top 30 fused documents for absolute relevance probability — performing joint query-document analysis for deep semantic relevance scoring. Only the most relevant context enters the LLM prompt.', {
    x: rX + 0.22, y: CZ.top + 5.34, w: rW - 0.44, h: 1.42,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 – External Agent Orchestration (MCP)
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'MULTI-AGENT ORCHESTRATION', CZ.left, CZ.top - 0.05);

  slide.addText('External Agent Orchestration (MCP)', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Central orchestrator
  const orchX = CZ.left + CZ.width / 2 - 2.20;
  const orchY = CZ.top + 1.35;
  addCard(slide, orchX, orchY, 4.40, 1.50, GOLDEN, NEAR_BLK, 2.0);
  slide.addText('🤖  Agent Orchestrator', {
    x: orchX, y: orchY, w: 4.40, h: 1.50,
    fontSize: 20, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
  });

  // LAQA flag note
  slide.addText('LAQA evaluates temporal intent → toggles boolean flags (use_pubmed: true, use_trials: true, use_fda: true)', {
    x: CZ.left, y: orchY + 1.62, w: CZ.width, h: 0.48,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'center', valign: 'middle', margin: 0,
  });

  // 4 agents
  const agents = [
    { icon: '📚', name: 'RAG Agent', desc: 'Internal vector search via Qdrant\n(dense + sparse + figures)', color: 'EDF5FF', x: CZ.left },
    { icon: '🔬', name: 'PubMed MCP', desc: 'Latest oncology literature via\nNCBI E-utilities API', color: 'F0FFF4', x: CZ.left + (CZ.width * 0.26) },
    { icon: '🏥', name: 'ClinicalTrials MCP', desc: 'Active trial statuses &\neligibility criteria', color: 'FFF3E0', x: CZ.left + (CZ.width * 0.52) },
    { icon: '💊', name: 'OpenFDA MCP', desc: 'Real-time post-market\npharmacology safety data', color: 'FCE4EC', x: CZ.left + (CZ.width * 0.76) },
  ];

  const agentW = CZ.width * 0.24;
  const agentY = orchY + 2.25;
  agents.forEach((a, i) => {
    addCard(slide, a.x, agentY, agentW - 0.15, 2.50, a.color, NEAR_BLK, 1.5);
    slide.addText(a.icon, {
      x: a.x, y: agentY + 0.15, w: agentW - 0.15, h: 0.70,
      fontSize: 36, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(a.name, {
      x: a.x + 0.14, y: agentY + 0.90, w: agentW - 0.42, h: 0.48,
      fontSize: 15, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(a.desc, {
      x: a.x + 0.14, y: agentY + 1.42, w: agentW - 0.42, h: 0.95,
      fontSize: 12, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'center', valign: 'top', wrap: true, margin: 0,
    });
  });

  // Synthesis note
  addCard(slide, CZ.left, agentY + 2.65, CZ.width, 1.80, 'FFFDE7', GOLDEN, 1.8);
  slide.addText('Context Synthesis:', {
    x: CZ.left + 0.25, y: agentY + 2.80, w: 2.50, h: 0.50,
    fontSize: 16, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText('External API responses are dynamically embedded, appended to internal RAG results, and then subjected to the exact same RRF / Cross-Encoder pipeline — ensuring consistent scoring regardless of source.', {
    x: CZ.left + 2.90, y: agentY + 2.78, w: CZ.width - 3.15, h: 1.52,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'middle', wrap: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 11 – Generative Orchestration & Verification
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'GENERATION & VERIFICATION', CZ.left, CZ.top - 0.05);

  slide.addText('Generative Orchestration & Verification', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'left',
    valign: 'middle',
    margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Generation flow (horizontal)
  const gSteps = [
    { icon: '📋', label: 'Build\nMultimodal\nPrompt', color: 'EDF5FF' },
    { icon: '📏', label: 'Inject Length\nInstruction\nFAST/NORMAL/DEEP', color: 'FFF3E0' },
    { icon: '🖼', label: 'Format Text,\nTables &\nFigure Captions', color: 'F0FFF4' },
    { icon: '⚕', label: 'Med42-8B\nLLM\nGeneration', color: GOLDEN },
    { icon: '📤', label: 'Stream to UI\nvia SSE', color: 'D0E8D0' },
  ];

  const gsW = (CZ.width - (gSteps.length - 1) * 0.15) / gSteps.length;
  const gsH = 2.50;
  const gsY = CZ.top + 1.35;

  gSteps.forEach((s, i) => {
    const gx = CZ.left + i * (gsW + 0.15);
    addCard(slide, gx, gsY, gsW, gsH, s.color, NEAR_BLK, 1.5);
    slide.addText(s.icon, { x: gx, y: gsY + 0.20, w: gsW, h: 0.65, fontSize: 30, align: 'center', valign: 'middle', margin: 0 });
    slide.addText(s.label, {
      x: gx + 0.10, y: gsY + 0.92, w: gsW - 0.20, h: 1.40,
      fontSize: 13, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'top', wrap: true, margin: 0,
    });
    if (i < gSteps.length - 1) {
      slide.addText('→', {
        x: gx + gsW - 0.05, y: gsY + gsH / 2 - 0.20, w: 0.30, h: 0.40,
        fontSize: 20, bold: true, color: GOLDEN_DK, align: 'center', valign: 'middle', margin: 0,
      });
    }
  });

  // Bottom: Faithfulness Verification + Citation
  const bY = gsY + gsH + 0.30;
  const hw = (CZ.width - 0.25) / 2;

  addCard(slide, CZ.left, bY, hw, 3.30, 'F8FFF8', '4CAF50', 1.8);
  slide.addText('🛡  Faithfulness Verification', {
    x: CZ.left + 0.22, y: bY + 0.18, w: hw - 0.44, h: 0.52,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText([
    { text: 'A background LLM call verifies that every generated claim traces directly to the retrieved context blocks.\n\n' },
    { text: 'Detected hallucinations ', options: { color: 'E05C5C', bold: true } },
    { text: 'are logged to MongoDB telemetry for audit.\n\n' },
    { text: 'Telemetry saved', options: { bold: true } },
    { text: ': session, trace, and source PDFs all recorded per query.' },
  ], {
    x: CZ.left + 0.22, y: bY + 0.80, w: hw - 0.44, h: 2.30,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'top', margin: 0,
  });

  addCard(slide, CZ.left + hw + 0.25, bY, hw, 3.30, 'FFF8F0', GOLDEN, 1.8);
  slide.addText('📌  Strict Citation Enforcement', {
    x: CZ.left + hw + 0.47, y: bY + 0.18, w: hw - 0.44, h: 0.52,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText([
    { text: 'The generation cycle forces the LLM to cite specific chunks inline.\n\n' },
    { text: 'Source PDF filenames ', options: { bold: true } },
    { text: 'are resolved and cleaned before returning the final JSON metadata to the UI.\n\n' },
    { text: 'Length instruction tiers:\n' },
    { text: 'FAST  —  concise summary\nNORMAL  —  balanced depth\nDEEP  —  comprehensive analysis', options: { color: MED_GRAY } },
  ], {
    x: CZ.left + hw + 0.47, y: bY + 0.80, w: hw - 0.44, h: 2.30,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'top', margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 12 – S.C.O.P.E. Evaluation Framework
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_dark_title.png');

  slide.addText('S', {
    x: 0.15, y: 0.30, w: 2.80, h: 3.50,
    fontSize: 280,
    bold: true,
    color: GOLDEN,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'top',
    margin: 0,
  });

  const cx = 2.70, cy = 0.80, cw = 13.70, ch = 5.90;
  addCard(slide, cx, cy, cw, ch, WHITE_BG, NEAR_BLK, 2.5);

  slide.addShape('rect', {
    x: cx + 0.28, y: cy + 0.25, w: cw - 0.56, h: 0.68,
    fill: { color: BLUE_HL }, line: { color: BLUE_HL, width: 0 },
  });

  slide.addText('S.C.O.P.E. Evaluation Framework', {
    x: cx + 0.28, y: cy + 0.12, w: cw - 0.56, h: 0.80,
    fontSize: 34, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, cx + 0.28, cy + 1.02, cw - 0.56, 0.04);

  slide.addText('Traditional metrics (BLEU, ROUGE) fail to capture medical factual accuracy. SCOPE is a custom LLM-as-a-judge rubric evaluated on 200 expert-curated cases:', {
    x: cx + 0.28, y: cy + 1.12, w: cw - 0.56, h: 0.55,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'middle', wrap: true, margin: 0,
  });

  const scopeItems = [
    { letter: 'S', name: 'Safety', desc: 'Heavily penalizes clinical hallucinations — the highest-priority dimension in a patient-facing system.' },
    { letter: 'C', name: 'Completeness', desc: 'Verifies whether the response addresses ALL parts of the clinical query without omission.' },
    { letter: 'O', name: 'Originality', desc: 'Rewards genuine synthesis of multiple sources over raw verbatim copying of retrieved chunks.' },
    { letter: 'P', name: 'Precision', desc: 'Evaluates exactness of numeric drug dosages, hazard ratios, and clinical metrics.' },
    { letter: 'E', name: 'Efficiency', desc: 'Assesses conciseness and clinical relevance — penalizes padding and off-topic tangents.' },
  ];

  const sw = (cw - 0.56) / scopeItems.length;
  scopeItems.forEach((s, i) => {
    const sx = cx + 0.28 + i * sw;
    const sy = cy + 1.80;
    addCard(slide, sx + 0.05, sy, sw - 0.10, 3.70, 'F8F9FF', GOLDEN, 1.5);
    slide.addShape('ellipse', {
      x: sx + sw / 2 - 0.42, y: sy + 0.22, w: 0.84, h: 0.84,
      fill: { color: GOLDEN }, line: { color: NEAR_BLK, width: 1.5 },
    });
    slide.addText(s.letter, {
      x: sx + sw / 2 - 0.42, y: sy + 0.22, w: 0.84, h: 0.84,
      fontSize: 28, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.name, {
      x: sx + 0.15, y: sy + 1.18, w: sw - 0.30, h: 0.48,
      fontSize: 15, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.desc, {
      x: sx + 0.15, y: sy + 1.75, w: sw - 0.30, h: 1.82,
      fontSize: 12, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'center', valign: 'top', wrap: true, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 13 – Results: Semantic Quality & Faithfulness
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'RESULTS', CZ.left, CZ.top - 0.05);

  slide.addText('Semantic Quality & Faithfulness Results', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Table
  const tableData = [
    [
      { text: 'Metric', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'Full System', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'No LAQA', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'No MCP', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'LLM Only (Baseline)', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
    ],
    [
      { text: 'BERTScore F1', options: { bold: true, fontSize: 14 } },
      { text: '0.8529 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '0.7636', options: { fontSize: 14 } },
      { text: '0.8115', options: { fontSize: 14 } },
      { text: '0.7284', options: { fontSize: 14 } },
    ],
    [
      { text: 'Faithfulness', options: { bold: true, fontSize: 14 } },
      { text: '0.8342 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '0.7501', options: { fontSize: 14 } },
      { text: '0.7924', options: { fontSize: 14 } },
      { text: '0.5253', options: { fill: 'FFCCCC', fontSize: 14 } },
    ],
    [
      { text: 'Answer Relevance', options: { bold: true, fontSize: 14 } },
      { text: '0.9405 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '0.8250', options: { fontSize: 14 } },
      { text: '0.8872', options: { fontSize: 14 } },
      { text: '0.6004', options: { fill: 'FFCCCC', fontSize: 14 } },
    ],
  ];

  slide.addTable(tableData, {
    x: CZ.left, y: CZ.top + 1.32, w: CZ.width, h: 3.40,
    border: { type: 'solid', color: 'CCCCCC', pt: 1 },
    align: 'center',
    valign: 'middle',
    colW: [3.50, 3.00, 2.50, 2.50, 3.70],
    rowH: [0.60, 0.70, 0.70, 0.70],
    fontFace: FONT_BODY,
  });

  // Key takeaways
  const taY = CZ.top + 4.90;
  addCard(slide, CZ.left, taY, CZ.width, 3.35, 'FFFDE7', GOLDEN, 1.8);
  slide.addText('Key Takeaways', {
    x: CZ.left + 0.25, y: taY + 0.18, w: CZ.width - 0.50, h: 0.50,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  const takeaways = [
    '📈  Full System achieved a 58.8% relative increase in Faithfulness over the LLM baseline (0.8342 vs. 0.5253).',
    '🔍  Removing LAQA caused a severe BERTScore drop (0.85 → 0.76), proving pre-retrieval acronym expansion is critical.',
    '🤝  Answer Relevance of 0.9405 demonstrates the system consistently delivers clinically on-target responses.',
  ];
  takeaways.forEach((t, i) => {
    slide.addText(t, {
      x: CZ.left + 0.25, y: taY + 0.80 + i * 0.78, w: CZ.width - 0.50, h: 0.70,
      fontSize: 13, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'middle', wrap: true, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 14 – Results: S.C.O.P.E. Metrics
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'RESULTS', CZ.left, CZ.top - 0.05);

  slide.addText('S.C.O.P.E. Evaluation Results', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 34, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Table
  const tableData = [
    [
      { text: 'Metric', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'Full System', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'No LAQA', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'No MCP', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
      { text: 'LLM Only', options: { bold: true, fill: NEAR_BLK, color: WHITE, fontSize: 15 } },
    ],
    [
      { text: 'Precision', options: { bold: true, fontSize: 14 } },
      { text: '4.95 / 5.0 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '4.52', options: { fontSize: 14 } },
      { text: '4.64', options: { fontSize: 14 } },
      { text: '3.16', options: { fill: 'FFCCCC', fontSize: 14 } },
    ],
    [
      { text: 'Completeness', options: { bold: true, fontSize: 14 } },
      { text: '4.38 / 5.0 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '3.87', options: { fontSize: 14 } },
      { text: '3.90', options: { fontSize: 14 } },
      { text: '2.41', options: { fill: 'FFCCCC', fontSize: 14 } },
    ],
    [
      { text: 'Weighted Total / 5.0', options: { bold: true, fontSize: 14 } },
      { text: '4.36 ★', options: { bold: true, fill: 'D4EDDA', color: '155724', fontSize: 14 } },
      { text: '4.11', options: { fontSize: 14 } },
      { text: '4.07', options: { fontSize: 14 } },
      { text: '3.31', options: { fill: 'FFCCCC', fontSize: 14 } },
    ],
  ];

  slide.addTable(tableData, {
    x: CZ.left, y: CZ.top + 1.32, w: CZ.width, h: 3.20,
    border: { type: 'solid', color: 'CCCCCC', pt: 1 },
    align: 'center',
    valign: 'middle',
    colW: [3.70, 3.00, 2.60, 2.60, 3.20],
    rowH: [0.60, 0.68, 0.68, 0.68],
    fontFace: FONT_BODY,
  });

  // Two key takeaway cards
  const tkY = CZ.top + 4.70;
  const tkW = (CZ.width - 0.25) / 2;

  addCard(slide, CZ.left, tkY, tkW, 3.55, 'FFF3E0', GOLDEN, 1.8);
  slide.addText('📊  Precision Jump: 3.16 → 4.95', {
    x: CZ.left + 0.22, y: tkY + 0.18, w: tkW - 0.44, h: 0.55,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText('Directly attributable to Docling layout-aware table parsing — preserving the row/column grid structure of dosage tables and hazard ratio data that standard parsers destroy.', {
    x: CZ.left + 0.22, y: tkY + 0.85, w: tkW - 0.44, h: 2.50,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
  });

  addCard(slide, CZ.left + tkW + 0.25, tkY, tkW, 3.55, 'F0FFF4', '4CAF50', 1.8);
  slide.addText('🌐  Completeness Jump: 3.90 → 4.38 (vs No MCP)', {
    x: CZ.left + tkW + 0.47, y: tkY + 0.18, w: tkW - 0.44, h: 0.55,
    fontSize: 17, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText('External MCP agents provided critical real-time trial status and FDA safety data that the internal document store lacked — validating the multi-agent architecture for comprehensive clinical queries.', {
    x: CZ.left + tkW + 0.47, y: tkY + 0.85, w: tkW - 0.44, h: 2.50,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 15 – Agent Performance & Latency Trade-offs
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'PERFORMANCE ANALYSIS', CZ.left, CZ.top - 0.05);

  slide.addText('Agent Performance & Latency Trade-offs', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // 3 stat boxes
  const stats = [
    { val: '0.70', sub: 'Routing Accuracy', note: 'Up from 0.50 without LAQA (+40%)', color: GOLDEN },
    { val: '0.86', sub: 'Agent Contribution', note: 'External MCP contexts actively used in synthesis', color: 'D0E8D0' },
    { val: '<3s', sub: 'P99 Latency', note: 'Median: 2024ms  ·  P95: 2874ms  ·  P99: 2943ms', color: 'BDD7EE' },
  ];

  const statW = (CZ.width - 0.30) / 3;
  stats.forEach((s, i) => {
    const sx = CZ.left + i * (statW + 0.15);
    const sy = CZ.top + 1.35;
    addCard(slide, sx, sy, statW, 2.60, s.color, NEAR_BLK, 1.5);
    slide.addText(s.val, {
      x: sx, y: sy + 0.18, w: statW, h: 1.10,
      fontSize: 64, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.sub, {
      x: sx + 0.14, y: sy + 1.38, w: statW - 0.28, h: 0.48,
      fontSize: 16, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.note, {
      x: sx + 0.14, y: sy + 1.92, w: statW - 0.28, h: 0.52,
      fontSize: 12, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'center', valign: 'middle', wrap: true, margin: 0,
    });
  });

  // Latency distribution chart description
  addCard(slide, CZ.left, CZ.top + 4.10, CZ.width, 4.10, 'FAFAF8', GOLDEN, 1.5);
  slide.addText('📊  Latency Distribution Analysis', {
    x: CZ.left + 0.22, y: CZ.top + 4.25, w: CZ.width - 0.44, h: 0.52,
    fontSize: 18, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });

  // Bar chart representation using shapes
  const bars = [
    { label: 'Median', val: 2024, maxVal: 3200, color: '4CAF50' },
    { label: 'P95', val: 2874, maxVal: 3200, color: GOLDEN_DK },
    { label: 'P99', val: 2943, maxVal: 3200, color: 'E05C5C' },
  ];

  const barAreaX = CZ.left + 0.40;
  const barAreaY = CZ.top + 4.92;
  const barAreaW = CZ.width * 0.55;
  const barAreaH = 2.80;
  const barH = 0.62;
  const barGap = 0.28;

  bars.forEach((b, i) => {
    const by = barAreaY + i * (barH + barGap);
    const bw = (b.val / b.maxVal) * barAreaW;
    slide.addText(b.label, {
      x: barAreaX, y: by, w: 1.00, h: barH,
      fontSize: 13, bold: true, color: NEAR_BLK,
      fontFace: FONT_BODY, align: 'right', valign: 'middle', margin: 0,
    });
    slide.addShape('rect', {
      x: barAreaX + 1.10, y: by + 0.04, w: bw - 1.10, h: barH - 0.08,
      fill: { color: b.color }, line: { color: b.color, width: 0 },
    });
    slide.addText(`${b.val} ms`, {
      x: barAreaX + bw + 0.08, y: by, w: 1.40, h: barH,
      fontSize: 14, bold: true, color: b.color,
      fontFace: FONT_BODY, align: 'left', valign: 'middle', margin: 0,
    });
  });

  // Note
  slide.addText('⚡  The asynchronous MCP architecture prevents latency cascading — keeping multi-agent generation under 3 seconds, acceptable for point-of-care deployment.', {
    x: CZ.left + CZ.width * 0.55 + 0.30, y: CZ.top + 4.92, w: CZ.width * 0.45 - 0.52, h: 2.80,
    fontSize: 13, color: MED_GRAY,
    fontFace: FONT_BODY, align: 'left', valign: 'middle', wrap: true, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 16 – Discussion & Architectural Challenges
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'DISCUSSION', CZ.left, CZ.top - 0.05);

  slide.addText('Discussion & Architectural Challenges', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 32, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  const challenges = [
    {
      icon: '⚖',
      title: 'Latency vs. Accuracy Trade-off',
      body: 'Synchronous LLM passes for LAQA add 400–800ms to Time-To-First-Token. However, the precision gains strictly justify this overhead in a clinical setting where accuracy directly impacts patient safety decisions.',
      color: 'FFF3E0',
      border: GOLDEN,
    },
    {
      icon: '🖼',
      title: 'Multimodal Token Overhead',
      body: 'VLMs generate highly detailed figure captions — up to 600 words for a single Kaplan-Meier curve. While section-aware chunking mitigates context limit stress, future work requires adaptive token-compression strategies for complex chart types.',
      color: 'EDF5FF',
      border: '1565C0',
    },
  ];

  challenges.forEach((c, i) => {
    const cy = CZ.top + 1.38 + i * 3.60;
    addCard(slide, CZ.left, cy, CZ.width, 3.35, c.color, c.border, 1.8);

    slide.addText(c.icon, {
      x: CZ.left + 0.22, y: cy + 0.20, w: 0.80, h: 0.80,
      fontSize: 40, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(c.title, {
      x: CZ.left + 1.15, y: cy + 0.18, w: CZ.width - 1.37, h: 0.65,
      fontSize: 20, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
    });
    addGoldLine(slide, CZ.left + 0.22, cy + 0.92, CZ.width - 0.44, 0.03);
    slide.addText(c.body, {
      x: CZ.left + 0.22, y: cy + 1.05, w: CZ.width - 0.44, h: 2.10,
      fontSize: 15, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 17 – Conclusion & Future Work
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_white.png');

  addLabel(slide, 'CONCLUSION & FUTURE WORK', CZ.left, CZ.top - 0.05);

  slide.addText('Conclusion & Future Work', {
    x: CZ.left, y: CZ.top + 0.44, w: CZ.width, h: 0.65,
    fontSize: 34, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left, CZ.top + 1.16, CZ.width, 0.045);

  // Left: Conclusion
  const lw = CZ.width * 0.52;
  addCard(slide, CZ.left, CZ.top + 1.35, lw, 6.85, 'F0FFF4', '4CAF50', 2.0);
  slide.addText('✅  Conclusions', {
    x: CZ.left + 0.25, y: CZ.top + 1.52, w: lw - 0.50, h: 0.55,
    fontSize: 20, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, CZ.left + 0.25, CZ.top + 2.14, lw - 0.50, 0.03);

  const conclusions = [
    'Mathematically demonstrated a profound increase in answer safety and precision by moving beyond single-vector retrieval.',
    'Layout-aware parsing, LAQA pre-processing, and multi-agent routing are mandatory pillars for publication-grade clinical intelligence.',
    '58.8% relative faithfulness improvement over direct LLM baseline validates the full system architecture.',
    'Asynchronous MCP orchestration enables sub-3-second response times — clinically acceptable for point-of-care use.',
  ];
  conclusions.forEach((c, i) => {
    slide.addText('•  ' + c, {
      x: CZ.left + 0.25, y: CZ.top + 2.28 + i * 1.28, w: lw - 0.50, h: 1.15,
      fontSize: 14, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });

  // Right: Future Work
  const rX = CZ.left + lw + 0.25;
  const rW = CZ.width - lw - 0.25;
  addCard(slide, rX, CZ.top + 1.35, rW, 6.85, 'EDF5FF', '1565C0', 2.0);
  slide.addText('🔭  Future Work', {
    x: rX + 0.22, y: CZ.top + 1.52, w: rW - 0.44, h: 0.55,
    fontSize: 20, bold: true, color: NEAR_BLK,
    fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
  });
  addGoldLine(slide, rX + 0.22, CZ.top + 2.14, rW - 0.44, 0.03);

  const futureItems = [
    { icon: '🏥', title: 'EHR Integration via FHIR', desc: 'Integration of Electronic Health Records using FHIR protocols for patient-specific context grounding.' },
    { icon: '🧬', title: 'Genomic MCP Agents', desc: 'Expansion of MCP agents for real-time genomic queries — ClinVar, ClinGen, and precision oncology databases.' },
    { icon: '📊', title: 'Adaptive Token Compression', desc: 'Develop adaptive strategies for compressing rich multimodal figure captions without losing clinical meaning.' },
    { icon: '🌐', title: 'Multilingual Clinical Corpus', desc: 'Expand beyond English-dominant datasets to support non-English clinical literature retrieval.' },
  ];
  futureItems.forEach((f, i) => {
    const fy = CZ.top + 2.28 + i * 1.28;
    slide.addText(f.icon, {
      x: rX + 0.22, y: fy, w: 0.60, h: 0.60,
      fontSize: 24, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(f.title, {
      x: rX + 0.92, y: fy, w: rW - 1.14, h: 0.50,
      fontSize: 14, bold: true, color: NEAR_BLK,
      fontFace: FONT_TITLE, align: 'left', valign: 'middle', margin: 0,
    });
    slide.addText(f.desc, {
      x: rX + 0.92, y: fy + 0.50, w: rW - 1.14, h: 0.68,
      fontSize: 12, color: MED_GRAY,
      fontFace: FONT_BODY, align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 18 – Thank You / Q&A
// ─────────────────────────────────────────────────────────────────────────────
{
  const slide = pres.addSlide();
  bgImage(slide, 'bg_thankyou.png');

  slide.addText('Thank You', {
    x: CZ.left + 0.50, y: 2.60, w: CZ.width - 1.00, h: 2.00,
    fontSize: 72,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  addGoldLine(slide, CZ.left + 1.50, 4.80, CZ.width - 3.00, 0.055);

  slide.addText('Questions?', {
    x: CZ.left + 0.50, y: 5.00, w: CZ.width - 1.00, h: 0.70,
    fontSize: 28,
    color: MED_GRAY,
    fontFace: FONT_TITLE,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  slide.addText('Presented by', {
    x: CZ.left + 0.50, y: 5.90, w: CZ.width - 1.00, h: 0.50,
    fontSize: 20,
    bold: true,
    color: NEAR_BLK,
    fontFace: FONT_BODY,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  const names = ['C. Usman Gani', 'Y. Vikash', 'P.V. Rahul Naidu', 'P.V. Tejesh Reddy'];
  slide.addText(names.join('   ·   '), {
    x: CZ.left + 0.50, y: 6.52, w: CZ.width - 1.00, h: 0.55,
    fontSize: 18,
    color: MED_GRAY,
    fontFace: FONT_BODY,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  slide.addText('Multimodal Multi-Agent RAG for Clinical Oncology', {
    x: CZ.left + 0.50, y: 7.25, w: CZ.width - 1.00, h: 0.45,
    fontSize: 14,
    color: LIGHT_GRAY,
    fontFace: FONT_BODY,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

// ── WRITE FILE ────────────────────────────────────────────────────────────────
const outPath = './Oncology_RAG_Presentation.pptx';
pres.writeFile({ fileName: outPath })
  .then(() => console.log('✅  Written:', outPath))
  .catch(err => { console.error('ERROR:', err); process.exit(1); });