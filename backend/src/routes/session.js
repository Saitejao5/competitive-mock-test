import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionStore } from '../services/sessionStore.js';

const router = express.Router();

// POST /api/session/create
router.post('/create', (req, res) => {
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'Config required' });
  const sessionId = uuidv4();
  const session = SessionStore.create(sessionId, config);
  res.json({ sessionId, createdAt: session.createdAt });
});

// GET /api/session/:id
router.get('/:id', (req, res) => {
  const session = SessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({
    id: session.id,
    config: session.config,
    createdAt: session.createdAt,
    sectionStatus: session.sectionStatus,
    sectionsGenerated: Object.keys(session.sections),
    totalQuestionsGenerated: session.generatedQuestions.length
  });
});

// GET /api/session/:id/analytics
router.get('/:id/analytics', (req, res) => {
  const session = SessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { answers, timings, startTime, endTime } = session.analytics;
  const allQuestions = Object.values(session.sections).flat();

  // Compute stats
  let correct = 0, wrong = 0, unattempted = 0;
  const topicMap = {};

  allQuestions.forEach((q, globalIdx) => {
    // Find section and local index for key
    let key = null;
    let found = false;
    let runningIdx = 0;
    Object.entries(session.sections).forEach(([secName, secQs], si) => {
      if (found) return;
      secQs.forEach((sq, qi) => {
        if (sq.id === q.id) {
          key = `${si}_${qi}`;
          found = true;
        }
      });
    });

    const answer = key ? answers[key] : null;
    const time = key ? (timings[key] || 0) : 0;
    const topic = q.topic || q.section;

    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0, time: 0 };
    topicMap[topic].total++;
    topicMap[topic].time += time;

    if (!answer) { unattempted++; }
    else if (answer === q.correct) { correct++; topicMap[topic].correct++; }
    else { wrong++; }
  });

  const total = allQuestions.length;
  const attempted = correct + wrong;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const netScore = (correct - wrong * 0.25).toFixed(2);

  const weakAreas = Object.entries(topicMap)
    .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100), total: s.total, avgTime: Math.round(s.time / s.total) }))
    .filter(t => t.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  res.json({
    score: { correct, wrong, unattempted, total, attempted, accuracy, netScore },
    weakAreas,
    topicBreakdown: topicMap,
    timeSummary: { totalTime: endTime ? Math.round((endTime - startTime) / 1000) : 0 }
  });
});

// DELETE /api/session/:id
router.delete('/:id', (req, res) => {
  SessionStore.delete(req.params.id);
  res.json({ success: true });
});

export default router;
