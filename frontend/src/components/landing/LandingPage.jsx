import React, { useState } from 'react';
import { useExamStore } from '../../store/examStore';

const PRACTICE_PATHWAYS = [
  {
    id: 'by-exam',
    title: 'Practice by Exam',
    description: 'Choose from popular government and competitive exams',
    icon: '📋',
    action: () => {}
  },
  {
    id: 'by-board',
    title: 'Explore Boards',
    description: 'Browse exams organized by recruitment board',
    icon: '🏛️',
    action: () => {}
  },
  {
    id: 'by-topic',
    title: 'Practice by Topic',
    description: 'Deep dive into specific topics and subtopics',
    icon: '🎯',
    action: () => {}
  },
  {
    id: 'by-paper',
    title: 'Full Mock Papers',
    description: 'Complete exam simulations under real conditions',
    icon: '📄',
    action: () => {}
  }
];

export default function LandingPage({ ws }) {
  const { setPage, setNavigation, setSearchQuery } = useExamStore();
  const [searchInput, setSearchInput] = useState('');

  const handlePathway = (pathway) => {
    if (pathway.id === 'by-exam') {
      setPage('board-explorer');
      setNavigation({ selectedPracticeMode: 'exam' });
    } else if (pathway.id === 'by-board') {
      setPage('board-explorer');
    } else if (pathway.id === 'by-topic') {
      setPage('board-explorer');
      setNavigation({ selectedPracticeMode: 'topic' });
    } else if (pathway.id === 'by-paper') {
      setPage('board-explorer');
      setNavigation({ selectedPracticeMode: 'paper' });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
    }
  };

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet to-violet-soft flex items-center justify-center">
            <span className="text-white font-bold text-lg">⚡</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">AI Exam Platform</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tag text-xs">AI-Powered</span>
          <span className="tag text-xs">Zero-DB</span>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
        {/* HERO SECTION */}
        <div className="mb-20 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet/20 bg-violet-dim text-violet-soft text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
            AI-First Exam Platform · Real-time Generation · Zero Repetition
          </div>
          
          <h1 className="font-display font-bold text-6xl leading-tight tracking-tight mb-6">
            Master Any{' '}
            <span className="bg-gradient-to-r from-violet via-violet-soft to-indigo bg-clip-text text-transparent animate-gradient">
              Competitive Exam
            </span>
            <br />with AI
          </h1>
          
          <p className="text-white/50 font-body text-xl max-w-2xl leading-relaxed">
            AI-generated practice questions, intelligent difficulty adaptation, deep analytics insights, and personalized learning paths. Feel like using a government exam platform designed in 2026.
          </p>
        </div>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="mb-16">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search exams, boards, topics... (e.g., SSC CGL, Quantitative Aptitude, RRB NTPC)"
              className="w-full px-6 py-4 rounded-2xl bg-ink-900/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet/50 focus:bg-ink-900/80 transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet to-violet-soft text-white text-sm font-medium hover:shadow-lg hover:shadow-violet/20 transition-all duration-200"
            >
              Search
            </button>
          </div>
        </form>

        {/* PRACTICE PATHWAYS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PRACTICE_PATHWAYS.map((pathway, idx) => (
            <button
              key={pathway.id}
              onClick={() => handlePathway(pathway)}
              className="group glass rounded-2xl p-6 border border-white/5 hover:border-violet/30 transition-all duration-300 hover:shadow-xl hover:shadow-violet/10 text-left animate-fade-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {pathway.icon}
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{pathway.title}</h3>
              <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                {pathway.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-violet-soft text-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span>Explore</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-3 gap-4 mt-20 pt-12 border-t border-white/5">
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-violet-soft mb-1">500+</div>
            <div className="text-sm text-white/40">Exams & Topics</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-emerald-exam mb-1">Unlimited</div>
            <div className="text-sm text-white/40">AI Questions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-blue-soft mb-1">Real-time</div>
            <div className="text-sm text-white/40">Analytics</div>
          </div>
        </div>
      </div>
    </div>
  );
}
