import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isMongoReady } from '../config/db.js';
import { Question } from '../models/Question.js';
import { QuestionBatch } from '../models/QuestionBatch.js';
import { User } from '../models/User.js';
import { generateSection } from './questionGenerator.js';

export const BATCH_SIZE = 25;
const LOW_BATCH_WATERMARK = parseInt(process.env.BATCH_LOW_WATERMARK, 10) || 2;
const generationLocks = new Map();

const SECTION_ALIASES = {
  'quantitative aptitude': 'Arithmetic',
  mathematics: 'Arithmetic',
  arithmetic: 'Arithmetic',
  reasoning: 'Reasoning',
  'reasoning ability': 'Reasoning',
  'general intelligence': 'Reasoning',
  'general intelligence & reasoning': 'Reasoning',
  english: 'English',
  'english language': 'English',
  gk: 'GK',
  'general knowledge': 'GK',
  'general awareness': 'GK'
};

export function normalizeSectionName(sectionName = '') {
  const key = sectionName.trim().toLowerCase();
  return SECTION_ALIASES[key] || sectionName.trim();
}

export function getDefaultExamSections() {
  return ['Arithmetic', 'Reasoning', 'English', 'GK'];
}

export async function getBatchForSection({
  userKey,
  requestedSection,
  exam,
  difficulty,
  onLog,
  limit = BATCH_SIZE,
  allowSynchronousRefill = true
}) {
  const log = onLog || console.log;

  // DEBUG: Log input parameters
  console.log(`[BATCH:getBatchForSection] INPUT PARAMS:`, {
    userKey: userKey?.substring(0, 20) + '...' || 'undefined',
    requestedSection,
    exam,
    difficulty,
    limit,
    allowSynchronousRefill
  });

  if (!isMongoReady()) {
    log('[BATCH] Mongo not connected. Falling back to legacy section generation.', 'warn');
    console.log('[BATCH:getBatchForSection] ⚠️  MongoDB not ready (readyState:', mongoose.connection.readyState, ')');
    return null;
  }

  const section = normalizeSectionName(requestedSection);
  console.log(`[BATCH:getBatchForSection] SECTION NORMALIZED: "${requestedSection}" → "${section}"`);

  const user = await getOrCreateBatchUser(userKey);
  const deliveryLimit = normalizeLimit(limit);

  console.log(`[BATCH:getBatchForSection] USER FOUND/CREATED:`, {
    userId: user._id,
    seenQuestionsCount: user.seenQuestionIds?.length || 0
  });

  let questions = await findUnseenQuestions({ section, difficulty, user, limit: deliveryLimit });

  console.log(`[BATCH:getBatchForSection] STEP 1 FETCH: Got ${questions.length}/${deliveryLimit} questions`);

  if (questions.length < deliveryLimit && allowSynchronousRefill) {
    log(`[BATCH] Only ${questions.length}/${deliveryLimit} unseen ${section}/${difficulty} questions available. Refilling via section-wise LLM.`, 'warn');
    console.log(`[BATCH:getBatchForSection] STEP 2 REFILL: Attempting to refill...`);
    
    await refillSectionBatch({ section, exam, difficulty, source: 'llm', log });
    
    const freshUser = await User.findById(user._id).lean();
    questions = await findUnseenQuestions({ section, difficulty, user: freshUser || user, limit: deliveryLimit });
    
    console.log(`[BATCH:getBatchForSection] STEP 2 REFILL: After refill, got ${questions.length}/${deliveryLimit} questions`);
  }

  if (!questions.length) {
    console.log(`[BATCH:getBatchForSection] ❌ FINAL RESULT: No unseen questions for ${section}/${difficulty}`);
    log(`[BATCH] Still no unseen questions available for ${section}/${difficulty}.`, 'error');
    return null;
  }

  await markQuestionsSeen({ user, questions, section });
  const batchIds = [...new Set(questions.map(question => question.batchId).filter(Boolean))];
  
  console.log(`[BATCH:getBatchForSection] ✓ SUCCESS: Serving ${questions.length} questions from ${batchIds.length} batch(es)`, {
    batchIds: batchIds.slice(0, 3)
  });
  
  log(`[BATCH] Serving ${questions.length} unseen ${section}/${difficulty} questions from ${batchIds.length} batch(es)`, 'success');

  return {
    batchId: batchIds[0] || null,
    batchIds,
    section,
    requestedSection,
    source: questions.some(question => question.source === 'llm') ? 'llm' : 'db',
    questions: questions.map(question => toClientQuestion(question, requestedSection))
  };
}

export async function ensureBatchPool({ exam, difficulty, sections = getDefaultExamSections(), onLog }) {
  const log = onLog || console.log;
  if (!isMongoReady()) return false;

  await Promise.all(sections.map(sectionName =>
    maybeScheduleLowWatermarkRefill({
      section: normalizeSectionName(sectionName),
      exam,
      difficulty,
      log,
      force: true
    })
  ));

  return true;
}

async function getOrCreateBatchUser(userKey) {
  const key = userKey || `anonymous:${uuidv4()}`;
  return User.findOneAndUpdate(
    { userKey: key },
    { $setOnInsert: { userKey: key, name: 'Anonymous Exam User', createdAt: new Date() } },
    { new: true, upsert: true }
  );
}

async function findUnseenQuestions({ section, difficulty, user, limit }) {
  const seenQuestionIds = user?.seenQuestionIds || [];
  const filter = {
    section,
    _id: { $nin: seenQuestionIds }
  };

  if (difficulty) {
    filter.difficulty = difficulty;
  }

  // DEBUG: Log query parameters
  console.log(`[BATCH:findUnseenQuestions] QUERY FILTER:`, {
    section,
    difficulty,
    seenQuestionsCount: seenQuestionIds.length,
    limit,
    filter: JSON.stringify(filter)
  });

  const results = await Question.find(filter)
    .sort({ createdAt: 1, batchId: 1 })
    .limit(limit)
    .lean();

  // DEBUG: Log query results
  console.log(`[BATCH:findUnseenQuestions] RESULT COUNT: ${results.length}`, {
    section,
    difficulty,
    expectedLimit: limit,
    returned: results.length
  });

  // DEBUG: If empty, check why
  if (results.length === 0) {
    const allInSection = await Question.countDocuments({ section });
    const seenInSection = await Question.countDocuments({ section, _id: { $in: seenQuestionIds } });
    console.log(`[BATCH:findUnseenQuestions] ⚠️  EMPTY RESULT DEBUG:`, {
      section,
      difficulty,
      totalInSection: allInSection,
      seenInSection,
      unseenInSection: allInSection - seenInSection,
      seenQuestionsCount: seenQuestionIds.length
    });
  }

  return results;
}

async function markQuestionsSeen({ user, questions, section }) {
  const questionIds = questions.map(question => question._id);
  const batchIds = [...new Set(questions.map(question => question.batchId).filter(Boolean))];
  const progressEntry = {
    section,
    batchId: batchIds[0] || null,
    questionIds,
    updatedAt: new Date()
  };

  await User.updateOne(
    { _id: user._id },
    {
      $addToSet: {
        seenBatchIds: { $each: batchIds },
        seenQuestionIds: { $each: questionIds }
      },
      $pull: { examProgress: { section } }
    }
  );

  await User.updateOne(
    { _id: user._id },
    { $push: { examProgress: progressEntry } }
  );
}

async function maybeScheduleLowWatermarkRefill({ section, exam, difficulty, log, force = false }) {
  const count = await QuestionBatch.countDocuments({ section, difficulty, questionIds: { $size: BATCH_SIZE } });
  if (!force && count > LOW_BATCH_WATERMARK) return;

  const promise = refillSectionBatch({ section, exam, difficulty, source: 'llm', log });
  if (force || count === 0) await promise;
}

async function refillSectionBatch({ section, exam, difficulty, source, log }) {
  const lockKey = `${section}:${difficulty}`;
  
  // FIX: Atomic lock check with promise caching
  if (generationLocks.has(lockKey)) {
    log(`[BATCH] Reusing active generation for ${lockKey}`, 'info');
    return generationLocks.get(lockKey);
  }

  // Create and cache the task
  const task = (async () => {
    try {
      return await createBatchWithLLM({ section, exam, difficulty, source, log });
    } finally {
      // Remove lock even if task fails
      generationLocks.delete(lockKey);
    }
  })();

  generationLocks.set(lockKey, task);
  
  try {
    return await task;
  } catch (err) {
    generationLocks.delete(lockKey);
    throw err;
  }
}

async function createBatchWithLLM({ section, exam, difficulty, source, log }) {
  log(`[BATCH] Generating ${section} batch (${BATCH_SIZE} questions)`, 'llm');

  const existingQuestions = await Question.find({ section, difficulty })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  const questionHashes = new Set(existingQuestions.map(q => q.hash).filter(Boolean));
  const batchId = `${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${difficulty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

  // Generate questions (must be exactly 25)
  const generated = await generateSection({
    sessionId: `batch:${batchId}`,
    sectionName: section,
    exam,
    difficulty,
    count: BATCH_SIZE,
    previousQuestions: existingQuestions,
    questionHashes,
    onLog: log
  });

  // CRITICAL: Verify we got exactly 25
  if (generated.length !== BATCH_SIZE) {
    throw new Error(`CRITICAL: Generated ${generated.length}/${BATCH_SIZE} questions for ${section}/${difficulty}`);
  }

  // Map to database schema
  const docs = generated.map((q, idx) => ({
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer || q.correct, // Handle both field names
    explanation: q.explanation,
    section,
    topic: q.topic || section,
    batchId,
    source,
    difficulty,
    hash: hashQuestion(q.question)
  }));

  // Remove duplicates
  const uniqueDocs = await removeExistingDuplicates(docs);
  
  if (uniqueDocs.length < BATCH_SIZE) {
    throw new Error(`Only ${uniqueDocs.length}/${BATCH_SIZE} unique questions for ${section}/${difficulty}`);
  }

  // ATOMIC: Insert questions and batch in transaction if MongoDB supports it
  let inserted;
  try {
    inserted = await Question.insertMany(uniqueDocs, { ordered: false });
  } catch (err) {
    // Partial insert handled by MongoDB
    if (err.insertedDocs && err.insertedDocs.length >= BATCH_SIZE) {
      inserted = err.insertedDocs.slice(0, BATCH_SIZE);
    } else if (err.insertedDocs && err.insertedDocs.length > 0) {
      log(`[BATCH] Partial insert: ${err.insertedDocs.length}/${BATCH_SIZE}`, 'warn');
      inserted = err.insertedDocs;
    } else {
      throw new Error(`Failed to insert questions: ${err.message}`);
    }
  }

  if (inserted.length < BATCH_SIZE) {
    // Clean up partial inserts
    await Question.deleteMany({ batchId });
    throw new Error(`Only ${inserted.length}/${BATCH_SIZE} questions inserted for ${section}`);
  }

  // Create batch document
  try {
    await QuestionBatch.create({
      batchId,
      section,
      questionIds: inserted.slice(0, BATCH_SIZE).map(q => q._id),
      source,
      difficulty,
      isGenerating: false
    });
  } catch (batchErr) {
    // If batch creation fails, clean up inserted questions
    await Question.deleteMany({ batchId });
    throw new Error(`Failed to create QuestionBatch: ${batchErr.message}`);
  }

  log(`[BATCH] ✓ Batch ${batchId} created with ${BATCH_SIZE} questions`, 'success');
  return batchId;
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return BATCH_SIZE;
  return Math.min(parsed, BATCH_SIZE);
}

async function removeExistingDuplicates(docs) {
  const hashes = docs.map(doc => doc.hash);
  const questionTexts = docs.map(doc => doc.question);
  const existing = await Question.find({
    $or: [
      { hash: { $in: hashes } },
      { question: { $in: questionTexts } }
    ]
  })
    .select('hash question')
    .lean();

  const existingHashes = new Set(existing.map(question => question.hash).filter(Boolean));
  const existingTexts = new Set(existing.map(question => normalizeQuestionText(question.question)));
  const seenHashes = new Set();
  const seenTexts = new Set();

  return docs.filter(doc => {
    const normalizedText = normalizeQuestionText(doc.question);
    if (existingHashes.has(doc.hash) || existingTexts.has(normalizedText)) return false;
    if (seenHashes.has(doc.hash) || seenTexts.has(normalizedText)) return false;
    seenHashes.add(doc.hash);
    seenTexts.add(normalizedText);
    return true;
  });
}

function normalizeQuestionText(text = '') {
  return String(text).trim().toLowerCase().replace(/\s+/g, ' ');
}

function toClientQuestion(question, requestedSection) {
  return {
    id: String(question._id),
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer, // Use correctAnswer consistently
    explanation: question.explanation,
    topic: question.topic,
    section: requestedSection || question.section,
    batchId: question.batchId,
    source: question.source,
    difficulty: question.difficulty
  };
}

function hashQuestion(text) {
  const str = text.toLowerCase().replace(/\s+/g, '').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}
