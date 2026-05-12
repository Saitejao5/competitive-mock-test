// ─────────────────────────────────────────────────────────
// QUESTION GENERATOR SERVICE
// Handles: Prompt Engineering, Response Validation,
//          Anti-Repetition, Fallback Questions
// ─────────────────────────────────────────────────────────

import { routeLLM } from './llmRouter.js';

const MAX_VALIDATION_RETRIES = 3;

// ─────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────
export async function generateSection({ sessionId, sectionName, exam, difficulty, count, previousQuestions, questionHashes, onLog }) {
  const log = onLog || console.log;

  log(`[GENERATOR] Starting: ${sectionName} | ${exam} | ${difficulty} | ${count}q`, 'llm');

  let questions = [];
  let attempt = 0;

  while (attempt < MAX_VALIDATION_RETRIES && questions.length === 0) {
    attempt++;
    log(`[GENERATOR] Generation attempt ${attempt}/${MAX_VALIDATION_RETRIES} for ${sectionName}`, 'info');

    try {
      const { systemPrompt, userPrompt } = buildPrompt({ sectionName, exam, difficulty, count, previousQuestions, attempt });

      log(`[GENERATOR → LLM] Routing request for ${sectionName}...`, 'llm');
      const { text, provider, model, elapsed } = await routeLLM({ systemPrompt, userPrompt, onLog: log });

      log(`[GENERATOR ← LLM] Got response from ${provider}/${model} in ${elapsed}s — parsing...`, 'stream');

      questions = parseAndValidate({ rawText: text, sectionName, questionHashes, count, log });

      if (questions.length < Math.ceil(count * 0.5)) {
        log(`[GENERATOR] Only ${questions.length}/${count} valid questions — retrying with stricter prompt`, 'warn');
        questions = [];
      }
    } catch (err) {
      log(`[GENERATOR] Attempt ${attempt} failed: ${err.message}`, 'error');
    }
  }

  if (questions.length === 0) {
    log(`[GENERATOR] All attempts failed — using built-in fallback for ${sectionName}`, 'warn');
    questions = getFallbackQuestions(sectionName, questionHashes);
  }

  log(`[GENERATOR ✓] ${sectionName}: ${questions.length} questions ready`, 'success');
  return questions;
}

// ─────────────────────────────────────────────────────────
// PROMPT ENGINEERING
// ─────────────────────────────────────────────────────────
function buildPrompt({ sectionName, exam, difficulty, count, previousQuestions, attempt }) {
  const prevList = previousQuestions.slice(-20).map(q => `- ${q.question}`).join('\n') || 'None';

  const strictnessNote = attempt > 1
    ? `IMPORTANT: Previous attempt produced invalid JSON. This time return ONLY a raw JSON array, absolutely nothing else.`
    : '';

  const systemPrompt = `You are a world-class competitive exam paper setter specializing in Indian government exams. You create questions that are accurate, realistic, and match the exact pattern of real ${exam} examinations.

${strictnessNote}

YOUR TASK: Generate exactly ${count} multiple-choice questions for the "${sectionName}" section.

EXAM DETAILS:
- Exam: ${exam}
- Section: ${sectionName}
- Difficulty: ${difficulty}
- Question count: ${count}

QUESTION QUALITY RULES:
1. Match EXACTLY the difficulty level: ${difficulty === 'Easy' ? 'Simple, direct, beginner-friendly' : difficulty === 'Medium' ? 'Moderate complexity, requires understanding' : difficulty === 'Hard' ? 'Complex, multi-step reasoning required' : 'Exact real exam difficulty, time-pressured'}
2. Cover diverse sub-topics within ${sectionName} — no sub-topic repeated more than twice
3. each section must have exact 25 quations for each section
4. Options must be plausible — no obviously wrong choices
5. Explanations must be clear and educational

DO NOT REPEAT any of these previously asked questions:
${prevList}

STRICT JSON OUTPUT FORMAT (no markdown, no explanation, just the array):
[
  {
    "question": "The question text here",
    "options": ["Option text A", "Option text B", "Option text C", "Option text D"],
    "correct": "A",
    "explanation": "Clear explanation of why A is correct",
    "topic": "Specific sub-topic within ${sectionName}"
  }
]

CRITICAL: Return ONLY the JSON array. No preamble, no markdown backticks, no trailing text.`;

  const userPrompt = `Generate ${count} ${exam} ${sectionName} MCQ questions at ${difficulty} difficulty. Raw JSON array only.`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────
// RESPONSE VALIDATOR + ANTI-REPETITION
// ─────────────────────────────────────────────────────────
function parseAndValidate({ rawText, sectionName, questionHashes, count, log }) {
  log(`[VALIDATOR] Parsing response (${rawText.length} chars)`, 'info');

  let text = rawText.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

  // Extract JSON array
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart === -1 || arrayEnd === -1) {
    log(`[VALIDATOR] No JSON array found in response`, 'error');
    return [];
  }
  text = text.slice(arrayStart, arrayEnd + 1);

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(text);
    log(`[VALIDATOR] JSON parsed successfully — ${parsed.length} raw items`, 'info');
  } catch (e) {
    log(`[VALIDATOR] JSON parse failed: ${e.message} — attempting repair`, 'warn');
    // Common fixes
    text = text
      .replace(/,(\s*[}\]])/g, '$1')  // trailing commas
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')  // unquoted keys
      .replace(/'/g, '"');  // single quotes
    try {
      parsed = JSON.parse(text);
      log(`[VALIDATOR] JSON repair succeeded`, 'success');
    } catch (e2) {
      log(`[VALIDATOR] JSON repair failed: ${e2.message}`, 'error');
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    log(`[VALIDATOR] Response is not an array`, 'error');
    return [];
  }

  // Validate each question
  const valid = [];
  const seenInBatch = new Set();

  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i];

    // Required fields
    if (!q.question || typeof q.question !== 'string') {
      log(`[VALIDATOR] Q${i + 1}: Missing question text — skip`, 'warn');
      continue;
    }
    if (!Array.isArray(q.options) || q.options.length < 4) {
      log(`[VALIDATOR] Q${i + 1}: Invalid options (need 4) — skip`, 'warn');
      continue;
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
      log(`[VALIDATOR] Q${i + 1}: Invalid correct="${q.correct}" — defaulting to A`, 'warn');
      q.correct = 'A';
    }

    // Anti-repetition: check global session hashes
    const hash = hashQuestion(q.question);
    if (questionHashes.has(hash)) {
      log(`[VALIDATOR] Q${i + 1}: Duplicate detected (global) — skip: "${q.question.slice(0, 50)}"`, 'warn');
      continue;
    }
    // Anti-repetition: check within this batch
    if (seenInBatch.has(hash)) {
      log(`[VALIDATOR] Q${i + 1}: Duplicate within batch — skip`, 'warn');
      continue;
    }
    seenInBatch.add(hash);

    // Clean up options (trim whitespace, ensure strings)
    q.options = q.options.slice(0, 4).map(o => String(o).trim());
    q.question = q.question.trim();
    q.explanation = q.explanation?.trim() || 'No explanation provided.';
    q.topic = q.topic?.trim() || sectionName;
    q.id = `${sectionName.replace(/\s+/g, '_')}_${Date.now()}_${i}`;
    q.section = sectionName;

    valid.push(q);
  }

  log(`[VALIDATOR] Accepted: ${valid.length}/${parsed.length} questions for ${sectionName}`, valid.length > 0 ? 'success' : 'error');
  return valid;
}

// ─────────────────────────────────────────────────────────
// HASH FUNCTION
// ─────────────────────────────────────────────────────────
function hashQuestion(text) {
  const str = text.toLowerCase().replace(/\s+/g, '').slice(0, 60);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─────────────────────────────────────────────────────────
// BUILT-IN FALLBACK QUESTIONS
// ─────────────────────────────────────────────────────────
function getFallbackQuestions(sectionName, questionHashes) {
  const all = {
    'Reasoning': [
      { question: "If A is the brother of B, B is the sister of C, and C is the father of D, how is A related to D?", options: ["Uncle", "Brother", "Father", "Grandfather"], correct: "A", explanation: "A and B are siblings, B and C are siblings, C is D's father. So A is D's uncle.", topic: "Blood Relations" },
      { question: "Find the odd one out: 2, 5, 10, 17, 26, 37, 50, 64", options: ["37", "26", "64", "50"], correct: "C", explanation: "Series: n²+1. 8²+1=65, not 64. So 64 is the odd one.", topic: "Series" },
      { question: "In a code, COMPUTER is written as RFUVQNPC. How is MEDICINE written?", options: ["MFEDJDOC", "EOJDJEFM", "NFEJDJOF", "EDJDOFEM"], correct: "C", explanation: "Each letter shifts by a specific pattern in reverse.", topic: "Coding-Decoding" },
      { question: "Pointing at a photo, Ram says 'She is the daughter of my grandfather's only son.' How is she related to Ram?", options: ["Daughter", "Sister", "Niece", "Cousin"], correct: "B", explanation: "Grandfather's only son = Father. Father's daughter = Sister.", topic: "Blood Relations" },
      { question: "Which number replaces ? in: 4, 9, 25, 49, 121, ?", options: ["144", "169", "196", "225"], correct: "B", explanation: "Squares of primes: 2²,3²,5²,7²,11²,13²=169.", topic: "Number Series" }
    ],
    'Quantitative Aptitude': [
      { question: "A train 150m long passes a pole in 15 seconds. Speed in km/h?", options: ["36", "40", "54", "60"], correct: "A", explanation: "Speed=150/15=10 m/s × 18/5 = 36 km/h.", topic: "Speed & Distance" },
      { question: "Simple interest on Rs.1200 for 3 years is Rs.216. Rate per annum?", options: ["5%", "6%", "7%", "8%"], correct: "B", explanation: "R=(216×100)/(1200×3)=6%.", topic: "Simple Interest" },
      { question: "A and B together complete work in 7.2 days. A alone takes 12 days. How many days for B alone?", options: ["14", "16", "18", "20"], correct: "C", explanation: "1/B = 1/7.2 - 1/12 = 5/36 - 3/36 = 2/36. B=18 days.", topic: "Work & Time" },
      { question: "If 15% of x = 20% of y, then x:y = ?", options: ["3:4", "4:3", "2:3", "3:2"], correct: "B", explanation: "15x = 20y → x/y = 20/15 = 4:3.", topic: "Ratio & Proportion" },
      { question: "Compound interest on Rs.5000 at 10% p.a. for 2 years?", options: ["Rs.1000", "Rs.1050", "Rs.1100", "Rs.1025"], correct: "B", explanation: "CI = 5000 × [(1.1)² - 1] = 5000 × 0.21 = Rs.1050.", topic: "Compound Interest" }
    ],
    'English Language': [
      { question: "Choose the correct synonym for EPHEMERAL:", options: ["Permanent", "Transient", "Eternal", "Everlasting"], correct: "B", explanation: "Ephemeral = lasting very short time. Transient is the synonym.", topic: "Vocabulary" },
      { question: "Identify the correctly spelled word:", options: ["Accomodation", "Accommodation", "Acommodation", "Accomadation"], correct: "B", explanation: "Accommodation has double 'c' and double 'm'.", topic: "Spelling" },
      { question: "She _____ to the market yesterday. Choose the correct form:", options: ["go", "goes", "went", "gone"], correct: "C", explanation: "Past tense of 'go' is 'went'.", topic: "Grammar" },
      { question: "Choose the antonym of VERBOSE:", options: ["Wordy", "Talkative", "Concise", "Eloquent"], correct: "C", explanation: "Verbose = using too many words. Antonym = Concise.", topic: "Vocabulary" },
      { question: "Passive voice of 'She writes a letter' is:", options: ["A letter is written by her", "A letter was written by her", "A letter has been written by her", "A letter will be written by her"], correct: "A", explanation: "Present simple active → 'is written by' in passive.", topic: "Grammar" }
    ],
    'General Knowledge': [
      { question: "Who was the first President of India?", options: ["Jawaharlal Nehru", "Rajendra Prasad", "Sardar Patel", "B.R. Ambedkar"], correct: "B", explanation: "Dr. Rajendra Prasad served as first President from 1950 to 1962.", topic: "Indian Polity" },
      { question: "The Strait of Malacca connects which bodies of water?", options: ["Arabian Sea and Bay of Bengal", "Pacific and Atlantic", "South China Sea and Indian Ocean", "Mediterranean and Red Sea"], correct: "C", explanation: "Malacca Strait links the Andaman Sea to the South China Sea.", topic: "Geography" },
      { question: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Saturn", "Mars"], correct: "D", explanation: "Mars appears red due to iron oxide (rust) on its surface.", topic: "Science" },
      { question: "The Battle of Plassey was fought in the year:", options: ["1757", "1761", "1764", "1856"], correct: "A", explanation: "Battle of Plassey, 1757 — British East India Company vs Nawab Siraj ud-Daulah.", topic: "History" },
      { question: "Who invented the telephone?", options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"], correct: "C", explanation: "Alexander Graham Bell patented the telephone in 1876.", topic: "Science & Technology" }
    ],
    'Computer Awareness': [
      { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], correct: "A", explanation: "CPU = Central Processing Unit, the primary component of a computer.", topic: "Computer Basics" },
      { question: "Which of these is NOT an input device?", options: ["Keyboard", "Mouse", "Monitor", "Scanner"], correct: "C", explanation: "Monitor is an output device; the others are input devices.", topic: "Hardware" },
      { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Transfer Markup Language", "Hyper Transfer Mechanism Language", "Hyper Text Making Language"], correct: "A", explanation: "HTML = HyperText Markup Language, used to create web pages.", topic: "Internet & Web" },
      { question: "Which key combination copies text?", options: ["Ctrl+X", "Ctrl+C", "Ctrl+V", "Ctrl+Z"], correct: "B", explanation: "Ctrl+C copies, Ctrl+X cuts, Ctrl+V pastes, Ctrl+Z undoes.", topic: "Computer Basics" },
      { question: "What is the full form of USB?", options: ["Universal Serial Bus", "Unified System Bus", "Universal System Block", "Ultra Speed Bus"], correct: "A", explanation: "USB = Universal Serial Bus, used for connecting peripheral devices.", topic: "Hardware" }
    ],
    'Current Affairs': [
      { question: "Which country hosted the G20 Summit in 2023?", options: ["Japan", "USA", "India", "Brazil"], correct: "C", explanation: "India hosted the G20 Summit in New Delhi in September 2023.", topic: "International Events" },
      { question: "India's first indigenous aircraft carrier is named:", options: ["INS Vikrant", "INS Viraat", "INS Arihant", "INS Vikramaditya"], correct: "A", explanation: "INS Vikrant, India's first indigenous aircraft carrier, was commissioned in 2022.", topic: "Defence" },
      { question: "Telangana was formed on:", options: ["June 2, 2014", "Nov 1, 2000", "March 15, 2010", "Jan 26, 2015"], correct: "A", explanation: "Telangana became the 29th state on June 2, 2014, carved from Andhra Pradesh.", topic: "Indian Polity" },
      { question: "ISRO headquarters is located in:", options: ["New Delhi", "Mumbai", "Bengaluru", "Hyderabad"], correct: "C", explanation: "ISRO is headquartered in Bengaluru (Bangalore), Karnataka.", topic: "Science & Technology" },
      { question: "Which country is the top exporter of arms globally?", options: ["Russia", "China", "France", "United States"], correct: "D", explanation: "The United States is the world's largest arms exporter, accounting for over 40% of global arms exports.", topic: "International Affairs" }
    ]
  };

  const questions = all[sectionName] || all['Reasoning'];
  return questions
    .filter(q => !questionHashes.has(hashQuestion(q.question)))
    .map((q, i) => ({
      ...q,
      id: `${sectionName.replace(/\s+/g, '_')}_fallback_${i}`,
      section: sectionName
    }));
}
