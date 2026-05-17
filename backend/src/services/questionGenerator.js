// ─────────────────────────────────────────────────────────
// QUESTION GENERATOR SERVICE (Refactored)
// Handles: Prompt Engineering, Response Validation,
//          Anti-Repetition, Fallback Questions
// ─────────────────────────────────────────────────────────

import { routeLLM } from './llmRouter.js';
import crypto from 'crypto';

const MAX_VALIDATION_RETRIES = 3;
const QUESTION_SCHEMA_VERSION = '1.0';

// ─────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────
function validateQuestionSchema(q) {
  const errors = [];
  
  if (typeof q.question !== 'string' || q.question.trim().length === 0) {
    errors.push('question must be non-empty string');
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push('options must be array of exactly 4 items');
  }
  if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
    errors.push(`correctAnswer must be A|B|C|D, got "${q.correctAnswer}"`);
  }
  if (typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
    errors.push('explanation must be non-empty string');
  }
  
  // Validate option is actually in options array
  const optionIndex = q.correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
  if (optionIndex >= q.options.length) {
    errors.push(`correctAnswer points to index ${optionIndex} but only ${q.options.length} options exist`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ─────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────
export async function generateSection({ sessionId, sectionName, exam, difficulty, count = 25, previousQuestions = [], questionHashes = new Set(), onLog }) {
  const log = onLog || console.log;
  
  if (count !== 25) {
    log(`[GENERATOR] ⚠️ Requested ${count} questions; enforcing 25-question minimum per section`, 'warn');
    count = 25;
  }

  log(`[GENERATOR] Starting: ${sectionName} | ${exam} | ${difficulty} | ${count}q`, 'llm');

  let questions = [];
  let attempt = 0;

  while (attempt < MAX_VALIDATION_RETRIES && questions.length < count) {
    attempt++;
    log(`[GENERATOR] Attempt ${attempt}/${MAX_VALIDATION_RETRIES} for ${sectionName}`, 'info');

    try {
      const { systemPrompt, userPrompt } = buildPrompt({ 
        sectionName, 
        exam, 
        difficulty, 
        count, 
        previousQuestions, 
        attempt 
      });

      log(`[GENERATOR → LLM] Routing request for ${sectionName}...`, 'llm');
      const { text, provider, model, elapsed } = await routeLLM({ 
        systemPrompt, 
        userPrompt, 
        onLog: log 
      });

      log(`[GENERATOR ← LLM] Got response from ${provider}/${model} in ${elapsed}s — parsing...`, 'stream');

      const parsed = parseAndValidate({ 
        rawText: text, 
        sectionName, 
        questionHashes, 
        count, 
        log 
      });
      
      questions = parsed.questions;
      
      // Log validation details for transparency
      if (parsed.stats) {
        log(`[GENERATOR] Validation stats: ${parsed.stats.valid}/${parsed.stats.total} valid, ${parsed.stats.duplicates} duplicates, ${parsed.stats.invalid} invalid`, 'info');
      }

      if (questions.length < count) {
        log(`[GENERATOR] Only ${questions.length}/${count} valid questions — retrying with stricter prompt`, 'warn');
        questions = [];
      }
    } catch (err) {
      log(`[GENERATOR] Attempt ${attempt} failed: ${err.message}`, 'error');
    }
  }

  if (questions.length < count) {
    log(`[GENERATOR] All LLM attempts exhausted (got ${questions.length}/${count}) — using fallback`, 'warn');
    questions = getFallbackQuestions(sectionName, questionHashes, count);
  }

  // CRITICAL: Ensure exactly 25 questions returned
  const final = questions.slice(0, count);
  if (final.length < count) {
    throw new Error(`CRITICAL: generateSection returned ${final.length} questions, required: ${count}`);
  }

  log(`[GENERATOR ✓] ${sectionName}: ${final.length} questions ready`, 'success');
  return final;
}

// ─────────────────────────────────────────────────────────
// PROMPT ENGINEERING
// ─────────────────────────────────────────────────────────
function buildPrompt({ sectionName, exam, difficulty, count = 25, previousQuestions = [], attempt = 1 }) {
  const prevList = previousQuestions
    .slice(-20)
    .map(q => `- ${q.question}`)
    .join('\n') || 'None';

  const strictnessNote = attempt > 1
    ? `IMPORTANT: Previous attempt had invalid JSON. Return ONLY a valid JSON array, absolutely nothing else. No markdown, no code fences, no explanations.`
    : '';

  // Enforce exactly 25 questions
  const actualCount = count === 25 ? 25 : 25;

  const systemPrompt = `You are a world-class competitive exam paper setter specializing in Indian government exams.

${strictnessNote}

TASK: Generate exactly ${actualCount} multiple-choice questions for the "${sectionName}" section.

EXAM: ${exam} | SECTION: ${sectionName} | DIFFICULTY: ${difficulty}

QUALITY REQUIREMENTS:
- Difficulty matches exactly: ${difficulty === 'Easy' ? 'Simple, beginner-friendly' : difficulty === 'Medium' ? 'Moderate, requires understanding' : difficulty === 'Hard' ? 'Complex, multi-step reasoning' : 'Real exam difficulty'}
- Each option is plausible (no obviously wrong choices)
- Explanations are clear and educational
- Cover diverse sub-topics; no sub-topic repeated >2 times
- RETURN EXACTLY ${actualCount} QUESTIONS — not 24, not 26, exactly ${actualCount}

DO NOT REPEAT these recently asked questions:
${prevList}

RESPONSE FORMAT (strict JSON only):
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Why A is correct",
    "difficulty": "${difficulty}",
    "section": "${sectionName}"
  }
]

CRITICAL REQUIREMENTS:
- correctAnswer MUST be exactly one of: "A", "B", "C", "D"
- options array MUST have exactly 4 strings
- Return ONLY the JSON array, nothing else
- No markdown backticks, no preamble, no trailing text`;

  const userPrompt = `Generate ${actualCount} ${exam} ${sectionName} multiple-choice questions at ${difficulty} difficulty. Return ONLY valid JSON array.`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────
// RESPONSE VALIDATOR + ANTI-REPETITION (Refactored)
// ─────────────────────────────────────────────────────────
function parseAndValidate({ rawText, sectionName, questionHashes = new Set(), count = 25, log }) {
  log(`[VALIDATOR] Parsing response (${rawText.length} chars)`, 'info');

  let text = rawText.trim();

  // Step 1: Strip markdown code fences
  text = text.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

  // Step 2: Extract JSON array
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  
  if (arrayStart === -1 || arrayEnd === -1 || arrayStart >= arrayEnd) {
    log(`[VALIDATOR] ❌ No valid JSON array found`, 'error');
    return { questions: [], stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 } };
  }
  
  text = text.slice(arrayStart, arrayEnd + 1);

  // Step 3: Parse JSON with repair fallback
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    log(`[VALIDATOR] JSON parse failed (${e.message}) — attempting repair...`, 'warn');
    
    // Conservative repair: only fix common LLM mistakes
    const repaired = repairJSON(text);
    try {
      parsed = JSON.parse(repaired);
      log(`[VALIDATOR] ✓ JSON repair succeeded`, 'info');
    } catch (e2) {
      log(`[VALIDATOR] ❌ JSON repair failed: ${e2.message}`, 'error');
      return { questions: [], stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 } };
    }
  }

  if (!Array.isArray(parsed)) {
    log(`[VALIDATOR] ❌ Root is not an array`, 'error');
    return { questions: [], stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 } };
  }

  // Step 4: Validate and clean each question
  const valid = [];
  const seenHashes = new Set();
  let stats = { total: parsed.length, valid: 0, invalid: 0, duplicates: 0 };

  for (let i = 0; i < parsed.length && valid.length < count; i++) {
    const q = parsed[i];

    // Normalize field names: 'correct' → 'correctAnswer'
    if (q.correct && !q.correctAnswer) {
      q.correctAnswer = q.correct;
      delete q.correct;
    }

    // Schema validation
    const validation = validateQuestionSchema(q);
    if (!validation.isValid) {
      log(`[VALIDATOR] Q${i + 1}: Invalid schema — ${validation.errors.join(', ')}`, 'warn');
      stats.invalid++;
      continue;
    }

    // Anti-repetition: global
    const hash = hashQuestionSHA256(q.question);
    if (questionHashes.has(hash)) {
      log(`[VALIDATOR] Q${i + 1}: Global duplicate (already in session) — skipped`, 'warn');
      stats.duplicates++;
      continue;
    }

    // Anti-repetition: within this batch
    if (seenHashes.has(hash)) {
      log(`[VALIDATOR] Q${i + 1}: Duplicate within batch — skipped`, 'warn');
      stats.duplicates++;
      continue;
    }

    // Normalize and enrich
    const cleaned = {
      question: q.question.trim(),
      options: q.options.map(o => String(o).trim()),
      correctAnswer: q.correctAnswer,
      explanation: (q.explanation || '').trim() || 'No explanation provided.',
      section: sectionName,
      topic: (q.topic || sectionName).trim(),
      difficulty: q.difficulty || 'Unknown',
      source: 'llm'
    };

    seenHashes.add(hash);
    questionHashes.add(hash);
    valid.push(cleaned);
    stats.valid++;
  }

  log(`[VALIDATOR] ✓ Validation complete: ${stats.valid} valid, ${stats.invalid} invalid, ${stats.duplicates} duplicates`, 'info');
  return { questions: valid, stats };
}

// Helper: Conservative JSON repair
function repairJSON(text) {
  // Only apply safe, proven repairs
  let repaired = text;
  
  // Fix trailing commas before closing braces/brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted keys (simple pattern only)
  repaired = repaired.replace(/:\s*"?correctAnswer"?:/g, ':"correctAnswer":');
  
  return repaired;
}

// ─────────────────────────────────────────────────────────
// HASH FUNCTIONS
// ─────────────────────────────────────────────────────────
function hashQuestionSHA256(text) {
  const normalized = text.toLowerCase().trim();
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 16); // Use first 16 chars for comparison
}

// Legacy 32-bit hash for backward compatibility (gradual migration)
function hashQuestion(text) {
  const str = text.toLowerCase().replace(/\s+/g, '').slice(0, 60);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─────────────────────────────────────────────────────────
// BUILT-IN FALLBACK QUESTIONS (Refactored with correct field names)
// ─────────────────────────────────────────────────────────
function getFallbackQuestions(sectionName, questionHashes, requestedCount = 25) {
  const all = {
    'Reasoning': createQuestions([
      { q: "If A is the brother of B, B is the sister of C, and C is the father of D, how is A related to D?", opts: ["Uncle", "Brother", "Father", "Grandfather"], ans: "A", exp: "A and B are siblings, B and C are siblings, C is D's father. So A is D's uncle.", topic: "Blood Relations" },
      { q: "Find the odd one out: 2, 5, 10, 17, 26, 37, 50, 64", opts: ["37", "26", "64", "50"], ans: "C", exp: "Series: n²+1. 8²+1=65, not 64. So 64 is the odd one.", topic: "Series" },
      { q: "In a code, COMPUTER is written as RFUVQNPC. How is MEDICINE written?", opts: ["MFEDJDOC", "EOJDJEFM", "NFEJDJOF", "EDJDOFEM"], ans: "C", exp: "Each letter shifts by a specific pattern in reverse.", topic: "Coding-Decoding" },
      { q: "Pointing at a photo, Ram says 'She is the daughter of my grandfather's only son.' How is she related to Ram?", opts: ["Daughter", "Sister", "Niece", "Cousin"], ans: "B", exp: "Grandfather's only son = Father. Father's daughter = Sister.", topic: "Blood Relations" },
      { q: "Which number replaces ? in: 4, 9, 25, 49, 121, ?", opts: ["144", "169", "196", "225"], ans: "B", exp: "Squares of primes: 2²,3²,5²,7²,11²,13²=169.", topic: "Number Series" }
    ], sectionName),
    'Arithmetic': createQuestions([
      { q: "A train 150m long passes a pole in 15 seconds. Speed in km/h?", opts: ["36", "40", "54", "60"], ans: "A", exp: "Speed=150/15=10 m/s × 18/5 = 36 km/h.", topic: "Speed & Distance" },
      { q: "Simple interest on Rs.1200 for 3 years is Rs.216. Rate per annum?", opts: ["5%", "6%", "7%", "8%"], ans: "B", exp: "R=(216×100)/(1200×3)=6%.", topic: "Simple Interest" },
      { q: "A and B together complete work in 7.2 days. A alone takes 12 days. How many days for B alone?", opts: ["14", "16", "18", "20"], ans: "C", exp: "1/B = 1/7.2 - 1/12 = 5/36 - 3/36 = 2/36. B=18 days.", topic: "Work & Time" },
      { q: "If 15% of x = 20% of y, then x:y = ?", opts: ["3:4", "4:3", "2:3", "3:2"], ans: "B", exp: "15x = 20y → x/y = 20/15 = 4:3.", topic: "Ratio & Proportion" },
      { q: "Compound interest on Rs.5000 at 10% p.a. for 2 years?", opts: ["Rs.1000", "Rs.1050", "Rs.1100", "Rs.1025"], ans: "B", exp: "CI = 5000 × [(1.1)² - 1] = 5000 × 0.21 = Rs.1050.", topic: "Compound Interest" }
    ], sectionName),
    'English': createQuestions([
      { q: "Choose the correct synonym for EPHEMERAL:", opts: ["Permanent", "Transient", "Eternal", "Everlasting"], ans: "B", exp: "Ephemeral = lasting very short time. Transient is the synonym.", topic: "Vocabulary" },
      { q: "Identify the correctly spelled word:", opts: ["Accomodation", "Accommodation", "Acommodation", "Accomadation"], ans: "B", exp: "Accommodation has double 'c' and double 'm'.", topic: "Spelling" },
      { q: "She _____ to the market yesterday. Choose the correct form:", opts: ["go", "goes", "went", "gone"], ans: "C", exp: "Past tense of 'go' is 'went'.", topic: "Grammar" },
      { q: "Choose the antonym of VERBOSE:", opts: ["Wordy", "Talkative", "Concise", "Eloquent"], ans: "C", exp: "Verbose = using too many words. Antonym = Concise.", topic: "Vocabulary" },
      { q: "Passive voice of 'She writes a letter' is:", opts: ["A letter is written by her", "A letter was written by her", "A letter has been written by her", "A letter will be written by her"], ans: "A", exp: "Present simple active → 'is written by' in passive.", topic: "Grammar" }
    ], sectionName),
    'GK': createQuestions([
      { q: "Who was the first President of India?", opts: ["Jawaharlal Nehru", "Rajendra Prasad", "Sardar Patel", "B.R. Ambedkar"], ans: "B", exp: "Dr. Rajendra Prasad served as first President from 1950 to 1962.", topic: "Indian Polity" },
      { q: "The Strait of Malacca connects which bodies of water?", opts: ["Arabian Sea and Bay of Bengal", "Pacific and Atlantic", "South China Sea and Indian Ocean", "Mediterranean and Red Sea"], ans: "C", exp: "Malacca Strait links the Andaman Sea to the South China Sea.", topic: "Geography" },
      { q: "Which planet is known as the Red Planet?", opts: ["Venus", "Jupiter", "Saturn", "Mars"], ans: "D", exp: "Mars appears red due to iron oxide (rust) on its surface.", topic: "Science" },
      { q: "The Battle of Plassey was fought in the year:", opts: ["1757", "1761", "1764", "1856"], ans: "A", exp: "Battle of Plassey, 1757 — British East India Company vs Nawab Siraj ud-Daulah.", topic: "History" },
      { q: "Who invented the telephone?", opts: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"], ans: "C", exp: "Alexander Graham Bell patented the telephone in 1876.", topic: "Science & Technology" }
    ], sectionName)
  };

  const fallbackAliases = {
    'Quantitative Aptitude': 'Arithmetic',
    'Mathematics': 'Arithmetic',
    'English Language': 'English',
    'General Knowledge': 'GK',
    'General Awareness': 'GK'
  };

  const fallbackKey = all[sectionName] ? sectionName : (fallbackAliases[sectionName] || 'Reasoning');
  const questions = all[fallbackKey] || all['Reasoning'];
  
  // Filter out duplicates and return up to requestedCount
  const filtered = questions
    .filter(q => !questionHashes.has(hashQuestionSHA256(q.question)))
    .slice(0, Math.max(5, requestedCount));

  if (filtered.length === 0) {
    // Return unfiltered as last resort
    return questions.slice(0, Math.max(5, requestedCount));
  }

  return filtered;
}

// Helper to create question objects with standardized field names
function createQuestions(items, sectionName) {
  return items.map((item, i) => ({
    question: item.q,
    options: item.opts,
    correctAnswer: item.ans,
    explanation: item.exp,
    topic: item.topic,
    section: sectionName,
    difficulty: 'Easy',
    source: 'fallback',
    id: `fallback_${sectionName}_${i}`
  }));
}
