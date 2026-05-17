import { v4 as uuidv4 } from 'uuid';
import { isMongoReady } from '../config/db.js';
import { SessionStore } from './sessionStore.js';
import { generateSection } from './questionGenerator.js';
import { BATCH_SIZE, getBatchForSection, getDefaultExamSections } from './batchService.js';

export async function handleWebSocket(ws, rawData) {
  let message;
  try {
    message = JSON.parse(rawData.toString());
  } catch (e) {
    wsSend(ws, { type: 'error', message: 'Invalid JSON message' });
    return;
  }

  console.log(`\x1b[36m[WS ->]\x1b[0m ${message.type} from ${ws.clientId}`);

  switch (message.type) {
    case 'START_EXAM':
      await handleStartExam(ws, message.payload || {});
      break;

    case 'SUBMIT_EXAM':
      handleSubmitExam(ws, message.payload || {});
      break;

    case 'PING':
      wsSend(ws, { type: 'PONG', timestamp: Date.now() });
      break;

    default:
      wsSend(ws, { type: 'error', message: `Unknown message type: ${message.type}` });
  }
}

async function handleStartExam(ws, payload) {
  const { config } = payload;
  if (!config) {
    wsSend(ws, { type: 'EXAM_ERROR', message: 'Config required' });
    return;
  }

  const { exam, difficulty, qPerSection } = config;
  const sections = config.sections?.length ? config.sections : getDefaultExamSections();
  const sessionConfig = { ...config, sections };

  if (!exam || !difficulty || !sections.length) {
    wsSend(ws, { type: 'EXAM_ERROR', message: 'Invalid exam configuration' });
    return;
  }

  const sessionId = uuidv4();
  SessionStore.create(sessionId, sessionConfig);

  wsSend(ws, {
    type: 'EXAM_STARTED',
    sessionId,
    config: sessionConfig,
    totalSections: sections.length,
    timestamp: new Date().toISOString()
  });

  wsLog(ws, `✓ Exam started | Session: ${sessionId}`, 'success');
  wsLog(ws, `Config: ${exam} | ${difficulty} | ${sections.length} sections`, 'info');

  // Send SECTION_GENERATING for ALL sections immediately
  sections.forEach((sectionName, idx) => {
    wsSend(ws, { type: 'SECTION_GENERATING', sectionName, sectionIndex: idx });
    wsLog(ws, `[SECTION-${idx}] Loading "${sectionName}" in parallel`, 'llm');
  });

  // Create all section tasks in parallel (no await here)
  const sectionTasks = sections.map((sectionName, sectionIndex) =>
    getSectionQuestions({
      ws,
      sessionId,
      sectionName,
      exam,
      difficulty,
      qPerSection,
      payload
    })
      .then(questions => ({ sectionIndex, sectionName, questions, error: null }))
      .catch(error => ({ sectionIndex, sectionName, error, questions: null }))
  );

  // Deliver results as they complete
  const deliverResult = ({ sectionIndex, sectionName, questions, error }) => {
    if (error) {
      wsLog(ws, `[SECTION-${sectionIndex}] ✗ Failed: ${error.message}`, 'error');
      if (ws.readyState === 1) {
        wsSend(ws, { type: 'SECTION_ERROR', sectionIndex, sectionName, error: error.message });
      }
      return false;
    }

    if (questions.length !== BATCH_SIZE) {
      wsLog(ws, `[SECTION-${sectionIndex}] ⚠️  Got ${questions.length}/${BATCH_SIZE} questions`, 'warn');
    }

    SessionStore.storeSection(sessionId, sectionName, questions);
    if (ws.readyState === 1) {
      wsSend(ws, { type: 'SECTION_READY', sectionIndex, sectionName, questions, sessionId });
      wsLog(ws, `[SECTION-${sectionIndex}] ✓ Ready (${questions.length} questions)`, 'success');
    }
    return true;
  };

  // Execute all in parallel and deliver results as they complete
  Promise.allSettled(sectionTasks)
    .then(results => {
      let successCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (deliverResult(result.value)) {
            successCount++;
          }
        } else {
          wsLog(ws, `[SECTION] Unexpected rejection: ${result.reason?.message || 'Unknown'}`, 'error');
        }
      }

      if (successCount === sections.length && ws.readyState === 1) {
        wsLog(ws, `✓ All ${sections.length} sections ready`, 'success');
        wsSend(ws, { type: 'ALL_SECTIONS_READY', sessionId });
      }
    })
    .catch(err => {
      wsLog(ws, `[EXAM] Unexpected error: ${err.message}`, 'error');
      if (ws.readyState === 1) {
        wsSend(ws, { type: 'EXAM_ERROR', message: err.message });
      }
    });
}

async function getSectionQuestions({ ws, sessionId, sectionName, exam, difficulty, qPerSection, payload }) {
  const batch = await getBatchForSection({
    userKey: payload.userId || payload.userKey || ws.clientId,
    requestedSection: sectionName,
    exam,
    difficulty,
    limit: qPerSection || BATCH_SIZE,
    onLog: (msg, type) => wsLog(ws, msg, type)
  }).catch((err) => {
    wsLog(ws, `[BATCH] ${sectionName} failed: ${err.message}`, 'error');
    if (isMongoReady()) throw err;
    return null;
  });

  if (batch?.questions?.length) {
    wsLog(ws, `[BATCH] ${sectionName} served from ${batch.source} batch ${batch.batchId}`, 'success');
    return batch.questions;
  }

  if (isMongoReady()) {
    throw new Error(`No unseen questions could be served for ${sectionName} after DB refill`);
  }

  wsLog(ws, `[LEGACY] Falling back to direct section generation for "${sectionName}"`, 'warn');
  const session = SessionStore.get(sessionId);
  return generateSection({
    sessionId,
    sectionName,
    exam,
    difficulty,
    count: qPerSection || BATCH_SIZE,
    previousQuestions: session ? session.generatedQuestions : [],
    questionHashes: session ? session.questionHashes : new Set(),
    onLog: (msg, type) => wsLog(ws, msg, type)
  });
}

function handleSubmitExam(ws, payload) {
  const { sessionId, answers, timings } = payload;

  const session = SessionStore.get(sessionId);
  if (!session) {
    wsSend(ws, { type: 'SUBMIT_ERROR', message: 'Session not found or expired' });
    return;
  }

  SessionStore.update(sessionId, s => {
    s.analytics.answers = answers || {};
    s.analytics.timings = timings || {};
    s.analytics.endTime = Date.now();
  });

  wsLog(ws, `Exam submitted | Session: ${sessionId} | Answers: ${Object.keys(answers || {}).length}`, 'success');
  wsSend(ws, { type: 'EXAM_SUBMITTED', sessionId, timestamp: new Date().toISOString() });
}

function wsSend(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function wsLog(ws, message, type = 'info') {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8);
  const color = type === 'error' ? '31' : type === 'success' ? '32' : type === 'llm' ? '35' : type === 'stream' ? '36' : type === 'warn' ? '33' : '34';
  console.log(`\x1b[${color}m[${ts}]\x1b[0m ${message}`);
  wsSend(ws, { type: 'LOG', message, logType: type, timestamp: ts });
}
