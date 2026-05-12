// ─────────────────────────────────────────────────────────
// WEBSOCKET HANDLER
// Manages real-time exam generation & streaming
// ─────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { SessionStore } from './sessionStore.js';
import { generateSection } from './questionGenerator.js';

export async function handleWebSocket(ws, rawData, wss) {
  let message;
  try {
    message = JSON.parse(rawData.toString());
  } catch (e) {
    wsSend(ws, { type: 'error', message: 'Invalid JSON message' });
    return;
  }

  console.log(`\x1b[36m[WS →]\x1b[0m ${message.type} from ${ws.clientId}`);

  switch (message.type) {
    case 'START_EXAM':
      await handleStartExam(ws, message.payload);
      break;

    case 'SUBMIT_EXAM':
      handleSubmitExam(ws, message.payload);
      break;

    case 'PING':
      wsSend(ws, { type: 'PONG', timestamp: Date.now() });
      break;

    default:
      wsSend(ws, { type: 'error', message: `Unknown message type: ${message.type}` });
  }
}

// ─────────────────────────────────────────────────────────
// START EXAM — Section 1 priority, rest parallel
// ─────────────────────────────────────────────────────────
async function handleStartExam(ws, payload) {
  const { config } = payload;
  const { exam, difficulty, mode, sections, qPerSection } = config;

  if (!exam || !difficulty || !sections?.length) {
    wsSend(ws, { type: 'EXAM_ERROR', message: 'Invalid exam configuration' });
    return;
  }

  const sessionId = uuidv4();
  SessionStore.create(sessionId, config);

  // Acknowledge
  wsSend(ws, {
    type: 'EXAM_STARTED',
    sessionId,
    config,
    totalSections: sections.length,
    timestamp: new Date().toISOString()
  });

  wsLog(ws, `Exam started | Session: ${sessionId}`, 'success');
  wsLog(ws, `Config: ${exam} | ${difficulty} | ${sections.length} sections | ${qPerSection}q each`, 'info');
  wsLog(ws, `Generation strategy: Section-1 priority → parallel background`, 'info');

  // ── PHASE 1: Generate Section 1 immediately ──
  const firstSection = sections[0];
  wsLog(ws, `[PHASE 1] Priority generation for "${firstSection}"...`, 'llm');

  wsSend(ws, {
    type: 'SECTION_GENERATING',
    sectionName: firstSection,
    sectionIndex: 0
  });

  try {
    const q1 = await generateSection({
      sessionId,
      sectionName: firstSection,
      exam, difficulty,
      count: qPerSection,
      previousQuestions: [],
      questionHashes: new Set(),
      onLog: (msg, type) => wsLog(ws, msg, type)
    });

    SessionStore.storeSection(sessionId, firstSection, q1);

    wsSend(ws, {
      type: 'SECTION_READY',
      sectionIndex: 0,
      sectionName: firstSection,
      questions: q1,
      sessionId
    });

    wsLog(ws, `[PHASE 1 ✓] "${firstSection}" ready — ${q1.length} questions delivered`, 'success');
  } catch (err) {
    wsLog(ws, `[PHASE 1 ✗] "${firstSection}" failed: ${err.message}`, 'error');
    wsSend(ws, {
      type: 'SECTION_ERROR',
      sectionIndex: 0,
      sectionName: firstSection,
      error: err.message
    });
  }

  // ── PHASE 2: Parallel background generation ──
  if (sections.length > 1) {
    wsLog(ws, `[PHASE 2] Launching parallel background generation for ${sections.length - 1} sections`, 'llm');

    const bgTasks = sections.slice(1).map(async (sectionName, idx) => {
      const sectionIndex = idx + 1;

      wsSend(ws, { type: 'SECTION_GENERATING', sectionName, sectionIndex });
      wsLog(ws, `[BG-${sectionIndex}] Queued "${sectionName}"`, 'llm');

      try {
        const session = SessionStore.get(sessionId);
        const prevQ = session ? session.generatedQuestions : [];
        const hashes = session ? session.questionHashes : new Set();

        const questions = await generateSection({
          sessionId,
          sectionName,
          exam, difficulty,
          count: qPerSection,
          previousQuestions: prevQ,
          questionHashes: hashes,
          onLog: (msg, type) => wsLog(ws, msg, type)
        });

        SessionStore.storeSection(sessionId, sectionName, questions);

        // Check ws still alive
        if (ws.readyState === 1) {
          wsSend(ws, {
            type: 'SECTION_READY',
            sectionIndex,
            sectionName,
            questions,
            sessionId
          });
          wsLog(ws, `[BG-${sectionIndex} ✓] "${sectionName}" ready — ${questions.length} questions`, 'success');
        }
      } catch (err) {
        wsLog(ws, `[BG-${sectionIndex} ✗] "${sectionName}" failed: ${err.message}`, 'error');
        if (ws.readyState === 1) {
          wsSend(ws, {
            type: 'SECTION_ERROR',
            sectionIndex,
            sectionName,
            error: err.message
          });
        }
      }
    });

    // Fire and forget — don't await
    Promise.all(bgTasks).then(() => {
      wsLog(ws, `[PHASE 2 ✓] All background sections complete`, 'success');
      if (ws.readyState === 1) {
        wsSend(ws, { type: 'ALL_SECTIONS_READY', sessionId });
      }
    });
  }
}

// ─────────────────────────────────────────────────────────
// SUBMIT EXAM
// ─────────────────────────────────────────────────────────
function handleSubmitExam(ws, payload) {
  const { sessionId, answers, timings } = payload;

  const session = SessionStore.get(sessionId);
  if (!session) {
    wsSend(ws, { type: 'SUBMIT_ERROR', message: 'Session not found or expired' });
    return;
  }

  // Store analytics in session
  SessionStore.update(sessionId, s => {
    s.analytics.answers = answers;
    s.analytics.timings = timings;
    s.analytics.endTime = Date.now();
  });

  wsLog(ws, `Exam submitted | Session: ${sessionId} | Answers: ${Object.keys(answers).length}`, 'success');

  wsSend(ws, {
    type: 'EXAM_SUBMITTED',
    sessionId,
    timestamp: new Date().toISOString()
  });
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function wsSend(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function wsLog(ws, message, type = 'info') {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`\x1b[${type === 'error' ? '31' : type === 'success' ? '32' : type === 'llm' ? '35' : type === 'stream' ? '36' : type === 'warn' ? '33' : '34'}m[${ts}]\x1b[0m ${message}`);
  wsSend(ws, {
    type: 'LOG',
    message,
    logType: type,
    timestamp: ts
  });
}
