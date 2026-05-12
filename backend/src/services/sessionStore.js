// ─────────────────────────────────────────────────────────
// SESSION STORE — In-Memory, Zero-DB Architecture
// Stores all session data in a Node.js Map
// ─────────────────────────────────────────────────────────

const store = new Map();
const TTL = parseInt(process.env.SESSION_TTL_MS) || 7200000; // 2h default

export const SessionStore = {

  create(sessionId, config) {
    const session = {
      id: sessionId,
      config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generatedQuestions: [],
      questionHashes: new Set(),
      sections: {},          // sectionName → questions[]
      sectionStatus: {},     // sectionName → 'pending'|'generating'|'ready'|'failed'
      analytics: {
        answers: {},         // `${secIdx}_${qIdx}` → letter
        timings: {},         // `${secIdx}_${qIdx}` → seconds
        startTime: null,
        endTime: null
      }
    };

    store.set(sessionId, session);
    console.log(`\x1b[32m[SESSION]\x1b[0m Created: ${sessionId} | Exam: ${config.exam} | Difficulty: ${config.difficulty}`);
    return session;
  },

  get(sessionId) {
    const session = store.get(sessionId);
    if (!session) return null;

    // TTL check
    if (Date.now() - session.createdAt > TTL) {
      store.delete(sessionId);
      console.log(`\x1b[33m[SESSION]\x1b[0m Expired and removed: ${sessionId}`);
      return null;
    }
    return session;
  },

  update(sessionId, updater) {
    const session = store.get(sessionId);
    if (!session) return null;
    updater(session);
    session.updatedAt = Date.now();
    return session;
  },

  storeSection(sessionId, sectionName, questions) {
    const session = store.get(sessionId);
    if (!session) return;
    session.sections[sectionName] = questions;
    session.sectionStatus[sectionName] = 'ready';

    // Track hashes for anti-repetition
    questions.forEach(q => {
      session.questionHashes.add(hashQuestion(q.question));
      session.generatedQuestions.push(q);
    });

    session.updatedAt = Date.now();
    console.log(`\x1b[32m[SESSION]\x1b[0m Stored section "${sectionName}": ${questions.length} questions | Session: ${sessionId}`);
  },

  getGeneratedQuestions(sessionId) {
    const session = store.get(sessionId);
    return session ? session.generatedQuestions : [];
  },

  getQuestionHashes(sessionId) {
    const session = store.get(sessionId);
    return session ? session.questionHashes : new Set();
  },

  delete(sessionId) {
    store.delete(sessionId);
    console.log(`\x1b[33m[SESSION]\x1b[0m Deleted: ${sessionId}`);
  },

  count() {
    return store.size;
  },

  // Cleanup expired sessions every 30 minutes
  startCleanup() {
    setInterval(() => {
      let removed = 0;
      store.forEach((session, id) => {
        if (Date.now() - session.createdAt > TTL) {
          store.delete(id);
          removed++;
        }
      });
      if (removed > 0) console.log(`\x1b[33m[SESSION]\x1b[0m Cleanup: removed ${removed} expired sessions`);
    }, 30 * 60 * 1000);
  }
};

// Hash function for anti-repetition
function hashQuestion(text) {
  const str = text.toLowerCase().replace(/\s+/g, '').slice(0, 60);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(h);
}

SessionStore.startCleanup();
