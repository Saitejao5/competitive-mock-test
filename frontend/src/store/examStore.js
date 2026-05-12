import { create } from 'zustand';

export const useExamStore = create((set, get) => ({
  // ── Page ──────────────────────────────────────────────
  page: 'home', // 'home' | 'exam' | 'analysis'
  setPage: (page) => set({ page }),

  // ── Config ────────────────────────────────────────────
  config: {
    mode: 'exam',
    exam: 'SSC CGL',
    difficulty: 'Medium',
    qPerSection: 5,
    sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Knowledge']
  },
  setConfig: (patch) => set(s => ({ config: { ...s.config, ...patch } })),

  // ── Session ───────────────────────────────────────────
  sessionId: null,
  setSessionId: (sessionId) => set({ sessionId }),

  // ── Sections / Questions ──────────────────────────────
  sections: [], // Array of { name, questions, status }
  initSections: (names) => set({
    sections: names.map(name => ({ name, questions: [], status: 'pending' }))
  }),
  setSectionStatus: (index, status) => set(s => {
    const sections = [...s.sections];
    if (sections[index]) sections[index] = { ...sections[index], status };
    return { sections };
  }),
  setSectionReady: (index, questions) => set(s => {
    const sections = [...s.sections];
    if (sections[index]) sections[index] = { ...sections[index], questions, status: 'ready' };
    return { sections };
  }),

  // ── Exam State ────────────────────────────────────────
  currentSectionIndex: 0,
  currentQIndex: 0,
  answers: {},        // `${secIdx}_${qIdx}` → letter
  timings: {},        // `${secIdx}_${qIdx}` → seconds
  qStartTime: null,
  examStartTime: null,
  examEndTime: null,

  setCurrentSection: (idx) => set(s => {
    get().saveCurrentTiming();
    return { currentSectionIndex: idx, currentQIndex: 0, qStartTime: Date.now() };
  }),
  setCurrentQ: (idx) => set(s => {
    get().saveCurrentTiming();
    return { currentQIndex: idx, qStartTime: Date.now() };
  }),

  saveCurrentTiming: () => {
    const s = get();
    if (!s.qStartTime) return;
    const key = `${s.currentSectionIndex}_${s.currentQIndex}`;
    const elapsed = Math.round((Date.now() - s.qStartTime) / 1000);
    const prev = s.timings[key] || 0;
    set({ timings: { ...s.timings, [key]: prev + elapsed }, qStartTime: Date.now() });
  },

  setAnswer: (secIdx, qIdx, letter) => set(s => ({
    answers: { ...s.answers, [`${secIdx}_${qIdx}`]: letter }
  })),

  startExamTimer: () => set({ examStartTime: Date.now(), qStartTime: Date.now() }),
  stopExamTimer: () => { get().saveCurrentTiming(); set({ examEndTime: Date.now() }); },

  // ── Console Logs ──────────────────────────────────────
  logs: [],
  addLog: (message, logType = 'info') => set(s => ({
    logs: [...s.logs.slice(-150), { message, logType, ts: new Date().toISOString().split('T')[1].slice(0, 8), id: Date.now() + Math.random() }]
  })),
  clearLogs: () => set({ logs: [] }),

  // ── WebSocket ─────────────────────────────────────────
  wsStatus: 'disconnected', // 'disconnected'|'connecting'|'connected'|'error'
  setWsStatus: (wsStatus) => set({ wsStatus }),

  // ── Reset ─────────────────────────────────────────────
  resetExam: () => set({
    sessionId: null,
    sections: [],
    currentSectionIndex: 0,
    currentQIndex: 0,
    answers: {},
    timings: {},
    qStartTime: null,
    examStartTime: null,
    examEndTime: null,
    logs: []
  })
}));
