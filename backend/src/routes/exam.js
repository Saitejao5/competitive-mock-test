import express from 'express';
import { isMongoReady } from '../config/db.js';
import { SessionStore } from '../services/sessionStore.js';
import { generateSection } from '../services/questionGenerator.js';
import { BATCH_SIZE, ensureBatchPool, getBatchForSection, getDefaultExamSections } from '../services/batchService.js';

const router = express.Router();

// GET /api/exam/config — Available exams and sections
router.get('/config', (req, res) => {
  res.json({
    exams: ['SSC CGL', 'SSC CHSL', 'UPSC CSE', 'RRB NTPC', 'IBPS PO', 'CAT', 'GATE', 'NDA', 'CMAT', 'SBI PO'],
    difficulties: ['Easy', 'Medium', 'Hard', 'Exam Level'],
    sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Knowledge', 'Computer Awareness', 'Current Affairs'],
    modes: [
      { id: 'exam', label: 'Practice by Exam' },
      { id: 'topic', label: 'Practice by Topic' },
      { id: 'paper', label: 'Practice by Paper' }
    ],
    defaultQPerSection: BATCH_SIZE,
    maxQPerSection: BATCH_SIZE,
    minQPerSection: 3
  });
});

// POST /api/exam/generate-section — HTTP fallback for section generation
router.post('/generate-section', async (req, res) => {
  const { sessionId, sectionName, exam, difficulty, count } = req.body;

  if (!sessionId || !sectionName || !exam || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const session = SessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const logs = [];
  const onLog = (msg, type) => {
    logs.push({ msg, type, ts: new Date().toISOString() });
    console.log(`[HTTP Generate] ${msg}`);
  };

  try {
    const batch = await getBatchForSection({
      userKey: req.body.userId || req.ip || sessionId,
      requestedSection: sectionName,
      exam,
      difficulty,
      limit: count || BATCH_SIZE,
      onLog
    });

    if (!batch?.questions?.length && isMongoReady()) {
      throw new Error(`No unseen questions could be served for ${sectionName} after DB refill`);
    }

    const questions = batch?.questions || await generateSection({
      sessionId,
      sectionName,
      exam,
      difficulty,
      count: count || BATCH_SIZE,
      previousQuestions: session.generatedQuestions,
      questionHashes: session.questionHashes,
      onLog
    });

    SessionStore.storeSection(sessionId, sectionName, questions);

    res.json({ success: true, sectionName, questions, batchId: batch?.batchId || null, source: batch?.source || 'legacy-llm', logs });
  } catch (err) {
    res.status(500).json({ error: err.message, logs });
  }
});

// POST /api/exam/pregenerate-batches - warm reusable section batches
router.post('/pregenerate-batches', async (req, res) => {
  const {
    exam = 'SSC CGL',
    difficulty = 'Exam Level',
    sections = getDefaultExamSections()
  } = req.body || {};

  const logs = [];
  const onLog = (msg, type) => {
    logs.push({ msg, type, ts: new Date().toISOString() });
    console.log(`[Batch Pregenerate] ${msg}`);
  };

  try {
    const queued = await ensureBatchPool({ exam, difficulty, sections, onLog });
    res.json({ success: true, queued, exam, difficulty, sections, logs });
  } catch (err) {
    res.status(500).json({ error: err.message, logs });
  }
});

export default router;
