FITB Answer Matching — Implementation Plan
Project: ncc-exam-portal · Component: backend/src/services/answer-matching Status: Ready to implement · All code below is tested (49/49 golden cases pass)

1. Objectives
Grade Fill-In-The-Blank answers without an LLM, such that:

A student who knows the answer but mistypes it gets the mark.
A student who writes a different word never gets the mark, even if that word is one keystroke away.
Every borderline case is escalated to a human, not silently guessed.
Every verdict is explainable to a cadet who disputes it.
Design principles
Principle	Consequence
A false accept is worse than a false reject	False rejects get complained about and fixed. False accepts are silent and permanent.
Distance cannot separate typos from different words	Receive→Recieve and Morale→Moral are both distance 1. Vocabulary, not distance, is the discriminator.
Accuracy belongs in the answer key, not the algorithm	Every reviewed answer becomes a declared variant, permanently. The fuzzy layer shrinks over time.
Fail closed	Any error, ambiguity, or unhandled shape resolves to NEEDS_REVIEW, never CORRECT.
Zero dependencies on the grading hot path	~120 lines of our own code. No jaro-winkler, no double-metaphone, no natural.
Why the previous 4-layer design is dropped
Measured on a realistic NCC answer set:

Double Metaphone failed its own headline example (Colonel=KLNL, Kernel=KRNL) while wrongly matching Principal/Principle, Sight/Site, Morale/Moral, Canon/Cannon, Corps/Corpse, Ordnance/Ordinance. Near-zero benefit, high harm. Removed entirely.
Jaro-Winkler ≥ 0.90 accepted Principal→Principle (0.956), Ordnance→Ordinance (0.974), Morale→Moral (0.967), Corps→Corpse (0.967). Also scored NCC vs ncc at 0.000 without case folding, and rated a word-shuffle (National Cadet Corps vs Cadet National Corps, 0.892) higher than a legitimate equivalent (Second World War vs 2nd World War, 0.822). Replaced by length-scaled Damerau-Levenshtein plus token matching.
Stemming (strip trailing s if length > 3) corrupts Corps→Corp, Class→Clas, Address→Addres, Axis→Axi. Replaced by declared variants.
2. The verdict model
The single most important change: grading returns three states.

CORRECT       award the mark, no human involvement
INCORRECT     no mark, no human involvement
NEEDS_REVIEW  no mark yet; queued for an instructor decision
NEEDS_REVIEW converts the dangerous, invisible failure mode (silent false accept) into a small, visible amount of human work — and produces the labelled data needed to tune thresholds.

Scoring contract: a paper containing any NEEDS_REVIEW answer is PENDING_REVIEW, not GRADED. Provisional score = confirmed correct answers only. Students see "under review" for that blank, never a zero that later changes upward without explanation.

3. Schema changes
questions collection / table
{
  type: 'FILL_IN_THE_BLANK',
  answer: 'National Cadet Corps',      // canonical answer, original casing preserved
  acceptedVariants: ['NCC', 'N.C.C'],  // NEW — author-declared equivalents
  strictMatch: false,                  // NEW — force exact match for this question
}
acceptedVariants is where plurals, abbreviations, transliterations (Havildar/Haveldar), and British/American spellings live. Casing on answer is load-bearing — it drives acronym detection, so do not lowercase it at rest.

examAnswers / submission records
{
  rawAnswer: 'Natonal Cadet Corp',
  verdict: 'NEEDS_REVIEW',
  matchStage: 'TOKEN_MATCH',
  matchDistance: 2,
  matchedVariant: 'National Cadet Corps',
  normalizedAnswer: 'natonal cadet corp',
  matcherVersion: '1.0.0',       // for reproducible regrades
  reviewedBy: null,
  reviewedAt: null,
}
matcherVersion matters: when you change a threshold, you must be able to tell which papers were graded under which rules.

Migration
Add the three question fields with defaults ([], false) — backward compatible.
Add answer fields; backfill existing records with verdict derived from the old boolean and matchStage: 'LEGACY'.
No regrade of historical exams. Legacy results stay legacy.
4. Pipeline
raw submission
      │
  [0] normalize ──────────── empty? ──────────────────► INCORRECT
      │
  [1] exact / declared variant ── hit ────────────────► CORRECT
      │
  [2] strict guards (numeric · acronym · len≤3 · flag)
      │   acronym: separator-insensitive only (N.C.C = NCC)
      │   otherwise no fuzziness permitted ───────────► INCORRECT
      │
  [3] confusability guard
      │   submission is itself a valid answer elsewhere
      │   in the bank, or a known homophone ──────────► INCORRECT
      │
  [4] fuzzy match (Damerau-Levenshtein, length-scaled)
      │   single-token keys: direct
      │   multi-token keys: order-insensitive per token
      │
      ├─ distance 0–1 ────────────────────────────────► CORRECT
      ├─ distance 2, key length ≥ 6 ──────────────────► NEEDS_REVIEW
      └─ otherwise ───────────────────────────────────► INCORRECT

any thrown exception ──────────────────────────────────► NEEDS_REVIEW
Stage 3 is the layer that makes this reliable
Build a Set at startup of every normalized answer and variant across the whole question bank, minus the current question's own. If the submission exactly matches a member of that set, it is not a typo — it is a different answer, and it is rejected immediately. This is what stops Moral earning a mark for Morale.

Seed it additionally with a curated homophone/near-neighbour list:

principal|principle · piece|peace · canon|cannon · morale|moral
ordnance|ordinance · corps|corpse · major|mayor · sight|site|cite
aide|aid · sergeant|surgeon · discreet|discrete · stationary|stationery
Threshold rationale
Key length	Award (d ≤)	Review (d =)	Reasoning
≤ 3	exact only	—	Aim/Arm/Air are one edit apart. No safe margin exists.
4–5	1	—	One edit is a confident typo; two on a 5-letter word is a different word.
≥ 6	1	2	H5P's production rule allows 2 outright above 9 chars; we send 2 to review instead, because this is a graded exam rather than formative practice.
This is deliberately stricter than H5P. Batallion (d=2 from Battalion) goes to review rather than being awarded — and once an instructor approves it once, it becomes a declared variant and is awarded instantly forever after.

5. File layout
backend/src/services/answer-matching/
├── normalize.js       text hygiene
├── distance.js        bounded Damerau-Levenshtein (OSA)
├── confusables.js     bank-wide answer set + curated homophones
├── matcher.js         the pipeline
├── index.js           public API
└── __tests__/
    ├── normalize.test.js
    ├── distance.test.js
    ├── golden-corpus.test.js    the regression suite
    └── collision-audit.test.js  runs against the live question bank
exam-scoring.service.js changes only at the FILL_IN_THE_BLANK branch of isAnswerCorrect, which becomes a thin delegation returning a verdict object instead of a boolean.

6. Implementation
normalize.js
Order matters. NFKC first (fixes non-breaking spaces and ligatures), then explicit character folding (NFKC does not fix smart quotes), then diacritic stripping, then case folding.

'use strict';

const MAX_INPUT_LENGTH = 200;

// Characters that survive NFKC but still break exact matching.
const CHAR_FOLD = {
  '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
  '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u2032': "'", '\u2033': '"',
  '\u2013': '-', '\u2014': '-', '\u2015': '-', '\u2212': '-',
  '\u00A0': ' ', '\u202F': ' ', '\u2007': ' ',
};

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const COMBINING = /\p{M}/gu;
const DOT_TOKEN = '\u0001';
const SLASH_TOKEN = '\u0002';

function normalize(input) {
  if (typeof input !== 'string') return '';
  let s = input.slice(0, MAX_INPUT_LENGTH);

  s = s.normalize('NFKC');
  s = s.replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u2032\u2033\u2013\u2014\u2015\u2212\u00A0\u202F\u2007]/g,
    (c) => CHAR_FOLD[c]);
  s = s.replace(ZERO_WIDTH, '');
  s = s.normalize('NFD').replace(COMBINING, '').normalize('NFC');
  s = s.toLowerCase();

  // Hyphens and underscores become word boundaries: "self-discipline" -> "self discipline"
  s = s.replace(/[-_]+/g, ' ');

  // Preserve . and / only when they sit between alphanumerics (5.56mm, a/b).
  s = s.replace(/([a-z0-9])\.([a-z0-9])/g, `$1${DOT_TOKEN}$2`);
  s = s.replace(/([a-z0-9])\/([a-z0-9])/g, `$1${SLASH_TOKEN}$2`);
  s = s.replace(/[^\p{L}\p{N}\s\u0001\u0002]/gu, '');
  s = s.split(DOT_TOKEN).join('.').split(SLASH_TOKEN).join('/');

  return s.replace(/\s+/g, ' ').trim();
}

function tokenize(normalized) {
  return normalized ? normalized.split(' ') : [];
}

module.exports = { normalize, tokenize, MAX_INPUT_LENGTH };

distance.js
Bounded so the exam hot path stays O(max·n). Returns max + 1 the moment the true distance is known to exceed the budget.

'use strict';

/**
 * Optimal String Alignment (Damerau-Levenshtein with adjacent transpositions).
 * Bounded: returns `max + 1` as soon as the true distance is known to exceed
 * `max`, which keeps the exam hot path O(max * n) instead of O(n * m).
 */
function boundedOSA(a, b, max) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev2 = null;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const lo = Math.max(1, i - max);
    const hi = Math.min(n, i + max);
    for (let j = 1; j < lo; j++) curr[j] = max + 1;
    for (let j = lo; j <= hi; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    for (let j = hi + 1; j <= n; j++) curr[j] = max + 1;
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = curr;
    curr = new Array(n + 1);
  }
  return prev[n] > max ? max + 1 : prev[n];
}

module.exports = { boundedOSA };

matcher.js
'use strict';

const { normalize, tokenize } = require('./normalize');
const { boundedOSA } = require('./distance');

const VERDICT = Object.freeze({
  CORRECT: 'CORRECT',
  INCORRECT: 'INCORRECT',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
});

const STAGE = Object.freeze({
  EMPTY: 'EMPTY_INPUT',
  EXACT: 'EXACT_OR_VARIANT',
  STRICT_GUARD: 'STRICT_GUARD',
  CONFUSABLE: 'CONFUSABLE_GUARD',
  FUZZY: 'LENGTH_SCALED_FUZZY',
  TOKEN: 'TOKEN_MATCH',
  NO_MATCH: 'NO_MATCH',
  ERROR: 'INTERNAL_ERROR',
});

function isNumericKey(rawKey) { return /\d/.test(rawKey); }

function isAcronymKey(rawKey) {
  const t = rawKey.trim();
  if (!/[A-Z]/.test(t)) return false;
  return t === t.toUpperCase() && t.length <= 8;
}

/** Max distance at which we will AWARD a mark outright. */
function editBudget(keyLength) {
  if (keyLength <= 3) return 0;   // guarded elsewhere; no fuzziness
  return 1;                       // one edit is a confident typo at any length
}

/** Max distance at which we will FLAG for human review instead of failing. */
function reviewBudget(keyLength) {
  return keyLength >= 6 ? 2 : editBudget(keyLength);
}

/** Acronyms are compared with internal dots/slashes removed: N.C.C === NCC */
function stripSeparators(s) { return s.replace(/[./]/g, ''); }

/** Build the candidate set: the key plus author-declared variants. */
function buildCandidates(question) {
  const raw = [question.answer, ...(question.acceptedVariants || [])];
  const out = [];
  const seen = new Set();
  for (const r of raw) {
    if (typeof r !== 'string' || !r.trim()) continue;
    const n = normalize(r);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push({ raw: r, normalized: n });
  }
  return out;
}

function fuzzyScore(candidate, answer) {
  const cap = reviewBudget(candidate.length);
  if (cap === 0) return { distance: candidate === answer ? 0 : Infinity, cap };
  const d = boundedOSA(answer, candidate, cap);
  return { distance: d <= cap ? d : Infinity, cap };
}

/** Order-insensitive token match for multi-word keys. */
function tokenMatch(candidateTokens, answerTokens) {
  if (candidateTokens.length !== answerTokens.length) return null;
  const pool = answerTokens.slice();
  let total = 0;
  for (const ct of candidateTokens) {
    const budget = reviewBudget(ct.length);
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = budget === 0 ? (pool[i] === ct ? 0 : Infinity) : boundedOSA(pool[i], ct, budget);
      if (d <= budget && d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx === -1) return null;
    pool.splice(bestIdx, 1);
    total += bestDist;
  }
  return total;
}

/**
 * @param {object} question  { answer, acceptedVariants?, strictMatch? }
 * @param {string} rawAnswer student submission
 * @param {Set<string>} confusables normalized answers from the wider bank
 * @returns {{verdict, stage, distance, matchedVariant, normalizedAnswer}}
 */
function matchFillInTheBlank(question, rawAnswer, confusables = new Set()) {
  const base = { distance: null, matchedVariant: null, normalizedAnswer: '' };
  try {
    const candidates = buildCandidates(question);
    if (candidates.length === 0) {
      return { ...base, verdict: VERDICT.NEEDS_REVIEW, stage: STAGE.ERROR };
    }

    const answer = normalize(rawAnswer);
    base.normalizedAnswer = answer;
    if (!answer) return { ...base, verdict: VERDICT.INCORRECT, stage: STAGE.EMPTY };

    // Stage 1 — exact / declared variant
    for (const c of candidates) {
      if (c.normalized === answer) {
        return { ...base, verdict: VERDICT.CORRECT, stage: STAGE.EXACT, distance: 0, matchedVariant: c.raw };
      }
    }

    // Stage 2 — strict guards: no fuzziness permitted at all
    const rawKey = String(question.answer);
    const numeric = isNumericKey(rawKey);

    // Acronyms tolerate separator style only (N.C.C === NCC), nothing else.
    if (!numeric && isAcronymKey(rawKey)) {
      const a = stripSeparators(answer);
      for (const c of candidates) {
        if (stripSeparators(c.normalized) === a) {
          return { ...base, verdict: VERDICT.CORRECT, stage: STAGE.EXACT, distance: 0, matchedVariant: c.raw };
        }
      }
      return { ...base, verdict: VERDICT.INCORRECT, stage: STAGE.STRICT_GUARD };
    }

    if (question.strictMatch === true || numeric || normalize(rawKey).length <= 3) {
      return { ...base, verdict: VERDICT.INCORRECT, stage: STAGE.STRICT_GUARD };
    }

    // Stage 3 — confusability guard: the submission is itself a real answer elsewhere
    if (confusables.has(answer)) {
      return { ...base, verdict: VERDICT.INCORRECT, stage: STAGE.CONFUSABLE };
    }

    const answerTokens = tokenize(answer);

    // Stage 4/5 — fuzzy, single-token or token-wise
    let best = { distance: Infinity, variant: null, multi: false };
    for (const c of candidates) {
      const cTokens = tokenize(c.normalized);
      if (cTokens.length === 1 && answerTokens.length === 1) {
        const { distance } = fuzzyScore(c.normalized, answer);
        if (distance < best.distance) best = { distance, variant: c.raw, multi: false };
      } else {
        const d = tokenMatch(cTokens, answerTokens);
        if (d !== null && d < best.distance) {
          best = { distance: d, variant: c.raw, multi: true };
        }
      }
    }

    if (best.distance === Infinity) {
      return { ...base, verdict: VERDICT.INCORRECT, stage: STAGE.NO_MATCH };
    }

    const stage = best.multi ? STAGE.TOKEN : STAGE.FUZZY;
    // One edit is a confident typo and is awarded. Two edits are plausible but
    // never auto-awarded in a graded exam - a human decides.
    const verdict = best.distance <= 1 ? VERDICT.CORRECT : VERDICT.NEEDS_REVIEW;
    return { ...base, verdict, stage, distance: best.distance, matchedVariant: best.variant };
  } catch (err) {
    // Fail closed: never award marks from a crashed comparison.
    return { ...base, verdict: VERDICT.NEEDS_REVIEW, stage: STAGE.ERROR, error: err.message };
  }
}

module.exports = { matchFillInTheBlank, VERDICT, STAGE, editBudget, reviewBudget, buildCandidates };

confusables.js
'use strict';
const { normalize } = require('./normalize');

const HOMOPHONE_GROUPS = [
  ['principal', 'principle'], ['piece', 'peace'], ['canon', 'cannon'],
  ['morale', 'moral'], ['ordnance', 'ordinance'], ['corps', 'corpse'],
  ['major', 'mayor'], ['sight', 'site', 'cite'], ['aide', 'aid'],
  ['sergeant', 'surgeon'], ['discreet', 'discrete'],
  ['stationary', 'stationery'], ['compliment', 'complement'],
];

/** Every normalized answer in the bank, plus curated homophones. */
function buildGlobalAnswerSet(questions) {
  const set = new Set();
  for (const q of questions) {
    for (const s of [q.answer, ...(q.acceptedVariants || [])]) {
      const n = normalize(s);
      if (n) set.add(n);
    }
  }
  for (const group of HOMOPHONE_GROUPS) for (const w of group) set.add(w);
  return set;
}

/** Confusables for one question = global set minus its own accepted forms. */
function confusablesFor(question, globalSet) {
  const own = new Set(
    [question.answer, ...(question.acceptedVariants || [])].map(normalize)
  );
  const out = new Set();
  for (const s of globalSet) if (!own.has(s)) out.add(s);
  return out;
}

module.exports = { buildGlobalAnswerSet, confusablesFor, HOMOPHONE_GROUPS };
Caching: build globalSet once per exam-grading run and memoize confusablesFor per question id. Do not rebuild per answer.

Integration into exam-scoring.service.js
const { matchFillInTheBlank, VERDICT } = require('./answer-matching');
const { buildGlobalAnswerSet, confusablesFor } = require('./answer-matching/confusables');

function gradeFillInTheBlank(question, rawAnswer, ctx) {
  const conf = ctx.confusablesCache.get(question.id)
    || ctx.confusablesCache.set(question.id, confusablesFor(question, ctx.globalSet)).get(question.id);

  const result = matchFillInTheBlank(question, rawAnswer, conf);

  return {
    awarded: result.verdict === VERDICT.CORRECT ? question.marks : 0,
    verdict: result.verdict,
    matchStage: result.stage,
    matchDistance: result.distance,
    matchedVariant: result.matchedVariant,
    normalizedAnswer: result.normalizedAnswer,
    matcherVersion: MATCHER_VERSION,
  };
}
7. Edge case register
Every row below is a test case in the golden corpus.

Input hygiene — handled in Stage 0
Input	Key	Handling	Verdict
DISCIPLINE, discipline	Discipline	case fold	CORRECT
Discipline.	Discipline	trailing punctuation stripped	CORRECT
Right Marker	Right Marker	trim + collapse internal whitespace	CORRECT
1948 (trailing space)	1948	trimmed before the numeric guard	CORRECT
Cadet\u00A0Corps (nbsp)	Cadet Corps	NFKC	CORRECT
“Drill” (smart quotes)	Drill	explicit fold — NFKC does not do this	CORRECT
Deﬁnition (ﬁ ligature)	Definition	NFKC	CORRECT
Naïve	Naive	NFD + strip combining marks	CORRECT
self-discipline	Self Discipline	hyphen → word boundary	CORRECT
zero-width / soft hyphen	any	stripped	as if absent
"", " ", null, undefined	any	short-circuit at Stage 0	INCORRECT
500-char paste	any	truncated at 200 chars	INCORRECT
The trailing-space case is not hypothetical: under the original design, 1948 was not an exact match and the numeric guard forbade fuzziness, so a perfectly correct answer was marked wrong.

Strict-guard shapes — Stage 2
Key	Submission	Verdict	Why
1948	1947	INCORRECT	contains a digit → exact only
5.56mm	5.56 mm	INCORRECT	spec strings are exact; add as a variant if the author wants it
NCC	ncc, N.C.C	CORRECT	acronyms tolerate case and separator style only
NCC	NCCC, NDA	INCORRECT	no edit tolerance on acronyms
Aim	Arm, Aimm	INCORRECT	≤ 3 chars, no safe margin
Acronym detection uses casing on the answer key, not length. key === key.toUpperCase() && /[A-Z]/.test(key) && length ≤ 8. A length-based rule (≤ 3) both misses AIDS/SSCO and wrongly catches Aim/Gun/Map.

Semantic traps — Stage 3
Key	Submission	Distance	Verdict	Mechanism
Morale	Moral	1	INCORRECT	moral is another answer in the bank
Principal	Principle	2	INCORRECT	homophone list
Ordnance	Ordinance	1	INCORRECT	both in bank
Corps	Corpse	1	INCORRECT	homophone list
Major	Mayor	1	INCORRECT	both in bank
Receive	Recieve	1	CORRECT	recieve is not a word anywhere
Discipline	Disciplin	1	CORRECT	not a word anywhere
This table is the whole argument for Stage 3. Rows 1 and 6 have identical edit distance and opposite correct verdicts.

Morphology
Key	Submission	Verdict	Note
Officer	Officers	CORRECT	only because Officers is a declared variant
Corps	Corp	CORRECT	declared variant
Havildar	Haveldar	CORRECT	declared variant (transliteration)
No stemmer, ever. Authors declare variants. This is more work at authoring time and infinitely safer at grading time — and the review queue populates it automatically.

Multi-word — Stage 4/5
Key	Submission	Verdict	Note
National Cadet Corps	national cadet corps	CORRECT	case fold
National Cadet Corps	National Cadet Corp	CORRECT	one token, one edit
National Cadet Corps	Cadet National Corps	CORRECT	token matching is order-insensitive
National Cadet Corps	National Corps	INCORRECT	token count mismatch
National Cadet Corps	NCC	CORRECT	declared variant
Self Discipline	selfdiscipline	INCORRECT	token count mismatch
Order-insensitivity is a deliberate policy choice for short factual answers. If a question's word order is itself being assessed, set strictMatch: true.

Never run character similarity across a whole phrase. Jaro-Winkler rated a word-shuffle at 0.892 and a legitimate equivalent at 0.822 — it actively inverts the signal on multi-word input.

8. Test strategy
Golden corpus — golden-corpus.test.js
A versioned fixture of (questionId, submission, expectedVerdict) triples. Currently 49 cases, 49 passing. Every threshold change must run against it, reporting false accepts and false rejects separately — they are not equally bad.

const CASES = [
  ['q11', '1948 ',      'CORRECT'],
  ['q1',  'Moral',      'INCORRECT'],   // key: Morale
  ['q9',  'Recieve',    'CORRECT'],
  ['q16', 'Batallion',  'NEEDS_REVIEW'],
  ['q13', 'Cadet National Corps', 'CORRECT'],
  // ...
];
Add a case for every disputed grade and every review-queue decision. The corpus only grows.

Collision audit — collision-audit.test.js
Runs the matcher over the live question bank, checking that no question accepts another question's answer.

for (const q of bank) {
  for (const other of bank) {
    if (other.id === q.id) continue;
    for (const s of [other.answer, ...(other.acceptedVariants || [])]) {
      const r = matchFillInTheBlank(q, s, confusablesFor(q, globalSet));
      if (r.verdict !== 'CORRECT') continue;
      if (r.stage === 'EXACT_OR_VARIANT') warn(q, other, s);  // author intent
      else fail(q, other, s);                                  // fuzzy bleed — build error
    }
  }
}
Severity split matters. An EXACT_OR_VARIANT collision means two questions legitimately share a declared alias — a warning for the author to look at. Any collision reached via a fuzzy stage is an algorithm failure and must fail the build.

Verified behaviour: Major/Mayor produce no collision (Stage 3 catches it); NCC shared between a standalone question and an alias of National Cadet Corps correctly raises a warning, not an error.

Property tests
Identity: match(q, q.answer) === CORRECT for every question in the bank.
Symmetry of distance: osa(a,b) === osa(b,a).
Fuzz: random Unicode strings never throw and never return CORRECT.
Performance
Measured: ~4.5 µs per single-word match, ~9 µs per multi-word match (200k iterations). A 100-question paper for 500 cadets grades in well under a second. Assert a ceiling in CI to catch accidental unbounded distance calls.

9. Review queue
This is a required feature, not a nice-to-have — it is what makes the system improve rather than drift.

Instructor view: question, expected answer, submission, matched variant, distance, and the stage that made the decision.

Two actions:

Accept → awards the mark, appends the normalized submission to acceptedVariants, and triggers a regrade of every student who gave that answer on that question.
Reject → confirms zero and optionally adds the submission to the question's confusables.
This is the workflow Moodle instructors already run manually: scan submitted answers, add alternatives, regrade — which also covers every future student who makes the same choice. The difference here is that the queue surfaces only the ambiguous answers instead of all of them.

Effect over time: accuracy migrates out of the fuzzy layer and into the exact-match layer. After two or three exam cycles the review queue should be nearly empty, and grading is effectively deterministic lookup.

10. Reliability & operations
Concern	Handling
Exception anywhere in the pipeline	caught in matchFillInTheBlank, returns NEEDS_REVIEW + logged error. Never CORRECT.
Missing or empty answer on a question	NEEDS_REVIEW with stage: INTERNAL_ERROR. Caught earlier by a schema validation test.
Confusables set fails to build	grading refuses to start. Running without Stage 3 is worse than not grading.
Adversarial input (huge strings, control chars)	200-char cap + bounded distance + character-class whitelist.
Threshold change	bump MATCHER_VERSION; golden corpus must pass; never silently regrade past papers.
Dispute from a cadet	every field needed to explain the decision is persisted. "One letter different from the expected answer" is an explanation people accept; "the algorithm scored 0.91" is not.
Metrics to emit per exam: counts by verdict, counts by stage, review-queue size, review outcomes (accept rate). A rising accept rate in review means thresholds are too tight; any accept-rate spike on one question means that question's variants are incomplete.

Alert if NEEDS_REVIEW exceeds ~5% of FITB answers on an exam — that indicates a badly authored question, not student error.

11. Rollout
Phase	Work	Exit criteria
1. Build	normalize, distance, matcher, confusables + unit tests	49/49 golden cases pass; collision audit clean
2. Shadow	Run alongside existing exact-match grading. Log both verdicts, award on the old logic only	One full exam cycle. Review the disagreement log by hand.
3. Author pass	Populate acceptedVariants for the top ~50 most-answered questions using shadow-mode data	Review queue projected < 5%
4. Enable	Matcher becomes authoritative; review queue goes live	Instructors trained on the queue
5. Tune	Revisit thresholds using accumulated review decisions	Quarterly
Shadow mode is the important one. It gives you real disagreement data at zero risk, and it populates the variant lists before any student is affected.

12. Decisions the team should confirm
Distance 2 → review or award? The plan says review. H5P awards it outright above 9 characters. Review is the conservative exam-appropriate choice; revisit after Phase 5 data.
Word order in multi-word answers — currently order-insensitive. Correct for Cadet National Corps; wrong if a question assesses sequence. strictMatch: true is the escape hatch.
Acronym length ceiling (8) — covers NCC, NDA, RDC, SSCO. Confirm nothing longer in the bank is all-caps.
Partial credit for multi-word answers where most tokens match — deliberately excluded from v1. Add only if instructors ask.
Who owns the review queue during a live exam window, and the SLA for clearing it before results publish.
Appendix — evidence
Measurements taken against double-metaphone@2.x and jaro-winkler@0.2.x on an NCC-domain pair set:

Pair	Double Metaphone	Jaro-Winkler	Truth
Colonel / Kernel	KLNL vs KRNL — no match	0.643	the library's own headline example fails
Principal / Principle	PRNSPL = PRNSPL — match	0.956	different words, both layers accept
Ordnance / Ordinance	match	0.974	different words, both accept
Morale / Moral	match	0.967	different words, both accept
Corps / Corpse	match	0.967	different words, both accept
NCC / ncc	—	0.000	case folding must precede all comparison
National Cadet Corps / Cadet National Corps	—	0.892	word shuffle scores higher than a valid equivalent
Second World War / 2nd World War	—	0.822	valid equivalent scores lower than the shuffle