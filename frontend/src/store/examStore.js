import { create } from 'zustand';

export const useExamStore = create((set, get) => ({
  // ── NAVIGATION ────────────────────────────────────────
  // page: 'landing' | 'board-explorer' | 'exam-config' | 'tier-select' | 'practice-mode' | 'exam' | 'analytics'
  page: 'landing',
  setPage: (page) => set({ page }),

  // ── BREADCRUMB STATE ──────────────────────────────────
  navigation: {
    selectedBoard: null,      // 'ssc', 'rrb', 'ibps', 'upsc', 'nta'
    selectedExam: null,       // 'ssc-cgl', 'rrb-ntpc', etc.
    selectedTier: null,       // 'tier-1', 'tier-2', etc.
    selectedPracticeMode: null // 'exam' | 'topic' | 'paper'
  },
  setNavigation: (patch) => set(s => ({ navigation: { ...s.navigation, ...patch } })),
  clearNavigation: () => set({ navigation: { selectedBoard: null, selectedExam: null, selectedTier: null, selectedPracticeMode: null } }),

  // ── EXAM CONFIGURATION ────────────────────────────────
  config: {
    mode: 'exam',
    exam: 'SSC CGL',
    difficulty: 'Medium',
    qPerSection: 5,
    sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Knowledge'],
    aiMode: null,
    selectedTopics: [],
    selectedSubtopics: []
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

  // ── EXAM STATE (Focus Mode) ──────────────────────────
  currentSectionIndex: 0,
  currentQIndex: 0,
  answers: {},        // `${secIdx}_${qIdx}` → letter
  timings: {},        // `${secIdx}_${qIdx}` → seconds
  qStartTime: null,
  examStartTime: null,
  examEndTime: null,
  selectedAnswerShowsCorrect: {},  // Track if answer is revealed

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

  // ── ANALYTICS STATE ──────────────────────────────────
  analytics: {
    totalQuestions: 0,
    attemptedQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unansweredQuestions: 0,
    accuracy: 0,
    totalTime: 0,
    averageTimePerQuestion: 0,
    sectionWiseStats: {},
    topicWiseStats: {},
    weakAreas: [],
    strengthAreas: []
  },
  setAnalytics: (patch) => set(s => ({ analytics: { ...s.analytics, ...patch } })),

  // ── Console Logs ──────────────────────────────────────
  logs: [],
  addLog: (message, logType = 'info') => set(s => ({
    logs: [...s.logs.slice(-150), { message, logType, ts: new Date().toISOString().split('T')[1].slice(0, 8), id: Date.now() + Math.random() }]
  })),
  clearLogs: () => set({ logs: [] }),

  // ── WebSocket ─────────────────────────────────────────
  wsStatus: 'disconnected', // 'disconnected'|'connecting'|'connected'|'error'
  setWsStatus: (wsStatus) => set({ wsStatus }),

  // ── Search ────────────────────────────────────────────
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: { boards: [], exams: [], tiers: [], papers: [], topics: [], subtopics: [] },
  setSearchResults: (results) => set({ searchResults: results }),

  // ── UI STATE ──────────────────────────────────────────
  showConsole: false,
  toggleConsole: () => set(s => ({ showConsole: !s.showConsole })),
  expandedAnalyticsItems: {},
  toggleAnalyticsItem: (key) => set(s => ({
    expandedAnalyticsItems: { ...s.expandedAnalyticsItems, [key]: !s.expandedAnalyticsItems[key] }
  })),

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
    logs: [],
    page: 'landing'
  }),

  resetAll: () => set({
    page: 'landing',
    navigation: { selectedBoard: null, selectedExam: null, selectedTier: null, selectedPracticeMode: null },
    config: {
      mode: 'exam',
      exam: 'SSC CGL',
      difficulty: 'Medium',
      qPerSection: 5,
      sections: ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Knowledge'],
      aiMode: null,
      selectedTopics: [],
      selectedSubtopics: []
    },
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
