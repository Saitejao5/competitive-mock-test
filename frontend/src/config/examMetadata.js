/**
 * EXAM METADATA SYSTEM
 * Complete hierarchical structure: Board → Exam → Tier → Sections → Topics
 * Scalable, data-driven, no hardcoding
 */

export const EXAM_BOARDS = {
  ssc: {
    id: 'ssc',
    name: 'SSC',
    slug: 'ssc',
    description: 'Staff Selection Commission',
    icon: '🏛️',
    color: 'emerald',
    exams: ['ssc-cgl', 'ssc-chsl', 'ssc-mts', 'ssc-je', 'ssc-gd']
  },
  rrb: {
    id: 'rrb',
    name: 'RRB',
    slug: 'rrb',
    description: 'Railway Recruitment Board',
    icon: '🚂',
    color: 'amber',
    exams: ['rrb-ntpc', 'rrb-alp', 'rrb-group-d', 'rrb-je']
  },
  ibps: {
    id: 'ibps',
    name: 'IBPS',
    slug: 'ibps',
    description: 'Institute of Banking Personnel Selection',
    icon: '🏦',
    color: 'blue',
    exams: ['ibps-po', 'ibps-clerk', 'ibps-so']
  },
  upsc: {
    id: 'upsc',
    name: 'UPSC',
    slug: 'upsc',
    description: 'Union Public Service Commission',
    icon: '📚',
    color: 'purple',
    exams: ['upsc-cse', 'upsc-nda', 'upsc-cds']
  },
  nta: {
    id: 'nta',
    name: 'NTA',
    slug: 'nta',
    description: 'National Test Abhyas',
    icon: '🎓',
    color: 'indigo',
    exams: ['nta-cuet', 'nta-jee', 'nta-neet', 'nta-ugc-net']
  }
};

/**
 * EXAMS CONFIGURATION
 * Each exam defines its own tiers, sections, topics
 */
export const EXAMS = {
  // ─────────────────── SSC CGL ──────────────────
  'ssc-cgl': {
    id: 'ssc-cgl',
    slug: 'ssc-cgl',
    name: 'SSC CGL',
    fullName: 'SSC Combined Graduate Level',
    board: 'ssc',
    description: 'Combined Graduate Level exam by SSC',
    pattern: 'Tier 1 (CBT), Tier 2 (CBT), Tier 3 (Descriptive), Tier 4 (Skill/Physical)',
    tiers: ['tier-1', 'tier-2'],
    icon: '📊'
  },

  'ssc-chsl': {
    id: 'ssc-chsl',
    slug: 'ssc-chsl',
    name: 'SSC CHSL',
    fullName: 'SSC Combined Higher Secondary Level',
    board: 'ssc',
    description: 'Combined Higher Secondary Level exam',
    pattern: 'Tier 1 (CBT), Tier 2 (CBT), Tier 3 (Descriptive)',
    tiers: ['tier-1', 'tier-2'],
    icon: '📋'
  },

  'ssc-mts': {
    id: 'ssc-mts',
    slug: 'ssc-mts',
    name: 'SSC MTS',
    fullName: 'SSC Multitasking Staff',
    board: 'ssc',
    description: 'Multitasking Staff recruitment exam',
    pattern: 'Single Tier (CBT)',
    tiers: ['paper-1'],
    icon: '📄'
  },

  'ssc-je': {
    id: 'ssc-je',
    slug: 'ssc-je',
    name: 'SSC JE',
    fullName: 'SSC Junior Engineer',
    board: 'ssc',
    description: 'Junior Engineer exam in Civil/Electrical/Mechanical',
    pattern: 'Tier 1 (CBT), Tier 2 (CBT)',
    tiers: ['tier-1', 'tier-2'],
    icon: '⚙️'
  },

  'ssc-gd': {
    id: 'ssc-gd',
    slug: 'ssc-gd',
    name: 'SSC GD',
    fullName: 'SSC General Duty',
    board: 'ssc',
    description: 'General Duty Constable recruitment',
    pattern: 'Tier 1 (CBT), Physical, Document Verification',
    tiers: ['tier-1'],
    icon: '👮'
  },

  // ─────────────────── RRB ──────────────────
  'rrb-ntpc': {
    id: 'rrb-ntpc',
    slug: 'rrb-ntpc',
    name: 'RRB NTPC',
    fullName: 'RRB Non-Technical Popular Categories',
    board: 'rrb',
    description: 'Non-Technical Popular Categories recruitment',
    pattern: 'CBT 1, CBT 2, Skill Test',
    tiers: ['cbt-1', 'cbt-2'],
    icon: '🚂'
  },

  'rrb-alp': {
    id: 'rrb-alp',
    slug: 'rrb-alp',
    name: 'RRB ALP',
    fullName: 'RRB Assistant Loco Pilot',
    board: 'rrb',
    description: 'Assistant Loco Pilot and Technician exam',
    pattern: 'CBT 1, CBT 2, Document Verification',
    tiers: ['cbt-1', 'cbt-2'],
    icon: '🔧'
  },

  'rrb-group-d': {
    id: 'rrb-group-d',
    slug: 'rrb-group-d',
    name: 'RRB Group D',
    fullName: 'RRB Group D (Level 1)',
    board: 'rrb',
    description: 'Group D (Level 1) recruitment exam',
    pattern: 'Single Tier (CBT)',
    tiers: ['paper-1'],
    icon: '👷'
  },

  'rrb-je': {
    id: 'rrb-je',
    slug: 'rrb-je',
    name: 'RRB JE',
    fullName: 'RRB Junior Engineer',
    board: 'rrb',
    description: 'Junior Engineer in Civil/Electrical/Mechanical',
    pattern: 'CBT 1, CBT 2, Document Verification',
    tiers: ['cbt-1', 'cbt-2'],
    icon: '🔩'
  },

  // ─────────────────── IBPS ──────────────────
  'ibps-po': {
    id: 'ibps-po',
    slug: 'ibps-po',
    name: 'IBPS PO',
    fullName: 'IBPS Probationary Officer',
    board: 'ibps',
    description: 'Probationary Officer recruitment in banks',
    pattern: 'Prelims, Mains, Interview',
    tiers: ['prelims', 'mains'],
    icon: '💼'
  },

  'ibps-clerk': {
    id: 'ibps-clerk',
    slug: 'ibps-clerk',
    name: 'IBPS Clerk',
    fullName: 'IBPS Bank Clerk',
    board: 'ibps',
    description: 'Clerk recruitment in banks',
    pattern: 'Prelims, Mains',
    tiers: ['prelims', 'mains'],
    icon: '📋'
  },

  'ibps-so': {
    id: 'ibps-so',
    slug: 'ibps-so',
    name: 'IBPS SO',
    fullName: 'IBPS Specialist Officer',
    board: 'ibps',
    description: 'Specialist Officer recruitment in banks',
    pattern: 'Prelims, Mains, Interview',
    tiers: ['prelims', 'mains'],
    icon: '👨‍💼'
  },

  // ─────────────────── UPSC ──────────────────
  'upsc-cse': {
    id: 'upsc-cse',
    slug: 'upsc-cse',
    name: 'UPSC CSE',
    fullName: 'UPSC Civil Services Examination',
    board: 'upsc',
    description: 'Union Public Service Commission Civil Services',
    pattern: 'Prelims, Mains, Interview',
    tiers: ['prelims', 'mains'],
    icon: '🏛️'
  },

  'upsc-nda': {
    id: 'upsc-nda',
    slug: 'upsc-nda',
    name: 'NDA',
    fullName: 'National Defence Academy',
    board: 'upsc',
    description: 'National Defence Academy entrance exam',
    pattern: 'Single Tier (CBT)',
    tiers: ['paper-1'],
    icon: '⛑️'
  },

  'upsc-cds': {
    id: 'upsc-cds',
    slug: 'upsc-cds',
    name: 'CDS',
    fullName: 'Combined Defence Services',
    board: 'upsc',
    description: 'Combined Defence Services examination',
    pattern: 'Single Tier (CBT)',
    tiers: ['paper-1'],
    icon: '🪖'
  },

  // ─────────────────── NTA ──────────────────
  'nta-jee': {
    id: 'nta-jee',
    slug: 'nta-jee',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination',
    board: 'nta',
    description: 'JEE Main for engineering entrance',
    pattern: '4 attempts per year, CBT',
    tiers: ['session-1'],
    icon: '🧮'
  },

  'nta-neet': {
    id: 'nta-neet',
    slug: 'nta-neet',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    board: 'nta',
    description: 'NEET for medical entrance',
    pattern: 'Single Tier CBT',
    tiers: ['paper-1'],
    icon: '🔬'
  },

  'nta-cuet': {
    id: 'nta-cuet',
    slug: 'nta-cuet',
    name: 'CUET',
    fullName: 'Common University Entrance Test',
    board: 'nta',
    description: 'Entrance test for central universities',
    pattern: 'Domain-specific + General Test',
    tiers: ['paper-1'],
    icon: '🎓'
  },

  'nta-ugc-net': {
    id: 'nta-ugc-net',
    slug: 'nta-ugc-net',
    name: 'UGC NET',
    fullName: 'UGC National Eligibility Test',
    board: 'nta',
    description: 'Eligibility for assistant professor and postdoc',
    pattern: 'Paper 1 (General), Paper 2 (Subject)',
    tiers: ['paper-1'],
    icon: '📖'
  }
};

/**
 * TIERS CONFIGURATION
 * Defines sections available in each tier
 */
export const TIERS = {
  // SSC CGL
  'tier-1': {
    id: 'tier-1',
    name: 'Tier 1 (CBT)',
    duration: 60,
    totalQuestions: 100,
    negativeMarking: 0.25,
    sections: ['general-intelligence', 'quantitative-aptitude', 'english', 'general-awareness']
  },
  'tier-2': {
    id: 'tier-2',
    name: 'Tier 2 (CBT)',
    duration: 120,
    totalQuestions: 200,
    negativeMarking: 0.25,
    sections: ['quantitative-aptitude', 'english', 'statistics', 'general-knowledge']
  },

  // RRB
  'cbt-1': {
    id: 'cbt-1',
    name: 'CBT 1',
    duration: 90,
    totalQuestions: 100,
    negativeMarking: 0.33,
    sections: ['mathematics', 'reasoning', 'general-knowledge', 'general-science']
  },
  'cbt-2': {
    id: 'cbt-2',
    name: 'CBT 2',
    duration: 120,
    totalQuestions: 120,
    negativeMarking: 0.33,
    sections: ['mathematics', 'reasoning', 'general-knowledge']
  },

  // IBPS
  'prelims': {
    id: 'prelims',
    name: 'Preliminary Exam',
    duration: 60,
    totalQuestions: 100,
    negativeMarking: 0.25,
    sections: ['reasoning', 'quantitative-aptitude', 'english']
  },
  'mains': {
    id: 'mains',
    name: 'Mains Exam',
    duration: 180,
    totalQuestions: 190,
    negativeMarking: 0.25,
    sections: ['reasoning', 'quantitative-aptitude', 'english', 'general-knowledge', 'computer-knowledge']
  },

  // Default single-tier
  'paper-1': {
    id: 'paper-1',
    name: 'Paper 1',
    duration: 120,
    totalQuestions: 100,
    negativeMarking: 0.25,
    sections: ['general-intelligence', 'quantitative-aptitude', 'english', 'general-awareness']
  },
  'session-1': {
    id: 'session-1',
    name: 'Session 1',
    duration: 180,
    totalQuestions: 90,
    negativeMarking: 0.25,
    sections: ['physics', 'chemistry', 'mathematics']
  }
};

/**
 * SECTIONS CONFIGURATION
 * Each section defines available topics
 */
export const SECTIONS = {
  'general-intelligence': {
    id: 'general-intelligence',
    name: 'General Intelligence & Reasoning',
    alias: 'Reasoning',
    topics: ['analogies', 'classification', 'series', 'puzzles', 'coding-decoding', 'blood-relations', 'seating-arrangement', 'direction-distance', 'statement-conclusion', 'syllogism']
  },
  'quantitative-aptitude': {
    id: 'quantitative-aptitude',
    name: 'Quantitative Aptitude',
    alias: 'Quant',
    topics: ['number-system', 'arithmetic', 'algebra', 'geometry', 'trigonometry', 'data-interpretation', 'mensuration', 'probability', 'permutation-combination', 'ratio-proportion']
  },
  'english': {
    id: 'english',
    name: 'English Language',
    alias: 'English',
    topics: ['reading-comprehension', 'vocabulary', 'grammar', 'sentence-correction', 'para-jumbles', 'fill-in-blanks', 'one-word-substitution', 'idioms-phrases']
  },
  'general-awareness': {
    id: 'general-awareness',
    name: 'General Awareness',
    alias: 'GA',
    topics: ['history', 'geography', 'economics', 'polity', 'science', 'current-affairs', 'sports', 'important-dates']
  },
  'general-knowledge': {
    id: 'general-knowledge',
    name: 'General Knowledge',
    alias: 'GK',
    topics: ['history', 'geography', 'science', 'current-affairs', 'technology', 'sports']
  },
  'mathematics': {
    id: 'mathematics',
    name: 'Mathematics',
    alias: 'Math',
    topics: ['arithmetic', 'algebra', 'geometry', 'trigonometry', 'calculus', 'statistics', 'probability']
  },
  'reasoning': {
    id: 'reasoning',
    name: 'Reasoning Ability',
    alias: 'Reasoning',
    topics: ['analogies', 'classification', 'series', 'puzzles', 'coding-decoding', 'blood-relations', 'syllogism', 'direction-distance']
  },
  'general-science': {
    id: 'general-science',
    name: 'General Science',
    alias: 'Science',
    topics: ['physics', 'chemistry', 'biology', 'earth-science']
  },
  'statistics': {
    id: 'statistics',
    name: 'Statistics',
    alias: 'Stats',
    topics: ['mean-median-mode', 'frequency-distribution', 'standard-deviation', 'correlation-regression', 'probability-distribution']
  },
  'computer-knowledge': {
    id: 'computer-knowledge',
    name: 'Computer Knowledge',
    alias: 'Computers',
    topics: ['basic-concepts', 'hardware', 'software', 'networking', 'database', 'internet', 'security', 'ms-office']
  },
  'physics': {
    id: 'physics',
    name: 'Physics',
    alias: 'Physics',
    topics: ['mechanics', 'thermodynamics', 'waves', 'optics', 'electricity', 'magnetism', 'modern-physics']
  },
  'chemistry': {
    id: 'chemistry',
    name: 'Chemistry',
    alias: 'Chemistry',
    topics: ['inorganic', 'organic', 'physical', 'coordination', 'chemical-bonding', 'redox-reactions']
  },
  'technical-awareness': {
    id: 'technical-awareness',
    name: 'Technical Awareness',
    alias: 'Technical',
    topics: ['railway-systems', 'electrical-systems', 'mechanical-systems', 'safety', 'regulations']
  }
};

/**
 * TOPICS WITH SUBTOPICS
 * Hierarchical structure for targeted practice
 */
export const TOPICS = {
  'analogies': {
    name: 'Analogies',
    subtopics: ['word-analogies', 'number-analogies', 'letter-analogies', 'mixed-analogies']
  },
  'series': {
    name: 'Series',
    subtopics: ['number-series', 'letter-series', 'alphanumeric-series', 'pattern-series']
  },
  'puzzles': {
    name: 'Puzzles',
    subtopics: ['logic-puzzles', 'arrangement-puzzles', 'ordering-puzzles', 'shape-puzzles']
  },
  'coding-decoding': {
    name: 'Coding Decoding',
    subtopics: ['letter-coding', 'number-coding', 'symbol-coding', 'combined-coding']
  },
  'blood-relations': {
    name: 'Blood Relations',
    subtopics: ['family-tree', 'coded-relations', 'direction-based', 'time-based']
  },
  'syllogism': {
    name: 'Syllogism',
    subtopics: ['categorical', 'conditional', 'complex', 'mixed']
  },
  'arithmetic': {
    name: 'Arithmetic',
    subtopics: ['percentage', 'profit-loss', 'simple-interest', 'compound-interest', 'ratio-proportion', 'averages', 'age-problems', 'work-rate']
  },
  'algebra': {
    name: 'Algebra',
    subtopics: ['linear-equations', 'quadratic-equations', 'polynomials', 'inequalities', 'sequences-series']
  },
  'geometry': {
    name: 'Geometry',
    subtopics: ['triangles', 'circles', 'quadrilaterals', 'lines-angles', 'coordinate-geometry']
  },
  'trigonometry': {
    name: 'Trigonometry',
    subtopics: ['basic-identities', 'ratios', 'equations', 'inverse-trigonometry', 'applications']
  },
  'data-interpretation': {
    name: 'Data Interpretation',
    subtopics: ['bar-charts', 'pie-charts', 'line-graphs', 'tables', 'mixed-graphs', 'caselets']
  },
  'reading-comprehension': {
    name: 'Reading Comprehension',
    subtopics: ['single-passage', 'dual-passage', 'comparative-passage', 'inference-based', 'main-idea']
  },
  'vocabulary': {
    name: 'Vocabulary',
    subtopics: ['synonyms', 'antonyms', 'synonyms-antonyms', 'word-usage', 'roots-etymology']
  },
  'grammar': {
    name: 'Grammar',
    subtopics: ['tenses', 'parts-of-speech', 'articles', 'prepositions', 'subject-verb-agreement']
  },
  'history': {
    name: 'History',
    subtopics: ['ancient-india', 'medieval-india', 'modern-india', 'world-history', 'freedom-struggle']
  },
  'geography': {
    name: 'Geography',
    subtopics: ['physical-geography', 'political-geography', 'indian-geography', 'world-geography', 'climate-vegetation']
  }
};

/**
 * DIFFICULTY LEVELS
 * Complete hierarchy from beginner to real exam
 */
export const DIFFICULTY_LEVELS = [
  { id: 'beginner', name: 'Beginner', description: 'Fundamental concepts', order: 0, badge: '⭐' },
  { id: 'easy', name: 'Easy', description: 'Basic understanding', order: 1, badge: '⭐⭐' },
  { id: 'medium', name: 'Medium', description: 'Moderate complexity', order: 2, badge: '⭐⭐⭐' },
  { id: 'hard', name: 'Hard', description: 'Advanced complexity', order: 3, badge: '⭐⭐⭐⭐' },
  { id: 'advanced', name: 'Advanced', description: 'Expert level', order: 4, badge: '⭐⭐⭐⭐⭐' },
  { id: 'exam-level', name: 'Exam Level', description: 'Real exam authenticity', order: 5, badge: '🎯', isExamLevel: true }
];

/**
 * AI PERSONALIZATION MODES
 * Available after core configuration
 */
export const AI_MODES = [
  { id: 'adaptive', name: 'Adaptive Difficulty', description: 'AI adjusts difficulty based on your performance', icon: '🤖' },
  { id: 'weak-area', name: 'Weak Area Focus', description: 'Practice topics where you struggle most', icon: '🎯' },
  { id: 'revision', name: 'Revision Mode', description: 'Quick recap of important concepts', icon: '📚' },
  { id: 'speed', name: 'Speed Improvement', description: 'Timed practice to increase solving speed', icon: '⚡' },
  { id: 'mistakes', name: 'Mistake Reinforcement', description: 'Practice your previous mistakes', icon: '🔄' },
  { id: 'simulation', name: 'Exam Simulation', description: 'Full-length mock exam under exam conditions', icon: '📋' }
];

/**
 * HELPER FUNCTIONS
 */
export const getBoard = (boardId) => EXAM_BOARDS[boardId];
export const getExam = (examId) => EXAMS[examId];
export const getTier = (tierId) => TIERS[tierId];
export const getSection = (sectionId) => SECTIONS[sectionId];
export const getTopic = (topicId) => TOPICS[topicId];

export const getExamsForBoard = (boardId) => {
  const board = getBoard(boardId);
  return board?.exams.map(examId => EXAMS[examId]) || [];
};

export const getTiersForExam = (examId) => {
  const exam = getExam(examId);
  return exam?.tiers.map(tierId => TIERS[tierId]) || [];
};

export const getSectionsForTier = (tierId) => {
  const tier = getTier(tierId);
  return tier?.sections.map(sectionId => SECTIONS[sectionId]) || [];
};

export const getTopicsForSection = (sectionId) => {
  const section = getSection(sectionId);
  return section?.topics.map(topicId => TOPICS[topicId]) || [];
};

export const searchExams = (query) => {
  const q = query.toLowerCase();
  return Object.values(EXAMS).filter(exam =>
    exam.name.toLowerCase().includes(q) ||
    exam.fullName.toLowerCase().includes(q) ||
    exam.slug.includes(q)
  );
};

export const searchTopics = (query) => {
  const q = query.toLowerCase();
  return Object.entries(TOPICS).filter(([key, topic]) =>
    topic.name.toLowerCase().includes(q) ||
    key.toLowerCase().includes(q) ||
    topic.subtopics.some(subtopic => subtopic.toLowerCase().includes(q))
  ).map(([key, topic]) => ({ id: key, type: 'topic', ...topic }));
};

export const unifiedSearch = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return { boards: [], exams: [], tiers: [], topics: [], subtopics: [], papers: [] };

  const matches = (...values) => values.filter(Boolean).some(value => String(value).toLowerCase().includes(q));

  const boards = Object.values(EXAM_BOARDS)
    .filter(board => matches(board.name, board.description, board.slug))
    .map(board => ({ ...board, type: 'board' }));

  const exams = Object.values(EXAMS)
    .filter(exam => matches(exam.name, exam.fullName, exam.slug, exam.description, exam.pattern, getBoard(exam.board)?.name))
    .map(exam => ({ ...exam, type: 'exam', boardName: getBoard(exam.board)?.name }));

  const tiers = Object.values(EXAMS).flatMap(exam =>
    exam.tiers
      .map(tierId => TIERS[tierId])
      .filter(Boolean)
      .filter(tier => matches(`${exam.name} ${tier.name}`, tier.name, tier.id, exam.name, exam.fullName))
      .map(tier => ({ ...tier, type: 'tier', examId: exam.id, examName: exam.name, boardName: getBoard(exam.board)?.name }))
  );

  const topics = searchTopics(query);

  const subtopics = Object.entries(TOPICS).flatMap(([topicId, topic]) =>
    topic.subtopics
      .filter(subtopic => matches(subtopic, topic.name, topicId))
      .map(subtopic => ({
        id: `${topicId}:${subtopic}`,
        type: 'subtopic',
        name: subtopic.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
        topicId,
        topicName: topic.name
      }))
  );

  const papers = tiers
    .filter(tier => matches(tier.name, tier.id, tier.examName))
    .map(tier => ({
      id: `${tier.examId}:${tier.id}`,
      type: 'paper',
      name: `${tier.examName} ${tier.name}`,
      examId: tier.examId,
      tierId: tier.id,
      duration: tier.duration,
      totalQuestions: tier.totalQuestions,
      negativeMarking: tier.negativeMarking
    }));

  return { boards, exams, tiers, topics, subtopics, papers };
};
