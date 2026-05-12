import express from 'express';
import { SessionStore } from '../services/sessionStore.js';
import { generateSection } from '../services/questionGenerator.js';

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
    defaultQPerSection: 5,
    maxQPerSection: 25,
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
    const questions = await generateSection({
      sessionId,
      sectionName,
      exam,
      difficulty,
      count: count || 5,
      previousQuestions: session.generatedQuestions,
      questionHashes: session.questionHashes,
      onLog
    });

    SessionStore.storeSection(sessionId, sectionName, questions);

    res.json({ success: true, sectionName, questions, logs });
  } catch (err) {
    res.status(500).json({ error: err.message, logs });
  }
});

export default router;
